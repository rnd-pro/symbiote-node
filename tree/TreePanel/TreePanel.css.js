export default /*css*/ `
:host,
sn-tree-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  font-family: var(--sn-font);
  font-size: var(--sn-tree-panel-font-size, 12px);
}

:host([hidden]),
sn-tree-panel[hidden] {
  display: none !important;
}

.sn-tree-panel-title {
  display: flex;
  align-items: center;
  gap: var(--sn-tree-panel-title-gap, 5px);
  padding: var(--sn-tree-panel-title-padding, 6px 8px);
  border-bottom: 1px solid var(--sn-node-border);
  color: var(--sn-text-dim);
  font-size: var(--sn-tree-panel-title-size, 11px);
  font-weight: var(--sn-tree-panel-title-weight, 700);
  text-transform: uppercase;
}

.sn-tree-panel-title-icon,
.sn-tree-panel-toolbar-icon {
  font-size: var(--sn-tree-panel-icon-size, 14px);
}

.sn-tree-panel-toolbar {
  display: flex;
  gap: var(--sn-tree-panel-toolbar-gap, 6px);
  padding: var(--sn-tree-panel-toolbar-padding, 6px 8px);
  border-bottom: 1px solid var(--sn-node-border);
}

.sn-tree-panel-filter {
  flex: 1;
  min-width: 0;
  padding: var(--sn-tree-panel-input-padding, 4px 8px);
  border: 1px solid var(--sn-node-border);
  border-radius: var(--sn-tree-panel-input-radius, 4px);
  outline: none;
  background: var(--sn-bg);
  color: var(--sn-text);
  font-family: inherit;
  font-size: var(--sn-tree-panel-input-size, 11px);
}

.sn-tree-panel-filter:focus {
  border-color: var(--sn-node-selected);
}

.sn-tree-panel-collapse {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sn-tree-panel-collapse-padding, 0 6px);
  border: 1px solid var(--sn-node-border);
  border-radius: var(--sn-tree-panel-input-radius, 4px);
  background: var(--sn-bg);
  color: var(--sn-text);
  cursor: pointer;
  transition: background 100ms ease;
}

.sn-tree-panel-collapse:hover {
  background: var(--sn-node-hover);
}

.sn-tree-panel-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--sn-tree-panel-content-padding, 4px);
}

.sn-tree-panel-placeholder {
  padding: var(--sn-tree-panel-placeholder-padding, 8px);
  color: var(--sn-text-dim);
  font-size: var(--sn-tree-panel-placeholder-size, 12px);
}

.sn-tree-panel-placeholder[hidden] {
  display: none;
}

sn-tree-view {
  --sn-tree-gap: var(--sn-tree-panel-gap, var(--sn-tree-gap));
  --sn-tree-indent: var(--sn-tree-panel-indent, var(--sn-tree-indent));
  --sn-tree-row-min-height: var(--sn-tree-panel-row-min-height, var(--sn-tree-row-height));
  --sn-tree-row-padding-block: var(--sn-tree-panel-row-padding-block, var(--sn-tree-row-padding-block));
  --sn-tree-row-radius: var(--sn-tree-panel-row-radius, var(--sn-tree-row-radius));
  --sn-tree-row-hover-bg: var(--sn-node-hover);
  --sn-tree-row-selected-bg: var(--sn-node-selected-soft, var(--sn-node-hover));
  --sn-tree-row-selected-border: transparent;
  --sn-tree-label-color: var(--sn-text-dim);
  --sn-tree-label-size: var(--sn-tree-panel-label-size, var(--sn-tree-label-size));
  --sn-tree-label-weight: var(--sn-tree-panel-label-weight, var(--sn-tree-label-weight));
  --sn-tree-muted-color: var(--sn-text-dim);
  --sn-tree-icon-size: var(--sn-tree-panel-icon-size, var(--sn-tree-icon-size));
  --sn-tree-badge-radius: var(--sn-tree-panel-badge-radius, var(--sn-tree-badge-radius));
  --sn-tree-badge-bg: var(--sn-node-hover);
  --sn-tree-badge-color: var(--sn-text-dim);
  --sn-tree-badge-size: var(--sn-tree-panel-badge-size, var(--sn-tree-badge-size));
}

sn-tree-view[hidden] {
  display: none;
}
`;
