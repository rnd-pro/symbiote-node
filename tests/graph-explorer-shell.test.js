import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';

let hadCustomElements;
let hadHTMLElement;
let hadWindow;
let hadCSSStyleSheet;
let hadDocument;
let hadCustomEvent;
let hadElement;
let registry;

before(() => {
  hadCustomElements = 'customElements' in globalThis;
  hadHTMLElement = 'HTMLElement' in globalThis;
  hadWindow = 'window' in globalThis;
  hadCSSStyleSheet = 'CSSStyleSheet' in globalThis;
  hadDocument = 'document' in globalThis;
  hadCustomEvent = 'CustomEvent' in globalThis;
  hadElement = 'Element' in globalThis;

  registry = new Map();
  globalThis.customElements = {
    define(name, constructor) {
      registry.set(name, constructor);
    },
    get(name) {
      return registry.get(name);
    },
  };
  globalThis.HTMLElement = class {};
  globalThis.Element = class {};
  globalThis.window = globalThis;
  globalThis.CustomEvent = class {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
      this.bubbles = options.bubbles;
      this.composed = options.composed;
    }
  };
  globalThis.CSSStyleSheet = class {
    replaceSync(cssText) {
      this.cssText = cssText;
    }
  };
  globalThis.document = {
    createElement() {
      const template = {
        content: {
          cloneNode() {
            return {
              querySelectorAll() {
                return [];
              },
            };
          },
        },
      };
      return template;
    },
  };
});

after(() => {
  if (!hadCustomElements) delete globalThis.customElements;
  if (!hadHTMLElement) delete globalThis.HTMLElement;
  if (!hadWindow) delete globalThis.window;
  if (!hadCSSStyleSheet) delete globalThis.CSSStyleSheet;
  if (!hadDocument) delete globalThis.document;
  if (!hadCustomEvent) delete globalThis.CustomEvent;
  if (!hadElement) delete globalThis.Element;
});

test('GraphExplorerShell exposes graph shell API without Portal policy', async () => {
  const { GraphExplorerShell } = await import('../canvas/GraphExplorerShell/GraphExplorerShell.js');
  const shell = new GraphExplorerShell();
  const structuredOnly = {};
  const flatOnly = {};
  const pathButton = {
    textContent: '',
    querySelector() {
      return null;
    },
    setAttribute(name) {
      this[name] = true;
    },
    removeAttribute(name) {
      delete this[name];
    },
  };
  const stats = { textContent: '' };
  const nodeCanvas = { tagName: 'NODE-CANVAS' };
  const canvasGraph = { tagName: 'CANVAS-GRAPH' };
  const loaderCalls = [];
  const loader = {
    setProgress(pct, phase, sub) {
      loaderCalls.push(['progress', pct, phase, sub]);
    },
    show() {
      loaderCalls.push(['show']);
    },
    hide() {
      loaderCalls.push(['hide']);
    },
  };

  shell.setAttribute = (name, value) => {
    shell[name] = value;
  };
  shell.querySelectorAll = (selector) => {
    if (selector === '.graph-explorer-structured-only') return [structuredOnly];
    if (selector === '.graph-explorer-flat-only') return [flatOnly];
    return [];
  };
  shell.querySelector = (selector) => {
    if (selector === '[data-action="path-style"]') return pathButton;
    if (selector === '.graph-explorer-stats') return stats;
    if (selector === 'sn-loading-overlay, loading-overlay') return loader;
    if (selector === 'node-canvas') return nodeCanvas;
    if (selector === 'canvas-graph') return canvasGraph;
    return null;
  };

  shell.setMode('flat');
  assert.equal(shell['data-mode'], 'flat');
  assert.equal(structuredOnly.hidden, true);
  assert.equal(flatOnly.hidden, false);

  shell.setPathStyle('bezier');
  assert.equal(pathButton.textContent, 'BEZIER');

  shell.setStats([{ label: 'files', value: '<2>' }]);
  assert.equal(stats.textContent, '<2> files');

  shell.setLoading({ visible: true, pct: 50, phase: 'layout', sub: 'nodes' });
  shell.setLoading({ visible: false });
  assert.deepEqual(loaderCalls, [
    ['progress', 50, 'layout', 'nodes'],
    ['show'],
    ['progress', 0, '', ''],
    ['hide'],
  ]);

  assert.equal(shell.getNodeCanvas(), nodeCanvas);
  assert.equal(shell.getCanvasGraph(), canvasGraph);
});

test('GraphExplorerShell emits generic action events', async () => {
  const { GraphExplorerShell } = await import('../canvas/GraphExplorerShell/GraphExplorerShell.js');
  const shell = new GraphExplorerShell();
  const events = [];
  const button = {
    getAttribute(name) {
      if (name === 'data-action') return 'fit';
      return null;
    },
    hasAttribute() {
      return false;
    },
  };
  shell.contains = (element) => element === button;
  shell.dispatchEvent = (event) => {
    events.push(event);
    return true;
  };

  shell._onShellClick({
    target: {
      closest() {
        return button;
      },
    },
  });

  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'graph-shell-action');
  assert.deepEqual(events[0].detail, { action: 'fit' });
});

test('light DOM CSS contracts cover slotted graph shell and loading overlay state', async () => {
  const [{ default: shellCss }, { default: loadingCss }] = await Promise.all([
    import('../canvas/GraphExplorerShell/GraphExplorerShell.css.js'),
    import('../display/LoadingOverlay/LoadingOverlay.css.js'),
  ]);

  assert.match(shellCss, /graph-explorer-shell > \[slot="canvas"\]/);
  assert.match(shellCss, /graph-explorer-shell > \[slot="overlay"\]/);
  assert.match(shellCss, /graph-explorer-shell > \[slot="overlay"\] \{[\s\S]*?pointer-events: none;/);
  assert.match(shellCss, /graph-explorer-shell > dialog\[slot="overlay"\]\[open\]/);
  assert.match(shellCss, /graph-explorer-shell > \[slot="overlay"\]\[data-interactive\]/);
  assert.doesNotMatch(shellCss, /pg-canvas-graph/);
  assert.match(loadingCss, /sn-loading-overlay/);
  assert.match(loadingCss, /pointer-events: none/);
  assert.match(loadingCss, /sn-loading-overlay\[hidden-state\] \.sn-loading-overlay/);
});

test('chat sidebar item CSS supports light DOM active and expanded state', async () => {
  const { default: css } = await import('../chat/ChatSidebarItem/ChatSidebarItem.css.js');

  assert.match(css, /chat-sidebar-item\[data-active\] > \.chat-item/);
  assert.match(css, /chat-sidebar-sub-item\[data-active\] > \.chat-item-child/);
  assert.match(css, /chat-sidebar-item\[data-expanded\] > \.chat-sub-items/);
});
