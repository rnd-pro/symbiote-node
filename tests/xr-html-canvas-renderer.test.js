import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createXRHtmlCanvasDiagnostics,
  createXRHtmlCanvasRenderer,
} from '../xr/index.js';

describe('XR HTML-in-Canvas renderer bridge', () => {
  it('reports structured fallback when ProCanvas APIs are unavailable', () => {
    let renderer = createXRHtmlCanvasRenderer({ globalThis: {} });
    let element = {};

    let prepared = renderer.preparePanel(element, { id: 'chat' });
    let rendered = renderer.renderPanel('chat', {});

    assert.equal(renderer.getSupport().supported, false);
    assert.equal(renderer.getSupport().diagnostics.recommendation, 'enable-CanvasDrawElement');
    assert.equal(prepared.supported, false);
    assert.equal(prepared.reason, 'html-in-canvas-unsupported');
    assert.deepEqual(rendered, {
      rendered: false,
      mode: 'unsupported',
      reason: 'html-in-canvas-unsupported',
    });
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
    assert.equal(diagnostics.mode, 'canvas2d');
    assert.equal(diagnostics.apis.layoutsubtree, true);
    assert.equal(diagnostics.apis.drawElementImage, true);
    assert.equal(diagnostics.apis.webglTextureUpload, false);
    assert.equal(diagnostics.apis.webgpuTextureCopy, true);
    assert.deepEqual(diagnostics.blockingMissing, []);
    assert.deepEqual(diagnostics.optionalMissing, ['texElementImage2D']);
    assert.equal(diagnostics.recommendation, 'use-html-in-canvas');
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
    let element = { style: {} };

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

  it('requires live panels to stay in the canvas subtree when a canvas target is used', () => {
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
    canvas.child = insideElement;

    assert.deepEqual(renderer.preparePanel(outsideElement, { id: 'chat' }, { canvas }), {
      prepared: false,
      panelId: 'chat',
      mode: 'canvas2d',
      supported: false,
      reason: 'panel-outside-canvas-subtree',
    });
    assert.equal(renderer.preparePanel(insideElement, { id: 'chat' }, { canvas }).prepared, true);
  });
});
