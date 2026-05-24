/**
 * Export contract regression test for symbiote-node.
 *
 * The package has a Node-safe root API and an explicit browser UI entrypoint.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

import * as lib from '../index.js';
import * as core from '../core/index.js';
import * as engine from '../engine/index.js';
import * as graph from '../graph/index.js';
import * as layout from '../layout/index.js';
import * as manifest from '../manifest/index.js';

const ROOT_EXPORTS = [
  ['NodeEditor', 'function'],
  ['Node', 'function'],
  ['Connection', 'function'],
  ['Frame', 'function'],
  ['Socket', 'function'],
  ['Port', 'function'],
  ['Input', 'function'],
  ['Output', 'function'],
  ['Control', 'function'],
  ['InputControl', 'function'],
  ['uid', 'function'],
  ['editorToText', 'function'],
  ['textToGraph', 'function'],
  ['textToEditor', 'function'],
  ['editorToMermaid', 'function'],
  ['mermaidToGraph', 'function'],
  ['PortalManager', 'function'],
  ['SubgraphNode', 'function'],
  ['NodeShape', 'function'],
  ['RectShape', 'function'],
  ['PillShape', 'function'],
  ['CircleShape', 'function'],
  ['DiamondShape', 'function'],
  ['CommentShape', 'function'],
  ['getShape', 'function'],
  ['registerShape', 'function'],
  ['SVGShape', 'function'],
  ['createSVGShape', 'function'],
  ['SVG_PRESETS', 'object'],
  ['DARK_DEFAULT', 'object'],
  ['LIGHT_CLEAN', 'object'],
  ['SYNTHWAVE', 'object'],
  ['GREY_NEUTRAL', 'object'],
  ['NEON_GLOW', 'object'],
  ['DEFAULT_DARK', 'object'],
  ['DEFAULT_THEME', 'object'],
  ['DEFAULT_PROVIDER_THEME', 'object'],
  ['DARK_PALETTE', 'object'],
  ['LIGHT_PALETTE', 'object'],
  ['SYNTHWAVE_PALETTE', 'object'],
  ['GREY_PALETTE', 'object'],
  ['DEFAULT_DARK_PALETTE', 'object'],
  ['DEFAULT_PALETTE', 'object'],
  ['DEFAULT_PROVIDER_PALETTE', 'object'],
  ['MODERN_SKIN', 'object'],
  ['COMPACT_SKIN', 'object'],
  ['ROUNDED_SKIN', 'object'],
  ['GraphHistory', 'function'],
  ['Readonly', 'function'],
  ['History', 'function'],
  ['computeAutoLayout', 'function'],
  ['computeTreeLayout', 'function'],
  ['createCanvasGraphStore', 'function'],
  ['normalizeCanvasGraphModel', 'function'],
  ['computeInitialGraphPositions', 'function'],
  ['createForceLayoutPayload', 'function'],
  ['getDrillableFiles', 'function'],
  ['getGraphCacheKey', 'function'],
  ['getOrBuildGraph', 'function'],
  ['GRAPH_DIRECTORY_FRAME_COLORS', 'object'],
  ['GRAPH_PATH_STYLES', 'object'],
  ['GRAPH_CLUSTER_COLOR_TOKENS', 'object'],
  ['GRAPH_TYPE_COLOR_TOKENS', 'object'],
  ['HTML_IN_CANVAS_APIS', 'object'],
  ['HTML_IN_CANVAS_RENDERER', 'object'],
  ['HTML_IN_CANVAS_RENDERER_NAME', 'string'],
  ['addGraphDirectoryFrames', 'function'],
  ['captureHtmlElementImage', 'function'],
  ['closeHtmlElementImage', 'function'],
  ['getGraphPathStyleDisplay', 'function'],
  ['getNextGraphPathStyle', 'function'],
  ['resolveInitialGraphViewMode', 'function'],
  ['createHtmlInCanvasAdapter', 'function'],
  ['drawHtmlElement2d', 'function'],
  ['getHtmlInCanvasChangedElements', 'function'],
  ['getHtmlInCanvasSupport', 'function'],
  ['setupHtmlInCanvas', 'function'],
  ['WEBXR_RENDERER', 'object'],
  ['WEBXR_RENDERER_NAME', 'string'],
  ['WEBXR_MODES', 'object'],
  ['WEBXR_FEATURES', 'object'],
  ['createWebXRAdapter', 'function'],
  ['getWebXRSupport', 'function'],
  ['projectLayoutToXR', 'function'],
  ['createXRPanelContentViewport', 'function'],
  ['createXRSpatialScene', 'function'],
  ['createXRSpatialPreview', 'function'],
  ['createXRPanelGeometrySummary', 'function'],
  ['createXRSceneController', 'function'],
  ['createXRPanelHost', 'function'],
  ['createXRHtmlCanvasRenderer', 'function'],
  ['createXRThemeSnapshot', 'function'],
  ['applyXRThemeToPanel', 'function'],
  ['getXRThemeTokenMap', 'function'],
  ['XR_SPATIAL_SCENE_VERSION', 'string'],
  ['hitTestXRPanels', 'function'],
  ['createXRPointerEvent', 'function'],
  ['collectQuickOpenFilesFromSkeleton', 'function'],
  ['fuzzyScore', 'function'],
  ['searchQuickOpenItems', 'function'],
  ['normalizeOutputList', 'function'],
  ['normalizePreviewGraph', 'function'],
  ['normalizeGraphEndpoint', 'function'],
  ['normalizeGraphNode', 'function'],
  ['normalizeGraphEdge', 'function'],
  ['normalizeGraphModel', 'function'],
  ['graphModelToCanvasGraphModel', 'function'],
  ['canvasGraphModelToGraphModel', 'function'],
  ['normalizeProjectPackage', 'function'],
  ['normalizeProjectTransaction', 'function'],
  ['applyProjectTransaction', 'function'],
  ['createProjectRuntime', 'function'],
  ['getGraphClusterColorToken', 'function'],
  ['isGraphColorReference', 'function'],
  ['normalizeGraphColorReference', 'function'],
  ['CARBON', 'object'],
  ['CARBON_PALETTE', 'object'],
  ['PCB_DARK', 'object'],
  ['EBOOK', 'object'],
  ['EBOOK_PALETTE', 'object'],
  ['NEON_PALETTE', 'object'],
];

const UI_EXPORTS = [
  ['NodeCanvas', 'function'],
  ['CanvasGraph', 'function'],
  ['GraphExplorerShell', 'function'],
  ['GraphNode', 'function'],
  ['NodeSocket', 'function'],
  ['FocusController', 'function'],
  ['Drag', 'function'],
  ['Zoom', 'function'],
  ['Selector', 'function'],
  ['SnapGrid', 'function'],
  ['ConnectFlow', 'function'],
  ['QuickToolbar', 'function'],
  ['FlowSimulator', 'function'],
  ['InspectorPanel', 'function'],
  ['Minimap', 'function'],
  ['NodeSearch', 'function'],
  ['Layout', 'function'],
  ['LayoutNode', 'function'],
  ['LayoutSidebar', 'function'],
  ['ProjectTabs', 'function'],
  ['CodeBlock', 'function'],
  ['SourceViewer', 'function'],
  ['SourceEditor', 'function'],
  ['LoadingOverlay', 'function'],
  ['getSourceLanguage', 'function'],
  ['isDirectoryLikePath', 'function'],
  ['buildDirectoryInfo', 'function'],
  ['CellBg', 'function'],
  ['QuickOpen', 'function'],
  ['LayoutTree', 'object'],
  ['navigate', 'function'],
  ['updateParams', 'function'],
  ['parseQuery', 'function'],
  ['buildHash', 'function'],
  ['buildQuery', 'function'],
  ['getRoute', 'function'],
  ['setDefaultPanel', 'function'],
  ['registerGlobalParam', 'function'],
  ['setGlobalParam', 'function'],
  ['syncWithRouter', 'function'],
  ['setupPanelRouting', 'function'],
  ['SECTION_SCOPES', 'object'],
  ['SectionRegistry', 'function'],
  ['createSectionRegistry', 'function'],
  ['withGlobalPanel', 'function'],
  ['registerSection', 'function'],
  ['getSections', 'function'],
  ['getSectionsForScope', 'function'],
  ['getLayout', 'function'],
  ['hasSection', 'function'],
  ['PaletteBrowser', 'function'],
  ['GraphTabs', 'function'],
  ['SubgraphManager', 'function'],
  ['SubgraphRouter', 'function'],
  ['Breadcrumb', 'function'],
  ['ChatMessageItem', 'function'],
  ['ChatTranscript', 'function'],
  ['ChatComposer', 'function'],
  ['ChatList', 'function'],
  ['ChatListItem', 'function'],
  ['ChatSidebarShell', 'function'],
  ['ChatSidebarItem', 'function'],
  ['ChatSidebarSubItem', 'function'],
  ['ListItem', 'function'],
  ['TreeView', 'function'],
  ['TreePanel', 'function'],
  ['ActionButton', 'function'],
  ['FormField', 'function'],
  ['SurfaceCard', 'function'],
  ['StatusBadge', 'function'],
  ['MetricItem', 'function'],
  ['DataTable', 'function'],
  ['EventFeed', 'function'],
  ['StatusBanner', 'function'],
  ['EmptyState', 'function'],
  ['OutputListPreview', 'function'],
  ['OutputGraphPreview', 'function'],
  ['sharedUiStyles', 'string'],
  ['escapeHtml', 'function'],
  ['uiAlert', 'function'],
  ['uiConfirm', 'function'],
  ['uiPrompt', 'function'],
  ['bindListItemSelect', 'function'],
  ['collapseTree', 'function'],
  ['highlightTreePath', 'function'],
  ['setTreeItems', 'function'],
  ['setupTreePanel', 'function'],
  ['showTree', 'function'],
  ['showTreePlaceholder', 'function'],
  ['syncListItem', 'function'],
  ['syncTreeFilter', 'function'],
  ['clampChatSidebarWidth', 'function'],
  ['buildChatMessageItems', 'function'],
  ['buildSessionMetaHtml', 'function'],
  ['buildWorkMetaHtml', 'function'],
  ['buildWorkSummaryHtml', 'function'],
  ['findPreviousAgentText', 'function'],
  ['toChatMessageItem', 'function'],
  ['stringifyBlock', 'function'],
  ['truncateResult', 'function'],
  ['registerModule', 'function'],
  ['getModule', 'function'],
  ['listModules', 'function'],
  ['defineModule', 'function'],
  ['LODManager', 'function'],
  ['PinExpansion', 'function'],
  ['ForceLayout', 'function'],
  ['createCanvasGraphStore', 'function'],
  ['normalizeCanvasGraphModel', 'function'],
  ['computeInitialGraphPositions', 'function'],
  ['createForceLayoutPayload', 'function'],
  ['getDrillableFiles', 'function'],
  ['getGraphCacheKey', 'function'],
  ['getOrBuildGraph', 'function'],
  ['GRAPH_DIRECTORY_FRAME_COLORS', 'object'],
  ['GRAPH_PATH_STYLES', 'object'],
  ['GRAPH_CLUSTER_COLOR_TOKENS', 'object'],
  ['GRAPH_TYPE_COLOR_TOKENS', 'object'],
  ['HTML_IN_CANVAS_APIS', 'object'],
  ['HTML_IN_CANVAS_RENDERER', 'object'],
  ['HTML_IN_CANVAS_RENDERER_NAME', 'string'],
  ['addGraphDirectoryFrames', 'function'],
  ['captureHtmlElementImage', 'function'],
  ['closeHtmlElementImage', 'function'],
  ['getGraphPathStyleDisplay', 'function'],
  ['getNextGraphPathStyle', 'function'],
  ['renderGraphPathStyleButton', 'function'],
  ['renderGraphViewModeButton', 'function'],
  ['resolveInitialGraphViewMode', 'function'],
  ['setGraphLayerVisible', 'function'],
  ['toggleGraphLayerButtonState', 'function'],
  ['getGraphClusterColorToken', 'function'],
  ['isGraphColorReference', 'function'],
  ['normalizeGraphColorReference', 'function'],
  ['copyHtmlElementToWebGPUTexture', 'function'],
  ['createHtmlInCanvasAdapter', 'function'],
  ['drawHtmlElement2d', 'function'],
  ['getHtmlInCanvasChangedElements', 'function'],
  ['getHtmlElementCanvasTransform', 'function'],
  ['getHtmlInCanvasSupport', 'function'],
  ['requestHtmlInCanvasPaint', 'function'],
  ['setupHtmlInCanvas', 'function'],
  ['uploadHtmlElementToWebGLTexture', 'function'],
  ['WEBXR_RENDERER', 'object'],
  ['WEBXR_RENDERER_NAME', 'string'],
  ['WEBXR_MODES', 'object'],
  ['WEBXR_FEATURES', 'object'],
  ['createWebXRAdapter', 'function'],
  ['getWebXRSupport', 'function'],
  ['projectLayoutToXR', 'function'],
  ['createXRPanelContentViewport', 'function'],
  ['createXRSpatialScene', 'function'],
  ['createXRSpatialPreview', 'function'],
  ['createXRPanelGeometrySummary', 'function'],
  ['createXRSceneController', 'function'],
  ['createXRPanelHost', 'function'],
  ['createXRHtmlCanvasRenderer', 'function'],
  ['createXRThemeSnapshot', 'function'],
  ['applyXRThemeToPanel', 'function'],
  ['getXRThemeTokenMap', 'function'],
  ['XR_SPATIAL_SCENE_VERSION', 'string'],
  ['hitTestXRPanels', 'function'],
  ['createXRPointerEvent', 'function'],
];

const ENGINE_EXPORTS = [
  ['Graph', 'function'],
  ['Executor', 'function'],
  ['GraphHistory', 'function'],
  ['nanoid', 'function'],
  ['registerNodeType', 'function'],
  ['registerPack', 'function'],
  ['getNodeType', 'function'],
  ['listDrivers', 'function'],
  ['findCompatible', 'function'],
  ['findByCapability', 'function'],
  ['getNodeMenu', 'function'],
  ['registerCustomDrivers', 'function'],
  ['validateParams', 'function'],
  ['listPacks', 'function'],
  ['clearRegistry', 'function'],
  ['registerSocketType', 'function'],
  ['registerSocketTypes', 'function'],
  ['getSocketType', 'function'],
  ['getAllSocketTypes', 'function'],
  ['areSocketsCompatible', 'function'],
  ['serialize', 'function'],
  ['deserialize', 'function'],
  ['saveToFile', 'function'],
  ['loadFromFile', 'function'],
  ['runLifecycle', 'function'],
  ['loadHandlers', 'function'],
  ['watchHandlers', 'function'],
  ['AgentUI', 'object'],
];

const MANIFEST_EXPORTS = [
  ['COMPONENTS', 'object'],
  ['listComponents', 'function'],
  ['getComponent', 'function'],
  ['hasComponent', 'function'],
  ['getComponentModule', 'function'],
  ['getComponentTags', 'function'],
  ['THEME_NAMES', 'object'],
  ['TOKEN_FILES', 'object'],
  ['THEME_CONTROLS', 'object'],
  ['THEME_ELEMENT_GROUPS', 'object'],
  ['listThemes', 'function'],
  ['getTheme', 'function'],
  ['getThemeTokens', 'function'],
  ['getThemeCssTokens', 'function'],
  ['getThemeRecipe', 'function'],
  ['getThemeControls', 'function'],
  ['getThemeRuleBlocks', 'function'],
  ['listThemeElementGroups', 'function'],
  ['listTokenFiles', 'function'],
  ['flattenTokens', 'function'],
  ['RULESETS', 'object'],
  ['listRuleSets', 'function'],
  ['getRuleSet', 'function'],
  ['listRules', 'function'],
  ['getRule', 'function'],
  ['GRAPH_SCHEMA_VERSIONS', 'object'],
  ['getGraphSchema', 'function'],
  ['listGraphVersions', 'function'],
  ['PROJECT_SCHEMA_VERSIONS', 'object'],
  ['getProjectSchema', 'function'],
  ['listProjectSchemaVersions', 'function'],
];

const GRAPH_EXPORTS = [
  ['normalizeGraphEndpoint', 'function'],
  ['normalizeGraphNode', 'function'],
  ['normalizeGraphEdge', 'function'],
  ['normalizeGraphModel', 'function'],
  ['graphModelToCanvasGraphModel', 'function'],
  ['canvasGraphModelToGraphModel', 'function'],
  ['normalizeProjectPackage', 'function'],
  ['normalizeProjectTransaction', 'function'],
  ['applyProjectTransaction', 'function'],
  ['createProjectRuntime', 'function'],
  ['GRAPH_CLUSTER_COLOR_TOKENS', 'object'],
  ['GRAPH_TYPE_COLOR_TOKENS', 'object'],
  ['getGraphClusterColorToken', 'function'],
  ['isGraphColorReference', 'function'],
  ['normalizeGraphColorReference', 'function'],
];

const LAYOUT_EXPORTS = [
  ['LayoutTree', 'object'],
  ['navigate', 'function'],
  ['updateParams', 'function'],
  ['parseQuery', 'function'],
  ['buildHash', 'function'],
  ['buildQuery', 'function'],
  ['getRoute', 'function'],
  ['setDefaultPanel', 'function'],
  ['registerGlobalParam', 'function'],
  ['setGlobalParam', 'function'],
  ['syncWithRouter', 'function'],
  ['setupPanelRouting', 'function'],
  ['SECTION_SCOPES', 'object'],
  ['SectionRegistry', 'function'],
  ['createSectionRegistry', 'function'],
  ['normalizeSectionScope', 'function'],
  ['sectionMatchesScope', 'function'],
  ['withGlobalPanel', 'function'],
  ['registerSection', 'function'],
  ['getSection', 'function'],
  ['getSections', 'function'],
  ['getHomeSections', 'function'],
  ['getProjectSections', 'function'],
  ['getSectionsForScope', 'function'],
  ['getLayout', 'function'],
  ['hasSection', 'function'],
  ['clearSections', 'function'],
];

describe('symbiote-node root exports', () => {
  for (const [name, kind] of ROOT_EXPORTS) {
    it(`${name} is exported`, () => {
      assert.equal(typeof lib[name], kind, `${name} must be ${kind}`);
    });
  }

  for (const name of [
    'NodeCanvas',
    'CanvasGraph',
    'Layout',
    'GraphNode',
    'NodeSocket',
    'renderGraphPathStyleButton',
    'renderGraphViewModeButton',
    'setGraphLayerVisible',
    'toggleGraphLayerButtonState',
  ]) {
    it(`${name} is not exported from Node-safe root`, () => {
      assert.equal(lib[name], undefined);
    });
  }
});

describe('symbiote-node core exports', () => {
  for (const [name, kind] of ROOT_EXPORTS.filter(([name]) => name in core)) {
    it(`${name} is exported from core`, () => {
      assert.equal(typeof core[name], kind, `${name} must be ${kind}`);
    });
  }
});

describe('symbiote-node UI exports', () => {
  let ui;

  before(async () => {
    globalThis.HTMLElement = class {};
    globalThis.window = globalThis;
    globalThis.CSSStyleSheet = class {
      replaceSync(cssText) {
        this.cssText = cssText;
      }
    };
    globalThis.customElements = {
      define() {},
      get() {},
    };
    globalThis.document = { createElement() { return {}; } };
    ui = await import('../ui/index.js');
  });

  after(() => {
    delete globalThis.HTMLElement;
    delete globalThis.window;
    delete globalThis.CSSStyleSheet;
    delete globalThis.customElements;
    delete globalThis.document;
  });

  for (const [name, kind] of [...ROOT_EXPORTS, ...UI_EXPORTS]) {
    it(`${name} is exported from UI entrypoint`, () => {
      assert.equal(typeof ui[name], kind, `${name} must be ${kind}`);
    });
  }

  it('exposes graph history separately from plugin history', () => {
    assert.equal(ui.GraphHistory, engine.GraphHistory);
    assert.notEqual(ui.History, ui.GraphHistory);
  });

  it('uses default dark as the default theme and palette', () => {
    assert.equal(ui.DEFAULT_THEME, ui.DEFAULT_DARK);
    assert.equal(ui.DEFAULT_PROVIDER_THEME, ui.DEFAULT_DARK);
    assert.equal(ui.DEFAULT_PALETTE, ui.DEFAULT_DARK_PALETTE);
    assert.equal(ui.DEFAULT_PROVIDER_PALETTE, ui.DEFAULT_DARK_PALETTE);
    assert.equal(ui.DEFAULT_THEME.tokens['--sn-theme-hue'], '218');
    assert.equal(ui.DEFAULT_THEME.tokens['--sn-hue-accent'], 'var(--sn-theme-hue)');
    assert.equal(ui.DEFAULT_THEME.tokens['--sn-panel-bg'], 'hsl(0 0% var(--sn-lit-surface))');
    assert.equal(ui.DEFAULT_THEME.tokens['--sn-layout-gap-bg'], 'transparent');
    assert.equal(ui.DEFAULT_THEME.tokens['--sn-layout-border'], 'transparent');
    assert.equal(ui.DEFAULT_THEME.tokens['--sn-tree-row-min-height'], 'calc(22px * var(--sn-theme-density))');
    assert.equal(ui.DEFAULT_THEME.tokens['--sn-composer-bg'], 'var(--sn-node-bg)');
    assert.equal(ui.DEFAULT_THEME.tokens['--sn-tabs-active-bg'], 'var(--sn-node-bg)');
    assert.equal(ui.DEFAULT_THEME.tokens['--sn-bg-overlay'], 'hsl(var(--sn-hue-base) var(--sn-sat-muted) 0% / 0.45)');
    assert.equal(ui.DEFAULT_THEME.tokens['--border-color'], 'var(--sn-node-border)');
  });
});

describe('symbiote-node engine exports', () => {
  for (const [name, kind] of ENGINE_EXPORTS) {
    it(`${name} is exported`, () => {
      assert.equal(typeof engine[name], kind, `${name} must be ${kind}`);
    });
  }

  it('keeps graph history explicit in the engine entrypoint', () => {
    assert.equal(engine.GraphHistory.name, 'GraphHistory');
    assert.equal(Object.hasOwn(engine, 'History'), false);
  });
});

describe('symbiote-node graph exports', () => {
  for (const [name, kind] of GRAPH_EXPORTS) {
    it(`${name} is exported`, () => {
      assert.equal(typeof graph[name], kind, `${name} must be ${kind}`);
    });
  }
});

describe('symbiote-node manifest exports', () => {
  for (const [name, kind] of MANIFEST_EXPORTS) {
    it(`${name} is exported`, () => {
      assert.equal(typeof manifest[name], kind, `${name} must be ${kind}`);
    });
  }
});

describe('symbiote-node layout exports', () => {
  for (const [name, kind] of LAYOUT_EXPORTS) {
    it(`${name} is exported`, () => {
      assert.equal(typeof layout[name], kind, `${name} must be ${kind}`);
    });
  }

  it('keeps browser components out of the SSR-safe layout entrypoint', () => {
    assert.equal(layout.Layout, undefined);
    assert.equal(layout.ProjectTabs, undefined);
  });
});

describe('Instantiable classes', () => {
  let instantiable = [
    ['NodeEditor', lib.NodeEditor],
    ['Graph', engine.Graph],
    ['Executor', engine.Executor],
  ];

  for (const [clsName, Cls] of instantiable) {
    it(`${clsName} can be instantiated without error`, () => {
      assert.doesNotThrow(() => new Cls(), `${clsName} constructor must not throw`);
    });
  }
});
