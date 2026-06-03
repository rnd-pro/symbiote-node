import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';

import { getComponent } from '../packages/symbiote-ui/manifest/component-registry.js';

const GLOBALS = [
  'window',
  'document',
  'HTMLElement',
  'Element',
  'customElements',
  'CSSStyleSheet',
  'Event',
  'CustomEvent',
  'Node',
];

function installBrowserLikeDom() {
  let { window } = parseHTML('<!doctype html><html><head></head><body></body></html>');
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.Element = window.Element;
  globalThis.customElements = window.customElements;
  globalThis.Event = window.Event;
  globalThis.CustomEvent = window.CustomEvent;
  globalThis.Node = window.Node;
  globalThis.CSSStyleSheet = class {
    replaceSync(cssText) {
      this.cssText = cssText;
    }
  };
  Object.defineProperty(window.HTMLElement.prototype, 'adoptedStyleSheets', {
    configurable: true,
    get() {
      this.__adoptedStyleSheets ??= [];
      return this.__adoptedStyleSheets;
    },
    set(value) {
      this.__adoptedStyleSheets = value;
    },
  });
  document.adoptedStyleSheets = [];
  return window;
}

afterEach(() => {
  for (let name of GLOBALS) {
    delete globalThis[name];
  }
});

describe('browser registration and hydration smoke', () => {
  it('registers and hydrates public browser components in a browser-like DOM', async () => {
    installBrowserLikeDom();

    await import(`../packages/symbiote-ui/ui/index.js?browser-smoke=${Date.now()}`);

    for (let tag of ['node-canvas', 'chat-composer', 'project-tabs', 'source-editor']) {
      assert.equal(typeof customElements.get(tag), 'function', `${tag} must be registered`);
    }

    let composer = document.createElement('chat-composer');
    document.body.append(composer);

    assert.equal(composer.localName, 'chat-composer');
    assert.ok(composer instanceof HTMLElement);
    assert.equal(typeof customElements.get('chat-composer'), 'function');
  });

  it('keeps canvas and XR surfaces explicitly client-only', () => {
    for (let tag of ['node-canvas', 'canvas-graph', 'graph-explorer-shell']) {
      assert.equal(getComponent(tag).contract.ssr.mode, 'client-only');
    }
  });
});
