/**
 * @fileoverview BSP (Binary Space Partitioning) Layout Tree
 * Implements Blender-style area splitting/joining mechanics.
 */

/**
 * @typedef {'horizontal' | 'vertical'} SplitDirection
 */

/**
 * @typedef {Object} PanelNode
 * @property {string} id - Unique node ID
 * @property {'panel'} type - Node type
 * @property {string} panelType - Panel content type (e.g., 'viewport', 'timeline')
 * @property {boolean} [collapsed] - Whether panel is collapsed
 * @property {Object} [panelState] - Panel-specific state
 */

/**
 * @typedef {Object} SplitNode
 * @property {string} id - Unique node ID
 * @property {'split'} type - Node type
 * @property {SplitDirection} direction - Split direction
 * @property {number} ratio - Split ratio (0-1), size of first child
 * @property {LayoutNode} first - First child node
 * @property {LayoutNode} second - Second child node
 */

/**
 * @typedef {PanelNode | SplitNode} LayoutNode
 */

let idCounter = 0;

/**
 * Generate unique node ID
 * @returns {string}
 */
export function generateId() {
  return `node_${++idCounter}_${Date.now().toString(36)}`;
}

/**
 * Create a panel node
 * @param {string} panelType - Panel content type
 * @param {Object} [panelState] - Initial panel state
 * @returns {PanelNode}
 */
export function createPanel(panelType, panelState = {}) {
  return {
    id: generateId(),
    type: 'panel',
    panelType,
    panelState,
    collapsed: false
  };
}

/**
 * Create a split node
 * @param {SplitDirection} direction - Split direction
 * @param {LayoutNode} first - First child
 * @param {LayoutNode} second - Second child
 * @param {number} [ratio=0.5] - Split ratio
 * @returns {SplitNode}
 */
export function createSplit(direction, first, second, ratio = 0.5) {
  return {
    id: generateId(),
    type: 'split',
    direction,
    ratio,
    first,
    second
  };
}

/**
 * Find a node by ID in the tree
 * @param {LayoutNode} root - Root node
 * @param {string} id - Node ID to find
 * @returns {LayoutNode | null}
 */
export function findNode(root, id) {
  if (root.id === id) return root;
  if (root.type === 'split') {
    return findNode(root.first, id) || findNode(root.second, id);
  }
  return null;
}

/**
 * Find parent of a node
 * @param {LayoutNode} root - Root node
 * @param {string} id - Child node ID
 * @returns {{ parent: SplitNode, which: 'first' | 'second' } | null}
 */
export function findParent(root, id) {
  if (root.type !== 'split') return null;

  if (root.first.id === id) return { parent: root, which: 'first' };
  if (root.second.id === id) return { parent: root, which: 'second' };

  return findParent(root.first, id) || findParent(root.second, id);
}

/**
 * Split a panel into two
 * @param {LayoutNode} root - Root node
 * @param {string} panelId - Panel ID to split
 * @param {SplitDirection} direction - Split direction
 * @param {number} [ratio=0.5] - Split ratio
 * @param {string} [newPanelType] - Type for new panel (defaults to same as original)
 * @returns {LayoutNode} - New root node
 */
export function splitPanel(root, panelId, direction, ratio = 0.5, newPanelType) {
  const node = findNode(root, panelId);
  if (!node || node.type !== 'panel') {
    console.warn(`Cannot split: panel ${panelId} not found`);
    return root;
  }

  const newPanel = createPanel(newPanelType || node.panelType);
  const splitNode = createSplit(direction, node, newPanel, ratio);

  // If splitting the root
  if (root.id === panelId) {
    return splitNode;
  }

  // Find parent and replace
  const parentInfo = findParent(root, panelId);
  if (parentInfo) {
    parentInfo.parent[parentInfo.which] = splitNode;
  }

  return root;
}

/**
 * Join two panels (remove one panel and its parent split)
 * @param {LayoutNode} root - Root node
 * @param {string} panelToRemove - Panel ID to remove
 * @returns {LayoutNode} - New root node
 */
export function joinPanels(root, panelToRemove) {
  const parentInfo = findParent(root, panelToRemove);
  if (!parentInfo) {
    // Trying to remove root - not allowed
    console.warn('Cannot join: panel is root');
    return root;
  }

  const { parent, which } = parentInfo;
  const survivor = which === 'first' ? parent.second : parent.first;

  // If parent is root, survivor becomes new root
  const grandparentInfo = findParent(root, parent.id);
  if (!grandparentInfo) {
    return survivor;
  }

  // Replace parent with survivor in grandparent
  grandparentInfo.parent[grandparentInfo.which] = survivor;
  return root;
}

/**
 * Update split ratio
 * @param {LayoutNode} root - Root node
 * @param {string} splitId - Split node ID
 * @param {number} ratio - New ratio (0-1)
 * @returns {LayoutNode} - Same root (mutated)
 */
export function resizeSplit(root, splitId, ratio) {
  const node = findNode(root, splitId);
  if (!node || node.type !== 'split') {
    console.warn(`Cannot resize: split ${splitId} not found`);
    return root;
  }

  node.ratio = Math.max(0.1, Math.min(0.9, ratio));
  return root;
}

/**
 * Serialize layout to JSON string
 * @param {LayoutNode} root - Root node
 * @returns {string}
 */
export function serialize(root) {
  return JSON.stringify(root);
}

/**
 * Deserialize layout from JSON string
 * @param {string} json - JSON string
 * @returns {LayoutNode}
 */
export function deserialize(json) {
  return JSON.parse(json);
}

/**
 * Clone a layout tree (deep copy)
 * @param {LayoutNode} root - Root node
 * @returns {LayoutNode}
 */
export function clone(root) {
  return deserialize(serialize(root));
}

/**
 * Get all panel nodes in tree
 * @param {LayoutNode} root - Root node
 * @returns {PanelNode[]}
 */
export function getAllPanels(root) {
  if (root.type === 'panel') return [root];
  return [...getAllPanels(root.first), ...getAllPanels(root.second)];
}

/**
 * Update a node's properties by ID
 * @param {LayoutNode} root - Root node
 * @param {string} nodeId - Node ID to update
 * @param {Object} updates - Properties to update
 * @returns {boolean} - True if node was found and updated
 */
export function updateNode(root, nodeId, updates) {
  const node = findNode(root, nodeId);
  if (!node) return false;
  Object.assign(node, updates);
  return true;
}

/**
 * Get neighbor panel IDs for a panel
 * @param {LayoutNode} root - Root node
 * @param {string} panelId - Panel ID
 * @returns {{ left?: string, right?: string, top?: string, bottom?: string }}
 */
export function getNeighbors(root, panelId) {
  // TODO: Implement neighbor detection for join preview
  return {};
}
