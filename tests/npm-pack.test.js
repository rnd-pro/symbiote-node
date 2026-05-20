/**
 * npm pack integrity test for symbiote-node.
 *
 * Validates that the package publish configuration correctly
 * excludes delivery-inappropriate paths (demo, tests, tmp):
 * - "files" field (whitelist) does not include non-publish dirs
 * - .npmignore excludes any remaining unwanted paths
 * - Export map references only included paths
 *
 * Also guards against symlink-escape patterns via "files"
 * or "exports" that could reach outside the package root.
 *
 * Run: node --test tests/npm-pack.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../');
const NPMIGNORE_PATH = path.join(PKG_ROOT, '.npmignore');
const PKG_JSON_PATH = path.join(PKG_ROOT, 'package.json');

function parseNpmignore() {
  let raw = fs.readFileSync(NPMIGNORE_PATH, 'utf-8');
  return raw.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
}

function pathExists(rel) {
  return fs.existsSync(path.join(PKG_ROOT, rel));
}

let pkgJson = JSON.parse(fs.readFileSync(PKG_JSON_PATH, 'utf-8'));
let npmignoreLines = parseNpmignore();

function exportTarget(target) {
  if (typeof target === 'string') return target;
  return target.import || target.default || '';
}

describe('Package configuration', () => {
  it('package.json has a "files" field (whitelist publish)', () => {
    assert.ok(Array.isArray(pkgJson.files), '"files" must be an array');
    assert.ok(pkgJson.files.length > 0, '"files" must not be empty');
  });

  it('package.json does not publish TypeScript declarations', () => {
    assert.equal(pkgJson.types, undefined, '"types" must not be set for this JS/JSDoc package');
    assert.ok(!pkgJson.files.some((entry) => entry.endsWith('.d.ts')), 'files[] must not include .d.ts files');
  });

  it('bin entry points at an executable Node CLI', () => {
    assert.deepEqual(pkgJson.bin, { 'symbiote-node': './engine/cli.js' });
    let binPath = path.join(PKG_ROOT, pkgJson.bin['symbiote-node']);
    assert.ok(fs.existsSync(binPath), 'bin target must exist');
    let firstLine = fs.readFileSync(binPath, 'utf-8').split('\n')[0];
    assert.equal(firstLine, '#!/usr/bin/env node', 'bin target must start with a Node shebang');
    let mode = fs.statSync(binPath).mode;
    assert.ok(mode & 0o111, 'bin target must have an executable bit');
  });

  it('.npmignore exists and is non-empty', () => {
    assert.ok(fs.existsSync(NPMIGNORE_PATH), '.npmignore must exist');
    assert.ok(npmignoreLines.length > 0, '.npmignore must not be empty');
  });
});

describe('Non-publishable paths are excluded', () => {
  let nonPublishable = ['demo', 'tests', 'tmp'];

  for (let dir of nonPublishable) {
    it(`files[] does not include "${dir}"`, () => {
      let found = pkgJson.files.some((f) => {
        let norm = f.replace(/\/$/, '');
        return norm === dir || norm.startsWith(dir + '/');
      });
      assert.ok(!found, `files[] must not include "${dir}"`);
    });
  }

  let dotExcludes = ['.agent/', '.agents/', '.gemini/', '.github/'];
  for (let d of dotExcludes) {
    let norm = d.replace(/\/$/, '');
    it(`.npmignore excludes "${norm}${norm.endsWith('/') ? '' : '/'}"`, () => {
      let found = npmignoreLines.some((l) => l.replace(/\/$/, '') === norm);
      assert.ok(found, `.npmignore must exclude "${d}"`);
    });
  }

  it('.npmignore excludes demo/', () => {
    assert.ok(npmignoreLines.includes('demo/'), '.npmignore must exclude demo/');
  });

  it('.npmignore excludes tests/', () => {
    assert.ok(npmignoreLines.includes('tests/'), '.npmignore must exclude tests/');
  });

  it('.npmignore excludes node_modules/', () => {
    assert.ok(npmignoreLines.includes('node_modules/'), '.npmignore must exclude node_modules/');
  });

  it('.npmignore excludes engine/extensions/', () => {
    assert.ok(npmignoreLines.includes('engine/extensions/'), '.npmignore must exclude engine/extensions/');
  });

  it('.npmignore excludes tmp directory', () => {
    let hasTmp = npmignoreLines.some((l) => l.replace(/\/$/, '') === 'tmp' || l.replace(/\/$/, '') === 'TMP');
    assert.ok(hasTmp, '.npmignore must exclude tmp/TMP/');
  });
});

describe('Excluded directories exist in source tree', () => {
  let excludedDirs = ['demo', 'tests', 'engine/extensions'];

  for (let dir of excludedDirs) {
    it(`source directory "${dir}" exists (exclusion is intentional)`, () => {
      assert.ok(pathExists(dir), `"${dir}/" must exist in source; otherwise exclusion is stale`);
    });
  }
});

describe('Published exports do not conflict with publish config', () => {
  it('main entry (index.js) is in files[]', () => {
    let main = (pkgJson.main || '').replace(/^\.\//, '');
    let inFiles = pkgJson.files.includes(main) || pkgJson.files.some((f) => {
      return main.startsWith(f.replace(/\/$/, '') + '/') || f.replace(/\/$/, '') === main.split('/')[0];
    });
    assert.ok(inFiles, 'main entry should be covered by files[]');
  });

  it('all export subpaths resolve into files[] whitelist', () => {
    let exports = pkgJson.exports || {};

    for (let [key, target] of Object.entries(exports)) {
      let tgt = exportTarget(target).replace(/^\.\//, '');
      if (tgt === 'package.json') continue;
      if (tgt.endsWith('/*')) continue;

      let topDir = tgt.split('/')[0] || '';
      let inFiles = pkgJson.files.some((f) => {
        let norm = f.replace(/\/$/, '');
        return norm === topDir || topDir.startsWith(norm + '/') || norm.startsWith(topDir);
      });
      assert.ok(inFiles, `Export "${key}" → "${tgt}" top-dir "${topDir}/" must be in files[]`);
    }
  });

  it('exports do not define TypeScript declaration targets', () => {
    let exports = pkgJson.exports || {};
    for (let [key, target] of Object.entries(exports)) {
      assert.ok(!target || typeof target !== 'object' || !target.types, `Export "${key}" must not declare a types target`);
    }
  });

  it('no export subpath is matched by .npmignore', () => {
    let exports = pkgJson.exports || {};
    for (let [key, target] of Object.entries(exports)) {
      let tgt = exportTarget(target).replace(/^\.\//, '');
      if (tgt.endsWith('/*')) continue;

      let parts = tgt.split('/');
      for (let line of npmignoreLines) {
        let glob = line.replace(/\/$/, '');
        if (parts[0] === glob) {
          assert.fail(`Export "${key}" → "${tgt}" top-dir "${parts[0]}/" is in .npmignore`);
        }
      }
    }
  });
});

describe('Symlink escape guard', () => {
  it('exports map has no "../" traversal outside package root', () => {
    let exports = pkgJson.exports || {};
    for (let [key, target] of Object.entries(exports)) {
      let tgt = exportTarget(target);
      assert.ok(
        !tgt.includes('../') && !tgt.includes('..\\'),
        `Export "${key}" → "${tgt}" must not traverse outside package root`
      );
    }
  });

  it('files[] has no "../" traversal', () => {
    for (let f of pkgJson.files) {
      assert.ok(
        !f.includes('../') && !f.includes('..\\'),
        `files[] entry "${f}" must not traverse outside package root`
      );
    }
  });

  it('main entry has no "../" traversal', () => {
    let main = pkgJson.main || '';
    assert.ok(!main.includes('../'), `main "${main}" must not traverse outside package root`);
  });

  it('engine subpath resolves within package boundary', () => {
    let enginePath = pkgJson.exports?.['./engine'];
    let resolved = exportTarget(enginePath).replace(/^\.\//, '') || '';
    assert.ok(resolved, 'engine subpath must exist');
    assert.ok(
      fs.existsSync(path.join(PKG_ROOT, resolved)),
      `engine subpath "${resolved}" must resolve to a file`
    );
  });

  it('engine wildcard is not public', () => {
    assert.equal(pkgJson.exports?.['./engine/*'], undefined, './engine/* must not expose internal files');
  });

  it('browser implementation directories are not public wildcard exports', () => {
    let privateBrowserWildcards = [
      './ui/*',
      './canvas/*',
      './layout/*',
      './interactions/*',
      './node/*',
      './toolbar/*',
      './inspector/*',
      './palette/*',
      './menu/*',
      './navigation/*',
      './chat/*',
      './effects/*',
      './display/*',
    ];

    for (let key of privateBrowserWildcards) {
      assert.equal(
        pkgJson.exports?.[key],
        undefined,
        `${key} must stay private; use the SSR-safe "./ui" entrypoint`
      );
    }
  });
});

describe('Tmp directory isolation', () => {
  it('tmp/ is not referenced in any export map', () => {
    let exports = pkgJson.exports || {};
    for (let [key, target] of Object.entries(exports)) {
      let tgt = exportTarget(target);
      assert.ok(!tgt.includes('tmp/'), `Export "${key}" must not reference tmp/`);
    }
  });

  it('tmp/ is not in files[]', () => {
    let hasTmp = pkgJson.files.some((f) => f.replace(/\/$/, '') === 'tmp');
    assert.ok(!hasTmp, 'files[] must not include tmp/');
  });

  it('tmp/ is excluded by .npmignore', () => {
    let hasTmp = npmignoreLines.some((l) => l.replace(/\/$/, '') === 'tmp' || l.replace(/\/$/, '') === 'TMP');
    assert.ok(hasTmp, '.npmignore must exclude tmp/');
  });
});

describe('Packed package consumer boundary', () => {
  it('packed artifact supports public imports and rejects private implementation imports', () => {
    let tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-pack-consumer-'));

    try {
      let packOutput = execFileSync(
        'npm',
        ['pack', '--json', '--pack-destination', tempRoot],
        { cwd: PKG_ROOT, encoding: 'utf8' },
      );
      let [packInfo] = JSON.parse(packOutput);
      let tarball = path.join(tempRoot, packInfo.filename);

      execFileSync('tar', ['-xzf', tarball, '-C', tempRoot]);

      let nodeModules = path.join(tempRoot, 'node_modules');
      fs.mkdirSync(nodeModules, { recursive: true });
      fs.renameSync(path.join(tempRoot, 'package'), path.join(nodeModules, 'symbiote-node'));

      let symbioteScope = path.join(nodeModules, '@symbiotejs');
      fs.mkdirSync(symbioteScope, { recursive: true });
      fs.symlinkSync(
        path.resolve(PKG_ROOT, '../../node_modules/@symbiotejs/symbiote'),
        path.join(symbioteScope, 'symbiote'),
        'dir',
      );

      let script = path.join(tempRoot, 'consumer.mjs');
      fs.writeFileSync(script, `
        import assert from 'node:assert/strict';

        let root = await import('symbiote-node');
        let layout = await import('symbiote-node/layout');
        let manifest = await import('symbiote-node/manifest');
        let formatter = await import('symbiote-node/display/markdown-formatter');

        assert.equal(typeof root.NodeEditor, 'function');
        assert.equal(typeof layout.setupPanelRouting, 'function');
        assert.equal(typeof manifest.listComponents, 'function');
        assert.equal(typeof formatter.formatMarkdown, 'function');

        await assert.rejects(
          import('symbiote-node/display/SourceEditor/SourceEditor.js'),
          (error) => error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED'
        );
      `);

      execFileSync(process.execPath, [script], { cwd: tempRoot, stdio: 'pipe' });
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
