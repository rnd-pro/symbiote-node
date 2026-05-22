import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  THEME_NAMES,
  flattenTokens,
  getTheme,
  getThemeControls,
  getThemeCssTokens,
  listThemeCssTokenClassifications,
  getThemeRecipe,
  getThemeRuleBlocks,
  getThemeTokens,
  listThemeElementGroups,
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
    assert.equal(getThemeTokens('default-dark').provider.rndPro.color.$value, 'var(--sn-cat-data)');
    assert.equal(getThemeTokens('default-dark').provider.official.color.$value, 'var(--sn-node-selected)');
    assert.equal(getThemeTokens('default-dark').control.hue.$value, '218');
    assert.equal(getThemeTokens('default-dark').control.density.$value, '1');
    assert.equal(
      getThemeTokens('default-dark').component.accentBackground.$value,
      'hsl(var(--sn-hue-accent) var(--sn-sat-vivid) var(--sn-lit-accent) / 0.12)'
    );
    assert.equal(
      getThemeTokens('default-dark').component.successBackground.$value,
      'color-mix(in srgb, var(--sn-success-color) 18%, transparent)'
    );
    assert.equal(
      getThemeTokens('default-dark').component.dangerBackground.$value,
      'color-mix(in srgb, var(--sn-danger-color) 18%, transparent)'
    );
    assert.equal(
      getThemeTokens('default-dark').syntax.keyword.$value,
      'hsl(var(--sn-hue-danger) var(--sn-sat-vivid) 82%)'
    );
    assert.equal(
      getThemeTokens('default-dark').diagnostic.warningBackground.$value,
      'color-mix(in srgb, var(--sn-warning-color) 5%, transparent)'
    );
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

  it('publishes controls and element groups for parametric theme editing', () => {
    let controls = getThemeControls('default-dark');
    assert.deepEqual(
      controls.map((control) => control.name),
      ['hue', 'chroma', 'backgroundLightness', 'surfaceLightness', 'textLightness', 'density', 'radius', 'motion', 'elevation']
    );
    assert.equal(controls.find((control) => control.name === 'hue').cssVar, '--sn-theme-hue');
    assert.equal(controls.find((control) => control.name === 'chroma').cssVar, '--sn-theme-chroma');
    assert.equal(controls.find((control) => control.name === 'density').default, '1');

    controls.length = 0;
    assert.equal(getThemeControls('default-dark').length, 9);
    assert.deepEqual(getThemeControls('missing'), []);

    let groups = listThemeElementGroups();
    let groupNames = groups.map((group) => group.name);
    for (let name of ['panel', 'control', 'row', 'input', 'code-surface', 'status', 'graph', 'tab']) {
      assert.ok(groupNames.includes(name), `${name} group must be published`);
    }

    let runtimeTokens = new Set(Object.keys(DEFAULT_DARK.tokens));
    let componentTags = new Set(listComponents().map((component) => component.tagName));
    for (let group of groups) {
      assert.equal(typeof group.description, 'string');
      assert.ok(Array.isArray(group.tokens));
      assert.ok(Array.isArray(group.usedBy));
      for (let token of group.tokens) {
        assert.ok(runtimeTokens.has(token), `${group.name} token ${token} must exist in the runtime theme`);
      }
      for (let tagName of group.usedBy) {
        assert.ok(componentTags.has(tagName), `${group.name} usedBy ${tagName} must be a registered component`);
      }
    }

    groups[0].tokens.length = 0;
    assert.ok(listThemeElementGroups()[0].tokens.length > 0);
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

  it('resolves component theme aliases against the default runtime theme', () => {
    let runtimeTokens = new Set(Object.keys(DEFAULT_DARK.tokens));
    for (let component of listComponents()) {
      for (let alias of component.contract?.themeAliases || []) {
        assert.ok(runtimeTokens.has(alias), `${component.tagName} theme alias ${alias} must exist in DEFAULT_DARK`);
      }
    }
  });

  it('builds agent-readable theme recipes from tokens, CSS variables, and rule blocks', () => {
    let recipe = getThemeRecipe('default-dark');
    assert.equal(recipe.name, 'default-dark');
    assert.equal(recipe.tokenFile, 'tokens/themes/default-dark.json');
    assert.equal(recipe.theme.path, 'tokens/themes/default-dark.json');
    assert.equal(recipe.tokens.color.accent.$value, '#4c8bf5');
    assert.equal(recipe.tokens.control.hue.$value, '218');
    assert.equal(recipe.flatTokens['geometry.treeRowHeight'].$value, '22px');
    assert.equal(recipe.cssTokens['--sn-layout-border'], 'transparent');
    assert.equal(recipe.cssTokens['--sn-theme-hue'], '218');
    assert.equal(
      recipe.cssTokenClassifications.length,
      Object.keys(DEFAULT_DARK.tokens).length,
      'recipe must classify every runtime CSS token'
    );
    assert.ok(recipe.cssTokenClassifications.some((item) => item.cssVar === '--sn-theme-hue' && item.kind === 'source-control'));
    assert.ok(recipe.cssTokenClassifications.some((item) => item.cssVar === '--sn-provider-rnd-pro-color' && item.group === 'provider-accent'));
    assert.ok(recipe.cssTokenClassifications.some((item) => item.cssVar === '--sn-success-bg' && item.group === 'status'));
    assert.ok(recipe.cssTokenClassifications.some((item) => item.cssVar === '--sn-danger-border' && item.group === 'status'));
    assert.ok(recipe.cssTokenClassifications.some((item) => item.cssVar === '--sn-syntax-keyword' && item.group === 'syntax'));
    assert.ok(recipe.cssTokenClassifications.some((item) => item.cssVar === '--sn-diagnostic-error-bg' && item.group === 'diagnostic'));
    assert.ok(recipe.cssTokenClassifications.some((item) => item.cssVar === '--sn-layout-gap-bg' && item.group === 'layout'));
    assert.ok(recipe.cssTokenClassifications.some((item) => item.cssVar === '--sn-tree-row-height' && item.group === 'navigation-row'));
    assert.ok(recipe.cssTokenClassifications.some((item) => item.cssVar === '--sn-effect-focus-ring' && item.kind === 'motion-effects'));
    assert.ok(
      recipe.cssTokenClassifications.every((item) => item.kind !== 'unclassified'),
      'default runtime CSS tokens must stay agent-classified'
    );
    assert.equal(recipe.cssTokenSource, 'runtime-theme');
    assert.equal(
      recipe.cssTokens['--sn-effect-hover-transition'],
      'background-color calc(120ms * var(--sn-theme-motion-scale)) ease, border-color calc(120ms * var(--sn-theme-motion-scale)) ease'
    );
    assert.equal(recipe.controls.length, getThemeControls('default-dark').length);
    assert.ok(recipe.elementGroups.some((group) => group.name === 'graph'));
    assert.equal(recipe.ruleBlocks.length, listThemeRuleBlocks({ theme: 'default-dark' }).length);
    recipe.tokens.color.accent.$value = '#000000';
    recipe.controls.length = 0;
    recipe.elementGroups.length = 0;
    recipe.ruleBlocks.length = 0;
    assert.equal(getThemeTokens('default-dark').color.accent.$value, '#4c8bf5');
    assert.ok(getThemeRecipe('default-dark').controls.length > 0);
    assert.ok(getThemeRecipe('default-dark').elementGroups.length > 0);
    assert.ok(getThemeRecipe('default-dark').ruleBlocks.length > 0);
    assert.equal(getThemeRecipe('dark').cssTokenSource, 'not-runtime-complete');
    assert.deepEqual(getThemeRecipe('dark').cssTokens, {});
    assert.deepEqual(listThemeCssTokenClassifications('dark'), []);
    assert.deepEqual(getThemeCssTokens('missing'), {});
    assert.equal(getThemeRecipe('missing'), undefined);
  });

  it('keeps template preview status styling token-driven', () => {
    let css = fs.readFileSync(path.join(PKG_ROOT, 'inspector/TemplatePreview/TemplatePreview.css.js'), 'utf-8');
    for (let literal of ['#4caf50', '#81c784', '#f44336', '#ef9a9a', 'rgba(76, 175, 80', 'rgba(244, 67, 54']) {
      assert.equal(css.includes(literal), false, `TemplatePreview must not hardcode ${literal}`);
    }
    for (let token of ['--sn-success-bg', '--sn-success-border', '--sn-danger-bg', '--sn-danger-border']) {
      assert.ok(css.includes(token), `TemplatePreview must consume ${token}`);
      assert.ok(DEFAULT_DARK.tokens[token], `${token} must exist in DEFAULT_DARK`);
    }
  });
});
