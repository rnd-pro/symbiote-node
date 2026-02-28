/**
 * QuickToolbar — floating action bar above selected node
 *
 * Shows contextual SVG buttons when a single node is selected:
 * Delete, Duplicate, Collapse, Mute.
 * Positioned above the node and follows zoom/pan transform.
 *
 * @module symbiote-node/toolbar/QuickToolbar
 */

import Symbiote, { html, css } from '@symbiotejs/symbiote';

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
    this.removeAttribute('hidden');

    // Position centered above node
    const w = nodeEl.offsetWidth || 180;
    const pos = nodeEl._position || { x: 0, y: 0 };
    this.style.transform = `translate(${pos.x + w / 2}px, ${pos.y - QuickToolbar.OFFSET_Y}px)`;

    // Update collapse icon based on current state
    this.#updateIcons(nodeEl);
  }

  /** Hide toolbar */
  hide() {
    this._nodeId = null;
    this.setAttribute('hidden', '');
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

    const collapseBtn = this.querySelector('[data-action="collapse"] .sn-tb-icon');
    const muteBtn = this.querySelector('[data-action="mute"] .sn-tb-icon');

    if (collapseBtn) collapseBtn.textContent = isCollapsed ? 'unfold_more' : 'unfold_less';
    if (muteBtn) muteBtn.textContent = isMuted ? 'visibility' : 'visibility_off';
  }
}

QuickToolbar.template = html`
<div class="sn-toolbar" ${{ onclick: 'onBtnClick' }}>
  <button class="sn-tb-btn" data-action="duplicate" title="Duplicate">
    <span class="material-symbols-outlined sn-tb-icon">content_copy</span>
  </button>
  <button class="sn-tb-btn" data-action="collapse" title="Collapse">
    <span class="material-symbols-outlined sn-tb-icon">unfold_less</span>
  </button>
  <button class="sn-tb-btn" data-action="mute" title="Mute">
    <span class="material-symbols-outlined sn-tb-icon">visibility_off</span>
  </button>
  <button class="sn-tb-btn sn-tb-btn--danger" data-action="delete" title="Delete">
    <span class="material-symbols-outlined sn-tb-icon">delete</span>
  </button>
</div>
`;

QuickToolbar.rootStyles = css`
quick-toolbar {
  position: absolute;
  z-index: 150;
  pointer-events: all;
  transform-origin: center bottom;

  &[hidden] {
    display: none;
  }

  & .sn-toolbar {
    display: flex;
    gap: 2px;
    padding: 4px;
    border-radius: 10px;
    background: var(--sn-toolbar-bg, rgba(22, 33, 62, 0.92));
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--sn-toolbar-border, rgba(255, 255, 255, 0.1));
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(0, 0, 0, 0.1);
    transform: translateX(-50%);
    animation: sn-toolbar-in 0.2s ease-out;
  }
}

@keyframes sn-toolbar-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(6px) scale(0.92);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

.sn-tb-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--sn-toolbar-color, #c0c8d8);
  cursor: pointer;
  transition: background 0.12s, color 0.12s, transform 0.12s;

  &:hover {
    background: var(--sn-toolbar-hover, rgba(74, 158, 255, 0.2));
    color: var(--sn-toolbar-active, #e2e8f0);
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
}

.sn-tb-btn--danger:hover {
  background: var(--sn-toolbar-danger, rgba(255, 107, 107, 0.25));
  color: var(--sn-toolbar-danger-color, #ff6b6b);
}

.sn-tb-icon {
  font-size: 18px;
  pointer-events: none;
}
`;

QuickToolbar.reg('quick-toolbar');
