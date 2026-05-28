function snapGrid(value, grid) {
  return Math.round(value / grid) * grid;
}

function snapOutside(value, grid, direction) {
  return (direction < 0 ? Math.floor(value / grid) : Math.ceil(value / grid)) * grid;
}

function snapDir(deg) {
  const r = ((deg % 360) + 360) % 360;
  if (r < 45 || r >= 315) return { dx: 1, dy: 0 };
  if (r >= 45 && r < 135) return { dx: 0, dy: 1 };
  if (r >= 135 && r < 225) return { dx: -1, dy: 0 };
  return { dx: 0, dy: -1 };
}

function parallelShift(connections, conn, grid) {
  const group = connections.filter((candidate) =>
    candidate.from === conn.from &&
    candidate.to === conn.to &&
    candidate.out === conn.out &&
    candidate.in === conn.in
  );
  if (group.length <= 1) return 0;
  const index = Math.max(0, group.findIndex((candidate) => candidate.id === conn.id));
  return (index - (group.length - 1) / 2) * grid;
}

function compactPoints(points) {
  const compact = [];
  for (const point of points) {
    const previous = compact.at(-1);
    if (!previous || Math.abs(previous.x - point.x) > 0.5 || Math.abs(previous.y - point.y) > 0.5) {
      compact.push(point);
    }
  }
  return compact;
}

function simplifyCollinear(points) {
  const simplified = compactPoints(points);
  let changed = true;
  while (changed) {
    changed = false;
    for (let index = 1; index < simplified.length - 1; index += 1) {
      const prev = simplified[index - 1];
      const curr = simplified[index];
      const next = simplified[index + 1];
      const sameVertical = Math.abs(prev.x - curr.x) < 0.5 && Math.abs(curr.x - next.x) < 0.5;
      const sameHorizontal = Math.abs(prev.y - curr.y) < 0.5 && Math.abs(curr.y - next.y) < 0.5;
      if (sameVertical || sameHorizontal) {
        simplified.splice(index, 1);
        changed = true;
        break;
      }
    }
  }
  return simplified;
}

function segmentIntersectsRect(a, b, rect, pad = 0) {
  const left = rect.x - pad;
  const right = rect.x + rect.w + pad;
  const top = rect.y - pad;
  const bottom = rect.y + rect.h + pad;

  if (Math.abs(a.x - b.x) < 0.5) {
    const y1 = Math.min(a.y, b.y);
    const y2 = Math.max(a.y, b.y);
    return a.x >= left && a.x <= right && y2 > top && y1 < bottom;
  }

  if (Math.abs(a.y - b.y) < 0.5) {
    const x1 = Math.min(a.x, b.x);
    const x2 = Math.max(a.x, b.x);
    return a.y >= top && a.y <= bottom && x2 > left && x1 < right;
  }

  return false;
}

function mergeEndpointRects(rects, fromRect, toRect) {
  const merged = new Map(rects.map((rect) => [rect.id, rect]));
  merged.set(fromRect.id, fromRect);
  merged.set(toRect.id, toRect);
  return [...merged.values()];
}

function routeHitsBlockedArea(points, rects, fromRect, toRect, pad) {
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index];
    const b = points[index + 1];
    for (const rect of rects) {
      const sourceStub = rect.id === fromRect.id && index === 0;
      const targetStub = rect.id === toRect.id && index === points.length - 2;
      if (sourceStub || targetStub) continue;
      if (segmentIntersectsRect(a, b, rect, pad)) return true;
    }
  }
  return false;
}

function routeLength(points) {
  let length = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    length += Math.abs(points[index + 1].x - points[index].x) + Math.abs(points[index + 1].y - points[index].y);
  }
  return length;
}

function segmentDirections(points) {
  const directions = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index];
    const b = points[index + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
    if (Math.abs(dx) >= Math.abs(dy)) {
      directions.push({ axis: 'x', sign: Math.sign(dx), length: Math.abs(dx) });
    } else {
      directions.push({ axis: 'y', sign: Math.sign(dy), length: Math.abs(dy) });
    }
  }
  return directions;
}

function countBends(points) {
  const directions = segmentDirections(points);
  let bends = 0;
  for (let index = 1; index < directions.length; index += 1) {
    if (directions[index].axis !== directions[index - 1].axis) bends += 1;
  }
  return bends;
}

function countReversals(points, grid) {
  const directions = segmentDirections(points);
  let reversals = 0;
  for (let index = 1; index < directions.length; index += 1) {
    const prev = directions[index - 1];
    const curr = directions[index];
    if (prev.axis === curr.axis && prev.sign === -curr.sign) {
      reversals += 1;
    }
    const before = directions[index - 2];
    if (
      before &&
      before.axis === curr.axis &&
      before.sign === -curr.sign &&
      prev.length <= grid * 2
    ) {
      reversals += 1;
    }
  }
  return reversals;
}

function countShortJogs(points, grid) {
  const directions = segmentDirections(points);
  let jogs = 0;
  for (let index = 1; index < directions.length - 1; index += 1) {
    if (directions[index].length < grid) jogs += 1;
  }
  return jogs;
}

function routeScore(points, grid) {
  return (
    countReversals(points, grid) * 1_000_000 +
    routeLength(points) +
    countBends(points) * grid * 5 +
    countShortJogs(points, grid) * grid * 8
  );
}

function chooseBestRoute(candidates, rects, fromRect, toRect, grid, pad) {
  let best = null;
  for (const candidate of candidates) {
    const rawPoints = compactPoints(candidate);
    if (rawPoints.length < 2) continue;
    if (routeHitsBlockedArea(rawPoints, rects, fromRect, toRect, pad)) continue;
    const points = simplifyCollinear(rawPoints);
    if (points.length < 2) continue;
    if (routeHitsBlockedArea(points, rects, fromRect, toRect, pad)) continue;
    const score = routeScore(points, grid);
    if (!best || score < best.score) {
      best = { points, score };
    }
  }
  return best?.points || null;
}

function buildPath(points, chamfer = 0) {
  const pts = simplifyCollinear(points);
  let path = `M ${pts[0].x} ${pts[0].y}`;

  for (let index = 1; index < pts.length; index += 1) {
    const prev = pts[index - 1];
    const curr = pts[index];
    const next = pts[index + 1];

    if (next) {
      const dx1 = curr.x - prev.x;
      const dy1 = curr.y - prev.y;
      const dx2 = next.x - curr.x;
      const dy2 = next.y - curr.y;
      const isH1 = Math.abs(dx1) > Math.abs(dy1);
      const isH2 = Math.abs(dx2) > Math.abs(dy2);

      if (chamfer > 0 && isH1 !== isH2) {
        const len1 = Math.hypot(dx1, dy1);
        const len2 = Math.hypot(dx2, dy2);
        const minChamferSegment = chamfer * 3;
        if (len1 >= minChamferSegment && len2 >= minChamferSegment) {
          const c = Math.min(chamfer, len1 / 2, len2 / 2);
          const preX = curr.x - (dx1 / len1) * c;
          const preY = curr.y - (dy1 / len1) * c;
          const postX = curr.x + (dx2 / len2) * c;
          const postY = curr.y + (dy2 / len2) * c;
          path += ` L ${preX} ${preY} L ${postX} ${postY}`;
          continue;
        }
      }
    }

    if (Math.abs(curr.y - prev.y) < 0.5) {
      path += ` H ${curr.x}`;
    } else if (Math.abs(curr.x - prev.x) < 0.5) {
      path += ` V ${curr.y}`;
    } else {
      path += ` L ${curr.x} ${curr.y}`;
    }
  }

  return { path, points: pts };
}

function midpointArrow(points) {
  const index = Math.max(1, Math.floor(points.length / 2));
  const p1 = points[index - 1];
  const p2 = points[index] || points[index - 1];
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
    angle: Math.atan2(p2.y - p1.y, p2.x - p1.x),
  };
}

export function routePcbTrace({
  start,
  end,
  fromRect,
  toRect,
  fromAngle = 0,
  toAngle = 180,
  rects = [],
  connections = [],
  conn,
  grid = 10,
  stub = 28,
  clearance = 28,
  chamfer = 8,
}) {
  const fDir = snapDir(fromAngle);
  const tDir = snapDir(toAngle);
  const shift = parallelShift(connections, conn, grid);
  const absShift = Math.abs(shift);
  const stubFrom = {
    x: fDir.dx === 0 ? start.x : start.x + fDir.dx * stub,
    y: fDir.dy === 0 ? start.y : start.y + fDir.dy * stub,
  };
  const stubTo = {
    x: tDir.dx === 0 ? end.x : end.x + tDir.dx * stub,
    y: tDir.dy === 0 ? end.y : end.y + tDir.dy * stub,
  };
  const obstacleRects = mergeEndpointRects(rects, fromRect, toRect);
  const separatedDown = fromRect.y + fromRect.h + clearance < toRect.y - clearance;
  const separatedUp = toRect.y + toRect.h + clearance < fromRect.y - clearance;
  const minX = Math.min(fromRect.x, toRect.x);
  const maxX = Math.max(fromRect.x + fromRect.w, toRect.x + toRect.w);
  const leftLaneX = snapOutside(minX - clearance - absShift, grid, -1) + shift;
  const rightLaneX = snapOutside(maxX + clearance + absShift, grid, 1) + shift;
  const candidates = [];
  const addCandidate = (points) => candidates.push(points);

  if (end.x < start.x - grid && (separatedDown || separatedUp)) {
    const gapTop = separatedDown
      ? fromRect.y + fromRect.h + clearance
      : toRect.y + toRect.h + clearance;
    const gapBottom = separatedDown
      ? toRect.y - clearance
      : fromRect.y - clearance;
    const sourceOverTarget = fromRect.x < toRect.x + toRect.w && fromRect.x + fromRect.w > toRect.x;
    const compactSource = fromRect.w < toRect.w * 0.75;

    if (sourceOverTarget && compactSource) {
      const crossY = snapGrid((gapTop + gapBottom) / 2, grid) + shift;
      addCandidate([
        start,
        stubFrom,
        { x: stubFrom.x, y: crossY },
        { x: leftLaneX, y: crossY },
        { x: leftLaneX, y: stubTo.y },
        stubTo,
        end,
      ]);
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const lanePad = clearance + attempt * grid * 2 + absShift;
      const attemptLeftLaneX = snapOutside(minX - lanePad, grid, -1) + shift;
      const attemptRightLaneX = snapOutside(maxX + lanePad, grid, 1) + shift;
      const crossY = snapGrid((gapTop + gapBottom) / 2, grid) + shift;
      addCandidate([
        start,
        stubFrom,
        { x: attemptRightLaneX, y: stubFrom.y },
        { x: attemptRightLaneX, y: crossY },
        { x: attemptLeftLaneX, y: crossY },
        { x: attemptLeftLaneX, y: stubTo.y },
        stubTo,
        end,
      ]);
    }
  }

  const midCandidates = [
    snapGrid((stubFrom.x + stubTo.x) / 2, grid) + shift,
    rightLaneX,
    leftLaneX,
  ];

  for (const midX of midCandidates) {
    addCandidate([
      start,
      stubFrom,
      { x: midX, y: stubFrom.y },
      { x: midX, y: stubTo.y },
      stubTo,
      end,
    ]);
  }

  let points = chooseBestRoute(candidates, obstacleRects, fromRect, toRect, grid, 6);

  if (!points) {
    const maxBottom = Math.max(...obstacleRects.map((rect) => rect.y + rect.h));
    const bottomY = snapGrid(maxBottom + clearance + absShift, grid);
    points = simplifyCollinear([
      start,
      stubFrom,
      { x: stubFrom.x, y: bottomY },
      { x: stubTo.x, y: bottomY },
      stubTo,
      end,
    ]);
  }

  const routed = buildPath(points, chamfer);
  return {
    path: routed.path,
    points: routed.points,
    arrow: midpointArrow(routed.points),
  };
}
