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

  /** @type {SVGElement} - overlay layer for dots (z-index above nodes) */
  #dotLayer;

  /** @type {Map<string, HTMLElement>} */
  #nodeViews;

  /** @type {import('../core/Editor.js').NodeEditor} */
  #editor;

  /** @type {function} */
  #onConnectionClick;

  /** @type {function} */
  #getZoom;

  /** @type {function|null} - callback when dot is dragged: (socketData) => void */
  #onDotDrag = null;

  /** @type {'bezier'|'orthogonal'|'straight'|'pcb'} */
  #pathStyle = 'bezier';

  /**
   * @param {object} config
   * @param {SVGElement} config.svgLayer
   * @param {Map<string, HTMLElement>} config.nodeViews
   * @param {import('../core/Editor.js').NodeEditor} config.editor
   * @param {function} config.onConnectionClick - (connId, event)
   * @param {function} config.getZoom - Returns current zoom level
   */
  constructor({ svgLayer, dotLayer, nodeViews, editor, onConnectionClick, getZoom, onDotDrag }) {
    this.#svgLayer = svgLayer;
    this.#dotLayer = dotLayer || svgLayer;
    this.#nodeViews = nodeViews;
    this.#editor = editor;
    this.#onConnectionClick = onConnectionClick;
    this.#getZoom = getZoom || (() => 1);
    this.#onDotDrag = onDotDrag || null;
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
    // Remove free dots for now-connected ports
    this.removeFreeDot(conn.from, conn.out, 'output');
    this.removeFreeDot(conn.to, conn.in, 'input');
    // Full re-render for affected nodes (slot pool needs full context)
    this.#fullRerenderForNodes(new Set([conn.from, conn.to]));
  }

  /**
   * Bulk add connections and render them in a single batch.
   * Greatly improves performance when inflating large graphs.
   * @param {import('../core/Connection.js').Connection[]} conns
   */
  addBatch(conns) {
    if (!conns || conns.length === 0) return;
    for (const conn of conns) {
      this.#connectionData.set(conn.id, conn);
    }
    this.refreshAll();
  }

  /**
   * Clear slot registries and caches for all known nodes
   */
  #clearAllSlots() {
    for (const [, el] of this.#nodeViews) {
      el._usedCoords = [];
      el._slotCache = new Map();
    }
  }

  /**
   * Full re-render: clear all slots for affected nodes, recalculate everything
   * @param {Set<string>} nodeIds
   */
  #fullRerenderForNodes(nodeIds) {
    const allNodes = new Set(nodeIds);
    const conns = [];
    for (const [, conn] of this.#connectionData) {
      if (nodeIds.has(conn.from) || nodeIds.has(conn.to)) {
        allNodes.add(conn.from);
        allNodes.add(conn.to);
        conns.push(conn);
      }
    }
    for (const nid of allNodes) {
      const el = this.#nodeViews.get(nid);
      if (el) {
        el._usedCoords = [];
        el._slotCache = new Map();
      }
    }
    for (const conn of conns) {
      this.#render(conn);
    }
  }

  /**
   * Remove a connection path
   * @param {import('../core/Connection.js').Connection} conn
   */
  remove(conn) {
    const fromId = conn.from;
    const toId = conn.to;
    this.#connectionData.delete(conn.id);
    const path = this.#svgLayer.querySelector(`[data-conn-id="${conn.id}"]`);
    if (path) {
      // Fade out using existing CSS opacity transition
      path.style.opacity = '0';
      path.addEventListener('transitionend', () => path.remove(), { once: true });
      // Fallback removal if transition doesn't fire
      setTimeout(() => { if (path.parentNode) path.remove(); }, 200);
    }
    // Remove endpoint dots and arrow
    for (const end of ['start', 'end']) {
      const dot = this.#dotLayer.querySelector(`[data-conn-dot="${conn.id}-${end}"]`);
      if (dot) dot.remove();
    }
    const arrow = this.#svgLayer.querySelector(`[data-conn-arrow="${conn.id}"]`);
    if (arrow) arrow.remove();

    // Re-render free dots for freed ports
    this.renderFreeDots(fromId);
    this.renderFreeDots(toId);
  }

  /**
   * Highlight overlay dots belonging to compatible nodes during drag
   * @param {Set<string>} compatibleNodeIds - set of node IDs that have compatible ports
   */
  highlightDotsForNodes(compatibleNodeIds) {
    // Highlight connected dots
    const connDots = this.#dotLayer.querySelectorAll('.sn-conn-dot');
    for (const dot of connDots) {
      const dotId = dot.getAttribute('data-conn-dot') || '';
      const connId = dotId.replace(/-(?:start|end)$/, '');
      const conn = this.#connectionData.get(connId);
      if (!conn) continue;
      const end = dotId.endsWith('-start') ? 'start' : 'end';
      const nodeId = end === 'start' ? conn.from : conn.to;
      if (compatibleNodeIds.has(nodeId)) {
        dot.classList.add('sn-dot-hint');
      } else {
        dot.classList.remove('sn-dot-hint');
      }
    }

    // Highlight free dots
    const freeDots = this.#dotLayer.querySelectorAll('.sn-free-dot');
    for (const dot of freeDots) {
      const nodeId = dot.getAttribute('data-node-id');
      if (compatibleNodeIds.has(nodeId)) {
        dot.classList.add('sn-dot-hint');
      } else {
        dot.classList.remove('sn-dot-hint');
      }
    }
  }

  /**
   * Clear all dot highlights
   */
  clearDotHighlights() {
    const dots = this.#dotLayer.querySelectorAll('.sn-dot-hint');
    for (const dot of dots) {
      dot.classList.remove('sn-dot-hint');
    }
  }

  /**
   * Update all connections touching a node
   * @param {string} nodeId
   */
  updateForNode(nodeId) {
    // Only clear and recalculate the DRAGGED node.
    // Non-dragged nodes use cached slot assignments (no jitter).
    const draggedEl = this.#nodeViews.get(nodeId);
    if (draggedEl) {
      draggedEl._usedCoords = [];
      draggedEl._slotCache = new Map();
    }

    // Collect touched connections for re-render
    const touchedConns = [];
    for (const [, conn] of this.#connectionData) {
      if (conn.from === nodeId || conn.to === nodeId) {
        touchedConns.push(conn);

      }
    }

    for (const conn of touchedConns) {
      this.#render(conn, nodeId);
    }
  }

  static _refreshCycleCount = 0;
  static _lastRefreshTime = 0;

  /**
   * Clear all caches and re-render every connection + free dots.
   * Call after initial node positioning to let SVG connectors settle.
   */
  refreshAll() {
    const t0 = performance.now();
    ConnectionRenderer._refreshCycleCount = (ConnectionRenderer._refreshCycleCount || 0) + 1;
    
    this.#clearAllSlots();

    // Clear stale free dots from previous render
    const staleDots = this.#dotLayer.querySelectorAll('.sn-free-dot');
    for (const dot of staleDots) dot.remove();

    // Detach layers from layout tree to prevent O(N²) thrashing during Read/Write mix
    const originalSvgDisplay = this.#svgLayer.style.display;
    const originalDotDisplay = this.#dotLayer.style.display;
    this.#svgLayer.style.display = 'none';
    this.#dotLayer.style.display = 'none';

    // Pre-cache node rects for routing (prevents O(N^2) Layout Thrashing)
    this._nodeRectCache = new Map();
    for (const [nid, el] of this.#nodeViews) {
      if (el) {
        this._nodeRectCache.set(nid, {
          id: nid,
          x: el._position?.x || 0,
          y: el._position?.y || 0,
          w: el.offsetWidth || 180,
          h: el.offsetHeight || 100,
        });
      }
    }

    // ─── Three-Pass Pipeline: Side-Based Pin Assignment ───
    // Pass 1: Assign sides and distribute pins
    // Pass 2: Render connections (pins from _slotCache)
    // Pass 3: Render free dots on remaining edges

    const conns = Array.from(this.#connectionData.values());

    // ─── Pass 1: Side-Based Pin Assignment ───
    // Group all connection endpoints by node → then by side
    /** @type {Map<string, Array<{portKey: string, portSide: string, targetPos: {x:number, y:number}}>>} */
    const nodeJobs = new Map();

    for (const conn of conns) {
      const fromEl = this.#nodeViews.get(conn.from);
      const toEl = this.#nodeViews.get(conn.to);
      if (!fromEl || !toEl) continue;

      const fromPos = fromEl._position;
      const toPos = toEl._position;
      if (!fromPos || !toPos) continue;

      const toCenter = {
        x: toPos.x + (toEl._cachedW || 180) / 2,
        y: toPos.y + (toEl._cachedH || 100) / 2,
      };
      const fromCenter = {
        x: fromPos.x + (fromEl._cachedW || 180) / 2,
        y: fromPos.y + (fromEl._cachedH || 100) / 2,
      };

      if (!nodeJobs.has(conn.from)) nodeJobs.set(conn.from, []);
      nodeJobs.get(conn.from).push({ portKey: conn.out, portSide: 'output', targetPos: toCenter });

      if (!nodeJobs.has(conn.to)) nodeJobs.set(conn.to, []);
      nodeJobs.get(conn.to).push({ portKey: conn.in, portSide: 'input', targetPos: fromCenter });
    }

    // For each node: determine side per connection, group by side, distribute pins
    for (const [nodeId, jobs] of nodeJobs) {
      const el = this.#nodeViews.get(nodeId);
      if (!el?._position) continue;

      const shape = getShape(el.getAttribute('node-shape'));
      if (!shape?.getSidePosition) continue;

      const size = { width: el._cachedW || 180, height: el._cachedH || 100 };
      const cx = el._position.x + size.width / 2;
      const cy = el._position.y + size.height / 2;

      if (!el._slotCache) el._slotCache = new Map();

      // Step 1: Determine side for each connection
      /** @type {Map<string, Array<{portKey: string, portSide: string, angle: number}>>} */
      const sideBuckets = new Map();
      for (const job of jobs) {
        const dx = job.targetPos.x - cx;
        const dy = job.targetPos.y - cy;
        const angle = Math.atan2(dy, dx);

        // Determine side from angle quadrant
        let nodeSide;
        if (Math.abs(dx) > Math.abs(dy)) {
          nodeSide = dx > 0 ? 'right' : 'left';
        } else {
          nodeSide = dy > 0 ? 'bottom' : 'top';
        }

        if (!sideBuckets.has(nodeSide)) sideBuckets.set(nodeSide, []);
        sideBuckets.get(nodeSide).push({ portKey: job.portKey, portSide: job.portSide, angle });
      }

      // Step 2: Within each side, sort by perpendicular angle and distribute
      for (const [nodeSide, bucket] of sideBuckets) {
        // Sort by perpendicular component for natural spacing
        // For left/right sides: sort by Y (angle's vertical component)
        // For top/bottom sides: sort by X (angle's horizontal component)
        if (nodeSide === 'left' || nodeSide === 'right') {
          bucket.sort((a, b) => Math.sin(a.angle) - Math.sin(b.angle));
        } else {
          bucket.sort((a, b) => Math.cos(a.angle) - Math.cos(b.angle));
        }

        // Distribute pins evenly along the side edge
        const total = bucket.length;
        bucket.forEach((item, index) => {
          const t = total === 1 ? 0.5 : index / (total - 1);
          const pos = shape.getSidePosition(nodeSide, t, size);
          const cacheKey = `${item.portKey}:${item.portSide}`;
          el._slotCache.set(cacheKey, { x: pos.x, y: pos.y, angle: pos.angle });

          if (ConnectionRenderer.debug) {
            const label = el._nodeData?.label || nodeId;
            console.log(`[PIN] ${label} | ${item.portSide}:${item.portKey} → side=${nodeSide} t=${t.toFixed(2)} pos=(${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}) angle=${pos.angle}°`);
          }
        });
      }
    }

    // ─── Pass 2: Render connections (pins pre-assigned from _slotCache) ───
    for (const conn of conns) {
      this.#render(conn);
    }

    // ─── Pass 3: Render free dots for SVG nodes ───
    for (const [nodeId, el] of this.#nodeViews) {
      if (el.getAttribute('data-svg-shape')) {
        this.renderFreeDots(nodeId);
      }
    }

    // ─── Final Debug Pass: Inter-Trace Overlaps ───
    if (ConnectionRenderer.debug && this._allSegments) {
      let overlaps = 0;
      for (let i = 0; i < this._allSegments.length; i++) {
        for (let j = i + 1; j < this._allSegments.length; j++) {
          const s1 = this._allSegments[i];
          const s2 = this._allSegments[j];
          if (s1.connId === s2.connId) continue;
          
          // Check if both are horizontal
          if (s1.p1.y === s1.p2.y && s2.p1.y === s2.p2.y && s1.p1.y === s2.p1.y) {
            const minX1 = Math.min(s1.p1.x, s1.p2.x), maxX1 = Math.max(s1.p1.x, s1.p2.x);
            const minX2 = Math.min(s2.p1.x, s2.p2.x), maxX2 = Math.max(s2.p1.x, s2.p2.x);
            if (Math.max(minX1, minX2) + 5 < Math.min(maxX1, maxX2)) {
              console.warn(`[PCB DEBUG] Trace Overlap (Horizontal) Y=${s1.p1.y}: conn[${s1.connId}] overlaps conn[${s2.connId}]`);
              overlaps++;
            }
          }
          // Check if both are vertical
          if (s1.p1.x === s1.p2.x && s2.p1.x === s2.p2.x && s1.p1.x === s2.p1.x) {
            const minY1 = Math.min(s1.p1.y, s1.p2.y), maxY1 = Math.max(s1.p1.y, s1.p2.y);
            const minY2 = Math.min(s2.p1.y, s2.p2.y), maxY2 = Math.max(s2.p1.y, s2.p2.y);
            if (Math.max(minY1, minY2) + 5 < Math.min(maxY1, maxY2)) {
              console.warn(`[PCB DEBUG] Trace Overlap (Vertical) X=${s1.p1.x}: conn[${s1.connId}] overlaps conn[${s2.connId}]`);
              overlaps++;
            }
          }
        }
      }
      if (overlaps > 0) console.warn(`[PCB DEBUG] Found ${overlaps} inter-trace overlaps.`);
    }
    this._allSegments = null;
    this._nodeRectCache = null;

    // Restore layers
    this.#svgLayer.style.display = originalSvgDisplay;
    this.#dotLayer.style.display = originalDotDisplay;

    // ─── Performance Monitoring ───
    if (ConnectionRenderer.debug) {
      const t1 = performance.now();
      const mem = (performance?.memory?.usedJSHeapSize) 
        ? (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + 'MB' 
        : 'N/A';
      console.log(`[PCB PERF] refreshAll cycle #${ConnectionRenderer._refreshCycleCount} took ${(t1 - t0).toFixed(2)}ms | Mem: ${mem}`);
      
      const dt = t0 - (ConnectionRenderer._lastRefreshTime || 0);
      if (ConnectionRenderer._lastRefreshTime > 0 && dt < 16) {
        console.warn(`[PCB PERF] High refresh rate detected! dt=${dt.toFixed(2)}ms (possible rendering loop or layout oscillation)`);
      }
      ConnectionRenderer._lastRefreshTime = t0;
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
    this.#clearAllSlots();
    for (const [, conn] of this.#connectionData) {
      this.#render(conn);
    }
  }


  /** @returns {'bezier'|'orthogonal'|'straight'} */
  get pathStyle() { return this.#pathStyle; }

  /**
   * Get socket offset relative to graph-node.
   * For SVG shapes with a target position, computes dynamic edge point
   * in the direction of the connected node (connector slides along perimeter).
   *
   * @param {HTMLElement} nodeEl
   * @param {string} portKey
   * @param {'input'|'output'} side
   * @param {{ x: number, y: number }} [targetPos] - center of the connected node (for dynamic edge)
   * @returns {{ x: number, y: number }}
   */
  getSocketOffset(nodeEl, portKey, side, targetPos) {
    // SVG shapes: compute edge position mathematically
    const shape = getShape(nodeEl.getAttribute('node-shape'));
    const nodeData = nodeEl._nodeData;
    if (shape && shape.pathData && nodeData) {
      const size = { width: nodeEl._cachedW || 180, height: nodeEl._cachedH || 100 };

      // Dynamic mode — side-based pin placement
      if (targetPos && shape.getSidePosition) {
        // Check cache first (set by refreshAll two-pass pipeline)
        if (!nodeEl._slotCache) nodeEl._slotCache = new Map();
        const cacheKey = `${portKey}:${side}`;
        if (nodeEl._slotCache.has(cacheKey)) {
          return nodeEl._slotCache.get(cacheKey);
        }

        // Fallback: immediate side-based calculation (for single-connection render)
        const nodePos = nodeEl._position;
        const cx = nodePos.x + size.width / 2;
        const cy = nodePos.y + size.height / 2;
        const dx = targetPos.x - cx;
        const dy = targetPos.y - cy;

        // Determine side from angle to target
        const nodeSide = Math.abs(dx) > Math.abs(dy)
          ? (dx > 0 ? 'right' : 'left')
          : (dy > 0 ? 'bottom' : 'top');

        const pos = shape.getSidePosition(nodeSide, 0.5, size);
        const result = { x: pos.x, y: pos.y, angle: pos.angle };
        nodeEl._slotCache.set(cacheKey, result);
        return result;
      }

      // Also support getEdgePoint fallback with smart routing
      if (targetPos && shape.getEdgePoint) {
        const ports = side === 'output' ? nodeData.outputs : nodeData.inputs;
        const keys = ports ? Object.keys(ports) : [portKey];
        const index = keys.indexOf(portKey);
        const total = keys.length;

        const nodePos = nodeEl._position;
        const cx = nodePos.x + size.width / 2;
        const cy = nodePos.y + size.height / 2;
        const baseAngle = Math.atan2(targetPos.y - cy, targetPos.x - cx);

        // 1. Separate input/output zones: gap between types
        const sideGap = Math.PI / 6; // 30° gap = one full slot between input/output
        const adjustedBase = baseAngle + (side === 'output' ? -sideGap : sideGap);

        // 2. Anti-crossing: reverse port order based on perpendicular direction
        const dx = targetPos.x - cx;
        const dy = targetPos.y - cy;
        const shouldReverse = (side === 'output') ? (dy < 0) : (dy > 0);
        const effectiveIndex = shouldReverse ? (total - 1 - index) : index;

        // 3. Spread ports around adjusted base angle
        let angle = adjustedBase;
        if (total > 1) {
          const segment = (2 * Math.PI) / (total * 2);
          const offset = (effectiveIndex - (total - 1) / 2) * segment;
          angle = adjustedBase + offset;
        }

        // 4. Quantize to 15° grid for stable discrete movement
        const step = Math.PI / 12; // 15° grid
        angle = Math.round(angle / step) * step;

        // Check cache first
        if (!nodeEl._slotCache) nodeEl._slotCache = new Map();
        const cacheKey = `${portKey}:${side}`;
        if (nodeEl._slotCache.has(cacheKey)) {
          return nodeEl._slotCache.get(cacheKey);
        }

        // 5. Collision avoidance by PIXEL COORDINATES
        if (!nodeEl._usedCoords) nodeEl._usedCoords = [];
        const MIN_PIX = 5;
        let nudged = angle;
        let attempts = 0;
        while (attempts < 24) {
          const testPos = shape.getEdgePoint(nudged, size);
          const tooClose = nodeEl._usedCoords.some(
            c => Math.abs(testPos.x - c.x) < MIN_PIX && Math.abs(testPos.y - c.y) < MIN_PIX
          );
          if (!tooClose) break;
          nudged += step;
          attempts++;
        }

        const pos = shape.getEdgePoint(nudged, size);
        nodeEl._usedCoords.push({ x: pos.x, y: pos.y });
        const result = { x: pos.x, y: pos.y, angle: pos.angle };
        nodeEl._slotCache.set(cacheKey, result);
        return result;
      }
      // Fixed mode: distribute ports at preset angles
      const ports = side === 'output' ? nodeData.outputs : nodeData.inputs;
      if (ports) {
        const keys = Object.keys(ports);
        const index = keys.indexOf(portKey);
        const total = keys.length;
        if (index >= 0) {
          const pos = shape.getSocketPosition(side, index, total, size);
          return { x: pos.x, y: pos.y };
        }
      }
    }

    // Fast path: if node is culled, skip forced layout resolution
    if (nodeEl.style.contentVisibility === 'hidden') {
      return {
        x: side === 'output' ? (nodeEl._cachedW || 180) : 0,
        y: (nodeEl._cachedH || 100) / 2,
      };
    }

    // Standard shapes: read from DOM socket elements
    const container = side === 'output'
      ? nodeEl.querySelector('.outputs')
      : nodeEl.querySelector('.inputs');

    if (container) {
      const portItems = container.querySelectorAll('port-item');
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
      x: side === 'output' ? (nodeEl._cachedW || nodeEl.offsetWidth || 180) : 0,
      y: (nodeEl._cachedH || nodeEl.offsetHeight || 100) / 2,
    };
  }

  /**
   * Render a single connection SVG path with tangent-aware Bézier and gradient coloring
   * @param {import('../core/Connection.js').Connection} conn
   */
  #render(conn, draggedNodeId = null) {
    const fromEl = this.#nodeViews.get(conn.from);
    const toEl = this.#nodeViews.get(conn.to);
    if (!fromEl || !toEl) return;

    const fromPos = fromEl._position;
    const toPos = toEl._position;

    // Compute centers for dynamic edge positioning on SVG shapes
    const fromW = fromEl._cachedW || fromEl.offsetWidth || 180;
    const fromH = fromEl._cachedH || fromEl.offsetHeight || 100;
    const toW = toEl._cachedW || toEl.offsetWidth || 180;
    const toH = toEl._cachedH || toEl.offsetHeight || 100;
    const fromCenter = {
      x: fromPos.x + fromW / 2,
      y: fromPos.y + fromH / 2,
    };
    const toCenter = {
      x: toPos.x + toW / 2,
      y: toPos.y + toH / 2,
    };

    // Always recalculate both sides (slot pool makes this cheap and deterministic)
    const fromOffset = this.getSocketOffset(fromEl, conn.out, 'output', toCenter);
    const toOffset = this.getSocketOffset(toEl, conn.in, 'input', fromCenter);

    const startX = fromPos.x + fromOffset.x;
    const startY = fromPos.y + fromOffset.y;
    const endX = toPos.x + toOffset.x;
    const endY = toPos.y + toOffset.y;

    // Tangent-aware Bézier using shape angles
    const fromNode = this.#editor.getNode(conn.from);
    const toNode = this.#editor.getNode(conn.to);
    const fromShape = getShape(fromNode?.shape);
    const toShape = getShape(toNode?.shape);

    const fromSize = { width: fromW, height: fromH };
    const toSize = { width: toW, height: toH };

    // Generate path based on style
    let d;
    if (this.#pathStyle === 'straight') {
      d = `M ${startX} ${startY} L ${endX} ${endY}`;
    } else if (this.#pathStyle === 'orthogonal') {
      const connKeys = Array.from(this.#connectionData.keys());
      const connIndex = connKeys.indexOf(conn.id);
      const traceOffset = (connIndex > -1 ? connIndex % 10 : 0) * 4;

      const fromAngle = fromOffset.angle !== undefined ? fromOffset.angle : 0;
      const toAngle = toOffset.angle !== undefined ? toOffset.angle : 180;

      const stubLen = 20;
      const getDxDy = (deg) => ({
        dx: Math.round(Math.cos(deg * Math.PI / 180)),
        dy: Math.round(Math.sin(deg * Math.PI / 180))
      });

      const fDir = getDxDy(fromAngle);
      const tDir = getDxDy(toAngle);

      const p1x = startX + fDir.dx * stubLen;
      const p1y = startY + fDir.dy * stubLen;
      const p2x = endX + tDir.dx * stubLen;
      const p2y = endY + tDir.dy * stubLen;

      const fromH = fromEl._cachedH || 60;
      const toH = toEl._cachedH || 60;

      let pts = [{x: startX, y: startY}, {x: p1x, y: p1y}];

      if (endX < startX) {
          const bottomY = Math.max(fromPos.y + fromH, toPos.y + toH) + 30 + traceOffset;
          pts.push({x: p1x, y: bottomY});
          pts.push({x: p2x, y: bottomY});
      } else {
          const maxH = Math.max(fromH, toH);
          if (Math.abs(p1y - p2y) < maxH) {
              let nodeBetween = false;
              for (const [, node] of this.#nodeViews) {
                  if (!node._position) continue;
                  const nx = node._position.x;
                  const ny = node._position.y;
                  const nw = node._cachedW || 180;
                  const nh = node._cachedH || 60;
                  if (nx > p1x && nx + nw < p2x) {
                      if (Math.min(p1y, p2y) <= ny + nh && Math.max(p1y, p2y) >= ny) {
                          nodeBetween = true; break;
                      }
                  }
              }
              
              if (nodeBetween) {
                  const detourY = Math.min(fromPos.y, toPos.y) - 30 - traceOffset;
                  pts.push({x: p1x, y: detourY});
                  pts.push({x: p2x, y: detourY});
              } else {
                  const midX = (p1x + p2x) / 2 + traceOffset;
                  pts.push({x: midX, y: p1y});
                  pts.push({x: midX, y: p2y});
              }
          } else {
              let midX = (p1x + p2x) / 2 + traceOffset;
              let obstacleNode = null;
              const minY = Math.min(p1y, p2y);
              const maxY = Math.max(p1y, p2y);
              
              for (const [, node] of this.#nodeViews) {
                  if (!node._position) continue;
                  const nx = node._position.x;
                  const ny = node._position.y;
                  const nw = node._cachedW || 180;
                  const nh = node._cachedH || 60;
                  if (midX >= nx && midX <= nx + nw) {
                      if (ny <= maxY && ny + nh >= minY) {
                          obstacleNode = {x: nx, w: nw};
                          break;
                      }
                  }
              }
              
              if (obstacleNode) {
                  const leftDist = Math.abs(midX - obstacleNode.x);
                  const rightDist = Math.abs(midX - (obstacleNode.x + obstacleNode.w));
                  if (leftDist < rightDist) {
                      midX = obstacleNode.x - 30 - traceOffset;
                  } else {
                      midX = obstacleNode.x + obstacleNode.w + 30 + traceOffset;
                  }
              }
              
              pts.push({x: midX, y: p1y});
              pts.push({x: midX, y: p2y});
          }
      }

      pts.push({x: p2x, y: p2y});
      pts.push({x: endX, y: endY});

      let path = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) {
          const prev = pts[i-1];
          const curr = pts[i];
          if (curr.x === prev.x && curr.y === prev.y) continue;
          if (curr.x !== prev.x && curr.y !== prev.y) {
              path += ` H ${curr.x} V ${curr.y}`;
          } else if (curr.x !== prev.x) {
              path += ` H ${curr.x}`;
          } else if (curr.y !== prev.y) {
              path += ` V ${curr.y}`;
          }
      }
      d = path;
    } else if (this.#pathStyle === 'pcb') {
      // ─── PCB Grid-Based Trace Routing ───
      // All waypoints snap to a grid. Stubs exit perpendicular to node surface
      // with a minimum length, then route on grid channels with chamfered corners.

      const TRACE_GRID = 5;  // Dense trace grid (5px)
      const STUB_MIN = 20;   // minimum perpendicular stub from node edge
      const CHAMFER = 8;     // 45° chamfer radius (px)

      // Snap a coordinate to the trace grid
      const snapGrid = (v) => Math.round(v / TRACE_GRID) * TRACE_GRID;

      // Connection channel index for parallel trace separation
      const connKeys = Array.from(this.#connectionData.keys());
      const connIndex = connKeys.indexOf(conn.id);
      
      // Determine unique channel shift to prevent parallel traces overlapping
      // Alternates: 0, +5, -5, +10, -10...
      const shiftIndex = (connIndex > -1 ? connIndex % 12 : 0);
      const channelShift = (shiftIndex % 2 === 0 ? 1 : -1) * Math.ceil(shiftIndex / 2) * TRACE_GRID;

      // Compute perpendicular stub directions from surface normals
      const fromAngle = fromOffset.angle !== undefined ? fromOffset.angle : 0;
      const toAngle = toOffset.angle !== undefined ? toOffset.angle : 180;

      // Snap angle to cardinal direction (→ ↓ ← ↑)
      const snapDir = (deg) => {
        const r = ((deg % 360) + 360) % 360;
        if (r < 45 || r >= 315) return { dx: 1, dy: 0 };     // right
        if (r >= 45 && r < 135)  return { dx: 0, dy: 1 };     // down
        if (r >= 135 && r < 225) return { dx: -1, dy: 0 };    // left
        return { dx: 0, dy: -1 };                              // up
      };

      const fDir = snapDir(fromAngle);
      const tDir = snapDir(toAngle);

      // Stub endpoints: extend strictly perpedicular, no grid snapping on the orthogonal axis
      // to avoid diagonal stubs from pins that are floating (not grid aligned).
      const stubFromX = fDir.dx === 0 ? startX : startX + fDir.dx * STUB_MIN;
      const stubFromY = fDir.dy === 0 ? startY : startY + fDir.dy * STUB_MIN;
      const stubToX = tDir.dx === 0 ? endX : endX + tDir.dx * STUB_MIN;
      const stubToY = tDir.dy === 0 ? endY : endY + tDir.dy * STUB_MIN;

      const fromH = fromEl.offsetHeight || 60;
      const toH = toEl.offsetHeight || 60;

      // Build orthogonal waypoints on grid
      let pts = [
        { x: startX, y: startY },
        { x: stubFromX, y: stubFromY },
      ];

      // Very simple heuristic orthogonal router
      if (endX < startX - 20) {
        // Backwards routing: U-turn below obstacles in the path
        const minXForObstacle = Math.min(stubFromX, stubToX);
        const maxXForObstacle = Math.max(stubFromX, stubToX);
        let maxObstacleY = Math.max(fromPos.y + fromH, toPos.y + toH);

        const iter = this._nodeRectCache ? this._nodeRectCache.values() : [];
        for (const rect of iter) {
            const nx = rect.x;
            const ny = rect.y;
            const nw = rect.w;
            const nh = rect.h;
            // Check if node is in the horizontal path of the detour
            const pad = TRACE_GRID * 2;
            if (nx + nw + pad >= minXForObstacle && nx - pad <= maxXForObstacle) {
                if (ny + nh > maxObstacleY) {
                    maxObstacleY = ny + nh;
                }
            }
        }
        
        // Detour deeply below all nodes in the path to avoid overlaps
        // We use absolute channelShift so tracks stack neatly downward
        const bottomY = snapGrid(maxObstacleY + 30) + Math.abs(channelShift);
        pts.push({ x: stubFromX, y: bottomY });
        pts.push({ x: stubToX, y: bottomY });
      } else {
        // Forward routing: mid-X channel
        let midX = snapGrid((stubFromX + stubToX) / 2) + channelShift;

        // Same-height shortcut: if stubs are roughly aligned (in same track cell), connect via single horizontal
        if (Math.abs(stubFromY - stubToY) < TRACE_GRID * 2) {
          // Keep strictly horizontal
          pts.push({ x: stubToX, y: stubFromY });
        } else {
          // Obstacle check for mid-X vertical segment
          const minY = Math.min(stubFromY, stubToY);
          const maxY = Math.max(stubFromY, stubToY);
          const pad = TRACE_GRID * 4;

          const iter = this._nodeRectCache ? this._nodeRectCache.values() : [];
          for (const rect of iter) {
            if (rect.id === conn.from || rect.id === conn.to) continue;
            const nx = rect.x, ny = rect.y;
            const nw = rect.w, nh = rect.h;
            
            if (midX >= nx - pad && midX <= nx + nw + pad) {
              if (ny - pad <= maxY && ny + nh + pad >= minY) {
                // Detour around obstacle
                const leftX = snapGrid(nx - pad) + channelShift;
                const rightX = snapGrid(nx + nw + pad) + channelShift;
                midX = Math.abs(midX - leftX) < Math.abs(midX - rightX) ? leftX : rightX;
                break;
              }
            }
          }

          pts.push({ x: midX, y: stubFromY });
          pts.push({ x: midX, y: stubToY });
        }
      }

      pts.push({ x: stubToX, y: stubToY });
      pts.push({ x: endX, y: endY });

      // Path building and Chamfering
      let debugCollisions = [];

      // 1. Check if line segments intersect any nodes
      for (let i = 0; i < pts.length - 1; i++) {
        const segX1 = Math.min(pts[i].x, pts[i + 1].x);
        const segY1 = Math.min(pts[i].y, pts[i + 1].y);
        const segX2 = Math.max(pts[i].x, pts[i + 1].x);
        const segY2 = Math.max(pts[i].y, pts[i + 1].y);
        
        const iter = this._nodeRectCache ? this._nodeRectCache.values() : [];
        for (const rect of iter) {
          if (rect.id === conn.from || rect.id === conn.to) continue;
          
          const nx = rect.x, ny = rect.y;
          const nw = rect.w, nh = rect.h;
          
          if (segX1 < nx + nw && segX2 > nx && segY1 < ny + nh && segY2 > ny) {
            debugCollisions.push(`Node Collision: (${pts[i].x},${pts[i].y})->(${pts[i+1].x},${pts[i+1].y}) intersects Node[${rect.id}]`);
          }
        }
      }

      // 2. Self-overlap (180 degree turn)
      for (let i = 0; i < pts.length - 2; i++) {
        const p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2];
        const v1x = p2.x - p1.x, v1y = p2.y - p1.y;
        const v2x = p3.x - p2.x, v2y = p3.y - p2.y;
        if (v1x * v2x < 0 || v1y * v2y < 0) {
           debugCollisions.push(`180° Fold: at (${p2.x},${p2.y}) turning back toward (${p3.x},${p3.y})`);
        }
      }

      // Store generated segments for global overlap checks
      if (!this._allSegments) this._allSegments = [];
      const segments = [];
      for (let i = 0; i < pts.length - 1; i++) {
        segments.push({
          p1: pts[i], p2: pts[i+1],
          connId: conn.id,
          channel: connIndex
        });
      }
      this._allSegments.push(...segments);

      // Log route stats
      if (ConnectionRenderer.debug) {
        const fromLabel = fromEl._nodeData?.label || conn.from;
        const toLabel = toEl._nodeData?.label || conn.to;
        let msg = `[PCB] ${fromLabel} → ${toLabel} | waypoints=${pts.length}`;
        if (debugCollisions.length > 0) {
          msg += ` | ERRS: ` + debugCollisions.join(' | ');
        }
        console.log(msg);
      }

      // Build SVG path with 45° chamfered corners
      let path = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1];
        const curr = pts[i];
        if (Math.abs(curr.x - prev.x) < 0.5 && Math.abs(curr.y - prev.y) < 0.5) continue;

        const next = pts[i + 1];
        if (next) {
          // Determine if there's a turn at curr → need chamfer
          const dx1 = curr.x - prev.x, dy1 = curr.y - prev.y;
          const dx2 = next.x - curr.x, dy2 = next.y - curr.y;
          const isH1 = Math.abs(dx1) > Math.abs(dy1);
          const isH2 = Math.abs(dx2) > Math.abs(dy2);

          if (isH1 !== isH2) {
            // Corner turn — apply 45° chamfer
            const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
            const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
            if (len1 < 1 || len2 < 1) {
              // Degenerate segment — skip chamfer, go straight
              path += ` L ${curr.x} ${curr.y}`;
              continue;
            }
            const c = Math.min(CHAMFER, len1 / 2, len2 / 2);

            // Pre-corner point
            const nx1 = dx1 / len1, ny1 = dy1 / len1;
            const preX = curr.x - nx1 * c;
            const preY = curr.y - ny1 * c;
            // Post-corner point
            const nx2 = dx2 / len2, ny2 = dy2 / len2;
            const postX = curr.x + nx2 * c;
            const postY = curr.y + ny2 * c;

            path += ` L ${preX} ${preY} L ${postX} ${postY}`;
            continue;
          }
        }

        // Straight segment — use H/V for axis-aligned, L for diagonal stubs
        if (Math.abs(curr.y - prev.y) < 0.5) {
          path += ` H ${curr.x}`;
        } else if (Math.abs(curr.x - prev.x) < 0.5) {
          path += ` V ${curr.y}`;
        } else {
          path += ` L ${curr.x} ${curr.y}`;
        }
      }
      d = path;
    } else {
      // Tangent direction: use dynamic edge angle if available, else fixed socket angle
      let fromAngleDeg, toAngleDeg;

      if (fromOffset.angle !== undefined) {
        fromAngleDeg = fromOffset.angle;
      } else {
        const fromPortIndex = fromNode ? Object.keys(fromNode.outputs).indexOf(conn.out) : 0;
        const fromPortTotal = fromNode ? Object.keys(fromNode.outputs).length : 1;
        const pos = fromShape?.getSocketPosition?.('output', fromPortIndex, fromPortTotal, fromSize);
        fromAngleDeg = pos?.angle ?? 0;
      }

      if (toOffset.angle !== undefined) {
        toAngleDeg = toOffset.angle;
      } else {
        const toPortIndex = toNode ? Object.keys(toNode.inputs).indexOf(conn.in) : 0;
        const toPortTotal = toNode ? Object.keys(toNode.inputs).length : 1;
        const pos = toShape?.getSocketPosition?.('input', toPortIndex, toPortTotal, toSize);
        toAngleDeg = pos?.angle ?? 180;
      }

      const dist = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
      const cpLen = Math.max(50, dist * 0.4);
      const fromRad = (fromAngleDeg * Math.PI) / 180;
      const toRad = (toAngleDeg * Math.PI) / 180;

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

    // Determine socket type for visual dot styling
    const outSocketName = fromNode?.outputs?.[conn.out]?.socket?.name || 'data';
    const inSocketName = toNode?.inputs?.[conn.in]?.socket?.name || outSocketName;

    // Endpoint dots with side and type coloring
    this.#updateDot(conn.id, 'start', startX, startY, 'output', outSocketName);
    this.#updateDot(conn.id, 'end', endX, endY, 'input', inSocketName);

    // Direction arrow at wire midpoint
    this.#updateArrow(conn.id, d);
  }

  /**
   * Create or update a small circle dot at a connector endpoint
   * @param {string} connId
   * @param {'start'|'end'} end
   * @param {number} x
   * @param {number} y
   * @param {'input'|'output'} side
   * @param {string} socketType
   */
  #updateDot(connId, end, x, y, side = 'output', socketType = 'data') {
    const dotId = `${connId}-${end}`;
    let dot = this.#dotLayer.querySelector(`[data-conn-dot="${dotId}"]`);
    if (!dot) {
      dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('data-conn-dot', dotId);
      dot.setAttribute('r', '5');
      this.#dotLayer.appendChild(dot);
    }
    dot.setAttribute('cx', x);
    dot.setAttribute('cy', y);

    // Dots are hidden by default (CSS). Only show for SVG nodes.
    // Runs on every update to handle timing — NodeViewManager may set
    // data-svg-shape after initial connection render
    if (!dot.hasAttribute('data-svg-wired')) {
      const conn = this.#connectionData.get(connId);
      if (conn) {
        const nodeId = end === 'start' ? conn.from : conn.to;
        const nodeEl = this.#nodeViews.get(nodeId);
        if (nodeEl?.hasAttribute('data-svg-shape')) {
          dot.setAttribute('data-svg-wired', '');
          dot.style.display = '';
          if (this.#onDotDrag) {
            dot.style.pointerEvents = 'auto';
            dot.style.cursor = 'crosshair';
            dot.addEventListener('pointerdown', (e) => {
              e.stopPropagation();
              e.preventDefault();
              const dotX = parseFloat(dot.getAttribute('cx')) || 0;
              const dotY = parseFloat(dot.getAttribute('cy')) || 0;
              const socketData = end === 'start'
                ? { nodeId: conn.from, key: conn.out, side: 'output', worldX: dotX, worldY: dotY }
                : { nodeId: conn.to, key: conn.in, side: 'input', worldX: dotX, worldY: dotY };
              this.#onDotDrag(socketData);
            });
          }
        }
      }
    }

    // Classify socket type
    let typeClass = 'sn-dot-data';
    if (socketType === 'exec' || socketType === 'execution' || socketType === 'trigger') {
      typeClass = 'sn-dot-exec';
    } else if (socketType === 'ctrl' || socketType === 'control' || socketType === 'signal') {
      typeClass = 'sn-dot-ctrl';
    }
    const sideClass = side === 'input' ? 'sn-dot-input' : 'sn-dot-output';
    dot.setAttribute('class', `sn-conn-dot ${sideClass} ${typeClass}`);
  }

  /**
   * Create or update a direction arrow at the midpoint of a bezier path
   * @param {string} connId
   * @param {string} pathD - SVG path d attribute
   */
  #updateArrow(connId, pathD) {
    // Universal midpoint calculation using SVG path API (works for all path styles)
    const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tempPath.setAttribute('d', pathD);

    // Need to briefly attach to DOM for getPointAtLength to work
    this.#svgLayer.appendChild(tempPath);
    const totalLen = tempPath.getTotalLength();
    if (totalLen < 1) {
      tempPath.remove();
      return;
    }

    // Midpoint at 50% of path length
    const mid = tempPath.getPointAtLength(totalLen * 0.5);

    // Tangent: sample two close points (0.5% before/after midpoint)
    const delta = Math.max(0.5, totalLen * 0.005);
    const p1 = tempPath.getPointAtLength(Math.max(0, totalLen * 0.5 - delta));
    const p2 = tempPath.getPointAtLength(Math.min(totalLen, totalLen * 0.5 + delta));
    tempPath.remove();

    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;

    let arrow = this.#svgLayer.querySelector(`[data-conn-arrow="${connId}"]`);
    if (!arrow) {
      arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      arrow.setAttribute('data-conn-arrow', connId);
      arrow.setAttribute('class', 'sn-conn-arrow');
      arrow.setAttribute('points', '-5,-3.5 5,0 -5,3.5');
      this.#svgLayer.appendChild(arrow);
    }
    arrow.setAttribute('transform', `translate(${mid.x},${mid.y}) rotate(${angle})`);
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
  /**
   * Render persistent free dots for all ports of an SVG node.
   * Called after SVG shape setup. Free dots are interactive drag sources.
   * @param {string} nodeId
   */
  renderFreeDots(nodeId) {
    const nodeEl = this.#nodeViews.get(nodeId);
    const node = this.#editor.getNode(nodeId);
    if (!nodeEl || !node) return;

    const shapeName = nodeEl.getAttribute('data-svg-shape') || nodeEl.getAttribute('node-shape');
    const shape = getShape(shapeName);
    if (!shape?.pathData || !shape.getEdgePoint) return;

    const size = { width: nodeEl.offsetWidth || 100, height: nodeEl.offsetHeight || 100 };
    const pos = nodeEl._position;
    if (!pos) return;

    // Collect already-connected port keys
    const connectedPorts = new Set();
    for (const [, conn] of this.#connectionData) {
      if (conn.from === nodeId) connectedPorts.add(`output:${conn.out}`);
      if (conn.to === nodeId) connectedPorts.add(`input:${conn.in}`);
    }

    // Ensure collision tracking exists
    if (!nodeEl._usedCoords) nodeEl._usedCoords = [];
    const MIN_PIX = 12;
    const step = Math.PI / 12; // 15° grid

    // Place free dots using edge-point system (same as connections)
    const placeDot = (key, side, baseAngle, portData) => {
      // Find a free position using collision avoidance
      let angle = Math.round(baseAngle / step) * step;
      let nudged = angle;
      let attempts = 0;

      while (attempts < 24) {
        const testPos = shape.getEdgePoint(nudged, size);
        const tooClose = nodeEl._usedCoords.some(
          c => Math.abs(testPos.x - c.x) < MIN_PIX && Math.abs(testPos.y - c.y) < MIN_PIX
        );
        if (!tooClose) break;
        attempts++;
        const offset = Math.ceil(attempts / 2) * step;
        const dir = (attempts % 2 === 1) ? 1 : -1;
        nudged = angle + dir * offset;
      }

      const ep = shape.getEdgePoint(nudged, size);
      nodeEl._usedCoords.push({ x: ep.x, y: ep.y });

      this.#createFreeDot(nodeId, key, side, pos.x + ep.x, pos.y + ep.y, portData);
    };

    // Render dots for unconnected inputs (left side baseline angle = π)
    const inputKeys = Object.keys(node.inputs);
    inputKeys.forEach((key, i) => {
      if (connectedPorts.has(`input:${key}`)) return;
      const spread = Math.PI * 0.4;
      const baseAngle = Math.PI + (inputKeys.length > 1
        ? (i / (inputKeys.length - 1) - 0.5) * spread
        : 0);
      placeDot(key, 'input', baseAngle, node.inputs[key]);
    });

    // Render dots for unconnected outputs (right side baseline angle = 0)
    const outputKeys = Object.keys(node.outputs);
    outputKeys.forEach((key, i) => {
      if (connectedPorts.has(`output:${key}`)) return;
      const spread = Math.PI * 0.4;
      const baseAngle = 0 + (outputKeys.length > 1
        ? (i / (outputKeys.length - 1) - 0.5) * spread
        : 0);
      placeDot(key, 'output', baseAngle, node.outputs[key]);
    });
  }

  /**
   * Create a single free dot element
   * @param {string} nodeId
   * @param {string} key
   * @param {'input'|'output'} side
   * @param {number} wx - world X
   * @param {number} wy - world Y
   * @param {object} portData - Input/Output instance
   */
  #createFreeDot(nodeId, key, side, wx, wy, portData) {
    const dotId = `free-${nodeId}-${side}-${key}`;
    // Skip if already exists
    if (this.#dotLayer.querySelector(`[data-free-dot="${dotId}"]`)) return;

    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('data-free-dot', dotId);
    dot.setAttribute('data-node-id', nodeId);
    dot.setAttribute('data-port-key', key);
    dot.setAttribute('data-port-side', side);
    dot.setAttribute('r', '4');
    dot.setAttribute('cx', wx);
    dot.setAttribute('cy', wy);
    dot.style.pointerEvents = 'auto';
    dot.style.cursor = 'crosshair';

    const socketName = portData?.socket?.name || 'data';
    let typeClass = 'sn-dot-data';
    if (socketName === 'exec' || socketName === 'execution' || socketName === 'trigger') {
      typeClass = 'sn-dot-exec';
    } else if (socketName === 'ctrl' || socketName === 'control' || socketName === 'signal') {
      typeClass = 'sn-dot-ctrl';
    }
    const sideClass = side === 'input' ? 'sn-dot-input' : 'sn-dot-output';
    dot.setAttribute('class', `sn-free-dot ${sideClass} ${typeClass}`);

    if (this.#onDotDrag) {
      dot.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.#onDotDrag({
          nodeId,
          key,
          side,
          worldX: parseFloat(dot.getAttribute('cx')) || 0,
          worldY: parseFloat(dot.getAttribute('cy')) || 0,
        });
      });
    }

    this.#dotLayer.appendChild(dot);
  }

  /**
   * Remove free dot when a connection fills this port
   * @param {string} nodeId
   * @param {string} key
   * @param {'input'|'output'} side
   */
  removeFreeDot(nodeId, key, side) {
    const dotId = `free-${nodeId}-${side}-${key}`;
    const dot = this.#dotLayer.querySelector(`[data-free-dot="${dotId}"]`);
    if (dot) dot.remove();
  }

  /**
   * Refresh free dot positions after node move (updates coords without recreating)
   * @param {string} nodeId
   */
  refreshFreeDots(nodeId) {
    const dots = this.#dotLayer.querySelectorAll(`[data-node-id="${nodeId}"][data-free-dot]`);
    if (!dots.length) {
      // No dots yet — initial render (position was likely missing at shape setup time)
      this.renderFreeDots(nodeId);
      return;
    }

    const nodeEl = this.#nodeViews.get(nodeId);
    const node = this.#editor.getNode(nodeId);
    if (!nodeEl || !node) return;

    const shapeName = nodeEl.getAttribute('data-svg-shape') || nodeEl.getAttribute('node-shape');
    const shape = getShape(shapeName);
    if (!shape?.pathData) return;

    const size = { width: nodeEl.offsetWidth || 100, height: nodeEl.offsetHeight || 100 };
    const pos = nodeEl._position;
    if (!pos) return;

    for (const dot of dots) {
      const key = dot.getAttribute('data-port-key');
      const side = dot.getAttribute('data-port-side');
      const ports = side === 'output' ? node.outputs : node.inputs;
      const keys = Object.keys(ports);
      const index = keys.indexOf(key);
      if (index < 0) continue;
      const sp = shape.getSocketPosition(side, index, keys.length, size);
      dot.setAttribute('cx', pos.x + sp.x);
      dot.setAttribute('cy', pos.y + sp.y);
    }
  }

  /**
   * Find nearest SVG dot (free or connected) to world position within radius.
   * Used as drop target for connections.
   * @param {number} wx - world X
   * @param {number} wy - world Y
   * @param {number} [radius=20] - search radius in world units
   * @returns {{ nodeId: string, key: string, side: string }|null}
   */
  findNearestDot(wx, wy, radius = 20) {
    let bestDist = radius;
    let best = null;

    // Search free dots
    const freeDots = this.#dotLayer.querySelectorAll('[data-free-dot]');
    for (const dot of freeDots) {
      const cx = parseFloat(dot.getAttribute('cx')) || 0;
      const cy = parseFloat(dot.getAttribute('cy')) || 0;
      const dist = Math.hypot(cx - wx, cy - wy);
      if (dist < bestDist) {
        bestDist = dist;
        best = {
          nodeId: dot.getAttribute('data-node-id'),
          key: dot.getAttribute('data-port-key'),
          side: dot.getAttribute('data-port-side'),
        };
      }
    }

    // Search connected SVG dots
    const wiredDots = this.#dotLayer.querySelectorAll('[data-svg-wired=""]');
    for (const dot of wiredDots) {
      const cx = parseFloat(dot.getAttribute('cx')) || 0;
      const cy = parseFloat(dot.getAttribute('cy')) || 0;
      const dist = Math.hypot(cx - wx, cy - wy);
      if (dist < bestDist) {
        bestDist = dist;
        const connDotId = dot.getAttribute('data-conn-dot');
        // Parse connDotId: "connId-start" or "connId-end"
        const isStart = connDotId.endsWith('-start');
        const connId = connDotId.replace(/-(?:start|end)$/, '');
        const conn = this.#connectionData.get(connId);
        if (conn) {
          best = {
            nodeId: isStart ? conn.from : conn.to,
            key: isStart ? conn.out : conn.in,
            side: isStart ? 'output' : 'input',
          };
        }
      }
    }

    return best;
  }
}

/** @type {boolean} Set to true to enable debug logging for pin placement and routing */
ConnectionRenderer.debug = false;
