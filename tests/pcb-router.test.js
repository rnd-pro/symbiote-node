import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { routePcbTrace } from '../canvas/PcbRouter.js';

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

describe('PCB router', () => {
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
});
