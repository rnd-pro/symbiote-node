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

  // --- Public API ---

  /**
   * Clear all existing node, connection, and frame views from the DOM.
   * Called before switching to a new editor to ensure clean state.
   */
  #clearViews() {
    // Remove all node views
    for (const [id, el] of this.#nodeViews) {
      if (el._drag) el._drag.destroy();
      el.remove();
    }
    this.#nodeViews.clear();

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

    // Initialize sub-modules
    this.#connRenderer = new ConnectionRenderer({
      svgLayer: this.ref.connections,
      dotLayer: this.ref.pseudoSvg,
      nodeViews: this.#nodeViews,
      editor,
      onConnectionClick: (connId, e) => this.#handleConnectionClick(connId, e),
      getZoom: () => this.$.zoom,
      onDotDrag: (socketData) => {
        // Trigger ConnectFlow pick from overlay dot click
        if (this.#connectFlow && !this.#readonly) {
          this.#connectFlow.pickSocket(socketData);
        }
      },
    });

    this.#pseudo = new PseudoConnection(this.ref.pseudoSvg);

    this.#actions = new ViewportActions({
      editor,
      selector: this.#selector,
      nodeViews: this.#nodeViews,
    });

    // Quick Action Toolbar
    const toolbar = this.ref.quickToolbar;
    if (toolbar) {
      toolbar._onAction = (action, nodeId) => {
        if (this.#readonly) return;
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
    });

    // Subscribe to editor events
    editor.on('nodecreated', (node) => this.#viewManager.addView(node));
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

    // Render already-existing nodes and connections
    for (const node of editor.getNodes()) {
      this.#viewManager.addView(node);
    }
    for (const conn of editor.getConnections()) {
      this.#connRenderer.add(conn);
    }

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
   * Set connection path style
   * @param {'bezier'|'orthogonal'|'straight'} style
   */
  setPathStyle(style) { this.#connRenderer?.setPathStyle(style); }

  /** @returns {'bezier'|'orthogonal'|'straight'} */
  getPathStyle() { return this.#connRenderer?.pathStyle || 'bezier'; }

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
  }

  /**
   * Navigate up to a breadcrumb level
   * @param {number} level - 0 = root
   */
  drillUp(level) {
    this.#navigating = true;
    this.#subgraphManager.drillUp(level);
    this.#navigating = false;
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
   * Set node position
   * @param {string} nodeId
   * @param {number} x
   * @param {number} y
   */
  setNodePosition(nodeId, x, y) {
    const el = this.#nodeViews.get(nodeId);
    if (!el) return;
    el.style.transform = `translate(${x}px, ${y}px)`;
    el._position = { x, y };
    this.#connRenderer?.updateForNode(nodeId);

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
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Get all node positions
   * @returns {Object<string, number[]>}
   */
  getPositions() {
    const positions = {};
    for (const [id, el] of this.#nodeViews) {
      if (el._position) {
        positions[id] = [el._position.x, el._position.y];
      }
    }
    return positions;
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
          if (this.#readonly) return;
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
          if (this.#readonly) return;
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
    for (const [id, el] of this.#nodeViews) {
      if (selectedNodes.has(id)) {
        el.setAttribute('data-selected', '');
        el.style.zIndex = this.#zCounter;
      } else {
        el.removeAttribute('data-selected');
      }
    }
    for (const [id] of this.#connRenderer?.data || []) {
      const path = this.ref.connections.querySelector(`[data-conn-id="${id}"]`);
      if (!path) continue;
      if (selectedConnections.has(id)) {
        path.setAttribute('data-selected', '');
      } else {
        path.removeAttribute('data-selected');
      }
    }

    // Quick Action Toolbar — show for single node selection
    const toolbar = this.ref.quickToolbar;
    if (toolbar) {
      if (selectedNodes.size === 1 && !this.#readonly) {
        const nodeId = [...selectedNodes][0];
        const nodeEl = this.#nodeViews.get(nodeId);
        if (nodeEl) toolbar.show(nodeId, nodeEl);
      } else {
        toolbar.hide();
      }
    }

    // Inspector — show selected node details
    const inspector = this.ref.inspector;
    if (inspector) {
      inspector._canvas = this;
      if (selectedNodes.size === 1) {
        const nodeId = [...selectedNodes][0];
        const node = this.#editor?.getNode(nodeId);
        if (node) inspector.inspect(node);
      } else {
        inspector.clear();
      }
    }
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
      this.#handleNodeDblClick(nodeId);
      this.#lastClickTime = 0;
      this.#lastClickNodeId = null;
    } else {
      this.#lastClickTime = now;
      this.#lastClickNodeId = nodeId;
    }
  }

  #handleNodeDblClick(nodeId) {
    if (!this.#editor) return;
    const node = this.#editor.getNode(nodeId);
    if (node?._isSubgraph) {
      this.drillDown(nodeId);
    }
  }

  #handleConnectionClick(connId, e) {
    const accumulate = e.ctrlKey || e.metaKey;
    this.#selector.selectConnection(connId, accumulate);
  }

  // --- Transform ---

  #updateTransform() {
    // Sync grid dots with pan/zoom
    const gridBase = parseInt(getComputedStyle(this).getPropertyValue('--sn-grid-size')) || 20;
    const zoom = this.$.zoom;
    const multiplier = zoom < 0.5 ? 2 : 1;
    const gridSize = gridBase * multiplier * zoom;
    this.style.backgroundSize = `${gridSize}px ${gridSize}px`;
    this.style.backgroundPosition = `${this.$.panX}px ${this.$.panY}px`;

    // Viewport culling + LOD
    this.#applyCullingAndLOD();
  }

  /** Public: force culling and LOD update (call after programmatic zoom) */
  updateLOD() {
    this.#applyCullingAndLOD();
  }

  /** Apply viewport culling and LOD based on current transform */
  #applyCullingAndLOD() {
    if (!this.ref.canvasContainer || this.#nodeViews.size === 0) return;

    const cw = this.ref.canvasContainer.clientWidth;
    const ch = this.ref.canvasContainer.clientHeight;
    const zoom = this.$.zoom;
    const panX = this.$.panX;
    const panY = this.$.panY;
    const margin = 100; // px buffer for smooth scrolling

    // LOD thresholds (two levels: medium and full)
    const lod = zoom < 0.5 ? 'medium' : 'full';
    const prevLod = this._currentLod || 'full';
    this._currentLod = lod;

    // Hide connections when not full LOD (port geometry changes)
    if (this.ref.connections) {
      this.ref.connections.style.visibility = lod !== 'full' ? 'hidden' : '';
    }

    // Debounced connection refresh when returning to full LOD
    if (prevLod !== 'full' && lod === 'full' && this.#connRenderer) {
      clearTimeout(this._lodRefreshTimer);
      this._lodRefreshTimer = setTimeout(() => {
        for (const [, el] of this.#nodeViews) {
          if (el._nodeId) this.#connRenderer.updateForNode(el._nodeId);
        }
      }, 300);
    }

    for (const [, el] of this.#nodeViews) {
      const pos = el._position;
      if (!pos) continue;

      // Check if node is in viewport
      const screenX = pos.x * zoom + panX;
      const screenY = pos.y * zoom + panY;
      const w = (el.offsetWidth || 180) * zoom;
      const h = (el.offsetHeight || 60) * zoom;

      const visible = screenX + w > -margin && screenX < cw + margin &&
        screenY + h > -margin && screenY < ch + margin;

      if (visible) {
        el.style.contentVisibility = '';
        el.setAttribute('data-lod', lod);
      } else {
        el.style.contentVisibility = 'hidden';
      }
    }
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
        onTranslate: (x, y) => {
          if (this.#zoom?.isTranslating()) return;
          if (this.#connectFlow?.isPicking()) return;
          this.$.panX = x;
          this.$.panY = y;
          this.#updateTransform();
        },
        onDrop: (e) => {
          if (e?.target === container) {
            this.#selector.unselectAll();
          }
        },
      }
    );

    // Zoom
    this.#zoom = new Zoom(0.1);
    this.#zoom.initialize(container, content, (delta, ox, oy) => {
      const k = this.$.zoom;
      const newK = k * (1 + delta);
      if (newK < 0.1 || newK > 5) return;
      this.$.zoom = newK;
      this.$.panX += ox;
      this.$.panY += oy;
      this.#updateTransform();
    });

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
    this.sub('+contentTransform', (val) => {
      if (this.ref.content) {
        this.ref.content.style.transform = val;
      }
    });

    this.#updateTransform();

    // Minimap state getter
    const minimap = this.ref.minimap;
    if (minimap) {
      minimap.setStateGetter(() => {
        const nodes = [];
        for (const [id, el] of this.#nodeViews) {
          const pos = el._position || { x: 0, y: 0 };
          const rect = el.getBoundingClientRect();
          nodes.push({
            x: pos.x,
            y: pos.y,
            width: rect.width / this.$.zoom,
            height: rect.height / this.$.zoom,
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

  destroyCallback() {
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
