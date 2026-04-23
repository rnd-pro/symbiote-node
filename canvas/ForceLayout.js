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

  /** @type {boolean} */
  #paused = false;

  /** @type {object|null} */
  #latestPositions = null;

  /** @type {number|null} */
  #rafId = null;

  /** @type {string[]|null} Node ID order for unpacking Float32Array */
  #nodeIds = null;

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
   * @param {object} [data.options] - Override simulation parameters (mode: 'converge'|'continuous')
   */
  start(data) {
    this.stop();

    this.#worker = new Worker(this._workerUrl);
    this.#running = true;
    this.#paused = false;
    this.#nodeIds = null;

    this.#worker.onmessage = (e) => {
      const msg = e.data;

      // Continuous mode: receive node ID order once for Float32Array unpacking
      if (msg.type === 'nodeIds') {
        this.#nodeIds = msg.ids;
        return;
      }

      if (msg.type === 'tick') {
        // Unpack Float32Array if present (continuous mode)
        if (msg.packed && this.#nodeIds) {
          const buf = new Float32Array(msg.packed);
          const positions = {};
          for (let i = 0; i < this.#nodeIds.length; i++) {
            positions[this.#nodeIds[i]] = {
              x: Math.round(buf[i * 2]),
              y: Math.round(buf[i * 2 + 1]),
            };
          }
          this.#latestPositions = positions;
        } else {
          // Converge mode: positions as plain object
          this.#latestPositions = msg.positions;
        }
        this.#scheduleRender();
      }

      if (msg.type === 'done') {
        this.#latestPositions = msg.positions;
        this.#flushRender();
        this.#running = false;
        this.#paused = false;
        this.onDone?.(msg.positions, msg.iteration);
        this.#cleanup();
      }
    };

    this.#worker.onerror = (err) => {
      console.error('[ForceLayout] Worker error:', err);
      this.#running = false;
      this.#paused = false;
      this.#cleanup();
    };

    this.#worker.postMessage({ type: 'init', ...data });
  }

  /** Stop simulation and terminate Worker. */
  stop() {
    if (this.#worker) {
      this.#worker.postMessage({ type: 'stop' });
    }
    this.#cleanup();
  }

  /** Pause simulation (continuous mode). Worker stays alive. */
  pause() {
    if (!this.#worker || !this.#running || this.#paused) return;
    this.#paused = true;
    this.#worker.postMessage({ type: 'pause' });
  }

  /** Resume simulation (continuous mode). Gentle reheat. */
  resume() {
    if (!this.#worker || !this.#running || !this.#paused) return;
    this.#paused = false;
    this.#worker.postMessage({ type: 'resume' });
  }

  /**
   * Pin a node at a fixed position (for drag interactions).
   * In continuous mode, triggers local reheat.
   * @param {string} id
   * @param {number} x
   * @param {number} y
   */
  pin(id, x, y) {
    if (!this.#worker || !this.#running) return;
    this.#worker.postMessage({ type: 'pin', id, x, y });
  }

  /**
   * Release a pinned node.
   * @param {string} id
   */
  unpin(id) {
    if (!this.#worker || !this.#running) return;
    this.#worker.postMessage({ type: 'unpin', id });
  }

  /** @returns {boolean} */
  get running() { return this.#running; }

  /** @returns {boolean} */
  get paused() { return this.#paused; }

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
    this.#paused = false;
    this.#nodeIds = null;
  }
}
