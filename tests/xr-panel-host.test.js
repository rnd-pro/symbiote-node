import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createXRPanelHost,
  createXRSpatialScene,
} from '../xr/index.js';

function createElement(tagName) {
  return {
    tagName: tagName.toUpperCase(),
    children: [],
    dataset: {},
    style: {},
    className: '',
    classList: {
      values: [],
      add(value) {
        this.values.push(value);
      },
    },
    attrs: new Map(),
    setAttribute(name, value) {
      this.attrs.set(name, value);
    },
    append(...nodes) {
      this.children.push(...nodes);
    },
    replaceChildren(...nodes) {
      this.children = [...nodes];
    },
  };
}

function createDocument() {
  return { createElement };
}

describe('XR panel host', () => {
  it('mounts live runtime UI components from XR scene panels', () => {
    let scene = createXRSpatialScene({
      id: 'root',
      component: 'panel-layout',
      children: [{
        id: 'chat',
        component: 'chat-transcript',
        props: { messages: [{ role: 'agent', text: 'ready' }] },
        attrs: { compact: true },
        children: [{ id: 'item', component: 'sn-list-item', props: { label: 'Nested' } }],
      }],
    }, {
      themeScope: 'section.chat',
    });
    let host = createXRPanelHost({
      document: createDocument(),
      componentResolver(name) {
        return name;
      },
    });
    let container = createElement('div');

    host.setScene(scene);
    let element = host.mountPanel(scene.panels[0], container);

    assert.equal(element.tagName, 'CHAT-TRANSCRIPT');
    assert.equal(element.dataset.xrPanelId, 'chat');
    assert.equal(element.messages[0].text, 'ready');
    assert.equal(element.attrs.get('compact'), '');
    assert.equal(element.children[0].tagName, 'SN-LIST-ITEM');
    assert.equal(element.children[0].label, 'Nested');
    assert.equal(host.getPanelElement('chat'), element);
    assert.equal(host.getState().mounted, 1);
    host.setScene({ panels: [] });
    assert.equal(host.getState().mounted, 0);
    assert.equal(host.getPanelElement('chat'), null);
  });

  it('uses host component and props resolvers without product coupling', () => {
    let scene = createXRSpatialScene({
      id: 'graph',
      type: 'panel',
      panelType: 'dep-graph',
      panelState: { projectId: 'p1' },
    });
    let host = createXRPanelHost({
      document: createDocument(),
      componentResolver(name) {
        return name === 'dep-graph' ? 'pg-dep-graph' : name;
      },
      propsResolver(node, panel) {
        return { ...panel.state, mode: 'spatial' };
      },
    });
    let container = createElement('div');

    let element = host.mountPanel(scene.panels[0], container);

    assert.equal(element.tagName, 'PG-DEP-GRAPH');
    assert.equal(element.projectId, 'p1');
    assert.equal(element.mode, 'spatial');
  });

  it('renders a neutral fallback when a component cannot be resolved', () => {
    let host = createXRPanelHost({
      document: createDocument(),
      componentResolver() {
        return null;
      },
    });
    let container = createElement('div');
    let element = host.mountPanel({ id: 'missing', component: 'missing-panel' }, container);

    assert.equal(element.tagName, 'SECTION');
    assert.equal(element.dataset.reason, 'component-unresolved');
    assert.equal(element.textContent.includes('component-unresolved'), true);
    assert.equal(host.unmountPanel('missing'), true);
    assert.equal(host.getPanelElement('missing'), null);
  });
});
