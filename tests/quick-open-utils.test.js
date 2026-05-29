import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  collectQuickOpenFilesFromSkeleton,
  fuzzyScore,
  normalizeQuickOpenItems,
  searchQuickOpenItems,
} from '../navigation/quick-open-utils.js';

describe('quick-open utilities', () => {
  it('collects unique files from project-graph skeleton shapes', () => {
    let files = collectQuickOpenFilesFromSkeleton({
      X: { 'src/exported.js': ['foo'] },
      n: {
        a: { f: 'src/node.js' },
        b: { f: 'src/exported.js' },
      },
      f: {
        './': ['README.md'],
        'src/': ['plain.js'],
      },
      a: {
        'assets/': ['logo.svg'],
      },
    });

    assert.deepEqual(files, [
      'README.md',
      'assets/logo.svg',
      'src/exported.js',
      'src/node.js',
      'src/plain.js',
    ]);
  });

  it('normalizes strings and item objects to a common item contract', () => {
    assert.deepEqual(normalizeQuickOpenItems(['web/app.js', { id: 'settings', label: 'Settings' }]), [
      { id: 'web/app.js', label: 'app.js', path: 'web', value: 'web/app.js' },
      { id: 'settings', label: 'Settings', path: '', value: 'settings' },
    ]);
  });

  it('scores exact substring matches above fuzzy matches', () => {
    assert.ok(fuzzyScore('app', 'web/app.js') > fuzzyScore('apj', 'web/app.js'));
  });

  it('returns ranked limited results', () => {
    let results = searchQuickOpenItems(['web/app.js', 'web/components/AppShell.js', 'README.md'], 'app', 1);
    assert.equal(results.length, 1);
    assert.equal(results[0].item.value, 'web/app.js');
  });
});
