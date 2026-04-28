import { html } from '@symbiotejs/symbiote';

export let template = html`
<div class="sn-node-header">
  <span class="sn-node-icon material-symbols-outlined">{{nodeIcon}}</span>
  <span class="sn-node-label">{{nodeLabel}}</span>
</div>
<div class="sn-node-body">
  <div class="inputs" ${{ itemize: 'inputPorts', 'item-tag': 'port-item' }}>
  </div>
  <div class="controls" ${{ itemize: 'controlsList', 'item-tag': 'ctrl-item' }}>
  </div>
  <div class="outputs" ${{ itemize: 'outputPorts', 'item-tag': 'port-item' }}>
  </div>
</div>
<div ref="previewArea" class="sn-preview" hidden></div>
`;
