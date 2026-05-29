import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

let PKG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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

  it('prefers custom hex colors over provider type palette colors', () => {
    let typeColors = {
      config: [255, 200, 120],
      data: [120, 180, 255],
    };

    assert.deepEqual(getNodeColor({ color: '#3af' }), [51, 170, 255]);
    assert.deepEqual(getNodeColor({ type: 'config' }, typeColors), [255, 200, 120]);
    assert.deepEqual(getNodeColor({ type: 'unknown' }, typeColors), [120, 180, 255]);
    assert.deepEqual(getNodeColor({ type: 'unknown' }), [120, 180, 255]);
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

describe('CanvasGraph theme contract', () => {
  it('derives canvas accent colors from CSS theme tokens', () => {
    let source = fs.readFileSync(path.join(PKG_ROOT, 'canvas/CanvasGraph/CanvasGraph.js'), 'utf8');

    for (let token of ['--sn-bg', '--sn-conn-color', '--sn-node-selected', '--sn-danger-color', '--sn-text', '--sn-text-dim']) {
      assert.ok(source.includes(token), `CanvasGraph must read ${token}`);
    }
    assert.ok(source.includes('GRAPH_TYPE_COLOR_TOKENS'), 'CanvasGraph must use the provider graph type token contract');
    let graphThemeContract = fs.readFileSync(path.join(PKG_ROOT, 'graph/theme-contract.js'), 'utf8');
    for (let token of ['--sn-graph-type-data', '--sn-graph-type-action']) {
      assert.ok(graphThemeContract.includes(token), `graph theme contract must publish ${token}`);
    }

    for (let literal of [
      'rgba(74, 158, 255',
      'rgba(76, 139, 245',
      'rgba(60, 20, 20',
      'rgba(255, 107, 107',
      'rgba(255, 255, 255',
      '#1a1a1a',
      'TYPE_COLORS',
    ]) {
      assert.equal(source.includes(literal), false, `CanvasGraph must not hardcode ${literal}`);
    }
  });

  it('keeps canvas connection rendering scoped to provider theme tokens', () => {
    let source = fs.readFileSync(
      path.join(PKG_ROOT, 'canvas/CanvasConnectionRenderer.js'),
      'utf8',
    );

    for (let token of [
      '--sn-bg',
      '--sn-conn-color',
      '--sn-conn-selected',
      '--sn-port-outline',
      '--sn-node-selected',
      '--sn-danger-color',
      '--sn-text',
      '--sn-socket-size',
      '--sn-socket-border-width',
      '--sn-conn-dot-stroke-width',
      '--sn-conn-dot-r',
    ]) {
      assert.ok(source.includes(token), `CanvasConnectionRenderer must read ${token}`);
    }

    for (let forbidden of [
      'getComputedStyle(document.body)',
      '#4a9eff',
      '#ff6b6b',
      '#16213e',
      '#1a1a2e',
      '#fff',
      'color-mix(in srgb, ${baseColor}',
    ]) {
      assert.equal(source.includes(forbidden), false, `CanvasConnectionRenderer must not use ${forbidden}`);
    }

    assert.ok(source.includes('resolveCssVars'), 'CanvasConnectionRenderer must resolve provider CSS variables before canvas drawing');
  });

  it('derives SVG connector dot geometry from the socket theme size', () => {
    let canvasCss = fs.readFileSync(path.join(PKG_ROOT, 'canvas/NodeCanvas/NodeCanvas.css.js'), 'utf8');
    let portCss = fs.readFileSync(path.join(PKG_ROOT, 'node/PortItem/PortItem.css.js'), 'utf8');
    let socketCss = fs.readFileSync(path.join(PKG_ROOT, 'node/NodeSocket/NodeSocket.css.js'), 'utf8');
    let theme = fs.readFileSync(path.join(PKG_ROOT, 'themes/default-dark.js'), 'utf8');

    assert.ok(canvasCss.includes('--sn-socket-size'), 'SVG connector dots must use --sn-socket-size');
    assert.ok(canvasCss.includes('--sn-socket-border-width'), 'SVG connector dots must use --sn-socket-border-width');
    assert.ok(portCss.includes('width: var(--sn-socket-size);'), 'port sockets must use --sn-socket-size');
    assert.ok(socketCss.includes('width: var(--sn-socket-size);'), 'node-socket must use --sn-socket-size');
    assert.ok(
      theme.includes("'--sn-conn-dot-r': 'calc((var(--sn-socket-size) + var(--sn-conn-dot-stroke-width)) / 2)'"),
      'default SVG connector radius must derive from the socket size token'
    );
  });

  it('keeps SVG node labels inside the shared quick toolbar title row', () => {
    let graphNodeCss = fs.readFileSync(path.join(PKG_ROOT, 'node/GraphNode/GraphNode.css.js'), 'utf8');
    let quickToolbar = fs.readFileSync(path.join(PKG_ROOT, 'toolbar/QuickToolbar/QuickToolbar.js'), 'utf8');
    let quickToolbarTemplate = fs.readFileSync(path.join(PKG_ROOT, 'toolbar/QuickToolbar/QuickToolbar.tpl.js'), 'utf8');
    let quickToolbarCss = fs.readFileSync(path.join(PKG_ROOT, 'toolbar/QuickToolbar/QuickToolbar.css.js'), 'utf8');
    let theme = fs.readFileSync(path.join(PKG_ROOT, 'themes/default-dark.js'), 'utf8');

    for (let token of [
      '--sn-toolbar-title-color',
      '--sn-toolbar-title-font-size',
      '--sn-toolbar-title-font-weight',
      '--sn-toolbar-title-line-height',
      '--sn-toolbar-title-min-width',
      '--sn-toolbar-title-max-width',
      '--sn-toolbar-title-lines',
      '--sn-toolbar-occlusion-bg',
    ]) {
      assert.ok(quickToolbarCss.includes(token), `QuickToolbar title row must read ${token}`);
      assert.ok(theme.includes(token), `DEFAULT_DARK must define ${token}`);
    }

    assert.ok(graphNodeCss.includes('& .sn-node-header {\n        display: none;'), 'SVG nodes must not render a separate hover header');
    assert.ok(quickToolbarTemplate.includes('toolbar-title'), 'QuickToolbar must own the title row');
    assert.ok(quickToolbar.includes("nodeEl.hasAttribute('data-svg-shape')"), 'SVG nodes must opt into the toolbar title row');
    assert.ok(quickToolbar.includes("nodeEl.hasAttribute('data-header-hidden')"), 'explicitly headerless nodes must opt into the toolbar title row');
    assert.ok(quickToolbar.includes('#fitToolbarWidth'), 'QuickToolbar must fit title width to content');
    assert.ok(quickToolbar.includes('#measureTitleTextWidth'), 'QuickToolbar must measure wrapped title width');
    assert.ok(quickToolbarCss.includes('-webkit-line-clamp'), 'QuickToolbar title row must clamp long labels');
    assert.ok(quickToolbarCss.includes('--sn-toolbar-fit-width'), 'QuickToolbar must expose a measured width custom property');
    assert.ok(quickToolbarCss.includes('&[data-has-title] .toolbar'), 'QuickToolbar title min width must apply only when a title is visible');
    assert.ok(quickToolbar.includes('toolbarHeight + QuickToolbar.GAP_Y'), 'toolbar position must account for the title row height');
  });

  it('supports compact inverse SVG nodes without body content', () => {
    let graphNode = fs.readFileSync(path.join(PKG_ROOT, 'node/GraphNode/GraphNode.js'), 'utf8');
    let graphNodeCss = fs.readFileSync(path.join(PKG_ROOT, 'node/GraphNode/GraphNode.css.js'), 'utf8');

    assert.ok(graphNode.includes('params.hideContent'), 'GraphNode must expose params.hideContent for icon-only nodes');
    assert.ok(graphNode.includes('data-content-hidden'), 'GraphNode must mark hidden body content on the host');
    assert.ok(graphNode.includes('params.tone || params.nodeTone'), 'GraphNode must expose reusable tone metadata');
    assert.ok(graphNode.includes("if (tone === 'inverted') return 'inverse';"), 'GraphNode must normalize inverted tone aliases');
    assert.ok(graphNodeCss.includes('&[data-content-hidden]'), 'GraphNode must hide node body content from a host attribute');
    assert.ok(graphNodeCss.includes("&[data-svg-shape][data-node-tone='inverse']"), 'SVG nodes must support inverse node tone');
    assert.ok(graphNodeCss.includes('--sn-shape-fill: var(--sn-node-accent);'), 'inverse SVG tone must swap the node fill to the accent');
    assert.ok(graphNodeCss.includes('color: var(--sn-node-bg);'), 'inverse SVG tone must swap the icon color to the node background');
  });

  it('shows node quick toolbar on hover and keeps overlays above node sockets', () => {
    let nodeCanvas = fs.readFileSync(path.join(PKG_ROOT, 'canvas/NodeCanvas/NodeCanvas.js'), 'utf8');
    let nodeCanvasTemplate = fs.readFileSync(path.join(PKG_ROOT, 'canvas/NodeCanvas/NodeCanvas.tpl.js'), 'utf8');
    let nodeViewManager = fs.readFileSync(path.join(PKG_ROOT, 'canvas/NodeViewManager.js'), 'utf8');
    let quickToolbar = fs.readFileSync(path.join(PKG_ROOT, 'toolbar/QuickToolbar/QuickToolbar.js'), 'utf8');
    let quickToolbarCss = fs.readFileSync(path.join(PKG_ROOT, 'toolbar/QuickToolbar/QuickToolbar.css.js'), 'utf8');
    let contextMenu = fs.readFileSync(path.join(PKG_ROOT, 'menu/ContextMenu/ContextMenu.js'), 'utf8');
    let nodeCallout = fs.readFileSync(path.join(PKG_ROOT, 'node/NodeCallout/NodeCallout.js'), 'utf8');
    let theme = fs.readFileSync(path.join(PKG_ROOT, 'themes/default-dark.js'), 'utf8');

    assert.ok(nodeViewManager.includes('onNodePointerEnter'), 'NodeViewManager must expose node hover entry callbacks');
    assert.ok(nodeViewManager.includes('pointerenter'), 'NodeViewManager must listen for pointerenter on graph nodes');
    assert.ok(nodeCanvas.includes('_handleNodePointerEnter'), 'NodeCanvas must show quick toolbar from node hover');
    assert.ok(nodeCanvas.includes('scheduleHide?.'), 'NodeCanvas must defer toolbar hide when pointer leaves a node');
    assert.ok(
      nodeCanvasTemplate.includes('</div>\n    <quick-toolbar ref="quickToolbar" hidden></quick-toolbar>'),
      'QuickToolbar must render as a screen-space overlay outside transformed canvas content'
    );
    assert.ok(quickToolbar.includes('getBoundingClientRect'), 'QuickToolbar must position from rendered node bounds');
    assert.ok(quickToolbar.includes('mountOverlayToDocument'), 'QuickToolbar must escape clipped canvas/layout layers');
    assert.ok(quickToolbar.includes('data-overlay-portal'), 'QuickToolbar must switch to screen-space positioning when portaled');
    assert.ok(quickToolbar.includes('bringOverlayToFront'), 'QuickToolbar must use the shared overlay stack');
    assert.ok(contextMenu.includes('bringOverlayToFront'), 'ContextMenu must use the shared overlay stack');
    assert.ok(nodeCallout.includes('bringOverlayToFront'), 'NodeCallout must use the shared overlay stack');
    assert.ok(quickToolbarCss.includes('position: fixed'), 'Portaled QuickToolbar must not be clipped by canvas overflow');
    assert.ok(quickToolbarCss.includes('--sn-toolbar-z'), 'QuickToolbar must read its z-index from theme tokens');
    assert.ok(theme.includes("'--sn-overlay-z-base': '20000'"), 'DEFAULT_DARK must define the overlay z-index base');
    assert.ok(theme.includes("'--sn-toolbar-z': 'var(--sn-overlay-z-base)'"), 'DEFAULT_DARK must theme toolbar z-index');
  });

  it('keeps minimap canvas colors in the default theme contract', () => {
    let minimap = fs.readFileSync(path.join(PKG_ROOT, 'canvas/Minimap/Minimap.js'), 'utf8');
    let theme = fs.readFileSync(path.join(PKG_ROOT, 'themes/default-dark.js'), 'utf8');

    for (let token of ['--sn-minimap-bg', '--sn-minimap-node', '--sn-minimap-node-stroke', '--sn-minimap-bypassed-node', '--sn-minimap-viewport', '--sn-minimap-viewport-fill']) {
      assert.ok(minimap.includes(token), `Minimap must read ${token}`);
      assert.ok(theme.includes(token), `DEFAULT_DARK must define ${token}`);
    }

    for (let forbidden of [
      'rgba(20, 20, 35',
      'rgba(80, 130, 200',
      'rgba(120, 170, 255',
      'rgba(255, 255, 255',
      'rgba(100, 100, 100',
    ]) {
      assert.equal(minimap.includes(forbidden), false, `Minimap must not hardcode ${forbidden}`);
    }
  });

  it('keeps node canvas trace and subgraph preview visuals theme-driven', () => {
    let nodeCanvas = fs.readFileSync(path.join(PKG_ROOT, 'canvas/NodeCanvas/NodeCanvas.js'), 'utf8');
    let nodeViewManager = fs.readFileSync(path.join(PKG_ROOT, 'canvas/NodeViewManager.js'), 'utf8');
    let theme = fs.readFileSync(path.join(PKG_ROOT, 'themes/default-dark.js'), 'utf8');

    for (let forbidden of [
      'sn-fire-keyframes',
      'style.borderColor',
      '#4caf50',
      'rgba(76, 175, 80',
    ]) {
      assert.equal(nodeCanvas.includes(forbidden), false, `NodeCanvas trace visuals must not use ${forbidden}`);
    }

    for (let token of [
      '--sn-subgraph-preview-connection',
      '--sn-subgraph-preview-completed-connection',
      '--sn-subgraph-preview-processing-fill',
      '--sn-subgraph-preview-processing-stroke',
      '--sn-subgraph-preview-processing-glow',
      '--sn-subgraph-preview-completed-fill',
      '--sn-subgraph-preview-completed-stroke',
      '--sn-subgraph-preview-idle-fill',
      '--sn-subgraph-preview-idle-stroke',
    ]) {
      assert.ok(nodeViewManager.includes(token), `NodeViewManager must read ${token}`);
      assert.ok(theme.includes(token), `DEFAULT_DARK must define ${token}`);
    }

    for (let forbidden of [
      'style.cssText',
      '#16213e',
      '#2a2a4a',
      'rgba(92, 216, 122',
      'rgba(74, 158, 255',
      'rgba(255, 255, 255',
    ]) {
      assert.equal(nodeViewManager.includes(forbidden), false, `NodeViewManager visuals must not use ${forbidden}`);
    }
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
