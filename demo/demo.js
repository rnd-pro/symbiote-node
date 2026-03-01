/**
 * Demo — automation workflow showcase for symbiote-node
 *
 * Real connected pipeline: Trigger → HTTP Request → AI Agent → Filter → Merge → Save
 * FlowSimulator traverses the actual connection graph.
 */

import {
  NodeEditor, Node, Connection, Socket, Input, Output, InputControl,
  FlowSimulator, Frame, History,
  DARK_DEFAULT, LIGHT_CLEAN, SYNTHWAVE, GREY_NEUTRAL,
  DARK_PALETTE, LIGHT_PALETTE, SYNTHWAVE_PALETTE, GREY_PALETTE,
  MODERN_SKIN, COMPACT_SKIN, ROUNDED_SKIN,
} from '../index.js';
import '../canvas/NodeCanvas.js';
import '../node/GraphNode.js';

/**
 * Initialize automation workflow demo
 */
function initDemo() {
  const editor = new NodeEditor();

  // Socket types
  const dataSocket = new Socket('data', { color: '#5cb8ff' });
  const textSocket = new Socket('text', { color: '#5cd87a' });
  const anySocket = new Socket('any', { color: '#f0b840' });

  // ── Pipeline nodes ──

  // 1. Trigger (webhook)
  const trigger = new Node('Trigger', { type: 'trigger', category: 'server' });
  trigger.addOutput('payload', new Output(dataSocket, 'Payload'));
  trigger.addOutput('headers', new Output(textSocket, 'Headers'));
  trigger.addControl('interval', new InputControl('text', { initial: '*/5 * * * *', readonly: true }));

  // 2. HTTP Request
  const httpReq = new Node('HTTP Request', { type: 'action', category: 'control' });
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

  // Add all nodes
  editor.addNode(trigger);
  editor.addNode(httpReq);
  editor.addNode(aiAgent);
  editor.addNode(filter);
  editor.addNode(merge);
  editor.addNode(save);

  // ── Connections — real data flow ──
  // Main path: Trigger → HTTP → AI Agent → Filter → Merge(A) → Save
  editor.addConnection(new Connection(trigger, 'payload', httpReq, 'data'));
  editor.addConnection(new Connection(trigger, 'headers', httpReq, 'auth'));
  editor.addConnection(new Connection(httpReq, 'response', aiAgent, 'prompt'));
  editor.addConnection(new Connection(aiAgent, 'result', filter, 'in'));
  editor.addConnection(new Connection(filter, 'out', merge, 'a'));
  // Side path: AI tokens → Merge(B) (metadata stream)
  editor.addConnection(new Connection(aiAgent, 'tokens', merge, 'b'));
  // Merge → Save
  editor.addConnection(new Connection(merge, 'out', save, 'data'));

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

  // Mount canvas
  const canvas = document.querySelector('node-canvas');
  if (canvas) {
    canvas.setEditor(editor);

    // Apply theme CSS vars to :root so header inherits them
    const applyToRoot = (theme) => {
      const root = document.documentElement;
      for (const [k, v] of Object.entries(theme.tokens)) {
        root.style.setProperty(k, v);
      }
    };
    applyToRoot(GREY_NEUTRAL);
    canvas.setTheme(GREY_NEUTRAL);
    canvas.setSnapGrid(true, 20);

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

      // Demo reroute node
      const reroute = new Node('', { type: 'reroute', shape: 'pill' });
      reroute.addInput('in', new Input(new Socket('any'), ''));
      reroute.addOutput('out', new Output(new Socket('any'), ''));
      editor.addNode(reroute);
      canvas.setNodePosition(reroute.id, 920, 250);

      // Demo: set error on filter node
      canvas.setNodeError(filter.id, 'Missing required condition');
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
  }
}

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDemo);
} else {
  setTimeout(initDemo, 100);
}
