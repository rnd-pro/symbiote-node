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
    it('exposes components', () => {
      assert.ok(data.manifest.components.length >= 13);
      for (let c of data.manifest.components) {
        assert.equal(typeof c.tagName, 'string');
        assert.equal(typeof c.className, 'string');
        assert.equal(typeof c.module, 'string');
        assert.equal(typeof c.category, 'string');
        assert.equal(typeof c.description, 'string');
      }
      let tags = data.manifest.components.map((c) => c.tagName);
      for (let tag of ['node-canvas', 'graph-node', 'source-editor', 'chat-transcript', 'chat-composer', 'chat-list', 'chat-list-item', 'project-tabs']) {
        assert.ok(tags.includes(tag), `${tag} must be discoverable`);
      }
    });

    it('exposes themes with token data', () => {
      assert.ok(data.manifest.themes.length >= 8);
      assert.ok(data.manifest.themes.some((theme) => theme.name === 'agent-portal'));
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

    it('exposes rulesets with inline rules', () => {
      assert.ok(data.manifest.rulesets.length >= 1);
      let symbiote = data.manifest.rulesets.find((r) => r.name === 'symbiote-3x');
      assert.ok(symbiote, 'symbiote-3x ruleset must exist');
      assert.equal(symbiote.version, '1.0.0');
      assert.ok(Array.isArray(symbiote.rules));
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
