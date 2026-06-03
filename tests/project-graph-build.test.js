import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFlatGroups,
  buildGraphStatItems,
  prepareGraphBuild,
} from '../packages/symbiote-ui/graph/index.js';

function createGraph() {
  return {
    fileMap: new Map([
      ['web/app.js', 'node-web'],
      ['src/a.js', 'node-src-a'],
      ['src/b.js', 'node-src-b'],
    ]),
    dirFiles: new Map([
      ['web/', ['web/app.js']],
      ['src/', ['src/a.js', 'src/b.js']],
    ]),
    symbolMap: new Map([
      ['symbol-a', { file: 'src/a.js' }],
      ['symbol-b', { file: 'src/b.js' }],
    ]),
  };
}

function getOrBuildGraph({
  cache,
  skeleton,
  isStructured,
  buildStructuredGraphFn,
  buildFileGraphFn,
}) {
  let cacheKey = isStructured ? 'structured' : 'flat';
  let cachedGraph = cache[cacheKey];

  if (cachedGraph?.skeleton === skeleton) {
    return { graph: cachedGraph, cached: true };
  }

  let graph = isStructured
    ? buildStructuredGraphFn(skeleton)
    : buildFileGraphFn(skeleton);

  cache[cacheKey] = { skeleton, ...graph };
  return { graph: cache[cacheKey], cached: false };
}

function getDrillableFiles(symbolMap = new Map()) {
  return new Set([...symbolMap.values()].map((symbol) => symbol.file));
}

describe('project graph build helpers', () => {
  it('builds flat directory groups while preserving semantic cluster ownership', () => {
    assert.deepEqual(buildFlatGroups(
      new Map([
        ['web/', ['web/app.js']],
        ['src/', ['src/a.js', 'src/b.js']],
      ]),
      new Map([
        ['web/app.js', 'node-web'],
        ['src/a.js', 'node-src-a'],
        ['src/b.js', 'node-src-b'],
      ]),
      {
        clusters: [{ id: 'web-dashboard', label: 'Web Dashboard', paths: ['web/'] }],
      },
    ), {
      'cluster:web-dashboard': ['node-web'],
      'src/': ['node-src-a', 'node-src-b'],
    });
  });

  it('prepares graph build data without product UI dependencies', () => {
    let cache = {};
    let skeleton = { files: [] };

    let result = prepareGraphBuild({
      cache,
      skeleton,
      isStructured: false,
      projectGraphMetadata: {
        clusters: [{ id: 'web-dashboard', label: 'Web Dashboard', paths: ['web/'] }],
      },
      getOrBuildGraphFn: getOrBuildGraph,
      getDrillableFilesFn: getDrillableFiles,
      buildStructuredGraphFn: () => {
        throw new Error('structured builder should not run');
      },
      buildFileGraphFn: createGraph,
    });

    assert.equal(result.cached, false);
    assert.deepEqual(result.groups, {
      'cluster:web-dashboard': ['node-web'],
      'src/': ['node-src-a', 'node-src-b'],
    });
    assert.deepEqual([...result.drillableFiles].sort(), ['src/a.js', 'src/b.js']);
  });

  it('keeps graph stat rows as provider data', () => {
    assert.deepEqual(buildGraphStatItems({
      skeletonStats: { functions: 4, classes: 2 },
      fileCount: 3,
      edgeCount: 5,
      viaCount: 1,
    }), [[3, 'files'], [4, 'fn'], [2, 'cls'], [5, 'edges'], [1, 'vias']]);
  });
});
