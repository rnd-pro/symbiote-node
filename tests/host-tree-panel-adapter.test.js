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
    $: {
      filterText: '',
    },
    ref: {
      placeholder: {
        hidden: true,
        textContent: '',
      },
      tree,
    },
  };
}

function createPanel(tree = createTree()) {
  let panel = createTree();
  panel.tree = tree;
  panel.placeholderText = '';
  panel.showingTree = false;
  panel.showPlaceholder = (message) => {
    panel.placeholderText = message;
    panel.showingTree = false;
  };
  panel.showTree = () => {
    panel.showingTree = true;
  };
  return panel;
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

test('tree panel helpers prefer library panel controller when present', () => {
  let selected = [];
  let tree = createTree();
  let panel = createPanel(tree);
  let host = {
    $: { filterText: '' },
    ref: { panel },
  };

  assert.equal(setupTreePanel(host, {
    storageKey: 'panel-tree',
    onSelect: (item) => selected.push(item),
  }), panel);

  assert.equal(panel.storageKey, 'panel-tree');
  panel.emit('sn-tree-select', { item: { id: 'panel-item' } });
  panel.emit('sn-tree-panel-filter', { filterText: 'panel' });
  assert.deepEqual(selected, [{ id: 'panel-item' }]);
  assert.equal(host.$.filterText, 'panel');

  setTreeItems(host, [{ id: 'a' }], 'a');
  assert.deepEqual(panel.items, [{ id: 'a' }]);
  assert.equal(panel.filterText, 'a');

  showTreePlaceholder(host, 'No matches');
  assert.equal(panel.placeholderText, 'No matches');

  showTree(host);
  assert.equal(panel.showingTree, true);
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
