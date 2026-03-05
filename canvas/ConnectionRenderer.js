/**
 * ConnectionRenderer — SVG connection path manager
 *
 * Handles rendering Bézier curves between sockets,
 * gradient coloring, flow animation, socket offset calculation.
 * Extracted from NodeCanvas to reduce complexity.
 *
 * @module symbiote-node/canvas/ConnectionRenderer
 */

import { getShape } from '../shapes/index.js';

export class ConnectionRenderer {

  /** @type {Map<string, import('../core/Connection.js').Connection>} */
  #connectionData = new Map();

  /** @type {SVGElement} */
  #svgLayer;

  /** @type {SVGElement} - overlay layer for dots (z-index above nodes) */
  #dotLayer;

  /** @type {Map<string, HTMLElement>} */
  #nodeViews;

  /** @type {import('../core/Editor.js').NodeEditor} */
  #editor;

  /** @type {function} */
  #onConnectionClick;

  /** @type {function} */
  #getZoom;

  /** @type {'bezier'|'orthogonal'|'straight'} */
  #pathStyle = 'bezier';

  /**
   * @param {object} config
   * @param {SVGElement} config.svgLayer
   * @param {Map<string, HTMLElement>} config.nodeViews
   * @param {import('../core/Editor.js').NodeEditor} config.editor
   * @param {function} config.onConnectionClick - (connId, event)
   * @param {function} config.getZoom - Returns current zoom level
   */
  constructor({ svgLayer, dotLayer, nodeViews, editor, onConnectionClick, getZoom }) {
    this.#svgLayer = svgLayer;
    this.#dotLayer = dotLayer || svgLayer;
    this.#nodeViews = nodeViews;
    this.#editor = editor;
    this.#onConnectionClick = onConnectionClick;
    this.#getZoom = getZoom || (() => 1);
  }

  /** @returns {Map<string, import('../core/Connection.js').Connection>} */
  get data() {
    return this.#connectionData;
  }

  /**
   * Add a connection and render its SVG path
   * @param {import('../core/Connection.js').Connection} conn
   */
  add(conn) {
    this.#connectionData.set(conn.id, conn);
    // Full re-render for affected nodes (slot pool needs full context)
    this.#fullRerenderForNodes(new Set([conn.from, conn.to]));
  }

  /**
   * Clear slot registries and caches for all known nodes
   */
  #clearAllSlots() {
    for (const [, el] of this.#nodeViews) {
      el._usedCoords = [];
      el._slotCache = new Map();
    }
  }

  /**
   * Full re-render: clear all slots for affected nodes, recalculate everything
   * @param {Set<string>} nodeIds
   */
  #fullRerenderForNodes(nodeIds) {
    const allNodes = new Set(nodeIds);
    const conns = [];
    for (const [, conn] of this.#connectionData) {
      if (nodeIds.has(conn.from) || nodeIds.has(conn.to)) {
        allNodes.add(conn.from);
        allNodes.add(conn.to);
        conns.push(conn);
      }
    }
    for (const nid of allNodes) {
      const el = this.#nodeViews.get(nid);
      if (el) {
        el._usedCoords = [];
        el._slotCache = new Map();
      }
    }
    for (const conn of conns) {
      this.#render(conn);
    }
  }

  /**
   * Remove a connection path
   * @param {import('../core/Connection.js').Connection} conn
   */
  remove(conn) {
    this.#connectionData.delete(conn.id);
    const path = this.#svgLayer.querySelector(`[data-conn-id="${conn.id}"]`);
    if (path) {
      // Fade out using existing CSS opacity transition
      path.style.opacity = '0';
      path.addEventListener('transitionend', () => path.remove(), { once: true });
      // Fallback removal if transition doesn't fire
      setTimeout(() => { if (path.parentNode) path.remove(); }, 200);
    }
    // Remove endpoint dots and arrow
    for (const end of ['start', 'end']) {
      const dot = this.#dotLayer.querySelector(`[data-conn-dot="${conn.id}-${end}"]`);
      if (dot) dot.remove();
    }
    const arrow = this.#svgLayer.querySelector(`[data-conn-arrow="${conn.id}"]`);
    if (arrow) arrow.remove();
  }

  /**
   * Update all connections touching a node
   * @param {string} nodeId
   */
  updateForNode(nodeId) {
    // Only clear and recalculate the DRAGGED node.
    // Non-dragged nodes use cached slot assignments (no jitter).
    const draggedEl = this.#nodeViews.get(nodeId);
    if (draggedEl) {
      draggedEl._usedCoords = [];
      draggedEl._slotCache = new Map();
    }

    // Collect touched connections for re-render
    const touchedConns = [];
    for (const [, conn] of this.#connectionData) {
      if (conn.from === nodeId || conn.to === nodeId) {
        touchedConns.push(conn);
      }
    }

    for (const conn of touchedConns) {
      this.#render(conn, nodeId);
    }
  }

  /**
   * Set data flow animation on a connection
   * @param {string} connId
   * @param {boolean} active
   */
  setFlowing(connId, active) {
    const path = this.#svgLayer.querySelector(`[data-conn-id="${connId}"]`);
    if (!path) return;
    if (active) {
      path.setAttribute('data-flowing', '');
    } else {
      path.removeAttribute('data-flowing');
    }
  }

  /**
   * Set data flow animation on all connections
   * @param {boolean} active
   */
  setAllFlowing(active) {
    for (const [connId] of this.#connectionData) {
      this.setFlowing(connId, active);
    }
  }

  /**
   * Set connection path style
   * @param {'bezier'|'orthogonal'|'straight'} style
   */
  setPathStyle(style) {
    this.#pathStyle = style;
    this.#clearAllSlots();
    for (const [, conn] of this.#connectionData) {
      this.#render(conn);
    }
  }


  /** @returns {'bezier'|'orthogonal'|'straight'} */
  get pathStyle() { return this.#pathStyle; }

  /**
   * Get socket offset relative to graph-node.
   * For SVG shapes with a target position, computes dynamic edge point
   * in the direction of the connected node (connector slides along perimeter).
   *
   * @param {HTMLElement} nodeEl
   * @param {string} portKey
   * @param {'input'|'output'} side
   * @param {{ x: number, y: number }} [targetPos] - center of the connected node (for dynamic edge)
   * @returns {{ x: number, y: number }}
   */
  getSocketOffset(nodeEl, portKey, side, targetPos) {
    // SVG shapes: compute edge position mathematically
    const shape = getShape(nodeEl.getAttribute('node-shape'));
    const nodeData = nodeEl._nodeData;
    if (shape && shape.pathData && nodeData) {
      const size = { width: nodeEl.offsetWidth || 180, height: nodeEl.offsetHeight || 100 };

      // Dynamic mode: connector slides toward the target node
      // Smart routing: inputs/outputs separated, sorted to minimize crossings
      if (targetPos && shape.getEdgePoint) {
        const ports = side === 'output' ? nodeData.outputs : nodeData.inputs;
        const keys = ports ? Object.keys(ports) : [portKey];
        const index = keys.indexOf(portKey);
        const total = keys.length;

        const nodePos = nodeEl._position;
        const cx = nodePos.x + size.width / 2;
        const cy = nodePos.y + size.height / 2;
        const baseAngle = Math.atan2(targetPos.y - cy, targetPos.x - cx);

        // 1. Separate input/output zones: gap between types
        const sideGap = Math.PI / 6; // 30° gap = one full slot between input/output
        const adjustedBase = baseAngle + (side === 'output' ? -sideGap : sideGap);

        // 2. Anti-crossing: reverse port order based on perpendicular direction
        // Cross product of connection vector tells us orientation
        const dx = targetPos.x - cx;
        const dy = targetPos.y - cy;
        // Perpendicular direction sign: if target is more to the right,
        // upper ports should go to upper positions on target (no crossing)
        const shouldReverse = (side === 'output') ? (dy < 0) : (dy > 0);
        const effectiveIndex = shouldReverse ? (total - 1 - index) : index;

        // 3. Spread ports around adjusted base angle
        let angle = adjustedBase;
        if (total > 1) {
          const segment = (2 * Math.PI) / (total * 2);
          const offset = (effectiveIndex - (total - 1) / 2) * segment;
          angle = adjustedBase + offset;
        }

        // 4. Quantize to 15° grid for stable discrete movement
        const step = Math.PI / 12; // 15° grid
        angle = Math.round(angle / step) * step;

        // Check cache first (for non-dragged nodes)
        if (!nodeEl._slotCache) nodeEl._slotCache = new Map();
        const cacheKey = `${portKey}:${side}`;
        if (nodeEl._slotCache.has(cacheKey)) {
          const cached = nodeEl._slotCache.get(cacheKey);
          return { x: cached.x, y: cached.y, angle: cached.angle };
        }

        // 5. Collision avoidance by PIXEL COORDINATES (not just angles)
        // Straight edges cause getEdgePoint to return same coords for different angles,
        // so we check actual pixel distance instead of angular difference.
        if (!nodeEl._usedCoords) nodeEl._usedCoords = [];
        const MIN_PIX = 5;
        let nudged = angle;
        let attempts = 0;
        while (attempts < 24) {
          const testPos = shape.getEdgePoint(nudged, size);
          const tooClose = nodeEl._usedCoords.some(
            c => Math.abs(testPos.x - c.x) < MIN_PIX && Math.abs(testPos.y - c.y) < MIN_PIX
          );
          if (!tooClose) break;
          nudged += step;
          attempts++;
        }

        const pos = shape.getEdgePoint(nudged, size);
        nodeEl._usedCoords.push({ x: pos.x, y: pos.y });
        const result = { x: pos.x, y: pos.y, angle: pos.angle };
        nodeEl._slotCache.set(cacheKey, result);
        return result;
      }

      // Fixed mode: distribute ports at preset angles
      const ports = side === 'output' ? nodeData.outputs : nodeData.inputs;
      if (ports) {
        const keys = Object.keys(ports);
        const index = keys.indexOf(portKey);
        const total = keys.length;
        if (index >= 0) {
          const pos = shape.getSocketPosition(side, index, total, size);
          return { x: pos.x, y: pos.y };
        }
      }
    }

    // Standard shapes: read from DOM socket elements
    const container = side === 'output'
      ? nodeEl.querySelector('.outputs')
      : nodeEl.querySelector('.inputs');

    if (container) {
      const portItems = container.querySelectorAll('port-item');
      for (const portItem of portItems) {
        if (portItem.$.key === portKey) {
          const socket = portItem.querySelector('.sn-socket');
          if (socket) {
            const nodeRect = nodeEl.getBoundingClientRect();
            const socketRect = socket.getBoundingClientRect();
            const z = this.#getZoom();
            return {
              x: (socketRect.left - nodeRect.left + socketRect.width / 2) / z,
              y: (socketRect.top - nodeRect.top + socketRect.height / 2) / z,
            };
          }
        }
      }
    }

    return {
      x: side === 'output' ? nodeEl.offsetWidth : 0,
      y: nodeEl.offsetHeight / 2,
    };
  }

  /**
   * Render a single connection SVG path with tangent-aware Bézier and gradient coloring
   * @param {import('../core/Connection.js').Connection} conn
   */
  #render(conn, draggedNodeId = null) {
    const fromEl = this.#nodeViews.get(conn.from);
    const toEl = this.#nodeViews.get(conn.to);
    if (!fromEl || !toEl) return;

    const fromPos = fromEl._position;
    const toPos = toEl._position;

    // Compute centers for dynamic edge positioning on SVG shapes
    const fromCenter = {
      x: fromPos.x + (fromEl.offsetWidth || 180) / 2,
      y: fromPos.y + (fromEl.offsetHeight || 100) / 2,
    };
    const toCenter = {
      x: toPos.x + (toEl.offsetWidth || 180) / 2,
      y: toPos.y + (toEl.offsetHeight || 100) / 2,
    };

    // Always recalculate both sides (slot pool makes this cheap and deterministic)
    const fromOffset = this.getSocketOffset(fromEl, conn.out, 'output', toCenter);
    const toOffset = this.getSocketOffset(toEl, conn.in, 'input', fromCenter);

    const startX = fromPos.x + fromOffset.x;
    const startY = fromPos.y + fromOffset.y;
    const endX = toPos.x + toOffset.x;
    const endY = toPos.y + toOffset.y;

    // Tangent-aware Bézier using shape angles
    const fromNode = this.#editor.getNode(conn.from);
    const toNode = this.#editor.getNode(conn.to);
    const fromShape = getShape(fromNode?.shape);
    const toShape = getShape(toNode?.shape);

    const fromSize = { width: fromEl.offsetWidth || 180, height: fromEl.offsetHeight || 60 };
    const toSize = { width: toEl.offsetWidth || 180, height: toEl.offsetHeight || 60 };

    // Generate path based on style
    let d;
    if (this.#pathStyle === 'straight') {
      d = `M ${startX} ${startY} L ${endX} ${endY}`;
    } else if (this.#pathStyle === 'orthogonal') {
      const midX = (startX + endX) / 2;
      d = `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`;
    } else {
      // Tangent direction: use dynamic edge angle if available, else fixed socket angle
      let fromAngleDeg, toAngleDeg;

      if (fromOffset.angle !== undefined) {
        fromAngleDeg = fromOffset.angle;
      } else {
        const fromPortIndex = fromNode ? Object.keys(fromNode.outputs).indexOf(conn.out) : 0;
        const fromPortTotal = fromNode ? Object.keys(fromNode.outputs).length : 1;
        const pos = fromShape?.getSocketPosition?.('output', fromPortIndex, fromPortTotal, fromSize);
        fromAngleDeg = pos?.angle ?? 0;
      }

      if (toOffset.angle !== undefined) {
        toAngleDeg = toOffset.angle;
      } else {
        const toPortIndex = toNode ? Object.keys(toNode.inputs).indexOf(conn.in) : 0;
        const toPortTotal = toNode ? Object.keys(toNode.inputs).length : 1;
        const pos = toShape?.getSocketPosition?.('input', toPortIndex, toPortTotal, toSize);
        toAngleDeg = pos?.angle ?? 180;
      }

      const dist = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
      const cpLen = Math.max(50, dist * 0.4);
      const fromRad = (fromAngleDeg * Math.PI) / 180;
      const toRad = (toAngleDeg * Math.PI) / 180;

      const cp1x = startX + Math.cos(fromRad) * cpLen;
      const cp1y = startY + Math.sin(fromRad) * cpLen;
      const cp2x = endX + Math.cos(toRad) * cpLen;
      const cp2y = endY + Math.sin(toRad) * cpLen;

      d = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
    }

    let path = this.#svgLayer.querySelector(`[data-conn-id="${conn.id}"]`);
    if (!path) {
      path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('class', 'sn-conn-path');
      path.setAttribute('data-conn-id', conn.id);
      path.addEventListener('click', (e) => {
        e.stopPropagation();
        this.#onConnectionClick(conn.id, e);
      });
      this.#svgLayer.appendChild(path);
    }
    path.setAttribute('d', d);

    // Wire type styling — thicker for exec, normal for data
    const fromSocketName = fromNode?.outputs[conn.out]?.socket?.name || 'data';
    if (fromSocketName === 'exec' || fromSocketName === 'execution' || fromSocketName === 'trigger') {
      path.setAttribute('data-wire-type', 'exec');
      path.style.strokeWidth = '3';
      path.style.strokeDasharray = '8 4';
    } else if (fromSocketName === 'array' || fromSocketName === 'object' || fromSocketName === 'json') {
      path.setAttribute('data-wire-type', 'data-heavy');
      path.style.strokeWidth = '2.5';
      path.style.strokeDasharray = '';
    } else {
      path.removeAttribute('data-wire-type');
      path.style.strokeWidth = '';
      path.style.strokeDasharray = '';
    }

    // Gradient connection coloring
    this.#applyGradient(path, conn, fromNode, toNode, startX, startY, endX, endY);

    // Determine socket type for visual dot styling
    const outSocketName = fromNode?.outputs?.[conn.out]?.socket?.name || 'data';
    const inSocketName = toNode?.inputs?.[conn.in]?.socket?.name || outSocketName;

    // Endpoint dots with side and type coloring
    this.#updateDot(conn.id, 'start', startX, startY, 'output', outSocketName);
    this.#updateDot(conn.id, 'end', endX, endY, 'input', inSocketName);

    // Direction arrow at wire midpoint
    this.#updateArrow(conn.id, d);
  }

  /**
   * Create or update a small circle dot at a connector endpoint
   * @param {string} connId
   * @param {'start'|'end'} end
   * @param {number} x
   * @param {number} y
   * @param {'input'|'output'} side
   * @param {string} socketType
   */
  #updateDot(connId, end, x, y, side = 'output', socketType = 'data') {
    const dotId = `${connId}-${end}`;
    let dot = this.#dotLayer.querySelector(`[data-conn-dot="${dotId}"]`);
    if (!dot) {
      dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('data-conn-dot', dotId);
      dot.setAttribute('r', '5');
      this.#dotLayer.appendChild(dot);
    }
    dot.setAttribute('cx', x);
    dot.setAttribute('cy', y);

    // Classify socket type
    let typeClass = 'sn-dot-data';
    if (socketType === 'exec' || socketType === 'execution' || socketType === 'trigger') {
      typeClass = 'sn-dot-exec';
    } else if (socketType === 'ctrl' || socketType === 'control' || socketType === 'signal') {
      typeClass = 'sn-dot-ctrl';
    }
    const sideClass = side === 'input' ? 'sn-dot-input' : 'sn-dot-output';
    dot.setAttribute('class', `sn-conn-dot ${sideClass} ${typeClass}`);
  }

  /**
   * Create or update a direction arrow at the midpoint of a bezier path
   * @param {string} connId
   * @param {string} pathD - SVG path d attribute
   */
  #updateArrow(connId, pathD) {
    // Parse midpoint from bezier: M sx sy C cp1x cp1y, cp2x cp2y, ex ey
    const match = pathD.match(/M ([\d.-]+) ([\d.-]+) C ([\d.-]+) ([\d.-]+), ([\d.-]+) ([\d.-]+), ([\d.-]+) ([\d.-]+)/);
    if (!match) return;

    const [, sx, sy, cp1x, cp1y, cp2x, cp2y, ex, ey] = match.map(Number);
    // Cubic bezier at t=0.5
    const t = 0.5;
    const mt = 1 - t;
    const mx = mt * mt * mt * sx + 3 * mt * mt * t * cp1x + 3 * mt * t * t * cp2x + t * t * t * ex;
    const my = mt * mt * mt * sy + 3 * mt * mt * t * cp1y + 3 * mt * t * t * cp2y + t * t * t * ey;
    // Tangent at t=0.5
    const tx = 3 * mt * mt * (cp1x - sx) + 6 * mt * t * (cp2x - cp1x) + 3 * t * t * (ex - cp2x);
    const ty = 3 * mt * mt * (cp1y - sy) + 6 * mt * t * (cp2y - cp1y) + 3 * t * t * (ey - cp2y);
    const angle = Math.atan2(ty, tx) * 180 / Math.PI;

    let arrow = this.#svgLayer.querySelector(`[data-conn-arrow="${connId}"]`);
    if (!arrow) {
      arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      arrow.setAttribute('data-conn-arrow', connId);
      arrow.setAttribute('class', 'sn-conn-arrow');
      arrow.setAttribute('points', '-5,-3.5 5,0 -5,3.5');
      this.#svgLayer.appendChild(arrow);
    }
    arrow.setAttribute('transform', `translate(${mx},${my}) rotate(${angle})`);
  }

  /**
   * Apply socket-color gradient to connection path
   * @param {SVGPathElement} path
   * @param {import('../core/Connection.js').Connection} conn
   * @param {import('../core/Node.js').Node|undefined} fromNode
   * @param {import('../core/Node.js').Node|undefined} toNode
   * @param {number} startX
   * @param {number} startY
   * @param {number} endX
   * @param {number} endY
   */
  #applyGradient(path, conn, fromNode, toNode, startX, startY, endX, endY) {
    const fromColor = fromNode?.outputs[conn.out]?.socket?.color;
    const toColor = toNode?.inputs[conn.in]?.socket?.color;

    if (fromColor && toColor && fromColor !== toColor) {
      const gradId = `grad-${conn.id}`;
      let defs = this.#svgLayer.querySelector('defs');
      if (!defs) {
        defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        this.#svgLayer.prepend(defs);
      }
      let grad = defs.querySelector(`#${gradId}`);
      if (!grad) {
        grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        grad.setAttribute('id', gradId);
        const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop1.setAttribute('offset', '0%');
        const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop2.setAttribute('offset', '100%');
        grad.appendChild(stop1);
        grad.appendChild(stop2);
        defs.appendChild(grad);
      }
      grad.setAttribute('gradientUnits', 'userSpaceOnUse');
      grad.setAttribute('x1', String(startX));
      grad.setAttribute('y1', String(startY));
      grad.setAttribute('x2', String(endX));
      grad.setAttribute('y2', String(endY));
      grad.children[0].setAttribute('stop-color', fromColor);
      grad.children[1].setAttribute('stop-color', toColor);
      path.setAttribute('stroke', `url(#${gradId})`);
    } else if (fromColor) {
      path.setAttribute('stroke', fromColor);
    }
  }
}
