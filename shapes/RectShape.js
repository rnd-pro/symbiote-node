/**
 * RectShape — standard rectangular node card
 *
 * Sockets arranged vertically on left (inputs) and right (outputs).
 * Default shape for most nodes.
 *
 * @module symbiote-node/shapes/RectShape
 */

import { NodeShape } from './NodeShape.js';

export class RectShape extends NodeShape {
  name = 'rect';

  /** @type {number} */
  #headerHeight;

  /**
   * @param {object} [config]
   * @param {number} [config.headerHeight=36] - Height of header area
   */
  constructor(config = {}) {
    super();
    this.#headerHeight = config.headerHeight || 36;
  }

  getSocketPosition(side, index, total, { width, height }) {
    const bodyHeight = height - this.#headerHeight;
    const spacing = bodyHeight / (total + 1);
    const y = this.#headerHeight + spacing * (index + 1);

    return {
      x: side === 'input' ? 0 : width,
      y,
      angle: side === 'input' ? 180 : 0,
    };
  }

  getBorderRadius() {
    return 'var(--sn-node-radius, 10px)';
  }

  getMinSize() {
    return { minWidth: 180, minHeight: 60 };
  }
}
