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
    const enterBtn = this.querySelector('[data-action="enter"]');
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
   * Position toolbar centered above a node in screen-space.
   * Converts world coordinates to screen coordinates using zoom/pan.
   * @param {HTMLElement} nodeEl
   */
  #positionAtNode(nodeEl) {
    const { zoom, panX, panY } = this._transform;
    const w = nodeEl.offsetWidth || nodeEl._cachedW || 180;
    const pos = nodeEl._position || { x: 0, y: 0 };

    // World center → screen position
    const screenX = (pos.x + w / 2) * zoom + panX;
    const screenY = pos.y * zoom + panY - QuickToolbar.OFFSET_Y;

    this.style.transform = `translate(${screenX}px, ${screenY}px)`;
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
