import {
  adjustXRPanelPoseForComfort,
  adjustXRPanelRotationForViewer,
  createXRPanelContentViewport,
  projectLayoutToXR,
} from './layout-projection.js';

export const XR_SPATIAL_SCENE_VERSION = 'xr-spatial-scene-v1';

export const XR_SPATIAL_SPACE = Object.freeze({
  localFloor: 'webxr-local-floor',
  viewer: 'webxr-viewer',
});

const DEFAULT_USER_SPACE = Object.freeze({
  eyeHeight: 1.6,
  comfortRadius: 1.8,
  near: 0.35,
  far: 3.6,
});

const DEFAULT_PREVIEW = Object.freeze({
  renderer: 'dom-perspective-preview',
  pixelsPerMeter: 118,
  origin: [0.5, 0.5],
});

function numberOr(value, fallback) {
  let number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function vectorOr(value, fallback) {
  if (!Array.isArray(value)) return [...fallback];
  return fallback.map((item, index) => numberOr(value[index], item));
}

function normalizeUserSpace(input = {}) {
  return {
    eyeHeight: numberOr(input.eyeHeight, DEFAULT_USER_SPACE.eyeHeight),
    comfortRadius: numberOr(input.comfortRadius, DEFAULT_USER_SPACE.comfortRadius),
    near: numberOr(input.near, DEFAULT_USER_SPACE.near),
    far: numberOr(input.far, DEFAULT_USER_SPACE.far),
  };
}

function normalizePreview(input = {}) {
  return {
    renderer: input.renderer || DEFAULT_PREVIEW.renderer,
    pixelsPerMeter: numberOr(input.pixelsPerMeter, DEFAULT_PREVIEW.pixelsPerMeter),
    origin: vectorOr(input.origin, DEFAULT_PREVIEW.origin),
  };
}

export function createXRSpatialScene(root, options = {}) {
  let layout = projectLayoutToXR(root, options);
  let userSpace = normalizeUserSpace(options.userSpace);
  let preview = normalizePreview(options.preview);

  return {
    version: XR_SPATIAL_SCENE_VERSION,
    unit: 'meter',
    coordinateSystem: options.coordinateSystem || XR_SPATIAL_SPACE.localFloor,
    origin: {
      type: 'viewer',
      position: vectorOr(options.origin?.position, [0, 0, 0]),
      rotation: vectorOr(options.origin?.rotation, [0, 0, 0]),
    },
    userSpace,
    preview,
    layout,
    panels: layout.panels.map((sourcePanel) => {
      let panel = options.adjustComfort === false
        ? sourcePanel
        : adjustXRPanelPoseForComfort(sourcePanel, { userSpace });
      panel = options.adjustFacing === false
        ? panel
        : adjustXRPanelRotationForViewer(panel, { userSpace });
      let previewPixels = {
        width: panel.size[0] * preview.pixelsPerMeter,
        height: panel.size[1] * preview.pixelsPerMeter,
      };
      return {
        ...panel,
        contentViewport: createXRPanelContentViewport(panel, { previewPixels }),
        spatialRole: panel.anchor === 'front' ? 'primary-surface' : 'support-surface',
        distanceFromUser: Math.abs(panel.position[2] || 0),
      };
    }),
    interaction: {
      pointerModel: 'ray-to-panel-normalized',
      eventSpace: 'panel-normalized-0-1',
      supportsMouseFallback: true,
    },
    themeScope: options.themeScope || layout.themeScope,
  };
}

export function createXRSpatialPreview(panel, scene, options = {}) {
  let pixelsPerMeter = numberOr(options.pixelsPerMeter, scene?.preview?.pixelsPerMeter || DEFAULT_PREVIEW.pixelsPerMeter);
  let depthScale = numberOr(options.depthScale, 1);
  let eyeHeight = numberOr(scene?.userSpace?.eyeHeight, DEFAULT_USER_SPACE.eyeHeight);
  let left = panel.position[0] * pixelsPerMeter;
  let top = (eyeHeight - panel.position[1]) * pixelsPerMeter;
  let depth = panel.position[2] * pixelsPerMeter * depthScale;

  return {
    panelId: panel.id,
    left,
    top,
    depth,
    width: panel.size[0] * pixelsPerMeter,
    height: panel.size[1] * pixelsPerMeter,
    opacity: panel.opacity,
    transform: [
      `translate3d(calc(-50% + ${left}px), calc(-50% + ${top}px), ${depth}px)`,
      `rotateX(${panel.rotation[0]}deg)`,
      `rotateY(${panel.rotation[1]}deg)`,
      `rotateZ(${panel.rotation[2]}deg)`,
    ].join(' '),
  };
}
