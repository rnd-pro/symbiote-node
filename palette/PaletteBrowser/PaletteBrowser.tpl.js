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
    <input ref="palSearch" type="text" placeholder="Search components..." ${{ oninput: 'onSearchInput' }} />
  </div>
  <div class="pal-list" ${{ itemize: 'categories', 'item-tag': 'pal-category', onclick: 'onItemClick' }}></div>
`;
