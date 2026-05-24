/**
 * symbiote-node — Node-safe public library API.
 *
 * Browser components live in the explicit `symbiote-node/ui` entrypoint.
 */

export * from './core/index.js';
export * from './graph/index.js';

export {
  NodeShape,
  RectShape,
  PillShape,
  CircleShape,
  DiamondShape,
  CommentShape,
  getShape,
  registerShape,
  SVGShape,
  createSVGShape,
  SVG_PRESETS,
} from './shapes/index.js';

export {
  DARK_DEFAULT,
  LIGHT_CLEAN,
  SYNTHWAVE,
  GREY_NEUTRAL,
  NEON_GLOW,
  DEFAULT_DARK,
  DEFAULT_THEME,
  DEFAULT_PROVIDER_THEME,
} from './themes/Theme.js';

export {
  DARK_PALETTE,
  LIGHT_PALETTE,
  SYNTHWAVE_PALETTE,
  GREY_PALETTE,
  DEFAULT_DARK_PALETTE,
  DEFAULT_PALETTE,
  DEFAULT_PROVIDER_PALETTE,
} from './themes/Palette.js';

export { MODERN_SKIN, COMPACT_SKIN, ROUNDED_SKIN } from './themes/Skin.js';
export { GraphHistory } from './engine/History.js';
export { Readonly } from './plugins/Readonly.js';
export { History } from './plugins/History.js';
export { computeAutoLayout, computeTreeLayout } from './canvas/AutoLayout.js';
export {
  createCanvasGraphStore,
  normalizeCanvasGraphModel,
} from './canvas/graph-model.js';
export {
  computeInitialGraphPositions,
  createForceLayoutPayload,
  findForceNodeGroup,
  getDrillableFiles,
  getForceLayoutOptions,
  getGraphCacheKey,
  getOrBuildGraph,
} from './canvas/graph-layout.js';
export {
  GRAPH_DIRECTORY_FRAME_COLORS,
  GRAPH_PATH_STYLES,
  addGraphDirectoryFrames,
  getGraphPathStyleDisplay,
  getNextGraphPathStyle,
  resolveInitialGraphViewMode,
} from './canvas/graph-explorer.js';
export { buildFileGraph, buildStructuredGraph } from './canvas/project-graph-builder.js';
export { buildGraphModelFromSkeleton, buildCanvasGraphModelFromSkeleton } from './canvas/project-graph-model.js';
export { collectQuickOpenFilesFromSkeleton, fuzzyScore, searchQuickOpenItems } from './navigation/quick-open-utils.js';
export { normalizeOutputList, normalizePreviewGraph } from './display/output-preview.js';

export { CARBON, CARBON_PALETTE } from './themes/carbon.js';
export { PCB_DARK } from './themes/pcb.js';
export { EBOOK, EBOOK_PALETTE } from './themes/ebook.js';
export { NEON_PALETTE } from './themes/neon.js';
