/**
 * QuickToolbar template
 * @module symbiote-node/toolbar/QuickToolbar.tpl
 */
import { html } from '@symbiotejs/symbiote';

export const template = html`
<div class="sn-toolbar" ${{ onclick: 'onBtnClick' }}>
  <button class="sn-tb-btn sn-tb-btn--enter" data-action="enter" title="Enter Subgraph" style="display:none">
    <span class="material-symbols-outlined sn-tb-icon">login</span>
  </button>
  <button class="sn-tb-btn" data-action="duplicate" title="Duplicate">
    <span class="material-symbols-outlined sn-tb-icon">content_copy</span>
  </button>
  <button class="sn-tb-btn" data-action="collapse" title="Collapse">
    <span class="material-symbols-outlined sn-tb-icon">unfold_less</span>
  </button>
  <button class="sn-tb-btn" data-action="mute" title="Mute">
    <span class="material-symbols-outlined sn-tb-icon">visibility_off</span>
  </button>
  <button class="sn-tb-btn sn-tb-btn--danger" data-action="delete" title="Delete">
    <span class="material-symbols-outlined sn-tb-icon">delete</span>
  </button>
</div>
`;
