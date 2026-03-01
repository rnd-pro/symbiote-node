/**
 * GraphTabs — Tab/Page management for multi-canvas workflows
 *
 * Each tab represents an independent graph page with its own
 * set of nodes and connections. Provides tab bar UI and
 * state switching for the NodeCanvas.
 *
 * @module symbiote-node/canvas/GraphTabs
 */

import Symbiote from '@symbiotejs/symbiote';
import { template } from './GraphTabs.tpl.js';
import { styles } from './GraphTabs.css.js';

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

  onAddTab() {
    if (this.#onAdd) {
      const newTab = this.#onAdd();
      if (newTab) this.addTab(newTab.id, newTab.name, newTab.state);
    }
  }
}

GraphTabs.template = template;
GraphTabs.rootStyles = styles;
GraphTabs.reg('graph-tabs');
