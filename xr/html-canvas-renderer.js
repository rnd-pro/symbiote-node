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

export function createXRHtmlCanvasRenderer(options = {}) {
  let adapter = createHtmlInCanvasAdapter({ globalThis: options.globalThis || globalThis });
  let panels = new Map();
  let lastMode = selectMode(adapter.support, options.mode);

  function getSupport() {
    return {
      ...adapter.support,
      preferredMode: selectMode(adapter.support, options.mode),
    };
  }

  function getState() {
    return {
      supported: adapter.support.supported,
      preferredMode: lastMode,
      prepared: panels.size,
      panelIds: [...panels.keys()],
    };
  }

  function preparePanel(panelElement, panel, prepareOptions = {}) {
    if (!panelElement || !panel?.id) {
      return { prepared: false, reason: 'missing-panel-element' };
    }
    let mode = selectMode(adapter.support, prepareOptions.mode || options.mode);
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
    if (mode === 'webgl') {
      return adapter.uploadWebGLTexture(targetHandle, record.element, renderOptions);
    }
    if (mode === 'webgpu') {
      return adapter.copyWebGPUTexture(targetHandle, record.element, renderOptions);
    }
    return adapter.draw2d(targetHandle, record.element, renderOptions);
  }

  return {
    preparePanel,
    renderPanel,
    getSupport,
    getState,
  };
}
