/**
 * Benchmark — stress test for symbiote-node
 *
 * Spawns nodes progressively with connections, auto-fits the viewport,
 * and displays live metrics (node count, connection count, FPS).
 */

import {
  NodeEditor, Node, Connection, Socket, Input, Output, InputControl,
  GREY_NEUTRAL,
} from '../index.js';
import '../canvas/NodeCanvas.js';
import '../node/GraphNode.js';

const TARGET = 500;
const BATCH = 5;
const INTERVAL = 60;
const COLS = 20;
const SPACING_X = 280;
const SPACING_Y = 300;

const socketTypes = [
  new Socket('data', { color: '#5cb8ff' }),
  new Socket('text', { color: '#5cd87a' }),
  new Socket('any', { color: '#f0b840' }),
  new Socket('exec', { color: '#ffffff' }),
  new Socket('array', { color: '#a78bfa' }),
];

const nodeTypes = ['action', 'trigger', 'filter', 'ai', 'transform', 'output', 'debug', 'merge'];
const categories = ['server', 'instance', 'control', 'data', 'default'];

/** @type {Node[]} */
const allNodes = [];
let running = false;
let editor = null;
let canvas = null;

// FPS tracker
let frameCount = 0;
let lastFpsTime = performance.now();
let currentFps = 0;

function trackFps() {
  frameCount++;
  const now = performance.now();
  if (now - lastFpsTime >= 1000) {
    currentFps = Math.round(frameCount * 1000 / (now - lastFpsTime));
    frameCount = 0;
    lastFpsTime = now;
    document.getElementById('hudFps').textContent = currentFps;
  }
  requestAnimationFrame(trackFps);
}

/**
 * Create a random node with 1-3 inputs and 1-3 outputs
 * @param {number} index
 * @returns {Node}
 */
function createNode(index) {
  const type = nodeTypes[index % nodeTypes.length];
  const cat = categories[index % categories.length];
  const label = `${type.charAt(0).toUpperCase() + type.slice(1)} ${index}`;

  const node = new Node(label, { type, category: cat });

  const inCount = 1 + (index % 3);
  const outCount = 1 + ((index + 1) % 3);

  for (let i = 0; i < inCount; i++) {
    const sock = socketTypes[(index + i) % socketTypes.length];
    node.addInput(`in_${i}`, new Input(sock, `In ${i}`));
  }
  for (let i = 0; i < outCount; i++) {
    const sock = socketTypes[(index + i + 2) % socketTypes.length];
    node.addOutput(`out_${i}`, new Output(sock, `Out ${i}`));
  }

  if (index % 4 === 0) {
    node.addControl('value', new InputControl('text', { initial: `v${index}`, readonly: true }));
  }

  return node;
}

/**
 * Fit viewport to show all nodes
 */
function fitToContent() {
  if (!canvas || allNodes.length === 0) return;

  const container = canvas.getBoundingClientRect();
  const views = [];

  for (const node of allNodes) {
    const el = canvas.querySelector(`[node-id="${node.id}"]`);
    if (el && el._position) {
      views.push({
        x: el._position.x,
        y: el._position.y,
        w: el.offsetWidth || 200,
        h: el.offsetHeight || 80,
      });
    }
  }

  if (views.length === 0) return;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const v of views) {
    minX = Math.min(minX, v.x);
    minY = Math.min(minY, v.y);
    maxX = Math.max(maxX, v.x + v.w);
    maxY = Math.max(maxY, v.y + v.h);
  }

  const pad = 60;
  minX -= pad; minY -= pad;
  maxX += pad; maxY += pad;

  const graphW = maxX - minX;
  const graphH = maxY - minY;

  const zoom = Math.max(0.1, Math.min(
    container.width / graphW,
    container.height / graphH,
    1.5,
  ));

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const tx = container.width / 2 - cx * zoom;
  const ty = container.height / 2 - cy * zoom;

  // Update Symbiote reactive state (binding auto-updates CSS transform)
  canvas.$.panX = tx;
  canvas.$.panY = ty;
  canvas.$.zoom = zoom;
}

function updateHud() {
  const connCount = editor ? editor.getConnections().length : 0;
  document.getElementById('hudNodes').textContent = allNodes.length;
  document.getElementById('hudConns').textContent = connCount;
  document.getElementById('hudProgress').style.width =
    `${Math.min(100, (allNodes.length / TARGET) * 100)}%`;
}

/** @type {Connection[]} */
const pendingConns = [];

/**
 * Spawn a batch of nodes (connections deferred)
 */
function spawnBatch() {
  const startIdx = allNodes.length;

  for (let i = 0; i < BATCH; i++) {
    const idx = startIdx + i;
    if (idx >= TARGET) break;

    const node = createNode(idx);
    editor.addNode(node);

    // Grid position
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    canvas.setNodePosition(node.id, col * SPACING_X + 40, row * SPACING_Y + 40);

    // Queue connection (deferred to avoid SVG recalc during spawn)
    if (allNodes.length > 0) {
      const prevIdx = Math.max(0, allNodes.length - 1 - (idx % 3));
      const prev = allNodes[prevIdx];
      const prevOutputs = Object.keys(prev.outputs);
      const nodeInputs = Object.keys(node.inputs);
      if (prevOutputs.length > 0 && nodeInputs.length > 0) {
        pendingConns.push(new Connection(prev, prevOutputs[0], node, nodeInputs[0]));
      }
    }

    allNodes.push(node);
  }

  updateHud();
}

/**
 * Run the full benchmark
 */
async function runBenchmark() {
  if (running) return;
  running = true;

  const btn = document.getElementById('btnStart');
  btn.querySelector('.material-symbols-outlined').textContent = 'hourglass_top';
  btn.lastChild.textContent = ' Running...';
  btn.classList.add('active');

  while (allNodes.length < TARGET && running) {
    spawnBatch();

    // Auto-fit every 50 nodes
    if (allNodes.length % 50 === 0) {
      fitToContent();
    }

    await new Promise((r) => setTimeout(r, INTERVAL));
  }

  // Add all connections in one batch after nodes are done
  btn.lastChild.textContent = ` Connecting (${pendingConns.length})...`;
  await new Promise((r) => setTimeout(r, 50));

  for (const conn of pendingConns) {
    editor.addConnection(conn);
  }
  pendingConns.length = 0;
  updateHud();

  // Final fit + LOD
  fitToContent();

  running = false;
  btn.querySelector('.material-symbols-outlined').textContent = 'check_circle';
  btn.lastChild.textContent = ` Done (${allNodes.length})`;
  btn.classList.remove('active');
}

function reset() {
  running = false;
  pendingConns.length = 0;

  // Remove all nodes
  for (const node of [...allNodes]) {
    editor.removeNode(node.id);
  }
  allNodes.length = 0;
  updateHud();

  const btn = document.getElementById('btnStart');
  btn.querySelector('.material-symbols-outlined').textContent = 'rocket_launch';
  btn.lastChild.textContent = ' Start';
  btn.classList.remove('active');
}

function init() {
  editor = new NodeEditor();
  canvas = document.querySelector('node-canvas');

  if (!canvas) return;

  canvas.setEditor(editor);

  // Apply theme
  const root = document.documentElement;
  for (const [k, v] of Object.entries(GREY_NEUTRAL.tokens)) {
    root.style.setProperty(k, v);
  }
  canvas.setTheme(GREY_NEUTRAL);

  // Buttons
  document.getElementById('btnStart').addEventListener('click', runBenchmark);
  document.getElementById('btnReset').addEventListener('click', reset);

  // FPS tracker
  requestAnimationFrame(trackFps);

  updateHud();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  setTimeout(init, 100);
}
