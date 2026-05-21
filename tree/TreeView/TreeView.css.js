export default /*css*/ `
:host,
sn-tree-view {
  display: block;
  color: var(--sn-text);
  font-family: var(--sn-font-family, inherit);
}

:host([hidden]),
sn-tree-view[hidden] {
  display: none !important;
}

.sn-tree-view {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-width: 0;
  width: 100%;
  outline: none;
}

.sn-tree-row {
  --sn-tree-indent-width: var(--sn-tree-indent, 18px);
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 18px 18px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: var(--sn-tree-gap, 6px);
  min-height: var(--sn-tree-row-min-height, 28px);
  padding-block: var(--sn-tree-row-padding-block, 3px);
  padding-inline: calc(var(--sn-tree-depth, 0) * var(--sn-tree-indent-width)) 8px;
  border: 1px solid transparent;
  border-radius: var(--sn-tree-row-radius, 6px);
  background: var(--sn-tree-row-bg, transparent);
  color: inherit;
  cursor: pointer;
  user-select: none;
  outline: none;
}

.sn-tree-row:hover {
  background: var(--sn-tree-row-hover-bg, var(--sn-node-hover));
}

.sn-tree-row:focus-visible {
  border-color: var(--sn-tree-row-focus-border, var(--sn-node-selected));
}

.sn-tree-row[aria-selected="true"] {
  background: var(--sn-tree-row-selected-bg, var(--sn-node-bg));
  border-color: var(--sn-tree-row-selected-border, var(--sn-node-selected));
}

.sn-tree-row[muted] {
  color: var(--sn-tree-muted-color, var(--sn-text-dim));
}

.sn-tree-toggle,
.sn-tree-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  color: var(--sn-tree-icon-color, var(--sn-text-dim));
  font-family: var(--sn-icon-font, 'Material Symbols Outlined');
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20;
  font-size: var(--sn-tree-icon-size, 15px);
  line-height: 1;
}

.sn-tree-toggle {
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.sn-tree-toggle[hidden] {
  visibility: hidden;
}

.sn-tree-label {
  min-width: 0;
  overflow: hidden;
  color: var(--sn-tree-label-color, var(--sn-text));
  font-size: var(--sn-tree-label-size, 12px);
  font-weight: var(--sn-tree-label-weight, 500);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sn-tree-kind {
  overflow: hidden;
  max-width: var(--sn-tree-kind-max-width, 120px);
  color: var(--sn-tree-kind-color, var(--sn-text-dim));
  font-size: var(--sn-tree-kind-size, 10px);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sn-tree-badges {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.sn-tree-badge {
  max-width: var(--sn-tree-badge-max-width, 88px);
  overflow: hidden;
  padding: 1px 5px;
  border-radius: var(--sn-tree-badge-radius, 999px);
  background: var(--sn-tree-badge-bg, var(--sn-node-hover));
  color: var(--sn-tree-badge-color, var(--sn-text-dim));
  font-size: var(--sn-tree-badge-size, 10px);
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}
`;
