/**
 * Component registration test for symbiote-node.
 *
 * Verifies that custom element registration behaves
 * correctly when DOM APIs are available (browser) or
 * absent (Node.js). In Node.js, registration should
 * either skip gracefully or throw a predictable error.
 *
 * Uses a lightweight DOM shim to test the registration
 * path without requiring a real browser.
 *
 * Run: node --test tests/component-registration.test.js
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NO_DOM_ERROR = /customElements|HTMLElement|document/;
const PKG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../packages/symbiote-ui');

class TestStyle {
  #props = new Map();

  setProperty(name, value) {
    this.#props.set(name, String(value));
  }

  getPropertyValue(name) {
    return this.#props.get(name) || '';
  }

  removeProperty(name) {
    this.#props.delete(name);
  }
}

let hadCustomElements;
let hadHTMLElement;
let hadWindow;
let hadCSSStyleSheet;
let hadDocument;

before(() => {
  hadCustomElements = 'customElements' in globalThis;
  hadHTMLElement = 'HTMLElement' in globalThis;
  hadWindow = 'window' in globalThis;
  hadCSSStyleSheet = 'CSSStyleSheet' in globalThis;
  hadDocument = 'document' in globalThis;
});

after(() => {
  if (!hadCustomElements && globalThis.customElements) {
    delete globalThis.customElements;
  }
  if (!hadHTMLElement && globalThis.HTMLElement) {
    delete globalThis.HTMLElement;
  }
  if (!hadWindow && globalThis.window) {
    delete globalThis.window;
  }
  if (!hadCSSStyleSheet && globalThis.CSSStyleSheet) {
    delete globalThis.CSSStyleSheet;
  }
  if (!hadDocument && globalThis.document) {
    delete globalThis.document;
  }
});

describe('Without DOM (Node.js native)', () => {
  it('importing index.js does not crash without DOM globals', async () => {
    await assert.doesNotReject(
      import('../packages/symbiote-ui/index.js'),
      'Main import must not crash without DOM globals'
    );
  });

  it('core Node class exists and is instantiable', async () => {
    let { Node } = await import('../packages/symbiote-ui/core/Node.js');
    let n = new Node('Test', { type: 'custom', category: 'test' });
    assert.ok(n, 'Node instance created');
    assert.equal(n.label, 'Test');
    assert.equal(n.type, 'custom');
  });

  it('core Editor exists and is instantiable', async () => {
    let { NodeEditor } = await import('../packages/symbiote-ui/core/Editor.js');
    let ed = new NodeEditor();
    assert.ok(ed, 'NodeEditor instance created');
  });
});

describe('With DOM shim', () => {
  /** @type {Map<string, Function>} */
  let registry;

  before(() => {
    registry = new Map();

    globalThis.customElements = {
      define(name, constructor, options) {
        registry.set(name, constructor);
      },
      get(name) {
        return registry.get(name);
      },
    };

    globalThis.HTMLElement = class {
      #attributes = new Map();
      style = new TestStyle();

      getAttribute(name) {
        return this.#attributes.get(name) ?? null;
      }

      hasAttribute(name) {
        return this.#attributes.has(name);
      }

      removeAttribute(name) {
        this.#attributes.delete(name);
      }

      setAttribute(name, value) {
        this.#attributes.set(name, String(value));
      }

      toggleAttribute(name, force) {
        if (force) {
          this.setAttribute(name, '');
          return true;
        }
        this.removeAttribute(name);
        return false;
      }
    };
    globalThis.window = globalThis;
    globalThis.CSSStyleSheet = class {
      replaceSync(cssText) {
        this.cssText = cssText;
      }
    };
    globalThis.document = { createElement() { return {}; } };
  });

  after(() => {
    delete globalThis.customElements;
    delete globalThis.HTMLElement;
    delete globalThis.window;
    delete globalThis.CSSStyleSheet;
    delete globalThis.document;
  });

  it('customElements.define is callable via shim', () => {
    assert.doesNotThrow(() => {
      customElements.define('test-foo', class extends HTMLElement {});
    });
    assert.ok(customElements.get('test-foo'));
  });

  it('importing UI entrypoint with DOM shim does not throw', async () => {
    await assert.doesNotReject(
      import('../packages/symbiote-ui/ui/index.js'),
      'UI import must not crash with DOM shim'
    );
    for (let tag of [
      'context-menu',
      'graph-frame',
      'action-zone',
      'layout-preview',
      'panel-menu',
      'port-item',
      'ctrl-item',
      'sidebar-section',
      'sn-data-table',
      'sn-event-feed',
    ]) {
      assert.ok(customElements.get(tag), `${tag} must be registered by the UI entrypoint`);
    }
  });

  it('UI registry lists public modules without internal components by default', async () => {
    let { listModules } = await import('../packages/symbiote-ui/ui/index.js');
    let modules = listModules();
    let tags = modules.map((module) => module.tagName);

    assert.ok(tags.includes('node-canvas'));
    assert.ok(tags.includes('chat-transcript'));
    assert.equal(tags.includes('project-tab-item'), false);
    assert.equal(modules.find((module) => module.tagName === 'node-canvas').specifier, 'symbiote-ui/ui');
  });

  it('UI registry resolves imported modules by tag and export name', async () => {
    let { NodeCanvas, getModule, listModules } = await import('../packages/symbiote-ui/ui/index.js');

    assert.equal(getModule('node-canvas'), NodeCanvas);
    assert.equal(getModule('NodeCanvas'), NodeCanvas);
    assert.equal(getModule('project-tab-item'), undefined);
    assert.equal(getModule('project-tab-item', { includeInternal: true }), customElements.get('project-tab-item'));

    let nodeCanvas = listModules().find((module) => module.tagName === 'node-canvas');
    assert.equal(nodeCanvas.exportName, 'NodeCanvas');
    assert.equal(nodeCanvas.visibility, 'public');
    assert.equal(nodeCanvas.registered, true);
    assert.equal(nodeCanvas.defined, true);
  });

  it('defineModule is idempotent for already-defined public custom elements', async () => {
    let { NodeCanvas, defineModule } = await import('../packages/symbiote-ui/ui/index.js');

    assert.equal(defineModule('node-canvas'), customElements.get('node-canvas'));
    assert.equal(defineModule('NodeCanvas'), NodeCanvas);
  });

  it('defineModule protects internal modules unless explicitly included', async () => {
    let { defineModule, listModules } = await import('../packages/symbiote-ui/ui/index.js');

    assert.throws(
      () => defineModule('project-tab-item'),
      /internal/
    );
    assert.equal(
      defineModule('project-tab-item', { includeInternal: true }),
      customElements.get('project-tab-item')
    );
    assert.ok(listModules({ includeInternal: true }).some((module) => {
      return module.tagName === 'project-tab-item' && module.internal;
    }));
  });

  it('registerModule adds host-provided modules without deep imports', async () => {
    let { defineModule, getModule, listModules, registerModule } = await import('../packages/symbiote-ui/ui/index.js');
    class TestPanel extends HTMLElement {}

    let descriptor = registerModule('test-panel', TestPanel);

    assert.equal(descriptor.tagName, 'test-panel');
    assert.equal(descriptor.specifier, 'symbiote-ui/ui');
    assert.equal(getModule('test-panel'), TestPanel);
    assert.equal(defineModule('test-panel'), TestPanel);
    assert.ok(listModules().some((module) => {
      return module.tagName === 'test-panel' && module.registered;
    }));
  });

  it('NodeCanvas can be imported with DOM shim', async () => {
    let { NodeCanvas } = await import('../packages/symbiote-ui/canvas/NodeCanvas/NodeCanvas.js');

    assert.equal(typeof NodeCanvas.prototype.setNodePosition, 'function');
    assert.equal(typeof NodeCanvas.prototype.setFlowLayout, 'function');
    assert.equal(typeof NodeCanvas.prototype.clearFlowLayout, 'function');
  });

  it('NodeCanvas flow layout positions nodes and exposes scroll metadata', async () => {
    let { NodeCanvas } = await import('../packages/symbiote-ui/canvas/NodeCanvas/NodeCanvas.js');
    let canvas = new NodeCanvas();
    canvas.clientWidth = 500;
    canvas.clientHeight = 200;
    canvas._viewport = {
      updateTransform() {},
      syncPhantom() {},
    };
    canvas._connRenderer = {
      refreshAll() {},
      updateForNode() {},
    };

    let createNodeView = (width, height) => ({
      style: new TestStyle(),
      get offsetWidth() {
        let styledWidth = Number.parseFloat(this.style.width || '');
        return Number.isFinite(styledWidth) ? styledWidth : width;
      },
      get offsetHeight() {
        return height;
      },
      hasAttribute() {
        return false;
      },
    });
    canvas._nodeViews = new Map([
      ['alpha', createNodeView(140, 80)],
      ['beta', createNodeView(180, 110)],
    ]);

    let layout = canvas.setFlowLayout({
      nodeIds: ['alpha', 'beta'],
      direction: 'vertical',
      gap: 30,
      padding: { top: 20, right: 60, bottom: 50, left: 40 },
      align: 'stretch',
      minNodeWidth: 180,
      maxNodeWidth: 260,
      scroll: true,
    });

    assert.equal(canvas.getAttribute('data-flow-layout'), 'vertical');
    assert.equal(canvas.getAttribute('data-flow-scroll'), 'vertical');
    assert.deepEqual(layout.positions, {
      alpha: { x: 40, y: 20 },
      beta: { x: 40, y: 130 },
    });
    assert.equal(layout.height, 290);
    assert.equal(canvas.style.getPropertyValue('--sn-flow-content-height'), '290px');
    assert.equal(canvas._nodeViews.get('alpha').style.width, '260px');
    assert.equal(canvas._nodeViews.get('alpha').style.getPropertyValue('--sn-node-min-width'), '260px');

    canvas.clearFlowLayout();

    assert.equal(canvas.hasAttribute('data-flow-layout'), false);
    assert.equal(canvas.hasAttribute('data-flow-scroll'), false);
    assert.equal(canvas.style.getPropertyValue('--sn-flow-content-height'), '');
    assert.equal(canvas._nodeViews.get('alpha').style.width, '');
    assert.equal(canvas._nodeViews.get('alpha').style.getPropertyValue('--sn-node-min-width'), '');
  });

  it('NodeCanvas hides quick toolbar while a node is dragged', async () => {
    let { NodeCanvas } = await import('../packages/symbiote-ui/canvas/NodeCanvas/NodeCanvas.js');
    let canvas = new NodeCanvas();
    let calls = [];
    let nodeEl = {
      isConnected: true,
    };
    let previousRequestAnimationFrame = globalThis.requestAnimationFrame;

    try {
      globalThis.requestAnimationFrame = (callback) => {
        callback();
        return 1;
      };
      canvas.ref = {
        quickToolbar: {
          hide() {
            calls.push({ action: 'hide' });
          },
          show(nodeId, el, options) {
            calls.push({ action: 'show', nodeId, el, options });
          },
        },
      };
      canvas._selector = {
        isNodeSelected(nodeId) {
          return nodeId === 'node-a';
        },
      };

      canvas._handleNodeDragStart('node-a');
      assert.equal(canvas.getAttribute('data-node-dragging'), 'node-a');
      canvas._handleNodePointerEnter('node-a', nodeEl);
      canvas._handleNodeDragEnd('node-a', nodeEl);

      assert.equal(canvas.hasAttribute('data-node-dragging'), false);
      assert.deepEqual(calls, [
        { action: 'hide' },
        { action: 'show', nodeId: 'node-a', el: nodeEl, options: { sticky: true } },
      ]);
    } finally {
      if (previousRequestAnimationFrame) {
        globalThis.requestAnimationFrame = previousRequestAnimationFrame;
      } else {
        delete globalThis.requestAnimationFrame;
      }
    }
  });

  it('Zoom can pass native wheel scrolling through flow layouts', async () => {
    let { Zoom } = await import('../packages/symbiote-ui/interactions/Zoom.js');
    let previousAddEventListener = globalThis.addEventListener;
    let previousRemoveEventListener = globalThis.removeEventListener;
    globalThis.addEventListener = () => {};
    globalThis.removeEventListener = () => {};

    try {
      let handlers = new Map();
      let container = {
        addEventListener(type, handler) {
          handlers.set(type, handler);
        },
        getBoundingClientRect() {
          return { left: 0, top: 0 };
        },
      };
      let content = {
        getBoundingClientRect() {
          return { left: 0, top: 0 };
        },
      };
      let calls = [];
      let zoom = new Zoom(0.1);
      zoom.initialize(
        container,
        content,
        (delta, ox, oy, source) => calls.push({ delta, ox, oy, source }),
        null,
        { shouldHandleWheel: (event) => event.ctrlKey || event.metaKey || event.altKey }
      );

      let nativeScrollEvent = {
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        deltaY: 120,
        clientX: 10,
        clientY: 10,
        prevented: false,
        preventDefault() {
          this.prevented = true;
        },
      };
      handlers.get('wheel')(nativeScrollEvent);

      assert.equal(nativeScrollEvent.prevented, false);
      assert.equal(calls.length, 0);

      let zoomEvent = {
        ...nativeScrollEvent,
        metaKey: true,
        prevented: false,
      };
      handlers.get('wheel')(zoomEvent);

      assert.equal(zoomEvent.prevented, true);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].source, 'wheel');
    } finally {
      if (previousAddEventListener) {
        globalThis.addEventListener = previousAddEventListener;
      } else {
        delete globalThis.addEventListener;
      }
      if (previousRemoveEventListener) {
        globalThis.removeEventListener = previousRemoveEventListener;
      } else {
        delete globalThis.removeEventListener;
      }
    }
  });

  it('ListDetailShell can be imported with DOM shim', async () => {
    await assert.doesNotReject(
      import('../packages/symbiote-ui/list/ListDetailShell/ListDetailShell.js'),
      'ListDetailShell must import without throwing'
    );
    assert.ok(customElements.get('sn-list-detail-shell'));
  });

  it('CanvasGraph can be imported with DOM shim', async () => {
    await assert.doesNotReject(
      import('../packages/symbiote-ui/canvas/CanvasGraph/CanvasGraph.js'),
      'CanvasGraph must import without throwing'
    );
    assert.ok(customElements.get('canvas-graph'));
  });

  it('CanvasGraph exposes configurable host event and action contracts', async () => {
    let { CanvasGraph } = await import('../packages/symbiote-ui/canvas/CanvasGraph/CanvasGraph.js');
    let graph = new CanvasGraph();
    let events = [];
    graph.dispatchEvent = (event) => {
      events.push(event);
      return true;
    };

    graph.setEventNames({ toolbarAction: 'graph-action', nodeDeselected: 'graph-clear' });
    graph.setActionItems([{ action: 'inspect', label: 'Inspect', path: 'M0 0h1v1H0z' }]);
    graph.setSemanticPathPrefix('semantic:');

    graph._emitGraphEvent('toolbarAction', { action: 'inspect', nodeId: 'node-a' }, {
      bubbles: true,
      composed: true,
    });
    graph._emitGraphEvent('nodeDeselected');

    assert.equal(events[0].type, 'graph-action');
    assert.equal(events[0].detail.action, 'inspect');
    assert.equal(events[0].bubbles, true);
    assert.equal(events[0].composed, true);
    assert.equal(events[1].type, 'graph-clear');
    assert.deepEqual(graph.getActionItems().map((item) => item.action), ['inspect']);
    assert.equal(graph._isSemanticPath('semantic:cluster-a'), true);
    assert.equal(graph._isSemanticPath('cluster:cluster-a'), false);
  });

  it('CanvasGraph can enter semantic clusters when focusing a child node', async () => {
    let { CanvasGraph } = await import('../packages/symbiote-ui/canvas/CanvasGraph/CanvasGraph.js');
    let graph = new CanvasGraph();
    let loadedLevels = [];
    graph.graphDB = {
      nodes: new Map([
        ['cluster:backend', { id: 'cluster:backend', isGroup: true, isSemanticCluster: true }],
        ['src/backend/file.js', { id: 'src/backend/file.js', parentId: 'cluster:backend' }],
      ]),
    };
    graph.currentGroupId = null;
    graph.loadLevel = (groupId, options) => {
      loadedLevels.push({ groupId, options });
      graph.currentGroupId = groupId;
    };
    graph.getSmooth = () => null;
    graph.nodePositions = new Map();

    graph.flyToNode('src/backend/file.js');

    assert.deepEqual(loadedLevels, [
      { groupId: 'cluster:backend', options: { enterSemanticCluster: true } },
    ]);
  });

  it('CanvasGraph publishes light DOM host styles for provider consumers', async () => {
    let { default: css } = await import('../packages/symbiote-ui/canvas/CanvasGraph/CanvasGraph.css.js');
    assert.match(css, /canvas-graph\s*\{/);
    assert.match(css, /canvas-graph\s*>\s*canvas/);
  });

  it('GraphExplorerShell can be imported with DOM shim', async () => {
    await assert.doesNotReject(
      import('../packages/symbiote-ui/canvas/GraphExplorerShell/GraphExplorerShell.js'),
      'GraphExplorerShell must import without throwing'
    );
    assert.ok(customElements.get('graph-explorer-shell'));
  });

  it('CellBg can be imported with DOM shim', async () => {
    await assert.doesNotReject(
      import('../packages/symbiote-ui/effects/CellBg/CellBg.js'),
      'CellBg must import without throwing'
    );
    assert.ok(customElements.get('cell-bg'));
  });

  it('ChatTranscript can be imported with DOM shim', async () => {
    await assert.doesNotReject(
      import('../packages/symbiote-ui/chat/ChatTranscript/ChatTranscript.js'),
      'ChatTranscript must import without throwing'
    );
    assert.ok(customElements.get('chat-transcript'));
  });

  it('ChatComposer can be imported with DOM shim', async () => {
    await assert.doesNotReject(
      import('../packages/symbiote-ui/chat/ChatComposer/ChatComposer.js'),
      'ChatComposer must import without throwing'
    );
    assert.ok(customElements.get('chat-composer'));
    assert.ok(customElements.get('sn-button'));
    let source = fs.readFileSync(path.join(PKG_ROOT, 'chat/ChatComposer/ChatComposer.js'), 'utf8');
    assert.ok(source.includes('<sn-button'), 'ChatComposer actions must compose sn-button');
    assert.equal(source.includes('<button'), false, 'ChatComposer must not own raw button shells');
  });

  it('ChatList can be imported with DOM shim', async () => {
    await assert.doesNotReject(
      import('../packages/symbiote-ui/chat/ChatList/ChatList.js'),
      'ChatList must import without throwing'
    );
    assert.ok(customElements.get('chat-list'));
    assert.ok(customElements.get('chat-list-item'));
  });

  it('ListItem can be imported with DOM shim', async () => {
    await assert.doesNotReject(
      import('../packages/symbiote-ui/list/ListItem/ListItem.js'),
      'ListItem must import without throwing'
    );
    assert.ok(customElements.get('sn-list-item'));
  });

  it('TreeView can be imported with DOM shim', async () => {
    await assert.doesNotReject(
      import('../packages/symbiote-ui/tree/TreeView/TreeView.js'),
      'TreeView must import without throwing'
    );
    assert.ok(customElements.get('sn-tree-view'));
  });

  it('TreePanel can be imported with DOM shim', async () => {
    await assert.doesNotReject(
      import('../packages/symbiote-ui/tree/TreePanel/TreePanel.js'),
      'TreePanel must import without throwing'
    );
    assert.ok(customElements.get('sn-tree-panel'));
    assert.ok(customElements.get('sn-button'));
    let template = fs.readFileSync(path.join(PKG_ROOT, 'tree/TreePanel/TreePanel.tpl.js'), 'utf8');
    assert.ok(template.includes('<sn-button'), 'TreePanel collapse action must compose sn-button');
    assert.equal(template.includes('<button'), false, 'TreePanel must not own raw button shells');
  });

  it('SurfaceCard can be imported with DOM shim', async () => {
    await assert.doesNotReject(
      import('../packages/symbiote-ui/surface/Card/Card.js'),
      'SurfaceCard must import without throwing'
    );
    assert.ok(customElements.get('sn-card'));
  });

  it('ActionButton can be imported with DOM shim', async () => {
    let { ActionButton } = await import('../packages/symbiote-ui/control/Button/Button.js');
    await assert.doesNotReject(
      import('../packages/symbiote-ui/control/Button/Button.js'),
      'ActionButton must import without throwing'
    );
    assert.ok(customElements.get('sn-button'));
    let button = new ActionButton();
    button.disabled = true;
    assert.equal(button.disabled, true);
    assert.equal(button.hasAttribute('disabled'), true);
    assert.equal(button.getAttribute('aria-disabled'), 'true');
    assert.equal(button.tabIndex, -1);
    button.disabled = false;
    assert.equal(button.disabled, false);
    assert.equal(button.hasAttribute('disabled'), false);
    assert.equal(button.getAttribute('aria-disabled'), 'false');
    assert.equal(button.tabIndex, 0);
    button.setAttribute('disabled', '');
    button.attributeChangedCallback('disabled', null, '');
    assert.equal(button.disabled, true);
    assert.equal(button.hasAttribute('disabled'), true);
    assert.equal(button.getAttribute('aria-disabled'), 'true');
  });

  it('QuickToolbar composes provider action buttons', async () => {
    await assert.doesNotReject(
      import('../packages/symbiote-ui/toolbar/QuickToolbar/QuickToolbar.js'),
      'QuickToolbar must import without throwing'
    );
    assert.ok(customElements.get('quick-toolbar'));
    assert.ok(customElements.get('sn-button'));
    let template = fs.readFileSync(path.join(PKG_ROOT, 'toolbar/QuickToolbar/QuickToolbar.tpl.js'), 'utf8');
    let logic = fs.readFileSync(path.join(PKG_ROOT, 'toolbar/QuickToolbar/QuickToolbar.js'), 'utf8');
    assert.ok(template.includes('<sn-button'), 'QuickToolbar must compose sn-button controls');
    assert.equal(template.includes('<button'), false, 'QuickToolbar must not own raw button shells');
    assert.ok(template.includes('toolbar-title'), 'QuickToolbar must compose a shared title row for headerless nodes');
    assert.ok(logic.includes('hasOwnHeader'), 'QuickToolbar must decide title visibility from node header state');
    assert.ok(logic.includes('bringOverlayToFront'), 'QuickToolbar must join the shared overlay z-index stack');
    assert.ok(logic.includes('scheduleHide'), 'QuickToolbar must support hover-triggered delayed hiding');
    for (let icon of ['login', 'hub', 'code', 'content_copy', 'visibility_off', 'delete']) {
      assert.ok(logic.includes(`'${icon}'`), `QuickToolbar must autoload ${icon}`);
    }
  });

  it('FormField can be imported with DOM shim', async () => {
    await assert.doesNotReject(
      import('../packages/symbiote-ui/control/Field/Field.js'),
      'FormField must import without throwing'
    );
    assert.ok(customElements.get('sn-field'));
  });

  it('StatusBadge can be imported with DOM shim', async () => {
    await assert.doesNotReject(
      import('../packages/symbiote-ui/display/Badge/Badge.js'),
      'StatusBadge must import without throwing'
    );
    assert.ok(customElements.get('sn-badge'));
  });

  it('MetricItem can be imported with DOM shim', async () => {
    await assert.doesNotReject(
      import('../packages/symbiote-ui/display/Metric/Metric.js'),
      'MetricItem must import without throwing'
    );
    assert.ok(customElements.get('sn-metric'));
  });

  it('StatusBanner can be imported with DOM shim', async () => {
    await assert.doesNotReject(
      import('../packages/symbiote-ui/display/Banner/Banner.js'),
      'StatusBanner must import without throwing'
    );
    assert.ok(customElements.get('sn-banner'));
  });

  it('EmptyState can be imported with DOM shim', async () => {
    await assert.doesNotReject(
      import('../packages/symbiote-ui/display/EmptyState/EmptyState.js'),
      'EmptyState must import without throwing'
    );
    assert.ok(customElements.get('sn-empty-state'));
  });

  it('SourceEditor can be imported with DOM shim', async () => {
    await assert.doesNotReject(
      import('../packages/symbiote-ui/display/SourceEditor/SourceEditor.js'),
      'SourceEditor must import without throwing'
    );
    assert.ok(customElements.get('source-editor'));
  });

  it('LoadingOverlay can be imported with DOM shim', async () => {
    await assert.doesNotReject(
      import('../packages/symbiote-ui/display/LoadingOverlay/LoadingOverlay.js'),
      'LoadingOverlay must import without throwing'
    );
    assert.ok(customElements.get('sn-loading-overlay'));
  });

  it('Output preview components can be imported with DOM shim', async () => {
    await assert.doesNotReject(
      import('../packages/symbiote-ui/display/OutputListPreview/OutputListPreview.js'),
      'OutputListPreview must import without throwing'
    );
    await assert.doesNotReject(
      import('../packages/symbiote-ui/display/OutputGraphPreview/OutputGraphPreview.js'),
      'OutputGraphPreview must import without throwing'
    );
    assert.ok(customElements.get('output-list-preview'));
    assert.ok(customElements.get('output-graph-preview'));
  });
});

describe('Registration guards', () => {
  it('Node is not a custom element (pure data class)', async () => {
    let { Node } = await import('../packages/symbiote-ui/core/Node.js');
    let n = new Node('test', { type: 'flow/test', category: 'control' });
    assert.ok(typeof n.id === 'string');
    assert.ok(n.id.length > 0, 'Node must auto-generate an id');
    assert.equal(typeof n.label, 'string');
  });

  it('uid() generates unique ids', async () => {
    let { uid } = await import('../packages/symbiote-ui/core/Socket.js');
    let a = uid('nd');
    let b = uid('nd');
    assert.notEqual(a, b, 'uid must generate unique values');
    assert.ok(a.startsWith('nd_'));
    assert.ok(b.startsWith('nd_'));
  });

  it('nanoid() from engine generates unique ids', async () => {
    let { nanoid } = await import('../packages/symbiote-engine/nanoid.js');
    let a = nanoid();
    let b = nanoid();
    assert.notEqual(a, b, 'nanoid must generate unique values');
    assert.equal(typeof a, 'string');
    assert.ok(a.length > 0);
  });
});
