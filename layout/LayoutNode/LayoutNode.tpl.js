import { html } from '@symbiotejs/symbiote';

export let template = html`
<div class="panel-view" ${{ '@hidden': '!isPanel' }}>
  <div class="panel-header">
    <button class="header-btn type-btn" ${{ onclick: 'onTypeClick' }}>
      <span class="material-symbols-outlined panel-icon" ${{ textContent: 'panelIcon' }}></span>
      <span class="panel-title" ${{ textContent: 'panelTitle' }}></span>
      <span class="material-symbols-outlined dropdown-arrow">arrow_drop_down</span>
    </button>
    <div class="header-spacer"></div>
    <button class="header-btn collapse-btn" ${{ onclick: 'onCollapseClick', '@hidden': '!canCollapse' }} title="Collapse">
      <span class="material-symbols-outlined" ${{ textContent: 'collapseIcon' }}></span>
    </button>
    <button class="header-btn fullscreen-btn" ${{ onclick: 'onFullscreenClick' }} title="Fullscreen">
      <span class="material-symbols-outlined" ${{ textContent: 'fullscreenIcon' }}></span>
    </button>
  </div>
  <div class="panel-content" ref="panelContent" ${{ '@hidden': 'isCollapsed' }}></div>
  
  <!-- Action zones for split/join -->
  <action-zone corner="tl"></action-zone>
  <action-zone corner="tr"></action-zone>
  <action-zone corner="bl"></action-zone>
  <action-zone corner="br"></action-zone>
</div>

<div class="split-view" ${{ '@hidden': '!isSplit', '@direction': 'direction' }}>
  <div class="split-first" ref="first" ${{ '@style': 'firstStyle' }}></div>
  <div class="split-resizer" ${{ onpointerdown: 'onResizerDown' }}></div>
  <div class="split-second" ref="second" ${{ '@style': 'secondStyle' }}></div>
</div>
`;
