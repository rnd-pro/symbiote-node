/**
 * ConnectFlow — interactive socket-to-socket connection creation
 *
 * Simplified version of Rete.js ClassicFlow.
 * Handles: pointerdown on socket → drag pseudo-line → pointerup on target socket → create connection.
 *
 * @module symbiote-node/interactions/ConnectFlow
 */

import { Connection } from '../core/Connection.js';

/**
 * @typedef {object} SocketData
 * @property {string} nodeId - Node ID
 * @property {string} key - Port key
 * @property {'input'|'output'} side - Port side
 * @property {HTMLElement} element - Socket DOM element
 */

export class ConnectFlow {

  /** @type {SocketData|null} */
  #picked = null;

  /** @type {import('../core/Editor.js').NodeEditor} */
  #editor;

  /** @type {function} */
  #getNodePosition;

  /** @type {function} */
  #getNodeSize;

  /** @type {function} */
  #getTransform;

  /** @type {function|null} */
  #onPseudoStart = null;

  /** @type {function|null} */
  #onPseudoMove = null;

  /** @type {function|null} */
  #onPseudoEnd = null;

  /** @type {function|null} */
  #onDropEmpty = null;

  /** @type {function|null} - called during drag with world XY + picked socket */
  #onCompatibleMove = null;

  /** @type {number} - last time compatible move was emitted (ms) */
  #lastMoveTime = 0;

  /** @type {Set<SocketData>} */
  #sockets = new Set();

  /**
   * @param {import('../core/Editor.js').NodeEditor} editor
   * @param {object} callbacks
   * @param {function} callbacks.getNodePosition
   * @param {function} callbacks.getNodeSize
   * @param {function} callbacks.getTransform - Returns { x, y, k, rect }
   * @param {function} callbacks.onPseudoStart
   * @param {function} callbacks.onPseudoMove
   * @param {function} callbacks.onPseudoEnd
   * @param {function} [callbacks.onDropEmpty] - Called when connection dropped in empty space
   */
  constructor(editor, callbacks) {
    this.#editor = editor;
    this.#getNodePosition = callbacks.getNodePosition;
    this.#getNodeSize = callbacks.getNodeSize;
    this.#getTransform = callbacks.getTransform;
    this.#onPseudoStart = callbacks.onPseudoStart;
    this.#onPseudoMove = callbacks.onPseudoMove;
    this.#onPseudoEnd = callbacks.onPseudoEnd;
    this.#onDropEmpty = callbacks.onDropEmpty || null;
    this.#onCompatibleMove = callbacks.onCompatibleMove || null;

    window.addEventListener('pointermove', this.#onMove);
    window.addEventListener('pointerup', this.#onUp);
  }

  /**
   * Register a socket element for connection interaction
   * @param {HTMLElement} socketEl
   * @param {SocketData} data
   */
  registerSocket(socketEl, data) {
    this.#sockets.add(data);
    socketEl.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.#pick(data);
    });
  }

  /**
   * Whether a connection drag is in progress
   * @returns {boolean}
   */
  isPicking() {
    return this.#picked !== null;
  }

  /**
   * Get the currently picked socket data (during drag)
   * @returns {SocketData|null}
   */
  getPickedSocket() {
    return this.#picked;
  }

  /**
   * Externally initiate a connection drag from socket data
   * @param {SocketData} data
   */
  pickSocket(data) {
    // Ensure this socket is in the registry for snap targeting
    if (!this.#sockets.has(data)) {
      this.#sockets.add(data);
    }
    this.#pick(data);
  }

  #pick(data) {
    this.#picked = data;
    const pos = this.#getSocketWorldPosition(data);
    if (this.#onPseudoStart) this.#onPseudoStart(pos.x, pos.y, data);
  }

  #onMove = (e) => {
    if (!this.#picked) return;
    e.preventDefault();

    const startPos = this.#getSocketWorldPosition(this.#picked);
    const t = this.#getTransform();
    // Use clientX/Y minus container rect for accurate positioning
    const endX = (e.clientX - t.rect.left - t.x) / t.k;
    const endY = (e.clientY - t.rect.top - t.y) / t.k;

    if (this.#onPseudoMove) this.#onPseudoMove(startPos.x, startPos.y, endX, endY);

    // Throttle to ~60fps
    const now = performance.now();
    if (this.#onCompatibleMove && now - this.#lastMoveTime > 16) {
      this.#lastMoveTime = now;
      this.#onCompatibleMove(endX, endY, this.#picked);
    }
  };

  #onUp = (e) => {
    if (!this.#picked) return;

    // Find nearest compatible socket within snap distance
    const t = this.#getTransform();
    const pointerX = (e.clientX - t.rect.left - t.x) / t.k;
    const pointerY = (e.clientY - t.rect.top - t.y) / t.k;
    const target = this.#findNearestSocket(pointerX, pointerY);

    if (target && this.#canConnect(this.#picked, target)) {
      this.#makeConnection(this.#picked, target);
    } else if (this.#onDropEmpty) {
      // No target found — emit drop-in-empty event
      this.#onDropEmpty(pointerX, pointerY, this.#picked);
    }

    this.#picked = null;
    if (this.#onPseudoEnd) this.#onPseudoEnd();
  };
  /**
   * Get socket position in graph coordinate space
   * Uses getBoundingClientRect with zoom compensation
   * @param {SocketData} data
   * @returns {{ x: number, y: number }}
   */
  #getSocketWorldPosition(data) {
    // Direct world coordinates (from overlay dot drag)
    if (data.worldX !== undefined && data.worldY !== undefined) {
      return { x: data.worldX, y: data.worldY };
    }

    const pos = this.#getNodePosition(data.nodeId);
    if (!pos) return { x: 0, y: 0 };

    if (data.element) {
      const graphNode = data.element.closest('graph-node');
      if (graphNode) {
        const t = this.#getTransform();
        const nodeRect = graphNode.getBoundingClientRect();
        const socketRect = data.element.getBoundingClientRect();
        // Divide by zoom to get unscaled offset within the node
        const offsetX = (socketRect.left - nodeRect.left + socketRect.width / 2) / t.k;
        const offsetY = (socketRect.top - nodeRect.top + socketRect.height / 2) / t.k;
        return { x: pos.x + offsetX, y: pos.y + offsetY };
      }
    }

    // Fallback: edge center
    const size = this.#getNodeSize(data.nodeId);
    if (!size) return { x: 0, y: 0 };
    return {
      x: data.side === 'output' ? pos.x + size.width : pos.x,
      y: pos.y + size.height / 2,
    };
  }

  /**
   * Find nearest registered socket within snap distance
   * Uses registered socket collection instead of DOM hit-testing
   * @param {number} worldX - Pointer X in graph coordinates
   * @param {number} worldY - Pointer Y in graph coordinates
   * @returns {SocketData|null}
   */
  #findNearestSocket(worldX, worldY) {
    const SNAP_DISTANCE = 30; // pixels in graph space
    let nearest = null;
    let nearestDist = SNAP_DISTANCE;

    for (const socket of this.#sockets) {
      // Skip same socket as picked
      if (socket === this.#picked) continue;

      const pos = this.#getSocketWorldPosition(socket);
      const dx = worldX - pos.x;
      const dy = worldY - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = socket;
      }
    }

    return nearest;
  }

  /**
   * Check if two sockets can be connected
   * @param {SocketData} from
   * @param {SocketData} to
   * @returns {boolean}
   */
  #canConnect(from, to) {
    if (from.side === to.side) return false;
    if (from.nodeId === to.nodeId) return false;

    const fromNode = this.#editor.getNode(from.nodeId);
    const toNode = this.#editor.getNode(to.nodeId);
    if (!fromNode || !toNode) return false;

    const isFromOutput = from.side === 'output';
    const output = isFromOutput
      ? fromNode.outputs[from.key]
      : toNode.outputs[to.key];
    const input = isFromOutput
      ? toNode.inputs[to.key]
      : fromNode.inputs[from.key];

    if (!output || !input) return false;

    return output.socket.isCompatibleWith(input.socket);
  }

  /**
   * Create the connection
   * @param {SocketData} from
   * @param {SocketData} to
   */
  #makeConnection(from, to) {
    let sourceData = from.side === 'output' ? from : to;
    let targetData = from.side === 'input' ? from : to;

    const sourceNode = this.#editor.getNode(sourceData.nodeId);
    const targetNode = this.#editor.getNode(targetData.nodeId);
    if (!sourceNode || !targetNode) return;

    const conn = new Connection(sourceNode, sourceData.key, targetNode, targetData.key);
    this.#editor.addConnection(conn);
  }

  /** Cleanup */
  destroy() {
    window.removeEventListener('pointermove', this.#onMove);
    window.removeEventListener('pointerup', this.#onUp);
  }
}
