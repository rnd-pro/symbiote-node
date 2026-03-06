/**
 * Demo — AI Content Pipeline showcase for symbiote-node
 *
 * Unified workflow: data acquisition → AI processing → delivery
 * Mixes standard and SVG nodes in one logical data flow.
 */

import {
  NodeEditor, Node, Connection, Socket, Input, Output, InputControl,
  FlowSimulator, Frame, History, SubgraphNode,
  DARK_DEFAULT, LIGHT_CLEAN, SYNTHWAVE, GREY_NEUTRAL,
  DARK_PALETTE, LIGHT_PALETTE, SYNTHWAVE_PALETTE, GREY_PALETTE,
  MODERN_SKIN, COMPACT_SKIN, ROUNDED_SKIN,
  Layout, LayoutTree, applyTheme,
} from '../index.js';
import '../canvas/NodeCanvas/NodeCanvas.js';
import '../node/GraphNode/GraphNode.js';
import '../layout/Layout/Layout.js';
import '../palette/PaletteBrowser/PaletteBrowser.js';

/**
 * Initialize AI content pipeline demo
 */
function initDemo() {
  const editor = new NodeEditor();

  // Socket types
  const dataSocket = new Socket('data', { color: '#5cb8ff' });
  const textSocket = new Socket('text', { color: '#5cd87a' });
  const anySocket = new Socket('any', { color: '#f0b840' });
  const execSocket = new Socket('exec', { color: '#ffffff' });
  const arraySocket = new Socket('array', { color: '#a78bfa' });

  // ══════════════════════════════════════════════════
  // Row 1: Data Acquisition & Auth
  // ══════════════════════════════════════════════════

  // ⬡ API Gateway — hexagon SVG node (entry point)
  const gateway = new Node('API Gateway', { type: 'gateway', category: 'server', shape: 'hexagon' });
  gateway.addInput('auth', new Input(execSocket, 'Auth'));
  gateway.addOutput('data', new Output(dataSocket, 'Data'));
  gateway.addOutput('meta', new Output(textSocket, 'Meta'));

  // ⛨ Auth Guard — shield SVG node (security layer)
  const auth = new Node('Auth Guard', { type: 'auth', category: 'server', shape: 'shield' });
  auth.addInput('token', new Input(textSocket, 'Token'));
  auth.addOutput('ok', new Output(execSocket, 'Verified'));

  // ☁ Cloud Storage — cloud SVG node (data source)
  const cloudSrc = new Node('Cloud Fetch', { type: 'storage', category: 'instance', shape: 'cloud' });
  cloudSrc.addInput('query', new Input(dataSocket, 'Query'));
  cloudSrc.addOutput('docs', new Output(arraySocket, 'Documents'));

  // ⚡ Event Trigger — bolt SVG node (startup signal)
  const trigger = new Node('Trigger', { type: 'trigger', category: 'control', shape: 'bolt' });
  trigger.addOutput('exec', new Output(execSocket, 'Exec'));
  trigger.addOutput('config', new Output(textSocket, 'Config'));

  // ══════════════════════════════════════════════════
  // Row 2: Processing Pipeline (standard nodes)
  // ══════════════════════════════════════════════════

  // HTTP Request (standard rect)
  const httpReq = new Node('HTTP Request', { type: 'action', category: 'control' });
  httpReq.addInput('exec', new Input(execSocket, 'Exec'));
  httpReq.addInput('data', new Input(dataSocket, 'Request'));
  httpReq.addOutput('response', new Output(dataSocket, 'Response'));
  httpReq.addControl('url', new InputControl('text', { initial: 'api.openai.com/v1/chat' }));

  // AI Agent (standard rect)
  const aiAgent = new Node('AI Agent', { type: 'ai', category: 'data' });
  aiAgent.addInput('prompt', new Input(dataSocket, 'Prompt'));
  aiAgent.addInput('context', new Input(arraySocket, 'Context'));
  aiAgent.addOutput('result', new Output(dataSocket, 'Result'));
  aiAgent.addOutput('tokens', new Output(textSocket, 'Tokens'));
  aiAgent.addControl('model', new InputControl('text', { initial: 'gpt-4o' }));

  // Filter (pill shape)
  const filter = new Node('Filter', { type: 'filter', category: 'default', shape: 'pill' });
  filter.addInput('in', new Input(dataSocket, 'In'));
  filter.addOutput('pass', new Output(dataSocket, 'Pass'));
  filter.addOutput('reject', new Output(dataSocket, 'Reject'));

  // Merge (circle shape)
  const merge = new Node('Merge', { type: 'merge', category: 'control', shape: 'circle' });
  merge.addInput('a', new Input(anySocket, 'A'));
  merge.addInput('b', new Input(anySocket, 'B'));
  merge.addOutput('out', new Output(anySocket, 'Out'));

  // ══════════════════════════════════════════════════
  // Row 3: Delivery & Monitoring
  // ══════════════════════════════════════════════════

  // ⬡ CDN Publish — octagon SVG (distribution)
  const cdn = new Node('CDN Publish', { type: 'publish', category: 'server', shape: 'octagon' });
  cdn.addInput('content', new Input(anySocket, 'Content'));
  cdn.addOutput('url', new Output(textSocket, 'URL'));

  // 🗄 Database — database SVG (persistence)
  const db = new Node('Database', { type: 'database', category: 'data', shape: 'database' });
  db.addInput('data', new Input(anySocket, 'Data'));
  db.addOutput('id', new Output(textSocket, 'Record ID'));

  // ♥ Health Monitor — heart SVG (system health)
  const health = new Node('Health', { type: 'health', category: 'instance', shape: 'heart' });
  health.addInput('ping', new Input(execSocket, 'Ping'));
  health.addOutput('status', new Output(textSocket, 'Status'));

  // Debug (standard rect — inspector)
  const debug = new Node('Debug Log', { type: 'debug', category: 'default' });
  debug.addInput('inspect', new Input(anySocket, 'Inspect'));
  debug.addControl('output', new InputControl('text', { initial: '{ status: "ok", latency: "42ms" }', readonly: true }));

  // ★ Notification — star SVG (alerts)
  const notify = new Node('Notify', { type: 'event', category: 'control', shape: 'star' });
  notify.addInput('event', new Input(textSocket, 'Event'));

  // ══════════════════════════════════════════════════
  // Subgraph: Data Enrichment Pipeline
  // ══════════════════════════════════════════════════

  const subgraph = new SubgraphNode('Data Enrichment', { category: 'data' });
  const innerSocket = new Socket('data', { color: '#4a9eff' });

  const innerParse = new Node('Parse JSON', { type: 'transform', category: 'data' });
  innerParse.addInput('raw', new Input(innerSocket, 'Raw'));
  innerParse.addOutput('parsed', new Output(innerSocket, 'Parsed'));
  innerParse._exposed = 'input';

  const innerValidate = new Node('Validate', { type: 'validation', category: 'control' });
  innerValidate.addInput('data', new Input(innerSocket, 'Data'));
  innerValidate.addOutput('valid', new Output(innerSocket, 'Valid'));

  const innerEnrich = new Node('Enrich', { type: 'transform', category: 'instance' });
  innerEnrich.addInput('input', new Input(innerSocket, 'Input'));
  innerEnrich.addOutput('output', new Output(innerSocket, 'Output'));
  innerEnrich._exposed = 'output';

  subgraph.innerEditor.addNode(innerParse);
  subgraph.innerEditor.addNode(innerValidate);
  subgraph.innerEditor.addNode(innerEnrich);
  subgraph.innerEditor.addConnection(new Connection(innerParse, 'parsed', innerValidate, 'data'));
  subgraph.innerEditor.addConnection(new Connection(innerValidate, 'valid', innerEnrich, 'input'));
  subgraph.innerPositions = {
    [innerParse.id]: { x: 100, y: 100 },
    [innerValidate.id]: { x: 400, y: 100 },
    [innerEnrich.id]: { x: 700, y: 100 },
  };
  subgraph.syncPorts();

  // ══════════════════════════════════════════════════
  // Add all nodes
  // ══════════════════════════════════════════════════

  const allNodes = [
    trigger, auth, gateway, cloudSrc,
    httpReq, aiAgent, filter, merge,
    cdn, db, health, debug, notify,
    subgraph,
  ];
  allNodes.forEach((n) => editor.addNode(n));

  // ══════════════════════════════════════════════════
  // Connections — unified data flow
  // ══════════════════════════════════════════════════

  // Row 1: Trigger → Auth → Gateway, Gateway → HTTP & Cloud
  editor.addConnection(new Connection(trigger, 'exec', auth, 'token'));
  editor.addConnection(new Connection(auth, 'ok', gateway, 'auth'));
  editor.addConnection(new Connection(gateway, 'data', httpReq, 'data'));
  editor.addConnection(new Connection(gateway, 'meta', cloudSrc, 'query'));

  // Row 2: HTTP → AI, Cloud → AI context, AI → Filter → Merge → Subgraph
  editor.addConnection(new Connection(httpReq, 'response', aiAgent, 'prompt'));
  editor.addConnection(new Connection(cloudSrc, 'docs', aiAgent, 'context'));
  editor.addConnection(new Connection(aiAgent, 'result', filter, 'in'));
  editor.addConnection(new Connection(filter, 'pass', merge, 'a'));
  editor.addConnection(new Connection(aiAgent, 'tokens', merge, 'b'));
  editor.addConnection(new Connection(merge, 'out', subgraph, 'raw'));

  // Row 3: Subgraph → CDN & DB, DB → Debug, CDN → Notify, Health loop
  editor.addConnection(new Connection(subgraph, 'output', cdn, 'content'));
  editor.addConnection(new Connection(subgraph, 'output', db, 'data'));
  editor.addConnection(new Connection(db, 'id', debug, 'inspect'));
  editor.addConnection(new Connection(cdn, 'url', notify, 'event'));
  editor.addConnection(new Connection(trigger, 'config', health, 'ping'));
  editor.addConnection(new Connection(health, 'status', debug, 'inspect'));

  // ══════════════════════════════════════════════════
  // Node type catalog for context menu
  // ══════════════════════════════════════════════════

  const NODE_TYPES = [
    { label: 'Standard Node', type: 'default', category: 'default' },
    { label: 'Trigger', type: 'trigger', category: 'server' },
    { label: 'Action', type: 'action', category: 'control' },
    { label: 'Hexagon', type: 'gateway', category: 'server', shape: 'hexagon' },
    { label: 'Star', type: 'event', category: 'control', shape: 'star' },
    { label: 'Cloud', type: 'storage', category: 'instance', shape: 'cloud' },
    { label: 'Shield', type: 'auth', category: 'server', shape: 'shield' },
    { label: 'Heart', type: 'health', category: 'instance', shape: 'heart' },
    { label: 'Pill', type: 'filter', category: 'default', shape: 'pill' },
    { label: 'Circle', type: 'merge', category: 'control', shape: 'circle' },
    { label: 'Octagon', type: 'publish', category: 'server', shape: 'octagon' },
    { label: 'Database', type: 'database', category: 'data', shape: 'database' },
    { label: 'Bolt', type: 'trigger', category: 'control', shape: 'bolt' },
    { label: 'Diamond', type: 'decision', category: 'control', shape: 'diamond' },
  ];

  /**
   * Create node from type definition at position
   * @param {object} def
   * @param {number} x
   * @param {number} y
   */
  const addTypedNode = (def, x, y) => {
    const opts = { type: def.type, category: def.category };
    if (def.shape) opts.shape = def.shape;
    const newNode = new Node(def.label, opts);
    newNode.addInput('in', new Input(dataSocket, 'Input'));
    newNode.addOutput('out', new Output(dataSocket, 'Output'));
    editor.addNode(newNode);
    const c = document.querySelector('node-canvas');
    if (c) c.setNodePosition(newNode.id, x, y);
  };

  // Context menu: add node
  editor.on('contextadd', ({ x, y }) => {
    const c = document.querySelector('node-canvas');
    if (!c) return;
    const items = NODE_TYPES.map((def) => ({
      label: def.label,
      icon: def.shape ? 'hexagon' : 'add_box',
      action: () => addTypedNode(def, x, y),
    }));
    const container = c.ref?.canvasContainer || c;
    const menuX = x * (c.$.zoom || 1) + (c.$.panX || 0);
    const menuY = y * (c.$.zoom || 1) + (c.$.panY || 0);
    c.ref?.contextMenu?.show(menuX, menuY, items);
  });

  // Context menu: add frame
  editor.on('contextaddframe', ({ x, y }) => {
    const frame = new Frame('Group', { x, y, width: 400, height: 300, color: '#4a9eff' });
    editor.addFrame(frame);
  });

  // Context menu: add comment
  editor.on('contextaddcomment', ({ x, y }) => {
    const comment = new Node('Add your notes here...', { type: 'comment', shape: 'comment' });
    editor.addNode(comment);
    const c = document.querySelector('node-canvas');
    if (c) c.setNodePosition(comment.id, x, y);
  });

  // Auto layout
  editor.on('autolayout', () => {
    const c = document.querySelector('node-canvas');
    if (c) c.autoLayout();
  });

  // Apply theme to :root so both layout and canvas inherit tokens
  const applyToRoot = (theme) => applyTheme(document.documentElement, theme);
  applyToRoot(GREY_NEUTRAL);

  // Setup layout
  const layout = document.querySelector('panel-layout');
  if (!layout) return;

  layout.registerPanelType('canvas', {
    title: 'Canvas',
    icon: 'account_tree',
    component: 'node-canvas',
  });
  layout.registerPanelType('inspector', {
    title: 'Inspector',
    icon: 'info',
    component: 'inspector-panel',
  });
  layout.registerPanelType('palette', {
    title: 'Palette',
    icon: 'palette',
    component: 'palette-browser',
  });

  const initialLayout = LayoutTree.createSplit(
    'vertical',
    LayoutTree.createPanel('canvas'),
    LayoutTree.createPanel('inspector'),
    0.75,
  );

  const STORAGE_KEY = 'symbiote-node-demo-v3';

  if (!localStorage.getItem(STORAGE_KEY)) {
    layout.setLayout(initialLayout);
  }

  // Wait for layout to render, then find the canvas
  setTimeout(() => {
    const canvas = document.querySelector('node-canvas');
    if (!canvas) {
      console.warn('node-canvas not found in layout');
      return;
    }

    canvas.setEditor(editor);
    canvas.setTheme(GREY_NEUTRAL);
    canvas.setSnapGrid(true, 20);

    // Connect inspector to canvas
    const inspector = document.querySelector('inspector-panel');
    if (inspector) {
      inspector._canvas = canvas;
    }

    // History (Undo/Redo)
    const history = new History();
    history.listen(editor, {
      getCanvas: () => canvas,
      classes: { Node, Connection, Frame, Socket, Input, Output, InputControl },
    });
    history.bindKeyboard(canvas);
    history.clear();

    // ══════════════════════════════════════════════════
    // Node Positions — 20px grid, 280px column spacing
    // ══════════════════════════════════════════════════

    setTimeout(() => {
      // Row 1: Data Acquisition (y=120, columns at x=80, 340, 600, 860)
      canvas.setNodePosition(trigger.id, 80, 120);
      canvas.setNodePosition(auth.id, 340, 120);
      canvas.setNodePosition(gateway.id, 600, 120);
      canvas.setNodePosition(cloudSrc.id, 860, 120);

      // Row 2: Processing (y=380, columns at x=340, 600, 880, 1060, 1240)
      canvas.setNodePosition(httpReq.id, 340, 380);
      canvas.setNodePosition(aiAgent.id, 620, 380);
      canvas.setNodePosition(filter.id, 920, 400);
      canvas.setNodePosition(merge.id, 1100, 380);
      canvas.setNodePosition(subgraph.id, 1280, 380);

      // Row 3: Delivery (y=620, columns matching row 2 end)
      canvas.setNodePosition(cdn.id, 1280, 620);
      canvas.setNodePosition(db.id, 1540, 620);
      canvas.setNodePosition(debug.id, 1800, 620);
      canvas.setNodePosition(notify.id, 1540, 800);

      // Side: Health monitor (y=380, left side — connected to trigger)
      canvas.setNodePosition(health.id, 80, 400);

      // Demo features: error state, preview
      canvas.setNodeError(filter.id, 'Missing required condition');
      canvas.setPreview(aiAgent.id, '▶ Processing prompt...\n✓ 847 tokens used\n✓ Response cached', 'text');
    }, 200);

    // Frames — precise wrapping with 20px padding
    const sourceFrame = new Frame('Data Sources', { x: 40, y: 60, width: 980, height: 200, color: '#5cb8ff' });
    const processFrame = new Frame('AI Processing', { x: 300, y: 320, width: 1120, height: 180, color: '#a78bfa' });
    const deliveryFrame = new Frame('Delivery', { x: 1240, y: 560, width: 720, height: 180, color: '#5cd87a' });
    editor.addFrame(sourceFrame);
    editor.addFrame(processFrame);
    editor.addFrame(deliveryFrame);

    // --- Flow Simulator (cyclic) ---
    const sim = new FlowSimulator(editor, canvas);
    sim.speed = 700;

    let flowLoop = false;
    const btnPlay = document.getElementById('btnPlay');
    const runLoop = async () => {
      while (flowLoop) {
        await sim.run();
        if (!flowLoop) break;
        await new Promise((r) => setTimeout(r, 600));
        sim.stop();
        await new Promise((r) => setTimeout(r, 300));
      }
    };
    const setPlayBtn = (icon, label, active) => {
      btnPlay.querySelector('.material-symbols-outlined').textContent = icon;
      btnPlay.lastChild.textContent = ' ' + label;
      btnPlay.classList.toggle('active', active);
    };
    const toggleFlow = () => {
      if (flowLoop) {
        flowLoop = false;
        sim.stop();
        setPlayBtn('play_arrow', 'Play', false);
      } else {
        flowLoop = true;
        setPlayBtn('stop', 'Stop', true);
        runLoop();
      }
    };
    if (btnPlay) btnPlay.addEventListener('click', toggleFlow);
    window.toggleFlow = toggleFlow;

    // --- Theme button ---
    const themes = [GREY_NEUTRAL, DARK_DEFAULT, LIGHT_CLEAN, SYNTHWAVE];
    let themeIdx = 0;
    const btnTheme = document.getElementById('btnTheme');
    const switchTheme = () => {
      themeIdx = (themeIdx + 1) % themes.length;
      canvas.setTheme(themes[themeIdx]);
      applyToRoot(themes[themeIdx]);
    };
    if (btnTheme) btnTheme.addEventListener('click', switchTheme);
    window.switchTheme = switchTheme;

    // --- Wire Style button ---
    const wireStyles = ['bezier', 'orthogonal', 'straight'];
    const wireLabels = { bezier: 'Bezier', orthogonal: 'Step', straight: 'Straight' };
    let wireIdx = 0;
    const btnWire = document.getElementById('btnWireStyle');
    if (btnWire) {
      btnWire.addEventListener('click', () => {
        wireIdx = (wireIdx + 1) % wireStyles.length;
        canvas.setPathStyle(wireStyles[wireIdx]);
        btnWire.lastChild.textContent = ' ' + wireLabels[wireStyles[wireIdx]];
      });
    }

    // Console palette/skin switching
    const palettes = [GREY_PALETTE, DARK_PALETTE, LIGHT_PALETTE, SYNTHWAVE_PALETTE];
    let paletteIdx = 0;
    window.switchPalette = () => {
      paletteIdx = (paletteIdx + 1) % palettes.length;
      canvas.setPalette(palettes[paletteIdx]);
      console.log(`Palette: ${palettes[paletteIdx].name}`);
    };

    const skins = [MODERN_SKIN, COMPACT_SKIN, ROUNDED_SKIN];
    let skinIdx = 0;
    window.switchSkin = () => {
      skinIdx = (skinIdx + 1) % skins.length;
      canvas.setSkin(skins[skinIdx]);
      console.log(`Skin: ${skins[skinIdx].name}`);
    };
  }, 300);
}

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDemo);
} else {
  setTimeout(initDemo, 100);
}
