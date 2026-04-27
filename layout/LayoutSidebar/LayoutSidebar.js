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
const STORAGE_KEY_WIDTH = 'sn-sidebar-width';

export class LayoutSidebar extends Symbiote {
  static isoMode = true;

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

    // Restore collapsed state (default: collapsed)
    if (typeof localStorage !== 'undefined') {
      let stored = localStorage.getItem(STORAGE_KEY_COLLAPSED);
      if (stored === null || stored === 'true') {
        this.$.collapsed = true;
      }

      // Restore saved width
      let savedWidth = localStorage.getItem(STORAGE_KEY_WIDTH);
      if (savedWidth) this.style.width = savedWidth + 'px';
    }

    // Persist collapsed state
    this.sub('collapsed', (val) => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_COLLAPSED, String(val));
        // Reset inline width when collapsing (CSS handles 48px)
        if (val) {
          this.style.width = '';
          this.style.minWidth = '';
        } else {
          // Restore saved width when expanding
          let w = localStorage.getItem(STORAGE_KEY_WIDTH);
          if (w) {
            this.style.width = w + 'px';
            this.style.minWidth = w + 'px';
          }
        }
      }
    });

    // Resize drag handle
    let handle = this.querySelector('.sb-resize-handle');
    if (handle) {
      let startX = 0;
      let startW = 0;

      let onMove = (e) => {
        let newWidth = Math.max(120, Math.min(600, startW + (e.clientX - startX)));
        this.style.width = newWidth + 'px';
        this.style.minWidth = newWidth + 'px';
        this.style.transition = 'none';
      };

      let onUp = () => {
        handle.classList.remove('dragging');
        this.style.transition = '';
        let w = this.offsetWidth;
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_WIDTH, w);
        }
        if (typeof document !== 'undefined') {
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
        }
      };

      handle.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        startX = e.clientX;
        startW = this.offsetWidth;
        handle.classList.add('dragging');
        if (typeof document !== 'undefined') {
          document.addEventListener('pointermove', onMove);
          document.addEventListener('pointerup', onUp);
        }
      });
    }
  }

  /**
   * Configure sidebar sections
   * @param {Array<{id: string, icon: string, label: string}>} items
   */
  setSections(items) {
    this.#allSections = items;

    // Load saved config (order + visibility)
    let savedConfig = this.#loadConfig();
    let ordered = items;

    if (savedConfig) {
      // Reorder based on saved order
      let orderMap = new Map(savedConfig.map((c, i) => [c.id, i]));
      ordered = [...items].sort((a, b) => {
        let ai = orderMap.get(a.id) ?? 999;
        let bi = orderMap.get(b.id) ?? 999;
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
    let visibilityMap = config
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
    let arr = [...this.$.sections];
    let [moved] = arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, moved);
    this.$.sections = arr;
    this.#saveConfig();
  }

  /**
   * Reset sections to default order and visibility
   */
  resetConfig() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_CONFIG);
    }
    this.#buildSections(this.#allSections, null);
  }

  /**
   * Save current section order and visibility
   */
  #saveConfig() {
    let config = this.$.sections.map((s) => ({
      id: s.sectionId,
      visible: s.isVisible,
    }));
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    }
  }

  /**
   * Load saved section config
   * @returns {Array<{id: string, visible: boolean}>|null}
   */
  #loadConfig() {
    try {
      if (typeof localStorage !== 'undefined') {
        let raw = localStorage.getItem(STORAGE_KEY_CONFIG);
        return raw ? JSON.parse(raw) : null;
      }
    } catch {
      return null;
    }
    return null;
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

  /**
   * Mark sections as disabled (shown but not clickable)
   * @param {string[]} disabledIds - Section IDs to disable
   */
  setDisabledSections(disabledIds) {
    let disabledSet = new Set(disabledIds);
    this.$.sections = this.$.sections.map((s) => ({
      ...s,
      isDisabled: disabledSet.has(s.sectionId),
    }));
  }
}

LayoutSidebar.template = sidebarTemplate;
LayoutSidebar.rootStyles = sidebarStyles;
LayoutSidebar.reg('layout-sidebar');
