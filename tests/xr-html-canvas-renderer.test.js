import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createXRHtmlCanvasRenderer } from '../xr/index.js';

describe('XR HTML-in-Canvas renderer bridge', () => {
  it('reports structured fallback when ProCanvas APIs are unavailable', () => {
    let renderer = createXRHtmlCanvasRenderer({ globalThis: {} });
    let element = {};

    let prepared = renderer.preparePanel(element, { id: 'chat' });
    let rendered = renderer.renderPanel('chat', {});

    assert.equal(renderer.getSupport().supported, false);
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
});
