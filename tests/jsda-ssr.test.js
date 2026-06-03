import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { wcSsr } from 'jsda-kit/node';

import projectCfg from './fixtures/jsda-ssr/project.cfg.js';
import { getComponent, listComponents } from '../packages/symbiote-ui/manifest/component-registry.js';

describe('JSDA SSR integration contract', () => {
  it('keeps project.cfg.js configured for explicit SSR imports', () => {
    assert.equal(projectCfg.ssr.enabled, true);
    assert.deepEqual(projectCfg.ssr.imports, ['./tests/fixtures/jsda-ssr/agent-panel.js']);
  });

  it('renders a Symbiote isoMode component through jsda-kit wcSsr', async () => {
    let html = '<main><agent-panel></agent-panel></main>';
    let result = await wcSsr(html, {
      imports: projectCfg.ssr.imports,
    });

    assert.match(result, /<agent-panel/);
    assert.match(result, /Agent Panel/);
    assert.match(result, /Status: ready/);
    assert.match(result, /<style/);

    let { document } = parseHTML(result);
    assert.equal(document.querySelector('agent-panel h2')?.textContent, 'Agent Panel');
  });

  it('publishes jsda-ssr-renderable component classifications in descriptor v2', () => {
    let renderable = listComponents().filter((component) => {
      return component.contract?.ssr?.mode === 'jsda-ssr-renderable';
    });

    assert.ok(renderable.length > 0, 'at least one public component must be classified as jsda-ssr-renderable');
    for (let component of renderable) {
      assert.equal(getComponent(component.tagName).contract.schemaVersion, 'component-descriptor-v2');
    }
  });
});
