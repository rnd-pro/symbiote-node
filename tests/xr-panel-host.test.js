import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createXRDomPanelWorkbench,
  createXRPanelHost,
  createXRSpatialScene,
} from '../packages/symbiote-ui/xr/index.js';

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
    contains(node) {
      if (this.children.includes(node)) return true;
      return this.children.some((child) => typeof child.contains === 'function' && child.contains(node));
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
    assert.equal(element.style.width, '1280px');
    assert.equal(element.style.height, '860px');
    assert.equal(element.style['--sn-xr-content-width'], '1280px');
    assert.equal(element.style['--sn-xr-content-height'], '860px');
    assert.equal(element.style['--sn-xr-content-scale'] !== '1', true);
    assert.equal(element.style['--sn-xr-panel-meter-width'], '1.22m');
    assert.equal(container.style['--sn-xr-content-width'], '1280px');
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
    assert.equal(result.target.contentViewport.width, 1280);
    assert.equal(result.target.contentPoint.x, 320);
    assert.equal(result.target.contentPoint.y, 768);
    assert.deepEqual(result.dispatched, ['xr-panel-pointer']);
    assert.equal(element.events[0].type, 'xr-panel-pointer');
    assert.equal(element.events[0].detail.contentPoint.x, 320);
    assert.equal(element.events[0].detail.contentViewport.height, 1536);
  });

  it('keeps synthetic DOM pointer events inside the mounted panel host', () => {
    let scene = createXRSpatialScene({
      id: 'chat',
      component: 'chat-transcript',
      xr: { size: [0.32, 0.82] },
    });
    let host = createXRPanelHost({
      document: createDocument(),
      globalThis: {
        PointerEvent: class PointerEvent {
          constructor(type, init = {}) {
            this.type = type;
            this.bubbles = init.bubbles;
            this.composed = init.composed;
            this.clientX = init.clientX;
            this.clientY = init.clientY;
          }
        },
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
      source: 'mouse-fallback',
      targetId: 'chat',
      point: { x: 0.25, y: 0.5 },
      buttons: { primary: false },
    });

    let element = host.getPanelElement('chat');
    assert.equal(result.ok, true);
    assert.deepEqual(result.dispatched, ['pointermove', 'xr-panel-pointer']);
    assert.equal(element.events[0].type, 'pointermove');
    assert.equal(element.events[0].bubbles, false);
    assert.equal(element.events[0].composed, false);
    assert.equal(element.events[0].xrPanelPointer.targetId, 'chat');
    assert.equal(element.events[1].type, 'xr-panel-pointer');
    assert.equal(element.events[1].bubbles, true);
    assert.equal(element.events[1].composed, true);
  });

  it('blocks reentrant pointer relay loops from mounted content handlers', () => {
    let scene = createXRSpatialScene({
      id: 'chat',
      component: 'chat-transcript',
      xr: { size: [0.32, 0.82] },
    });
    let host = createXRPanelHost({
      document: createDocument(),
      globalThis: {
        PointerEvent: class PointerEvent {
          constructor(type, init = {}) {
            this.type = type;
            this.bubbles = init.bubbles;
            this.composed = init.composed;
          }
        },
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
    let nestedResult = null;

    host.mountPanel(scene.panels[0], container);
    let element = host.getPanelElement('chat');
    element.dispatchEvent = (event) => {
      element.events.push(event);
      if (event.type === 'pointermove') {
        nestedResult = host.dispatchPointerEvent({
          type: 'pointermove',
          source: 'mouse-fallback',
          targetId: 'chat',
          point: { x: 0.3, y: 0.5 },
        });
      }
      return true;
    };

    let result = host.dispatchPointerEvent({
      type: 'pointermove',
      source: 'mouse-fallback',
      targetId: 'chat',
      point: { x: 0.25, y: 0.5 },
    });

    assert.equal(result.ok, true);
    assert.equal(nestedResult.ok, false);
    assert.equal(nestedResult.reason, 'pointer-dispatch-reentrant');
    assert.deepEqual(element.events.map((event) => event.type), ['pointermove', 'xr-panel-pointer']);
  });

  it('uses host component and props resolvers without product coupling', () => {
    let scene = createXRSpatialScene({
      id: 'metrics',
      type: 'panel',
      panelType: 'metrics-view',
      panelState: { datasetId: 'd1' },
    });
    let host = createXRPanelHost({
      document: createDocument(),
      componentResolver(name) {
        return name === 'metrics-view' ? 'host-metrics-view' : name;
      },
      propsResolver(node, panel) {
        return { ...panel.state, mode: 'spatial' };
      },
    });
    let container = createElement('div');

    let element = host.mountPanel(scene.panels[0], container);

    assert.equal(element.tagName, 'HOST-METRICS-VIEW');
    assert.equal(element.datasetId, 'd1');
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

  it('mounts DOM preview panels and source canvases through a provider workbench', () => {
    let documentRef = createDocument();
    let scene = createXRSpatialScene({
      id: 'root',
      component: 'panel-layout',
      children: [{ id: 'chat', component: 'chat-transcript' }],
    });
    let liveHost = createXRPanelHost({ document: documentRef });
    let sourceHost = createXRPanelHost({ document: documentRef });
    let prepared = [];
    let renderer = {
      preparePanel(element, panel, options = {}) {
        prepared.push({ element, panel, canvas: options.canvas });
        return { prepared: true, supported: true, panelId: panel.id, mode: 'canvas2d' };
      },
      renderPanelPreview(panelId, canvas, options = {}) {
        return { rendered: true, panelId, mode: 'canvas2d', width: options.width, height: options.height };
      },
      getState() {
        return { prepared: prepared.length };
      },
    };
    let workbench = createXRDomPanelWorkbench({
      document: documentRef,
      panelHost: liveHost,
      sourcePanelHost: sourceHost,
      htmlCanvasRenderer: renderer,
      classNames: {
        panel: 'psl-panel',
        live: 'psl-panel-live',
        canvas: 'psl-panel-canvas',
        source: 'psl-xr-canvas-source',
      },
    });

    workbench.setScene(scene);
    let result = workbench.mountPreviewPanel(scene.panels[0], {
      activePanelId: 'chat',
      renderCanvasPreview: true,
    });

    assert.equal(result.ok, true);
    assert.equal(result.node.classList.values.includes('psl-panel'), true);
    assert.equal(result.node.dataset.panelId, 'chat');
    assert.equal(result.node.dataset.hit, 'true');
    assert.equal(result.node.dataset.canvas, 'rendered');
    assert.equal(result.liveElement.tagName, 'CHAT-TRANSCRIPT');
    assert.equal(result.sourceElement.tagName, 'CHAT-TRANSCRIPT');
    assert.equal(result.sourceCanvas.tagName, 'CANVAS');
    assert.equal(result.sourceCanvas.width, 1280);
    assert.equal(result.sourceCanvas.height, 860);
    assert.equal(result.previewResult.rendered, true);
    assert.equal(prepared[0].element, result.sourceElement);
    assert.equal(prepared[0].canvas, result.sourceCanvas);
    assert.equal(workbench.getState().mounted, 1);
    assert.equal(workbench.getState().prepared, 1);
  });

  it('prepares XR layer sources without product-specific renderer glue', () => {
    let documentRef = createDocument();
    let scene = createXRSpatialScene({
      id: 'root',
      component: 'panel-layout',
      children: [
        { id: 'graph', component: 'graph-view' },
        { id: 'chat', component: 'chat-transcript' },
      ],
    });
    let liveHost = createXRPanelHost({ document: documentRef });
    let sourceHost = createXRPanelHost({ document: documentRef });
    let prepared = [];
    let renderer = {
      preparePanel(element, panel, options = {}) {
        prepared.push({ element, panel, canvas: options.canvas });
        return { prepared: true, supported: true, panelId: panel.id, mode: 'webgl' };
      },
      getState() {
        return { prepared: prepared.length };
      },
    };
    let canvas = createElement('canvas');
    let workbench = createXRDomPanelWorkbench({
      document: documentRef,
      panelHost: liveHost,
      sourcePanelHost: sourceHost,
      htmlCanvasRenderer: renderer,
      classNames: { source: 'psl-xr-canvas-source' },
    });

    workbench.setScene(scene);
    let result = workbench.prepareLayerSources(scene, canvas);

    assert.equal(result.ok, true);
    assert.equal(result.prepared, 2);
    assert.equal(result.total, 2);
    assert.equal(canvas.children.length, 2);
    assert.equal(canvas.children[0].classList.values.includes('psl-xr-canvas-source'), true);
    assert.equal(prepared[0].panel.id, 'graph');
    assert.equal(prepared[1].panel.id, 'chat');
  });
});
