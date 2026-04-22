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
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.mass = 0;
    this.cx = 0;
    this.cy = 0;
    this.body = null;
    this.children = null;
  }
}

function insertBody(node, body) {
  if (node.mass === 0) {
    node.body = body;
    node.mass = body.mass;
    node.cx = body.x;
    node.cy = body.y;
    return;
  }

  if (node.body !== null) {
    const existing = node.body;
    node.body = null;
    subdivide(node);
    insertIntoChild(node, existing);
  } else if (!node.children) {
    subdivide(node);
  }

  insertIntoChild(node, body);

  const totalMass = node.mass + body.mass;
  node.cx = (node.cx * node.mass + body.x * body.mass) / totalMass;
  node.cy = (node.cy * node.mass + body.y * body.mass) / totalMass;
  node.mass = totalMass;
}

function subdivide(node) {
  const hw = node.w / 2;
  const hh = node.h / 2;
  node.children = [
    new QuadNode(node.x, node.y, hw, hh),
    new QuadNode(node.x + hw, node.y, hw, hh),
    new QuadNode(node.x, node.y + hh, hw, hh),
    new QuadNode(node.x + hw, node.y + hh, hw, hh),
  ];
}

function insertIntoChild(node, body) {
  const mx = node.x + node.w / 2;
  const my = node.y + node.h / 2;
  const idx = (body.x >= mx ? 1 : 0) + (body.y >= my ? 2 : 0);
  insertBody(node.children[idx], body);
}

function calcRepulsion(node, body, theta, repulsion, fx, fy) {
  if (node.mass === 0) return { fx, fy };

  const dx = body.x - node.cx;
  const dy = body.y - node.cy;
  const distSq = dx * dx + dy * dy + 1;
  const dist = Math.sqrt(distSq);

  if (node.body === body) return { fx, fy };

  const regionSize = Math.max(node.w, node.h);
  if (node.body !== null || regionSize / dist < theta) {
    const force = repulsion * body.mass * node.mass / distSq;
    fx += (dx / dist) * force;
    fy += (dy / dist) * force;
    return { fx, fy };
  }

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

let nodes = [];
let edges = [];
let nodeIndex = {};
let running = false;

/** Node dimensions for overlap detection */
const NODE_W = 260;
const NODE_H = 40;

let config = {
  repulsion: 500,
  springK: 0.4,
  springLength: 100,
  dirSpringK: 0.08,
  dirSpringLength: 140,
  damping: 0.82,
  theta: 0.7,
  maxIterations: 300,
  minEnergy: 0.5,
  tickInterval: 16,
  gravity: 0.02,
  overlapPush: 2.0,       // Overlap separation force multiplier
};

function initSimulation(data) {
  const { nodes: rawNodes, edges: rawEdges, groups, options = {} } = data;

  Object.assign(config, options);

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

  // Import edges (strong springs)
  edges = rawEdges.map(e => ({
    source: nodeIndex[e.from],
    target: nodeIndex[e.to],
    strength: e.strength || config.springK,
    restLength: e.restLength || config.springLength,
  })).filter(e => e.source !== undefined && e.target !== undefined);

  // Directory springs: connect each node to a virtual group center
  // Instead of O(n²) full mesh, use star topology: each member → first member as hub
  if (groups) {
    for (const [, memberIds] of Object.entries(groups)) {
      if (memberIds.length < 2) continue;
      // Cap at 8 springs per group to avoid O(n²)
      const hubIdx = nodeIndex[memberIds[0]];
      if (hubIdx === undefined) continue;
      const limit = Math.min(memberIds.length, 8);
      for (let i = 1; i < limit; i++) {
        const ti = nodeIndex[memberIds[i]];
        if (ti !== undefined) {
          edges.push({
            source: hubIdx,
            target: ti,
            strength: config.dirSpringK,
            restLength: config.dirSpringLength,
          });
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

  // 2. Repulsion forces (Barnes-Hut)
  for (const n of nodes) {
    if (n.pinned) continue;

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

  // 4. Overlap resolution — push apart nodes whose bounding boxes overlap
  // Use spatial grid for O(n) approximate neighbor checks
  const cellW = NODE_W * 1.5;
  const cellH = NODE_H * 1.5;
  const grid = new Map();
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const gx = Math.floor(n.x / cellW);
    const gy = Math.floor(n.y / cellH);
    const key = `${gx},${gy}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(i);
  }

  for (const [key, indices] of grid) {
    const [gx, gy] = key.split(',').map(Number);
    // Check this cell and 8 neighbors
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const nk = `${gx + dx},${gy + dy}`;
        const neighbors = grid.get(nk);
        if (!neighbors) continue;
        for (const i of indices) {
          for (const j of neighbors) {
            if (i >= j) continue;
            const a = nodes[i];
            const b = nodes[j];
            const ox = NODE_W - Math.abs(a.x - b.x);
            const oy = NODE_H - Math.abs(a.y - b.y);
            if (ox > 0 && oy > 0) {
              // Boxes overlap — push apart along axis of least overlap
              const push = config.overlapPush;
              if (ox < oy) {
                const sign = a.x < b.x ? -1 : 1;
                if (!a.pinned) a.vx += sign * ox * push * 0.5;
                if (!b.pinned) b.vx -= sign * ox * push * 0.5;
              } else {
                const sign = a.y < b.y ? -1 : 1;
                if (!a.pinned) a.vy += sign * oy * push * 0.5;
                if (!b.pinned) b.vy -= sign * oy * push * 0.5;
              }
            }
          }
        }
      }
    }
  }

  // 5. Apply velocities
  let energy = 0;
  for (const n of nodes) {
    if (n.pinned) continue;
    const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
    const maxSpeed = 40;
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
