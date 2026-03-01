/**
 * Breadcrumb — Navigation path UI for subgraph drill-down
 *
 * Displays clickable path segments: Root > Sub Pipeline > Inner
 * Auto-hides at root level (depth 0).
 *
 * @module symbiote-node/canvas/Breadcrumb
 */

import Symbiote, { html } from '@symbiotejs/symbiote';
import { template } from './Breadcrumb.tpl.js';
import { styles } from './Breadcrumb.css.js';

class BreadcrumbItem extends Symbiote {
  init$ = {
    label: '',
    icon: 'home',
    level: 0,
    isActive: false,
    isFirst: true,
  };
}

BreadcrumbItem.template = html`
  <span class="bc-sep" ${{ '@hidden': 'isFirst' }}>›</span>
  <span class="bc-label" ${{ onclick: '^onCrumbClick' }}>
    <span class="material-symbols-outlined" ${{ textContent: 'icon' }}></span>
    <span ${{ textContent: 'label' }}></span>
  </span>
`;

BreadcrumbItem.reg('breadcrumb-item');

export class Breadcrumb extends Symbiote {

  init$ = {
    crumbs: [],
  };

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
    this.$.crumbs = path.map((item, i) => ({
      label: item.label,
      icon: i === 0 ? 'home' : 'account_tree',
      level: item.level,
      isActive: i === path.length - 1,
      isFirst: i === 0,
    }));
  }

  onCrumbClick(e) {
    const item = e.target.closest('breadcrumb-item');
    if (!item || item.$.isActive) return;
    if (this.#onNavigate) this.#onNavigate(item.$.level);
  }

  renderCallback() {
    this.sub('crumbs', (items) => {
      this.querySelectorAll('breadcrumb-item').forEach((el, i) => {
        if (items[i]?.isActive) {
          el.setAttribute('data-active', '');
        } else {
          el.removeAttribute('data-active');
        }
      });
    });
  }
}

Breadcrumb.template = template;
Breadcrumb.rootStyles = styles;
Breadcrumb.reg('graph-breadcrumb');
