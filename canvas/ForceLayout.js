/**
 * ForceLayout — Main-thread wrapper for the ForceWorker.
 *
 * Manages Web Worker lifecycle and streams position updates
 * to the canvas via requestAnimationFrame batching.
 *
 * Usage:
 *   const force = new ForceLayout(canvas);
 *   force.start({ nodes, edges, groups, options });
 *   force.onTick = (positions) => { ... };
 *   force.stop();
 *
 * @module symbiote-node/canvas/ForceLayout
 */

export class ForceLayout {
  /** @type {Worker|null} */
  #worker = null;

  /** @type {boolean} */
  #running = false;

  /** @type {object|null} */
  #latestPositions = null;

  /** @type {number|null} */
  #rafId = null;

  /** @type {Function|null} */
  onTick = null;

  /** @type {Function|null} */
  onDone = null;

  /**
   * @param {string} workerUrl - URL to ForceWorker.js
   */
  constructor(workerUrl) {
    this._workerUrl = workerUrl;
  }

  /**
   * Start force simulation.
   * @param {object} data
   * @param {Array<{id: string, x?: number, y?: number, mass?: number, group?: string}>} data.nodes
   * @param {Array<{from: string, to: string, strength?: number}>} data.edges
   * @param {Object<string, string[]>} [data.groups] - { groupId: [nodeId, ...] }
   * @param {object} [data.options] - Override simulation parameters
   */
  start(data) {
    this.stop();

    this.#worker = new Worker(this._workerUrl);
    this.#running = true;

    this.#worker.onmessage = (e) => {
      const msg = e.data;

      if (msg.type === 'tick') {
        // Buffer latest positions for rAF batching
        this.#latestPositions = msg.positions;
        this.#scheduleRender();
      }

      if (msg.type === 'done') {
        this.#latestPositions = msg.positions;
        this.#flushRender();
        this.#running = false;
        this.onDone?.(msg.positions, msg.iteration);
        this.#cleanup();
      }
    };

    this.#worker.onerror = (err) => {
      console.error('[ForceLayout] Worker error:', err);
      this.#running = false;
      this.#cleanup();
    };

    this.#worker.postMessage({ type: 'init', ...data });
  }

  /** Stop simulation early. */
  stop() {
    if (this.#worker) {
      this.#worker.postMessage({ type: 'stop' });
    }
    this.#cleanup();
  }

  /** @returns {boolean} */
  get running() { return this.#running; }

  #scheduleRender() {
    if (this.#rafId !== null) return;
    this.#rafId = requestAnimationFrame(() => {
      this.#rafId = null;
      this.#flushRender();
    });
  }

  #flushRender() {
    if (this.#latestPositions) {
      this.onTick?.(this.#latestPositions);
      this.#latestPositions = null;
    }
  }

  #cleanup() {
    if (this.#rafId !== null) {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = null;
    }
    if (this.#worker) {
      this.#worker.terminate();
      this.#worker = null;
    }
    this.#running = false;
  }
}
