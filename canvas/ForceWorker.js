/**
 * ForceWorker — Force-directed layout in a Web Worker.
 *
 * Pure implementation (zero dependencies) of proven graph layout algorithms:
 *
 * 1. Barnes-Hut N-body repulsion — O(n log n) via quadtree
 *    Paper: Barnes & Hut, "A hierarchical O(N log N) force-calculation algorithm", Nature 1986
 *
 * 2. Quadtree collision detection — prevents node overlap
 *    Based on d3-force forceCollide approach: traverse quadtree, push apart overlapping rectangles
 *
 * 3. Hooke's law spring forces — edges pull connected nodes together
 *    F = -k * (distance - restLength)
 *
 * 4. Center gravity — prevents drift
 *    Weak force pulling all nodes toward centroid
 *
 * Protocol:
 *   Main → Worker: { type: 'init', nodes, edges, groups, options }
 *   Worker → Main: { type: 'tick', positions, energy, iteration }
 *   Worker → Main: { type: 'done', positions, iterations }
 *   Main → Worker: { type: 'stop' }
 *
 * @module symbiote-node/canvas/ForceWorker
 */

// =====================================================================
// 1. QUADTREE (Barnes-Hut spatial index)
// =====================================================================

/**
 * Adaptive quadtree supporting both charge computation and collision detection.
 * Each leaf stores a linked list of bodies at same position (handles coincident nodes).
 */
class Quad {
  constructor(x0, y0, x1, y1) {
    this.x0 = x0;  // min x
    this.y0 = y0;  // min y
    this.x1 = x1;  // max x
    this.y1 = y1;  // max y
  }
}

function quadtreeCreate(nodes) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const n of nodes) {
    if (n.x < x0) x0 = n.x;
    if (n.y < y0) y0 = n.y;
    if (n.x > x1) x1 = n.x;
    if (n.y > y1) y1 = n.y;
  }
  // Make square and add padding
  const dx = x1 - x0, dy = y1 - y0;
  const size = Math.max(dx, dy, 1) + 200;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;

  const tree = {
    x0: cx - size / 2, y0: cy - size / 2,
    x1: cx + size / 2, y1: cy + size / 2,
    root: null,
  };

  for (const n of nodes) {
    qtInsert(tree, n);
  }
  return tree;
}

function qtInsert(tree, body) {
  let node = tree.root;
  if (!node) { tree.root = { data: body, next: null }; return; }

  let x0 = tree.x0, y0 = tree.y0, x1 = tree.x1, y1 = tree.y1;
  let parent, i;

  // Navigate to leaf
  while (node.length) { // internal node (array of 4 children)
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    i = (body.x >= mx ? 1 : 0) | (body.y >= my ? 2 : 0);
    parent = node;
    if (body.x >= mx) x0 = mx; else x1 = mx;
    if (body.y >= my) y0 = my; else y1 = my;
    node = node[i];
    if (!node) { parent[i] = { data: body, next: null }; return; }
  }

  // Leaf node — check for coincident point
  const existing = node.data;
  if (Math.abs(existing.x - body.x) < 0.01 && Math.abs(existing.y - body.y) < 0.01) {
    // Coincident: append to linked list
    body._qtNext = node.data;
    node.data = body;
    return;
  }

  // Split: replace leaf with internal node, re-insert both
  // Walk up to find parent and replace
  let leaf = node;
  while (true) {
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    const iNew = (body.x >= mx ? 1 : 0) | (body.y >= my ? 2 : 0);
    const iOld = (existing.x >= mx ? 1 : 0) | (existing.y >= my ? 2 : 0);

    const internal = [null, null, null, null];
    internal.length = 4; // mark as internal
    if (parent) parent[i] = internal; else tree.root = internal;

    if (iNew !== iOld) {
      internal[iNew] = { data: body, next: null };
      internal[iOld] = leaf;
      return;
    }

    // Same quadrant — descend further
    parent = internal;
    i = iNew;
    if (body.x >= mx) x0 = mx; else x1 = mx;
    if (body.y >= my) y0 = my; else y1 = my;
  }
}

/**
 * Visit each node in the quadtree (post-order for aggregation).
 * callback(node, x0, y0, x1, y1) → return true to skip children.
 */
function qtVisitAfter(tree, callback) {
  const quads = [];
  if (tree.root) quads.push({ node: tree.root, x0: tree.x0, y0: tree.y0, x1: tree.x1, y1: tree.y1 });

  const stack = [];
  while (quads.length) {
    const q = quads.pop();
    stack.push(q);
    if (q.node.length) {
      const { x0, y0, x1, y1 } = q;
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
      if (q.node[0]) quads.push({ node: q.node[0], x0, y0, x1: mx, y1: my });
      if (q.node[1]) quads.push({ node: q.node[1], x0: mx, y0, x1, y1: my });
      if (q.node[2]) quads.push({ node: q.node[2], x0, y0: my, x1: mx, y1 });
      if (q.node[3]) quads.push({ node: q.node[3], x0: mx, y0: my, x1, y1 });
    }
  }
  // Post-order: process children before parents
  while (stack.length) {
    const q = stack.pop();
    callback(q.node, q.x0, q.y0, q.x1, q.y1);
  }
}

function qtVisit(tree, callback) {
  const quads = [];
  if (tree.root) quads.push({ node: tree.root, x0: tree.x0, y0: tree.y0, x1: tree.x1, y1: tree.y1 });
  while (quads.length) {
    const q = quads.pop();
    if (callback(q.node, q.x0, q.y0, q.x1, q.y1)) continue; // skip children
    if (q.node.length) {
      const { x0, y0, x1, y1 } = q;
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
      if (q.node[3]) quads.push({ node: q.node[3], x0: mx, y0: my, x1, y1 });
      if (q.node[2]) quads.push({ node: q.node[2], x0, y0: my, x1: mx, y1 });
      if (q.node[1]) quads.push({ node: q.node[1], x0: mx, y0, x1, y1: my });
      if (q.node[0]) quads.push({ node: q.node[0], x0, y0, x1: mx, y1: my });
    }
  }
}

// =====================================================================
// 2. FORCES
// =====================================================================

/**
 * Barnes-Hut charge force (Coulomb-like repulsion).
 * Aggregates mass and center-of-mass up the quadtree.
 * θ (theta) controls accuracy vs speed: region_size/distance < θ → treat as point mass.
 */
function applyChargeForce(nodes, strength, theta) {
  const tree = quadtreeCreate(nodes);

  // Aggregate: compute total charge and center-of-mass for each internal node
  qtVisitAfter(tree, (node) => {
    if (!node.length) {
      // Leaf: charge = strength
      const d = node.data;
      node.value = strength;
      node.x = d.x;
      node.y = d.y;
      return;
    }
    // Internal: sum children
    let value = 0, x = 0, y = 0, weight = 0;
    for (let i = 0; i < 4; i++) {
      const child = node[i];
      if (!child || !child.value) continue;
      const w = Math.abs(child.value);
      value += child.value;
      x += child.x * w;
      y += child.y * w;
      weight += w;
    }
    node.value = value;
    node.x = weight > 0 ? x / weight : 0;
    node.y = weight > 0 ? y / weight : 0;
  });

  // Apply forces using Barnes-Hut approximation
  const thetaSq = theta * theta;
  for (const body of nodes) {
    qtVisit(tree, (node, x0, y0, x1, y1) => {
      if (!node.value) return true; // skip empty

      let dx = node.x - body.x;
      let dy = node.y - body.y;
      let w = x1 - x0;

      // Jitter coincident points
      if (dx === 0 && dy === 0) { dx = (Math.random() - 0.5) * 1e-6; dy = (Math.random() - 0.5) * 1e-6; }

      const distSq = dx * dx + dy * dy;

      // Barnes-Hut criterion: if region width² / distance² < θ² → approximate
      if (w * w / distSq < thetaSq) {
        if (distSq < 1000 * 1000) { // distanceMax = 1000
          const dist = Math.sqrt(distSq);
          const force = node.value / distSq;
          body.vx -= dx * force;
          body.vy -= dy * force;
        }
        return true; // don't recurse
      }

      // If leaf and not self
      if (!node.length) {
        if (node.data !== body) {
          const dist = Math.sqrt(distSq) || 1;
          const force = strength / distSq;
          body.vx -= dx * force;
          body.vy -= dy * force;
        }
        return true;
      }

      return false; // recurse into children
    });
  }
}

/**
 * Collision force — prevents node overlap.
 * Builds quadtree, visits each node pair, pushes apart if bounding boxes overlap.
 * Uses rectangular collision (nodeW × nodeH), not circular.
 */
function applyCollisionForce(nodes, nodeW, nodeH, strength) {
  const hw = nodeW / 2;
  const hh = nodeH / 2;

  // Simple spatial hash for O(n) collision detection
  const cellW = nodeW * 2;
  const cellH = nodeH * 2;
  const grid = new Map();

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const gx = Math.floor(n.x / cellW);
    const gy = Math.floor(n.y / cellH);
    const key = gx * 73856093 ^ gy * 19349663; // spatial hash
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(i);
  }

  for (const [key, indices] of grid) {
    // Decode grid cell (approximate — we just need neighbors)
    // Check this cell
    for (let a = 0; a < indices.length; a++) {
      for (let b = a + 1; b < indices.length; b++) {
        resolveOverlap(nodes, indices[a], indices[b], hw, hh, strength);
      }
    }
  }

  // Also check adjacent cells
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const gx = Math.floor(n.x / cellW);
    const gy = Math.floor(n.y / cellH);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nk = (gx + dx) * 73856093 ^ (gy + dy) * 19349663;
        const neighbors = grid.get(nk);
        if (!neighbors) continue;
        for (const j of neighbors) {
          if (j <= i) continue;
          resolveOverlap(nodes, i, j, hw, hh, strength);
        }
      }
    }
  }
}

function resolveOverlap(nodes, i, j, hw, hh, strength) {
  const a = nodes[i], b = nodes[j];
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  const overlapX = hw + hw - Math.abs(dx); // nodeW - |dx|
  const overlapY = hh + hh - Math.abs(dy); // nodeH - |dy|

  if (overlapX > 0 && overlapY > 0) {
    // Push apart along axis of least overlap
    if (overlapX < overlapY) {
      const push = overlapX * strength * 0.5;
      const sign = dx < 0 ? -1 : (dx > 0 ? 1 : (Math.random() < 0.5 ? -1 : 1));
      a.vx -= sign * push;
      b.vx += sign * push;
    } else {
      const push = overlapY * strength * 0.5;
      const sign = dy < 0 ? -1 : (dy > 0 ? 1 : (Math.random() < 0.5 ? -1 : 1));
      a.vy -= sign * push;
      b.vy += sign * push;
    }
  }
}

/**
 * Spring force (Hooke's law) for linked nodes.
 * F = strength * (distance - restLength)
 */
function applyLinkForce(nodes, edges, alpha) {
  for (const e of edges) {
    const s = nodes[e.source];
    const t = nodes[e.target];
    if (!s || !t) continue;

    let dx = t.x + t.vx - s.x - s.vx;
    let dy = t.y + t.vy - s.y - s.vy;
    if (dx === 0 && dy === 0) { dx = (Math.random() - 0.5) * 1e-6; dy = dx; }

    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const force = (dist - e.restLength) / dist * alpha * e.strength;
    const fx = dx * force;
    const fy = dy * force;

    // Bias: split force based on link count (nodes with more links move less)
    const bias = e.bias;
    t.vx -= fx * bias;
    t.vy -= fy * bias;
    s.vx += fx * (1 - bias);
    s.vy += fy * (1 - bias);
  }
}

/**
 * Center force: pulls all nodes toward centroid.
 */
function applyCenterForce(nodes, strength) {
  let cx = 0, cy = 0;
  for (const n of nodes) { cx += n.x; cy += n.y; }
  cx /= nodes.length;
  cy /= nodes.length;
  for (const n of nodes) {
    n.vx -= (n.x - cx) * strength * 0.1; // weak centering, not snapping
    n.vy -= (n.y - cy) * strength * 0.1;
  }
}

// =====================================================================
// 3. SIMULATION
// =====================================================================

let nodes = [];
let edges = [];
let running = false;
let nodeW = 260;
let nodeH = 40;

let config = {
  chargeStrength: -300,   // Repulsion (negative = repel)
  theta: 0.9,             // Barnes-Hut accuracy (0.5=exact, 1.0=fast)
  linkDistance: 80,        // Spring rest length for edges
  linkStrength: 0.3,      // Spring stiffness for edges
  groupDistance: 120,      // Rest length for directory springs
  groupStrength: 0.05,    // Stiffness for directory springs
  collideStrength: 0.7,   // Collision response (0..1)
  centerStrength: 0.01,   // Center gravity
  velocityDecay: 0.4,     // Damping (0=no friction, 1=frozen)
  alphaDecay: 0.0228,     // Cooling rate
  alphaMin: 0.001,        // Convergence threshold
};

function initSimulation(data) {
  const { nodes: rawNodes, edges: rawEdges, groups = {}, options = {} } = data;

  // Merge config
  Object.assign(config, options);
  nodeW = options.nodeWidth || 260;
  nodeH = options.nodeHeight || 40;

  // Initialize nodes
  nodes = rawNodes.map((n, i) => {
    const angle = (2 * Math.PI * i) / rawNodes.length;
    const radius = Math.sqrt(rawNodes.length) * 50;
    return {
      id: n.id,
      x: n.x ?? Math.cos(angle) * radius + (Math.random() - 0.5) * 100,
      y: n.y ?? Math.sin(angle) * radius + (Math.random() - 0.5) * 100,
      vx: 0,
      vy: 0,
      group: n.group || null,
      index: i,
    };
  });

  const nodeIndex = {};
  nodes.forEach((n, i) => { nodeIndex[n.id] = i; });

  // Compute degree counts for link bias
  const degree = new Array(nodes.length).fill(0);

  // Initialize edges
  edges = rawEdges
    .map(e => {
      const si = nodeIndex[e.from], ti = nodeIndex[e.to];
      if (si === undefined || ti === undefined) return null;
      degree[si]++;
      degree[ti]++;
      return {
        source: si,
        target: ti,
        strength: config.linkStrength,
        restLength: config.linkDistance,
        bias: 0.5,
      };
    })
    .filter(Boolean);

  // Directory springs (star topology, capped)
  for (const [, memberIds] of Object.entries(groups)) {
    if (memberIds.length < 2) continue;
    const hubIdx = nodeIndex[memberIds[0]];
    if (hubIdx === undefined) continue;
    const limit = Math.min(memberIds.length, 12);
    for (let i = 1; i < limit; i++) {
      const ti = nodeIndex[memberIds[i]];
      if (ti !== undefined) {
        degree[hubIdx]++;
        degree[ti]++;
        edges.push({
          source: hubIdx,
          target: ti,
          strength: config.groupStrength,
          restLength: config.groupDistance,
          bias: 0.5,
        });
      }
    }
  }

  // Compute link bias: nodes with more links are harder to move
  // bias = degree(source) / (degree(source) + degree(target))
  for (const e of edges) {
    const ds = degree[e.source] || 1;
    const dt = degree[e.target] || 1;
    e.bias = ds / (ds + dt);
  }
}

function tick(alpha) {
  // 1. Repulsion (Barnes-Hut)
  applyChargeForce(nodes, config.chargeStrength * alpha, config.theta);

  // 2. Springs
  applyLinkForce(nodes, edges, alpha);

  // 3. Collision
  applyCollisionForce(nodes, nodeW, nodeH, config.collideStrength);

  // 4. Center gravity
  if (config.centerStrength > 0) {
    applyCenterForce(nodes, config.centerStrength);
  }

  // 5. Apply velocities with damping
  let energy = 0;
  const decay = 1 - config.velocityDecay;
  for (const n of nodes) {
    n.vx *= decay;
    n.vy *= decay;
    n.x += n.vx;
    n.y += n.vy;
    energy += n.vx * n.vx + n.vy * n.vy;
  }

  return energy;
}

function getPositions() {
  const positions = {};
  for (const n of nodes) {
    positions[n.id] = { x: Math.round(n.x), y: Math.round(n.y) };
  }
  return positions;
}

// =====================================================================
// 4. WORKER MESSAGE HANDLER
// =====================================================================

self.onmessage = function (e) {
  const { type } = e.data;

  if (type === 'init') {
    running = true;
    initSimulation(e.data);

    const totalNodes = nodes.length;
    if (totalNodes > 1000) config.alphaDecay = 0.03;

    // Alpha schedule: starts at 1, decays by alphaDecay each tick
    let alpha = 1;
    let iteration = 0;
    const maxIter = Math.ceil(Math.log(config.alphaMin) / Math.log(1 - config.alphaDecay)) + 1;
    const batchSize = totalNodes > 1000 ? 8 : 4;

    function runBatch() {
      if (!running) return;

      for (let i = 0; i < batchSize && alpha > config.alphaMin && iteration < maxIter; i++) {
        tick(alpha);
        alpha *= (1 - config.alphaDecay);
        iteration++;
      }

      const isDone = alpha <= config.alphaMin || iteration >= maxIter;

      // Post positions every batch or on done
      self.postMessage({
        type: isDone ? 'done' : 'tick',
        positions: getPositions(),
        energy: Math.round(alpha * 1000) / 1000,
        iteration,
      });

      if (isDone) {
        running = false;
        return;
      }

      setTimeout(runBatch, 0);
    }

    runBatch();
  }

  if (type === 'stop') {
    running = false;
    self.postMessage({
      type: 'done',
      positions: getPositions(),
      energy: 0,
      iteration: -1,
    });
  }
};
