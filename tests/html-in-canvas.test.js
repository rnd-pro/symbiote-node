import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  HTML_IN_CANVAS_APIS,
  HTML_IN_CANVAS_RENDERER,
  captureHtmlElementImage,
  closeHtmlElementImage,
  createHtmlInCanvasAdapter,
  drawHtmlElement2d,
  getHtmlInCanvasChangedElements,
  getHtmlInCanvasSupport,
  requestHtmlInCanvasPaint,
  setupHtmlInCanvas,
  uploadHtmlElementToWebGLTexture,
  copyHtmlElementToWebGPUTexture,
} from '../canvas/html-in-canvas.js';

describe('HTML-in-Canvas adapter', () => {
  it('stays unsupported and fallback-safe without browser APIs', () => {
    let support = getHtmlInCanvasSupport({});

    assert.equal(support.name, 'html-in-canvas');
    assert.equal(support.status, 'experimental');
    assert.equal(support.supported, false);
    assert.equal(support.fallback, 'dom-overlay');
    assert.deepEqual(support.modes, {
      canvas2d: false,
      offscreen2d: false,
      webgl: false,
      webgpu: false,
    });
  });

  it('detects packaged Chromium HTML-in-Canvas APIs by capability', () => {
    class CanvasRenderingContext2D {
      drawElementImage() {}
    }
    class OffscreenCanvasRenderingContext2D {
      drawElementImage() {}
    }
    class WebGLRenderingContext {
      texElementImage2D() {}
    }
    class GPUQueue {
      copyElementImageToTexture() {}
    }
    class HTMLCanvasElement {
      setAttribute() {}
      requestPaint() {}
      captureElementImage() {}
      getElementTransform() {}
    }
    HTMLCanvasElement.prototype.layoutSubtree = false;
    class OffscreenCanvas {
      getElementTransform() {}
    }

    let support = getHtmlInCanvasSupport({
      CanvasRenderingContext2D,
      OffscreenCanvasRenderingContext2D,
      WebGLRenderingContext,
      GPUQueue,
      HTMLCanvasElement,
      OffscreenCanvas,
    });

    assert.equal(support.supported, true);
    assert.equal(support.modes.canvas2d, true);
    assert.equal(support.modes.offscreen2d, true);
    assert.equal(support.modes.webgl, true);
    assert.equal(support.modes.webgpu, true);
    assert.equal(support.apis.canvas2dDraw, 'drawElementImage');
    assert.equal(support.apis.elementCaptureAvailable, true);
    assert.equal(support.apis.elementTransformAvailable, true);
    assert.equal(support.apis.requestPaintAvailable, true);
    assert.equal(support.apis.layoutSubtreeAvailable, true);
  });

  it('sets the layoutsubtree attribute and requests paint when supported', () => {
    let attrs = new Map();
    let paintRequests = 0;
    let canvas = {
      setAttribute(name, value) {
        attrs.set(name, value);
      },
      requestPaint() {
        paintRequests++;
      },
    };

    assert.equal(setupHtmlInCanvas(canvas), true);
    assert.equal(attrs.get(HTML_IN_CANVAS_APIS.layoutSubtreeAttribute), '');
    assert.equal(requestHtmlInCanvasPaint(canvas), true);
    assert.equal(paintRequests, 1);
  });

  it('captures an element image for worker rendering when supported', () => {
    let element = {};
    let elementImage = { width: 10, height: 20 };
    let canvas = {
      captureElementImage(value) {
        assert.equal(value, element);
        return elementImage;
      },
    };

    assert.deepEqual(captureHtmlElementImage(canvas, element), {
      captured: true,
      elementImage,
    });
    assert.deepEqual(captureHtmlElementImage({}, element), {
      captured: false,
      reason: 'unsupported',
    });
  });

  it('exposes paint changed elements and closes captured element images', () => {
    let changedElements = Object.freeze([{}]);
    let closed = false;
    let elementImage = {
      close() {
        closed = true;
      },
    };

    assert.equal(getHtmlInCanvasChangedElements({ changedElements }), changedElements);
    assert.deepEqual(getHtmlInCanvasChangedElements({}), []);
    assert.equal(closeHtmlElementImage(elementImage), true);
    assert.equal(closed, true);
    assert.equal(closeHtmlElementImage({}), false);
  });

  it('draws a DOM element into a 2D canvas and syncs the returned transform', () => {
    let calls = [];
    let transform = { toString: () => 'matrix(1, 0, 0, 1, 12, 24)' };
    let ctx = {
      drawElementImage(...args) {
        calls.push(args);
        return transform;
      },
    };
    let element = { style: {} };

    let result = drawHtmlElement2d(ctx, element, { x: 12, y: 24, width: 100, height: 40 });

    assert.equal(result.rendered, true);
    assert.equal(result.mode, 'canvas2d');
    assert.deepEqual(calls, [[element, 12, 24, 100, 40]]);
    assert.equal(element.style.transform, 'matrix(1, 0, 0, 1, 12, 24)');
  });

  it('passes source and destination rectangles through drawElementImage', () => {
    let calls = [];
    let ctx = {
      drawElementImage(...args) {
        calls.push(args);
      },
    };
    let element = {};

    let result = drawHtmlElement2d(ctx, element, { rect: [1, 2, 30, 40, 5, 6, 70, 80] });

    assert.equal(result.rendered, true);
    assert.deepEqual(calls, [[element, 1, 2, 30, 40, 5, 6, 70, 80]]);
  });

  it('uploads HTML elements to WebGL and WebGPU texture APIs when available', () => {
    let glCalls = [];
    let gl = {
      TEXTURE_2D: 1,
      RGBA: 2,
      UNSIGNED_BYTE: 3,
      texElementImage2D(...args) {
        glCalls.push(args);
      },
    };
    let queueCalls = [];
    let queue = {
      copyElementImageToTexture(...args) {
        queueCalls.push(args);
      },
    };
    let element = {};
    let destination = { texture: {} };

    assert.equal(uploadHtmlElementToWebGLTexture(gl, element).rendered, true);
    assert.deepEqual(glCalls, [[1, 0, 2, 2, 3, element]]);
    assert.equal(copyHtmlElementToWebGPUTexture(queue, element, { destination }).rendered, true);
    assert.deepEqual(queueCalls, [[element, destination]]);
  });

  it('creates a renderer descriptor with explicit experimental metadata', () => {
    let adapter = createHtmlInCanvasAdapter({ globalThis: {} });

    assert.equal(HTML_IN_CANVAS_RENDERER.status, 'experimental');
    assert.ok(HTML_IN_CANVAS_RENDERER.modes.includes('offscreen2d'));
    assert.equal(adapter.name, 'html-in-canvas');
    assert.equal(adapter.fallback, 'dom-overlay');
    assert.equal(adapter.canRender('canvas2d'), false);
    assert.equal(typeof adapter.captureElementImage, 'function');
    assert.equal(typeof adapter.closeElementImage, 'function');
    assert.equal(typeof adapter.getChangedElements, 'function');
    assert.ok(adapter.capabilities.includes('feature-detected-fallback'));
    assert.ok(adapter.capabilities.includes('offscreen-worker-snapshots'));
  });
});
