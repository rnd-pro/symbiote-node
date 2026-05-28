/**
 * QuickToolbar template
 * @module symbiote-node/toolbar/QuickToolbar.tpl
 */
import { html } from '@symbiotejs/symbiote';

export let template = html`
  <div class="toolbar" ${{ onclick: 'onBtnClick' }}>
    <div class="toolbar-title" ref="titleRow" ${{ hidden: '!hasTitle' }}>
      <span class="toolbar-title-text" ref="titleText" ${{ textContent: 'nodeTitle' }}></span>
    </div>
    <div class="toolbar-actions">
      <sn-button class="tb-btn tb-btn--enter" variant="icon" data-action="enter" title="Enter Subgraph" hidden>
        <span class="material-symbols-outlined tb-icon">login</span>
      </sn-button>
      <sn-button class="tb-btn" variant="icon" data-action="explore" title="Explore connections">
        <span class="material-symbols-outlined tb-icon">hub</span>
      </sn-button>
      <sn-button class="tb-btn" variant="icon" data-action="view-code" title="View Code">
        <span class="material-symbols-outlined tb-icon">code</span>
      </sn-button>
      <sn-button class="tb-btn" variant="icon" data-action="duplicate" title="Duplicate">
        <span class="material-symbols-outlined tb-icon">content_copy</span>
      </sn-button>

      <sn-button class="tb-btn" variant="icon" data-action="mute" title="Mute">
        <span class="material-symbols-outlined tb-icon">visibility_off</span>
      </sn-button>
      <sn-button class="tb-btn tb-btn--danger" variant="icon" data-action="delete" title="Delete">
        <span class="material-symbols-outlined tb-icon">delete</span>
      </sn-button>
    </div>
  </div>
`;
