/**
 * GraphMermaid — bidirectional Mermaid ↔ graph serialization
 *
 * Converts NodeEditor state to Mermaid flowchart syntax and back.
 * Supports shapes, labeled connections, and subgraphs (frames).
 *
 * Mermaid shape mapping:
 *   circle  → ((label))
 *   diamond → {label}
 *   pill    → ([label])
 *   rect    → [label]
 *   comment → >label]
 *
 * @module symbiote-node/core/GraphMermaid
 */

// --- Shape mapping ---

const SHAPE_TO_MERMAID = {
  circle: (id, label) => `${id}((${label}))`,
  diamond: (id, label) => `${id}{${label}}`,
  pill: (id, label) => `${id}([${label}])`,
  rect: (id, label) => `${id}[${label}]`,
  comment: (id, label) => `${id}>${label}]`,
};

/**
 * Pattern matchers for Mermaid node shapes.
 * Order matters — more specific patterns first.
 * @type {Array<{re: RegExp, shape: string}>}
 */
const MERMAID_SHAPE_PATTERNS = [
  { re: /^(\w+)\(\((.+?)\)\)$/, shape: 'circle' },
  { re: /^(\w+)\(\[(.+?)\]\)$/, shape: 'pill' },
  { re: /^(\w+)\{(.+?)\}$/, shape: 'diamond' },
  { re: /^(\w+)>(.+?)\]$/, shape: 'comment' },
  { re: /^(\w+)\[(.+?)\]$/, shape: 'rect' },
];

// --- Mermaid Arrow patterns ---

/**
 * Arrow patterns with optional label.
 * Supports: -->, --->, -->|label|, -- label -->
 * @type {Array<{re: RegExp}>}
 */
const ARROW_PATTERNS = [
  // nodeA -->|label| nodeB
  /^(.+?)\s*-->\|([^|]*)\|\s*(.+)$/,
  // nodeA -- label --> nodeB
  /^(.+?)\s*--\s+(.+?)\s+-->\s*(.+)$/,
  // nodeA --> nodeB (no label)
  /^(.+?)\s*-->\s*(.+)$/,
];

/**
 * Parse a node reference that might include inline shape definition.
 *
 * @param {string} raw - e.g. "trigger((Job Event))" or just "trigger"
 * @returns {{ id: string, label: string|null, shape: string|null }}
 */
function parseNodeRef(raw) {
  const trimmed = raw.trim();
  for (const { re, shape } of MERMAID_SHAPE_PATTERNS) {
    const m = trimmed.match(re);
    if (m) return { id: m[1], label: m[2], shape };
  }
  // Plain id reference
  return { id: trimmed, label: null, shape: null };
}

/**
 * Convert a NodeEditor to Mermaid flowchart syntax
 *
 * @param {import('./Editor.js').NodeEditor} editor
 * @param {object} [options]
 * @param {'LR'|'TB'|'RL'|'BT'} [options.direction='LR']
 * @returns {string}
 */
export function editorToMermaid(editor, options = {}) {
  const { direction = 'LR' } = options;
  const lines = [];

  lines.push(`graph ${direction}`);

  // Collect which nodes belong to which frame (by spatial containment)
  const frames = editor.getFrames();
  const nodeToFrame = new Map();

  // We don't have positions in editor, so we rely on frame data
  // Frames are matched by checking if any connection links nodes in the frame
  // For simplicity, use frame label as subgraph name

  // Build node declarations grouped by frame
  const framedNodes = new Map(); // frameId -> [node]
  const freeNodes = [];

  // If frames exist, check node positions (stored in frame data)
  // Since we don't have positions here, we serialize frames
  // and let the user define membership via subgraph

  // Collect all nodes
  const allNodes = editor.getNodes();
  const allConnections = editor.getConnections();

  // Render nodes inside subgraphs (frames)
  if (frames.length) {
    // Frames without spatial data — output as subgraphs with all nodes listed
    // In practice, frame membership is defined externally
    for (const frame of frames) {
      const nodeIds = frame._nodeIds || [];
      if (nodeIds.length) {
        for (const nid of nodeIds) {
          nodeToFrame.set(nid, frame);
        }
      }
    }
  }

  // Separate framed vs free nodes
  for (const node of allNodes) {
    if (nodeToFrame.has(node.id)) {
      const frame = nodeToFrame.get(node.id);
      if (!framedNodes.has(frame.id)) framedNodes.set(frame.id, []);
      framedNodes.get(frame.id).push(node);
    } else {
      freeNodes.push(node);
    }
  }

  // Render free nodes first
  for (const node of freeNodes) {
    lines.push('  ' + nodeToMermaid(node));
  }

  // If no frame membership data, put all nodes as free and create
  // empty subgraphs as comments
  if (framedNodes.size === 0 && frames.length > 0) {
    // Output all nodes first
    if (freeNodes.length === 0) {
      for (const node of allNodes) {
        lines.push('  ' + nodeToMermaid(node));
      }
    }
    // Frames as subgraphs with node references
    for (const frame of frames) {
      lines.push('');
      lines.push(`  subgraph ${sanitizeId(frame.label)}["${frame.label}"]`);
      lines.push('    direction TB');
      lines.push('  end');
    }
  } else {
    // Render subgraphs with their nodes
    for (const [frameId, nodes] of framedNodes) {
      const frame = frames.find(f => f.id === frameId);
      if (!frame) continue;
      lines.push('');
      lines.push(`  subgraph ${sanitizeId(frame.label)}["${frame.label}"]`);
      lines.push('    direction TB');
      for (const node of nodes) {
        lines.push('    ' + nodeToMermaid(node));
      }
      lines.push('  end');
    }
  }

  // Render connections
  lines.push('');
  for (const conn of allConnections) {
    const label = conn.out === 'exec' ? '' : conn.out;
    if (label) {
      lines.push(`  ${conn.from} -->|${label}| ${conn.to}`);
    } else {
      lines.push(`  ${conn.from} --> ${conn.to}`);
    }
  }

  return lines.join('\n');
}

/**
 * Convert a single node to Mermaid declaration
 * @param {import('./Node.js').Node} node
 * @returns {string}
 */
function nodeToMermaid(node) {
  const shapeFn = SHAPE_TO_MERMAID[node.shape] || SHAPE_TO_MERMAID.rect;
  return shapeFn(node.id, node.label);
}

/**
 * Sanitize a string for use as Mermaid subgraph ID
 * @param {string} str
 * @returns {string}
 */
function sanitizeId(str) {
  return str.replace(/[^a-zA-Z0-9_]/g, '_');
}

/**
 * Parse Mermaid flowchart text into graph data structure.
 * Supports: node shapes, labeled arrows, subgraphs.
 *
 * @param {string} text
 * @returns {{ nodes: Array, connections: Array, frames: Array, direction: string }}
 */
export function mermaidToGraph(text) {
  const nodes = new Map(); // id -> { id, name, shape, category }
  const connections = [];
  const frames = [];
  const frameStack = []; // for nested subgraphs

  let direction = 'LR';

  /**
   * Register a node from a parsed reference
   * @param {{ id: string, label: string|null, shape: string|null }} ref
   */
  function registerNode(ref) {
    if (!nodes.has(ref.id)) {
      nodes.set(ref.id, {
        id: ref.id,
        name: ref.label || ref.id,
        type: 'default',
        shape: ref.shape || 'rect',
        category: 'default',
      });
    } else if (ref.label && !nodes.get(ref.id).name) {
      // Update label if first seen was bare reference
      const existing = nodes.get(ref.id);
      if (existing.name === existing.id) {
        existing.name = ref.label;
      }
      if (ref.shape) existing.shape = ref.shape;
    }
    // Track frame membership
    if (frameStack.length > 0) {
      const currentFrame = frameStack[frameStack.length - 1];
      if (!currentFrame._nodeIds) currentFrame._nodeIds = [];
      if (!currentFrame._nodeIds.includes(ref.id)) {
        currentFrame._nodeIds.push(ref.id);
      }
    }
  }

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('%%')) continue; // skip empty and comments

    // Graph direction
    const dirMatch = line.match(/^graph\s+(LR|RL|TB|BT|TD)\s*$/);
    if (dirMatch) {
      direction = dirMatch[1] === 'TD' ? 'TB' : dirMatch[1];
      continue;
    }

    // Flowchart direction (alias)
    const flowMatch = line.match(/^flowchart\s+(LR|RL|TB|BT|TD)\s*$/);
    if (flowMatch) {
      direction = flowMatch[1] === 'TD' ? 'TB' : flowMatch[1];
      continue;
    }

    // Subgraph start
    const subMatch = line.match(/^subgraph\s+(\w+)(?:\["(.+?)"\])?\s*$/);
    if (subMatch) {
      const frame = {
        label: subMatch[2] || subMatch[1],
        color: '#4a9eff',
        x: 0, y: 0,
        width: 400, height: 300,
        _nodeIds: [],
      };
      frameStack.push(frame);
      frames.push(frame);
      continue;
    }

    // Subgraph end
    if (line === 'end') {
      frameStack.pop();
      continue;
    }

    // Direction inside subgraph
    if (line.match(/^direction\s+(LR|RL|TB|BT|TD)$/)) continue;

    // Try arrow patterns (connection lines)
    let matched = false;
    for (const pattern of ARROW_PATTERNS) {
      const m = line.match(pattern);
      if (m) {
        matched = true;
        if (m.length === 4) {
          // With label: source, label, target
          const source = parseNodeRef(m[1]);
          const label = m[2].trim();
          const target = parseNodeRef(m[3]);
          registerNode(source);
          registerNode(target);
          connections.push({
            from: source.id,
            out: label || 'exec',
            to: target.id,
            in: 'exec',
          });
        } else if (m.length === 3) {
          // No label: source, target
          const source = parseNodeRef(m[1]);
          const target = parseNodeRef(m[2]);
          registerNode(source);
          registerNode(target);
          connections.push({
            from: source.id,
            out: 'exec',
            to: target.id,
            in: 'exec',
          });
        }
        break;
      }
    }

    // If not a connection, try as standalone node declaration
    if (!matched) {
      // Handle "nodeA & nodeB & nodeC" syntax
      const parts = line.split(/\s*&\s*/);
      for (const part of parts) {
        const ref = parseNodeRef(part.trim());
        if (ref.id && ref.id !== 'end' && !ref.id.startsWith('style') && !ref.id.startsWith('class')) {
          registerNode(ref);
        }
      }
    }
  }

  return {
    nodes: [...nodes.values()],
    connections,
    frames: frames.map(f => ({
      label: f.label,
      color: f.color,
      x: f.x, y: f.y,
      width: f.width, height: f.height,
    })),
    direction,
  };
}
