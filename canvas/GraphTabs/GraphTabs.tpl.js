/**
 * GraphTabs template
 * @module symbiote-node/canvas/GraphTabs.tpl
 */
import { html } from '@symbiotejs/symbiote';

export const template = html`
  <div ref="tabList"></div>
  <div class="tab-add" title="New tab" ${{ onclick: 'onAddTab' }}>
    <span class="material-symbols-outlined">add</span>
  </div>
`;
