/**
 * Round-trip test for GraphText and GraphMermaid serializers.
 * Run: node --experimental-vm-modules tests/graph-serialization.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { NodeEditor } from '../core/Editor.js';
import { Node } from '../core/Node.js';
import { Connection } from '../core/Connection.js';
import { Frame } from '../core/Frame.js';
import { Socket, Input, Output } from '../core/Socket.js';
import { editorToText, textToGraph } from '../core/GraphText.js';
import { editorToMermaid, mermaidToGraph } from '../core/GraphMermaid.js';

/**
 * Build a test workflow editor similar to the RU workflow
 */
function buildTestEditor() {
  const editor = new NodeEditor();
  const execSocket = new Socket('exec', { color: '#ffffff' });

  const trigger = new Node('Job Event: RU', { id: 'trigger', type: 'queue/job-event', shape: 'circle', category: 'server' });
  trigger.addOutput('exec', new Output(execSocket, ''));

  const sw = new Node('Status?', { id: 'switch_status', type: 'flow/switch', shape: 'diamond', category: 'control' });
  sw.addInput('exec', new Input(execSocket, ''));
  sw.addOutput('created', new Output(execSocket, 'created'));
  sw.addOutput('deferred', new Output(execSocket, 'deferred'));
  sw.addOutput('completed', new Output(execSocket, 'completed'));

  const fmt1 = new Node('Format: New', { id: 'fmt_created', type: 'telegram/format', category: 'data' });
  fmt1.addInput('exec', new Input(execSocket, ''));
  fmt1.addOutput('exec', new Output(execSocket, ''));

  const fmt2 = new Node('Format: Deferred', { id: 'fmt_deferred', type: 'telegram/format', category: 'data' });
  fmt2.addInput('exec', new Input(execSocket, ''));
  fmt2.addOutput('exec', new Output(execSocket, ''));

  const send = new Node('Send', { id: 'send', type: 'telegram/send', shape: 'pill', category: 'instance' });
  send.addInput('exec', new Input(execSocket, ''));

  editor.addNode(trigger);
  editor.addNode(sw);
  editor.addNode(fmt1);
  editor.addNode(fmt2);
  editor.addNode(send);

  editor.addConnection(new Connection(trigger, 'exec', sw, 'exec'));
  editor.addConnection(new Connection(sw, 'created', fmt1, 'exec'));
  editor.addConnection(new Connection(sw, 'deferred', fmt2, 'exec'));
  editor.addConnection(new Connection(fmt1, 'exec', send, 'exec'));
  editor.addConnection(new Connection(fmt2, 'exec', send, 'exec'));

  editor.addFrame(new Frame('Formatters', { color: '#5cd87a', x: 400, y: 0, width: 300, height: 400 }));
  editor.addFrame(new Frame('Delivery', { color: '#f0b840', x: 750, y: 100, width: 300, height: 200 }));

  const positions = {
    trigger: [80, 200],
    switch_status: [300, 200],
    fmt_created: [500, 50],
    fmt_deferred: [500, 250],
    send: [900, 200],
  };

  return { editor, positions };
}

// --- GraphText tests ---

describe('GraphText', () => {
  it('editorToText produces correct output', () => {
    const { editor, positions } = buildTestEditor();
    const text = editorToText(editor, positions);

    assert.ok(text.includes('NODES:'), 'has NODES section');
    assert.ok(text.includes('CONNECTIONS:'), 'has CONNECTIONS section');
    assert.ok(text.includes('FRAMES:'), 'has FRAMES section');
    assert.ok(text.includes('[○ trigger]'), 'circle shape icon');
    assert.ok(text.includes('[◇ switch_status]'), 'diamond shape icon');
    assert.ok(text.includes('[⊃ send]'), 'pill shape icon');
    assert.ok(text.includes('trigger.exec --> switch_status.exec'), 'connection line');
    assert.ok(text.includes('color=#5cd87a'), 'frame color');

    console.log('--- editorToText output ---');
    console.log(text);
    console.log('---');
  });

  it('textToGraph round-trip preserves structure', () => {
    const { editor, positions } = buildTestEditor();
    const text = editorToText(editor, positions);
    const parsed = textToGraph(text);

    assert.equal(parsed.nodes.length, 5, 'node count');
    assert.equal(parsed.connections.length, 5, 'connection count');
    assert.equal(parsed.frames.length, 2, 'frame count');

    // Check shapes
    const trigger = parsed.nodes.find(n => n.id === 'trigger');
    assert.equal(trigger.shape, 'circle');
    assert.equal(trigger.name, 'Job Event: RU');

    const send = parsed.nodes.find(n => n.id === 'send');
    assert.equal(send.shape, 'pill');

    // Check positions
    assert.deepEqual(parsed.positions.trigger, [80, 200]);

    // Check frames
    const formatters = parsed.frames.find(f => f.label === 'Formatters');
    assert.equal(formatters.color, '#5cd87a');

    console.log('textToGraph round-trip: OK');
  });
});

// --- GraphMermaid tests ---

describe('GraphMermaid', () => {
  it('editorToMermaid produces valid Mermaid syntax', () => {
    const { editor } = buildTestEditor();
    const mermaid = editorToMermaid(editor);

    assert.ok(mermaid.startsWith('graph LR'), 'starts with graph LR');
    assert.ok(mermaid.includes('trigger((Job Event: RU))'), 'circle shape');
    assert.ok(mermaid.includes('switch_status{Status?}'), 'diamond shape');
    assert.ok(mermaid.includes('send([Send])'), 'pill shape');
    assert.ok(mermaid.includes('-->|created|'), 'labeled arrow');
    assert.ok(mermaid.includes('trigger --> switch_status'), 'exec connection (no label)');
    assert.ok(mermaid.includes('subgraph'), 'has subgraph');

    console.log('--- editorToMermaid output ---');
    console.log(mermaid);
    console.log('---');
  });

  it('mermaidToGraph parses Mermaid back to graph structure', () => {
    const mermaidText = `graph LR
  trigger((Job Event: RU)) -->|exec| switch_status{Status?}
  switch_status -->|created| fmt_created[Format: New]
  switch_status -->|deferred| fmt_deferred[Format: Deferred]
  fmt_created --> send([Send])
  fmt_deferred --> send

  subgraph Formatters["Formatters"]
    direction TB
  end`;

    const graph = mermaidToGraph(mermaidText);

    assert.equal(graph.direction, 'LR', 'direction');
    assert.equal(graph.nodes.length, 5, 'node count');
    assert.equal(graph.connections.length, 5, 'connection count');
    assert.equal(graph.frames.length, 1, 'frame count');

    // Check shapes
    const trigger = graph.nodes.find(n => n.id === 'trigger');
    assert.equal(trigger.shape, 'circle', 'trigger is circle');
    assert.equal(trigger.name, 'Job Event: RU', 'trigger label');

    const sw = graph.nodes.find(n => n.id === 'switch_status');
    assert.equal(sw.shape, 'diamond', 'switch is diamond');

    const send = graph.nodes.find(n => n.id === 'send');
    assert.equal(send.shape, 'pill', 'send is pill');

    // Check connections
    const createdConn = graph.connections.find(c => c.out === 'created');
    assert.ok(createdConn, 'has created connection');
    assert.equal(createdConn.from, 'switch_status');
    assert.equal(createdConn.to, 'fmt_created');

    // Check frame
    assert.equal(graph.frames[0].label, 'Formatters');

    console.log('mermaidToGraph: OK');
    console.log('Parsed nodes:', graph.nodes.map(n => `${n.id}(${n.shape})`).join(', '));
  });

  it('Mermaid round-trip: editor → mermaid → parse → compare', () => {
    const { editor } = buildTestEditor();

    // Editor → Mermaid
    const mermaidText = editorToMermaid(editor);

    // Mermaid → Graph
    const parsed = mermaidToGraph(mermaidText);

    // Compare node count and shapes
    const origNodes = editor.getNodes();
    assert.equal(parsed.nodes.length, origNodes.length, 'node count matches');

    for (const orig of origNodes) {
      const found = parsed.nodes.find(n => n.id === orig.id);
      assert.ok(found, `node ${orig.id} found in parsed`);
      assert.equal(found.shape, orig.shape, `shape for ${orig.id}`);
      assert.equal(found.name, orig.label, `label for ${orig.id}`);
    }

    // Compare connection count
    const origConns = editor.getConnections();
    assert.equal(parsed.connections.length, origConns.length, 'connection count matches');

    console.log('Mermaid round-trip: OK ✅');
  });
});
