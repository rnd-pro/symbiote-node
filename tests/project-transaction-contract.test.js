import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  applyProjectTransaction,
  normalizeProjectPackage,
  normalizeProjectTransaction,
} from '../graph/index.js';
import { getProjectSchema, listProjectSchemaVersions } from '../manifest/project-schema-catalog.js';

const localAbsolutePath = ['', 'Users', 'example', 'private.js'].join('/');

const baseProject = {
  version: 'project-package-v1',
  id: 'generated-workspace',
  entry: { graph: 'main', layout: 'main', theme: 'default' },
  graphs: {
    main: {
      version: 'graph-model-v1',
      nodes: [
        {
          id: 'panel:root',
          kind: 'ui.layout',
          design: { component: 'panel-layout', themeScope: 'layout.root' },
        },
      ],
    },
  },
  layouts: {
    main: {
      version: 'runtime-ui-v1',
      root: { component: 'panel-layout' },
    },
  },
  themes: {
    default: { extends: 'symbiote-default', modifiers: { density: 1 } },
  },
};

describe('project-transaction-v1 contract', () => {
  it('is discoverable as a project schema', () => {
    assert.deepEqual(listProjectSchemaVersions(), ['project-package-v1', 'project-transaction-v1']);
    const schema = getProjectSchema('project-transaction-v1');
    assert.equal(schema.properties.version.const, 'project-transaction-v1');
    assert.ok(schema.$defs.operation.oneOf.some((item) => item.$ref.endsWith('graphAddNodeOperation')));
    assert.deepEqual(schema.$defs.graphAddNodeOperation.required, ['type', 'graph', 'node']);
    assert.deepEqual(schema.$defs.layoutAddPanelOperation.required, ['type', 'layout', 'panel']);
    assert.deepEqual(schema.$defs.themeSetModifierOperation.required, ['type', 'theme', 'name', 'value']);
  });

  it('normalizes agent-authored graph and theme transactions', () => {
    const transaction = normalizeProjectTransaction({
      version: 'project-transaction-v1',
      id: 'tx:add-log-panel',
      targetProject: 'generated-workspace',
      operations: [
        {
          type: 'graph.addNode',
          graph: 'main',
          node: {
            id: 'panel:logs',
            kind: 'ui.panel',
            params: { source: 'runtime.logs' },
            design: { component: 'source-viewer', themeScope: 'panel.logs' },
          },
        },
        {
          type: 'graph.addEdge',
          graph: 'main',
          edge: {
            source: { nodeId: 'panel:root', port: 'selection' },
            target: { nodeId: 'panel:logs', port: 'filter' },
            kind: 'ui.binding',
          },
        },
        {
          type: 'theme.setModifier',
          theme: 'default',
          name: 'density',
          value: 0.92,
        },
      ],
    });

    assert.equal(transaction.operations.length, 3);
    assert.equal(transaction.operations[0].node.kind, 'ui.panel');
    assert.equal(transaction.operations[1].edge.source.nodeId, 'panel:root');
    assert.equal(transaction.operations[2].value, 0.92);
  });

  it('applies graph node, edge, and theme modifier operations without mutating the source project', () => {
    const project = normalizeProjectPackage(baseProject);
    const next = applyProjectTransaction(project, {
      version: 'project-transaction-v1',
      id: 'tx:add-panel',
      operations: [
        {
          type: 'graph.addNode',
          graph: 'main',
          node: {
            id: 'panel:queue',
            kind: 'ui.panel',
            design: { component: 'sn-list-item', themeScope: 'panel.queue' },
          },
        },
        {
          type: 'graph.addEdge',
          graph: 'main',
          edge: {
            source: { nodeId: 'panel:root', port: 'selection' },
            target: { nodeId: 'panel:queue', port: 'filter' },
          },
        },
        {
          type: 'theme.setModifier',
          theme: 'default',
          name: 'density',
          value: 0.88,
        },
      ],
    });

    assert.equal(project.graphs.main.nodesById.has('panel:queue'), false);
    assert.equal(next.graphs.main.nodesById.has('panel:queue'), true);
    assert.equal(next.graphs.main.edges.length, 1);
    assert.equal(next.themes.default.modifiers.density, 0.88);
  });

  it('rejects theme modifier transactions outside the provider theme contract', () => {
    const project = normalizeProjectPackage(baseProject);

    assert.throws(
      () => applyProjectTransaction(project, {
        version: 'project-transaction-v1',
        id: 'tx:bad-theme-modifier',
        operations: [
          {
            type: 'theme.setModifier',
            theme: 'default',
            name: 'brightness',
            value: -0.1,
          },
        ],
      }),
      /modifier "brightness" is not defined/
    );
  });

  it('adds runtime panels to layout roots or explicit parent nodes', () => {
    const project = normalizeProjectPackage({
      ...baseProject,
      layouts: {
        main: {
          version: 'runtime-ui-v1',
          root: {
            id: 'root',
            component: 'panel-layout',
            children: [{ id: 'left', component: 'panel-layout' }],
          },
        },
      },
    });

    const next = applyProjectTransaction(project, {
      version: 'project-transaction-v1',
      id: 'tx:add-layout-panels',
      operations: [
        {
          type: 'layout.addPanel',
          layout: 'main',
          parentId: 'left',
          panel: { id: 'conversation', component: 'chat-transcript', props: { graph: 'main' } },
        },
        {
          type: 'layout.addPanel',
          layout: 'main',
          panel: { id: 'inspector', component: 'source-viewer' },
        },
      ],
    });

    assert.equal(project.layouts.main.root.children.length, 1);
    assert.equal(next.layouts.main.root.children.length, 2);
    assert.equal(next.layouts.main.root.children[0].children[0].id, 'conversation');
    assert.equal(next.layouts.main.root.children[1].id, 'inspector');
  });

  it('rejects layout panel operations with missing parents or components', () => {
    const project = normalizeProjectPackage(baseProject);

    assert.throws(
      () => applyProjectTransaction(project, {
        version: 'project-transaction-v1',
        id: 'tx:missing-parent',
        operations: [
          {
            type: 'layout.addPanel',
            layout: 'main',
            parentId: 'missing',
            panel: { component: 'chat-transcript' },
          },
        ],
      }),
      /layout parent "missing" is not defined/
    );

    assert.throws(
      () => applyProjectTransaction(project, {
        version: 'project-transaction-v1',
        id: 'tx:missing-component',
        operations: [
          {
            type: 'layout.addPanel',
            layout: 'main',
            panel: { props: { graph: 'main' } },
          },
        ],
      }),
      /operation.panel.component is required/
    );

    const next = applyProjectTransaction(project, {
      version: 'project-transaction-v1',
      id: 'tx:portal-component',
      operations: [
        {
          type: 'layout.addPanel',
          layout: 'main',
          panel: { component: 'pg-agent-chat', componentRegistry: 'portal/runtime' },
        },
      ],
    });

    assert.equal(next.layouts.main.root.children[0].component, 'pg-agent-chat');
    assert.equal(next.layouts.main.root.children[0].componentRegistry, 'portal/runtime');
  });

  it('rejects unknown operations and unsafe project data', () => {
    assert.throws(
      () => normalizeProjectTransaction({
        version: 'project-transaction-v1',
        id: 'tx:bad',
        operations: [{ type: 'shell.exec', command: 'rm -rf .' }],
      }),
      /unsupported project transaction operation/
    );

    assert.throws(
      () => normalizeProjectTransaction({
        version: 'project-transaction-v1',
        id: 'tx:leak',
        operations: [
          {
            type: 'graph.addNode',
            graph: 'main',
            node: { id: 'file:local', kind: 'project.file', params: { path: localAbsolutePath } },
          },
        ],
      }),
      /absolute local path/
    );
  });
});
