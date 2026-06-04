import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../../');
const PACKAGES = ['symbiote-engine', 'symbiote-ui', 'symbiote-node'];

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: options.cwd || ROOT,
    encoding: 'utf-8',
    stdio: options.stdio || ['ignore', 'pipe', 'pipe'],
  });
}

function npmPack(workspace, destination) {
  let raw = run('npm', ['pack', '--json', '--workspace', workspace, '--pack-destination', destination]);
  let [pack] = JSON.parse(raw);
  return path.join(destination, pack.filename);
}

function collectPackageVersions(node, packageName, versions) {
  for (let [name, dep] of Object.entries(node.dependencies || {})) {
    if (name === packageName && dep.version) {
      versions.add(dep.version);
    }
    collectPackageVersions(dep, packageName, versions);
  }
}

describe('packed consumer install', () => {
  it('installs all split packages into an isolated consumer with one Symbiote version', () => {
    let tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'symbiote-packed-consumer-'));
    let packDir = path.join(tmp, 'packs');
    let consumerDir = path.join(tmp, 'consumer');
    fs.mkdirSync(packDir);
    fs.mkdirSync(consumerDir);
    fs.writeFileSync(path.join(consumerDir, 'package.json'), JSON.stringify({
      name: 'symbiote-packed-consumer',
      private: true,
      type: 'module',
      dependencies: {
        '@symbiotejs/symbiote': '3.8.0-webmcp.2',
      },
      overrides: {
        '@symbiotejs/symbiote': '3.8.0-webmcp.2',
      },
    }, null, 2));

    let tarballs = PACKAGES.map((name) => npmPack(name, packDir));
    run('npm', [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--save-exact',
      ...tarballs,
      'linkedom',
      'ws',
    ], { cwd: consumerDir });

    let output = run('node', ['--input-type=module', '-e', `
      await import('symbiote-engine');
      await import('symbiote-ui');
      await import('symbiote-ui/ui');
      await import('symbiote-ui/manifest');
      await import('symbiote-ui/webmcp');
      await import('symbiote-node');
      await import('symbiote-node/engine');
      const uiPkg = await import('symbiote-ui/package.json', { with: { type: 'json' } });
      const enginePkg = await import('symbiote-engine/package.json', { with: { type: 'json' } });
      const nodePkg = await import('symbiote-node/package.json', { with: { type: 'json' } });
      console.log([uiPkg.default.version, enginePkg.default.version, nodePkg.default.version].join(':'));
    `], { cwd: consumerDir });

    assert.equal(output.trim(), '0.3.0-alpha.11:0.3.0-alpha.6:0.3.0-alpha.7');

    let tree = run('npm', ['ls', '@symbiotejs/symbiote', '--json'], { cwd: consumerDir });
    let parsed = JSON.parse(tree);
    let versions = new Set();
    function collect(node) {
      for (let [name, dep] of Object.entries(node.dependencies || {})) {
        if (name === '@symbiotejs/symbiote' && dep.version) {
          versions.add(dep.version);
        }
        collect(dep);
      }
    }
    collect(parsed);

    assert.deepEqual([...versions], ['3.8.0-webmcp.2']);

    let uiTree = JSON.parse(run('npm', ['ls', 'symbiote-ui', '--json'], { cwd: consumerDir }));
    let uiVersions = new Set();
    collectPackageVersions(uiTree, 'symbiote-ui', uiVersions);
    assert.deepEqual([...uiVersions], ['0.3.0-alpha.11']);
  });
});
