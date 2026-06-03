import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createProjectRuntime } from '../packages/symbiote-ui/graph/index.js';

const baseProject = {
  version: 'project-package-v1',
  id: 'runtime-workspace',
  entry: { graph: 'main', layout: 'main', theme: 'default' },
  graphs: {
    main: {
      version: 'graph-model-v1',
      nodes: [{ id: 'panel:root', kind: 'ui.panel', design: { component: 'panel-layout' } }],
    },
  },
  layouts: {
    main: {
      version: 'runtime-ui-v1',
      root: { id: 'root', component: 'panel-layout' },
    },
  },
  themes: {
    default: { extends: 'symbiote-default', modifiers: { density: 1 } },
  },
};

describe('project runtime host', () => {
  it('exposes normalized project package state', () => {
    const runtime = createProjectRuntime(baseProject);

    assert.equal(runtime.getProject().id, 'runtime-workspace');
    assert.equal(runtime.getGraph().version, 'graph-model-v1');
    assert.equal(runtime.getLayout().root.component, 'panel-layout');
    assert.equal(runtime.getTheme().modifiers.density, 1);
  });

  it('applies graph, layout, and theme transactions without mutating the source object', () => {
    const runtime = createProjectRuntime(baseProject);
    const events = [];
    const unsubscribe = runtime.subscribe((event) => events.push(event));

    runtime.addGraphNode('main', {
      id: 'panel:logs',
      kind: 'ui.panel',
      design: { component: 'source-viewer', themeScope: 'panel.logs' },
    });
    runtime.addLayoutPanel('main', { id: 'logs', component: 'source-viewer' });
    runtime.setThemeModifier('default', 'density', 0.88);
    unsubscribe();
    runtime.setThemeModifier('default', 'chroma', '85%');

    assert.equal(baseProject.graphs.main.nodes.length, 1);
    assert.equal(runtime.getGraph('main').nodesById.has('panel:logs'), true);
    assert.equal(runtime.getLayout('main').root.children[0].id, 'logs');
    assert.equal(runtime.getTheme('default').modifiers.density, 0.88);
    assert.equal(runtime.getTheme('default').modifiers.chroma, '85%');
    assert.equal(events.length, 3);
    assert.equal(events[0].transaction.operations[0].type, 'graph.addNode');
  });

  it('rejects transactions for another project', () => {
    const runtime = createProjectRuntime(baseProject);

    assert.throws(
      () => runtime.applyTransaction({
        version: 'project-transaction-v1',
        id: 'tx:foreign',
        targetProject: 'other-project',
        operations: [{ type: 'theme.setModifier', theme: 'default', name: 'density', value: 0.8 }],
      }),
      /does not match project/
    );
  });

  it('uses project transaction validation for theme modifiers', () => {
    const runtime = createProjectRuntime(baseProject);

    assert.throws(
      () => runtime.setThemeModifier('default', 'brightness', -0.1),
      /modifier "brightness" is not defined/
    );
  });
});
