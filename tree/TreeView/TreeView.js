import { Symbiote } from '@symbiotejs/symbiote';
import template from './TreeView.tpl.js';
import css from './TreeView.css.js';

function emit(el, type, detail = {}) {
  el.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true, detail }));
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeCssValue(value = '') {
  if (globalThis.CSS?.escape) return globalThis.CSS.escape(String(value));
  return String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

function normalizeBadges(badges = []) {
  if (!Array.isArray(badges)) return [];
  return badges
    .map((badge) => {
      if (badge && typeof badge === 'object') return badge.label || badge.text || badge.value || '';
      return badge;
    })
    .filter((badge) => badge !== null && badge !== undefined && badge !== '');
}

function textMatches(item, needle) {
  if (!needle) return true;
  let fields = [item.label, item.kind, item.icon, item.path, item.id, ...normalizeBadges(item.badges)];
  return fields.some((field) => String(field || '').toLowerCase().includes(needle));
}

function hasStorage() {
  return typeof localStorage !== 'undefined' && localStorage;
}

export class TreeView extends Symbiote {
  #items = [];
  #selectedId = '';
  #expandedIds = new Set();
  #filterText = '';
  #storageKey = '';
  #visibleItems = [];

  init$ = {
    onTreeClick: (event) => {
      let row = event.target?.closest?.('.sn-tree-row');
      if (!row) return;
      let item = this.#visibleItems[Number(row.dataset.index)];
      if (!item) return;

      if (event.target?.closest?.('.sn-tree-toggle')) {
        this.#toggleItem(item);
        return;
      }

      this.selectedId = item.id;
      emit(this, 'sn-tree-select', { item });
    },

    onTreeKeydown: (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      let row = event.target?.closest?.('.sn-tree-row');
      if (!row) return;
      event.preventDefault();
      row.click();
    },

    onTreeDragStart: (event) => {
      let row = event.target?.closest?.('.sn-tree-row');
      if (!row) return;
      let item = this.#visibleItems[Number(row.dataset.index)];
      if (!item?.draggable) {
        event.preventDefault();
        return;
      }
      emit(this, 'sn-tree-dragstart', { item, payload: item.payload });
    },
  };

  get items() {
    return this.#items;
  }

  set items(items) {
    this.setItems(items);
  }

  get selectedId() {
    return this.#selectedId;
  }

  set selectedId(value) {
    this.#selectedId = value || '';
    this.#renderTree();
  }

  get expandedIds() {
    return [...this.#expandedIds];
  }

  set expandedIds(value) {
    this.#expandedIds = new Set(Array.from(value || []).map(String));
    this.#persistExpandedIds();
    this.#renderTree();
  }

  get filterText() {
    return this.#filterText;
  }

  set filterText(value) {
    this.#filterText = String(value || '');
    this.#renderTree();
  }

  get storageKey() {
    return this.#storageKey;
  }

  set storageKey(value) {
    this.#storageKey = String(value || '');
    this.#loadExpandedIds();
    this.#renderTree();
  }

  static filterItems(items = [], filterText = '') {
    let needle = String(filterText || '').trim().toLowerCase();
    return TreeView.#filterBranch(Array.isArray(items) ? items : [], needle);
  }

  static #filterBranch(items, needle) {
    let result = [];
    for (let item of items) {
      if (!item || typeof item !== 'object') continue;
      let children = Array.isArray(item.children) ? item.children : [];
      let filteredChildren = TreeView.#filterBranch(children, needle);
      if (!needle || textMatches(item, needle) || filteredChildren.length > 0) {
        result.push({ item, children: filteredChildren });
      }
    }
    return result;
  }

  renderCallback() {
    this.#loadExpandedIds();
    this.#renderTree();
  }

  setItems(items = []) {
    this.#items = Array.isArray(items) ? items : [];
    this.#renderTree();
  }

  collapseAll() {
    this.#expandedIds.clear();
    this.#persistExpandedIds();
    this.#renderTree();
  }

  expandAncestors(idOrPath) {
    let target = String(idOrPath || '');
    if (!target) return false;
    let ancestors = [];
    let found = this.#collectAncestors(this.#items, target, ancestors);
    if (!found) return false;
    for (let item of ancestors) {
      this.#expandedIds.add(String(item.id));
    }
    this.#persistExpandedIds();
    this.#renderTree();
    return true;
  }

  scrollSelectedIntoView() {
    if (!this.#selectedId || !this.ref.tree?.querySelector) return;
    let selector = `.sn-tree-row[data-tree-id="${escapeCssValue(this.#selectedId)}"]`;
    this.ref.tree.querySelector(selector)?.scrollIntoView?.({ block: 'nearest' });
  }

  #toggleItem(item) {
    let id = String(item.id);
    let expanded = !this.#expandedIds.has(id);
    if (expanded) {
      this.#expandedIds.add(id);
    } else {
      this.#expandedIds.delete(id);
    }
    this.#persistExpandedIds();
    this.#renderTree();
    emit(this, 'sn-tree-toggle', { item, expanded });
  }

  #collectAncestors(items, target, ancestors) {
    for (let item of items) {
      if (!item || typeof item !== 'object') continue;
      let id = String(item.id || '');
      let path = String(item.path || '');
      if (id === target || path === target) return true;

      let children = Array.isArray(item.children) ? item.children : [];
      ancestors.push(item);
      if (this.#collectAncestors(children, target, ancestors)) return true;
      ancestors.pop();
    }
    return false;
  }

  #loadExpandedIds() {
    if (!this.#storageKey || !hasStorage()) return;
    try {
      let value = localStorage.getItem(this.#storageKey);
      if (!value) return;
      let ids = JSON.parse(value);
      if (Array.isArray(ids)) {
        this.#expandedIds = new Set(ids.map(String));
      }
    } catch {
      this.#expandedIds = new Set();
    }
  }

  #persistExpandedIds() {
    if (!this.#storageKey || !hasStorage()) return;
    localStorage.setItem(this.#storageKey, JSON.stringify(this.expandedIds));
  }

  #renderTree() {
    if (!this.ref.tree) return;
    this.#visibleItems = [];
    let filtered = TreeView.filterItems(this.#items, this.#filterText);
    this.ref.tree.innerHTML = this.#renderBranches(filtered, 0, Boolean(this.#filterText.trim()));
  }

  #renderBranches(branches, depth, forceExpanded) {
    return branches.map(({ item, children }) => {
      let id = String(item.id || item.path || '');
      let hasChildren = children.length > 0;
      let expanded = forceExpanded || this.#expandedIds.has(id);
      let rowIndex = this.#visibleItems.push(item) - 1;
      let childHtml = hasChildren && expanded ? this.#renderBranches(children, depth + 1, forceExpanded) : '';
      let badges = normalizeBadges(item.badges)
        .map((badge) => `<span class="sn-tree-badge">${escapeHtml(badge)}</span>`)
        .join('');

      return `
<div
  class="sn-tree-row"
  role="treeitem"
  tabindex="0"
  data-index="${rowIndex}"
  data-tree-id="${escapeHtml(id)}"
  style="--sn-tree-depth: ${depth};"
  aria-selected="${String(id === this.#selectedId)}"
  aria-expanded="${hasChildren ? String(expanded) : 'false'}"
  ${item.muted ? 'muted' : ''}
  ${item.draggable ? 'draggable="true"' : ''}
>
  <button class="sn-tree-toggle" type="button" ${hasChildren ? '' : 'hidden'}>
    ${expanded ? 'expand_more' : 'chevron_right'}
  </button>
  <span class="sn-tree-icon" ${item.icon ? '' : 'hidden'}>${escapeHtml(item.icon || '')}</span>
  <span class="sn-tree-label">${escapeHtml(item.label || id)}</span>
  <span class="sn-tree-kind" ${item.kind ? '' : 'hidden'}>${escapeHtml(item.kind || '')}</span>
  <span class="sn-tree-badges" ${badges ? '' : 'hidden'}>${badges}</span>
</div>${childHtml}`;
    }).join('');
  }
}

TreeView.template = template;
TreeView.rootStyles = css;
TreeView.reg('sn-tree-view');

export default TreeView;
