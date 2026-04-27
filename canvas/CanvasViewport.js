/**
 * CanvasViewport.js
 *
 * Manages viewport transformations (pan/zoom), Level of Detail (LOD),
 * and node virtualization (phantom data) to optimize rendering of large graphs.
 *
 * @module symbiote-node/canvas/CanvasViewport
 */

export class CanvasViewport {
  /** @type {import('./NodeCanvas/NodeCanvas.js').NodeCanvas} */
  #canvas;
  /** @type {Map<string, HTMLElement>} */
  #nodeViews;
  /** @type {import('../NodeViewManager.js').NodeViewManager} */
  #viewManager;
  /** @type {function(): import('../ConnectionRenderer.js').ConnectionRenderer} */
  #getConnRenderer;

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

  /** @type {number|null} */
  #panAnimFrame = null;

  constructor({ canvas, nodeViews, viewManager, getConnRenderer }) {
    this.#canvas = canvas;
    this.#nodeViews = nodeViews;
    this.#viewManager = viewManager;
    this.#getConnRenderer = getConnRenderer;
  }

  /**
   * Reset and initialize virtualization data from a new editor
   * @param {import('../core/Editor.js').NodeEditor} editor
   */
  initializeData(editor) {
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
  }

  clear() {
    this.#allNodes.clear();
    this.#phantomData.clear();
    this.#nodeDegrees.clear();
    if (this.#virtTimer) { clearTimeout(this.#virtTimer); this.#virtTimer = null; }
    if (this.#panAnimFrame) { cancelAnimationFrame(this.#panAnimFrame); this.#panAnimFrame = null; }
  }

  handleNodeCreated(node) {
    this.#allNodes.set(node.id, node);
    if (this.#phantomData.size > 0) {
      this.#phantomData.set(node.id, {
        id: node.id, x: 0, y: 0, w: 180, h: 60,
        degree: 0, color: null, label: node.label || node.id,
      });
    } else {
      this.#viewManager.addView(node);
    }
  }

  updatePhantomPosition(nodeId, x, y) {
    const pd = this.#phantomData.get(nodeId);
    if (pd) {
      pd.x = x;
      pd.y = y;
      this.#phantomDirty = true;
    }
  }

  updateTransform() {
    // Sync grid dots with pan/zoom
    if (this.#canvas._gridBase === undefined) {
      this.#canvas._gridBase = parseInt(getComputedStyle(this.#canvas).getPropertyValue('--sn-grid-size')) || 20;
    }
    const gridBase = this.#canvas._gridBase;
    const zoom = this.#canvas.$.zoom;
    const multiplier = zoom < 0.5 ? 2 : 1;
    const gridSize = gridBase * multiplier * zoom;
    this.#canvas.style.backgroundSize = `${gridSize}px ${gridSize}px`;
    this.#canvas.style.backgroundPosition = `${this.#canvas.$.panX}px ${this.#canvas.$.panY}px`;

    // Sync toolbar position
    const toolbar = this.#canvas.ref.quickToolbar;
    if (toolbar) {
      toolbar._transform = { zoom, panX: this.#canvas.$.panX, panY: this.#canvas.$.panY };
      if (toolbar._nodeEl) toolbar.updatePosition(toolbar._nodeEl);
    }

    // Viewport culling + LOD
    if (!this.#canvas._cullingScheduled) {
      this.#canvas._cullingScheduled = true;
      requestAnimationFrame(() => {
        this.#canvas._cullingScheduled = false;
        this.#applyCullingAndLOD();
      });
    }
  }

  #applyCullingAndLOD() {
    if (!this.#canvas.ref.canvasContainer) return;
    if (this.#nodeViews.size === 0 && this.#phantomData.size === 0) return;

    const cw = this.#canvas.ref.canvasContainer.clientWidth;
    const ch = this.#canvas.ref.canvasContainer.clientHeight;
    const zoom = this.#canvas.$.zoom;
    const panX = this.#canvas.$.panX;
    const panY = this.#canvas.$.panY;
    const margin = 300; 

    const lod = zoom < 0.5 ? 'medium' : 'full';
    this.#canvas._currentLod = lod;

    if (this.#canvas.ref.connections) {
      const isDimmed = this.#canvas.ref.connections.hasAttribute('data-lod-dimmed');
      if (lod !== 'full') {
        if (!isDimmed) this.#canvas.ref.connections.setAttribute('data-lod-dimmed', '');
      } else {
        if (isDimmed) this.#canvas.ref.connections.removeAttribute('data-lod-dimmed');
      }
    }

    const isVirtualized = this.#phantomData.size > 0 || this.#allNodes.size > 200;
    const FAR_ZOOM = zoom < 0.25;
    const toPromote = [];
    const toDemote = [];

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
        toDemote.push(id);
      } else {
        if (el.style.visibility !== 'hidden') el.style.visibility = 'hidden';
      }
    }

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

    if (FAR_ZOOM && toDemote.length > 0) {
      if (this.#virtTimer) { clearTimeout(this.#virtTimer); this.#virtTimer = null; }
      for (const id of toDemote) this.#demoteNode(id);
      this.#syncPhantomToRenderer();
    } else if (toPromote.length > 0 || toDemote.length > 0) {
      if (this.#virtTimer) clearTimeout(this.#virtTimer);
      this.#virtTimer = setTimeout(() => {
        this.#virtTimer = null;
        for (const id of toDemote) this.#demoteNode(id);
        for (const id of toPromote) this.#promoteNode(id);
        this.#syncPhantomToRenderer();
      }, 100);
    } else if (this.#phantomDirty || allPhantom) {
      this.#phantomDirty = false;
      this.#syncPhantomToRenderer();
    }
  }

  #promoteNode(nodeId) {
    if (this.#nodeViews.has(nodeId)) return;
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

  #demoteNode(nodeId) {
    if (!this.#nodeViews.has(nodeId)) return;
    const el = this.#nodeViews.get(nodeId);
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

  #syncPhantomToRenderer() {
    const connRenderer = this.#getConnRenderer();
    if (connRenderer && typeof connRenderer.setPhantomNodes === 'function') {
      connRenderer.setPhantomNodes([...this.#phantomData.values()]);
    }
  }

  syncPhantom() {
    this.#phantomDirty = false;
    this.#syncPhantomToRenderer();
  }

  fitView() {
    if (this.#nodeViews.size === 0 && this.#phantomData.size === 0) return;
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

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

    for (const [, pd] of this.#phantomData) {
      if (pd.x < minX) minX = pd.x;
      if (pd.y < minY) minY = pd.y;
      if (pd.x + pd.w > maxX) maxX = pd.x + pd.w;
      if (pd.y + pd.h > maxY) maxY = pd.y + pd.h;
    }
    
    if (minX === Infinity) return;

    const graphW = maxX - minX;
    const graphH = maxY - minY;
    const canvasRect = this.#canvas.ref.canvasContainer.getBoundingClientRect();
    
    let visibleWidth = canvasRect.width;
    const inspector = this.#canvas.ref.inspector || this.#canvas.querySelector('inspector-panel');
    if (inspector && !inspector.hasAttribute('hidden')) {
      visibleWidth -= inspector.offsetWidth || 280;
    }

    const scaleX = (visibleWidth - 80) / graphW;
    const scaleY = (canvasRect.height - 80) / graphH;
    const scale = Math.max(0.001, Math.min(scaleX, scaleY, 1.5));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    this.#canvas.$.zoom = scale;
    this.#canvas.$.panX = (visibleWidth / 2) - centerX * scale;
    this.#canvas.$.panY = canvasRect.height / 2 - centerY * scale;
    this.updateTransform();
  }

  flyToNode(nodeId, { zoom = 0.8 } = {}) {
    let el = this.#nodeViews.get(nodeId);

    if (!el && this.#phantomData.has(nodeId)) {
      this.#promoteNode(nodeId);
      el = this.#nodeViews.get(nodeId);
    }
    if (!el) return false;

    const pos = el._position || (() => {
      const pd = this.#phantomData.get(nodeId);
      return pd ? { x: pd.x, y: pd.y } : { x: 0, y: 0 };
    })();

    const canvasRect = this.#canvas.ref.canvasContainer.getBoundingClientRect();
    let visibleWidth = canvasRect.width;
    
    const inspector = this.#canvas.ref.inspector || this.#canvas.querySelector('inspector-panel');
    if (inspector && !inspector.hasAttribute('hidden') && inspector.offsetWidth > 20) {
        visibleWidth -= inspector.offsetWidth;
    }

    const elWidth = el._cachedW || el.offsetWidth || 150;
    const elHeight = el._cachedH || el.offsetHeight || 40;

    const nodeX = pos.x + (elWidth / 2);
    const nodeY = pos.y + (elHeight / 2);

    const newPanX = (visibleWidth / 2) - nodeX * zoom;
    const newPanY = canvasRect.height / 2 - nodeY * zoom;

    const dz = Math.abs(this.#canvas.$.zoom - zoom);
    const dx = Math.abs(this.#canvas.$.panX - newPanX);
    const dy = Math.abs(this.#canvas.$.panY - newPanY);
    
    if (dz < 0.01 && dx < 2 && dy < 2) {
      this.#canvas.selectNode(nodeId);
      if (!this.#canvas._cullingScheduled) {
        this.#canvas._cullingScheduled = true;
        requestAnimationFrame(() => {
          this.#canvas._cullingScheduled = false;
          this.#applyCullingAndLOD();
        });
      }
      return true;
    }

    this.#canvas.$.zoom = zoom;
    this.#canvas.$.panX = newPanX;
    this.#canvas.$.panY = newPanY;

    this.#canvas.selectNode(nodeId);
    return true;
  }

  panToNode(nodeId, duration = 400) {
    const el = this.#nodeViews.get(nodeId);
    if (!el?._position) return;
    const container = this.#canvas.ref.canvasContainer;
    if (!container) return;

    const cx = container.clientWidth / 2;
    const cy = container.clientHeight / 2;
    const nodeW = (el.offsetWidth || 180) / 2;
    const nodeH = (el.offsetHeight || 60) / 2;
    const targetX = -(el._position.x + nodeW) * this.#canvas.$.zoom + cx;
    const targetY = -(el._position.y + nodeH) * this.#canvas.$.zoom + cy;

    this.animatePan(targetX, targetY, duration);
  }

  animatePan(targetX, targetY, duration) {
    if (this.#panAnimFrame) {
      cancelAnimationFrame(this.#panAnimFrame);
      this.#panAnimFrame = null;
    }

    const startX = this.#canvas.$.panX;
    const startY = this.#canvas.$.panY;
    const dx = targetX - startX;
    const dy = targetY - startY;

    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);

      this.#canvas.$.panX = startX + dx * ease;
      this.#canvas.$.panY = startY + dy * ease;
      this.updateTransform();

      if (t < 1) {
        this.#panAnimFrame = requestAnimationFrame(step);
      } else {
        this.#panAnimFrame = null;
      }
    };

    this.#panAnimFrame = requestAnimationFrame(step);
  }

  getPositions() {
    const positions = {};
    for (const [id, el] of this.#nodeViews) {
      if (el._position) {
        positions[id] = [el._position.x, el._position.y];
      }
    }
    for (const [id, pd] of this.#phantomData) {
      if (!positions[id]) {
        positions[id] = [pd.x, pd.y];
      }
    }
    return positions;
  }

  hasNode(nodeId) {
    return this.#nodeViews.has(nodeId) || this.#phantomData.has(nodeId);
  }
}
