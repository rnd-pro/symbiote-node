/**
 * NodeSearch — omnibox for searching and focusing nodes
 *
 * Ctrl+F or / to open. Type to filter by label, type, category.
 * Click result to select and center viewport on that node.
 * Escape to close.
 *
 * @module symbiote-node/canvas/NodeSearch
 */

import Symbiote, { html, css } from '@symbiotejs/symbiote';

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

SearchResultItem.template = html`
<div class="sn-search-result" data-node-id="{{id}}">
  <span class="sn-search-result-label">{{label}}</span>
  <span class="sn-search-result-type">{{type}}</span>
</div>
`;
SearchResultItem.reg('sn-search-result-item');

NodeSearch.template = html`
<div class="sn-search-bar">
  <span class="material-symbols-outlined sn-search-icon">search</span>
  <input class="sn-search-input" type="text" placeholder="Search nodes..." />
  <span class="sn-search-hint">Esc</span>
</div>
<div class="sn-search-results" ${{ itemize: 'results', 'item-tag': 'sn-search-result-item' }}></div>
`;

NodeSearch.rootStyles = css`
node-search {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  width: 360px;
  z-index: 200;
  font-family: var(--sn-font, 'Inter', sans-serif);

  &[hidden] {
    display: none;
  }

  & .sn-search-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    background: var(--sn-node-bg, #2a2a3e);
    border: 1px solid var(--sn-node-border, rgba(255,255,255,0.12));
    border-radius: 10px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  }

  & .sn-search-icon {
    font-size: 18px;
    color: var(--sn-text-dim, #888);
  }

  & .sn-search-input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    color: var(--sn-text, #d4d4d4);
    font-size: 14px;
    font-family: inherit;
  }

  & .sn-search-input::placeholder {
    color: var(--sn-text-dim, #666);
  }

  & .sn-search-hint {
    font-size: 11px;
    color: var(--sn-text-dim, #555);
    padding: 2px 6px;
    border: 1px solid var(--sn-node-border, rgba(255,255,255,0.08));
    border-radius: 4px;
  }

  & .sn-search-results {
    margin-top: 4px;
    background: var(--sn-node-bg, #2a2a3e);
    border-radius: 8px;
    border: 1px solid var(--sn-node-border, rgba(255,255,255,0.08));
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    overflow: hidden;
    max-height: 300px;
    overflow-y: auto;
  }

  & .sn-search-results:empty {
    display: none;
  }
}

.sn-search-result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  cursor: pointer;
  color: var(--sn-text, #d4d4d4);
  font-size: 13px;
  transition: background 0.1s;

  &:hover {
    background: rgba(255,255,255,0.06);
  }
}

.sn-search-result-type {
  font-size: 11px;
  color: var(--sn-text-dim, #888);
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(255,255,255,0.05);
}
`;

NodeSearch.reg('node-search');
