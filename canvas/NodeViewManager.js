/**
 * NodeViewManager — creates/destroys graph-node elements with group drag
 *
 * Handles DOM creation, drag initialization with snap-to-grid,
 * group drag for multi-selected nodes, and twitch click detection.
 * Extracted from NodeCanvas to reduce complexity (was 27 cyclomatic).
 *
 * @module symbiote-node/canvas/NodeViewManager
 */

import { Drag } from '../interactions/Drag.js';
import { Selector } from '../interactions/Selector.js';

export class NodeViewManager {

  /** @type {Map<string, HTMLElement>} */
  #nodeViews;

  /** @type {import('../core/Editor.js').NodeEditor} */
  #editor;

  /** @type {import('../interactions/Selector.js').Selector} */
  #selector;

  /** @type {import('../interactions/SnapGrid.js').SnapGrid} */
  #snapGrid;

  /** @type {function} */
  #getZoom;

  /** @type {function} */
  #setNodePosition;

  /** @type {function} */
  #onNodeClick;

  /** @type {Object} */
  #canvas;

  /** @type {boolean} */
  #readonly = false;

  /** @type {boolean} */
  #snapEnabled = false;

  /** @type {HTMLElement} */
  #nodesLayer;

  /**
   * @param {object} config
   * @param {Map<string, HTMLElement>} config.nodeViews - shared Map
   * @param {import('../core/Editor.js').NodeEditor} config.editor
   * @param {import('../interactions/Selector.js').Selector} config.selector
   * @param {import('../interactions/SnapGrid.js').SnapGrid} config.snapGrid
   * @param {function} config.getZoom
   * @param {function} config.setNodePosition
   * @param {function} config.onNodeClick
   * @param {HTMLElement} config.nodesLayer
   * @param {Object} config.canvas - NodeCanvas reference for socket registration
   */
  constructor({ nodeViews, editor, selector, snapGrid, getZoom, setNodePosition, onNodeClick, nodesLayer, canvas }) {
    this.#nodeViews = nodeViews;
    this.#editor = editor;
    this.#selector = selector;
    this.#snapGrid = snapGrid;
    this.#getZoom = getZoom;
    this.#setNodePosition = setNodePosition;
    this.#onNodeClick = onNodeClick;
    this.#nodesLayer = nodesLayer;
    this.#canvas = canvas;
  }

  /** @param {boolean} readonly */
  setReadonly(readonly) {
    this.#readonly = readonly;
  }

  /** @param {boolean} enabled */
  setSnapEnabled(enabled) {
    this.#snapEnabled = enabled;
  }

  /**
   * Create a graph-node element for a Node
   * @param {import('../core/Node.js').Node} node
   */
  addView(node) {
    const el = document.createElement('graph-node');
    el.style.position = 'absolute';
    el.style.transform = 'translate(0px, 0px)';
    el._position = { x: 0, y: 0 };
    el._nodeData = node;
    el.setAttribute('node-id', node.id);
    el.setAttribute('node-label', node.label);
    el.setAttribute('node-category', node.category);
    el.setAttribute('node-shape', node.shape);
    el.setAttribute('node-type', node.type || 'default');
    el._canvas = this.#canvas;

    const drag = new Drag();
    let dragStart = null;

    drag.initialize(
      el,
      {
        getPosition: () => el._position,
        getZoom: this.#getZoom,
      },
      {
        onStart: (e) => {
          if (this.#readonly) return;
          dragStart = { x: e.pageX, y: e.pageY };
          this.#autoSelectOnDragStart(node.id, e);
          this.#captureDragStartPositions();
          this.#editor.emit('nodepicked', node);
        },
        onTranslate: (x, y) => {
          if (this.#readonly) return;
          this.#handleGroupTranslate(node.id, el, x, y);
        },
        onDrop: (e) => {
          this.#handleDrop(node.id, el, e, dragStart);
          dragStart = null;
        },
      }
    );
    el._drag = drag;

    this.#nodesLayer.appendChild(el);
    this.#nodeViews.set(node.id, el);
  }

  /**
   * Remove a graph-node element
   * @param {import('../core/Node.js').Node} node
   */
  removeView(node) {
    const el = this.#nodeViews.get(node.id);
    if (!el) return;
    if (el._drag) el._drag.destroy();
    el.remove();
    this.#nodeViews.delete(node.id);
    this.#selector.getSelectedNodes().delete(node.id);
  }

  // --- Private helpers ---

  #autoSelectOnDragStart(nodeId, e) {
    if (!this.#selector.isNodeSelected(nodeId)) {
      const accumulate = e.ctrlKey || e.metaKey;
      this.#selector.selectNode(nodeId, accumulate);
    }
  }

  #captureDragStartPositions() {
    const selected = this.#selector.getSelectedNodes();
    for (const id of selected) {
      const nodeEl = this.#nodeViews.get(id);
      if (nodeEl) nodeEl._dragStartPos = { ...nodeEl._position };
    }
  }

  #handleGroupTranslate(nodeId, el, x, y) {
    let finalX = x;
    let finalY = y;

    if (this.#snapEnabled && this.#snapGrid.isDynamic) {
      const snapped = this.#snapGrid.snap(x, y);
      finalX = snapped.x;
      finalY = snapped.y;
    }

    const prev = el._dragStartPos || el._position;
    const dx = finalX - prev.x;
    const dy = finalY - prev.y;

    const selected = this.#selector.getSelectedNodes();
    if (selected.size > 1 && selected.has(nodeId)) {
      for (const id of selected) {
        const nodeEl = this.#nodeViews.get(id);
        if (!nodeEl?._dragStartPos) continue;
        let nx = nodeEl._dragStartPos.x + dx;
        let ny = nodeEl._dragStartPos.y + dy;
        if (this.#snapEnabled && this.#snapGrid.isDynamic) {
          const snapped = this.#snapGrid.snap(nx, ny);
          nx = snapped.x;
          ny = snapped.y;
        }
        this.#setNodePosition(id, nx, ny);
      }
    } else {
      this.#setNodePosition(nodeId, finalX, finalY);
    }

    this.#editor.emit('nodetranslated', { id: nodeId, position: { x: finalX, y: finalY } });
  }

  #handleDrop(nodeId, el, e, dragStart) {
    // Static snap on drop
    if (this.#snapEnabled && !this.#snapGrid.isDynamic) {
      const selected = this.#selector.getSelectedNodes();
      const targets = selected.size > 0 && selected.has(nodeId) ? selected : new Set([nodeId]);
      for (const id of targets) {
        const nodeEl = this.#nodeViews.get(id);
        if (!nodeEl) continue;
        const snapped = this.#snapGrid.snap(nodeEl._position.x, nodeEl._position.y);
        this.#setNodePosition(id, snapped.x, snapped.y);
      }
    }

    // Clean up start positions
    for (const [, nodeEl] of this.#nodeViews) {
      delete nodeEl._dragStartPos;
    }

    // Click vs drag detection
    if (dragStart && e && Selector.isTwitch(dragStart, { x: e.pageX, y: e.pageY })) {
      this.#onNodeClick(nodeId, e);
    }

    this.#editor.emit('nodedragged', { id: nodeId });
  }
}
