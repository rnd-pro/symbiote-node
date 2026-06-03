import test from 'node:test';
import assert from 'node:assert/strict';

import {
  bindListItemSelect,
  syncListItem,
} from '../packages/symbiote-ui/ui/host-adapters.js';

function createListItem() {
  let listeners = new Map();
  return {
    item: null,
    style: {
      values: new Map(),
      setProperty(name, value) {
        this.values.set(name, value);
      },
    },
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    emit(type, detail = {}) {
      listeners.get(type)?.({ detail });
    },
    setItem(item) {
      this.item = item;
    },
  };
}

function createHost(listItem = createListItem()) {
  let events = [];
  let attrs = new Set();
  return {
    ref: { listItem },
    events,
    toggleAttribute(name, enabled) {
      if (enabled) attrs.add(name);
      else attrs.delete(name);
    },
    hasAttribute(name) {
      return attrs.has(name);
    },
    dispatchEvent(event) {
      events.push(event);
      return true;
    },
  };
}

test('syncListItem updates provider list item state and active host attribute', () => {
  let listItem = createListItem();
  let host = createHost(listItem);
  let item = { label: 'Agent Pool', description: '2 tools' };

  let result = syncListItem(host, item, {
    active: true,
    iconColor: 'var(--project-accent)',
  });

  assert.equal(result, listItem);
  assert.equal(listItem.item, item);
  assert.equal(host.hasAttribute('active'), true);
  assert.equal(
    listItem.style.values.get('--sn-list-item-icon-color'),
    'var(--project-accent)',
  );
});

test('bindListItemSelect forwards provider selection once', () => {
  let previousCustomEvent = globalThis.CustomEvent;
  globalThis.CustomEvent = class {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
      this.bubbles = options.bubbles;
      this.composed = options.composed;
    }
  };

  try {
    let listItem = createListItem();
    let host = createHost(listItem);
    let detailFactoryCalls = 0;

    let detailFactory = (event) => {
      detailFactoryCalls++;
      return { name: event.detail.item.name };
    };

    bindListItemSelect(host, 'tool-server-item-select', detailFactory);
    bindListItemSelect(host, 'tool-server-item-select', detailFactory);
    listItem.emit('sn-list-item-select', { item: { name: 'tools' } });

    assert.equal(detailFactoryCalls, 1);
    assert.equal(host.events.length, 1);
    assert.equal(host.events[0].type, 'tool-server-item-select');
    assert.equal(host.events[0].bubbles, true);
    assert.equal(host.events[0].composed, true);
    assert.deepEqual(host.events[0].detail, { name: 'tools' });
  } finally {
    if (previousCustomEvent) globalThis.CustomEvent = previousCustomEvent;
    else delete globalThis.CustomEvent;
  }
});
