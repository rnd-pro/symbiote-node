export const DOT_RADIUS = 6;
export const HIT_RADIUS = 14;

const TYPE_COLORS = {
  action: [255, 150, 140],
  output: [120, 210, 170],
  data: [120, 180, 255],
  config: [255, 200, 120],
  external: [190, 150, 255],
  style: [255, 180, 220],
  docs: [200, 210, 215],
  asset: [150, 230, 230],
  group: [230, 180, 110],
};

export function parseHexColor(value) {
  if (typeof value !== 'string') return null;
  let hex = value.trim().replace(/^#/, '');
  if (!/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(hex)) return null;
  let parts = hex.length === 3
    ? [...hex].map((part) => part + part)
    : [hex.slice(0, 2), hex.slice(2, 4), hex.slice(4, 6)];
  return parts.map((part) => parseInt(part, 16));
}

export function getNodeColor(node) {
  return parseHexColor(node.color) || TYPE_COLORS[node.type] || TYPE_COLORS.data;
}

export function getGroupOrbitMetrics(node, conns, opts = {}) {
  let hubScale = 1 + Math.min(conns, 8) * 0.1;
  let aScale = opts.scale ?? (node.aScale || 1);
  let baseR = DOT_RADIUS * hubScale * aScale;
  let childCount = Math.max(2, Math.min(12, node.children?.length || 3));
  let innerR = baseR * Math.max(0.1, 0.18 - (childCount - 3) * 0.008);
  let spacing = innerR * 2.5;
  let orbitR = spacing / (2 * Math.sin(Math.PI / childCount));
  return { hubScale, baseR, childCount, innerR, spacing, orbitR };
}

/**
 * @param {object} node
 * @param {number} conns
 * @param {Object} [opts={}]
 * @param {number} [opts.scale]
 * @returns {number}
 */
export function getNodeRadius(node, conns, opts = {}) {
  if (node.isGroup) {
    let { innerR, orbitR } = getGroupOrbitMetrics(node, conns, opts);
    return (orbitR + innerR + 2) / 0.88;
  }
  let hubScale = 1 + Math.min(conns, 8) * 0.1;
  let aScale = opts.scale ?? (node.aScale || 1);
  return DOT_RADIUS * hubScale * aScale;
}

/**
 * @param {object} options
 * @param {number} options.depth
 * @param {Record<number, { scale: number, parallax: number }>} options.layerAnim
 * @param {number} options.dpr
 * @param {number} options.zoom
 * @param {number} options.panX
 * @param {number} options.panY
 * @param {number} options.vcx
 * @param {number} options.vcy
 * @param {boolean} options.focusActive
 * @param {number} options.focusX
 * @param {number} options.focusY
 * @param {number} options.dragDeltaX
 * @param {number} options.dragDeltaY
 * @returns {{ A: number, E: number, F: number }}
 */
export function getLayerTransform(options) {
  let {
    depth,
    layerAnim,
    dpr,
    zoom,
    panX,
    panY,
    vcx,
    vcy,
    focusActive,
    focusX,
    focusY,
    dragDeltaX,
    dragDeltaY,
  } = options;
  let s = layerAnim[depth].scale;
  if (depth > 0) {
    let pOffX = -layerAnim[depth].parallax * dragDeltaX;
    let pOffY = -layerAnim[depth].parallax * dragDeltaY;
    return {
      A: s * dpr * zoom,
      E: s * dpr * panX + vcx * (1 - s) + pOffX,
      F: s * dpr * panY + vcy * (1 - s) + pOffY,
    };
  }
  if (focusActive && Math.abs(s - 1) > 0.001) {
    return {
      A: s * dpr * zoom,
      E: focusX * (1 - s) + s * dpr * panX,
      F: focusY * (1 - s) + s * dpr * panY,
    };
  }
  return {
    A: dpr * zoom,
    E: dpr * panX,
    F: dpr * panY,
  };
}

/**
 * @param {object} options
 * @param {{ x: number, y: number }} options.world
 * @param {object} options.activeNode
 * @param {{ x: number, y: number }} options.activePosition
 * @param {number} options.connectionCount
 * @param {Array<{ action: string }>} options.menuItems
 * @returns {{ action: string } | null}
 */
export function getRadialMenuHit(options) {
  let { world, activeNode, activePosition, connectionCount, menuItems } = options;
  let layout = getRadialMenuLayout({
    activeNode,
    activePosition,
    connectionCount,
    menuItems,
  });

  for (let entry of layout.items) {
    let dx = world.x - entry.x;
    let dy = world.y - entry.y;
    if (dx * dx + dy * dy < entry.itemRadius * entry.itemRadius * 2) {
      return entry.item;
    }
  }
  return null;
}

export function getRadialMenuLayout(options) {
  let {
    activeNode,
    activePosition,
    connectionCount,
    menuItems,
    menuAnim = 1,
  } = options;
  let nodeR = getNodeRadius(activeNode, connectionCount, {
    scale: activeNode.aScale || 1.5,
  });
  let menuDist = nodeR + 14;
  let itemR = 6;
  let easeOut = 1 - Math.pow(1 - menuAnim, 3);
  let menuRadius = menuDist * easeOut;
  let itemRadius = itemR * Math.max(0, easeOut);
  let items = menuItems.map((item, index) => {
    let angle = (index / menuItems.length) * Math.PI * 2 - Math.PI / 2;
    return {
      item,
      angle,
      x: activePosition.x + Math.cos(angle) * menuRadius,
      y: activePosition.y + Math.sin(angle) * menuRadius,
      itemRadius,
    };
  });

  return { nodeR, menuDist, itemR, easeOut, menuRadius, itemRadius, items };
}
