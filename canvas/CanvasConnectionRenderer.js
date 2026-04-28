import { getShape } from '../shapes/index.js';

/**
 * Parallel support for connection rendering via HTML5 Canvas API.
 * This is used to test performance against the DOM-bound SVG renderer.
 */
export class CanvasConnectionRenderer {
  #canvasLayer;
  #dotLayer;
  #nodeViews;
  #editor;
  #onConnectionClick;
  #getZoom;
  #getPan;
  #onDotDrag;

  #pathStyle = 'bezier';
  #connectionData = new Map();
  #ctx;
  #resizeObserver;
  #animationFrameId;
  #batchMode = false;
  #batchDirty = false;

  /** @type {Array<{id:string, x:number, y:number, w:number, h:number, degree:number, color:string, label:string}>} */
  #phantomNodes = [];
  /** @type {Map<string, Object>} Fast lookup for phantom proxy by nodeId */
  #phantomMap = new Map();

  // Computed styles matching the theme
  #colorParams = {
    normal: '#4a9eff',
    selected: '#ff6b6b',
    width: 2,
    flowingColor: '#4a9eff', // We use --sn-conn-color directly
  };

  /**
   * @param {Object} config
   * @param {HTMLCanvasElement} config.canvasLayer
   * @param {HTMLElement} config.dotLayer
   * @param {Map<string, HTMLElement>} config.nodeViews
   * @param {import('../core/GraphEditor.js').GraphEditor} config.editor
   * @param {function(string, MouseEvent)} config.onConnectionClick
   * @param {function(): number} config.getZoom
   * @param {function(): {x: number, y: number}} config.getPan
   * @param {function(Object)} config.onDotDrag
   */
  constructor(config = {}) {
    this.#canvasLayer = config.canvasLayer || document.createElement('canvas');
    this.#dotLayer = config.dotLayer;
    this.#nodeViews = config.nodeViews;
    this.#editor = config.editor;
    this.#onConnectionClick = config.onConnectionClick;
    this.#getZoom = config.getZoom || (() => 1);
    this.#getPan = config.getPan || (() => ({ x: 0, y: 0 }));
    this.#onDotDrag = config.onDotDrag;

    this.#ctx = this.#canvasLayer.getContext('2d', { alpha: true, desynchronized: false });
    this.#initResizeObserver();
    this.#updateStyles();

    // Start render loop for flow animations (if flowing exists)
    this.#animationFrameId = requestAnimationFrame(this.#renderLoop);
  }

  /**
   * Resize observer to keep the canvas 1:1 with device pixels
   */
  #initResizeObserver() {
    let parent = this.#canvasLayer.parentElement;
    if (!parent) return;

    this.#resizeObserver = new ResizeObserver((entries) => {
      let rect = entries[0].contentRect;
      let dpr = window.devicePixelRatio || 1;

      this.#canvasLayer.width = rect.width * dpr;
      this.#canvasLayer.height = rect.height * dpr;

      this.redraw();
    });

    this.#resizeObserver.observe(parent);
  }

  #updateStyles() {
    let computed = getComputedStyle(document.body);
    this.#colorParams.normal = computed.getPropertyValue('--sn-conn-color').trim() || '#4a9eff';
    this.#colorParams.selected = computed.getPropertyValue('--sn-conn-selected').trim() || '#ff6b6b';
    this.#colorParams.outline = computed.getPropertyValue('--sn-port-outline').trim() || '#16213e';
    this.#colorParams.bg = computed.getPropertyValue('--sn-bg').trim() || '#1a1a2e';
    this.#colorParams.width = parseFloat(computed.getPropertyValue('--sn-conn-width')) || 2;
  }

  /** @param {'bezier'|'orthogonal'|'straight'|'pcb'} style */
  setPathStyle(style) {
    this.#pathStyle = style;
    this.redraw();
  }

  get data() {
    return this.#connectionData;
  }

  addBatch(conns) {
    for (const conn of conns) {
      this.#connectionData.set(conn.id, conn);
    }
    this.redraw();
  }

  refreshAll() {
    this.redraw();
  }

  add(conn) {
    this.#connectionData.set(conn.id, conn);
    this.redraw();
  }

  remove(conn) {
    this.#connectionData.delete(conn.id);
    this.redraw();
  }

  updateForNode(nodeId) {
    this.redraw();
  }

  setFlowing(connId, active) {
    let conn = this.#connectionData.get(connId);
    if (conn) conn.flowing = active;
  }

  setAllFlowing(active) {
    for (const conn of this.#connectionData.values()) {
      conn.flowing = active;
    }
  }

  setPathStyle(style) {
    this.#pathStyle = style;
    this.redraw();
  }

  highlightDotsForNodes(compatibleNodeIds) { }
  clearDotHighlights() { }
  renderFreeDots(nodeId) { }
  removeFreeDot(nodeId, key, side) { }
  refreshFreeDots(nodeId) { }
  findNearestDot(wx, wy, radius = 20) { return null; }

  clear() {
    this.#connectionData.clear();
    this.#phantomNodes = [];
    this.#phantomMap.clear();
    this.redraw();
  }

  // #phantomMap moved to class field declarations (line 25)

  /**
   * Set phantom nodes — nodes without DOM that are rendered as Canvas dots.
   * @param {Array<{id:string, x:number, y:number, w:number, h:number, degree:number, color:string, label:string}>} nodes
   */
  setPhantomNodes(nodes) {
    this.#phantomNodes = nodes || [];
    this.#phantomMap.clear();
    for (const n of this.#phantomNodes) {
      this.#phantomMap.set(n.id, n);
    }
    this.redraw();
  }

  /** Retrieve actual connector coordinate relative to the origin */
  getSocketOffset(nodeEl, portKey, side, targetPos) {
    if (!nodeEl) return { x: 0, y: 0 };
    let w = nodeEl._cachedW || nodeEl.offsetWidth || 180;
    let h = nodeEl._cachedH || nodeEl.offsetHeight || 100;

    let basePortX = side === 'output' ? w : 0;

    // Fast path: cached layout coords for the node
    if (nodeEl._slotCache && nodeEl._slotCache.has(portKey)) {
      let cached = nodeEl._slotCache.get(portKey);
      return {
        x: cached.x,
        y: cached.y,
        angle: cached.angle
      };
    }

    let nodeModel = this.#editor?.getNode(nodeEl.id);
    let isParamNode = nodeModel?.type === 'param';
    let portIndex = 0;
    let totalPorts = 1;

    if (nodeModel && nodeModel.type !== 'param') {
      let portsData = side === 'output' ? nodeModel.outputs : nodeModel.inputs;
      if (portsData) {
        let keys = Object.keys(portsData);
        totalPorts = keys.length || 1;
        let idx = keys.indexOf(portKey);
        if (idx !== -1) portIndex = idx;
      }
    }

    // Delegate to UniversalSvgShape if defined and handles geometric coordinates (SVGShape)
    let shapeConfig = getShape(nodeModel?.shape);
    if (shapeConfig && shapeConfig.pathData && shapeConfig.getSocketPosition) {
      let pos = shapeConfig.getSocketPosition(side, portIndex, totalPorts, { width: w, height: h }, targetPos);
      if (pos) return pos;
    }

    // Standard shapes: read from DOM socket elements
    let container = side === 'output'
      ? nodeEl.querySelector('.outputs')
      : nodeEl.querySelector('.inputs');

    if (container) {
      let portItems = container.querySelectorAll('port-item');
      for (const portItem of portItems) {
        if (String(portItem.$.key) === String(portKey)) {
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

  #hasSelection = false;
  #activeConnIds = new Set();

  setSelectionState(hasSelection, activeConnIds) {
    this.#hasSelection = hasSelection;
    this.#activeConnIds = activeConnIds;
    this.redraw();
  }

  /** Suppress redraws during batch operations (e.g. setEditor initialization) */
  setBatchMode(on) {
    this.#batchMode = on;
    if (!on && this.#batchDirty) {
      this.#batchDirty = false;
      this.redraw();
    }
  }

  /** Perform full synchronous redraw of all connections */
  redraw() {
    if (this.#batchMode) { this.#batchDirty = true; return; }
    let ctx = this.#ctx;
    if (!ctx) return;

    // Reset and clear with devicePixelRatio
    let dpr = window.devicePixelRatio || 1;
    let zoom = this.#getZoom();
    this._frameZoom = zoom; // cache for #plotPath LOD
    let pan = this.#getPan();

    // Reset transform to identity to clear the raw screen buffer
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.#canvasLayer.width, this.#canvasLayer.height);

    // Set view transform: Map World coordinates -> Screen coordinates
    ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * pan.x, dpr * pan.y);

    // Update theme vars
    this.#updateStyles();

    let time = Date.now();
    let hasFlowing = false;


    // Cache node layout geometry once per frame for the router (Map for O(1) lookup)
    this._nodeRectMap = new Map();
    for (const [nid, el] of this.#nodeViews) {
      if (el && el._position) {
        this._nodeRectMap.set(nid, {
          id: nid,
          x: el._position.x,
          y: el._position.y,
          w: el._cachedW || 180,
          h: el._cachedH || 60,
          el: el
        });
      }
    }
    // Include phantom nodes in geometry cache for FAR_ZOOM routing
    for (const node of this.#phantomNodes) {
      if (node && !this._nodeRectMap.has(node.id)) {
        this._nodeRectMap.set(node.id, {
          id: node.id,
          x: node.x || 0,
          y: node.y || 0,
          w: node.w || 180,
          h: node.h || 60,
          el: null
        });
      }
    }

    // Pre-compute connection index once per frame (avoids O(N²) Array.from+indexOf in routing)
    let connIndexMap = new Map();
    let ci = 0;
    for (const key of this.#connectionData.keys()) {
      connIndexMap.set(key, ci++);
    }
    this._connIndexMap = connIndexMap;

    // Collect connected sockets to draw caps over them (fixes DOM/Canvas sub-pixel drift seams)
    let socketsToDraw = new Map();

    let drawConnection = (id, connection) => {
      // Draw connection
      let isFlowing = connection.flowing;
      let isActive = this.#activeConnIds ? this.#activeConnIds.has(connection.id) : false;
      let isSelected = isActive;
      let isDimmed = !isActive && this.#hasSelection;

      let fromNode = this.#editor?.getNode(connection.from);
      let toNode = this.#editor?.getNode(connection.to);
      let fromColor = fromNode?.outputs?.[connection.out]?.socket?.color;
      let toColor = toNode?.inputs?.[connection.in]?.socket?.color;

      // Scale lineWidth inversely with zoom to maintain screen visibility
      // At zoom 0.003, a 2px world line = 0.006 screen px (invisible)
      // minScreenWidth = 1.5 screen px → in world coords = 1.5 / zoom
      let baseWidth = this.#colorParams.width;
      ctx.lineWidth = Math.max(baseWidth, 1.5 / zoom);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 1.0;

      ctx.beginPath();
      let coords = null;
      try {
        coords = this.#plotPath(ctx, connection);
      } catch (err) {
        console.log('🟡 Path failed:', err);
      }
      if (!coords) return;

      // Save caps for later drawing (ensures they are on top of all paths)
      socketsToDraw.set(`${connection.from}:${connection.out}`, { x: coords.startX, y: coords.startY, color: fromColor || this.#colorParams.normal });
      socketsToDraw.set(`${connection.to}:${connection.in}`, { x: coords.endX, y: coords.endY, color: toColor || this.#colorParams.normal });

      let finalColor;
      if (fromColor && toColor && fromColor !== toColor) {
        let grad = ctx.createLinearGradient(coords.startX, coords.startY, coords.endX, coords.endY);
        grad.addColorStop(0, fromColor);
        grad.addColorStop(1, toColor);
        finalColor = grad;
      } else {
        finalColor = fromColor || this.#colorParams.normal;
      }

      if (isDimmed) {
        // Actually, color-mix doesn't work on CanvasGradient. If it's a gradient, fallback to solid fromColor.
        let baseColor = fromColor || this.#colorParams.normal;
        finalColor = `color-mix(in srgb, ${baseColor} 15%, ${this.#colorParams.bg})`;
      }

      ctx.strokeStyle = finalColor;
      ctx.fillStyle = finalColor;

      if (isFlowing) {
        ctx.setLineDash([10, 10]);
        ctx.lineDashOffset = -(time / 20) % 20;
        hasFlowing = true;
      } else {
        ctx.setLineDash([]);
      }

      // Apply drop shadow for selected lines to make them pop 
      if (isSelected && !isDimmed) {
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 8;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.stroke(coords.path2D);

      // draw direction arrow
      if (coords.arrow) {
        ctx.save();
        ctx.translate(coords.arrow.x, coords.arrow.y);
        // Transform from typical left-to-right arrow drawn along X axis
        ctx.rotate(coords.arrow.angle);
        ctx.beginPath();
        ctx.moveTo(-5, -3.5);
        ctx.lineTo(5, 0);
        ctx.lineTo(-5, 3.5);
        ctx.closePath();
        ctx.fillStyle = ctx.strokeStyle; // inherited from path 
        ctx.fill();
        ctx.restore();
      }
    };

    if (this.#hasSelection) {
      for (const [id, connection] of this.#connectionData) {
        if (!this.#activeConnIds.has(connection.id)) drawConnection(id, connection);
      }
      for (const [id, connection] of this.#connectionData) {
        if (this.#activeConnIds.has(connection.id)) drawConnection(id, connection);
      }
    } else {
      for (const [id, connection] of this.#connectionData) {
        drawConnection(id, connection);
      }
    }

    // Draw caps for connected sockets to hide DOM subpixel drift
    ctx.setLineDash([]);

    for (const [, pos] of socketsToDraw) {
      ctx.beginPath();
      // HTML ::after is 12x12 (content) + 2px border = 16px total.
      // Canvas r=7 (dia 14) + lineWidth 2 = 14+-1 = 12px inner fill, 16px total outer bound.
      ctx.arc(pos.x, pos.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = pos.color;
      ctx.fill();
      ctx.lineWidth = 2; // Match the 2px solid CSS outline exactly
      ctx.strokeStyle = this.#colorParams.outline; // Match var(--sn-port-outline) / var(--sn-node-bg)
      ctx.stroke();
    }

    // ─── Draw phantom node dots (Obsidian-style) ───
    this.#drawPhantomDots(ctx, zoom);

    // Stop flow animation if none flowing to save CPU
    if (!hasFlowing && this.#animationFrameId) {
      cancelAnimationFrame(this.#animationFrameId);
      this.#animationFrameId = null;
    } else if (hasFlowing && !this.#animationFrameId) {
      this.#animationFrameId = requestAnimationFrame(this.#renderLoop);
    }
  }

  /**
   * Draw phantom nodes as colored dots with size proportional to degree.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} zoom
   */
  #drawPhantomDots(ctx, zoom) {
    if (this.#phantomNodes.length === 0) return;

    ctx.shadowBlur = 0;
    ctx.setLineDash([]);

    // At very low zoom, scale dot size to maintain minimum screen visibility
    // minScreen = 8px → in world coords = 8 / zoom
    let minWorldW = Math.max(180, 8 / zoom);
    let minWorldH = Math.max(60, 4 / zoom);
    let showLabels = zoom > 0.15;
    let labelFontSize = Math.max(9, Math.min(14, 12 / zoom));

    for (const node of this.#phantomNodes) {
      if (!node || node.w === undefined || node.h === undefined) continue;

      let w = Math.max(minWorldW, node.w);
      let h = Math.max(minWorldH, node.h);
      // Center the enlarged dot on the original position
      let x = (node.x || 0) - (w - node.w) / 2;
      let y = (node.y || 0) - (h - node.h) / 2;

      ctx.beginPath();
      try {
        let r = Math.min(6, w * 0.1, h * 0.1);
        if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
        else ctx.rect(x, y, w, h);
      } catch (e) {
        ctx.rect(x, y, w, h);
      }

      ctx.fillStyle = node.color || this.#colorParams.normal;
      ctx.globalAlpha = 0.85;
      ctx.fill();

      // Stroke — scale lineWidth for visibility
      ctx.lineWidth = Math.max(1.5, 1 / zoom);
      ctx.strokeStyle = this.#colorParams.outline;
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      // Label at medium+ zoom
      if (showLabels && node.label) {
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 1;
        ctx.font = `${labelFontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.save();
        ctx.beginPath();
        ctx.rect(x + 4, y, w - 8, h);
        ctx.clip();
        ctx.fillText(node.label, x + w / 2, y + h / 2);
        ctx.restore();
      }
    }
  }

  /**
   * Create a minimal proxy object for a phantom node so #plotPath can work.
   * Mimics the shape of a DOM nodeView element with _position and _cachedW/H.
   */
  #getPhantomProxy(nodeId) {
    let phantom = this.#phantomMap.get(nodeId);
    if (!phantom) return null;
    return {
      id: phantom.id,
      _position: { x: phantom.x, y: phantom.y },
      _cachedW: phantom.w,
      _cachedH: phantom.h,
      offsetWidth: phantom.w,
      offsetHeight: phantom.h,
      getAttribute: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      style: {},
    };
  }

  #renderLoop = () => {
    this.redraw();
    this.#animationFrameId = requestAnimationFrame(this.#renderLoop);
  };

  #plotPath(ctx, conn) {
    let fromElNodeView = this.#nodeViews.get(conn.from);
    let toElNodeView = this.#nodeViews.get(conn.to);

    // Fallback to phantom proxy for nodes without DOM
    if (!fromElNodeView) fromElNodeView = this.#getPhantomProxy(conn.from);
    if (!toElNodeView) toElNodeView = this.#getPhantomProxy(conn.to);
    if (!fromElNodeView || !toElNodeView) return;

    let fromPos = fromElNodeView._position || { x: 0, y: 0 };
    let toPos = toElNodeView._position || { x: 0, y: 0 };

    let fromEl = fromElNodeView;
    let toEl = toElNodeView;

    if (this._nodeRectMap) {
      let c1 = this._nodeRectMap.get(conn.from);
      if (c1) { fromPos = { x: c1.x, y: c1.y }; if (c1.el) fromEl = c1.el; }
      let c2 = this._nodeRectMap.get(conn.to);
      if (c2) { toPos = { x: c2.x, y: c2.y }; if (c2.el) toEl = c2.el; }
    }

    let fromW = fromEl._cachedW || fromEl.offsetWidth || 180;
    let fromH = fromEl._cachedH || fromEl.offsetHeight || 100;
    let toW = toEl._cachedW || toEl.offsetWidth || 180;
    let toH = toEl._cachedH || toEl.offsetHeight || 100;
    
    let fromSize = { width: fromW, height: fromH };
    let toSize = { width: toW, height: toH };
    let fromNode = this.#editor?.getNode(conn.from);
    let toNode = this.#editor?.getNode(conn.to);
    let fromShape = getShape(fromNode?.shape);
    let toShape = getShape(toNode?.shape);

    let fromCenter = { x: fromPos.x + fromW / 2, y: fromPos.y + fromH / 2 };
    let toCenter = { x: toPos.x + toW / 2, y: toPos.y + toH / 2 };

    let fromOffset = this.getSocketOffset(fromEl, conn.out, 'output', toCenter);
    let toOffset = this.getSocketOffset(toEl, conn.in, 'input', fromCenter);

    let startX = fromPos.x + fromOffset.x;
    let startY = fromPos.y + fromOffset.y;
    let endX = toPos.x + toOffset.x;
    let endY = toPos.y + toOffset.y;


    let d;
    let arrow = { x: endX, y: endY, angle: 0 };
    let effectiveStyle = this.#pathStyle;
    if (effectiveStyle === 'straight') {
      d = `M ${startX} ${startY} L ${endX} ${endY}`;
      arrow.x = (startX + endX) / 2;
      arrow.y = (startY + endY) / 2;
      arrow.angle = Math.atan2(endY - startY, endX - startX);
    } else if (effectiveStyle === 'orthogonal') {
      let connIndex = this._connIndexMap ? (this._connIndexMap.get(conn.id) ?? 0) : 0;
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

      let pts = [{ x: startX, y: startY }, { x: p1x, y: p1y }];
      let skipObstacles = this._nodeRectMap && this._nodeRectMap.size > 200;

      if (endX < startX) {
        let bottomY = Math.max(fromPos.y + fromH, toPos.y + toH) + 30 + traceOffset;
        pts.push({ x: p1x, y: bottomY });
        pts.push({ x: p2x, y: bottomY });
      } else if (skipObstacles) {
        // Large graph: simple mid-X routing without obstacle checks
        let midX = (p1x + p2x) / 2 + traceOffset;
        pts.push({ x: midX, y: p1y });
        pts.push({ x: midX, y: p2y });
      } else {
        let maxH = Math.max(fromH, toH);
        if (Math.abs(p1y - p2y) < maxH) {
          let nodeBetween = false;
          let obstacleIter = this._nodeRectMap ? this._nodeRectMap.values() : [];
          for (const rect of obstacleIter) {
            let nx = rect.x;
            let ny = rect.y;
            let nw = rect.w || 180;
            let nh = rect.h || 60;
            if (nx > p1x && nx + nw < p2x) {
              if (Math.min(p1y, p2y) <= ny + nh && Math.max(p1y, p2y) >= ny) {
                nodeBetween = true; break;
              }
            }
          }

          if (nodeBetween) {
            let detourY = Math.min(fromPos.y, toPos.y) - 30 - traceOffset;
            pts.push({ x: p1x, y: detourY });
            pts.push({ x: p2x, y: detourY });
          } else {
            let midX = (p1x + p2x) / 2 + traceOffset;
            pts.push({ x: midX, y: p1y });
            pts.push({ x: midX, y: p2y });
          }
        } else {
          let midX = (p1x + p2x) / 2 + traceOffset;
          let obstacleNode = null;
          let minY = Math.min(p1y, p2y);
          let maxY = Math.max(p1y, p2y);

          let obstIter = this._nodeRectMap ? this._nodeRectMap.values() : [];
          for (const rect of obstIter) {
            let nx = rect.x;
            let ny = rect.y;
            let nw = rect.w || 180;
            let nh = rect.h || 60;
            if (midX >= nx && midX <= nx + nw) {
              if (ny <= maxY && ny + nh >= minY) {
                obstacleNode = { x: nx, w: nw };
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

          pts.push({ x: midX, y: p1y });
          pts.push({ x: midX, y: p2y });
        }
      }

      pts.push({ x: p2x, y: p2y });
      pts.push({ x: endX, y: endY });

      let path = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) {
        let prev = pts[i - 1];
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
      if (pts.length >= 2) {
        let midIndex = Math.floor(pts.length / 2);
        let p1 = pts[midIndex - 1];
        let p2 = pts[midIndex];
        if (p1 && p2) {
          arrow.x = (p1.x + p2.x) / 2;
          arrow.y = (p1.y + p2.y) / 2;
          arrow.angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        }
      }
      d = path;
    } else if (effectiveStyle === 'pcb') {
      // ─── PCB Grid-Based Trace Routing ───
      // All waypoints snap to a grid. Stubs exit perpendicular to node surface
      // with a minimum length, then route on grid channels with chamfered corners.

      const TRACE_GRID = 5;  // Dense trace grid (5px)
      const STUB_MIN = 20;   // minimum perpendicular stub from node edge
      const CHAMFER = 8;     // 45° chamfer radius (px)

      // Snap a coordinate to the trace grid
      let snapGrid = (v) => Math.round(v / TRACE_GRID) * TRACE_GRID;

      // Connection channel index for parallel trace separation
      let connIndex = this._connIndexMap ? (this._connIndexMap.get(conn.id) ?? 0) : 0;

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
        if (r >= 45 && r < 135) return { dx: 0, dy: 1 };     // down
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
      // Skip obstacle avoidance on large graphs — O(N) per connection is too expensive
      // and produces worse visual results at high density anyway
      let skipObstacles = this._nodeRectMap && this._nodeRectMap.size > 200;

      // Very simple heuristic orthogonal router
      if (endX < startX - 20) {
        // Backwards routing: U-turn below obstacles in the path
        let maxObstacleY = Math.max(fromPos.y + fromH, toPos.y + toH);

        if (!skipObstacles) {
          let minXForObstacle = Math.min(stubFromX, stubToX);
          let maxXForObstacle = Math.max(stubFromX, stubToX);
          let iter = this._nodeRectMap ? this._nodeRectMap.values() : [];
          for (const rect of iter) {
            let nx = rect.x;
            let ny = rect.y;
            let nw = rect.w;
            let nh = rect.h;
            let pad = TRACE_GRID * 2;
            if (nx + nw + pad >= minXForObstacle && nx - pad <= maxXForObstacle) {
              if (ny + nh > maxObstacleY) {
                maxObstacleY = ny + nh;
              }
            }
          }
        }

        let bottomY = snapGrid(maxObstacleY + 30) + Math.abs(channelShift);
        pts.push({ x: stubFromX, y: bottomY });
        pts.push({ x: stubToX, y: bottomY });
      } else {
        // Forward routing: mid-X channel
        let midX = snapGrid((stubFromX + stubToX) / 2) + channelShift;

        // Same-height shortcut
        if (Math.abs(stubFromY - stubToY) < TRACE_GRID * 2) {
          pts.push({ x: stubToX, y: stubFromY });
        } else {
          if (!skipObstacles) {
            // Obstacle check for mid-X vertical segment
            let minY = Math.min(stubFromY, stubToY);
            let maxY = Math.max(stubFromY, stubToY);
            let pad = TRACE_GRID * 4;

            let iter = this._nodeRectMap ? this._nodeRectMap.values() : [];
            for (const rect of iter) {
              if (rect.id === conn.from || rect.id === conn.to) continue;
              let nx = rect.x, ny = rect.y;
              let nw = rect.w, nh = rect.h;

              if (midX >= nx - pad && midX <= nx + nw + pad) {
                if (ny - pad <= maxY && ny + nh + pad >= minY) {
                  let leftX = snapGrid(nx - pad) + channelShift;
                  let rightX = snapGrid(nx + nw + pad) + channelShift;
                  midX = Math.abs(midX - leftX) < Math.abs(midX - rightX) ? leftX : rightX;
                  break;
                }
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

      // Log route stats (debug only)
      if (CanvasConnectionRenderer.debug) {
        let fromLabel = fromEl._nodeData?.label || conn.from;
        let toLabel = toEl._nodeData?.label || conn.to;
        console.log(`🔄 [PCB] ${fromLabel} → ${toLabel} | waypoints=${pts.length}`);
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
      if (pts.length >= 2) {
        let midIndex = Math.floor(pts.length / 2);
        let p1 = pts[midIndex - 1];
        let p2 = pts[midIndex];
        if (p1 && p2) {
          arrow.x = (p1.x + p2.x) / 2;
          arrow.y = (p1.y + p2.y) / 2;
          arrow.angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
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

      arrow.x = (startX + 3 * cp1x + 3 * cp2x + endX) / 8;
      arrow.y = (startY + 3 * cp1y + 3 * cp2y + endY) / 8;
      arrow.angle = Math.atan2(endY + cp2y - cp1y - startY, endX + cp2x - cp1x - startX);
    }


    let p = new Path2D(d);
    return { startX, startY, endX, endY, path2D: p, arrow, pathStyle: effectiveStyle };
  }

  destroy() {
    if (this.#resizeObserver) this.#resizeObserver.disconnect();
    if (this.#animationFrameId) cancelAnimationFrame(this.#animationFrameId);
    this.#connectionData.clear();
  }
}
