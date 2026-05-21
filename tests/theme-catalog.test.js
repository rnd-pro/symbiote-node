import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  THEME_NAMES,
  flattenTokens,
  getTheme,
  getThemeTokens,
  listThemeRuleBlocks,
  listThemes,
  listTokenFiles,
} from '../manifest/theme-catalog.js';

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
    assert.equal(getThemeTokens('default-dark').component.accentBackground.$value, 'rgba(76, 139, 245, 0.12)');
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
      assert.equal(typeof block.description, 'string');
      assert.ok(Array.isArray(block.inputs));
      assert.ok(Array.isArray(block.outputs));
    }
    assert.equal(listThemeRuleBlocks({ kind: 'component-alias' }).length, 1);
  });
});
