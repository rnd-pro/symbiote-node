/**
 * DiamondShape — condition/decision rhombus node
 *
 * Input at top vertex, outputs distributed along bottom edges.
 * Classic if/else, switch/case pattern.
 *
 * @module symbiote-node/shapes/DiamondShape
 */

import { NodeShape } from './NodeShape.js';

export class DiamondShape extends NodeShape {
  name = 'diamond';

  getSocketPosition(side, index, total, { width, height }) {
    const cx = width / 2;
    const cy = height / 2;

    if (side === 'input') {
      // Inputs distributed along top edges
      if (total === 1) {
        return { x: cx, y: 0, angle: 270 };
      }
      // Multiple inputs: spread along top-left and top-right edges
      const t = (index + 1) / (total + 1);
      return {
        x: cx * (1 - t),
        y: cy * t,
        angle: 225 + 90 * (index / (total - 1)),
      };
    }

    // Outputs along bottom edges
    if (total === 1) {
      return { x: cx, y: height, angle: 90 };
    }
    if (total === 2) {
      // True: bottom-left, False: bottom-right
      return index === 0
        ? { x: cx * 0.35, y: cy + cy * 0.65, angle: 225 }
        : { x: width - cx * 0.35, y: cy + cy * 0.65, angle: 315 };
    }
    // 3+ outputs: spread along bottom edges
    const t = (index + 1) / (total + 1);
    return {
      x: t < 0.5 ? cx * (1 - 2 * t) : cx + cx * (2 * t - 1),
      y: t < 0.5 ? cy + cy * 2 * t : cy + cy * (2 - 2 * t),
      angle: 135 + 90 * (index / (total - 1)),
    };
  }

  getBorderRadius() {
    return '0';
  }

  getClipPath({ width, height }) {
    const cx = width / 2;
    const cy = height / 2;
    return `polygon(${cx}px 0, ${width}px ${cy}px, ${cx}px ${height}px, 0 ${cy}px)`;
  }

  get hasHeader() {
    return false;
  }

  get hasControls() {
    return false;
  }

  getMinSize() {
    return { minWidth: 100, minHeight: 100 };
  }
}
