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

  /** @type {Selector} */
  #selector = new Selector({
    onChange: (nodes, connections) => this.#onSelectionChanged(nodes, connections),
  });

  /** @type {SnapGrid} */
  #snapGrid = new SnapGrid({ size: 16, dynamic: false });

  /** @type {Map<string, HTMLElement>} */
  #nodeViews = new Map();

  /** @type {Map<string, HTMLElement>} */
  #frameViews = new Map();

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

  /** @type {number} */
  #zCounter = 0;

  /** @type {'bezier'|'orthogonal'|'straight'|'pcb'} saved across setEditor calls */
  #pathStyle = 'bezier';

  // ─── Virtualization (Canvas LOD) ───
  /** All node data objects from editor — the full set regardless of DOM state */
  #allNodes = new Map();
  /** Position + size cache for nodes without DOM (phantom rendering on Canvas) */
  #phantomData = new Map();
  /** Degree (connection count) per node — for dot sizing */
  #nodeDegrees = new Map();
  /** Debounce timer for promote/demote batch */
  #virtTimer = null;
  /** Dirty flag — phantom positions changed, needs re-sync to renderer */
  #phantomDirty = false;

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
    this.#allNodes.clear();
    this.#phantomData.clear();
    this.#nodeDegrees.clear();
    if (this.#virtTimer) { clearTimeout(this.#virtTimer); this.#virtTimer = null; }

    // Unsubscribe from previous editor events to prevent leaks
    if (this.#editor) {
      this.#editor.removeAllListeners?.();
    }

    // Remove all connection SVG paths
    if (this.#connRenderer) {
      const conns = [...this.#connRenderer.data.values()];
      for (const conn of conns) {
        this.#connRenderer.remove(conn);
      }
    }

    // Remove all frame views
    for (const [, el] of this.#frameViews) {
      if (el._drag) el._drag.destroy();
      if (el._resizeDrag) el._resizeDrag.destroy();
      el.remove();
    }
    this.#frameViews.clear();

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

    const engineMode = this.getAttribute('connection-engine') || 'svg';

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
    const toolbar = this.ref.quickToolbar;
    if (toolbar) {
      toolbar._onAction = (action, nodeId) => {
        const nodeEl = this.#nodeViews.get(nodeId);
        switch (action) {
          case 'delete': this.#actions.deleteNode(nodeId); toolbar.hide(); break;
          case 'duplicate': this.#actions.cloneNode(nodeId); break;
          case 'enter': this.drillDown(nodeId); toolbar.hide(); break;
          case 'collapse':
            this.#actions.collapseNode(nodeId);
            if (nodeEl) toolbar.show(nodeId, nodeEl);
            break;
          case 'mute':
            this.#actions.muteNode(nodeId);
            if (nodeEl) toolbar.show(nodeId, nodeEl);
            break;
          default:
            // Custom actions — dispatch event for consumer (e.g. dep-graph explore)
            this.dispatchEvent(new CustomEvent('toolbar-action', {
              detail: { action, nodeId },
              bubbles: true,
            }));
            toolbar.hide();
            break;
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

    // ConnectFlow
    this.#connectFlow = new ConnectFlow(editor, {
      getNodePosition: (id) => {
        const el = this.#nodeViews.get(id);
        return el?._position || { x: 0, y: 0 };
      },
      getNodeSize: (id) => {
        const el = this.#nodeViews.get(id);
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
        const compatibleIds = this.#actions.getCompatibleNodeIds(socketData);
        this.#connRenderer?.highlightDotsForNodes(compatibleIds);
      },

      onDropEmpty: (x, y, socketData) => {
        this.#actions.handleDropEmpty(x, y, socketData);
        // Show context menu at drop position
        const container = this.ref.canvasContainer;
        const rect = container.getBoundingClientRect();
        const menuX = x * this.$.zoom + this.$.panX;
        const menuY = y * this.$.zoom + this.$.panY;
        this.ref.contextMenu?.show(menuX, menuY, [
          { label: 'Add Node', icon: 'add_box', action: () => this.#editor?.emit('contextadd', { x, y }) },
        ]);
      },
      findNearestDot: (wx, wy) => this.#connRenderer?.findNearestDot(wx, wy),
    });

    // Subscribe to editor events
    editor.on('nodecreated', (node) => {
      this.#allNodes.set(node.id, node);
      // If virtualization is active (phantom data initialized), add as phantom; otherwise DOM
      if (this.#phantomData.size > 0) {
        this.#phantomData.set(node.id, {
          id: node.id, x: 0, y: 0, w: 180, h: 60,
          degree: 0, color: null, label: node.label || node.id,
        });
      } else {
        this.#viewManager.addView(node);
      }
    });
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
    const refreshNodeConnections = ({ nodeId }) => {
      requestAnimationFrame(() => this.#connRenderer?.updateForNode(nodeId));
    };
    editor.on('nodecollapse', refreshNodeConnections);
    editor.on('nodemute', refreshNodeConnections);

    // ─── Virtualized initialization ───
    // Store all nodes as data, compute degrees from connections
    this.#allNodes.clear();
    this.#phantomData.clear();
    this.#nodeDegrees.clear();

    for (const node of editor.getNodes()) {
      this.#allNodes.set(node.id, node);
      this.#nodeDegrees.set(node.id, 0);
    }

    const allConns = editor.getConnections();
    for (const conn of allConns) {
      this.#nodeDegrees.set(conn.from, (this.#nodeDegrees.get(conn.from) || 0) + 1);
      this.#nodeDegrees.set(conn.to, (this.#nodeDegrees.get(conn.to) || 0) + 1);
    }

    // Create DOM only for nodes that will be visible (or all if small graph)
    const VIRT_THRESHOLD = 200;
    if (this.#allNodes.size <= VIRT_THRESHOLD) {
      // Small graph — create all DOM nodes immediately
      this.#viewManager.addViews(editor.getNodes());
    } else {
      // Large graph — start all as phantom, promote visible ones after layout
      const defaultW = 180, defaultH = 60;
      for (const [id, node] of this.#allNodes) {
        this.#phantomData.set(id, {
          id, x: 0, y: 0, w: defaultW, h: defaultH,
          degree: this.#nodeDegrees.get(id) || 0,
          color: null,
          label: node.label || id,
        });
      }
    }

    // Batch renderer operations to prevent multiple redundant redraws
    this.#connRenderer.setBatchMode(true);
    this.#connRenderer.addBatch(allConns);
    this.#syncPhantomToRenderer();
    this.#connRenderer.setBatchMode(false);

    // Subscribe to frame events
    editor.on('framecreated', (frame) => this.#addFrameView(frame));
    editor.on('frameremoved', (frame) => this.#removeFrameView(frame));

    // Align tools emit nodemovetopos
    editor.on('nodemovetopos', ({ nodeId, x, y }) => {
      this.setNodePosition(nodeId, x, y);
    });

    // Render existing frames
    for (const frame of editor.getFrames()) {
      this.#addFrameView(frame);
    }

    // Initialize subgraph navigation (skip during drill-down/drillUp)
    if (!this.#navigating) {
      this.#subgraphManager.initialize(this, editor);
      const breadcrumb = this.ref.breadcrumb;
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
    const el = this.#nodeViews.get(nodeId);
    if (!el) return;

    // Remove existing error frame if any
    this.clearNodeError(nodeId);

    el.setAttribute('data-error', '');

    // Build error frame DOM
    const frame = document.createElement('div');
    frame.className = 'error-frame';

    const header = document.createElement('div');
    header.className = 'error-frame-header';
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.textContent = 'error';
    header.append(icon, ' Error');

    const body = document.createElement('div');
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
    const el = this.#nodeViews.get(nodeId);
    if (!el) return;
    el.removeAttribute('data-error');
    const frame = el.querySelector('.error-frame');
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
    const positions = computeAutoLayout(this.#editor);
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
    if (this.#nodeViews.size === 0 && this.#phantomData.size === 0) return;
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    // Include DOM nodes
    for (const [, el] of this.#nodeViews) {
      if (!el._position) continue;
      const x = el._position.x;
      const y = el._position.y;
      const w = el._cachedW || el.offsetWidth || 150;
      const h = el._cachedH || el.offsetHeight || 40;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x + w > maxX) maxX = x + w;
      if (y + h > maxY) maxY = y + h;
    }

    // Include phantom nodes (virtualized)
    for (const [, pd] of this.#phantomData) {
      if (pd.x < minX) minX = pd.x;
      if (pd.y < minY) minY = pd.y;
      if (pd.x + pd.w > maxX) maxX = pd.x + pd.w;
      if (pd.y + pd.h > maxY) maxY = pd.y + pd.h;
    }
    
    if (minX === Infinity) return;

    const graphW = maxX - minX;
    const graphH = maxY - minY;
    const canvasRect = this.ref.canvasContainer.getBoundingClientRect();
    
    let visibleWidth = canvasRect.width;
    const inspector = this.ref.inspector || this.querySelector('inspector-panel');
    if (inspector && !inspector.hasAttribute('hidden')) {
      visibleWidth -= inspector.offsetWidth || 280;
    }

    const scaleX = (visibleWidth - 80) / graphW;
    const scaleY = (canvasRect.height - 80) / graphH;
    const scale = Math.max(0.001, Math.min(scaleX, scaleY, 1.5));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    this.$.zoom = scale;
    this.$.panX = (visibleWidth / 2) - centerX * scale;
    this.$.panY = canvasRect.height / 2 - centerY * scale;
    this.#updateTransform();
  }

  /**
   * Focus viewport on a specific node by ID.
   * Deducts inspector panel width from visibility calculation.
   * @param {string} nodeId - Target node ID
   * @param {Object} [opts]
   * @param {number} [opts.zoom=0.8] - Target zoom level
   * @returns {boolean}
   */
  flyToNode(nodeId, { zoom = 0.8 } = {}) {
    let el = this.#nodeViews.get(nodeId);

    // If node is phantom (no DOM), promote it first
    if (!el && this.#phantomData.has(nodeId)) {
      this.#promoteNode(nodeId);
      el = this.#nodeViews.get(nodeId);
    }
    if (!el) return false;

    // If position not set yet, use phantom data
    const pos = el._position || (() => {
      const pd = this.#phantomData.get(nodeId);
      return pd ? { x: pd.x, y: pd.y } : { x: 0, y: 0 };
    })();

    const canvasRect = this.ref.canvasContainer.getBoundingClientRect();
    let visibleWidth = canvasRect.width;
    
    const inspector = this.ref.inspector || this.querySelector('inspector-panel');
    if (inspector && !inspector.hasAttribute('hidden') && inspector.offsetWidth > 20) {
        visibleWidth -= inspector.offsetWidth;
    }

    const elWidth = el._cachedW || el.offsetWidth || 150;
    const elHeight = el._cachedH || el.offsetHeight || 40;

    const nodeX = pos.x + (elWidth / 2);
    const nodeY = pos.y + (elHeight / 2);

    const newPanX = (visibleWidth / 2) - nodeX * zoom;
    const newPanY = canvasRect.height / 2 - nodeY * zoom;

    const dz = Math.abs(this.$.zoom - zoom);
    const dx = Math.abs(this.$.panX - newPanX);
    const dy = Math.abs(this.$.panY - newPanY);
    
    if (dz < 0.01 && dx < 2 && dy < 2) {
      this.selectNode(nodeId);
      if (!this._cullingScheduled) {
        this._cullingScheduled = true;
        requestAnimationFrame(() => {
          this._cullingScheduled = false;
          this.#applyCullingAndLOD();
        });
      }
      return true;
    }

    this.$.zoom = zoom;
    this.$.panX = newPanX;
    this.$.panY = newPanY;

    this.selectNode(nodeId);
    return true;
  }


  /**
   * Measure actual DOM sizes of all rendered nodes.
   * Returns a plain object { [nodeId]: { w, h } } suitable for AutoLayout's nodeSizes option.
   * Call after nodes are rendered to DOM (after setEditor + requestAnimationFrame).
   * @returns {Object<string, { w: number, h: number }>}
   */
  measureNodeSizes() {
    const sizes = {};
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
    const el = this.#nodeViews.get(nodeId);
    if (!el) return;
    const preview = el.ref?.previewArea;
    if (!preview) return;

    preview.hidden = false;
    preview.replaceChildren();
    if (type === 'image') {
      const img = document.createElement('img');
      img.src = content;
      img.alt = 'Preview';
      preview.appendChild(img);
    } else {
      const div = document.createElement('div');
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
    const el = this.#nodeViews.get(nodeId);
    if (!el) return;
    const preview = el.ref?.previewArea;
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
      const style = document.createElement('style');
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
      const el = this.#nodeViews.get(step.nodeId);
      if (el) {
        el.style.opacity = '0.4';
        el.style.transition = 'opacity 0.15s';
      }
    }

    // Sequentially activate each node
    trace.forEach((step, i) => {
      setTimeout(() => {
        const el = this.#nodeViews.get(step.nodeId);
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
    const totalDuration = trace.length * stepDelay + 3500;
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
    const node = this.#editor.getNode(nodeId);
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
    const el = this.#nodeViews.get(nodeId);
    if (!el) {
      // Update phantom data if node is virtualized (no DOM)
      const pd = this.#phantomData.get(nodeId);
      if (pd) { pd.x = x; pd.y = y; this.#phantomDirty = true; }
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
    const toolbar = this.ref.quickToolbar;
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
    const el = this.#nodeViews.get(nodeId);
    if (!el) return;

    const startX = el._position.x;
    const startY = el._position.y;
    const dx = targetX - startX;
    const dy = targetY - startY;

    // Skip animation if position hasn't changed
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

    const startTime = performance.now();

    const animate = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      // Ease-out cubic
      const ease = 1 - (1 - t) ** 3;
      const x = startX + dx * ease;
      const y = startY + dy * ease;

      el.style.transform = `translate(${x}px, ${y}px)`;
      el._position = { x, y };
      this.#connRenderer?.updateForNode(nodeId);
      this.#connRenderer?.refreshFreeDots(nodeId);

      const toolbar = this.ref.quickToolbar;
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
    const positions = {};
    // DOM nodes (promoted / small graph)
    for (const [id, el] of this.#nodeViews) {
      if (el._position) {
        positions[id] = [el._position.x, el._position.y];
      }
    }
    // Phantom nodes (virtualized, laid out but no DOM yet).
    // Include even at (0,0) — position existence means node IS on this layer.
    for (const [id, pd] of this.#phantomData) {
      if (!positions[id]) {
        positions[id] = [pd.x, pd.y];
      }
    }
    return positions;
  }

  /**
   * Check whether a node exists on the current canvas layer (DOM or phantom).
   * SubgraphRouter uses this to avoid spurious drillDown when layout is still in progress.
   * @param {string} nodeId
   * @returns {boolean}
   */
  hasNode(nodeId) {
    return this.#nodeViews.has(nodeId) || this.#phantomData.has(nodeId);
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
  setFrameSize(frameId, w, h) {
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
      if (np.x >= fp.x && np.y >= fp.y && np.x <= fp.x + fw && np.y <= fp.y + fh) {
        ids.push(nodeId);
      }
    }
    return ids;
  }

  /**
   * Create frame DOM element with drag and resize
   * @param {import('../core/Frame.js').Frame} frame
   */
  #addFrameView(frame) {
    const el = document.createElement('graph-frame');
    el.style.position = 'absolute';
    el.style.width = `${frame.width}px`;
    el.style.height = `${frame.height}px`;
    el.style.transform = `translate(${frame.x}px, ${frame.y}px)`;
    el._position = { x: frame.x, y: frame.y };
    el._frameData = frame;
    el.setAttribute('frame-id', frame.id);

    // Set frame color directly as CSS variable (reliable, no dependency on Symbiote state)
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
        getZoom: () => this.$.zoom,
      },
      {
        onStart: () => {
          frameStartPos = { ...el._position };
          // Capture positions of nodes that are inside this frame
          const nodeIds = this.#getNodesInFrame(frame.id);
          childStartPositions = new Map();
          for (const nid of nodeIds) {
            const nel = this.#nodeViews.get(nid);
            if (nel) childStartPositions.set(nid, { ...nel._position });
          }
        },
        onTranslate: (x, y) => {
          // Move child nodes by delta from frame start
          if (childStartPositions && frameStartPos) {
            const dx = x - frameStartPos.x;
            const dy = y - frameStartPos.y;
            for (const [nid, startPos] of childStartPositions) {
              this.setNodePosition(nid, startPos.x + dx, startPos.y + dy);
            }
          }
          this.setFramePosition(frame.id, x, y);
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
            getZoom: () => this.$.zoom,
          },
          {
            onStart: () => {
              startSize = { w: frame.width, h: frame.height };
            },
            onTranslate: (x, y) => {
              const w = Math.max(120, x);
              const h = Math.max(80, y);
              this.setFrameSize(frame.id, w, h);
            },
            onDrop: () => { startSize = null; },
          }
        );
        el._resizeDrag = resizeDrag;
      }
    });

    this.ref.framesLayer.appendChild(el);
    this.#frameViews.set(frame.id, el);
  }

  /**
   * Remove frame DOM element
   * @param {import('../core/Frame.js').Frame} frame
   */
  #removeFrameView(frame) {
    const el = this.#frameViews.get(frame.id);
    if (!el) return;
    if (el._drag) el._drag.destroy();
    if (el._resizeDrag) el._resizeDrag.destroy();
    el.remove();
    this.#frameViews.delete(frame.id);
  }

  // --- Selection ---

  #onSelectionChanged(selectedNodes, selectedConnections) {
    this.#zCounter++;
    
    // 1. Identify neighbors of currently selected nodes for "Focus Mode" label visibility
    const neighbors = new Set();
    if (this.#editor && selectedNodes.size > 0) {
      for (const conn of this.#editor.getConnections()) {
        if (selectedNodes.has(conn.from)) neighbors.add(conn.to);
        if (selectedNodes.has(conn.to)) neighbors.add(conn.from);
      }
    }

    // Update node attributes — guard to avoid redundant DOM mutations
    for (const [id, el] of this.#nodeViews) {
      const shouldSelect = selectedNodes.has(id);
      const isSelected = el.hasAttribute('data-selected');
      if (shouldSelect && !isSelected) {
        el.setAttribute('data-selected', '');
        el.style.zIndex = this.#zCounter;
      } else if (!shouldSelect && isSelected) {
        el.removeAttribute('data-selected');
      }

      const shouldNeighbor = neighbors.has(id) && !shouldSelect;
      const isNeighbor = el.hasAttribute('data-neighbor-focused');
      if (shouldNeighbor && !isNeighbor) {
        el.setAttribute('data-neighbor-focused', '');
      } else if (!shouldNeighbor && isNeighbor) {
        el.removeAttribute('data-neighbor-focused');
      }
    }

    // 2. Mark connections touching selected nodes
    const activeConnIds = new Set();
    if (this.#editor && selectedNodes.size > 0) {
      for (const conn of this.#editor.getConnections()) {
        if (selectedNodes.has(conn.from) || selectedNodes.has(conn.to)) {
          activeConnIds.add(conn.id);
        }
      }
    }

    // Use cached path map instead of querySelector per connection
    const connSvg = this.ref.connections;
    if (!this._connPathCache) this._connPathCache = new Map();
    for (const [id] of this.#connRenderer?.data || []) {
      let path = this._connPathCache.get(id);
      if (!path || !path.isConnected) {
        path = connSvg.querySelector(`[data-conn-id="${id}"]`);
        if (path) this._connPathCache.set(id, path);
      }
      if (!path) continue;

      // Selection state
      const shouldSelectConn = selectedConnections.has(id);
      if (shouldSelectConn !== path.hasAttribute('data-selected')) {
        shouldSelectConn ? path.setAttribute('data-selected', '') : path.removeAttribute('data-selected');
      }

      // Active connection: touches a selected node
      const isActive = activeConnIds.has(id);
      if (isActive !== path.hasAttribute('data-active-conn')) {
        isActive ? path.setAttribute('data-active-conn', '') : path.removeAttribute('data-active-conn');
      }

      // Dimming
      const shouldDim = !isActive && selectedNodes.size > 0;
      if (shouldDim !== path.hasAttribute('data-dimmed')) {
        shouldDim ? path.setAttribute('data-dimmed', '') : path.removeAttribute('data-dimmed');
      }
    }

    // Pass selection state to Canvas renderer for dimming implementation
    if (this.#connRenderer && typeof this.#connRenderer.setSelectionState === 'function') {
        this.#connRenderer.setSelectionState(selectedNodes.size > 0, activeConnIds);
    }

    // Quick Action Toolbar — show for single node selection
    const toolbar = this.ref.quickToolbar;
    if (toolbar) {
      if (selectedNodes.size === 1) {
        const nodeId = [...selectedNodes][0];
        const nodeEl = this.#nodeViews.get(nodeId);
        if (nodeEl) toolbar.show(nodeId, nodeEl);
      } else {
        toolbar.hide();
      }
    }

    // Inspector — show selected node details, auto-hide on deselect
    const inspector = this.ref.inspector;
    if (inspector) {
      inspector._canvas = this;
      if (selectedNodes.size === 1) {
        const nodeId = [...selectedNodes][0];
        const node = this.#editor?.getNode(nodeId);
        if (node) {
          inspector.inspect(node);
          inspector.hidden = false;
        }
      } else {
        inspector.clear();
        inspector.hidden = true;
      }
    }

    // Dispatch event so consumers can react to selection changes (including deselect)
    this.dispatchEvent(new CustomEvent('selection-changed', {
      detail: { nodes: [...selectedNodes], connections: [...selectedConnections] },
    }));
  }

  /** @type {number} */
  #lastClickTime = 0;
  /** @type {string|null} */
  #lastClickNodeId = null;

  #handleNodeClick(nodeId, e) {
    const accumulate = e.ctrlKey || e.metaKey;
    this.#selector.selectNode(nodeId, accumulate);

    // Double-click detection for subgraph drill-down
    const now = Date.now();
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
    const accumulate = e.ctrlKey || e.metaKey;
    this.#selector.selectConnection(connId, accumulate);
  }

  // --- Transform ---

  #updateTransform() {

    // Sync grid dots with pan/zoom (cached to avoid forced reflow via getComputedStyle)
    if (this._gridBase === undefined) {
      this._gridBase = parseInt(getComputedStyle(this).getPropertyValue('--sn-grid-size')) || 20;
    }
    const gridBase = this._gridBase;
    const zoom = this.$.zoom;
    const multiplier = zoom < 0.5 ? 2 : 1;
    const gridSize = gridBase * multiplier * zoom;
    this.style.backgroundSize = `${gridSize}px ${gridSize}px`;
    this.style.backgroundPosition = `${this.$.panX}px ${this.$.panY}px`;

    // Sync toolbar position with zoom/pan
    const toolbar = this.ref.quickToolbar;
    if (toolbar) {
      toolbar._transform = { zoom, panX: this.$.panX, panY: this.$.panY };
      if (toolbar._nodeEl) toolbar.updatePosition(toolbar._nodeEl);
    }

    // Viewport culling + LOD (throttled via rAF to prevent re-render cycles)
    if (!this._cullingScheduled) {
      this._cullingScheduled = true;
      requestAnimationFrame(() => {
        this._cullingScheduled = false;
        this.#applyCullingAndLOD();
      });
    }
  }

  /** Apply viewport culling and LOD based on current transform */
  #applyCullingAndLOD() {
    if (!this.ref.canvasContainer) return;
    // Allow running even with 0 DOM nodes (phantom-only mode)
    if (this.#nodeViews.size === 0 && this.#phantomData.size === 0) return;

    const cw = this.ref.canvasContainer.clientWidth;
    const ch = this.ref.canvasContainer.clientHeight;
    const zoom = this.$.zoom;
    const panX = this.$.panX;
    const panY = this.$.panY;
    const margin = 300; 

    const lod = zoom < 0.5 ? 'medium' : 'full';
    this._currentLod = lod;

    if (this.ref.connections) {
      const isDimmed = this.ref.connections.hasAttribute('data-lod-dimmed');
      if (lod !== 'full') {
        if (!isDimmed) this.ref.connections.setAttribute('data-lod-dimmed', '');
      } else {
        if (isDimmed) this.ref.connections.removeAttribute('data-lod-dimmed');
      }
    }

    // ─── Virtualization: promote/demote ───
    const isVirtualized = this.#phantomData.size > 0 || this.#allNodes.size > 200;
    const FAR_ZOOM = zoom < 0.25;
    const toPromote = [];
    const toDemote = [];

    // Check existing DOM nodes for visibility
    for (const [id, el] of this.#nodeViews) {
      const pos = el._position;
      if (!pos) continue;

      const screenX = pos.x * zoom + panX;
      const screenY = pos.y * zoom + panY;
      if (!el._cachedW) {
        el._cachedW = el.offsetWidth || 180;
        el._cachedH = el.offsetHeight || 60;
      }
      const w = el._cachedW * zoom;
      const h = el._cachedH * zoom;

      const visible = (screenX + w > -margin) && (screenX < cw + margin) &&
                      (screenY + h > -margin) && (screenY < ch + margin);

      if (isVirtualized && FAR_ZOOM) {
        toDemote.push(id);
      } else if (visible) {
        if (el.style.visibility !== '') el.style.visibility = '';
        if (el.getAttribute('data-lod') !== lod) el.setAttribute('data-lod', lod);
      } else if (isVirtualized) {
        // Demote to phantom (only in virtualized mode)
        toDemote.push(id);
      } else {
        if (el.style.visibility !== 'hidden') el.style.visibility = 'hidden';
      }
    }

    // Check phantom nodes for visibility — promote if in viewport
    // Skip promotion if ALL nodes are still phantom (initial load before fitView)
    const allPhantom = this.#nodeViews.size === 0 && this.#phantomData.size > 0;
    if (isVirtualized && !FAR_ZOOM) {
      for (const [id, pd] of this.#phantomData) {
        const screenX = pd.x * zoom + panX;
        const screenY = pd.y * zoom + panY;
        const w = (pd.w || 180) * zoom;
        const h = (pd.h || 60) * zoom;

        const visible = (screenX + w > -margin) && (screenX < cw + margin) &&
                        (screenY + h > -margin) && (screenY < ch + margin);

        if (visible) toPromote.push(id);
      }
    }

    // FAR_ZOOM: synchronous demote — no debounce to prevent flicker
    if (FAR_ZOOM && toDemote.length > 0) {
      if (this.#virtTimer) { clearTimeout(this.#virtTimer); this.#virtTimer = null; }
      for (const id of toDemote) this.#demoteNode(id);
      this.#syncPhantomToRenderer();
    } else if (toPromote.length > 0 || toDemote.length > 0) {
      // Normal viewport culling: debounce to avoid thrashing during pan/scroll
      if (this.#virtTimer) clearTimeout(this.#virtTimer);
      this.#virtTimer = setTimeout(() => {
        this.#virtTimer = null;
        for (const id of toDemote) this.#demoteNode(id);
        for (const id of toPromote) this.#promoteNode(id);
        this.#syncPhantomToRenderer();
      }, 100);
    } else if (this.#phantomDirty || allPhantom) {
      // Phantom positions changed or initial phantom-only state — sync to renderer
      this.#phantomDirty = false;
      this.#syncPhantomToRenderer();
    }
  }

  // ─── Virtualization helpers ───

  /** Promote a phantom node to full DOM */
  #promoteNode(nodeId) {
    if (this.#nodeViews.has(nodeId)) return; // already DOM
    const node = this.#allNodes.get(nodeId);
    if (!node) return;

    const pd = this.#phantomData.get(nodeId);
    this.#viewManager.addView(node);
    const el = this.#nodeViews.get(nodeId);
    if (el && pd) {
      el._position = { x: pd.x, y: pd.y };
      el._cachedW = pd.w;
      el._cachedH = pd.h;
      el.style.transform = `translate(${pd.x}px, ${pd.y}px)`;
    }
    this.#phantomData.delete(nodeId);
  }

  /** Demote a DOM node to phantom (Canvas dot) */
  #demoteNode(nodeId) {
    if (!this.#nodeViews.has(nodeId)) return; // already phantom
    const el = this.#nodeViews.get(nodeId);
    // Capture color from DOM before removal (use cached or inline style — avoid getComputedStyle reflow)
    let color = null;
    if (el) {
      color = el._cachedBgColor || el.style.backgroundColor || null;
    }
    const dims = this.#viewManager.removeViewInstant(nodeId);
    if (dims) {
      const node = this.#allNodes.get(nodeId);
      this.#phantomData.set(nodeId, {
        id: nodeId,
        x: dims.x, y: dims.y,
        w: dims.w, h: dims.h,
        degree: this.#nodeDegrees.get(nodeId) || 0,
        color,
        label: node?.label || nodeId,
      });
    }
  }

  /** Push current phantom data to the Canvas renderer */
  #syncPhantomToRenderer() {
    if (this.#connRenderer && typeof this.#connRenderer.setPhantomNodes === 'function') {
      this.#connRenderer.setPhantomNodes([...this.#phantomData.values()]);
    }
  }

  /** Public: force sync phantom data to renderer (for use after batch setNodePosition) */
  syncPhantom() {
    this.#phantomDirty = false;
    this.#syncPhantomToRenderer();
  }

  // --- Lifecycle ---

  renderCallback() {
    const container = this.ref.canvasContainer;
    const content = this.ref.content;

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
            const dx = Math.abs(e.pageX - this._panStart.x);
            const dy = Math.abs(e.pageY - this._panStart.y);
            const t = this._panStart.target;
            const isNode = t?.closest?.('graph-node, quick-toolbar, context-menu, inspector-panel');
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
      const k = this.$.zoom;
      const newK = k * (1 + delta);
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
    const minimap = this.ref.minimap;
    const minimapToggle = this.ref.minimapToggle;
    const MINIMAP_KEY = 'sn-minimap-enabled';
    let minimapEnabled = localStorage.getItem(MINIMAP_KEY) === 'true';
    let fadeTimer = null;
    const FADE_DELAY = 2000;

    const showMinimap = () => {
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

    const updateToggleState = () => {
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
        const nodes = [];
        for (const [id, el] of this.#nodeViews) {
          const pos = el._position || { x: 0, y: 0 };
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
    const nodeSearch = this.ref.nodeSearch;
    if (nodeSearch) {
      nodeSearch.configure({
        getNodes: () => {
          const result = [];
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
          const el = this.#nodeViews.get(nodeId);
          if (el?._position) {
            const cx = container.clientWidth / 2;
            const cy = container.clientHeight / 2;
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
    const el = this.#nodeViews.get(nodeId);
    if (!el?._position) return;
    const container = this.ref.canvasContainer;
    if (!container) return;

    const cx = container.clientWidth / 2;
    const cy = container.clientHeight / 2;
    const nodeW = (el.offsetWidth || 180) / 2;
    const nodeH = (el.offsetHeight || 60) / 2;
    const targetX = -(el._position.x + nodeW) * this.$.zoom + cx;
    const targetY = -(el._position.y + nodeH) * this.$.zoom + cy;

    this.#animatePan(targetX, targetY, duration);
  }

  /**
   * RAF-based smooth pan animation with easeOutCubic
   * @param {number} targetX
   * @param {number} targetY
   * @param {number} duration
   */
  #animatePan(targetX, targetY, duration) {
    if (this.#panAnimFrame) {
      cancelAnimationFrame(this.#panAnimFrame);
      this.#panAnimFrame = null;
    }

    const startX = this.$.panX;
    const startY = this.$.panY;
    const dx = targetX - startX;
    const dy = targetY - startY;

    // Skip if already close enough
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - t, 3);

      this.$.panX = startX + dx * ease;
      this.$.panY = startY + dy * ease;
      this.#updateTransform();

      if (t < 1) {
        this.#panAnimFrame = requestAnimationFrame(step);
      } else {
        this.#panAnimFrame = null;
      }
    };

    this.#panAnimFrame = requestAnimationFrame(step);
  }

  destroyCallback() {
    if (this.#panAnimFrame) cancelAnimationFrame(this.#panAnimFrame);
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
