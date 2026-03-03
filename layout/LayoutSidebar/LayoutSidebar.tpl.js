/**
 * LayoutSidebar template
 * @module symbiote-node/layout/LayoutSidebar
 */
import { html } from '@symbiotejs/symbiote';

export const sidebarTemplate = html`
<div class="sb-header">
  <span class="sb-title" ${{ textContent: 'title' }}></span>
</div>

<div class="sb-sections" itemize="sections" item-tag="sidebar-section"></div>

<button class="sb-toggle" ${{ onclick: 'onToggle' }}>
  <span class="material-symbols-outlined">chevron_left</span>
</button>
`;
