/**
 * @fileoverview Layout - Root container for Blender-style panel layout
 * Uses LayoutNode for recursive BSP tree rendering.
 * Handles action zone events for split/join operations.
 */

import Symbiote from '@symbiotejs/symbiote';
import * as LayoutTree from './../LayoutTree.js';
import { template } from './Layout.tpl.js';
import { styles } from './Layout.css.js';
import './../LayoutNode/LayoutNode.js';
import './../LayoutPreview/LayoutPreview.js';
import './../PanelMenu/PanelMenu.js';

export class Layout extends Symbiote {

  init$ = {
    // Attributes
    '@storage-key': '',
    '@min-panel-size': 50,

    // Layout tree data
    layoutTree: null,

    // Panel type registry
    panelTypes: {},

    // Current gesture state
    activeGesture: null,

    // Fullscreen panel ID (null = no fullscreen)
    fullscreenPanelId: null,

    // Tab bar state for Itemize API
    hasFullscreenTabs: false,
    tabItems: [],

    // Tab click handler for Itemize
    onTabClick: (e) => {
      const panelId = e.target.closest('[data-panel-id]')?.dataset.panelId;
      if (panelId && panelId !== this.$.fullscreenPanelId) {
        this._switchFullscreenPanel(panelId);
      }
    },

    // Methods for LayoutNode to inherit
    onLayoutChange: () => this._saveLayout(),
  };

  /**
   * Register panel type
   * @param {string} name - Panel type name
   * @param {Object} config - Panel configuration
   * @param {string} [config.title] - Default title
   * @param {string} [config.icon] - Material Symbols icon name
   * @param {string} [config.component] - Custom element tag name
   */
  registerPanelType(name, config) {
    this.$.panelTypes = {
      ...this.$.panelTypes,
      [name]: config
    };
  }

  initCallback() {
    this._loadLayout();

    // Listen for layout changes from children
    this.addEventListener('layout-change', () => this._saveLayout());

    // Listen for action zone events
    this.addEventListener('action-zone-start', (e) => this._onActionZoneStart(e));
    this.addEventListener('action-zone-gesture', (e) => this._onActionZoneGesture(e));
    this.addEventListener('action-zone-execute', (e) => this._onActionZoneExecute(e));
    this.addEventListener('action-zone-end', (e) => this._onActionZoneEnd(e));

    // Listen for panel UX events
    this.addEventListener('panel-type-menu', (e) => this._onPanelTypeMenu(e));
    this.addEventListener('panel-type-select', (e) => this._onPanelTypeSelect(e));
    this.addEventListener('panel-fullscreen', (e) => this._onPanelFullscreen(e));
    this.addEventListener('panel-collapse-toggle', (e) => this._onPanelCollapseToggle(e));

    // Global fallback: hide preview when pointer is released anywhere
    // This covers touchpad edge cases when pointer events don't bubble correctly
    this._globalPointerFallback = () => {
      if (this.$.activeGesture) {
        this.$.activeGesture = null;
        if (this.ref.preview) {
          this.ref.preview.hide();
        }
      }
    };
    document.addEventListener('pointerup', this._globalPointerFallback);
    document.addEventListener('pointercancel', this._globalPointerFallback);
  }

  disconnectedCallback() {
    if (this._globalPointerFallback) {
      document.removeEventListener('pointerup', this._globalPointerFallback);
      document.removeEventListener('pointercancel', this._globalPointerFallback);
    }
  }

  renderCallback() {
    this._renderRoot();
    this.sub('layoutTree', () => {
      this._renderRoot();
      // Recalculate tabs if in fullscreen mode
      if (this.$.fullscreenPanelId) {
        // Wait for DOM update, then recalculate tabs
        requestAnimationFrame(() => {
          const allPanels = this.querySelectorAll('layout-node[node-type="panel"]');
          // Check if current fullscreen panel still exists
          const panelExists = Array.from(allPanels).some(p => p.$.nodeId === this.$.fullscreenPanelId);
          if (panelExists) {
            this._updateTabItems(allPanels, this.$.fullscreenPanelId);
          } else {
            // Fullscreen panel was removed, exit fullscreen
            this.$.fullscreenPanelId = null;
            this.$.hasFullscreenTabs = false;
            this.$.tabItems = [];
            allPanels.forEach(p => {
              p.removeAttribute('fullscreen');
              p.$.isFullscreen = false;
              p.style.display = '';
            });
          }
        });
      }
    });
  }

  _loadLayout() {
    const storageKey = this.$['@storage-key'];

    // Try localStorage
    if (storageKey) {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          this.$.layoutTree = LayoutTree.deserialize(stored);
          return;
        } catch (e) {
          console.warn('Failed to load layout:', e);
        }
      }
    }

    // Try layout attribute
    const layoutAttr = this.getAttribute('layout');
    if (layoutAttr) {
      try {
        this.$.layoutTree = JSON.parse(layoutAttr);
        return;
      } catch (e) {
        console.warn('Failed to parse layout:', e);
      }
    }

    // Default single panel
    this.$.layoutTree = LayoutTree.createPanel('default');
  }

  _saveLayout() {
    const storageKey = this.$['@storage-key'];
    if (storageKey && this.$.layoutTree) {
      localStorage.setItem(storageKey, LayoutTree.serialize(this.$.layoutTree));
    }
  }

  _renderRoot() {
    if (!this.$.layoutTree || !this.ref.root) return;

    // Ensure root node exists
    let rootNode = this.ref.root.querySelector('layout-node');
    if (!rootNode) {
      rootNode = document.createElement('layout-node');
      this.ref.root.appendChild(rootNode);
    }

    // Pass data to root node
    rootNode.$.nodeData = this.$.layoutTree;
  }

  // Action Zone Event Handlers

  /**
   * Called when action zone drag starts
   * @param {CustomEvent} e 
   */
  _onActionZoneStart(e) {
    const { panelId, corner } = e.detail;
    this.$.activeGesture = { panelId, corner };
  }

  /**
   * Called during action zone drag with gesture type
   * @param {CustomEvent} e 
   */
  _onActionZoneGesture(e) {
    const { panelId, gesture, dx, dy } = e.detail;

    // Find the panel element
    const panelNode = this._findPanelNode(panelId);
    if (!panelNode) return;

    const panelRect = panelNode.getBoundingClientRect();

    // Show preview
    const preview = this.ref.preview;
    if (!preview) return;

    if (gesture === 'split-h' || gesture === 'split-v') {
      preview.showSplit(gesture, panelRect, 0.5);
    } else if (gesture === 'join') {
      // For join, find the neighbor panel that would be removed
      const neighborInfo = this._findJoinTarget(panelId, dx, dy);
      if (neighborInfo) {
        const neighborNode = this._findPanelNode(neighborInfo.id);
        if (neighborNode) {
          preview.showJoin(neighborNode.getBoundingClientRect());
        }
      }
    }
  }

  /**
   * Called when action zone gesture is completed
   * @param {CustomEvent} e 
   */
  _onActionZoneExecute(e) {
    const { panelId, corner, gesture } = e.detail;

    if (gesture === 'split-h') {
      this.splitPanel(panelId, 'horizontal', 0.5);
    } else if (gesture === 'split-v') {
      this.splitPanel(panelId, 'vertical', 0.5);
    } else if (gesture === 'join') {
      // Join removes the current panel, expanding neighbor
      this.joinPanels(panelId);
    }
  }

  /**
   * Called when action zone drag ends
   * @param {CustomEvent} e 
   */
  _onActionZoneEnd(e) {
    this.$.activeGesture = null;

    // Hide preview
    const preview = this.ref.preview;
    if (preview) {
      preview.hide();
    }
  }

  /**
   * Show panel type selection menu
   * @param {CustomEvent} e 
   */
  _onPanelTypeMenu(e) {
    const { panelId, currentType, x, y } = e.detail;
    const menu = this.ref.menu;
    if (!menu) return;

    // Convert panelTypes to array for menu
    const items = Object.entries(this.$.panelTypes).map(([type, config]) => ({
      type,
      title: config.title || type,
      icon: config.icon || 'dashboard'
    }));

    menu.show(x, y, panelId, currentType, items);
  }

  /**
   * Handle panel type change
   * @param {CustomEvent} e 
   */
  _onPanelTypeSelect(e) {
    const { panelId, type } = e.detail;

    // Update tree
    const tree = this.$.layoutTree;
    if (!tree) return;

    const updateNode = (node) => {
      if (!node) return;
      if (node.id === panelId) {
        node.panelType = type;
        return;
      }
      if (node.first) updateNode(node.first);
      if (node.second) updateNode(node.second);
    };

    updateNode(tree);
    this.$.layoutTree = { ...tree };
    this._saveLayout();
  }

  /**
   * Toggle panel collapse state
   * @param {CustomEvent} e 
   */
  _onPanelCollapseToggle(e) {
    const { panelId, collapsed } = e.detail;
    const tree = this.$.layoutTree;
    if (!tree) return;

    // Update the node's collapsed state in tree
    LayoutTree.updateNode(tree, panelId, { collapsed });

    // Trigger full re-render to propagate changes to all split nodes
    this.$.layoutTree = { ...tree };
    this._renderRoot();
    this._saveLayout();

    // Update both panels' canCollapse state
    // When one panel collapses/expands, both need to recalculate
    requestAnimationFrame(() => {
      const panelNode = this._findPanelNode(panelId);
      if (panelNode) {
        // Find parent split container
        const container = panelNode.parentElement;
        if (container?.classList.contains('split-first') || container?.classList.contains('split-second')) {
          const siblingContainer = container.classList.contains('split-first')
            ? container.parentElement?.querySelector('.split-second')
            : container.parentElement?.querySelector('.split-first');

          // Update sibling panel
          if (siblingContainer) {
            const siblingPanel = siblingContainer.querySelector('layout-node[node-type="panel"]');
            if (siblingPanel?._updatePanelInfo) {
              siblingPanel._updatePanelInfo();
            }
          }

          // Also update the collapsed panel itself (for when it expands)
          if (panelNode._updatePanelInfo) {
            panelNode._updatePanelInfo();
          }
        }
      }
    });
  }

  /**
   * Toggle panel fullscreen
   * @param {CustomEvent} e 
   */
  _onPanelFullscreen(e) {
    const { panelId } = e.detail;
    const panelNode = this._findPanelNode(panelId);
    if (!panelNode) return;

    const allPanels = this.querySelectorAll('layout-node[node-type="panel"]');

    if (this.$.fullscreenPanelId === panelId) {
      // Exit fullscreen
      this.$.fullscreenPanelId = null;
      this.$.hasFullscreenTabs = false;
      this.$.tabItems = [];

      panelNode.removeAttribute('fullscreen');
      panelNode.$.isFullscreen = false;
      panelNode.$.fullscreenIcon = 'fullscreen';

      // Remove fullscreen styles from all panels
      allPanels.forEach((p) => {
        p.removeAttribute('fullscreen');
        p.$.isFullscreen = false;
        p.$.fullscreenIcon = 'fullscreen';
        p.style.display = '';
      });

      // Force layout recalculation
      this._renderRoot();
      this.dispatchEvent(new CustomEvent('layout-change', { bubbles: true }));
    } else {
      // Enter fullscreen
      this.$.fullscreenPanelId = panelId;

      // Hide all panels except fullscreen one
      allPanels.forEach((p) => {
        if (p === panelNode) {
          p.setAttribute('fullscreen', '');
          p.$.isFullscreen = true;
          p.$.fullscreenIcon = 'fullscreen_exit';
          p.style.display = '';
        } else {
          p.style.display = 'none';
        }
      });

      // Update tab bar via Itemize API
      this._updateTabItems(allPanels, panelId);
      this.$.hasFullscreenTabs = true;
    }
  }

  /**
   * Update tabItems array for Itemize-based tab bar
   * @param {NodeListOf<Element>} [allPanels] - Optional, will query DOM if not provided
   * @param {string} [activePanelId] - Optional, defaults to fullscreenPanelId
   */
  _updateTabItems(allPanels, activePanelId) {
    const panels = allPanels || this.querySelectorAll('layout-node[node-type="panel"]');
    const activeId = activePanelId || this.$.fullscreenPanelId;

    this.$.tabItems = Array.from(panels).map((p) => {
      const nodeData = p.$.nodeData;
      const panelType = nodeData?.panelType || 'panel';
      const typeConfig = this.$.panelTypes[panelType] || {};

      return {
        panelId: p.$.nodeId,
        icon: typeConfig.icon || 'dashboard',
        title: typeConfig.title || panelType,
        isActive: p.$.nodeId === activeId
      };
    });
  }

  /**
   * Switch fullscreen to another panel
   * @param {string} panelId - Panel ID to switch to
   */
  _switchFullscreenPanel(panelId) {
    const allPanels = this.querySelectorAll('layout-node[node-type="panel"]');
    const newPanel = this._findPanelNode(panelId);
    if (!newPanel) return;

    // Update panel states
    allPanels.forEach((p) => {
      if (p.$.nodeId === panelId) {
        p.setAttribute('fullscreen', '');
        p.$.isFullscreen = true;
        p.$.fullscreenIcon = 'fullscreen_exit';
        p.style.display = '';
      } else {
        p.removeAttribute('fullscreen');
        p.$.isFullscreen = false;
        p.$.fullscreenIcon = 'fullscreen';
        p.style.display = 'none';
      }
    });

    this.$.fullscreenPanelId = panelId;

    // Update tab bar
    this._updateTabItems(allPanels, panelId);
  }

  /**
   * Find a panel node by ID
   * @param {string} panelId 
   * @returns {HTMLElement|null}
   */
  _findPanelNode(panelId) {
    const nodes = this.querySelectorAll('layout-node[node-type="panel"]');
    for (const node of nodes) {
      if (node.$.nodeId === panelId) {
        return node;
      }
    }
    return null;
  }

  /**
   * Find the neighbor panel for join operation
   * @param {string} panelId 
   * @param {number} dx 
   * @param {number} dy 
   * @returns {{id: string, direction: string}|null}
   */
  _findJoinTarget(panelId, dx, dy) {
    // Find parent split of this panel
    const parentInfo = LayoutTree.findParent(this.$.layoutTree, panelId);
    if (!parentInfo) return null;

    const { parent, which } = parentInfo;

    // The sibling is the join target (the panel that will expand)
    const sibling = which === 'first' ? parent.second : parent.first;
    if (!sibling) return null;

    // For nested splits, get the leaf panel ID
    const siblingId = this._getFirstPanelId(sibling);

    return { id: siblingId, direction: parent.direction };
  }

  /**
   * Get the first panel ID from a node (handles nested splits)
   * @param {Object} node 
   * @returns {string}
   */
  _getFirstPanelId(node) {
    if (node.type === 'panel') return node.id;
    // For split nodes, recursively get first panel
    return this._getFirstPanelId(node.first);
  }


  // Public API

  /**
   * Split a panel
   * @param {string} panelId - Panel ID to split
   * @param {'horizontal' | 'vertical'} direction - Split direction
   * @param {number} [ratio=0.5] - Split ratio
   * @param {string} [newPanelType] - Type for new panel
   */
  splitPanel(panelId, direction, ratio = 0.5, newPanelType) {
    const newTree = LayoutTree.splitPanel(
      LayoutTree.clone(this.$.layoutTree),
      panelId,
      direction,
      ratio,
      newPanelType
    );

    if (newTree) {
      this.$.layoutTree = newTree;
      this._saveLayout();
    }
  }

  /**
   * Join panels (remove one)
   * @param {string} panelToRemove - Panel ID to remove
   */
  joinPanels(panelToRemove) {
    const newTree = LayoutTree.joinPanels(
      LayoutTree.clone(this.$.layoutTree),
      panelToRemove
    );

    if (newTree) {
      this.$.layoutTree = newTree;
      this._saveLayout();
    }
  }

  /**
   * Get current layout
   * @returns {import('./../LayoutTree.js').LayoutNode}
   */
  getLayout() {
    return LayoutTree.clone(this.$.layoutTree);
  }

  /**
   * Set layout
   * @param {import('./../LayoutTree.js').LayoutNode} layout
   */
  setLayout(layout) {
    // Clear fullscreen state
    if (this.$.fullscreenPanelId) {
      const panelNode = this._findPanelNode(this.$.fullscreenPanelId);
      if (panelNode) {
        panelNode.removeAttribute('fullscreen');
        panelNode.$.isFullscreen = false;
        panelNode.$.fullscreenIcon = 'fullscreen';
        panelNode.style.left = '';
        panelNode.style.width = '';
      }
      this.$.fullscreenPanelId = null;
      this.$.hasFullscreenTabs = false;
      this.$.tabItems = [];
    }

    // Clear stripe mode from all panels
    this.querySelectorAll('layout-node[stripe]').forEach((node) => {
      node.removeAttribute('stripe');
      node.style.left = '';
      node.style.top = '';
      node.style.width = '';
      node.style.height = '';
    });

    // Clear all collapsed states from DOM
    this.querySelectorAll('layout-node[collapsed]').forEach((node) => {
      node.removeAttribute('collapsed');
      node.removeAttribute('collapse-dir');
      node.$.isCollapsed = false;
      // Reset collapse icon based on direction
      if (node.$.collapseDirection === 'horizontal') {
        node.$.collapseIcon = 'chevron_left';
      } else {
        node.$.collapseIcon = 'expand_less';
      }
    });

    // Clear container collapsed-child attributes
    this.querySelectorAll('[collapsed-child]').forEach((el) => {
      el.removeAttribute('collapsed-child');
      el.removeAttribute('saved-ratio');
      el.style.width = '';
      el.style.height = '';
      el.style.flex = '';
    });

    this.$.layoutTree = layout;
    this._saveLayout();
  }
}

Layout.template = template;
Layout.rootStyles = styles;

Layout.reg('panel-layout');

