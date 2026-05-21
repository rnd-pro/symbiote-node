import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  DOT_RADIUS,
  getGroupOrbitMetrics,
  getLayerTransform,
  getNodeColor,
  getNodeRadius,
  getRadialMenuHit,
  getRadialMenuLayout,
} from '../canvas/CanvasGraph/CanvasGraphGeometry.js';
import {
  getDepthGroupsFrame,
  getLayerAnimationFrame,
  getNextPulseQueue,
  resolveGroupOrbitRotationFrame,
  resolveDeactivationFrame,
  resolveFocusFrame,
  resolveIdleFrame,
  resolveViewportAnimation,
} from '../canvas/CanvasGraph/CanvasGraphDrawState.js';

describe('CanvasGraph geometry helpers', () => {
  it('keeps plain node radius scaled by connection hub weight', () => {
    let radius = getNodeRadius({ aScale: 1 }, 4);

    assert.equal(radius, DOT_RADIUS * 1.4);
  });

  it('computes group radius from visible child orbit bounds', () => {
    let node = { isGroup: true, children: ['a', 'b', 'c', 'd'], aScale: 1 };
    let radius = getNodeRadius(node, 0);

    assert.equal(Number(radius.toFixed(3)), 5.519);
  });

  it('reuses group orbit metrics for child dot layout', () => {
    let node = { isGroup: true, children: ['a', 'b', 'c'], aScale: 1 };
    let metrics = getGroupOrbitMetrics(node, 0);

    assert.equal(metrics.childCount, 3);
    assert.equal(metrics.innerR, DOT_RADIUS * 0.18);
    assert.equal(Number(metrics.orbitR.toFixed(3)), 1.559);
  });

  it('prefers custom hex colors over type palette colors', () => {
    assert.deepEqual(getNodeColor({ color: '#3af' }), [51, 170, 255]);
    assert.deepEqual(getNodeColor({ type: 'config' }), [255, 200, 120]);
  });

  it('returns depth-zero focus transform around the focus point', () => {
    let transform = getLayerTransform({
      depth: 0,
      layerAnim: { 0: { scale: 1.2, parallax: 0 } },
      dpr: 2,
      zoom: 0.5,
      panX: 100,
      panY: 50,
      vcx: 400,
      vcy: 300,
      focusActive: true,
      focusX: 250,
      focusY: 125,
      dragDeltaX: 0,
      dragDeltaY: 0,
    });

    assert.deepEqual(transform, { A: 1.2, E: 250 * -0.2 + 240, F: 125 * -0.2 + 120 });
  });

  it('returns parallax transform for background depth layers', () => {
    let transform = getLayerTransform({
      depth: 2,
      layerAnim: {
        2: { scale: 0.9, parallax: 0.04 },
      },
      dpr: 2,
      zoom: 0.5,
      panX: 100,
      panY: 50,
      vcx: 400,
      vcy: 300,
      focusActive: false,
      focusX: 0,
      focusY: 0,
      dragDeltaX: 20,
      dragDeltaY: -10,
    });

    assert.deepEqual(transform, {
      A: 0.9,
      E: 0.9 * 2 * 100 + 400 * 0.1 - 0.8,
      F: 0.9 * 2 * 50 + 300 * 0.1 + 0.4,
    });
  });

  it('detects radial menu hits by action item', () => {
    let item = getRadialMenuHit({
      world: { x: 10, y: 33 },
      activeNode: { id: 'node-a', aScale: 1 },
      activePosition: { x: 10, y: 10 },
      connectionCount: 0,
      menuItems: [
        { action: 'inspect' },
        { action: 'delete' },
      ],
    });

    assert.equal(item?.action, 'delete');
  });

  it('lays out radial menu items with eased radius', () => {
    let layout = getRadialMenuLayout({
      activeNode: { id: 'node-a', aScale: 1 },
      activePosition: { x: 10, y: 10 },
      connectionCount: 0,
      menuAnim: 0.5,
      menuItems: [
        { action: 'inspect' },
        { action: 'delete' },
      ],
    });

    assert.equal(layout.easeOut, 0.875);
    assert.equal(layout.items[0].item.action, 'inspect');
    assert.equal(Number(layout.items[0].y.toFixed(3)), -7.5);
    assert.equal(layout.items[1].item.action, 'delete');
    assert.equal(Number(layout.items[1].y.toFixed(3)), 27.5);
  });
});

describe('CanvasGraph draw state helpers', () => {
  it('keeps wheel zoom anchored while interpolating viewport state', () => {
    let frame = resolveViewportAnimation({
      zoom: 1,
      targetZoom: 2,
      panX: 10,
      panY: 20,
      targetPanX: null,
      targetPanY: null,
      zoomAnchor: { mx: 100, my: 200 },
    });

    assert.equal(frame.zoom, 1.15);
    assert.equal(Number(frame.panX.toFixed(3)), -3.5);
    assert.equal(Number(frame.panY.toFixed(3)), -7);
    assert.equal(frame.targetPanX, null);
  });

  it('settles pan animation when target delta is sub-pixel', () => {
    let frame = resolveViewportAnimation({
      zoom: 1,
      targetZoom: 1,
      panX: 99.8,
      panY: 50.2,
      targetPanX: 100,
      targetPanY: 50,
      zoomAnchor: null,
    });

    assert.equal(frame.panX, 100);
    assert.equal(frame.panY, 50);
    assert.equal(frame.targetPanX, null);
    assert.equal(frame.targetPanY, null);
  });

  it('switches active node after deactivation settles without deselecting', () => {
    let activeNode = { id: 'node-a' };
    let nextActiveNode = { id: 'node-b' };
    let frame = resolveDeactivationFrame({
      deactivating: true,
      activeNode,
      nextActiveNode,
      layerAnim: {
        0: { scale: 1.005 },
        4: { scale: 0.995 },
      },
    });

    assert.equal(frame.activeNode, nextActiveNode);
    assert.equal(frame.nextActiveNode, null);
    assert.equal(frame.deactivating, false);
    assert.equal(frame.deselected, false);
    assert.equal(frame.interactionDepthsChanged, true);
  });

  it('advances layer animation toward idle or active targets', () => {
    let layerAnim = {
      0: { scale: 1, opacity: 1, parallax: 0 },
      1: { scale: 1, opacity: 1, parallax: 0 },
      2: { scale: 1, opacity: 1, parallax: 0 },
      3: { scale: 1, opacity: 1, parallax: 0 },
      4: { scale: 1, opacity: 1, parallax: 0 },
    };
    let layerTargets = {
      scale: [1.12, 1, 0.95, 0.88, 0.78],
      opacity: [1, 0.9, 0.55, 0.06, 0.03],
      parallax: [0, 0, 0.02, 0.04, 0.07],
    };
    let frame = getLayerAnimationFrame({
      layerAnim,
      layerTargets,
      isIdle: false,
      inGroupMode: true,
    });

    assert.equal(Number(frame[0].scale.toFixed(4)), 1.0072);
    assert.equal(Number(frame[3].scale.toFixed(4)), 0.964);
    assert.equal(Number(frame[3].opacity.toFixed(4)), 0.718);
    assert.equal(layerAnim[3].scale, 1);
  });

  it('replaces an existing pulse for the same node instead of stacking rings', () => {
    let queue = getNextPulseQueue({
      pulses: [
        { id: 'node-a', startTime: 10, duration: 1000 },
        { id: 'node-b', startTime: 20, duration: 1000 },
      ],
      nodeId: 'node-a',
      startTime: 30,
      duration: 1500,
    });

    assert.deepEqual(queue, [
      { id: 'node-b', startTime: 20, duration: 1000 },
      { id: 'node-a', startTime: 30, duration: 1500 },
    ]);
  });

  it('keeps active group orbit static unless the group is hovered or dragged', () => {
    let inactive = resolveGroupOrbitRotationFrame({
      rotation: 4,
      rotationSpeed: 0,
      hovered: false,
      dragged: false,
    });

    assert.equal(inactive.rotation, 4);
    assert.equal(inactive.rotationSpeed, 0);

    let hovered = resolveGroupOrbitRotationFrame({
      rotation: 4,
      rotationSpeed: 0,
      hovered: true,
      dragged: false,
    });

    assert.equal(hovered.rotation > 4, true);
    assert.equal(hovered.rotationSpeed > 0, true);
  });

  it('centers active focus around the combined node and panel bounds once', () => {
    let frame = resolveFocusFrame({
      activeNode: { id: 'node-a' },
      deactivating: false,
      activePosition: { x: 80, y: 40 },
      infoPanel: { totalExtent: 120, totalExtentY: 30, _centeredForNode: null },
      canvasRect: { width: 400, height: 300 },
      dpr: 2,
      zoom: 0.5,
      panX: 10,
      panY: 20,
      focusX: 0,
      focusY: 0,
      focusActive: false,
      vcx: 200,
      vcy: 150,
    });

    assert.equal(frame.focusX, 100);
    assert.equal(frame.focusY, 80);
    assert.equal(frame.focusActive, true);
    assert.equal(frame.dragDeltaX, -100);
    assert.equal(frame.dragDeltaY, -70);
    assert.equal(frame.targetPanX, 130);
    assert.equal(frame.targetPanY, 122.5);
    assert.equal(frame.centeredForNode, 'node-a');
  });

  it('leaves focus unchanged while an active node has no resolved position', () => {
    let frame = resolveFocusFrame({
      activeNode: { id: 'node-a' },
      deactivating: false,
      activePosition: null,
      infoPanel: { totalExtent: 0, totalExtentY: 0, _centeredForNode: null },
      canvasRect: null,
      dpr: 2,
      zoom: 0.5,
      panX: 10,
      panY: 20,
      focusX: 30,
      focusY: 40,
      focusActive: true,
      vcx: 200,
      vcy: 150,
    });

    assert.equal(frame.focusX, 30);
    assert.equal(frame.focusY, 40);
    assert.equal(frame.focusActive, true);
    assert.equal(frame.dragDeltaX, 0);
    assert.equal(frame.dragDeltaY, 0);
    assert.equal(frame.targetPanX, null);
  });

  it('keeps active, dragged, and hovered nodes drawn last within their depths', () => {
    let normal = { id: 'normal', targetDepth: 1 };
    let active = { id: 'active', targetDepth: 1 };
    let dragged = { id: 'dragged', targetDepth: 0 };
    let hovered = { id: 'hovered' };
    let groups = getDepthGroupsFrame({
      edges: [{ id: 'edge-a', targetDepth: 2 }, { id: 'edge-b' }],
      nodes: [active, normal, hovered, dragged],
      activeNode: active,
      dragNode: dragged,
      hoverNode: hovered,
    });

    assert.deepEqual(groups[1].nodes, [normal, active]);
    assert.deepEqual(groups[0].nodes, [dragged]);
    assert.deepEqual(groups[4].nodes, [hovered]);
    assert.equal(groups[2].edges[0].id, 'edge-a');
    assert.equal(groups[4].edges[0].id, 'edge-b');
  });

  it('increments idle frames only when all draw activity has settled', () => {
    let frame = resolveIdleFrame({
      targetZoom: 1,
      zoom: 1,
      dragDeltaX: 0,
      dragDeltaY: 0,
      prevDragDeltaX: 0,
      prevDragDeltaY: 0,
      layerAnim: { 0: { scale: 1 } },
      isIdle: true,
      layerTargets: { scale: [1] },
      lastAlpha: 0,
      dragNode: null,
      isPanning: false,
      deactivating: false,
      targetPanX: null,
      infoPanel: { opacity: 0, lines: [] },
      idleFrames: 3,
    });

    assert.equal(frame.idleFrames, 4);
    assert.equal(frame.shouldStop, true);

    let activeFrame = resolveIdleFrame({
      targetZoom: 1,
      zoom: 1,
      dragDeltaX: 0,
      dragDeltaY: 0,
      prevDragDeltaX: 0,
      prevDragDeltaY: 0,
      layerAnim: { 0: { scale: 1 } },
      isIdle: true,
      layerTargets: { scale: [1] },
      lastAlpha: 0.01,
      infoPanel: { opacity: 0, lines: [] },
      idleFrames: 3,
    });

    assert.equal(activeFrame.idleFrames, 0);
    assert.equal(activeFrame.shouldStop, false);
  });
});
