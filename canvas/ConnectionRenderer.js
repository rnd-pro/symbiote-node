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
    let allNodes = new Set(nodeIds);
    let conns = [];
    for (const [, conn] of this.#connectionData) {
      if (nodeIds.has(conn.from) || nodeIds.has(conn.to)) {
        allNodes.add(conn.from);
        allNodes.add(conn.to);
        conns.push(conn);
      }
    }
    for (const nid of allNodes) {
      let el = this.#nodeViews.get(nid);
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
    let fromId = conn.from;
    let toId = conn.to;
    this.#connectionData.delete(conn.id);
    let path = this.#svgLayer.querySelector(`[data-conn-id="${conn.id}"]`);
    if (path) {
      // Fade out using existing CSS opacity transition
      path.style.opacity = '0';
      path.addEventListener('transitionend', () => path.remove(), { once: true });
      // Fallback removal if transition doesn't fire
      setTimeout(() => { if (path.parentNode) path.remove(); }, 200);
    }
    // Remove endpoint dots and arrow
    for (const end of ['start', 'end']) {
      let dot = this.#dotLayer.querySelector(`[data-conn-dot="${conn.id}-${end}"]`);
      if (dot) dot.remove();
    }
    let arrow = this.#svgLayer.querySelector(`[data-conn-arrow="${conn.id}"]`);
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
    let connDots = this.#dotLayer.querySelectorAll('.sn-conn-dot');
    for (const dot of connDots) {
      let dotId = dot.getAttribute('data-conn-dot') || '';
      let connId = dotId.replace(/-(?:start|end)$/, '');
      let conn = this.#connectionData.get(connId);
      if (!conn) continue;
      let end = dotId.endsWith('-start') ? 'start' : 'end';
      let nodeId = end === 'start' ? conn.from : conn.to;
      if (compatibleNodeIds.has(nodeId)) {
        dot.classList.add('sn-dot-hint');
      } else {
        dot.classList.remove('sn-dot-hint');
      }
    }

    // Highlight free dots
    let freeDots = this.#dotLayer.querySelectorAll('.sn-free-dot');
    for (const dot of freeDots) {
      let nodeId = dot.getAttribute('data-node-id');
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
    let dots = this.#dotLayer.querySelectorAll('.sn-dot-hint');
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
    let draggedEl = this.#nodeViews.get(nodeId);
    if (draggedEl) {
      draggedEl._usedCoords = [];
      draggedEl._slotCache = new Map();
    }

    // Collect touched connections for re-render
    let touchedConns = [];
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
    let t0 = performance.now();
    ConnectionRenderer._refreshCycleCount = (ConnectionRenderer._refreshCycleCount || 0) + 1;
    
    this.#clearAllSlots();

    // Clear stale free dots from previous render
    let staleDots = this.#dotLayer.querySelectorAll('.sn-free-dot');
    for (const dot of staleDots) dot.remove();

    // Detach layers from layout tree to prevent O(N²) thrashing during Read/Write mix
    let originalSvgDisplay = this.#svgLayer.style.display;
    let originalDotDisplay = this.#dotLayer.style.display;
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

    let conns = Array.from(this.#connectionData.values());

    // ─── Pass 1: Side-Based Pin Assignment ───
    // Group all connection endpoints by node → then by side
    /** @type {Map<string, Array<{portKey: string, portSide: string, targetPos: {x:number, y:number}}>>} */
    let nodeJobs = new Map();

    for (const conn of conns) {
      let fromEl = this.#nodeViews.get(conn.from);
      let toEl = this.#nodeViews.get(conn.to);
      if (!fromEl || !toEl) continue;

      let fromPos = fromEl._position;
      let toPos = toEl._position;
      if (!fromPos || !toPos) continue;

      let toCenter = {
        x: toPos.x + (toEl._cachedW || 180) / 2,
        y: toPos.y + (toEl._cachedH || 100) / 2,
      };
      let fromCenter = {
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
      let el = this.#nodeViews.get(nodeId);
      if (!el?._position) continue;

      let shape = getShape(el.getAttribute('node-shape'));
      if (!shape?.getSidePosition) continue;

      let size = { width: el._cachedW || 180, height: el._cachedH || 100 };
      let cx = el._position.x + size.width / 2;
      let cy = el._position.y + size.height / 2;

      if (!el._slotCache) el._slotCache = new Map();

      // Step 1: Determine side for each connection
      /** @type {Map<string, Array<{portKey: string, portSide: string, angle: number}>>} */
      let sideBuckets = new Map();
      for (const job of jobs) {
        let dx = job.targetPos.x - cx;
        let dy = job.targetPos.y - cy;
        let angle = Math.atan2(dy, dx);

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
        let total = bucket.length;
        bucket.forEach((item, index) => {
          let t = total === 1 ? 0.5 : index / (total - 1);
          let pos = shape.getSidePosition(nodeSide, t, size);
          let cacheKey = `${item.portKey}:${item.portSide}`;
          el._slotCache.set(cacheKey, { x: pos.x, y: pos.y, angle: pos.angle });

          if (ConnectionRenderer.debug) {
            let label = el._nodeData?.label || nodeId;
            console.log(`🔄 [PIN] ${label} | ${item.portSide}:${item.portKey} → side=${nodeSide} t=${t.toFixed(2)} pos=(${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}) angle=${pos.angle}°`);
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
          let s1 = this._allSegments[i];
          let s2 = this._allSegments[j];
          if (s1.connId === s2.connId) continue;
          
          // Check if both are horizontal
          if (s1.p1.y === s1.p2.y && s2.p1.y === s2.p2.y && s1.p1.y === s2.p1.y) {
            let minX1 = Math.min(s1.p1.x, s1.p2.x), maxX1 = Math.max(s1.p1.x, s1.p2.x);
            let minX2 = Math.min(s2.p1.x, s2.p2.x), maxX2 = Math.max(s2.p1.x, s2.p2.x);
            if (Math.max(minX1, minX2) + 5 < Math.min(maxX1, maxX2)) {
              console.log(`🟡 [PCB DEBUG] Trace Overlap (Horizontal) Y=${s1.p1.y}: conn[${s1.connId}] overlaps conn[${s2.connId}]`);
              overlaps++;
            }
          }
          // Check if both are vertical
          if (s1.p1.x === s1.p2.x && s2.p1.x === s2.p2.x && s1.p1.x === s2.p1.x) {
            let minY1 = Math.min(s1.p1.y, s1.p2.y), maxY1 = Math.max(s1.p1.y, s1.p2.y);
            let minY2 = Math.min(s2.p1.y, s2.p2.y), maxY2 = Math.max(s2.p1.y, s2.p2.y);
            if (Math.max(minY1, minY2) + 5 < Math.min(maxY1, maxY2)) {
              console.log(`🟡 [PCB DEBUG] Trace Overlap (Vertical) X=${s1.p1.x}: conn[${s1.connId}] overlaps conn[${s2.connId}]`);
              overlaps++;
            }
          }
        }
      }
      if (overlaps > 0) console.log(`🟡 [PCB DEBUG] Found ${overlaps} inter-trace overlaps.`);
    }
    this._allSegments = null;
    this._nodeRectCache = null;

    // Restore layers
    this.#svgLayer.style.display = originalSvgDisplay;
    this.#dotLayer.style.display = originalDotDisplay;

    // ─── Performance Monitoring ───
    if (ConnectionRenderer.debug) {
      let t1 = performance.now();
      let mem = (performance?.memory?.usedJSHeapSize) 
        ? (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + 'MB' 
        : 'N/A';
      console.log(`🔄 [PCB PERF] refreshAll cycle #${ConnectionRenderer._refreshCycleCount} took ${(t1 - t0).toFixed(2)}ms | Mem: ${mem}`);
      
      let dt = t0 - (ConnectionRenderer._lastRefreshTime || 0);
      if (ConnectionRenderer._lastRefreshTime > 0 && dt < 16) {
        console.log(`🟡 [PCB PERF] High refresh rate detected! dt=${dt.toFixed(2)}ms (possible rendering loop or layout oscillation)`);
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
    let path = this.#svgLayer.querySelector(`[data-conn-id="${connId}"]`);
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
    let shape = getShape(nodeEl.getAttribute('node-shape'));
    let nodeData = nodeEl._nodeData;
    if (shape && shape.pathData && nodeData) {
      let size = { width: nodeEl._cachedW || 180, height: nodeEl._cachedH || 100 };

      // Dynamic mode — side-based pin placement
      if (targetPos && shape.getSidePosition) {
        // Check cache first (set by refreshAll two-pass pipeline)
        if (!nodeEl._slotCache) nodeEl._slotCache = new Map();
        let cacheKey = `${portKey}:${side}`;
        if (nodeEl._slotCache.has(cacheKey)) {
          return nodeEl._slotCache.get(cacheKey);
        }

        // Fallback: immediate side-based calculation (for single-connection render)
        let nodePos = nodeEl._position;
        let cx = nodePos.x + size.width / 2;
        let cy = nodePos.y + size.height / 2;
        let dx = targetPos.x - cx;
        let dy = targetPos.y - cy;

        // Determine side from angle to target
        let nodeSide = Math.abs(dx) > Math.abs(dy)
          ? (dx > 0 ? 'right' : 'left')
          : (dy > 0 ? 'bottom' : 'top');

        let pos = shape.getSidePosition(nodeSide, 0.5, size);
        let result = { x: pos.x, y: pos.y, angle: pos.angle };
        nodeEl._slotCache.set(cacheKey, result);
        return result;
      }

      // Also support getEdgePoint fallback with smart routing
      if (targetPos && shape.getEdgePoint) {
        let ports = side === 'output' ? nodeData.outputs : nodeData.inputs;
        let keys = ports ? Object.keys(ports) : [portKey];
        let index = keys.indexOf(portKey);
        let total = keys.length;

        let nodePos = nodeEl._position;
        let cx = nodePos.x + size.width / 2;
        let cy = nodePos.y + size.height / 2;
        let baseAngle = Math.atan2(targetPos.y - cy, targetPos.x - cx);

        // 1. Separate input/output zones: gap between types
        let sideGap = Math.PI / 6; // 30° gap = one full slot between input/output
        let adjustedBase = baseAngle + (side === 'output' ? -sideGap : sideGap);

        // 2. Anti-crossing: reverse port order based on perpendicular direction
        let dx = targetPos.x - cx;
        let dy = targetPos.y - cy;
        let shouldReverse = (side === 'output') ? (dy < 0) : (dy > 0);
        let effectiveIndex = shouldReverse ? (total - 1 - index) : index;

        // 3. Spread ports around adjusted base angle
        let angle = adjustedBase;
        if (total > 1) {
          let segment = (2 * Math.PI) / (total * 2);
          let offset = (effectiveIndex - (total - 1) / 2) * segment;
          angle = adjustedBase + offset;
        }

        // 4. Quantize to 15° grid for stable discrete movement
        let step = Math.PI / 12; // 15° grid
        angle = Math.round(angle / step) * step;

        // Check cache first
        if (!nodeEl._slotCache) nodeEl._slotCache = new Map();
        let cacheKey = `${portKey}:${side}`;
        if (nodeEl._slotCache.has(cacheKey)) {
          return nodeEl._slotCache.get(cacheKey);
        }

        // 5. Collision avoidance by PIXEL COORDINATES
        if (!nodeEl._usedCoords) nodeEl._usedCoords = [];
        const MIN_PIX = 5;
        let nudged = angle;
        let attempts = 0;
        while (attempts < 24) {
          let testPos = shape.getEdgePoint(nudged, size);
          let tooClose = nodeEl._usedCoords.some(
            c => Math.abs(testPos.x - c.x) < MIN_PIX && Math.abs(testPos.y - c.y) < MIN_PIX
          );
          if (!tooClose) break;
          nudged += step;
          attempts++;
        }

        let pos = shape.getEdgePoint(nudged, size);
        nodeEl._usedCoords.push({ x: pos.x, y: pos.y });
        let result = { x: pos.x, y: pos.y, angle: pos.angle };
        nodeEl._slotCache.set(cacheKey, result);
        return result;
      }
      // Fixed mode: distribute ports at preset angles
      let ports = side === 'output' ? nodeData.outputs : nodeData.inputs;
      if (ports) {
        let keys = Object.keys(ports);
        let index = keys.indexOf(portKey);
        let total = keys.length;
        if (index >= 0) {
          let pos = shape.getSocketPosition(side, index, total, size);
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
    let container = side === 'output'
      ? nodeEl.querySelector('.outputs')
      : nodeEl.querySelector('.inputs');

    if (container) {
      let portItems = container.querySelectorAll('port-item');
      for (const portItem of portItems) {
        if (portItem.$.key === portKey) {
          let socket = portItem.querySelector('.sn-socket');
          if (socket) {
            let nodeRect = nodeEl.getBoundingClientRect();
            let socketRect = socket.getBoundingClientRect();
            let z = this.#getZoom();
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
    let fromEl = this.#nodeViews.get(conn.from);
    let toEl = this.#nodeViews.get(conn.to);
    if (!fromEl || !toEl) return;

    let fromPos = fromEl._position;
    let toPos = toEl._position;

    // Compute centers for dynamic edge positioning on SVG shapes
    let fromW = fromEl._cachedW || fromEl.offsetWidth || 180;
    let fromH = fromEl._cachedH || fromEl.offsetHeight || 100;
    let toW = toEl._cachedW || toEl.offsetWidth || 180;
    let toH = toEl._cachedH || toEl.offsetHeight || 100;
    let fromCenter = {
      x: fromPos.x + fromW / 2,
      y: fromPos.y + fromH / 2,
    };
    let toCenter = {
      x: toPos.x + toW / 2,
      y: toPos.y + toH / 2,
    };

    // Always recalculate both sides (slot pool makes this cheap and deterministic)
    let fromOffset = this.getSocketOffset(fromEl, conn.out, 'output', toCenter);
    let toOffset = this.getSocketOffset(toEl, conn.in, 'input', fromCenter);

    let startX = fromPos.x + fromOffset.x;
    let startY = fromPos.y + fromOffset.y;
    let endX = toPos.x + toOffset.x;
    let endY = toPos.y + toOffset.y;

    // Tangent-aware Bézier using shape angles
    let fromNode = this.#editor.getNode(conn.from);
    let toNode = this.#editor.getNode(conn.to);
    let fromShape = getShape(fromNode?.shape);
    let toShape = getShape(toNode?.shape);

    let fromSize = { width: fromW, height: fromH };
    let toSize = { width: toW, height: toH };

    // Generate path based on style
    let d;
    if (this.#pathStyle === 'straight') {
      d = `M ${startX} ${startY} L ${endX} ${endY}`;
    } else if (this.#pathStyle === 'orthogonal') {
      let connKeys = Array.from(this.#connectionData.keys());
      let connIndex = connKeys.indexOf(conn.id);
      let traceOffset = (connIndex > -1 ? connIndex % 10 : 0) * 4;

      let fromAngle = fromOffset.angle !== undefined ? fromOffset.angle : 0;
      let toAngle = toOffset.angle !== undefined ? toOffset.angle : 180;

      let stubLen = 20;
      let getDxDy = (deg) => ({
        dx: Math.round(Math.cos(deg * Math.PI / 180)),
        dy: Math.round(Math.sin(deg * Math.PI / 180))
      });

      let fDir = getDxDy(fromAngle);
      let tDir = getDxDy(toAngle);

      let p1x = startX + fDir.dx * stubLen;
      let p1y = startY + fDir.dy * stubLen;
      let p2x = endX + tDir.dx * stubLen;
      let p2y = endY + tDir.dy * stubLen;

      let fromH = fromEl._cachedH || 60;
      let toH = toEl._cachedH || 60;

      let pts = [{x: startX, y: startY}, {x: p1x, y: p1y}];

      if (endX < startX) {
          let bottomY = Math.max(fromPos.y + fromH, toPos.y + toH) + 30 + traceOffset;
          pts.push({x: p1x, y: bottomY});
          pts.push({x: p2x, y: bottomY});
      } else {
          let maxH = Math.max(fromH, toH);
          if (Math.abs(p1y - p2y) < maxH) {
              let nodeBetween = false;
              for (const [, node] of this.#nodeViews) {
                  if (!node._position) continue;
                  let nx = node._position.x;
                  let ny = node._position.y;
                  let nw = node._cachedW || 180;
                  let nh = node._cachedH || 60;
                  if (nx > p1x && nx + nw < p2x) {
                      if (Math.min(p1y, p2y) <= ny + nh && Math.max(p1y, p2y) >= ny) {
                          nodeBetween = true; break;
                      }
                  }
              }
              
              if (nodeBetween) {
                  let detourY = Math.min(fromPos.y, toPos.y) - 30 - traceOffset;
                  pts.push({x: p1x, y: detourY});
                  pts.push({x: p2x, y: detourY});
              } else {
                  let midX = (p1x + p2x) / 2 + traceOffset;
                  pts.push({x: midX, y: p1y});
                  pts.push({x: midX, y: p2y});
              }
          } else {
              let midX = (p1x + p2x) / 2 + traceOffset;
              let obstacleNode = null;
              let minY = Math.min(p1y, p2y);
              let maxY = Math.max(p1y, p2y);
              
              for (const [, node] of this.#nodeViews) {
                  if (!node._position) continue;
                  let nx = node._position.x;
                  let ny = node._position.y;
                  let nw = node._cachedW || 180;
                  let nh = node._cachedH || 60;
                  if (midX >= nx && midX <= nx + nw) {
                      if (ny <= maxY && ny + nh >= minY) {
                          obstacleNode = {x: nx, w: nw};
                          break;
                      }
                  }
              }
              
              if (obstacleNode) {
                  let leftDist = Math.abs(midX - obstacleNode.x);
                  let rightDist = Math.abs(midX - (obstacleNode.x + obstacleNode.w));
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
          let prev = pts[i-1];
          let curr = pts[i];
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
      let snapGrid = (v) => Math.round(v / TRACE_GRID) * TRACE_GRID;

      // Connection channel index for parallel trace separation
      let connKeys = Array.from(this.#connectionData.keys());
      let connIndex = connKeys.indexOf(conn.id);
      
      // Determine unique channel shift to prevent parallel traces overlapping
      // Alternates: 0, +5, -5, +10, -10...
      let shiftIndex = (connIndex > -1 ? connIndex % 12 : 0);
      let channelShift = (shiftIndex % 2 === 0 ? 1 : -1) * Math.ceil(shiftIndex / 2) * TRACE_GRID;

      // Compute perpendicular stub directions from surface normals
      let fromAngle = fromOffset.angle !== undefined ? fromOffset.angle : 0;
      let toAngle = toOffset.angle !== undefined ? toOffset.angle : 180;

      // Snap angle to cardinal direction (→ ↓ ← ↑)
      let snapDir = (deg) => {
        let r = ((deg % 360) + 360) % 360;
        if (r < 45 || r >= 315) return { dx: 1, dy: 0 };     // right
        if (r >= 45 && r < 135)  return { dx: 0, dy: 1 };     // down
        if (r >= 135 && r < 225) return { dx: -1, dy: 0 };    // left
        return { dx: 0, dy: -1 };                              // up
      };

      let fDir = snapDir(fromAngle);
      let tDir = snapDir(toAngle);

      // Stub endpoints: extend strictly perpedicular, no grid snapping on the orthogonal axis
      // to avoid diagonal stubs from pins that are floating (not grid aligned).
      let stubFromX = fDir.dx === 0 ? startX : startX + fDir.dx * STUB_MIN;
      let stubFromY = fDir.dy === 0 ? startY : startY + fDir.dy * STUB_MIN;
      let stubToX = tDir.dx === 0 ? endX : endX + tDir.dx * STUB_MIN;
      let stubToY = tDir.dy === 0 ? endY : endY + tDir.dy * STUB_MIN;

      let fromH = fromEl.offsetHeight || 60;
      let toH = toEl.offsetHeight || 60;

      // Build orthogonal waypoints on grid
      let pts = [
        { x: startX, y: startY },
        { x: stubFromX, y: stubFromY },
      ];

      // Very simple heuristic orthogonal router
      if (endX < startX - 20) {
        // Backwards routing: U-turn below obstacles in the path
        let minXForObstacle = Math.min(stubFromX, stubToX);
        let maxXForObstacle = Math.max(stubFromX, stubToX);
        let maxObstacleY = Math.max(fromPos.y + fromH, toPos.y + toH);

        let iter = this._nodeRectCache ? this._nodeRectCache.values() : [];
        for (const rect of iter) {
            let nx = rect.x;
            let ny = rect.y;
            let nw = rect.w;
            let nh = rect.h;
            // Check if node is in the horizontal path of the detour
            let pad = TRACE_GRID * 2;
            if (nx + nw + pad >= minXForObstacle && nx - pad <= maxXForObstacle) {
                if (ny + nh > maxObstacleY) {
                    maxObstacleY = ny + nh;
                }
            }
        }
        
        // Detour deeply below all nodes in the path to avoid overlaps
        // We use absolute channelShift so tracks stack neatly downward
        let bottomY = snapGrid(maxObstacleY + 30) + Math.abs(channelShift);
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
          let minY = Math.min(stubFromY, stubToY);
          let maxY = Math.max(stubFromY, stubToY);
          let pad = TRACE_GRID * 4;

          let iter = this._nodeRectCache ? this._nodeRectCache.values() : [];
          for (const rect of iter) {
            if (rect.id === conn.from || rect.id === conn.to) continue;
            let nx = rect.x, ny = rect.y;
            let nw = rect.w, nh = rect.h;
            
            if (midX >= nx - pad && midX <= nx + nw + pad) {
              if (ny - pad <= maxY && ny + nh + pad >= minY) {
                // Detour around obstacle
                let leftX = snapGrid(nx - pad) + channelShift;
                let rightX = snapGrid(nx + nw + pad) + channelShift;
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
        let segX1 = Math.min(pts[i].x, pts[i + 1].x);
        let segY1 = Math.min(pts[i].y, pts[i + 1].y);
        let segX2 = Math.max(pts[i].x, pts[i + 1].x);
        let segY2 = Math.max(pts[i].y, pts[i + 1].y);
        
        let iter = this._nodeRectCache ? this._nodeRectCache.values() : [];
        for (const rect of iter) {
          if (rect.id === conn.from || rect.id === conn.to) continue;
          
          let nx = rect.x, ny = rect.y;
          let nw = rect.w, nh = rect.h;
          
          if (segX1 < nx + nw && segX2 > nx && segY1 < ny + nh && segY2 > ny) {
            debugCollisions.push(`Node Collision: (${pts[i].x},${pts[i].y})->(${pts[i+1].x},${pts[i+1].y}) intersects Node[${rect.id}]`);
          }
        }
      }

      // 2. Self-overlap (180 degree turn)
      for (let i = 0; i < pts.length - 2; i++) {
        let p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2];
        let v1x = p2.x - p1.x, v1y = p2.y - p1.y;
        let v2x = p3.x - p2.x, v2y = p3.y - p2.y;
        if (v1x * v2x < 0 || v1y * v2y < 0) {
           debugCollisions.push(`180° Fold: at (${p2.x},${p2.y}) turning back toward (${p3.x},${p3.y})`);
        }
      }

      // Store generated segments for global overlap checks
      if (!this._allSegments) this._allSegments = [];
      let segments = [];
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
        let fromLabel = fromEl._nodeData?.label || conn.from;
        let toLabel = toEl._nodeData?.label || conn.to;
        let msg = `[PCB] ${fromLabel} → ${toLabel} | waypoints=${pts.length}`;
        if (debugCollisions.length > 0) {
          msg += ` | ERRS: ` + debugCollisions.join(' | ');
        }
        console.log(msg);
      }

      // Build SVG path with 45° chamfered corners
      let path = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) {
        let prev = pts[i - 1];
        let curr = pts[i];
        if (Math.abs(curr.x - prev.x) < 0.5 && Math.abs(curr.y - prev.y) < 0.5) continue;

        let next = pts[i + 1];
        if (next) {
          // Determine if there's a turn at curr → need chamfer
          let dx1 = curr.x - prev.x, dy1 = curr.y - prev.y;
          let dx2 = next.x - curr.x, dy2 = next.y - curr.y;
          let isH1 = Math.abs(dx1) > Math.abs(dy1);
          let isH2 = Math.abs(dx2) > Math.abs(dy2);

          if (isH1 !== isH2) {
            // Corner turn — apply 45° chamfer
            let len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
            let len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
            if (len1 < 1 || len2 < 1) {
              // Degenerate segment — skip chamfer, go straight
              path += ` L ${curr.x} ${curr.y}`;
              continue;
            }
            let c = Math.min(CHAMFER, len1 / 2, len2 / 2);

            // Pre-corner point
            let nx1 = dx1 / len1, ny1 = dy1 / len1;
            let preX = curr.x - nx1 * c;
            let preY = curr.y - ny1 * c;
            // Post-corner point
            let nx2 = dx2 / len2, ny2 = dy2 / len2;
            let postX = curr.x + nx2 * c;
            let postY = curr.y + ny2 * c;

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
        let fromPortIndex = fromNode ? Object.keys(fromNode.outputs).indexOf(conn.out) : 0;
        let fromPortTotal = fromNode ? Object.keys(fromNode.outputs).length : 1;
        let pos = fromShape?.getSocketPosition?.('output', fromPortIndex, fromPortTotal, fromSize);
        fromAngleDeg = pos?.angle ?? 0;
      }

      if (toOffset.angle !== undefined) {
        toAngleDeg = toOffset.angle;
      } else {
        let toPortIndex = toNode ? Object.keys(toNode.inputs).indexOf(conn.in) : 0;
        let toPortTotal = toNode ? Object.keys(toNode.inputs).length : 1;
        let pos = toShape?.getSocketPosition?.('input', toPortIndex, toPortTotal, toSize);
        toAngleDeg = pos?.angle ?? 180;
      }

      let dist = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
      let cpLen = Math.max(50, dist * 0.4);
      let fromRad = (fromAngleDeg * Math.PI) / 180;
      let toRad = (toAngleDeg * Math.PI) / 180;

      let cp1x = startX + Math.cos(fromRad) * cpLen;
      let cp1y = startY + Math.sin(fromRad) * cpLen;
      let cp2x = endX + Math.cos(toRad) * cpLen;
      let cp2y = endY + Math.sin(toRad) * cpLen;

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
    let fromSocketName = fromNode?.outputs[conn.out]?.socket?.name || 'data';
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
    let outSocketName = fromNode?.outputs?.[conn.out]?.socket?.name || 'data';
    let inSocketName = toNode?.inputs?.[conn.in]?.socket?.name || outSocketName;

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
    let dotId = `${connId}-${end}`;
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
      let conn = this.#connectionData.get(connId);
      if (conn) {
        let nodeId = end === 'start' ? conn.from : conn.to;
        let nodeEl = this.#nodeViews.get(nodeId);
        if (nodeEl?.hasAttribute('data-svg-shape')) {
          dot.setAttribute('data-svg-wired', '');
          dot.style.display = '';
          if (this.#onDotDrag) {
            dot.style.pointerEvents = 'auto';
            dot.style.cursor = 'crosshair';
            dot.addEventListener('pointerdown', (e) => {
              e.stopPropagation();
              e.preventDefault();
              let dotX = parseFloat(dot.getAttribute('cx')) || 0;
              let dotY = parseFloat(dot.getAttribute('cy')) || 0;
              let socketData = end === 'start'
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
    let sideClass = side === 'input' ? 'sn-dot-input' : 'sn-dot-output';
    dot.setAttribute('class', `sn-conn-dot ${sideClass} ${typeClass}`);
  }

  /**
   * Create or update a direction arrow at the midpoint of a bezier path
   * @param {string} connId
   * @param {string} pathD - SVG path d attribute
   */
  #updateArrow(connId, pathD) {
    // Universal midpoint calculation using SVG path API (works for all path styles)
    let tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tempPath.setAttribute('d', pathD);

    // Need to briefly attach to DOM for getPointAtLength to work
    this.#svgLayer.appendChild(tempPath);
    let totalLen = tempPath.getTotalLength();
    if (totalLen < 1) {
      tempPath.remove();
      return;
    }

    // Midpoint at 50% of path length
    let mid = tempPath.getPointAtLength(totalLen * 0.5);

    // Tangent: sample two close points (0.5% before/after midpoint)
    let delta = Math.max(0.5, totalLen * 0.005);
    let p1 = tempPath.getPointAtLength(Math.max(0, totalLen * 0.5 - delta));
    let p2 = tempPath.getPointAtLength(Math.min(totalLen, totalLen * 0.5 + delta));
    tempPath.remove();

    let angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;

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
    let fromColor = fromNode?.outputs[conn.out]?.socket?.color;
    let toColor = toNode?.inputs[conn.in]?.socket?.color;

    if (fromColor && toColor && fromColor !== toColor) {
      let gradId = `grad-${conn.id}`;
      let defs = this.#svgLayer.querySelector('defs');
      if (!defs) {
        defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        this.#svgLayer.prepend(defs);
      }
      let grad = defs.querySelector(`#${gradId}`);
      if (!grad) {
        grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        grad.setAttribute('id', gradId);
        let stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop1.setAttribute('offset', '0%');
        let stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
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
    let nodeEl = this.#nodeViews.get(nodeId);
    let node = this.#editor.getNode(nodeId);
    if (!nodeEl || !node) return;

    let shapeName = nodeEl.getAttribute('data-svg-shape') || nodeEl.getAttribute('node-shape');
    let shape = getShape(shapeName);
    if (!shape?.pathData || !shape.getEdgePoint) return;

    let size = { width: nodeEl.offsetWidth || 100, height: nodeEl.offsetHeight || 100 };
    let pos = nodeEl._position;
    if (!pos) return;

    // Collect already-connected port keys
    let connectedPorts = new Set();
    for (const [, conn] of this.#connectionData) {
      if (conn.from === nodeId) connectedPorts.add(`output:${conn.out}`);
      if (conn.to === nodeId) connectedPorts.add(`input:${conn.in}`);
    }

    // Ensure collision tracking exists
    if (!nodeEl._usedCoords) nodeEl._usedCoords = [];
    const MIN_PIX = 12;
    let step = Math.PI / 12; // 15° grid

    // Place free dots using edge-point system (same as connections)
    let placeDot = (key, side, baseAngle, portData) => {
      // Find a free position using collision avoidance
      let angle = Math.round(baseAngle / step) * step;
      let nudged = angle;
      let attempts = 0;

      while (attempts < 24) {
        let testPos = shape.getEdgePoint(nudged, size);
        let tooClose = nodeEl._usedCoords.some(
          c => Math.abs(testPos.x - c.x) < MIN_PIX && Math.abs(testPos.y - c.y) < MIN_PIX
        );
        if (!tooClose) break;
        attempts++;
        let offset = Math.ceil(attempts / 2) * step;
        let dir = (attempts % 2 === 1) ? 1 : -1;
        nudged = angle + dir * offset;
      }

      let ep = shape.getEdgePoint(nudged, size);
      nodeEl._usedCoords.push({ x: ep.x, y: ep.y });

      this.#createFreeDot(nodeId, key, side, pos.x + ep.x, pos.y + ep.y, portData);
    };

    // Render dots for unconnected inputs (left side baseline angle = π)
    let inputKeys = Object.keys(node.inputs);
    inputKeys.forEach((key, i) => {
      if (connectedPorts.has(`input:${key}`)) return;
      let spread = Math.PI * 0.4;
      let baseAngle = Math.PI + (inputKeys.length > 1
        ? (i / (inputKeys.length - 1) - 0.5) * spread
        : 0);
      placeDot(key, 'input', baseAngle, node.inputs[key]);
    });

    // Render dots for unconnected outputs (right side baseline angle = 0)
    let outputKeys = Object.keys(node.outputs);
    outputKeys.forEach((key, i) => {
      if (connectedPorts.has(`output:${key}`)) return;
      let spread = Math.PI * 0.4;
      let baseAngle = 0 + (outputKeys.length > 1
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
    let dotId = `free-${nodeId}-${side}-${key}`;
    // Skip if already exists
    if (this.#dotLayer.querySelector(`[data-free-dot="${dotId}"]`)) return;

    let dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('data-free-dot', dotId);
    dot.setAttribute('data-node-id', nodeId);
    dot.setAttribute('data-port-key', key);
    dot.setAttribute('data-port-side', side);
    dot.setAttribute('r', '4');
    dot.setAttribute('cx', wx);
    dot.setAttribute('cy', wy);
    dot.style.pointerEvents = 'auto';
    dot.style.cursor = 'crosshair';

    let socketName = portData?.socket?.name || 'data';
    let typeClass = 'sn-dot-data';
    if (socketName === 'exec' || socketName === 'execution' || socketName === 'trigger') {
      typeClass = 'sn-dot-exec';
    } else if (socketName === 'ctrl' || socketName === 'control' || socketName === 'signal') {
      typeClass = 'sn-dot-ctrl';
    }
    let sideClass = side === 'input' ? 'sn-dot-input' : 'sn-dot-output';
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
    let dotId = `free-${nodeId}-${side}-${key}`;
    let dot = this.#dotLayer.querySelector(`[data-free-dot="${dotId}"]`);
    if (dot) dot.remove();
  }

  /**
   * Refresh free dot positions after node move (updates coords without recreating)
   * @param {string} nodeId
   */
  refreshFreeDots(nodeId) {
    let dots = this.#dotLayer.querySelectorAll(`[data-node-id="${nodeId}"][data-free-dot]`);
    if (!dots.length) {
      // No dots yet — initial render (position was likely missing at shape setup time)
      this.renderFreeDots(nodeId);
      return;
    }

    let nodeEl = this.#nodeViews.get(nodeId);
    let node = this.#editor.getNode(nodeId);
    if (!nodeEl || !node) return;

    let shapeName = nodeEl.getAttribute('data-svg-shape') || nodeEl.getAttribute('node-shape');
    let shape = getShape(shapeName);
    if (!shape?.pathData) return;

    let size = { width: nodeEl.offsetWidth || 100, height: nodeEl.offsetHeight || 100 };
    let pos = nodeEl._position;
    if (!pos) return;

    for (const dot of dots) {
      let key = dot.getAttribute('data-port-key');
      let side = dot.getAttribute('data-port-side');
      let ports = side === 'output' ? node.outputs : node.inputs;
      let keys = Object.keys(ports);
      let index = keys.indexOf(key);
      if (index < 0) continue;
      let sp = shape.getSocketPosition(side, index, keys.length, size);
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
    let freeDots = this.#dotLayer.querySelectorAll('[data-free-dot]');
    for (const dot of freeDots) {
      let cx = parseFloat(dot.getAttribute('cx')) || 0;
      let cy = parseFloat(dot.getAttribute('cy')) || 0;
      let dist = Math.hypot(cx - wx, cy - wy);
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
    let wiredDots = this.#dotLayer.querySelectorAll('[data-svg-wired=""]');
    for (const dot of wiredDots) {
      let cx = parseFloat(dot.getAttribute('cx')) || 0;
      let cy = parseFloat(dot.getAttribute('cy')) || 0;
      let dist = Math.hypot(cx - wx, cy - wy);
      if (dist < bestDist) {
        bestDist = dist;
        let connDotId = dot.getAttribute('data-conn-dot');
        // Parse connDotId: "connId-start" or "connId-end"
        let isStart = connDotId.endsWith('-start');
        let connId = connDotId.replace(/-(?:start|end)$/, '');
        let conn = this.#connectionData.get(connId);
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
