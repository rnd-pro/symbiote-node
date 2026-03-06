import { html } from '@symbiotejs/symbiote';

export const template = html`
<div class="log-header">
  <span class="log-title">Event Log</span>
  <span class="log-count">{{logCount}}</span>
  <button ${{ onclick: 'onClear' }}>Clear</button>
</div>
<div class="log-entries" ref="entries"></div>
`;
