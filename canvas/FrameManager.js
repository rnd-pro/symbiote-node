/**
 * FrameManager.js
 *
 * Handles DOM creation, dragging, resizing, and child node containment
 * for GraphFrame elements on the canvas.
 *
 * @module symbiote-node/canvas/FrameManager
 */

import { Drag } from '../interactions/Drag.js';

export class FrameManager {
  /** @type {Map<string, HTMLElement>} */
  #frameViews = new Map();

  /** @type {Map<string, HTMLElement>} */
  #nodeViews;

  /** @type {import('../core/Editor.js').NodeEditor} */
  #editor;

  /** @type {import('./NodeCanvas/NodeCanvas.js').NodeCanvas} */
  #canvas;

  /** @type {function} */
  #setNodePosition;

  /**
   * @param {object} options
   * @param {Map<string, HTMLElement>} options.nodeViews
   * @param {import('../core/Editor.js').NodeEditor} options.editor
   * @param {import('./NodeCanvas/NodeCanvas.js').NodeCanvas} options.canvas
   * @param {function(string, number, number): void} options.setNodePosition
   */
  constructor({ nodeViews, editor, canvas, setNodePosition }) {
    this.#nodeViews = nodeViews;
    this.#editor = editor;
    this.#canvas = canvas;
    this.#setNodePosition = setNodePosition;
  }

  /**
   * Remove all frame views and destroy their interactions
   */
  clear() {
    for (const [, el] of this.#frameViews) {
      if (el._drag) el._drag.destroy();
      if (el._resizeDrag) el._resizeDrag.destroy();
      el.remove();
    }
    this.#frameViews.clear();
  }

  /**
   * Set frame position
   * @param {string} frameId
   * @param {number} x
   * @param {number} y
   */
  setPosition(frameId, x, y) {
    const el = this.#frameViews.get(frameId);
    if (!el) return;
    el.style.transform = `translate(${x}px, ${y}px)`;
    el._position = { x, y };
    const frame = this.#editor?.getFrame(frameId);
    if (frame) { frame.x = x; frame.y = y; }
  }

  /**
   * Set frame size
   * @param {string} frameId
   * @param {number} w
   * @param {number} h
   */
  setSize(frameId, w, h) {
    const el = this.#frameViews.get(frameId);
    if (!el) return;
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    const frame = this.#editor?.getFrame(frameId);
    if (frame) { frame.width = w; frame.height = h; }
  }

  /**
   * Get node IDs that are spatially inside a frame
   * @param {string} frameId
   * @returns {string[]}
   */
  #getNodesInFrame(frameId) {
    const el = this.#frameViews.get(frameId);
    if (!el) return [];
    const fp = el._position;
    const fw = parseFloat(el.style.width) || el._frameData?.width || 400;
    const fh = parseFloat(el.style.height) || el._frameData?.height || 300;
    const ids = [];
    for (const [nodeId, nodeEl] of this.#nodeViews) {
      const np = nodeEl._position;
      if (np && np.x >= fp.x && np.y >= fp.y && np.x <= fp.x + fw && np.y <= fp.y + fh) {
        ids.push(nodeId);
      }
    }
    return ids;
  }

  /**
   * Create frame DOM element with drag and resize
   * @param {import('../core/Frame.js').Frame} frame
   */
  addView(frame) {
    const el = document.createElement('graph-frame');
    el.style.position = 'absolute';
    el.style.width = `${frame.width}px`;
    el.style.height = `${frame.height}px`;
    el.style.transform = `translate(${frame.x}px, ${frame.y}px)`;
    el._position = { x: frame.x, y: frame.y };
    el._frameData = frame;
    el.setAttribute('frame-id', frame.id);

    // Set frame color directly as CSS variable
    el.style.setProperty('--frame-color', frame.color);

    // Wait for Symbiote render, then set state
    requestAnimationFrame(() => {
      if (el.$) {
        el.$.label = frame.label;
        el.$.color = frame.color;
      } else {
        // Fallback: set label text directly
        const labelEl = el.querySelector('.sn-frame-label');
        if (labelEl) labelEl.textContent = frame.label;
      }
    });

    // Frame drag — moves child nodes too
    const drag = new Drag();
    let childStartPositions = null;
    let frameStartPos = null;

    drag.initialize(
      el,
      {
        getPosition: () => el._position,
        getZoom: () => this.#canvas.$.zoom,
      },
      {
        onStart: () => {
          frameStartPos = { ...el._position };
          // Capture positions of nodes that are inside this frame
          const nodeIds = this.#getNodesInFrame(frame.id);
          childStartPositions = new Map();
          for (const nid of nodeIds) {
            const nel = this.#nodeViews.get(nid);
            if (nel && nel._position) childStartPositions.set(nid, { ...nel._position });
          }
        },
        onTranslate: (x, y) => {
          // Move child nodes by delta from frame start
          if (childStartPositions && frameStartPos) {
            const dx = x - frameStartPos.x;
            const dy = y - frameStartPos.y;
            for (const [nid, startPos] of childStartPositions) {
              this.#setNodePosition(nid, startPos.x + dx, startPos.y + dy);
            }
          }
          this.setPosition(frame.id, x, y);
        },
        onDrop: () => {
          childStartPositions = null;
          frameStartPos = null;
        },
      }
    );
    el._drag = drag;

    // Resize handle
    requestAnimationFrame(() => {
      const handle = el.ref?.resizeHandle;
      if (handle) {
        const resizeDrag = new Drag();
        let startSize = null;
        resizeDrag.initialize(
          handle,
          {
            getPosition: () => ({ x: frame.width, y: frame.height }),
            getZoom: () => this.#canvas.$.zoom,
          },
          {
            onStart: () => {
              startSize = { w: frame.width, h: frame.height };
            },
            onTranslate: (x, y) => {
              const w = Math.max(120, x);
              const h = Math.max(80, y);
              this.setSize(frame.id, w, h);
            },
            onDrop: () => { startSize = null; },
          }
        );
        el._resizeDrag = resizeDrag;
      }
    });

    this.#canvas.ref.framesLayer.appendChild(el);
    this.#frameViews.set(frame.id, el);
  }

  /**
   * Remove frame DOM element
   * @param {import('../core/Frame.js').Frame} frame
   */
  removeView(frame) {
    const el = this.#frameViews.get(frame.id);
    if (!el) return;
    if (el._drag) el._drag.destroy();
    if (el._resizeDrag) el._resizeDrag.destroy();
    el.remove();
    this.#frameViews.delete(frame.id);
  }
}
