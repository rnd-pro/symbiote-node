/**
 * LayoutSidebar — collapsible workspace navigation
 *
 * Shows master panel sections with expandable sub-panel lists.
 * Sub-panels are read from the BSP LayoutTree of each section's panel-layout.
 *
 * @module symbiote-node/layout/LayoutSidebar
 */
import Symbiote, { html } from '@symbiotejs/symbiote';
import { sidebarTemplate } from './LayoutSidebar.tpl.js';
import { sidebarStyles } from './LayoutSidebar.css.js';
import { navigate } from '../LayoutRouter/LayoutRouter.js';
import './SidebarSection.js';

export class LayoutSidebar extends Symbiote {

  init$ = {
    title: '',
    collapsed: false,
    sections: [],

    onToggle: () => {
      this.$.collapsed = !this.$.collapsed;
    },
  };

  renderCallback() {
    this.sub('collapsed', (val) => {
      this.toggleAttribute('collapsed', val);
    });

    // Restore collapsed state from localStorage
    const stored = localStorage.getItem('sn-sidebar-collapsed');
    if (stored === 'true') {
      this.$.collapsed = true;
    }

    // Persist collapsed state
    this.sub('collapsed', (val) => {
      localStorage.setItem('sn-sidebar-collapsed', String(val));
    });
  }

  /**
   * Configure sidebar sections
   * @param {Array<{id: string, icon: string, label: string}>} items
   */
  setSections(items) {
    this.$.sections = items.map((item) => ({
      sectionId: item.id,
      icon: item.icon,
      label: item.label,
      isActive: false,
      isExpanded: false,
      subPanels: [],
    }));

    // Subscribe to route changes to update active section
    this.sub('ROUTER/section', (section) => {
      this.$.sections = this.$.sections.map((s) => ({
        ...s,
        isActive: s.sectionId === section,
      }));
    });
  }

  /**
   * Update sub-panel list for a section (from LayoutTree.getAllPanels)
   * @param {string} sectionId
   * @param {Array<{title: string, icon: string}>} panels
   */
  updateSubPanels(sectionId, panels) {
    this.$.sections = this.$.sections.map((s) => {
      if (s.sectionId !== sectionId) return s;
      return {
        ...s,
        subPanels: panels,
      };
    });
  }
}

LayoutSidebar.template = sidebarTemplate;
LayoutSidebar.rootStyles = sidebarStyles;
LayoutSidebar.reg('layout-sidebar');
