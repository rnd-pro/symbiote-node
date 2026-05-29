import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  HTML_IN_CANVAS_ORIGIN_TRIAL_HEADER,
  createXRHtmlCanvasEnablementSummary,
  createXRHtmlCanvasDiagnostics,
  createXRHtmlCanvasHeaderDiagnostics,
  createXRHtmlCanvasRenderer,
  createXRPanelTextureSourceSummary,
  createXRTextureDebugModeSummary,
  createXRTextureGateSummary,
  readXRHtmlCanvasOriginTrialHeaderStatus,
} from '../xr/index.js';

describe('XR HTML-in-Canvas renderer bridge', () => {
  it('reports structured fallback when ProCanvas APIs are unavailable', () => {
    let renderer = createXRHtmlCanvasRenderer({ globalThis: {} });
    let element = {};

    let prepared = renderer.preparePanel(element, { id: 'chat' });
    let rendered = renderer.renderPanel('chat', {});

    assert.equal(renderer.getSupport().supported, false);
    assert.equal(renderer.getSupport().diagnostics.availability, 'origin-trial-or-flag-required');
    assert.equal(renderer.getSupport().diagnostics.recommendation, 'enable-CanvasDrawElement');
    assert.equal(renderer.getSupport().diagnostics.originTrial.flagUrl, 'chrome://flags/#canvas-draw-element');
    assert.equal(renderer.getSupport().diagnostics.enablement.originTrialTokenPresent, false);
    assert.equal(prepared.supported, false);
    assert.equal(prepared.reason, 'html-in-canvas-unsupported');
    assert.deepEqual(rendered, {
      rendered: false,
      mode: 'unsupported',
      reason: 'html-in-canvas-unsupported',
    });
  });

  it('detects HTML-in-Canvas origin trial enablement without exposing token content', () => {
    let token = 'private-token-value';
    let document = {
      querySelectorAll(selector) {
        assert.equal(selector, 'meta');
        return [
          {
            getAttribute(name) {
              if (name === 'http-equiv') return 'origin-trial';
              if (name === 'content') return token;
              return null;
            },
          },
        ];
      },
    };
    let enablement = createXRHtmlCanvasEnablementSummary({
      document,
      isSecureContext: true,
    });
    let diagnostics = createXRHtmlCanvasDiagnostics({
      supported: false,
      modes: {},
      apis: {},
      enablement,
    });

    assert.equal(enablement.version, 'xr-html-in-canvas-enablement-v1');
    assert.equal(enablement.originTrialMetaPresent, true);
    assert.equal(enablement.originTrialMetaCount, 1);
    assert.equal(enablement.originTrialTokenPresent, true);
    assert.equal(JSON.stringify(enablement).includes(token), false);
    assert.equal(diagnostics.availability, 'origin-trial-token-present-api-missing');
    assert.equal(JSON.stringify(diagnostics).includes(token), false);
  });

  it('reads HTML-in-Canvas origin trial response headers without exposing token content', async () => {
    let token = 'private-origin-trial-token';
    let response = {
      ok: true,
      status: 200,
      headers: new Map([
        [HTML_IN_CANVAS_ORIGIN_TRIAL_HEADER, token],
        ['X-Host-Origin-Trial', 'html-in-canvas'],
      ]),
    };
    response.headers.has = response.headers.has.bind(response.headers);
    response.headers.get = response.headers.get.bind(response.headers);

    let diagnostics = createXRHtmlCanvasHeaderDiagnostics(response, {
      diagnosticHeader: 'X-Host-Origin-Trial',
    });
    let fetched = await readXRHtmlCanvasOriginTrialHeaderStatus('/demo?x=1', {
      baseUrl: 'https://example.test/app',
      diagnosticHeader: 'X-Host-Origin-Trial',
      fetch(url, init) {
        assert.equal(url, '/demo?x=1');
        assert.equal(init.method, 'HEAD');
        return response;
      },
    });

    assert.equal(diagnostics.version, 'xr-html-in-canvas-header-diagnostics-v1');
    assert.equal(diagnostics.originTrialHeader, HTML_IN_CANVAS_ORIGIN_TRIAL_HEADER);
    assert.equal(diagnostics.originTrialPresent, true);
    assert.equal(diagnostics.present, true);
    assert.equal(diagnostics.diagnosticHeaderName, 'X-Host-Origin-Trial');
    assert.equal(diagnostics.diagnosticHeader, 'html-in-canvas');
    assert.equal(JSON.stringify(diagnostics).includes(token), false);
    assert.deepEqual(fetched, diagnostics);
  });

  it('prefers WebGL texture upload when available', () => {
    class WebGLRenderingContext {
      texElementImage2D(...args) {
        this.calls.push(args);
      }
    }
    let renderer = createXRHtmlCanvasRenderer({ globalThis: { WebGLRenderingContext } });
    let gl = new WebGLRenderingContext();
    gl.calls = [];
    gl.TEXTURE_2D = 1;
    gl.RGBA = 2;
    gl.UNSIGNED_BYTE = 3;
    let element = {};

    let prepared = renderer.preparePanel(element, { id: 'graph' });
    let rendered = renderer.renderPanel('graph', gl);

    assert.equal(prepared.mode, 'webgl');
    assert.equal(rendered.rendered, true);
    assert.equal(rendered.mode, 'webgl');
    assert.deepEqual(gl.calls, [[1, 0, 2, 2, 3, element]]);
  });

  it('supports WebGPU and canvas2d targets by mode', () => {
    class GPUQueue {
      copyElementImageToTexture(...args) {
        this.calls.push(args);
      }
    }
    class CanvasRenderingContext2D {
      drawElementImage(...args) {
        this.calls.push(args);
      }
    }
    let element = {};
    let destination = { texture: {} };

    let webgpu = createXRHtmlCanvasRenderer({
      globalThis: { GPUQueue },
      mode: 'webgpu',
    });
    let queue = new GPUQueue();
    queue.calls = [];
    webgpu.preparePanel(element, { id: 'runtime' });
    let webgpuResult = webgpu.renderPanel('runtime', queue, { destination });

    assert.equal(webgpuResult.rendered, true);
    assert.equal(webgpuResult.mode, 'webgpu');
    assert.deepEqual(queue.calls, [[element, destination]]);

    let canvas2d = createXRHtmlCanvasRenderer({
      globalThis: { CanvasRenderingContext2D },
      mode: 'canvas2d',
    });
    let ctx = new CanvasRenderingContext2D();
    ctx.calls = [];
    canvas2d.preparePanel(element, { id: 'settings' });
    let canvasResult = canvas2d.renderPanel('settings', ctx, { x: 4, y: 8 });

    assert.equal(canvasResult.rendered, true);
    assert.equal(canvasResult.mode, 'canvas2d');
    assert.deepEqual(ctx.calls, [[element, 4, 8]]);
  });

  it('summarizes current browser HTML-in-Canvas capabilities as data', () => {
    let diagnostics = createXRHtmlCanvasDiagnostics({
      supported: true,
      preferredMode: 'canvas2d',
      fallback: 'dom-overlay',
      modes: { canvas2d: true, webgl: false, webgpu: true },
      apis: {
        layoutSubtreeAvailable: true,
        canvas2dDrawAvailable: true,
        requestPaintAvailable: true,
        elementTransformAvailable: true,
      },
    });

    assert.equal(diagnostics.name, 'xr-html-in-canvas-diagnostics');
    assert.equal(diagnostics.supported, true);
    assert.equal(diagnostics.availability, 'texture-ready');
    assert.equal(diagnostics.mode, 'canvas2d');
    assert.equal(diagnostics.renderTargetAvailable, true);
    assert.equal(diagnostics.textureUploadAvailable, true);
    assert.equal(diagnostics.apis.layoutsubtree, true);
    assert.equal(diagnostics.apis.drawElementImage, true);
    assert.equal(diagnostics.apis.webglTextureUpload, false);
    assert.equal(diagnostics.apis.webgpuTextureCopy, true);
    assert.deepEqual(diagnostics.blockingMissing, []);
    assert.deepEqual(diagnostics.optionalMissing, ['texElementImage2D']);
    assert.deepEqual(diagnostics.missingTexture, ['texElementImage2D']);
    assert.equal(diagnostics.recommendation, 'use-html-in-canvas');
  });

  it('separates canvas readiness from texture upload readiness', () => {
    let diagnostics = createXRHtmlCanvasDiagnostics({
      supported: true,
      preferredMode: 'webgl',
      fallback: 'dom-overlay',
      modes: { canvas2d: true, webgl: true, webgpu: false },
      apis: {
        layoutSubtreeAvailable: true,
        canvas2dDrawAvailable: true,
        requestPaintAvailable: true,
      },
    });

    assert.equal(diagnostics.availability, 'texture-ready');
    assert.equal(diagnostics.renderTargetAvailable, true);
    assert.equal(diagnostics.textureUploadAvailable, true);
    assert.deepEqual(diagnostics.missingCore, []);
    assert.deepEqual(diagnostics.missingTexture, ['copyElementImageToTexture']);
  });

  it('summarizes XR panel texture source paths without host-specific logic', () => {
    let unsupported = createXRPanelTextureSourceSummary(
      { id: 'graph' },
      { prepared: true, mode: 'unsupported', supported: false, reason: 'html-in-canvas-unsupported' },
      {
        supported: false,
        preferredMode: null,
        fallback: 'dom-overlay',
        modes: {},
        apis: {},
      },
    );
    let webgl = createXRPanelTextureSourceSummary(
      { id: 'chat' },
      { prepared: true, mode: 'webgl', supported: true },
      {
        supported: true,
        preferredMode: 'webgl',
        fallback: 'dom-overlay',
        modes: { webgl: true },
        apis: { layoutSubtreeAvailable: true },
      },
    );

    assert.equal(unsupported.version, 'xr-panel-texture-source-v1');
    assert.equal(unsupported.panelId, 'graph');
    assert.equal(unsupported.source, 'provider-material-fallback');
    assert.equal(unsupported.mode, 'unsupported');
    assert.equal(unsupported.fallback, true);
    assert.equal(webgl.source, 'html-in-canvas');
    assert.equal(webgl.mode, 'webgl');
    assert.equal(webgl.fallback, false);
  });

  it('summarizes strict texture gate readiness from provider support data', () => {
    let gate = createXRTextureGateSummary({
      debugMode: { mode: 'strict' },
      panelCount: 4,
      support: {
        supported: false,
        modes: {},
        apis: {},
      },
    });

    assert.equal(gate.version, 'xr-texture-gate-summary-v1');
    assert.equal(gate.debugMode.version, 'xr-texture-debug-mode-v1');
    assert.equal(gate.debugMode.requireTextureUpload, true);
    assert.equal(gate.total, 4);
    assert.equal(gate.ready, 0);
    assert.equal(gate.blocked, true);
    assert.equal(gate.reason, 'html-in-canvas-unsupported');
    assert.equal(gate.stage, 'html-in-canvas-support');
    assert.deepEqual(gate.requiredApi, ['layoutsubtree', 'render-target-api']);
  });

  it('normalizes texture debug mode policy for diagnostic hosts', () => {
    let strict = createXRTextureDebugModeSummary({ texture: 'strict' });
    let fallback = createXRTextureDebugModeSummary({ requestedMode: 'fallback' });
    let defaultStrict = createXRTextureDebugModeSummary();

    assert.equal(strict.version, 'xr-texture-debug-mode-v1');
    assert.equal(strict.mode, 'strict');
    assert.equal(strict.requireTextureUpload, true);
    assert.equal(strict.hideStrictTextureFailures, true);
    assert.equal(strict.allowMaterialFallback, false);
    assert.equal(strict.queryValue, 'strict');
    assert.equal(fallback.mode, 'fallback');
    assert.equal(fallback.requireTextureUpload, false);
    assert.equal(fallback.hideStrictTextureFailures, false);
    assert.equal(fallback.allowMaterialFallback, true);
    assert.equal(defaultStrict.mode, 'strict');
  });

  it('summarizes strict texture gate readiness from Three bridge records', () => {
    let gate = createXRTextureGateSummary({
      strict: true,
      records: [
        {
          panelId: 'chat',
          ok: true,
          stage: 'three-material-applied',
          summary: { source: 'html-in-canvas', mode: 'webgl' },
          textureApplied: true,
        },
        {
          panelId: 'graph',
          ok: false,
          stage: 'html-in-canvas-support',
          reason: 'html-in-canvas-unsupported',
          summary: { source: 'provider-material-fallback', mode: 'unsupported' },
          support: {
            blockingMissing: ['layoutsubtree'],
            recommendation: 'enable-CanvasDrawElement',
          },
        },
      ],
      bridgeVersion: 'xr-three-panel-texture-bridge-v1',
    });

    assert.equal(gate.total, 2);
    assert.equal(gate.ready, 1);
    assert.equal(gate.blocked, true);
    assert.equal(gate.reason, 'html-in-canvas-unsupported');
    assert.equal(gate.stage, 'html-in-canvas-support');
    assert.deepEqual(gate.requiredApi, ['layoutsubtree']);
    assert.equal(gate.bridgeVersion, 'xr-three-panel-texture-bridge-v1');
    assert.equal(gate.bridgeStages[0].textureApplied, true);
  });

  it('keeps texture resolver stages in gate diagnostics without changing bridge readiness', () => {
    let gate = createXRTextureGateSummary({
      strict: true,
      records: [
        {
          panelId: 'chat',
          ok: false,
          stage: 'three-texture-upload',
          reason: 'texture-resolver-empty',
          summary: { source: 'html-in-canvas', mode: 'canvas2d' },
        },
      ],
      resolverState: {
        version: 'xr-three-html-canvas-texture-resolver-v1',
        textureCount: 0,
        records: [
          {
            panelId: 'chat',
            ok: false,
            stage: 'html-canvas-preview',
            reason: 'html-in-canvas-unsupported',
            textureApplied: false,
            width: 1280,
            height: 720,
            mode: 'canvas2d',
          },
        ],
      },
    });

    assert.equal(gate.blocked, true);
    assert.equal(gate.stage, 'three-texture-upload');
    assert.equal(gate.resolverVersion, 'xr-three-html-canvas-texture-resolver-v1');
    assert.equal(gate.resolverTextures, 0);
    assert.equal(gate.resolverStages[0].stage, 'html-canvas-preview');
    assert.equal(gate.resolverStages[0].width, 1280);
  });

  it('renders a prepared live panel into a canvas2d preview when drawElementImage exists', () => {
    class CanvasRenderingContext2D {
      drawElementImage(...args) {
        this.calls.push(args);
        return { toString: () => 'matrix(1, 0, 0, 1, 0, 0)' };
      }
    }
    class HTMLCanvasElement {
      constructor(ctx) {
        this.ctx = ctx;
        this.attrs = new Map();
        this.paintRequested = false;
      }

      getContext(type) {
        return type === '2d' ? this.ctx : null;
      }

      setAttribute(name, value) {
        this.attrs.set(name, value);
      }

      requestPaint() {
        this.paintRequested = true;
      }
    }

    let renderer = createXRHtmlCanvasRenderer({
      globalThis: { CanvasRenderingContext2D, HTMLCanvasElement },
      mode: 'canvas2d',
    });
    let ctx = new CanvasRenderingContext2D();
    ctx.calls = [];
    let canvas = new HTMLCanvasElement(ctx);
    let element = { style: {}, parentElement: canvas };

    renderer.preparePanel(element, { id: 'chat' }, { canvas });
    let result = renderer.renderPanelPreview('chat', canvas, { width: 320, height: 180 });

    assert.equal(result.rendered, true);
    assert.equal(result.mode, 'canvas2d');
    assert.equal(result.preview, true);
    assert.equal(canvas.attrs.has('layoutsubtree'), true);
    assert.equal(canvas.paintRequested, true);
    assert.deepEqual(ctx.calls, [[element, 0, 0, 320, 180]]);
    assert.equal(element.style.transform, undefined);
    assert.equal(renderer.getState().lastRender.panelId, 'chat');
  });

  it('requires live panels to stay as direct canvas children when a canvas target is used', () => {
    class CanvasRenderingContext2D {
      drawElementImage() {}
    }
    class HTMLCanvasElement {
      contains(element) {
        return element === this.child;
      }
    }

    let renderer = createXRHtmlCanvasRenderer({
      globalThis: { CanvasRenderingContext2D, HTMLCanvasElement },
      mode: 'canvas2d',
    });
    let canvas = new HTMLCanvasElement();
    let outsideElement = {};
    let insideElement = {};
    insideElement.parentElement = canvas;

    assert.deepEqual(renderer.preparePanel(outsideElement, { id: 'chat' }, { canvas }), {
      prepared: false,
      panelId: 'chat',
      mode: 'canvas2d',
      supported: false,
      reason: 'panel-outside-canvas-direct-child',
    });
    assert.equal(renderer.preparePanel(insideElement, { id: 'chat' }, { canvas }).prepared, true);
  });
});
