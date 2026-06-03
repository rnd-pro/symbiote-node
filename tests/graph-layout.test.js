import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  computeInitialGraphPositions,
  createForceLayoutPayload,
  findForceNodeGroup,
  getDrillableFiles,
  getForceLayoutOptions,
  getGraphCacheKey,
  getOrBuildGraph,
} from '../packages/symbiote-ui/canvas/graph-layout.js';

function createEditor(nodes) {
  return {
    getNodes() {
      return nodes;
    },
  };
}

describe('graph layout helpers', () => {
  it('builds a force-layout worker payload from generic nodes and connections', () => {
    const payload = createForceLayoutPayload({
      nodes: [
        { id: 'a', params: { calculatedWidth: 120, calculatedHeight: 48 } },
        { id: 'b' },
      ],
      connections: [{ from: 'a', to: 'b' }],
      positions: { a: { x: 10, y: 20 } },
      groups: { core: ['a'] },
      nodeSizes: { b: { w: 90, h: 30 } },
      continuous: true,
    });

    assert.deepEqual(payload.nodes, [
      { id: 'a', x: 10, y: 20, group: 'core', w: 120, h: 48 },
      { id: 'b', x: 0, y: 0, group: null, w: 90, h: 30 },
    ]);
    assert.deepEqual(payload.edges, [{ from: 'a', to: 'b' }]);
    assert.deepEqual(payload.groups, { core: ['a'] });
    assert.equal(payload.options.mode, 'continuous');
    assert.equal(payload.options.brownian, 0);
  });

  it('computes deterministic grouped positions with an injected random source', () => {
    const editor = createEditor([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    const positions = computeInitialGraphPositions({
      editor,
      groups: { one: ['a'], two: ['b'] },
      random: () => 0.5,
    });

    assert.deepEqual(Object.keys(positions).sort(), ['a', 'b', 'c']);
    assert.equal(typeof positions.a.x, 'number');
    assert.equal(typeof positions.b.y, 'number');
    assert.notDeepEqual(positions.a, positions.b);
  });

  it('delegates structured layout to the provided tree-layout function', () => {
    const editor = createEditor([{ id: 'dir-a' }, { id: 'file-a' }]);
    const result = computeInitialGraphPositions({
      editor,
      isStructured: true,
      dirFiles: new Map([['src', ['src/a.js']]]),
      dirNodeMap: new Map([['src', 'dir-a']]),
      computeTreeLayoutFn: (receivedEditor, options) => {
        assert.equal(receivedEditor, editor);
        assert.deepEqual(options.dirPaths, { 'dir-a': 'src' });
        return { 'dir-a': { x: 1, y: 2 } };
      },
    });

    assert.deepEqual(result, { 'dir-a': { x: 1, y: 2 } });
  });

  it('caches graph builds by view mode and source object identity', () => {
    const skeleton = {};
    const cache = {};
    let builds = 0;
    const first = getOrBuildGraph({
      cache,
      skeleton,
      isStructured: false,
      buildFileGraphFn: () => {
        builds += 1;
        return { nodes: [], connections: [] };
      },
      buildStructuredGraphFn: () => {
        throw new Error('unexpected structured build');
      },
    });
    const second = getOrBuildGraph({
      cache,
      skeleton,
      isStructured: false,
      buildFileGraphFn: () => {
        builds += 1;
        return { nodes: [], connections: [] };
      },
      buildStructuredGraphFn: () => {
        throw new Error('unexpected structured build');
      },
    });

    assert.equal(getGraphCacheKey(false), 'flat');
    assert.deepEqual([...getDrillableFiles(new Map([['a', { file: 'src/a.js' }]]))], ['src/a.js']);
    assert.equal(findForceNodeGroup({ core: ['a'] }, 'a'), 'core');
    assert.equal(getForceLayoutOptions(1000).chargeStrength, -300);
    assert.equal(first.cached, false);
    assert.equal(second.cached, true);
    assert.equal(first.graph, second.graph);
    assert.equal(builds, 1);
    assert.ok(second.graph.symbolMap instanceof Map);
  });
});
