/**
 * NodeSearch template
 * @module symbiote-node/canvas/NodeSearch.tpl
 */
import { html } from '@symbiotejs/symbiote';

export const template = html`
<div class="sn-search-bar">
  <span class="material-symbols-outlined sn-search-icon">search</span>
  <input class="sn-search-input" type="text" placeholder="Search nodes..." />
  <span class="sn-search-hint">Esc</span>
</div>
<div class="sn-search-results" ${{ itemize: 'results', 'item-tag': 'sn-search-result-item' }}></div>
`;

export const searchResultTemplate = html`
<div class="sn-search-result" data-node-id="{{id}}">
  <span class="sn-search-result-label">{{label}}</span>
  <span class="sn-search-result-type">{{type}}</span>
</div>
`;
