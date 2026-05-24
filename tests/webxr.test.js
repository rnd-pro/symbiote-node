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
  });
});
