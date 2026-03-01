/**
 * AutoLayout — automatic graph layout using layered algorithm
 *
 * Places nodes in columns based on dependency depth (Sugiyama-style).
 * Connected nodes flow left-to-right with evenly spaced rows.
 *
 * @module symbiote-node/canvas/AutoLayout
 */

/**
 * Compute auto-layout positions for all nodes
 * @param {import('../core/Editor.js').NodeEditor} editor
 * @param {object} [options]
 * @param {number} [options.nodeWidth=220] - average node width
 * @param {number} [options.nodeHeight=120] - average node height
 * @param {number} [options.gapX=80] - horizontal gap between columns
 * @param {number} [options.gapY=40] - vertical gap between rows
 * @param {number} [options.startX=60] - starting X position
 * @param {number} [options.startY=60] - starting Y position
 * @returns {Object<string, { x: number, y: number }>} positions keyed by node ID
 */
export function computeAutoLayout(editor, options = {}) {
  const {
    nodeWidth = 220,
    nodeHeight = 120,
    gapX = 80,
    gapY = 40,
    startX = 60,
    startY = 60,
  } = options;

  const nodes = [...editor.getNodes()];
  const connections = [...editor.getConnections()];

  if (nodes.length === 0) return {};

  // Build adjacency: outputNodeId -> [inputNodeIds]
  const outgoing = new Map();
  const incoming = new Map();
  for (const node of nodes) {
    outgoing.set(node.id, []);
    incoming.set(node.id, []);
  }

  for (const conn of connections) {
    const from = conn.from;
    const to = conn.to;
    if (outgoing.has(from) && incoming.has(to)) {
      outgoing.get(from).push(to);
      incoming.get(to).push(from);
    }
  }

  // Topological sort — assign layers (depth from roots)
  const layers = new Map();
  const visited = new Set();

  /** @param {string} nodeId @param {number} depth */
  function assignLayer(nodeId, depth) {
    if (visited.has(nodeId)) {
      // Update to max depth
      layers.set(nodeId, Math.max(layers.get(nodeId) || 0, depth));
      return;
    }
    visited.add(nodeId);
    layers.set(nodeId, depth);

    for (const child of outgoing.get(nodeId) || []) {
      assignLayer(child, depth + 1);
    }
  }

  // Find root nodes (no incoming connections)
  const roots = nodes.filter(n => incoming.get(n.id).length === 0);
  if (roots.length === 0) {
    // Cyclic graph — just use first node
    roots.push(nodes[0]);
  }

  for (const root of roots) {
    assignLayer(root.id, 0);
  }

  // Handle unvisited nodes (disconnected)
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      const maxLayer = Math.max(...layers.values(), -1);
      layers.set(node.id, maxLayer + 1);
    }
  }

  // Group nodes by layer
  const layerGroups = new Map();
  for (const [nodeId, layer] of layers) {
    if (!layerGroups.has(layer)) layerGroups.set(layer, []);
    layerGroups.get(layer).push(nodeId);
  }

  // Layout: each layer is a column
  const positions = {};
  const sortedLayers = [...layerGroups.keys()].sort((a, b) => a - b);

  for (const layer of sortedLayers) {
    const group = layerGroups.get(layer);
    const colX = startX + layer * (nodeWidth + gapX);

    for (let i = 0; i < group.length; i++) {
      const rowY = startY + i * (nodeHeight + gapY);
      positions[group[i]] = { x: colX, y: rowY };
    }
  }

  return positions;
}
