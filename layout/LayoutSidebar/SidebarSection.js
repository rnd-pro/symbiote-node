/**
 * SidebarSection — itemize sub-component for sidebar section items
 *
 * Renders a master panel entry with icon, label, and expandable sub-panel list.
 *
 * @module symbiote-node/layout/LayoutSidebar/SidebarSection
 */
import Symbiote, { html } from '@symbiotejs/symbiote';
import { navigate } from '../LayoutRouter/LayoutRouter.js';

export class SidebarSection extends Symbiote {

  init$ = {
    sectionId: '',
    icon: 'dashboard',
    label: '',
    isActive: false,
    isExpanded: false,
    subPanels: [],

    onSectionClick: () => {
      navigate(this.$.sectionId);
    },

    onExpandToggle: (e) => {
      e.stopPropagation();
      this.$.isExpanded = !this.$.isExpanded;
    },
  };

  renderCallback() {
    this.sub('isActive', (val) => {
      this.toggleAttribute('data-active', val);
    });

    this.sub('isExpanded', (val) => {
      this.toggleAttribute('data-expanded', val);
    });
  }
}

SidebarSection.template = html`
<div class="sec-item" ${{ onclick: 'onSectionClick' }}>
  <span class="material-symbols-outlined" ${{ textContent: 'icon' }}></span>
  <span class="sec-label" ${{ textContent: 'label' }}></span>
  <span class="material-symbols-outlined sec-expand" ${{ onclick: 'onExpandToggle' }}>chevron_right</span>
</div>
<div class="sec-sub-panels" itemize="subPanels" item-tag="sidebar-sub-item"></div>
`;

SidebarSection.reg('sidebar-section');

/**
 * SidebarSubItem — sub-panel entry inside a section
 */
export class SidebarSubItem extends Symbiote {

  init$ = {
    title: '',
    icon: 'web_asset',
  };
}

SidebarSubItem.template = html`
<div class="sub-panel-item">
  <span class="material-symbols-outlined" ${{ textContent: 'icon' }}></span>
  <span ${{ textContent: 'title' }}></span>
</div>
`;

SidebarSubItem.reg('sidebar-sub-item');
