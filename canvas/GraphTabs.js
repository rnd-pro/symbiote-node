/**
 * GraphTabs — Tab/Page management for multi-canvas workflows
 *
 * Each tab represents an independent graph page with its own
 * set of nodes and connections. Provides tab bar UI and
 * state switching for the NodeCanvas.
 *
 * @module symbiote-node/canvas/GraphTabs
 */

import Symbiote, { html, css } from '@symbiotejs/symbiote';

const TAB_STYLES = css`
  graph-tabs {
    display: flex;
    align-items: stretch;
    height: 32px;
    background: var(--sn-ctx-bg, #1e1e2e);
    border-bottom: 1px solid var(--sn-node-border, rgba(255, 255, 255, 0.08));
    font-family: var(--sn-font, 'Inter', sans-serif);
    font-size: 12px;
    color: var(--sn-text-dim, #a0a0a0);
    overflow-x: auto;
    overflow-y: hidden;
    user-select: none;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  .tab-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 14px;
    cursor: pointer;
    white-space: nowrap;
    border-right: 1px solid var(--sn-node-border, rgba(255, 255, 255, 0.06));
    transition: background 0.15s ease-out, color 0.15s ease-out;
    position: relative;

    &:hover {
      background: rgba(255, 255, 255, 0.04);
      color: var(--sn-text, #cdd6f4);
    }

    &[data-active] {
      background: var(--sn-node-bg, #2d2d3d);
      color: var(--sn-text, #cdd6f4);

      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: var(--sn-node-selected, #4a9eff);
      }
    }

    & .material-symbols-outlined {
      font-size: 14px;
    }

    & .tab-close {
      font-size: 14px;
      opacity: 0;
      transition: opacity 0.15s;
      padding: 2px;
      border-radius: 3px;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }
    }

    &:hover .tab-close {
      opacity: 0.7;
    }
  }

  .tab-add {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    cursor: pointer;
    color: var(--sn-text-dim, #a0a0a0);
    transition: background 0.15s ease-out, color 0.15s ease-out;

    &:hover {
      background: rgba(255, 255, 255, 0.04);
      color: var(--sn-text, #cdd6f4);
    }

    & .material-symbols-outlined {
      font-size: 16px;
    }
  }
`;

/**
 * @typedef {Object} TabPage
 * @property {string} id
 * @property {string} name
 * @property {Object} state - Serialized editor state
 */

export class GraphTabs extends Symbiote {

  /** @type {TabPage[]} */
  #tabs = [];

  /** @type {string} */
  #activeTabId = '';

  /** @type {function|null} */
  #onSwitch = null;

  /** @type {function|null} */
  #onAdd = null;

  /** @type {function|null} */
  #onClose = null;

  /**
   * Set callbacks for tab events
   * @param {object} callbacks
   * @param {function} callbacks.onSwitch - (tabId) => void
   * @param {function} callbacks.onAdd - () => TabPage
   * @param {function} callbacks.onClose - (tabId) => void
   */
  setCallbacks(callbacks) {
    this.#onSwitch = callbacks.onSwitch;
    this.#onAdd = callbacks.onAdd;
    this.#onClose = callbacks.onClose;
  }

  /**
   * Add a tab
   * @param {string} id
   * @param {string} name
   * @param {Object} [state={}]
   */
  addTab(id, name, state = {}) {
    this.#tabs.push({ id, name, state });
    this.#render();
    this.switchTo(id);
  }

  /**
   * Switch to a tab
   * @param {string} id
   */
  switchTo(id) {
    this.#activeTabId = id;
    this.#render();
    if (this.#onSwitch) this.#onSwitch(id);
  }

  /**
   * Remove a tab
   * @param {string} id
   */
  removeTab(id) {
    const idx = this.#tabs.findIndex(t => t.id === id);
    if (idx === -1) return;
    this.#tabs.splice(idx, 1);
    if (this.#activeTabId === id && this.#tabs.length > 0) {
      this.switchTo(this.#tabs[Math.max(0, idx - 1)].id);
    }
    this.#render();
    if (this.#onClose) this.#onClose(id);
  }

  /**
   * Get current active tab ID
   * @returns {string}
   */
  get activeTab() { return this.#activeTabId; }

  /**
   * Get all tabs
   * @returns {TabPage[]}
   */
  get tabs() { return [...this.#tabs]; }

  /**
   * Update tab state (for saving before switch)
   * @param {string} id
   * @param {Object} state
   */
  setTabState(id, state) {
    const tab = this.#tabs.find(t => t.id === id);
    if (tab) tab.state = state;
  }

  /**
   * Get tab state
   * @param {string} id
   * @returns {Object|undefined}
   */
  getTabState(id) {
    return this.#tabs.find(t => t.id === id)?.state;
  }

  #render() {
    const container = this.ref.tabList;
    if (!container) return;
    container.replaceChildren();

    for (const tab of this.#tabs) {
      const el = document.createElement('div');
      el.className = 'tab-item';
      if (tab.id === this.#activeTabId) el.setAttribute('data-active', '');

      const icon = document.createElement('span');
      icon.className = 'material-symbols-outlined';
      icon.textContent = 'description';

      const label = document.createElement('span');
      label.textContent = tab.name;

      el.append(icon, label);

      if (this.#tabs.length > 1) {
        const closeBtn = document.createElement('span');
        closeBtn.className = 'tab-close material-symbols-outlined';
        closeBtn.textContent = 'close';
        el.appendChild(closeBtn);
      }

      el.addEventListener('click', (e) => {
        if (e.target.closest('.tab-close')) {
          this.removeTab(tab.id);
        } else {
          this.switchTo(tab.id);
        }
      });
      container.appendChild(el);
    }
  }

  initCallback() {
    super.initCallback();
    this.ref.tabAdd?.addEventListener('click', () => {
      if (this.#onAdd) {
        const newTab = this.#onAdd();
        if (newTab) this.addTab(newTab.id, newTab.name, newTab.state);
      }
    });
  }
}

GraphTabs.template = html`
  <div ref="tabList"></div>
  <div ref="tabAdd" class="tab-add" title="New tab">
    <span class="material-symbols-outlined">add</span>
  </div>
`;

GraphTabs.rootStyles = TAB_STYLES;
GraphTabs.reg('graph-tabs');
