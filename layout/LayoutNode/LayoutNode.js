/**
 * @fileoverview LayoutNode - Universal recursive layout node
 * Renders panel or split based on node type.
 * Split nodes recursively create child LayoutNodes.
 * Panels include action zones for split/join gestures.
 */

import Symbiote from '@symbiotejs/symbiote';
import { template } from './LayoutNode.tpl.js';
import { styles } from './LayoutNode.css.js';
import './../ActionZone/ActionZone.js';

export class LayoutNode extends Symbiote {

  init$ = {
    // Node data
    nodeData: null,

    // Computed values (updated in sub())
    nodeType: 'panel',
    isPanel: true,
    isSplit: false,
    direction: 'horizontal',
    ratio: 0.5,
    panelType: 'default',
    nodeId: '',

    // Panel display
    panelTitle: 'Panel',
    panelIcon: 'dashboard',

    // Panel states
    isCollapsed: false,
    canCollapse: true, // Whether collapse is possible (has sibling panel)
    collapseDirection: 'vertical', // 'vertical' or 'horizontal' - based on parent split
    collapseIcon: 'expand_less',
    savedRatio: 0.5, // Saved ratio before collapse for proper restore
    isFullscreen: false,
    fullscreenIcon: 'fullscreen',

    // Split sizing
    firstStyle: '',
    secondStyle: '',

    // Inherited from Layout
    '^panelTypes': {},
    '^fullscreenPanelId': null,

    // Handlers
    onResizerDown: (e) => this._startResize(e),
    onTypeClick: (e) => this._showTypeMenu(e),
    onCollapseClick: () => this._toggleCollapse(),
    onExpandClick: () => this._toggleCollapse(), // Alias for collapsed state
    onFullscreenClick: () => this._toggleFullscreen(),
  };

  renderCallback() {
    // Subscribe to nodeData changes and update computed values
    this.sub('nodeData', (data) => {
      if (!data) return;

      this.$.nodeType = data.type || 'panel';
      this.$.isPanel = this.$.nodeType === 'panel';
      this.$.isSplit = this.$.nodeType === 'split';
      this.$.direction = data.direction || 'horizontal';
      this.$.ratio = data.ratio || 0.5;
      this.$.panelType = data.panelType || 'default';
      this.$.nodeId = data.id || '';

      // Read collapsed state from data (declarative)
      if (data.type === 'panel') {
        this.$.isCollapsed = data.collapsed || false;
        if (this.$.isCollapsed) {
          this.setAttribute('collapsed', '');
          this.setAttribute('collapse-dir', this.$.collapseDirection);
        } else {
          this.removeAttribute('collapsed');
          this.removeAttribute('collapse-dir');
        }
        // Update icon based on direction
        if (this.$.isCollapsed) {
          if (this.$.collapseDirection === 'horizontal') {
            this.$.collapseIcon = 'chevron_right';
          } else {
            this.$.collapseIcon = 'expand_more';
          }
        } else {
          if (this.$.collapseDirection === 'horizontal') {
            this.$.collapseIcon = 'chevron_left';
          } else {
            this.$.collapseIcon = 'expand_less';
          }
        }
      }

      this._updateStyles();
      this._updatePanelInfo();
      this._renderNode(data);
    });

    // Subscribe to panelTypes changes to update icons when registered after render
    this.sub('^panelTypes', () => {
      this._updatePanelInfo();
    });

    // Subscribe to panelType changes to inject component when type changes via menu
    this.sub('panelType', () => {
      this._updatePanelInfo();
    });

    // Initial render if data already set
    if (this.$.nodeData) {
      this.sub('nodeData', (d) => { }); // Trigger subscription
    }
  }

  _updateStyles() {
    const ratio = this.$.ratio;
    const dir = this.$.direction;
    const data = this.$.nodeData;

    // Check if children are collapsed (declarative from nodeData)
    const firstCollapsed = data?.first?.collapsed || false;
    const secondCollapsed = data?.second?.collapsed || false;

    // Collapsed size constants
    const COLLAPSED_SIZE = dir === 'horizontal' ? '32px' : '28px';

    if (firstCollapsed) {
      // First child collapsed - fixed size, second expands
      if (dir === 'horizontal') {
        this.$.firstStyle = `width: ${COLLAPSED_SIZE}; height: 100%; flex: 0 0 ${COLLAPSED_SIZE};`;
        this.$.secondStyle = 'flex: 1; height: 100%;';
      } else {
        this.$.firstStyle = `height: ${COLLAPSED_SIZE}; width: 100%; flex: 0 0 ${COLLAPSED_SIZE};`;
        this.$.secondStyle = 'flex: 1; width: 100%;';
      }
    } else if (secondCollapsed) {
      // Second child collapsed - first expands, fixed size
      if (dir === 'horizontal') {
        this.$.firstStyle = 'flex: 1; height: 100%;';
        this.$.secondStyle = `width: ${COLLAPSED_SIZE}; height: 100%; flex: 0 0 ${COLLAPSED_SIZE};`;
      } else {
        this.$.firstStyle = 'flex: 1; width: 100%;';
        this.$.secondStyle = `height: ${COLLAPSED_SIZE}; width: 100%; flex: 0 0 ${COLLAPSED_SIZE};`;
      }
    } else {
      // Normal ratio-based sizing
      if (dir === 'horizontal') {
        this.$.firstStyle = `width: ${ratio * 100}%; height: 100%;`;
        this.$.secondStyle = `width: ${(1 - ratio) * 100}%; height: 100%;`;
      } else {
        this.$.firstStyle = `height: ${ratio * 100}%; width: 100%;`;
        this.$.secondStyle = `height: ${(1 - ratio) * 100}%; width: 100%;`;
      }
    }
  }

  _updatePanelInfo() {
    const panelTypes = this.$['^panelTypes'] || {};
    const config = panelTypes[this.$.panelType] || {};
    this.$.panelTitle = config.title || this.$.panelType;
    this.$.panelIcon = config.icon || 'dashboard';

    // Inject component if specified and not already created
    this._injectPanelComponent(config);

    // Check if panel can collapse (must be child of a split)
    const container = this.parentElement;
    const isSplitChild = container && (container.classList.contains('split-first') || container.classList.contains('split-second'));

    // Additional safety check: Ensure sibling exists and is not collapsed
    let siblingExists = false;
    let siblingCollapsed = false;
    let isFirst = false;

    if (isSplitChild) {
      isFirst = container.classList.contains('split-first');
      // Use :scope > to find direct child only, not nested ones
      const siblingContainer = isFirst
        ? container.parentElement.querySelector(':scope > .split-second')
        : container.parentElement.querySelector(':scope > .split-first');
      siblingExists = !!siblingContainer;

      // Check if sibling panel is collapsed (direct child panel only)
      if (siblingContainer) {
        const siblingNode = siblingContainer.querySelector(':scope > layout-node');
        // Only check collapsed state if sibling is a panel
        if (siblingNode?.getAttribute('node-type') === 'panel') {
          siblingCollapsed = siblingNode.$.isCollapsed || false;
        }
      }
    }

    // If we are a panel, update canCollapse based on position
    if (this.$.nodeType === 'panel') {
      // Can't collapse if no sibling OR if sibling is already collapsed (would leave empty space)
      this.$.canCollapse = !!isSplitChild && siblingExists && !siblingCollapsed;

      if (isSplitChild) {
        // Update direction based on parent split
        let parentNode = container.closest('layout-node');
        if (!parentNode && container.getRootNode() instanceof ShadowRoot) {
          parentNode = container.getRootNode().host;
        }

        if (parentNode) {
          const parentDir = parentNode.getAttribute('direction');
          this.$.collapseDirection = parentDir;

          // Arrow shows direction panel will collapse TO:
          // First panel collapses left/up, second panel collapses right/down
          if (!this.$.isCollapsed) {
            if (parentDir === 'horizontal') {
              this.$.collapseIcon = isFirst ? 'chevron_left' : 'chevron_right';
            } else {
              this.$.collapseIcon = isFirst ? 'expand_less' : 'expand_more';
            }
          }
        }
      }
    }
  }

  /**
   * Inject custom component into panel content.
   * Hides existing components instead of destroying them to preserve state.
   * Uses style.display instead of hidden attribute because components may have
   * CSS rules (e.g. display:block) that override the hidden attribute.
   * @param {Object} config - Panel type configuration
   */
  _injectPanelComponent(config) {
    const contentEl = this.ref.panelContent;
    if (!contentEl) return;

    const componentTag = config.component;
    if (!componentTag) return;

    // Hide all existing panel components via inline style (overrides CSS)
    for (const child of contentEl.children) {
      child.style.display = 'none';
    }

    // Check if target component already exists — show it
    const existing = contentEl.querySelector(componentTag);
    if (existing) {
      existing.style.display = '';
      return;
    }

    // Create new component
    const component = document.createElement(componentTag);
    component.setAttribute('data-panel-id', this.$.nodeData?.id || '');
    contentEl.appendChild(component);
  }

  _renderNode(data) {
    // Update attributes for CSS selectors
    const prevType = this.getAttribute('node-type');
    this.setAttribute('node-type', data.type);

    if (data.type === 'split') {
      this.setAttribute('direction', data.direction);
      this._renderSplit(data);
    } else {
      this.removeAttribute('direction');

      // CRITICAL: Clean up child nodes if we changed from split to panel
      // This prevents orphan layout-node elements staying in DOM
      if (prevType === 'split') {
        if (this.ref.first) this.ref.first.innerHTML = '';
        if (this.ref.second) this.ref.second.innerHTML = '';
      }

      // For panels, setup action zones
      this._setupActionZones(data.id);
      // Ensure collapse status is updated
      this._updatePanelInfo();
    }
  }

  _renderSplit(data) {
    // Create child nodes for first and second
    // Pass the current split direction so panels know which way to collapse
    if (data.first && this.ref.first) {
      this._ensureChildNode(this.ref.first, data.first);
    }
    if (data.second && this.ref.second) {
      this._ensureChildNode(this.ref.second, data.second);
    }
  }

  /**
   * @param {HTMLElement} container 
   * @param {Object} nodeData 
   */
  _ensureChildNode(container, nodeData) {
    let child = container.querySelector('layout-node');
    if (!child) {
      child = document.createElement('layout-node');
      container.appendChild(child);
      // Wait for child to initialize then update info
      setTimeout(() => child._updatePanelInfo && child._updatePanelInfo());
    }
    // Use shallow copy to ensure subscription triggers even if only nested properties changed
    child.$.nodeData = { ...nodeData };
  }

  _setupActionZones(panelId) {
    // Action zones are in the template, just set their panel ID
    const zones = this.querySelectorAll('action-zone');
    zones.forEach((zone) => {
      zone.$.panelId = panelId;
    });
  }

  _startResize(e) {
    e.preventDefault();
    const startPos = this.$.direction === 'horizontal' ? e.clientX : e.clientY;
    const startRatio = this.$.ratio;

    this.setAttribute('resizing', '');

    // Collapse thresholds
    const COLLAPSE_THRESHOLD = 0.05;
    const UNCOLLAPSE_THRESHOLD = 0.08;

    const onMove = (moveEvent) => {
      const rect = this.getBoundingClientRect();
      const currentPos = this.$.direction === 'horizontal' ? moveEvent.clientX : moveEvent.clientY;
      const containerSize = this.$.direction === 'horizontal' ? rect.width : rect.height;
      const startOffset = this.$.direction === 'horizontal' ? rect.left : rect.top;

      // Calculate new ratio based on mouse position relative to container
      let rawRatio = (currentPos - startOffset) / containerSize;

      // Get first and second child nodes
      const firstChild = this.ref.first?.querySelector('layout-node');
      const secondChild = this.ref.second?.querySelector('layout-node');

      // Check for collapse/uncollapse of first panel
      if (rawRatio < COLLAPSE_THRESHOLD && firstChild && !firstChild.$.isCollapsed) {
        // Collapse first panel
        firstChild._setCollapsed(true);
        return; // Don't update styles further when collapsed
      } else if (rawRatio > UNCOLLAPSE_THRESHOLD && firstChild?.$.isCollapsed) {
        // Uncollapse first panel
        firstChild._setCollapsed(false);
      }

      // Check for collapse/uncollapse of second panel
      if (rawRatio > (1 - COLLAPSE_THRESHOLD) && secondChild && !secondChild.$.isCollapsed) {
        // Collapse second panel
        secondChild._setCollapsed(true);
        return; // Don't update styles further when collapsed
      } else if (rawRatio < (1 - UNCOLLAPSE_THRESHOLD) && secondChild?.$.isCollapsed) {
        // Uncollapse second panel
        secondChild._setCollapsed(false);
      }

      // Skip style updates if any panel is still collapsed
      if (firstChild?.$.isCollapsed || secondChild?.$.isCollapsed) {
        return;
      }

      // Clamp ratio
      let newRatio = Math.max(0.1, Math.min(0.9, rawRatio));

      // Update ratio and styles
      this.$.ratio = newRatio;
      this._updateStyles();

      // Update nodeData for persistence
      if (this.$.nodeData) {
        this.$.nodeData.ratio = newRatio;
      }

      // Notify parent
      this._notifyChange();
    };

    const onUp = () => {
      this.removeAttribute('resizing');
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }

  _notifyChange() {
    this.dispatchEvent(new CustomEvent('layout-change', {
      bubbles: true,
      detail: { nodeId: this.$.nodeId }
    }));
  }

  _toggleCollapse() {
    // Dispatch event to Layout - it will update the tree data
    // which triggers a re-render with declarative collapsed handling
    this.dispatchEvent(new CustomEvent('panel-collapse-toggle', {
      bubbles: true,
      composed: true,
      detail: {
        panelId: this.$.nodeId,
        collapsed: !this.$.isCollapsed
      }
    }));
  }

  /**
   * Programmatically set collapsed state (used by resize gesture)
   * @param {boolean} collapsed 
   */
  _setCollapsed(collapsed) {
    if (this.$.isCollapsed === collapsed) return;

    // Dispatch event to Layout - it will update the tree data
    this.dispatchEvent(new CustomEvent('panel-collapse-toggle', {
      bubbles: true,
      composed: true,
      detail: {
        panelId: this.$.nodeId,
        collapsed: collapsed
      }
    }));
  }

  _toggleFullscreen() {
    // Don't allow fullscreen when collapsed
    if (this.$.isCollapsed) return;

    this.dispatchEvent(new CustomEvent('panel-fullscreen', {
      bubbles: true,
      composed: true,
      detail: { panelId: this.$.nodeId }
    }));
  }

  _showTypeMenu(e) {
    // Don't show type menu when collapsed
    if (this.$.isCollapsed) return;

    const rect = e.target.getBoundingClientRect();
    this.dispatchEvent(new CustomEvent('panel-type-menu', {
      bubbles: true,
      composed: true,
      detail: {
        panelId: this.$.nodeId,
        currentType: this.$.panelType,
        x: rect.left,
        y: rect.bottom + 4
      }
    }));
  }
}

LayoutNode.template = template;
LayoutNode.rootStyles = styles;

LayoutNode.reg('layout-node');

