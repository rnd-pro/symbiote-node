import { html } from '@symbiotejs/symbiote';

export const template = html`
<div class="sn-node-header">
  <span class="sn-node-icon material-symbols-outlined">{{nodeIcon}}</span>
  <span class="sn-node-label">{{nodeLabel}}</span>
</div>
<div class="sn-node-body">
  <div class="sn-inputs" ${{ itemize: 'inputPorts', 'item-tag': 'sn-port-item' }}>
  </div>
  <div class="sn-controls" ${{ itemize: 'controlsList', 'item-tag': 'sn-ctrl-item' }}>
  </div>
  <div class="sn-outputs" ${{ itemize: 'outputPorts', 'item-tag': 'sn-port-item' }}>
  </div>
</div>
`;
