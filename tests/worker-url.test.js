/**
 * ForceLayout worker URL test for symbiote-node.
 *
 * Verifies the worker URL resolution contract:
 * - defaultWorkerUrl() returns a valid URL pointing to ForceWorker.js
 * - Constructor accepts and stores a worker URL
 * - The URL is an absolute file:/// or http URL string
 *
 * Run: node --test tests/worker-url.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

import { ForceLayout } from '../packages/symbiote-ui/canvas/ForceLayout.js';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const WORKER_PATH = path.join(__dir, '..', 'packages', 'symbiote-ui', 'canvas', 'ForceWorker.js');

describe('ForceLayout worker URL contract', () => {
  it('defaultWorkerUrl() returns a string', () => {
    let url = ForceLayout.defaultWorkerUrl();
    assert.equal(typeof url, 'string', 'defaultWorkerUrl must return a string');
  });

  it('defaultWorkerUrl() returns a valid URL', () => {
    let url = ForceLayout.defaultWorkerUrl();
    assert.doesNotThrow(() => new URL(url), 'defaultWorkerUrl must return a parseable URL');
  });

  it('defaultWorkerUrl() points to ForceWorker.js', () => {
    let url = ForceLayout.defaultWorkerUrl();
    assert.ok(
      url.endsWith('ForceWorker.js') || url.includes('ForceWorker.js'),
      `defaultWorkerUrl must reference ForceWorker.js, got "${url}"`
    );
  });

  it('resolved defaultWorkerUrl is an absolute URL', () => {
    let url = ForceLayout.defaultWorkerUrl();
    let parsed = new URL(url);
    assert.ok(parsed.protocol, 'URL must have a protocol (file: or http:)');
  });

  it('constructor accepts a worker URL string', () => {
    let fl = new ForceLayout('./ForceWorker.js');
    assert.ok(fl, 'ForceLayout instance must be created');
    assert.equal(fl._workerUrl, './ForceWorker.js', 'workerUrl must be stored');
  });

  it('constructor with file:// URL does not throw', () => {
    let absUrl = `file://${WORKER_PATH}`;
    let fl = new ForceLayout(absUrl);
    assert.ok(fl, 'ForceLayout with file:// URL must be created');
    assert.equal(fl._workerUrl, absUrl);
  });

  it('ForceWorker.js source exists at resolved path', () => {
    assert.ok(
      fs.existsSync(WORKER_PATH),
      'ForceWorker.js must exist at the expected path'
    );
  });

  it('ForceWorker.js is not empty', () => {
    let src = fs.readFileSync(WORKER_PATH, 'utf-8');
    assert.ok(src.length > 100, 'ForceWorker.js must have meaningful content');
  });

  it('ForceLayout.onTick defaults to null', () => {
    let fl = new ForceLayout('./ForceWorker.js');
    assert.equal(fl.onTick, null, 'onTick must default to null');
  });

  it('ForceLayout.onDone defaults to null', () => {
    let fl = new ForceLayout('./ForceWorker.js');
    assert.equal(fl.onDone, null, 'onDone must default to null');
  });

  it('running getter returns false for fresh instance', () => {
    let fl = new ForceLayout('./ForceWorker.js');
    assert.equal(fl.running, false, 'running must be false before start()');
  });

  it('paused getter returns false for fresh instance', () => {
    let fl = new ForceLayout('./ForceWorker.js');
    assert.equal(fl.paused, false, 'paused must be false before start()');
  });

  it('streams tick metadata and preserves packed position precision', async () => {
    let originalWorker = globalThis.Worker;
    let originalRequestAnimationFrame = globalThis.requestAnimationFrame;
    let originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
    let instances = [];

    class FakeWorker {
      constructor(url) {
        this.url = url;
        this.messages = [];
        instances.push(this);
      }
      postMessage(message) {
        this.messages.push(message);
      }
      terminate() {
        this.terminated = true;
      }
    }

    globalThis.Worker = FakeWorker;
    globalThis.requestAnimationFrame = (callback) => {
      callback();
      return 1;
    };
    globalThis.cancelAnimationFrame = () => {};

    try {
      let force = new ForceLayout('./ForceWorker.js');
      let ticks = [];
      force.onTick = (positions, meta) => ticks.push({ positions, meta });
      force.start({ nodes: [{ id: 'a' }], edges: [] });

      instances[0].onmessage({ data: { type: 'nodeIds', ids: ['a'] } });
      instances[0].onmessage({
        data: {
          type: 'tick',
          packed: new Float32Array([1.25, 2.5]).buffer,
          alpha: 0.125,
          iteration: 7,
        },
      });

      assert.deepEqual(ticks, [{
        positions: { a: { x: 1.25, y: 2.5 } },
        meta: { alpha: 0.125, energy: undefined, iteration: 7 },
      }]);
    } finally {
      globalThis.Worker = originalWorker;
      globalThis.requestAnimationFrame = originalRequestAnimationFrame;
      globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
    }
  });

  it('posts updateConfig only while running', () => {
    let originalWorker = globalThis.Worker;
    let originalRequestAnimationFrame = globalThis.requestAnimationFrame;
    let originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
    let instances = [];

    class FakeWorker {
      constructor() {
        this.messages = [];
        instances.push(this);
      }
      postMessage(message) {
        this.messages.push(message);
      }
      terminate() {}
    }

    globalThis.Worker = FakeWorker;
    globalThis.requestAnimationFrame = () => 1;
    globalThis.cancelAnimationFrame = () => {};

    try {
      let force = new ForceLayout('./ForceWorker.js');
      force.updateConfig({ alphaTarget: 0.1 });
      assert.equal(instances.length, 0);

      force.start({ nodes: [], edges: [] });
      force.updateConfig({ alphaTarget: 0.2 });

      assert.deepEqual(instances[0].messages.at(-1), {
        type: 'updateConfig',
        config: { alphaTarget: 0.2 },
      });
    } finally {
      globalThis.Worker = originalWorker;
      globalThis.requestAnimationFrame = originalRequestAnimationFrame;
      globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
    }
  });
});
