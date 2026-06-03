import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  canvasGraphModelToGraphModel,
  graphModelToCanvasGraphModel,
} from '../packages/symbiote-ui/graph/index.js';

describe('graph canvas adapter', () => {
  it('converts graph-model-v1 nodes and endpoints into a canvas graph model', () => {
    const canvas = graphModelToCanvasGraphModel({
      version: 'graph-model-v1',
      nodes: [
        {
          id: 'layout:root',
          kind: 'ui.layout',
          label: 'Workspace',
          children: ['panel:chat'],
          design: { component: 'panel-layout', variant: 'layout', width: 300, height: 220 },
        },
        {
          id: 'panel:chat',
          kind: 'ui.panel',
          label: 'Chat',
          parentId: 'layout:root',
          design: {
            component: 'agent-chat',
            variant: 'chat-panel',
            color: 'hsl(218 80% 56%)',
            canvas: { description: 'Runtime chat surface' },
          },
          themeScope: 'panel.chat',
          params: { source: 'runtime.chat' },
        },
      ],
      edges: [
        {
          source: { nodeId: 'layout:root', port: 'selection' },
          target: { nodeId: 'panel:chat', port: 'focus' },
          kind: 'ui.binding',
        },
      ],
      views: {
        main: { kind: 'canvas-graph', roots: ['layout:root'] },
      },
    }, { view: 'main' });

    assert.deepEqual(canvas.rootNodes, ['layout:root']);
    assert.equal(canvas.nodes[0].isGroup, true);
    assert.equal(canvas.nodes[0].type, 'layout');
    assert.equal(canvas.nodes[0].w, 300);
    assert.equal(canvas.nodes[1].parentId, 'layout:root');
    assert.equal(canvas.nodes[1].type, 'chat-panel');
    assert.equal(canvas.nodes[1].themeScope, 'panel.chat');
    assert.equal(canvas.nodes[1].description, 'Runtime chat surface');
    assert.deepEqual(canvas.edges[0], {
      id: 'layout:root:selection->panel:chat:focus',
      from: 'layout:root',
      to: 'panel:chat',
      out: 'selection',
      in: 'focus',
      type: 'ui.binding',
      label: undefined,
      params: {},
      metadata: {},
    });
  });

  it('converts a generic canvas graph model into graph-model-v1 without product skeleton fields', () => {
    const graph = canvasGraphModelToGraphModel({
      nodes: [
        { id: 'group:main', label: 'Main', type: 'group', isGroup: true, children: ['node:a'], w: 180, h: 80 },
        { id: 'node:a', label: 'A', type: 'action', parentId: 'group:main', themeScope: 'node.action', lines: 42 },
        { id: 'node:b', label: 'B', type: 'data' },
      ],
      edges: [{ from: 'node:a', to: 'node:b', out: 'result', in: 'input', type: 'dataflow' }],
      rootNodes: ['group:main', 'node:b'],
    });

    assert.equal(graph.version, 'graph-model-v1');
    assert.equal(graph.nodesById.get('group:main').kind, 'group');
    assert.equal(graph.nodesById.get('group:main').design.component, 'graph-group');
    assert.equal(graph.nodesById.get('group:main').design.width, 180);
    assert.equal(graph.nodesById.get('node:a').parentId, 'group:main');
    assert.equal(graph.nodesById.get('node:a').themeScope, 'node.action');
    assert.equal(graph.nodesById.get('node:a').design.canvas.lines, 42);
    assert.equal(graph.edges[0].source.port, 'result');
    assert.deepEqual(graph.views.canvas.roots, ['group:main', 'node:b']);
    assert.equal(JSON.stringify(graph).includes('"n"'), false);
    assert.equal(JSON.stringify(graph).includes('"I"'), false);
  });

  it('filters canvas output by graph view roots', () => {
    const canvas = graphModelToCanvasGraphModel({
      version: 'graph-model-v1',
      nodes: [
        { id: 'root:a', kind: 'ui.panel', children: ['node:a'] },
        { id: 'node:a', kind: 'ui.panel', parentId: 'root:a' },
        { id: 'root:b', kind: 'ui.panel' },
      ],
      edges: [
        {
          source: { nodeId: 'node:a', port: 'default' },
          target: { nodeId: 'root:b', port: 'default' },
        },
      ],
      views: { left: { roots: ['root:a'] } },
    }, { view: 'left' });

    assert.deepEqual(canvas.nodes.map((node) => node.id), ['root:a', 'node:a']);
    assert.deepEqual(canvas.rootNodes, ['root:a']);
    assert.deepEqual(canvas.edges, []);
  });
});
