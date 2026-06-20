/**
 * npm pack and public documentation integrity tests for symbiote-node.
 *
 * Run: node --test tests/npm-pack.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../../');
const PACKAGE_NAME = 'symbiote-node';
const UI_VERSION = '0.3.0-alpha.45';
const ENGINE_VERSION = '0.3.0-alpha.11';
const PRIVATE_PATTERNS = [
  '.agent-portal',
  '.gitmodules',
  'delegation/status.md',
  'team-memory',
  '/tmp/',
  'tmp/',
  'symbiote-ui/',
  'symbiote-engine/',
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function packageRoot() {
  return path.join(ROOT, 'packages', PACKAGE_NAME);
}

function exportTarget(target) {
  if (typeof target === 'string') return target;
  return target?.import || target?.default || '';
}

function assertPackageFile(rel, message = `${rel} must exist`) {
  assert.ok(fs.existsSync(path.join(packageRoot(), rel)), message);
}

function npmPackDryRun() {
  let raw = execFileSync('npm', ['pack', '--dry-run', '--json', '--workspace', PACKAGE_NAME], {
    cwd: ROOT,
    encoding: 'utf-8',
  });
  let [pack] = JSON.parse(raw);
  return pack.files.map((file) => file.path);
}

describe('repository public documentation', () => {
  it('has the open-source documentation structure for the facade', () => {
    for (let rel of [
      'README.md',
      'llms.txt',
      'CHANGELOG.md',
      'CONTRIBUTING.md',
      'SECURITY.md',
      'docs/package-split.md',
      'docs/agentic-runtime.md',
      'docs/webmcp.md',
      'docs/documentation-audit.md',
      'docs/release-checklist.md',
    ]) {
      assert.ok(fs.existsSync(path.join(ROOT, rel)), `${rel} must exist`);
    }
  });

  it('links external UI and engine sources instead of internal folders', () => {
    let docs = [
      fs.readFileSync(path.join(ROOT, 'README.md'), 'utf-8'),
      fs.readFileSync(path.join(ROOT, 'docs/package-split.md'), 'utf-8'),
      fs.readFileSync(path.join(ROOT, 'CONTRIBUTING.md'), 'utf-8'),
    ].join('\n');

    assert.match(docs, /https:\/\/github\.com\/RND-PRO\/symbiote-ui/);
    assert.match(docs, /https:\/\/github\.com\/RND-PRO\/symbiote-engine/);
    assert.doesNotMatch(docs, /\]\(packages\/symbiote-ui\)/);
    assert.doesNotMatch(docs, /\]\(packages\/symbiote-engine\)/);
    assert.doesNotMatch(docs, /`packages\/symbiote-ui`/);
    assert.doesNotMatch(docs, /`packages\/symbiote-engine`/);
  });

  it('links the upstream WebMCP documentation', () => {
    let docs = fs.readFileSync(path.join(ROOT, 'docs/webmcp.md'), 'utf-8');
    assert.match(
      docs,
      /https:\/\/github\.com\/symbiotejs\/symbiote\.js\/blob\/webmcp\/docs\/webmcp\.md/,
      'docs/webmcp.md must link the upstream Symbiote WebMCP reference'
    );
  });
});

describe('workspace package contract', () => {
  it('limits workspaces to symbiote-node', () => {
    let pkg = readJson(path.join(ROOT, 'package.json'));
    assert.deepEqual(pkg.workspaces, ['packages/symbiote-node']);
    assert.match(pkg.description, /symbiote-node terminal migration package/);
  });

  it('keeps symbiote-node as a facade over external packages', () => {
    let pkg = readJson(path.join(packageRoot(), 'package.json'));
    assert.equal(pkg.version, '0.3.0-alpha.7');
    assert.equal(pkg.dependencies['symbiote-ui'], UI_VERSION);
    assert.equal(pkg.dependencies['symbiote-engine'], ENGINE_VERSION);
    assert.equal(pkg.exports['./webmcp'].import, './webmcp.js');
    assert.equal(pkg.exports['./themes/cascade-theme.js'], './themes/cascade-theme.js');
    assert.equal(pkg.exports['./themes/scrollbar-styles.js'], './themes/scrollbar-styles.js');
    assert.equal(pkg.bin['symbiote-node'], 'cli.js');
  });

  it('has package-local public docs and license', () => {
    assertPackageFile('README.md');
    assertPackageFile('llms.txt');
    assertPackageFile('CHANGELOG.md');
    assertPackageFile('LICENSE');
  });

  it('uses a whitelist files[] publish config', () => {
    let pkg = readJson(path.join(packageRoot(), 'package.json'));
    assert.ok(Array.isArray(pkg.files), 'files[] must be an array');
    assert.ok(pkg.files.length > 0, 'files[] must not be empty');
    assert.equal(pkg.types, undefined, 'must not publish TypeScript declarations');
    assert.ok(!pkg.files.some((entry) => entry.endsWith('.d.ts')), 'files[] must not include .d.ts files');
  });

  it('export targets resolve inside the package root', () => {
    let pkgRoot = packageRoot();
    let pkg = readJson(path.join(pkgRoot, 'package.json'));
    for (let [key, target] of Object.entries(pkg.exports || {})) {
      let tgt = exportTarget(target);
      assert.ok(!tgt.includes('../') && !tgt.includes('..\\'), `export ${key} must not traverse`);
      if (!tgt || tgt.endsWith('/*') || tgt === './package.json') continue;
      assert.ok(fs.existsSync(path.join(pkgRoot, tgt)), `export ${key} -> ${tgt} must exist`);
    }
  });

  it('dry-run package does not include private or external source artifacts', () => {
    let files = npmPackDryRun();
    assert.ok(files.length > 0, 'pack dry-run must include files');
    assert.ok(files.includes('llms.txt'), 'pack output must include llms.txt');
    for (let file of files) {
      for (let pattern of PRIVATE_PATTERNS) {
        assert.ok(!file.includes(pattern), `pack output must not include ${pattern}: ${file}`);
      }
    }
  });
});
