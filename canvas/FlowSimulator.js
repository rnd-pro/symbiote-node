/**
 * FlowSimulator — sequential data flow animation
 *
 * Performs topological traversal of the node graph and animates
 * nodes and connections step-by-step (like n8n execution).
 *
 * @module symbiote-node/canvas/FlowSimulator
 */

/**
 * @typedef {Object} FlowSimulatorConfig
 * @property {import('../core/Editor.js').NodeEditor} editor
 * @property {Object} canvas - NodeCanvas instance (for setFlowing, node views)
 */

export class FlowSimulator {

  /** @type {import('../core/Editor.js').NodeEditor} */
  #editor;

  /** @type {Object} */
  #canvas;

  /** @type {boolean} */
  #running = false;

  /** @type {AbortController|null} */
  #abort = null;

  /** @type {number} ms per node step */
  speed = 800;

  /** @type {boolean} follow active node with camera */
  followActive = false;

  /** @type {boolean} temporarily paused by manual interaction */
  #followPaused = false;

  /** @type {number|null} */
  #followResumeTimer = null;

  /** @type {number} ms before follow resumes after manual interaction */
  followResumDelay = 3000;

  /** Bound handler for manualviewport event */
  #handleManualViewport = () => {
    if (!this.followActive || !this.#running) return;
    this.#followPaused = true;
    if (this.#followResumeTimer) clearTimeout(this.#followResumeTimer);
    this.#followResumeTimer = setTimeout(() => {
      this.#followPaused = false;
      this.#followResumeTimer = null;
    }, this.followResumDelay);
  };

  /**
   * @param {import('../core/Editor.js').NodeEditor} editor
   * @param {Object} canvas - NodeCanvas instance
   */
  constructor(editor, canvas) {
    this.#editor = editor;
    this.#canvas = canvas;
  }

  /** @returns {boolean} */
  get running() {
    return this.#running;
  }

  /**
   * Run sequential flow animation
   * @returns {Promise<void>}
   */
  async run() {
    if (this.#running) return;
    this.#running = true;
    this.#abort = new AbortController();
    this.#followPaused = false;
    this.#canvas.addEventListener('manualviewport', this.#handleManualViewport);

    const order = this.#topologicalSort();
    const connections = this.#editor.getConnections();

    try {
      for (const nodeId of order) {
        if (this.#abort.signal.aborted) break;

        // Mark node as processing
        this.#setNodeState(nodeId, 'processing');

        // Smooth pan to active node
        if (this.followActive && !this.#followPaused) {
          this.#canvas.panToNode?.(nodeId);
        }

        await this.#wait(this.speed);
        if (this.#abort.signal.aborted) break;

        // Mark node as completed
        this.#setNodeState(nodeId, 'completed');

        // Animate outgoing connections
        const outgoing = connections.filter((c) => c.from === nodeId);
        for (const conn of outgoing) {
          this.#canvas.setFlowing(conn.id, true);
        }

        await this.#wait(this.speed * 0.5);
        if (this.#abort.signal.aborted) break;

        // Stop flowing
        for (const conn of outgoing) {
          this.#canvas.setFlowing(conn.id, false);
        }
      }

      // Emit completion
      if (!this.#abort.signal.aborted) {
        this.#editor.emit('flowcomplete', {});
      }
    } finally {
      this.#running = false;
      this.#abort = null;
      this.#canvas.removeEventListener('manualviewport', this.#handleManualViewport);
    }
  }

  /** Stop animation and clear all states */
  stop() {
    if (this.#abort) this.#abort.abort();
    this.#running = false;
    this.#canvas.removeEventListener('manualviewport', this.#handleManualViewport);
    if (this.#followResumeTimer) {
      clearTimeout(this.#followResumeTimer);
      this.#followResumeTimer = null;
    }
    this.#followPaused = false;

    // Clear all node states
    for (const node of this.#editor.getNodes()) {
      this.#clearNodeState(node.id);
    }

    // Clear all flowing
    this.#canvas.setAllFlowing(false);
  }

  /**
   * Topological sort — Kahn's algorithm
   * Returns node IDs ordered from sources to sinks
   * @returns {string[]}
   */
  #topologicalSort() {
    const nodes = this.#editor.getNodes();
    const connections = this.#editor.getConnections();

    // Collect only nodes that participate in connections
    /** @type {Set<string>} */
    const connectedIds = new Set();
    for (const conn of connections) {
      connectedIds.add(conn.from);
      connectedIds.add(conn.to);
    }

    // Build adjacency + in-degree for connected nodes only
    /** @type {Map<string, string[]>} */
    const adj = new Map();
    /** @type {Map<string, number>} */
    const inDeg = new Map();

    for (const node of nodes) {
      if (!connectedIds.has(node.id)) continue;
      adj.set(node.id, []);
      inDeg.set(node.id, 0);
    }

    for (const conn of connections) {
      adj.get(conn.from)?.push(conn.to);
      inDeg.set(conn.to, (inDeg.get(conn.to) || 0) + 1);
    }

    // Start from nodes with no incoming connections
    /** @type {string[]} */
    const queue = [];
    for (const [id, deg] of inDeg) {
      if (deg === 0) queue.push(id);
    }

    /** @type {string[]} */
    const result = [];
    while (queue.length > 0) {
      const id = queue.shift();
      result.push(id);
      for (const next of adj.get(id) || []) {
        const newDeg = (inDeg.get(next) || 1) - 1;
        inDeg.set(next, newDeg);
        if (newDeg === 0) queue.push(next);
      }
    }

    return result;
  }

  /**
   * Set visual state on a node element
   * @param {string} nodeId
   * @param {'processing'|'completed'} state
   */
  #setNodeState(nodeId, state) {
    const el = this.#canvas._getNodeView?.(nodeId);
    if (!el) return;
    el.removeAttribute('data-processing');
    el.removeAttribute('data-completed');
    el.setAttribute(`data-${state}`, '');
  }

  /**
   * Clear visual state from a node element
   * @param {string} nodeId
   */
  #clearNodeState(nodeId) {
    const el = this.#canvas._getNodeView?.(nodeId);
    if (!el) return;
    el.removeAttribute('data-processing');
    el.removeAttribute('data-completed');
  }

  /**
   * Cancellable delay
   * @param {number} ms
   * @returns {Promise<void>}
   */
  #wait(ms) {
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, ms);
      this.#abort?.signal.addEventListener('abort', () => {
        clearTimeout(timer);
        resolve();
      }, { once: true });
    });
  }
}
