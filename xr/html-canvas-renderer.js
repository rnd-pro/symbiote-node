import {
  createHtmlInCanvasAdapter,
} from '../canvas/html-in-canvas.js';

const MODE_PRIORITY = Object.freeze(['webgl', 'webgpu', 'canvas2d']);

function selectMode(support, requestedMode) {
  if (requestedMode && support.modes?.[requestedMode]) return requestedMode;
  return MODE_PRIORITY.find((mode) => support.modes?.[mode]) || null;
}

function targetForMode(target, mode) {
  if (!target) return null;
  if (mode === 'webgl') return target.gl || target.webgl || target;
  if (mode === 'webgpu') return target.queue || target.webgpuQueue || target;
  return target.ctx || target.context || target;
}

function getCanvas2dContext(canvas) {
  return canvas?.getContext?.('2d') || null;
}

export function createXRHtmlCanvasDiagnostics(support = {}, options = {}) {
  let apis = support.apis || {};
  let modes = support.modes || {};
  let requiredFlag = options.requiredFlag || 'CanvasDrawElement';
  let renderTargetAvailable = Boolean(modes.canvas2d || modes.offscreen2d || modes.webgl || modes.webgpu);
  let blockingMissing = [];
  let missing = [];
  if (!apis.layoutSubtreeAvailable) missing.push('layoutsubtree');
  if (!renderTargetAvailable) missing.push('render-target-api');
  if (!apis.requestPaintAvailable) missing.push('requestPaint');
  if (!apis.canvas2dDrawAvailable) missing.push('drawElementImage');
  if (!modes.webgl) missing.push('texElementImage2D');
  if (!modes.webgpu) missing.push('copyElementImageToTexture');
  if (!apis.layoutSubtreeAvailable) blockingMissing.push('layoutsubtree');
  if (!renderTargetAvailable) blockingMissing.push('render-target-api');

  return {
    name: 'xr-html-in-canvas-diagnostics',
    supported: Boolean(support.supported && !blockingMissing.length),
    mode: support.preferredMode || null,
    fallback: support.fallback || 'dom-overlay',
    requiredFlag,
    apis: {
      layoutsubtree: Boolean(apis.layoutSubtreeAvailable),
      drawElementImage: Boolean(apis.canvas2dDrawAvailable),
      paintEvent: Boolean(apis.requestPaintAvailable),
      webglTextureUpload: Boolean(modes.webgl),
      webgpuTextureCopy: Boolean(modes.webgpu),
      elementTransform: Boolean(apis.elementTransformAvailable),
    },
    missing,
    blockingMissing,
    optionalMissing: missing.filter((item) => !blockingMissing.includes(item)),
    recommendation: blockingMissing.length ? `enable-${requiredFlag}` : 'use-html-in-canvas',
  };
}

export function createXRHtmlCanvasRenderer(options = {}) {
  let adapter = createHtmlInCanvasAdapter({ globalThis: options.globalThis || globalThis });
  let panels = new Map();
  let lastMode = selectMode(adapter.support, options.mode);
  let lastRender = null;

  function getSupport() {
    let support = {
      ...adapter.support,
      preferredMode: selectMode(adapter.support, options.mode),
    };
    return {
      ...support,
      diagnostics: createXRHtmlCanvasDiagnostics(support, options),
    };
  }

  function getState() {
    return {
      supported: adapter.support.supported,
      preferredMode: lastMode,
      prepared: panels.size,
      panelIds: [...panels.keys()],
      lastRender,
    };
  }

  function preparePanel(panelElement, panel, prepareOptions = {}) {
    if (!panelElement || !panel?.id) {
      return { prepared: false, reason: 'missing-panel-element' };
    }
    let mode = selectMode(adapter.support, prepareOptions.mode || options.mode);
    if (
      mode &&
      prepareOptions.canvas &&
      typeof prepareOptions.canvas.contains === 'function' &&
      !prepareOptions.canvas.contains(panelElement)
    ) {
      return {
        prepared: false,
        panelId: panel.id,
        mode,
        supported: false,
        reason: 'panel-outside-canvas-subtree',
      };
    }
    panels.set(panel.id, {
      panel,
      element: panelElement,
      mode,
    });
    lastMode = mode;
    if (prepareOptions.canvas) {
      adapter.setupCanvas(prepareOptions.canvas);
      adapter.requestPaint(prepareOptions.canvas);
    }
    return {
      prepared: true,
      panelId: panel.id,
      mode: mode || 'unsupported',
      supported: Boolean(mode),
      reason: mode ? null : 'html-in-canvas-unsupported',
    };
  }

  function renderPanel(panelId, target, renderOptions = {}) {
    let record = panels.get(panelId);
    if (!record) {
      return { rendered: false, reason: 'panel-not-prepared' };
    }
    let mode = selectMode(adapter.support, renderOptions.mode || record.mode || options.mode);
    if (!mode) {
      return { rendered: false, mode: 'unsupported', reason: 'html-in-canvas-unsupported' };
    }

    let targetHandle = targetForMode(target, mode);
    if (!targetHandle) {
      return { rendered: false, mode, reason: 'missing-render-target' };
    }

    lastMode = mode;
    let result = null;
    if (mode === 'webgl') {
      result = adapter.uploadWebGLTexture(targetHandle, record.element, renderOptions);
    } else if (mode === 'webgpu') {
      result = adapter.copyWebGPUTexture(targetHandle, record.element, renderOptions);
    } else {
      result = adapter.draw2d(targetHandle, record.element, renderOptions);
    }
    lastRender = { panelId, ...result };
    return result;
  }

  function renderPanelPreview(panelId, canvas, renderOptions = {}) {
    let record = panels.get(panelId);
    if (!record) {
      return { rendered: false, mode: 'canvas2d', reason: 'panel-not-prepared' };
    }
    if (!adapter.support.modes.canvas2d) {
      return { rendered: false, mode: 'canvas2d', reason: 'html-in-canvas-unsupported' };
    }
    let ctx = getCanvas2dContext(canvas);
    if (!ctx) {
      return { rendered: false, mode: 'canvas2d', reason: 'missing-canvas2d-context' };
    }
    adapter.setupCanvas(canvas);
    let result = adapter.draw2d(ctx, record.element, {
      syncTransform: false,
      ...renderOptions,
      x: renderOptions.x ?? 0,
      y: renderOptions.y ?? 0,
    });
    adapter.requestPaint(canvas);
    lastMode = 'canvas2d';
    lastRender = {
      panelId,
      preview: true,
      ...result,
    };
    return lastRender;
  }

  return {
    preparePanel,
    renderPanel,
    renderPanelPreview,
    getSupport,
    getState,
  };
}
