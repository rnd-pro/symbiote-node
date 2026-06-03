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

function escapeText(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function createMockElement(tagName = 'div') {
  let attrs = new Map();
  let children = [];
  let element = {
    tagName: tagName.toUpperCase(),
    style: {
      setProperty(name, value) {
        attrs.set('style', `${name}: ${value};`);
      },
    },
    dataset: new Proxy({}, {
      set(target, prop, value) {
        target[prop] = value;
        let name = String(prop).replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
        attrs.set(`data-${name}`, String(value));
        return true;
      },
    }),
    content: {
      cloneNode() {},
    },
    append(...nodes) {
      for (let node of nodes) this.appendChild(node);
    },
    appendChild(node) {
      children.push(node);
      return node;
    },
    replaceChildren(...nodes) {
      children = [];
      this.append(...nodes);
      this.serialized = children.map((node) => serializeNode(node)).join('');
    },
    setAttribute(name, value) {
      attrs.set(name, String(value));
    },
    toggleAttribute(name, value) {
      if (value) attrs.set(name, '');
      else attrs.delete(name);
    },
    querySelector() {
      return null;
    },
  };

  Object.defineProperty(element, 'className', {
    set(value) {
      attrs.set('class', value);
    },
  });
  Object.defineProperty(element, 'textContent', {
    set(value) {
      children = [String(value)];
    },
  });
  Object.defineProperty(element, 'tabIndex', {
    set(value) {
      attrs.set('tabindex', String(value));
    },
  });
  Object.defineProperty(element, 'hidden', {
    set(value) {
      if (value) attrs.set('hidden', '');
      else attrs.delete('hidden');
    },
  });
  Object.defineProperty(element, 'draggable', {
    set(value) {
      if (value) attrs.set('draggable', 'true');
      else attrs.delete('draggable');
    },
  });

  element.__attrs = attrs;
  element.__children = () => children;
  return element;
}

function serializeNode(node) {
  if (typeof node === 'string') return escapeText(node);
  let attrs = [...node.__attrs.entries()]
    .map(([name, value]) => (value === '' ? name : `${name}="${escapeText(value)}"`))
    .join(' ');
  let attrText = attrs ? ` ${attrs}` : '';
  let children = node.__children().map((child) => serializeNode(child)).join('');
  return `<${node.tagName.toLowerCase()}${attrText}>${children}</${node.tagName.toLowerCase()}>`;
}

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
  globalThis.document = { createElement: createMockElement };
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

  ({ TreeView } = await import('../packages/symbiote-ui/tree/TreeView/TreeView.js'));
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
    tree: createMockElement('div'),
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

    assert.match(tree.ref.tree.serialized, /Docs/);
    assert.match(tree.ref.tree.serialized, /README\.md/);
    assert.doesNotMatch(tree.ref.tree.serialized, /app\.js/);
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

  it('uses default expanded ids when storage is empty', () => {
    storage.clear();
    let tree = createTree();
    tree.defaultExpandedIds = ['src'];
    tree.storageKey = 'sn-tree-defaults';
    tree.setItems(items);

    assert.deepEqual(tree.expandedIds, ['src']);
    assert.match(tree.ref.tree.serialized, /app\.js/);

    tree.collapseAll();
    assert.deepEqual(tree.expandedIds, []);

    let second = createTree();
    second.defaultExpandedIds = ['src'];
    second.storageKey = 'sn-tree-defaults';
    second.setItems(items);
    assert.deepEqual(second.expandedIds, []);
  });

  it('renders nested rows with resolved indent lengths', () => {
    let tree = createTree();
    tree.expandedIds = ['src'];
    tree.setItems(items);

    assert.match(tree.ref.tree.serialized, /data-tree-id="src-app"[^>]*style="--sn-tree-depth-indent: 16px;"/);
  });

  it('can toggle branch rows on select', () => {
    storage.clear();
    let tree = createTree();
    tree.toggleBranchesOnSelect = true;
    tree.setItems(items);
    let row = { dataset: { index: '0' } };

    tree.init$.onTreeClick({
      target: {
        closest(selector) {
          return selector === '.sn-tree-row' ? row : null;
        },
      },
    });

    assert.deepEqual(tree.expandedIds, ['src']);
    assert.equal(tree.selectedId, 'src');
    assert.equal(tree.lastEvent.type, 'sn-tree-select');
  });

  it('uses path as the stable id for path-only items', () => {
    let tree = createTree();
    tree.toggleBranchesOnSelect = true;
    tree.setItems([
      {
        path: 'root',
        label: 'Root',
        children: [
          {
            path: 'root/readme.md',
            label: 'README.md',
          },
        ],
      },
    ]);

    tree.init$.onTreeClick({
      target: {
        closest(selector) {
          return selector === '.sn-tree-row' ? { dataset: { index: '0' } } : null;
        },
      },
    });

    assert.equal(tree.selectedId, 'root');
    assert.deepEqual(tree.expandedIds, ['root']);
    assert.equal(tree.expandAncestors('root/readme.md'), true);
    assert.deepEqual(tree.expandedIds, ['root']);
  });

  it('sets native drag data and emits the native drag event', () => {
    let tree = createTree();
    tree.expandedIds = ['src'];
    tree.setItems(items);
    let row = { dataset: { index: '1' } };
    let data = new Map();
    let dataTransfer = {
      setData(type, value) {
        data.set(type, value);
      },
    };

    tree.init$.onTreeDragStart({
      dataTransfer,
      target: {
        closest() {
          return row;
        },
      },
    });

    assert.equal(data.get('text/plain'), '{"path":"/repo/src/app.js"}');
    assert.equal(dataTransfer.effectAllowed, 'copy');
    assert.equal(tree.lastEvent.type, 'sn-tree-dragstart');
    assert.equal(tree.lastEvent.detail.nativeEvent.dataTransfer, dataTransfer);
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

    assert.match(tree.ref.tree.serialized, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.match(tree.ref.tree.serialized, /draggable="true"/);
    assert.equal(tree.items[0].payload, payload);
  });

  it('publishes light DOM host selectors for tree view sizing', async () => {
    let { default: css } = await import('../packages/symbiote-ui/tree/TreeView/TreeView.css.js');

    assert.match(css, /sn-tree-view \{/);
    assert.match(css, /sn-tree-view\[hidden\]/);
    assert.match(css, /var\(--sn-icon-font\)/);
    assert.doesNotMatch(css, /calc\(var\(--sn-tree-depth/);
    assert.match(css, /--sn-tree-depth-indent: 0px/);
    assert.match(css, /var\(--sn-tree-depth-indent\)/);
  });
});
