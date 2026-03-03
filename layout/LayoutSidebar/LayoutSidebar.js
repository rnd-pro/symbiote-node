/**
 * LayoutSidebar — collapsible workspace navigation with edit mode
 *
 * Normal mode: shows only visible sections
 * Edit mode (Blender-style): shows all sections with eye toggles + drag handles
 *
 * @module symbiote-node/layout/LayoutSidebar
 */
import Symbiote from '@symbiotejs/symbiote';
import { sidebarTemplate } from './LayoutSidebar.tpl.js';
import { sidebarStyles } from './LayoutSidebar.css.js';
import { navigate } from '../LayoutRouter/LayoutRouter.js';
import './SidebarSection.js';

const STORAGE_KEY_COLLAPSED = 'sn-sidebar-collapsed';
const STORAGE_KEY_CONFIG = 'sn-sidebar-config';

export class LayoutSidebar extends Symbiote {

  init$ = {
    collapsed: false,
    editMode: false,
    sections: [],

    onToggle: () => {
      this.$.collapsed = !this.$.collapsed;
    },

    onToggleEditMode: () => {
      this.$.editMode = !this.$.editMode;
    },
  };

  /** @type {Array<{id: string, icon: string, label: string}>} */
  #allSections = [];

  renderCallback() {
    // Reflect attributes
    this.sub('collapsed', (val) => {
      this.toggleAttribute('collapsed', val);
    });
    this.sub('editMode', (val) => {
      this.toggleAttribute('edit-mode', val);
    });

    // Restore collapsed state
    const stored = localStorage.getItem(STORAGE_KEY_COLLAPSED);
    if (stored === 'true') {
      this.$.collapsed = true;
    }

    // Persist collapsed state
    this.sub('collapsed', (val) => {
      localStorage.setItem(STORAGE_KEY_COLLAPSED, String(val));
    });
  }

  /**
   * Configure sidebar sections
   * @param {Array<{id: string, icon: string, label: string}>} items
   */
  setSections(items) {
    this.#allSections = items;

    // Load saved config (order + visibility)
    const savedConfig = this.#loadConfig();
    let ordered = items;

    if (savedConfig) {
      // Reorder based on saved order
      const orderMap = new Map(savedConfig.map((c, i) => [c.id, i]));
      ordered = [...items].sort((a, b) => {
        const ai = orderMap.get(a.id) ?? 999;
        const bi = orderMap.get(b.id) ?? 999;
        return ai - bi;
      });
    }

    this.#buildSections(ordered, savedConfig);

    // Subscribe to route changes to update active section
    this.sub('ROUTER/panel', (panel) => {
      this.$.sections = this.$.sections.map((s) => ({
        ...s,
        isActive: s.sectionId === panel,
      }));
    });
  }

  /**
   * Build sections array from ordered items + config
   * @param {Array<{id: string, icon: string, label: string}>} items
   * @param {Array<{id: string, visible: boolean}>|null} config
   */
  #buildSections(items, config) {
    const visibilityMap = config
      ? new Map(config.map((c) => [c.id, c.visible]))
      : null;

    this.$.sections = items.map((item) => ({
      sectionId: item.id,
      icon: item.icon,
      label: item.label,
      isActive: false,
      isVisible: visibilityMap ? (visibilityMap.get(item.id) ?? true) : true,
      isExpanded: false,
      subPanels: [],
    }));
  }

  /**
   * Toggle visibility of a section
   * @param {string} sectionId
   */
  toggleVisibility(sectionId) {
    this.$.sections = this.$.sections.map((s) => {
      if (s.sectionId !== sectionId) return s;
      return { ...s, isVisible: !s.isVisible };
    });
    this.#saveConfig();
  }

  /**
   * Move section by drag (swap positions)
   * @param {number} fromIndex
   * @param {number} toIndex
   */
  moveSection(fromIndex, toIndex) {
    const arr = [...this.$.sections];
    const [moved] = arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, moved);
    this.$.sections = arr;
    this.#saveConfig();
  }

  /**
   * Reset sections to default order and visibility
   */
  resetConfig() {
    localStorage.removeItem(STORAGE_KEY_CONFIG);
    this.#buildSections(this.#allSections, null);
  }

  /**
   * Save current section order and visibility
   */
  #saveConfig() {
    const config = this.$.sections.map((s) => ({
      id: s.sectionId,
      visible: s.isVisible,
    }));
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  }

  /**
   * Load saved section config
   * @returns {Array<{id: string, visible: boolean}>|null}
   */
  #loadConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  /**
   * Update sub-panel list for a section
   * @param {string} sectionId
   * @param {Array<{title: string, icon: string}>} panels
   */
  updateSubPanels(sectionId, panels) {
    this.$.sections = this.$.sections.map((s) => {
      if (s.sectionId !== sectionId) return s;
      return { ...s, subPanels: panels };
    });
  }
}

LayoutSidebar.template = sidebarTemplate;
LayoutSidebar.rootStyles = sidebarStyles;
LayoutSidebar.reg('layout-sidebar');
