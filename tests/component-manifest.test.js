import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  COMPONENTS,
  getComponent,
  getComponentModule,
  getComponentTags,
  hasComponent,
  listComponents,
} from '../manifest/component-registry.js';

let PKG_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../');
let manifestPath = path.join(PKG_ROOT, 'custom-elements.json');
let manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
let requiredTags = [
  'graph-node',
  'node-socket',
  'node-canvas',
  'canvas-graph',
  'panel-layout',
  'layout-sidebar',
  'layout-node',
  'project-tabs',
  'project-tab-item',
  'code-block',
  'cb-squiggle',
  'source-viewer',
  'source-editor',
  'sn-loading-overlay',
  'output-list-preview',
  'output-graph-preview',
  'cell-bg',
  'quick-toolbar',
  'inspector-panel',
  'palette-browser',
  'node-minimap',
  'node-search',
  'graph-tabs',
  'graph-breadcrumb',
  'quick-open',
  'chat-message-item',
  'chat-transcript',
  'chat-composer',
  'chat-list',
  'chat-list-item',
  'chat-sidebar-shell',
  'chat-sidebar-item',
  'chat-sidebar-sub-item',
  'sn-list-item',
  'sn-tree-view',
];

function declarationTags() {
  return manifest.modules.flatMap((mod) => {
    return (mod.declarations || []).map((declaration) => declaration.tagName).filter(Boolean);
  });
}

describe('custom-elements manifest', () => {
  it('declares the required public custom elements', () => {
    let tags = declarationTags();
    for (let tag of requiredTags) {
      assert.ok(tags.includes(tag), `${tag} must be declared`);
    }
  });

  it('maps every manifest module to an existing source file', () => {
    for (let mod of manifest.modules) {
      assert.ok(fs.existsSync(path.join(PKG_ROOT, mod.path)), `${mod.path} must exist`);
    }
  });
});

describe('component registry', () => {
  it('contains the same required tags', () => {
    assert.deepEqual(getComponentTags().sort(), requiredTags.sort());
    assert.equal(COMPONENTS.length, requiredTags.length);
  });

  it('supports lookups and category filtering', () => {
    assert.equal(hasComponent('node-canvas'), true);
    assert.equal(getComponent('node-canvas').className, 'NodeCanvas');
    assert.equal(getComponentModule('node-canvas'), 'canvas/NodeCanvas/NodeCanvas.js');
    assert.equal(getComponent('canvas-graph').className, 'CanvasGraph');
    assert.equal(getComponentModule('canvas-graph'), 'canvas/CanvasGraph/CanvasGraph.js');
    assert.equal(getComponent('cell-bg').category, 'effects');
    assert.equal(getComponentModule('sn-list-item'), 'list/ListItem/ListItem.js');
    assert.equal(getComponent('sn-tree-view').category, 'tree');
    assert.equal(getComponentModule('sn-tree-view'), 'tree/TreeView/TreeView.js');
    assert.equal(getComponentModule('sn-loading-overlay'), 'display/LoadingOverlay/LoadingOverlay.js');
    assert.equal(getComponent('output-list-preview').category, 'display');
    assert.equal(getComponentModule('output-graph-preview'), 'display/OutputGraphPreview/OutputGraphPreview.js');
    assert.ok(listComponents({ category: 'canvas' }).length >= 4);
  });
});
