/**
 * AutoLayout — Macro-Micro hierarchical graph layout
 *
 * Employs a 2-level strategy:
 * 1. Micro-Layout: Sugiyama-style left-to-right layering for nodes within each assigned group.
 * 2. Macro-Layout: Radial Hub-and-Spoke spiraling to pack Group Bounds, preventing cluster overlap.
 *
 * @module symbiote-node/canvas/AutoLayout
 */

export function computeAutoLayout(editor, options = {}) {
  const perfId = 'AutoLayout-' + Math.random().toString(36).slice(2, 6);
  console.time(perfId);
  let cycleCount = 0;

  const {
    nodeWidth = 180,
    nodeHeight = 100,
    gapX = 120,
    gapY = 80,
    startX = 60,
    startY = 60,
    crossingPasses = 4,
    existingPositions = null,
    groups = null // { [groupId]: [nodeId, ...] }
  } = options;

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
  // A localized version of the existing LTR layered Sugiyama logic
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

      const yPos = new Map();
      for (let l = 0; l < layerArr.length; l++) {
        for (let i = 0; i < layerArr[l].length; i++) {
          yPos.set(layerArr[l][i], i * (nodeHeight + gapY));
        }
      }

      function resolveOverlaps(layer, yMap, minSpacing) {
        if (layer.length === 0) return;
        for (let i = 1; i < layer.length; i++) {
          const py = yMap.get(layer[i - 1]), cy = yMap.get(layer[i]);
          if (cy < py + minSpacing) yMap.set(layer[i], py + minSpacing);
        }
        for (let i = layer.length - 2; i >= 0; i--) {
          const ny = yMap.get(layer[i + 1]), cy = yMap.get(layer[i]);
          if (cy > ny - minSpacing) yMap.set(layer[i], ny - minSpacing);
        }
      }

      for (let pass = 0; pass < 3; pass++) {
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
          resolveOverlaps(layerArr[l], yPos, nodeHeight + gapY);
        }
      }

      let minLocalY = Infinity, maxLocalY = -Infinity;
      for (const y of yPos.values()) {
        if (y < minLocalY) minLocalY = y;
        if (y > maxLocalY) maxLocalY = y;
      }
      if (minLocalY === Infinity) { minLocalY = 0; maxLocalY = 0; }

      for (let l = 0; l < layerArr.length; l++) {
        for (const node of layerArr[l]) {
          localPositions[node] = {
            x: l * (nodeWidth + gapX),
            y: yPos.get(node) - minLocalY
          };
        }
      }

      maxLinkedW = (layerArr.length || 1) * (nodeWidth + gapX);
      maxLinkedH = (maxLocalY - minLocalY) + nodeHeight + gapY;
    }

    // --- Isolated Subgraph Layout (Grid Wrap) ---
    let isolatedW = 0, isolatedH = 0;
    if (isolatedNodes.length > 0) {
       const MAX_COLS = 6;
       for (let i = 0; i < isolatedNodes.length; i++) {
          const node = isolatedNodes[i];
          const col = i % MAX_COLS;
          const row = Math.floor(i / MAX_COLS);
          
          localPositions[node] = {
             x: col * (nodeWidth + gapX),
             y: maxLinkedH + (row * (nodeHeight + gapY)) // Append below linked graph
          };
          
          const curW = (col + 1) * (nodeWidth + gapX);
          const curH = (row + 1) * (nodeHeight + gapY);
          if (curW > isolatedW) isolatedW = curW;
          if (curH > isolatedH) isolatedH = curH;
       }
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

    let step = 40;
    let maxR = 25000;
    for (let r = 0; r < maxR; r += step) {
      for (let delta = 0; delta <= M_PI; delta += M_PI/12) {
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

  // --- 6. Anchor Stabilization ---
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
      
      // Micro Overlap fallback resolving specifically after forced stabilization overlay
      const ids = Object.keys(finalPositions);
      for (let pass = 0; pass < 3; pass++) {
        let overlaps = false;
        cycleCount++;
        for (let i = 0; i < ids.length; i++) {
          for (let j = i + 1; j < ids.length; j++) {
            const p1 = finalPositions[ids[i]];
            const p2 = finalPositions[ids[j]];
            const dx = p1.x - p2.x, dy = p1.y - p2.y;
            const absDx = Math.abs(dx), absDy = Math.abs(dy);
            
            if (absDx < (nodeWidth + gapX * 0.5) && absDy < (nodeHeight + gapY * 0.5)) {
              overlaps = true;
              if (absDx < absDy) {
                const fix = ((nodeWidth + gapX * 0.5) - absDx) / 2 + 1;
                p1.x += dx > 0 ? fix : -fix;
                p2.x += dx > 0 ? -fix : fix;
              } else {
                const fix = ((nodeHeight + gapY * 0.5) - absDy) / 2 + 1;
                p1.y += dy > 0 ? fix : -fix;
                p2.y += dy > 0 ? -fix : fix;
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
  console.log(`[AutoLayout] Macro-Micro Groups: ${groupNodes.size}, Nodes: ${nodes.length}, Edges: ${connections.length}`);
  console.log(`[AutoLayout] Cycles (Pack/Sort/Overlap): ${cycleCount}`);
  
  return finalPositions;
}
