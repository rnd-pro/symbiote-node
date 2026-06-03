import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let ROOT = path.resolve(fileURLToPath(import.meta.url), '..', '..');

let hadCustomElements;
let hadHTMLElement;
let hadWindow;
let hadDocument;
let hadCSSStyleSheet;
let CodeBlock;
let getSourceLanguage;
let isDirectoryLikePath;
let buildDirectoryInfo;

before(async () => {
  hadCustomElements = 'customElements' in globalThis;
  hadHTMLElement = 'HTMLElement' in globalThis;
  hadWindow = 'window' in globalThis;
  hadDocument = 'document' in globalThis;
  hadCSSStyleSheet = 'CSSStyleSheet' in globalThis;

  globalThis.HTMLElement = class {};
  globalThis.window = globalThis;
  globalThis.CSSStyleSheet = class {
    replaceSync(cssText) {
      this.cssText = cssText;
    }
  };
  globalThis.customElements = {
    define() {},
    get() {
      return null;
    },
  };
  globalThis.document = { createElement() { return { content: { cloneNode() {} } }; } };

  ({
    buildDirectoryInfo,
    getSourceLanguage,
    isDirectoryLikePath,
  } = await import('../packages/symbiote-ui/display/SourceViewer/SourceViewer.js'));
  ({ CodeBlock } = await import('../packages/symbiote-ui/display/CodeBlock/CodeBlock.js'));
});

after(() => {
  if (!hadCustomElements) delete globalThis.customElements;
  if (!hadHTMLElement) delete globalThis.HTMLElement;
  if (!hadWindow) delete globalThis.window;
  if (!hadDocument) delete globalThis.document;
  if (!hadCSSStyleSheet) delete globalThis.CSSStyleSheet;
});

describe('SourceViewer display helpers', () => {
  it('detects language from common source and asset paths', () => {
    assert.equal(getSourceLanguage('src/app.js'), 'js');
    assert.equal(getSourceLanguage('README.md'), 'md');
    assert.equal(getSourceLanguage('assets/logo.png'), 'image');
    assert.equal(getSourceLanguage('Dockerfile'), 'dockerfile');
  });

  it('detects directories from generic directory indexes', () => {
    let directoryIndex = {
      directories: ['src', 'src/components', 'docs/reference'],
    };

    assert.equal(isDirectoryLikePath('src', directoryIndex), true);
    assert.equal(isDirectoryLikePath('docs', directoryIndex), true);
    assert.equal(isDirectoryLikePath('README', directoryIndex), false);
    assert.equal(isDirectoryLikePath('src/app.js', directoryIndex), false);
  });

  it('formats normalized directory metadata without project-specific skeleton fields', () => {
    let info = buildDirectoryInfo('src', {
      subdirectories: ['components'],
      files: ['app.js', 'style.css'],
      fileTypes: { '.js': 3, '.css': 1 },
      totalFiles: 4,
      totalSubdirectories: 1,
      symbolCount: 2,
    });

    assert.match(info, /Directory: src/);
    assert.match(info, /Subdirectories \(1\):/);
    assert.match(info, /Files \(2\):/);
    assert.match(info, /\.js\s+3/);
    assert.match(info, /Total: 4 files across 1 subdirectories/);
    assert.match(info, /Symbols: 2 exported nodes in this directory/);
    assert.doesNotMatch(info, /skeleton/i);
  });

  it('keeps source display styles on provider theme tokens', () => {
    for (let relative of [
      'display/CodeBlock/CodeBlock.css.js',
      'display/SourceViewer/SourceViewer.css.js',
      'display/SourceEditor/SourceEditor.css.js',
    ]) {
      let source = fs.readFileSync(path.join(ROOT, 'packages/symbiote-ui', relative), 'utf8');
      for (let literal of [
        'hsl(30, 10%',
        'hsl(30, 15%',
        'hsl(35, 18%',
        'hsl(37, 30%',
        'hsl(210, 45%',
        'hsla(210',
        'rgb(254, 165, 176)',
        'rgb(251, 182, 79)',
        'rgb(180, 243, 255)',
        'hsla(0, 80%, 55%',
        'hsla(40, 80%, 55%',
      ]) {
        assert.equal(source.includes(literal), false, `${relative} must not copy provider fallback ${literal}`);
      }
    }

    let codeBlockCss = fs.readFileSync(path.join(ROOT, 'packages/symbiote-ui/display/CodeBlock/CodeBlock.css.js'), 'utf8');
    for (let token of ['--sn-syntax-keyword', '--sn-syntax-string', '--sn-syntax-comment', '--sn-diagnostic-error-bg']) {
      assert.ok(codeBlockCss.includes(token), `CodeBlock must consume ${token}`);
    }

    let sourceViewerCss = fs.readFileSync(path.join(ROOT, 'packages/symbiote-ui/display/SourceViewer/SourceViewer.css.js'), 'utf8');
    assert.ok(sourceViewerCss.includes('--sn-source-action-icon-size'));
  });

  it('exposes a public content setter for host display adapters', () => {
    let block = {
      $: { code: '', lang: '', imageApiBase: '' },
      setBasePath: CodeBlock.prototype.setBasePath,
      setImageApiBase: CodeBlock.prototype.setImageApiBase,
    };

    CodeBlock.prototype.setContent.call(block, '# Title', 'markdown', {
      basePath: 'docs/guide.md',
      imageApiBase: '/api/image?path=',
    });

    assert.equal(block.$.code, '# Title');
    assert.equal(block.$.lang, 'markdown');
    assert.equal(block._basePath, 'docs/guide.md');
    assert.equal(block.$.imageApiBase, '/api/image?path=');
  });
});
