/**
 * PillShape — compact horizontal pill node
 *
 * Small node with rounded ends, label centered, 1 input left, 1 output right.
 * No header, no controls. Ideal for simple operations (multiply, add, etc.)
 *
 * @module symbiote-node/shapes/PillShape
 */

import { NodeShape } from './NodeShape.js';

export class PillShape extends NodeShape {
  name = 'pill';

  getSocketPosition(side, index, total, { width, height }) {
    const r = height / 2;
    if (total <= 1) {
      return {
        x: side === 'input' ? 0 : width,
        y: height / 2,
        angle: side === 'input' ? 180 : 0,
      };
    }

    // Multiple sockets: distribute along the rounded end
    const arcAngle = Math.PI * 0.6; // 108 degrees arc
    const startAngle = side === 'input' ? Math.PI - arcAngle / 2 : -arcAngle / 2;
    const step = arcAngle / (total - 1);
    const a = startAngle + step * index;

    const cx = side === 'input' ? r : width - r;
    return {
      x: cx + r * Math.cos(a),
      y: height / 2 + r * Math.sin(a),
      angle: (a * 180) / Math.PI,
    };
  }

  getBorderRadius({ height }) {
    return `${height / 2}px`;
  }

  get hasHeader() {
    return false;
  }

  get hasControls() {
    return false;
  }

  getMinSize() {
    return { minWidth: 100, minHeight: 40 };
  }
}
