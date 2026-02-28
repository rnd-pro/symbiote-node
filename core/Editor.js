/**
 * NodeEditor — central graph manager with event system
 *
 * Provides CRUD operations for nodes and connections with
 * pre/post event hooks via callback-based event emitter.
 * Replaces Rete.js Scope/Signal with simpler emit pattern.
 *
 * @module symbiote-node/core/Editor
 */

import { Connection } from './Connection.js';

/**
 * @typedef {'nodecreate'|'nodecreated'|'noderemove'|'noderemoved'|
 *           'connectioncreate'|'connectioncreated'|'connectionremove'|'connectionremoved'|
 *           'clear'|'cleared'|'nodeselect'|'nodedeselect'} EditorEvent
 */

export class NodeEditor {
  constructor() {
    /** @type {Map<string, import('./Node.js').Node>} */
    this.nodes = new Map();

    /** @type {Map<string, Connection>} */
    this.connections = new Map();

    /** @type {Object<string, Set<function>>} */
    this._listeners = {};
  }

  // --- Event System ---

  /**
   * Subscribe to editor event
   * @param {EditorEvent} event
   * @param {function} handler
   * @returns {function} Unsubscribe function
   */
  on(event, handler) {
    if (!this._listeners[event]) {
      this._listeners[event] = new Set();
    }
    this._listeners[event].add(handler);
    return () => this._listeners[event].delete(handler);
  }

  /**
   * Emit event to all listeners
   * @param {EditorEvent} event
   * @param {*} data
   * @returns {boolean} - false if any listener returned false (cancel)
   */
  emit(event, data) {
    const handlers = this._listeners[event];
    if (!handlers) return true;
    for (const handler of handlers) {
      if (handler(data) === false) return false;
    }
    return true;
  }

  // --- Node CRUD ---

  /**
   * Get node by ID
   * @param {string} id
   * @returns {import('./Node.js').Node|undefined}
   */
  getNode(id) {
    return this.nodes.get(id);
  }

  /**
   * Get all nodes
   * @returns {import('./Node.js').Node[]}
   */
  getNodes() {
    return [...this.nodes.values()];
  }

  /**
   * Add node to editor
   * @param {import('./Node.js').Node} node
   * @returns {boolean}
   */
  addNode(node) {
    if (this.nodes.has(node.id)) throw new Error('node already added');
    if (!this.emit('nodecreate', node)) return false;
    this.nodes.set(node.id, node);
    this.emit('nodecreated', node);
    return true;
  }

  /**
   * Remove node and all its connections
   * @param {string} id
   * @returns {boolean}
   */
  removeNode(id) {
    const node = this.nodes.get(id);
    if (!node) throw new Error('node not found');
    if (!this.emit('noderemove', node)) return false;

    // Remove all connections to/from this node
    for (const [connId, conn] of this.connections) {
      if (conn.from === id || conn.to === id) {
        this.removeConnection(connId);
      }
    }

    this.nodes.delete(id);
    this.emit('noderemoved', node);
    return true;
  }

  // --- Connection CRUD ---

  /**
   * Get connection by ID
   * @param {string} id
   * @returns {Connection|undefined}
   */
  getConnection(id) {
    return this.connections.get(id);
  }

  /**
   * Get all connections
   * @returns {Connection[]}
   */
  getConnections() {
    return [...this.connections.values()];
  }

  /**
   * Get connections for a specific node
   * @param {string} nodeId
   * @returns {Connection[]}
   */
  getNodeConnections(nodeId) {
    return this.getConnections().filter(c => c.from === nodeId || c.to === nodeId);
  }

  /**
   * Add connection
   * @param {Connection} connection
   * @returns {boolean}
   */
  addConnection(connection) {
    if (this.connections.has(connection.id)) throw new Error('connection already added');
    if (!this.emit('connectioncreate', connection)) return false;
    this.connections.set(connection.id, connection);
    this.emit('connectioncreated', connection);
    return true;
  }

  /**
   * Remove connection
   * @param {string} id
   * @returns {boolean}
   */
  removeConnection(id) {
    const conn = this.connections.get(id);
    if (!conn) return false;
    if (!this.emit('connectionremove', conn)) return false;
    this.connections.delete(id);
    this.emit('connectionremoved', conn);
    return true;
  }

  // --- Bulk Operations ---

  /**
   * Clear all nodes and connections
   * @returns {boolean}
   */
  clear() {
    if (!this.emit('clear', null)) return false;
    for (const id of [...this.connections.keys()]) {
      this.removeConnection(id);
    }
    for (const id of [...this.nodes.keys()]) {
      this.removeNode(id);
    }
    this.emit('cleared', null);
    return true;
  }

  // --- Serialization (agi-graph compatible) ---

  /**
   * Serialize editor state to agi-graph JSON format
   * @param {Object<string, number[]>} [positions] - Node positions {nodeId: [x, y]}
   * @returns {object}
   */
  toJSON(positions = {}) {
    return {
      nodes: this.getNodes().map(n => ({
        id: n.id,
        type: n.type,
        name: n.label,
        category: n.category,
        params: { ...n.params },
      })),
      connections: this.getConnections().map(c => ({
        from: c.from,
        out: c.out,
        to: c.to,
        in: c.in,
      })),
      ui: {
        positions: { ...positions },
      },
    };
  }
}
