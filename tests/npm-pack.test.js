/**
 * npm pack and public documentation integrity tests for the workspace.
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
const PACKAGES = ['symbiote-ui', 'symbiote-engine', 'symbiote-node'];
const PRIVATE_PATTERNS = [
  '.agent-portal',
  '.gitmodules',
  'delegation/status.md',
  'team-memory',
  '/tmp/',
  'tmp/',
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function packageRoot(name) {
  return path.join(ROOT, 'packages', name);
}

function exportTarget(target) {
  if (typeof target === 'string') return target;
  return target?.import || target?.default || '';
}

function assertPackageFile(pkgRoot, rel, message = `${rel} must exist`) {
  assert.ok(fs.existsSync(path.join(pkgRoot, rel)), message);
}

function npmPackDryRun(workspace) {
  let raw = execFileSync('npm', ['pack', '--dry-run', '--json', '--workspace', workspace], {
    cwd: ROOT,
    encoding: 'utf-8',
  });
  let [pack] = JSON.parse(raw);
  return pack.files.map((file) => file.path);
}

describe('workspace public documentation', () => {
  it('has the open-source documentation structure for the split', () => {
    for (let rel of [
      'README.md',
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

  it('links the upstream WebMCP documentation', () => {
    let docs = fs.readFileSync(path.join(ROOT, 'docs/webmcp.md'), 'utf-8');
    assert.match(
      docs,
      /https:\/\/github\.com\/symbiotejs\/symbiote\.js\/blob\/webmcp\/docs\/webmcp\.md/,
      'docs/webmcp.md must link the upstream Symbiote WebMCP reference'
    );
  });

  it('documents the agentic runtime goal', () => {
    let docs = fs.readFileSync(path.join(ROOT, 'docs/agentic-runtime.md'), 'utf-8');
    assert.match(docs, /construct UI and runtime structure dynamically/);
    assert.match(docs, /without a server restart/);
  });
});

describe('package publish configuration', () => {
  for (let name of PACKAGES) {
    it(`${name} has package-local public docs and license`, () => {
      let pkgRoot = packageRoot(name);
      assertPackageFile(pkgRoot, 'README.md');
      assertPackageFile(pkgRoot, 'CHANGELOG.md');
      assertPackageFile(pkgRoot, 'LICENSE');
    });

    it(`${name} uses a whitelist files[] publish config`, () => {
      let pkg = readJson(path.join(packageRoot(name), 'package.json'));
      assert.ok(Array.isArray(pkg.files), `${name} files[] must be an array`);
      assert.ok(pkg.files.length > 0, `${name} files[] must not be empty`);
      assert.equal(pkg.types, undefined, `${name} must not publish TypeScript declarations`);
      assert.ok(!pkg.files.some((entry) => entry.endsWith('.d.ts')), `${name} files[] must not include .d.ts files`);
    });

    it(`${name} export targets resolve inside the package root`, () => {
      let pkgRoot = packageRoot(name);
      let pkg = readJson(path.join(pkgRoot, 'package.json'));
      for (let [key, target] of Object.entries(pkg.exports || {})) {
        let tgt = exportTarget(target);
        assert.ok(!tgt.includes('../') && !tgt.includes('..\\'), `${name} export ${key} must not traverse`);
        if (!tgt || tgt.endsWith('/*') || tgt === './package.json') continue;
        assert.ok(fs.existsSync(path.join(pkgRoot, tgt)), `${name} export ${key} -> ${tgt} must exist`);
      }
    });

    it(`${name} dry-run package does not include private coordination artifacts`, () => {
      let files = npmPackDryRun(name);
      assert.ok(files.length > 0, `${name} pack dry-run must include files`);
      for (let file of files) {
        for (let pattern of PRIVATE_PATTERNS) {
          assert.ok(!file.includes(pattern), `${name} pack output must not include ${pattern}: ${file}`);
        }
      }
    });
  }
});

describe('terminal migration package', () => {
  it('keeps symbiote-node as a facade over the split packages', () => {
    let pkg = readJson(path.join(packageRoot('symbiote-node'), 'package.json'));
    assert.equal(pkg.dependencies['symbiote-ui'], pkg.version);
    assert.equal(pkg.dependencies['symbiote-engine'], pkg.version);
    assert.equal(pkg.exports['./webmcp'].import, './webmcp.js');
    assert.equal(pkg.bin['symbiote-node'], 'cli.js');
  });
});
