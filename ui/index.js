/**
 * Browser/UI API for symbiote-node.
 *
 * Import this entrypoint in applications that need Web Components, layout
 * widgets, router helpers, panels, and browser canvas modules.
 */

export * from '../core/index.js';
export * from '../graph/index.js';

export { Drag } from '../interactions/Drag.js';
export { Zoom } from '../interactions/Zoom.js';
export { Selector } from '../interactions/Selector.js';
export { SnapGrid } from '../interactions/SnapGrid.js';
export { ConnectFlow } from '../interactions/ConnectFlow.js';

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
} from '../shapes/index.js';

export {
  applyTheme,
  extractTheme,
  DARK_DEFAULT,
  LIGHT_CLEAN,
  SYNTHWAVE,
  GREY_NEUTRAL,
  NEON_GLOW,
  DEFAULT_DARK,
  DEFAULT_THEME,
} from '../themes/Theme.js';

export {
  applyPalette,
  DARK_PALETTE,
  LIGHT_PALETTE,
  SYNTHWAVE_PALETTE,
  GREY_PALETTE,
  DEFAULT_DARK_PALETTE,
  DEFAULT_PALETTE,
} from '../themes/Palette.js';

export { applySkin, MODERN_SKIN, COMPACT_SKIN, ROUNDED_SKIN } from '../themes/Skin.js';

export { GraphHistory } from '../engine/History.js';
export { Readonly } from '../plugins/Readonly.js';
export { History } from '../plugins/History.js';

export { FlowSimulator } from '../canvas/FlowSimulator.js';
export * as LayoutTree from '../layout/LayoutTree.js';
export {
  SECTION_SCOPES,
  SectionRegistry,
  createSectionRegistry,
  normalizeSectionScope,
  sectionMatchesScope,
  withGlobalPanel,
  registerSection,
  getSection,
  getSections,
  getHomeSections,
  getProjectSections,
  getSectionsForScope,
  getLayout,
  hasSection,
  clearSections,
} from '../layout/LayoutRouter/SectionRegistry.js';
export { computeAutoLayout, computeTreeLayout } from '../canvas/AutoLayout.js';
export { SubgraphManager } from '../canvas/SubgraphManager.js';
export { SubgraphRouter } from '../canvas/SubgraphRouter.js';
export { LODManager } from '../canvas/LODManager.js';
export { PinExpansion } from '../canvas/PinExpansion.js';
export { ForceLayout } from '../canvas/ForceLayout.js';
export {
  createCanvasGraphStore,
  normalizeCanvasGraphModel,
} from '../canvas/graph-model.js';
export {
  computeInitialGraphPositions,
  createForceLayoutPayload,
  findForceNodeGroup,
  getDrillableFiles,
  getForceLayoutOptions,
  getGraphCacheKey,
  getOrBuildGraph,
} from '../canvas/graph-layout.js';
export {
  GRAPH_DIRECTORY_FRAME_COLORS,
  GRAPH_PATH_STYLES,
  addGraphDirectoryFrames,
  getGraphPathStyleDisplay,
  getNextGraphPathStyle,
  renderGraphPathStyleButton,
  renderGraphViewModeButton,
  resolveInitialGraphViewMode,
  setGraphLayerVisible,
  toggleGraphLayerButtonState,
} from '../canvas/graph-explorer.js';

export { CARBON, CARBON_PALETTE } from '../themes/carbon.js';
export { PCB_DARK } from '../themes/pcb.js';
export { EBOOK, EBOOK_PALETTE } from '../themes/ebook.js';
export { NEON_PALETTE } from '../themes/neon.js';

export let NodeCanvas;
export let CanvasGraph;
export let GraphExplorerShell;
export let ContextMenu;
export let GraphNode;
export let GraphFrame;
export let NodeSocket;
export let QuickToolbar;
export let InspectorPanel;
export let Minimap;
export let NodeSearch;
export let Layout;
export let LayoutNode;
export let LayoutSidebar;
export let ProjectTabs;
export let CodeBlock;
export let SourceViewer;
export let SourceEditor;
export let LoadingOverlay;
export let getSourceLanguage;
export let isDirectoryLikePath;
export let buildDirectoryInfo;
export let QuickOpen;
export let navigate;
export let updateParams;
export let parseQuery;
export let buildHash;
export let buildQuery;
export let getRoute;
export let setDefaultPanel;
export let registerGlobalParam;
export let setGlobalParam;
export let syncWithRouter;
export let setupPanelRouting;
export let PaletteBrowser;
export let GraphTabs;
export let Breadcrumb;
export let CellBg;
export let ChatMessageItem;
export let ChatTranscript;
export let ChatComposer;
export let ChatList;
export let ChatListItem;
export let ChatSidebarShell;
export let ChatSidebarItem;
export let ChatSidebarSubItem;
export let ListItem;
export let TreeView;
export let TreePanel;
export let ActionButton;
export let FormField;
export let SurfaceCard;
export let OutputListPreview;
export let OutputGraphPreview;
export let stringifyBlock;
export let truncateResult;
export { sharedUiStyles } from './shared-styles.js';
export { escapeHtml } from '../display/markdown-formatter.js';
export { normalizeOutputList, normalizePreviewGraph } from '../display/output-preview.js';
export { uiAlert, uiConfirm, uiPrompt } from './dialogs.js';
export {
  bindListItemSelect,
  collapseTree,
  highlightTreePath,
  setTreeItems,
  setupTreePanel,
  showTree,
  showTreePlaceholder,
  syncListItem,
  syncTreeFilter,
} from './host-adapters.js';
export {
  buildChatMessageItems,
  buildSessionMetaHtml,
  buildWorkMetaHtml,
  buildWorkSummaryHtml,
  findPreviousAgentText,
  toChatMessageItem,
} from '../chat/message-model.js';
export { collectQuickOpenFilesFromSkeleton, fuzzyScore, searchQuickOpenItems } from '../navigation/quick-open-utils.js';

const hasDOMGlobals =
  typeof window !== 'undefined' &&
  typeof document !== 'undefined' &&
  typeof HTMLElement !== 'undefined' &&
  typeof customElements !== 'undefined';

if (hasDOMGlobals) {
  const [
    nodeCanvas,
    canvasGraph,
    graphExplorerShell,
    contextMenu,
    graphNode,
    graphFrame,
    nodeSocket,
    quickToolbar,
    inspectorPanel,
    minimap,
    nodeSearch,
    layout,
    layoutNode,
    layoutSidebar,
    projectTabs,
    codeBlock,
    sourceViewer,
    sourceEditor,
    loadingOverlay,
    quickOpen,
    layoutRouter,
    routerSync,
    paletteBrowser,
    graphTabs,
    breadcrumb,
    cellBg,
    chatMessageItem,
    chatTranscript,
    chatComposer,
    chatList,
    chatListItem,
    chatSidebar,
    chatSidebarItem,
    listItem,
    treeView,
    treePanel,
    actionButton,
    formField,
    surfaceCard,
    outputListPreview,
    outputGraphPreview,
  ] = await Promise.all([
    import('../canvas/NodeCanvas/NodeCanvas.js'),
    import('../canvas/CanvasGraph/CanvasGraph.js'),
    import('../canvas/GraphExplorerShell/GraphExplorerShell.js'),
    import('../menu/ContextMenu/ContextMenu.js'),
    import('../node/GraphNode/GraphNode.js'),
    import('../node/GraphFrame/GraphFrame.js'),
    import('../node/NodeSocket/NodeSocket.js'),
    import('../toolbar/QuickToolbar/QuickToolbar.js'),
    import('../inspector/InspectorPanel/InspectorPanel.js'),
    import('../canvas/Minimap/Minimap.js'),
    import('../canvas/NodeSearch/NodeSearch.js'),
    import('../layout/Layout/Layout.js'),
    import('../layout/LayoutNode/LayoutNode.js'),
    import('../layout/LayoutSidebar/LayoutSidebar.js'),
    import('../layout/ProjectTabs/ProjectTabs.js'),
    import('../display/CodeBlock/CodeBlock.js'),
    import('../display/SourceViewer/SourceViewer.js'),
    import('../display/SourceEditor/SourceEditor.js'),
    import('../display/LoadingOverlay/LoadingOverlay.js'),
    import('../navigation/QuickOpen/QuickOpen.js'),
    import('../layout/LayoutRouter/LayoutRouter.js'),
    import('../layout/LayoutRouter/routerSync.js'),
    import('../palette/PaletteBrowser/PaletteBrowser.js'),
    import('../canvas/GraphTabs/GraphTabs.js'),
    import('../canvas/Breadcrumb/Breadcrumb.js'),
    import('../effects/CellBg/CellBg.js'),
    import('../chat/ChatMessageItem/ChatMessageItem.js'),
    import('../chat/ChatTranscript/ChatTranscript.js'),
    import('../chat/ChatComposer/ChatComposer.js'),
    import('../chat/ChatList/ChatList.js'),
    import('../chat/ChatListItem/ChatListItem.js'),
    import('../chat/ChatSidebar/ChatSidebar.js'),
    import('../chat/ChatSidebarItem/ChatSidebarItem.js'),
    import('../list/ListItem/ListItem.js'),
    import('../tree/TreeView/TreeView.js'),
    import('../tree/TreePanel/TreePanel.js'),
    import('../control/Button/Button.js'),
    import('../control/Field/Field.js'),
    import('../surface/Card/Card.js'),
    import('../display/OutputListPreview/OutputListPreview.js'),
    import('../display/OutputGraphPreview/OutputGraphPreview.js'),
  ]);

  ({ NodeCanvas } = nodeCanvas);
  ({ CanvasGraph } = canvasGraph);
  ({ GraphExplorerShell } = graphExplorerShell);
  ({ ContextMenu } = contextMenu);
  ({ GraphNode } = graphNode);
  ({ GraphFrame } = graphFrame);
  ({ NodeSocket } = nodeSocket);
  ({ QuickToolbar } = quickToolbar);
  ({ InspectorPanel } = inspectorPanel);
  ({ Minimap } = minimap);
  ({ NodeSearch } = nodeSearch);
  ({ Layout } = layout);
  ({ LayoutNode } = layoutNode);
  ({ LayoutSidebar } = layoutSidebar);
  ({ ProjectTabs } = projectTabs);
  ({ CodeBlock } = codeBlock);
  ({ SourceViewer, getSourceLanguage, isDirectoryLikePath, buildDirectoryInfo } = sourceViewer);
  ({ SourceEditor } = sourceEditor);
  ({ LoadingOverlay } = loadingOverlay);
  ({ QuickOpen } = quickOpen);
  ({
    navigate,
    updateParams,
    parseQuery,
    buildHash,
    buildQuery,
    getRoute,
    setDefaultPanel,
    registerGlobalParam,
    setGlobalParam,
  } = layoutRouter);
  ({ syncWithRouter, setupPanelRouting } = routerSync);
  ({ PaletteBrowser } = paletteBrowser);
  ({ GraphTabs } = graphTabs);
  ({ Breadcrumb } = breadcrumb);
  ({ CellBg } = cellBg);
  ({ ChatMessageItem, stringifyBlock, truncateResult } = chatMessageItem);
  ({ ChatTranscript } = chatTranscript);
  ({ ChatComposer } = chatComposer);
  ({ ChatList } = chatList);
  ({ ChatListItem } = chatListItem);
  ({ ChatSidebarShell } = chatSidebar);
  ({ ChatSidebarItem, ChatSidebarSubItem } = chatSidebarItem);
  ({ ListItem } = listItem);
  ({ TreeView } = treeView);
  ({ TreePanel } = treePanel);
  ({ ActionButton } = actionButton);
  ({ FormField } = formField);
  ({ SurfaceCard } = surfaceCard);
  ({ OutputListPreview } = outputListPreview);
  ({ OutputGraphPreview } = outputGraphPreview);
}

export {
  DEFAULT_NAV_WIDTH,
  MIN_NAV_WIDTH,
  MAX_NAV_WIDTH,
  COLLAPSED_NAV_WIDTH,
  COLLAPSE_DRAG_THRESHOLD,
  AUTO_COLLAPSE_WIDTH,
  AUTO_UNCOLLAPSE_WIDTH,
  clampChatSidebarWidth,
} from '../chat/ChatSidebar/constants.js';
