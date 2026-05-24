import { collectPanels } from '../layout/LayoutTree.js';

export const XR_LAYOUT_PRESETS = Object.freeze({
  front: Object.freeze({ position: [0, 1.35, -1.8], rotation: [0, 0, 0], size: [0.9, 0.62] }),
  left: Object.freeze({ position: [-0.86, 1.32, -1.62], rotation: [0, 24, 0], size: [0.58, 0.78] }),
  right: Object.freeze({ position: [0.86, 1.32, -1.62], rotation: [0, -24, 0], size: [0.58, 0.78] }),
  lower: Object.freeze({ position: [0, 0.86, -1.35], rotation: [-14, 0, 0], size: [0.98, 0.28] }),
  upperRight: Object.freeze({ position: [0.58, 1.74, -1.42], rotation: [8, -18, 0], size: [0.42, 0.24] }),
});

const AREA_PRESET = Object.freeze({
  left: 'left',
  sidebar: 'left',
  nav: 'left',
  menu: 'left',
  right: 'right',
  inspector: 'right',
  details: 'right',
  bottom: 'lower',
  lower: 'lower',
  tray: 'lower',
  status: 'upperRight',
  toast: 'upperRight',
  center: 'front',
  main: 'front',
});

const DEFAULT_RELATIVE_SIZE = Object.freeze({
  width: 1.22,
  height: 0.82,
  minWidth: 0.32,
  minHeight: 0.22,
  maxWidth: 1.28,
  maxHeight: 0.92,
});

const DEFAULT_CONTENT_VIEWPORT = Object.freeze({
  minWidth: 960,
  minHeight: 540,
  maxWidth: 1600,
  maxHeight: 1200,
});

function numberOr(value, fallback) {
  let number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundMetric(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function asVector(value, fallback) {
  if (!Array.isArray(value)) return [...fallback];
  return fallback.map((item, index) => numberOr(value[index], item));
}

function inferPreset(panel, index, total) {
  let area = panel?.xr?.anchor || panel?.layout?.area || panel?.area || panel?.panelState?.area || '';
  if (AREA_PRESET[area]) return AREA_PRESET[area];
  if (total === 1) return 'front';
  if (index === 0) return 'front';
  if (index % 4 === 1) return 'left';
  if (index % 4 === 2) return 'right';
  if (index % 4 === 3) return 'lower';
  return 'upperRight';
}

function isRuntimeUiNode(node) {
  return !!node && typeof node === 'object' && typeof node.component === 'string';
}

function collectRuntimePanels(root) {
  let panels = [];

  function walk(node) {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!isRuntimeUiNode(node)) return;
    if (node.component === 'panel-layout' && Array.isArray(node.children) && node.children.length) {
      node.children.forEach(walk);
      return;
    }
    panels.push(node);
  }

  walk(root);
  return panels;
}

function normalizeRect(rect) {
  if (!rect) return null;
  return {
    x: clamp(numberOr(rect.x, 0), 0, 1),
    y: clamp(numberOr(rect.y, 0), 0, 1),
    width: clamp(numberOr(rect.width, 1), 0, 1),
    height: clamp(numberOr(rect.height, 1), 0, 1),
  };
}

function collectLayoutRects(root) {
  let rects = new Map();

  function walk(node, rect) {
    if (!node) return;
    if (node.type === 'panel') {
      rects.set(node, normalizeRect(node.layout?.rect || rect));
      return;
    }
    if (node.type !== 'split') return;
    let ratio = clamp(numberOr(node.ratio, 0.5), 0, 1);
    if (node.direction === 'vertical') {
      walk(node.first, { ...rect, height: rect.height * ratio });
      walk(node.second, {
        x: rect.x,
        y: rect.y + rect.height * ratio,
        width: rect.width,
        height: rect.height * (1 - ratio),
      });
      return;
    }
    walk(node.first, { ...rect, width: rect.width * ratio });
    walk(node.second, {
      x: rect.x + rect.width * ratio,
      y: rect.y,
      width: rect.width * (1 - ratio),
      height: rect.height,
    });
  }

  walk(root, { x: 0, y: 0, width: 1, height: 1 });
  return rects;
}

function runtimeLayoutDirection(node) {
  return node.layout?.direction || node.props?.layoutDirection || 'horizontal';
}

function runtimeLayoutWeight(node) {
  return Math.max(0, numberOr(node.layout?.weight ?? node.props?.layoutWeight, 1));
}

function collectRuntimeRects(root) {
  let rects = new Map();

  function walk(node, rect) {
    if (!isRuntimeUiNode(node)) return;
    let normalizedRect = normalizeRect(node.layout?.rect || rect);
    if (node.component !== 'panel-layout' || !Array.isArray(node.children) || !node.children.length) {
      rects.set(node, normalizedRect);
      return;
    }

    let direction = runtimeLayoutDirection(node);
    let weights = node.children.map(runtimeLayoutWeight);
    let total = weights.reduce((sum, weight) => sum + weight, 0) || node.children.length || 1;
    let cursor = direction === 'vertical' ? normalizedRect.y : normalizedRect.x;

    node.children.forEach((child, index) => {
      let ratio = (weights[index] || 1) / total;
      let childRect = direction === 'vertical'
        ? {
          x: normalizedRect.x,
          y: cursor,
          width: normalizedRect.width,
          height: normalizedRect.height * ratio,
        }
        : {
          x: cursor,
          y: normalizedRect.y,
          width: normalizedRect.width * ratio,
          height: normalizedRect.height,
        };
      cursor += direction === 'vertical' ? childRect.height : childRect.width;
      walk(child, child.layout?.rect || childRect);
    });
  }

  walk(root, { x: 0, y: 0, width: 1, height: 1 });
  return rects;
}

function createRelativeSize(rect, preset, options = {}) {
  if (!rect) {
    return {
      size: [...preset.size],
      source: 'preset',
      relativeRect: null,
    };
  }
  let size = options.relativeSize || DEFAULT_RELATIVE_SIZE;
  return {
    size: [
      roundMetric(clamp(
        rect.width * numberOr(size.width, DEFAULT_RELATIVE_SIZE.width),
        numberOr(size.minWidth, DEFAULT_RELATIVE_SIZE.minWidth),
        numberOr(size.maxWidth, DEFAULT_RELATIVE_SIZE.maxWidth)
      )),
      roundMetric(clamp(
        rect.height * numberOr(size.height, DEFAULT_RELATIVE_SIZE.height),
        numberOr(size.minHeight, DEFAULT_RELATIVE_SIZE.minHeight),
        numberOr(size.maxHeight, DEFAULT_RELATIVE_SIZE.maxHeight)
      )),
    ],
    source: 'relative-layout',
    relativeRect: rect,
  };
}

export function normalizeXRPanel(panel = {}, options = {}) {
  let presetName = panel.xr?.preset ||
    (XR_LAYOUT_PRESETS[panel.xr?.anchor] ? panel.xr.anchor : inferPreset(panel, options.index || 0, options.total || 1));
  let preset = XR_LAYOUT_PRESETS[presetName] || XR_LAYOUT_PRESETS.front;
  let xr = panel.xr || {};
  let relative = createRelativeSize(normalizeRect(options.relativeRect), preset, options);
  let explicitSize = Array.isArray(xr.size);

  return {
    id: String(panel.id || `xr-panel-${options.index || 0}`),
    panelType: panel.panelType || panel.component || 'panel',
    component: panel.component || panel.panelState?.component || panel.panelType || 'panel',
    layoutNode: panel,
    anchor: xr.anchor || presetName,
    position: asVector(xr.position, preset.position),
    rotation: asVector(xr.rotation, preset.rotation),
    size: explicitSize ? asVector(xr.size, preset.size) : relative.size,
    sizeSource: explicitSize ? 'explicit' : relative.source,
    relativeRect: relative.relativeRect,
    curve: numberOr(xr.curve, options.curve ?? 0),
    opacity: numberOr(xr.opacity, options.opacity ?? 0.96),
    priority: numberOr(xr.priority ?? panel.priority, options.index || 0),
    state: panel.panelState || {},
  };
}

export function projectLayoutToXR(root, options = {}) {
  let panels = Array.isArray(root?.panels)
    ? root.panels
    : collectPanels(root, { includeGlobal: options.includeGlobal !== false });
  let rects = Array.isArray(root?.panels) ? new Map() : collectLayoutRects(root);
  if (!panels.length && isRuntimeUiNode(root)) {
    panels = collectRuntimePanels(root);
    rects = collectRuntimeRects(root);
  }
  let projectedPanels = panels
    .map((panel, index) => normalizeXRPanel(panel, {
      ...options,
      index,
      total: panels.length,
      relativeRect: rects.get(panel),
    }))
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));

  return {
    version: 'xr-layout-v1',
    unit: 'meter',
    coordinateSystem: 'webxr-local-floor',
    panels: projectedPanels,
    focusPanelId: options.focusPanelId || projectedPanels[0]?.id || null,
    themeScope: options.themeScope || 'xr',
  };
}

export function createXRPanelPose(panel, frame = null, referenceSpace = null) {
  return {
    panelId: panel.id,
    position: [...panel.position],
    rotation: [...panel.rotation],
    size: [...panel.size],
    frame,
    referenceSpace,
  };
}

function rectSummary(rect) {
  if (!rect) return null;
  return {
    x: roundMetric(numberOr(rect.x, 0)),
    y: roundMetric(numberOr(rect.y, 0)),
    width: roundMetric(numberOr(rect.width, 0)),
    height: roundMetric(numberOr(rect.height, 0)),
  };
}

function previewSummary(preview) {
  if (!preview) return null;
  return {
    left: roundMetric(numberOr(preview.left, 0)),
    top: roundMetric(numberOr(preview.top, 0)),
    width: roundMetric(numberOr(preview.width, 0)),
    height: roundMetric(numberOr(preview.height, 0)),
    depth: roundMetric(numberOr(preview.depth, 0)),
  };
}

function roundPixel(value) {
  return Math.round(numberOr(value, 0));
}

function normalizeViewportOptions(options = {}) {
  return {
    minWidth: numberOr(options.minWidth, DEFAULT_CONTENT_VIEWPORT.minWidth),
    minHeight: numberOr(options.minHeight, DEFAULT_CONTENT_VIEWPORT.minHeight),
    maxWidth: numberOr(options.maxWidth, DEFAULT_CONTENT_VIEWPORT.maxWidth),
    maxHeight: numberOr(options.maxHeight, DEFAULT_CONTENT_VIEWPORT.maxHeight),
  };
}

function fitViewportToAspect(aspectRatio, options) {
  let width = Math.max(options.minWidth, options.minHeight * aspectRatio);
  let height = width / aspectRatio;
  if (height < options.minHeight) {
    height = options.minHeight;
    width = height * aspectRatio;
  }
  if (width > options.maxWidth) {
    width = options.maxWidth;
    height = width / aspectRatio;
  }
  if (height > options.maxHeight) {
    height = options.maxHeight;
    width = height * aspectRatio;
  }
  if (width < options.minWidth) {
    width = options.minWidth;
  }
  if (height < options.minHeight) {
    height = options.minHeight;
  }
  return {
    width: roundPixel(width),
    height: roundPixel(height),
  };
}

function scaleForPreview(viewport, preview) {
  if (!preview) return 1;
  let widthScale = numberOr(preview.width, 0) / viewport.width;
  let heightScale = numberOr(preview.height, 0) / viewport.height;
  let scale = Math.min(widthScale, heightScale);
  return roundMetric(scale > 0 ? scale : 1);
}

export function createXRPanelContentViewport(panel = {}, options = {}) {
  let size = asVector(panel.size, [1, 0.5625]);
  let aspectRatio = roundMetric(clamp(size[0] / Math.max(size[1], 0.000001), 0.35, 2.4));
  let viewport = fitViewportToAspect(aspectRatio, normalizeViewportOptions(options));
  let preview = options.previewPixels || options.preview || null;
  let scale = scaleForPreview(viewport, preview);
  return {
    width: viewport.width,
    height: viewport.height,
    aspectRatio,
    scale,
    density: roundMetric(clamp(scale * 6, 0.72, 1)),
    source: preview ? 'preview-fit' : 'panel-aspect',
  };
}

export function createXRPanelGeometrySummary(panel = {}, preview = null) {
  let size = asVector(panel.size, [0, 0]);
  let contentViewport = panel.contentViewport || createXRPanelContentViewport(panel, {
    previewPixels: previewSummary(preview),
  });
  return {
    panelId: String(panel.id || ''),
    component: panel.component || panel.panelType || 'panel',
    anchor: panel.anchor || '',
    sizeSource: panel.sizeSource || 'preset',
    relativeRect: rectSummary(panel.relativeRect),
    meters: {
      width: roundMetric(size[0]),
      height: roundMetric(size[1]),
    },
    previewPixels: previewSummary(preview),
    contentViewport,
    position: asVector(panel.position, [0, 0, 0]).map(roundMetric),
    rotation: asVector(panel.rotation, [0, 0, 0]).map(roundMetric),
  };
}
