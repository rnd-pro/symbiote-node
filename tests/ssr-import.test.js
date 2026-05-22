/**
 * SSR import boundary test for symbiote-node.
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

const PKG_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../');

describe('SSR-safe import boundary', () => {
  it('main entry import does not throw', async () => {
    await assert.doesNotReject(
      import('../index.js'),
      'Main entry must import without throwing'
    );
  });

  it('ui entry import does not throw without DOM globals', async () => {
    let domGlobals = ['window', 'document', 'HTMLElement', 'customElements', 'CSSStyleSheet'];
    for (let name of domGlobals) {
      assert.equal(globalThis[name], undefined, `${name} should not exist before UI import`);
    }

    let ui = await import(`../ui/index.js?ssr=${Date.now()}`);
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

    let module = await import(`../ui/shared-styles.js?ssr=${Date.now()}`);

    assert.equal(typeof module.sharedUiStyles, 'string');
    assert.match(module.sharedUiStyles, /:host/);
    assert.doesNotMatch(module.sharedUiStyles, /\.ui-/);
    for (let name of domGlobals) {
      assert.equal(globalThis[name], undefined, `shared styles import must not create globalThis.${name}`);
    }
  });

  it('dialog helpers import without DOM globals', async () => {
    let domGlobals = ['window', 'document', 'HTMLElement', 'customElements', 'CSSStyleSheet'];
    for (let name of domGlobals) {
      assert.equal(globalThis[name], undefined, `${name} should not exist before dialog import`);
    }

    let module = await import(`../ui/dialogs.js?ssr=${Date.now()}`);

    assert.equal(typeof module.uiAlert, 'function');
    assert.equal(typeof module.uiConfirm, 'function');
    assert.equal(typeof module.uiPrompt, 'function');
    for (let name of domGlobals) {
      assert.equal(globalThis[name], undefined, `dialog import must not create globalThis.${name}`);
    }
  });

  it('engine entry import does not throw', async () => {
    await assert.doesNotReject(
      import('../engine/index.js'),
      'Engine entry must import without throwing'
    );
  });

  it('core modules import without throwing', async () => {
    let modules = [
      '../core/index.js',
      '../core/Editor.js',
      '../core/Node.js',
      '../core/Connection.js',
      '../core/Frame.js',
      '../core/Socket.js',
      '../core/GraphText.js',
      '../core/GraphMermaid.js',
      '../core/Portal.js',
      '../core/SubgraphNode.js',
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
      '../engine/Graph.js',
      '../engine/Executor.js',
      '../engine/Registry.js',
      '../engine/SocketTypes.js',
      '../engine/Persistence.js',
      '../engine/Lifecycle.js',
      '../engine/HandlerLoader.js',
      '../engine/nanoid.js',
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
      '../themes/Theme.js',
      '../themes/Palette.js',
      '../themes/Skin.js',
      '../themes/carbon.js',
      '../themes/dark.js',
      '../themes/light.js',
      '../themes/ebook.js',
      '../themes/grey.js',
      '../themes/neon.js',
      '../themes/pcb.js',
      '../themes/synthwave.js',
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
      '../manifest/index.js',
      '../manifest/component-registry.js',
      '../manifest/theme-catalog.js',
      '../manifest/rule-catalog.js',
      '../manifest/graph-schema.js',
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
      import('../shapes/index.js'),
      'Shapes index must import without throwing'
    );
  });

  it('plugins import without throwing', async () => {
    let modules = [
      '../plugins/Readonly.js',
      '../plugins/History.js',
    ];
    for (let mod of modules) {
      await assert.doesNotReject(
        import(mod),
        `${mod} must import without throwing`
      );
    }
  });

  it('package.json exports map resolves all subpaths', async () => {
    let pkg = JSON.parse(fs.readFileSync(path.join(PKG_ROOT, 'package.json'), 'utf-8'));
    let exports = pkg.exports;

    assert.ok(exports, 'exports map must exist');

    let checked = false;
    for (let [key, target] of Object.entries(exports)) {
      if (key === '.') {
        await assert.doesNotReject(import('../index.js'), 'main entry resolve');
        checked = true;
        continue;
      }

      let tgt = typeof target === 'string' ? target : target.import || target.default || '';
      if (tgt.endsWith('/*') || tgt === './package.json' || tgt.endsWith('.json') || key.startsWith('./ui')) continue;

      await assert.doesNotReject(
        import(`../${tgt}`),
        `Export subpath "${key}" → "${tgt}" must resolve`
      );
      checked = true;
    }

    assert.ok(checked, 'at least one export subpath was checked');
  });
});
