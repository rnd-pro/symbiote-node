/**
 * AutoLayout — Macro-Micro hierarchical graph layout
 *
 * Employs a 2-level strategy:
 * 1. Micro-Layout: Sugiyama-style layering with per-node dimensions.
 * 2. Macro-Layout: Radial Hub-and-Spoke spiraling to pack Group Bounds.
 *
 * Features (v2):
 * - Per-node width/height via `nodeSizes` map
 * - Bi-directional crossing minimization (forward + backward sweeps)
 * - Per-layer X offset based on actual max node width
 * - Per-node height-aware overlap resolution
 * - Layout direction: 'LR' (left-right) or 'TB' (top-bottom)
 *
 * @module symbiote-node/canvas/AutoLayout
 */

export function computeAutoLayout(editor, options = {}) {
  const perfId = 'AutoLayout-' + Math.random().toString(36).slice(2, 6);
  console.time(perfId);
  let cycleCount = 0;

  const {
    nodeWidth = 180,
    nodeHeight = 140,
    gapX = 120,
    gapY = 100,
    startX = 60,
    startY = 60,
    crossingPasses = 4,
    existingPositions = null,
    groups = null, // { [groupId]: [nodeId, ...] }
    nodeSizes = null, // { [nodeId]: { w, h } } — per-node dimensions
    direction = 'LR' // 'LR' or 'TB'
  } = options;

  // Per-node dimension resolver with fallback to global defaults
  function getSize(nodeId) {
    if (nodeSizes && nodeSizes[nodeId]) {
      // Use measured size, but enforce minimum dimensions (DOM might not be fully rendered)
      return {
        w: Math.max(nodeSizes[nodeId].w, nodeWidth),
        h: Math.max(nodeSizes[nodeId].h, nodeHeight),
      };
    }
    return { w: nodeWidth, h: nodeHeight };
  }

  const nodes = [...editor.getNodes()];
  const connections = [...editor.getConnections()];
  if (nodes.length === 0) return {};

  const outgoing = new Map();
  const incoming = new Map();
  for (const node of nodes) {
    outgoing.set(node.id, []);
    incoming.set(node.id, []);
  }

  for (const conn of connections) {
    const from = conn.from;
    const to = conn.to;
    if (outgoing.has(from) && incoming.has(to)) {
      outgoing.get(from).push(to);
      incoming.get(to).push(from);
    }
  }

  // --- 1. Partition into Groups ---
  const nodeGroupId = new Map();
  const groupNodes = new Map();
  if (groups) {
    for (const [gId, gNodes] of Object.entries(groups)) {
      groupNodes.set(gId, []);
      for (const n of gNodes) {
        nodeGroupId.set(n, gId);
      }
    }
  }
  for (const n of nodes) {
    let gId = nodeGroupId.get(n.id);
    if (!gId) {
      gId = '__root__';
      nodeGroupId.set(n.id, gId);
    }
    if (!groupNodes.has(gId)) groupNodes.set(gId, []);
    groupNodes.get(gId).push(n.id);
  }

  // Calculate inter-group connections
  const groupCrossLinks = new Map();
  const groupDegrees = new Map();
  for (const gId of groupNodes.keys()) {
    groupDegrees.set(gId, { in: 0, out: 0, total: 0 });
    groupCrossLinks.set(gId, { incoming: new Map(), outgoing: new Map() });
  }

  for (const [fromId, targets] of outgoing.entries()) {
    const gFrom = nodeGroupId.get(fromId);
    for (const toId of targets) {
      const gTo = nodeGroupId.get(toId);
      if (gFrom !== gTo) {
        groupDegrees.get(gFrom).out++;
        groupDegrees.get(gFrom).total++;
        groupDegrees.get(gTo).in++;
        groupDegrees.get(gTo).total++;
        
        const outMap = groupCrossLinks.get(gFrom).outgoing;
        outMap.set(gTo, (outMap.get(gTo) || 0) + 1);
        
        const inMap = groupCrossLinks.get(gTo).incoming;
        inMap.set(gFrom, (inMap.get(gFrom) || 0) + 1);
      }
    }
  }

  // Identify center hub group
  let centerGroup = null;
  let maxCross = -1;
  for (const [gId, deg] of groupDegrees.entries()) {
    if (deg.total > maxCross || (deg.total === maxCross && gId === './')) {
      maxCross = deg.total;
      centerGroup = gId;
    }
  }

    // --- 2. Micro Layout Function ---
  // Sugiyama-style LTR layering with per-node dimensions
  function computeMicroLayout(gId, subNodes) {
    const finalOut = new Map();
    const internalDegree = new Map();
    for (const n of subNodes) {
       finalOut.set(n, []);
       internalDegree.set(n, 0);
    }
    
    // Calculate accurate internal degree
    for (const n of subNodes) {
       for (const child of outgoing.get(n) || []) {
          if (finalOut.has(child)) {
             internalDegree.set(n, internalDegree.get(n) + 1);
             internalDegree.set(child, internalDegree.get(child) + 1);
          }
       }
    }

    // Partition into Linked vs Isolated
    const linkedNodes = [];
    const isolatedNodes = [];
    for (const n of subNodes) {
       if (internalDegree.get(n) === 0) isolatedNodes.push(n);
       else linkedNodes.push(n);
    }

    const localPositions = {};
    let maxLinkedW = 0, maxLinkedH = 0;

    // --- Linked Subgraph Layout ---
    if (linkedNodes.length > 0) {
      const state = new Map();
      for (const n of linkedNodes) state.set(n, 0);

      function dfs(nId) {
        state.set(nId, 1);
        for (const child of outgoing.get(nId) || []) {
          if (!finalOut.has(child)) continue; // ignore cross-group
          if (state.get(child) === 1) continue;
          finalOut.get(nId).push(child);
          if (state.get(child) === 0) dfs(child);
        }
        state.set(nId, 2);
      }
      for (const n of linkedNodes) {
        if (state.get(n) === 0) dfs(n);
      }

      const layers = new Map();
      for (const n of linkedNodes) layers.set(n, 0);

      for (let i = 0; i < linkedNodes.length; i++) {
        let changed = false;
        for (const n of linkedNodes) {
          const cur = layers.get(n);
          for (const child of finalOut.get(n)) {
            if (layers.get(child) < cur + 1) {
              layers.set(child, cur + 1);
              changed = true;
            }
          }
        }
        if (!changed) break;
      }

      let minL = Infinity, maxL = -Infinity;
      for (const n of linkedNodes) {
        const l = layers.get(n);
        if (l < minL) minL = l;
        if (l > maxL) maxL = l;
      }
      if (minL === Infinity) { minL = 0; maxL = 0; }

      const layerArr = [];
      for (let l = 0; l <= (maxL - minL); l++) layerArr.push([]);
      for (const n of linkedNodes) layerArr[layers.get(n) - minL].push(n);

      // --- Per-node height-aware Y positioning ---
      const yPos = new Map();
      for (let l = 0; l < layerArr.length; l++) {
        let curY = 0;
        for (let i = 0; i < layerArr[l].length; i++) {
          yPos.set(layerArr[l][i], curY);
          curY += getSize(layerArr[l][i]).h + gapY;
        }
      }

      // Per-node height-aware overlap resolution
      function resolveOverlaps(layer, yMap) {
        if (layer.length === 0) return;
        // Forward sweep: ensure each node starts after previous node ends
        for (let i = 1; i < layer.length; i++) {
          const prevId = layer[i - 1];
          const curId = layer[i];
          const prevBottom = yMap.get(prevId) + getSize(prevId).h + gapY;
          if (yMap.get(curId) < prevBottom) {
            yMap.set(curId, prevBottom);
          }
        }
        // Backward sweep: pull nodes up if there's slack
        for (let i = layer.length - 2; i >= 0; i--) {
          const curId = layer[i];
          const nextId = layer[i + 1];
          const maxY = yMap.get(nextId) - getSize(curId).h - gapY;
          if (yMap.get(curId) > maxY) {
            yMap.set(curId, maxY);
          }
        }
      }

      // --- Bi-directional crossing minimization ---
      // Uses the declared crossingPasses parameter (was unused before)
      for (let pass = 0; pass < crossingPasses; pass++) {
        // Forward sweep: layer 1 → last
        for (let l = 1; l < layerArr.length; l++) {
          for (let i = 0; i < layerArr[l].length; i++) {
            const node = layerArr[l][i];
            const parents = (incoming.get(node) || []).filter(n => layerArr[l - 1].includes(n));
            if (parents.length > 0) {
              parents.sort((a, b) => yPos.get(a) - yPos.get(b));
              const mid = Math.floor(parents.length / 2);
              let tY = yPos.get(parents[mid]);
              if (parents.length % 2 === 0) tY = (yPos.get(parents[mid - 1]) + yPos.get(parents[mid])) / 2;
              yPos.set(node, tY);
            }
          }
          resolveOverlaps(layerArr[l], yPos);
        }
        // Backward sweep: last layer → layer 1
        for (let l = layerArr.length - 2; l >= 0; l--) {
          for (let i = 0; i < layerArr[l].length; i++) {
            const node = layerArr[l][i];
            const children = (finalOut.get(node) || []).filter(n => layerArr[l + 1].includes(n));
            if (children.length > 0) {
              children.sort((a, b) => yPos.get(a) - yPos.get(b));
              const mid = Math.floor(children.length / 2);
              let tY = yPos.get(children[mid]);
              if (children.length % 2 === 0) tY = (yPos.get(children[mid - 1]) + yPos.get(children[mid])) / 2;
              yPos.set(node, tY);
            }
          }
          resolveOverlaps(layerArr[l], yPos);
        }
      }

      let minLocalY = Infinity, maxLocalY = -Infinity;
      for (const [nId, y] of yPos.entries()) {
        if (y < minLocalY) minLocalY = y;
        const bottom = y + getSize(nId).h;
        if (bottom > maxLocalY) maxLocalY = bottom;
      }
      if (minLocalY === Infinity) { minLocalY = 0; maxLocalY = 0; }

      // --- Per-layer X offset based on max node width ---
      // Each layer's X position accounts for the widest node in the previous layer
      const layerXOffsets = [];
      let xAccum = 0;
      for (let l = 0; l < layerArr.length; l++) {
        layerXOffsets.push(xAccum);
        // Find the widest node in this layer
        let maxW = 0;
        for (const node of layerArr[l]) {
          const nw = getSize(node).w;
          if (nw > maxW) maxW = nw;
        }
        xAccum += maxW + gapX;
      }

      for (let l = 0; l < layerArr.length; l++) {
        for (const node of layerArr[l]) {
          localPositions[node] = {
            x: layerXOffsets[l],
            y: yPos.get(node) - minLocalY
          };
        }
      }

      maxLinkedW = xAccum;
      maxLinkedH = (maxLocalY - minLocalY) + gapY;
    }

    // --- Isolated Subgraph Layout (Grid Wrap) ---
    // Uses per-node dimensions for row/column sizing
    let isolatedW = 0, isolatedH = 0;
    if (isolatedNodes.length > 0) {
       const MAX_COLS = 6;
       // Calculate column widths and row heights based on actual node sizes
       const colWidths = [];
       const rowHeights = [];
       for (let i = 0; i < isolatedNodes.length; i++) {
          const col = i % MAX_COLS;
          const row = Math.floor(i / MAX_COLS);
          const size = getSize(isolatedNodes[i]);
          if (!colWidths[col] || size.w > colWidths[col]) colWidths[col] = size.w;
          if (!rowHeights[row] || size.h > rowHeights[row]) rowHeights[row] = size.h;
       }

       // Compute cumulative X offsets per column
       const colX = [0];
       for (let c = 1; c < colWidths.length; c++) {
         colX[c] = colX[c - 1] + (colWidths[c - 1] || nodeWidth) + gapX;
       }
       // Compute cumulative Y offsets per row
       const rowY = [0];
       for (let r = 1; r < rowHeights.length; r++) {
         rowY[r] = rowY[r - 1] + (rowHeights[r - 1] || nodeHeight) + gapY;
       }

       for (let i = 0; i < isolatedNodes.length; i++) {
          const node = isolatedNodes[i];
          const col = i % MAX_COLS;
          const row = Math.floor(i / MAX_COLS);
          
          localPositions[node] = {
             x: colX[col] || 0,
             y: maxLinkedH + (rowY[row] || 0)
          };
       }

       const lastCol = Math.min(isolatedNodes.length, MAX_COLS) - 1;
       const lastRow = rowHeights.length - 1;
       isolatedW = (colX[lastCol] || 0) + (colWidths[lastCol] || nodeWidth) + gapX;
       isolatedH = (rowY[lastRow] || 0) + (rowHeights[lastRow] || nodeHeight) + gapY;
    }

    const w = Math.max(maxLinkedW, isolatedW || (nodeWidth + gapX));
    const h = maxLinkedH + isolatedH;

    return { localPositions, bounds: { w, h } };
  }


  // --- 3. Run Micro Layout for all groups ---
  const groupResults = new Map();
  for (const [gId, subNodes] of groupNodes.entries()) {
    groupResults.set(gId, computeMicroLayout(gId, subNodes));
  }

  // --- 4. Macro Layout (Vector Radial Packing) ---
  const M_PI = Math.PI;
  const macroPositions = new Map(); // gId -> {x, y}
  const placedRects = [];
  
  function hitTest(r1, r2, padding = 150) {
    return !(r2.x >= r1.x + r1.w + padding || 
             r2.x + r2.w + padding <= r1.x || 
             r2.y >= r1.y + r1.h + padding ||
             r2.y + r2.h + padding <= r1.y);
  }

  function placeGroup(gId) {
    const res = groupResults.get(gId);
    let prefAngle = 0; // default East

    // Calculate preferred vector based on connections to ALREADY placed groups
    let vecX = 0, vecY = 0;
    const links = groupCrossLinks.get(gId);
    for (const p of placedRects) {
      const pId = p.id;
      const toPlaced = links.outgoing.get(pId) || 0; // I export to Placed -> I want to be West of Placed
      const fromPlaced = links.incoming.get(pId) || 0; // Placed exports to me -> I want to be East of Placed
      
      const netForce = fromPlaced - toPlaced; // > 0 goes right, < 0 goes left
      if (netForce !== 0) {
        // Find angle toward placed center
        const cx = p.x + p.w / 2;
        const cy = p.y + p.h / 2;
        // Apply force outward
        vecX += Math.cos(Math.atan2(cy, cx)) * netForce;
        vecY += Math.sin(Math.atan2(cy, cx)) * netForce;
      }
    }
    if (vecX !== 0 || vecY !== 0) prefAngle = Math.atan2(vecY, vecX);

    // Dynamic step based on group size — large groups skip faster
    let step = Math.max(40, Math.min(res.bounds.w, res.bounds.h) * 0.25);
    let maxR = 12000;
    const angularStep = M_PI / 8; // 16 angles instead of 24
    for (let r = 0; r < maxR; r += step) {
      for (let delta = 0; delta <= M_PI; delta += angularStep) {
        for (const sign of [1, -1]) {
          cycleCount++;
          let a = prefAngle + delta * sign;
          let x = Math.round(Math.cos(a) * r);
          let y = Math.round(Math.sin(a) * r);
          
          let rect = { x, y, w: res.bounds.w, h: res.bounds.h, id: gId };
          let overlap = false;
          for (const p of placedRects) {
            if (hitTest(rect, p)) { overlap = true; break; }
          }
          if (!overlap) {
            macroPositions.set(gId, { x, y });
            placedRects.push(rect);
            return;
          }
          if (delta === 0) break;
        }
      }
      // Increase step as we spiral outward (no point checking every 40px at radius 5000)
      if (r > 1000) step = Math.max(step, 80);
      if (r > 3000) step = Math.max(step, 150);
    }
    // Fallback if packed too tight, just shove it way out
    macroPositions.set(gId, { x: placedRects.length * 1000, y: placedRects.length * 1000 });
    placedRects.push({ x: placedRects.length*1000, y: placedRects.length*1000, w: res.bounds.w, h: res.bounds.h, id: gId });
  }

  // Place center hub first
  if (centerGroup) {
    macroPositions.set(centerGroup, { x: 0, y: 0 });
    const cRes = groupResults.get(centerGroup);
    placedRects.push({ x: 0, y: 0, w: cRes.bounds.w, h: cRes.bounds.h, id: centerGroup });
  }

  // Sort remaining groups by descending total edges to ensure large interconnected clusters are packed tight
  const remainingGroups = Array.from(groupNodes.keys()).filter(id => id !== centerGroup);
  remainingGroups.sort((a, b) => groupDegrees.get(b).total - groupDegrees.get(a).total);
  
  for (const gId of remainingGroups) {
    placeGroup(gId);
  }

  // --- 5. Assemble Final Positions ---
  const finalPositions = {};
  for (const [gId, res] of groupResults.entries()) {
    const macro = macroPositions.get(gId);
    for (const [nId, loc] of Object.entries(res.localPositions)) {
      finalPositions[nId] = {
        x: startX + macro.x + loc.x,
        y: startY + macro.y + loc.y
      };
    }
  }

  // --- 6. Direction Transform ---
  // If TB (top-bottom), swap x↔y so layers go vertically
  if (direction === 'TB') {
    for (const id in finalPositions) {
      const p = finalPositions[id];
      const tmp = p.x;
      p.x = p.y;
      p.y = tmp;
    }
  }

  // --- 7. Anchor Stabilization ---
  if (existingPositions) {
    let sumDx = 0, sumDy = 0, count = 0;
    for (const [id, oldPos] of Object.entries(existingPositions)) {
      if (finalPositions[id] && !isNaN(oldPos.x) && !isNaN(oldPos.y)) {
        sumDx += oldPos.x - finalPositions[id].x;
        sumDy += oldPos.y - finalPositions[id].y;
        count++;
      }
    }
    if (count > 0) {
      const avgDx = sumDx / count;
      const avgDy = sumDy / count;
      for (const id in finalPositions) {
        finalPositions[id].x += avgDx;
        finalPositions[id].y += avgDy;
      }
      
      // Post-anchor overlap resolution using per-node dimensions
      const ids = Object.keys(finalPositions);
      for (let pass = 0; pass < 3; pass++) {
        let overlaps = false;
        cycleCount++;
        for (let i = 0; i < ids.length; i++) {
          for (let j = i + 1; j < ids.length; j++) {
            const p1 = finalPositions[ids[i]];
            const p2 = finalPositions[ids[j]];
            const s1 = getSize(ids[i]);
            const s2 = getSize(ids[j]);
            const dx = p1.x - p2.x, dy = p1.y - p2.y;
            const absDx = Math.abs(dx), absDy = Math.abs(dy);
            
            // Check overlap using actual node dimensions
            const overlapX = (s1.w + s2.w) / 2 + gapX * 0.3;
            const overlapY = (s1.h + s2.h) / 2 + gapY * 0.3;
            
            if (absDx < overlapX && absDy < overlapY) {
              overlaps = true;
              // Push apart along the axis with more penetration depth (less distance)
              const penX = overlapX - absDx;
              const penY = overlapY - absDy;
              
              if (penX < penY) {
                // Less X penetration → push apart on X
                const fix = penX / 2 + 1;
                p1.x += dx >= 0 ? fix : -fix;
                p2.x += dx >= 0 ? -fix : fix;
              } else {
                // Less Y penetration → push apart on Y
                const fix = penY / 2 + 1;
                p1.y += dy >= 0 ? fix : -fix;
                p2.y += dy >= 0 ? -fix : fix;
              }
            }
          }
        }
        if (!overlaps) break;
      }
    }
  }

  for (const k in finalPositions) {
    if (isNaN(finalPositions[k].x) || isNaN(finalPositions[k].y)) {
      console.error("[AutoLayout] NaN intercepted for node:", k);
      finalPositions[k] = { x: 0, y: 0 };
    }
  }

  console.timeEnd(perfId);
  console.log(`[AutoLayout] v2 Macro-Micro Groups: ${groupNodes.size}, Nodes: ${nodes.length}, Edges: ${connections.length}`);
  console.log(`[AutoLayout] Cycles: ${cycleCount}, crossingPasses: ${crossingPasses}, direction: ${direction}`);
  
  return finalPositions;
}


/**
 * Tree Layout — positions nodes like a directory tree / file explorer.
 *
 * Algorithm: Compact tree (Reingold-Tilford inspired) with per-node dimensions.
 * - Builds a tree from either: (a) dirPaths parent-child hierarchy, or (b) DAG edges
 * - Positions root at top-left, children below with indentation
 * - Sibling subtrees are packed tightly without overlap
 * - Supports per-node dimensions via `nodeSizes`
 *
 * @param {NodeEditor} editor - The node editor
 * @param {object} options
 * @param {Object<string, { w: number, h: number }>} [options.nodeSizes] - Per-node dimensions
 * @param {number} [options.gapX=40] - Horizontal indentation per depth level
 * @param {number} [options.gapY=20] - Vertical gap between sibling nodes
 * @param {number} [options.nodeWidth=250] - Default node width
 * @param {number} [options.nodeHeight=100] - Default node height
 * @param {number} [options.startX=60] - Starting X
 * @param {number} [options.startY=60] - Starting Y
 * @param {Object<string, string>} [options.dirPaths] - { nodeId: dirPath } — enables directory hierarchy detection
 * @returns {Object<string, { x: number, y: number }>}
 */
export function computeTreeLayout(editor, options = {}) {
  const perfId = 'TreeLayout-' + Math.random().toString(36).slice(2, 6);
  console.time(perfId);

  const {
    gapX = 40,
    gapY = 20,
    nodeWidth = 250,
    nodeHeight = 100,
    startX = 60,
    startY = 60,
    nodeSizes = null,
    dirPaths = null, // { nodeId: dirPath } — if provided, uses directory hierarchy
  } = options;

  function getSize(nodeId) {
    if (nodeSizes && nodeSizes[nodeId]) {
      // Use measured size, but enforce minimum dimensions (DOM might not be fully rendered)
      return {
        w: Math.max(nodeSizes[nodeId].w, nodeWidth),
        h: Math.max(nodeSizes[nodeId].h, nodeHeight),
      };
    }
    return { w: nodeWidth, h: nodeHeight };
  }

  const nodes = [...editor.getNodes()];
  const connections = [...editor.getConnections()];
  if (nodes.length === 0) return {};

  // --- Build tree structure ---
  // children: Map<nodeId, nodeId[]>
  // parent: Map<nodeId, nodeId>
  const children = new Map();
  const parent = new Map();
  const nodeIds = new Set(nodes.map(n => n.id));

  for (const id of nodeIds) {
    children.set(id, []);
  }

  if (dirPaths) {
    // Build tree from directory path hierarchy
    // e.g. "src/core/" is child of "src/"
    const pathToId = new Map();
    for (const [nodeId, path] of Object.entries(dirPaths)) {
      pathToId.set(path, nodeId);
    }

    // Sort paths by depth (shorter first = parents first)
    const sortedPaths = [...pathToId.keys()].sort((a, b) => {
      const depthA = a.split('/').filter(Boolean).length;
      const depthB = b.split('/').filter(Boolean).length;
      return depthA - depthB || a.localeCompare(b);
    });

    for (const path of sortedPaths) {
      const nodeId = pathToId.get(path);
      // Find parent: strip last segment
      // "src/core/" → "src/", "vendor/symbiote-node/canvas/" → "vendor/symbiote-node/"
      const segments = path.replace(/\/$/, '').split('/');
      segments.pop();
      
      let foundParent = false;
      // Walk up the path tree until we find an existing parent
      while (segments.length > 0) {
        const parentPath = segments.join('/') + '/';
        const parentId = pathToId.get(parentPath);
        if (parentId && parentId !== nodeId) {
          parent.set(nodeId, parentId);
          children.get(parentId).push(nodeId);
          foundParent = true;
          break;
        }
        segments.pop();
      }
      // Also try "./" as root
      if (!foundParent) {
        const rootId = pathToId.get('./');
        if (rootId && rootId !== nodeId) {
          parent.set(nodeId, rootId);
          children.get(rootId).push(nodeId);
        }
      }
    }
  } else {
    // Build tree from DAG edges (use outgoing connections)
    // Simple: treat each connection as parent→child
    for (const conn of connections) {
      const from = conn.from;
      const to = conn.to;
      if (nodeIds.has(from) && nodeIds.has(to) && !parent.has(to)) {
        parent.set(to, from);
        children.get(from).push(to);
      }
    }
  }

  // Find roots (nodes without parents)
  const roots = [];
  for (const id of nodeIds) {
    if (!parent.has(id)) roots.push(id);
  }

  // Sort roots: directories first, then files, alphabetically within each group
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const dirIdSet = dirPaths ? new Set(Object.keys(dirPaths)) : new Set();
  roots.sort((a, b) => {
    const aIsDir = dirIdSet.has(a) || nodeMap.get(a)?._isSubgraph;
    const bIsDir = dirIdSet.has(b) || nodeMap.get(b)?._isSubgraph;
    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;
    const la = nodeMap.get(a)?.label || '';
    const lb = nodeMap.get(b)?.label || '';
    return la.localeCompare(lb);
  });

  // Sort children alphabetically too
  for (const [, kids] of children) {
    kids.sort((a, b) => {
      const la = nodeMap.get(a)?.label || '';
      const lb = nodeMap.get(b)?.label || '';
      return la.localeCompare(lb);
    });
  }

  // --- Compute positions: DFS tree walk ---
  const positions = {};
  let cursorY = startY;

  function layoutSubtree(nodeId, depth) {
    const size = getSize(nodeId);
    const x = startX + depth * (gapX + nodeWidth);
    const y = cursorY;

    positions[nodeId] = { x, y };
    cursorY += size.h + gapY;

    // Layout children below
    const kids = children.get(nodeId) || [];
    for (const childId of kids) {
      layoutSubtree(childId, depth + 1);
    }
  }

  for (const rootId of roots) {
    layoutSubtree(rootId, 0);
  }

  console.timeEnd(perfId);
  console.log(`[TreeLayout] Nodes: ${nodes.length}, Roots: ${roots.length}, Edges: ${connections.length}`);

  return positions;
}
