/**
 * QuickToolbar — floating action bar above selected node
 *
 * Shows contextual SVG buttons when a single node is selected:
 * Delete, Duplicate, Mute.
 * Positioned above the node and follows zoom/pan transform.
 *
 * @module symbiote-node/toolbar/QuickToolbar
 */

import Symbiote from '@symbiotejs/symbiote';
import { ensureMaterialSymbols } from '../../icons/MaterialSymbols.js';
import {
  bringOverlayToFront,
  mountOverlayToDocument,
  restoreOverlayHome,
} from '../../ui/overlay-stack.js';
import '../../control/Button/Button.js';
import { template } from './QuickToolbar.tpl.js';
import { styles } from './QuickToolbar.css.js';

/**
 * @typedef {object} ToolbarAction
 * @property {string} id - Action identifier
 * @property {string} icon - Material Symbols icon name
 * @property {string} label - Tooltip text
 */

/** @type {ToolbarAction[]} */
const ACTIONS = [
  { id: 'duplicate', icon: 'content_copy', label: 'Duplicate' },
  { id: 'mute', icon: 'visibility_off', label: 'Mute' },
  { id: 'delete', icon: 'delete', label: 'Delete' },
];
const ICONS = [
  'code',
  'content_copy',
  'delete',
  'hub',
  'login',
  'visibility',
  'visibility_off',
];

export class QuickToolbar extends Symbiote {
  init$ = {
    items: ACTIONS,
    visible: false,
    hasTitle: false,
    nodeTitle: '',
    onBtnClick: (/** @type {Event} */ e) => {
      let btn = e.target.closest('[data-action]');
      if (!btn) return;
      let action = btn.getAttribute('data-action');
      if (this._onAction) this._onAction(action, this._nodeId);
    },
  };

  /** @type {string|null} */
  _nodeId = null;

  /** @type {function|null} */
  _onAction = null;

  /** @type {HTMLElement|null} */
  _nodeEl = null;

  /** @type {number} */
  _hideTimer = 0;

  /** @type {boolean} */
  _hoverInside = false;

  /** @type {boolean} */
  _sticky = false;

  /** @type {boolean} */
  _hoverEventsBound = false;

  /** @type {number} Toolbar height + gap */
  static OFFSET_Y = 48;

  /** @type {number} Gap between the toolbar block and the node */
  static GAP_Y = 6;

  /** @type {number} Delay that lets the pointer cross the node-toolbar gap */
  static HIDE_DELAY = 160;

  /** @type {number} */
  static TOOLBAR_EDGE_INSET = 16;

  /** @type {{ zoom: number, panX: number, panY: number }} */
  _transform = { zoom: 1, panX: 0, panY: 0 };

  /**
   * Show toolbar above a node
   * @param {string} nodeId
   * @param {HTMLElement} nodeEl - The graph-node element
   * @param {{ sticky?: boolean }} [options]
   */
  show(nodeId, nodeEl, options = {}) {
    this.cancelHide();
    this._nodeId = nodeId;
    this._nodeEl = nodeEl;
    this._sticky = Boolean(options.sticky);
    let themeSource = nodeEl.closest?.('node-canvas') || nodeEl;
    mountOverlayToDocument(this, themeSource);
    this.#syncTitle(nodeEl);
    this.#updateIcons(nodeEl);
    let enterBtn = this.querySelector('[data-action="enter"]');
    if (enterBtn) {
      enterBtn.hidden = nodeEl.getAttribute('node-type') !== 'subgraph';
    }
    this.$.visible = true;
    this.toggleAttribute('hidden', false);
    bringOverlayToFront(this);

    this.#fitToolbarWidth();
    this.#positionAtNode(nodeEl);
    requestAnimationFrame(() => {
      if (this._nodeEl !== nodeEl) return;
      this.#fitToolbarWidth();
      this.#positionAtNode(nodeEl);
    });
  }

  /** Hide toolbar */
  hide() {
    this.cancelHide();
    this._nodeId = null;
    this._nodeEl = null;
    this._sticky = false;
    this._hoverInside = false;
    this.$.visible = false;
    this.$.hasTitle = false;
    this.$.nodeTitle = '';
    this.toggleAttribute('data-has-title', false);
    this.style.removeProperty('--sn-toolbar-fit-width');
    restoreOverlayHome(this);
  }

  renderCallback() {
    ensureMaterialSymbols(ICONS);
    if (!this._hoverEventsBound) {
      this.addEventListener('pointerenter', () => {
        this._hoverInside = true;
        this.cancelHide();
        bringOverlayToFront(this);
      });
      this.addEventListener('pointerleave', () => {
        this._hoverInside = false;
        this.scheduleHide();
      });
      this._hoverEventsBound = true;
    }
    this.sub('visible', (val) => {
      this.toggleAttribute('hidden', !val);
    });
  }

  /**
   * Keep the toolbar visible while the pointer travels from a node into it.
   * @param {number} [delay]
   * @param {string|null} [nodeId]
   */
  scheduleHide(delay = QuickToolbar.HIDE_DELAY, nodeId = this._nodeId) {
    this.cancelHide();
    let activeNodeId = nodeId;
    if (typeof setTimeout !== 'function') {
      if (!this._hoverInside && !this._sticky) this.hide();
      return;
    }
    this._hideTimer = setTimeout(() => {
      this._hideTimer = 0;
      if (this._nodeId !== activeNodeId) return;
      if (this._hoverInside || this._sticky) return;
      this.hide();
    }, delay);
  }

  cancelHide() {
    if (!this._hideTimer) return;
    clearTimeout(this._hideTimer);
    this._hideTimer = 0;
  }

  /**
   * Update position to follow node movement
   * @param {HTMLElement} nodeEl
   */
  updatePosition(nodeEl) {
    if (!this._nodeId) return;
    this.#positionAtNode(nodeEl);
  }

  /**
   * Position toolbar centered above a node in screen-space.
   * @param {HTMLElement} nodeEl
   */
  #positionAtNode(nodeEl) {
    let toolbarEl = this.querySelector('.toolbar');
    let toolbarHeight = toolbarEl?.offsetHeight || (QuickToolbar.OFFSET_Y - QuickToolbar.GAP_Y);
    let offsetY = toolbarHeight + QuickToolbar.GAP_Y;
    let nodeRect = nodeEl.getBoundingClientRect?.();
    let containerRect = this.parentElement?.getBoundingClientRect?.();

    if (nodeRect && containerRect) {
      if (this.hasAttribute('data-overlay-portal')) {
        let x = nodeRect.left + nodeRect.width / 2;
        let toolbarWidth = toolbarEl?.offsetWidth || 0;
        let viewportWidth = this.ownerDocument?.documentElement?.clientWidth || window.innerWidth || 0;
        let edgeInset = QuickToolbar.TOOLBAR_EDGE_INSET;
        if (toolbarWidth && viewportWidth) {
          if (viewportWidth > toolbarWidth + edgeInset * 2) {
            x = Math.min(
              Math.max(x, edgeInset + toolbarWidth / 2),
              viewportWidth - edgeInset - toolbarWidth / 2
            );
          } else {
            x = viewportWidth / 2;
          }
        }
        let y = nodeRect.top - offsetY;
        this.style.transform = `translate(${x}px, ${y}px)`;
        return;
      }

      let x = nodeRect.left - containerRect.left + nodeRect.width / 2;
      let y = nodeRect.top - containerRect.top - offsetY;
      this.style.transform = `translate(${x}px, ${y}px)`;
      return;
    }

    let w = nodeEl.offsetWidth || nodeEl._cachedW || 180;
    let pos = nodeEl._position || { x: 0, y: 0 };
    let x = pos.x + w / 2;
    let y = pos.y - offsetY;
    this.style.transform = `translate(${x}px, ${y}px)`;
  }

  /**
   * Show the node title inside the toolbar only when the node has no visible own header.
   * @param {HTMLElement} nodeEl
   */
  #syncTitle(nodeEl) {
    let title = nodeEl.getAttribute('node-label') || nodeEl.querySelector('.sn-node-label')?.textContent?.trim() || '';
    let hasOwnHeader = !nodeEl.hasAttribute('data-header-hidden') && !nodeEl.hasAttribute('data-svg-shape');
    let hasTitle = Boolean(title && !hasOwnHeader);

    this.$.hasTitle = hasTitle;
    this.$.nodeTitle = hasTitle ? title : '';
    this.toggleAttribute('data-has-title', hasTitle);

    let titleRow = this.querySelector('.toolbar-title');
    let titleText = this.querySelector('.toolbar-title-text');
    if (titleText) titleText.textContent = this.$.nodeTitle;
    if (titleRow) titleRow.hidden = !hasTitle;
  }

  #fitToolbarWidth() {
    let toolbarEl = this.querySelector('.toolbar');
    if (!toolbarEl) return;
    this.style.removeProperty('--sn-toolbar-fit-width');
    if (!this.$.hasTitle) return;

    let titleText = this.querySelector('.toolbar-title-text');
    let titleRow = this.querySelector('.toolbar-title');
    if (!titleText || !titleRow || !titleText.textContent) return;

    let toolbarStyle = getComputedStyle(toolbarEl);
    let titleStyle = getComputedStyle(titleText);
    let rowStyle = getComputedStyle(titleRow);
    let viewportWidth = this.ownerDocument?.documentElement?.clientWidth || window.innerWidth || 0;
    let maxWidth = Number.parseFloat(toolbarStyle.maxInlineSize);
    if (!Number.isFinite(maxWidth) || maxWidth <= 0) {
      maxWidth = Math.max(0, viewportWidth - QuickToolbar.TOOLBAR_EDGE_INSET * 2);
    }

    let minWidth = Number.parseFloat(getComputedStyle(this).getPropertyValue('--sn-toolbar-title-min-width'));
    if (!Number.isFinite(minWidth) || minWidth <= 0) minWidth = 0;

    let actionWidth = this.#measureActionWidth();
    let paddingX =
      Number.parseFloat(rowStyle.paddingLeft) +
      Number.parseFloat(rowStyle.paddingRight) +
      Number.parseFloat(rowStyle.borderLeftWidth) +
      Number.parseFloat(rowStyle.borderRightWidth);
    if (!Number.isFinite(paddingX)) paddingX = 0;

    let lineHeight = Number.parseFloat(titleStyle.lineHeight);
    if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
      lineHeight = Number.parseFloat(titleStyle.fontSize) * 1.35;
    }
    let maxLines = Number.parseInt(getComputedStyle(this).getPropertyValue('--sn-toolbar-title-lines'), 10);
    if (!Number.isFinite(maxLines) || maxLines < 1) maxLines = 2;

    let measuredTextWidth = this.#measureTitleTextWidth(titleText.textContent, titleStyle, lineHeight, maxLines, Math.max(1, maxWidth - paddingX));
    let nextWidth = Math.ceil(Math.max(measuredTextWidth + paddingX, actionWidth, minWidth));
    nextWidth = Math.min(nextWidth, maxWidth);
    this.style.setProperty('--sn-toolbar-fit-width', `${nextWidth}px`);
  }

  #measureActionWidth() {
    let actions = this.querySelector('.toolbar-actions');
    if (!actions) return 0;

    let style = getComputedStyle(actions);
    let gap = Number.parseFloat(style.columnGap || style.gap);
    if (!Number.isFinite(gap)) gap = 0;
    let width = Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight);
    if (!Number.isFinite(width)) width = 0;

    let visibleItems = Array.from(actions.children).filter((item) => !item.hidden);
    visibleItems.forEach((item, index) => {
      width += item.getBoundingClientRect?.().width || item.offsetWidth || 0;
      if (index > 0) width += gap;
    });

    return Math.ceil(width);
  }

  #measureTitleTextWidth(text, titleStyle, lineHeight, maxLines, maxContentWidth) {
    let doc = this.ownerDocument;
    let probe = doc.createElement('div');
    probe.textContent = text;
    probe.style.position = 'fixed';
    probe.style.left = '-10000px';
    probe.style.top = '0';
    probe.style.visibility = 'hidden';
    probe.style.pointerEvents = 'none';
    probe.style.contain = 'layout style paint';
    probe.style.boxSizing = 'content-box';
    probe.style.fontFamily = titleStyle.fontFamily;
    probe.style.fontSize = titleStyle.fontSize;
    probe.style.fontStyle = titleStyle.fontStyle;
    probe.style.fontWeight = titleStyle.fontWeight;
    probe.style.letterSpacing = titleStyle.letterSpacing;
    probe.style.lineHeight = titleStyle.lineHeight;
    probe.style.whiteSpace = 'normal';
    probe.style.overflowWrap = 'anywhere';
    probe.style.textWrap = 'balance';
    doc.body.appendChild(probe);

    let low = 1;
    let high = Math.max(1, maxContentWidth);
    let allowedHeight = lineHeight * maxLines + 1;
    for (let i = 0; i < 10; i += 1) {
      let mid = (low + high) / 2;
      probe.style.width = `${mid}px`;
      if (probe.scrollHeight <= allowedHeight) {
        high = mid;
      } else {
        low = mid;
      }
    }
    probe.remove();
    return high;
  }

  /**
   * Update toggle icons based on node state
   * @param {HTMLElement} nodeEl
   */
  #updateIcons(nodeEl) {
    let isMuted = nodeEl.hasAttribute('data-muted');

    let muteBtn = this.querySelector('[data-action="mute"] .tb-icon');

    if (muteBtn) muteBtn.textContent = isMuted ? 'visibility' : 'visibility_off';
  }
}

QuickToolbar.template = template;
QuickToolbar.rootStyles = styles;
QuickToolbar.reg('quick-toolbar');
