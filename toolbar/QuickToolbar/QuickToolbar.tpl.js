/**
 * QuickToolbar template
 * @module symbiote-node/toolbar/QuickToolbar.tpl
 */
import { html } from '@symbiotejs/symbiote';

export const template = html`
<div class="toolbar" ${{ onclick: 'onBtnClick' }}>
  <button class="tb-btn tb-btn--enter" data-action="enter" title="Enter Subgraph" style="display:none">
    <span class="material-symbols-outlined tb-icon">login</span>
  </button>
  <button class="tb-btn" data-action="duplicate" title="Duplicate">
    <span class="material-symbols-outlined tb-icon">content_copy</span>
  </button>
  <button class="tb-btn" data-action="collapse" title="Collapse">
    <span class="material-symbols-outlined tb-icon">unfold_less</span>
  </button>
  <button class="tb-btn" data-action="mute" title="Mute">
    <span class="material-symbols-outlined tb-icon">visibility_off</span>
  </button>
  <button class="tb-btn tb-btn--danger" data-action="delete" title="Delete">
    <span class="material-symbols-outlined tb-icon">delete</span>
  </button>
</div>
`;
