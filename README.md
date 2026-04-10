[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](#)
[![Web Components](https://img.shields.io/badge/Web_Components-native-blue?logo=webcomponents.org&logoColor=white)](#)

# symbiote-node

A **visual node graph editor** and **execution engine** built on [Symbiote.js](https://github.com/symbiotejs/symbiote.js) — extensible, themeable, zero-dependency. Pure Web Components, works anywhere: vanilla HTML, React, Vue, Svelte, or any framework that supports custom elements.

> [!TIP]
> **22K lines, 150 files, zero external dependencies.** 70+ public API exports. Clone, serve, and start building node graphs in under a minute.

### Graph Editor

The editor constructs visual node graphs from a data model. Nodes have typed input/output ports with compatibility validation, color-coded category headers, inline controls, and drag & drop with snap-to-grid. Connections render as SVG Bézier curves with gradient coloring.

```javascript
import { NodeEditor, Node, Socket, Input, Output, NodeCanvas } from 'symbiote-node';

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
```

### Execution Engine

Server-side graph runtime with handler packs for data flow, control flow, I/O, and transforms. Graphs serialize to JSON and execute with topological ordering, retry logic, and parallel barriers.

```javascript
import { Graph, Executor, Registry } from 'symbiote-node/engine';

const registry = new Registry();
await registry.loadDir('./engine/packs');

const graph = Graph.fromFile('workflow.json');
const executor = new Executor(graph, registry);
const results = await executor.run();
```

### Node Shapes

Two coexisting rendering modes on the same canvas — **HTML nodes** (CSS-styled rectangles) and **SVG nodes** (arbitrary vector shapes with perimeter-aware connector positioning). Built-in presets: `hexagon`, `star`, `cloud`, `shield`, `heart`, `rect`, `pill`, `circle`, `diamond`, `comment`.

```javascript
import { createSVGShape, registerShape } from 'symbiote-node';

const myShape = createSVGShape('myshape', 'M12 2L22 8V16L12 22L2 16V8Z');
registerShape('myshape', myShape);

const node = new Node('Custom', { shape: 'myshape' });
```

### Theme System

Separate **Palette** (colors), **Skin** (geometry), and **Theme** (combined) layers — all driven by CSS custom properties. Switch at runtime without page reload.

| Theme | Description |
|-------|-------------|
| `GREY_NEUTRAL` | Balanced grey UI (default) |
| `DARK_DEFAULT` | Professional dark interface |
| `LIGHT_CLEAN` | Light mode |
| `SYNTHWAVE` | Neon retro aesthetic |
| `NEON_GLOW` | Vivid glow effects |
| `CARBON` | IBM Carbon-inspired |
| `EBOOK` | Warm paper-like reading theme |

```javascript
import { applyTheme, CARBON, applyPalette, SYNTHWAVE_PALETTE } from 'symbiote-node';

applyTheme(canvasElement, CARBON);           // Full theme
applyPalette(canvasElement, SYNTHWAVE_PALETTE); // Colors only
```

### Layout System (BSP)

Binary Space Partitioning layout engine for IDE-style panel workspaces. Panels resize by dragging dividers, sections split horizontally or vertically. Sidebar navigation with section switching and panel routing.

```javascript
import { Layout, LayoutTree, LayoutSidebar } from 'symbiote-node';
```

### Plugins & Interactions

- **History** — undo/redo with keyboard bindings (Ctrl+Z / Ctrl+Shift+Z)
- **Readonly** — toggle read-only mode, blocks all mutations
- **FlowSimulator** — topological sort-based data flow animation with marching ants
- **SnapGrid** — configurable grid snapping
- **Selector** — rubber-band multi-select
- **ConnectFlow** — socket highlighting during connection drag
- **AutoLayout** — Sugiyama-based automatic node arrangement
- **Minimap** — viewport minimap with live position tracking
- **NodeSearch** — search/omnibox for quick node insertion
- **GraphTabs** — multi-page graph management
- **Subgraphs** — drill-down with breadcrumb navigation
- **Portals** — named reroutes for cross-graph connections
- **InspectorPanel** — property inspector sidebar
- **QuickToolbar** — floating action toolbar above selected node

## Quick Start

```bash
git clone https://github.com/RND-PRO/symbiote-node.git
cd symbiote-node
npx -y serve -l 3000 .
# Open http://localhost:3000/demo/
```

### As ES Module (CDN)

```html
<script type="importmap">
{
  "imports": {
    "@symbiotejs/symbiote": "https://esm.sh/@symbiotejs/symbiote@3.2.1",
    "symbiote-node": "./index.js"
  }
}
</script>
<script type="module">
  import { NodeEditor, Node, Socket, Input, Output, NodeCanvas } from 'symbiote-node';
  import 'symbiote-node/canvas/NodeCanvas/NodeCanvas.js';
  import 'symbiote-node/node/GraphNode/GraphNode.js';
  // ...
</script>
```

## CLI (Engine)

```bash
node engine/cli.js run <workflow.json>       # Execute graph
node engine/cli.js validate <workflow.json>  # Validate graph
node engine/cli.js list                      # List available node types
node engine/cli.js inspect <workflow.json>   # Inspect graph structure
```

## Engine Handler Packs

Built-in node types organized by domain:

| Pack | Handlers | Description |
|------|----------|-------------|
| `flow` | `if`, `switch`, `loop`, `merge`, `retry`, `wait-all`, `agent` | Control flow and branching |
| `data` | `db-query`, `prompt-loader`, `rss-feed` | Data sources |
| `transform` | `json-parse`, `set`, `template`, `template-builder` | Data transformation |
| `io` | `http-request`, `read-file`, `write-file` | External I/O |
| `util` | `delay`, `log` | Utility nodes |
| `debug` | `inject` | Testing and debugging |

Custom handler packs can be loaded from any directory via `registry.loadDir()`.

## Project Structure

```
symbiote-node/
├── index.js          — public API (70+ exports)
├── core/             — Editor, Node, Connection, Socket, Portal
├── canvas/           — NodeCanvas, ConnectionRenderer, FlowSimulator, AutoLayout
├── node/             — GraphNode, PortItem, CtrlItem, NodeSocket
├── menu/             — ContextMenu
├── interactions/     — Drag, Zoom, Selector, SnapGrid, ConnectFlow
├── shapes/           — SVG shape system with 10 presets
├── themes/           — Theme, Palette, Skin (7 themes)
├── layout/           — BSP layout engine + LayoutSidebar + LayoutRouter
├── toolbar/          — QuickToolbar
├── inspector/        — InspectorPanel
├── palette/          — PaletteBrowser
├── plugins/          — Readonly, History
├── engine/           — Server-side graph runtime
│   ├── packs/        — Built-in handler packs (flow, data, transform, io, util)
│   └── cli.js        — CLI runner
├── demo/             — Interactive demo
└── tests/            — 45 tests (geometry, serialization, topology)
```

## Tests

```bash
node --test tests/*.test.js
# 45 tests: geometry, Bézier paths, serialization, socket compatibility,
# collapse/mute, subgraphs, execution, duck-typing
```

## Related Projects

- [project-graph-mcp](https://github.com/rnd-pro/project-graph-mcp) — MCP server for AI agents: project graph, code analysis, 18 tools
- [agent-pool-mcp](https://github.com/rnd-pro/agent-pool-mcp) — Multi-agent orchestration via Gemini CLI
- [Symbiote.js](https://github.com/symbiotejs/symbiote.js) — Isomorphic Reactive Web Components framework

## License

MIT © [RND-PRO.com](https://rnd-pro.com)

---

**Made with ❤️ by the RND-PRO team**
