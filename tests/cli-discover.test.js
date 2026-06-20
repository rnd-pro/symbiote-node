/**
 * CLI discover contract tests for the symbiote-node facade.
 *
 * Run: node --test tests/cli-discover.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../../');

function runCli(args) {
  return execFileSync('node', ['packages/symbiote-node/cli.js', ...args], {
    cwd: ROOT,
    encoding: 'utf-8',
    maxBuffer: 16 * 1024 * 1024,
  });
}

describe('discover command', () => {
  it('delegates provider discovery to external symbiote-ui', () => {
    let data = JSON.parse(runCli(['discover']));

    assert.equal(data.command, 'discover');
    assert.equal(data.package.name, 'symbiote-ui');
    assert.equal(data.package.version, '0.3.0-alpha.46');

    let entrypoints = new Map(data.exports.entrypoints.map((entry) => [entry.specifier, entry]));
    for (let specifier of [
      'symbiote-ui/ui',
      'symbiote-ui/layout',
      'symbiote-ui/locale',
      'symbiote-ui/manifest',
      'symbiote-ui/custom-elements.json',
      'symbiote-ui/webmcp',
    ]) {
      assert.ok(entrypoints.has(specifier), `${specifier} must be described`);
      assert.equal(typeof entrypoints.get(specifier).description, 'string');
    }
    assert.equal(entrypoints.get('symbiote-ui/ui').kind, 'browser');
    assert.equal(entrypoints.get('symbiote-ui/layout').kind, 'ssr-entry-safe');
    assert.equal(entrypoints.get('symbiote-ui/locale').kind, 'node-safe');
    assert.equal(entrypoints.get('symbiote-ui/webmcp').kind, 'ssr-entry-safe');
  });
});
