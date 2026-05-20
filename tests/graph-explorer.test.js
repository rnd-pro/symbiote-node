import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  addGraphDirectoryFrames,
  getGraphPathStyleDisplay,
  getNextGraphPathStyle,
  renderGraphPathStyleButton,
  renderGraphViewModeButton,
  resolveInitialGraphViewMode,
  setGraphLayerVisible,
  toggleGraphLayerButtonState,
} from '../canvas/graph-explorer.js';

describe('graph explorer view helpers', () => {
  it('resolves initial view mode from current and legacy params', () => {
    assert.equal(resolveInitialGraphViewMode(new URLSearchParams('mode=flat')), 'flat');
    assert.equal(resolveInitialGraphViewMode(new URLSearchParams('flat=true')), 'flat');
    assert.equal(resolveInitialGraphViewMode(new URLSearchParams('mode=tree')), 'structured');
    assert.equal(resolveInitialGraphViewMode(new URLSearchParams()), 'structured');
  });

  it('cycles graph path styles', () => {
    assert.equal(getNextGraphPathStyle('pcb'), 'bezier');
    assert.equal(getNextGraphPathStyle('bezier'), 'orthogonal');
    assert.equal(getNextGraphPathStyle('orthogonal'), 'straight');
    assert.equal(getNextGraphPathStyle('straight'), 'pcb');
    assert.equal(getNextGraphPathStyle('unknown'), 'pcb');
  });

  it('describes graph path style controls', () => {
    assert.deepEqual(getGraphPathStyleDisplay('pcb'), { icon: 'route', text: 'PCB', active: true });
    assert.deepEqual(getGraphPathStyleDisplay('bezier'), { icon: 'timeline', text: 'BEZIER', active: false });
  });
});

test('graph explorer button render helpers update active state', () => {
  const attrs = new Set();
  const button = {
    innerHTML: '',
    setAttribute(name) {
      attrs.add(name);
    },
    removeAttribute(name) {
      attrs.delete(name);
    },
  };

  renderGraphViewModeButton(button, 'structured');
  assert.match(button.innerHTML, /TREE/);
  assert.equal(attrs.has('data-active'), true);

  renderGraphPathStyleButton(button, 'bezier');
  assert.match(button.innerHTML, /BEZIER/);
  assert.equal(attrs.has('data-active'), false);
});

test('addGraphDirectoryFrames creates bounded frames for multi-file directories', () => {
  class TestFrame {
    constructor(label, options) {
      this.label = label;
      this.options = options;
    }
  }

  const frames = [];
  const editor = {
    addFrame(frame) {
      frames.push(frame);
    },
  };
  const fileMap = new Map([
    ['src/a.js', 'node-a'],
    ['src/b.js', 'node-b'],
    ['test/a.test.js', 'node-test'],
  ]);
  const dirFiles = new Map([
    ['src/', ['src/a.js', 'src/b.js']],
    ['test/', ['test/a.test.js']],
  ]);
  const positions = {
    'node-a': { x: 10, y: 20 },
    'node-b': { x: 210, y: 120 },
    'node-test': { x: 500, y: 500 },
  };

  addGraphDirectoryFrames({
    editor,
    fileMap,
    dirFiles,
    positions,
    FrameClass: TestFrame,
    colors: ['rgba(1, 2, 3, 0.4)'],
  });

  assert.equal(frames.length, 1);
  assert.equal(frames[0].label, 'src');
  assert.deepEqual(frames[0].options, {
    x: -20,
    y: -10,
    width: 380,
    height: 240,
    color: 'rgba(1, 2, 3, 0.4)',
  });
});

test('setGraphLayerVisible toggles zones and vias', () => {
  const frames = [{ style: {} }, { style: {} }];
  const attrs = new Set();
  const canvas = {
    querySelectorAll(selector) {
      assert.equal(selector, 'graph-frame');
      return frames;
    },
    setAttribute(name, value) {
      attrs.add(`${name}:${value}`);
    },
    removeAttribute(name) {
      for (const attr of [...attrs]) {
        if (attr.startsWith(`${name}:`)) attrs.delete(attr);
      }
    },
  };

  setGraphLayerVisible(canvas, 'zones', false);
  assert.deepEqual(frames.map((frame) => frame.style.display), ['none', 'none']);

  setGraphLayerVisible(canvas, 'zones', true);
  assert.deepEqual(frames.map((frame) => frame.style.display), ['', '']);

  setGraphLayerVisible(canvas, 'vias', false);
  assert.equal(attrs.has('data-hide-vias:'), true);

  setGraphLayerVisible(canvas, 'vias', true);
  assert.equal(attrs.has('data-hide-vias:'), false);
});

test('toggleGraphLayerButtonState flips active and hidden attributes', () => {
  const attrs = new Set(['data-active']);
  const button = {
    hasAttribute(name) {
      return attrs.has(name);
    },
    setAttribute(name) {
      attrs.add(name);
    },
    removeAttribute(name) {
      attrs.delete(name);
    },
  };

  assert.equal(toggleGraphLayerButtonState(button), false);
  assert.equal(attrs.has('data-active'), false);
  assert.equal(attrs.has('data-hidden'), true);

  assert.equal(toggleGraphLayerButtonState(button), true);
  assert.equal(attrs.has('data-active'), true);
  assert.equal(attrs.has('data-hidden'), false);
});
