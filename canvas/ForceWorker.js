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
  const distMin2 = 100; // min distance² = 10px — prevents explosive forces from coincident nodes
  for (const body of nodes) {
    qtVisit(tree, (node, x0, y0, x1, y1) => {
      if (!node.value) return true; // skip empty

      let dx = node.x - body.x;
      let dy = node.y - body.y;
      let w = x1 - x0;

      // Jitter coincident points (meaningful distance, not infinitesimal)
      if (dx === 0 && dy === 0) {
        dx = (Math.random() - 0.5) * 20;
        dy = (Math.random() - 0.5) * 20;
      }

      let distSq = dx * dx + dy * dy;
      if (distSq < distMin2) distSq = distMin2; // clamp

      // Barnes-Hut criterion: if region width² / distance² < θ² → approximate
      if (w * w / distSq < thetaSq) {
        if (distSq < 1000 * 1000) { // distanceMax = 1000
          const force = node.value / distSq;
          body.vx -= dx * force;
          body.vy -= dy * force;
        }
        return true; // don't recurse
      }

      // If leaf and not self
      if (!node.length) {
        if (node.data !== body) {
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
 * Uses spatial hash grid for O(n) neighbor detection.
 * Applies POSITIONAL separation (not just velocity) for hard constraints.
 * Multi-pass (3 iterations) to resolve chain collisions.
 */
function applyCollisionForce(nodes, strength, iterations) {
  const iters = iterations || 3;
  // Padding: add small gap between nodes
  const padX = 8;
  const padY = 4;
  
  let maxW = 260;
  let maxH = 40;
  for (const n of nodes) {
    if (n.w > maxW) maxW = n.w;
    if (n.h > maxH) maxH = n.h;
  }

  for (let pass = 0; pass < iters; pass++) {
    // Rebuild spatial hash each pass (positions shift)
    const cellW = maxW * 1.5;
    const cellH = maxH * 3;
    const grid = new Map();

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const gx = Math.floor(n.x / cellW);
      const gy = Math.floor(n.y / cellH);
      const key = `${gx},${gy}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(i);
    }

    // Check each node against its cell + all 8 neighbors
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const gx = Math.floor(n.x / cellW);
      const gy = Math.floor(n.y / cellH);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const neighbors = grid.get(`${gx + dx},${gy + dy}`);
          if (!neighbors) continue;
          for (const j of neighbors) {
            if (j <= i) continue;
            resolveOverlap(nodes, i, j, padX, padY, strength);
          }
        }
      }
    }
  }
}

function resolveOverlap(nodes, i, j, padX, padY, strength) {
  const a = nodes[i], b = nodes[j];
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  const hwA = a.w / 2 + padX;
  const hhA = a.h / 2 + padY;
  const hwB = b.w / 2 + padX;
  const hhB = b.h / 2 + padY;
  const overlapX = (hwA + hwB) - Math.abs(dx);
  const overlapY = (hhA + hhB) - Math.abs(dy);

  if (overlapX > 0 && overlapY > 0) {
    // Constraint-based: 100% positional push (Verlet-style)
    // This ensures overlaps are resolved immediately, not damped away
    if (overlapX < overlapY) {
      const sign = dx < 0 ? -1 : (dx > 0 ? 1 : (Math.random() < 0.5 ? -1 : 1));
      const push = overlapX * strength * 0.5;
      a.x -= sign * push;
      b.x += sign * push;
      
      // Orthogonal jitter to prevent perfect 1D horizontal stacking
      const jitter = (Math.random() - 0.5) * 0.5;
      a.y -= jitter;
      b.y += jitter;
    } else {
      const sign = dy < 0 ? -1 : (dy > 0 ? 1 : (Math.random() < 0.5 ? -1 : 1));
      const push = overlapY * strength * 0.5;
      a.y -= sign * push;
      b.y += sign * push;
      
      // Orthogonal jitter to prevent perfect 1D vertical column stacking.
      // Wide nodes (260x40) force vertical pushing, causing dx=0 traps where
      // the radial charge force becomes useless. Jitter allows radial expansion.
      const jitter = (Math.random() - 0.5) * 0.5;
      a.x -= jitter;
      b.x += jitter;
    }
  }
}

/**
 * Count overlapping node pairs using spatial hash. O(n) average.
 * @returns {number} Number of overlapping pairs
 */
function countOverlaps(nodes) {
  let maxW = 260, maxH = 40;
  for (const n of nodes) {
    if (n.w > maxW) maxW = n.w;
    if (n.h > maxH) maxH = n.h;
  }
  const cellW = maxW * 1.5;
  const cellH = maxH * 3;
  const grid = new Map();

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const key = `${Math.floor(n.x / cellW)},${Math.floor(n.y / cellH)}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(i);
  }

  let count = 0;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const gx = Math.floor(n.x / cellW);
    const gy = Math.floor(n.y / cellH);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const neighbors = grid.get(`${gx + dx},${gy + dy}`);
        if (!neighbors) continue;
        for (const j of neighbors) {
          if (j <= i) continue;
          const b = nodes[j];
          const hwA = n.w / 2, hhA = n.h / 2;
          const hwB = b.w / 2, hhB = b.h / 2;
          if (Math.abs(n.x - b.x) < hwA + hwB && Math.abs(n.y - b.y) < hhA + hhB) count++;
        }
      }
    }
  }
  return count;
}

/**
 * Jitter only nodes that are actually overlapping. Uses spatial hash for O(n).
 * Small random displacement breaks deadlocks in post-convergence cleanup.
 */
function jitterOverlappingNodes(nodes) {
  let maxW = 260, maxH = 40;
  for (const n of nodes) {
    if (n.w > maxW) maxW = n.w;
    if (n.h > maxH) maxH = n.h;
  }
  const cellW = maxW * 1.5;
  const cellH = maxH * 3;
  const grid = new Map();

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const key = `${Math.floor(n.x / cellW)},${Math.floor(n.y / cellH)}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(i);
  }

  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    const gx = Math.floor(a.x / cellW);
    const gy = Math.floor(a.y / cellH);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const neighbors = grid.get(`${gx + dx},${gy + dy}`);
        if (!neighbors) continue;
        for (const j of neighbors) {
          if (j <= i) continue;
          const b = nodes[j];
          const hwA = a.w / 2, hhA = a.h / 2;
          const hwB = b.w / 2, hhB = b.h / 2;
          const ox = (hwA + hwB) - Math.abs(a.x - b.x);
          const oy = (hhA + hhB) - Math.abs(a.y - b.y);
          if (ox > 0 && oy > 0) {
            // Push apart along minimum-overlap axis + small random to break symmetry
            if (ox < oy) {
              const sign = a.x < b.x ? -1 : (a.x > b.x ? 1 : (Math.random() < 0.5 ? -1 : 1));
              const push = (ox / 2 + 5 + Math.random() * 10);
              a.x += sign * push;
              b.x -= sign * push;
            } else {
              const sign = a.y < b.y ? -1 : (a.y > b.y ? 1 : (Math.random() < 0.5 ? -1 : 1));
              const push = (oy / 2 + 3 + Math.random() * 6);
              a.y += sign * push;
              b.y -= sign * push;
            }
          }
        }
      }
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
  chargeStrength: -150,   // Repulsion (negative = repel). NOT scaled by alpha (d3 convention).
  theta: 0.8,             // Barnes-Hut accuracy (0.5=exact, 1.0=fast)
  linkDistance: 150,       // Spring rest length for edges
  linkStrength: 0.2,      // Spring stiffness for edges
  groupDistance: 120,      // Rest length for directory springs
  groupStrength: 0.05,    // Stiffness for directory springs
  collideStrength: 0.8,   // Collision response (0..1)
  centerStrength: 0.01,   // Center gravity
  velocityDecay: 0.4,     // Damping (d3 default)
  alphaDecay: 0.0228,     // Cooling rate (d3 default)
  alphaMin: 0.001,        // Convergence threshold
  alphaTarget: 0,          // Target alpha for cooling
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
      w: n.w || options.nodeWidth || 260,
      h: n.h || options.nodeHeight || 40,
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
  // 1. Repulsion (Barnes-Hut) — NOT scaled by alpha (d3 convention).
  // Charge is a constant field, not temperature-dependent.
  applyChargeForce(nodes, config.chargeStrength, config.theta);

  // 2. Springs — scaled by alpha (cools down over time)
  applyLinkForce(nodes, edges, alpha);

  // 3. Collision (multi-pass, before integration)
  applyCollisionForce(nodes, config.collideStrength, 4);

  // 4. Center gravity — scaled by alpha to allow early spread
  if (config.centerStrength > 0) {
    applyCenterForce(nodes, config.centerStrength * alpha);
  }

  // 5. Velocity Verlet integration: decay then move (d3 order)
  let energy = 0;
  const decay = 1 - config.velocityDecay;
  // vMax scales with graph: large graphs need more velocity headroom
  const vMax = Math.max(200, Math.sqrt(nodes.length) * 10);
  for (const n of nodes) {
    n.vx *= decay;
    n.vy *= decay;
    // Clamp velocity
    if (n.vx > vMax) n.vx = vMax;
    else if (n.vx < -vMax) n.vx = -vMax;
    if (n.vy > vMax) n.vy = vMax;
    else if (n.vy < -vMax) n.vy = -vMax;
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

    // Adaptive alpha decay: start with d3 default, adjust based on overlap feedback
    let adaptiveAlphaDecay = config.alphaDecay;
    // Alpha schedule: d3-style interpolation toward alphaTarget
    let alpha = 1;
    let iteration = 0;
    const maxIter = Math.ceil(Math.log(config.alphaMin) / Math.log(1 - config.alphaDecay)) + 1;
    const batchSize = totalNodes > 1000 ? 8 : 4;

    function runBatch() {
      if (!running) return;

      for (let i = 0; i < batchSize && alpha > config.alphaMin && iteration < maxIter; i++) {
        tick(alpha);
        // d3-style alpha decay
        alpha += (config.alphaTarget - alpha) * adaptiveAlphaDecay;
        iteration++;
      }

      // Adaptive feedback: check overlaps periodically and slow cooling if needed
      if (iteration % 20 === 0) {
        const overlaps = countOverlaps(nodes);
        if (overlaps > 0 && alpha > 0.05) {
          adaptiveAlphaDecay = Math.max(0.005, adaptiveAlphaDecay * 0.9);
        }
      }

      const isDone = alpha <= config.alphaMin || iteration >= maxIter;

      if (!isDone) {
        self.postMessage({
          type: 'tick',
          positions: getPositions(),
          energy: Math.round(alpha * 1000) / 1000,
          iteration,
          overlaps: countOverlaps(nodes),
        });
        setTimeout(runBatch, 0);
      } else {
        // ── Gentle Expansion Post-Convergence Phase ──
        // Run as an async batch loop to prevent worker freezes and provide smooth UI ticks
        let attempt = 0;
        const maxExpansionAttempts = 2000;
        // With O(N) spatial hash, we can afford bigger batches even on large graphs
        const expansionBatchSize = totalNodes > 1000 ? 10 : 20;

        function runExpansionBatch() {
          if (!running) return;
          
          let overlaps = countOverlaps(nodes);
          let bIter = 0;
          
          while (overlaps > 0 && attempt < maxExpansionAttempts && bIter < expansionBatchSize) {
            // Purely local collision resolution (already O(N) via spatial hash inside)
            applyCollisionForce(nodes, 1.0, 4);

            // Add radial velocity using spatial hash — O(N) instead of O(N²)
            let maxW = 260, maxH = 40;
            for (const n of nodes) {
              if (n.w > maxW) maxW = n.w;
              if (n.h > maxH) maxH = n.h;
            }
            const cellW = maxW * 1.5;
            const cellH = maxH * 3;
            const grid = new Map();
            for (let i = 0; i < nodes.length; i++) {
              const n = nodes[i];
              const key = `${Math.floor(n.x / cellW)},${Math.floor(n.y / cellH)}`;
              if (!grid.has(key)) grid.set(key, []);
              grid.get(key).push(i);
            }

            for (let i = 0; i < nodes.length; i++) {
              const a = nodes[i];
              const gx = Math.floor(a.x / cellW);
              const gy = Math.floor(a.y / cellH);
              for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                  const neighbors = grid.get(`${gx + dx},${gy + dy}`);
                  if (!neighbors) continue;
                  for (const j of neighbors) {
                    if (j <= i) continue;
                    const b = nodes[j];
                    let ddx = b.x - a.x;
                    let ddy = b.y - a.y;
                    const limitX = (a.w + b.w) / 2;
                    const limitY = (a.h + b.h) / 2;
                    if (Math.abs(ddx) < limitX && Math.abs(ddy) < limitY) {
                      let len = Math.sqrt(ddx*ddx + ddy*ddy);
                      if (len === 0) { ddx = Math.random()-0.5; ddy = Math.random()-0.5; len = Math.sqrt(ddx*ddx+ddy*ddy)||1; }
                      const push = 2 / len;
                      a.vx -= ddx * push;
                      b.vx += ddx * push;
                      a.vy -= ddy * push;
                      b.vy += ddy * push;
                    }
                  }
                }
              }
            }

            // High damping integration so they ooze apart without exploding
            const decay = 0.8;
            for (const n of nodes) {
              n.vx *= decay;
              n.vy *= decay;
              if (n.vx > 10) n.vx = 10; else if (n.vx < -10) n.vx = -10;
              if (n.vy > 10) n.vy = 10; else if (n.vy < -10) n.vy = -10;
              n.x += n.vx;
              n.y += n.vy;
            }

            overlaps = countOverlaps(nodes);
            attempt++;
            bIter++;
          }

          if (overlaps > 0 && attempt < maxExpansionAttempts) {
            self.postMessage({
              type: 'tick',
              positions: getPositions(),
              energy: 0, // 0 indicates cooling is done, we are in expansion
              iteration: iteration + attempt,
              overlaps,
            });
            setTimeout(runExpansionBatch, 0);
          } else {
            running = false;
            self.postMessage({
              type: 'done',
              positions: getPositions(),
              iterations: iteration + attempt,
            });
          }
        }
        
        runExpansionBatch();
      }
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
