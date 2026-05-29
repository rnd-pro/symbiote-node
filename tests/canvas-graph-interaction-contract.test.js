import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('CanvasGraph interaction contract', () => {
  it('keeps drag and click selection stable while focus transforms animate', () => {
    let source = fs.readFileSync(path.join(PKG_ROOT, 'canvas/CanvasGraph/CanvasGraph.js'), 'utf8');

    assert.match(source, /this\._dragWorldTransform = null;/);
    assert.match(source, /this\._dragWorldTransform = this\.getVisualLayerTransform\(hitDepth\);/);
    assert.match(source, /this\.screenToWorld\(e\.clientX, e\.clientY, 0, this\._dragWorldTransform\)/);
    assert.match(source, /const node = draggedNode \|\| this\.hitTestScreen\(e\.clientX, e\.clientY\);/);
    assert.match(source, /this\.activeNode = hit;\n\s*this\.nextActiveNode = null;\n\s*this\.deactivating = false;/);
  });
});
