/**
 * Breadcrumb — Navigation path UI for subgraph drill-down
 *
 * Displays clickable path segments: Root > Sub Pipeline > Inner
 * Auto-hides at root level (depth 0).
 *
 * @module symbiote-node/canvas/Breadcrumb
 */

import Symbiote from '@symbiotejs/symbiote';
import { template } from './Breadcrumb.tpl.js';
import { styles } from './Breadcrumb.css.js';

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

Breadcrumb.template = template;
Breadcrumb.rootStyles = styles;
Breadcrumb.reg('graph-breadcrumb');
