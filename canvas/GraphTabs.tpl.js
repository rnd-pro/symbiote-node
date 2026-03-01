/**
 * GraphTabs template
 * @module symbiote-node/canvas/GraphTabs.tpl
 */
import { html } from '@symbiotejs/symbiote';

export const template = html`
  <div ref="tabList"></div>
  <div ref="tabAdd" class="tab-add" title="New tab">
    <span class="material-symbols-outlined">add</span>
  </div>
`;
