function normalizeNode(rawNode) {
  if (!rawNode || typeof rawNode !== 'object') return null;
  const id = String(rawNode.id || '').trim();
  if (!id) return null;
  const children = Array.isArray(rawNode.children) ? rawNode.children.map(String) : [];
  return {
    ...rawNode,
    id,
    label: rawNode.label == null ? id : String(rawNode.label),
    type: rawNode.type || 'data',
    parentId: rawNode.parentId == null ? null : String(rawNode.parentId),
    isGroup: Boolean(rawNode.isGroup),
    children,
  };
}

function normalizeEdge(rawEdge) {
  if (!rawEdge || typeof rawEdge !== 'object') return null;
  const from = String(rawEdge.from || '').trim();
  const to = String(rawEdge.to || '').trim();
  if (!from || !to) return null;
  return { ...rawEdge, from, to };
}

export function normalizeCanvasGraphModel(model = {}) {
  const nodes = [];
  const nodesById = new Map();
  const edges = [];
  const rootNodes = [];

  for (const rawNode of model.nodes || []) {
    const node = normalizeNode(rawNode);
    if (!node || nodesById.has(node.id)) continue;
    nodes.push(node);
    nodesById.set(node.id, node);
  }

  for (const rawEdge of model.edges || []) {
    const edge = normalizeEdge(rawEdge);
    if (!edge || !nodesById.has(edge.from) || !nodesById.has(edge.to)) continue;
    edges.push(edge);
  }

  const explicitRoots = Array.isArray(model.rootNodes) ? model.rootNodes.map(String) : [];
  for (const id of explicitRoots) {
    if (nodesById.has(id) && !rootNodes.includes(id)) rootNodes.push(id);
  }

  if (rootNodes.length === 0) {
    for (const node of nodes) {
      if (!node.parentId || !nodesById.has(node.parentId)) rootNodes.push(node.id);
    }
  }

  return { nodes, edges, rootNodes };
}

export function createCanvasGraphStore(model = {}) {
  const normalized = normalizeCanvasGraphModel(model);
  return {
    nodes: new Map(normalized.nodes.map((node) => [node.id, node])),
    edges: normalized.edges,
    rootNodes: normalized.rootNodes,
  };
}
