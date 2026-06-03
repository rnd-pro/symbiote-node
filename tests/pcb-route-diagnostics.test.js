import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzePcbRoute,
  analyzePcbRouteSet,
  parsePcbPathPoints,
  summarizePcbRouteQuality,
} from '../packages/symbiote-ui/canvas/PcbRouteDiagnostics.js';

describe('PCB route diagnostics', () => {
  it('parses PCB path commands into points for rendered-route checks', () => {
    assert.deepEqual(parsePcbPathPoints('M 10 20 H 40 V 60 L 54 74'), [
      { x: 10, y: 20 },
      { x: 40, y: 20 },
      { x: 40, y: 60 },
      { x: 54, y: 74 },
    ]);
  });

  it('reports node crossings while allowing source and target endpoint stubs', () => {
    const source = { id: 'source', x: 0, y: 30, w: 20, h: 40 };
    const target = { id: 'target', x: 220, y: 30, w: 20, h: 40 };
    const blocker = { id: 'blocker', x: 96, y: 30, w: 44, h: 40 };
    const result = analyzePcbRoute({
      id: 'crossing',
      points: [
        { x: 20, y: 50 },
        { x: 220, y: 50 },
      ],
      fromRect: source,
      toRect: target,
      rects: [source, target, blocker],
    });

    assert.equal(result.summary.byRule.nodeIntersection, 1);
    assert.deepEqual(result.violations.map((violation) => violation.rule), ['nodeIntersection']);
    assert.equal(result.violations[0].rectId, 'blocker');
  });

  it('reports endpoint stubs that pass through their own node interior', () => {
    const source = { id: 'source', x: 0, y: 0, w: 100, h: 100 };
    const target = { id: 'target', x: 300, y: 0, w: 100, h: 100 };
    const result = analyzePcbRoute({
      id: 'self-crossing-stub',
      points: [
        { x: 50, y: 0 },
        { x: 50, y: 128 },
        { x: 300, y: 50 },
      ],
      fromRect: source,
      toRect: target,
      rects: [source, target],
    });

    assert.equal(result.summary.byRule.nodeIntersection, 1);
    assert.equal(result.violations[0].rectId, 'source');
  });

  it('classifies overlapping endpoint nodes separately from route node crossings', () => {
    const source = { id: 'source', x: 0, y: 0, w: 100, h: 100 };
    const target = { id: 'target', x: 80, y: 40, w: 100, h: 100 };
    const result = analyzePcbRoute({
      id: 'overlap',
      points: [
        { x: 100, y: 50 },
        { x: 80, y: 60 },
      ],
      fromRect: source,
      toRect: target,
      rects: [source, target],
    });

    assert.equal(result.summary.byRule.endpointOverlap, 1);
    assert.equal(result.summary.byRule.nodeIntersection, 0);
  });

  it('reports 180-degree folds and long rendered diagonals', () => {
    const result = analyzePcbRoute({
      id: 'folded',
      path: 'M 0 0 H 100 V 10 H 40 L 70 40',
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 10 },
        { x: 40, y: 10 },
        { x: 70, y: 40 },
      ],
      fromRect: { id: 'from', x: -20, y: -20, w: 20, h: 40 },
      toRect: { id: 'to', x: 70, y: 40, w: 20, h: 40 },
      rects: [],
      grid: 10,
    });

    assert.ok(result.summary.byRule.reversal >= 1);
    assert.equal(result.summary.byRule.longDiagonal, 1);
  });

  it('allows short straight fallback routes without flagging a PCB diagonal', () => {
    const result = analyzePcbRoute({
      id: 'short-straight',
      points: [
        { x: 0, y: 0 },
        { x: 34, y: 18 },
      ],
      path: 'M 0 0 L 34 18',
      straightLineAllowance: 80,
    });

    assert.equal(result.summary.byRule.longDiagonal, 0);
  });

  it('reports shared middle channels between route pairs', () => {
    const result = analyzePcbRouteSet([
      {
        id: 'a',
        points: [
          { x: 0, y: 0 },
          { x: 40, y: 0 },
          { x: 40, y: 120 },
          { x: 100, y: 120 },
        ],
      },
      {
        id: 'b',
        points: [
          { x: 0, y: 20 },
          { x: 40, y: 20 },
          { x: 40, y: 140 },
          { x: 100, y: 140 },
        ],
      },
    ], {
      maxSharedMiddleSegment: 10,
    });

    assert.equal(result.summary.byRule.sharedChannel, 1);
    assert.equal(result.sharedViolations[0].routeIds.join(':'), 'a:b');
    assert.equal(result.sharedViolations[0].length, 100);
  });

  it('uses path geometry for shared-channel diagnostics when points are empty', () => {
    const result = analyzePcbRouteSet([
      {
        id: 'a',
        points: [],
        path: 'M 0 0 H 40 V 120 H 100',
      },
      {
        id: 'b',
        points: [],
        path: 'M 0 20 H 40 V 140 H 100',
      },
    ], {
      maxSharedMiddleSegment: 10,
    });

    assert.equal(result.summary.byRule.sharedChannel, 1);
    assert.equal(result.sharedViolations[0].length, 100);
  });

  it('summarizes hard and soft route quality for agent consumers', () => {
    const quality = summarizePcbRouteQuality({
      total: 4,
      byRule: {
        nodeIntersection: 1,
        reversal: 1,
        sharedChannel: 2,
      },
    });

    assert.equal(quality.pass, false);
    assert.equal(quality.hardFailures, 2);
    assert.equal(quality.softWarnings, 2);
    assert.equal(quality.hardRules.nodeIntersection, 1);
    assert.equal(quality.hardRules.selfIntersection, 0);
    assert.equal(quality.softRules.sharedChannel, 2);
  });
});
