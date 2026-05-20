import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createCanvasGraphStore,
  normalizeCanvasGraphModel,
} from '../canvas/graph-model.js';

describe('canvas graph model', () => {
  it('normalizes nodes, edges, and explicit roots', () => {
    const model = normalizeCanvasGraphModel({
      nodes: [
        { id: 'root', label: 42, isGroup: true, children: [7] },
        { id: 'child', parentId: 'root' },
      ],
      edges: [
        { from: 'root', to: 'child', label: 'owns' },
        { from: 'root', to: 'missing' },
      ],
      rootNodes: ['root', 'missing'],
    });

    assert.deepEqual(model.rootNodes, ['root']);
    assert.equal(model.nodes[0].label, '42');
    assert.deepEqual(model.nodes[0].children, ['7']);
    assert.deepEqual(model.edges, [{ from: 'root', to: 'child', label: 'owns' }]);
  });

  it('derives roots when no explicit root list is provided', () => {
    const model = normalizeCanvasGraphModel({
      nodes: [
        { id: 'a' },
        { id: 'b', parentId: 'a' },
        { id: 'c', parentId: 'missing' },
      ],
    });

    assert.deepEqual(model.rootNodes, ['a', 'c']);
  });

  it('creates a graph store with a node map', () => {
    const store = createCanvasGraphStore({
      nodes: [{ id: 'a' }, { id: 'b' }],
      edges: [{ from: 'a', to: 'b' }],
    });

    assert.equal(store.nodes.get('a').label, 'a');
    assert.deepEqual(store.edges, [{ from: 'a', to: 'b' }]);
    assert.deepEqual(store.rootNodes, ['a', 'b']);
  });

  it('accepts generic graph connections', () => {
    const model = normalizeCanvasGraphModel({
      nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      connections: [
        { source: 'a', target: 'b', label: 'string endpoints' },
        { source: { node: 'b' }, target: { id: 'c' }, label: 'object endpoints' },
        { source: 'a', target: 'missing' },
      ],
    });

    assert.deepEqual(model.edges, [
      { source: 'a', target: 'b', label: 'string endpoints', from: 'a', to: 'b' },
      { source: { node: 'b' }, target: { id: 'c' }, label: 'object endpoints', from: 'b', to: 'c' },
    ]);
  });
});
