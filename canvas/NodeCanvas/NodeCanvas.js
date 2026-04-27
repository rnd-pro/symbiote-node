/**
 * NodeCanvas — main graph viewport (facade)
 *
 * Thin orchestration layer that delegates to:
 *  - NodeViewManager (node CRUD + group drag)
 *  - ConnectionRenderer (SVG paths + gradients + flow)
 *  - PseudoConnection (temp drag line)
 *  - ViewportActions (context menu + keyboard + fitView)
 *
 * @module symbiote-node/canvas/NodeCanvas
 */

import Symbiote from '@symbiotejs/symbiote';
import { template } from './NodeCanvas.tpl.js';
import { styles } from './NodeCanvas.css.js';
import { Drag } from '../../interactions/Drag.js';
import { Zoom } from '../../interactions/Zoom.js';
import { ConnectFlow } from '../../interactions/ConnectFlow.js';
import { Selector } from '../../interactions/Selector.js';
import { SnapGrid } from '../../interactions/SnapGrid.js';
import { applyTheme, DARK_DEFAULT } from '../../themes/Theme.js';
import { applyPalette } from '../../themes/Palette.js';
import { applySkin } from '../../themes/Skin.js';
import { NodeViewManager } from '../NodeViewManager.js';
import { FrameManager } from '../FrameManager.js';
import { SelectionSync } from '../SelectionSync.js';
import { CanvasViewport } from '../CanvasViewport.js';
import { ConnectionRenderer } from '../ConnectionRenderer.js';
import { CanvasConnectionRenderer } from '../CanvasConnectionRenderer.js';
import { PseudoConnection } from '../PseudoConnection.js';
import { ViewportActions } from '../ViewportActions.js';
import { SubgraphManager } from '../SubgraphManager.js';
import '../../menu/ContextMenu/ContextMenu.js';
import '../../toolbar/QuickToolbar/QuickToolbar.js';
import '../../node/GraphFrame/GraphFrame.js';
import '../../inspector/InspectorPanel/InspectorPanel.js';
import '../Minimap/Minimap.js';
import '../NodeSearch/NodeSearch.js';
import '../Breadcrumb/Breadcrumb.js';
import { computeAutoLayout } from '../AutoLayout.js';

export class NodeCanvas extends Symbiote {

  init$ = {
    zoom: 1,
    panX: 0,
    panY: 0,
    '+contentTransform': () => `translate(${this.$.panX}px, ${this.$.panY}px) scale(${this.$.zoom})`,
  };

  /** @type {import('../core/Editor.js').NodeEditor|null} */
  #editor = null;

  /** @type {Drag|null} */
  #drag = null;

  /** @type {Zoom|null} */
  #zoom = null;

  /** @type {ConnectFlow|null} */
  #connectFlow = null;

  /** @type {SelectionSync} */
  #selectionSync = new SelectionSync({
    canvas: this,
    getEditor: () => this.#editor,
    nodeViews: this.#nodeViews,
    getConnRenderer: () => this.#connRenderer,
  });

  /** @type {Selector} */
  #selector = new Selector({
    onChange: (nodes, connections) => this.#selectionSync.sync(nodes, connections),
  });

  /** @type {SnapGrid} */
  #snapGrid = new SnapGrid({ size: 16, dynamic: false });

  /** @type {Map<string, HTMLElement>} */
  #nodeViews = new Map();

  /** @type {FrameManager|null} */
  #frameManager = null;

  /** @type {boolean} */
  #readonly = false;

  /** @type {boolean} */
  #snapEnabled = false;

  /** @type {number|null} */
  #panAnimFrame = null;

  /** @type {string} */
  #themeName = 'dark-default';

  /** @type {NodeViewManager|null} */
  #viewManager = null;

  /** @type {ConnectionRenderer|null} */
  #connRenderer = null;

  /** @type {PseudoConnection|null} */
  #pseudo = null;

  /** @type {ViewportActions|null} */
  #actions = null;

  /** @type {'bezier'|'orthogonal'|'straight'|'pcb'} saved across setEditor calls */
  #pathStyle = 'bezier';

  /** @type {CanvasViewport|null} */
  #viewport = null;

  // --- Public API ---

  /**
   * Clear all existing node, connection, and frame views from the DOM.
   * Called before switching to a new editor to ensure clean state.
   */
  #clearViews() {
    // Remove all node views and their preview timers
    for (const [id, el] of this.#nodeViews) {
      if (el._previewRaf) { clearTimeout(el._previewRaf); el._previewRaf = null; }
      if (el._drag) el._drag.destroy();
      el._redrawPreview = null;
      el.remove();
    }
    this.#nodeViews.clear();
    if (this.#viewport) this.#viewport.clear();

    // Unsubscribe from previous editor events to prevent leaks
    if (this.#editor) {
      this.#editor.removeAllListeners?.();
    }

    // Remove all connection SVG paths
    if (this.#connRenderer) {
      let conns = [...this.#connRenderer.data.values()];
      for (const conn of conns) {
        this.#connRenderer.remove(conn);
      }
    }

    // Remove all frame views
    if (this.#frameManager) {
      this.#frameManager.clear();
    }

    // Clear selection state
    if (this.#selector) this.#selector.unselectAll();
  }

  /**
   * Bind editor to canvas
   * @param {import('../core/Editor.js').NodeEditor} editor
   */
  setEditor(editor) {
    // Clear previous views before switching
    this.#clearViews();

    this.#editor = editor;

    let engineMode = this.getAttribute('connection-engine') || 'svg';

    if (engineMode === 'canvas') {
      this.#connRenderer = new CanvasConnectionRenderer({
        canvasLayer: this.ref.connCanvas,
        dotLayer: this.ref.pseudoSvg,
        nodeViews: this.#nodeViews,
        editor,
        onConnectionClick: (connId, e) => this.#handleConnectionClick(connId, e),
        getZoom: () => this.$.zoom,
        getPan: () => ({ x: this.$.panX, y: this.$.panY }),
        onDotDrag: (socketData) => {
          if (this.#connectFlow && !this.#readonly) {
            this.#connectFlow.pickSocket(socketData);
          }
        },
      });
    } else {
      this.#connRenderer = new ConnectionRenderer({
        svgLayer: this.ref.connections,
        dotLayer: this.ref.pseudoSvg,
        nodeViews: this.#nodeViews,
        editor,
        onConnectionClick: (connId, e) => this.#handleConnectionClick(connId, e),
        getZoom: () => this.$.zoom,
        onDotDrag: (socketData) => {
          if (this.#connectFlow && !this.#readonly) {
            this.#connectFlow.pickSocket(socketData);
          }
        },
      });
    }
  
    // For test automation
    this._connRenderer = this.#connRenderer;

    // Re-apply saved pathStyle after creating new renderer
    if (this.#pathStyle !== 'bezier') {
      this.#connRenderer.setPathStyle(this.#pathStyle);
    }

    this.#pseudo = new PseudoConnection(this.ref.pseudoSvg);

    this.#actions = new ViewportActions({
      editor,
      selector: this.#selector,
      nodeViews: this.#nodeViews,
      canvas: this,
    });

    // Quick Action Toolbar
    let toolbar = this.ref.quickToolbar;
    if (toolbar) {
      let actionMap = {
        delete: (nodeId) => { this.#actions.deleteNode(nodeId); toolbar.hide(); },
        duplicate: (nodeId) => { this.#actions.cloneNode(nodeId); },
        enter: (nodeId) => { this.drillDown(nodeId); toolbar.hide(); },
        mute: (nodeId) => {
          this.#actions.muteNode(nodeId);
          let nodeEl = this.#nodeViews.get(nodeId);
          if (nodeEl) toolbar.show(nodeId, nodeEl);
        },
      };
      toolbar._onAction = (action, nodeId) => {
        let handler = actionMap[action];
        if (handler) {
          handler(nodeId);
        } else {
          // Custom actions — dispatch event for consumer (e.g. dep-graph explore)
          this.dispatchEvent(new CustomEvent('toolbar-action', {
            detail: { action, nodeId },
            bubbles: true,
          }));
          toolbar.hide();
        }
      };
    }

    this.#viewManager = new NodeViewManager({
      nodeViews: this.#nodeViews,
      editor,
      selector: this.#selector,
      snapGrid: this.#snapGrid,
      getZoom: () => this.$.zoom,
      setNodePosition: (id, x, y) => this.setNodePosition(id, x, y),
      animateNodeToPosition: (id, x, y) => this.animateNodeToPosition(id, x, y),
      onNodeClick: (id, e) => this.#handleNodeClick(id, e),
      nodesLayer: this.ref.nodesLayer,
      canvas: this,
      onSvgShapeReady: (nodeId) => this.#connRenderer?.renderFreeDots(nodeId),
    });

    this.#frameManager = new FrameManager({
      nodeViews: this.#nodeViews,
      editor,
      canvas: this,
      setNodePosition: (id, x, y) => this.setNodePosition(id, x, y),
    });

    this.#viewport = new CanvasViewport({
      canvas: this,
      nodeViews: this.#nodeViews,
      viewManager: this.#viewManager,
      getConnRenderer: () => this.#connRenderer,
    });

    // ConnectFlow
    this.#connectFlow = new ConnectFlow(editor, {
      getNodePosition: (id) => {
        let el = this.#nodeViews.get(id);
        return el?._position || { x: 0, y: 0 };
      },
      getNodeSize: (id) => {
        let el = this.#nodeViews.get(id);
        return { width: el?.offsetWidth || 180, height: el?.offsetHeight || 60 };
      },
      getTransform: () => ({
        k: this.$.zoom,
        x: this.$.panX,
        y: this.$.panY,
        rect: this.ref.canvasContainer.getBoundingClientRect(),
      }),
      onPseudoStart: (sx, sy, socketData) => {
        this.#actions.highlightCompatibleSockets(socketData, this.ref.nodesLayer);
      },
      onPseudoMove: (sx, sy, ex, ey) => {
        this.#pseudo.show(sx, sy, ex, ey);
      },
      onPseudoEnd: () => {
        this.#pseudo.hide();
        this.#actions.clearSocketHighlights(this.ref.nodesLayer);
        this.#actions.clearPortHints();
        this.#connRenderer?.clearDotHighlights();
      },
      onCompatibleMove: (worldX, worldY, socketData) => {
        // Highlight compatible SVG dots (no port teleportation)
        let compatibleIds = this.#actions.getCompatibleNodeIds(socketData);
        this.#connRenderer?.highlightDotsForNodes(compatibleIds);
      },

      onDropEmpty: (x, y, socketData) => {
        this.#actions.handleDropEmpty(x, y, socketData);
        // Show context menu at drop position
        let container = this.ref.canvasContainer;
        let rect = container.getBoundingClientRect();
        let menuX = x * this.$.zoom + this.$.panX;
        let menuY = y * this.$.zoom + this.$.panY;
        this.ref.contextMenu?.show(menuX, menuY, [
          { label: 'Add Node', icon: 'add_box', action: () => this.#editor?.emit('contextadd', { x, y }) },
        ]);
      },
      findNearestDot: (wx, wy) => this.#connRenderer?.findNearestDot(wx, wy),
    });

    // Subscribe to editor events
    editor.on('nodecreated', (node) => this.#viewport.handleNodeCreated(node));
    editor.on('noderemoved', (node) => {
      this.#viewManager.removeView(node);
      // Remove connections touching this node
      for (const [, conn] of this.#connRenderer.data) {
        if (conn.from === node.id || conn.to === node.id) {
          this.#connRenderer.remove(conn);
        }
      }
    });
    editor.on('connectioncreated', (conn) => this.#connRenderer.add(conn));
    editor.on('connectionremoved', (conn) => {
      this.#connRenderer.remove(conn);
      this.#selector.getSelectedConnections().delete(conn.id);
    });

    // Re-render connections after node layout changes (collapse/mute)
    let refreshNodeConnections = ({ nodeId }) => {
      requestAnimationFrame(() => this.#connRenderer?.updateForNode(nodeId));
    };
    editor.on('nodecollapse', refreshNodeConnections);
    editor.on('nodemute', refreshNodeConnections);

    // ─── Virtualized initialization ───
    this.#viewport.initializeData(editor);

    // Batch renderer operations to prevent multiple redundant redraws
    this.#connRenderer.setBatchMode(true);
    this.#connRenderer.addBatch(allConns);
    this.#viewport.syncPhantom();
    this.#connRenderer.setBatchMode(false);

    // Subscribe to frame events
    editor.on('framecreated', (frame) => this.#frameManager.addView(frame));
    editor.on('frameremoved', (frame) => this.#frameManager.removeView(frame));

    // Align tools emit nodemovetopos
    editor.on('nodemovetopos', ({ nodeId, x, y }) => {
      this.setNodePosition(nodeId, x, y);
    });

    // Render existing frames
    for (const frame of editor.getFrames()) {
      this.#frameManager.addView(frame);
    }

    // Initialize subgraph navigation (skip during drill-down/drillUp)
    if (!this.#navigating) {
      this.#subgraphManager.initialize(this, editor);
      let breadcrumb = this.ref.breadcrumb;
      if (breadcrumb) {
        this.#subgraphManager.onNavigate((path) => {
          breadcrumb.setPath(path);
        });
        breadcrumb.onNavigate((level) => {
          this.drillUp(level);
        });
      }
    }
  }

  /** @returns {ConnectFlow|null} */
  getConnectFlow() { return this.#connectFlow; }

  /**
   * Enable/disable snap to grid
   * @param {boolean} enabled
   * @param {number} [size]
   */
  setSnapGrid(enabled, size) {
    this.#snapEnabled = enabled;
    if (size) this.#snapGrid.setSize(size);
    this.#viewManager?.setSnapEnabled(enabled);
  }

  /**
   * Enable/disable readonly mode
   * @param {boolean} enabled
   */
  setReadonly(enabled) {
    this.#readonly = enabled;
    if (enabled) {
      this.setAttribute('data-readonly', '');
    } else {
      this.removeAttribute('data-readonly');
    }
    this.#viewManager?.setReadonly(enabled);
    this.#actions?.setReadonly(enabled);
  }

  /**
   * Enable/disable compact mode (hides node body: ports & controls).
   * Use this for schematic/PCB views where nodes show only labels.
   * This is a structural setting — independent of visual theme.
   * @param {boolean} enabled
   */
  setCompactMode(enabled) {
    if (enabled) {
      this.setAttribute('data-compact', '');
    } else {
      this.removeAttribute('data-compact');
    }
  }

  /**
   * Apply a theme to the canvas
   * @param {import('../themes/Theme.js').ThemeDefinition} theme
   */
  setTheme(theme) {
    applyTheme(this, theme);
    this.#themeName = theme.name;
  }

  /**
   * Apply only color palette
   * @param {import('../themes/Palette.js').PaletteDefinition} palette
   */
  setPalette(palette) { applyPalette(this, palette); }

  /**
   * Apply only geometry skin
   * @param {import('../themes/Skin.js').SkinDefinition} skin
   */
  setSkin(skin) { applySkin(this, skin); }

  /** @returns {string} */
  getThemeName() { return this.#themeName; }

  /**
   * Set data flow animation on a connection
   * @param {string} connId
   * @param {boolean} active
   */
  setFlowing(connId, active) { this.#connRenderer?.setFlowing(connId, active); }

  /**
   * Set data flow animation on all connections
   * @param {boolean} active
   */
  setAllFlowing(active) { this.#connRenderer?.setAllFlowing(active); }

  /**
   * Set connection path style (persists across setEditor/drill-down)
   * @param {'bezier'|'orthogonal'|'straight'|'pcb'} style
   */
  setPathStyle(style) {
    this.#pathStyle = style;
    this.#connRenderer?.setPathStyle(style);
  }

  /** @returns {'bezier'|'orthogonal'|'straight'|'pcb'} */
  getPathStyle() { return this.#pathStyle; }

  /**
   * Programmatically select a node by ID
   * @param {string} nodeId
   */
  selectNode(nodeId) {
    this.#selector?.selectNode(nodeId);
  }

  /**
   * Clear all connector caches and re-render.
   * Call after initial node positioning to settle SVG connectors.
   */
  refreshConnections() { this.#connRenderer?.refreshAll(); }

  /**
   * Set error state on a node with frame-style error display
   * @param {string} nodeId
   * @param {string} message - Error message to display
   */
  setNodeError(nodeId, message) {
    let el = this.#nodeViews.get(nodeId);
    if (!el) return;

    // Remove existing error frame if any
    this.clearNodeError(nodeId);

    el.setAttribute('data-error', '');

    // Build error frame DOM
    let frame = document.createElement('div');
    frame.className = 'error-frame';

    let header = document.createElement('div');
    header.className = 'error-frame-header';
    let icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.textContent = 'error';
    header.append(icon, ' Error');

    let body = document.createElement('div');
    body.className = 'error-frame-body';
    body.textContent = message;

    frame.append(header, body);
    el.append(frame);
  }

  /**
   * Clear error state from a node
   * @param {string} nodeId
   */
  clearNodeError(nodeId) {
    let el = this.#nodeViews.get(nodeId);
    if (!el) return;
    el.removeAttribute('data-error');
    let frame = el.querySelector('.error-frame');
    if (frame) frame.remove();
  }

  /**
   * Clear all error states
   */
  clearAllErrors() {
    for (const [id] of this.#nodeViews) {
      this.clearNodeError(id);
    }
  }

  /**
   * Apply auto layout to all nodes
   */
  autoLayout() {
    if (!this.#editor) return;
    let positions = computeAutoLayout(this.#editor);
    for (const [nodeId, pos] of Object.entries(positions)) {
      this.setNodePosition(nodeId, pos.x, pos.y);
    }
  }

  /**
   * Fit all nodes into the viewport.
   * Calculates required zoom/pan based on current node layout,
   * accounting for the inspector panel if open.
   */
  fitView() {
    this.#viewport?.fitView();
  }

  /**
   * Focus viewport on a specific node by ID.
   * Deducts inspector panel width from visibility calculation.
   * @param {string} nodeId - Target node ID
   * @param {Object} [opts]
   * @param {number} [opts.zoom=0.8] - Target zoom level
   * @returns {boolean}
   */
  flyToNode(nodeId, opts) {
    return this.#viewport?.flyToNode(nodeId, opts) || false;
  }


  /**
   * Measure actual DOM sizes of all rendered nodes.
   * Returns a plain object { [nodeId]: { w, h } } suitable for AutoLayout's nodeSizes option.
   * Call after nodes are rendered to DOM (after setEditor + requestAnimationFrame).
   * @returns {Object<string, { w: number, h: number }>}
   */
  measureNodeSizes() {
    let sizes = {};
    for (const [nodeId, el] of this.#nodeViews) {
      if (el && el.offsetWidth > 0) {
        sizes[nodeId] = { w: el.offsetWidth, h: el.offsetHeight };
      }
    }
    return sizes;
  }

  /**
   * Set preview content on a node (image URL or text)
   * @param {string} nodeId
   * @param {string} content - Image URL or text
   * @param {'image'|'text'} [type='text']
   */
  setPreview(nodeId, content, type = 'text') {
    let el = this.#nodeViews.get(nodeId);
    if (!el) return;
    let preview = el.ref?.previewArea;
    if (!preview) return;

    preview.hidden = false;
    preview.replaceChildren();
    if (type === 'image') {
      let img = document.createElement('img');
      img.src = content;
      img.alt = 'Preview';
      preview.appendChild(img);
    } else {
      let div = document.createElement('div');
      div.className = 'sn-preview-text';
      div.textContent = content;
      preview.appendChild(div);
    }
  }

  /**
   * Clear preview from a node
   * @param {string} nodeId
   */
  clearPreview(nodeId) {
    let el = this.#nodeViews.get(nodeId);
    if (!el) return;
    let preview = el.ref?.previewArea;
    if (!preview) return;
    preview.hidden = true;
    preview.replaceChildren();
  }

  /**
   * Get node view element by ID (used by FlowSimulator)
   * @param {string} nodeId
   * @returns {HTMLElement|undefined}
   */
  _getNodeView(nodeId) { return this.#nodeViews.get(nodeId); }

  /** Alias for SubgraphManager */
  getNodeView(nodeId) { return this.#nodeViews.get(nodeId); }

  /**
   * Highlight nodes sequentially based on execution trace.
   * Each node pulses green in order, then fades.
   * Uses inline styles to guarantee visibility regardless of CSS cache.
   *
   * @param {Array<{nodeId: string}>} trace - Execution trace from Fire/Run
   * @param {number} [stepDelay=300] - Delay between node highlights (ms)
   */
  highlightTrace(trace, stepDelay = 300) {
    if (!trace || !trace.length) return;

    // Inject keyframe animation once
    if (!document.getElementById('sn-fire-keyframes')) {
      let style = document.createElement('style');
      style.id = 'sn-fire-keyframes';
      style.textContent = `
        @keyframes sn-fire-pulse {
          0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7); }
          50% { box-shadow: 0 0 20px 6px rgba(76, 175, 80, 0.5); }
          100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
        }
      `;
      document.head.appendChild(style);
    }

    // Clear any previous fire states
    for (const [, el] of this.#nodeViews) {
      el.removeAttribute('data-fire-state');
      el.style.opacity = '';
      el.style.borderColor = '';
      el.style.animation = '';
      el.style.zIndex = '';
      el.style.transition = '';
    }

    // Set all traced nodes to pending (dimmed)
    for (const step of trace) {
      let el = this.#nodeViews.get(step.nodeId);
      if (el) {
        el.style.opacity = '0.4';
        el.style.transition = 'opacity 0.15s';
      }
    }

    // Sequentially activate each node
    trace.forEach((step, i) => {
      setTimeout(() => {
        let el = this.#nodeViews.get(step.nodeId);
        if (!el) return;

        // Active: green pulse
        el.style.opacity = '1';
        el.style.borderColor = '#4caf50';
        el.style.animation = 'sn-fire-pulse 0.6s ease-out';
        el.style.zIndex = '50';

        // Done: fade border
        setTimeout(() => {
          el.style.animation = '';
          el.style.borderColor = 'rgba(76, 175, 80, 0.4)';
          el.style.transition = 'border-color 2s ease-out';
        }, 600);
      }, i * stepDelay);
    });

    // Clear all states after animation completes
    let totalDuration = trace.length * stepDelay + 3500;
    setTimeout(() => {
      for (const [, el] of this.#nodeViews) {
        el.style.opacity = '';
        el.style.borderColor = '';
        el.style.animation = '';
        el.style.zIndex = '';
        el.style.transition = '';
      }
    }, totalDuration);
  }

  // --- Subgraph Navigation ---

  /** @type {SubgraphManager} */
  #subgraphManager = new SubgraphManager();

  /** @type {boolean} - guard to prevent setEditor re-init during navigation */
  #navigating = false;

  /**
   * Drill down into a subgraph node
   * @param {string} nodeId - SubgraphNode ID
   */
  drillDown(nodeId) {
    if (!this.#editor) return;
    let node = this.#editor.getNode(nodeId);
    if (!node?._isSubgraph) return;
    this.#navigating = true;
    this.#subgraphManager.drillDown(node);
    this.#navigating = false;
    this.dispatchEvent(new CustomEvent('subgraph-enter', {
      detail: { node, nodeId },
      bubbles: true,
    }));
  }

  /**
   * Navigate up to a breadcrumb level
   * @param {number} level - 0 = root
   */
  drillUp(level) {
    this.#navigating = true;
    this.#subgraphManager.drillUp(level);
    this.#navigating = false;
    this.dispatchEvent(new CustomEvent('subgraph-exit', {
      detail: { level },
      bubbles: true,
    }));
  }

  /**
   * Get current subgraph depth (0 = root)
   * @returns {number}
   */
  getSubgraphDepth() {
    return this.#subgraphManager.depth;
  }

  /**
   * Get subgraph breadcrumb path
   * @returns {Array<{ label: string, level: number }>}
   */
  getSubgraphPath() {
    return this.#subgraphManager.getPath();
  }

  /**
   * Enable/disable batch positioning mode.
   * When true, setNodePosition skips connection updates.
   * Call refreshConnections() after batch is done.
   * @param {boolean} active
   */
  setBatchMode(active) {
    this._batchMode = !!active;
    if (!this._batchMode && !this._cullingScheduled) {
      this._cullingScheduled = true;
      requestAnimationFrame(() => {
        this._cullingScheduled = false;
        this.#applyCullingAndLOD();
      });
    }
  }

  /**
   * Set node position
   * @param {string} nodeId
   * @param {number} x
   * @param {number} y
   */
  setNodePosition(nodeId, x, y) {
    let el = this.#nodeViews.get(nodeId);
    if (!el) {
      this.#viewport?.updatePhantomPosition(nodeId, x, y);
      return;
    }
    el.style.transform = `translate(${x}px, ${y}px)`;
    el._position = { x, y };

    // Skip connection updates during batch positioning
    if (this._batchMode) return;

    this.#connRenderer?.updateForNode(nodeId);
    // Render or refresh free dots for SVG nodes
    if (el.hasAttribute('data-svg-shape')) {
      this.#connRenderer?.refreshFreeDots(nodeId);
    }

    // Keep toolbar in sync during drag
    let toolbar = this.ref.quickToolbar;
    if (toolbar && toolbar._nodeId === nodeId) {
      toolbar.updatePosition(el);
    }
  }

  /**
   * Animate node to position with wires synced via RAF
   * @param {string} nodeId
   * @param {number} targetX
   * @param {number} targetY
   * @param {number} [duration=200] - Animation duration in ms
   */
  animateNodeToPosition(nodeId, targetX, targetY, duration = 200) {
    let el = this.#nodeViews.get(nodeId);
    if (!el) return;

    let startX = el._position.x;
    let startY = el._position.y;
    let dx = targetX - startX;
    let dy = targetY - startY;

    // Skip animation if position hasn't changed
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

    let startTime = performance.now();

    let animate = (now) => {
      let t = Math.min((now - startTime) / duration, 1);
      // Ease-out cubic
      let ease = 1 - (1 - t) ** 3;
      let x = startX + dx * ease;
      let y = startY + dy * ease;

      el.style.transform = `translate(${x}px, ${y}px)`;
      el._position = { x, y };
      this.#connRenderer?.updateForNode(nodeId);
      this.#connRenderer?.refreshFreeDots(nodeId);

      let toolbar = this.ref.quickToolbar;
      if (toolbar && toolbar._nodeId === nodeId) {
        toolbar.updatePosition(el);
      }

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        // Ensure final position is exact
        el._position = { x: targetX, y: targetY };
        el.style.transform = `translate(${targetX}px, ${targetY}px)`;
        this.#connRenderer?.updateForNode(nodeId);
        this.#connRenderer?.refreshFreeDots(nodeId);
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Get all node positions — includes both DOM nodes and phantom (virtualized) nodes.
   * SubgraphRouter relies on this to decide whether a node is on the current canvas layer;
   * phantom nodes DO have layout positions but no DOM element, so they must be included here.
   * @returns {Object<string, number[]>}
   */
  getPositions() {
    return this.#viewport?.getPositions() || {};
  }

  /**
   * Check whether a node exists on the current canvas layer (DOM or phantom).
   * SubgraphRouter uses this to avoid spurious drillDown when layout is still in progress.
   * @param {string} nodeId
   * @returns {boolean}
   */
  hasNode(nodeId) {
    return this.#viewport?.hasNode(nodeId) || false;
  }

  // --- Frame API ---

  /**
   * Add a frame to the canvas
   * @param {import('../core/Frame.js').Frame} frame
   */
  addFrame(frame) {
    this.#editor?.addFrame(frame);
  }

  /**
   * Set frame position
   * @param {string} frameId
   * @param {number} x
   * @param {number} y
   */
  setFramePosition(frameId, x, y) {
    this.#frameManager?.setPosition(frameId, x, y);
  }

  /**
   * Set frame size
   * @param {string} frameId
   * @param {number} w
   * @param {number} h
   */
  setFrameSize(frameId, w, h) {
    this.#frameManager?.setSize(frameId, w, h);
  }

  // --- Selection ---

  /** @type {number} */
  #lastClickTime = 0;
  /** @type {string|null} */
  #lastClickNodeId = null;

  #handleNodeClick(nodeId, e) {
    let accumulate = e.ctrlKey || e.metaKey;
    this.#selector.selectNode(nodeId, accumulate);

    // Double-click detection for subgraph drill-down
    let now = Date.now();
    if (this.#lastClickNodeId === nodeId && now - this.#lastClickTime < 400) {
      this.drillDown(nodeId);
      this.#lastClickTime = 0;
      this.#lastClickNodeId = null;
    } else {
      this.#lastClickTime = now;
      this.#lastClickNodeId = nodeId;
    }
  }



  #handleConnectionClick(connId, e) {
    let accumulate = e.ctrlKey || e.metaKey;
    this.#selector.selectConnection(connId, accumulate);
  }

  // --- Transform ---

  #updateTransform() {
    this.#viewport?.updateTransform();
  }

  /** Public: force sync phantom data to renderer (for use after batch setNodePosition) */
  syncPhantom() {
    this.#viewport?.syncPhantom();
  }

  // --- Lifecycle ---

  renderCallback() {
    let container = this.ref.canvasContainer;
    let content = this.ref.content;

    // Canvas pan
    this.#drag = new Drag();
    this.#drag.initialize(
      container,
      {
        getPosition: () => ({ x: this.$.panX, y: this.$.panY }),
        getZoom: () => 1,
      },
      {
        onStart: (e) => {
          // Track start position — only unselect on click (not drag)
          this._panStart = e ? { x: e.pageX, y: e.pageY, target: e.target } : null;
        },
        onTranslate: (x, y) => {
          if (this.#zoom?.isTranslating()) return;
          if (this.#connectFlow?.isPicking()) return;
          this.$.panX = x;
          this.$.panY = y;
          this.#updateTransform();
          this.dispatchEvent(new CustomEvent('manualviewport'));

          // Suppress CSS :hover on paths during active pan
          if (!this.hasAttribute('data-interacting')) {
            this.setAttribute('data-interacting', '');
          }
        },
        onDrop: (e) => {
          // Unselect only on click (minimal movement), not after panning
          if (this._panStart && e) {
            let dx = Math.abs(e.pageX - this._panStart.x);
            let dy = Math.abs(e.pageY - this._panStart.y);
            let t = this._panStart.target;
            let isNode = t?.closest?.('graph-node, quick-toolbar, context-menu, inspector-panel');
            if (dx < 5 && dy < 5 && !isNode) {
              this.#selector.unselectAll();
            }
          }
          this._panStart = null;
          this.removeAttribute('data-interacting');
        },
      }
    );

    // Zoom
    this.#zoom = new Zoom(0.1);
    let interactingTimer = null;
    this.#zoom.initialize(container, content, (delta, ox, oy) => {
      let k = this.$.zoom;
      let newK = k * (1 + delta);
      if (newK < 0.001 || newK > 5) return;
      this.$.zoom = newK;
      this.$.panX += ox;
      this.$.panY += oy;
      this.#updateTransform();
      this.dispatchEvent(new CustomEvent('manualviewport'));

      // Suppress CSS :hover on paths during active zoom
      if (!this.hasAttribute('data-interacting')) {
        this.setAttribute('data-interacting', '');
      }
      clearTimeout(interactingTimer);
      interactingTimer = setTimeout(() => {
        this.removeAttribute('data-interacting');
      }, 150);
    }, () => ({ x: this.$.panX, y: this.$.panY }));

    // Context menu + keyboard
    container.addEventListener('contextmenu', (e) => {
      this.#actions?.showContextMenu(e, this.ref.contextMenu, container, {
        panX: this.$.panX,
        panY: this.$.panY,
        zoom: this.$.zoom,
      });
    });
    container.addEventListener('keydown', (e) => this.#actions?.handleKeydown(e));

    // Ctrl+F to open node search
    container.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        this.ref.nodeSearch?.toggle();
      }
    });

    // Computed transform — auto-tracks panX, panY, zoom
    // --- Loop detector for contentTransform ---
    this.sub('+contentTransform', (val) => {
      if (this.ref.content) {
        this.ref.content.style.transform = val;
      }
      this.#connRenderer?.refreshAll();
    });

    this.#updateTransform();


    // Minimap — auto-show on viewport change, toggle button
    let minimap = this.ref.minimap;
    let minimapToggle = this.ref.minimapToggle;
    const MINIMAP_KEY = 'sn-minimap-enabled';
    let minimapEnabled = localStorage.getItem(MINIMAP_KEY) === 'true';
    let fadeTimer = null;
    const FADE_DELAY = 2000;

    let showMinimap = () => {
      if (!minimapEnabled || !minimap) return;
      minimap.hidden = false;
      minimap.removeAttribute('data-fading');
      minimap.update?.();
      clearTimeout(fadeTimer);
      fadeTimer = setTimeout(() => {
        minimap.setAttribute('data-fading', '');
        // After transition ends, hide completely
        setTimeout(() => {
          if (minimap.hasAttribute('data-fading')) {
            minimap.hidden = true;
            minimap.removeAttribute('data-fading');
          }
        }, 400);
      }, FADE_DELAY);
    };

    let updateToggleState = () => {
      if (minimapToggle) {
        minimapToggle.toggleAttribute('data-active', minimapEnabled);
      }
      if (!minimapEnabled && minimap) {
        minimap.hidden = true;
        minimap.removeAttribute('data-fading');
        clearTimeout(fadeTimer);
      }
    };

    updateToggleState();

    if (minimapToggle) {
      minimapToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        minimapEnabled = !minimapEnabled;
        localStorage.setItem(MINIMAP_KEY, minimapEnabled);
        updateToggleState();
        if (minimapEnabled) showMinimap();
      });
    }

    // Minimap only shown via toggle button (auto-show disabled)

    if (minimap) {
      minimap.setStateGetter(() => {
        let nodes = [];
        for (const [id, el] of this.#nodeViews) {
          let pos = el._position || { x: 0, y: 0 };
          if (!el._cachedW) {
            el._cachedW = el.offsetWidth || 180;
            el._cachedH = el.offsetHeight || 60;
          }
          nodes.push({
            x: pos.x,
            y: pos.y,
            width: el._cachedW,
            height: el._cachedH,
            bypassed: el.hasAttribute('data-bypassed'),
          });
        }
        return {
          nodes,
          transform: { x: this.$.panX, y: this.$.panY, zoom: this.$.zoom },
          containerSize: {
            width: container.clientWidth,
            height: container.clientHeight,
          },
        };
      });

      // Handle minimap viewport drag
      minimap.addEventListener('minimap-navigate', (e) => {
        this.$.panX = e.detail.x;
        this.$.panY = e.detail.y;
        this.#updateTransform();
      });
    }

    // Node search
    let nodeSearch = this.ref.nodeSearch;
    if (nodeSearch) {
      nodeSearch.configure({
        getNodes: () => {
          let result = [];
          if (this.#editor) {
            for (const node of this.#editor.getNodes()) {
              result.push({ id: node.id, label: node.label, type: node.type, category: node.category });
            }
          }
          return result;
        },
        onSelect: (nodeId) => {
          // Select node
          this.#selector.selectNode(nodeId);
          // Center viewport on node
          let el = this.#nodeViews.get(nodeId);
          if (el?._position) {
            let cx = container.clientWidth / 2;
            let cy = container.clientHeight / 2;
            this.$.panX = -el._position.x * this.$.zoom + cx;
            this.$.panY = -el._position.y * this.$.zoom + cy;
            this.#updateTransform();
          }
        },
      });
    }
  }

  /**
   * Smoothly pan viewport to center on a node
   * @param {string} nodeId
   * @param {number} [duration=400] - Animation duration in ms
   */
  panToNode(nodeId, duration = 400) {
    this.#viewport?.panToNode(nodeId, duration);
  }

  destroyCallback() {
    if (this.#viewport) this.#viewport.clear();
    if (this.#drag) this.#drag.destroy();
    if (this.#zoom) this.#zoom.destroy();
    if (this.#connectFlow) this.#connectFlow.destroy();
    for (const [, el] of this.#nodeViews) {
      if (el._drag) el._drag.destroy();
    }
  }
}

NodeCanvas.template = template;
NodeCanvas.rootStyles = styles;
NodeCanvas.reg('node-canvas');
