import test from 'node:test';
import assert from 'node:assert/strict';

import {
  collapseTree,
  highlightTreePath,
  setTreeItems,
  setupTreePanel,
  showTree,
  showTreePlaceholder,
  syncTreeFilter,
} from '../ui/host-adapters.js';

function createTree() {
  let listeners = new Map();
  return {
    collapsed: false,
    defaultExpandedIds: [],
    expandedPath: '',
    filterText: '',
    hidden: false,
    items: [],
    selectedId: '',
    storageKey: '',
    toggleBranchesOnSelect: false,
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    collapseAll() {
      this.collapsed = true;
    },
    emit(type, detail = {}) {
      listeners.get(type)?.({ detail });
    },
    expandAncestors(path) {
      this.expandedPath = path;
    },
    scrollSelectedIntoView() {
      this.scrolled = true;
    },
    setItems(items) {
      this.items = items;
    },
  };
}

function createHost(tree = createTree()) {
  return {
    ref: {
      placeholder: {
        hidden: true,
        textContent: '',
      },
      tree,
    },
  };
}

test('setupTreePanel wires provider tree defaults and events once', () => {
  let selected = [];
  let toggled = [];
  let tree = createTree();
  let host = createHost(tree);

  assert.equal(setupTreePanel(host, {
    storageKey: 'portal-tree',
    defaultExpandedIds: ['skills'],
    onSelect: (item) => selected.push(item),
    onToggle: (item) => toggled.push(item),
  }), tree);
  setupTreePanel(host, {
    onSelect: (item) => selected.push({ duplicate: item }),
  });

  assert.equal(tree.storageKey, 'portal-tree');
  assert.deepEqual(tree.defaultExpandedIds, ['skills']);
  assert.equal(tree.toggleBranchesOnSelect, true);

  tree.emit('sn-tree-select', { item: { id: 'a' } });
  tree.emit('sn-tree-toggle', { item: { id: 'b' } });

  assert.deepEqual(selected, [{ id: 'a' }]);
  assert.deepEqual(toggled, [{ id: 'b' }]);
});

test('tree panel helpers update provider tree and placeholder state', () => {
  let previousRequestAnimationFrame = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = (callback) => callback();

  try {
    let tree = createTree();
    let host = createHost(tree);
    let items = [{ id: 'src' }];

    setTreeItems(host, items, 'src');
    assert.equal(tree.items, items);
    assert.equal(tree.filterText, 'src');

    showTreePlaceholder(host, 'No files');
    assert.equal(host.ref.placeholder.textContent, 'No files');
    assert.equal(host.ref.placeholder.hidden, false);
    assert.equal(tree.hidden, true);

    showTree(host);
    assert.equal(host.ref.placeholder.hidden, true);
    assert.equal(tree.hidden, false);

    syncTreeFilter(host, 'readme');
    assert.equal(tree.filterText, 'readme');

    collapseTree(host);
    assert.equal(tree.collapsed, true);

    highlightTreePath(host, 'src/app.js', { scroll: true });
    assert.equal(tree.expandedPath, 'src/app.js');
    assert.equal(tree.selectedId, 'src/app.js');
    assert.equal(tree.scrolled, true);
  } finally {
    if (previousRequestAnimationFrame) {
      globalThis.requestAnimationFrame = previousRequestAnimationFrame;
    } else {
      delete globalThis.requestAnimationFrame;
    }
  }
});
