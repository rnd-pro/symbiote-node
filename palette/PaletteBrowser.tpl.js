/**
 * PaletteBrowser template
 * @module symbiote-node/palette/PaletteBrowser.tpl
 */
import { html } from '@symbiotejs/symbiote';

export const template = html`
  <div class="pal-header">
    <span class="material-symbols-outlined">widgets</span>
    Components
  </div>
  <div class="pal-search">
    <input ref="palSearch" type="text" placeholder="Search components..." />
  </div>
  <div ref="palList" class="pal-list"></div>
`;
