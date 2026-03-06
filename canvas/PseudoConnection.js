/**
 * PseudoConnection — temporary connection line during drag
 *
 * Renders dashed Bézier path + plus indicator at endpoint.
 * Extracted from NodeCanvas to reduce complexity.
 *
 * @module symbiote-node/canvas/PseudoConnection
 */

export class PseudoConnection {

  /** @type {SVGPathElement|null} */
  #path = null;

  /** @type {SVGGElement|null} */
  #plusIndicator = null;

  /** @type {SVGElement} */
  #svg;

  /**
   * @param {SVGElement} svgLayer - pseudo SVG overlay
   */
  constructor(svgLayer) {
    this.#svg = svgLayer;
  }

  /**
   * Show pseudo-connection between two world-space points
   * @param {number} sx - Start X (world space)
   * @param {number} sy - Start Y (world space)
   * @param {number} ex - End X (world space)
   * @param {number} ey - End Y (world space)
   * @param {{ zoom: number, panX: number, panY: number }} transform
   */
  show(sx, sy, ex, ey, transform) {
    if (!this.#path) {
      this.#path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      this.#path.setAttribute('class', 'pseudo-path');
      this.#svg.appendChild(this.#path);
    }

    const k = transform.zoom;
    const px = transform.panX;
    const py = transform.panY;

    const screenSx = sx * k + px;
    const screenSy = sy * k + py;
    const screenEx = ex * k + px;
    const screenEy = ey * k + py;

    const dx = Math.abs(screenEx - screenSx) * 0.5;
    const d = `M ${screenSx} ${screenSy} C ${screenSx + dx} ${screenSy}, ${screenEx - dx} ${screenEy}, ${screenEx} ${screenEy}`;
    this.#path.setAttribute('d', d);

    // Plus indicator at endpoint
    if (!this.#plusIndicator) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'plus-indicator');
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r', '8');
      const h = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      h.setAttribute('x1', '-4'); h.setAttribute('y1', '0');
      h.setAttribute('x2', '4'); h.setAttribute('y2', '0');
      const v = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      v.setAttribute('x1', '0'); v.setAttribute('y1', '-4');
      v.setAttribute('x2', '0'); v.setAttribute('y2', '4');
      g.appendChild(circle);
      g.appendChild(h);
      g.appendChild(v);
      this.#svg.appendChild(g);
      this.#plusIndicator = g;
    }
    this.#plusIndicator.setAttribute('transform', `translate(${screenEx}, ${screenEy})`);
  }

  /** Hide and clean up pseudo-connection */
  hide() {
    if (this.#path) {
      this.#path.remove();
      this.#path = null;
    }
    if (this.#plusIndicator) {
      this.#plusIndicator.remove();
      this.#plusIndicator = null;
    }
  }
}
