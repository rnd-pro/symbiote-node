import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { routePcbTrace } from '../packages/symbiote-ui/canvas/PcbRouter.js';

function parseOrthogonalPath(path) {
  const commands = path.match(/[MLHV][^MLHV]*/g) || [];
  let x = 0;
  let y = 0;
  return commands.map((command) => {
    const type = command[0];
    const values = command.slice(1).trim().split(/[ ,]+/).filter(Boolean).map(Number);
    if (type === 'M' || type === 'L') {
      [x, y] = values;
    } else if (type === 'H') {
      [x] = values;
    } else if (type === 'V') {
      [y] = values;
    }
    return { type, x, y };
  });
}

function hasCollinearMiddlePoint(points) {
  for (let index = 1; index < points.length - 1; index += 1) {
    const prev = points[index - 1];
    const curr = points[index];
    const next = points[index + 1];
    const sameVertical = Math.abs(prev.x - curr.x) < 0.5 && Math.abs(curr.x - next.x) < 0.5;
    const sameHorizontal = Math.abs(prev.y - curr.y) < 0.5 && Math.abs(curr.y - next.y) < 0.5;
    if (sameVertical || sameHorizontal) return true;
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
    const dx = points[index + 1].x - points[index].x;
    const dy = points[index + 1].y - points[index].y;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
    directions.push(Math.abs(dx) >= Math.abs(dy)
      ? { axis: 'x', sign: Math.sign(dx), length: Math.abs(dx) }
      : { axis: 'y', sign: Math.sign(dy), length: Math.abs(dy) });
  }
  return directions;
}

function countReversals(points, grid = 10) {
  const directions = segmentDirections(points);
  let reversals = 0;
  for (let index = 1; index < directions.length; index += 1) {
    const prev = directions[index - 1];
    const curr = directions[index];
    if (prev.axis === curr.axis && prev.sign === -curr.sign) reversals += 1;
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

function hasLongDiagonal(points, maxLength = 12) {
  for (let index = 0; index < points.length - 1; index += 1) {
    const dx = Math.abs(points[index + 1].x - points[index].x);
    const dy = Math.abs(points[index + 1].y - points[index].y);
    if (dx > 0.5 && dy > 0.5 && Math.hypot(dx, dy) > maxLength) return true;
  }
  return false;
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

function segmentCrossesRectInterior(a, b, rect, inset = 0.5) {
  return segmentIntersectsRect(a, b, {
    x: rect.x + inset,
    y: rect.y + inset,
    w: rect.w - inset * 2,
    h: rect.h - inset * 2,
  });
}

function sharedOrthogonalLength(a1, a2, b1, b2) {
  if (Math.abs(a1.x - a2.x) < 0.5 && Math.abs(b1.x - b2.x) < 0.5 && Math.abs(a1.x - b1.x) < 0.5) {
    const aMin = Math.min(a1.y, a2.y);
    const aMax = Math.max(a1.y, a2.y);
    const bMin = Math.min(b1.y, b2.y);
    const bMax = Math.max(b1.y, b2.y);
    return Math.max(0, Math.min(aMax, bMax) - Math.max(aMin, bMin));
  }
  if (Math.abs(a1.y - a2.y) < 0.5 && Math.abs(b1.y - b2.y) < 0.5 && Math.abs(a1.y - b1.y) < 0.5) {
    const aMin = Math.min(a1.x, a2.x);
    const aMax = Math.max(a1.x, a2.x);
    const bMin = Math.min(b1.x, b2.x);
    const bMax = Math.max(b1.x, b2.x);
    return Math.max(0, Math.min(aMax, bMax) - Math.max(aMin, bMin));
  }
  return 0;
}

function maxSharedMiddleSegmentLength(aPoints, bPoints) {
  let max = 0;
  for (let aIndex = 1; aIndex < aPoints.length - 2; aIndex += 1) {
    for (let bIndex = 1; bIndex < bPoints.length - 2; bIndex += 1) {
      max = Math.max(max, sharedOrthogonalLength(
        aPoints[aIndex],
        aPoints[aIndex + 1],
        bPoints[bIndex],
        bPoints[bIndex + 1]
      ));
    }
  }
  return max;
}

describe('PCB router', () => {
  it('uses a sharp orthogonal route when the trace is too short for PCB lanes', () => {
    const routed = routePcbTrace({
      start: { x: 100, y: 100 },
      end: { x: 140, y: 126 },
      fromRect: { id: 'source', x: 60, y: 80, w: 40, h: 40 },
      toRect: { id: 'target', x: 140, y: 106, w: 40, h: 40 },
      fromAngle: 0,
      toAngle: 180,
      rects: [
        { id: 'source', x: 60, y: 80, w: 40, h: 40 },
        { id: 'target', x: 140, y: 106, w: 40, h: 40 },
      ],
      connections: [{ id: 'c1', from: 'source', to: 'target', out: 'out', in: 'in' }],
      conn: { id: 'c1', from: 'source', to: 'target', out: 'out', in: 'in' },
    });

    assert.equal(routed.path, 'M 100 100 H 120 V 126 H 140');
    assert.equal(routed.strategy, 'compact-elbow');
    assert.equal(countReversals(routed.points), 0, routed.path);
    assert.equal(routeLength(routed.points), 66, routed.path);
  });

  it('collapses tiny traces to a straight line when there is no room for an elbow', () => {
    const routed = routePcbTrace({
      start: { x: 100, y: 100 },
      end: { x: 112, y: 106 },
      fromRect: { id: 'source', x: 60, y: 80, w: 40, h: 40 },
      toRect: { id: 'target', x: 112, y: 86, w: 40, h: 40 },
      fromAngle: 0,
      toAngle: 180,
      rects: [
        { id: 'source', x: 60, y: 80, w: 40, h: 40 },
        { id: 'target', x: 112, y: 86, w: 40, h: 40 },
      ],
      connections: [{ id: 'c1', from: 'source', to: 'target', out: 'out', in: 'in' }],
      conn: { id: 'c1', from: 'source', to: 'target', out: 'out', in: 'in' },
    });

    assert.equal(routed.path, 'M 100 100 L 112 106');
    assert.equal(routed.strategy, 'compact-direct');
    assert.deepEqual(routed.points, [
      { x: 100, y: 100 },
      { x: 112, y: 106 },
    ]);
  });

  it('uses a direct route when endpoint node bounds overlap', () => {
    const source = { id: 'source', x: 0, y: 0, w: 100, h: 100 };
    const target = { id: 'target', x: 80, y: 40, w: 100, h: 100 };
    const conn = { id: 'c1', from: 'source', to: 'target', out: 'out', in: 'in' };
    const routed = routePcbTrace({
      start: { x: 100, y: 50 },
      end: { x: 80, y: 60 },
      fromRect: source,
      toRect: target,
      fromAngle: 0,
      toAngle: 180,
      rects: [source, target],
      connections: [conn],
      conn,
    });

    assert.equal(routed.strategy, 'overlap-direct');
    assert.equal(routed.path, 'M 100 50 L 80 60');
  });

  it('does not switch to compact fallback while there is still room for PCB routing', () => {
    const source = { id: 'source', x: 60, y: 80, w: 40, h: 40 };
    const target = { id: 'target', x: 190, y: 110, w: 40, h: 40 };
    const conn = { id: 'c1', from: 'source', to: 'target', out: 'out', in: 'in' };
    const routed = routePcbTrace({
      start: { x: 100, y: 100 },
      end: { x: 190, y: 130 },
      fromRect: source,
      toRect: target,
      fromAngle: 0,
      toAngle: 180,
      rects: [source, target],
      connections: [conn],
      conn,
    });

    assert.equal(routed.strategy, 'pcb-lane');
    assert.equal(countReversals(routed.points), 0, routed.path);
  });

  it('keeps moderate short traces in PCB-lane mode instead of compact mode', () => {
    const source = { id: 'source', x: 60, y: 80, w: 40, h: 40 };
    const target = { id: 'target', x: 154, y: 108, w: 40, h: 40 };
    const conn = { id: 'c1', from: 'source', to: 'target', out: 'out', in: 'in' };
    const routed = routePcbTrace({
      start: { x: 100, y: 100 },
      end: { x: 154, y: 128 },
      fromRect: source,
      toRect: target,
      fromAngle: 0,
      toAngle: 180,
      rects: [source, target],
      connections: [conn],
      conn,
    });

    assert.equal(routed.strategy, 'pcb-lane');
    assert.equal(countReversals(routed.points), 0, routed.path);
  });

  it('routes compact portal-to-card traces without 180-degree folds', () => {
    const routed = routePcbTrace({
      start: { x: 196.25, y: 126 },
      end: { x: 79, y: 401.9 },
      fromRect: { id: 'portal', x: 155.25, y: 44, w: 82, h: 82 },
      toRect: { id: 'article', x: 77, y: 210, w: 238.5, h: 365.1 },
      fromAngle: 90,
      toAngle: 180,
      rects: [
        { id: 'portal', x: 155.25, y: 44, w: 82, h: 82 },
        { id: 'article', x: 77, y: 210, w: 238.5, h: 365.1 },
      ],
      connections: [{ id: 'c1', from: 'portal', to: 'article', out: 'out', in: 'in' }],
      conn: { id: 'c1', from: 'portal', to: 'article', out: 'out', in: 'in' },
    });

    const pathPoints = parseOrthogonalPath(routed.path);

    assert.ok(routed.path.includes(' L '), routed.path);
    assert.equal(hasCollinearMiddlePoint(routed.points), false, routed.path);
    assert.equal(countReversals(routed.points), 0, routed.path);
    assert.equal(hasLongDiagonal(pathPoints), false, routed.path);
    assert.ok(routeLength(routed.points) <= 472, routed.path);
  });

  it('projects off-edge connector stubs outside endpoint bounds before routing', () => {
    const source = { id: 'source', x: 100, y: 100, w: 100, h: 80 };
    const target = { id: 'target', x: 420, y: 100, w: 120, h: 80 };
    const routed = routePcbTrace({
      start: { x: 150, y: 140 },
      end: { x: 480, y: 140 },
      fromRect: source,
      toRect: target,
      fromAngle: 0,
      toAngle: 180,
      rects: [source, target],
      connections: [{ id: 'c1', from: 'source', to: 'target', out: 'out', in: 'in' }],
      conn: { id: 'c1', from: 'source', to: 'target', out: 'out', in: 'in' },
      stub: 28,
    });

    assert.ok(routed.points[1].x >= source.x + source.w + 28, routed.path);
    assert.ok(routed.points.at(-2).x <= target.x - 28, routed.path);
    assert.equal(countReversals(routed.points), 0, routed.path);
  });

  it('moves endpoint stubs to a clean side when the preferred side is blocked', () => {
    const rotor = { id: 'rotor', x: 258.75, y: 289, w: 94.5, h: 58 };
    const planner = { id: 'planner', x: 522, y: 74.4, w: 108, h: 58 };
    const hub = { id: 'hub', x: 396, y: 285, w: 108, h: 66 };
    const trace = { id: 'trace', x: 423, y: 483.6, w: 108, h: 58 };
    const conn = { id: 'rotor-planner', from: 'rotor', to: 'planner', out: 'out', in: 'in' };
    const routed = routePcbTrace({
      start: { x: 342.4864864864865, y: 289 },
      end: { x: 539.5135135135135, y: 132.4 },
      fromRect: rotor,
      toRect: planner,
      fromAngle: -37,
      toAngle: 143,
      rects: [rotor, planner, hub, trace],
      connections: [conn],
      conn,
      grid: 10,
      stub: 28,
      clearance: 34,
      chamfer: 8,
    });

    assert.equal(countReversals(routed.points), 0, routed.path);
    for (const rect of [hub, trace]) {
      for (let index = 0; index < routed.points.length - 1; index += 1) {
        assert.equal(segmentIntersectsRect(routed.points[index], routed.points[index + 1], rect, 1), false, routed.path);
      }
    }
  });

  it('does not escape through the endpoint node interior when changing stub side', () => {
    const source = { id: 'source', x: 0, y: 0, w: 100, h: 100 };
    const target = { id: 'target', x: 300, y: 0, w: 100, h: 100 };
    const blocker = { id: 'blocker', x: 120, y: -20, w: 80, h: 80 };
    const conn = { id: 'c1', from: 'source', to: 'target', out: 'out', in: 'in' };
    const routed = routePcbTrace({
      start: { x: 50, y: 0 },
      end: { x: 300, y: 50 },
      fromRect: source,
      toRect: target,
      fromAngle: 0,
      toAngle: 180,
      rects: [source, target, blocker],
      connections: [conn],
      conn,
      stub: 28,
      clearance: 28,
    });

    assert.equal(countReversals(routed.points), 0, routed.path);
    for (let index = 0; index < routed.points.length - 1; index += 1) {
      assert.equal(segmentCrossesRectInterior(routed.points[index], routed.points[index + 1], source), false, routed.path);
      assert.equal(segmentCrossesRectInterior(routed.points[index], routed.points[index + 1], target), false, routed.path);
    }
  });

  it('can compare raw geometry routing before snapping lanes to the grid', () => {
    const source = { id: 'source', x: 0.3, y: 0.7, w: 100.2, h: 80.2 };
    const target = { id: 'target', x: 312.6, y: 96.4, w: 100.2, h: 80.2 };
    const blocker = { id: 'blocker', x: 140.5, y: 35.5, w: 70.2, h: 94.2 };
    const conn = { id: 'c1', from: 'source', to: 'target', out: 'out', in: 'in' };
    const common = {
      start: { x: 100.5, y: 40.8 },
      end: { x: 312.6, y: 136.5 },
      fromRect: source,
      toRect: target,
      fromAngle: 0,
      toAngle: 180,
      rects: [source, target, blocker],
      connections: [conn],
      conn,
      grid: 10,
      stub: 28,
      clearance: 34,
      chamfer: 0,
    };
    const raw = routePcbTrace({ ...common, snapToGrid: false });
    const snapped = routePcbTrace({ ...common, snapToGrid: true });

    assert.notEqual(raw.path, snapped.path);
    assert.ok(raw.points.some((point) => Math.abs(point.y - 88.65) < 0.01), raw.path);
    assert.ok(snapped.points.some((point) => Math.abs(point.y - 90) < 0.01), snapped.path);
    assert.equal(countReversals(raw.points), 0, raw.path);
    assert.equal(countReversals(snapped.points), 0, snapped.path);
  });

  it('keeps vertical feed traces in a clear corridor between cards', () => {
    const source = { id: 'source', x: 77, y: 210, w: 238.5, h: 365.1 };
    const target = { id: 'target', x: 77, y: 663, w: 238.5, h: 365.1 };
    const routed = routePcbTrace({
      start: { x: 313.5, y: 551.1 },
      end: { x: 79, y: 854.9 },
      fromRect: source,
      toRect: target,
      fromAngle: 0,
      toAngle: 180,
      rects: [source, target],
      connections: [{ id: 'c1', from: 'source', to: 'target', out: 'next', in: 'feed' }],
      conn: { id: 'c1', from: 'source', to: 'target', out: 'next', in: 'feed' },
    });

    const pathPoints = parseOrthogonalPath(routed.path);
    const middleSegments = routed.points.slice(1, -1);

    assert.ok(routed.path.includes(' L '), routed.path);
    assert.equal(hasCollinearMiddlePoint(routed.points), false, routed.path);
    assert.equal(countReversals(routed.points), 0, routed.path);
    assert.equal(hasLongDiagonal(pathPoints), false, routed.path);
    assert.ok(routeLength(routed.points) <= 700, routed.path);

    for (let index = 1; index < routed.points.length - 2; index += 1) {
      assert.equal(segmentIntersectsRect(routed.points[index], routed.points[index + 1], source, 1), false, routed.path);
      assert.equal(segmentIntersectsRect(routed.points[index], routed.points[index + 1], target, 1), false, routed.path);
    }

    assert.ok(middleSegments.some((point) => point.y > source.y + source.h && point.y < target.y), routed.path);
  });

  it('uses authoritative obstacle rects for vertical feed channels', () => {
    const source = { id: 'source', x: 69.25, y: 210, w: 238, h: 364 };
    const target = { id: 'target', x: 69.25, y: 662, w: 238, h: 364 };
    const next = { id: 'next', x: 69.25, y: 1114, w: 238, h: 364 };
    const routed = routePcbTrace({
      start: { x: 307.25, y: 551.5703125 },
      end: { x: 69.25, y: 854.375 },
      fromRect: { ...source, y: 551.5703125, h: 100 },
      toRect: { ...target, y: 854.375, h: 100 },
      fromAngle: 0,
      toAngle: 180,
      rects: [source, target, next],
      connections: [
        { id: 'c1', from: 'source', to: 'target', out: 'next', in: 'feed' },
        { id: 'c2', from: 'target', to: 'next', out: 'next', in: 'feed' },
      ],
      conn: { id: 'c1', from: 'source', to: 'target', out: 'next', in: 'feed' },
    });

    assert.equal(countReversals(routed.points), 0, routed.path);
    assert.equal(hasLongDiagonal(parseOrthogonalPath(routed.path)), false, routed.path);
    assert.ok(routeLength(routed.points) < 760, routed.path);
    assert.ok(routed.points.some((point) => point.y > source.y + source.h && point.y < target.y), routed.path);
    assert.equal(routed.points.some((point) => point.y > next.y), false, routed.path);
  });

  it('routes avatar fan-out traces around node bounds on separate channels', () => {
    const avatar = { id: 'avatar', x: 120, y: 160, w: 220, h: 220 };
    const portal = { id: 'portal', x: 189, y: 24, w: 82, h: 82 };
    const about = { id: 'about', x: 92, y: 438, w: 300, h: 164 };
    const connections = [
      { id: 'pulse', from: 'avatar', to: 'portal', out: 'pulse', in: 'in' },
      { id: 'profile', from: 'avatar', to: 'about', out: 'profile', in: 'profile' },
    ];
    const pulse = routePcbTrace({
      start: { x: 258, y: 164 },
      end: { x: 210, y: 101 },
      fromRect: avatar,
      toRect: portal,
      fromAngle: -75,
      toAngle: 120,
      rects: [avatar, portal, about],
      connections,
      conn: connections[0],
    });
    const profile = routePcbTrace({
      start: { x: 202, y: 376 },
      end: { x: 92, y: 520 },
      fromRect: avatar,
      toRect: about,
      fromAngle: 105,
      toAngle: 180,
      rects: [avatar, portal, about],
      connections,
      conn: connections[1],
    });

    assert.equal(countReversals(pulse.points), 0, pulse.path);
    assert.equal(countReversals(profile.points), 0, profile.path);
    assert.ok(maxSharedMiddleSegmentLength(pulse.points, profile.points) < 1, `${pulse.path}\n${profile.path}`);

    for (const routed of [pulse, profile]) {
      for (let index = 1; index < routed.points.length - 2; index += 1) {
        assert.equal(segmentIntersectsRect(routed.points[index], routed.points[index + 1], avatar, 1), false, routed.path);
        assert.equal(segmentIntersectsRect(routed.points[index], routed.points[index + 1], portal, 1), false, routed.path);
        assert.equal(segmentIntersectsRect(routed.points[index], routed.points[index + 1], about, 1), false, routed.path);
      }
    }
  });
});
