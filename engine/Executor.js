/**
 * Executor.js - Topological sort execution engine
 *
 * Executes a directed acyclic graph (DAG) of nodes using
 * Kahn's algorithm. Supports incremental execution,
 * cache, async node processing, dynamic sockets,
 * and compound node sub-graph execution.
 *
 * @module agi-graph/Executor
 */

import { getNodeType } from './Registry.js';
import { Graph } from './Graph.js';
import { runLifecycle } from './Lifecycle.js';

export class Executor {

  constructor() {
    /** @type {Map<string, any>} Cached outputs per node ID */
    this._cache = new Map();

    /** @type {Map<string, {key: string, outputs: object}>} Lifecycle cache store */
    this._lifecycleCache = new Map();

    /** @type {Set<string>} Nodes marked dirty (need re-execution) */
    this._dirty = new Set();

    /** @type {string|null} Currently executing node ID */
    this.currentNode = null;

    /** @type {Array<{nodeId: string, time: number, skipped: boolean, cached?: boolean, error?: string|null}>} */
    this.executionLog = [];
  }

  /**
   * Execute a graph
   * @param {import('./Graph.js').Graph} graph
   * @param {object} [options={}]
   * @param {boolean} [options.cache=false] - Use incremental execution (skip unchanged)
   * @param {function} [options.onNodeStart] - Callback(nodeId, node)
   * @param {function} [options.onNodeComplete] - Callback(nodeId, output, timeMs)
   * @param {function} [options.onNodeSkipped] - Callback(nodeId) for cached nodes
   * @param {function} [options.onNodeCached] - Callback(nodeId, cacheHash) for lifecycle-cached
   * @returns {Promise<{outputs: object, executionOrder: string[], log: Array, totalTime: number}>}
   */
  async run(graph, options = {}) {
    const { cache = false, onNodeStart, onNodeComplete, onNodeSkipped, onNodeCached } = options;
    const nodes = graph.nodes;
    // Duck-typing: Editor has connections as Map, Graph has array
    const connections = graph.connections instanceof Map
      ? [...graph.connections.values()]
      : graph.connections;

    // Topological sort
    const order = this._topologicalSort(nodes, connections);

    // Execute in order
    const results = new Map();
    this.executionLog = [];

    for (const nodeId of order) {
      const node = nodes.get(nodeId);

      // Skip cached clean nodes
      if (cache && !this._dirty.has(nodeId) && this._cache.has(nodeId)) {
        results.set(nodeId, this._cache.get(nodeId));
        this.executionLog.push({ nodeId, time: 0, skipped: true });
        if (onNodeSkipped) onNodeSkipped(nodeId);
        continue;
      }

      if (onNodeStart) onNodeStart(nodeId, node);
      this.currentNode = nodeId;
      const startTime = performance.now();

      // Resolve inputs from upstream connections
      const inputs = this._resolveInputs(nodeId, connections, results);

      // P22: Branch skipping — if node has incoming connections and
      // all connected inputs are null, this node is on an inactive branch
      const incomingConns = connections.filter(c => c.to === nodeId);
      if (incomingConns.length > 0) {
        const allNull = incomingConns.every(c => inputs[c.in] === null || inputs[c.in] === undefined);
        // Skip merge nodes — they expect null from one branch
        const isMergeType = node.type === 'flow/merge' || node.type === 'flow/wait-all';
        if (allNull && !isMergeType) {
          node._output = null;
          results.set(nodeId, null);
          const elapsed = performance.now() - startTime;
          this.executionLog.push({ nodeId, time: elapsed, skipped: true, branchSkipped: true });
          if (onNodeSkipped) onNodeSkipped(nodeId);
          continue;
        }
      }

      // Execute node processor
      // Check for lifecycle hooks first, then fall back to process()
      let output;
      const typeDef = getNodeType(node.type);
      const lifecycleHooks = typeDef?.lifecycle;

      if (lifecycleHooks) {
        // Lifecycle path: validate → cache → execute → postProcess
        const cacheState = {
          mode: node.cacheMode || 'auto',
          store: this._lifecycleCache,
          nodeId,
        };

        const lifecycleResult = await runLifecycle(lifecycleHooks, inputs, node.params, cacheState);

        if (lifecycleResult.error) {
          node._output = { _error: lifecycleResult.error };
          node._cacheHash = lifecycleResult.cacheHash;
          results.set(nodeId, node._output);
          const elapsed = performance.now() - startTime;
          this.executionLog.push({ nodeId, time: elapsed, skipped: false, cached: false, error: lifecycleResult.error });
          if (onNodeComplete) onNodeComplete(nodeId, node._output, elapsed);
          continue;
        }

        output = lifecycleResult.outputs;
        node._cacheHash = lifecycleResult.cacheHash;

        if (lifecycleResult.cached) {
          if (onNodeCached) onNodeCached(nodeId, lifecycleResult.cacheHash);
        }
      } else {
        // Legacy path: direct process() call
        // Node-level process overrides type-level (for per-instance composition)
        const processFn = node.process || typeDef?.process;

        if (typeof processFn === 'function') {
          output = await processFn(inputs, node.params);
        } else {
          // Passthrough: merge params with inputs
          output = { ...node.params, ...inputs };
        }
      }

      // Compound node: execute sub-graph if returned
      if (output && output._subGraph) {
        output = await this._executeSubGraph(output._subGraph, inputs, node.params);
      }

      // Dynamic sockets: process exposes runtime-generated outputs
      if (output && output.dynamicOutputs && Array.isArray(output.dynamicOutputs)) {
        node._dynamicSockets = output.dynamicOutputs;
      }

      // Store output in node
      node._output = output;

      results.set(nodeId, output);
      this._cache.set(nodeId, output);
      this._dirty.delete(nodeId);

      const elapsed = performance.now() - startTime;
      this.executionLog.push({ nodeId, time: elapsed, skipped: false });

      if (onNodeComplete) onNodeComplete(nodeId, output, elapsed);
    }

    this.currentNode = null;

    // Collect output nodes (no outgoing connections)
    const outputNodeIds = this._findOutputNodes(nodes, connections);
    const outputs = {};
    for (const id of outputNodeIds) {
      outputs[id] = results.get(id);
    }

    return {
      outputs,
      executionOrder: order,
      log: this.executionLog,
      totalTime: this.executionLog.reduce((sum, e) => sum + e.time, 0),
    };
  }

  /**
   * Mark a node as dirty (needs re-execution)
   * Propagates downstream
   * @param {string} nodeId
   * @param {import('./Graph.js').Connection[]} connections
   */
  markDirty(nodeId, connections) {
    if (this._dirty.has(nodeId)) return;
    this._dirty.add(nodeId);
    for (const conn of connections) {
      if (conn.from === nodeId) {
        this.markDirty(conn.to, connections);
      }
    }
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this._cache.clear();
    this._lifecycleCache.clear();
    this._dirty.clear();
  }

  /**
   * Topological sort using Kahn's algorithm
   * @param {Map<string, object>} nodes
   * @param {Array<{from: string, to: string}>} connections
   * @returns {string[]} Node IDs in execution order
   * @private
   */
  _topologicalSort(nodes, connections) {
    const inDegree = new Map();
    const adjacency = new Map();

    // Only include connected nodes (skip orphans)
    const connectedIds = new Set();
    for (const conn of connections) {
      connectedIds.add(conn.from);
      connectedIds.add(conn.to);
    }

    // Include source nodes (no incoming connections but exist in graph)
    for (const id of nodes.keys()) {
      if (connectedIds.has(id) || !connections.some(c => c.to === id || c.from === id)) {
        // Include connected nodes; orphans are skipped
      }
    }

    for (const id of connectedIds) {
      if (!nodes.has(id)) continue;
      inDegree.set(id, 0);
      adjacency.set(id, []);
    }

    // Also include source nodes (nodes with outgoing but no incoming)
    for (const id of nodes.keys()) {
      if (!connectedIds.has(id)) continue;
      if (!inDegree.has(id)) {
        inDegree.set(id, 0);
        adjacency.set(id, []);
      }
    }

    for (const conn of connections) {
      if (!adjacency.has(conn.from) || !inDegree.has(conn.to)) continue;
      adjacency.get(conn.from).push(conn.to);
      inDegree.set(conn.to, (inDegree.get(conn.to) || 0) + 1);
    }

    // Kahn's algorithm
    const queue = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id);
    }

    const result = [];
    while (queue.length > 0) {
      const nodeId = queue.shift();
      result.push(nodeId);
      for (const neighbor of (adjacency.get(nodeId) || [])) {
        const nd = inDegree.get(neighbor) - 1;
        inDegree.set(neighbor, nd);
        if (nd === 0) queue.push(neighbor);
      }
    }

    // Cycle detection
    const connectedCount = inDegree.size;
    if (result.length < connectedCount) {
      const remaining = [...inDegree.keys()].filter(id => !result.includes(id));
      throw new Error(`Graph contains cycle(s). Nodes involved: ${remaining.join(', ')}`);
    }

    return result;
  }

  /**
   * Resolve inputs for a node from upstream connections
   * @param {string} nodeId
   * @param {Array<{from: string, out: string, to: string, in: string}>} connections
   * @param {Map<string, any>} results
   * @returns {object}
   * @private
   */
  _resolveInputs(nodeId, connections, results) {
    const inputs = {};
    for (const conn of connections) {
      if (conn.to !== nodeId) continue;
      const upstream = results.get(conn.from);
      if (upstream !== undefined) {
        if (upstream && typeof upstream === 'object' && conn.out in upstream) {
          inputs[conn.in] = upstream[conn.out];
        } else {
          inputs[conn.in] = upstream;
        }
      }
    }
    return inputs;
  }

  /**
   * Find output nodes (no outgoing connections)
   * @param {Map<string, object>} nodes
   * @param {Array<{from: string}>} connections
   * @returns {string[]}
   * @private
   */
  _findOutputNodes(nodes, connections) {
    const hasOutgoing = new Set();
    for (const conn of connections) {
      hasOutgoing.add(conn.from);
    }
    const connected = new Set();
    for (const conn of connections) {
      connected.add(conn.from);
      connected.add(conn.to);
    }
    return [...connected].filter(id => !hasOutgoing.has(id) && nodes.has(id));
  }

  /**
   * Execute a compound node's sub-graph
   * @param {object} subGraphData - Sub-graph JSON definition
   * @param {object} parentInputs - Inputs from parent graph
   * @param {object} parentParams - Parent node params
   * @returns {Promise<object>} Merged outputs from sub-graph output nodes
   * @private
   */
  async _executeSubGraph(subGraphData, parentInputs, parentParams) {
    const subGraph = new Graph(subGraphData);

    // Inject parent inputs into sub-graph input nodes
    for (const node of subGraph.nodes.values()) {
      if (node.type === 'compound/input') {
        const injectedOutput = { ...parentInputs, ...parentParams };
        node._output = injectedOutput;
        node.process = () => injectedOutput;
      }
    }

    // Execute sub-graph with a fresh executor
    const subExecutor = new Executor();
    const result = await subExecutor.run(subGraph);

    // Merge all output node results
    const merged = {};
    for (const [id, output] of Object.entries(result.outputs)) {
      const node = subGraph.getNode(id);
      if (node.type === 'compound/output' && output) {
        Object.assign(merged, output);
      }
    }

    // Include dynamic socket info if sub-graph produces segments
    if (Object.keys(merged).length > 0) {
      merged.dynamicOutputs = Object.keys(merged);
    }

    return merged;
  }
}
