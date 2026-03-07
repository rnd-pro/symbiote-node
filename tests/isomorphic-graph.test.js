/**
 * Isomorphic graph round-trip test.
 * Verifies Editor ↔ JSON ↔ Graph interoperability.
 * Run: node --test tests/isomorphic-graph.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { NodeEditor } from '../core/Editor.js';
import { Node } from '../core/Node.js';
import { Connection } from '../core/Connection.js';
import { Frame } from '../core/Frame.js';
import { Socket, Input, Output } from '../core/Socket.js';
import { Graph } from '../engine/Graph.js';

/**
 * Build a test workflow editor with diverse node types
 */
function buildEditor() {
  const editor = new NodeEditor();
  const execSocket = new Socket('exec', { color: '#ffffff' });
  const dataSocket = new Socket('data', { color: '#4a9eff' });

  const trigger = new Node('Job Trigger', { id: 'nd_trigger', type: 'queue/job-event', shape: 'circle', category: 'server' });
  trigger.addOutput('exec', new Output(execSocket, 'exec'));
  trigger.addOutput('data', new Output(dataSocket, 'payload'));

  const process = new Node('AI Process', { id: 'nd_process', type: 'ai/llm', shape: 'rect', category: 'instance' });
  process.addInput('exec', new Input(execSocket, 'exec'));
  process.addInput('data', new Input(dataSocket, 'input'));
  process.addOutput('result', new Output(dataSocket, 'result'));
  process.params = { model: 'gpt-4', temperature: 0.7 };

  const output = new Node('Send Result', { id: 'nd_output', type: 'io/http-response', shape: 'pill', category: 'server' });
  output.addInput('data', new Input(dataSocket, 'response'));

  editor.addNode(trigger);
  editor.addNode(process);
  editor.addNode(output);

  editor.addConnection(new Connection(trigger, 'exec', process, 'exec'));
  editor.addConnection(new Connection(trigger, 'data', process, 'data'));
  editor.addConnection(new Connection(process, 'result', output, 'data'));

  editor.addFrame(new Frame('Pipeline', { color: '#5cd87a', x: 0, y: 0, width: 800, height: 400 }));

  return editor;
}

const POSITIONS = {
  nd_trigger: [100, 200],
  nd_process: [400, 200],
  nd_output: [700, 200],
};

// --- Editor → JSON → Editor round-trip ---

describe('Editor ↔ JSON round-trip', () => {
  it('toJSON produces engine-compatible format', () => {
    const editor = buildEditor();
    const json = editor.toJSON(POSITIONS);

    assert.equal(json.version, 1, 'has version');
    assert.equal(json.nodes.length, 3, 'node count');
    assert.equal(json.connections.length, 3, 'connection count');
    assert.equal(json.frames.length, 1, 'frame count');

    // Check node structure
    const trigger = json.nodes.find((n) => n.id === 'nd_trigger');
    assert.equal(trigger.type, 'queue/job-event');
    assert.equal(trigger.name, 'Job Trigger');
    assert.equal(trigger.shape, 'circle');
    assert.equal(trigger.category, 'server');
    assert.ok(trigger.outputs, 'has serialized outputs');
    assert.equal(trigger.outputs.length, 2);

    // Check params
    const proc = json.nodes.find((n) => n.id === 'nd_process');
    assert.equal(proc.params.model, 'gpt-4');
    assert.equal(proc.params.temperature, 0.7);

    // Check positions
    assert.deepEqual(json.ui.positions.nd_trigger, [100, 200]);

    console.log('toJSON: OK ✅');
  });

  it('fromJSON restores editor state', () => {
    const editor = buildEditor();
    const json = editor.toJSON(POSITIONS);

    // Restore into new editor
    const restored = new NodeEditor();
    const positions = {};
    restored.fromJSON(json, positions);

    assert.equal(restored.getNodes().length, 3, 'node count');
    assert.equal(restored.getConnections().length, 3, 'connection count');
    assert.equal(restored.getFrames().length, 1, 'frame count');

    // Check node properties
    const trigger = restored.getNode('nd_trigger');
    assert.ok(trigger, 'trigger exists');
    assert.equal(trigger.label, 'Job Trigger');
    assert.equal(trigger.type, 'queue/job-event');
    assert.equal(trigger.shape, 'circle');
    assert.equal(trigger.category, 'server');

    // Check ports restored
    assert.ok(trigger.outputs.exec, 'exec output restored');
    assert.ok(trigger.outputs.data, 'data output restored');

    // Check params
    const proc = restored.getNode('nd_process');
    assert.equal(proc.params.model, 'gpt-4');
    assert.equal(proc.params.temperature, 0.7);

    // Check connections
    const conns = restored.getConnections();
    const execConn = conns.find((c) => c.from === 'nd_trigger' && c.out === 'exec');
    assert.ok(execConn, 'exec connection exists');
    assert.equal(execConn.to, 'nd_process');

    // Check positions
    assert.deepEqual(positions.nd_trigger, [100, 200]);
    assert.deepEqual(positions.nd_output, [700, 200]);

    // Check frame
    const frame = restored.getFrames()[0];
    assert.equal(frame.label, 'Pipeline');
    assert.equal(frame.color, '#5cd87a');

    console.log('fromJSON: OK ✅');
  });

  it('full round-trip preserves all data', () => {
    const editor = buildEditor();
    const json1 = editor.toJSON(POSITIONS);

    const restored = new NodeEditor();
    const pos = {};
    restored.fromJSON(json1, pos);
    const json2 = restored.toJSON(pos);

    // Compare structure (connection IDs may differ since they're re-generated)
    assert.equal(json2.nodes.length, json1.nodes.length, 'node count');
    assert.equal(json2.connections.length, json1.connections.length, 'connection count');
    assert.equal(json2.frames.length, json1.frames.length, 'frame count');

    // Compare nodes
    for (const orig of json1.nodes) {
      const restored = json2.nodes.find((n) => n.id === orig.id);
      assert.ok(restored, `node ${orig.id} preserved`);
      assert.equal(restored.type, orig.type, `type for ${orig.id}`);
      assert.equal(restored.name, orig.name, `name for ${orig.id}`);
      assert.deepEqual(restored.params, orig.params, `params for ${orig.id}`);
    }

    // Compare positions
    assert.deepEqual(json2.ui.positions, json1.ui.positions, 'positions preserved');

    console.log('Full round-trip: OK ✅');
  });
});

// --- Editor → Graph interop ---

describe('Editor → Graph interop', () => {
  it('toGraph produces valid engine Graph', async () => {
    const editor = buildEditor();
    const graph = await editor.toGraph(POSITIONS);

    assert.ok(graph instanceof Graph, 'is Graph instance');
    assert.equal(graph.nodes.size, 3, 'node count');
    assert.equal(graph.connections.length, 3, 'connection count');

    // Check node
    const trigger = graph.getNode('nd_trigger');
    assert.ok(trigger, 'trigger exists in Graph');
    assert.equal(trigger.type, 'queue/job-event');

    console.log('toGraph: OK ✅');
  });

  it('Graph.toJSON → Editor.fromJSON cross-format', () => {
    // Simulate server creating a graph
    const graph = new Graph();
    const id1 = graph.addNode('ai/llm', { model: 'gpt-4' }, { id: 'nd_llm', name: 'LLM' });
    const id2 = graph.addNode('io/write-file', { path: '/tmp/out.txt' }, { id: 'nd_write', name: 'Write' });
    graph.connect(id1, 'result', id2, 'data');

    // Serialize from server side
    const serverJSON = graph.toJSON();

    // Load into browser-side editor
    const editor = new NodeEditor();
    editor.fromJSON(serverJSON);

    assert.equal(editor.getNodes().length, 2, 'nodes loaded');
    assert.equal(editor.getConnections().length, 1, 'connections loaded');

    const llm = editor.getNode('nd_llm');
    assert.ok(llm, 'LLM node exists');
    assert.equal(llm.label, 'LLM');
    assert.equal(llm.params.model, 'gpt-4');

    // Ports auto-created for engine connections
    assert.ok(llm.outputs.result, 'result output auto-created');
    const write = editor.getNode('nd_write');
    assert.ok(write.inputs.data, 'data input auto-created');

    console.log('Cross-format Graph → Editor: OK ✅');
  });
});

// --- Executor duck-typing: run Editor directly ---

describe('Executor duck-typing', () => {
  it('Executor.run() accepts Editor directly (no conversion)', async () => {
    const { Executor } = await import('../engine/Executor.js');
    const { registerNodeType } = await import('../engine/Registry.js');

    // Register simple processors
    registerNodeType({
      type: 'test/double',
      driver: { description: 'test', inputs: [], outputs: [{ name: 'result', type: 'any' }] },
      process: (inputs) => ({ result: (inputs.value || 0) * 2 }),
    });
    registerNodeType({
      type: 'test/add-ten',
      driver: { description: 'test', inputs: [{ name: 'value', type: 'any' }], outputs: [{ name: 'result', type: 'any' }] },
      process: (inputs) => ({ result: (inputs.value || 0) + 10 }),
    });

    // Build editor (browser side)
    const editor = new NodeEditor();
    const anySocket = new Socket('any');

    const src = new Node('Source', { id: 'src', type: 'test/double' });
    src.addOutput('result', new Output(anySocket, 'result'));
    src.params = {};

    const dst = new Node('Dest', { id: 'dst', type: 'test/add-ten' });
    dst.addInput('value', new Input(anySocket, 'value'));
    dst.addOutput('result', new Output(anySocket, 'result'));

    editor.addNode(src);
    editor.addNode(dst);
    editor.addConnection(new Connection(src, 'result', dst, 'value'));

    // Execute Editor DIRECTLY — no toGraph() needed
    const executor = new Executor();
    const result = await executor.run(editor);

    // src: double(0) = 0, dst: 0 + 10 = 10
    assert.equal(result.outputs.dst.result, 10, 'pipeline executed correctly');
    assert.deepEqual(result.executionOrder, ['src', 'dst'], 'topological order');

    console.log('Executor duck-typing: OK ✅');
  });
});
