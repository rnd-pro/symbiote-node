/**
 * SidebarSection — itemize sub-component for sidebar section items
 *
 * Renders a master panel entry with icon, label.
 * Edit mode: shows visibility toggle + drag handle.
 * Shows sub-panel list with close buttons for non-master panels.
 *
 * @module symbiote-node/layout/LayoutSidebar/SidebarSection
 */
import Symbiote, { html } from '@symbiotejs/symbiote';
import { navigate } from '../LayoutRouter/LayoutRouter.js';

export class SidebarSection extends Symbiote {
  isoMode = true;

  init$ = {
    sectionId: '',
    icon: 'dashboard',
    label: '',
    isActive: false,
    isVisible: true,
    isDisabled: false,
    eyeIcon: 'visibility',
    hasSubPanels: false,
    isExpanded: false,
    subPanels: [],

    onSectionClick: () => {
      if (!this.$.isVisible || this.$.isDisabled) return;
      navigate(this.$.sectionId);
    },

    onExpandToggle: (e) => {
      e.stopPropagation();
      if (!this.$.hasSubPanels) return;
      this.$.isExpanded = !this.$.isExpanded;
    },

    onToggleVisibility: (e) => {
      e.stopPropagation();
      let sidebar = this.closest('layout-sidebar');
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

    this.sub('isDisabled', (val) => {
      this.toggleAttribute('data-disabled', val);
    });

    this.sub('subPanels', (panels) => {
      let has = panels && panels.length > 0;
      this.$.hasSubPanels = has;
      this.toggleAttribute('data-has-sub', has);
      // Collapse if no sub-panels
      if (!has) this.$.isExpanded = false;
    });

    // Drag support
    this.setAttribute('draggable', 'true');

    this.addEventListener('dragstart', (e) => {
      let sidebar = this.closest('layout-sidebar');
      if (!sidebar?.hasAttribute('edit-mode')) {
        e.preventDefault();
        return;
      }
      let sections = Array.from(this.parentElement.children);
      let idx = sections.indexOf(this);
      e.dataTransfer.setData('text/plain', String(idx));
      e.dataTransfer.effectAllowed = 'move';
      this.setAttribute('data-dragging', '');
    });

    this.addEventListener('dragend', () => {
      this.removeAttribute('data-dragging');
    });

    this.addEventListener('dragover', (e) => {
      let sidebar = this.closest('layout-sidebar');
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
      let sidebar = this.closest('layout-sidebar');
      if (!sidebar?.hasAttribute('edit-mode')) return;

      let fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
      let sections = Array.from(this.parentElement.children);
      let toIdx = sections.indexOf(this);
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
 * Shows close button for non-master panels (isMaster=false)
 */
export class SidebarSubItem extends Symbiote {
  isoMode = true;

  init$ = {
    title: '',
    icon: 'web_asset',
    panelId: '',
    isMaster: false,

    onClose: (e) => {
      e.stopPropagation();
      let panelId = this.$.panelId;
      if (!panelId) return;

      // Find the panel-layout and call joinPanels
      let sidebar = this.closest('layout-sidebar');
      if (sidebar) {
        sidebar.dispatchEvent(new CustomEvent('panel-close', {
          bubbles: true,
          detail: { panelId },
        }));
      }
    },
  };

  renderCallback() {
    this.sub('isMaster', (val) => {
      this.toggleAttribute('data-master', val);
    });
  }
}

SidebarSubItem.template = html`
<div class="sub-panel-item">
  <span class="material-symbols-outlined" ${{ textContent: 'icon' }}></span>
  <span ${{ textContent: 'title' }}></span>
  <button class="sub-panel-close" ${{ onclick: 'onClose' }}>
    <span class="material-symbols-outlined">close</span>
  </button>
</div>
`;

SidebarSubItem.reg('sidebar-sub-item');
