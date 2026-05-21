import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeGraphModel,
  normalizeGraphNode,
  normalizeGraphEdge,
} from '../graph/index.js';
import { getGraphSchema, listGraphVersions } from '../manifest/graph-schema.js';

const scenarios = [
  {
    name: 'codebase project graph',
    model: {
      version: 'graph-model-v1',
      metadata: { projectKind: 'codebase' },
      nodes: [
        {
          id: 'file:app/panels/project-graph.js',
          kind: 'project.file',
          label: 'project-graph.js',
          flow: {
            outputs: [{ name: 'imports', type: 'project.file-ref' }],
          },
          design: {
            component: 'canvas-graph-node',
            variant: 'file',
            themeScope: 'node.project.file',
            layout: { x: 120, y: 80, w: 240, h: 72 },
          },
          params: { path: 'app/panels/project-graph.js', language: 'javascript' },
        },
        {
          id: 'file:packages/ui-library/canvas/GraphExplorerShell.js',
          kind: 'project.file',
          label: 'GraphExplorerShell.js',
          design: {
            component: 'canvas-graph-node',
            variant: 'library-file',
            themeScope: 'node.project.library-file',
          },
          params: {
            path: 'packages/ui-library/canvas/GraphExplorerShell.js',
          },
        },
      ],
      edges: [
        {
          id: 'edge:project-graph-to-shell',
          source: { nodeId: 'file:app/panels/project-graph.js', port: 'imports' },
          target: {
            nodeId: 'file:packages/ui-library/canvas/GraphExplorerShell.js',
            port: 'module',
          },
          kind: 'project.import',
        },
      ],
      views: {
        default: {
          kind: 'graph-canvas',
          roots: ['file:app/panels/project-graph.js'],
          groups: [
            {
              id: 'group:ui-library',
              label: 'ui-library',
              nodeIds: ['file:packages/ui-library/canvas/GraphExplorerShell.js'],
              themeScope: 'group.package.library',
            },
          ],
        },
      },
    },
  },
  {
    name: 'video editor runtime workflow',
    model: {
      version: 'graph-model-v1',
      metadata: { projectKind: 'video' },
      nodes: [
        {
          id: 'clip:hero',
          kind: 'video.clip',
          label: 'Hero clip',
          flow: {
            outputs: [{ name: 'frames', type: 'image-sequence' }],
          },
          params: { src: 'media/hero.webp', fps: 30 },
          design: {
            component: 'graph-node',
            variant: 'timeline-clip',
            themeScope: 'node.video.clip',
            layout: { x: 48, y: 64, w: 220, h: 80 },
          },
        },
        {
          id: 'effect:beat-sync',
          kind: 'video.effect',
          flow: {
            inputs: [{ name: 'input', type: 'image-sequence' }],
            outputs: [{ name: 'output', type: 'image-sequence' }],
          },
          params: { preset: 'pulse', intensity: 0.8 },
          design: {
            component: 'graph-node',
            variant: 'effect',
            themeScope: 'node.video.effect',
          },
        },
      ],
      edges: [
        {
          source: { nodeId: 'clip:hero', port: 'frames' },
          target: { nodeId: 'effect:beat-sync', port: 'input' },
          kind: 'dataflow',
        },
      ],
    },
  },
  {
    name: 'automation dashboard as generated UI',
    model: {
      version: 'graph-model-v1',
      nodes: [
        {
          id: 'dashboard:automation',
          kind: 'ui.layout',
          label: 'Automation Dashboard',
          children: ['panel:queue', 'panel:logs'],
          design: {
            component: 'panel-layout',
            variant: 'split-horizontal',
            themeScope: 'layout.dashboard',
            layout: { basis: '1fr' },
          },
        },
        {
          id: 'panel:queue',
          kind: 'ui.panel',
          params: { source: 'automation.queue' },
          design: { component: 'sn-list-item', themeScope: 'panel.queue' },
        },
        {
          id: 'panel:logs',
          kind: 'ui.panel',
          params: { source: 'automation.logs' },
          design: { component: 'source-viewer', themeScope: 'panel.logs' },
        },
      ],
      edges: [
        {
          source: { nodeId: 'panel:queue', port: 'selected' },
          target: { nodeId: 'panel:logs', port: 'filter' },
          kind: 'ui.binding',
        },
      ],
      theme: {
        scope: 'app.automation',
        extends: 'symbiote-default',
        modifiers: { backgroundLightness: '10%', density: 0.9, chroma: '80%' },
      },
    },
  },
  {
    name: 'comfy style media workflow',
    model: {
      version: 'graph-model-v1',
      metadata: { projectKind: 'media-workflow', sourceFormat: 'comfy-like' },
      nodes: [
        {
          id: '3',
          kind: 'comfy.KSampler',
          flow: {
            inputs: [
              { name: 'model', type: 'MODEL' },
              { name: 'positive', type: 'CONDITIONING' },
              { name: 'latent_image', type: 'LATENT' },
            ],
            outputs: [{ name: 'LATENT', type: 'LATENT' }],
          },
          params: { seed: 42, steps: 20, cfg: 8 },
          design: {
            component: 'graph-node',
            themeScope: 'node.media.sampler',
            layout: { x: 640, y: 220, w: 260, h: 220 },
          },
        },
        {
          id: '7',
          kind: 'comfy.VAEDecode',
          flow: {
            inputs: [{ name: 'samples', type: 'LATENT' }],
            outputs: [{ name: 'IMAGE', type: 'IMAGE' }],
          },
          design: { component: 'graph-node', themeScope: 'node.media.decode' },
        },
      ],
      edges: [
        {
          source: { nodeId: '3', port: 'LATENT' },
          target: { nodeId: '7', port: 'samples' },
          kind: 'dataflow',
        },
      ],
    },
  },
];

describe('graph-model-v1 contract', () => {
  it('is discoverable as a provider schema version', () => {
    assert.ok(listGraphVersions().includes('graph-model-v1'));
    const schema = getGraphSchema('graph-model-v1');
    assert.equal(schema.properties.version.const, 'graph-model-v1');
    assert.ok(schema.$defs.node);
    assert.ok(schema.$defs.edge);
    assert.ok(schema.$defs.themeRef);
  });

  for (const scenario of scenarios) {
    it(`normalizes ${scenario.name}`, () => {
      const model = normalizeGraphModel(scenario.model);

      assert.equal(model.version, 'graph-model-v1');
      assert.equal(model.nodes.length, scenario.model.nodes.length);
      assert.equal(model.edges.length, scenario.model.edges?.length || 0);
      assert.equal(model.nodesById instanceof Map, true);
      assert.equal(model.edgesById instanceof Map, true);
      assert.equal(model.nodes.every((node) => typeof node.kind === 'string'), true);
      assert.equal(model.nodes.every((node) => node.design.themeScope || node.themeScope), true);
      assert.equal(model.edges.every((edge) => model.nodesById.has(edge.source.nodeId)), true);
      assert.equal(model.edges.every((edge) => model.nodesById.has(edge.target.nodeId)), true);
    });
  }

  it('keeps flow, design, params, hierarchy, state, and theme as independent domains', () => {
    const node = normalizeGraphNode({
      id: 'node:compound',
      kind: 'compound.workflow',
      flow: { inputs: [{ name: 'in', type: '*' }], outputs: [{ name: 'out', type: 'object' }] },
      params: { mode: 'auto' },
      design: { component: 'graph-node', themeScope: 'node.compound' },
      children: ['node:child'],
      state: { expanded: true },
    });

    assert.deepEqual(Object.keys(node).sort(), [
      'children',
      'design',
      'flow',
      'id',
      'kind',
      'label',
      'params',
      'state',
    ]);
    assert.equal(node.flow.inputs[0].type, '*');
    assert.equal(node.design.component, 'graph-node');
    assert.deepEqual(node.children, ['node:child']);
  });

  it('normalizes canonical graph edge endpoints', () => {
    assert.deepEqual(normalizeGraphEdge({
      source: { nodeId: 'a', port: 'x' },
      target: { nodeId: 'b', port: 'y' },
    }), {
      id: 'a:x->b:y',
      kind: 'dataflow',
      source: { nodeId: 'a', port: 'x' },
      target: { nodeId: 'b', port: 'y' },
      params: {},
    });

    assert.deepEqual(normalizeGraphEdge({
      source: { nodeId: 'a', port: 'module' },
      target: { nodeId: 'b', port: 'dependency' },
      kind: 'project.import',
    }), {
      id: 'a:module->b:dependency',
      kind: 'project.import',
      source: { nodeId: 'a', port: 'module' },
      target: { nodeId: 'b', port: 'dependency' },
      params: {},
    });
  });

  it('rejects edges that point outside the model', () => {
    assert.throws(
      () => normalizeGraphModel({
        version: 'graph-model-v1',
        nodes: [{ id: 'a', kind: 'data' }],
        edges: [
          {
            source: { nodeId: 'a', port: 'default' },
            target: { nodeId: 'missing', port: 'default' },
          },
        ],
      }),
      /target node "missing" is not defined/
    );
  });
});
