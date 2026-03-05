/**
 * Demo — automation workflow showcase for symbiote-node
 *
 * Real connected pipeline: Trigger → HTTP Request → AI Agent → Filter → Merge → Save
 * FlowSimulator traverses the actual connection graph.
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
 * Initialize automation workflow demo
 */
function initDemo() {
  const editor = new NodeEditor();

  // Socket types
  const dataSocket = new Socket('data', { color: '#5cb8ff' });
  const textSocket = new Socket('text', { color: '#5cd87a' });
  const anySocket = new Socket('any', { color: '#f0b840' });
  const execSocket = new Socket('exec', { color: '#ffffff' });
  const arraySocket = new Socket('array', { color: '#a78bfa' });

  // ── Pipeline nodes ──

  // 1. Trigger (webhook)
  const trigger = new Node('Trigger', { type: 'trigger', category: 'server' });
  trigger.addOutput('exec', new Output(execSocket, 'Exec'));
  trigger.addOutput('payload', new Output(dataSocket, 'Payload'));
  trigger.addOutput('headers', new Output(textSocket, 'Headers'));
  trigger.addControl('interval', new InputControl('text', { initial: '*/5 * * * *', readonly: true }));

  // 2. HTTP Request
  const httpReq = new Node('HTTP Request', { type: 'action', category: 'control' });
  httpReq.addInput('exec', new Input(execSocket, 'Exec'));
  httpReq.addInput('data', new Input(dataSocket, 'Request'));
  httpReq.addInput('auth', new Input(textSocket, 'Auth'));
  httpReq.addOutput('response', new Output(dataSocket, 'Response'));
  httpReq.addControl('url', new InputControl('text', { initial: 'api.example.com' }));

  // 3. AI Agent — processes query
  const aiAgent = new Node('AI Agent', { type: 'ai', category: 'data' });
  aiAgent.addInput('prompt', new Input(dataSocket, 'Prompt'));
  aiAgent.addOutput('result', new Output(dataSocket, 'Result'));
  aiAgent.addOutput('tokens', new Output(textSocket, 'Tokens'));
  aiAgent.addControl('model', new InputControl('text', { initial: 'gpt-4o' }));

  // 4. Filter (pill) — passes/rejects based on criteria
  const filter = new Node('Filter', { type: 'filter', category: 'default', shape: 'pill' });
  filter.addInput('in', new Input(dataSocket, 'In'));
  filter.addOutput('out', new Output(dataSocket, 'Out'));

  // 5. Merge (circle) — combines multiple streams
  const merge = new Node('Merge', { type: 'merge', category: 'control', shape: 'circle' });
  merge.addInput('a', new Input(anySocket, 'A'));
  merge.addInput('b', new Input(anySocket, 'B'));
  merge.addOutput('out', new Output(anySocket, 'Out'));

  // 6. Save Result
  const save = new Node('Save Result', { type: 'output', category: 'instance' });
  save.addInput('data', new Input(anySocket, 'Data'));
  save.addOutput('status', new Output(textSocket, 'Status'));

  // 7. Debug — inspector node showing incoming data
  const debug = new Node('Debug', { type: 'debug', category: 'default' });
  debug.addInput('inspect', new Input(anySocket, 'Inspect'));
  debug.addControl('output', new InputControl('text', { initial: '{ status: "ok" }', readonly: true }));

  // 8. Subgraph — "Data Pipeline" with inner nodes
  const subgraph = new SubgraphNode('Data Pipeline', { category: 'data' });
  // Set up inner pipeline
  const innerParseSocket = new Socket('data', { color: '#4a9eff' });
  const innerParse = new Node('Parse JSON', { type: 'transform', category: 'data' });
  innerParse.addInput('raw', new Input(innerParseSocket, 'Raw'));
  innerParse.addOutput('parsed', new Output(innerParseSocket, 'Parsed'));
  innerParse._exposed = 'input';

  const innerValidate = new Node('Validate Schema', { type: 'validation', category: 'control' });
  innerValidate.addInput('data', new Input(innerParseSocket, 'Data'));
  innerValidate.addOutput('valid', new Output(innerParseSocket, 'Valid'));

  const innerTransform = new Node('Transform', { type: 'transform', category: 'instance' });
  innerTransform.addInput('input', new Input(innerParseSocket, 'Input'));
  innerTransform.addOutput('output', new Output(innerParseSocket, 'Output'));
  innerTransform._exposed = 'output';

  subgraph.innerEditor.addNode(innerParse);
  subgraph.innerEditor.addNode(innerValidate);
  subgraph.innerEditor.addNode(innerTransform);
  subgraph.innerEditor.addConnection(new Connection(innerParse, 'parsed', innerValidate, 'data'));
  subgraph.innerEditor.addConnection(new Connection(innerValidate, 'valid', innerTransform, 'input'));
  subgraph.innerPositions = {
    [innerParse.id]: { x: 100, y: 100 },
    [innerValidate.id]: { x: 400, y: 100 },
    [innerTransform.id]: { x: 700, y: 100 },
  };
  // Sync auto-ports from exposed inner nodes
  subgraph.syncPorts();

  // Add all nodes
  editor.addNode(trigger);
  editor.addNode(httpReq);
  editor.addNode(aiAgent);
  editor.addNode(filter);
  editor.addNode(merge);
  editor.addNode(save);
  editor.addNode(debug);
  editor.addNode(subgraph);

  // ── SVG Vector Nodes — showcase area ──

  // Hexagon: infrastructure/server hub
  const svgHex = new Node('API Gateway', { type: 'gateway', category: 'server', shape: 'hexagon' });
  svgHex.addInput('req', new Input(dataSocket, 'Request'));
  svgHex.addOutput('res', new Output(dataSocket, 'Response'));

  // Star: highlight/event node
  const svgStar = new Node('Event', { type: 'event', category: 'control', shape: 'star' });
  svgStar.addOutput('signal', new Output(execSocket, 'Signal'));

  // Cloud: cloud service node
  const svgCloud = new Node('Cloud Storage', { type: 'storage', category: 'instance', shape: 'cloud' });
  svgCloud.addInput('data', new Input(dataSocket, 'Data'));
  svgCloud.addOutput('url', new Output(textSocket, 'URL'));

  // Shield: security/auth node
  const svgShield = new Node('Auth Guard', { type: 'auth', category: 'server', shape: 'shield' });
  svgShield.addInput('token', new Input(textSocket, 'Token'));
  svgShield.addOutput('ok', new Output(execSocket, 'OK'));
  svgShield.addOutput('fail', new Output(execSocket, 'Fail'));

  // Heart: health-check node
  const svgHeart = new Node('Health', { type: 'health', category: 'instance', shape: 'heart' });
  svgHeart.addInput('ping', new Input(execSocket, 'Ping'));
  svgHeart.addOutput('pong', new Output(execSocket, 'Pong'));

  editor.addNode(svgHex);
  editor.addNode(svgStar);
  editor.addNode(svgCloud);
  editor.addNode(svgShield);
  editor.addNode(svgHeart);

  // SVG-to-SVG connections
  editor.addConnection(new Connection(svgStar, 'signal', svgShield, 'token'));
  editor.addConnection(new Connection(svgShield, 'ok', svgHex, 'req'));
  editor.addConnection(new Connection(svgHex, 'res', svgCloud, 'data'));
  editor.addConnection(new Connection(svgHeart, 'pong', svgHex, 'req'));

  // ── Connections — real data flow ──
  // Main path: Trigger → HTTP → AI Agent → Filter → Merge(A) → Save
  editor.addConnection(new Connection(trigger, 'exec', httpReq, 'exec'));
  editor.addConnection(new Connection(trigger, 'payload', httpReq, 'data'));
  editor.addConnection(new Connection(trigger, 'headers', httpReq, 'auth'));
  editor.addConnection(new Connection(httpReq, 'response', aiAgent, 'prompt'));
  editor.addConnection(new Connection(aiAgent, 'result', filter, 'in'));
  editor.addConnection(new Connection(filter, 'out', merge, 'a'));
  // Side path: AI tokens → Merge(B) (metadata stream)
  editor.addConnection(new Connection(aiAgent, 'tokens', merge, 'b'));
  // Merge → Save
  editor.addConnection(new Connection(merge, 'out', save, 'data'));
  // Save → Debug
  editor.addConnection(new Connection(save, 'status', debug, 'inspect'));

  // Context menu add node (from right-click or drop-in-empty)
  editor.on('contextadd', ({ x, y }) => {
    const newNode = new Node('New Step', { type: 'default', category: 'default' });
    newNode.addInput('in', new Input(dataSocket, 'Input'));
    newNode.addOutput('out', new Output(dataSocket, 'Output'));
    editor.addNode(newNode);
    const c = document.querySelector('node-canvas');
    if (c) c.setNodePosition(newNode.id, x, y);
  });

  // Context menu add frame
  editor.on('contextaddframe', ({ x, y }) => {
    const frame = new Frame('Group', { x, y, width: 400, height: 300, color: '#4a9eff' });
    editor.addFrame(frame);
  });

  // Context menu add comment
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
  const applyToRoot = (theme) => {
    applyTheme(document.documentElement, theme);
  };
  applyToRoot(GREY_NEUTRAL);

  // Setup layout
  const layout = document.querySelector('panel-layout');
  if (!layout) return;

  // Register panel types
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

  // Set initial layout: canvas (top 75%) | inspector (bottom 25%)
  const initialLayout = LayoutTree.createSplit(
    'vertical',
    LayoutTree.createPanel('canvas'),
    LayoutTree.createPanel('inspector'),
    0.75,
  );

  // Only set if no stored layout
  if (!localStorage.getItem('symbiote-node-demo-layout')) {
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
    // Clear initial history so setup actions are not undoable
    history.clear();

    // Set positions — real pipeline layout
    setTimeout(() => {
      canvas.setNodePosition(trigger.id, 60, 120);
      canvas.setNodePosition(httpReq.id, 360, 100);
      canvas.setNodePosition(aiAgent.id, 680, 80);
      canvas.setNodePosition(filter.id, 1020, 120);
      canvas.setNodePosition(merge.id, 1200, 200);
      canvas.setNodePosition(save.id, 1380, 180);
      canvas.setNodePosition(debug.id, 1580, 260);
      canvas.setNodePosition(subgraph.id, 680, 400);

      // Demo reroute node
      const reroute = new Node('', { type: 'reroute', shape: 'pill' });
      reroute.addInput('in', new Input(new Socket('any'), ''));
      reroute.addOutput('out', new Output(new Socket('any'), ''));
      editor.addNode(reroute);
      canvas.setNodePosition(reroute.id, 920, 250);

      // Demo: set error on filter node
      canvas.setNodeError(filter.id, 'Missing required condition');

      // Demo: preview area on AI Agent (text) and Debug (text)
      canvas.setPreview(aiAgent.id, '▶ Processing prompt...\n✓ 847 tokens used\n✓ Response cached', 'text');

      // Position SVG vector nodes below main pipeline
      canvas.setNodePosition(svgStar.id, 80, 700);
      canvas.setNodePosition(svgShield.id, 300, 700);
      canvas.setNodePosition(svgHex.id, 560, 700);
      canvas.setNodePosition(svgCloud.id, 820, 700);
      canvas.setNodePosition(svgHeart.id, 80, 960);
    }, 200);

    // Demo frame around data source nodes
    const pipelineFrame = new Frame('Data Source', { x: 40, y: 60, width: 660, height: 360, color: '#5cb8ff' });
    editor.addFrame(pipelineFrame);

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
