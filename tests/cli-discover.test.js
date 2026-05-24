/**
 * CLI JSON / discover contract tests for symbiote-node.
 *
 * Verifies --json output for list, inspect, validate and the discover command.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

import {
  cmdDiscover,
  cmdList,
  cmdInspect,
  cmdValidate,
  parseArgs,
} from '../engine/cli.js';

let tmpFile;
let workflowJSON = {
  version: 'v1',
  name: 'CLI Test Workflow',
  id: 'cli-test-001',
  nodes: [
    { id: 'inputA', type: 'compound/input', name: 'A', params: { key: 'val' } },
    { id: 'outputB', type: 'compound/output', name: 'B', params: {} },
  ],
  connections: [
    { from: 'inputA', out: 'data', to: 'outputB', in: 'data' },
  ],
  execution: { mode: 'sequential', cache: false },
};

before(() => {
  tmpFile = resolve(tmpdir(), `sn-cli-test-${randomUUID()}.json`);
  writeFileSync(tmpFile, JSON.stringify(workflowJSON, null, 2));
});

after(() => {
  if (existsSync(tmpFile)) unlinkSync(tmpFile);
});

describe('parseArgs', () => {
  it('parses command and target', () => {
    let result = parseArgs(['node', 'cli.js', 'run', 'file.json']);
    assert.equal(result.command, 'run');
    assert.equal(result.target, 'file.json');
  });

  it('parses --json as boolean flag', () => {
    let result = parseArgs(['node', 'cli.js', 'list', '--json']);
    assert.equal(result.command, 'list');
    assert.equal(result.options.json, true);
  });

  it('parses --pack with value', () => {
    let result = parseArgs(['node', 'cli.js', 'run', 'file.json', '--pack', 'custom']);
    assert.equal(result.options.pack, 'custom');
  });

  it('parses multiple flags', () => {
    let result = parseArgs(['node', 'cli.js', 'run', 'file.json', '--json', '--verbose', '--pack', 'demo']);
    assert.equal(result.options.json, true);
    assert.equal(result.options.verbose, true);
    assert.equal(result.options.pack, 'demo');
  });

  it('no command returns empty', () => {
    let result = parseArgs(['node', 'cli.js']);
    assert.equal(result.command, undefined);
    assert.equal(result.target, '');
  });
});

describe('discover command', () => {
  /** @type {object} */
  let data;

  before(async () => {
    data = await cmdDiscover();
    assert.ok(data, 'discover must return data');
  });

  it('declares top-level command key', () => {
    assert.equal(data.command, 'discover');
  });

  it('exposes package metadata', () => {
    assert.equal(data.package.name, 'symbiote-node');
    assert.equal(typeof data.package.version, 'string');
    assert.equal(typeof data.package.description, 'string');
  });

  it('exposes public package export discovery', () => {
    assert.ok(Array.isArray(data.exports.subpaths));
    assert.ok(Array.isArray(data.exports.entrypoints));

    let subpaths = data.exports.subpaths.map((entry) => entry.subpath);
    for (let subpath of ['.', './ui', './layout', './manifest', './display/highlight', './display/markdown-formatter', './custom-elements.json']) {
      assert.ok(subpaths.includes(subpath), `${subpath} must be discoverable`);
    }

    let entrypoints = new Map(data.exports.entrypoints.map((entry) => [entry.specifier, entry]));
    for (let specifier of ['symbiote-node/ui', 'symbiote-node/layout', 'symbiote-node/manifest', 'symbiote-node/custom-elements.json']) {
      assert.ok(entrypoints.has(specifier), `${specifier} must be described`);
      assert.equal(typeof entrypoints.get(specifier).description, 'string');
    }
    assert.equal(entrypoints.get('symbiote-node/ui').kind, 'browser');
    assert.equal(entrypoints.get('symbiote-node/layout').kind, 'ssr-safe');
  });

  describe('registry', () => {
    it('exposes driver details', () => {
      assert.ok(data.registry.totalDrivers >= 2);
      assert.equal(data.registry.drivers.length, data.registry.totalDrivers);
      for (let d of data.registry.drivers) {
        assert.equal(typeof d.type, 'string');
        assert.equal(typeof d.category, 'string');
        assert.ok(Array.isArray(d.inputs));
        assert.ok(Array.isArray(d.outputs));
        assert.ok(Array.isArray(d.params));
        assert.equal(typeof d.description, 'string');
      }
    });

    it('exposes menu grouped by category', () => {
      assert.ok(data.registry.menu.length >= 1);
      for (let group of data.registry.menu) {
        assert.equal(typeof group.category, 'string');
        assert.ok(Array.isArray(group.nodes));
        for (let node of group.nodes) {
          assert.equal(typeof node.type, 'string');
        }
      }
    });

    it('exposes packs as array', () => {
      assert.ok(Array.isArray(data.registry.packs));
    });
  });

  describe('socketTypes', () => {
    it('exposes known socket types', () => {
      assert.ok(data.socketTypes.length >= 7);
      let names = data.socketTypes.map((s) => s.name);
      for (let name of ['any', 'float', 'int', 'string', 'boolean', 'object', 'array']) {
        assert.ok(names.includes(name), `socket type "${name}" must exist`);
      }
    });

    it('each socket has required fields', () => {
      for (let s of data.socketTypes) {
        assert.equal(typeof s.name, 'string');
        assert.equal(typeof s.label, 'string');
        assert.ok('color' in s);
        assert.ok('description' in s);
      }
    });
  });

  describe('manifest', () => {
    it('exposes experimental renderer capabilities', () => {
      assert.ok(Array.isArray(data.manifest.renderers));
      let renderer = data.manifest.renderers.find((item) => item.name === 'html-in-canvas');

      assert.ok(renderer, 'html-in-canvas renderer must be discoverable');
      assert.equal(renderer.status, 'experimental');
      assert.equal(renderer.specifier, 'symbiote-node/ui');
      assert.equal(renderer.fallback, 'dom-overlay');
      assert.ok(renderer.modes.includes('offscreen2d'));
      assert.ok(renderer.capabilities.includes('interactive-canvas-ui'));
      assert.ok(renderer.capabilities.includes('offscreen-worker-snapshots'));
      assert.equal(renderer.apis.canvas2dDraw, 'drawElementImage');
      assert.equal(renderer.apis.elementCapture, 'captureElementImage');
      assert.equal(renderer.requiredCanvasAttribute, 'layoutsubtree');

      let webxr = data.manifest.renderers.find((item) => item.name === 'webxr');
      assert.ok(webxr, 'webxr renderer must be discoverable');
      assert.equal(webxr.status, 'experimental');
      assert.equal(webxr.specifier, 'symbiote-node/xr');
      assert.equal(webxr.fallback, 'dom-canvas');
      assert.ok(webxr.modes.includes('immersive-vr'));
      assert.ok(webxr.modes.includes('immersive-ar'));
      assert.ok(webxr.capabilities.includes('xr-layout-projection'));
      assert.ok(webxr.capabilities.includes('xr-spatial-scene'));
      assert.ok(webxr.capabilities.includes('xr-pointer-normalization'));
      assert.ok(webxr.capabilities.includes('xr-scene-controller'));
      assert.ok(webxr.capabilities.includes('xr-theme-bridge'));
      assert.ok(webxr.capabilities.includes('xr-panel-host'));
      assert.ok(webxr.capabilities.includes('xr-content-pointer-target'));
      assert.ok(webxr.capabilities.includes('xr-panel-gesture'));
      assert.ok(webxr.capabilities.includes('xr-layout-transaction'));
      assert.ok(webxr.capabilities.includes('xr-emulated-test-runtime'));
      assert.ok(webxr.capabilities.includes('iwer-emulation-runtime'));
      assert.ok(webxr.capabilities.includes('xr-html-in-canvas-renderer'));
    });

    it('exposes components', () => {
      assert.ok(data.manifest.components.length >= 13);
      for (let c of data.manifest.components) {
        assert.equal(typeof c.tagName, 'string');
        assert.equal(typeof c.className, 'string');
        assert.equal(typeof c.module, 'string');
        assert.equal(c.specifier, 'symbiote-node/ui');
        assert.ok(c.importKind === 'named' || c.importKind === 'side-effect');
        if (c.importKind === 'named') assert.equal(typeof c.exportName, 'string');
        assert.equal(typeof c.category, 'string');
        assert.equal(typeof c.description, 'string');
        assert.ok('contract' in c);
      }
      let tags = data.manifest.components.map((c) => c.tagName);
      for (let tag of ['node-canvas', 'graph-node', 'source-editor', 'chat-transcript', 'chat-composer', 'chat-list', 'chat-list-item', 'project-tabs']) {
        assert.ok(tags.includes(tag), `${tag} must be discoverable`);
      }
      assert.equal(tags.includes('project-tab-item'), false);
      assert.equal(tags.includes('cb-squiggle'), false);
    });

    it('exposes constructible contracts for first runtime UI surfaces', () => {
      let components = new Map(data.manifest.components.map((component) => [component.tagName, component]));
      for (let tag of [
        'graph-node',
        'node-canvas',
        'canvas-graph',
        'graph-explorer-shell',
        'context-menu',
        'panel-layout',
        'layout-sidebar',
        'layout-node',
        'project-tabs',
        'code-block',
        'source-viewer',
        'source-editor',
        'sn-loading-overlay',
        'output-list-preview',
        'output-graph-preview',
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
        'sn-tree-panel',
        'sn-button',
        'sn-field',
        'sn-card',
        'sn-badge',
        'sn-metric',
        'sn-event-feed',
        'sn-banner',
        'sn-empty-state',
        'node-socket',
        'cell-bg',
        'quick-toolbar',
        'inspector-panel',
        'palette-browser',
        'node-minimap',
        'node-search',
        'graph-tabs',
        'graph-breadcrumb',
        'graph-frame',
      ]) {
        let component = components.get(tag);
        assert.ok(component, `${tag} must be discoverable`);
        assert.ok(component.contract, `${tag} must expose a component contract`);
        assert.equal(component.contract.schemaVersion, 'component-descriptor-v1');
        assert.ok(Array.isArray(component.contract.capabilities), `${tag} capabilities must be data`);
        assert.ok(Array.isArray(component.contract.events), `${tag} events must be data`);
        assert.ok(Array.isArray(component.contract.themeAliases), `${tag} theme aliases must be data`);
        assert.equal(/\bhost-app-specific\b/.test(JSON.stringify(component.contract)), false, `${tag} contract must stay provider-neutral`);
      }
      assert.ok(components.get('chat-composer').contract.events.some((event) => event.name === 'chat-composer-send'));
      assert.ok(components.get('source-editor').contract.events.some((event) => event.name === 'source-editor-input'));
      assert.ok(components.get('sn-list-item').contract.events.some((event) => event.name === 'sn-list-item-select'));
      assert.ok(components.get('sn-tree-view').contract.events.some((event) => event.name === 'sn-tree-select'));
      assert.ok(components.get('sn-tree-panel').contract.methods.some((method) => method.name === 'showPlaceholder'));
      assert.ok(components.get('sn-tree-panel').contract.events.some((event) => event.name === 'sn-tree-panel-filter'));
      assert.ok(components.get('sn-button').contract.events.some((event) => event.name === 'click'));
      assert.ok(components.get('sn-field').contract.slots.some((slot) => slot.name === 'default'));
      assert.ok(components.get('sn-card').contract.slots.some((slot) => slot.name === 'default'));
      assert.ok(components.get('sn-badge').contract.slots.some((slot) => slot.name === 'default'));
      assert.ok(components.get('sn-metric').contract.slots.some((slot) => slot.name === 'label'));
      assert.ok(components.get('sn-event-feed').contract.methods.some((method) => method.name === 'setEvents'));
      assert.ok(components.get('sn-banner').contract.slots.some((slot) => slot.name === 'default'));
      assert.ok(components.get('sn-empty-state').contract.slots.some((slot) => slot.name === 'default'));
      assert.ok(components.get('canvas-graph').contract.methods.some((method) => method.name === 'setGraphModel'));
      assert.ok(components.get('graph-explorer-shell').contract.slots.some((slot) => slot.name === 'canvas'));
      assert.ok(components.get('context-menu').contract.methods.some((method) => method.name === 'show'));
      assert.ok(components.get('node-canvas').contract.events.some((event) => event.name === 'manualviewport'));
      assert.ok(components.get('layout-node').contract.events.some((event) => event.name === 'layout-change'));
      assert.ok(components.get('code-block').contract.methods.some((method) => method.name === 'setDiagnostics'));
      assert.ok(components.get('output-list-preview').contract.methods.some((method) => method.name === 'setItems'));
      assert.ok(components.get('output-graph-preview').contract.methods.some((method) => method.name === 'setGraph'));
      assert.ok(components.get('quick-open').contract.events.some((event) => event.name === 'quick-open-select'));
      assert.ok(components.get('chat-message-item').contract.properties.some((property) => property.name === 'cardItems'));
      assert.ok(components.get('chat-list').contract.events.some((event) => event.name === 'chat-list-select'));
      assert.ok(components.get('chat-sidebar-shell').contract.events.some((event) => event.name === 'chat-sidebar-select'));
      assert.ok(components.get('node-socket').contract.attributes.some((attribute) => attribute.name === 'data-socket-shape'));
      assert.ok(components.get('cell-bg').contract.methods.some((method) => method.name === 'pulse'));
      assert.ok(components.get('quick-toolbar').contract.methods.some((method) => method.name === 'updatePosition'));
      assert.ok(components.get('inspector-panel').contract.events.some((event) => event.name === 'ctrl-change'));
      assert.ok(components.get('palette-browser').contract.methods.some((method) => method.name === 'setCategories'));
      assert.ok(components.get('node-minimap').contract.events.some((event) => event.name === 'minimap-navigate'));
      assert.ok(components.get('graph-frame').contract.properties.some((property) => property.name === 'color'));
      assert.ok(components.get('node-search').contract.methods.some((method) => method.name === 'configure'));
      assert.ok(components.get('graph-tabs').contract.methods.some((method) => method.name === 'addTab'));
      assert.ok(components.get('graph-breadcrumb').contract.methods.some((method) => method.name === 'setPath'));
    });

    it('exposes themes with token data', () => {
      assert.ok(data.manifest.themes.length >= 8);
      assert.ok(data.manifest.themes.some((theme) => theme.name === 'default-dark'));
      for (let t of data.manifest.themes) {
        assert.equal(typeof t.name, 'string');
        assert.ok(t.tokens, `${t.name} must have tokens`);
        assert.equal(typeof t.tokens.color.accent.$type, 'string');
        assert.equal(typeof t.tokens.color.accent.$value, 'string');
      }
    });

    it('exposes tokenFiles', () => {
      assert.ok(data.manifest.tokenFiles.length >= 9);
      let baseFile = data.manifest.tokenFiles.find((f) => f.name === 'base');
      assert.ok(baseFile, 'base token file must exist');
      assert.equal(baseFile.kind, 'base');
    });

    it('exposes theme rule blocks for cascading agent-built themes', () => {
      assert.ok(Array.isArray(data.manifest.themeRuleBlocks));
      let kinds = data.manifest.themeRuleBlocks.map((block) => block.kind);
      for (let kind of ['source-accent', 'color-cascade', 'geometry-cascade', 'typography-cascade', 'motion-effects', 'semantic-alias', 'component-alias']) {
        assert.ok(kinds.includes(kind), `${kind} theme rule block must be discoverable`);
      }
      let componentAlias = data.manifest.themeRuleBlocks.find((block) => block.kind === 'component-alias');
      assert.equal(componentAlias.theme, 'default-dark');
      assert.ok(componentAlias.outputs.includes('--sn-layout-gap-bg'));
      assert.ok(componentAlias.appliesTo.includes('chat-composer'));
      assert.ok(componentAlias.derivations.some((item) => item.output === '--sn-layout-border'));
      let geometry = data.manifest.themeRuleBlocks.find((block) => block.kind === 'geometry-cascade');
      assert.ok(geometry.parameters.some((item) => item.name === 'size.unit'));
      assert.ok(geometry.derivations.some((item) => item.output === 'geometry.treeRowHeight'));
    });

    it('exposes theme recipes for agent composition', () => {
      assert.ok(Array.isArray(data.manifest.themeControls['default-dark']));
      assert.ok(data.manifest.themeControls['default-dark'].some((control) => control.name === 'hue'));
      assert.ok(data.manifest.themeControls['default-dark'].some((control) => control.cssVar === '--sn-theme-density'));
      assert.ok(Array.isArray(data.manifest.themeElementGroups));
      assert.ok(data.manifest.themeElementGroups.some((group) => group.name === 'graph'));
      assert.ok(data.manifest.themeElementGroups.some((group) => group.name === 'row'));
      assert.ok(Array.isArray(data.manifest.themeRecipes));
      let recipe = data.manifest.themeRecipes.find((item) => item.name === 'default-dark');
      assert.ok(recipe, 'default-dark recipe must be discoverable');
      assert.equal(recipe.tokenFile, 'tokens/themes/default-dark.json');
      assert.equal(recipe.flatTokens['control.hue'].$value, '218');
      assert.equal(recipe.flatTokens['color.accent'].$value, 'hsl(var(--sn-hue-accent) var(--sn-sat-vivid) var(--sn-lit-accent))');
      assert.equal(recipe.cssTokens['--sn-layout-border'], 'transparent');
      assert.equal(recipe.cssTokens['--sn-theme-hue'], '218');
      assert.ok(recipe.cssTokenClassifications.some((item) => item.cssVar === '--sn-theme-hue' && item.kind === 'source-control'));
      assert.ok(recipe.cssTokenClassifications.some((item) => item.cssVar === '--sn-layout-gap-bg' && item.group === 'layout'));
      assert.ok(recipe.cssTokenClassifications.every((item) => item.kind !== 'unclassified'));
      assert.equal(recipe.cssTokenSource, 'runtime-theme');
      assert.ok(recipe.controls.some((control) => control.name === 'chroma'));
      assert.ok(recipe.elementGroups.some((group) => group.name === 'control'));
      assert.ok(recipe.ruleBlocks.some((block) => block.kind === 'component-alias'));
      let darkRecipe = data.manifest.themeRecipes.find((item) => item.name === 'dark');
      assert.equal(darkRecipe.cssTokenSource, 'not-runtime-complete');
    });

    it('exposes rulesets with inline rules', () => {
      assert.ok(data.manifest.rulesets.length >= 1);
      let symbiote = data.manifest.rulesets.find((r) => r.name === 'symbiote-3x');
      assert.ok(symbiote, 'symbiote-3x ruleset must exist');
      assert.equal(symbiote.version, '1.0.0');
      assert.ok(Array.isArray(symbiote.rules));
      assert.deepEqual(symbiote.rules.map((r) => r.id), data.manifest.rules.map((r) => r.id));
    });

    it('exposes flat rules list', () => {
      assert.ok(data.manifest.rules.length >= 8);
      let ids = data.manifest.rules.map((r) => r.id);
      for (let id of ['SYM-001', 'SYM-005', 'SYM-007', 'SYM-008', 'SYM-009']) {
        assert.ok(ids.includes(id), `${id} must be in rules`);
      }
      for (let r of data.manifest.rules) {
        assert.equal(typeof r.id, 'string');
        assert.equal(typeof r.name, 'string');
        assert.equal(typeof r.severity, 'string');
        assert.ok(Array.isArray(r.tags));
      }
    });

    it('exposes graph and runtime UI schemas', () => {
      let schemas = new Map(data.manifest.schemas.map((schema) => [schema.version, schema]));
    for (let version of ['v1', 'graph-model-v1', 'project-package-v1', 'project-transaction-v1', 'component-descriptor-v1', 'runtime-ui-v1', 'theme-rule-block-v1']) {
      assert.ok(schemas.has(version), `${version} schema must be discoverable`);
      assert.equal(typeof schemas.get(version).path, 'string');
      assert.equal(typeof schemas.get(version).$id, 'string');
      }
    });

    it('exposes graph schemas', () => {
      assert.ok(data.manifest.schemas.length >= 1);
      let v1 = data.manifest.schemas.find((s) => s.version === 'v1');
      assert.ok(v1, 'graph schema v1 must exist');
      assert.ok(v1.required.includes('version'));
      assert.ok(v1.required.includes('nodes'));
      assert.ok(v1.required.includes('connections'));
    });
  });
});

describe('list --json', () => {
  /** @type {object} */
  let data;

  before(async () => {
    data = await cmdList({ json: true });
    assert.ok(data);
  });

  it('has expected top-level shape', () => {
    assert.equal(data.command, 'list');
    assert.equal(typeof data.total, 'number');
    assert.ok(Array.isArray(data.categories));
    assert.ok(Array.isArray(data.drivers));
  });

  it('drivers have input/output/param metadata', () => {
    for (let d of data.drivers) {
      assert.ok(Array.isArray(d.inputs));
      assert.ok(Array.isArray(d.outputs));
      assert.ok(Array.isArray(d.params));
      for (let inp of d.inputs) {
        assert.equal(typeof inp.name, 'string');
        assert.equal(typeof inp.type, 'string');
      }
    }
  });
});

describe('inspect --json', () => {
  /** @type {object} */
  let data;

  before(async () => {
    data = await cmdInspect(tmpFile, { json: true });
    assert.ok(data);
  });

  it('has expected top-level shape', () => {
    assert.equal(data.command, 'inspect');
    assert.equal(data.file, tmpFile);
    assert.equal(data.name, 'CLI Test Workflow');
    assert.equal(data.nodeCount, 2);
    assert.equal(data.connectionCount, 1);
  });

  it('exposes node details', () => {
    assert.ok(Array.isArray(data.nodes));
    assert.equal(data.nodes.length, 2);
    let nodeA = data.nodes.find((n) => n.id === 'inputA');
    assert.ok(nodeA);
    assert.equal(nodeA.type, 'compound/input');
    assert.ok(Array.isArray(nodeA.paramKeys));
    assert.ok(nodeA.paramKeys.includes('key'));
  });

  it('exposes connections', () => {
    assert.ok(Array.isArray(data.connections));
    let conn = data.connections[0];
    assert.equal(conn.from, 'inputA');
    assert.equal(conn.to, 'outputB');
  });

  it('exposes execution config', () => {
    assert.ok(data.execution);
    assert.equal(data.execution.mode, 'sequential');
  });
});

describe('validate --json', () => {
  /** @type {object} */
  let data;

  before(async () => {
    data = await cmdValidate(tmpFile, { json: true });
    assert.ok(data);
  });

  it('reports valid workflow', () => {
    assert.equal(data.command, 'validate');
    assert.equal(data.valid, true);
    assert.equal(data.errorCount, 0);
    assert.ok(Array.isArray(data.errors));
    assert.ok(Array.isArray(data.warnings));
  });
});
