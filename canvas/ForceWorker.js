/**
 * ForceWorker — Barnes-Hut force-directed layout in a Web Worker.
 *
 * Receives graph data, runs simulation, posts back position updates.
 *
 * Protocol:
 *   Main → Worker: { type: 'init', nodes, edges, groups, options }
 *   Worker → Main: { type: 'tick', positions, energy, iteration }
 *   Worker → Main: { type: 'done', positions, iterations }
 *   Main → Worker: { type: 'stop' }
 *
 * @module symbiote-node/canvas/ForceWorker
 */

// ---- Barnes-Hut Quadtree ----

class QuadNode {
  constructor(x, y, w, h) {
    this.x = x;       // region origin X
    this.y = y;       // region origin Y
    this.w = w;       // region width
    this.h = h;       // region height
    this.mass = 0;    // total mass in this cell
    this.cx = 0;      // center of mass X
    this.cy = 0;      // center of mass Y
    this.body = null;  // single body (leaf)
    this.children = null; // [NW, NE, SW, SE] or null
  }
}

function insertBody(node, body) {
  if (node.mass === 0) {
    // Empty cell — place body here
    node.body = body;
    node.mass = body.mass;
    node.cx = body.x;
    node.cy = body.y;
    return;
  }

  // If leaf with existing body, subdivide
  if (node.body !== null) {
    const existing = node.body;
    node.body = null;
    subdivide(node);
    insertIntoChild(node, existing);
  } else if (!node.children) {
    subdivide(node);
  }

  insertIntoChild(node, body);

  // Update center of mass
  const totalMass = node.mass + body.mass;
  node.cx = (node.cx * node.mass + body.x * body.mass) / totalMass;
  node.cy = (node.cy * node.mass + body.y * body.mass) / totalMass;
  node.mass = totalMass;
}

function subdivide(node) {
  const hw = node.w / 2;
  const hh = node.h / 2;
  node.children = [
    new QuadNode(node.x, node.y, hw, hh),             // NW
    new QuadNode(node.x + hw, node.y, hw, hh),         // NE
    new QuadNode(node.x, node.y + hh, hw, hh),         // SW
    new QuadNode(node.x + hw, node.y + hh, hw, hh),    // SE
  ];
}

function insertIntoChild(node, body) {
  const mx = node.x + node.w / 2;
  const my = node.y + node.h / 2;
  const idx = (body.x >= mx ? 1 : 0) + (body.y >= my ? 2 : 0);
  insertBody(node.children[idx], body);
}

/**
 * Calculate repulsion force on body using Barnes-Hut approximation.
 * θ (theta) controls accuracy: 0 = exact, 0.5 = typical, 1.0 = fast
 */
function calcRepulsion(node, body, theta, repulsion, fx, fy) {
  if (node.mass === 0) return { fx, fy };

  const dx = body.x - node.cx;
  const dy = body.y - node.cy;
  const distSq = dx * dx + dy * dy + 1; // +1 to avoid singularity
  const dist = Math.sqrt(distSq);

  // If leaf with the same body, skip
  if (node.body === body) return { fx, fy };

  // Barnes-Hut criterion: if region is small enough relative to distance, treat as single mass
  const regionSize = Math.max(node.w, node.h);
  if (node.body !== null || regionSize / dist < theta) {
    // Coulomb-like repulsion: F = repulsion * m1 * m2 / d²
    const force = repulsion * body.mass * node.mass / distSq;
    fx += (dx / dist) * force;
    fy += (dy / dist) * force;
    return { fx, fy };
  }

  // Otherwise recurse into children
  if (node.children) {
    for (const child of node.children) {
      const result = calcRepulsion(child, body, theta, repulsion, fx, fy);
      fx = result.fx;
      fy = result.fy;
    }
  }

  return { fx, fy };
}

// ---- Force Simulation ----

let nodes = [];         // { id, x, y, vx, vy, mass, pinned }
let edges = [];         // { source, target, strength, restLength }
let nodeIndex = {};     // id → index
let running = false;

// Simulation parameters
let config = {
  repulsion: 800,       // Coulomb constant
  springK: 0.3,         // Spring stiffness
  springLength: 120,    // Rest length for edges
  dirSpringK: 0.05,     // Weak spring for same-directory
  dirSpringLength: 200, // Rest length for directory springs
  damping: 0.85,        // Velocity damping per tick
  theta: 0.7,           // Barnes-Hut accuracy (0.5-1.0)
  maxIterations: 300,   // Max simulation ticks
  minEnergy: 0.5,       // Convergence threshold
  tickInterval: 16,     // ms between ticks (~60fps)
  gravity: 0.01,        // Center gravity to prevent drift
};

function initSimulation(data) {
  const { nodes: rawNodes, edges: rawEdges, groups, options = {} } = data;

  // Merge config
  Object.assign(config, options);

  // Initialize nodes with random positions (or use provided)
  nodes = rawNodes.map((n, i) => {
    const angle = (2 * Math.PI * i) / rawNodes.length;
    const radius = Math.sqrt(rawNodes.length) * 50;
    return {
      id: n.id,
      x: n.x ?? Math.cos(angle) * radius + (Math.random() - 0.5) * 100,
      y: n.y ?? Math.sin(angle) * radius + (Math.random() - 0.5) * 100,
      vx: 0,
      vy: 0,
      mass: n.mass || 1,
      pinned: n.pinned || false,
      group: n.group || null,
    };
  });

  nodeIndex = {};
  nodes.forEach((n, i) => { nodeIndex[n.id] = i; });

  // Initialize edges (import springs)
  edges = rawEdges.map(e => ({
    source: nodeIndex[e.from],
    target: nodeIndex[e.to],
    strength: e.strength || config.springK,
    restLength: e.restLength || config.springLength,
  })).filter(e => e.source !== undefined && e.target !== undefined);

  // Add directory springs (weak springs between same-group nodes)
  if (groups) {
    for (const [groupId, memberIds] of Object.entries(groups)) {
      for (let i = 0; i < memberIds.length; i++) {
        for (let j = i + 1; j < memberIds.length; j++) {
          const si = nodeIndex[memberIds[i]];
          const ti = nodeIndex[memberIds[j]];
          if (si !== undefined && ti !== undefined) {
            edges.push({
              source: si,
              target: ti,
              strength: config.dirSpringK,
              restLength: config.dirSpringLength,
            });
          }
        }
      }
    }
  }
}

function tick() {
  // 1. Build quadtree
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    if (n.x < minX) minX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.x > maxX) maxX = n.x;
    if (n.y > maxY) maxY = n.y;
  }
  const pad = 100;
  const regionSize = Math.max(maxX - minX + pad * 2, maxY - minY + pad * 2, 1);
  const root = new QuadNode(minX - pad, minY - pad, regionSize, regionSize);

  for (const n of nodes) {
    insertBody(root, n);
  }

  // 2. Calculate forces
  for (const n of nodes) {
    if (n.pinned) continue;

    // Repulsion (Barnes-Hut)
    let { fx, fy } = calcRepulsion(root, n, config.theta, config.repulsion, 0, 0);

    // Center gravity
    fx -= n.x * config.gravity;
    fy -= n.y * config.gravity;

    n.vx = (n.vx + fx) * config.damping;
    n.vy = (n.vy + fy) * config.damping;
  }

  // 3. Spring forces (edges)
  for (const e of edges) {
    const s = nodes[e.source];
    const t = nodes[e.target];
    const dx = t.x - s.x;
    const dy = t.y - s.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const displacement = dist - e.restLength;
    const force = e.strength * displacement;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;

    if (!s.pinned) { s.vx += fx; s.vy += fy; }
    if (!t.pinned) { t.vx -= fx; t.vy -= fy; }
  }

  // 4. Apply velocities
  let energy = 0;
  for (const n of nodes) {
    if (n.pinned) continue;
    // Clamp velocity to prevent explosions
    const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
    const maxSpeed = 50;
    if (speed > maxSpeed) {
      n.vx = (n.vx / speed) * maxSpeed;
      n.vy = (n.vy / speed) * maxSpeed;
    }
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

// ---- Worker Message Handler ----

let tickTimer = null;

self.onmessage = function (e) {
  const { type } = e.data;

  if (type === 'init') {
    running = true;
    initSimulation(e.data);

    let iteration = 0;
    const maxIter = config.maxIterations;
    const minEnergy = config.minEnergy;

    function runTick() {
      if (!running) return;

      const energy = tick();
      iteration++;

      // Send positions every 4 ticks to reduce message overhead
      if (iteration % 4 === 0 || energy < minEnergy || iteration >= maxIter) {
        self.postMessage({
          type: energy < minEnergy || iteration >= maxIter ? 'done' : 'tick',
          positions: getPositions(),
          energy: Math.round(energy * 100) / 100,
          iteration,
        });
      }

      if (energy < minEnergy || iteration >= maxIter) {
        running = false;
        return;
      }

      tickTimer = setTimeout(runTick, config.tickInterval);
    }

    runTick();
  }

  if (type === 'stop') {
    running = false;
    clearTimeout(tickTimer);
    self.postMessage({
      type: 'done',
      positions: getPositions(),
      energy: 0,
      iteration: -1,
    });
  }
};
