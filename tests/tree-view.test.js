import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

let hadCustomElements;
let hadHTMLElement;
let hadWindow;
let hadDocument;
let hadCustomEvent;
let hadLocalStorage;
let hadCSSStyleSheet;

let registry;
let storage = new Map();
let TreeView;

let items = [
  {
    id: 'src',
    label: 'Source',
    kind: 'folder',
    icon: 'folder',
    path: '/repo/src',
    children: [
      {
        id: 'src-app',
        label: 'app.js',
        kind: 'file',
        path: '/repo/src/app.js',
        badges: ['js'],
        draggable: true,
        payload: { path: '/repo/src/app.js' },
      },
      {
        id: 'src-style',
        label: 'style.css',
        kind: 'file',
        path: '/repo/src/style.css',
      },
    ],
  },
  {
    id: 'docs',
    label: 'Docs',
    kind: 'folder',
    path: '/repo/docs',
    muted: true,
    children: [
      {
        id: 'readme',
        label: 'README.md',
        kind: 'file',
        path: '/repo/README.md',
      },
    ],
  },
];

before(async () => {
  hadCustomElements = 'customElements' in globalThis;
  hadHTMLElement = 'HTMLElement' in globalThis;
  hadWindow = 'window' in globalThis;
  hadDocument = 'document' in globalThis;
  hadCustomEvent = 'CustomEvent' in globalThis;
  hadLocalStorage = 'localStorage' in globalThis;
  hadCSSStyleSheet = 'CSSStyleSheet' in globalThis;

  registry = new Map();
  globalThis.HTMLElement = class {
    dispatchEvent(event) {
      this.lastEvent = event;
      return true;
    }
  };
  globalThis.window = globalThis;
  globalThis.CSSStyleSheet = class {
    replaceSync(cssText) {
      this.cssText = cssText;
    }
  };
  globalThis.customElements = {
    define(name, constructor) {
      registry.set(name, constructor);
    },
    get(name) {
      return registry.get(name);
    },
  };
  globalThis.document = { createElement() { return { content: { cloneNode() {} } }; } };
  globalThis.CustomEvent = class {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
      this.bubbles = options.bubbles;
      this.composed = options.composed;
    }
  };
  globalThis.localStorage = {
    getItem(key) {
      return storage.get(key) || null;
    },
    setItem(key, value) {
      storage.set(key, value);
    },
    removeItem(key) {
      storage.delete(key);
    },
  };

  ({ TreeView } = await import('../tree/TreeView/TreeView.js'));
});

after(() => {
  if (!hadCustomElements) delete globalThis.customElements;
  if (!hadHTMLElement) delete globalThis.HTMLElement;
  if (!hadWindow) delete globalThis.window;
  if (!hadDocument) delete globalThis.document;
  if (!hadCustomEvent) delete globalThis.CustomEvent;
  if (!hadLocalStorage) delete globalThis.localStorage;
  if (!hadCSSStyleSheet) delete globalThis.CSSStyleSheet;
});

function createTree() {
  let tree = new TreeView();
  tree.ref = {
    tree: {
      innerHTML: '',
      querySelector() {
        return null;
      },
    },
  };
  return tree;
}

describe('TreeView behavior', () => {
  it('keeps matching leaves and ancestors during branch-aware filtering', () => {
    let filtered = TreeView.filterItems(items, 'app.js');

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].item.id, 'src');
    assert.equal(filtered[0].children.length, 1);
    assert.equal(filtered[0].children[0].item.id, 'src-app');
  });

  it('renders filtered matches without unrelated branches', () => {
    let tree = createTree();
    tree.setItems(items);
    tree.filterText = 'readme';

    assert.match(tree.ref.tree.innerHTML, /Docs/);
    assert.match(tree.ref.tree.innerHTML, /README\.md/);
    assert.doesNotMatch(tree.ref.tree.innerHTML, /app\.js/);
  });

  it('expands ancestors by id or path and collapses all branches', () => {
    let tree = createTree();
    tree.setItems(items);

    assert.equal(tree.expandAncestors('/repo/src/app.js'), true);
    assert.deepEqual(tree.expandedIds, ['src']);

    tree.collapseAll();
    assert.deepEqual(tree.expandedIds, []);

    assert.equal(tree.expandAncestors('missing'), false);
  });

  it('persists expanded ids only when storageKey is set', () => {
    storage.clear();
    let tree = createTree();
    tree.setItems(items);

    tree.expandedIds = ['src'];
    assert.equal(storage.size, 0);

    tree.storageKey = 'sn-tree-test';
    tree.expandedIds = ['docs'];
    assert.equal(storage.get('sn-tree-test'), '["docs"]');

    let second = createTree();
    second.storageKey = 'sn-tree-test';
    assert.deepEqual(second.expandedIds, ['docs']);
  });

  it('escapes item labels and keeps payloads on draggable items', () => {
    let tree = createTree();
    let payload = { id: 1 };
    tree.setItems([
      {
        id: 'unsafe',
        label: '<script>alert(1)</script>',
        draggable: true,
        payload,
      },
    ]);

    assert.match(tree.ref.tree.innerHTML, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.match(tree.ref.tree.innerHTML, /draggable="true"/);
    assert.equal(tree.items[0].payload, payload);
  });
});
