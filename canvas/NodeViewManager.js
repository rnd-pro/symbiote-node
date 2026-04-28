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
import { getShape } from '../shapes/index.js';

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

  /** @type {function|null} */
  #onSvgShapeReady = null;

  /** @type {boolean} */
  #readonly = false;

  /** @type {boolean} */
  #snapEnabled = false;

  /** @type {HTMLElement} */
  #nodesLayer;

  /** @type {number} Z-index counter: increments on each select/drag */
  #zCounter = 1;

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
  constructor({ nodeViews, editor, selector, snapGrid, getZoom, setNodePosition, animateNodeToPosition, onNodeClick, nodesLayer, canvas, onSvgShapeReady }) {
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
    this.#onSvgShapeReady = onSvgShapeReady || null;
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
   * Create and append multiple node views in a single DOM batch.
   * This prevents layout thrashing and O(N) mutation overhead during graph inflation.
   * @param {import('../core/Node.js').Node[]} nodes
   */
  addViews(nodes) {
    if (!nodes || nodes.length === 0) return;

    let fragment = document.createDocumentFragment();
    
    // 1. Create all elements and bind them (no DOM append yet)
    for (const node of nodes) {
      let el = this.#createNodeElement(node);
      fragment.appendChild(el);
      this.#nodeViews.set(node.id, el);
    }

    // 2. Single batch insert into live DOM
    this.#nodesLayer.appendChild(fragment);

    // 3. Post-processing (SVG injection, preview canvas) requires elements to be in DOM
    for (const node of nodes) {
      let el = this.#nodeViews.get(node.id);
      if (el) this.#postProcessNodeView(node, el);
    }
  }

  /**
   * Create a graph-node element for a Node
   * @param {import('../core/Node.js').Node} node
   */
  addView(node) {
    let el = this.#createNodeElement(node);
    this.#nodesLayer.appendChild(el);
    this.#nodeViews.set(node.id, el);
    this.#postProcessNodeView(node, el);
  }

  /**
   * Creates the HTMLElement for a node with its drag behavior initialized.
   * Does NOT append to the live DOM layer.
   * @private
   * @param {import('../core/Node.js').Node} node
   * @returns {HTMLElement}
   */
  #createNodeElement(node) {
    let el = document.createElement('graph-node');
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

    let drag = new Drag();
    let dragStart = null;

    drag.initialize(
      el,
      {
        getPosition: () => el._position,
        getZoom: this.#getZoom,
      },
      {
        shouldStart: (e) => {
          // SVG shapes: only start drag if click is inside the SVG path
          let svgPath = el.querySelector('svg > path');
          if (!svgPath) return true; // not an SVG shape node
          let svg = svgPath.ownerSVGElement;
          let rect = svg.getBoundingClientRect();
          let vb = svg.viewBox.baseVal;
          // Convert page coords to SVG viewBox coords
          let sx = (e.clientX - rect.left) / rect.width * vb.width + vb.x;
          let sy = (e.clientY - rect.top) / rect.height * vb.height + vb.y;
          let pt = new DOMPoint(sx, sy);
          return svgPath.isPointInFill(pt);
        },
        onStart: (e) => {
          dragStart = { x: e.pageX, y: e.pageY };
          this.#autoSelectOnDragStart(node.id, e);
          this.#captureDragStartPositions();
          this.#bringToFront(node.id);
          this.#applyLift(el);
          this.#editor.emit('nodepicked', node);
        },
        onTranslate: (x, y) => {
          this.#handleGroupTranslate(node.id, el, x, y);
        },
        onDrop: (e) => {
          this.#handleDrop(node.id, el, e, dragStart);
          dragStart = null;
        },
      }
    );
    el._drag = drag;
    
    return el;
  }

  /**
   * Applies SVG shaping or subgraph previews after the element is in the live DOM.
   * @private
   * @param {import('../core/Node.js').Node} node
   * @param {HTMLElement} el
   */
  #postProcessNodeView(node, el) {
    // Apply shape visuals: SVG background layer instead of clip-path
    // Clip-path clips content (labels, ports). SVG bg preserves them.
    let shape = getShape(node.shape);
    if (shape && shape.pathData) {
      // Set explicit element dimensions to match SVG viewBox aspect ratio
      // This ensures correct proportions and reliable offsetWidth/Height
      let vb = shape.viewBox.split(' ').map(Number);
      let vbW = vb[2];
      let vbH = vb[3];
      let baseSize = 120; // base dimension
      let aspect = vbW / vbH;
      let nodeW = aspect >= 1 ? baseSize : Math.round(baseSize * aspect);
      let nodeH = aspect >= 1 ? Math.round(baseSize / aspect) : baseSize;
      el.style.width = nodeW + 'px';
      el.style.height = nodeH + 'px';
      el.style.minWidth = nodeW + 'px';
      el.style.minHeight = nodeH + 'px';
    }

    requestAnimationFrame(() => {
      if (shape && shape.pathData) {
        let size = { width: el.offsetWidth, height: el.offsetHeight };

        // 1. Inject SVG background — element is properly proportioned
        let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', shape.viewBox);
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;overflow:visible;';
        let path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', shape.pathData);
        path.setAttribute('fill', `var(--sn-shape-${shape.name}-fill, var(--sn-shape-fill, var(--sn-node-bg, #16213e)))`);
        path.setAttribute('stroke', `var(--sn-shape-${shape.name}-stroke, var(--sn-shape-stroke, var(--sn-node-border, #2a2a4a)))`);
        path.setAttribute('stroke-width', 'var(--sn-shape-stroke-width, 0.4)');
        path.setAttribute('stroke-linejoin', 'round');
        svg.appendChild(path);
        el.prepend(svg);
        el.setAttribute('data-svg-shape', shape.name);

        // Make node background transparent — SVG provides the shape
        el.style.background = 'transparent';
        el.style.border = 'none';
        el.style.boxShadow = 'none';
        el.style.borderRadius = '0';
        el.style.overflow = 'visible';

        // Elevate content above SVG layer
        for (const child of el.children) {
          if (child !== svg) child.style.position = 'relative';
        }

        // Watermark icon — large pale category icon centered inside shape
        let iconEl = el.querySelector('.sn-node-icon');
        if (iconEl) {
          let watermark = document.createElement('span');
          watermark.className = 'sn-shape-watermark material-symbols-outlined';
          watermark.textContent = iconEl.textContent;
          el.appendChild(watermark);
        }

        // Notify canvas to render free dots for this SVG node
        if (this.#onSvgShapeReady) this.#onSvgShapeReady(node.id);


      } else if (shape) {
        // Standard shapes: apply border-radius
        let size = { width: el.offsetWidth || 180, height: el.offsetHeight || 60 };
        let radius = shape.getBorderRadius(size);
        if (radius && radius !== 'var(--sn-node-radius, 10px)') {
          el.style.borderRadius = radius;
        }
      }
    });

    // Subgraph preview canvas — inject DOM element synchronously so
    // measureNodeSizes() includes the 80px canvas in offsetHeight.
    // Only the drawing is deferred to rAF (needs inner editor data).
    if (node._isSubgraph) {
      let body = el.querySelector('.sn-node-body');
      if (body) {
        let canvas = document.createElement('canvas');
        canvas.className = 'sn-subgraph-preview';
        canvas.width = 200;
        canvas.height = 80;
        body.appendChild(canvas);
        el._previewCanvas = canvas;
        requestAnimationFrame(() => {
          this.#initSubgraphPreview(el, node, canvas);
        });
      }
    }
  }

  /**
   * Remove a graph-node element
   * @param {import('../core/Node.js').Node} node
   */
  removeView(node) {
    let el = this.#nodeViews.get(node.id);
    if (!el) return;
    if (el._previewRaf) clearTimeout(el._previewRaf);
    el._previewRaf = null;
    if (el._drag) el._drag.destroy();
    animateOut(el);
    this.#nodeViews.delete(node.id);
    this.#selector.getSelectedNodes().delete(node.id);
  }

  /**
   * Remove a node view instantly (no animation) for virtualization demote.
   * Returns captured position/size for phantom conversion.
   * @param {string} nodeId
   * @returns {{ x: number, y: number, w: number, h: number } | null}
   */
  removeViewInstant(nodeId) {
    let el = this.#nodeViews.get(nodeId);
    if (!el) return null;
    let pos = el._position || { x: 0, y: 0 };
    let w = el._cachedW || el.offsetWidth || 180;
    let h = el._cachedH || el.offsetHeight || 60;
    if (el._previewRaf) clearTimeout(el._previewRaf);
    if (el._drag) el._drag.destroy();
    el.remove();
    this.#nodeViews.delete(nodeId);
    this.#selector.getSelectedNodes().delete(nodeId);
    return { x: pos.x, y: pos.y, w, h };
  }

  // --- Private helpers ---




  #autoSelectOnDragStart(nodeId, e) {
    if (!this.#selector.isNodeSelected(nodeId)) {
      let accumulate = e.ctrlKey || e.metaKey;
      this.#selector.selectNode(nodeId, accumulate);
    }
    this.#bringToFront(nodeId);
  }

  /**
   * Bring a node to front by setting highest z-index
   * @param {string} nodeId
   */
  #bringToFront(nodeId) {
    let el = this.#nodeViews.get(nodeId);
    if (el) {
      el.style.zIndex = ++this.#zCounter;
    }
  }

  /**
   * Apply lift effect: scale up + shadow + parallax offset
   * @param {HTMLElement} el
   */
  #applyLift(el) {
    el.classList.add('sn-node-lifted');
  }

  /**
   * Remove lift effect on drop
   * @param {HTMLElement} el
   */
  #removeLift(el) {
    el.classList.remove('sn-node-lifted');
  }

  #captureDragStartPositions() {
    let selected = this.#selector.getSelectedNodes();
    for (const id of selected) {
      let nodeEl = this.#nodeViews.get(id);
      if (nodeEl) nodeEl._dragStartPos = { ...nodeEl._position };
    }
  }

  #handleGroupTranslate(nodeId, el, x, y) {
    let finalX = x;
    let finalY = y;

    if (this.#snapEnabled && this.#snapGrid.isDynamic) {
      let snapped = this.#snapGrid.snap(x, y);
      finalX = snapped.x;
      finalY = snapped.y;
    }

    let prev = el._dragStartPos || el._position;
    let dx = finalX - prev.x;
    let dy = finalY - prev.y;

    let selected = this.#selector.getSelectedNodes();
    if (selected.size > 1 && selected.has(nodeId)) {
      for (const id of selected) {
        let nodeEl = this.#nodeViews.get(id);
        if (!nodeEl?._dragStartPos) continue;
        let nx = nodeEl._dragStartPos.x + dx;
        let ny = nodeEl._dragStartPos.y + dy;
        if (this.#snapEnabled && this.#snapGrid.isDynamic) {
          let snapped = this.#snapGrid.snap(nx, ny);
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
      let selected = this.#selector.getSelectedNodes();
      let targets = selected.size > 0 && selected.has(nodeId) ? selected : new Set([nodeId]);
      for (const id of targets) {
        let nodeEl = this.#nodeViews.get(id);
        if (!nodeEl) continue;
        let snapped = this.#snapGrid.snap(nodeEl._position.x, nodeEl._position.y);
        this.#animateNodeToPosition(id, snapped.x, snapped.y);
      }
    }

    // Clean up start positions
    for (const [, nodeEl] of this.#nodeViews) {
      delete nodeEl._dragStartPos;
    }

    // Remove lift effect
    this.#removeLift(el);

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
   * @param {HTMLCanvasElement} canvas - pre-created canvas element (already in DOM)
   */
  #initSubgraphPreview(el, node, canvas) {
    let ctx = canvas.getContext('2d');

    let drawPreview = () => {
      if (!el.isConnected) return;

      let w = canvas.width;
      let h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      let innerEditor = node.innerEditor;
      if (!innerEditor) return;

      let nodes = innerEditor.getNodes();
      if (nodes.length === 0) return;

      // Get positions (from saved or auto-grid)
      let positions = node.innerPositions;
      let nodeRects = [];

      for (const n of nodes) {
        let pos = positions[n.id];
        let x = pos ? pos.x : 0;
        let y = pos ? pos.y : 0;
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

      let pad = 30;
      minX -= pad; minY -= pad;
      maxX += pad; maxY += pad;

      let graphW = maxX - minX;
      let graphH = maxY - minY;
      let scale = Math.min(w / graphW, h / graphH);
      let offsetX = (w - graphW * scale) / 2;
      let offsetY = (h - graphH * scale) / 2;

      // Flow state map: nodeId -> 'processing' | 'completed'
      let states = el._innerFlowStates || {};

      // Draw connections as lines
      let conns = innerEditor.getConnections();
      for (const conn of conns) {
        let src = nodeRects.find(r => r.id === conn.from);
        let tgt = nodeRects.find(r => r.id === conn.to);
        if (src && tgt) {
          let sx = (src.x + src.w - minX) * scale + offsetX;
          let sy = (src.y + src.h / 2 - minY) * scale + offsetY;
          let tx = (tgt.x - minX) * scale + offsetX;
          let ty = (tgt.y + tgt.h / 2 - minY) * scale + offsetY;

          // Flowing connection: source completed
          let srcState = states[conn.from];
          if (srcState === 'completed') {
            ctx.strokeStyle = 'rgba(92, 216, 122, 0.5)';
            ctx.lineWidth = 2;
          } else {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
            ctx.lineWidth = 1;
          }

          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(tx, ty);
          ctx.stroke();
        }
      }

      // Draw node rectangles with flow state
      for (const r of nodeRects) {
        let rx = (r.x - minX) * scale + offsetX;
        let ry = (r.y - minY) * scale + offsetY;
        let rw = r.w * scale;
        let rh = r.h * scale;
        let state = states[r.id];
        let radius = 4;

        // Rounded rect helper
        ctx.beginPath();
        ctx.moveTo(rx + radius, ry);
        ctx.lineTo(rx + rw - radius, ry);
        ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
        ctx.lineTo(rx + rw, ry + rh - radius);
        ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
        ctx.lineTo(rx + radius, ry + rh);
        ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
        ctx.lineTo(rx, ry + radius);
        ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
        ctx.closePath();

        if (state === 'processing') {
          ctx.fillStyle = 'rgba(74, 158, 255, 0.25)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(74, 158, 255, 0.8)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          // Glow effect
          ctx.shadowColor = 'rgba(74, 158, 255, 0.6)';
          ctx.shadowBlur = 8;
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else if (state === 'completed') {
          ctx.fillStyle = 'rgba(92, 216, 122, 0.2)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(92, 216, 122, 0.7)';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    };

    // Expose redraw for external triggering (FlowSimulator)
    el._redrawPreview = drawPreview;

    // Draw once. Re-draw on demand via el._redrawPreview().
    drawPreview();
  }
}
