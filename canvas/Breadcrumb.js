/**
 * Breadcrumb — Navigation path UI for subgraph drill-down
 *
 * Displays clickable path segments: Root > Sub Pipeline > Inner
 * Auto-hides at root level (depth 0).
 *
 * @module symbiote-node/canvas/Breadcrumb
 */

import Symbiote, { html, css } from '@symbiotejs/symbiote';

const BREADCRUMB_STYLES = css`
  graph-breadcrumb {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 6px 12px;
    font-family: var(--sn-font, 'Inter', sans-serif);
    font-size: 12px;
    color: var(--sn-text-dim, #a0a0a0);
    background: var(--sn-ctx-bg, rgba(30, 30, 46, 0.92));
    border-radius: 6px;
    backdrop-filter: blur(8px);
    pointer-events: auto;
    user-select: none;
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 50;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    border: 1px solid var(--sn-node-border, rgba(255, 255, 255, 0.08));
    transition: opacity 0.2s ease-out;

    &[hidden] {
      display: none;
    }
  }

  .bc-item {
    padding: 3px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.15s ease-out, color 0.15s ease-out;
    display: flex;
    align-items: center;
    gap: 4px;

    &:hover {
      background: var(--sn-ctx-hover, rgba(90, 159, 212, 0.15));
      color: var(--sn-text, #cdd6f4);
    }

    &[data-active] {
      color: var(--sn-text, #cdd6f4);
      font-weight: 500;
      cursor: default;

      &:hover {
        background: transparent;
      }
    }

    & .material-symbols-outlined {
      font-size: 14px;
    }
  }

  .bc-sep {
    color: var(--sn-text-dim, #a0a0a0);
    opacity: 0.5;
    font-size: 11px;
    padding: 0 2px;
  }
`;

export class Breadcrumb extends Symbiote {

  /** @type {function|null} */
  #onNavigate = null;

  /**
   * Set navigation callback
   * @param {function} callback - (level: number) => void
   */
  onNavigate(callback) {
    this.#onNavigate = callback;
  }

  /**
   * Update breadcrumb path
   * @param {Array<{ label: string, level: number }>} path
   */
  setPath(path) {
    if (path.length <= 1) {
      this.setAttribute('hidden', '');
      return;
    }

    this.removeAttribute('hidden');
    const container = this.ref.bcList;
    if (!container) return;
    container.replaceChildren();

    path.forEach((item, i) => {
      if (i > 0) {
        const sep = document.createElement('span');
        sep.className = 'bc-sep';
        sep.textContent = '›';
        container.appendChild(sep);
      }

      const el = document.createElement('span');
      el.className = 'bc-item';
      const isActive = i === path.length - 1;

      const icon = document.createElement('span');
      icon.className = 'material-symbols-outlined';
      icon.textContent = i === 0 ? 'home' : 'account_tree';
      el.append(icon, item.label);

      if (isActive) {
        el.setAttribute('data-active', '');
      } else {
        el.addEventListener('click', () => {
          if (this.#onNavigate) this.#onNavigate(item.level);
        });
      }

      container.appendChild(el);
    });
  }
}

Breadcrumb.template = html`
  <div ref="bcList"></div>
`;

Breadcrumb.rootStyles = BREADCRUMB_STYLES;
Breadcrumb.reg('graph-breadcrumb');
