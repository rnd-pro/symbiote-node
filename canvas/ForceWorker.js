/**
 * ForceWorker — d3-force based graph layout in a Web Worker.
 *
 * Uses d3-force's scientifically validated algorithms:
 * - forceManyBody: Barnes-Hut O(n log n) charge simulation
 * - forceCollide: prevents node overlap using quadtree
 * - forceLink: spring forces for connected nodes
 * - forceCenter: prevents graph drift
 *
 * Protocol:
 *   Main → Worker: { type: 'init', nodes, edges, groups, options }
 *   Worker → Main: { type: 'tick', positions, energy, iteration }
 *   Worker → Main: { type: 'done', positions, iterations }
 *   Main → Worker: { type: 'stop' }
 *
 * @module symbiote-node/canvas/ForceWorker
 */

// Load d3-force UMD bundle (self-contained: quadtree + dispatch + timer + force)
importScripts('./d3-force.min.js');

const d3 = self.d3;

let simulation = null;
let running = false;

self.onmessage = function (e) {
  const { type } = e.data;

  if (type === 'init') {
    if (simulation) simulation.stop();
    running = true;

    const { nodes: rawNodes, edges: rawEdges, groups = {}, options = {} } = e.data;

    // Node dimensions for collision detection
    const nodeW = options.nodeWidth || 260;
    const nodeH = options.nodeHeight || 40;
    // Use average of half-dimensions as collision radius
    const collideRadius = Math.sqrt((nodeW / 2) ** 2 + (nodeH / 2) ** 2);

    // Prepare nodes: d3-force mutates these in place
    const nodes = rawNodes.map(n => ({
      id: n.id,
      x: n.x ?? 0,
      y: n.y ?? 0,
      vx: 0,
      vy: 0,
      group: n.group || null,
    }));

    const nodeById = new Map(nodes.map(n => [n.id, n]));

    // Prepare links
    const links = rawEdges
      .filter(e => nodeById.has(e.from) && nodeById.has(e.to))
      .map(e => ({
        source: e.from,
        target: e.to,
      }));

    // Group springs: connect same-directory nodes with weak springs
    // Star topology: first member is hub, rest connect to hub
    for (const [, memberIds] of Object.entries(groups)) {
      if (memberIds.length < 2) continue;
      const hub = memberIds[0];
      if (!nodeById.has(hub)) continue;
      const limit = Math.min(memberIds.length, 12);
      for (let i = 1; i < limit; i++) {
        if (nodeById.has(memberIds[i])) {
          links.push({
            source: hub,
            target: memberIds[i],
            _isGroup: true,
          });
        }
      }
    }

    // Total ticks: computed from alpha decay
    const totalNodes = nodes.length;
    const alphaDecay = options.alphaDecay || (totalNodes > 1000 ? 0.03 : 0.0228);
    const alphaMin = options.alphaMin || 0.001;
    const maxTicks = Math.ceil(Math.log(alphaMin) / Math.log(1 - alphaDecay)) + 1;

    // Configure simulation with d3-force algorithms
    simulation = d3.forceSimulation(nodes)
      .alphaDecay(alphaDecay)
      .alphaMin(alphaMin)
      .velocityDecay(options.velocityDecay || 0.4)

      // Charge: Barnes-Hut repulsion O(n log n)
      .force('charge', d3.forceManyBody()
        .strength(options.chargeStrength || (totalNodes > 500 ? -200 : -300))
        .theta(options.theta || 0.9)
        .distanceMax(options.distanceMax || 1000)
      )

      // Links: spring forces for edges
      .force('link', d3.forceLink(links)
        .id(d => d.id)
        .distance(link => link._isGroup
          ? (options.groupDistance || 120)
          : (options.linkDistance || 80)
        )
        .strength(link => link._isGroup
          ? (options.groupStrength || 0.05)
          : (options.linkStrength || 0.3)
        )
      )

      // Collision: prevents node overlap using quadtree
      .force('collide', d3.forceCollide()
        .radius(collideRadius)
        .strength(options.collideStrength || 0.7)
        .iterations(2)
      )

      // Center gravity: prevents drift
      .force('center', d3.forceCenter(0, 0))

      // Stop auto-ticking — we control tick timing manually
      .stop();

    let iteration = 0;
    const tickBatch = totalNodes > 1000 ? 8 : 4; // Batch ticks for performance

    function runBatch() {
      if (!running) return;

      for (let i = 0; i < tickBatch && iteration < maxTicks; i++) {
        simulation.tick();
        iteration++;
      }

      const isDone = iteration >= maxTicks || simulation.alpha() < alphaMin;

      // Send positions
      const positions = {};
      for (const n of nodes) {
        positions[n.id] = { x: Math.round(n.x), y: Math.round(n.y) };
      }

      self.postMessage({
        type: isDone ? 'done' : 'tick',
        positions,
        energy: Math.round(simulation.alpha() * 1000) / 1000,
        iteration,
      });

      if (isDone) {
        running = false;
        simulation.stop();
        return;
      }

      // Schedule next batch — 0ms timeout yields to message loop
      setTimeout(runBatch, 0);
    }

    runBatch();
  }

  if (type === 'stop') {
    running = false;
    if (simulation) {
      simulation.stop();

      const nodes = simulation.nodes();
      const positions = {};
      for (const n of nodes) {
        positions[n.id] = { x: Math.round(n.x), y: Math.round(n.y) };
      }

      self.postMessage({
        type: 'done',
        positions,
        energy: 0,
        iteration: -1,
      });
    }
  }
};
