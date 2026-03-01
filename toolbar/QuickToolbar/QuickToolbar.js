/**
 * QuickToolbar — floating action bar above selected node
 *
 * Shows contextual SVG buttons when a single node is selected:
 * Delete, Duplicate, Collapse, Mute.
 * Positioned above the node and follows zoom/pan transform.
 *
 * @module symbiote-node/toolbar/QuickToolbar
 */

import Symbiote from '@symbiotejs/symbiote';
import { template } from './QuickToolbar.tpl.js';
import { styles } from './QuickToolbar.css.js';

/**
 * @typedef {object} ToolbarAction
 * @property {string} id - Action identifier
 * @property {string} icon - Material Symbols icon name
 * @property {string} label - Tooltip text
 */

/** @type {ToolbarAction[]} */
const ACTIONS = [
  { id: 'duplicate', icon: 'content_copy', label: 'Duplicate' },
  { id: 'collapse', icon: 'unfold_less', label: 'Collapse' },
  { id: 'mute', icon: 'visibility_off', label: 'Mute' },
  { id: 'delete', icon: 'delete', label: 'Delete' },
];

export class QuickToolbar extends Symbiote {

  init$ = {
    items: ACTIONS,
    visible: false,
    onBtnClick: (/** @type {Event} */ e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      if (this._onAction) this._onAction(action, this._nodeId);
    },
  };

  /** @type {string|null} */
  _nodeId = null;

  /** @type {function|null} */
  _onAction = null;

  /** @type {number} Toolbar height + gap */
  static OFFSET_Y = 48;

  /**
   * Show toolbar above a node
   * @param {string} nodeId
   * @param {HTMLElement} nodeEl - The graph-node element
   */
  show(nodeId, nodeEl) {
    this._nodeId = nodeId;
    this.$.visible = true;

    // Position centered above node
    const w = nodeEl.offsetWidth || 180;
    const pos = nodeEl._position || { x: 0, y: 0 };
    this.style.transform = `translate(${pos.x + w / 2}px, ${pos.y - QuickToolbar.OFFSET_Y}px)`;

    // Update collapse icon based on current state
    this.#updateIcons(nodeEl);

    // Show/hide enter button for subgraph nodes
    const enterBtn = this.querySelector('[data-action="enter"]');
    if (enterBtn) {
      enterBtn.style.display = nodeEl.getAttribute('node-type') === 'subgraph' ? '' : 'none';
    }
  }

  /** Hide toolbar */
  hide() {
    this._nodeId = null;
    this.$.visible = false;
  }

  renderCallback() {
    this.sub('visible', (val) => {
      this.toggleAttribute('hidden', !val);
    });
  }

  /**
   * Update position to follow node movement
   * @param {HTMLElement} nodeEl
   */
  updatePosition(nodeEl) {
    if (!this._nodeId) return;
    const w = nodeEl.offsetWidth || 180;
    const pos = nodeEl._position || { x: 0, y: 0 };
    this.style.transform = `translate(${pos.x + w / 2}px, ${pos.y - QuickToolbar.OFFSET_Y}px)`;
  }

  /**
   * Update toggle icons based on node state
   * @param {HTMLElement} nodeEl
   */
  #updateIcons(nodeEl) {
    const isCollapsed = nodeEl.hasAttribute('data-collapsed');
    const isMuted = nodeEl.hasAttribute('data-muted');

    const collapseBtn = this.querySelector('[data-action="collapse"] .tb-icon');
    const muteBtn = this.querySelector('[data-action="mute"] .tb-icon');

    if (collapseBtn) collapseBtn.textContent = isCollapsed ? 'unfold_more' : 'unfold_less';
    if (muteBtn) muteBtn.textContent = isMuted ? 'visibility' : 'visibility_off';
  }
}

QuickToolbar.template = template;
QuickToolbar.rootStyles = styles;
QuickToolbar.reg('quick-toolbar');
