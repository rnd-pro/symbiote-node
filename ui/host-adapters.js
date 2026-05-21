const SELECT_BOUND = Symbol('symbioteListItemSelectBound');

export function syncListItem(host, item, options = {}) {
  let listItem = host.ref?.[options.ref || 'listItem'];
  if (!listItem?.setItem) return null;
  if ('active' in options) host.toggleAttribute('active', Boolean(options.active));
  if (options.iconColor) {
    listItem.style.setProperty('--sn-list-item-icon-color', options.iconColor);
  }
  listItem.setItem(item);
  return listItem;
}

export function bindListItemSelect(host, eventName, detailFactory, options = {}) {
  let listItem = host.ref?.[options.ref || 'listItem'];
  if (!listItem || listItem[SELECT_BOUND]) return;
  listItem[SELECT_BOUND] = true;
  listItem.addEventListener('sn-list-item-select', (event) => {
    host.dispatchEvent(new CustomEvent(eventName, {
      bubbles: true,
      composed: true,
      detail: detailFactory(event),
    }));
  });
}

export function setupTreePanel(host, options = {}) {
  let tree = host.ref?.tree;
  if (!tree?.setItems || host._treePanelReady) return tree || null;
  host._treePanelReady = true;
  if (options.storageKey) {
    tree.storageKey = options.storageKey;
    if (options.defaultExpandedIds) tree.defaultExpandedIds = options.defaultExpandedIds;
  }
  tree.toggleBranchesOnSelect = options.toggleBranchesOnSelect !== false;
  if (options.onSelect) {
    tree.addEventListener('sn-tree-select', (event) => options.onSelect(event.detail?.item, event));
  }
  tree.addEventListener('sn-tree-toggle', (event) => {
    options.onToggle?.(event.detail?.item, event);
  });
  return tree;
}

export function setTreeItems(host, items, filterText = '') {
  let tree = host.ref?.tree;
  if (!tree) return;
  if (tree.setItems) {
    tree.setItems(items);
  } else {
    tree.items = items;
  }
  tree.filterText = filterText;
}

export function showTreePlaceholder(host, message) {
  if (host.ref?.placeholder) {
    host.ref.placeholder.textContent = message;
    host.ref.placeholder.hidden = false;
  }
  if (host.ref?.tree) host.ref.tree.hidden = true;
}

export function showTree(host) {
  if (host.ref?.placeholder) host.ref.placeholder.hidden = true;
  if (host.ref?.tree) host.ref.tree.hidden = false;
}

export function syncTreeFilter(host, filterText) {
  if (host.ref?.tree) host.ref.tree.filterText = filterText;
}

export function collapseTree(host) {
  host.ref?.tree?.collapseAll?.();
}

export function highlightTreePath(host, path, { scroll = false } = {}) {
  let tree = host.ref?.tree;
  if (!tree || !path) return;
  tree.expandAncestors?.(path);
  tree.selectedId = path;
  if (scroll) requestAnimationFrame(() => tree.scrollSelectedIntoView?.());
}
