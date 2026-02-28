/**
 * CircleShape — circular hub node
 *
 * Sockets distributed around the perimeter of a circle.
 * Inputs on left semicircle, outputs on right semicircle.
 *
 * @module symbiote-node/shapes/CircleShape
 */

import { NodeShape } from './NodeShape.js';

export class CircleShape extends NodeShape {
  name = 'circle';

  getSocketPosition(side, index, total, { width, height }) {
    const r = Math.min(width, height) / 2;
    const cx = width / 2;
    const cy = height / 2;

    // Inputs: left semicircle (90° to 270°), top to bottom
    // Outputs: right semicircle (-90° to 90°), top to bottom
    const arcSpan = Math.PI * 0.8; // 144 degrees
    const centerAngle = side === 'input' ? Math.PI : 0;
    const startAngle = centerAngle - arcSpan / 2;
    const step = total > 1 ? arcSpan / (total - 1) : 0;
    const angle = startAngle + step * index;

    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      angle: (angle * 180) / Math.PI,
    };
  }

  getBorderRadius() {
    return '50%';
  }

  get hasHeader() {
    return false;
  }

  get hasControls() {
    return false;
  }

  getMinSize() {
    return { minWidth: 80, minHeight: 80 };
  }
}
