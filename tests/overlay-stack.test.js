import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  bringOverlayToFront,
  mountOverlayToDocument,
  nextOverlayZIndex,
  resetOverlayStack,
  restoreOverlayHome,
  syncOverlayTheme,
} from '../ui/overlay-stack.js';

describe('overlay stack', () => {
  it('increments overlay z-index above the shared base', () => {
    resetOverlayStack(20000);
    assert.equal(nextOverlayZIndex(), 20001);
    assert.equal(nextOverlayZIndex(), 20002);
  });

  it('applies the latest overlay z-index to an element', () => {
    resetOverlayStack(20000);
    let attrs = new Map();
    let element = {
      style: {},
      setAttribute(name, value) {
        attrs.set(name, value);
      },
    };

    let zIndex = bringOverlayToFront(element);

    assert.equal(zIndex, 20001);
    assert.equal(element.style.zIndex, '20001');
    assert.equal(attrs.get('data-overlay-z'), '20001');
  });

  it('copies Symbiote theme custom properties onto document overlays', () => {
    let props = new Map();
    let element = {
      style: {
        setProperty(name, value) {
          props.set(name, value);
        },
      },
    };
    let source = {
      style: {
        length: 1,
        item(index) {
          return index === 0 ? '--sn-panel-bg' : '';
        },
        getPropertyValue(name) {
          return name === '--sn-panel-bg' ? 'hsl(0 0% 13%)' : '';
        },
      },
    };
    let prevGetComputedStyle = globalThis.getComputedStyle;
    globalThis.getComputedStyle = () => ({
      length: 2,
      item(index) {
        return ['--sn-overlay-z-base', '--other-token'][index] || '';
      },
      getPropertyValue(name) {
        return name === '--sn-overlay-z-base' ? '20000' : '';
      },
    });

    try {
      syncOverlayTheme(element, source);
    } finally {
      globalThis.getComputedStyle = prevGetComputedStyle;
    }

    assert.equal(props.get('--sn-overlay-z-base'), '20000');
    assert.equal(props.get('--sn-panel-bg'), 'hsl(0 0% 13%)');
    assert.equal(props.has('--other-token'), false);
  });

  it('mounts overlays into document body and restores their home slot', () => {
    let bodyChildren = [];
    let homeChildren = [];
    let body = {
      appendChild(child) {
        child.parentNode = body;
        bodyChildren.push(child);
      },
    };
    let home = {
      appendChild(child) {
        child.parentNode = home;
        homeChildren.push(child);
      },
      insertBefore(child, sibling) {
        child.parentNode = home;
        homeChildren.splice(homeChildren.indexOf(sibling), 0, child);
      },
    };
    let sibling = { parentNode: home };
    let attrs = new Set();
    let element = {
      ownerDocument: { body },
      parentNode: home,
      parentElement: home,
      nextSibling: sibling,
      style: { setProperty() {} },
      toggleAttribute(name, enabled) {
        if (enabled) attrs.add(name);
        else attrs.delete(name);
      },
      removeAttribute(name) {
        attrs.delete(name);
      },
    };
    let prevGetComputedStyle = globalThis.getComputedStyle;
    globalThis.getComputedStyle = () => ({
      length: 0,
      item() {
        return '';
      },
      getPropertyValue() {
        return '';
      },
    });

    try {
      assert.equal(mountOverlayToDocument(element, home), true);
      assert.equal(element.parentNode, body);
      assert.equal(attrs.has('data-overlay-portal'), true);

      assert.equal(restoreOverlayHome(element), true);
      assert.equal(element.parentNode, home);
      assert.equal(attrs.has('data-overlay-portal'), false);
      assert.equal(homeChildren[0], element);
    } finally {
      globalThis.getComputedStyle = prevGetComputedStyle;
    }
  });
});
