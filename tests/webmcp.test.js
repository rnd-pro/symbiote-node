import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  createToolDescriptor,
  getModelContext,
  registerWebMcpTool,
} from '../packages/symbiote-ui/webmcp.js';
import { listComponents } from '../packages/symbiote-ui/manifest/component-registry.js';

afterEach(() => {
  delete globalThis.document;
  delete globalThis.navigator;
  delete globalThis.HTMLElement;
  delete globalThis.customElements;
});

describe('WebMCP helper contract', () => {
  it('creates plain descriptors without requiring DOM globals', () => {
    let descriptor = createToolDescriptor({
      name: 'chat_composer_submit',
      description: 'Submit chat input.',
      inputSchema: { type: 'object', properties: { value: { type: 'string' } } },
    });

    assert.equal(descriptor.name, 'chat_composer_submit');
    assert.equal(descriptor.inputSchema.type, 'object');
  });

  it('registers a plain descriptor against fake document.modelContext when native WebMCP cannot load', async () => {
    let registered = null;
    let disposed = false;
    let target = {
      modelContext: {
        registerTool(descriptor) {
          registered = descriptor;
          return { dispose() { disposed = true; } };
        },
      },
    };

    let result = await registerWebMcpTool({
      name: 'plain_tool',
      description: 'Plain descriptor fallback.',
      inputSchema: { type: 'object' },
    }, target);

    assert.equal(result.nativeActive, false);
    assert.equal(registered.name, 'plain_tool');
    result.unregister();
    assert.equal(disposed, true);
  });

  it('registers a native ToolDescriptor when DOM globals are available', async () => {
    globalThis.HTMLElement = class {};
    globalThis.customElements = { define() {}, get() { return null; } };

    let registered = null;
    globalThis.document = {
      modelContext: {
        registerTool(descriptor) {
          registered = descriptor;
          return () => {};
        },
      },
    };

    let result = await registerWebMcpTool({
      name: 'native_tool',
      description: 'Native descriptor.',
      inputSchema: { type: 'object' },
    });

    assert.equal(result.nativeActive, true);
    assert.equal(registered.constructor.name, 'ToolDescriptor');
    assert.equal(registered.name, 'native_tool');
  });

  it('discovers modelContext from document or navigator', () => {
    let documentContext = { registerTool() {} };
    assert.equal(getModelContext({ modelContext: documentContext }), documentContext);

    let navigatorContext = { registerTool() {} };
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { modelContext: navigatorContext },
    });
    assert.equal(getModelContext({}), navigatorContext);
  });

  it('publishes WebMCP metadata only for explicit public component tools', () => {
    let components = listComponents().filter((component) => component.contract?.webmcp);

    assert.ok(components.length >= 1);
    for (let component of components) {
      let webmcp = component.contract.webmcp;
      assert.equal(typeof webmcp.documentation, 'string');
      assert.ok(Array.isArray(webmcp.tools));
      assert.ok(webmcp.tools.length >= 1);
      for (let tool of webmcp.tools) {
        assert.equal(typeof tool.name, 'string');
        assert.equal(typeof tool.description, 'string');
        assert.equal(tool.inputSchema.type, 'object');
        assert.ok(Array.isArray(tool.exposedTo));
      }
    }
  });
});
