import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getComponent } from '../manifest/component-registry.js';

let PKG_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../');
let componentFiles = [
  'list/ListDetailShell/ListDetailShell.js',
  'list/ListDetailShell/ListDetailShell.tpl.js',
  'list/ListDetailShell/ListDetailShell.css.js',
];

function readComponentSource() {
  return componentFiles
    .map((relative) => fs.readFileSync(path.join(PKG_ROOT, relative), 'utf8'))
    .join('\n');
}

describe('sn-list-detail-shell', () => {
  it('publishes host-owned list and detail composition slots', () => {
    let component = getComponent('sn-list-detail-shell');
    let slots = new Set(component.contract.slots.map((slot) => slot.name));

    for (let slot of ['list-header', 'list', 'list-empty', 'detail-header', 'detail', 'detail-empty']) {
      assert.equal(slots.has(slot), true, `${slot} must be a public slot`);
    }
  });

  it('keeps the provider shell generic and theme-driven', () => {
    let source = readComponentSource();

    for (let productTerm of ['workflow', 'pipeline', 'tool-explorer', 'agent-portal', 'mcp-call']) {
      assert.equal(source.toLowerCase().includes(productTerm), false, `shell must not contain ${productTerm}`);
    }
    for (let token of ['--sn-list-detail-bg', '--sn-list-detail-sidebar-width', '--sn-list-detail-main-padding']) {
      assert.equal(source.includes(token), true, `shell must expose ${token}`);
    }
  });
});
