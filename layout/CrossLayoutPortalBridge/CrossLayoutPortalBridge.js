/**
 * CrossLayoutPortalBridge draws a themed visual bridge between two DOM anchors.
 *
 * It is intentionally data-agnostic: host apps decide which elements represent
 * portal endpoints, while the bridge owns viewport tracking and path rendering.
 */
export class CrossLayoutPortalBridge extends HTMLElement {
  #root;
  #svg;
  #path;
  #sourceDot;
  #targetDot;
  #resizeObserver;
  #mutationObserver;
  #raf = 0;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: 'open' });
    this.#root.innerHTML = `
      <style>
        :host {
          position: fixed;
          inset: 0;
          z-index: var(--sn-portal-bridge-z, 12);
          pointer-events: none;
          contain: layout style;
        }

        svg {
          width: 100%;
          height: 100%;
          overflow: visible;
        }

        path {
          fill: none;
          stroke: var(--sn-portal-bridge-stroke, var(--sn-node-selected, var(--sn-node-accent, #4a9eff)));
          stroke-width: var(--sn-portal-bridge-width, 2);
          stroke-linecap: round;
          stroke-dasharray: var(--sn-portal-bridge-dash, 7 7);
          filter: drop-shadow(0 0 5px color-mix(in srgb, var(--sn-portal-bridge-stroke, var(--sn-node-selected, #4a9eff)) 40%, transparent));
        }

        circle {
          fill: var(--sn-portal-bridge-dot, var(--sn-node-selected, var(--sn-node-accent, #4a9eff)));
          stroke: var(--sn-bg, #f3f5f8);
          stroke-width: 2;
        }
      </style>
      <svg aria-hidden="true">
        <path part="path"></path>
        <circle part="source-dot" r="5"></circle>
        <circle part="target-dot" r="5"></circle>
      </svg>
    `;
    this.#svg = this.#root.querySelector('svg');
    this.#path = this.#root.querySelector('path');
    this.#sourceDot = this.#root.querySelector('[part="source-dot"]');
    this.#targetDot = this.#root.querySelector('[part="target-dot"]');
  }

  static get observedAttributes() {
    return ['source-selector', 'target-selector', 'source-side', 'target-side'];
  }

  connectedCallback() {
    this.#resizeObserver = new ResizeObserver(() => this.requestUpdate());
    this.#mutationObserver = new MutationObserver(() => this.requestUpdate());
    this.#mutationObserver.observe(document.documentElement, {
      attributes: true,
      childList: true,
      subtree: true,
    });
    window.addEventListener('resize', this.#onWindowChange, { passive: true });
    window.addEventListener('scroll', this.#onWindowChange, { passive: true, capture: true });
    this.requestUpdate();
  }

  disconnectedCallback() {
    this.#resizeObserver?.disconnect();
    this.#mutationObserver?.disconnect();
    window.removeEventListener('resize', this.#onWindowChange);
    window.removeEventListener('scroll', this.#onWindowChange, { capture: true });
    cancelAnimationFrame(this.#raf);
  }

  attributeChangedCallback() {
    this.requestUpdate();
  }

  requestUpdate() {
    cancelAnimationFrame(this.#raf);
    this.#raf = requestAnimationFrame(() => this.#render());
  }

  #onWindowChange = () => this.requestUpdate();

  #render() {
    const source = document.querySelector(this.getAttribute('source-selector') || '');
    const target = document.querySelector(this.getAttribute('target-selector') || '');

    if (!source || !target) {
      this.hidden = true;
      return;
    }

    this.hidden = false;
    this.#resizeObserver?.observe(source);
    this.#resizeObserver?.observe(target);

    const start = this.#anchorPoint(source, this.getAttribute('source-side') || 'right');
    const end = this.#anchorPoint(target, this.getAttribute('target-side') || 'left');
    const dx = Math.max(48, Math.abs(end.x - start.x) * 0.45);
    const c1 = { x: start.x + dx, y: start.y };
    const c2 = { x: end.x - dx, y: end.y };

    this.#svg.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);
    this.#path.setAttribute('d', `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`);
    this.#sourceDot.setAttribute('cx', String(start.x));
    this.#sourceDot.setAttribute('cy', String(start.y));
    this.#targetDot.setAttribute('cx', String(end.x));
    this.#targetDot.setAttribute('cy', String(end.y));
  }

  #anchorPoint(el, side) {
    const rect = el.getBoundingClientRect();
    const xMap = {
      left: rect.left,
      right: rect.right,
      center: rect.left + rect.width / 2,
    };
    const yMap = {
      top: rect.top,
      bottom: rect.bottom,
      center: rect.top + rect.height / 2,
    };
    return {
      x: Math.round(xMap[side] ?? xMap.center),
      y: Math.round(yMap[side] ?? yMap.center),
    };
  }
}

if (!customElements.get('cross-layout-portal-bridge')) {
  customElements.define('cross-layout-portal-bridge', CrossLayoutPortalBridge);
}
