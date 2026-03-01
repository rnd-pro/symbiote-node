/**
 * ContextMenu template
 * @module symbiote-node/menu/ContextMenu.tpl
 */
import { html } from '@symbiotejs/symbiote';

export const template = html`
<div class="sn-ctx-backdrop" ${{ onclick: 'onBackdropClick' }}></div>
<div class="sn-ctx-menu">
  <div class="sn-ctx-items" ${{ itemize: 'items', 'item-tag': 'sn-ctx-item' }}></div>
</div>
`;

export const ctxItemTemplate = html`
<button class="sn-ctx-btn" ${{ onclick: 'onclick' }}>
  <span class="material-symbols-outlined sn-ctx-icon">{{icon}}</span>
  <span>{{label}}</span>
</button>
`;
