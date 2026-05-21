import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  COMPONENTS,
  getComponent,
  getComponentExportName,
  getComponentModule,
  getComponentSpecifier,
  getComponentTags,
  hasComponent,
  listComponents,
} from '../manifest/component-registry.js';

let PKG_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../');
let manifestPath = path.join(PKG_ROOT, 'custom-elements.json');
let manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
let componentDirs = [
  'canvas',
  'chat',
  'display',
  'effects',
  'inspector',
  'layout',
  'list',
  'menu',
  'navigation',
  'node',
  'palette',
  'toolbar',
  'tree',
];
let sideEffectTags = [
  'action-zone',
  'breadcrumb-item',
  'cb-squiggle',
  'ctrl-item',
  'ctx-item',
  'insp-ctrl-item',
  'insp-port-item',
  'layout-preview',
  'pal-category',
  'pal-item',
  'panel-menu',
  'port-item',
  'project-tab-item',
  'search-result-item',
  'sidebar-section',
  'sidebar-sub-item',
  'tab-item',
  'template-preview',
];

function jsFiles(dir) {
  let entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (let entry of entries) {
    let fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...jsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

function runtimeRegistrationTags() {
  let tags = [];
  let regPattern = /\.reg\(["']([^"']+)["']\)/g;
  for (let dir of componentDirs) {
    for (let file of jsFiles(path.join(PKG_ROOT, dir))) {
      let source = fs.readFileSync(file, 'utf-8');
      let match;
      while ((match = regPattern.exec(source))) {
        tags.push(match[1]);
      }
    }
  }
  return [...new Set(tags)].sort();
}

function declarationTags() {
  return manifest.modules.flatMap((mod) => {
    return (mod.declarations || []).map((declaration) => declaration.tagName).filter(Boolean);
  });
}

describe('custom-elements manifest', () => {
  it('declares every public custom element', () => {
    let tags = declarationTags();
    for (let tag of getComponentTags()) {
      assert.ok(tags.includes(tag), `${tag} must be declared`);
    }
  });

  it('keeps internal child elements out of the public custom-elements manifest', () => {
    let tags = declarationTags();
    for (let tag of sideEffectTags) {
      assert.equal(tags.includes(tag), false, `${tag} must remain internal registry metadata`);
    }
  });

  it('maps every manifest module to an existing source file', () => {
    for (let mod of manifest.modules) {
      assert.ok(fs.existsSync(path.join(PKG_ROOT, mod.path)), `${mod.path} must exist`);
    }
  });
});

describe('component registry', () => {
  it('contains the same tags as runtime custom element registration', () => {
    let runtimeTags = runtimeRegistrationTags();
    assert.deepEqual(getComponentTags({ includeInternal: true }).sort(), runtimeTags);
    assert.equal(COMPONENTS.length, runtimeTags.length);
  });

  it('supports lookups and category filtering', () => {
    assert.equal(hasComponent('node-canvas'), true);
    assert.equal(getComponent('node-canvas').className, 'NodeCanvas');
    assert.equal(getComponentModule('node-canvas'), 'canvas/NodeCanvas/NodeCanvas.js');
    assert.equal(getComponentSpecifier('node-canvas'), 'symbiote-node/ui');
    assert.equal(getComponentExportName('node-canvas'), 'NodeCanvas');
    assert.equal(getComponent('canvas-graph').className, 'CanvasGraph');
    assert.equal(getComponentModule('canvas-graph'), 'canvas/CanvasGraph/CanvasGraph.js');
    assert.equal(getComponentModule('graph-explorer-shell'), 'canvas/GraphExplorerShell/GraphExplorerShell.js');
    assert.equal(getComponent('cell-bg').category, 'effects');
    assert.equal(getComponentModule('sn-list-item'), 'list/ListItem/ListItem.js');
    assert.equal(getComponent('sn-tree-view').category, 'tree');
    assert.equal(getComponentModule('sn-tree-view'), 'tree/TreeView/TreeView.js');
    assert.equal(getComponentModule('sn-loading-overlay'), 'display/LoadingOverlay/LoadingOverlay.js');
    assert.equal(getComponent('output-list-preview').category, 'display');
    assert.equal(getComponentModule('output-graph-preview'), 'display/OutputGraphPreview/OutputGraphPreview.js');
    assert.equal(getComponentExportName('project-tab-item'), null);
    assert.equal(getComponent('project-tab-item').importKind, 'side-effect');
    assert.equal(getComponentExportName('context-menu'), 'ContextMenu');
    assert.equal(getComponentExportName('graph-frame'), 'GraphFrame');
    assert.ok(listComponents({ category: 'canvas' }).length >= 4);
  });

  it('marks internal child elements as side-effect components', () => {
    for (let tag of sideEffectTags) {
      assert.equal(getComponentExportName(tag), null, `${tag} must not be a named export`);
      assert.equal(getComponent(tag).importKind, 'side-effect', `${tag} must be side-effect metadata`);
      assert.equal(getComponent(tag).internal, true, `${tag} must be internal metadata`);
    }
  });

  it('keeps internal child elements out of the default public catalog', () => {
    let publicTags = getComponentTags();
    for (let tag of sideEffectTags) {
      assert.equal(publicTags.includes(tag), false, `${tag} must not be listed by default`);
    }
    assert.equal(getComponentTags({ includeInternal: true }).includes('project-tab-item'), true);
  });

  it('advertises public package specifiers instead of private implementation imports', () => {
    for (let component of COMPONENTS) {
      assert.equal(component.specifier, 'symbiote-node/ui');
      assert.ok(component.module.endsWith('.js'), `${component.tagName} keeps source metadata`);
    }
  });

  it('publishes data-only contracts for first runtime UI surfaces', () => {
    for (let tag of [
      'panel-layout',
      'project-tabs',
      'source-viewer',
      'source-editor',
      'sn-loading-overlay',
      'chat-transcript',
      'chat-composer',
      'sn-list-item',
      'sn-tree-view',
    ]) {
      let component = getComponent(tag);
      assert.ok(component.contract, `${tag} must expose contract metadata`);
      assert.equal(component.contract.schemaVersion, 'component-descriptor-v1');
      assert.ok(Array.isArray(component.contract.capabilities));
      assert.ok(Array.isArray(component.contract.themeAliases));
      assert.equal(JSON.stringify(component.contract).includes('function '), false);
      assert.equal(JSON.stringify(component.contract).includes('document.'), false);
      assert.equal(/\bhost-app-specific\b/.test(JSON.stringify(component.contract)), false);
    }
    assert.ok(getComponent('sn-list-item').contract.events.some((event) => event.name === 'sn-list-item-select'));
    assert.ok(getComponent('source-editor').contract.events.some((event) => event.name === 'source-editor-input'));
    assert.ok(getComponent('sn-loading-overlay').contract.methods.some((method) => method.name === 'setProgress'));
    assert.ok(getComponent('sn-tree-view').contract.events.some((event) => event.name === 'sn-tree-select'));
    assert.ok(getComponent('chat-composer').contract.methods.some((method) => method.name === 'setValue'));
    assert.ok(getComponent('source-viewer').contract.methods.some((method) => method.name === 'showFile'));
  });
});
