import test from 'node:test';
import assert from 'node:assert/strict';

import * as LayoutTree from '../packages/symbiote-ui/layout/LayoutTree.js';

test('collectPanels supports canonical layout node shapes', () => {
  let tree = LayoutTree.createSplit(
    'horizontal',
    LayoutTree.createPanel('file-tree'),
    LayoutTree.createSplit(
      'vertical',
      LayoutTree.createPanel('code-viewer'),
      Object.assign(LayoutTree.createPanel('agent-chat'), { global: true }),
      0.5
    ),
    0.6
  );

  assert.deepEqual(
    LayoutTree.collectPanelTypes(tree),
    ['file-tree', 'code-viewer', 'agent-chat']
  );
  assert.deepEqual(
    LayoutTree.collectPanelTypes(tree, { includeGlobal: false }),
    ['file-tree', 'code-viewer']
  );
});

test('collectPanels includes root-level global panel collections when requested', () => {
  let tree = {
    ...LayoutTree.createSplit(
      'horizontal',
      LayoutTree.createPanel('graph'),
      LayoutTree.createPanel('runtime'),
      0.62
    ),
    global: [
      Object.assign(LayoutTree.createPanel('inspector'), { global: true }),
      Object.assign(LayoutTree.createPanel('status'), { global: true }),
    ],
  };

  assert.deepEqual(
    LayoutTree.collectPanelTypes(tree),
    ['graph', 'runtime', 'inspector', 'status']
  );
  assert.deepEqual(
    LayoutTree.collectPanelTypes(tree, { includeGlobal: false }),
    ['graph', 'runtime']
  );
});

test('collectPanels ignores non-canonical layout shapes', () => {
  let tree = LayoutTree.createSplit(
    'horizontal',
    LayoutTree.createPanel('file-tree'),
    {
      nodeType: 'split',
      children: [
        { nodeType: 'panel', id: 'old-code', panelType: 'code-viewer' },
        { nodeType: 'panel', id: 'old-chat', panelType: 'agent-chat', global: true },
      ],
    },
    0.6
  );

  assert.deepEqual(LayoutTree.collectPanelTypes(tree), ['file-tree']);
});

test('getPrimaryPanelType ignores global panels', () => {
  let tree = LayoutTree.createSplit(
    'horizontal',
    Object.assign(LayoutTree.createPanel('agent-chat'), { global: true }),
    LayoutTree.createPanel('explorer'),
    0.65
  );

  assert.equal(LayoutTree.getPrimaryPanelType(tree), 'explorer');
  assert.equal(LayoutTree.getPrimaryPanelType(null), null);
});

test('panel type membership helpers support required and disallowed checks', () => {
  let tree = LayoutTree.createSplit(
    'vertical',
    LayoutTree.createPanel('skills-tree'),
    LayoutTree.createSplit(
      'horizontal',
      LayoutTree.createPanel('skills-library'),
      LayoutTree.createPanel('skill-meta'),
      0.5
    ),
    0.5
  );

  assert.equal(LayoutTree.hasEveryPanelType(tree, ['skills-tree', 'skill-meta']), true);
  assert.equal(LayoutTree.hasEveryPanelType(tree, ['skills-tree', 'missing']), false);
  assert.equal(LayoutTree.hasAnyPanelType(tree, ['missing', 'skill-meta']), true);
  assert.equal(LayoutTree.hasAnyPanelType(tree, ['missing']), false);
});

test('createSidebarSubPanels returns stable sidebar descriptors for multi-panel layouts', () => {
  let tree = LayoutTree.createSplit(
    'horizontal',
    LayoutTree.createPanel('file-tree'),
    Object.assign(LayoutTree.createPanel('agent-chat'), { global: true }),
    0.65
  );

  assert.deepEqual(LayoutTree.createSidebarSubPanels(tree, {
    'file-tree': { title: 'Files', icon: 'folder' },
    'agent-chat': { title: 'Chat', icon: 'chat' },
  }), []);

  assert.deepEqual(LayoutTree.createSidebarSubPanels(tree, {
    'file-tree': { title: 'Files', icon: 'folder' },
    'agent-chat': { title: 'Chat', icon: 'chat' },
  }, { includeGlobal: true }).map((panel) => ({
    title: panel.title,
    icon: panel.icon,
    isMaster: panel.isMaster,
    panelType: panel.panelType,
  })), [
    { title: 'Files', icon: 'folder', isMaster: true, panelType: 'file-tree' },
    { title: 'Chat', icon: 'chat', isMaster: false, panelType: 'agent-chat' },
  ]);
});
