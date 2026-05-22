import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getThemeCssTokens } from '../manifest/theme-catalog.js';
import { DEFAULT_DARK } from '../themes/default-dark.js';

let PKG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let COMPONENT_DIRS = [
  'canvas',
  'chat',
  'control',
  'display',
  'effects',
  'inspector',
  'layout',
  'list',
  'menu',
  'navigation',
  'node',
  'palette',
  'surface',
  'toolbar',
  'tree',
];

let LOCAL_OR_NATIVE_TOKEN_ALLOWLIST = new Map();

function listCssFiles(dir) {
  let files = [];
  for (let entry of fs.readdirSync(dir, { withFileTypes: true })) {
    let fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listCssFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.css.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

function collectComponentCssFiles() {
  return COMPONENT_DIRS.flatMap((dir) => listCssFiles(path.join(PKG_ROOT, dir))).sort();
}

function collectTokenReferences(files) {
  let references = new Map();

  for (let file of files) {
    let source = fs.readFileSync(file, 'utf-8');
    let relativeFile = path.relative(PKG_ROOT, file);
    let localDeclarations = new Set(
      [...source.matchAll(/(^|[^\w-])(--sn-[A-Za-z0-9_-]+)\s*:/g)].map((match) => match[2])
    );

    for (let match of source.matchAll(/var\(\s*(--sn-[A-Za-z0-9_-]+)\s*([,)])/g)) {
      let token = match[1];
      let tokenReferences = references.get(token) || [];
      tokenReferences.push({
        file: relativeFile,
        hasFallback: match[2] === ',',
        isLocalDeclaration: localDeclarations.has(token),
      });
      references.set(token, tokenReferences);
    }
  }

  return references;
}

function formatTokenReferences(entries) {
  if (entries.length === 0) return 'none';
  return entries
    .map(([token, references]) => {
      let locations = [...new Set(references.map((reference) => reference.file))].sort();
      return `${token}: ${locations.join(', ')}`;
    })
    .join('\n');
}

function isCoveredByRuntimeTheme(token, references, runtimeTokens) {
  if (runtimeTokens.has(token)) return true;
  if (LOCAL_OR_NATIVE_TOKEN_ALLOWLIST.has(token)) return true;
  return references.every((reference) => reference.isLocalDeclaration || reference.hasFallback);
}

describe('component token coverage', () => {
  it('keeps DEFAULT_DARK runtime tokens aligned with the theme catalog', () => {
    assert.deepEqual(getThemeCssTokens('default-dark'), DEFAULT_DARK.tokens);
  });

  it('covers public component CSS token references with DEFAULT_DARK', () => {
    let references = collectTokenReferences(collectComponentCssFiles());
    let runtimeTokens = new Set(Object.keys(DEFAULT_DARK.tokens));
    let uncovered = [...references.entries()]
      .filter(([token, tokenReferences]) => !isCoveredByRuntimeTheme(token, tokenReferences, runtimeTokens))
      .sort(([left], [right]) => left.localeCompare(right));

    assert.deepEqual(
      uncovered.map(([token]) => token),
      [],
      `Public component token references missing from DEFAULT_DARK:\n${formatTokenReferences(uncovered)}`
    );
  });

  it('documents each local/private token coverage exception', () => {
    let references = collectTokenReferences(collectComponentCssFiles());
    let unusedAllowlistTokens = [...LOCAL_OR_NATIVE_TOKEN_ALLOWLIST.keys()]
      .filter((token) => !references.has(token))
      .sort();
    let undocumentedAllowlistTokens = [...LOCAL_OR_NATIVE_TOKEN_ALLOWLIST.entries()]
      .filter(([, reason]) => typeof reason !== 'string' || reason.length < 20)
      .map(([token]) => token)
      .sort();

    assert.deepEqual(unusedAllowlistTokens, [], 'Remove unused component token coverage allowlist entries.');
    assert.deepEqual(undocumentedAllowlistTokens, [], 'Document why each allowlisted token is not a public theme token.');
  });
});
