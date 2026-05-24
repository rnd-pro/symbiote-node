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
    events: [],
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
    dispatchEvent(event) {
      this.events.push(event);
      return true;
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
    assert.equal(element.style.width, '960px');
    assert.equal(element.style.height, '645px');
    assert.equal(element.style['--sn-xr-content-width'], '960px');
    assert.equal(element.style['--sn-xr-content-height'], '645px');
    assert.equal(element.style['--sn-xr-content-scale'] !== '1', true);
    assert.equal(element.style['--sn-xr-panel-meter-width'], '1.22m');
    assert.equal(container.style['--sn-xr-content-width'], '960px');
    assert.equal(host.getPanelElement('chat'), element);
    assert.equal(host.getState().mounted, 1);
    host.setScene({ panels: [] });
    assert.equal(host.getState().mounted, 0);
    assert.equal(host.getPanelElement('chat'), null);
  });

  it('relays normalized XR pointer hits to mounted content viewport coordinates', () => {
    let scene = createXRSpatialScene({
      id: 'chat',
      component: 'chat-transcript',
      xr: { size: [0.32, 0.82] },
    }, {
      preview: { pixelsPerMeter: 118 },
    });
    let host = createXRPanelHost({
      document: createDocument(),
      globalThis: {
        CustomEvent: class CustomEvent {
          constructor(type, init = {}) {
            this.type = type;
            this.detail = init.detail;
            this.bubbles = init.bubbles;
            this.composed = init.composed;
          }
        },
      },
    });
    let container = createElement('div');

    host.mountPanel(scene.panels[0], container);
    let result = host.dispatchPointerEvent({
      type: 'pointermove',
      source: 'xr-controller',
      targetId: 'chat',
      point: { x: 0.25, y: 0.5 },
      buttons: { primary: true },
    });

    let element = host.getPanelElement('chat');
    assert.equal(result.ok, true);
    assert.equal(result.target.contentViewport.width, 960);
    assert.equal(result.target.contentPoint.x, 240);
    assert.equal(result.target.contentPoint.y, 600);
    assert.deepEqual(result.dispatched, ['xr-panel-pointer']);
    assert.equal(element.events[0].type, 'xr-panel-pointer');
    assert.equal(element.events[0].detail.contentPoint.x, 240);
    assert.equal(element.events[0].detail.contentViewport.height, 1200);
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
