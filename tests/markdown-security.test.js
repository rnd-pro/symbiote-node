import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { formatMarkdown } from '../display/markdown-formatter.js';

describe('markdown rendering security boundary', () => {
  it('escapes image attributes and rejects scriptable image URLs', () => {
    let html = formatMarkdown('![x" onerror="alert(1)](javascript:alert)');

    assert.equal(html, '<p class="md-p"></p>');
    assert.doesNotMatch(html, /onerror/i);
    assert.doesNotMatch(html, /javascript:/i);
  });

  it('escapes link attributes and strips unsafe protocols', () => {
    let html = formatMarkdown('[click "x"](javascript:alert)');

    assert.equal(html, '<p class="md-p">click "x"</p>');
    assert.doesNotMatch(html, /href=/i);
    assert.doesNotMatch(html, /javascript:/i);
  });

  it('keeps safe links with noopener metadata', () => {
    let html = formatMarkdown('[docs](https://example.com/?q="x")');

    assert.match(html, /href="https:\/\/example\.com\/\?q=&quot;x&quot;"/);
    assert.match(html, /rel="noopener noreferrer"/);
  });

  it('does not hardcode product image endpoints for relative markdown images', () => {
    let html = formatMarkdown('![logo](assets/logo.png)', { basePath: 'docs/readme.md' });

    assert.match(html, /src="docs\/assets\/logo\.png"/);
    assert.doesNotMatch(html, /\/api\/image/);
  });

  it('allows host applications to provide markdown image resolution', () => {
    let html = formatMarkdown('![logo](assets/logo.png)', {
      basePath: 'docs/readme.md',
      resolveImageSrc(src, { basePath }) {
        return `/image?base=${encodeURIComponent(basePath)}&src=${encodeURIComponent(src)}`;
      },
    });

    assert.match(html, /src="\/image\?base=docs%2Freadme\.md&amp;src=assets%2Flogo\.png"/);
  });

  it('allows only the safe details open attribute for raw markdown HTML', () => {
    let html = formatMarkdown('<details open><summary>Ok</summary></details>');

    assert.match(html, /<details open>/);
    assert.match(html, /<summary>Ok<\/summary>/);
  });

  it('does not unescape event attributes on allowed markdown tags', () => {
    let html = formatMarkdown('<details onclick="alert(1)"><summary>Bad</summary></details>');

    assert.match(html, /&lt;details onclick="alert\(1\)"&gt;/);
    assert.doesNotMatch(html, /<details onclick=/i);
  });
});
