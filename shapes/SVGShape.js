/**
 * SVGShape — universal shape from any SVG path
 *
 * Uses SVGPathElement.getPointAtLength() for dynamic connector placement.
 * Any SVG icon path can become a node shape — the outer contour defines
 * the clip mask and connector positions are computed along the perimeter.
 *
 * Port placement strategy:
 *   - Inputs placed on left portion of path perimeter (25%-75% of left arc)
 *   - Outputs placed on right portion of path perimeter (25%-75% of right arc)
 *   - Connector angle = normal from center → edge point
 *
 * @module symbiote-node/shapes/SVGShape
 */

import { NodeShape } from './NodeShape.js';

/**
 * Offscreen SVG namespace for path computation
 * @type {SVGSVGElement|null}
 */
let _offscreenSVG = null;

/**
 * Get or create an offscreen SVG element for path calculations
 * @returns {SVGSVGElement}
 */
function getOffscreenSVG() {
  if (_offscreenSVG) return _offscreenSVG;
  if (typeof document === 'undefined') return null;
  _offscreenSVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  _offscreenSVG.style.position = 'absolute';
  _offscreenSVG.style.width = '0';
  _offscreenSVG.style.height = '0';
  _offscreenSVG.style.overflow = 'hidden';
  document.body.appendChild(_offscreenSVG);
  return _offscreenSVG;
}

export class SVGShape extends NodeShape {
  /** @type {string} */
  name;

  /** @type {string} - SVG path d attribute */
  pathData;

  /** @type {string} - viewBox of original SVG */
  viewBox;

  /** @type {number[]} - parsed viewBox [x, y, w, h] */
  #vb;

  /** @type {boolean} - whether shape has standard header */
  #header;

  /** @type {{ minWidth: number, minHeight: number }} */
  #minSize;

  /**
   * @param {string} name - Shape identifier
   * @param {object} options
   * @param {string} options.pathData - SVG path d attribute
   * @param {string} [options.viewBox='0 0 24 24'] - Original SVG viewBox
   * @param {boolean} [options.header=false] - Show header/controls
   * @param {{ minWidth?: number, minHeight?: number }} [options.minSize]
   */
  constructor(name, { pathData, viewBox = '0 0 24 24', header = false, minSize = {} }) {
    super();
    this.name = name;
    this.pathData = pathData;
    this.viewBox = viewBox;
    this.#vb = viewBox.split(' ').map(Number);
    this.#header = header;
    this.#minSize = {
      minWidth: minSize.minWidth || 80,
      minHeight: minSize.minHeight || 80,
    };
  }

  /**
   * Scale a point from viewBox coordinates to node size
   * @param {number} px - x in viewBox
   * @param {number} py - y in viewBox
   * @param {{ width: number, height: number }} size
   * @returns {{ x: number, y: number }}
   */
  #scalePoint(px, py, size) {
    const [vx, vy, vw, vh] = this.#vb;
    return {
      x: ((px - vx) / vw) * size.width,
      y: ((py - vy) / vh) * size.height,
    };
  }

  /**
   * Get a path element for computations (uses offscreen SVG)
   * @returns {SVGPathElement|null}
   */
  #getPathElement() {
    const svg = getOffscreenSVG();
    if (!svg) return null;
    let pathEl = svg.querySelector(`[data-shape="${this.name}"]`);
    if (!pathEl) {
      pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathEl.setAttribute('d', this.pathData);
      pathEl.setAttribute('data-shape', this.name);
      svg.appendChild(pathEl);
    }
    return pathEl;
  }

  /**
   * Find a point on the path perimeter closest to a given angle from center.
   * Uses binary search along the path length.
   *
   * @param {number} targetAngle - angle in radians from center
   * @param {SVGPathElement} pathEl
   * @returns {{ x: number, y: number, angle: number }}
   */
  #findPointAtAngle(targetAngle, pathEl) {
    const totalLen = pathEl.getTotalLength();
    const [, , vw, vh] = this.#vb;
    const cx = vw / 2;
    const cy = vh / 2;

    let bestDist = Infinity;
    let bestPoint = null;
    const steps = 64;

    for (let i = 0; i <= steps; i++) {
      const len = (totalLen * i) / steps;
      const pt = pathEl.getPointAtLength(len);
      const angle = Math.atan2(pt.y - cy, pt.x - cx);
      let diff = Math.abs(angle - targetAngle);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      if (diff < bestDist) {
        bestDist = diff;
        bestPoint = pt;
      }
    }

    return bestPoint || { x: cx, y: cy };
  }

  getSocketPosition(side, index, total, size) {
    const pathEl = this.#getPathElement();
    const [, , vw, vh] = this.#vb;
    const cx = vw / 2;
    const cy = vh / 2;

    if (!pathEl) {
      // Fallback to simple rect-like placement
      const y = size.height * (index + 1) / (total + 1);
      return side === 'input'
        ? { x: 0, y, angle: 180 }
        : { x: size.width, y, angle: 0 };
    }

    // Distribute ports along the relevant side of the path perimeter
    // Input: left side (angle ~π), Output: right side (angle ~0)
    const centerAngle = side === 'input' ? Math.PI : 0;
    const arcSpan = Math.PI * 0.6; // ~108° spread
    const startAngle = centerAngle - arcSpan / 2;
    const step = total > 1 ? arcSpan / (total - 1) : 0;
    const targetAngle = startAngle + step * index;

    const pt = this.#findPointAtAngle(targetAngle, pathEl);
    const scaled = this.#scalePoint(pt.x, pt.y, size);

    // Connection angle = direction from center to edge point
    const angleDeg = Math.atan2(pt.y - cy, pt.x - cx) * 180 / Math.PI;

    return {
      x: scaled.x,
      y: scaled.y,
      angle: angleDeg,
    };
  }

  getClipPath(size) {
    const pathEl = this.#getPathElement();
    if (!pathEl) return null;
    const totalLen = pathEl.getTotalLength();
    const steps = 32;
    const points = [];

    for (let i = 0; i < steps; i++) {
      const pt = pathEl.getPointAtLength((totalLen * i) / steps);
      const scaled = this.#scalePoint(pt.x, pt.y, size);
      points.push(`${scaled.x}px ${scaled.y}px`);
    }

    return `polygon(${points.join(', ')})`;
  }

  getOutlinePath(size) {
    // Scale the original path data to node size
    const [vx, vy, vw, vh] = this.#vb;
    const sx = size.width / vw;
    const sy = size.height / vh;
    return this.pathData; // Return raw — CSS transform handles scaling
  }

  getBorderRadius() {
    return '0';
  }

  get hasHeader() {
    return this.#header;
  }

  get hasControls() {
    return this.#header;
  }

  getMinSize() {
    return this.#minSize;
  }
}

// --- Preset SVG shapes (Material Symbols paths) ---

/**
 * Register an SVG shape from a path string
 * @param {string} name
 * @param {string} pathData - SVG d attribute
 * @param {object} [options]
 */
export function createSVGShape(name, pathData, options = {}) {
  return new SVGShape(name, { pathData, ...options });
}

// Common icon paths from Material Symbols (24x24 viewBox)
export const SVG_PRESETS = {
  // Hexagon
  hexagon: 'M12 2L22 8.5V15.5L12 22L2 15.5V8.5Z',

  // Pentagon
  pentagon: 'M12 2L22 9.27L18.18 21H5.82L2 9.27Z',

  // Star (5-pointed)
  star: 'M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26Z',

  // Cloud
  cloud: 'M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z',

  // Shield
  shield: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z',

  // Octagon
  octagon: 'M7.86 2H16.14L22 7.86V16.14L16.14 22H7.86L2 16.14V7.86Z',

  // Parallelogram
  parallelogram: 'M6 2H22L18 22H2Z',

  // Trapezoid
  trapezoid: 'M4 22H20L23 2H1Z',

  // Cylinder (approximation)
  cylinder: 'M4 6C4 4 8 2 12 2S20 4 20 6V18C20 20 16 22 12 22S4 20 4 18Z',

  // Database
  database: 'M12 3C7.58 3 4 4.79 4 7V17C4 19.21 7.59 21 12 21S20 19.21 20 17V7C20 4.79 16.42 3 12 3Z',

  // Lightning bolt
  bolt: 'M7 2V13H10V22L17 10H13L17 2Z',

  // Heart
  heart: 'M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z',
};
