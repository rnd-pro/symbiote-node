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
import { animateOut } from '@symbiotejs/symbiote';

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
  #animateNodeToPosition;

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
   * @param {function} config.animateNodeToPosition
   * @param {function} config.onNodeClick
   * @param {HTMLElement} config.nodesLayer
   * @param {Object} config.canvas - NodeCanvas reference for socket registration
   */
  constructor({ nodeViews, editor, selector, snapGrid, getZoom, setNodePosition, animateNodeToPosition, onNodeClick, nodesLayer, canvas }) {
    this.#nodeViews = nodeViews;
    this.#editor = editor;
    this.#selector = selector;
    this.#snapGrid = snapGrid;
    this.#getZoom = getZoom;
    this.#setNodePosition = setNodePosition;
    this.#animateNodeToPosition = animateNodeToPosition;
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

    // Subgraph preview canvas
    if (node._isSubgraph) {
      requestAnimationFrame(() => {
        this.#initSubgraphPreview(el, node);
      });
    }
  }

  /**
   * Remove a graph-node element
   * @param {import('../core/Node.js').Node} node
   */
  removeView(node) {
    const el = this.#nodeViews.get(node.id);
    if (!el) return;
    if (el._previewRaf) cancelAnimationFrame(el._previewRaf);
    if (el._drag) el._drag.destroy();
    animateOut(el);
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
        this.#animateNodeToPosition(id, snapped.x, snapped.y);
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

  /**
   * Initialize subgraph preview canvas inside a graph-node
   * @param {HTMLElement} el - graph-node element
   * @param {import('../core/SubgraphNode.js').SubgraphNode} node
   */
  #initSubgraphPreview(el, node) {
    const body = el.querySelector('.sn-node-body');
    if (!body) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'sn-subgraph-preview';
    canvas.width = 200;
    canvas.height = 80;
    body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    el._previewCanvas = canvas;

    const drawPreview = () => {
      if (!el.isConnected) return;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const innerEditor = node.innerEditor;
      if (!innerEditor) return;

      const nodes = innerEditor.getNodes();
      if (nodes.length === 0) return;

      // Get positions (from saved or auto-grid)
      const positions = node.innerPositions;
      const nodeRects = [];

      for (const n of nodes) {
        const pos = positions[n.id];
        const x = pos ? pos.x : 0;
        const y = pos ? pos.y : 0;
        nodeRects.push({ x, y, w: 160, h: 60, id: n.id });
      }

      // Calculate bounds
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const r of nodeRects) {
        minX = Math.min(minX, r.x);
        minY = Math.min(minY, r.y);
        maxX = Math.max(maxX, r.x + r.w);
        maxY = Math.max(maxY, r.y + r.h);
      }

      const pad = 30;
      minX -= pad; minY -= pad;
      maxX += pad; maxY += pad;

      const graphW = maxX - minX;
      const graphH = maxY - minY;
      const scale = Math.min(w / graphW, h / graphH);
      const offsetX = (w - graphW * scale) / 2;
      const offsetY = (h - graphH * scale) / 2;

      // Draw connections as lines
      const conns = innerEditor.getConnections();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      for (const conn of conns) {
        const src = nodeRects.find(r => r.id === conn.source);
        const tgt = nodeRects.find(r => r.id === conn.target);
        if (src && tgt) {
          const sx = (src.x + src.w - minX) * scale + offsetX;
          const sy = (src.y + src.h / 2 - minY) * scale + offsetY;
          const tx = (tgt.x - minX) * scale + offsetX;
          const ty = (tgt.y + tgt.h / 2 - minY) * scale + offsetY;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(tx, ty);
          ctx.stroke();
        }
      }

      // Draw node rectangles
      for (const r of nodeRects) {
        const rx = (r.x - minX) * scale + offsetX;
        const ry = (r.y - minY) * scale + offsetY;
        const rw = r.w * scale;
        const rh = r.h * scale;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(rx, ry, rw, rh);
      }
    };

    // Initial draw + periodic refresh
    drawPreview();
    const loop = () => {
      drawPreview();
      el._previewRaf = setTimeout(() => {
        if (el.isConnected) requestAnimationFrame(loop);
      }, 2000);
    };
    el._previewRaf = setTimeout(() => requestAnimationFrame(loop), 2000);
  }
}
