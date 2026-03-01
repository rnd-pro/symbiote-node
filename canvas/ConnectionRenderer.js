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
  constructor({ svgLayer, nodeViews, editor, onConnectionClick, getZoom }) {
    this.#svgLayer = svgLayer;
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
    this.#render(conn);
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
  }

  /**
   * Update all connections touching a node
   * @param {string} nodeId
   */
  updateForNode(nodeId) {
    for (const [, conn] of this.#connectionData) {
      if (conn.from === nodeId || conn.to === nodeId) {
        this.#render(conn);
      }
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
    for (const [, conn] of this.#connectionData) {
      this.#render(conn);
    }
  }

  /** @returns {'bezier'|'orthogonal'|'straight'} */
  get pathStyle() { return this.#pathStyle; }

  /**
   * Get socket offset relative to graph-node using getBoundingClientRect
   * @param {HTMLElement} nodeEl
   * @param {string} portKey
   * @param {'input'|'output'} side
   * @returns {{ x: number, y: number }}
   */
  getSocketOffset(nodeEl, portKey, side) {
    const container = side === 'output'
      ? nodeEl.querySelector('.sn-outputs')
      : nodeEl.querySelector('.sn-inputs');

    if (container) {
      const portItems = container.querySelectorAll('sn-port-item');
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
  #render(conn) {
    const fromEl = this.#nodeViews.get(conn.from);
    const toEl = this.#nodeViews.get(conn.to);
    if (!fromEl || !toEl) return;

    const fromPos = fromEl._position;
    const toPos = toEl._position;

    const fromOffset = this.getSocketOffset(fromEl, conn.out, 'output');
    const toOffset = this.getSocketOffset(toEl, conn.in, 'input');

    const startX = fromPos.x + fromOffset.x;
    const startY = fromPos.y + fromOffset.y;
    const endX = toPos.x + toOffset.x;
    const endY = toPos.y + toOffset.y;

    // Tangent-aware Bézier using shape angles
    const fromNode = this.#editor.getNode(conn.from);
    const toNode = this.#editor.getNode(conn.to);
    const fromShape = getShape(fromNode?.shape);
    const toShape = getShape(toNode?.shape);

    const fromPortIndex = fromNode ? Object.keys(fromNode.outputs).indexOf(conn.out) : 0;
    const fromPortTotal = fromNode ? Object.keys(fromNode.outputs).length : 1;
    const toPortIndex = toNode ? Object.keys(toNode.inputs).indexOf(conn.in) : 0;
    const toPortTotal = toNode ? Object.keys(toNode.inputs).length : 1;

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
      // Tangent-aware Bézier (default)
      const fromSockPos = fromShape.getSocketPosition('output', fromPortIndex, fromPortTotal, fromSize);
      const toSockPos = toShape.getSocketPosition('input', toPortIndex, toPortTotal, toSize);

      const dist = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
      const cpLen = Math.max(50, dist * 0.4);
      const fromRad = (fromSockPos.angle * Math.PI) / 180;
      const toRad = (toSockPos.angle * Math.PI) / 180;

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
