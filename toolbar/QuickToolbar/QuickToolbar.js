/**
 * QuickToolbar — floating action bar above selected node
 *
 * Shows contextual SVG buttons when a single node is selected:
 * Delete, Duplicate, Mute.
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
  { id: 'mute', icon: 'visibility_off', label: 'Mute' },
  { id: 'delete', icon: 'delete', label: 'Delete' },
];

export class QuickToolbar extends Symbiote {

  init$ = {
    items: ACTIONS,
    visible: false,
    onBtnClick: (/** @type {Event} */ e) => {
      let btn = e.target.closest('[data-action]');
      if (!btn) return;
      let action = btn.getAttribute('data-action');
      if (this._onAction) this._onAction(action, this._nodeId);
    },
  };

  /** @type {string|null} */
  _nodeId = null;

  /** @type {function|null} */
  _onAction = null;

  /** @type {number} Toolbar height + gap */
  static OFFSET_Y = 48;

  /** @type {{ zoom: number, panX: number, panY: number }} */
  _transform = { zoom: 1, panX: 0, panY: 0 };

  /**
   * Show toolbar above a node
   * @param {string} nodeId
   * @param {HTMLElement} nodeEl - The graph-node element
   */
  show(nodeId, nodeEl) {
    this._nodeId = nodeId;
    this._nodeEl = nodeEl;
    this.$.visible = true;

    this.#positionAtNode(nodeEl);

    // Update collapse icon based on current state
    this.#updateIcons(nodeEl);

    // Show/hide enter button for subgraph nodes
    let enterBtn = this.querySelector('[data-action="enter"]');
    if (enterBtn) {
      enterBtn.hidden = nodeEl.getAttribute('node-type') !== 'subgraph';
    }
  }

  /** Hide toolbar */
  hide() {
    this._nodeId = null;
    this._nodeEl = null;
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
    this.#positionAtNode(nodeEl);
  }

  /**
   * Position toolbar centered above a node in world-space.
   * Since toolbar is inside .content, it inherits zoom/pan transform.
   * @param {HTMLElement} nodeEl
   */
  #positionAtNode(nodeEl) {
    let w = nodeEl.offsetWidth || nodeEl._cachedW || 180;
    let pos = nodeEl._position || { x: 0, y: 0 };

    let x = pos.x + w / 2;
    let y = pos.y - QuickToolbar.OFFSET_Y;

    this.style.transform = `translate(${x}px, ${y}px)`;
  }

  /**
   * Update toggle icons based on node state
   * @param {HTMLElement} nodeEl
   */
  #updateIcons(nodeEl) {
    let isMuted = nodeEl.hasAttribute('data-muted');

    let muteBtn = this.querySelector('[data-action="mute"] .tb-icon');

    if (muteBtn) muteBtn.textContent = isMuted ? 'visibility' : 'visibility_off';
  }
}

QuickToolbar.template = template;
QuickToolbar.rootStyles = styles;
QuickToolbar.reg('quick-toolbar');
