import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeOutputList,
  normalizePreviewGraph,
} from '../display/output-preview.js';

describe('normalizeOutputList', () => {
  it('normalizes scalar output as a single generic item', () => {
    let data = normalizeOutputList('done');

    assert.equal(data.total, 1);
    assert.equal(data.visible, 1);
    assert.equal(data.empty, false);
    assert.deepEqual(data.items[0], {
      id: 'item-1',
      label: 'done',
      description: '',
      meta: 'string',
      kind: 'string',
      status: '',
      value: 'done',
    });
  });

  it('normalizes arrays and preserves generic item metadata', () => {
    let data = normalizeOutputList([
      { id: 'a', label: 'Alpha', description: 'First', status: 'ready', kind: 'result' },
      { key: 'b', title: 'Beta', summary: 'Second', type: 'record' },
    ]);

    assert.equal(data.total, 2);
    assert.equal(data.truncated, false);
    assert.equal(data.items[0].id, 'a');
    assert.equal(data.items[0].label, 'Alpha');
    assert.equal(data.items[0].description, 'First');
    assert.equal(data.items[0].status, 'ready');
    assert.equal(data.items[1].id, 'b');
    assert.equal(data.items[1].kind, 'record');
  });

  it('converts record output to key/value items and applies limits', () => {
    let data = normalizeOutputList({ alpha: 1, beta: 2, gamma: 3 }, { limit: 2 });

    assert.equal(data.total, 3);
    assert.equal(data.visible, 2);
    assert.equal(data.truncated, true);
    assert.equal(data.items[0].id, 'alpha');
    assert.equal(data.items[0].label, 'alpha');
    assert.equal(data.items[0].value, 1);
  });
});

describe('normalizePreviewGraph', () => {
  it('normalizes generic nodes and edges', () => {
    let data = normalizePreviewGraph({
      nodes: [
        { id: 'a', label: 'Alpha', type: 'input' },
        { id: 'b', label: 'Beta', kind: 'output' },
      ],
      edges: [
        { id: 'e1', source: 'a', target: 'b', label: 'next' },
      ],
    });

    assert.equal(data.totalNodes, 2);
    assert.equal(data.totalEdges, 1);
    assert.equal(data.empty, false);
    assert.equal(data.nodes[0].kind, 'input');
    assert.equal(data.nodes[1].kind, 'output');
    assert.deepEqual(data.edges[0], {
      id: 'e1',
      source: 'a',
      target: 'b',
      label: 'next',
      kind: 'edge',
      value: { id: 'e1', source: 'a', target: 'b', label: 'next' },
    });
  });

  it('supports connection endpoints and removes edges outside the visible node set', () => {
    let data = normalizePreviewGraph({
      nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      connections: [
        { source: { nodeId: 'a' }, target: { nodeId: 'b' } },
        { source: { nodeId: 'a' }, target: { nodeId: 'c' } },
      ],
    }, { nodeLimit: 2 });

    assert.equal(data.nodes.length, 2);
    assert.equal(data.edges.length, 1);
    assert.equal(data.edges[0].source, 'a');
    assert.equal(data.edges[0].target, 'b');
    assert.equal(data.truncated, true);
  });

  it('treats array values as graph nodes without product-specific assumptions', () => {
    let data = normalizePreviewGraph(['one', 'two']);

    assert.equal(data.nodes.length, 2);
    assert.equal(data.edges.length, 0);
    assert.equal(data.nodes[0].label, 'one');
    assert.equal(data.nodes[0].kind, 'string');
  });
});

describe('output preview component API', () => {
  it('exposes semantic list and graph setters', async () => {
    globalThis.HTMLElement = class {};
    globalThis.window = globalThis;
    globalThis.CSSStyleSheet = class {
      replaceSync(cssText) {
        this.cssText = cssText;
      }
    };
    globalThis.customElements = {
      define() {},
      get() {},
    };
    globalThis.document = { createElement() { return {}; } };

    let [{ OutputListPreview }, { OutputGraphPreview }] = await Promise.all([
      import('../display/OutputListPreview/OutputListPreview.js'),
      import('../display/OutputGraphPreview/OutputGraphPreview.js'),
    ]);

    assert.equal(typeof OutputListPreview.prototype.setItems, 'function');
    assert.equal(typeof OutputGraphPreview.prototype.setGraph, 'function');

    delete globalThis.HTMLElement;
    delete globalThis.window;
    delete globalThis.CSSStyleSheet;
    delete globalThis.customElements;
    delete globalThis.document;
  });
});
