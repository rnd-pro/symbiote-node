export default /*css*/ `
:host {
  display: block;
  color: var(--sn-text);
}

:host([hidden]) {
  display: none !important;
}

.sn-list-item {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: var(--sn-list-item-gap, 10px);
  min-height: var(--sn-list-item-min-height, 34px);
  padding: var(--sn-list-item-padding, 7px 12px);
  border: 1px solid transparent;
  border-radius: var(--sn-list-item-radius, 6px);
  background: var(--sn-list-item-bg, transparent);
  color: inherit;
  cursor: pointer;
  user-select: none;
  outline: none;
  transition:
    background 0.14s ease,
    border-color 0.14s ease,
    color 0.14s ease;
}

.sn-list-item:hover {
  background: var(--sn-list-item-hover-bg, var(--sn-node-hover));
}

.sn-list-item:focus-visible {
  border-color: var(--sn-list-item-focus-border, var(--sn-node-selected));
}

:host([active]) .sn-list-item {
  background: var(--sn-list-item-active-bg, var(--sn-node-bg));
  border-color: var(--sn-list-item-active-border, var(--sn-node-selected));
}

:host([disabled]) {
  color: var(--sn-list-item-disabled-color, var(--sn-text-dim));
}

:host([disabled]) .sn-list-item {
  cursor: default;
  opacity: 0.58;
}

:host([disabled]) .sn-list-item:hover {
  background: var(--sn-list-item-bg, transparent);
}

.sn-list-item-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 var(--sn-list-item-icon-size, 18px);
  width: var(--sn-list-item-icon-size, 18px);
  height: var(--sn-list-item-icon-size, 18px);
  color: var(--sn-list-item-icon-color, var(--sn-text-dim));
  font-family: var(--sn-icon-font, inherit);
  font-size: var(--sn-list-item-icon-font-size, 16px);
  line-height: 1;
}

.sn-list-item-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1 1 auto;
}

.sn-list-item-label,
.sn-list-item-description,
.sn-list-item-meta {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sn-list-item-label {
  color: var(--sn-list-item-label-color, var(--sn-text));
  font-size: var(--sn-list-item-label-size, 12px);
  font-weight: var(--sn-list-item-label-weight, 500);
}

.sn-list-item-description {
  color: var(--sn-list-item-description-color, var(--sn-text-dim));
  font-size: var(--sn-list-item-description-size, 11px);
  line-height: 1.25;
}

.sn-list-item-meta {
  flex: 0 1 auto;
  max-width: var(--sn-list-item-meta-max-width, 38%);
  color: var(--sn-list-item-meta-color, var(--sn-text-dim));
  font-family: var(--sn-font-mono, monospace);
  font-size: var(--sn-list-item-meta-size, 10px);
}
`;
