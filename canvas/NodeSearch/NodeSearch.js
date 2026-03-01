/**
 * NodeSearch — omnibox for searching and focusing nodes
 *
 * Ctrl+F or / to open. Type to filter by label, type, category.
 * Click result to select and center viewport on that node.
 * Escape to close.
 *
 * @module symbiote-node/canvas/NodeSearch
 */

import Symbiote from '@symbiotejs/symbiote';
import { template, searchResultTemplate } from './NodeSearch.tpl.js';
import { styles } from './NodeSearch.css.js';

export class NodeSearch extends Symbiote {

  init$ = {
    query: '',
    results: [],
    isOpen: false,
  };

  /** @type {function|null} */
  #getNodes = null;

  /** @type {function|null} */
  #onSelect = null;

  /**
   * Configure search
   * @param {object} options
   * @param {function} options.getNodes - returns array of { id, label, type, category }
   * @param {function} options.onSelect - called with nodeId when a result is clicked
   */
  configure(options) {
    this.#getNodes = options.getNodes;
    this.#onSelect = options.onSelect;
  }

  /** Open search panel */
  open() {
    this.$.isOpen = true;
    this.removeAttribute('hidden');
    requestAnimationFrame(() => {
      const input = this.querySelector('.sn-search-input');
      if (input) input.focus();
    });
  }

  close() {
    this.$.isOpen = false;
    this.$.query = '';
    this.$.results = [];
    const input = this.querySelector('.sn-search-input');
    if (input) input.value = '';
    this.setAttribute('hidden', '');
  }

  /** Toggle open/close */
  toggle() {
    if (this.$.isOpen) this.close();
    else this.open();
  }

  renderCallback() {
    this.sub('query', (q) => {
      if (!q || q.length < 1) {
        this.$.results = [];
        return;
      }
      this.#search(q);
    });
  }

  #search(query) {
    if (!this.#getNodes) return;
    const nodes = this.#getNodes();
    const q = query.toLowerCase();
    const results = nodes.filter(n =>
      n.label.toLowerCase().includes(q) ||
      (n.type && n.type.toLowerCase().includes(q)) ||
      (n.category && n.category.toLowerCase().includes(q))
    ).slice(0, 10).map(n => ({
      id: n.id,
      label: n.label,
      type: n.type || 'default',
      category: n.category || 'default',
    }));
    this.$.results = results;
  }

  #handleResultClick(nodeId) {
    if (this.#onSelect) this.#onSelect(nodeId);
    this.close();
  }

  connectedCallback() {
    super.connectedCallback();

    // Handle result clicks via delegation
    this.addEventListener('click', (e) => {
      const item = e.target.closest('.sn-search-result');
      if (item?.dataset?.nodeId) {
        this.#handleResultClick(item.dataset.nodeId);
      }
    });

    // Handle input
    this.addEventListener('input', (e) => {
      if (e.target.classList.contains('sn-search-input')) {
        this.$.query = e.target.value;
      }
    });

    // Escape to close
    this.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        this.close();
      }
    });
  }
}

// Result item for itemize
class SearchResultItem extends Symbiote {
  id = '';
  label = '';
  type = '';
  category = '';
}

SearchResultItem.template = searchResultTemplate;
SearchResultItem.reg('sn-search-result-item');

NodeSearch.template = template;
NodeSearch.rootStyles = styles;
NodeSearch.reg('node-search');
