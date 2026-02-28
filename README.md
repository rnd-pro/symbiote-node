# symbiote-node

**Visual Node Graph Editor** — extensible, themeable, zero-dependency graph editor built on [Symbiote.js](https://github.com/nicothin/Symbiote.js).

> Developed by [RND-PRO](https://rnd-pro.com)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![Version](https://img.shields.io/badge/version-0.1.0--alpha-orange.svg)
![Status](https://img.shields.io/badge/status-alpha-red.svg)

## Why?

Node graph editors are the standard for visual programming — from Blender's Geometry Nodes to Unreal Blueprints to n8n automation workflows. But building one from scratch is hard:

- **Framework lock-in** — most solutions are tied to React or Vue
- **Heavy dependencies** — bundles balloon with D3, dagre, and rendering libraries
- **No theme system** — dark mode is hardcoded, not a design token layer
- **Limited shapes** — rectangular nodes only, no adaptive geometry

**symbiote-node solves this:**
- 🧩 **Pure Web Components** — zero framework dependencies, works anywhere
- 🎨 **Theme System** — separate Palette (colors) and Skin (geometry) layers
- 💎 **5 Node Shapes** — Rect, Pill, Circle, Diamond, Comment with adaptive socket positioning
- ⚡ **Modular Architecture** — canvas, node, menu, interactions, shapes, themes as separate modules
- 🔌 **Plugin System** — Readonly, SnapGrid, Selector as composable plugins

## Features

### 🖼️ Canvas
- Infinite pan & zoom viewport
- SVG Bézier connections with gradient coloring
- Pseudo-connection line during drag
- Context menu (right-click)
- Keyboard shortcuts (Delete, Ctrl+A, Ctrl+Shift+A)
- Fit View

### 🧱 Nodes
- Dynamic construction from data model
- Color-coded category headers with Material Symbols icons
- Input/Output ports with typed sockets
- Inline controls (text, number, checkbox)
- Drag & drop with snap-to-grid
- Collapse / Mute toggle per node

### 🎨 Themes
- **Grey Neutral** — balanced grey UI (default)
- **Dark Default** — professional dark UI
- **Light Clean** — light mode
- **Synthwave** — neon aesthetic
- Separate `Palette` (colors) and `Skin` (geometry) APIs
- `extractTheme()` — read current tokens from live DOM
- Full CSS custom property design token system

### 🔧 Interactions
- Multi-select (Ctrl/Cmd + Click)
- Group drag for selected nodes
- Connection click-to-select & delete
- Socket compatibility validation
- Socket highlighting during connection drag

### 📐 Shapes
- `RectShape` — standard rectangular node
- `PillShape` — rounded compact node
- `CircleShape` — hub/junction node
- `DiamondShape` — decision/condition node
- `CommentShape` — annotation/documentation node
- Extensible via `NodeShape` base class + `registerShape()`
- Adaptive socket positioning per shape

### ⚡ Flow Simulator
- Topological sort-based data flow animation
- Per-connection marching ants effect
- Node pulse animation during traversal
- Configurable speed, cyclic loop support

### 🛠️ Quick Action Toolbar
- Floating toolbar above selected node
- Duplicate, Collapse, Mute, Delete actions
- Animated appearance, follows node position

### 🔒 Readonly Plugin
- Toggle readonly mode on canvas
- Blocks all mutation operations (add/delete/drag)

## Installation

```bash
# Clone
git clone https://github.com/RND-PRO/symbiote-node.git

# Run demo
npx -y serve -l 3000 .
# Open http://localhost:3000/demo/
```

### As ES Module

```html
<script type="importmap">
{
  "imports": {
    "@symbiotejs/symbiote": "https://esm.sh/@symbiotejs/symbiote@3"
  }
}
</script>
<script type="module">
  import { NodeEditor, Node, Socket, Input, Output, NodeCanvas } from './index.js';
  import './canvas/NodeCanvas.js';
  import './node/GraphNode.js';

  const editor = new NodeEditor();
  const socket = new Socket('data', { color: '#4a9eff' });

  const node1 = new Node('Source', { category: 'server' });
  node1.addOutput('out', new Output(socket, 'Output'));

  const node2 = new Node('Target', { category: 'control' });
  node2.addInput('in', new Input(socket, 'Input'));

  editor.addNode(node1);
  editor.addNode(node2);

  const canvas = document.querySelector('node-canvas');
  canvas.setEditor(editor);
  canvas.setNodePosition(node1.id, 100, 100);
  canvas.setNodePosition(node2.id, 400, 100);
</script>
```

## Project Structure

```
symbiote-node/
├── index.js          — public API exports
├── core/             — Editor, Node, Connection, Socket
├── canvas/           — NodeCanvas facade + extracted modules
│   ├── NodeCanvas.js           — main viewport (facade)
│   ├── NodeViewManager.js      — node CRUD + group drag
│   ├── ConnectionRenderer.js   — SVG paths + gradients + flow
│   ├── FlowSimulator.js        — data flow animation engine
│   ├── PseudoConnection.js     — temp connection line
│   └── ViewportActions.js      — context menu + keyboard
├── node/             — GraphNode + PortItem + CtrlItem + NodeSocket
├── menu/             — ContextMenu
├── interactions/     — Drag, Zoom, Selector, SnapGrid, ConnectFlow
├── shapes/           — NodeShape + 5 implementations
├── themes/           — Theme, Palette, Skin with design tokens
├── toolbar/          — QuickToolbar (floating actions)
├── plugins/          — Readonly
├── demo/             — demo page
└── tests/            — geometry & topology tests
```

## API

### Console Tools (Demo)

```js
switchTheme()    // Cycle: Grey → Dark → Light → Synthwave
switchPalette()  // Change colors only
switchSkin()     // Change geometry only
toggleFlow()     // Toggle data flow animation
```

## Tests

```bash
node --test tests/geometry.test.js
# 34 tests: topology, Bézier paths, serialization, socket compatibility, collapse/mute
```

## Roadmap

- [x] Quick Action Toolbar
- [x] Collapse / Mute nodes
- [x] Flow Simulator
- [ ] Undo/Redo (History)
- [ ] Inspector Side Panel
- [ ] Node Groups / Frames
- [ ] Minimap
- [ ] Node Search (Omnibox)
- [ ] Reroute Nodes
- [ ] Subgraphs
- [ ] Viewport Culling

## License

MIT © [RND-PRO](https://rnd-pro.com)
