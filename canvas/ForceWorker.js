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
 * Continuous mode (options.mode = 'continuous'):
 *   Main → Worker: { type: 'pause' }           — freeze simulation, keep state
 *   Main → Worker: { type: 'resume' }          — unfreeze with gentle reheat
 *   Main → Worker: { type: 'pin', id, x, y }   — fix node at position (drag)
 *   Main → Worker: { type: 'unpin', id }        — release pinned node
 *   Worker → Main: { type: 'tick', packed: Float32Array } — packed positions
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
      // Leaf: sum charge of all coincident points
      let current = node.data;
      let count = 0;
      while (current) {
        count++;
        current = current._qtNext;
      }
      node.value = strength * count;
      node.x = node.data.x;
      node.y = node.data.y;
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
  // Adaptive min distance: scale to largest side of node to prevent identical forces on small nodes
  let avgSize = 20;
  if (nodes.length > 0) {
    avgSize = nodes.reduce((s, n) => s + Math.max(n.w, n.h), 0) / nodes.length;
  }
  const distMin2 = Math.max(1, avgSize * avgSize * 0.25);
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

      // If leaf, iterate all coincident points
      if (!node.length) {
        let current = node.data;
        while (current) {
          if (current !== body) {
            let dxLeaf = current.x - body.x;
            let dyLeaf = current.y - body.y;
            if (dxLeaf === 0 && dyLeaf === 0) {
              dxLeaf = (Math.random() - 0.5) * 20;
              dyLeaf = (Math.random() - 0.5) * 20;
            }
            let distSqLeaf = dxLeaf * dxLeaf + dyLeaf * dyLeaf;
            if (distSqLeaf < distMin2) distSqLeaf = distMin2;
            const force = strength / distSqLeaf;
            body.vx -= dxLeaf * force;
            body.vy -= dyLeaf * force;
          }
          current = current._qtNext;
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
  
  let maxW = 0;
  let maxH = 0;
  for (const n of nodes) {
    if (n.w > maxW) maxW = n.w;
    if (n.h > maxH) maxH = n.h;
  }
  // Ensure minimums for grid cell sizing
  if (maxW < 20) maxW = 20;
  if (maxH < 20) maxH = 20;

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
  
  // Unified physics constraints:
  // 1. Same parent (or both null) -> collide
  // 2. Active group node collides with ALL root nodes
  if (a.parentId !== b.parentId) {
    if (a.id !== config.activeGroupId && b.id !== config.activeGroupId) {
      return;
    }
    // Do not collide the active group with its own children
    if ((a.id === config.activeGroupId && b.parentId === a.id) ||
        (b.id === config.activeGroupId && a.parentId === b.id)) {
      return;
    }
  }

  // Calculate overlap using current positions
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  
  const hwA = a.w / 2 + padX;
  const hhA = a.h / 2 + padY;
  const hwB = b.w / 2 + padX;
  const hhB = b.h / 2 + padY;
  
  const overlapX = (hwA + hwB) - Math.abs(dx);
  const overlapY = (hhA + hhB) - Math.abs(dy);

  if (overlapX > 0 && overlapY > 0) {
    // HARD CONSTRAINT: 100% impermeable space. Modifying positions directly.
    // Also clearing velocities in the push direction to stop momentum.
    if (overlapX < overlapY) {
      const sign = dx < 0 ? -1 : (dx > 0 ? 1 : (Math.random() < 0.5 ? -1 : 1));
      const push = overlapX * strength * 0.5;
      
      a.x -= sign * push;
      b.x += sign * push;
      
      // Stop velocity pushing them together horizontally
      if (Math.sign(a.vx) === sign) a.vx = 0;
      if (Math.sign(b.vx) === -sign) b.vx = 0;
      
      // Orthogonal jitter to prevent perfect 1D stacking
      const jitter = (Math.random() - 0.5) * 0.5;
      a.y -= jitter;
      b.y += jitter;
    } else {
      const sign = dy < 0 ? -1 : (dy > 0 ? 1 : (Math.random() < 0.5 ? -1 : 1));
      const push = overlapY * strength * 0.5;
      
      a.y -= sign * push;
      b.y += sign * push;
      
      // Stop velocity pushing them together vertically
      if (Math.sign(a.vy) === sign) a.vy = 0;
      if (Math.sign(b.vy) === -sign) b.vy = 0;
      
      // Orthogonal jitter to prevent perfect 1D stacking
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
 * Center force: pulls all nodes toward centroid or attractors.
 * External nodes → global center (0,0). Internal nodes → parent center (bx,by).
 */
function applyCenterForce(nodes, strength, attractors, bx = 0, by = 0) {
  for (const n of nodes) {
    let targetX, targetY;
    
    if (n.parentId) {
      // Internal node → pull toward parent center (+ optional attractor offset)
      if (attractors && n.type && attractors[n.type]) {
        targetX = bx + attractors[n.type].x;
        targetY = by + attractors[n.type].y;
      } else {
        targetX = bx;
        targetY = by;
      }
    } else {
      // External node → pull toward global centroid
      targetX = 0;
      targetY = 0;
    }
    
    n.vx -= (n.x - targetX) * strength * 0.1;
    n.vy -= (n.y - targetY) * strength * 0.1;
  }
}

/**
 * Boundary force: pushes nodes back if they escape the boundary circle.
 */
function applyBoundaryForce(nodes, radius, strength, bx, by, activeGroupId) {
  if (!radius) return;
  const rSq = radius * radius;
  for (const n of nodes) {
    if (n.parentId !== activeGroupId) continue; // Only constrain internal nodes
    const dx = n.x - bx;
    const dy = n.y - by;
    const distSq = dx * dx + dy * dy;
    if (distSq > rSq) {
      const dist = Math.sqrt(distSq);
      const overlap = dist - radius;
      const nx = dx / dist;
      const ny = dy / dist;
      n.vx -= nx * overlap * strength;
      n.vy -= ny * overlap * strength;
    }
  }
}

// =====================================================================
// 3. SIMULATION
// =====================================================================

let nodes = [];
let edges = [];
let running = false;
let paused = false;
let alpha = 1;
let iteration = 0;
let cachedActiveGroupNode = null;
let galacticSuns = [];    // Hub nodes (high-degree or groups)
let planets = [];         // Leaf nodes assigned to a sun
let simMode = 'converge'; // 'converge' | 'continuous'
let continuousTimer = null;

let config = {
  chargeStrength: -250,   // Repulsion (negative = repel). NOT scaled by alpha (d3 convention).
  theta: 0.7,             // Barnes-Hut accuracy (0.5=exact, 1.0=fast)
  linkDistance: 180,       // Spring rest length for edges
  linkStrength: 0.15,     // Spring stiffness for edges
  groupDistance: 120,      // Rest length for directory springs
  groupStrength: 0.05,    // Stiffness for directory springs
  collideStrength: 0.95,  // Collision response (0..1)
  centerStrength: 0.01,   // Center gravity
  velocityDecay: 0.92,    // Damping — higher = calmer (Ultra-Calm tuned)
  alphaDecay: 0.015,      // Cooling rate — slower than d3 default for smoother settling
  alphaMin: 0.001,        // Convergence threshold
  alphaTarget: 0,          // Target alpha for cooling
  // Continuous mode params (Ultra-Calm tuned)
  contAlphaFloor: 0.001,   // Minimum alpha floor in continuous mode
  contAlphaTarget: 0.001,  // Alpha target for steady-state drift
  brownian: 0.005,         // Brownian motion impulse strength — very subtle
  brownianThresh: 0.005,   // Alpha threshold to start Brownian
  pinReheat: 0.03,         // Alpha bump on pin
  pinCap: 0.1,             // Max alpha from pin reheat
  resumeReheat: 0.05,      // Alpha bump on resume
  resumeCap: 0.1,          // Max alpha from resume
  
  // Group physics
  activeGroupId: null,     // ID of the currently expanded group
  boundaryRadius: null,    // If set, constrains nodes to circle of this radius
  boundaryStrength: 0.2,   // Stiffness of boundary repulsion
  attractors: null,        // Object mapping node.type to {x, y} coordinates
  // Galactic Physics params (live-tunable, all alpha-scaled)
  wellStrength: 0.8,       // Planet → Sun pull strength (was 0.06 non-alpha)
  centerPull: 0.3,         // Sun → origin pull
  wellRepulsion: 5.0,      // Inter-Sun overlap push strength
  crossLinkScale: 0.2,     // Cross-cluster link strength multiplier (0.2 = 20%)
};

function initSimulation(data) {
  const { nodes: rawNodes, edges: rawEdges, groups = {}, options = {} } = data;

  // Merge config
  Object.assign(config, options);
  simMode = options.mode || 'converge';
  
  // Will be populated after nodes array is built
  cachedActiveGroupNode = null;

  // Initialize nodes — two-pass for hierarchy
  nodes = rawNodes.map((n, i) => {
    const angle = (2 * Math.PI * i) / rawNodes.length;
    const radius = Math.sqrt(rawNodes.length) * 50;
    const w = n.w || options.nodeWidth || 260;
    const h = n.h || options.nodeHeight || 40;
    
    // If position was provided (from smoothPositions), use it directly
    // Otherwise fall back to circular layout
    const hasPos = n.x !== undefined && n.y !== undefined;
    return {
      id: n.id,
      x: hasPos ? n.x : Math.cos(angle) * radius + (Math.random() - 0.5) * 100,
      y: hasPos ? n.y : Math.sin(angle) * radius + (Math.random() - 0.5) * 100,
      _hadPos: hasPos, // flag for pass 2
      vx: 0,
      vy: 0,
      group: n.group || null,
      type: n.type || null,
      parentId: n.parentId || null,
      isGroup: n.isGroup || false,
      children: n.children || [],
      index: i,
      w,
      h,
    };
  });

  // Pass 2: relocate NEW children (no prior position) to parent center in a small circle
  if (options.activeGroupId) {
    const parentNode = nodes.find(n => n.id === options.activeGroupId);
    if (parentNode) {
      // Collect new children
      const newChildren = nodes.filter(n => n.parentId === options.activeGroupId && !n._hadPos);
      for (let i = 0; i < newChildren.length; i++) {
        const n = newChildren[i];
        // Spread in circle at ~30% of bubble radius
        const angle = (2 * Math.PI * i) / newChildren.length + (Math.random() - 0.5) * 0.5;
        const spread = parentNode.w * 0.3;
        n.x = parentNode.x + Math.cos(angle) * spread;
        n.y = parentNode.y + Math.sin(angle) * spread;
        // Outward kick — burst from center
        n.vx = Math.cos(angle) * 15;
        n.vy = Math.sin(angle) * 15;
      }
    }
  }

  const nodeIndex = {};
  nodes.forEach((n, i) => { nodeIndex[n.id] = i; });

  // Compute raw degree counts to find true hubs (most connected nodes)
  const rawDegree = new Array(nodes.length).fill(0);
  rawEdges.forEach(e => {
    const si = nodeIndex[e.from], ti = nodeIndex[e.to];
    if (si !== undefined) rawDegree[si]++;
    if (ti !== undefined) rawDegree[ti]++;
  });

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

  // Directory springs (star topology)
  for (const [, memberIds] of Object.entries(groups)) {
    if (memberIds.length < 2) continue;

    // Identify the true connection center for this group
    let bestHubId = memberIds[0];
    let maxConnections = -1;
    for (const mId of memberIds) {
      const idx = nodeIndex[mId];
      if (idx !== undefined && rawDegree[idx] > maxConnections) {
        maxConnections = rawDegree[idx];
        bestHubId = mId;
      }
    }

    const hubIdx = nodeIndex[bestHubId];
    if (hubIdx === undefined) continue;

    // Connect ALL members to the hub, no arbitrary limit
    for (const mId of memberIds) {
      if (mId === bestHubId) continue;
      const ti = nodeIndex[mId];
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
  for (const e of edges) {
    const ds = degree[e.source] || 1;
    const dt = degree[e.target] || 1;
    e.bias = ds / (ds + dt);
  }
  
  // Cache active group
  if (config.activeGroupId) {
    cachedActiveGroupNode = nodes.find(n => n.id === config.activeGroupId) || null;
  }

  // ── Compute Gravity Wells ──
  computeGravityWells(degree);
}

/**
 * Galactic Physics: classify nodes as Suns (hubs) or Planets (leaves).
 * Suns = group nodes OR high-degree nodes (> median * 1.5).
 * Planets are assigned to the nearest connected Sun.
 * Orphans are promoted to micro-suns.
 */
function computeGravityWells(degree) {
  galacticSuns = [];
  planets = [];

  // Clear stale state from previous computation
  for (const n of nodes) { n.isSun = false; n.mySun = null; }
  
  // 1. Identify "Suns" (Hubs) — nodes with many connections or explicit groups
  const medianDeg = degree.length > 0 ? [...degree].sort((a, b) => a - b)[Math.floor(degree.length / 2)] : 1;
  const hubThreshold = Math.max(3, medianDeg * 1.5);

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const deg = degree[i] || 0;
    // A node is a Sun if it's a group, or highly connected
    if (n.parentId && n.parentId === config.activeGroupId) continue; // internal children are planets
    if (n.id === config.activeGroupId) continue; // active group is invisible

    if (n.isGroup || deg >= hubThreshold || (!n.parentId && n.children && n.children.length > 0)) {
      n.isSun = true;
      n.mass = deg + 5; // heavier suns
      galacticSuns.push(n);
    } else {
      n.isSun = false;
      n.mass = 1;
    }
  }

  // 2. Assign Planets to the nearest Sun
  for (const e of edges) {
    const s = nodes[e.source], t = nodes[e.target];
    if (s.isSun && !t.isSun && !t.mySun) t.mySun = s;
    else if (t.isSun && !s.isSun && !s.mySun) s.mySun = t;
  }

  // All remaining nodes
  for (const n of nodes) {
    if (n.id === config.activeGroupId) continue;
    if (!n.isSun) {
      if (n.mySun) planets.push(n);
      else {
        // Orphans act as tiny suns drifting to center
        n.isSun = true;
        n.mass = 2;
        galacticSuns.push(n);
      }
    }
  }

  // 3. Weaken Inter-Galactic links
  for (const e of edges) {
    const s = nodes[e.source], t = nodes[e.target];
    if (!s || !t) continue;
    
    // Save original properties once
    if (e._origStrength === undefined) {
      e._origStrength = e.strength;
      e._origRestLength = e.restLength;
    }
    
    // Cross-galactic link rules
    e._isCrossGalactic = false;
    if (s.isSun && t.isSun) e._isCrossGalactic = true;
    else if (s.mySun && t.mySun && s.mySun !== t.mySun) e._isCrossGalactic = true;
    else if (s.mySun && t.isSun && s.mySun !== t) e._isCrossGalactic = true;
    else if (t.mySun && s.isSun && t.mySun !== s) e._isCrossGalactic = true;

    if (e._isCrossGalactic) {
      e.strength = e._origStrength * config.crossLinkScale;
      // Gently stretch cross-galactic links (1.4x at crossLinkScale=0.2)
      e.restLength = e._origRestLength * (1 + 0.5 * (1 - config.crossLinkScale));
    } else {
      e.strength = e._origStrength;
      e.restLength = e._origRestLength;
    }
  }
}

function tick(alpha) {
  // ═══ 1. Dark Energy (Global Repulsion) ═══
  // All bodies repel each other to prevent clustering
  applyChargeForce(nodes, config.chargeStrength * alpha, config.theta);

  // ═══ 2. Springs (Orbital links) ═══
  applyLinkForce(nodes, edges, alpha);

  // ═══ 3. Collision (Prevent overlapping matter) ═══
  applyCollisionForce(nodes, config.collideStrength, 4);

  // ═══ 4. Hierarchical Gravity ═══
  
  // a. Compute dynamic radius for suns
  for (const sun of galacticSuns) {
    sun.dynamicRadius = sun.w || 20;
    sun.smoothRadius = sun.smoothRadius || sun.dynamicRadius;
  }
  for (const p of planets) {
    if (p.mySun) {
      const dx = p.x - p.mySun.x;
      const dy = p.y - p.mySun.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > p.mySun.dynamicRadius) {
        p.mySun.dynamicRadius = dist;
      }
    }
  }
  for (const sun of galacticSuns) {
    sun.smoothRadius += (sun.dynamicRadius - sun.smoothRadius) * 0.08;
  }

  // b. Suns are pulled towards the Galactic Center (0,0)
  for (const sun of galacticSuns) {
    if (sun.id === config.activeGroupId) continue;
    sun.vx -= sun.x * config.centerPull * alpha;
    sun.vy -= sun.y * config.centerPull * alpha;
  }

  // c. Inter-Sun Repulsion (Keep galaxies separated)
  for (let i = 0; i < galacticSuns.length; i++) {
    for (let j = i + 1; j < galacticSuns.length; j++) {
      const si = galacticSuns[i], sj = galacticSuns[j];
      const dx = sj.x - si.x;
      const dy = sj.y - si.y;
      const dist = Math.sqrt(dx * dx + dy * dy) + 1;
      const combinedRadius = si.smoothRadius + sj.smoothRadius;
      if (dist < combinedRadius) {
        // Proportional overlap (0..1) prevents explosive forces when suns are co-located
        const overlapRatio = (combinedRadius - dist) / combinedRadius;
        const rawForce = overlapRatio * config.wellRepulsion * alpha;
        // Cap maximum force to prevent runaway at start
        const force = Math.min(rawForce, 50);
        const nx = dx / dist, ny = dy / dist;
        si.vx -= nx * force;
        si.vy -= ny * force;
        sj.vx += nx * force;
        sj.vy += ny * force;
      }
    }
  }

  // d. Planets are pulled gently towards their Sun
  for (const p of planets) {
    const dx = p.x - p.mySun.x;
    const dy = p.y - p.mySun.y;
    p.vx -= dx * config.wellStrength * alpha;
    p.vy -= dy * config.wellStrength * alpha;
  }

  // ═══ 5. Velocity Verlet integration ═══
  let energy = 0;
  const decay = 1 - config.velocityDecay;
  const vMax = Math.max(200, Math.sqrt(nodes.length) * 10);
  for (const n of nodes) {
    if (n.fx !== undefined) { n.x = n.fx; n.vx = 0; }
    else {
      n.vx *= decay;
      if (n.vx > vMax) n.vx = vMax;
      else if (n.vx < -vMax) n.vx = -vMax;
      n.x += n.vx;
    }
    if (n.fy !== undefined) { n.y = n.fy; n.vy = 0; }
    else {
      n.vy *= decay;
      if (n.vy > vMax) n.vy = vMax;
      else if (n.vy < -vMax) n.vy = -vMax;
      n.y += n.vy;
    }
    energy += n.vx * n.vx + n.vy * n.vy;
  }

  return energy;
}

function getPositions() {
  const positions = {};
  for (const n of nodes) {
    positions[n.id] = { x: Math.round(n.x - n.w / 2), y: Math.round(n.y - n.h / 2) };
  }
  return positions;
}

/**
 * Pack positions into a Float32Array for efficient transfer.
 * Layout: [x0, y0, x1, y1, ...] in node index order.
 * The ID-to-index mapping is stable from initSimulation.
 */
function getPositionsPacked() {
  const buf = new Float32Array(nodes.length * 2);
  for (let i = 0; i < nodes.length; i++) {
    buf[i * 2] = nodes[i].x - nodes[i].w / 2;
    buf[i * 2 + 1] = nodes[i].y - nodes[i].h / 2;
  }
  return buf;
}

/** Get ordered node IDs (sent once at init, used to unpack Float32Array). */
function getNodeIds() {
  return nodes.map(n => n.id);
}

// =====================================================================
// 4. WORKER MESSAGE HANDLER
// =====================================================================

self.onmessage = function (e) {
  const { type } = e.data;

  if (type === 'init') {
    running = true;
    paused = false;
    initSimulation(e.data);

    if (simMode === 'continuous') {
      startContinuous();
    } else {
      startConverge();
    }
  }

  if (type === 'pause') {
    paused = true;
    if (continuousTimer !== null) {
      clearTimeout(continuousTimer);
      continuousTimer = null;
    }
  }

  if (type === 'resume') {
    if (!running || !paused) return;
    paused = false;
    // Gentle reheat — enough to settle neighbors, not enough to explode
    continuousAlpha = Math.min(continuousAlpha + config.resumeReheat, config.resumeCap);
    startContinuousLoop();
  }

  if (type === 'pin') {
    const { id, x, y } = e.data;
    const node = nodes.find(n => n.id === id);
    if (node) {
      // GUI sends top-left coordinate, physics needs center coordinate
      node.fx = x + node.w / 2;
      node.fy = y + node.h / 2;
      // Local reheat so neighbors react
      if (simMode === 'continuous') {
        continuousAlpha = Math.min(continuousAlpha + config.pinReheat, config.pinCap);
        if (paused) {
          paused = false;
          startContinuousLoop();
        }
      }
    }
  }

  if (type === 'unpin') {
    const { id } = e.data;
    const node = nodes.find(n => n.id === id);
    if (node) {
      delete node.fx;
      delete node.fy;
      if (simMode === 'continuous') {
        continuousAlpha = Math.min(continuousAlpha + config.pinReheat, config.pinCap);
        if (paused) {
          paused = false;
          startContinuousLoop();
        }
      }
    }
  }

  if (type === 'updateConfig') {
    const updates = e.data.config;
    if (updates) {
      Object.assign(config, updates);
      // Propagate link params to existing edges (skip group edges)
      if (updates.linkDistance !== undefined || updates.linkStrength !== undefined) {
        for (const edge of edges) {
          if (edge.restLength === config.groupDistance && edge.strength === config.groupStrength) continue;
          if (updates.linkDistance !== undefined) edge.restLength = config.linkDistance;
          if (updates.linkStrength !== undefined) edge.strength = config.linkStrength;
        }
      }
      if (updates.groupDistance !== undefined || updates.groupStrength !== undefined) {
        for (const edge of edges) {
          // Heuristic: group edges have old groupDistance/groupStrength
          if (edge.restLength !== config.linkDistance || edge.strength !== config.linkStrength) {
            if (updates.groupDistance !== undefined) edge.restLength = config.groupDistance;
            if (updates.groupStrength !== undefined) edge.strength = config.groupStrength;
          }
        }
      }
      // Recalculate cross-galactic link strengths when crossLinkScale changes
      if (updates.crossLinkScale !== undefined) {
        for (const edge of edges) {
          if (edge._isCrossGalactic && edge._origStrength !== undefined) {
            edge.strength = edge._origStrength * config.crossLinkScale;
            edge.restLength = edge._origRestLength * (1 + 0.5 * (1 - config.crossLinkScale));
          }
        }
      }

      // Reheat simulation so it reacts to the new config
      if (simMode === 'continuous') {
        continuousAlpha = Math.min(continuousAlpha + config.resumeReheat, config.resumeCap);
        if (!paused && continuousTimer === null) {
          startContinuousLoop();
        }
      }
    }
  }

  if (type === 'stop') {
    running = false;
    paused = false;
    if (continuousTimer !== null) {
      clearTimeout(continuousTimer);
      continuousTimer = null;
    }
    self.postMessage({
      type: 'done',
      positions: getPositions(),
      energy: 0,
      iteration: -1,
    });
  }
};

// =====================================================================
// 5. CONVERGE MODE (original behavior — runs once, then stops)
// =====================================================================

function startConverge() {
  const totalNodes = nodes.length;
  let adaptiveAlphaDecay = config.alphaDecay;
  let alpha = 1;
  let iteration = 0;
  const maxIter = Math.ceil(Math.log(config.alphaMin) / Math.log(1 - config.alphaDecay)) + 1;
  const batchSize = totalNodes > 1000 ? 8 : 4;

  function runBatch() {
    if (!running) return;

    for (let i = 0; i < batchSize && alpha > config.alphaMin && iteration < maxIter; i++) {
      tick(alpha);
      alpha += (config.alphaTarget - alpha) * adaptiveAlphaDecay;
      iteration++;
    }

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
      let attempt = 0;
      const maxExpansionAttempts = 2000;
      const expansionBatchSize = totalNodes > 1000 ? 10 : 20;

      function runExpansionBatch() {
        if (!running) return;
        
        let overlaps = countOverlaps(nodes);
        let bIter = 0;
        
        while (overlaps > 0 && attempt < maxExpansionAttempts && bIter < expansionBatchSize) {
          applyCollisionForce(nodes, 1.0, 4);

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
            energy: 0,
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

// =====================================================================
// 6. CONTINUOUS MODE (alive simulation — never stops until 'stop')
// =====================================================================

let continuousAlpha = 1;
let continuousIteration = 0;

function startContinuous() {
  continuousAlpha = 1;
  continuousIteration = 0;
  self._initialDoneSent = false;

  // Send node ID order once so main thread can unpack Float32Array
  self.postMessage({ type: 'nodeIds', ids: getNodeIds() });

  startContinuousLoop();
}

function startContinuousLoop() {
  if (continuousTimer !== null) return; // already running

  function runTick() {
    if (!running || paused) { continuousTimer = null; return; }

    // Physics tick
    const energy = tick(continuousAlpha);

    // Gentle Brownian motion: random impulses keep graph "breathing"
    if (config.brownian > 0 && continuousAlpha < config.brownianThresh) {
      const bStr = config.brownian;
      for (const n of nodes) {
        if (n.fx === undefined) n.vx += (Math.random() - 0.5) * bStr;
        if (n.fy === undefined) n.vy += (Math.random() - 0.5) * bStr;
      }
    }

    // Alpha decay toward a low floor
    continuousAlpha += (config.contAlphaTarget - continuousAlpha) * config.alphaDecay;
    if (continuousAlpha < config.contAlphaFloor) continuousAlpha = config.contAlphaFloor;

    // Apply extra damping when approaching sleep to kill oscillations
    if (continuousAlpha < config.contAlphaTarget + 0.001 && config.brownian === 0) {
      for (const n of nodes) {
        n.vx *= 0.5;
        n.vy *= 0.5;
      }
    }

    continuousIteration++;

    // Send packed positions every tick for smooth 60fps
    const packed = getPositionsPacked();
    self.postMessage({
      type: 'tick',
      packed: packed.buffer,
      alpha: continuousAlpha,
      energy: energy,
      iteration: continuousIteration,
    }, [packed.buffer]);

    // Send a 'done' message once when the layout has mostly settled so the UI can restore view state
    if (!self._initialDoneSent && Math.abs(continuousAlpha - config.contAlphaTarget) < 0.05) {
      self._initialDoneSent = true;
      self.postMessage({
        type: 'done',
        positions: getPositions(),
        iterations: continuousIteration,
      });
    }

    // Auto-sleep: if nodes are completely settled and brownian is disabled, stop the loop.
    // It will wake up on 'pin', 'resume', or 'updateConfig' with reheat.
    // Use an epsilon for alpha asymptote, and scale energy by node count (e.g., avg velocity < 0.1px/tick)
    if (Math.abs(continuousAlpha - config.contAlphaTarget) < 1e-4 && energy < nodes.length * 0.01 && config.brownian === 0) {
      paused = true;
      continuousTimer = null;
      console.log('[ForceWorker] Auto-sleep triggered (energy:', energy.toFixed(4), ')');
      return;
    }

    continuousTimer = setTimeout(runTick, 16);
  }

  runTick();
}
