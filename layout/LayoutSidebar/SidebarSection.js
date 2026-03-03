/**
 * SidebarSection — itemize sub-component for sidebar section items
 *
 * Renders a master panel entry with icon, label.
 * Edit mode: shows visibility toggle + drag handle.
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
    isVisible: true,
    eyeIcon: 'visibility',
    isExpanded: false,
    subPanels: [],

    onSectionClick: () => {
      if (!this.$.isVisible) return;
      navigate(this.$.sectionId);
    },

    onExpandToggle: (e) => {
      e.stopPropagation();
      this.$.isExpanded = !this.$.isExpanded;
    },

    onToggleVisibility: (e) => {
      e.stopPropagation();
      const sidebar = this.closest('layout-sidebar');
      if (sidebar) sidebar.toggleVisibility(this.$.sectionId);
    },
  };

  renderCallback() {
    this.sub('isActive', (val) => {
      this.toggleAttribute('data-active', val);
    });

    this.sub('isExpanded', (val) => {
      this.toggleAttribute('data-expanded', val);
    });

    this.sub('isVisible', (val) => {
      this.toggleAttribute('data-hidden', !val);
      this.$.eyeIcon = val ? 'visibility' : 'visibility_off';
    });

    // Drag support
    this.setAttribute('draggable', 'true');

    this.addEventListener('dragstart', (e) => {
      const sidebar = this.closest('layout-sidebar');
      if (!sidebar?.hasAttribute('edit-mode')) {
        e.preventDefault();
        return;
      }
      const sections = Array.from(this.parentElement.children);
      const idx = sections.indexOf(this);
      e.dataTransfer.setData('text/plain', String(idx));
      e.dataTransfer.effectAllowed = 'move';
      this.setAttribute('data-dragging', '');
    });

    this.addEventListener('dragend', () => {
      this.removeAttribute('data-dragging');
    });

    this.addEventListener('dragover', (e) => {
      const sidebar = this.closest('layout-sidebar');
      if (!sidebar?.hasAttribute('edit-mode')) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      this.setAttribute('data-dragover', '');
    });

    this.addEventListener('dragleave', () => {
      this.removeAttribute('data-dragover');
    });

    this.addEventListener('drop', (e) => {
      e.preventDefault();
      this.removeAttribute('data-dragover');
      const sidebar = this.closest('layout-sidebar');
      if (!sidebar?.hasAttribute('edit-mode')) return;

      const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
      const sections = Array.from(this.parentElement.children);
      const toIdx = sections.indexOf(this);
      if (fromIdx !== toIdx) {
        sidebar.moveSection(fromIdx, toIdx);
      }
    });
  }
}

SidebarSection.template = html`
<div class="sec-drag-handle">
  <span class="material-symbols-outlined">drag_indicator</span>
</div>
<div class="sec-item" ${{ onclick: 'onSectionClick' }}>
  <span class="material-symbols-outlined sec-icon" ${{ textContent: 'icon' }}></span>
  <span class="sec-label" ${{ textContent: 'label' }}></span>
  <span class="material-symbols-outlined sec-expand" ${{ onclick: 'onExpandToggle' }}>chevron_right</span>
</div>
<button class="sec-eye" ${{ onclick: 'onToggleVisibility' }}>
  <span class="material-symbols-outlined" ${{ textContent: 'eyeIcon' }}></span>
</button>
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
