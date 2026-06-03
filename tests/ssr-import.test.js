/**
 * SSR import boundary test for symbiote-ui and symbiote-engine.
 *
 * Validates that the library can be imported on Node.js
 * without crashing on missing browser globals (document,
 * window, HTMLElement, customElements, etc.).
 *
 * The library targets browser runtime, so not all symbols
 * are expected to be fully functional under Node — but the
 * import itself must not throw.
 *
 * Run: node --test tests/ssr-import.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const UI_PKG_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../packages/symbiote-ui');
const ENGINE_PKG_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../packages/symbiote-engine');

describe('SSR-safe import boundary', () => {
  it('main entry import does not throw', async () => {
    await assert.doesNotReject(
      import('symbiote-ui'),
      'symbiote-ui main entry must import without throwing'
    );
  });

  it('ui entry import does not throw without DOM globals', async () => {
    let domGlobals = ['window', 'document', 'HTMLElement', 'customElements', 'CSSStyleSheet'];
    for (let name of domGlobals) {
      assert.equal(globalThis[name], undefined, `${name} should not exist before UI import`);
    }

    let ui = await import(`../packages/symbiote-ui/ui/index.js?ssr=${Date.now()}`);
    assert.equal(ui.CanvasGraph, undefined, 'CanvasGraph must stay browser-only without DOM globals');

    await assert.doesNotReject(
      Promise.resolve(ui),
      'UI entry must import without throwing in Node/SSR'
    );

    for (let name of domGlobals) {
      assert.equal(globalThis[name], undefined, `UI import must not create globalThis.${name}`);
    }
  });

  it('shared UI styles import without DOM globals', async () => {
    let domGlobals = ['window', 'document', 'HTMLElement', 'customElements', 'CSSStyleSheet'];
    for (let name of domGlobals) {
      assert.equal(globalThis[name], undefined, `${name} should not exist before shared styles import`);
    }

    let module = await import(`../packages/symbiote-ui/ui/shared-styles.js?ssr=${Date.now()}`);

    assert.equal(typeof module.sharedUiStyles, 'string');
    assert.match(module.sharedUiStyles, /:host/);
    assert.doesNotMatch(module.sharedUiStyles, /\.ui-/);
    for (let name of domGlobals) {
      assert.equal(globalThis[name], undefined, `shared styles import must not create globalThis.${name}`);
    }
  });

  it('locale modules import without DOM globals', async () => {
    let domGlobals = ['window', 'document', 'HTMLElement', 'customElements', 'CSSStyleSheet'];
    for (let name of domGlobals) {
      assert.equal(globalThis[name], undefined, `${name} should not exist before locale import`);
    }

    let locale = await import(`../packages/symbiote-ui/locale/index.js?ssr=${Date.now()}`);
    let uiLocale = await import(`../packages/symbiote-ui/ui/locale.js?ssr=${Date.now()}`);

    assert.equal(locale.DEFAULT_LOCALE, 'en');
    assert.equal(typeof uiLocale.detectBrowserLocale, 'function');
    for (let name of domGlobals) {
      assert.equal(globalThis[name], undefined, `locale import must not create globalThis.${name}`);
    }
  });

  it('dialog helpers import without DOM globals', async () => {
    let domGlobals = ['window', 'document', 'HTMLElement', 'customElements', 'CSSStyleSheet'];
    for (let name of domGlobals) {
      assert.equal(globalThis[name], undefined, `${name} should not exist before dialog import`);
    }

    let module = await import(`../packages/symbiote-ui/ui/dialogs.js?ssr=${Date.now()}`);

    assert.equal(typeof module.uiAlert, 'function');
    assert.equal(typeof module.uiConfirm, 'function');
    assert.equal(typeof module.uiPrompt, 'function');
    for (let name of domGlobals) {
      assert.equal(globalThis[name], undefined, `dialog import must not create globalThis.${name}`);
    }
  });

  it('engine entry import does not throw', async () => {
    await assert.doesNotReject(
      import('symbiote-engine'),
      'symbiote-engine entry must import without throwing'
    );
  });

  it('core modules import without throwing', async () => {
    let modules = [
      '../packages/symbiote-ui/core/index.js',
      '../packages/symbiote-ui/core/Editor.js',
      '../packages/symbiote-ui/core/Node.js',
      '../packages/symbiote-ui/core/Connection.js',
      '../packages/symbiote-ui/core/Frame.js',
      '../packages/symbiote-ui/core/Socket.js',
      '../packages/symbiote-ui/core/GraphText.js',
      '../packages/symbiote-ui/core/GraphMermaid.js',
      '../packages/symbiote-ui/core/Portal.js',
      '../packages/symbiote-ui/core/SubgraphNode.js',
    ];
    for (let mod of modules) {
      await assert.doesNotReject(
        import(mod),
        `${mod} must import without throwing`
      );
    }
  });

  it('engine modules import without throwing', async () => {
    let modules = [
      '../packages/symbiote-engine/Graph.js',
      '../packages/symbiote-engine/Executor.js',
      '../packages/symbiote-engine/Registry.js',
      '../packages/symbiote-engine/SocketTypes.js',
      '../packages/symbiote-engine/Persistence.js',
      '../packages/symbiote-engine/Lifecycle.js',
      '../packages/symbiote-engine/HandlerLoader.js',
      '../packages/symbiote-engine/nanoid.js',
    ];
    for (let mod of modules) {
      await assert.doesNotReject(
        import(mod),
        `${mod} must import without throwing`
      );
    }
  });

  it('theme modules import without throwing', async () => {
    let modules = [
      '../packages/symbiote-ui/themes/Theme.js',
      '../packages/symbiote-ui/themes/Palette.js',
      '../packages/symbiote-ui/themes/Skin.js',
      '../packages/symbiote-ui/themes/default-provider.js',
    ];
    for (let mod of modules) {
      await assert.doesNotReject(
        import(mod),
        `${mod} must import without throwing`
      );
    }
  });

  it('manifest modules import without throwing', async () => {
    let modules = [
      '../packages/symbiote-ui/manifest/index.js',
      '../packages/symbiote-ui/manifest/component-registry.js',
      '../packages/symbiote-ui/manifest/theme-catalog.js',
      '../packages/symbiote-ui/manifest/rule-catalog.js',
      '../packages/symbiote-ui/manifest/graph-schema.js',
    ];
    for (let mod of modules) {
      await assert.doesNotReject(
        import(mod),
        `${mod} must import without throwing`
      );
    }
  });

  it('shapes index imports without throwing', async () => {
    await assert.doesNotReject(
      import('../packages/symbiote-ui/shapes/index.js'),
      'Shapes index must import without throwing'
    );
  });

  it('plugins import without throwing', async () => {
    let modules = [
      '../packages/symbiote-ui/plugins/Readonly.js',
      '../packages/symbiote-ui/plugins/History.js',
    ];
    for (let mod of modules) {
      await assert.doesNotReject(
        import(mod),
        `${mod} must import without throwing`
      );
    }
  });

  it('package.json exports map resolves all subpaths', async () => {
    let pkg = JSON.parse(fs.readFileSync(path.join(UI_PKG_ROOT, 'package.json'), 'utf-8'));
    let exports = pkg.exports;

    assert.ok(exports, 'exports map must exist');

    let checked = false;
    for (let [key, target] of Object.entries(exports)) {
      if (key === '.') {
        await assert.doesNotReject(import('symbiote-ui'), 'main entry resolve');
        checked = true;
        continue;
      }

      let tgt = typeof target === 'string' ? target : target.import || target.default || '';
      if (tgt.endsWith('/*') || tgt === './package.json' || tgt.endsWith('.json') || key.startsWith('./ui')) continue;

      await assert.doesNotReject(
        import(path.join(UI_PKG_ROOT, tgt)),
        `Export subpath "${key}" → "${tgt}" must resolve`
      );
      checked = true;
    }

    assert.ok(checked, 'at least one export subpath was checked');
  });

  it('symbiote-engine package exports resolve runtime subpaths', async () => {
    let pkg = JSON.parse(fs.readFileSync(path.join(ENGINE_PKG_ROOT, 'package.json'), 'utf-8'));
    for (let [key, target] of Object.entries(pkg.exports)) {
      let tgt = typeof target === 'string' ? target : target.import || target.default || '';
      if (tgt.endsWith('/*') || tgt === './package.json') continue;
      await assert.doesNotReject(
        import(path.join(ENGINE_PKG_ROOT, tgt)),
        `Engine export subpath "${key}" → "${tgt}" must resolve`
      );
    }
  });
});
