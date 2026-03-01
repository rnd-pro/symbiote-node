/**
 * Minimap — small overview of the entire node graph
 *
 * Shows a scaled-down view of all nodes and connections.
 * The viewport rectangle shows current visible area and can be dragged to pan.
 * Positioned bottom-right of the canvas.
 *
 * @module symbiote-node/canvas/Minimap
 */

import Symbiote, { html, css } from '@symbiotejs/symbiote';

export class Minimap extends Symbiote {

  init$ = {
    visible: true,
  };

  /** @type {HTMLCanvasElement|null} */
  #canvas2d = null;

  /** @type {CanvasRenderingContext2D|null} */
  #ctx = null;

  /** @type {function|null} */
  #getState = null;

  /** @type {boolean} */
  #isDragging = false;

  /** @type {number} */
  #rafId = 0;

  renderCallback() {
    this.#canvas2d = this.querySelector('canvas');
    this.#ctx = this.#canvas2d?.getContext('2d');

    // Pointer events for viewport drag
    this.#canvas2d?.addEventListener('pointerdown', (e) => this.#onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.#onPointerMove(e));
    window.addEventListener('pointerup', () => this.#onPointerUp());
  }

  /**
   * Set state getter for reading canvas state
   * @param {function} fn - returns { nodes, transform, containerSize }
   */
  setStateGetter(fn) {
    this.#getState = fn;
    this.#startLoop();
  }

  #startLoop() {
    const draw = () => {
      this.#draw();
      this.#rafId = requestAnimationFrame(draw);
    };
    this.#rafId = requestAnimationFrame(draw);
  }

  #draw() {
    const ctx = this.#ctx;
    const canvas = this.#canvas2d;
    if (!ctx || !canvas || !this.#getState) return;

    const state = this.#getState();
    if (!state) return;

    const { nodes, transform, containerSize } = state;
    const w = canvas.width;
    const h = canvas.height;

    // Read theme colors from CSS variables
    const cs = getComputedStyle(this);
    const bgColor = cs.getPropertyValue('--sn-minimap-bg').trim()
      || cs.getPropertyValue('--sn-bg').trim()
      || 'rgba(20, 20, 35, 0.85)';
    const nodeColor = cs.getPropertyValue('--sn-minimap-node').trim()
      || 'rgba(80, 130, 200, 0.6)';
    const nodeStroke = cs.getPropertyValue('--sn-minimap-node-stroke').trim()
      || cs.getPropertyValue('--sn-node-border').trim()
      || 'rgba(120, 170, 255, 0.3)';
    const vpStroke = cs.getPropertyValue('--sn-minimap-viewport').trim()
      || 'rgba(255, 255, 255, 0.6)';
    const vpFill = cs.getPropertyValue('--sn-minimap-viewport-fill').trim()
      || 'rgba(255, 255, 255, 0.04)';

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);

    if (nodes.length === 0) return;

    // Calculate bounds of all nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + (n.width || 200));
      maxY = Math.max(maxY, n.y + (n.height || 100));
    }

    // Add padding
    const pad = 100;
    minX -= pad; minY -= pad;
    maxX += pad; maxY += pad;

    const graphW = maxX - minX;
    const graphH = maxY - minY;

    // Scale to fit
    const scaleX = w / graphW;
    const scaleY = h / graphH;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = (w - graphW * scale) / 2;
    const offsetY = (h - graphH * scale) / 2;

    // Store for viewport drag
    this._mapMinX = minX;
    this._mapMinY = minY;
    this._mapScale = scale;
    this._mapOffsetX = offsetX;
    this._mapOffsetY = offsetY;

    // Draw nodes as rectangles
    for (const n of nodes) {
      const x = (n.x - minX) * scale + offsetX;
      const y = (n.y - minY) * scale + offsetY;
      const nw = (n.width || 200) * scale;
      const nh = (n.height || 80) * scale;

      ctx.fillStyle = n.bypassed ? 'rgba(100, 100, 100, 0.5)' : nodeColor;
      ctx.fillRect(x, y, nw, nh);
      ctx.strokeStyle = nodeStroke;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, nw, nh);
    }

    // Draw viewport rectangle
    if (containerSize && transform) {
      const vx = (-transform.x / transform.zoom - minX) * scale + offsetX;
      const vy = (-transform.y / transform.zoom - minY) * scale + offsetY;
      const vw = (containerSize.width / transform.zoom) * scale;
      const vh = (containerSize.height / transform.zoom) * scale;

      ctx.strokeStyle = vpStroke;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(vx, vy, vw, vh);
      ctx.fillStyle = vpFill;
      ctx.fillRect(vx, vy, vw, vh);
    }
  }

  #onPointerDown(e) {
    this.#isDragging = true;
    this.#navigateTo(e);
    e.preventDefault();
  }

  #onPointerMove(e) {
    if (!this.#isDragging) return;
    this.#navigateTo(e);
  }

  #onPointerUp() {
    this.#isDragging = false;
  }

  #navigateTo(e) {
    if (!this.#getState || !this.#canvas2d) return;
    const rect = this.#canvas2d.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const state = this.#getState();
    if (!state?.containerSize || !state?.transform) return;

    // Convert minimap coords to graph coords
    const graphX = (mx - this._mapOffsetX) / this._mapScale + this._mapMinX;
    const graphY = (my - this._mapOffsetY) / this._mapScale + this._mapMinY;

    // Center the viewport on that point
    const zoom = state.transform.zoom;
    const newX = -(graphX * zoom - state.containerSize.width / 2);
    const newY = -(graphY * zoom - state.containerSize.height / 2);

    // Dispatch event so NodeCanvas can update its transform
    this.dispatchEvent(new CustomEvent('minimap-navigate', {
      detail: { x: newX, y: newY },
      bubbles: true,
    }));
  }

  destroyCallback() {
    cancelAnimationFrame(this.#rafId);
  }
}

Minimap.template = html`
<canvas width="200" height="140"></canvas>
`;

Minimap.rootStyles = css`
node-minimap {
  position: absolute;
  bottom: 16px;
  right: 16px;
  width: 200px;
  height: 140px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--sn-node-border, rgba(255,255,255,0.08));
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
  z-index: 90;
  cursor: crosshair;

  &[hidden] {
    display: none;
  }

  & canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
}
`;

Minimap.reg('node-minimap');
