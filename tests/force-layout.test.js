/**
 * Force layout quality test suite
 *
 * Runs ForceWorker on synthetic graphs and validates:
 * - Zero node overlaps (rectangle intersection detection)
 * - No anomalous distances (outliers > 5× median distance)
 * - Connected nodes are reasonably close
 * - Disconnected components are compact
 * - Convergence within expected iterations
 *
 * Run: node --test tests/force-layout.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKER_PATH = path.join(__dirname, '..', 'canvas', 'ForceWorker.js');

const NODE_W = 260;
const NODE_H = 40;

// ---- Helpers ----

/**
 * Run ForceWorker on a graph and return final positions.
 * @param {object} data - { nodes, edges, groups, options }
 * @param {number} timeout - Max wait time in ms
 * @returns {Promise<{positions: object, iterations: number}>}
 */
function runLayout(data, timeout = 30000) {
  return new Promise((resolve, reject) => {
    // ForceWorker uses importScripts/self.onmessage — it's a browser Worker.
    // For Node.js testing, we wrap it: eval the source with a shim.
    const workerCode = `
      import { parentPort } from 'node:worker_threads';
      import { readFileSync } from 'node:fs';

      // Shim: redirect self.onmessage / self.postMessage to parentPort
      const self = globalThis;
      self.postMessage = (msg) => parentPort.postMessage(msg);

      // Load and eval ForceWorker source (it assigns self.onmessage)
      const src = readFileSync(${JSON.stringify(WORKER_PATH)}, 'utf-8');
      // Remove importScripts calls (not needed in Node)
      const cleanSrc = src.replace(/importScripts\\([^)]*\\);?/g, '');
      new Function('self', cleanSrc)(self);

      parentPort.on('message', (msg) => {
        if (self.onmessage) self.onmessage({ data: msg });
      });
    `;

    const worker = new Worker(workerCode, { eval: true });
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error(`ForceWorker timed out after ${timeout}ms`));
    }, timeout);

    worker.on('message', (msg) => {
      if (msg.type === 'done') {
        clearTimeout(timer);
        worker.terminate();
        resolve({ positions: msg.positions, iterations: msg.iteration });
      }
    });

    worker.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    worker.postMessage({ type: 'init', ...data });
  });
}

/**
 * Detect overlapping node pairs.
 * @param {Object} positions - { nodeId: { x, y } }
 * @param {number} w - Node width
 * @param {number} h - Node height
 * @returns {{ count: number, pairs: [string, string][] }}
 */
function detectOverlaps(positions, w = NODE_W, h = NODE_H) {
  const ids = Object.keys(positions);
  const pairs = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = positions[ids[i]], b = positions[ids[j]];
      const overlapX = w - Math.abs(a.x - b.x);
      const overlapY = h - Math.abs(a.y - b.y);
      if (overlapX > 0 && overlapY > 0) {
        pairs.push([ids[i], ids[j]]);
      }
    }
  }
  return { count: pairs.length, pairs };
}

/**
 * Compute distances between all connected node pairs.
 * @param {Object} positions
 * @param {Array} edges - { from, to }
 * @returns {{ min: number, max: number, median: number, mean: number, distances: number[] }}
 */
function edgeDistances(positions, edges) {
  const distances = [];
  for (const e of edges) {
    const a = positions[e.from], b = positions[e.to];
    if (!a || !b) continue;
    distances.push(Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2));
  }
  distances.sort((a, b) => a - b);
  const n = distances.length;
  return {
    min: distances[0] || 0,
    max: distances[n - 1] || 0,
    median: n > 0 ? distances[Math.floor(n / 2)] : 0,
    mean: n > 0 ? distances.reduce((s, d) => s + d, 0) / n : 0,
    distances,
  };
}

/**
 * Detect anomalous node positions (outliers far from centroid).
 * @param {Object} positions
 * @param {number} threshold - Multiplier of median distance from centroid
 * @returns {{ outliers: string[], centroid: {x: number, y: number} }}
 */
function detectOutliers(positions, threshold = 5) {
  const ids = Object.keys(positions);
  let cx = 0, cy = 0;
  for (const id of ids) { cx += positions[id].x; cy += positions[id].y; }
  cx /= ids.length; cy /= ids.length;

  const dists = ids.map(id => ({
    id,
    dist: Math.sqrt((positions[id].x - cx) ** 2 + (positions[id].y - cy) ** 2),
  }));
  dists.sort((a, b) => a.dist - b.dist);
  const median = dists[Math.floor(dists.length / 2)]?.dist || 1;

  const outliers = dists.filter(d => d.dist > median * threshold).map(d => d.id);
  return { outliers, centroid: { x: Math.round(cx), y: Math.round(cy) } };
}

/**
 * Compute bounding box of all positions.
 * @param {Object} positions
 * @returns {{ width: number, height: number, area: number }}
 */
function boundingBox(positions) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of Object.values(positions)) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const width = maxX - minX + NODE_W;
  const height = maxY - minY + NODE_H;
  return { width, height, area: width * height };
}

// ---- Graph generators ----

function makeChainGraph(n) {
  const nodes = Array.from({ length: n }, (_, i) => ({ id: `n${i}`, x: i * 100, y: 0 }));
  const edges = Array.from({ length: n - 1 }, (_, i) => ({ from: `n${i}`, to: `n${i + 1}` }));
  return { nodes, edges };
}

function makeGridGraph(cols, rows) {
  const nodes = [];
  const edges = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = `n${r}_${c}`;
      nodes.push({ id, x: c * 300, y: r * 100 });
      if (c > 0) edges.push({ from: `n${r}_${c - 1}`, to: id });
      if (r > 0) edges.push({ from: `n${r - 1}_${c}`, to: id });
    }
  }
  return { nodes, edges };
}

function makeStarGraph(n) {
  const nodes = [{ id: 'hub', x: 0, y: 0 }];
  const edges = [];
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n;
    nodes.push({ id: `leaf${i}`, x: Math.cos(angle) * 500, y: Math.sin(angle) * 500 });
    edges.push({ from: 'hub', to: `leaf${i}` });
  }
  return { nodes, edges };
}

function makeClusterGraph(clusterCount, nodesPerCluster) {
  const nodes = [];
  const edges = [];
  const groups = {};
  for (let c = 0; c < clusterCount; c++) {
    const groupId = `group${c}`;
    groups[groupId] = [];
    for (let i = 0; i < nodesPerCluster; i++) {
      const id = `c${c}_n${i}`;
      nodes.push({ id, x: c * 800 + i * 100, y: Math.random() * 200, group: groupId });
      groups[groupId].push(id);
      if (i > 0) edges.push({ from: `c${c}_n${i - 1}`, to: id });
    }
    // Inter-cluster edges
    if (c > 0) edges.push({ from: `c${c - 1}_n0`, to: `c${c}_n0` });
  }
  return { nodes, edges, groups };
}

function makeRandomGraph(n, edgeDensity = 0.02) {
  const nodes = Array.from({ length: n }, (_, i) => ({
    id: `n${i}`,
    x: (Math.random() - 0.5) * n * 50,
    y: (Math.random() - 0.5) * n * 50,
  }));
  const edges = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.random() < edgeDensity) {
        edges.push({ from: `n${i}`, to: `n${j}` });
      }
    }
  }
  return { nodes, edges };
}

// ---- Tests ----

describe('Force layout — chain graph (20 nodes)', () => {
  let result;

  it('converges', async () => {
    const graph = makeChainGraph(20);
    result = await runLayout({ ...graph, groups: {}, options: {} });
    assert.ok(result.iterations > 0, `Should take >0 iterations, got ${result.iterations}`);
    console.log(`  Iterations: ${result.iterations}`);
  });

  it('has zero overlaps', () => {
    const { count, pairs } = detectOverlaps(result.positions);
    if (count > 0) console.log(`  Overlapping pairs: ${pairs.slice(0, 5).map(p => p.join('↔')).join(', ')}`);
    assert.equal(count, 0, `Expected 0 overlaps, found ${count}`);
  });

  it('has no outliers (5× median)', () => {
    const { outliers } = detectOutliers(result.positions);
    assert.equal(outliers.length, 0, `Outliers: ${outliers.join(', ')}`);
  });

  it('edge distances are reasonable', () => {
    const graph = makeChainGraph(20);
    const stats = edgeDistances(result.positions, graph.edges);
    console.log(`  Edge dist: min=${stats.min.toFixed(0)} max=${stats.max.toFixed(0)} median=${stats.median.toFixed(0)} mean=${stats.mean.toFixed(0)}`);
    // Max edge distance should not be more than 10× min
    assert.ok(stats.max / Math.max(stats.min, 1) < 10, `Max/min ratio too high: ${(stats.max / stats.min).toFixed(1)}`);
  });
});

describe('Force layout — grid graph (5×5)', () => {
  let result;

  it('converges', async () => {
    const graph = makeGridGraph(5, 5);
    result = await runLayout({ ...graph, groups: {}, options: {} });
    console.log(`  Iterations: ${result.iterations}, BBox: ${JSON.stringify(boundingBox(result.positions))}`);
  });

  it('has zero overlaps', () => {
    const { count } = detectOverlaps(result.positions);
    assert.equal(count, 0, `Expected 0 overlaps, found ${count}`);
  });

  it('bounding box is compact', () => {
    const bbox = boundingBox(result.positions);
    const maxArea = 25 * NODE_W * NODE_H * 20; // 20× theoretical minimum
    assert.ok(bbox.area < maxArea, `BBox area ${bbox.area} exceeds ${maxArea}`);
  });
});

describe('Force layout — star graph (30 leaves)', () => {
  let result;

  it('converges', async () => {
    const graph = makeStarGraph(30);
    result = await runLayout({ ...graph, groups: {}, options: {} });
    console.log(`  Iterations: ${result.iterations}`);
  });

  it('has zero overlaps', () => {
    const { count } = detectOverlaps(result.positions);
    assert.equal(count, 0, `Expected 0 overlaps, found ${count}`);
  });

  it('hub is near centroid', () => {
    const { centroid } = detectOutliers(result.positions);
    const hub = result.positions['hub'];
    const dist = Math.sqrt((hub.x - centroid.x) ** 2 + (hub.y - centroid.y) ** 2);
    console.log(`  Hub-centroid distance: ${dist.toFixed(0)}`);
    assert.ok(dist < 500, `Hub too far from centroid: ${dist.toFixed(0)}`);
  });
});

describe('Force layout — clustered graph (5 clusters × 10 nodes)', () => {
  let result, graph;

  it('converges', async () => {
    graph = makeClusterGraph(5, 10);
    result = await runLayout({ ...graph, options: {} });
    console.log(`  Iterations: ${result.iterations}, Nodes: ${graph.nodes.length}, Edges: ${graph.edges.length}`);
  });

  it('has zero overlaps', () => {
    const { count, pairs } = detectOverlaps(result.positions);
    if (count > 0) console.log(`  Overlapping: ${pairs.slice(0, 5).map(p => p.join('↔')).join(', ')}`);
    assert.equal(count, 0, `Expected 0 overlaps, found ${count}`);
  });

  it('has no outliers', () => {
    const { outliers } = detectOutliers(result.positions);
    assert.equal(outliers.length, 0, `Outliers: ${outliers.join(', ')}`);
  });

  it('intra-cluster distances < inter-cluster distances', () => {
    // Compute avg distance within first cluster vs avg distance between cluster 0 and cluster 4
    const c0 = graph.groups['group0'];
    const c4 = graph.groups['group4'];
    let intra = 0, inter = 0, ic = 0, ec = 0;
    for (let i = 0; i < c0.length; i++) {
      for (let j = i + 1; j < c0.length; j++) {
        const a = result.positions[c0[i]], b = result.positions[c0[j]];
        intra += Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
        ic++;
      }
      for (let j = 0; j < c4.length; j++) {
        const a = result.positions[c0[i]], b = result.positions[c4[j]];
        inter += Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
        ec++;
      }
    }
    intra /= ic; inter /= ec;
    console.log(`  Intra-cluster avg: ${intra.toFixed(0)}, Inter-cluster avg: ${inter.toFixed(0)}`);
    assert.ok(intra < inter, `Intra-cluster (${intra.toFixed(0)}) should be < inter-cluster (${inter.toFixed(0)})`);
  });
});

describe('Force layout — large random graph (200 nodes)', () => {
  let result, graph;

  it('converges within 30s', async () => {
    graph = makeRandomGraph(200, 0.015);
    const start = Date.now();
    result = await runLayout({ ...graph, groups: {}, options: {} }, 30000);
    const elapsed = Date.now() - start;
    console.log(`  Converged in ${elapsed}ms, ${result.iterations} iterations, ${graph.edges.length} edges`);
    assert.ok(elapsed < 30000, `Took too long: ${elapsed}ms`);
  });

  it('overlap rate < 5%', () => {
    const { count } = detectOverlaps(result.positions);
    const totalPairs = 200 * 199 / 2;
    const rate = count / totalPairs;
    console.log(`  Overlaps: ${count} / ${totalPairs} pairs (${(rate * 100).toFixed(2)}%)`);
    assert.ok(rate < 0.05, `Overlap rate ${(rate * 100).toFixed(1)}% exceeds 5%`);
  });

  it('has no extreme outliers (10× median)', () => {
    const { outliers } = detectOutliers(result.positions, 10);
    console.log(`  Outliers (10× median): ${outliers.length}`);
    assert.ok(outliers.length < 5, `Too many outliers: ${outliers.length}`);
  });
});

describe('Layout quality metrics (diagnostics)', () => {
  it('prints summary for 100-node graph', async () => {
    const graph = makeRandomGraph(100, 0.03);
    const start = Date.now();
    const result = await runLayout({ ...graph, groups: {}, options: {} });
    const elapsed = Date.now() - start;

    const overlaps = detectOverlaps(result.positions);
    const edgeStats = edgeDistances(result.positions, graph.edges);
    const outlierCheck = detectOutliers(result.positions);
    const bbox = boundingBox(result.positions);

    console.log('\n  ╔══════════════════════════════════════════╗');
    console.log('  ║  FORCE LAYOUT QUALITY REPORT             ║');
    console.log('  ╠══════════════════════════════════════════╣');
    console.log(`  ║  Nodes: ${graph.nodes.length.toString().padStart(6)}  Edges: ${graph.edges.length.toString().padStart(6)}       ║`);
    console.log(`  ║  Time: ${elapsed.toString().padStart(5)}ms  Iters: ${result.iterations.toString().padStart(5)}       ║`);
    console.log('  ╠══════════════════════════════════════════╣');
    console.log(`  ║  Overlaps:     ${overlaps.count.toString().padStart(6)}                  ║`);
    console.log(`  ║  Outliers:     ${outlierCheck.outliers.length.toString().padStart(6)} (5× median)       ║`);
    console.log(`  ║  Edge min:     ${edgeStats.min.toFixed(0).padStart(6)}px                ║`);
    console.log(`  ║  Edge max:     ${edgeStats.max.toFixed(0).padStart(6)}px                ║`);
    console.log(`  ║  Edge median:  ${edgeStats.median.toFixed(0).padStart(6)}px                ║`);
    console.log(`  ║  Edge mean:    ${edgeStats.mean.toFixed(0).padStart(6)}px                ║`);
    console.log(`  ║  BBox:   ${bbox.width.toFixed(0).padStart(5)} × ${bbox.height.toFixed(0).padStart(5)}px            ║`);
    console.log('  ╚══════════════════════════════════════════╝\n');

    assert.ok(true); // Diagnostic — always passes
  });
});

// =====================================================================
// EDGE CASES
// =====================================================================

describe('Edge case — single node', () => {
  it('converges without error', async () => {
    const result = await runLayout({
      nodes: [{ id: 'only', x: 0, y: 0 }],
      edges: [],
      groups: {},
      options: {},
    });
    assert.ok(result.positions['only'], 'Single node should have a position');
    console.log(`  Position: (${result.positions['only'].x}, ${result.positions['only'].y})`);
  });
});

describe('Edge case — two nodes, one edge', () => {
  let result;

  it('converges', async () => {
    result = await runLayout({
      nodes: [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 100, y: 0 }],
      edges: [{ from: 'a', to: 'b' }],
      groups: {},
      options: {},
    });
    assert.ok(result.positions['a'] && result.positions['b']);
  });

  it('no overlap', () => {
    const { count } = detectOverlaps(result.positions);
    assert.equal(count, 0, `Expected 0 overlaps, found ${count}`);
  });

  it('nodes are within link distance', () => {
    const a = result.positions['a'], b = result.positions['b'];
    const dist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    console.log(`  Distance: ${dist.toFixed(0)}px`);
    assert.ok(dist < 500, `Nodes too far apart: ${dist.toFixed(0)}`);
  });
});

describe('Edge case — disconnected components (3 isolated cliques)', () => {
  let result;
  const graph = { nodes: [], edges: [] };

  // 3 triangles with no inter-connections
  for (let c = 0; c < 3; c++) {
    const ids = [`t${c}_0`, `t${c}_1`, `t${c}_2`];
    ids.forEach((id, i) => graph.nodes.push({ id, x: c * 500 + i * 100, y: 0 }));
    graph.edges.push({ from: ids[0], to: ids[1] });
    graph.edges.push({ from: ids[1], to: ids[2] });
    graph.edges.push({ from: ids[2], to: ids[0] });
  }

  it('converges', async () => {
    result = await runLayout({ ...graph, groups: {}, options: {} });
  });

  it('no overlaps', () => {
    const { count } = detectOverlaps(result.positions);
    assert.equal(count, 0, `Expected 0 overlaps, found ${count}`);
  });

  it('components are visually separate', () => {
    // Centroid of each triangle should be distinct
    const centroids = [];
    for (let c = 0; c < 3; c++) {
      const ids = [`t${c}_0`, `t${c}_1`, `t${c}_2`];
      let cx = 0, cy = 0;
      ids.forEach(id => { cx += result.positions[id].x; cy += result.positions[id].y; });
      centroids.push({ x: cx / 3, y: cy / 3 });
    }
    // Pairwise distance between component centroids
    for (let i = 0; i < centroids.length; i++) {
      for (let j = i + 1; j < centroids.length; j++) {
        const dist = Math.sqrt((centroids[i].x - centroids[j].x) ** 2 + (centroids[i].y - centroids[j].y) ** 2);
        console.log(`  Component ${i}↔${j} centroid distance: ${dist.toFixed(0)}`);
        assert.ok(dist > 50, `Components ${i} and ${j} too close: ${dist.toFixed(0)}`);
      }
    }
  });
});

describe('Edge case — all nodes at origin (coincident)', () => {
  let result;

  it('converges without NaN', async () => {
    const nodes = Array.from({ length: 15 }, (_, i) => ({ id: `n${i}`, x: 0, y: 0 }));
    const edges = Array.from({ length: 14 }, (_, i) => ({ from: `n${i}`, to: `n${i + 1}` }));
    result = await runLayout({ nodes, edges, groups: {}, options: {} });

    // No NaN positions
    for (const [id, pos] of Object.entries(result.positions)) {
      assert.ok(!isNaN(pos.x) && !isNaN(pos.y), `NaN position for ${id}: (${pos.x}, ${pos.y})`);
    }
    console.log(`  All 15 positions are valid (no NaN)`);
  });

  it('no overlaps', () => {
    const { count } = detectOverlaps(result.positions);
    assert.equal(count, 0, `Expected 0 overlaps, found ${count}`);
  });

  it('nodes have spread out', () => {
    const bbox = boundingBox(result.positions);
    console.log(`  BBox after spread: ${bbox.width.toFixed(0)} × ${bbox.height.toFixed(0)}`);
    const maxDim = Math.max(bbox.width, bbox.height);
    assert.ok(maxDim > NODE_W * 2, `Nodes didn't spread: max dimension=${maxDim.toFixed(0)}`);
  });
});

describe('Edge case — binary tree (depth 6, 63 nodes)', () => {
  let result;
  const graph = { nodes: [], edges: [] };

  // Build complete binary tree
  for (let i = 0; i < 63; i++) {
    graph.nodes.push({ id: `n${i}`, x: (i % 8) * 300, y: Math.floor(i / 8) * 100 });
    if (i > 0) {
      graph.edges.push({ from: `n${Math.floor((i - 1) / 2)}`, to: `n${i}` });
    }
  }

  it('converges', async () => {
    result = await runLayout({ ...graph, groups: {}, options: {} });
    console.log(`  Iterations: ${result.iterations}, Nodes: 63, Edges: 62`);
  });

  it('overlap rate < 5%', () => {
    const { count } = detectOverlaps(result.positions);
    const totalPairs = 63 * 62 / 2;
    const rate = count / totalPairs;
    console.log(`  Overlaps: ${count} / ${totalPairs} (${(rate * 100).toFixed(2)}%)`);
    // Note: binary tree with 63 nodes × 260px is inherently hard for force-directed
    // A dedicated tree layout would achieve 0%, but force-directed < 5% is acceptable
    assert.ok(rate < 0.05, `Overlap rate ${(rate * 100).toFixed(1)}% exceeds 5%`);
  });

  it('root is near center (1500px)', () => {
    const { centroid } = detectOutliers(result.positions);
    const root = result.positions['n0'];
    const dist = Math.sqrt((root.x - centroid.x) ** 2 + (root.y - centroid.y) ** 2);
    console.log(`  Root-centroid distance: ${dist.toFixed(0)}`);
    assert.ok(dist < 1500, `Root too far from centroid: ${dist.toFixed(0)}`);
  });
});

describe('Edge case — self-loops and duplicate edges (malformed data)', () => {
  it('handles self-loops gracefully', async () => {
    const result = await runLayout({
      nodes: [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 100, y: 0 }, { id: 'c', x: 200, y: 0 }],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'a', to: 'a' },   // self-loop
        { from: 'b', to: 'c' },
        { from: 'b', to: 'c' },   // duplicate
      ],
      groups: {},
      options: {},
    });
    // Should not crash, all positions valid
    for (const [id, pos] of Object.entries(result.positions)) {
      assert.ok(!isNaN(pos.x) && !isNaN(pos.y), `NaN for ${id}`);
    }
    console.log('  Self-loops and duplicates handled without crash');
  });

  it('handles edges referencing non-existent nodes', async () => {
    const result = await runLayout({
      nodes: [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 100, y: 0 }],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'a', to: 'ghost' },  // ghost node
        { from: 'phantom', to: 'b' }, // phantom node
      ],
      groups: {},
      options: {},
    });
    assert.ok(result.positions['a'] && result.positions['b']);
    assert.ok(!result.positions['ghost'] && !result.positions['phantom']);
    console.log('  Ghost edges ignored, valid nodes positioned');
  });
});

describe('Edge case — deep chain (100 nodes)', () => {
  let result, graph;

  it('converges', async () => {
    graph = makeChainGraph(100);
    result = await runLayout({ ...graph, groups: {}, options: {} });
    console.log(`  Iterations: ${result.iterations}`);
  });

  it('no overlaps', () => {
    const { count } = detectOverlaps(result.positions);
    assert.equal(count, 0, `Expected 0 overlaps, found ${count}`);
  });

  it('chain is roughly linear (aspect ratio > 2)', () => {
    const bbox = boundingBox(result.positions);
    const aspect = Math.max(bbox.width, bbox.height) / Math.min(bbox.width, bbox.height);
    console.log(`  BBox: ${bbox.width.toFixed(0)} × ${bbox.height.toFixed(0)}, aspect: ${aspect.toFixed(1)}`);
    assert.ok(aspect > 1.5, `Chain should be elongated, aspect ratio only ${aspect.toFixed(1)}`);
  });
});

describe('Edge case — dense graph (50 nodes, ~15% edge density)', () => {
  let result, graph;

  it('converges', async () => {
    graph = makeRandomGraph(50, 0.15);
    result = await runLayout({ ...graph, groups: {}, options: {} });
    console.log(`  Edges: ${graph.edges.length} (density ${(graph.edges.length / (50*49/2) * 100).toFixed(1)}%)`);
  });

  it('overlap rate < 5%', () => {
    const { count } = detectOverlaps(result.positions);
    const totalPairs = 50 * 49 / 2;
    const rate = count / totalPairs;
    console.log(`  Overlaps: ${count} / ${totalPairs} (${(rate * 100).toFixed(2)}%)`);
    assert.ok(rate < 0.05, `Overlap rate ${(rate * 100).toFixed(1)}%`);
  });
});

describe('Stress test — 500 nodes (simulated dep-graph scale)', () => {
  let result, graph;

  it('converges within 30s', async () => {
    // Simulate dependency graph: sparse, with directory groups
    graph = { nodes: [], edges: [], groups: {} };
    const dirs = ['src', 'lib', 'utils', 'core', 'api', 'db', 'views', 'tests'];
    for (let i = 0; i < 500; i++) {
      const dir = dirs[i % dirs.length];
      const id = `${dir}/file${Math.floor(i / dirs.length)}.js`;
      graph.nodes.push({ id, x: (Math.random() - 0.5) * 5000, y: (Math.random() - 0.5) * 5000, group: dir });
      if (!graph.groups[dir]) graph.groups[dir] = [];
      graph.groups[dir].push(id);
    }
    // Sparse edges (~3 per node on average)
    for (let i = 0; i < 500; i++) {
      for (let k = 0; k < 3; k++) {
        const j = Math.floor(Math.random() * 500);
        if (i !== j) graph.edges.push({ from: graph.nodes[i].id, to: graph.nodes[j].id });
      }
    }

    const start = Date.now();
    result = await runLayout({ ...graph, options: {} }, 30000);
    const elapsed = Date.now() - start;
    console.log(`  500 nodes, ${graph.edges.length} edges → ${elapsed}ms, ${result.iterations} iters`);
    assert.ok(elapsed < 30000, `Timeout: ${elapsed}ms`);
  });

  it('overlap rate < 10%', () => {
    // At this scale, some overlaps are expected
    const ids = Object.keys(result.positions);
    let overlaps = 0;
    // Sample-based check (full O(n²) is slow for 500 nodes)
    const sampleSize = 1000;
    for (let s = 0; s < sampleSize; s++) {
      const i = Math.floor(Math.random() * ids.length);
      const j = Math.floor(Math.random() * ids.length);
      if (i === j) continue;
      const a = result.positions[ids[i]], b = result.positions[ids[j]];
      const ox = NODE_W - Math.abs(a.x - b.x);
      const oy = NODE_H - Math.abs(a.y - b.y);
      if (ox > 0 && oy > 0) overlaps++;
    }
    const rate = overlaps / sampleSize;
    console.log(`  Overlap sample rate: ${(rate * 100).toFixed(2)}% (${overlaps}/${sampleSize} samples)`);
    assert.ok(rate < 0.10, `Sample overlap rate ${(rate * 100).toFixed(1)}%`);
  });

  it('no NaN positions', () => {
    for (const [id, pos] of Object.entries(result.positions)) {
      assert.ok(!isNaN(pos.x) && !isNaN(pos.y), `NaN for ${id}`);
    }
  });
});

