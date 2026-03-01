/**
 * NodeSearch template
 * @module symbiote-node/canvas/NodeSearch.tpl
 */
import { html } from '@symbiotejs/symbiote';

export const template = html`
<div class="search-bar">
  <span class="material-symbols-outlined search-icon">search</span>
  <input class="search-input" type="text" placeholder="Search nodes..." />
  <span class="search-hint">Esc</span>
</div>
<div class="search-results" ${{ itemize: 'results', 'item-tag': 'search-result-item' }}></div>
`;

export const searchResultTemplate = html`
<div class="search-result" data-node-id="{{id}}">
  <span class="search-result-label">{{label}}</span>
  <span class="search-result-type">{{type}}</span>
</div>
`;
