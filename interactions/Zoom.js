/**
 * Zoom handler — wheel, touch pinch, and double-click zoom
 *
 * Adapted from Rete.js area-plugin/zoom.ts (123 LOC).
 * Handles zoom relative to cursor/pinch center.
 *
 * @module symbiote-node/interactions/Zoom
 */

export class Zoom {
  /** @type {PointerEvent[]} */
  #pointers = [];

  /** @type {{ cx: number, cy: number, distance: number }|null} */
  #previous = null;

  /** @type {HTMLElement|null} */
  #container = null;

  /** @type {HTMLElement|null} */
  #content = null;

  /** @type {function|null} */
  #onZoom = null;

  /**
   * @param {number} [intensity=0.1] - Zoom sensitivity
   */
  constructor(intensity = 0.1) {
    /** @type {number} */
    this.intensity = intensity;
  }

  /**
   * Initialize zoom handler
   * @param {HTMLElement} container - Outer container
   * @param {HTMLElement} content - Inner content element (for getBoundingClientRect)
   * @param {function} onZoom - Callback: (delta, ox, oy, source)
   */
  initialize(container, content, onZoom) {
    this.#container = container;
    this.#content = content;
    this.#onZoom = onZoom;

    container.addEventListener('wheel', this.#wheel, { passive: false });
    container.addEventListener('pointerdown', this.#down);
    container.addEventListener('dblclick', this.#dblclick);
    window.addEventListener('pointermove', this.#move);
    window.addEventListener('pointerup', this.#up);
    window.addEventListener('pointercancel', this.#up);
  }

  #wheel = (e) => {
    e.preventDefault();
    const rect = this.#content.getBoundingClientRect();
    // Normalize delta: trackpads send small frequent deltas, mice send large ones
    const absDelta = Math.min(Math.abs(e.deltaY), 10) / 10;
    const sign = e.deltaY < 0 ? 1 : -1;
    const delta = sign * this.intensity * absDelta;
    const ox = (rect.left - e.clientX) * delta;
    const oy = (rect.top - e.clientY) * delta;
    this.#onZoom(delta, ox, oy, 'wheel');
  };

  #dblclick = (e) => {
    e.preventDefault();
    const rect = this.#content.getBoundingClientRect();
    const delta = 4 * this.intensity;
    const ox = (rect.left - e.clientX) * delta;
    const oy = (rect.top - e.clientY) * delta;
    this.#onZoom(delta, ox, oy, 'dblclick');
  };

  #down = (e) => {
    this.#pointers.push(e);
  };

  #move = (e) => {
    this.#pointers = this.#pointers.map(p =>
      p.pointerId === e.pointerId ? e : p
    );
    if (this.#pointers.length < 2) return;

    const [p1, p2] = this.#pointers;
    const distance = Math.sqrt(
      (p1.clientX - p2.clientX) ** 2 + (p1.clientY - p2.clientY) ** 2
    );
    const cx = (p1.clientX + p2.clientX) / 2;
    const cy = (p1.clientY + p2.clientY) / 2;

    if (this.#previous && this.#previous.distance > 0) {
      const rect = this.#content.getBoundingClientRect();
      const delta = distance / this.#previous.distance - 1;
      const ox = (rect.left - cx) * delta;
      const oy = (rect.top - cy) * delta;
      this.#onZoom(
        delta,
        ox - (this.#previous.cx - cx),
        oy - (this.#previous.cy - cy),
        'touch'
      );
    }
    this.#previous = { cx, cy, distance };
  };

  #up = (e) => {
    this.#previous = null;
    this.#pointers = this.#pointers.filter(p => p.pointerId !== e.pointerId);
  };

  /**
   * Whether a multi-touch zoom is in progress
   * @returns {boolean}
   */
  isTranslating() {
    return this.#pointers.length >= 2;
  }

  /** Cleanup event listeners */
  destroy() {
    if (!this.#container) return;
    this.#container.removeEventListener('wheel', this.#wheel);
    this.#container.removeEventListener('pointerdown', this.#down);
    this.#container.removeEventListener('dblclick', this.#dblclick);
    window.removeEventListener('pointermove', this.#move);
    window.removeEventListener('pointerup', this.#up);
    window.removeEventListener('pointercancel', this.#up);
  }
}
