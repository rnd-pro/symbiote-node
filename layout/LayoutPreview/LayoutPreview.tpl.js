import { html } from '@symbiotejs/symbiote';

export const template = html`
<div class="preview-overlay" ${{ '@style': 'overlayStyle', '@hidden': '!visible' }}></div>
<div class="preview-line" ${{ '@style': 'lineStyle', '@hidden': '!visible' }}></div>
`;
