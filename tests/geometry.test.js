/**
 * Geometry test suite for symbiote-node
 *
 * Pure math tests — no browser needed.
 * Validates connection topology, socket compatibility,
 * Bézier curve properties, and graph invariants.
 *
 * Run: node --test tests/geometry.test.js
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

import { NodeEditor } from '../core/Editor.js';
import { Node } from '../core/Node.js';
import { Connection } from '../core/Connection.js';
import { Socket, Input, Output, InputControl } from '../core/Socket.js';

// ---- Bézier parser ----

/**
 * Parse SVG cubic Bézier path `d` attribute
 * Format: "M sx sy C cx1 cy1, cx2 cy2, ex ey"
 * @param {string} d
 * @returns {{ start: { x: number, y: number }, end: { x: number, y: number }, cp1: { x: number, y: number }, cp2: { x: number, y: number } }}
 */
function parseBezierPath(d) {
  const nums = d.match(/-?\d+(\.\d+)?/g).map(Number);
  return {
    start: { x: nums[0], y: nums[1] },
    cp1: { x: nums[2], y: nums[3] },
    cp2: { x: nums[4], y: nums[5] },
    end: { x: nums[6], y: nums[7] },
  };
}

/**
 * Generate Bézier path for given start/end
 * Same formula as NodeCanvas and ConnectFlow
 * @param {number} sx
 * @param {number} sy
 * @param {number} ex
 * @param {number} ey
 * @returns {string}
 */
function makeBezierPath(sx, sy, ex, ey) {
  const dx = Math.abs(ex - sx) * 0.5;
  return `M ${sx} ${sy} C ${sx + dx} ${sy}, ${ex - dx} ${ey}, ${ex} ${ey}`;
}

// ---- Test fixtures ----

let editor, source, processor, output;
let numSocket, strSocket;

before(() => {
  numSocket = new Socket('number', { color: '#4a9eff' });
  strSocket = new Socket('string', { color: '#4ade80' });

  source = new Node('Campaign Input', { type: 'input', category: 'server' });
  source.addOutput('numbers', new Output(numSocket, 'Phone Numbers'));
  source.addOutput('text', new Output(strSocket, 'SMS Text'));
  source.addControl('count', new InputControl('number', { initial: 100, readonly: true }));

  processor = new Node('SMS Router', { type: 'processor', category: 'control' });
  processor.addInput('data', new Input(numSocket, 'Data In'));
  processor.addInput('config', new Input(strSocket, 'Config'));
  processor.addOutput('result', new Output(numSocket, 'Processed'));
  processor.addControl('mode', new InputControl('text', { initial: 'auto' }));

  output = new Node('Modem Sender', { type: 'output', category: 'instance' });
  output.addInput('input', new Input(numSocket, 'SMS Queue'));
  output.addOutput('status', new Output(strSocket, 'Status'));

  editor = new NodeEditor();
  editor.addNode(source);
  editor.addNode(processor);
  editor.addNode(output);
  editor.addConnection(new Connection(source, 'numbers', processor, 'data'));
  editor.addConnection(new Connection(processor, 'result', output, 'input'));
});

// ---- Tests ----

describe('Connection-port consistency', () => {

  it('all connections reference valid output ports', () => {
    for (const conn of editor.getConnections()) {
      const fromNode = editor.getNode(conn.from);
      assert.ok(fromNode, `Source node ${conn.from} must exist`);
      assert.ok(fromNode.outputs[conn.out], `Output port "${conn.out}" must exist on node "${fromNode.label}"`);
    }
  });

  it('all connections reference valid input ports', () => {
    for (const conn of editor.getConnections()) {
      const toNode = editor.getNode(conn.to);
      assert.ok(toNode, `Target node ${conn.to} must exist`);
      assert.ok(toNode.inputs[conn.in], `Input port "${conn.in}" must exist on node "${toNode.label}"`);
    }
  });

  it('connected sockets have compatible types', () => {
    for (const conn of editor.getConnections()) {
      const fromNode = editor.getNode(conn.from);
      const toNode = editor.getNode(conn.to);
      const outSocket = fromNode.outputs[conn.out].socket;
      const inSocket = toNode.inputs[conn.in].socket;
      assert.ok(outSocket.isCompatibleWith(inSocket),
        `Socket types must be compatible: ${outSocket.name} → ${inSocket.name}`);
    }
  });

  it('no duplicate connections between same pair of ports', () => {
    const seen = new Set();
    for (const conn of editor.getConnections()) {
      const key = `${conn.from}:${conn.out}→${conn.to}:${conn.in}`;
      assert.ok(!seen.has(key), `Duplicate connection: ${key}`);
      seen.add(key);
    }
  });

  it('connections never go from a node to itself', () => {
    for (const conn of editor.getConnections()) {
      assert.notEqual(conn.from, conn.to, 'Self-connection is not allowed');
    }
  });
});

describe('Bézier path properties', () => {

  it('cubic Bézier path roundtrips correctly', () => {
    const d = makeBezierPath(10, 20, 100, 80);
    const parsed = parseBezierPath(d);
    assert.equal(parsed.start.x, 10);
    assert.equal(parsed.start.y, 20);
    assert.equal(parsed.end.x, 100);
    assert.equal(parsed.end.y, 80);
  });

  it('CP1.y equals start.y (horizontal exit tangent)', () => {
    const d = makeBezierPath(50, 100, 300, 200);
    const p = parseBezierPath(d);
    assert.equal(p.cp1.y, p.start.y);
  });

  it('CP2.y equals end.y (horizontal entry tangent)', () => {
    const d = makeBezierPath(50, 100, 300, 200);
    const p = parseBezierPath(d);
    assert.equal(p.cp2.y, p.end.y);
  });

  it('control points are between start and end for L→R layout', () => {
    const d = makeBezierPath(50, 100, 300, 200);
    const p = parseBezierPath(d);
    assert.ok(p.cp1.x > p.start.x, 'CP1.x right of start');
    assert.ok(p.cp2.x < p.end.x, 'CP2.x left of end');
  });

  it('control points do not cross for L→R layout', () => {
    const d = makeBezierPath(50, 100, 300, 200);
    const p = parseBezierPath(d);
    assert.ok(p.cp1.x <= p.cp2.x, 'CPs must not cross');
  });

  it('handles zero-length path (same point)', () => {
    const d = makeBezierPath(100, 100, 100, 100);
    const p = parseBezierPath(d);
    assert.equal(p.start.x, p.end.x);
    assert.equal(p.start.y, p.end.y);
  });

  it('handles reversed direction (R→L)', () => {
    const d = makeBezierPath(300, 200, 50, 100);
    const p = parseBezierPath(d);
    assert.equal(p.cp1.y, p.start.y);
    assert.equal(p.cp2.y, p.end.y);
  });
});

describe('Graph topology invariants', () => {

  it('all nodes have unique IDs', () => {
    const ids = new Set();
    for (const node of editor.getNodes()) {
      assert.ok(!ids.has(node.id), `Duplicate node ID: ${node.id}`);
      ids.add(node.id);
    }
  });

  it('all connections have unique IDs', () => {
    const ids = new Set();
    for (const conn of editor.getConnections()) {
      assert.ok(!ids.has(conn.id), `Duplicate connection ID: ${conn.id}`);
      ids.add(conn.id);
    }
  });

  it('nodes do not overlap (given known positions)', () => {
    const nodeList = [
      { x: 50, y: 100, width: 190, height: 180, label: 'source' },
      { x: 380, y: 70, width: 200, height: 210, label: 'processor' },
      { x: 700, y: 120, width: 190, height: 120, label: 'output' },
    ];

    for (let i = 0; i < nodeList.length; i++) {
      for (let j = i + 1; j < nodeList.length; j++) {
        const a = nodeList[i], b = nodeList[j];
        const overlap = !(a.x + a.width < b.x || b.x + b.width < a.x ||
          a.y + a.height < b.y || b.y + b.height < a.y);
        assert.ok(!overlap, `Nodes "${a.label}" and "${b.label}" must not overlap`);
      }
    }
  });

  it('node count matches expected', () => {
    assert.equal(editor.getNodes().length, 3);
  });

  it('connection count matches expected', () => {
    assert.equal(editor.getConnections().length, 2);
  });
});

describe('Serialization round-trip', () => {

  it('toJSON preserves node count', () => {
    const data = editor.toJSON();
    assert.equal(data.nodes.length, 3);
  });

  it('toJSON preserves connection count', () => {
    const data = editor.toJSON();
    assert.equal(data.connections.length, 2);
  });

  it('serialized connections reference valid node IDs', () => {
    const data = editor.toJSON();
    const nodeIds = new Set(data.nodes.map(n => n.id));
    for (const conn of data.connections) {
      assert.ok(nodeIds.has(conn.from), `Connection source ${conn.from} must be a valid node ID`);
      assert.ok(nodeIds.has(conn.to), `Connection target ${conn.to} must be a valid node ID`);
    }
  });

  it('serialized nodes have required fields', () => {
    const data = editor.toJSON();
    for (const node of data.nodes) {
      assert.ok(node.id, 'Node must have id');
      assert.ok(node.name, 'Node must have name');
      assert.ok(node.category, 'Node must have category');
    }
  });
});

describe('Socket compatibility matrix', () => {

  it('same-type sockets are compatible', () => {
    assert.ok(numSocket.isCompatibleWith(numSocket));
    assert.ok(strSocket.isCompatibleWith(strSocket));
  });

  it('different-type sockets are incompatible by default', () => {
    assert.ok(!numSocket.isCompatibleWith(strSocket));
    assert.ok(!strSocket.isCompatibleWith(numSocket));
  });

  it('wildcard socket (any) is compatible with all', () => {
    const anySocket = new Socket('any');
    assert.ok(anySocket.isCompatibleWith(numSocket));
    assert.ok(anySocket.isCompatibleWith(strSocket));
    assert.ok(numSocket.isCompatibleWith(anySocket));
  });
});

describe('Editor CRUD operations', () => {

  it('getNode returns correct node', () => {
    const found = editor.getNode(source.id);
    assert.equal(found.label, 'Campaign Input');
  });

  it('getNodeConnections returns connections for a node', () => {
    const conns = editor.getNodeConnections(processor.id);
    assert.equal(conns.length, 2, 'Processor should have 2 connections');
  });

  it('removeConnection removes and fires events', () => {
    const tempConn = new Connection(source, 'text', processor, 'config');
    editor.addConnection(tempConn);
    assert.equal(editor.getConnections().length, 3);

    editor.removeConnection(tempConn.id);
    assert.equal(editor.getConnections().length, 2);
  });

  it('addNode rejects duplicate', () => {
    assert.throws(() => editor.addNode(source), /already added/);
  });
});

describe('Node collapse/mute state', () => {

  it('collapsed defaults to false', () => {
    assert.equal(source.collapsed, false);
  });

  it('muted defaults to false', () => {
    assert.equal(source.muted, false);
  });

  it('collapsed can be toggled', () => {
    source.collapsed = true;
    assert.equal(source.collapsed, true);
    source.collapsed = false;
    assert.equal(source.collapsed, false);
  });

  it('muted can be toggled', () => {
    source.muted = true;
    assert.equal(source.muted, true);
    source.muted = false;
    assert.equal(source.muted, false);
  });

  it('collapsed does not affect node connections', () => {
    source.collapsed = true;
    const conns = editor.getNodeConnections(source.id);
    assert.ok(conns.length > 0, 'Collapsed node still has connections');
    source.collapsed = false;
  });

  it('muted does not affect node connections', () => {
    source.muted = true;
    const conns = editor.getNodeConnections(source.id);
    assert.ok(conns.length > 0, 'Muted node still has connections');
    source.muted = false;
  });
});
