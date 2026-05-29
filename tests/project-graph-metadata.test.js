import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  buildSemanticGroups,
  findClusterForPath,
  normalizeProjectGraphMetadata,
  pathMatchesPattern,
  validateProjectGraphMetadata,
} from '../graph/index.js'

describe('project graph metadata contract', () => {
  it('normalizes clusters, aliases, theme token colors, and stories', () => {
    let metadata = normalizeProjectGraphMetadata({
      clusters: [
        { label: 'Web UI', color: '#7cc7ff', paths: ['web/'] },
        { label: 'Themed', color: 'var(--sn-graph-cluster-4)', match: 'packages/' },
        { label: 'Missing Paths' },
        { label: 'Bad Color', color: 'url(javascript:alert(1))', node: 'src/' },
      ],
      stories: [
        {
          label: 'Runtime Flow',
          beats: [
            {
              label: 'Open Graph',
              narrative: 'The graph panel opens a focused file.',
              nodes: ['web/panels/dep-graph.js'],
              cluster: 'web-ui',
              path: 'web/panels/dep-graph.js',
            },
          ],
        },
      ],
    })

    assert.deepEqual(metadata.clusters.map((cluster) => cluster.id), ['web-ui', 'themed', 'bad-color'])
    assert.equal(metadata.clusters[0].color, '#7cc7ff')
    assert.equal(metadata.clusters[1].color, 'var(--sn-graph-cluster-4)')
    assert.equal(metadata.clusters[2].color, 'var(--sn-graph-cluster-3)')
    assert.equal(metadata.stories[0].id, 'runtime-flow')
    assert.equal(metadata.stories[0].beats[0].focusPath, 'web/panels/dep-graph.js')
  })

  it('validates metadata before persistence', () => {
    let metadata = validateProjectGraphMetadata({
      version: 1,
      clusters: [{ label: 'Web', path: 'web/' }],
      stories: [{ id: 'flow', beats: [{ id: 'entry', nodes: ['web/app.js'] }] }],
    })

    assert.equal(metadata.clusters[0].id, 'web')
    assert.throws(
      () => validateProjectGraphMetadata({ clusters: [{ label: 'Missing Paths' }] }),
      /clusters\[0\] must define at least one path/,
    )
    assert.throws(
      () => validateProjectGraphMetadata({ stories: [{ id: 'bad', beats: [{ nodes: [123] }] }] }),
      /beats\[0\]\.nodes/,
    )
  })

  it('matches paths and builds first-match semantic groups', () => {
    let metadata = normalizeProjectGraphMetadata({
      clusters: [
        { id: 'web', paths: ['web/'] },
        { id: 'server', patterns: ['src/node/**/*.js'] },
      ],
    })
    let fileMap = new Map([
      ['web/app.js', 'n1'],
      ['src/node/server/routes.js', 'n2'],
      ['README.md', 'n3'],
    ])

    assert.equal(pathMatchesPattern('src/node/server/routes.js', 'src/node/**/*.js'), true)
    assert.equal(findClusterForPath('web/app.js', metadata).id, 'web')
    assert.deepEqual(buildSemanticGroups(fileMap, metadata), {
      'cluster:web': ['n1'],
      'cluster:server': ['n2'],
    })
  })
})
