import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeProjectPackage,
} from '../graph/index.js';
import { getProjectSchema, listProjectSchemaVersions } from '../manifest/project-schema-catalog.js';

const localAbsolutePath = ['', 'Users', 'example', 'private.js'].join('/');

const packages = [
  {
    name: 'workspace application config',
    project: {
      version: 'project-package-v1',
      id: 'workspace-control-plane',
      name: 'Workspace Control Plane',
      entry: { graph: 'project', layout: 'workspace', theme: 'default' },
      packs: [
        { id: 'symbiote-node/ui', kind: 'provider' },
        { id: 'project-graph', kind: 'data-provider' },
      ],
      graphs: {
        project: {
          version: 'graph-model-v1',
          nodes: [
            {
              id: 'panel:graph',
              kind: 'ui.panel',
              design: { component: 'canvas-graph', themeScope: 'panel.graph' },
            },
          ],
        },
      },
      layouts: {
        workspace: {
          version: 'runtime-ui-v1',
          root: {
            component: 'panel-layout',
            props: { orientation: 'horizontal' },
            children: [{ component: 'canvas-graph', props: { graph: 'project' } }],
          },
        },
      },
      themes: {
        default: {
          extends: 'symbiote-default',
          modifiers: { backgroundLightness: '10%', density: 0.95, chroma: '85%' },
        },
      },
      dataSources: {
        projectGraph: { kind: 'mcp-resource', graph: 'project' },
      },
      agents: {
        rules: ['rules/workspace.md'],
        allowedTransactions: ['graph.addNode', 'layout.addPanel', 'theme.setModifier'],
      },
    },
  },
  {
    name: 'local ai process dashboard config',
    project: {
      version: 'project-package-v1',
      id: 'local-ai-dashboard',
      entry: { graph: 'processes', layout: 'dashboard', theme: 'default' },
      graphs: {
        processes: {
          version: 'graph-model-v1',
          nodes: [
            {
              id: 'runner:llm',
              kind: 'process.runner',
              flow: { outputs: [{ name: 'status', type: 'process.status' }] },
              design: { component: 'graph-node', themeScope: 'node.process.runner' },
            },
            {
              id: 'panel:logs',
              kind: 'ui.panel',
              flow: { inputs: [{ name: 'filter', type: 'process.status' }] },
              design: { component: 'source-viewer', themeScope: 'panel.logs' },
            },
          ],
          edges: [
            {
              source: { nodeId: 'runner:llm', port: 'status' },
              target: { nodeId: 'panel:logs', port: 'filter' },
              kind: 'ui.binding',
            },
          ],
        },
      },
      layouts: {
        dashboard: {
          version: 'runtime-ui-v1',
          root: { component: 'panel-layout', props: { graph: 'processes' } },
        },
      },
      themes: {
        default: { extends: 'symbiote-default', modifiers: { density: 0.9 } },
      },
    },
  },
  {
    name: 'video editor config',
    project: {
      version: 'project-package-v1',
      id: 'video-editor',
      entry: { graph: 'timeline', layout: 'editor', theme: 'default' },
      packs: [{ id: 'video-pack', kind: 'domain-pack' }],
      graphs: {
        timeline: {
          version: 'graph-model-v1',
          nodes: [
            {
              id: 'clip:main',
              kind: 'video.clip',
              flow: { outputs: [{ name: 'frames', type: 'image-sequence' }] },
              design: { component: 'graph-node', variant: 'timeline-clip', themeScope: 'node.video.clip' },
              params: { src: 'assets/clip.webp' },
            },
          ],
        },
      },
      layouts: {
        editor: {
          version: 'runtime-ui-v1',
          root: { component: 'panel-layout', props: { mode: 'video-editor' } },
        },
      },
      themes: {
        default: { extends: 'symbiote-default', modifiers: { density: 0.88 } },
      },
    },
  },
];

describe('project-package-v1 contract', () => {
  it('is discoverable as a project schema', () => {
    assert.ok(listProjectSchemaVersions().includes('project-package-v1'));
    const schema = getProjectSchema('project-package-v1');
    assert.equal(schema.properties.version.const, 'project-package-v1');
    assert.ok(schema.properties.graphs);
    assert.ok(schema.properties.layouts);
    assert.ok(schema.properties.themes);
    assert.ok(schema.properties.agents);
  });

  for (const item of packages) {
    it(`normalizes ${item.name}`, () => {
      const project = normalizeProjectPackage(item.project);

      assert.equal(project.version, 'project-package-v1');
      assert.equal(project.entry.graph in project.graphs, true);
      assert.equal(project.entry.layout in project.layouts, true);
      assert.equal(project.entry.theme in project.themes, true);
      assert.equal(project.graphs[project.entry.graph].version, 'graph-model-v1');
      assert.equal(project.graphsById instanceof Map, true);
      assert.equal(project.layoutsById instanceof Map, true);
      assert.equal(project.themesById instanceof Map, true);
      assert.equal(JSON.stringify(project).includes(localAbsolutePath.slice(0, 7)), false);
    });
  }

  it('rejects missing entry references', () => {
    assert.throws(
      () => normalizeProjectPackage({
        version: 'project-package-v1',
        id: 'broken',
        entry: { graph: 'missing', layout: 'main', theme: 'default' },
        layouts: { main: { version: 'runtime-ui-v1', root: { component: 'panel-layout' } } },
        themes: { default: { extends: 'symbiote-default' } },
      }),
      /entry graph "missing" is not defined/
    );
  });

  it('rejects absolute local paths in public project configs', () => {
    assert.throws(
      () => normalizeProjectPackage({
        version: 'project-package-v1',
        id: 'leaky',
        entry: { graph: 'main', layout: 'main', theme: 'default' },
        graphs: {
          main: {
            version: 'graph-model-v1',
            nodes: [
              {
                id: 'file:local',
                kind: 'project.file',
                params: { path: localAbsolutePath },
              },
            ],
          },
        },
        layouts: { main: { version: 'runtime-ui-v1', root: { component: 'panel-layout' } } },
        themes: { default: { extends: 'symbiote-default' } },
      }),
      /absolute local path/
    );
  });

  it('rejects unknown modifiers for built-in provider themes', () => {
    assert.throws(
      () => normalizeProjectPackage({
        version: 'project-package-v1',
        id: 'bad-theme',
        entry: { graph: 'main', layout: 'main', theme: 'default' },
        graphs: { main: { version: 'graph-model-v1', nodes: [] } },
        layouts: { main: { version: 'runtime-ui-v1', root: { component: 'panel-layout' } } },
        themes: { default: { extends: 'symbiote-default', modifiers: { brightness: -0.1 } } },
      }),
      /modifier "brightness" is not defined/
    );
  });

  it('allows custom theme-pack modifiers outside built-in provider themes', () => {
    const project = normalizeProjectPackage({
      version: 'project-package-v1',
      id: 'custom-theme',
      entry: { graph: 'main', layout: 'main', theme: 'brand' },
      graphs: { main: { version: 'graph-model-v1', nodes: [] } },
      layouts: { main: { version: 'runtime-ui-v1', root: { component: 'panel-layout' } } },
      themes: { brand: { extends: 'brand-pack/theme', modifiers: { mood: 'editorial' } } },
    });

    assert.equal(project.themes.brand.modifiers.mood, 'editorial');
  });
});
