import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  WEBXR_FEATURES,
  WEBXR_MODES,
  WEBXR_RENDERER,
  createStableXRDiagnosticClientId,
  createWebXRAdapter,
  createWebXRLayer,
  createXRWebGLLayerSize,
  createWebXRLaunchGateSummary,
  createWebXRLaunchRecommendation,
  createXRReadinessSummary,
  createWebXRRenderLoop,
  getWebXRSupport,
  normalizeWebXRSessionOptions,
  projectLayoutToXR,
  redactXRDiagnosticUrl,
  adjustXRPanelRotationForViewer,
  createXRPanelContentViewport,
  createXRPanelFacingSummary,
  createXRPanelPoseComfortSummary,
  createXRPanelTextureQualitySummary,
  createXRTextureGateSummary,
  createXRTextureQualityPolicy,
  createXRSceneGeometrySummary,
  createXRSceneQualitySummary,
  createXRVisualAgentReadinessSummary,
  createXRVisualTestSummary,
  adjustXRPanelPoseForComfort,
  createXRSpatialPreview,
  createXRSpatialScene,
  createXRSceneRootTransform,
  createXRSceneController,
  createXRSceneDiagnostics,
  createXRWebGLLayerTarget,
  createXRWebGLLayerPanelRenderer,
  XR_THREE_WEBXR_ADAPTER,
  createXRThreePanelTextureBridge,
  createXRThreeHtmlCanvasTextureResolver,
  createXRThreePanelSceneAdapter,
  createXRThreeControllerRayAdapter,
  createXRThreeDiagnosticPayload,
  createXRThreeDiagnosticServerSummary,
  createXRThreeDiagnosticTimelineSummary,
  createXRThreeTroubleshootingSummary,
  createXRThreeRenderHost,
  createXRThreeSessionController,
  createXRThreeSessionHealthSummary,
  createXRThreeInteractionReadinessSummary,
  createXRThreeSessionOptions,
  createXRThreeSessionTelemetrySnapshot,
  createXRThreeSessionWatchdogSummary,
  createXRThreeWebXRAdapter,
  updateXRThreePanelMaterialStates,
  createXRThemeSnapshot,
  createXRPanelGeometrySummary,
  applyXRThemeToPanel,
  XR_SPATIAL_SCENE_VERSION,
  hitTestXRPanels,
  createXRPointerHit,
  createXRPointerHitFromDomEvent,
  createXRPointerRayFromDomEvent,
  createXRPanelPointerTarget,
  createXRPointerEvent,
  createXRPanelFrame,
  hitTestXRPanelFrame,
  createXRInputSourceSummary,
  selectPrimaryXRInputSource,
  createXRPanelGestureState,
  updateXRPanelGesture,
  createXRLayoutTransactionFromGesture,
  createXRLayoutTransactionFromPanelPose,
  createXRDeepGraphDiagnostics,
  createXRDeepGraphPreview,
  createXRDeepGraphPreviewOverlay,
  createXRDeepGraphPreviewSummary,
  createXRDeepGraphScene,
  createXRDeepGraphFocus,
  createXRProjectDeepGraphProjection,
  createXRSpatialWorkbenchSummary,
  createXRWorkbenchDiagnosticPayload,
  XR_DEEP_GRAPH_SCENE_VERSION,
  WEBXR_EMULATION_RUNTIME,
  createWebXREmulationAdapter,
  getWebXREmulationSupport,
  installWebXREmulationRuntime,
  syncWebXRCanvas,
} from '../xr/index.js';

describe('WebXR provider adapter', () => {
  it('stays fallback-safe without WebXR APIs', async () => {
    let support = await getWebXRSupport({});

    assert.equal(support.supported, false);
    assert.equal(support.fallback, 'dom-canvas');
    assert.deepEqual(support.modes, {
      inline: false,
      immersiveVr: false,
      immersiveAr: false,
    });
  });

  it('creates stable diagnostic client ids through provider-owned storage', () => {
    let values = new Map();
    let storage = {
      getItem(key) {
        return values.get(key) || null;
      },
      setItem(key, value) {
        values.set(key, value);
      },
    };
    let first = createStableXRDiagnosticClientId({
      prefix: 'xr-three',
      storage,
      globalThis: { crypto: { randomUUID: () => 'client-1' } },
    });
    let second = createStableXRDiagnosticClientId({
      prefix: 'xr-three',
      storage,
      globalThis: { crypto: { randomUUID: () => 'client-2' } },
    });

    assert.equal(first.id, 'xr-three-client-1');
    assert.equal(second.id, first.id);
    assert.equal(second.persisted, true);
  });

  it('redacts sensitive values from XR diagnostic URLs', () => {
    let redacted = redactXRDiagnosticUrl(
      'https://playground.example/demo?token=abc&view=x#graph?project=demo&authorization=Bearer-secret'
    );

    assert.equal(redacted.includes('abc'), false);
    assert.equal(redacted.includes('Bearer-secret'), false);
    assert.equal(redacted.includes('token=%5Bredacted%5D'), true);
    assert.equal(redacted.includes('authorization=%5Bredacted%5D'), true);
    assert.equal(redacted.includes('view=x'), true);
  });

  it('detects supported WebXR session modes without throwing', async () => {
    let target = {
      isSecureContext: true,
      navigator: {
        xr: {
          async isSessionSupported(mode) {
            return mode !== 'immersive-ar';
          },
        },
      },
      XRWebGLLayer: class {},
      XRFrame: class {},
      XRInputSource: class {},
    };

    let support = await getWebXRSupport(target);

    assert.equal(support.supported, true);
    assert.equal(support.modes.inline, true);
    assert.equal(support.modes.immersiveVr, true);
    assert.equal(support.modes.immersiveAr, false);
    assert.equal(support.apis.secureContext, true);
    assert.equal(support.apis.XRWebGLLayerAvailable, true);
  });

  it('creates browser launch recommendations from WebXR support data', () => {
    let ready = createWebXRLaunchRecommendation({
      modes: { inline: true, immersiveVr: true, immersiveAr: false },
      apis: {
        secureContext: true,
        navigatorXrAvailable: true,
        requestSessionAvailable: true,
      },
    });
    let blocked = createWebXRLaunchRecommendation({
      modes: { inline: true, immersiveVr: true, immersiveAr: false },
      apis: {
        secureContext: false,
        navigatorXrAvailable: true,
        requestSessionAvailable: true,
      },
    });

    assert.equal(ready.canLaunch, true);
    assert.equal(ready.mode, 'immersive-vr');
    assert.equal(ready.reason, 'ready');
    assert.equal(blocked.canLaunch, false);
    assert.equal(blocked.reason, 'insecure-context');

    let inlineOnly = createWebXRLaunchRecommendation({
      modes: { inline: true, immersiveVr: false, immersiveAr: false },
      apis: {
        secureContext: true,
        navigatorXrAvailable: true,
        requestSessionAvailable: true,
      },
    });
    assert.equal(inlineOnly.canLaunch, false);
    assert.equal(inlineOnly.reason, 'no-immersive-mode');
  });

  it('composes WebXR launch gates from support, activation, and strict texture state', () => {
    let support = {
      modes: { inline: true, immersiveVr: true, immersiveAr: false },
      apis: {
        secureContext: true,
        navigatorXrAvailable: true,
        requestSessionAvailable: true,
      },
    };
    let blocked = createWebXRLaunchGateSummary(support, {
      texture: {
        strict: true,
        total: 4,
        ready: 0,
        blocked: true,
        reason: 'html-in-canvas-unsupported',
        stage: 'html-in-canvas-support',
        requiredApi: ['layoutsubtree'],
      },
    });
    assert.equal(blocked.canStart, false);
    assert.equal(blocked.reason, 'html-in-canvas-unsupported');
    assert.equal(blocked.blockingChecks[0].id, 'strict-texture');
    assert.equal(blocked.texture.stage, 'html-in-canvas-support');

    let ready = createWebXRLaunchGateSummary(support, {
      texture: { strict: true, total: 4, ready: 4, blocked: false },
      userActivation: { isActive: true, hasBeenActive: true },
      requireUserActivation: true,
    });
    assert.equal(ready.canStart, true);
    assert.equal(ready.reason, 'ready');
    assert.equal(ready.blockingChecks.length, 0);

    let probe = createWebXRLaunchGateSummary({
      modes: { inline: true, immersiveVr: false, immersiveAr: false },
      apis: {
        secureContext: true,
        navigatorXrAvailable: true,
        requestSessionAvailable: true,
      },
    }, {
      allowUnsupportedModeProbe: true,
      probeMode: WEBXR_MODES.immersiveVr,
    });
    assert.equal(probe.canStart, true);
    assert.equal(probe.canProbeMode, true);
    assert.equal(probe.mode, WEBXR_MODES.immersiveVr);
    assert.equal(probe.checks[0].probe, true);
  });

  it('counts public Three texture bridge records as ready texture gate input', () => {
    let gate = createXRTextureGateSummary({
      strict: true,
      panelCount: 2,
      support: {
        diagnostics: {
          supported: true,
          mode: 'canvas2d',
          missing: [],
          blockingMissing: [],
        },
      },
      records: [
        {
          ok: true,
          panelId: 'left',
          stage: 'three-material-applied',
          source: 'html-in-canvas',
          textureApplied: true,
        },
        {
          ok: true,
          panelId: 'right',
          stage: 'three-material-applied',
          source: 'html-in-canvas',
          textureApplied: true,
        },
      ],
      resolverState: {
        version: 'xr-three-html-canvas-texture-resolver-v1',
        textureCount: 2,
        records: [
          { panelId: 'left', ok: true, stage: 'three-canvas-texture-ready', textureApplied: true },
          { panelId: 'right', ok: true, stage: 'three-canvas-texture-ready', textureApplied: true },
        ],
      },
    });

    assert.equal(gate.blocked, false);
    assert.equal(gate.ready, 2);
    assert.equal(gate.total, 2);
    assert.equal(gate.bridgeStages[0].source, 'html-in-canvas');
    assert.equal(gate.resolverTextures, 2);
  });

  it('composes XR readiness from provider diagnostics', () => {
    let blocked = createXRReadinessSummary({
      launchGate: {
        canStart: false,
        blocked: true,
        reason: 'html-in-canvas-unsupported',
        mode: 'immersive-vr',
      },
      htmlCanvas: {
        supported: false,
        availability: 'origin-trial-or-flag-required',
        recommendation: 'enable-CanvasDrawElement',
      },
      texture: {
        blocked: true,
        reason: 'html-in-canvas-unsupported',
      },
      sceneQuality: { status: 'ok' },
      sessionHealth: { status: 'waiting' },
    });
    let ready = createXRReadinessSummary({
      launchGate: {
        canStart: true,
        blocked: false,
        reason: 'ready',
        mode: 'immersive-vr',
      },
      htmlCanvas: {
        supported: true,
        availability: 'texture-ready',
      },
      texture: { blocked: false },
      sceneQuality: { status: 'ok' },
      sessionHealth: { status: 'healthy' },
      sessionActive: true,
    });

    assert.equal(blocked.version, 'xr-readiness-summary-v1');
    assert.equal(blocked.ready, false);
    assert.equal(blocked.status, 'blocked');
    assert.equal(blocked.reason, 'html-in-canvas-unsupported');
    assert.deepEqual(blocked.blockingChecks.map((check) => check.id), ['launch', 'html-canvas', 'texture']);
    assert.equal(ready.ready, true);
    assert.equal(ready.running, true);
    assert.equal(ready.status, 'running');
    assert.equal(ready.reason, 'ready');
  });

  it('normalizes session options for optional WebXR feature negotiation', () => {
    let root = {};
    let options = normalizeWebXRSessionOptions({
      requiredFeatures: ['local-floor', 'local-floor'],
      optionalFeatures: ['dom-overlay'],
      domOverlayRoot: root,
    });

    assert.deepEqual(options.requiredFeatures, ['local-floor']);
    assert.deepEqual(options.optionalFeatures, ['dom-overlay']);
    assert.deepEqual(options.domOverlay, { root });
  });

  it('requests, stores, and ends sessions through the adapter', async () => {
    let ended = false;
    let session = {
      inputSources: [{ handedness: 'right' }],
      async end() {
        ended = true;
      },
    };
    let target = {
      navigator: {
        xr: {
          async isSessionSupported() {
            return true;
          },
          async requestSession(mode, options) {
            assert.equal(mode, 'immersive-vr');
            assert.ok(options.optionalFeatures.includes('local-floor'));
            return session;
          },
        },
      },
    };
    let adapter = createWebXRAdapter({ globalThis: target });

    assert.equal(await adapter.isSupported('immersive-vr'), true);
    let result = await adapter.requestSession();

    assert.equal(result.ok, true);
    assert.equal(adapter.getInputSources().length, 1);
    assert.equal(await adapter.endSession(), true);
    assert.equal(ended, true);
  });

  it('creates WebGL layers and syncs framebuffer size into canvas', () => {
    let created = false;
    let target = {
      XRWebGLLayer: class {
        constructor(session, gl) {
          created = Boolean(session && gl);
        }
      },
    };
    let session = {
      renderState: {
        baseLayer: {
          framebufferWidth: 1024,
          framebufferHeight: 512,
          framebuffer: 'fb',
        },
      },
    };
    let gl = {
      FRAMEBUFFER: 'FRAMEBUFFER',
      bindFramebuffer(targetName, framebuffer) {
        assert.equal(targetName, 'FRAMEBUFFER');
        assert.equal(framebuffer, 'fb');
      },
    };
    let canvas = {};

    assert.equal(createWebXRLayer(target, session, gl).ok, true);
    assert.equal(created, true);
    assert.equal(syncWebXRCanvas(canvas, gl, session), true);
    assert.equal(canvas.width, 1024);
    assert.equal(canvas.height, 512);
  });

  it('creates a provider-owned XR compatible WebGL layer target', async () => {
    let appended = [];
    let makeCompatibleCalls = 0;
    let created = [];
    let documentRef = {
      createElement(tag) {
        assert.equal(tag, 'canvas');
        let canvas = {
          width: 0,
          height: 0,
          isConnected: false,
          classes: [],
          set className(value) {
            this.classes.push(value);
          },
          setAttribute(name, value) {
            this[name] = value;
          },
          getContext(type, options) {
            assert.equal(options.xrCompatible, true);
            assert.equal(options.alpha, true);
            assert.equal(options.antialias, true);
            assert.equal(options.preserveDrawingBuffer, false);
            if (type !== 'webgl2') return null;
            return {
              contextType: type,
              async makeXRCompatible() {
                makeCompatibleCalls += 1;
              },
            };
          },
        };
        created.push(canvas);
        return canvas;
      },
    };
    let hostElement = {
      append(canvas) {
        canvas.isConnected = true;
        appended.push(canvas);
      },
    };

    let target = await createXRWebGLLayerTarget({
      document: documentRef,
      hostElement,
      className: 'test-xr-canvas',
      width: 640,
      height: 360,
    });

    assert.equal(target.ok, true);
    assert.equal(target.reason, null);
    assert.equal(target.contextType, 'webgl2');
    assert.equal(target.width, 640);
    assert.equal(target.height, 360);
    assert.equal(target.canvas.classes.includes('test-xr-canvas'), true);
    assert.equal(target.canvas['aria-hidden'], 'true');
    assert.equal(appended.length, 1);
    assert.equal(created.length, 1);
    assert.equal(makeCompatibleCalls, 1);
  });

  it('derives XR WebGL layer sizes through provider rules', () => {
    let explicit = createXRWebGLLayerSize({ width: 640, height: 360 });
    let dense = createXRWebGLLayerSize({ panelCount: 9, pixelRatio: 2, maxWidth: 2048, maxHeight: 2048 });

    assert.equal(explicit.width, 640);
    assert.equal(explicit.height, 360);
    assert.equal(explicit.source, 'explicit');
    assert.equal(dense.source, 'provider-default');
    assert.equal(dense.width, 2048);
    assert.equal(dense.height, 2048);
    assert.equal(dense.panelCount, 9);
  });

  it('reports missing WebGL context without leaking browser logic to consumers', async () => {
    let removed = 0;
    let documentRef = {
      createElement() {
        return {
          width: 0,
          height: 0,
          isConnected: false,
          setAttribute() {},
          getContext() {
            return null;
          },
          remove() {
            removed += 1;
          },
        };
      },
    };
    let hostElement = { append() {} };

    let target = await createXRWebGLLayerTarget({ document: documentRef, hostElement });

    assert.equal(target.ok, false);
    assert.equal(target.reason, 'missing-webgl-context');
    assert.equal(target.gl, null);
    assert.equal(target.recreated, true);
    assert.equal(removed, 1);
  });

  it('runs a cancellable WebXR render loop', () => {
    let callbacks = [];
    let cancelled = null;
    let session = {
      requestAnimationFrame(callback) {
        callbacks.push(callback);
        return callbacks.length;
      },
      cancelAnimationFrame(id) {
        cancelled = id;
      },
    };
    let frames = 0;
    let loop = createWebXRRenderLoop(session, () => {
      frames++;
    });

    callbacks[0](10, {});
    loop.stop();
    assert.equal(frames, 1);
    assert.equal(callbacks.length, 2);
    assert.equal(cancelled, 2);
  });

  it('projects layout panels into deterministic spatial panels', () => {
    let layout = {
      id: 'root',
      type: 'split',
      direction: 'horizontal',
      ratio: 0.5,
      first: { id: 'chat', type: 'panel', panelType: 'chat', panelState: { area: 'left' } },
      second: { id: 'graph', type: 'panel', panelType: 'graph', xr: { anchor: 'front', priority: -1 } },
      global: [
        { id: 'status', type: 'panel', panelType: 'status', panelState: { area: 'status' }, global: true },
      ],
    };

    let projected = projectLayoutToXR(layout);

    assert.equal(projected.version, 'xr-layout-v1');
    assert.equal(projected.unit, 'meter');
    assert.deepEqual(projected.panels.map((panel) => panel.id), ['graph', 'chat', 'status']);
    assert.deepEqual(projected.panels[0].position, [0, 1.35, -1.8]);
    assert.equal(projected.panels[1].anchor, 'left');
    assert.equal(projected.panels[2].anchor, 'upperRight');
  });

  it('creates body-space XR scene root transforms from viewer pose data', () => {
    let transform = createXRSceneRootTransform({
      origin: { type: 'viewer', position: [0, 0, 0], rotation: [0, 0, 0] },
      referenceSpaceType: 'local-floor',
    }, {
      mode: 'immersive-ar',
      referenceSpaceType: 'local-floor',
      viewerPose: {
        position: [0.42, 1.62, -0.35],
        yawDegrees: 28,
      },
    });

    assert.equal(transform.version, 'xr-scene-root-transform-v1');
    assert.equal(transform.policy, 'body-space-front');
    assert.equal(transform.mode, 'immersive-ar');
    assert.equal(transform.referenceSpaceType, 'local-floor');
    assert.equal(transform.originSource, 'viewer-pose');
    assert.deepEqual(transform.position, [0.42, 0, -0.35]);
    assert.deepEqual(transform.rotation, [0, 28, 0]);
  });

  it('creates a renderer-neutral XR deep graph scene', () => {
    let scene = createXRDeepGraphScene({
      nodes: [
        { id: 'root', label: 'Workspace App', type: 'project', depth: 0 },
        { id: 'graph', label: 'Graph', type: 'module', depth: 1 },
        { id: 'chat', label: 'Chat', type: 'module', depth: 1 },
      ],
      edges: [
        { from: 'root', to: 'graph', type: 'contains' },
        { from: 'root', to: 'chat', type: 'contains' },
        { from: 'missing', to: 'chat', type: 'ignored' },
      ],
    }, {
      supportsVoiceCommands: true,
    });

    assert.equal(scene.version, XR_DEEP_GRAPH_SCENE_VERSION);
    assert.equal(scene.unit, 'meter');
    assert.equal(scene.nodes.length, 3);
    assert.equal(scene.edges.length, 2);
    assert.equal(scene.placement.anchorPolicy, 'manual-hit-test-first');
    assert.equal(scene.interaction.supportsVoiceCommands, true);
    assert.deepEqual(scene.interaction.supportedOperations, [
      'select-node',
      'focus-node',
      'open-panel',
      'expand-neighborhood',
    ]);
    assert.deepEqual(scene.diagnostics, {
      nodeCount: 3,
      edgeCount: 2,
      maxDepth: 1,
    });
    assert.ok(scene.nodes.every((node) => node.position.length === 3));
    assert.ok(scene.edges.every((edge) => edge.points.length === 3));

    let diagnostics = createXRDeepGraphDiagnostics(scene, { focusNodeId: 'graph', sampleLimit: 2 });
    assert.equal(diagnostics.version, 'xr-deep-graph-diagnostics-v1');
    assert.equal(diagnostics.nodeCount, 3);
    assert.equal(diagnostics.edgeCount, 2);
    assert.equal(diagnostics.connectedNodeCount, 3);
    assert.equal(diagnostics.orphanNodeCount, 0);
    assert.deepEqual(diagnostics.edgeTypes, { contains: 2 });
    assert.deepEqual(diagnostics.nodeTypes, { module: 2, project: 1 });
    assert.deepEqual(diagnostics.depthCounts, { 0: 1, 1: 2 });
    assert.deepEqual(diagnostics.focus, {
      nodeId: 'graph',
      found: true,
      depth: 1,
      incoming: 1,
      outgoing: 0,
    });
    assert.equal(diagnostics.samples.nodes.length, 2);
    assert.equal(diagnostics.samples.edges.length, 2);

    let preview = createXRDeepGraphPreview(scene, {
      pixelsPerMeter: 100,
      eyeHeight: 1.6,
      maxNodes: 3,
      maxEdges: 2,
    });
    assert.equal(preview.version, 'xr-deep-graph-preview-v1');
    assert.equal(preview.renderer, 'dom-perspective-overlay');
    assert.equal(preview.source.nodeCount, 3);
    assert.equal(preview.source.edgeCount, 2);
    assert.equal(preview.nodes.length, 3);
    assert.equal(preview.edges.length, 2);
    assert.match(preview.nodes[0].transform, /translate3d/);
    assert.equal(typeof preview.edges[0].length, 'number');
    assert.equal(typeof preview.edges[0].angle, 'number');

    let boundedPreview = createXRDeepGraphPreview(scene, {
      focusNodeId: 'graph',
      maxNodes: 2,
      maxEdges: 2,
    });
    assert.equal(boundedPreview.nodes.length, 2);
    assert.equal(boundedPreview.edges.length, 1);
    assert.deepEqual(boundedPreview.nodes.map((node) => node.id), ['graph', 'root']);
    assert.equal(boundedPreview.edges[0].to, 'graph');
    assert.deepEqual(boundedPreview.focus, {
      nodeId: 'graph',
      visible: true,
      edges: {
        visible: 1,
        source: 1,
      },
    });
    let previewSummary = createXRDeepGraphPreviewSummary(boundedPreview, {
      warningCoverage: 0.8,
    });
    assert.equal(previewSummary.version, 'xr-deep-graph-preview-summary-v1');
    assert.equal(previewSummary.status, 'limited');
    assert.deepEqual(previewSummary.nodes, {
      visible: 2,
      source: 3,
      hidden: 1,
      coverage: 0.6667,
      limit: 2,
    });
    assert.deepEqual(previewSummary.edges, {
      visible: 1,
      source: 2,
      hidden: 1,
      coverage: 0.5,
      limit: 2,
    });
    assert.deepEqual(previewSummary.focus, boundedPreview.focus);
  });

  it('accepts graph-model-v1 nodes and edges for XR deep graph scenes', () => {
    let scene = createXRDeepGraphScene({
      version: 'graph-model-v1',
      nodes: [
        { id: 'src', kind: 'project.directory', label: 'src', parentId: null },
        { id: 'src/app.js', kind: 'project.file.action', label: 'app.js', parentId: 'src', params: { path: 'src/app.js' } },
        { id: 'src/util.js', kind: 'project.file.action', label: 'util.js', parentId: 'src', params: { path: 'src/util.js' } },
      ],
      edges: [
        {
          kind: 'project.import',
          source: { nodeId: 'src/app.js', port: 'import' },
          target: { nodeId: 'src/util.js', port: 'export' },
        },
      ],
    });

    let appNode = scene.nodes.find((node) => node.id === 'src/app.js');

    assert.equal(scene.nodes.length, 3);
    assert.equal(scene.edges.length, 1);
    assert.equal(scene.edges[0].from, 'src/app.js');
    assert.equal(scene.edges[0].to, 'src/util.js');
    assert.equal(scene.edges[0].type, 'project.import');
    assert.equal(appNode.depth, 1);
    assert.equal(appNode.type, 'project.file.action');
    assert.equal(appNode.path, 'src/app.js');
    assert.equal(scene.diagnostics.maxDepth, 1);
  });

  it('creates a detail panel focus contract for XR graph nodes', () => {
    let scene = createXRDeepGraphScene({
      nodes: [
        { id: 'root', label: 'Workspace App', depth: 0 },
      ],
    });
    let focus = createXRDeepGraphFocus(scene, 'root', {
      component: 'sn-source-viewer',
      themeScope: 'section.graph',
    });
    let missing = createXRDeepGraphFocus(scene, 'missing');

    assert.equal(focus.ok, true);
    assert.equal(focus.panel.anchorNodeId, 'root');
    assert.equal(focus.panel.component, 'sn-source-viewer');
    assert.equal(focus.panel.themeScope, 'section.graph');
    assert.equal(missing.ok, false);
    assert.equal(missing.reason, 'node-not-found');
  });

  it('renders XR deep graph preview overlays through provider DOM data', () => {
    let makeElement = (tagName) => ({
      tagName,
      className: '',
      dataset: {},
      style: {
        values: {},
        setProperty(name, value) {
          this.values[name] = value;
        },
      },
      children: [],
      append(child) {
        this.children.push(child);
      },
      setAttribute(name, value) {
        this[name] = value;
      },
    });
    let overlay = createXRDeepGraphPreviewOverlay({
      version: 'xr-deep-graph-preview-v1',
      nodes: [
        {
          id: 'src/app.js',
          type: 'project.file.action',
          depth: 1,
          radius: 6,
          transform: 'translate3d(0px, 0px, 0px)',
          label: 'app.js',
        },
      ],
      edges: [
        {
          id: 'edge-1',
          type: 'project.import',
          x: 10,
          y: 20,
          z: -1,
          length: 80,
          angle: 15,
        },
      ],
    }, {
      document: { createElement: makeElement },
      focusNodeId: 'src/app.js',
    });

    assert.equal(overlay.ok, true);
    assert.equal(overlay.nodeCount, 1);
    assert.equal(overlay.edgeCount, 1);
    assert.equal(overlay.overlay.dataset.version, 'xr-deep-graph-preview-v1');
    assert.equal(overlay.overlay.children[0].className, 'sn-xr-deep-edge');
    assert.equal(overlay.overlay.children[0].style.values['--sn-xr-deep-edge-length'], '80px');
    assert.equal(overlay.overlay.children[1].className, 'sn-xr-deep-node');
    assert.equal(overlay.overlay.children[1].dataset.focus, 'true');
    assert.equal(overlay.overlay.children[1].style.values['--sn-xr-deep-node-size'], '12px');
  });

  it('projects project skeletons into complete XR deep graph scenes', () => {
    let projection = createXRProjectDeepGraphProjection({
      f: {
        'src/': ['app.js', 'util.js'],
      },
      I: {
        'src/app.js': ['./util'],
      },
    }, {
      focusPath: 'src/app.js',
      mode: 'project-demo',
    });

    assert.equal(projection.version, 'xr-project-deep-graph-projection-v1');
    assert.equal(projection.graphModel.version, 'graph-model-v1');
    assert.equal(projection.scene.version, XR_DEEP_GRAPH_SCENE_VERSION);
    assert.equal(projection.scene.mode, 'project-demo');
    assert.equal(projection.preview.nodes.length, 3);
    assert.equal(projection.preview.edges.length, 1);
    assert.equal(projection.focus.ok, true);
    assert.equal(projection.focus.nodeId, 'src/app.js');
    assert.equal(projection.diagnostics.focusNodeId, 'src/app.js');
    assert.equal(projection.diagnostics.graphVersion, 'graph-model-v1');
  });

  it('summarizes spatial workbench diagnostics without product labels', () => {
    let summary = createXRSpatialWorkbenchSummary({
      source: 'graph',
      panels: [{ id: 'graph' }, { id: 'chat' }],
      panelHostState: { mounted: 2 },
      controllerState: {},
      rendererState: { preferredMode: 'webgl' },
      htmlCanvasSupport: {
        supported: true,
        preferredMode: 'webgl',
        diagnostics: {
          supported: true,
          availability: 'origin-trial',
          textureUploadAvailable: true,
        },
      },
      themeSnapshot: {
        themeScope: 'section.graph',
        tokens: {
          '--sn-panel-bg': 'black',
          '--sn-panel-border': '',
        },
      },
      launch: { canLaunch: true, mode: 'immersive-ar' },
      launchGate: { canStart: true, blocked: false },
      textureGate: { blocked: false, ready: 2, total: 2 },
      readiness: { status: 'ready' },
      sceneQuality: { status: 'target' },
      threeSessionDiagnostics: {
        frames: 42,
        hover: {
          panelId: 'graph',
          frameTarget: { panelId: 'graph', operation: 'move', zone: 'move' },
        },
      },
      threeDiagnostics: {
        panelCount: 2,
        renderedPanelCount: 2,
        diagnosticPanelCount: 1,
        controller: {
          diagnostics: {
            drag: {
              active: true,
              panelId: 'graph',
              frameTarget: { panelId: 'graph', operation: 'resize', zone: 'resize', handle: 'east' },
              size: [1.4, 0.7],
              resize: { operation: 'resize', handle: 'east', size: [1.4, 0.7] },
            },
          },
        },
      },
      layerFrame: {
        rendered: true,
        textureQuality: [{ status: 'target' }, { status: 'low' }],
        lowQualityPanels: ['chat'],
      },
      geometrySummaries: [
        { poseComfort: { status: 'warning' }, poseAdjustment: { adjusted: true } },
        { facing: { status: 'warning' }, rotationAdjustment: { adjusted: true } },
      ],
      deepGraph: {
        diagnostics: {
          nodeCount: 4,
          edgeCount: 3,
          connectedNodeCount: 3,
          edgeTypes: { 'project.import': 3 },
          focusNodeId: 'src/app.js',
          focus: { incoming: 0, outgoing: 1 },
        },
        previewSummary: {
          status: 'bounded',
          nodes: { visible: 4, source: 6 },
          edges: { visible: 3, source: 5 },
          focus: { visible: true },
        },
      },
      activeHit: { panelId: 'graph', point: { x: 0.25, y: 0.75 } },
      gestureState: { status: 'dragging', panelId: 'graph' },
      lastTransactionId: 'tx:1',
    });

    assert.equal(summary.version, 'xr-spatial-workbench-summary-v1');
    assert.equal(summary.mode, 'html-in-canvas');
    assert.equal(summary.renderer, 'webgl');
    assert.deepEqual(summary.panels, { total: 2, live: 2, errors: 0 });
    assert.equal(summary.theme.scope, 'section.graph');
    assert.equal(summary.theme.resolvedTokens, 1);
    assert.equal(summary.layerFrame.lowQualityCount, 1);
    assert.deepEqual(summary.texture.quality, { target: 1, total: 2 });
    assert.deepEqual(summary.geometry, {
      count: 2,
      comfortWarnings: 1,
      adjustedPanels: 1,
      facingWarnings: 1,
      rotatedPanels: 1,
    });
    assert.equal(summary.deepGraph.nodeCount, 4);
    assert.equal(summary.deepGraph.previewStatus, 'bounded');
    assert.deepEqual(summary.pointer, { panelId: 'graph', x: 0.25, y: 0.75 });
    assert.deepEqual(summary.gesture, { status: 'dragging', panelId: 'graph' });
    assert.equal(summary.three.hover.frameTarget.operation, 'move');
    assert.equal(summary.three.panels, 2);
    assert.equal(summary.three.renderedPanels, 2);
    assert.equal(summary.three.diagnosticPanels, 1);
    assert.equal(summary.three.frames, 42);
    assert.equal(summary.three.drag.frameTarget.zone, 'resize');
    assert.deepEqual(summary.three.drag.size, [1.4, 0.7]);
    assert.deepEqual(summary.three.drag.resize.size, [1.4, 0.7]);
  });

  it('builds redacted XR workbench diagnostic payloads without transport policy', () => {
    let payload = createXRWorkbenchDiagnosticPayload({
      event: 'spatial-session-failed',
      pageUrl: 'https://example.test/demo?token=secret#graph?authorization=Bearer-secret',
      secureContext: true,
      navigatorXr: true,
      modes: { immersiveVr: true },
      launch: { canLaunch: false, mode: 'immersive-vr', reason: 'request-failed' },
      clientId: 'client-1',
      session: { health: { status: 'failed' } },
      error: 'NotSupportedError',
      details: { controller: { mode: 'immersive-vr' } },
      htmlCanvas: { supported: false },
      texture: { blocked: true },
      launchGate: { blocked: true },
      sceneQuality: { status: 'warning' },
      readiness: { status: 'blocked' },
      visual: { version: 'xr-visual-test-summary-v1', status: 'warning' },
      visualReadiness: { version: 'xr-visual-agent-readiness-v1', status: 'warning', reason: 'visual-warning' },
      interactionReadiness: { version: 'xr-three-interaction-readiness-v1', status: 'blocked', reason: 'missing-hit-state' },
    });

    assert.equal(payload.version, 'xr-workbench-diagnostic-payload-v1');
    assert.equal(payload.event, 'spatial-session-failed');
    assert.equal(payload.pageUrl.includes('secret'), false);
    assert.equal(payload.secureContext, true);
    assert.deepEqual(payload.launch, {
      canLaunch: false,
      mode: 'immersive-vr',
      reason: 'request-failed',
    });
    assert.deepEqual(payload.details.controller, { mode: 'immersive-vr' });
    assert.deepEqual(payload.details.htmlCanvas, { supported: false });
    assert.deepEqual(payload.details.texture, { blocked: true });
    assert.equal(payload.details.visual.version, 'xr-visual-test-summary-v1');
    assert.equal(payload.details.visualReadiness.version, 'xr-visual-agent-readiness-v1');
    assert.equal(payload.details.interactionReadiness.version, 'xr-three-interaction-readiness-v1');
  });

  it('derives XR panel sizes from relative layout ratios', () => {
    let layout = {
      id: 'root',
      type: 'split',
      direction: 'horizontal',
      ratio: 0.25,
      first: { id: 'files', type: 'panel', panelType: 'file-tree' },
      second: {
        id: 'main',
        type: 'split',
        direction: 'vertical',
        ratio: 0.75,
        first: { id: 'graph', type: 'panel', panelType: 'dep-graph' },
        second: { id: 'logs', type: 'panel', panelType: 'graph-flows' },
      },
    };

    let projected = projectLayoutToXR(layout, {
      relativeSize: { width: 1.2, height: 0.8, minWidth: 0.24, minHeight: 0.18, maxWidth: 1.4, maxHeight: 1 },
    });
    let files = projected.panels.find((panel) => panel.id === 'files');
    let graph = projected.panels.find((panel) => panel.id === 'graph');
    let logs = projected.panels.find((panel) => panel.id === 'logs');

    assert.equal(files.sizeSource, 'relative-layout');
    assert.deepEqual(files.relativeRect, { x: 0, y: 0, width: 0.25, height: 1 });
    assert.deepEqual(files.size, [0.3, 0.8]);
    assert.deepEqual(graph.relativeRect, { x: 0.25, y: 0, width: 0.75, height: 0.75 });
    assert.deepEqual(graph.size, [0.9, 0.6]);
    assert.deepEqual(logs.relativeRect, { x: 0.25, y: 0.75, width: 0.75, height: 0.25 });
    assert.deepEqual(logs.size, [0.9, 0.2]);
  });

  it('derives runtime UI XR panel sizes from layout weights', () => {
    let projected = projectLayoutToXR({
      id: 'root',
      component: 'panel-layout',
      layout: { direction: 'horizontal' },
      children: [
        { id: 'left', component: 'sn-tree-panel', layout: { weight: 1 } },
        { id: 'main', component: 'canvas-graph', layout: { weight: 3, area: 'main' } },
      ],
    }, {
      relativeSize: { width: 1.2, height: 0.8, minWidth: 0.24, minHeight: 0.18, maxWidth: 1.4, maxHeight: 1 },
    });

    assert.deepEqual(projected.panels.map((panel) => panel.id), ['left', 'main']);
    assert.deepEqual(projected.panels[0].relativeRect, { x: 0, y: 0, width: 0.25, height: 1 });
    assert.deepEqual(projected.panels[0].size, [0.3, 0.8]);
    assert.deepEqual(projected.panels[1].relativeRect, { x: 0.25, y: 0, width: 0.75, height: 1 });
    assert.deepEqual(projected.panels[1].size, [0.9, 0.8]);
  });

  it('keeps explicit XR sizes above derived relative layout sizes', () => {
    let projected = projectLayoutToXR({
      id: 'root',
      type: 'split',
      direction: 'horizontal',
      ratio: 0.25,
      first: { id: 'files', type: 'panel', panelType: 'file-tree', xr: { size: [0.5, 0.4] } },
      second: { id: 'graph', type: 'panel', panelType: 'dep-graph' },
    });

    assert.equal(projected.panels[0].sizeSource, 'explicit');
    assert.deepEqual(projected.panels[0].size, [0.5, 0.4]);
    assert.deepEqual(projected.panels[0].relativeRect, { x: 0, y: 0, width: 0.25, height: 1 });
  });

  it('builds a human-space scene from layout data', () => {
    let scene = createXRSpatialScene({
      id: 'main',
      type: 'panel',
      panelType: 'graph',
      xr: { position: [0, 1.35, -1.8], size: [0.9, 0.62] },
    }, {
      themeScope: 'section.graph',
      userSpace: { eyeHeight: 1.62, comfortRadius: 2 },
      preview: { pixelsPerMeter: 120 },
    });

    assert.equal(scene.version, XR_SPATIAL_SCENE_VERSION);
    assert.equal(scene.unit, 'meter');
    assert.equal(scene.coordinateSystem, 'webxr-local-floor');
    assert.equal(scene.themeScope, 'section.graph');
    assert.equal(scene.userSpace.eyeHeight, 1.62);
    assert.equal(scene.preview.pixelsPerMeter, 120);
    assert.equal(scene.panels[0].spatialRole, 'primary-surface');
    assert.equal(scene.panels[0].contentViewport.width, 1280);
    assert.equal(scene.panels[0].contentViewport.scale < 1, true);
    assert.equal(scene.interaction.pointerModel, 'ray-to-panel-normalized');
  });

  it('creates deterministic DOM preview transforms for spatial panels', () => {
    let scene = createXRSpatialScene({
      id: 'main',
      type: 'panel',
      panelType: 'graph',
      xr: { position: [0.5, 1.25, -1.8], rotation: [0, -18, 0], size: [1, 0.5] },
    }, {
      userSpace: { eyeHeight: 1.6 },
      preview: { pixelsPerMeter: 100 },
    });
    let preview = createXRSpatialPreview(scene.panels[0], scene);

    assert.equal(preview.panelId, 'main');
    assert.equal(preview.left, 50);
    assert.ok(Math.abs(preview.top - 35) < 0.000001);
    assert.equal(preview.depth, -180);
    assert.equal(preview.width, 100);
    assert.equal(preview.height, 50);
    assert.match(preview.transform, /rotateY\(-18deg\)/);
  });

  it('derives content viewport separately from physical XR preview pixels', () => {
    let viewport = createXRPanelContentViewport({
      id: 'narrow',
      component: 'file-tree',
      size: [0.32, 0.82],
    }, {
      previewPixels: { width: 38, height: 97 },
    });

    assert.deepEqual(viewport, {
      width: 1280,
      height: 1536,
      aspectRatio: 0.390244,
      scale: 0.029688,
      density: 0.72,
      source: 'preview-fit',
    });
  });

  it('summarizes XR panel texture quality from content viewport and meter size', () => {
    let quality = createXRPanelTextureQualitySummary({
      id: 'main',
      size: [1.22, 0.82],
      contentViewport: { width: 1280, height: 860, scale: 0.1, density: 0.72 },
    });

    assert.equal(quality.panelId, 'main');
    assert.equal(quality.status, 'readable');
    assert.deepEqual(quality.texturePixels, { width: 1280, height: 860 });
    assert.deepEqual(quality.requiredPixels, {
      min: { width: 1098, height: 738 },
      target: { width: 1464, height: 984 },
    });
    assert.equal(Math.round(quality.pixelsPerMeter.min), 1049);
    assert.deepEqual(quality.thresholds, {
      minPixelsPerMeter: 900,
      targetPixelsPerMeter: 1200,
    });
    assert.deepEqual(quality.warnings, []);
    assert.deepEqual(quality.recommendations, [
      'increase-texture-density-to-target',
      'increase-texture-pixel-ratio',
    ]);
  });

  it('recommends provider-owned texture quality actions for soft XR panels', () => {
    let quality = createXRPanelTextureQualitySummary({
      id: 'soft',
      size: [1.1, 0.7],
      contentViewport: { width: 960, height: 611, scale: 0.1, density: 0.72 },
    }, {
      textureWidth: 640,
      textureHeight: 356,
      texturePixelRatio: 1,
      maxTexturePixelRatio: 2,
      maxTextureSize: 900,
    });

    assert.equal(quality.status, 'low');
    assert.deepEqual(quality.warnings, ['texture-density-low']);
    assert.deepEqual(quality.requiredPixels, {
      min: { width: 990, height: 630 },
      target: { width: 1320, height: 840 },
    });
    assert.deepEqual(quality.recommendations, [
      'increase-texture-resolution',
      'increase-texture-density-to-target',
      'increase-texture-pixel-ratio',
      'increase-max-texture-size',
    ]);
  });

  it('builds provider-owned XR texture quality policy from viewport and meter size', () => {
    let policy = createXRTextureQualityPolicy({
      id: 'wide',
      size: [1.4, 0.72],
      contentViewport: { width: 1280, height: 658, scale: 0.12, density: 0.72 },
    }, {
      texturePixelRatio: 2,
      maxTexturePixelRatio: 2,
      maxTextureSize: 2048,
      preferTargetDensity: true,
      redrawMode: 'dirty',
    });

    assert.equal(policy.version, 'xr-texture-quality-policy-v1');
    assert.equal(policy.panelId, 'wide');
    assert.equal(policy.redrawMode, 'dirty');
    assert.equal(policy.texturePixelRatio, 2);
    assert.deepEqual(policy.texturePixels, { width: 2048, height: 1316 });
    assert.equal(policy.capped, true);
    assert.deepEqual(policy.contentViewport, {
      width: 1280,
      height: 658,
      scale: 0.12,
      density: 0.72,
    });
  });

  it('describes XR panel window frame zones and hit targets as provider data', () => {
    let frame = createXRPanelFrame({ id: 'chat', component: 'sn-chat' });
    let move = hitTestXRPanelFrame(frame, { x: 0.4, y: 0.07 });
    let resize = hitTestXRPanelFrame(frame, { x: 0.98, y: 0.98 });
    let action = hitTestXRPanelFrame(frame, { x: 0.99, y: 0.04 });
    let content = hitTestXRPanelFrame(frame, { x: 0.5, y: 0.5 });

    assert.equal(frame.version, 'xr-panel-frame-v1');
    assert.equal(frame.tokens.background, 'var(--sn-xr-panel-bg)');
    assert.equal(move.operation, 'move');
    assert.equal(resize.operation, 'resize');
    assert.equal(resize.handle, 'southEast');
    assert.equal(action.operation, 'action');
    assert.equal(action.action, 'close');
    assert.equal(content.operation, 'focus');
  });

  it('normalizes XR input sources and selects a single primary pointer source', () => {
    let leftHand = {
      handedness: 'left',
      targetRayMode: 'tracked-pointer',
      targetRaySpace: {},
      hand: {},
      profiles: ['generic-hand-select'],
    };
    let rightController = {
      handedness: 'right',
      targetRayMode: 'tracked-pointer',
      targetRaySpace: {},
      gripSpace: {},
      gamepad: {},
      profiles: ['oculus-touch-v3'],
    };
    let handSummary = createXRInputSourceSummary(leftHand);
    let selected = selectPrimaryXRInputSource([leftHand, rightController], { dominantHand: 'right' });

    assert.equal(handSummary.kind, 'hand');
    assert.equal(handSummary.capabilities.hand, true);
    assert.equal(selected.version, 'xr-primary-input-source-v1');
    assert.equal(selected.selected.handedness, 'right');
    assert.equal(selected.selected.kind, 'controller');
    assert.equal(selected.selected.primary, true);
    assert.equal(selected.summaries.length, 2);
  });

  it('summarizes XR panel pose comfort from meters and eye height', () => {
    let comfortable = createXRPanelPoseComfortSummary({
      id: 'main',
      position: [0, 1.42, -1.75],
      size: [0.92, 0.54],
    }, {
      eyeHeight: 1.55,
    });
    let high = createXRPanelPoseComfortSummary({
      id: 'status',
      position: [0, 2.2, -1.2],
      size: [0.4, 0.2],
    }, {
      eyeHeight: 1.55,
    });

    assert.equal(comfortable.panelId, 'main');
    assert.equal(comfortable.status, 'comfortable');
    assert.equal(Math.round(comfortable.distance * 100) / 100, 1.75);
    assert.deepEqual(comfortable.warnings, []);
    assert.equal(high.status, 'warning');
    assert.ok(high.warnings.includes('panel-too-high'));
    assert.equal(high.thresholds.maxVerticalAngle, 16);
  });

  it('adjusts XR panel pose through provider comfort rules', () => {
    let adjusted = adjustXRPanelPoseForComfort({
      id: 'lower',
      position: [0, 0.86, -1.35],
      size: [0.98, 0.28],
    }, {
      userSpace: { eyeHeight: 1.6 },
    });

    assert.equal(adjusted.poseAdjustment.adjusted, true);
    assert.equal(adjusted.poseAdjustment.reason, 'vertical-angle-raised');
    assert.equal(adjusted.poseAdjustment.before.status, 'warning');
    assert.equal(adjusted.poseAdjustment.after.status, 'comfortable');
    assert.equal(adjusted.position[1] > 0.86, true);
  });

  it('summarizes and adjusts XR panel rotation toward the viewer', () => {
    let summary = createXRPanelFacingSummary({
      id: 'left',
      position: [-0.82, 1.34, -1.55],
      rotation: [0, 18, 0],
    });
    let adjusted = adjustXRPanelRotationForViewer({
      id: 'left',
      position: [-0.82, 1.34, -1.55],
      rotation: [0, 18, 0],
    });

    assert.equal(summary.status, 'warning');
    assert.ok(summary.warnings.includes('panel-yaw-off-axis'));
    assert.equal(Math.round(summary.targetRotation[1]), 28);
    assert.equal(adjusted.rotationAdjustment.adjusted, true);
    assert.equal(adjusted.rotationAdjustment.reason, 'panel-yaw-off-axis');
    assert.equal(adjusted.rotationAdjustment.after.status, 'aligned');
    assert.equal(Math.round(adjusted.rotation[1]), 28);
  });

  it('summarizes XR panel geometry without product UI labels', () => {
    let scene = createXRSpatialScene({
      id: 'main',
      type: 'panel',
      panelType: 'graph',
      xr: { position: [0.5, 1.25, -1.8], rotation: [0, -18, 0] },
    }, {
      userSpace: { eyeHeight: 1.6 },
      preview: { pixelsPerMeter: 100 },
    });
    let preview = createXRSpatialPreview(scene.panels[0], scene);
    let summary = createXRPanelGeometrySummary(scene.panels[0], preview, {
      userSpace: scene.userSpace,
    });

    assert.deepEqual(Object.keys(summary), [
      'panelId',
      'component',
      'anchor',
      'sizeSource',
      'relativeRect',
      'meters',
      'previewPixels',
      'contentViewport',
      'textureQuality',
      'poseComfort',
      'poseAdjustment',
      'facing',
      'rotationAdjustment',
      'position',
      'rotation',
    ]);
    assert.equal(summary.panelId, 'main');
    assert.equal(summary.component, 'graph');
    assert.equal(summary.sizeSource, 'relative-layout');
    assert.deepEqual(summary.meters, { width: 1.22, height: 0.82 });
    assert.deepEqual(summary.previewPixels, {
      left: 50,
      top: 35,
      width: 122,
      height: 82,
      depth: -180,
    });
    assert.deepEqual(summary.contentViewport, {
      width: 1280,
      height: 860,
      aspectRatio: 1.487805,
      scale: 0.095313,
      density: 0.72,
      source: 'preview-fit',
    });
    assert.equal(summary.textureQuality.status, 'readable');
    assert.equal(Math.round(summary.textureQuality.pixelsPerMeter.min), 1049);
    assert.equal(summary.poseComfort.status, 'comfortable');
    assert.equal(summary.poseComfort.eyeHeight, 1.6);
    assert.equal(summary.poseAdjustment, null);
    assert.equal(summary.facing.status, 'aligned');
    assert.equal(summary.rotationAdjustment, null);
    assert.deepEqual(summary.position, [0.5, 1.25, -1.8]);
    assert.deepEqual(summary.rotation, [0, -18, 0]);
  });

  it('summarizes XR scene quality without product UI labels', () => {
    let scene = createXRSpatialScene({
      id: 'root',
      component: 'panel-layout',
      children: [
        {
          id: 'main',
          component: 'graph',
          xr: { position: [0, 1.42, -1.75], rotation: [0, 0, 0], size: [0.92, 0.54] },
        },
        {
          id: 'high',
          component: 'chat',
          xr: { position: [0.4, 2.25, -1.1], rotation: [0, 0, 0], size: [0.25, 0.2] },
        },
      ],
    }, {
      userSpace: { eyeHeight: 1.55 },
      adjustComfort: false,
      adjustFacing: false,
    });
    let summary = createXRSceneQualitySummary(scene, {
      eyeHeight: 1.55,
      maxTextureSize: 2048,
      minPixelsPerMeter: 6000,
      targetPixelsPerMeter: 7000,
    });

    assert.equal(summary.version, 'xr-scene-quality-summary-v1');
    assert.equal(summary.status, 'warning');
    assert.equal(summary.total, 2);
    assert.equal(summary.lowQualityCount, 1);
    assert.equal(summary.comfortWarningCount, 1);
    assert.equal(summary.facingWarningCount, 1);
    assert.deepEqual(Object.keys(summary.panels[0]), [
      'panelId',
      'textureStatus',
      'comfortStatus',
      'facingStatus',
      'pixelsPerMeter',
      'distance',
      'position',
      'rotation',
      'warnings',
    ]);
    assert.equal(summary.panels[0].panelId, 'main');
    assert.equal(summary.panels[1].comfortStatus, 'warning');
    assert.ok(summary.panels[1].warnings.includes('panel-too-high'));
  });

  it('summarizes XR scene geometry without product UI labels', () => {
    let scene = createXRSpatialScene({
      id: 'root',
      component: 'panel-layout',
      children: [
        {
          id: 'main',
          component: 'graph',
          xr: { position: [0, 1.42, -1.75], rotation: [0, 0, 0], size: [0.92, 0.54] },
        },
        {
          id: 'high',
          component: 'chat',
          xr: { position: [0.4, 2.25, -1.1], rotation: [0, 0, 0], size: [0.25, 0.2] },
        },
      ],
    }, {
      userSpace: { eyeHeight: 1.55 },
      adjustComfort: false,
      adjustFacing: false,
    });
    scene.panels[1] = {
      ...scene.panels[1],
      poseAdjustment: { adjusted: true },
      rotationAdjustment: { adjusted: true },
    };
    let summary = createXRSceneGeometrySummary(scene, {
      eyeHeight: 1.55,
      maxTextureSize: 2048,
      minPixelsPerMeter: 6000,
      targetPixelsPerMeter: 7000,
    });

    assert.equal(summary.version, 'xr-scene-geometry-summary-v1');
    assert.equal(summary.status, 'warning');
    assert.equal(summary.total, 2);
    assert.equal(summary.lowQualityCount, 1);
    assert.equal(summary.comfortWarningCount, 1);
    assert.equal(summary.poseAdjustedCount, 1);
    assert.equal(summary.facingWarningCount, 1);
    assert.equal(summary.rotationAdjustedCount, 1);
    assert.equal(summary.firstPanel.panelId, 'main');
    assert.equal(summary.firstPanel.component, 'graph');
    assert.ok(Number.isFinite(summary.minPixelsPerMeter));
    assert.ok(summary.panels[1].poseComfort.warnings.includes('panel-too-high'));
  });

  it('builds data-only XR visual test summaries for agent inspection', () => {
    let scene = createXRSpatialScene({
      id: 'root',
      component: 'panel-layout',
      children: [
        {
          id: 'main',
          component: 'graph',
          xr: { position: [0, 1.42, -1.75], rotation: [0, 0, 0], size: [0.92, 0.54] },
        },
        {
          id: 'chat',
          component: 'chat',
          xr: { position: [0.08, 1.44, -1.72], rotation: [0, 0, 0], size: [0.9, 0.5] },
        },
      ],
    }, {
      userSpace: { eyeHeight: 1.55 },
      adjustComfort: false,
      adjustFacing: false,
    });
    let summary = createXRVisualTestSummary(scene, {
      eyeHeight: 1.55,
      telemetry: {
        active: true,
        panelFrameVisuals: 0,
        controllerRayVisuals: 0,
        hitReticleVisuals: 0,
      },
    });

    assert.equal(summary.version, 'xr-visual-test-summary-v1');
    assert.equal(summary.status, 'warning');
    assert.equal(summary.panelCount, 2);
    assert.equal(summary.panelMap.length, 2);
    assert.deepEqual(summary.panelMap[0].worldRect.panelId, 'main');
    assert.ok(summary.checks.some((check) => check.id === 'panel-world-overlap' && check.status === 'warn'));
    assert.ok(summary.checks.some((check) => check.id === 'frame-visuals-present' && check.status === 'warn'));
    assert.ok(summary.checks.some((check) => check.id === 'controller-rays-visible' && check.status === 'warn'));
    assert.ok(summary.issues.some((issue) => issue.id === 'panel-world-overlap'));
  });

  it('builds provider-owned agent readiness summaries from visual harness artifacts', () => {
    let visual = createXRVisualTestSummary(createXRSpatialScene({
      id: 'root',
      component: 'panel-layout',
      children: [
        { id: 'main', component: 'graph', layout: { weight: 0.55 } },
        { id: 'chat', component: 'chat', layout: { weight: 0.45 } },
      ],
    }), {
      telemetry: {
        active: true,
        panelFrameVisuals: 2,
        controllerRayVisuals: 1,
        hitReticleVisuals: 1,
      },
    });
    let ready = createXRVisualAgentReadinessSummary({
      visual,
      expectedStatus: 'pass',
      svg: {
        topPanelShapes: 2,
        frontPanelShapes: 2,
        topLabels: 2,
        frontLabels: 2,
      },
      outputs: {
        statusRows: 8,
        checksBytes: 512,
        panelMapBytes: 1024,
      },
      pageErrors: [],
      screenshots: [{ bytes: 120000, width: 1440, height: 1000 }],
    });

    assert.equal(ready.version, 'xr-visual-agent-readiness-v1');
    assert.equal(ready.ready, true);
    assert.equal(ready.status, 'pass');
    assert.equal(ready.reason, 'ready');

    let blocked = createXRVisualAgentReadinessSummary({
      visual,
      expectedIssueIds: ['panel-world-overlap'],
      svg: { topPanelShapes: 0, frontPanelShapes: 0 },
      outputs: { statusRows: 0, checksBytes: 0, panelMapBytes: 0 },
      pageErrors: [{ message: 'boom' }],
      screenshots: [{ bytes: 0, width: 0, height: 0 }],
    });

    assert.equal(blocked.ready, false);
    assert.equal(blocked.status, 'fail');
    assert.ok(blocked.missingIssueIds.includes('panel-world-overlap'));
    assert.ok(blocked.checks.some((check) => check.id === 'visual-maps-present' && check.status === 'fail'));
    assert.ok(blocked.checks.some((check) => check.id === 'page-errors-empty' && check.status === 'fail'));
    assert.ok(blocked.checks.some((check) => check.id === 'screenshots-valid' && check.status === 'fail'));
  });

  it('builds XR theme snapshots from provider CSS custom properties', () => {
    let previousGetComputedStyle = globalThis.getComputedStyle;
    let root = { dataset: { themeScope: 'section.spatial' } };
    globalThis.getComputedStyle = () => ({
      getPropertyValue(name) {
        let tokens = {
          '--sn-xr-panel-bg': 'var(--sn-panel-bg)',
          '--sn-xr-panel-border': 'var(--sn-node-border)',
          '--sn-xr-panel-radius': 'var(--sn-node-radius)',
          '--sn-xr-panel-shadow': 'var(--sn-node-shadow)',
          '--sn-xr-pointer-color': 'var(--sn-node-selected)',
          '--sn-text': 'hsl(0 0% 94%)',
          '--sn-text-dim': 'hsl(0 0% 64%)',
          '--sn-duration-fast': '120ms',
          '--sn-ease-standard': 'ease',
          '--sn-layout-resizer-size': '6px',
        };
        return tokens[name] || '';
      },
    });

    try {
      let snapshot = createXRThemeSnapshot(root);

      assert.equal(snapshot.themeScope, 'section.spatial');
      assert.equal(snapshot.material.background, 'var(--sn-panel-bg)');
      assert.equal(snapshot.material.border, 'var(--sn-node-border)');
      assert.equal(snapshot.material.radius, 'var(--sn-node-radius)');
      assert.equal(snapshot.material.pointer, 'var(--sn-node-selected)');
      assert.equal(snapshot.material.motion.duration, '120ms');
    } finally {
      if (previousGetComputedStyle) {
        globalThis.getComputedStyle = previousGetComputedStyle;
      } else {
        delete globalThis.getComputedStyle;
      }
    }
  });

  it('applies provider material snapshots to XR panels without owning a separate XR theme', () => {
    let themed = applyXRThemeToPanel(
      { id: 'chat', material: { background: 'custom-bg' } },
      {
        themeScope: 'default-provider',
        material: {
          background: 'provider-bg',
          border: 'provider-border',
          radius: 'provider-radius',
          shadow: 'provider-shadow',
          pointer: 'provider-pointer',
        },
      },
    );

    assert.equal(themed.themeScope, 'default-provider');
    assert.equal(themed.material.background, 'custom-bg');
    assert.equal(themed.material.border, 'provider-border');
  });

  it('keeps the XR scene controller renderer-neutral and fallback-safe', async () => {
    let controller = createXRSceneController({ globalThis: {} });
    let sceneState = controller.setScene(createXRSpatialScene({
      id: 'main',
      type: 'panel',
      panelType: 'graph',
    }));

    assert.equal(sceneState.scene.panels[0].material.background, 'var(--sn-panel-bg)');

    let result = await controller.start('immersive-vr');

    assert.equal(result.ok, false);
    assert.equal(result.state.status, 'fallback');
    assert.equal(result.state.renderMode, 'dom-fallback');
  });

  it('runs WebXR sessions through the scene controller lifecycle', async () => {
    let callbacks = [];
    let ended = false;
    let session = {
      inputSources: [{ handedness: 'right' }],
      requestAnimationFrame(callback) {
        callbacks.push(callback);
        return callbacks.length;
      },
      cancelAnimationFrame() {},
      async requestReferenceSpace(type) {
        assert.equal(type, 'local-floor');
        return { type };
      },
      async end() {
        ended = true;
      },
    };
    let target = {
      navigator: {
        xr: {
          async isSessionSupported() {
            return true;
          },
          async requestSession(mode) {
            assert.equal(mode, 'immersive-vr');
            return session;
          },
        },
      },
    };
    let frames = 0;
    let controller = createXRSceneController({
      globalThis: target,
      onFrame() {
        frames++;
      },
    });

    let start = await controller.start('immersive-vr');
    assert.equal(start.ok, true);
    assert.equal(start.state.status, 'running');
    assert.equal(start.state.renderMode, 'webxr-session');

    callbacks[0](42, {});
    assert.equal(controller.getState().frameCount, 1);
    assert.equal(frames, 1);

    let stopped = await controller.stop();
    assert.equal(stopped.ok, true);
    assert.equal(stopped.state.status, 'stopped');
    assert.equal(ended, true);
  });

  it('summarizes XR scene controller state for remote diagnostics', () => {
    let scene = createXRSpatialScene({
      id: 'main',
      type: 'panel',
      panelType: 'graph',
      xr: { position: [0, 1.35, -1.8], size: [1.1, 0.72] },
    });
    let diagnostics = createXRSceneDiagnostics({
      status: 'running',
      mode: 'immersive-vr',
      renderMode: 'webxr-session',
      frameCount: 3,
      scene,
      layer: {
        constructor: { name: 'XRWebGLLayer' },
        framebufferWidth: 1440,
        framebufferHeight: 1440,
        framebuffer: 'framebuffer',
      },
      inputSources: [{ handedness: 'right' }],
    }, {
      canvas: { width: 1440, height: 1440, clientWidth: 0, clientHeight: 0 },
      gl: { drawingBufferWidth: 1440, drawingBufferHeight: 1440 },
    });

    assert.equal(diagnostics.version, 'xr-scene-diagnostics-v1');
    assert.equal(diagnostics.status, 'running');
    assert.equal(diagnostics.scene.panelCount, 1);
    assert.equal(diagnostics.scene.panels[0].id, 'main');
    assert.equal(diagnostics.layer.framebufferWidth, 1440);
    assert.equal(diagnostics.layer.hasFramebuffer, true);
    assert.equal(diagnostics.canvas.width, 1440);
    assert.equal(diagnostics.gl.hasContext, true);
    assert.equal(diagnostics.inputSources, 1);
  });

  it('renders prepared HTML panels into an XR WebGL layer frame', () => {
    let calls = [];
    let gl = {
      VERTEX_SHADER: 'VERTEX_SHADER',
      FRAGMENT_SHADER: 'FRAGMENT_SHADER',
      TEXTURE_2D: 'TEXTURE_2D',
      TEXTURE_MIN_FILTER: 'TEXTURE_MIN_FILTER',
      TEXTURE_MAG_FILTER: 'TEXTURE_MAG_FILTER',
      TEXTURE_WRAP_S: 'TEXTURE_WRAP_S',
      TEXTURE_WRAP_T: 'TEXTURE_WRAP_T',
      LINEAR: 'LINEAR',
      CLAMP_TO_EDGE: 'CLAMP_TO_EDGE',
      ARRAY_BUFFER: 'ARRAY_BUFFER',
      STREAM_DRAW: 'STREAM_DRAW',
      FLOAT: 'FLOAT',
      TRIANGLES: 'TRIANGLES',
      FRAMEBUFFER: 'FRAMEBUFFER',
      COLOR_BUFFER_BIT: 'COLOR_BUFFER_BIT',
      DEPTH_TEST: 'DEPTH_TEST',
      BLEND: 'BLEND',
      SCISSOR_TEST: 'SCISSOR_TEST',
      SRC_ALPHA: 'SRC_ALPHA',
      ONE_MINUS_SRC_ALPHA: 'ONE_MINUS_SRC_ALPHA',
      createShader: (type) => ({ type }),
      shaderSource: () => {},
      compileShader: () => {},
      createProgram: () => ({}),
      attachShader: () => {},
      linkProgram: () => {},
      createTexture: () => ({}),
      bindTexture: (...args) => calls.push(['bindTexture', ...args]),
      texParameteri: () => {},
      createBuffer: () => ({}),
      getAttribLocation: (program, name) => name === 'a_position' ? 0 : 1,
      bindFramebuffer: (...args) => calls.push(['bindFramebuffer', ...args]),
      useProgram: () => calls.push(['useProgram']),
      disable: () => {},
      enable: () => {},
      blendFunc: () => {},
      viewport: (...args) => calls.push(['viewport', ...args]),
      scissor: (...args) => calls.push(['scissor', ...args]),
      clearColor: () => {},
      clear: () => {},
      bindBuffer: () => {},
      bufferData: (...args) => calls.push(['bufferData', args[1].length]),
      enableVertexAttribArray: () => {},
      vertexAttribPointer: () => {},
      drawArrays: (...args) => calls.push(['drawArrays', ...args]),
    };
    let htmlCanvasRenderer = {
      renderPanel(panelId, target) {
        assert.equal(target, gl);
        return { rendered: true, mode: 'webgl', panelId };
      },
    };
    let renderer = createXRWebGLLayerPanelRenderer({ htmlCanvasRenderer });

    let frame = renderer.renderFrame({
      gl,
      layer: {
        framebuffer: 'xr-framebuffer',
        framebufferWidth: 1440,
        framebufferHeight: 720,
      },
      scene: {
        panels: [
          { id: 'a', relativeRect: { x: 0, y: 0, width: 0.5, height: 1 } },
          { id: 'b', relativeRect: { x: 0.5, y: 0, width: 0.5, height: 1 } },
        ],
      },
    });

    assert.equal(frame.rendered, true);
    assert.equal(frame.panelCount, 2);
    assert.equal(frame.renderedPanels, 2);
    assert.equal(frame.textureQuality.length, 2);
    assert.equal(frame.lowQualityPanels.length, 0);
    assert.equal(renderer.getState().preparedTextures, 2);
    assert.ok(calls.some((call) => call[0] === 'bindFramebuffer'));
    assert.equal(calls.filter((call) => call[0] === 'drawArrays').length, 2);
  });

  it('renders XR panels in world space when XRView matrices are available', () => {
    let matrices = [];
    let calls = [];
    let gl = {
      VERTEX_SHADER: 'VERTEX_SHADER',
      FRAGMENT_SHADER: 'FRAGMENT_SHADER',
      TEXTURE_2D: 'TEXTURE_2D',
      TEXTURE_MIN_FILTER: 'TEXTURE_MIN_FILTER',
      TEXTURE_MAG_FILTER: 'TEXTURE_MAG_FILTER',
      TEXTURE_WRAP_S: 'TEXTURE_WRAP_S',
      TEXTURE_WRAP_T: 'TEXTURE_WRAP_T',
      TEXTURE0: 'TEXTURE0',
      LINEAR: 'LINEAR',
      CLAMP_TO_EDGE: 'CLAMP_TO_EDGE',
      ARRAY_BUFFER: 'ARRAY_BUFFER',
      STREAM_DRAW: 'STREAM_DRAW',
      FLOAT: 'FLOAT',
      TRIANGLES: 'TRIANGLES',
      FRAMEBUFFER: 'FRAMEBUFFER',
      COLOR_BUFFER_BIT: 'COLOR_BUFFER_BIT',
      DEPTH_TEST: 'DEPTH_TEST',
      BLEND: 'BLEND',
      SCISSOR_TEST: 'SCISSOR_TEST',
      SRC_ALPHA: 'SRC_ALPHA',
      ONE_MINUS_SRC_ALPHA: 'ONE_MINUS_SRC_ALPHA',
      RGBA: 'RGBA',
      UNSIGNED_BYTE: 'UNSIGNED_BYTE',
      createShader: (type) => ({ type }),
      shaderSource: () => {},
      compileShader: () => {},
      createProgram: () => ({}),
      attachShader: () => {},
      linkProgram: () => {},
      createTexture: () => ({}),
      bindTexture: () => {},
      texParameteri: () => {},
      texImage2D: () => {},
      createBuffer: () => ({}),
      getAttribLocation: (program, name) => name === 'a_position' ? 0 : 1,
      getUniformLocation: (program, name) => name,
      activeTexture: () => {},
      uniform1i: () => {},
      uniformMatrix4fv: (location, transpose, matrix) => matrices.push([...matrix]),
      bindFramebuffer: () => {},
      useProgram: () => {},
      disable: () => {},
      enable: (...args) => calls.push(['enable', ...args]),
      blendFunc: () => {},
      viewport: (...args) => calls.push(['viewport', ...args]),
      scissor: (...args) => calls.push(['scissor', ...args]),
      clearColor: () => {},
      clear: () => {},
      bindBuffer: () => {},
      bufferData: () => {},
      enableVertexAttribArray: () => {},
      vertexAttribPointer: () => {},
      drawArrays: (...args) => calls.push(['drawArrays', ...args]),
    };
    let renderer = createXRWebGLLayerPanelRenderer({
      htmlCanvasRenderer: {
        renderPanel(panelId) {
          return { rendered: true, mode: 'webgl', panelId };
        },
      },
    });
    let identity = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ];
    let frame = renderer.renderFrame({
      gl,
      layer: {
        framebuffer: 'xr-framebuffer',
        framebufferWidth: 1440,
        framebufferHeight: 720,
        getViewport: () => ({ x: 0, y: 0, width: 720, height: 720 }),
      },
      frame: {
        getViewerPose: () => ({
          views: [{
            projectionMatrix: identity,
            transform: { inverse: { matrix: identity } },
          }, {
            projectionMatrix: identity,
            transform: { inverse: { matrix: identity } },
          }],
        }),
      },
      referenceSpace: {},
      scene: {
        panels: [{ id: 'a', position: [0.25, 1.2, -1.7], rotation: [0, 24, 0], size: [0.5, 0.4] }],
      },
    });

    assert.equal(frame.space, 'world');
    assert.equal(frame.viewCount, 2);
    assert.equal(frame.rendered, true);
    assert.equal(frame.viewports.length, 2);
    assert.equal(calls.filter((call) => call[0] === 'scissor').length, 2);
    assert.equal(calls.filter((call) => call[0] === 'drawArrays').length, 2);
    assert.equal(matrices.length, 2);
    assert.ok(Math.abs(matrices[0][12] - 0.25) < 0.000001);
    assert.ok(Math.abs(matrices[0][13] - 1.2) < 0.000001);
    assert.ok(Math.abs(matrices[0][14] + 1.7) < 0.000001);
  });

  it('draws provider fallback panels when HTML texture upload fails', () => {
    let calls = [];
    let gl = {
      VERTEX_SHADER: 'VERTEX_SHADER',
      FRAGMENT_SHADER: 'FRAGMENT_SHADER',
      TEXTURE_2D: 'TEXTURE_2D',
      TEXTURE_MIN_FILTER: 'TEXTURE_MIN_FILTER',
      TEXTURE_MAG_FILTER: 'TEXTURE_MAG_FILTER',
      TEXTURE_WRAP_S: 'TEXTURE_WRAP_S',
      TEXTURE_WRAP_T: 'TEXTURE_WRAP_T',
      TEXTURE0: 'TEXTURE0',
      LINEAR: 'LINEAR',
      CLAMP_TO_EDGE: 'CLAMP_TO_EDGE',
      ARRAY_BUFFER: 'ARRAY_BUFFER',
      STREAM_DRAW: 'STREAM_DRAW',
      FLOAT: 'FLOAT',
      TRIANGLES: 'TRIANGLES',
      FRAMEBUFFER: 'FRAMEBUFFER',
      COLOR_BUFFER_BIT: 'COLOR_BUFFER_BIT',
      DEPTH_TEST: 'DEPTH_TEST',
      BLEND: 'BLEND',
      SRC_ALPHA: 'SRC_ALPHA',
      ONE_MINUS_SRC_ALPHA: 'ONE_MINUS_SRC_ALPHA',
      RGBA: 'RGBA',
      UNSIGNED_BYTE: 'UNSIGNED_BYTE',
      createShader: (type) => ({ type }),
      shaderSource: () => {},
      compileShader: () => {},
      createProgram: () => ({}),
      attachShader: () => {},
      linkProgram: () => {},
      createTexture: () => ({}),
      bindTexture: () => {},
      texParameteri: () => {},
      texImage2D: () => calls.push(['texImage2D']),
      createBuffer: () => ({}),
      getAttribLocation: (program, name) => name === 'a_position' ? 0 : 1,
      getUniformLocation: () => ({}),
      activeTexture: (...args) => calls.push(['activeTexture', ...args]),
      uniform1i: (...args) => calls.push(['uniform1i', ...args]),
      bindFramebuffer: () => {},
      useProgram: () => {},
      disable: () => {},
      enable: () => {},
      blendFunc: () => {},
      viewport: () => {},
      clearColor: () => {},
      clear: () => {},
      bindBuffer: () => {},
      bufferData: () => {},
      enableVertexAttribArray: () => {},
      vertexAttribPointer: () => {},
      drawArrays: (...args) => calls.push(['drawArrays', ...args]),
    };
    let renderer = createXRWebGLLayerPanelRenderer({
      htmlCanvasRenderer: {
        renderPanel() {
          throw new TypeError('canvas subtree was not laid out');
        },
      },
    });

    let frame = renderer.renderFrame({
      gl,
      layer: {
        framebuffer: 'xr-framebuffer',
        framebufferWidth: 1440,
        framebufferHeight: 720,
      },
      scene: {
        panels: [{ id: 'a', relativeRect: { x: 0, y: 0, width: 1, height: 1 } }],
      },
    });

    assert.equal(frame.rendered, true);
    assert.equal(frame.renderedPanels, 1);
    assert.equal(frame.texturedPanels, 0);
    assert.equal(frame.fallbackPanels.length, 1);
    assert.equal(frame.fallbackPanels[0].reason, 'TypeError');
    assert.match(frame.fallbackPanels[0].message, /canvas subtree/);
    assert.equal(frame.failedPanels.length, 0);
    assert.ok(calls.some((call) => call[0] === 'drawArrays'));
  });

  it('can disable XR fallback panels when strict texture upload is required', () => {
    let calls = [];
    let gl = {
      VERTEX_SHADER: 'VERTEX_SHADER',
      FRAGMENT_SHADER: 'FRAGMENT_SHADER',
      TEXTURE_2D: 'TEXTURE_2D',
      TEXTURE_MIN_FILTER: 'TEXTURE_MIN_FILTER',
      TEXTURE_MAG_FILTER: 'TEXTURE_MAG_FILTER',
      TEXTURE_WRAP_S: 'TEXTURE_WRAP_S',
      TEXTURE_WRAP_T: 'TEXTURE_WRAP_T',
      TEXTURE0: 'TEXTURE0',
      LINEAR: 'LINEAR',
      CLAMP_TO_EDGE: 'CLAMP_TO_EDGE',
      ARRAY_BUFFER: 'ARRAY_BUFFER',
      STREAM_DRAW: 'STREAM_DRAW',
      FLOAT: 'FLOAT',
      TRIANGLES: 'TRIANGLES',
      FRAMEBUFFER: 'FRAMEBUFFER',
      COLOR_BUFFER_BIT: 'COLOR_BUFFER_BIT',
      DEPTH_TEST: 'DEPTH_TEST',
      BLEND: 'BLEND',
      SRC_ALPHA: 'SRC_ALPHA',
      ONE_MINUS_SRC_ALPHA: 'ONE_MINUS_SRC_ALPHA',
      RGBA: 'RGBA',
      UNSIGNED_BYTE: 'UNSIGNED_BYTE',
      createShader: (type) => ({ type }),
      shaderSource: () => {},
      compileShader: () => {},
      createProgram: () => ({}),
      attachShader: () => {},
      linkProgram: () => {},
      createTexture: () => ({}),
      bindTexture: () => {},
      texParameteri: () => {},
      texImage2D: () => {},
      createBuffer: () => ({}),
      getAttribLocation: (program, name) => name === 'a_position' ? 0 : 1,
      getUniformLocation: () => ({}),
      activeTexture: () => {},
      uniform1i: () => {},
      bindFramebuffer: () => {},
      useProgram: () => {},
      disable: () => {},
      enable: () => {},
      blendFunc: () => {},
      viewport: () => {},
      clearColor: () => {},
      clear: () => {},
      bindBuffer: () => {},
      bufferData: () => {},
      enableVertexAttribArray: () => {},
      vertexAttribPointer: () => {},
      drawArrays: (...args) => calls.push(['drawArrays', ...args]),
    };
    let renderer = createXRWebGLLayerPanelRenderer({
      requireTextureUpload: true,
      htmlCanvasRenderer: {
        renderPanel() {
          return { rendered: false, mode: 'webgl', reason: 'html-in-canvas-unsupported' };
        },
      },
    });

    let frame = renderer.renderFrame({
      gl,
      layer: {
        framebuffer: 'xr-framebuffer',
        framebufferWidth: 1440,
        framebufferHeight: 720,
      },
      scene: {
        panels: [{ id: 'a', relativeRect: { x: 0, y: 0, width: 1, height: 1 } }],
      },
    });

    assert.equal(frame.rendered, false);
    assert.equal(frame.strictTextureUpload, true);
    assert.equal(frame.renderedPanels, 0);
    assert.equal(frame.texturedPanels, 0);
    assert.equal(frame.fallbackPanels.length, 0);
    assert.equal(frame.failedPanels.length, 1);
    assert.equal(frame.textureQuality.length, 0);
    assert.equal(frame.lowQualityPanels.length, 0);
    assert.equal(frame.failedPanels[0].reason, 'html-in-canvas-unsupported');
    assert.equal(calls.filter((call) => call[0] === 'drawArrays').length, 0);
  });

  it('creates an XRWebGLLayer for scene controller sessions when a canvas is supplied', async () => {
    let renderState = null;
    let session = {
      renderState: {
        baseLayer: {
          framebufferWidth: 1200,
          framebufferHeight: 800,
          framebuffer: 'xr-framebuffer',
        },
      },
      inputSources: [],
      requestAnimationFrame() {
        return 1;
      },
      cancelAnimationFrame() {},
      async requestReferenceSpace(type) {
        return { type };
      },
      async updateRenderState(nextState) {
        renderState = nextState;
        this.renderState = { ...this.renderState, ...nextState };
      },
      async end() {},
    };
    let target = {
      XRWebGLLayer: class {
        constructor(receivedSession, receivedGl) {
          assert.equal(receivedSession, session);
          assert.equal(receivedGl.xrCompatible, true);
          this.framebufferWidth = 1200;
          this.framebufferHeight = 800;
          this.framebuffer = 'xr-framebuffer';
        }
      },
      navigator: {
        xr: {
          async requestSession() {
            return session;
          },
        },
      },
    };
    let gl = {
      xrCompatible: true,
      FRAMEBUFFER: 'FRAMEBUFFER',
      bindFramebuffer(targetName, framebuffer) {
        assert.equal(targetName, 'FRAMEBUFFER');
        assert.equal(framebuffer, 'xr-framebuffer');
      },
    };
    let canvas = { width: 0, height: 0 };
    let controller = createXRSceneController({ globalThis: target });

    let start = await controller.start('immersive-vr', { canvas, gl });

    assert.equal(start.ok, true);
    assert.ok(start.state.layer);
    assert.equal(renderState.baseLayer, start.state.layer);
    assert.equal(canvas.width, 1200);
    assert.equal(canvas.height, 800);
  });

  it('normalizes XR ray hits into pointer-like panel events', () => {
    let panels = projectLayoutToXR({
      id: 'main',
      type: 'panel',
      panelType: 'dashboard',
      xr: { position: [0, 1, -2], size: [1, 1] },
    }).panels;
    let ray = { origin: [0, 1, 0], direction: [0, 0, -1] };
    let hit = hitTestXRPanels(ray, panels);
    let event = createXRPointerEvent(hit, { source: 'xr-controller', primary: true, ray }, 'click');

    assert.equal(hit.panelId, 'main');
    assert.equal(event.type, 'click');
    assert.equal(event.targetId, 'main');
    assert.equal(event.buttons.primary, true);
    assert.equal(event.point.x, 0.5);
    assert.equal(event.point.y, 0.5);
    assert.equal(event.contentPoint.x, 640);
    assert.equal(event.contentPoint.y, 640);
  });

  it('maps normalized panel hits to content viewport pixel coordinates', () => {
    let panel = createXRSpatialScene({
      id: 'narrow',
      component: 'file-tree',
      xr: { size: [0.32, 0.82], position: [0, 1, -1] },
    }, {
      preview: { pixelsPerMeter: 118 },
    }).panels[0];
    let target = createXRPanelPointerTarget({
      panelId: 'narrow',
      point: { x: 0.25, y: 0.75 },
      panel,
    }, {
      source: 'mouse-fallback',
    });

    assert.equal(target.panelId, 'narrow');
    assert.deepEqual(target.point, { x: 0.25, y: 0.75 });
    assert.equal(target.contentViewport.width, 1280);
    assert.equal(target.contentViewport.height, 1536);
    assert.deepEqual(target.contentPoint, { x: 320, y: 1152 });
    assert.equal(target.source, 'mouse-fallback');
  });

  it('creates provider-owned pointer hits for DOM fallback adapters', () => {
    let panel = { id: 'main', contentViewport: { width: 960, height: 540, scale: 0.1 } };
    let hit = createXRPointerHit(panel, { x: 1.4, y: -0.2 });
    let event = createXRPointerEvent(hit, { source: 'mouse-fallback' });

    assert.equal(hit.panelId, 'main');
    assert.deepEqual(hit.point, { x: 1, y: 0 });
    assert.deepEqual(event.contentPoint, { x: 960, y: 0 });
  });

  it('normalizes DOM fallback pointer hits through provider helpers', () => {
    let panel = { id: 'main' };
    let element = {
      getBoundingClientRect: () => ({ left: 10, top: 20, width: 200, height: 100 }),
    };
    let hit = createXRPointerHitFromDomEvent(panel, element, { clientX: 60, clientY: 95 });

    assert.equal(hit.panelId, 'main');
    assert.deepEqual(hit.point, { x: 0.25, y: 0.75 });
  });

  it('creates provider-owned DOM fallback pointer rays', () => {
    let ray = createXRPointerRayFromDomEvent({
      clientX: 75,
      clientY: 80,
    }, {
      getBoundingClientRect() {
        return { left: 25, top: 20, width: 100, height: 120 };
      },
    });

    assert.equal(ray.version, 'xr-dom-pointer-ray-v1');
    assert.deepEqual(ray.origin, [0, 1.32, 0]);
    assert.deepEqual(ray.normalized, { x: 0.5, y: 0.5 });
    assert.equal(Math.round(ray.direction[2]), -1);
  });

  it('turns XR panel gestures into layout.updateNode transactions', () => {
    let panel = createXRSpatialScene({
      id: 'file-tree',
      type: 'panel',
      panelType: 'file-tree',
      layout: { rect: { x: 0, y: 0, width: 0.25, height: 1 } },
    }).panels[0];
    let start = createXRPanelGestureState({
      panel,
      layoutId: 'graph',
      mode: 'move',
      pointerEvent: {
        point: { x: 0.2, y: 0.3 },
        contentPoint: { x: 192, y: 360 },
      },
    });
    let next = updateXRPanelGesture(start, {
      point: { x: 0.3, y: 0.25 },
      contentPoint: { x: 288, y: 300 },
      buttons: { primary: true },
    });
    let transaction = createXRLayoutTransactionFromGesture(next, {
      id: 'tx:xr-test',
      targetProject: 'project:test',
    });

    assert.equal(next.status, 'dragging');
    assert.deepEqual(next.delta, { x: 0.1, y: -0.05 });
    assert.deepEqual(next.relativeRect, { x: 0.1, y: 0, width: 0.25, height: 1 });
    assert.equal(transaction.operations[0].type, 'layout.updateNode');
    assert.equal(transaction.operations[0].layout, 'graph');
    assert.equal(transaction.operations[0].nodeId, 'file-tree');
    assert.deepEqual(transaction.operations[0].patch.layout.rect, next.relativeRect);
    assert.equal(transaction.metadata.source, 'symbiote-node/xr');
  });

  it('maps XR frame resize handles to layout.updateNode transactions', () => {
    let start = createXRPanelGestureState({
      panel: {
        id: 'graph',
        layoutNode: { id: 'node:graph' },
        relativeRect: { x: 0.2, y: 0.2, width: 0.4, height: 0.4 },
      },
      layoutId: 'spatial',
      frameTarget: { operation: 'resize', handle: 'west' },
      pointerEvent: {
        point: { x: 0.2, y: 0.4 },
      },
    });
    let next = updateXRPanelGesture(start, {
      point: { x: 0.1, y: 0.4 },
      buttons: { primary: true },
    });
    let transaction = createXRLayoutTransactionFromGesture(next);

    assert.equal(next.operation, 'resize');
    assert.equal(next.handle, 'west');
    assert.deepEqual(next.relativeRect, { x: 0.1, y: 0.2, width: 0.5, height: 0.4 });
    assert.equal(transaction.operations[0].type, 'layout.updateNode');
    assert.equal(transaction.operations[0].nodeId, 'node:graph');
    assert.equal(transaction.metadata.gesture.handle, 'west');
  });

  it('turns Three world-space panel poses into layout.updateNode transactions', () => {
    let transaction = createXRLayoutTransactionFromPanelPose({
      panelId: 'chat',
      frameTarget: { operation: 'move', zone: 'move' },
      pose: {
        position: { x: 0.25, y: 1.42, z: -1.6 },
        rotation: { x: 0, y: -8.25, z: 0 },
        size: { x: 1.25, y: 0.72 },
      },
    }, {
      id: 'tx:xr-pose-test',
      layoutId: 'spatial',
      targetProject: 'project:test',
    });

    assert.equal(transaction.version, 'project-transaction-v1');
    assert.equal(transaction.operations[0].type, 'layout.updateNode');
    assert.equal(transaction.operations[0].layout, 'spatial');
    assert.equal(transaction.operations[0].nodeId, 'chat');
    assert.deepEqual(transaction.operations[0].patch.props.xr.position, [0.25, 1.42, -1.6]);
    assert.deepEqual(transaction.operations[0].patch.props.xr.rotation, [0, -8.25, 0]);
    assert.deepEqual(transaction.operations[0].patch.props.xr.size, [1.25, 0.72]);
    assert.equal(transaction.metadata.gesture.operation, 'move');
  });

  it('projects runtime UI panels from persisted props.xr pose data', () => {
    let scene = createXRSpatialScene({
      component: 'panel-layout',
      children: [{
        id: 'chat',
        component: 'chat-panel',
        props: {
          xr: {
            position: [0.25, 1.42, -1.6],
            rotation: [0, -8.25, 0],
          },
        },
      }],
    }, { adjustComfort: false, adjustFacing: false });

    assert.deepEqual(scene.panels[0].position, [0.25, 1.42, -1.6]);
    assert.deepEqual(scene.panels[0].rotation, [0, -8.25, 0]);
  });

  it('describes optional IWER emulation support without requiring the package', () => {
    let support = getWebXREmulationSupport({});

    assert.equal(support.name, 'iwer');
    assert.equal(support.status, 'optional-dev-runtime');
    assert.equal(support.nativeWebXRAvailable, false);
    assert.equal(support.moduleAvailable, false);
    assert.equal(support.canInstall, false);
    assert.equal(support.profile, 'metaQuest3');
    assert.ok(support.capabilities.includes('webxr-runtime-emulation'));
    assert.ok(support.capabilities.includes('action-capture-playback'));
  });

  it('keeps native WebXR ahead of optional emulation by default', async () => {
    let target = {
      navigator: {
        xr: {
          async isSessionSupported(mode) {
            return mode === 'immersive-vr';
          },
        },
      },
    };

    let result = await installWebXREmulationRuntime({
      globalThis: target,
      module: {
        XRDevice: class {
          installRuntime() {
            throw new Error('native WebXR should not be replaced by default');
          }
        },
        metaQuest3: {},
      },
    });

    assert.equal(result.ok, true);
    assert.equal(result.runtime, 'native');
    assert.equal(result.installed, false);
    assert.equal(result.reason, 'native-webxr-available');
    assert.equal(result.support.modes.immersiveVr, true);
  });

  it('installs an injected IWER-compatible module as an emulated WebXR runtime', async () => {
    let target = { navigator: {} };
    let installedTarget = null;
    let module = {
      metaQuest3: { profile: 'quest-3' },
      XRDevice: class {
        constructor(profile) {
          this.profile = profile;
          this.controllers = { left: {}, right: {} };
          this.hands = { left: {}, right: {} };
        }

        installRuntime(targetGlobal) {
          installedTarget = targetGlobal;
          targetGlobal.navigator.xr = {
            async isSessionSupported(mode) {
              return mode === 'immersive-vr' || mode === 'inline';
            },
          };
        }
      },
    };

    let result = await installWebXREmulationRuntime({
      globalThis: target,
      module,
      profile: 'metaQuest3',
      configureDevice(device) {
        device.configured = true;
      },
    });

    assert.equal(result.ok, true);
    assert.equal(result.runtime, 'iwer');
    assert.equal(result.installed, true);
    assert.equal(result.profileName, 'metaQuest3');
    assert.equal(result.device.profile.profile, 'quest-3');
    assert.equal(result.device.configured, true);
    assert.equal(installedTarget, target);
    assert.equal(result.support.supported, true);
    assert.equal(result.support.modes.immersiveVr, true);
    assert.equal(result.support.modes.immersiveAr, false);
  });

  it('wraps IWER emulation install state in a reusable adapter', async () => {
    let target = { navigator: {} };
    let adapter = createWebXREmulationAdapter({
      globalThis: target,
      loadModule: async () => ({
        metaQuest3: {},
        XRDevice: class {
          installRuntime(targetGlobal) {
            targetGlobal.navigator.xr = {
              async isSessionSupported() {
                return true;
              },
            };
          }
        },
      }),
    });

    assert.equal(adapter.getSupport().canInstall, true);
    let result = await adapter.install();

    assert.equal(result.ok, true);
    assert.equal(adapter.getState().installed, true);
    assert.equal(adapter.getState().runtime, 'iwer');
    assert.equal(adapter.getDevice(), result.device);
  });

  it('publishes explicit experimental renderer metadata', () => {
    assert.equal(WEBXR_RENDERER.status, 'experimental');
    assert.equal(WEBXR_RENDERER.specifier, 'symbiote-node/xr');
    assert.ok(WEBXR_RENDERER.modes.includes('immersive-vr'));
    assert.ok(WEBXR_RENDERER.capabilities.includes('xr-layout-projection'));
    assert.ok(WEBXR_RENDERER.capabilities.includes('xr-spatial-scene'));
    assert.ok(WEBXR_RENDERER.capabilities.includes('xr-pointer-normalization'));
    assert.ok(WEBXR_RENDERER.capabilities.includes('xr-scene-controller'));
    assert.ok(WEBXR_RENDERER.capabilities.includes('xr-theme-bridge'));
    assert.ok(WEBXR_RENDERER.capabilities.includes('xr-panel-host'));
    assert.ok(WEBXR_RENDERER.capabilities.includes('xr-dom-panel-workbench'));
    assert.ok(WEBXR_RENDERER.capabilities.includes('xr-content-viewport'));
    assert.ok(WEBXR_RENDERER.capabilities.includes('xr-texture-quality-diagnostics'));
    assert.ok(WEBXR_RENDERER.capabilities.includes('xr-scene-quality-diagnostics'));
    assert.ok(WEBXR_RENDERER.capabilities.includes('xr-visual-test-summary'));
    assert.ok(WEBXR_RENDERER.capabilities.includes('xr-pose-comfort-diagnostics'));
    assert.ok(WEBXR_RENDERER.capabilities.includes('xr-pose-comfort-adjustment'));
    assert.ok(WEBXR_RENDERER.capabilities.includes('xr-facing-diagnostics'));
    assert.ok(WEBXR_RENDERER.capabilities.includes('xr-facing-adjustment'));
    assert.ok(WEBXR_RENDERER.capabilities.includes('xr-content-pointer-target'));
    assert.ok(WEBXR_RENDERER.capabilities.includes('xr-panel-gesture'));
    assert.ok(WEBXR_RENDERER.capabilities.includes('xr-layout-transaction'));
    assert.ok(WEBXR_RENDERER.capabilities.includes('xr-readiness-diagnostics'));
    assert.ok(WEBXR_RENDERER.capabilities.includes('xr-webgl-layer-target'));
    assert.ok(WEBXR_RENDERER.capabilities.includes('xr-webgl-layer-panel-renderer'));
    assert.ok(WEBXR_RENDERER.capabilities.includes('xr-three-webxr-adapter'));
    assert.ok(WEBXR_RENDERER.capabilities.includes('xr-emulated-test-runtime'));
    assert.ok(WEBXR_RENDERER.capabilities.includes('iwer-emulation-runtime'));
    assert.ok(WEBXR_RENDERER.capabilities.includes('xr-html-in-canvas-renderer'));
    assert.equal(WEBXR_EMULATION_RUNTIME.status, 'optional-dev-runtime');
    assert.equal(XR_THREE_WEBXR_ADAPTER.status, 'optional-adapter');
    assert.equal(XR_THREE_WEBXR_ADAPTER.dependency.injection, 'host-supplied');
    assert.ok(XR_THREE_WEBXR_ADAPTER.capabilities.includes('three-render-host'));
    assert.ok(XR_THREE_WEBXR_ADAPTER.capabilities.includes('three-render-host-diagnostics'));
    assert.ok(XR_THREE_WEBXR_ADAPTER.capabilities.includes('three-controller-ray-visuals'));
    assert.ok(XR_THREE_WEBXR_ADAPTER.capabilities.includes('three-panel-hit-reticle'));
    assert.ok(XR_THREE_WEBXR_ADAPTER.capabilities.includes('three-panel-frame-visuals'));
    assert.ok(XR_THREE_WEBXR_ADAPTER.capabilities.includes('three-interaction-state-diagnostics'));
    assert.ok(XR_THREE_WEBXR_ADAPTER.capabilities.includes('three-session-telemetry-snapshot'));
    assert.ok(XR_THREE_WEBXR_ADAPTER.capabilities.includes('three-session-health-summary'));
    assert.ok(XR_THREE_WEBXR_ADAPTER.capabilities.includes('three-session-watchdog'));
    assert.ok(XR_THREE_WEBXR_ADAPTER.capabilities.includes('three-diagnostic-payload'));
    assert.ok(XR_THREE_WEBXR_ADAPTER.capabilities.includes('three-diagnostic-timeline'));
    assert.ok(XR_THREE_WEBXR_ADAPTER.capabilities.includes('three-diagnostic-server-summary'));
    assert.ok(XR_THREE_WEBXR_ADAPTER.capabilities.includes('three-drag-response-filter'));
    assert.ok(XR_THREE_WEBXR_ADAPTER.capabilities.includes('three-dom-texture-material-bridge'));
    assert.ok(XR_THREE_WEBXR_ADAPTER.capabilities.includes('three-html-canvas-texture-resolver'));
    assert.ok(XR_THREE_WEBXR_ADAPTER.capabilities.includes('three-panel-material-state'));
    assert.ok(XR_THREE_WEBXR_ADAPTER.capabilities.includes('three-scene-decoration'));
    assert.ok(XR_THREE_WEBXR_ADAPTER.capabilities.includes('three-camera-resize'));
  });

  it('bridges prepared DOM panel sources into Three materials as provider diagnostics', () => {
    let added = [];
    let prepared = [];
    class FakeScene {
      add(mesh) { added.push(mesh); }
      remove() {}
    }
    class FakePlaneGeometry {
      constructor(width, height) {
        this.width = width;
        this.height = height;
      }
    }
    class FakeMaterial {
      constructor(options) {
        this.options = options;
        this.color = { setHex(value) { this.hex = value; } };
      }
    }
    class FakeMesh {
      constructor(geometry, material) {
        this.geometry = geometry;
        this.material = material;
        this.userData = {};
        this.position = { fromArray(values) { this.values = values; } };
        this.rotation = { set(...values) { this.values = values; } };
      }
    }
    let THREE = {
      Scene: FakeScene,
      PlaneGeometry: FakePlaneGeometry,
      MeshStandardMaterial: FakeMaterial,
      Mesh: FakeMesh,
      Raycaster: class {},
      WebGLRenderer: class {},
      PerspectiveCamera: class {},
      DoubleSide: 'DoubleSide',
    };
    let bridge = createXRThreePanelTextureBridge({
      htmlCanvasRenderer: {
        preparePanel(element, panel) {
          prepared.push([element, panel.id]);
          return { prepared: true, panelId: panel.id, mode: 'webgl', supported: true, reason: null };
        },
        getSupport() {
          return {
            supported: true,
            preferredMode: 'webgl',
            modes: { webgl: true },
            diagnostics: { supported: true, mode: 'webgl', missing: [], blockingMissing: [] },
          };
        },
      },
      getPanelElement(panelId) {
        return { id: `${panelId}-element` };
      },
      textureResolver({ panel }) {
        return { id: `${panel.id}-texture`, isTexture: true };
      },
    });
    let adapter = createXRThreePanelSceneAdapter({ THREE, textureBridge: bridge });
    let result = adapter.setScene({
      panels: [
        { id: 'chat', size: [1.2, 0.7], position: [0, 1.3, -1.8], rotation: [0, 12, 0] },
      ],
    });

    assert.equal(result.ok, true);
    assert.equal(prepared.length, 1);
    assert.equal(result.textureSources.length, 1);
    assert.equal(result.textureSources[0].textureApplied, true);
    assert.equal(result.textureSources[0].stage, 'three-material-applied');
    assert.equal(result.textureSources[0].summary.source, 'html-in-canvas');
    assert.equal(added[0].material.map.id, 'chat-texture');
    assert.equal(added[0].material.needsUpdate, true);
    assert.equal(added[0].userData.textureBridge.ok, true);
    assert.equal(added[0].userData.textureBridge.stage, 'three-material-applied');
    assert.equal(bridge.getState().records[0].source, 'html-in-canvas');
    assert.equal(bridge.getState().records[0].stage, 'three-material-applied');
  });

  it('passes the direct source canvas to Three texture resolution', () => {
    let sourceCanvas = { tagName: 'CANVAS', width: 0, height: 0 };
    let element = { id: 'chat-element', parentElement: sourceCanvas };
    let preparedCanvas = null;
    let resolvedCanvas = null;
    let bridge = createXRThreePanelTextureBridge({
      htmlCanvasRenderer: {
        preparePanel(preparedElement, panel, options = {}) {
          assert.equal(preparedElement, element);
          assert.equal(panel.id, 'chat');
          preparedCanvas = options.canvas;
          return {
            prepared: true,
            panelId: panel.id,
            mode: 'canvas2d',
            supported: true,
            reason: null,
            canvas: options.canvas,
          };
        },
        getSupport() {
          return {
            supported: true,
            preferredMode: 'canvas2d',
            modes: { canvas2d: true },
            diagnostics: { supported: true, mode: 'canvas2d', missing: [], blockingMissing: [] },
          };
        },
      },
      getPanelElement() {
        return element;
      },
      textureResolver({ canvas }) {
        resolvedCanvas = canvas;
        return { isTexture: true };
      },
    });

    let mesh = { material: {}, userData: {} };
    let result = bridge.applyPanelTexture(mesh, { id: 'chat' });

    assert.equal(result.ok, true);
    assert.equal(preparedCanvas, sourceCanvas);
    assert.equal(resolvedCanvas, sourceCanvas);
    assert.equal(mesh.material.map.isTexture, true);
  });

  it('resolves HTML-in-Canvas panel previews into Three canvas textures', () => {
    class FakeCanvas {
      constructor() {
        this.width = 0;
        this.height = 0;
      }
    }
    class FakeCanvasTexture {
      constructor(canvas) {
        this.image = canvas;
        this.isTexture = true;
        this.needsUpdate = false;
      }
    }
    let rendered = [];
    let resolver = createXRThreeHtmlCanvasTextureResolver({
      THREE: { CanvasTexture: FakeCanvasTexture },
      document: {
        createElement(tagName) {
          assert.equal(tagName, 'canvas');
          return new FakeCanvas();
        },
      },
      htmlCanvasRenderer: {
        renderPanelPreview(panelId, canvas, options = {}) {
          rendered.push({ panelId, width: canvas.width, height: canvas.height, options });
          return { rendered: true, mode: 'canvas2d', preview: true };
        },
      },
    });

    let texture = resolver.resolve({
      panel: {
        id: 'chat',
        contentViewport: { width: 1280, height: 720 },
      },
      summary: { source: 'html-in-canvas' },
    });

    assert.equal(texture.isTexture, true);
    assert.equal(texture.needsUpdate, true);
    assert.equal(texture.image.width, 1280);
    assert.equal(texture.image.height, 720);
    assert.deepEqual(rendered, [{
      panelId: 'chat',
      width: 1280,
      height: 720,
      options: { width: 1280, height: 720 },
    }]);
    assert.equal(resolver.getState().textureCount, 1);
    assert.equal(resolver.getState().records[0].stage, 'three-canvas-texture-ready');
  });

  it('keeps Three panel textures dirty-driven instead of redrawing every frame', () => {
    class FakeCanvas {
      constructor() {
        this.width = 0;
        this.height = 0;
      }
    }
    class FakeCanvasTexture {
      constructor(canvas) {
        this.image = canvas;
        this.isTexture = true;
        this.needsUpdate = false;
        this.generateMipmaps = true;
        this.anisotropy = 0;
        this.colorSpace = null;
      }
    }
    let renderCount = 0;
    let time = 10;
    let resolver = createXRThreeHtmlCanvasTextureResolver({
      THREE: {
        CanvasTexture: FakeCanvasTexture,
        LinearFilter: 'linear-filter',
        SRGBColorSpace: 'srgb',
      },
      document: { createElement: () => new FakeCanvas() },
      now: () => {
        time += 4;
        return time;
      },
      texture: { anisotropy: 4 },
      htmlCanvasRenderer: {
        renderPanelPreview() {
          renderCount += 1;
          return { rendered: true, mode: 'webgl', preview: true };
        },
      },
    });
    let panel = {
      id: 'chat',
      size: [1.2, 0.7],
      contentViewport: { width: 1280, height: 747, scale: 0.1, density: 0.72 },
    };

    let first = resolver.resolve({
      panel,
      dirtyKey: 'stable',
      summary: { source: 'html-in-canvas' },
    });
    let second = resolver.resolve({
      panel,
      dirtyKey: 'stable',
      summary: { source: 'html-in-canvas' },
    });
    let state = resolver.getState();

    assert.equal(first, second);
    assert.equal(renderCount, 1);
    assert.equal(state.records[0].stage, 'three-canvas-texture-reused');
    assert.equal(state.records[0].redraw, false);
    assert.equal(state.records[0].renderCount, 1);
    assert.deepEqual(state.records[0].texturePixels, { width: 1440, height: 840 });
    assert.equal(state.records[0].texturePixelRatio, 1);
    assert.equal(state.records[0].redrawMode, 'dirty');
    assert.equal(state.records[0].thresholds.minPixelsPerMeter, 900);
    assert.deepEqual(state.records[0].qualityWarnings, []);
    assert.deepEqual(state.records[0].qualityRecommendations, []);
    assert.equal(first.generateMipmaps, false);
    assert.equal(first.colorSpace, 'srgb');
    assert.equal(first.anisotropy, 4);
  });

  it('reports provider texture resolver failures as data without product fallback', () => {
    let resolver = createXRThreeHtmlCanvasTextureResolver({
      THREE: {},
      document: { createElement: () => ({ width: 0, height: 0 }) },
      htmlCanvasRenderer: {
        renderPanelPreview() {
          return { rendered: true, mode: 'canvas2d', preview: true };
        },
      },
    });

    assert.equal(resolver.resolve({
      panel: { id: 'chat' },
      summary: { source: 'provider-material-fallback', reason: 'html-in-canvas-unsupported' },
    }), null);
    assert.equal(resolver.getState().records[0].stage, 'html-in-canvas-support');

    assert.equal(resolver.resolve({
      panel: { id: 'graph' },
      summary: { source: 'html-in-canvas' },
    }), null);
    assert.equal(resolver.getState().records.find((record) => record.panelId === 'graph').stage, 'three-texture-api');
  });

  it('reports strict Three material texture failures without product-local fallback logic', () => {
    class FakeScene {
      add() {}
      remove() {}
    }
    class FakeMaterial {
      constructor(options) {
        this.options = options;
      }
    }
    class FakeMesh {
      constructor(geometry, material) {
        this.geometry = geometry;
        this.material = material;
        this.userData = {};
        this.position = { fromArray() {} };
        this.rotation = { set() {} };
      }
    }
    let THREE = {
      Scene: FakeScene,
      PlaneGeometry: class {},
      MeshStandardMaterial: FakeMaterial,
      Mesh: FakeMesh,
      Raycaster: class {},
      WebGLRenderer: class {},
      PerspectiveCamera: class {},
      DoubleSide: 'DoubleSide',
    };
    let bridge = createXRThreePanelTextureBridge({
      requireTextureUpload: true,
      htmlCanvasRenderer: {
        preparePanel() {
          return { prepared: true, panelId: 'chat', mode: 'unsupported', supported: false, reason: 'html-in-canvas-unsupported' };
        },
        getSupport() {
          return {
            supported: false,
            preferredMode: null,
            diagnostics: {
              supported: false,
              mode: null,
              missing: ['layoutsubtree'],
              blockingMissing: ['layoutsubtree'],
              recommendation: 'enable-CanvasDrawElement',
            },
          };
        },
      },
      getPanelElement() {
        return { id: 'chat-element' };
      },
    });
    let adapter = createXRThreePanelSceneAdapter({ THREE, textureBridge: bridge });
    let result = adapter.setScene({
      panels: [
        { id: 'chat', size: [1.2, 0.7], position: [0, 1.3, -1.8], rotation: [0, 12, 0] },
      ],
    });

    assert.equal(result.ok, true);
    assert.equal(result.textureSources[0].ok, false);
    assert.equal(result.textureSources[0].textureApplied, false);
    assert.equal(result.textureSources[0].stage, 'html-in-canvas-support');
    assert.equal(result.textureSources[0].strictRequired, true);
    assert.equal(result.textureSources[0].support.recommendation, 'enable-CanvasDrawElement');
    assert.deepEqual(result.textureSources[0].support.blockingMissing, ['layoutsubtree']);
    assert.equal(result.textureSources[0].summary.source, 'unsupported');
    assert.equal(result.textureSources[0].summary.strict, true);
    assert.equal(adapter.getState().textureSources[0].source, 'unsupported');
    assert.equal(adapter.getState().textureSources[0].stage, 'html-in-canvas-support');
  });

  it('shows strict texture failures as provider scene diagnostics', () => {
    class FakeScene {
      add() {}
      remove() {}
    }
    class FakeMaterial {
      constructor(options) {
        this.options = options;
      }
    }
    class FakeMesh {
      constructor(geometry, material) {
        this.geometry = geometry;
        this.material = material;
        this.userData = {};
        this.visible = true;
        this.position = { fromArray() {} };
        this.rotation = { set() {} };
      }
    }
    let THREE = {
      Scene: FakeScene,
      PlaneGeometry: class {},
      MeshStandardMaterial: FakeMaterial,
      Mesh: FakeMesh,
      Raycaster: class {},
      WebGLRenderer: class {},
      PerspectiveCamera: class {},
      DoubleSide: 'DoubleSide',
    };
    let bridge = createXRThreePanelTextureBridge({
      requireTextureUpload: true,
      htmlCanvasRenderer: {
        preparePanel() {
          return { prepared: true, panelId: 'chat', mode: 'unsupported', supported: false, reason: 'html-in-canvas-unsupported' };
        },
        getSupport() {
          return {
            supported: false,
            diagnostics: {
              supported: false,
              missing: ['layoutsubtree'],
              blockingMissing: ['layoutsubtree'],
            },
          };
        },
      },
      getPanelElement() {
        return { id: 'chat-element' };
      },
    });
    let adapter = createXRThreePanelSceneAdapter({ THREE, textureBridge: bridge });
    let result = adapter.setScene({
      panels: [
        { id: 'chat', size: [1.2, 0.7], position: [0, 1.3, -1.8], rotation: [0, 12, 0] },
      ],
    }, {
      textureOptions: { requireTextureUpload: true },
      hideStrictTextureFailures: true,
    });

    assert.equal(result.renderedPanelCount, 1);
    assert.equal(result.hiddenPanelCount, 0);
    assert.deepEqual(result.hiddenPanelIds, []);
    assert.equal(result.diagnosticPanelCount, 1);
    assert.deepEqual(result.diagnosticPanelIds, ['chat']);
    assert.equal(adapter.getPanelMesh('chat').visible, true);
    assert.equal(adapter.getState().textureSources[0].hidden, false);
    assert.equal(adapter.getState().textureSources[0].diagnostic, true);
    assert.equal(adapter.getState().textureSources[0].diagnosticReason, 'html-in-canvas-unsupported');
  });

  it('adapts Symbiote XR panels to a host-supplied Three scene', () => {
    let added = [];
    class FakeScene {
      add(mesh) { added.push(mesh); }
      remove() {}
    }
    class FakePlaneGeometry {
      constructor(width, height) {
        this.width = width;
        this.height = height;
      }
    }
    class FakeMaterial {
      constructor(options) {
        this.options = options;
      }
    }
    class FakeMesh {
      constructor(geometry, material) {
        this.geometry = geometry;
        this.material = material;
        this.userData = {};
        this.position = { fromArray(values) { this.values = values; } };
        this.rotation = { set(...values) { this.values = values; } };
      }
    }
    let THREE = {
      Scene: FakeScene,
      PlaneGeometry: FakePlaneGeometry,
      MeshStandardMaterial: FakeMaterial,
      Mesh: FakeMesh,
      Raycaster: class {},
      WebGLRenderer: class {},
      PerspectiveCamera: class {},
      DoubleSide: 'DoubleSide',
    };
    let adapter = createXRThreePanelSceneAdapter({ THREE });
    let result = adapter.setScene({
      panels: [
        { id: 'chat', size: [1.2, 0.7], position: [0, 1.3, -1.8], rotation: [0, 12, 0], material: { backgroundColor: 0x223344 } },
      ],
    });

    assert.equal(result.ok, true);
    assert.equal(result.panelCount, 1);
    assert.equal(added.length, 1);
    assert.equal(added[0].userData.panelId, 'chat');
    assert.equal(added[0].geometry.width, 1.2);
    assert.deepEqual(added[0].position.values, [0, 1.3, -1.8]);
    assert.equal(Math.round(added[0].rotation.values[1] * 1000), Math.round((12 * Math.PI / 180) * 1000));
  });

  it('places Three panel scenes under a provider-owned body-space root transform', () => {
    let added = [];
    class FakeScene {
      add(object) { added.push(object); }
      remove() {}
    }
    class FakeGroup {
      constructor() {
        this.children = [];
        this.userData = {};
        this.position = { fromArray(values) { this.values = values; } };
        this.rotation = { set(...values) { this.values = values; } };
      }
      add(object) {
        this.children.push(object);
      }
    }
    class FakeMesh {
      constructor(geometry, material) {
        this.geometry = geometry;
        this.material = material;
        this.userData = {};
        this.position = { fromArray(values) { this.values = values; } };
        this.rotation = { set(...values) { this.values = values; } };
      }
    }
    let THREE = {
      Scene: FakeScene,
      Group: FakeGroup,
      PlaneGeometry: class {},
      MeshStandardMaterial: class {},
      Mesh: FakeMesh,
      Raycaster: class {},
      WebGLRenderer: class {},
      PerspectiveCamera: class {},
      DoubleSide: 'DoubleSide',
    };
    let adapter = createXRThreePanelSceneAdapter({ THREE });
    let result = adapter.setScene({
      panels: [
        { id: 'chat', size: [1.2, 0.7], position: [0, 1.3, -1.8], rotation: [0, 0, 0] },
      ],
    }, {
      mode: 'immersive-ar',
      referenceSpaceType: 'local-floor',
      viewerPose: {
        position: [0.25, 1.55, -0.4],
        yawDegrees: 30,
      },
    });

    assert.equal(result.rootTransform.version, 'xr-scene-root-transform-v1');
    assert.equal(result.rootTransform.originSource, 'viewer-pose');
    assert.deepEqual(result.rootTransform.position, [0.25, 0, -0.4]);
    assert.deepEqual(added[0].position.values, [0.25, 0, -0.4]);
    assert.equal(Math.round(added[0].rotation.values[1] * 1000), Math.round((30 * Math.PI / 180) * 1000));
    assert.equal(added[0].children.length, 1);
    assert.equal(added[0].children[0].userData.panelId, 'chat');
    assert.deepEqual(added[0].children[0].position.values, [0, 1.3, -1.8]);
    assert.deepEqual(adapter.getState().rootTransform.position, [0.25, 0, -0.4]);
  });

  it('adds provider-owned Three panel frame visuals to panel meshes', () => {
    class FakeScene {
      add() {}
      remove() {}
    }
    class FakePlaneGeometry {
      constructor(width, height) {
        this.width = width;
        this.height = height;
        this.parameters = { width, height };
      }
    }
    class FakeMaterial {
      constructor(options) {
        this.options = options;
      }
    }
    class FakeMesh {
      constructor(geometry, material) {
        this.geometry = geometry;
        this.material = material;
        this.userData = {};
        this.children = [];
        this.position = {
          set(x, y, z) {
            this.values = [x, y, z];
          },
          fromArray(values) {
            this.values = values;
          },
        };
        this.rotation = { set(...values) { this.values = values; } };
        this.scale = { set(x, y, z) { this.values = [x, y, z]; } };
      }
      add(object) {
        this.children.push(object);
      }
      remove(object) {
        let index = this.children.indexOf(object);
        if (index >= 0) this.children.splice(index, 1);
      }
    }
    let THREE = {
      Scene: FakeScene,
      PlaneGeometry: FakePlaneGeometry,
      MeshStandardMaterial: FakeMaterial,
      MeshBasicMaterial: FakeMaterial,
      Mesh: FakeMesh,
      Raycaster: class {},
      WebGLRenderer: class {},
      PerspectiveCamera: class {},
      DoubleSide: 'DoubleSide',
    };
    let adapter = createXRThreePanelSceneAdapter({ THREE });
    adapter.setScene({
      panels: [
        { id: 'chat', size: [1.2, 0.7], position: [0, 1.3, -1.8] },
      ],
    });
    let mesh = adapter.getPanelMesh('chat');
    let visuals = mesh.userData.panelFrameVisuals;

    assert.equal(visuals.ok, true);
    assert.equal(visuals.panelId, 'chat');
    assert.equal(visuals.header, true);
    assert.equal(visuals.resizeHandles, 8);
    assert.equal(visuals.actionSlots, 3);
    assert.equal(visuals.objectCount, 12);
    assert.equal(mesh.children.length, 12);
    assert.ok(mesh.children.some((object) => object.userData.operation === 'move'));
    assert.ok(mesh.children.some((object) => object.userData.handle === 'east'));
    assert.ok(mesh.children.some((object) => object.userData.action === 'close'));
    assert.equal(adapter.getState().panelFrameVisualCount, 12);
  });

  it('applies provider-owned Three material states from session diagnostics', () => {
    let calls = [];
    let frameCalls = [];
    let meshes = [
      {
        userData: {
          panelId: 'chat',
          baseColor: 0x111111,
          panelFrameVisuals: {
            objects: [
              {
                userData: {
                  snPanelFrameVisual: true,
                  baseColor: 'var(--sn-xr-panel-border)',
                  baseOpacity: 0.32,
                },
                material: {
                  opacity: 0.32,
                  color: {
                    setStyle(value) {
                      frameCalls.push(['chat-frame', 'setStyle', value]);
                    },
                  },
                },
              },
            ],
          },
        },
        material: {
          color: {
            setStyle(value) {
              calls.push(['chat', 'setStyle', value]);
            },
          },
        },
      },
      {
        userData: {
          panelId: 'runtime',
          panel: { material: { backgroundColor: 'var(--sn-panel-bg)' } },
        },
        material: {
          color: {
            setStyle(value) {
              calls.push(['runtime', 'setStyle', value]);
            },
          },
        },
      },
    ];

    let summary = updateXRThreePanelMaterialStates({
      meshes,
      sessionState: {
        hover: { panelId: 'runtime' },
        selectedPanelId: 'chat',
      },
      themeSnapshot: {
        material: {
          pointer: 'var(--sn-node-selected)',
          border: 'var(--sn-node-border)',
          background: 'var(--sn-panel-bg)',
        },
      },
    });

    assert.equal(summary.version, 'xr-three-panel-material-state-v1');
    assert.equal(summary.panelCount, 2);
    assert.deepEqual(summary.panels.map((panel) => [panel.panelId, panel.state, panel.applied]), [
      ['chat', 'selected', true],
      ['runtime', 'hover', true],
    ]);
    assert.deepEqual(calls, [
      ['chat', 'setStyle', 'var(--sn-node-selected)'],
      ['runtime', 'setStyle', 'var(--sn-node-border)'],
    ]);
    assert.deepEqual(frameCalls, [
      ['chat-frame', 'setStyle', 'var(--sn-node-selected)'],
    ]);
    assert.equal(meshes[0].userData.panelFrameVisuals.objects[0].material.opacity, 0.54);
    assert.equal(summary.panels[0].frameVisuals.updated, 1);
    assert.equal(summary.panels[1].frameVisuals.count, 0);
    assert.equal(meshes[0].material.needsUpdate, true);
    assert.equal(meshes[1].material.needsUpdate, true);
  });

  it('normalizes Three controller ray-plane drag as provider data', () => {
    class Vector3 {
      constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
      }
      copy(value) {
        this.x = value.x;
        this.y = value.y;
        this.z = value.z;
        return this;
      }
      sub(value) {
        this.x -= value.x;
        this.y -= value.y;
        this.z -= value.z;
        return this;
      }
      add(value) {
        this.x += value.x;
        this.y += value.y;
        this.z += value.z;
        return this;
      }
      normalize() { return this; }
      clone() { return new Vector3(this.x, this.y, this.z); }
      applyQuaternion() { return this; }
    }
    class Plane {
      setFromNormalAndCoplanarPoint(normal, point) {
        this.normal = normal.clone();
        this.point = point.clone();
      }
      clone() {
        let plane = new Plane();
        plane.normal = this.normal;
        plane.point = this.point;
        return plane;
      }
    }
    class Raycaster {
      constructor() {
        this.ray = {
          intersectPlane(plane, target) {
            target.copy(plane.point);
            return target;
          },
        };
      }
      setFromXRController() {}
      intersectObjects(meshes) {
        return meshes.length ? [{ object: meshes[0] }] : [];
      }
    }
    let THREE = { Vector3, Plane, Quaternion: class {}, Raycaster };
    let mesh = {
      userData: { panelId: 'graph' },
      position: new Vector3(0, 1, -2),
      quaternion: { clone() { return 'rotation'; }, copy(value) { this.value = value; } },
    };
    let controller = {};
    let camera = {
      getWorldPosition(target) {
        target.x = 0;
        target.y = 1.6;
        target.z = 0;
      },
    };
    let adapter = createXRThreeControllerRayAdapter({ THREE });

    assert.equal(adapter.getHits(controller, [mesh])[0].object, mesh);
    assert.deepEqual(adapter.beginDrag(controller, mesh, camera), {
      ok: true,
      panelId: 'graph',
      frameTarget: null,
      dragModel: 'controller-ray-plane',
    });
    assert.equal(adapter.updateDrag(controller).ok, true);
    assert.equal(adapter.getState().dragging, true);
    assert.equal(adapter.getDiagnostics().version, 'xr-three-controller-diagnostics-v1');
    assert.equal(adapter.getDiagnostics().raySource, 'setFromXRController');
    assert.equal(adapter.getDiagnostics().lastHit.panelId, 'graph');
    assert.equal(adapter.getDiagnostics().drag.panelId, 'graph');
    assert.equal(adapter.getDiagnostics().drag.model, 'controller-ray-plane');
    assert.equal(adapter.getDiagnostics().drag.response.smoothing, 0.72);
    assert.equal(adapter.getDiagnostics().drag.response.deadzone, 0.0015);
    assert.equal(adapter.getDiagnostics().counters.dragStarts, 1);
    assert.equal(adapter.getDiagnostics().counters.dragUpdates, 1);
    let end = adapter.endDrag();
    assert.equal(end.ok, true);
    assert.equal(end.panelId, 'graph');
    assert.equal(end.frameTarget, null);
    assert.deepEqual(end.pose.position, { x: 0, y: 1, z: -2 });
    assert.equal(adapter.getDiagnostics().drag.active, false);
    assert.deepEqual(adapter.getHits(controller, []), []);
    assert.equal(adapter.getDiagnostics().lastMissReason, 'no-panel-hit');
    assert.equal(adapter.getDiagnostics().lastHit, null);
    assert.equal(adapter.getDiagnostics().counters.misses, 1);
  });

  it('attaches provider XR panel frame targets to Three controller hits', () => {
    class Raycaster {
      setFromXRController() {}
      intersectObjects(meshes) {
        return [{
          object: meshes[0],
          distance: 1.4,
          point: { x: 0, y: 1.2, z: -1.6 },
          uv: { x: 0.4, y: 0.93 },
        }];
      }
    }
    let mesh = {
      userData: {
        panelId: 'chat',
        panelFrame: createXRPanelFrame({ id: 'chat', component: 'sn-chat' }),
      },
    };
    let adapter = createXRThreeControllerRayAdapter({
      THREE: { Raycaster },
    });
    let hit = adapter.getHits({}, [mesh])[0];
    let diagnostics = adapter.getDiagnostics();

    assert.equal(hit.frameTarget.operation, 'move');
    assert.equal(hit.frameTarget.zone, 'move');
    assert.equal(mesh.userData.lastFrameTarget.operation, 'move');
    assert.equal(diagnostics.lastHit.panelId, 'chat');
    assert.equal(diagnostics.lastHit.frameTarget.operation, 'move');
    assert.equal(diagnostics.lastHit.frameTarget.panelId, 'chat');
  });

  it('filters Three controller drag response without leaking Three objects', () => {
    class Vector3 {
      constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
      }
      copy(value) {
        this.x = value.x;
        this.y = value.y;
        this.z = value.z;
        return this;
      }
      sub(value) {
        this.x -= value.x;
        this.y -= value.y;
        this.z -= value.z;
        return this;
      }
      add(value) {
        this.x += value.x;
        this.y += value.y;
        this.z += value.z;
        return this;
      }
      normalize() { return this; }
      clone() { return new Vector3(this.x, this.y, this.z); }
      applyQuaternion() { return this; }
    }
    class Plane {
      setFromNormalAndCoplanarPoint(normal, point) {
        this.normal = normal.clone();
        this.point = point.clone();
      }
      clone() {
        let plane = new Plane();
        plane.normal = this.normal;
        plane.point = this.point;
        return plane;
      }
    }
    let rayPoint = new Vector3(0, 1, -2);
    class Raycaster {
      constructor() {
        this.ray = {
          intersectPlane: (plane, target) => {
            target.copy(rayPoint);
            return target;
          },
        };
      }
      setFromXRController() {}
    }
    let THREE = { Vector3, Plane, Quaternion: class {}, Raycaster };
    let mesh = {
      userData: { panelId: 'graph' },
      position: new Vector3(0, 1, -2),
      quaternion: { clone() { return 'rotation'; }, copy(value) { this.value = value; } },
    };
    let camera = {
      getWorldPosition(target) {
        target.x = 0;
        target.y = 1.6;
        target.z = 0;
      },
    };
    let adapter = createXRThreeControllerRayAdapter({
      THREE,
      dragResponse: { smoothing: 0.5, deadzone: 0, maxStep: 0.04 },
    });

    assert.equal(adapter.beginDrag({}, mesh, camera).ok, true);
    rayPoint = new Vector3(0.2, 1, -2);
    assert.equal(adapter.updateDrag({}).ok, true);

    let drag = adapter.getDiagnostics().drag;
    assert.equal(drag.response.smoothing, 0.5);
    assert.equal(drag.response.maxStep, 0.04);
    assert.equal(drag.response.clamped, true);
    assert.equal(Math.round(drag.response.rawDistance * 100), 20);
    assert.equal(Math.round(drag.response.appliedDistance * 100), 4);
    assert.equal(Math.round(mesh.position.x * 100), 4);
  });

  it('resizes Three panels from provider frame resize targets', () => {
    class Vector3 {
      constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
      }
      copy(value) {
        this.x = value.x;
        this.y = value.y;
        this.z = value.z;
        return this;
      }
      sub(value) {
        this.x -= value.x;
        this.y -= value.y;
        this.z -= value.z;
        return this;
      }
      add(value) {
        this.x += value.x;
        this.y += value.y;
        this.z += value.z;
        return this;
      }
      normalize() { return this; }
      clone() { return new Vector3(this.x, this.y, this.z); }
      applyQuaternion() { return this; }
    }
    class Plane {
      setFromNormalAndCoplanarPoint(normal, point) {
        this.normal = normal.clone();
        this.point = point.clone();
      }
      clone() {
        let plane = new Plane();
        plane.normal = this.normal;
        plane.point = this.point;
        return plane;
      }
    }
    let rayPoint = new Vector3(0, 1, -2);
    class Raycaster {
      constructor() {
        this.ray = {
          intersectPlane: (plane, target) => {
            target.copy(rayPoint);
            return target;
          },
        };
      }
      setFromXRController() {}
    }
    let THREE = { Vector3, Plane, Quaternion: class {}, Raycaster };
    let mesh = {
      userData: {
        panelId: 'chat',
        lastFrameTarget: { panelId: 'chat', operation: 'resize', zone: 'resize', handle: 'east' },
        panel: { size: [1.2, 0.7] },
      },
      geometry: { parameters: { width: 1.2, height: 0.7 } },
      position: new Vector3(0, 1, -2),
      rotation: { x: 0, y: 0, z: 0 },
      quaternion: { clone() { return 'rotation'; }, copy(value) { this.value = value; } },
      scale: {
        x: 1,
        y: 1,
        z: 1,
        set(x, y, z) {
          this.x = x;
          this.y = y;
          this.z = z;
        },
      },
    };
    let camera = {
      getWorldPosition(target) {
        target.x = 0;
        target.y = 1.6;
        target.z = 0;
      },
    };
    let adapter = createXRThreeControllerRayAdapter({ THREE });

    assert.equal(adapter.beginDrag({}, mesh, camera).ok, true);
    rayPoint = new Vector3(0.4, 1, -2);
    assert.equal(adapter.updateDrag({}).ok, true);
    let drag = adapter.getDiagnostics().drag;
    let end = adapter.endDrag();

    assert.equal(drag.resize.operation, 'resize');
    assert.equal(drag.resize.handle, 'east');
    assert.deepEqual(drag.size, [1.6, 0.7]);
    assert.equal(Math.round(mesh.scale.x * 100), 133);
    assert.equal(Math.round(mesh.position.x * 100), 20);
    assert.deepEqual(end.pose.size, [1.6, 0.7]);
  });

  it('reports Three controller ray misses without leaking Three objects', () => {
    class Raycaster {
      constructor() {
        this.ray = {
          intersectPlane() {
            return null;
          },
        };
      }
      set() {}
      intersectObjects() {
        return [];
      }
    }
    let THREE = {
      Vector3: class {},
      Plane: class {},
      Quaternion: class {},
      Raycaster,
    };
    let adapter = createXRThreeControllerRayAdapter({ THREE });

    assert.deepEqual(adapter.getHits({}, []), []);
    assert.equal(adapter.getDiagnostics().lastMissReason, 'missing-controller-transform');
    assert.equal(adapter.getDiagnostics().lastHit, null);
    assert.equal(adapter.getDiagnostics().counters.misses, 1);
  });

  it('creates a Three WebXR adapter without importing Three from the provider', async () => {
    let setSessionCalled = false;
    class FakeRenderer {
      constructor() {
        this.xr = {
          enabled: false,
          setReferenceSpaceType(type) { this.referenceSpaceType = type; },
          async setSession(session) {
            setSessionCalled = session.id === 'session';
          },
        };
      }
    }
    class FakeCamera {
      constructor(fov, aspect, near, far) {
        this.args = [fov, aspect, near, far];
        this.position = { fromArray(values) { this.values = values; } };
      }
    }
    let THREE = {
      Scene: class { add() {} remove() {} },
      PerspectiveCamera: FakeCamera,
      WebGLRenderer: FakeRenderer,
      PlaneGeometry: class {},
      MeshStandardMaterial: class {},
      Mesh: class {
        constructor() {
          this.userData = {};
          this.position = { fromArray() {} };
          this.rotation = { set() {} };
        }
      },
      Raycaster: class {},
      DoubleSide: 'DoubleSide',
    };
    let adapter = createXRThreeWebXRAdapter({ THREE });
    let renderer = adapter.createRenderer();
    let camera = adapter.createCamera({ aspect: 1.5 });
    let session = await adapter.setSession({ id: 'session' }, { referenceSpaceType: 'local-floor' });

    assert.equal(renderer.ok, true);
    assert.equal(renderer.renderer.xr.enabled, true);
    assert.equal(camera.camera.args[1], 1.5);
    assert.equal(session.ok, true);
    assert.equal(setSessionCalled, true);
    assert.equal(adapter.getDiagnostics().controller.version, 'xr-three-controller-diagnostics-v1');
  });

  it('exposes strict texture diagnostic panels through the Three WebXR adapter state', () => {
    class FakeMesh {
      constructor() {
        this.userData = {};
        this.visible = true;
        this.position = { fromArray() {} };
        this.rotation = { set() {} };
      }
    }
    let THREE = {
      Scene: class { add() {} remove() {} },
      PerspectiveCamera: class {},
      WebGLRenderer: class {},
      PlaneGeometry: class {},
      MeshStandardMaterial: class {},
      Mesh: FakeMesh,
      Raycaster: class {},
      DoubleSide: 'DoubleSide',
    };
    let textureBridge = createXRThreePanelTextureBridge({
      requireTextureUpload: true,
      htmlCanvasRenderer: {
        preparePanel() {
          return { prepared: true, panelId: 'chat', mode: 'unsupported', supported: false, reason: 'html-in-canvas-unsupported' };
        },
        getSupport() {
          return {
            supported: false,
            diagnostics: {
              supported: false,
              missing: ['layoutsubtree'],
              blockingMissing: ['layoutsubtree'],
            },
          };
        },
      },
      getPanelElement() {
        return { id: 'chat-element' };
      },
    });
    let adapter = createXRThreeWebXRAdapter({ THREE });
    adapter.setScene({
      panels: [
        { id: 'chat', size: [1.2, 0.7], position: [0, 1.3, -1.8], rotation: [0, 12, 0] },
      ],
    }, {
      textureBridge,
      textureOptions: { requireTextureUpload: true },
      hideStrictTextureFailures: true,
    });

    let state = adapter.getState();
    assert.equal(state.renderedPanelCount, 1);
    assert.equal(state.hiddenPanelCount, 0);
    assert.deepEqual(state.hiddenPanelIds, []);
    assert.equal(state.diagnosticPanelCount, 1);
    assert.deepEqual(state.diagnosticPanelIds, ['chat']);
    assert.equal(state.textureSources[0].hidden, false);
    assert.equal(state.textureSources[0].diagnostic, true);
  });

  it('adds provider-owned controller ray visuals when Three supplies line primitives', () => {
    let added = [];
    class BufferGeometry {
      setAttribute(name, value) {
        this.attributes ||= {};
        this.attributes[name] = value;
      }
    }
    class Float32BufferAttribute {
      constructor(values, itemSize) {
        this.values = values;
        this.itemSize = itemSize;
      }
    }
    class LineBasicMaterial {
      constructor(options) {
        this.options = options;
      }
    }
    class Line {
      constructor(geometry, material) {
        this.geometry = geometry;
        this.material = material;
        this.userData = {};
      }
    }
    let THREE = {
      Scene: class {},
      PerspectiveCamera: class {},
      WebGLRenderer: class {},
      PlaneGeometry: class {},
      MeshStandardMaterial: class {},
      Mesh: class {},
      Raycaster: class {},
      BufferGeometry,
      Float32BufferAttribute,
      LineBasicMaterial,
      Line,
    };
    let adapter = createXRThreeWebXRAdapter({ THREE });
    let result = adapter.createControllerRayVisual({
      add(object) {
        added.push(object);
      },
    }, {
      length: 2.4,
      color: 0x99ccff,
      opacity: 0.7,
    });

    assert.equal(result.ok, true);
    assert.equal(result.type, 'controller-ray');
    assert.equal(result.length, 2.4);
    assert.equal(added.length, 1);
    assert.equal(added[0].name, 'sn-xr-controller-ray');
    assert.equal(added[0].userData.snControllerRay, true);
    assert.deepEqual(added[0].geometry.attributes.position.values, [0, 0, 0, 0, 0, -2.4]);
    assert.equal(added[0].material.options.opacity, 0.7);
  });

  it('adds and updates provider-owned panel hit reticles when Three supplies mesh primitives', () => {
    let added = [];
    class RingGeometry {
      constructor(innerRadius, outerRadius, segments) {
        this.innerRadius = innerRadius;
        this.outerRadius = outerRadius;
        this.segments = segments;
      }
    }
    class MeshBasicMaterial {
      constructor(options) {
        this.options = options;
      }
    }
    class Mesh {
      constructor(geometry, material) {
        this.geometry = geometry;
        this.material = material;
        this.userData = {};
        this.position = { copy(value) { this.value = value; } };
        this.quaternion = { copy(value) { this.value = value; } };
      }
    }
    let THREE = {
      Scene: class {},
      PerspectiveCamera: class {},
      WebGLRenderer: class {},
      PlaneGeometry: class {},
      MeshStandardMaterial: class {},
      Mesh,
      Raycaster: class {},
      RingGeometry,
      MeshBasicMaterial,
      DoubleSide: 'DoubleSide',
    };
    let adapter = createXRThreeWebXRAdapter({ THREE });
    let visual = adapter.createPanelHitReticleVisual({
      add(object) {
        added.push(object);
      },
    }, {
      innerRadius: 0.02,
      outerRadius: 0.04,
    });
    let hit = {
      distance: 1.4,
      point: { x: 0.1, y: 1.2, z: -1.6 },
      object: {
        userData: { panelId: 'front' },
        quaternion: { id: 'panel-rotation' },
      },
    };
    let shown = adapter.updatePanelHitReticleVisual(visual, hit);
    let hidden = adapter.updatePanelHitReticleVisual(visual, null);

    assert.equal(visual.ok, true);
    assert.equal(visual.type, 'panel-hit-reticle');
    assert.equal(added.length, 1);
    assert.equal(added[0].name, 'sn-xr-panel-hit-reticle');
    assert.equal(added[0].userData.snPanelHitReticle, true);
    assert.equal(added[0].geometry.innerRadius, 0.02);
    assert.equal(shown.visible, true);
    assert.equal(shown.panelId, 'front');
    assert.deepEqual(shown.point, { x: 0.1, y: 1.2, z: -1.6 });
    assert.equal(added[0].position.value, hit.point);
    assert.equal(added[0].quaternion.value, hit.object.quaternion);
    assert.equal(hidden.visible, false);
    assert.equal(added[0].visible, false);
  });

  it('creates and resizes a provider-owned Three render host from host bounds', () => {
    let appended = [];
    let sceneAdded = [];
    class FakeRenderer {
      constructor() {
        this.xr = { enabled: false };
        this.domElement = {};
        this.sizes = [];
        this.pixelRatios = [];
        this.renders = 0;
        this.loop = undefined;
      }
      setPixelRatio(value) {
        this.pixelRatio = value;
        this.pixelRatios.push(value);
      }
      setSize(width, height, updateStyle) {
        this.sizes.push({ width, height, updateStyle });
      }
      setAnimationLoop(loop) {
        this.loop = loop;
      }
      render() {
        this.renders += 1;
      }
    }
    class FakeCamera {
      constructor(fov, aspect) {
        this.aspect = aspect;
        this.position = { fromArray(values) { this.values = values; } };
        this.updates = 0;
      }
      updateProjectionMatrix() {
        this.updates += 1;
      }
    }
    class FakeScene {
      constructor() {
        this.userData = {};
      }
      add(item) {
        sceneAdded.push(item);
      }
      remove() {}
    }
    let THREE = {
      Scene: FakeScene,
      PerspectiveCamera: FakeCamera,
      WebGLRenderer: FakeRenderer,
      PlaneGeometry: class {},
      MeshStandardMaterial: class {},
      Mesh: class {
        constructor() {
          this.userData = {};
          this.position = { fromArray() {} };
          this.rotation = { set() {} };
        }
      },
      Raycaster: class {},
      Color: class {
        constructor(value) {
          this.value = value;
        }
      },
      HemisphereLight: class {
        constructor(skyColor, groundColor, intensity) {
          this.skyColor = skyColor;
          this.groundColor = groundColor;
          this.intensity = intensity;
        }
      },
      DoubleSide: 'DoubleSide',
    };
    let adapter = createXRThreeWebXRAdapter({ THREE });
    let host = createXRThreeRenderHost({
      THREE,
      adapter,
      hostElement: { append(node) { appended.push(node); } },
      stageElement: { getBoundingClientRect: () => ({ width: 800.4, height: 400.2 }) },
      pixelRatio: 3,
      maxPixelRatio: 2,
      className: 'xr-canvas',
    });

    let first = host.ensureTarget({ scene: { panels: [] } });
    let second = host.resize({
      scene: { panels: [] },
      bounds: { width: 1200, height: 600 },
      pixelRatio: 1.5,
    });

    assert.equal(first.ok, true);
    assert.equal(first.renderer.xr.enabled, true);
    assert.equal(first.renderer.domElement.className, 'xr-canvas');
    assert.equal(appended.length, 1);
    assert.deepEqual(first.renderer.pixelRatios, [2, 1.5]);
    assert.deepEqual(first.renderer.sizes[0], { width: 800, height: 400, updateStyle: false });
    assert.deepEqual(first.renderer.sizes[1], { width: 1200, height: 600, updateStyle: false });
    assert.equal(first.camera.aspect, 2);
    assert.equal(second.camera, first.camera);
    assert.equal(second.camera.updates, 1);
    assert.equal(first.scene.background.value, 0x11151d);
    assert.equal(sceneAdded.length, 1);
    assert.equal(first.scene.userData.snSpatialDecorated, true);
    assert.equal(second.renderer, first.renderer);
    assert.equal(host.getDiagnostics().version, 'xr-three-render-host-v1');
    assert.equal(host.getDiagnostics().renderer, true);
    assert.equal(host.getDiagnostics().camera, true);
    assert.equal(host.getDiagnostics().scene, true);
    assert.equal(host.getDiagnostics().decorated, true);
    assert.equal(host.getDiagnostics().width, 1200);
    assert.equal(host.getDiagnostics().height, 600);
    assert.equal(host.getDiagnostics().pixelRatio, 1.5);
    assert.equal(host.getDiagnostics().lastError, null);

    let frameTimes = [];
    let loop = host.startLoop({
      target: first,
      onFrame({ time }) {
        frameTimes.push(time);
      },
    });
    assert.equal(loop.ok, true);
    first.renderer.loop(123, { id: 'frame' });
    assert.deepEqual(frameTimes, [123]);
    assert.equal(first.renderer.renders, 1);
    assert.equal(host.getDiagnostics().loopRunning, true);
    assert.equal(host.getDiagnostics().frames, 1);
    assert.deepEqual(host.stopLoop({ renderer: first.renderer }), {
      ok: true,
      version: 'xr-three-render-loop-v1',
    });
    assert.equal(first.renderer.loop, null);
    assert.equal(host.getDiagnostics().loopRunning, false);
  });

  it('reports structured Three render host errors for incomplete host APIs', () => {
    let host = createXRThreeRenderHost({
      THREE: {
        Scene: class {},
      },
    });

    let result = host.ensureTarget({ scene: { panels: [] } });

    assert.equal(result.ok, false);
    assert.equal(result.reason, 'missing-three-api');
    assert.ok(result.missing.includes('WebGLRenderer'));
    assert.equal(host.getDiagnostics().lastError, 'missing-three-api');
  });

  it('runs Three WebXR sessions and controller events through provider-owned glue', async () => {
    let requested = null;
    let setSessionCalled = false;
    let setSessionOptions = null;
    let loop = null;
    let events = [];
    let addedControllers = [];
    let rendered = 0;
    let onFrameCalls = 0;
    let dragUpdates = 0;
    let dragEnded = 0;
    let session = {
      id: 'session',
      visibilityState: 'visible',
      environmentBlendMode: 'opaque',
      interactionMode: 'world-space',
      enabledFeatures: ['local-floor', 'dom-overlay'],
      inputSources: [
        { handedness: 'right', targetRayMode: 'tracked-pointer', profiles: ['oculus-touch-v3'] },
      ],
      addEventListener(type, handler) {
        if (type === 'end') this.endHandler = handler;
      },
      async end() {
        this.endHandler?.();
      },
    };
    let target = {
      navigator: {
        xr: {
          async requestSession(mode, options) {
            requested = { mode, options };
            return session;
          },
        },
      },
    };
    let controller = {
      listeners: {},
      addEventListener(type, handler) {
        this.listeners[type] = handler;
      },
    };
    let renderer = {
      xr: {
        enabled: true,
        getController(index) {
          return index === 0 ? controller : { addEventListener() {} };
        },
        setReferenceSpaceType(type) {
          this.referenceSpaceType = type;
        },
        async setSession(received) {
          setSessionCalled = received === session;
        },
      },
      setAnimationLoop(callback) {
        loop = callback;
      },
      render() {
        rendered += 1;
      },
    };
    let mesh = { userData: { panelId: 'graph' } };
    let adapter = {
      name: 'three-webxr',
      async setSession(received, options) {
        setSessionOptions = options;
        await renderer.xr.setSession(received);
        return { ok: true, session: received };
      },
      listPanelMeshes() {
        return [mesh];
      },
      controllerRays: {
        getHits() {
          return [{
            object: mesh,
            frameTarget: { panelId: 'graph', operation: 'move', zone: 'move' },
          }];
        },
        beginDrag() {
          return { ok: true };
        },
        endDrag() {
          dragEnded += 1;
        },
        updateDrag() {
          dragUpdates += 1;
          return { ok: true };
        },
        getState() {
          return { dragging: true };
        },
      },
      getDiagnostics() {
        return {
          panelCount: 1,
          panelFrameVisualCount: 12,
          textureSources: [
            {
              panelId: 'graph',
              textureQuality: {
                status: 'low',
                warnings: ['texture-density-low'],
                recommendations: ['increase-texture-resolution'],
                texturePixels: { width: 640, height: 360 },
                pixelsPerMeter: { min: 420 },
              },
            },
          ],
        };
      },
    };
    let scene = {
      add(item) {
        addedControllers.push(item);
      },
    };
    let controllerApi = createXRThreeSessionController({
      globalThis: target,
      adapter,
      onFrame() {
        onFrameCalls += 1;
      },
      onDiagnostic(event) {
        events.push(event);
      },
    });

    let result = await controllerApi.start('immersive-vr', {
      target: { ok: true, renderer, scene, camera: {} },
      domOverlayRoot: {},
      referenceSpaceType: 'local-floor',
    });
    controller.listeners.selectstart();
    loop?.();
    controller.listeners.selectend();
    let runningDiagnostics = controllerApi.getDiagnostics();
    await controllerApi.stop();

    assert.equal(result.ok, true);
    assert.equal(result.handled, true);
    assert.equal(requested.mode, 'immersive-vr');
    assert.equal(requested.options.domOverlay.root instanceof Object, true);
    assert.equal('domOverlayRoot' in requested.options, false);
    assert.equal(requested.options.optionalFeatures.includes(WEBXR_FEATURES.domOverlay), true);
    assert.equal(setSessionOptions.referenceSpaceType, WEBXR_FEATURES.localFloor);
    assert.equal(setSessionOptions.optionalFeatures.includes(WEBXR_FEATURES.domOverlay), true);
    assert.equal('domOverlayRoot' in setSessionOptions, false);
    assert.equal(setSessionCalled, true);
    assert.equal(addedControllers.length, 2);
    assert.ok(events.includes('spatial-three-session-start-requested'));
    assert.ok(events.includes('spatial-three-session-started'));
    assert.ok(events.includes('spatial-three-drag-start'));
    assert.ok(events.includes('spatial-three-drag-end'));
    assert.ok(events.includes('spatial-three-session-ended'));
    assert.equal(dragUpdates, 1);
    assert.equal(dragEnded >= 1, true);
    assert.equal(onFrameCalls, 1);
    assert.equal(rendered, 1);
    assert.equal(runningDiagnostics.status, 'running');
    assert.equal(runningDiagnostics.mode, 'immersive-vr');
    assert.equal(runningDiagnostics.controllers, 2);
    assert.equal(runningDiagnostics.selectedPanelId, 'graph');
    assert.equal(runningDiagnostics.draggingPanelId, null);
    assert.equal(runningDiagnostics.interactionEvents, 2);
    assert.equal(runningDiagnostics.hover.panelId, 'graph');
    assert.equal(runningDiagnostics.frames, 1);
    assert.equal(runningDiagnostics.active, true);
    assert.equal(runningDiagnostics.visibilityState, 'visible');
    assert.equal(runningDiagnostics.environmentBlendMode, 'opaque');
    assert.equal(runningDiagnostics.interactionMode, 'world-space');
    assert.deepEqual(runningDiagnostics.enabledFeatures, ['local-floor', 'dom-overlay']);
    assert.equal(runningDiagnostics.inputSources[0].targetRayMode, 'tracked-pointer');
    assert.equal(runningDiagnostics.requestedReferenceSpaceType, WEBXR_FEATURES.localFloor);
    assert.equal(runningDiagnostics.requestedOptionalFeatures.includes(WEBXR_FEATURES.domOverlay), true);
    assert.deepEqual(runningDiagnostics.requestedRequiredFeatures, []);
    assert.equal(runningDiagnostics.requestedDomOverlay, true);
    let telemetry = createXRThreeSessionTelemetrySnapshot(runningDiagnostics, { now: 1234 });
    assert.equal(telemetry.version, 'xr-three-session-telemetry-v1');
    assert.equal(telemetry.timestamp, 1234);
    assert.equal(telemetry.status, 'running');
    assert.equal(telemetry.mode, 'immersive-vr');
    assert.equal(telemetry.active, true);
    assert.equal(telemetry.visibilityState, 'visible');
    assert.equal(telemetry.environmentBlendMode, 'opaque');
    assert.equal(telemetry.interactionMode, 'world-space');
    assert.deepEqual(telemetry.enabledFeatures, ['local-floor', 'dom-overlay']);
    assert.equal(telemetry.inputSources[0].profiles[0], 'oculus-touch-v3');
    assert.equal(telemetry.sessionOptions.referenceSpaceType, WEBXR_FEATURES.localFloor);
    assert.equal(telemetry.sessionOptions.optionalFeatures.includes(WEBXR_FEATURES.domOverlay), true);
    assert.deepEqual(telemetry.sessionOptions.requiredFeatures, []);
    assert.equal(telemetry.sessionOptions.domOverlay, true);
    assert.equal(telemetry.frames, 1);
    assert.equal(telemetry.controllers, 2);
    assert.equal(telemetry.selectedPanelId, 'graph');
    assert.equal(telemetry.draggingPanelId, null);
    assert.equal(telemetry.hover.panelId, 'graph');
    assert.equal(telemetry.hover.reticleVisible, false);
    assert.equal(telemetry.interactionEvents, 2);
    assert.equal(telemetry.panelCount, 1);
    assert.equal(telemetry.panelFrameVisuals, 12);
    assert.equal(telemetry.textureQuality.total, 1);
    assert.equal(telemetry.textureQuality.low, 1);
    assert.equal(telemetry.textureQuality.warningCount, 1);
    assert.equal(telemetry.textureQuality.recommendationCount, 1);
    assert.deepEqual(telemetry.textureQuality.warnings, [{
      panelId: 'graph',
      code: 'texture-density-low',
    }]);
    assert.deepEqual(telemetry.textureQuality.recommendations, [{
      panelId: 'graph',
      code: 'increase-texture-resolution',
    }]);
    assert.equal(telemetry.textureQuality.primaryRecommendation, 'increase-texture-resolution');
    assert.deepEqual(telemetry.textureQuality.actions, [{
      code: 'increase-texture-resolution',
      count: 1,
      panelIds: ['graph'],
    }]);
    assert.equal(telemetry.drag.active, false);
    let health = createXRThreeSessionHealthSummary(telemetry, { fps: 72 });
    assert.equal(health.version, 'xr-three-session-health-v1');
    assert.equal(health.status, 'warning');
    assert.equal(health.checks.running, true);
    assert.equal(health.checks.controllers, 2);
    assert.equal(health.checks.panelCount, 1);
    assert.equal(health.checks.panelFrameVisuals, 12);
    assert.equal(health.checks.textureQuality.low, 1);
    assert.ok(health.issues.some((issue) => issue.code === 'texture-quality-low'));
    assert.ok(health.issues.some((issue) => issue.code === 'texture-quality-warnings'));
    assert.ok(health.issues.some((issue) => issue.code === 'no-controller-ray-visuals'));
    assert.equal(controllerApi.getDiagnostics().active, false);
    assert.equal(controllerApi.getDiagnostics().version, 'xr-three-session-controller-v1');
  });

  it('keeps Three content selection separate from frame drag gestures', async () => {
    let requested = null;
    let loop = null;
    let events = [];
    let dragStarts = 0;
    let dragEnds = 0;
    let session = {
      inputSources: [],
      addEventListener(type, handler) {
        if (type === 'end') this.endHandler = handler;
      },
      async end() {
        this.endHandler?.();
      },
    };
    let target = {
      navigator: {
        xr: {
          async requestSession(mode, options) {
            requested = { mode, options };
            return session;
          },
        },
      },
    };
    let controller = {
      listeners: {},
      addEventListener(type, handler) {
        this.listeners[type] = handler;
      },
    };
    let renderer = {
      xr: {
        enabled: true,
        getController(index) {
          return index === 0 ? controller : { addEventListener() {} };
        },
        setReferenceSpaceType() {},
        async setSession() {},
      },
      setAnimationLoop(callback) {
        loop = callback;
      },
      render() {},
    };
    let mesh = { userData: { panelId: 'chat' } };
    let adapter = {
      name: 'three-webxr',
      async setSession() {
        return { ok: true, session };
      },
      listPanelMeshes() {
        return [mesh];
      },
      controllerRays: {
        getHits() {
          return [{
            object: mesh,
            frameTarget: { panelId: 'chat', operation: 'content', zone: 'content' },
          }];
        },
        beginDrag() {
          dragStarts += 1;
          return { ok: true };
        },
        endDrag() {
          dragEnds += 1;
          return { ok: true };
        },
        updateDrag() {
          return { ok: true };
        },
        getState() {
          return { dragging: false };
        },
      },
      getDiagnostics() {
        return { panelCount: 1 };
      },
    };
    let controllerApi = createXRThreeSessionController({
      globalThis: target,
      adapter,
      onDiagnostic(event, details) {
        events.push({ event, details });
      },
    });

    let result = await controllerApi.start('immersive-vr', {
      target: { ok: true, renderer, scene: { add() {} }, camera: {} },
    });
    controller.listeners.selectstart();
    loop?.();
    controller.listeners.selectend();
    let diagnostics = controllerApi.getDiagnostics();
    await controllerApi.stop();

    assert.equal(result.ok, true);
    assert.equal(requested.mode, 'immersive-vr');
    assert.equal(dragStarts, 0);
    assert.equal(dragEnds, 0);
    assert.ok(events.some((item) => item.event === 'spatial-three-select'));
    assert.ok(events.some((item) => item.event === 'spatial-three-select-end'));
    assert.equal(events.some((item) => item.event === 'spatial-three-drag-start'), false);
    assert.equal(diagnostics.selectedPanelId, 'chat');
    assert.equal(diagnostics.draggingPanelId, null);
    assert.equal(diagnostics.interactionEvents, 2);
  });

  it('classifies Three WebXR session watchdog state without timers or DOM', () => {
    let starting = createXRThreeSessionWatchdogSummary({
      status: 'starting',
      active: false,
      frames: 0,
      mode: 'immersive-vr',
    }, { elapsedMs: 6000 });
    let noFrames = createXRThreeSessionWatchdogSummary({
      version: 'xr-three-session-telemetry-v1',
      status: 'running',
      active: true,
      frames: 0,
      mode: 'immersive-vr',
    }, { thresholdMs: 5000 });
    let ok = createXRThreeSessionWatchdogSummary({
      version: 'xr-three-session-telemetry-v1',
      status: 'running',
      active: true,
      frames: 3,
      mode: 'immersive-vr',
    });

    assert.equal(starting.version, 'xr-three-session-watchdog-v1');
    assert.equal(starting.status, 'waiting');
    assert.equal(starting.event, 'xr-three-session-still-starting');
    assert.equal(starting.reason, 'session-still-starting');
    assert.equal(starting.elapsedMs, 6000);
    assert.equal(noFrames.status, 'warning');
    assert.equal(noFrames.event, 'xr-three-session-no-frames');
    assert.equal(noFrames.reason, 'session-no-frames');
    assert.equal(noFrames.thresholdMs, 5000);
    assert.equal(ok.status, 'ok');
    assert.equal(ok.event, null);
    assert.equal(ok.frames, 3);

    let hostNamed = createXRThreeSessionWatchdogSummary({
      status: 'starting',
      active: false,
      frames: 0,
    }, { eventPrefix: 'three-panels-session' });
    assert.equal(hostNamed.event, 'three-panels-session-still-starting');
    assert.equal(hostNamed.eventPrefix, 'three-panels-session');
  });

  it('builds a standard Three WebXR diagnostic payload without server coupling', () => {
    let payload = createXRThreeDiagnosticPayload({
      clientId: 'client-1',
      event: 'three-panels-session-telemetry',
      pageUrl: 'https://example.test/demo?token=secret#agent-chat?session=abc&project=demo',
      secureContext: true,
      navigatorXr: true,
      support: {
        modes: { immersiveVr: true, immersiveAr: false },
        apis: { secureContext: true, navigatorXrAvailable: true, requestSessionAvailable: true },
      },
      launch: { canLaunch: true, mode: 'immersive-vr' },
      mode: 'immersive-vr',
      preferredMode: 'immersive-vr',
      sessionDiagnostics: {
        status: 'running',
        active: true,
        frames: 2,
        selectedPanelId: 'chat',
        hover: { panelId: 'chat', reticleVisible: true },
        adapter: { panelCount: 3 },
      },
      fps: 72,
      htmlCanvas: { supported: true, availability: 'texture-ready' },
      texture: { strict: true, blocked: false, ready: 3, total: 3 },
      sceneQuality: { status: 'ok', panelCount: 3 },
      visual: { version: 'xr-visual-test-summary-v1', status: 'pass' },
      visualReadiness: { version: 'xr-visual-agent-readiness-v1', status: 'pass', reason: 'ready' },
      interactionReadiness: { version: 'xr-three-interaction-readiness-v1', status: 'ready', reason: 'ready' },
      extra: { custom: 'value' },
    });

    assert.equal(payload.version, 'xr-three-diagnostic-payload-v1');
    assert.equal(payload.clientId, 'client-1');
    assert.equal(payload.event, 'three-panels-session-telemetry');
    assert.equal(payload.pageUrl.includes('secret'), false);
    assert.equal(payload.pageUrl.includes('abc'), false);
    assert.equal(payload.secureContext, true);
    assert.equal(payload.navigatorXr, true);
    assert.equal(payload.selectedPanel, 'chat');
    assert.equal(payload.hoveredPanel, 'chat');
    assert.equal(payload.session.version, 'xr-three-session-telemetry-v1');
    assert.equal(payload.session.health.version, 'xr-three-session-health-v1');
    assert.equal(payload.details.custom, 'value');
    assert.equal(payload.details.visual.version, 'xr-visual-test-summary-v1');
    assert.equal(payload.details.visualReadiness.version, 'xr-visual-agent-readiness-v1');
    assert.equal(payload.details.interactionReadiness.version, 'xr-three-interaction-readiness-v1');
    assert.equal(payload.details.readiness.version, 'xr-readiness-summary-v1');
    assert.equal(payload.details.launchGate.version, 'webxr-launch-gate-summary-v1');
  });

  it('normalizes Three WebXR diagnostic timelines as provider data', () => {
    let timeline = createXRThreeDiagnosticTimelineSummary([
      {
        event: 'three-panels-session-started',
        status: 'running',
        health: 'warning',
        mode: 'immersive-vr',
        htmlCanvasAvailability: 'texture-ready',
        sceneQualityStatus: 'ok',
        readinessStatus: 'ready',
        visualReadinessStatus: 'pass',
        interactionReadinessStatus: 'warning',
        textureMode: 'strict',
        textureStage: 'three-material-applied',
        textureResolverStage: 'three-canvas-texture-ready',
        launchGateReason: 'ready',
      },
      {
        event: 'three-panels-session error',
        error: 'NotSupportedError',
      },
    ]);

    assert.equal(timeline.version, 'xr-three-diagnostic-timeline-v1');
    assert.equal(timeline.count, 2);
    assert.equal(timeline.items[0].fields.status, 'running');
    assert.equal(timeline.items[0].fields.html, 'texture-ready');
    assert.equal(timeline.items[0].fields.visual, 'pass');
    assert.equal(timeline.items[0].fields.interaction, 'warning');
    assert.equal(timeline.items[0].fields.textureMode, 'strict');
    assert.equal(timeline.items[0].fields.resolver, 'three-canvas-texture-ready');
    assert.equal(timeline.items[0].text.includes('ready:ready'), true);
    assert.equal(timeline.items[1].event, 'three-panels-session-error');
    assert.equal(timeline.latest.fields.error, 'NotSupportedError');
    assert.equal(timeline.text.includes(' -> '), true);
    assert.equal(createXRThreeDiagnosticTimelineSummary([]).text, null);
  });

  it('normalizes Three WebXR server diagnostics without UI labels', () => {
    let summary = createXRThreeDiagnosticServerSummary({
      version: 'xr-diagnostics-summary-v1',
      clientCount: 2,
      immersiveClientCount: 1,
      htmlCanvas: { availability: 'texture-ready' },
      clients: [
        {
          clientId: 'desktop',
          eventCount: 1,
          recentEvents: [{ event: 'heartbeat' }],
        },
        {
          clientId: 'quest',
          eventCount: 3,
          phase: 'running',
          launchGate: { blocked: false, reason: 'ready' },
          session: {
            active: true,
            status: 'running',
            mode: 'immersive-vr',
            inputSources: [{ targetRayMode: 'tracked-pointer' }],
            health: { status: 'warning', checks: { fps: 72 } },
          },
          htmlCanvas: { availability: 'texture-ready' },
          visualReadiness: {
            status: 'pass',
            reason: 'ready',
            checks: [{ id: 'visual-status', status: 'pass' }],
          },
          interactionReadiness: {
            status: 'warning',
            reason: 'input-sources-present',
            issueCodes: ['input-sources-present'],
          },
          texture: {
            stage: 'three-material-applied',
            resolverStages: [{ panelId: 'chat', stage: 'three-canvas-texture-ready' }],
          },
          deepGraph: {
            nodeCount: 379,
            edgeCount: 304,
            focusNodeId: 'src/app.js',
          },
          deepGraphPreview: {
            summary: {
              status: 'limited',
              focus: {
                nodeId: 'src/app.js',
                visible: true,
                edges: { visible: 3, source: 5 },
              },
            },
          },
          recentEvents: [
            { event: 'three-panels-session-started', status: 'running' },
            { event: 'three-panels-session-telemetry', health: 'warning' },
          ],
        },
      ],
      latestClient: { clientId: 'desktop' },
      latestImmersiveClient: { clientId: 'quest', session: { health: { status: 'warning' } } },
    }, { clientId: 'quest' });

    assert.equal(summary.version, 'xr-three-diagnostic-server-summary-v1');
    assert.equal(summary.available, true);
    assert.equal(summary.summaryVersion, 'xr-diagnostics-summary-v1');
    assert.equal(summary.clientCount, 2);
    assert.equal(summary.immersiveClientCount, 1);
    assert.equal(summary.currentClient.clientId, 'quest');
    assert.equal(summary.latestClient.clientId, 'desktop');
    assert.equal(summary.latestImmersiveClient.clientId, 'quest');
    assert.equal(summary.currentRunning, true);
    assert.equal(summary.currentChecks.fps, 72);
    assert.equal(summary.currentHtmlCanvas.availability, 'texture-ready');
    assert.equal(summary.currentVisualReadiness.status, 'pass');
    assert.equal(summary.currentInteractionReadiness.reason, 'input-sources-present');
    assert.equal(summary.currentTexture.stage, 'three-material-applied');
    assert.equal(summary.currentTextureResolver.stage, 'three-canvas-texture-ready');
    assert.equal(summary.currentDeepGraph.nodeCount, 379);
    assert.equal(summary.currentDeepGraph.focusNodeId, 'src/app.js');
    assert.equal(summary.currentDeepGraphPreview.summary.status, 'limited');
    assert.equal(summary.currentDeepGraphPreview.summary.focus.edges.visible, 3);
    assert.equal(summary.currentTimeline.count, 2);
    assert.equal(summary.currentLastEventTimeline.latest.fields.health, 'warning');
    assert.equal(summary.inputSourcesText, 'tracked-pointer');
    assert.equal(summary.latestImmersiveHealth, 'warning');
    assert.equal(createXRThreeDiagnosticServerSummary(null).available, false);
  });

  it('classifies Three WebXR troubleshooting state without product UI labels', () => {
    let server = createXRThreeDiagnosticServerSummary({
      version: 'xr-diagnostics-summary-v1',
      clientCount: 1,
      immersiveClientCount: 1,
      clients: [
        {
          clientId: 'quest',
          stale: false,
          launchGate: { blocked: false },
          readiness: { status: 'ready' },
          session: {
            active: true,
            status: 'running',
            frames: 0,
            panelCount: 4,
            panelFrameVisuals: 0,
            controllers: 0,
            controllerRayVisuals: 0,
            hitReticleVisuals: 0,
            interactionEvents: 0,
          },
          texture: {
            blocked: true,
            reason: 'html-in-canvas-unsupported',
            stage: 'html-in-canvas-support',
            ready: 0,
            total: 4,
          },
          htmlCanvas: {
            textureUploadAvailable: false,
            availability: 'origin-trial-or-flag-required',
          },
          recentEvents: [{ event: 'three-panels-session-telemetry', status: 'running' }],
        },
      ],
    }, { clientId: 'quest' });
    let summary = createXRThreeTroubleshootingSummary(server);
    let missing = createXRThreeTroubleshootingSummary(null);

    assert.equal(summary.version, 'xr-three-troubleshooting-summary-v1');
    assert.equal(summary.status, 'blocked');
    assert.equal(summary.primaryIssue.code, 'no-xr-frames');
    assert.ok(summary.issueCodes.includes('texture-gate-blocked'));
    assert.ok(summary.issueCodes.includes('input-controllers-missing'));
    assert.ok(summary.issueCodes.includes('panel-frame-visuals-missing'));
    assert.equal(summary.frameCount, 0);
    assert.equal(summary.panelCount, 4);
    assert.equal(summary.textureReady, 0);
    assert.equal(summary.textureTotal, 4);
    assert.equal(missing.status, 'waiting');
    assert.equal(missing.primaryIssue.code, 'server-diagnostics-unavailable');
  });

  it('summarizes Three WebXR session health without renderer objects', () => {
    let blocked = createXRThreeSessionHealthSummary({
      version: 'xr-three-session-telemetry-v1',
      status: 'failed',
      active: false,
      frames: 0,
      controllers: 0,
      controllerRayVisuals: 0,
      hitReticleVisuals: 0,
      hover: null,
      lastError: 'NotSupportedError',
      panelCount: 0,
    });
    let warning = createXRThreeSessionHealthSummary({
      version: 'xr-three-session-telemetry-v1',
      status: 'running',
      active: true,
      frames: 0,
      controllers: 0,
      controllerRayVisuals: 0,
      hitReticleVisuals: 0,
      hover: null,
      lastError: null,
      panelCount: 3,
      panelFrameVisuals: 0,
    }, { fps: 24 });

    assert.equal(blocked.status, 'blocked');
    assert.equal(blocked.reason, 'session-error');
    assert.ok(blocked.issues.some((issue) => issue.code === 'session-failed'));
    assert.equal(warning.status, 'warning');
    assert.ok(warning.issues.some((issue) => issue.code === 'no-xr-frames'));
    assert.ok(warning.issues.some((issue) => issue.code === 'no-input-controllers'));
    assert.ok(warning.issues.some((issue) => issue.code === 'no-panel-frame-visuals'));
    assert.ok(warning.issues.some((issue) => issue.code === 'low-fps'));
    assert.equal(warning.checks.panelCount, 3);
  });

  it('summarizes Three WebXR interaction readiness without renderer objects', () => {
    let waiting = createXRThreeInteractionReadinessSummary({
      version: 'xr-three-session-telemetry-v1',
      status: 'idle',
      active: false,
      mode: null,
      frames: 0,
      controllers: 0,
      controllerRayVisuals: 0,
      hitReticleVisuals: 0,
      inputSources: [],
      hover: null,
      interactionEvents: 0,
      panelCount: 4,
      panelFrameVisuals: 48,
      drag: { active: false },
    }, {
      texture: { blocked: true, ready: 0, total: 4, reason: 'html-in-canvas-unsupported', stage: 'html-in-canvas-support' },
    });
    let ready = createXRThreeInteractionReadinessSummary({
      version: 'xr-three-session-telemetry-v1',
      status: 'running',
      active: true,
      mode: 'immersive-ar',
      frames: 12,
      controllers: 1,
      controllerRayVisuals: 1,
      hitReticleVisuals: 1,
      inputSources: [{ handedness: 'right', targetRayMode: 'tracked-pointer' }],
      hover: { panelId: 'front', frameTarget: { operation: 'move', zone: 'move' } },
      interactionEvents: 2,
      panelCount: 4,
      panelFrameVisuals: 48,
      drag: {
        active: true,
        panelId: 'front',
        frameTarget: { operation: 'resize', handle: 'east' },
        resize: { operation: 'resize', handle: 'east', size: [1.2, 0.7] },
        appliedDistance: 0.12,
        clamped: false,
        settled: true,
      },
    }, {
      texture: { blocked: false, ready: 4, total: 4 },
      requireInteractionEvent: true,
    });

    assert.equal(waiting.version, 'xr-three-interaction-readiness-v1');
    assert.equal(waiting.status, 'blocked');
    assert.equal(waiting.reason, 'texture-upload-ready');
    assert.ok(waiting.issueCodes.includes('session-active'));
    assert.ok(waiting.issueCodes.includes('texture-upload-ready'));
    assert.equal(ready.status, 'ready');
    assert.equal(ready.ready, true);
    assert.equal(ready.reason, 'ready');
    assert.equal(ready.frameTarget.operation, 'move');
    assert.equal(ready.dragging.resize.handle, 'east');
  });

  it('ends requested Three WebXR sessions when adapter binding fails', async () => {
    let ended = false;
    let session = {
      async end() {
        ended = true;
      },
    };
    let target = {
      navigator: {
        xr: {
          async requestSession() {
            return session;
          },
        },
      },
    };
    let controllerApi = createXRThreeSessionController({
      globalThis: target,
      adapter: {
        async setSession() {
          return { ok: false, reason: 'missing-three-webxr-manager' };
        },
        controllerRays: {
          endDrag() {},
          getState() {
            return { dragging: false };
          },
        },
        getDiagnostics() {
          return {};
        },
      },
    });

    let result = await controllerApi.start('immersive-vr', {
      target: { ok: true, renderer: { setAnimationLoop() {} }, scene: {}, camera: {} },
    });

    assert.equal(result.handled, true);
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'missing-three-webxr-manager');
    assert.equal(ended, true);
    assert.equal(controllerApi.getDiagnostics().status, 'failed');
    assert.equal(controllerApi.getDiagnostics().lastError, 'missing-three-webxr-manager');
    assert.equal(controllerApi.getDiagnostics().active, false);
  });

  it('builds Three WebXR session options as provider data', () => {
    let overlay = {};
    let vrOptions = createXRThreeSessionOptions('immersive-vr', {
      domOverlayRoot: overlay,
      includeLocalFeature: true,
    });
    let arOptions = createXRThreeSessionOptions('immersive-ar', {
      optionalFeatures: ['dom-overlay', 'dom-overlay', 'hit-test'],
      requiredFeatures: ['local', 'local'],
    });

    assert.equal(vrOptions.referenceSpaceType, WEBXR_FEATURES.localFloor);
    assert.equal(vrOptions.domOverlayRoot, overlay);
    assert.equal(vrOptions.optionalFeatures.includes(WEBXR_FEATURES.local), true);
    assert.equal(vrOptions.optionalFeatures.includes(WEBXR_FEATURES.localFloor), true);
    assert.equal(vrOptions.optionalFeatures.includes(WEBXR_FEATURES.boundedFloor), true);
    assert.equal(vrOptions.optionalFeatures.includes(WEBXR_FEATURES.domOverlay), true);
    assert.equal(arOptions.referenceSpaceType, WEBXR_FEATURES.localFloor);
    assert.deepEqual(arOptions.optionalFeatures, ['dom-overlay', 'hit-test']);
    assert.deepEqual(arOptions.requiredFeatures, ['local']);
  });

  it('negotiates default Three WebXR reference spaces per immersive mode', async () => {
    let requests = [];
    let adapterOptions = [];
    let target = {
      navigator: {
        xr: {
          async requestSession(mode, options) {
            requests.push({ mode, options });
            return { addEventListener() {} };
          },
        },
      },
    };
    let adapter = {
      async setSession(session, options) {
        adapterOptions.push(options);
        return { ok: true, session };
      },
      listPanelMeshes() {
        return [];
      },
      controllerRays: {
        endDrag() {},
        getState() {
          return { dragging: false };
        },
      },
      getDiagnostics() {
        return {};
      },
    };
    let controllerApi = createXRThreeSessionController({ globalThis: target, adapter });
    let targetRenderer = { ok: true, renderer: { setAnimationLoop() {} }, scene: {}, camera: {} };

    await controllerApi.start('immersive-vr', { target: targetRenderer });
    await controllerApi.start('immersive-ar', { target: targetRenderer });

    assert.equal(adapterOptions[0].referenceSpaceType, WEBXR_FEATURES.localFloor);
    assert.equal(adapterOptions[1].referenceSpaceType, WEBXR_FEATURES.localFloor);
    assert.equal(requests[0].options.optionalFeatures.includes(WEBXR_FEATURES.localFloor), true);
    assert.equal(requests[0].options.optionalFeatures.includes(WEBXR_FEATURES.boundedFloor), true);
    assert.equal(requests[0].options.optionalFeatures.includes(WEBXR_FEATURES.domOverlay), true);
  });
});
