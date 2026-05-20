/**
 * Component registration test for symbiote-node.
 *
 * Verifies that custom element registration behaves
 * correctly when DOM APIs are available (browser) or
 * absent (Node.js). In Node.js, registration should
 * either skip gracefully or throw a predictable error.
 *
 * Uses a lightweight DOM shim to test the registration
 * path without requiring a real browser.
 *
 * Run: node --test tests/component-registration.test.js
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

const NO_DOM_ERROR = /customElements|HTMLElement|document/;

let hadCustomElements;
let hadHTMLElement;
let hadWindow;
let hadCSSStyleSheet;
let hadDocument;

before(() => {
  hadCustomElements = 'customElements' in globalThis;
  hadHTMLElement = 'HTMLElement' in globalThis;
  hadWindow = 'window' in globalThis;
  hadCSSStyleSheet = 'CSSStyleSheet' in globalThis;
  hadDocument = 'document' in globalThis;
});

after(() => {
  if (!hadCustomElements && globalThis.customElements) {
    delete globalThis.customElements;
  }
  if (!hadHTMLElement && globalThis.HTMLElement) {
    delete globalThis.HTMLElement;
  }
  if (!hadWindow && globalThis.window) {
    delete globalThis.window;
  }
  if (!hadCSSStyleSheet && globalThis.CSSStyleSheet) {
    delete globalThis.CSSStyleSheet;
  }
  if (!hadDocument && globalThis.document) {
    delete globalThis.document;
  }
});

describe('Without DOM (Node.js native)', () => {
  it('importing index.js does not crash without DOM globals', async () => {
    await assert.doesNotReject(
      import('../index.js'),
      'Main import must not crash without DOM globals'
    );
  });

  it('core Node class exists and is instantiable', async () => {
    let { Node } = await import('../core/Node.js');
    let n = new Node('Test', { type: 'custom', category: 'test' });
    assert.ok(n, 'Node instance created');
    assert.equal(n.label, 'Test');
    assert.equal(n.type, 'custom');
  });

  it('core Editor exists and is instantiable', async () => {
    let { NodeEditor } = await import('../core/Editor.js');
    let ed = new NodeEditor();
    assert.ok(ed, 'NodeEditor instance created');
  });
});

describe('With DOM shim', () => {
  /** @type {Map<string, Function>} */
  let registry;

  before(() => {
    registry = new Map();

    globalThis.customElements = {
      define(name, constructor, options) {
        registry.set(name, constructor);
      },
      get(name) {
        return registry.get(name);
      },
    };

    globalThis.HTMLElement = class {};
    globalThis.window = globalThis;
    globalThis.CSSStyleSheet = class {
      replaceSync(cssText) {
        this.cssText = cssText;
      }
    };
    globalThis.document = { createElement() { return {}; } };
  });

  after(() => {
    delete globalThis.customElements;
    delete globalThis.HTMLElement;
    delete globalThis.window;
    delete globalThis.CSSStyleSheet;
    delete globalThis.document;
  });

  it('customElements.define is callable via shim', () => {
    assert.doesNotThrow(() => {
      customElements.define('test-foo', class extends HTMLElement {});
    });
    assert.ok(customElements.get('test-foo'));
  });

  it('importing UI entrypoint with DOM shim does not throw', async () => {
    await assert.doesNotReject(
      import('../ui/index.js'),
      'UI import must not crash with DOM shim'
    );
  });

  it('NodeCanvas can be imported with DOM shim', async () => {
    await assert.doesNotReject(
      import('../canvas/NodeCanvas/NodeCanvas.js'),
      'NodeCanvas must import without throwing'
    );
  });

  it('CellBg can be imported with DOM shim', async () => {
    await assert.doesNotReject(
      import('../effects/CellBg/CellBg.js'),
      'CellBg must import without throwing'
    );
    assert.ok(customElements.get('cell-bg'));
  });

  it('ChatTranscript can be imported with DOM shim', async () => {
    await assert.doesNotReject(
      import('../chat/ChatTranscript/ChatTranscript.js'),
      'ChatTranscript must import without throwing'
    );
    assert.ok(customElements.get('chat-transcript'));
  });

  it('ChatComposer can be imported with DOM shim', async () => {
    await assert.doesNotReject(
      import('../chat/ChatComposer/ChatComposer.js'),
      'ChatComposer must import without throwing'
    );
    assert.ok(customElements.get('chat-composer'));
  });

  it('ChatList can be imported with DOM shim', async () => {
    await assert.doesNotReject(
      import('../chat/ChatList/ChatList.js'),
      'ChatList must import without throwing'
    );
    assert.ok(customElements.get('chat-list'));
    assert.ok(customElements.get('chat-list-item'));
  });

  it('ListItem can be imported with DOM shim', async () => {
    await assert.doesNotReject(
      import('../list/ListItem/ListItem.js'),
      'ListItem must import without throwing'
    );
    assert.ok(customElements.get('sn-list-item'));
  });

  it('TreeView can be imported with DOM shim', async () => {
    await assert.doesNotReject(
      import('../tree/TreeView/TreeView.js'),
      'TreeView must import without throwing'
    );
    assert.ok(customElements.get('sn-tree-view'));
  });

  it('SourceEditor can be imported with DOM shim', async () => {
    await assert.doesNotReject(
      import('../display/SourceEditor/SourceEditor.js'),
      'SourceEditor must import without throwing'
    );
    assert.ok(customElements.get('source-editor'));
  });

  it('LoadingOverlay can be imported with DOM shim', async () => {
    await assert.doesNotReject(
      import('../display/LoadingOverlay/LoadingOverlay.js'),
      'LoadingOverlay must import without throwing'
    );
    assert.ok(customElements.get('sn-loading-overlay'));
  });

  it('Output preview components can be imported with DOM shim', async () => {
    await assert.doesNotReject(
      import('../display/OutputListPreview/OutputListPreview.js'),
      'OutputListPreview must import without throwing'
    );
    await assert.doesNotReject(
      import('../display/OutputGraphPreview/OutputGraphPreview.js'),
      'OutputGraphPreview must import without throwing'
    );
    assert.ok(customElements.get('output-list-preview'));
    assert.ok(customElements.get('output-graph-preview'));
  });
});

describe('Registration guards', () => {
  it('Node is not a custom element (pure data class)', async () => {
    let { Node } = await import('../core/Node.js');
    let n = new Node('test', { type: 'flow/test', category: 'control' });
    assert.ok(typeof n.id === 'string');
    assert.ok(n.id.length > 0, 'Node must auto-generate an id');
    assert.equal(typeof n.label, 'string');
  });

  it('uid() generates unique ids', async () => {
    let { uid } = await import('../core/Socket.js');
    let a = uid('nd');
    let b = uid('nd');
    assert.notEqual(a, b, 'uid must generate unique values');
    assert.ok(a.startsWith('nd_'));
    assert.ok(b.startsWith('nd_'));
  });

  it('nanoid() from engine generates unique ids', async () => {
    let { nanoid } = await import('../engine/nanoid.js');
    let a = nanoid();
    let b = nanoid();
    assert.notEqual(a, b, 'nanoid must generate unique values');
    assert.equal(typeof a, 'string');
    assert.ok(a.length > 0);
  });
});
