import { normalizeGraphEdge, normalizeGraphModel, normalizeGraphNode } from './model.js';
import { normalizeProjectPackage } from './project-package.js';

const LOCAL_PATH_PATTERN = /(^|[\s"'=:])(?:\/Users\/|\/home\/|[A-Za-z]:\\)/;
const SUPPORTED_OPERATIONS = new Set([
  'graph.addNode',
  'graph.addEdge',
  'layout.addPanel',
  'layout.setRoot',
  'theme.setModifier',
]);

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeId(value, fieldName) {
  const id = String(value ?? '').trim();
  if (!id) throw new Error(`${fieldName} is required`);
  return id;
}

function assertNoLocalPaths(value) {
  if (LOCAL_PATH_PATTERN.test(JSON.stringify(value))) {
    throw new Error('project transaction contains an absolute local path');
  }
}

function normalizeOperation(rawOperation) {
  const data = asObject(rawOperation);
  const type = normalizeId(data.type, 'operation.type');
  if (!SUPPORTED_OPERATIONS.has(type)) {
    throw new Error(`unsupported project transaction operation "${type}"`);
  }

  if (type === 'graph.addNode') {
    return {
      type,
      graph: normalizeId(data.graph, 'operation.graph'),
      node: normalizeGraphNode(data.node),
    };
  }

  if (type === 'graph.addEdge') {
    return {
      type,
      graph: normalizeId(data.graph, 'operation.graph'),
      edge: normalizeGraphEdge(data.edge),
    };
  }

  if (type === 'layout.setRoot') {
    return {
      type,
      layout: normalizeId(data.layout, 'operation.layout'),
      root: asObject(data.root),
    };
  }

  if (type === 'layout.addPanel') {
    return {
      type,
      layout: normalizeId(data.layout, 'operation.layout'),
      parentId: data.parentId == null ? null : normalizeId(data.parentId, 'operation.parentId'),
      panel: asObject(data.panel),
    };
  }

  return {
    type,
    theme: normalizeId(data.theme, 'operation.theme'),
    name: normalizeId(data.name, 'operation.name'),
    value: data.value,
  };
}

export function normalizeProjectTransaction(rawTransaction = {}) {
  assertNoLocalPaths(rawTransaction);
  const data = asObject(rawTransaction);
  const version = String(data.version ?? 'project-transaction-v1');
  if (version !== 'project-transaction-v1') {
    throw new Error(`unsupported project transaction version "${version}"`);
  }

  return {
    version,
    id: normalizeId(data.id, 'transaction.id'),
    targetProject: data.targetProject == null ? null : String(data.targetProject),
    operations: (data.operations || []).map(normalizeOperation),
    metadata: asObject(data.metadata),
  };
}

function cloneProjectForMutation(project) {
  return JSON.parse(JSON.stringify({
    ...project,
    graphsById: undefined,
    layoutsById: undefined,
    themesById: undefined,
  }));
}

function applyOperation(project, operation) {
  if (operation.type === 'graph.addNode') {
    const graph = project.graphs[operation.graph];
    if (!graph) throw new Error(`graph "${operation.graph}" is not defined`);
    graph.nodes.push(operation.node);
    return;
  }

  if (operation.type === 'graph.addEdge') {
    const graph = project.graphs[operation.graph];
    if (!graph) throw new Error(`graph "${operation.graph}" is not defined`);
    graph.edges.push(operation.edge);
    return;
  }

  if (operation.type === 'layout.setRoot') {
    const layout = project.layouts[operation.layout];
    if (!layout) throw new Error(`layout "${operation.layout}" is not defined`);
    layout.root = operation.root;
    return;
  }

  if (operation.type === 'layout.addPanel') {
    const layout = project.layouts[operation.layout];
    if (!layout) throw new Error(`layout "${operation.layout}" is not defined`);
    addPanelToLayout(layout, operation);
    return;
  }

  const theme = project.themes[operation.theme];
  if (!theme) throw new Error(`theme "${operation.theme}" is not defined`);
  theme.modifiers = {
    ...asObject(theme.modifiers),
    [operation.name]: operation.value,
  };
}

function addPanelToLayout(layout, operation) {
  const panel = operation.panel;
  if (!panel.component) throw new Error('operation.panel.component is required');

  if (!operation.parentId) {
    layout.root = {
      ...asObject(layout.root),
      children: [...(Array.isArray(layout.root?.children) ? layout.root.children : []), panel],
    };
    return;
  }

  const inserted = appendChildById(layout.root, operation.parentId, panel);
  if (!inserted) throw new Error(`layout parent "${operation.parentId}" is not defined`);
}

function appendChildById(node, parentId, child) {
  if (!node || typeof node !== 'object') return false;
  if (node.id === parentId) {
    node.children = [...(Array.isArray(node.children) ? node.children : []), child];
    return true;
  }
  for (const nested of node.children || []) {
    if (appendChildById(nested, parentId, child)) return true;
  }
  return false;
}

export function applyProjectTransaction(project, rawTransaction) {
  const transaction = normalizeProjectTransaction(rawTransaction);
  const nextProject = cloneProjectForMutation(project);

  for (const operation of transaction.operations) {
    applyOperation(nextProject, operation);
  }

  for (const [id, graph] of Object.entries(nextProject.graphs)) {
    nextProject.graphs[id] = normalizeGraphModel(graph);
  }

  return normalizeProjectPackage(nextProject);
}
