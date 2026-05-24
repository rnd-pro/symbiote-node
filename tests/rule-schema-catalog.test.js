import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getGraphSchema, listGraphVersions } from '../manifest/graph-schema.js';
import { getProjectSchema, listProjectSchemaVersions } from '../manifest/project-schema-catalog.js';
import { getRule, getRuleSet, listRuleSets, listRules } from '../manifest/rule-catalog.js';
import { getUiSchema, listUiSchemaVersions } from '../manifest/ui-schema-catalog.js';

let PKG_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../');
let ruleset = JSON.parse(fs.readFileSync(path.join(PKG_ROOT, 'rules/symbiote-3x.json'), 'utf-8'));
let graphSchema = JSON.parse(fs.readFileSync(path.join(PKG_ROOT, 'schemas/graph-v1.json'), 'utf-8'));
let graphModelSchema = JSON.parse(fs.readFileSync(path.join(PKG_ROOT, 'schemas/graph-model-v1.json'), 'utf-8'));
let projectPackageSchema = JSON.parse(fs.readFileSync(path.join(PKG_ROOT, 'schemas/project-package-v1.json'), 'utf-8'));
let projectTransactionSchema = JSON.parse(fs.readFileSync(path.join(PKG_ROOT, 'schemas/project-transaction-v1.json'), 'utf-8'));
let uiSchemas = {
  'component-descriptor-v1': JSON.parse(fs.readFileSync(path.join(PKG_ROOT, 'schemas/component-descriptor-v1.json'), 'utf-8')),
  'runtime-ui-v1': JSON.parse(fs.readFileSync(path.join(PKG_ROOT, 'schemas/runtime-ui-v1.json'), 'utf-8')),
  'theme-rule-block-v1': JSON.parse(fs.readFileSync(path.join(PKG_ROOT, 'schemas/theme-rule-block-v1.json'), 'utf-8')),
};

describe('rule catalog', () => {
  it('has unique rule ids and expected library rules', () => {
    let ids = ruleset.rules.map((rule) => rule.id);
    assert.equal(new Set(ids).size, ids.length);
    for (let id of ['SYM-001', 'SYM-003', 'SYM-005', 'SYM-007', 'SYM-008', 'SYM-009', 'SYM-018']) {
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
    assert.deepEqual(listGraphVersions(), ['v1', 'graph-model-v1']);
    assert.deepEqual(getGraphSchema('v1').required, ['version', 'nodes', 'connections']);
    assert.deepEqual(getGraphSchema('graph-model-v1').required, ['version', 'nodes']);
  });

  it('catalog graph schema matches the published schema JSON', () => {
    assert.deepEqual(getGraphSchema('v1'), graphSchema);
    assert.deepEqual(getGraphSchema('graph-model-v1'), graphModelSchema);
  });
});

describe('project schema catalog', () => {
  it('exposes project package schema versions without importing JSON at runtime', () => {
    assert.deepEqual(listProjectSchemaVersions(), ['project-package-v1', 'project-transaction-v1']);
    assert.deepEqual(getProjectSchema('project-package-v1').required, ['version', 'id', 'entry', 'graphs', 'layouts', 'themes']);
    assert.deepEqual(getProjectSchema('project-transaction-v1').required, ['version', 'id', 'operations']);
  });

  it('catalog project schema matches the published schema JSON', () => {
    assert.deepEqual(getProjectSchema('project-package-v1'), projectPackageSchema);
    assert.deepEqual(getProjectSchema('project-transaction-v1'), projectTransactionSchema);
  });
});

describe('runtime UI schema catalog', () => {
  it('exposes provider UI schema versions', () => {
    assert.deepEqual(listUiSchemaVersions(), [
      'component-descriptor-v1',
      'runtime-ui-v1',
      'theme-rule-block-v1',
    ]);
  });

  it('catalog UI schemas match published schema JSON files', () => {
    for (let [version, schema] of Object.entries(uiSchemas)) {
      assert.deepEqual(getUiSchema(version), schema);
    }
  });

  it('defines constructible component, runtime UI, and theme rule block contracts', () => {
    assert.ok(getUiSchema('component-descriptor-v1').$defs.componentContract);
    assert.ok(getUiSchema('runtime-ui-v1').$defs.node);
    assert.ok(getUiSchema('runtime-ui-v1').$defs.componentRegistry);
    assert.ok(getUiSchema('runtime-ui-v1').$defs.layout);
    assert.ok(getUiSchema('runtime-ui-v1').$defs.relativeRect);
    assert.ok(getUiSchema('runtime-ui-v1').properties.componentRegistries);
    assert.ok(getUiSchema('runtime-ui-v1').$defs.node.properties.componentRegistry);
    assert.ok(getUiSchema('runtime-ui-v1').$defs.node.properties.layout);
    assert.ok(getUiSchema('theme-rule-block-v1').properties.kind.enum.includes('geometry-cascade'));
    assert.ok(getUiSchema('theme-rule-block-v1').properties.parameters);
    assert.ok(getUiSchema('theme-rule-block-v1').properties.derivations);
    assert.deepEqual(
      getUiSchema('theme-rule-block-v1').properties.derivations.items.required,
      ['output', 'expression']
    );
  });
});
