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

function numberOr(value, fallback) {
  let number = Number(value);
  return Number.isFinite(number) ? number : fallback;
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

export function normalizeXRPanel(panel = {}, options = {}) {
  let presetName = panel.xr?.preset ||
    (XR_LAYOUT_PRESETS[panel.xr?.anchor] ? panel.xr.anchor : inferPreset(panel, options.index || 0, options.total || 1));
  let preset = XR_LAYOUT_PRESETS[presetName] || XR_LAYOUT_PRESETS.front;
  let xr = panel.xr || {};

  return {
    id: String(panel.id || `xr-panel-${options.index || 0}`),
    panelType: panel.panelType || panel.component || 'panel',
    component: panel.component || panel.panelState?.component || panel.panelType || 'panel',
    anchor: xr.anchor || presetName,
    position: asVector(xr.position, preset.position),
    rotation: asVector(xr.rotation, preset.rotation),
    size: asVector(xr.size, preset.size),
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
  let projectedPanels = panels
    .map((panel, index) => normalizeXRPanel(panel, { ...options, index, total: panels.length }))
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
