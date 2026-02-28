/**
 * ContextMenu — right-click menu for graph editor
 *
 * Shows contextual actions for canvas, nodes, and connections.
 * Triple-file component: .js + .tpl.js + .css.js
 *
 * @module symbiote-node/components/ContextMenu
 */

import Symbiote, { html, css } from '@symbiotejs/symbiote';

const template = html`
<div class="sn-ctx-backdrop" ${{ onclick: 'onBackdropClick' }}></div>
<div class="sn-ctx-menu">
  <div class="sn-ctx-items" ${{ itemize: 'items', 'item-tag': 'sn-ctx-item' }}></div>
</div>
`;

class CtxItem extends Symbiote {
  init$ = {
    label: '',
    icon: '',
    onclick: () => {
      this.$['^onItemClick'](this.$.label);
    },
  };
}

CtxItem.template = html`
<button class="sn-ctx-btn" ${{ onclick: 'onclick' }}>
  <span class="material-symbols-outlined sn-ctx-icon">{{icon}}</span>
  <span>{{label}}</span>
</button>
`;
CtxItem.reg('sn-ctx-item');

export class ContextMenu extends Symbiote {

  /** @type {Map<string, function>} */
  _actions = new Map();

  init$ = {
    items: [],
    onBackdropClick: () => this.hide(),
    onItemClick: (label) => {
      const action = this._actions.get(label);
      if (action) action();
      this.hide();
    },
  };

  /**
   * Show the menu at screen coordinates
   * @param {number} x - Screen X
   * @param {number} y - Screen Y
   * @param {Array<{label: string, icon: string, action: function}>} items
   */
  show(x, y, items) {
    this._actions.clear();
    for (const item of items) {
      this._actions.set(item.label, item.action);
    }
    this.$.items = items.map((i) => ({ label: i.label, icon: i.icon }));
    const menu = this.querySelector('.sn-ctx-menu');
    if (menu) {
      menu.style.left = `${x}px`;
      menu.style.top = `${y}px`;
    }
    this.removeAttribute('hidden');
  }

  /** Hide menu */
  hide() {
    this.setAttribute('hidden', '');
    this.$.items = [];
    this._actions.clear();
  }
}

ContextMenu.template = template;

ContextMenu.rootStyles = css`
context-menu {
  position: absolute;
  inset: 0;
  z-index: 200;
  pointer-events: none;

  &[hidden] {
    display: none;
  }

  & .sn-ctx-backdrop {
    position: absolute;
    inset: 0;
    pointer-events: all;
  }

  & .sn-ctx-menu {
    position: absolute;
    pointer-events: all;
    min-width: 160px;
    background: var(--sn-ctx-bg, #1e1e3a);
    border: 1px solid var(--sn-ctx-border, #3a3a6a);
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    padding: 4px;
    overflow: hidden;
  }
}

.sn-ctx-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--sn-ctx-color, #e0e0e0);
  font-family: var(--sn-font, 'Inter', sans-serif);
  font-size: 13px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.1s;

  &:hover {
    background: var(--sn-ctx-hover, rgba(74, 158, 255, 0.15));
  }
}

.sn-ctx-icon {
  font-size: 18px;
  opacity: 0.7;
}
`;

ContextMenu.reg('context-menu');
