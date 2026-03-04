/**
 * symbiote-node — Node Graph Editor for Symbiote.js
 *
 * Public API for the library.
 *
 * @module symbiote-node
 */

// Core
export { NodeEditor } from './core/Editor.js';
export { Node } from './core/Node.js';
export { Connection } from './core/Connection.js';
export { Frame } from './core/Frame.js';
export { Socket, Port, Input, Output, Control, InputControl, uid } from './core/Socket.js';
export { editorToText, textToGraph, textToEditor } from './core/GraphText.js';
export { editorToMermaid, mermaidToGraph } from './core/GraphMermaid.js';

// Canvas
export { NodeCanvas } from './canvas/NodeCanvas/NodeCanvas.js';

// Node components
export { GraphNode } from './node/GraphNode/GraphNode.js';
export { NodeSocket } from './node/NodeSocket/NodeSocket.js';

// Interactions
export { Drag } from './interactions/Drag.js';
export { Zoom } from './interactions/Zoom.js';
export { Selector } from './interactions/Selector.js';
export { SnapGrid } from './interactions/SnapGrid.js';
export { ConnectFlow } from './interactions/ConnectFlow.js';

// Shapes
export { NodeShape, RectShape, PillShape, CircleShape, DiamondShape, CommentShape, getShape, registerShape } from './shapes/index.js';

// Themes (unified)
export { applyTheme, extractTheme, DARK_DEFAULT, LIGHT_CLEAN, SYNTHWAVE, GREY_NEUTRAL } from './themes/Theme.js';

// Palette (color-only)
export { applyPalette, DARK_PALETTE, LIGHT_PALETTE, SYNTHWAVE_PALETTE, GREY_PALETTE } from './themes/Palette.js';

// Skin (geometry-only)
export { applySkin, MODERN_SKIN, COMPACT_SKIN, ROUNDED_SKIN } from './themes/Skin.js';

// Plugins
export { Readonly } from './plugins/Readonly.js';
export { History } from './plugins/History.js';

// Toolbar
export { QuickToolbar } from './toolbar/QuickToolbar/QuickToolbar.js';
export { FlowSimulator } from './canvas/FlowSimulator.js';

// Inspector
export { InspectorPanel } from './inspector/InspectorPanel/InspectorPanel.js';

// Minimap
export { Minimap } from './canvas/Minimap/Minimap.js';

// Search
export { NodeSearch } from './canvas/NodeSearch/NodeSearch.js';

// Layout (panel workspace)
export { Layout } from './layout/Layout/Layout.js';
export { LayoutNode } from './layout/LayoutNode/LayoutNode.js';
export { LayoutSidebar } from './layout/LayoutSidebar/LayoutSidebar.js';
export * as LayoutTree from './layout/LayoutTree.js';
export {
  navigate, updateParams, parseQuery, buildHash, buildQuery,
  getRoute, setDefaultPanel,
} from './layout/LayoutRouter/LayoutRouter.js';
export { syncWithRouter } from './layout/LayoutRouter/routerSync.js';

// Auto Layout
export { computeAutoLayout } from './canvas/AutoLayout.js';

// Portals (Named Reroutes)
export { PortalManager } from './core/Portal.js';

// Palette Browser
export { PaletteBrowser } from './palette/PaletteBrowser/PaletteBrowser.js';

// Tabs
export { GraphTabs } from './canvas/GraphTabs/GraphTabs.js';

// Subgraphs
export { SubgraphNode } from './core/SubgraphNode.js';
export { SubgraphManager } from './canvas/SubgraphManager.js';
export { Breadcrumb } from './canvas/Breadcrumb/Breadcrumb.js';

// Engine (server-side graph runtime)
// Usage: import * as Engine from 'symbiote-node/engine'
// Or: import { Graph, Executor } from 'symbiote-node/engine'
