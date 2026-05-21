import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getGraphSchema, listGraphVersions } from '../manifest/graph-schema.js';
import { getRule, getRuleSet, listRuleSets, listRules } from '../manifest/rule-catalog.js';

let PKG_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../');
let ruleset = JSON.parse(fs.readFileSync(path.join(PKG_ROOT, 'rules/symbiote-3x.json'), 'utf-8'));
let graphSchema = JSON.parse(fs.readFileSync(path.join(PKG_ROOT, 'schemas/graph-v1.json'), 'utf-8'));

describe('rule catalog', () => {
  it('has unique rule ids and expected library rules', () => {
    let ids = ruleset.rules.map((rule) => rule.id);
    assert.equal(new Set(ids).size, ids.length);
    for (let id of ['SYM-001', 'SYM-003', 'SYM-005', 'SYM-007', 'SYM-008', 'SYM-009']) {
      assert.ok(ids.includes(id), `${id} must exist`);
      assert.equal(getRule(id).id, id);
    }
  });

  it('exposes rulesets and filtered rules', () => {
    let catalogRuleset = getRuleSet('symbiote-3x');
    assert.equal(catalogRuleset.path, 'rules/symbiote-3x.json');
    assert.equal(catalogRuleset.description, ruleset.description);
    assert.equal('alignsWithSkills' in catalogRuleset, false);
    assert.equal('alignsWithSkills' in ruleset, false);
    assert.equal(listRuleSets().length, 1);
    assert.deepEqual(catalogRuleset.ruleIds, ruleset.rules.map((rule) => rule.id));
    assert.deepEqual(listRules({ ruleset: 'missing' }), []);
    assert.ok(listRules({ severity: 'error' }).length >= 5);
    assert.ok(listRules({ tag: 'library' }).some((rule) => rule.id === 'SYM-007'));
    assert.ok(listRules({ tag: 'exports' }).some((rule) => rule.id === 'SYM-009'));
  });

  it('catalog rules match the published ruleset JSON', () => {
    assert.deepEqual(listRules(), ruleset.rules);
    assert.deepEqual(listRules({ ruleset: 'symbiote-3x' }), ruleset.rules);
  });
});

describe('graph schema catalog', () => {
  it('schema has the required top-level graph structure', () => {
    assert.equal(graphSchema.type, 'object');
    assert.deepEqual(graphSchema.required, ['version', 'nodes', 'connections']);
    assert.ok(graphSchema.properties.nodes);
    assert.ok(graphSchema.properties.connections);
    assert.ok(graphSchema.$defs.node);
    assert.ok(graphSchema.$defs.connection);
  });

  it('exposes graph schema versions without importing JSON at runtime', () => {
    assert.deepEqual(listGraphVersions(), ['v1']);
    assert.deepEqual(getGraphSchema('v1').required, ['version', 'nodes', 'connections']);
  });

  it('catalog graph schema matches the published schema JSON', () => {
    assert.deepEqual(getGraphSchema('v1'), graphSchema);
  });
});
