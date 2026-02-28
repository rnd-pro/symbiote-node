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

// Canvas
export { NodeCanvas } from './canvas/NodeCanvas.js';

// Node components
export { GraphNode } from './node/GraphNode.js';
export { NodeSocket } from './node/NodeSocket.js';

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

// Toolbar
export { QuickToolbar } from './toolbar/QuickToolbar.js';
export { FlowSimulator } from './canvas/FlowSimulator.js';
