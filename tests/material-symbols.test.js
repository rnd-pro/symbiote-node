import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  configureMaterialSymbols,
  ensureMaterialSymbols,
} from '../icons/MaterialSymbols.js';

const PACKAGE_ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');

afterEach(() => {
  configureMaterialSymbols({ autoload: true, hrefBuilder: null });
  delete globalThis.document;
  delete globalThis.window;
});

describe('Material Symbols provider assets', () => {
  it('ships a local icon font stylesheet for deterministic host rendering', () => {
    let cssPath = path.join(PACKAGE_ROOT, 'icons/material-symbols.css');
    let fontPath = path.join(PACKAGE_ROOT, 'icons/material-symbols-outlined-400.ttf');
    let css = fs.readFileSync(cssPath, 'utf8');

    assert.ok(fs.statSync(fontPath).size > 100_000, 'local Material Symbols font must be packaged');
    assert.match(css, /@font-face/);
    assert.match(css, /font-family:\s*'Material Symbols Outlined'/);
    assert.match(css, /material-symbols-outlined-400\.ttf/);
    assert.match(css, /\.material-symbols-outlined/);
  });

  it('loads the local provider stylesheet by default', () => {
    let appended = null;
    globalThis.window = {};
    globalThis.document = {
      nodeType: 9,
      head: {
        append(link) {
          appended = link;
        },
      },
      querySelector() {
        return appended;
      },
      createElement(tagName) {
        assert.equal(tagName, 'link');
        return { dataset: {} };
      },
    };

    ensureMaterialSymbols(['folder_open', 'hub']);

    assert.equal(appended.rel, 'stylesheet');
    assert.match(appended.href, /\/icons\/material-symbols\.css$/);
    assert.equal(appended.href.includes('fonts.googleapis.com'), false);
    assert.equal(appended.dataset.snMaterialSymbolsIcons, 'folder_open,hub');
  });
});
