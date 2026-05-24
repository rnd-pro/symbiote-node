import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  WEBXR_RENDERER,
  createWebXRAdapter,
  createWebXRLayer,
  createWebXRRenderLoop,
  getWebXRSupport,
  normalizeWebXRSessionOptions,
  projectLayoutToXR,
  createXRSpatialPreview,
  createXRSpatialScene,
  createXRSceneController,
  createXRThemeSnapshot,
  applyXRThemeToPanel,
  XR_SPATIAL_SCENE_VERSION,
  hitTestXRPanels,
  createXRPointerEvent,
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

  it('detects supported WebXR session modes without throwing', async () => {
    let target = {
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
    assert.equal(support.apis.XRWebGLLayerAvailable, true);
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
    assert.ok(WEBXR_RENDERER.capabilities.includes('xr-html-in-canvas-renderer'));
  });
});
