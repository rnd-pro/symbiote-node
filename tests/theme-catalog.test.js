import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  THEME_NAMES,
  flattenTokens,
  getTheme,
  getThemeRuleBlocks,
  getThemeTokens,
  listThemeRuleBlocks,
  listThemes,
  listTokenFiles,
} from '../manifest/theme-catalog.js';
import { listComponents } from '../manifest/component-registry.js';
import { DEFAULT_DARK } from '../themes/default-dark.js';

let PKG_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../');

function isTokenLeaf(value) {
  return value && typeof value === 'object' && '$value' in value && '$type' in value;
}

function assertLeaves(node, context = 'token') {
  for (let [key, value] of Object.entries(node)) {
    if (key.startsWith('$') || key === 'name' || key === 'extends') continue;
    let next = `${context}.${key}`;
    if (isTokenLeaf(value)) {
      assert.equal(typeof value.$type, 'string', `${next} $type`);
      assert.equal(typeof value.$value, 'string', `${next} $value`);
    } else {
      assertLeaves(value, next);
    }
  }
}

describe('theme token files', () => {
  it('publishes the expected theme names', () => {
    assert.deepEqual(THEME_NAMES, [
      'default-dark',
      'dark',
      'light',
      'carbon',
      'pcb',
      'neon',
      'grey',
      'synthwave',
      'ebook',
    ]);
  });

  it('all token JSON files parse and use DTCG-style leaves', () => {
    for (let file of listTokenFiles()) {
      let parsed = JSON.parse(fs.readFileSync(path.join(PKG_ROOT, file.path), 'utf-8'));
      assertLeaves(parsed, file.path);
    }
  });

  it('catalog functions expose theme metadata and flatten tokens', () => {
    assert.equal(listThemes().length, THEME_NAMES.length);
    assert.equal(getTheme('default-dark').path, 'tokens/themes/default-dark.json');
    assert.equal(getThemeTokens('default-dark').color.accent.$value, '#4c8bf5');
    assert.equal(getThemeTokens('default-dark').component.panelBackground.$value, '#222222');
    assert.equal(getThemeTokens('default-dark').component.layoutGapBackground.$value, 'transparent');
    assert.equal(getThemeTokens('default-dark').component.layoutBorder.$value, 'transparent');
    assert.equal(getThemeTokens('default-dark').component.accentBackground.$value, 'rgba(76, 139, 245, 0.12)');
    assert.equal(getThemeTokens('default-dark').geometry.treeRowHeight.$value, '22px');
    assert.equal(getThemeTokens('default-dark').typography.iconFont.$value, "'Material Symbols Outlined'");
    assert.equal(getThemeTokens('default-dark').alias.composerBackground.$value, 'var(--sn-node-bg)');
    assert.equal(getTheme('dark').path, 'tokens/themes/dark.json');
    assert.equal(getThemeTokens('dark').color.accent.$type, 'color');
    assert.equal(flattenTokens(getThemeTokens('dark'))['color.accent'].$value, 'hsl(215, 60%, 65%)');
  });

  it('catalog token payloads match published token JSON files', () => {
    for (let name of THEME_NAMES) {
      let file = getTheme(name);
      let parsed = JSON.parse(fs.readFileSync(path.join(PKG_ROOT, file.path), 'utf-8'));
      assert.deepEqual(getThemeTokens(name), parsed, `${name} catalog tokens must match ${file.path}`);
    }
  });

  it('publishes rule blocks for cascading theme construction', () => {
    let blocks = listThemeRuleBlocks();
    let kinds = blocks.map((block) => block.kind);
    assert.deepEqual(kinds, [
      'source-accent',
      'color-cascade',
      'geometry-cascade',
      'typography-cascade',
      'motion-effects',
      'semantic-alias',
      'component-alias',
    ]);
    for (let block of blocks) {
      assert.equal(typeof block.name, 'string');
      assert.equal(block.theme, 'default-dark');
      assert.equal(typeof block.description, 'string');
      assert.ok(Array.isArray(block.parameters));
      assert.ok(Array.isArray(block.inputs));
      assert.ok(Array.isArray(block.outputs));
      assert.ok(Array.isArray(block.derivations));
      assert.ok(block.derivations.length > 0);
      for (let derivation of block.derivations) {
        assert.equal(typeof derivation.output, 'string');
        assert.equal(typeof derivation.expression, 'string');
      }
    }
    assert.equal(listThemeRuleBlocks({ kind: 'component-alias' }).length, 1);
    assert.equal(listThemeRuleBlocks({ theme: 'default-dark' }).length, blocks.length);
    assert.deepEqual(getThemeRuleBlocks('default-dark'), blocks);
    assert.ok(
      listThemeRuleBlocks({ kind: 'geometry-cascade' })[0].derivations.some((item) => item.output === 'geometry.treeRowHeight')
    );
  });

  it('keeps rule block outputs linked to real theme and component contracts', () => {
    let knownThemes = new Set(THEME_NAMES);
    let componentTags = new Set(listComponents().map((component) => component.tagName));
    let tokenPathsByTheme = new Map(
      THEME_NAMES.map((name) => [name, new Set(Object.keys(flattenTokens(getThemeTokens(name))))])
    );
    let runtimeTokens = new Set(Object.keys(DEFAULT_DARK.tokens));
    let isKnownOutput = (theme, output) => tokenPathsByTheme.get(theme)?.has(output) || runtimeTokens.has(output);

    for (let block of listThemeRuleBlocks()) {
      assert.ok(knownThemes.has(block.theme), `${block.name} references a known theme`);
      for (let output of block.outputs) {
        assert.ok(isKnownOutput(block.theme, output), `${block.name} output ${output} must exist in theme tokens`);
      }
      for (let derivation of block.derivations) {
        assert.ok(isKnownOutput(block.theme, derivation.output), `${block.name} derivation ${derivation.output} must exist in theme tokens`);
      }
      for (let tagName of block.appliesTo || []) {
        assert.ok(componentTags.has(tagName), `${block.name} applies to registered component ${tagName}`);
      }
    }
  });
});
