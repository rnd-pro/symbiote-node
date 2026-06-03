import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getThemeCssTokens } from '../packages/symbiote-ui/manifest/theme-catalog.js';
import { DEFAULT_PROVIDER_THEME } from '../packages/symbiote-ui/themes/default-provider.js';

let PKG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../packages/symbiote-ui');

let COMPONENT_DIRS = [
  'canvas',
  'chat',
  'control',
  'display',
  'effects',
  'inspector',
  'layout',
  'list',
  'menu',
  'navigation',
  'node',
  'palette',
  'surface',
  'toolbar',
  'tree',
];

let LOCAL_OR_NATIVE_TOKEN_ALLOWLIST = new Map();

let CRITICAL_THEME_CASCADE_FILES = [
  'canvas/NodeCanvas/NodeCanvas.css.js',
  'canvas/CanvasGraph/CanvasGraph.css.js',
  'canvas/GraphExplorerShell/GraphExplorerShell.css.js',
  'canvas/GraphTabs/GraphTabs.css.js',
  'canvas/Minimap/Minimap.css.js',
  'canvas/Breadcrumb/Breadcrumb.css.js',
  'canvas/NodeSearch/NodeSearch.css.js',
  'chat/ChatComposer/ChatComposer.css.js',
  'chat/ChatSidebarItem/ChatSidebarItem.css.js',
  'chat/ChatTranscript/ChatTranscript.css.js',
  'chat/ChatMessageItem/ChatMessageItem.css.js',
  'display/LoadingOverlay/LoadingOverlay.css.js',
  'display/DataTable/DataTable.css.js',
  'display/EventFeed/EventFeed.css.js',
  'display/OutputGraphPreview/OutputGraphPreview.css.js',
  'display/OutputListPreview/OutputListPreview.css.js',
  'effects/CellBg/CellBg.css.js',
  'layout/LayoutSidebar/LayoutSidebar.css.js',
  'layout/LayoutNode/LayoutNode.css.js',
  'layout/ActionZone/ActionZone.css.js',
  'layout/PanelMenu/PanelMenu.css.js',
  'layout/ProjectTabs/ProjectTabs.css.js',
  'menu/ContextMenu/ContextMenu.css.js',
  'navigation/QuickOpen/QuickOpen.css.js',
  'node/GraphNode/GraphNode.css.js',
  'node/GraphFrame/GraphFrame.css.js',
  'node/PortItem/PortItem.css.js',
  'node/CtrlItem/CtrlItem.css.js',
  'node/NodeSocket/NodeSocket.css.js',
  'palette/PaletteBrowser/PaletteBrowser.css.js',
  'tree/TreeView/TreeView.css.js',
  'toolbar/QuickToolbar/QuickToolbar.css.js',
];

function listCssFiles(dir) {
  let files = [];
  for (let entry of fs.readdirSync(dir, { withFileTypes: true })) {
    let fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listCssFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.css.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

function collectComponentCssFiles() {
  return COMPONENT_DIRS.flatMap((dir) => listCssFiles(path.join(PKG_ROOT, dir))).sort();
}

function collectTokenReferences(files) {
  let references = new Map();

  for (let file of files) {
    let source = fs.readFileSync(file, 'utf-8');
    let relativeFile = path.relative(PKG_ROOT, file);
    let localDeclarations = new Set(
      [...source.matchAll(/(^|[^\w-])(--sn-[A-Za-z0-9_-]+)\s*:/g)].map((match) => match[2])
    );

    for (let match of source.matchAll(/var\(\s*(--sn-[A-Za-z0-9_-]+)\s*([,)])/g)) {
      let token = match[1];
      let tokenReferences = references.get(token) || [];
      tokenReferences.push({
        file: relativeFile,
        hasFallback: match[2] === ',',
        isLocalDeclaration: localDeclarations.has(token),
      });
      references.set(token, tokenReferences);
    }
  }

  return references;
}

function formatTokenReferences(entries) {
  if (entries.length === 0) return 'none';
  return entries
    .map(([token, references]) => {
      let locations = [...new Set(references.map((reference) => reference.file))].sort();
      return `${token}: ${locations.join(', ')}`;
    })
    .join('\n');
}

function isCoveredByRuntimeTheme(token, references, runtimeTokens) {
  if (runtimeTokens.has(token)) return true;
  if (LOCAL_OR_NATIVE_TOKEN_ALLOWLIST.has(token)) return true;
  return references.every((reference) => reference.isLocalDeclaration || reference.hasFallback);
}

describe('component token coverage', () => {
  it('keeps DEFAULT_PROVIDER_THEME runtime tokens aligned with the theme catalog', () => {
    assert.deepEqual(getThemeCssTokens('default-provider'), DEFAULT_PROVIDER_THEME.tokens);
  });

  it('covers public component CSS token references with DEFAULT_PROVIDER_THEME', () => {
    let references = collectTokenReferences(collectComponentCssFiles());
    let runtimeTokens = new Set(Object.keys(DEFAULT_PROVIDER_THEME.tokens));
    let uncovered = [...references.entries()]
      .filter(([token, tokenReferences]) => !isCoveredByRuntimeTheme(token, tokenReferences, runtimeTokens))
      .sort(([left], [right]) => left.localeCompare(right));

    assert.deepEqual(
      uncovered.map(([token]) => token),
      [],
      `Public component token references missing from DEFAULT_PROVIDER_THEME:\n${formatTokenReferences(uncovered)}`
    );
  });

  it('documents each local/private token coverage exception', () => {
    let references = collectTokenReferences(collectComponentCssFiles());
    let unusedAllowlistTokens = [...LOCAL_OR_NATIVE_TOKEN_ALLOWLIST.keys()]
      .filter((token) => !references.has(token))
      .sort();
    let undocumentedAllowlistTokens = [...LOCAL_OR_NATIVE_TOKEN_ALLOWLIST.entries()]
      .filter(([, reason]) => typeof reason !== 'string' || reason.length < 20)
      .map(([token]) => token)
      .sort();

    assert.deepEqual(unusedAllowlistTokens, [], 'Remove unused component token coverage allowlist entries.');
    assert.deepEqual(undocumentedAllowlistTokens, [], 'Document why each allowlisted token is not a public theme token.');
  });

  it('keeps critical public CSS components from declaring alternate literal fallback themes', () => {
    let literalFallback = /var\(\s*--sn-[\w-]+\s*,\s*(?:#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(|rgb\(|\d+(?:\.\d+)?px|'|")/;
    let colorLiteral = /(?:#[0-9a-fA-F]{3,8}|rgba?\(|rgb\(|hsla?\(|hsl\()/;
    let violations = [];

    for (let relativeFile of CRITICAL_THEME_CASCADE_FILES) {
      let source = fs.readFileSync(path.join(PKG_ROOT, relativeFile), 'utf-8');
      if (literalFallback.test(source)) {
        violations.push(`${relativeFile}: contains --sn literal fallback`);
      }
      if (colorLiteral.test(source)) {
        violations.push(`${relativeFile}: contains raw color literal`);
      }
    }

    assert.deepEqual(
      violations,
      [],
      `Critical theme cascade CSS must get defaults from DEFAULT_PROVIDER_THEME tokens:\n${violations.join('\n')}`,
    );
  });

  it('keeps chat message markup off inline visual styles', () => {
    let sources = [
      'chat/message-model.js',
      'chat/ChatMessageItem/ChatMessageItem.js',
      'chat/ChatTranscript/ChatTranscript.js',
    ].map((relativeFile) => [
      relativeFile,
      fs.readFileSync(path.join(PKG_ROOT, relativeFile), 'utf-8'),
    ]);

    let violations = sources
      .filter(([, source]) => /style="font-size|style="color|\.style\.fontSize|setAttribute\('style'/.test(source))
      .map(([relativeFile]) => relativeFile);

    assert.deepEqual(violations, [], 'Chat message visuals must be controlled through CSS classes and theme tokens.');
  });

  it('keeps loading overlay progress off inline visual styles', () => {
    let template = fs.readFileSync(path.join(PKG_ROOT, 'display/LoadingOverlay/LoadingOverlay.tpl.js'), 'utf-8');
    let component = fs.readFileSync(path.join(PKG_ROOT, 'display/LoadingOverlay/LoadingOverlay.js'), 'utf-8');

    assert.equal(template.includes('style='), false, 'LoadingOverlay template must not emit inline visual styles.');
    assert.ok(component.includes('--sn-loading-progress'), 'LoadingOverlay must expose progress through a CSS custom property.');
  });

  it('keeps CellBg visual identity in public theme tokens', () => {
    let component = fs.readFileSync(path.join(PKG_ROOT, 'effects/CellBg/CellBg.js'), 'utf-8');
    let styles = fs.readFileSync(path.join(PKG_ROOT, 'effects/CellBg/CellBg.css.js'), 'utf-8');
    let theme = fs.readFileSync(path.join(PKG_ROOT, 'themes/default-provider.js'), 'utf-8');

    for (let token of ['--sn-cell-bg', '--sn-cell-dot', '--sn-cell-base-alpha', '--sn-cell-alpha-span']) {
      assert.ok(component.includes(token), `CellBg runtime must read ${token}`);
      assert.ok(theme.includes(token), `DEFAULT_PROVIDER_THEME must provide ${token}`);
    }
    for (let token of ['--sn-cell-glare', '--sn-cell-vignette-mid', '--sn-cell-vignette-edge', '--sn-cell-noise']) {
      assert.ok(styles.includes(token), `CellBg CSS must use ${token}`);
      assert.ok(theme.includes(token), `DEFAULT_PROVIDER_THEME must provide ${token}`);
    }

    assert.equal(component.includes('BG_COLOR'), false, 'CellBg must not keep a local background color constant.');
    assert.equal(component.includes('DOT_COLOR'), false, 'CellBg must not keep a local dot color constant.');
    assert.equal(styles.includes('#1a1a1a'), false, 'CellBg CSS must not hardcode the Agent Portal background.');
    assert.equal(styles.includes('rgba('), false, 'CellBg CSS must not hardcode overlay colors.');
    assert.ok(component.includes('color\\(\\s*srgb'), 'CellBg must parse modern computed color(srgb ...) values.');
    assert.ok(component.includes('normalizeCssColor(this, bg)'), 'CellBg canvas fill must use resolved CSS color tokens.');
    assert.ok(component.includes('this.pulse(10000)'), 'CellBg must start with a timed visual pulse after mount.');
    assert.equal(component.includes('autoplay'), false, 'CellBg must not use permanent autoplay for the chat background.');
  });

  it('keeps layout structural gaps and panel borders on transparent layout tokens', () => {
    let layout = fs.readFileSync(path.join(PKG_ROOT, 'layout/Layout/Layout.css.js'), 'utf-8');
    let layoutNode = fs.readFileSync(path.join(PKG_ROOT, 'layout/LayoutNode/LayoutNode.css.js'), 'utf-8');
    let layoutSidebar = fs.readFileSync(path.join(PKG_ROOT, 'layout/LayoutSidebar/LayoutSidebar.css.js'), 'utf-8');
    let theme = fs.readFileSync(path.join(PKG_ROOT, 'themes/default-provider.js'), 'utf-8');

    assert.ok(layout.includes('background: var(--sn-layout-gap-bg)'), 'Layout root must expose transparent gap background.');
    assert.ok(layoutNode.includes('background: var(--sn-layout-gap-bg)'), 'Split resizer must inherit transparent gap background.');
    assert.ok(layoutNode.includes('background: var(--sn-layout-resizer-hover-bg)'), 'Split resizer hover must use the shared layout highlight token.');
    assert.ok(layoutNode.includes('border: 1px solid var(--sn-layout-border)'), 'Panel layout borders must use layout border tokens.');
    assert.ok(layoutNode.includes('border-bottom: 1px solid var(--sn-layout-border)'), 'Panel header separators must use layout border tokens.');
    assert.ok(layoutSidebar.includes('border-right: 1px solid var(--sn-layout-border)'), 'Sidebar-to-layout separator must use layout border tokens.');
    assert.ok(layoutSidebar.includes('background: var(--sn-layout-resizer-hover-bg)'), 'Sidebar resize highlight must match split resizer highlight.');
    assert.equal(layoutNode.includes('background: var(--sn-node-selected)'), false, 'Layout split resizers must not use accent blue for structural highlights.');
    assert.equal(layoutSidebar.includes('background: var(--sn-node-selected)'), false, 'Sidebar resize handle must not use accent blue for structural highlights.');
    assert.ok(theme.includes("'--sn-layout-gap-bg': 'transparent'"), 'Default provider theme must keep layout gaps transparent.');
    assert.ok(theme.includes("'--sn-layout-border': 'transparent'"), 'Default provider theme must keep layout borders transparent.');
  });

  it('keeps dialog helper visuals in public theme tokens', () => {
    let source = fs.readFileSync(path.join(PKG_ROOT, 'ui/dialogs.js'), 'utf-8');
    let theme = fs.readFileSync(path.join(PKG_ROOT, 'themes/default-provider.js'), 'utf-8');

    for (let token of [
      '--sn-dialog-bg',
      '--sn-dialog-color',
      '--sn-dialog-border',
      '--sn-dialog-radius',
      '--sn-dialog-shadow',
      '--sn-dialog-backdrop',
      '--sn-dialog-body-padding',
      '--sn-dialog-actions-gap',
    ]) {
      assert.ok(source.includes(token), `Dialog helpers must use ${token}`);
      assert.ok(theme.includes(token), `DEFAULT_PROVIDER_THEME must provide ${token}`);
    }

    assert.equal(/#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(|hsl\(/.test(source), false, 'Dialog helpers must not hardcode colors.');
    assert.equal(/var\(\s*--sn-[\w-]+\s*,/.test(source), false, 'Dialog helpers must not declare alternate fallback themes.');
  });

  it('keeps public component CSS off legacy host bridge theme aliases', () => {
    let violations = collectComponentCssFiles()
      .map((file) => [path.relative(PKG_ROOT, file), fs.readFileSync(file, 'utf-8')])
      .filter(([, source]) => /var\(\s*--(?:bg|text|layout-highlight|font-main)\b/.test(source))
      .map(([relativeFile]) => relativeFile);

    assert.deepEqual(
      violations,
      [],
      'Public component CSS must consume --sn-* provider tokens instead of legacy host bridge aliases.',
    );
  });
});
