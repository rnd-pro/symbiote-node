/**
 * symbiote-node — Node-safe public library API.
 *
 * Browser components live in the explicit `symbiote-node/ui` entrypoint.
 */

export * from './core/index.js';

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
  applyTheme,
  extractTheme,
  DARK_DEFAULT,
  LIGHT_CLEAN,
  SYNTHWAVE,
  GREY_NEUTRAL,
  NEON_GLOW,
  AGENT_PORTAL,
  DEFAULT_THEME,
} from './themes/Theme.js';

export {
  applyPalette,
  DARK_PALETTE,
  LIGHT_PALETTE,
  SYNTHWAVE_PALETTE,
  GREY_PALETTE,
  AGENT_PORTAL_PALETTE,
  DEFAULT_PALETTE,
} from './themes/Palette.js';

export { applySkin, MODERN_SKIN, COMPACT_SKIN, ROUNDED_SKIN } from './themes/Skin.js';
export { GraphHistory } from './engine/History.js';
export { Readonly } from './plugins/Readonly.js';
export { History } from './plugins/History.js';
export { computeAutoLayout, computeTreeLayout } from './canvas/AutoLayout.js';
export { ForceLayout } from './canvas/ForceLayout.js';
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
export { collectQuickOpenFilesFromSkeleton, fuzzyScore, searchQuickOpenItems } from './navigation/quick-open-utils.js';
export { normalizeOutputList, normalizePreviewGraph } from './display/output-preview.js';

export { CARBON, CARBON_PALETTE } from './themes/carbon.js';
export { PCB_DARK } from './themes/pcb.js';
export { EBOOK, EBOOK_PALETTE } from './themes/ebook.js';
export { NEON_PALETTE } from './themes/neon.js';
