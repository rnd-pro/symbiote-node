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
import { DEFAULT_PROVIDER_THEME } from '../themes/default-provider.js';

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
      'default-provider',
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
    assert.equal(getTheme('default-provider').path, 'tokens/themes/default-provider.json');
    assert.equal(getTheme('default-provider').defaultExport, 'DEFAULT_PROVIDER_THEME');
    assert.ok(getTheme('default-provider').aliases.includes('symbiote-default'));
    assert.equal(getThemeTokens('default-provider').color.accent.$value, 'hsl(var(--sn-hue-accent) var(--sn-sat-vivid) var(--sn-lit-accent))');
    assert.equal(getThemeTokens('default-provider').component.panelBackground.$value, 'hsl(var(--sn-hue-base) var(--sn-sat-muted) var(--sn-lit-surface))');
    assert.equal(getThemeTokens('default-provider').component.layoutGapBackground.$value, 'transparent');
    assert.equal(getThemeTokens('default-provider').component.layoutBorder.$value, 'transparent');
    assert.equal(
      getThemeTokens('default-provider').component.layoutPreviewJoinBackground.$value,
      'color-mix(in srgb, var(--sn-danger-color) 30%, transparent)'
    );
    assert.equal(getThemeTokens('default-provider').component.xrPanelBackground.$value, 'var(--sn-panel-bg)');
    assert.equal(getThemeTokens('default-provider').component.xrPanelBorder.$value, 'var(--sn-node-border)');
    assert.equal(getThemeTokens('default-provider').component.xrPanelRadius.$value, 'var(--sn-node-radius)');
    assert.equal(getThemeTokens('default-provider').component.xrPanelShadow.$value, 'var(--sn-node-shadow)');
    assert.equal(getThemeTokens('default-provider').component.xrPointerColor.$value, 'var(--sn-node-selected)');
    assert.equal(getThemeTokens('default-provider').provider.rndPro.color.$value, 'var(--sn-cat-data)');
    assert.equal(getThemeTokens('default-provider').provider.official.color.$value, 'var(--sn-node-selected)');
    assert.equal(getThemeTokens('default-provider').control.hue.$value, '218');
    assert.equal(getThemeTokens('default-provider').control.density.$value, '1');
    assert.equal(
      getThemeTokens('default-provider').component.accentBackground.$value,
      'hsl(var(--sn-hue-accent) var(--sn-sat-vivid) var(--sn-lit-accent) / 0.12)'
    );
    assert.equal(
      getThemeTokens('default-provider').component.successBackground.$value,
      'color-mix(in srgb, var(--sn-success-color) 18%, transparent)'
    );
    assert.equal(
      getThemeTokens('default-provider').component.successBackgroundHover.$value,
      'color-mix(in srgb, var(--sn-success-color) 28%, transparent)'
    );
    assert.equal(
      getThemeTokens('default-provider').component.subgraphBackground.$value,
      'linear-gradient(135deg, color-mix(in srgb, var(--sn-subgraph-accent) 12%, transparent) 0%, color-mix(in srgb, var(--sn-subgraph-accent) 8%, transparent) 100%)'
    );
    assert.equal(
      getThemeTokens('default-provider').component.fieldControlSubtleBorder.$value,
      'hsl(var(--sn-hue-base) var(--sn-sat-muted) var(--sn-lit-text) / var(--sn-alpha-faint))'
    );
    assert.equal(
      getThemeTokens('default-provider').component.dangerBackground.$value,
      'color-mix(in srgb, var(--sn-danger-color) 18%, transparent)'
    );
    assert.equal(
      getThemeTokens('default-provider').syntax.keyword.$value,
      'hsl(var(--sn-hue-danger) var(--sn-sat-vivid) 82%)'
    );
    assert.equal(
      getThemeTokens('default-provider').diagnostic.warningBackground.$value,
      'color-mix(in srgb, var(--sn-warning-color) 5%, transparent)'
    );
    assert.equal(getThemeTokens('default-provider').geometry.treeRowHeight.$value, '22px');
    assert.equal(getThemeTokens('default-provider').typography.iconFont.$value, "'Material Symbols Outlined'");
    assert.equal(getThemeTokens('default-provider').alias.composerBackground.$value, 'var(--sn-node-bg)');
    for (let legacy of ['dark', 'light', 'synthwave', 'grey', 'neon', 'carbon', 'pcb', 'ebook', 'default-dark']) {
      assert.equal(getTheme(legacy), undefined);
      assert.equal(getThemeTokens(legacy), undefined);
    }
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
      assert.equal(block.theme, 'default-provider');
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
    assert.equal(listThemeRuleBlocks({ theme: 'default-provider' }).length, blocks.length);
    assert.deepEqual(getThemeRuleBlocks('default-provider'), blocks);
    assert.ok(
      listThemeRuleBlocks({ kind: 'geometry-cascade' })[0].derivations.some((item) => item.output === 'geometry.treeRowHeight')
    );
  });

  it('publishes controls and element groups for parametric theme editing', () => {
    let controls = getThemeControls('default-provider');
    assert.deepEqual(
      controls.map((control) => control.name),
      ['hue', 'chroma', 'backgroundLightness', 'surfaceLightness', 'textLightness', 'density', 'radius', 'motion', 'elevation']
    );
    assert.equal(controls.find((control) => control.name === 'hue').cssVar, '--sn-theme-hue');
    assert.equal(controls.find((control) => control.name === 'chroma').cssVar, '--sn-theme-chroma');
    assert.equal(controls.find((control) => control.name === 'density').default, '1');

    controls.length = 0;
    assert.equal(getThemeControls('default-provider').length, 9);
    assert.deepEqual(getThemeControls('missing'), []);

    let groups = listThemeElementGroups();
    let groupNames = groups.map((group) => group.name);
    for (let name of ['panel', 'control', 'row', 'input', 'code-surface', 'status', 'graph', 'layout-preview', 'xr', 'tab']) {
      assert.ok(groupNames.includes(name), `${name} group must be published`);
    }

    let runtimeTokens = new Set(Object.keys(DEFAULT_PROVIDER_THEME.tokens));
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
    let runtimeTokens = new Set(Object.keys(DEFAULT_PROVIDER_THEME.tokens));
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
    let runtimeTokens = new Set(Object.keys(DEFAULT_PROVIDER_THEME.tokens));
    for (let component of listComponents()) {
      for (let alias of component.contract?.themeAliases || []) {
        assert.ok(runtimeTokens.has(alias), `${component.tagName} theme alias ${alias} must exist in DEFAULT_PROVIDER_THEME`);
      }
    }
  });

  it('builds agent-readable theme recipes from tokens, CSS variables, and rule blocks', () => {
    let recipe = getThemeRecipe('default-provider');
    assert.equal(recipe.name, 'default-provider');
    assert.equal(recipe.tokenFile, 'tokens/themes/default-provider.json');
    assert.equal(recipe.theme.path, 'tokens/themes/default-provider.json');
    assert.equal(recipe.theme.defaultExport, 'DEFAULT_PROVIDER_THEME');
    assert.equal(recipe.tokens.color.accent.$value, 'hsl(var(--sn-hue-accent) var(--sn-sat-vivid) var(--sn-lit-accent))');
    assert.equal(recipe.tokens.control.hue.$value, '218');
    assert.equal(recipe.flatTokens['geometry.treeRowHeight'].$value, '22px');
    assert.equal(recipe.cssTokens['--sn-layout-border'], 'transparent');
    assert.equal(recipe.cssTokens['--sn-theme-hue'], '218');
    assert.equal(
      recipe.cssTokenClassifications.length,
      Object.keys(DEFAULT_PROVIDER_THEME.tokens).length,
      'recipe must classify every runtime CSS token'
    );
    assert.ok(recipe.cssTokenClassifications.some((item) => item.cssVar === '--sn-theme-hue' && item.kind === 'source-control'));
    assert.ok(recipe.cssTokenClassifications.some((item) => item.cssVar === '--sn-provider-rnd-pro-color' && item.group === 'provider-accent'));
    assert.ok(recipe.cssTokenClassifications.some((item) => item.cssVar === '--sn-success-bg' && item.group === 'status'));
    assert.ok(recipe.cssTokenClassifications.some((item) => item.cssVar === '--sn-success-bg-hover' && item.group === 'status'));
    assert.ok(recipe.cssTokenClassifications.some((item) => item.cssVar === '--sn-danger-border' && item.group === 'status'));
    assert.ok(recipe.cssTokenClassifications.some((item) => item.cssVar === '--sn-subgraph-bg' && item.group === 'status'));
    assert.ok(recipe.cssTokenClassifications.some((item) => item.cssVar === '--sn-field-control-subtle-border' && item.group === 'control'));
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
    assert.equal(recipe.cssTokens['--sn-layout-preview-line'], 'var(--sn-node-selected)');
    assert.equal(recipe.cssTokens['--sn-field-toggle-thumb-active-bg'], 'var(--sn-text)');
    assert.equal(recipe.controls.length, getThemeControls('default-provider').length);
    assert.ok(recipe.elementGroups.some((group) => group.name === 'graph'));
    assert.equal(recipe.ruleBlocks.length, listThemeRuleBlocks({ theme: 'default-provider' }).length);
    recipe.tokens.color.accent.$value = '#000000';
    recipe.controls.length = 0;
    recipe.elementGroups.length = 0;
    recipe.ruleBlocks.length = 0;
    assert.equal(getThemeTokens('default-provider').color.accent.$value, 'hsl(var(--sn-hue-accent) var(--sn-sat-vivid) var(--sn-lit-accent))');
    assert.ok(getThemeRecipe('default-provider').controls.length > 0);
    assert.ok(getThemeRecipe('default-provider').elementGroups.length > 0);
    assert.ok(getThemeRecipe('default-provider').ruleBlocks.length > 0);
    assert.deepEqual(getThemeCssTokens('missing'), {});
    assert.equal(getThemeRecipe('missing'), undefined);
  });

  it('keeps static default provider CSS aligned with runtime theme tokens', () => {
    let css = fs.readFileSync(path.join(PKG_ROOT, 'themes/default-provider.css'), 'utf-8');
    let cssTokens = new Map();
    for (let match of css.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)) {
      cssTokens.set(match[1], match[2].trim());
    }

    assert.equal(cssTokens.size, Object.keys(DEFAULT_PROVIDER_THEME.tokens).length);
    for (let [token, value] of Object.entries(DEFAULT_PROVIDER_THEME.tokens)) {
      assert.equal(cssTokens.get(token), value, `themes/default-provider.css must publish ${token}`);
    }
  });

  it('keeps template preview status styling token-driven', () => {
    let css = fs.readFileSync(path.join(PKG_ROOT, 'inspector/TemplatePreview/TemplatePreview.css.js'), 'utf-8');
    for (let literal of ['#4caf50', '#81c784', '#f44336', '#ef9a9a', 'rgba(76, 175, 80', 'rgba(244, 67, 54']) {
      assert.equal(css.includes(literal), false, `TemplatePreview must not hardcode ${literal}`);
    }
    for (let token of ['--sn-success-bg', '--sn-success-border', '--sn-danger-bg', '--sn-danger-border']) {
      assert.ok(css.includes(token), `TemplatePreview must consume ${token}`);
      assert.ok(DEFAULT_PROVIDER_THEME.tokens[token], `${token} must exist in DEFAULT_PROVIDER_THEME`);
    }
  });

  it('keeps inspector and layout preview styling token-driven', () => {
    let files = [
      'inspector/InspectorPanel/InspectorPanel.css.js',
      'layout/LayoutPreview/LayoutPreview.css.js',
    ];
    let forbidden = [
      /#[0-9a-fA-F]{3,8}/,
      /rgba\(/,
      /var\([^)]*,/,
      /linear-gradient\(/,
    ];
    for (let file of files) {
      let css = fs.readFileSync(path.join(PKG_ROOT, file), 'utf-8');
      for (let pattern of forbidden) {
        assert.equal(pattern.test(css), false, `${file} must not include ${pattern}`);
      }
    }
    for (let token of [
      '--sn-subgraph-bg',
      '--sn-subgraph-bg-hover',
      '--sn-success-bg-hover',
      '--sn-layout-preview-join-bg',
      '--sn-layout-preview-line-shadow',
      '--sn-field-control-subtle-border',
    ]) {
      assert.ok(DEFAULT_PROVIDER_THEME.tokens[token], `${token} must exist in DEFAULT_PROVIDER_THEME`);
    }
  });
});
