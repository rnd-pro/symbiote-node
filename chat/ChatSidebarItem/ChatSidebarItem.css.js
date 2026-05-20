export default `
:host,
chat-sidebar-item,
chat-sidebar-sub-item {
  display: block;
}

.chat-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px;
  min-height: 28px;
  cursor: pointer;
  color: var(--sn-text-dim);
  transition: background 0.12s, color 0.12s;
  white-space: nowrap;
  overflow: hidden;
}

.chat-item:hover {
  background: var(--sn-node-hover);
  color: var(--sn-text);
}

:host([data-active]) > .chat-item,
:host([data-active]) > .chat-item-child {
  color: var(--sn-text);
  background: var(--sn-node-hover);
  border-left: 2px solid var(--sn-cat-server, #5cb8ff);
  padding-left: 12px;
}

.chat-item .material-symbols-outlined,
.chat-item-child .material-symbols-outlined {
  font-size: 16px;
  flex-shrink: 0;
}

.chat-item-icon-slot {
  position: relative;
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.chat-item-icon {
  transition: opacity 0.12s;
}

.chat-item-label {
  font-size: 11px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--sn-text);
}

.chat-status-container {
  display: flex;
  align-items: center;
}

.chat-item-adapter {
  font-size: 9px;
  color: var(--sn-text-dim);
  font-family: var(--sn-font-mono, monospace);
  margin-left: 6px;
}

.chat-item-type {
  font-size: 9px;
  color: var(--sn-cat-server, #5cb8ff);
  background: color-mix(in srgb, var(--sn-cat-server, #5cb8ff) 10%, transparent);
  font-family: var(--sn-font-mono, monospace);
  margin-left: auto;
  padding: 2px 4px;
  border-radius: 3px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.chat-item-delete {
  position: absolute;
  inset: 0;
  display: flex;
  width: 16px;
  height: 16px;
  border: none;
  background: transparent;
  color: var(--sn-text-dim);
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  margin: 0;
  opacity: 0;
  pointer-events: none;
  transition: color 0.12s, opacity 0.12s;
}

.chat-item-delete .material-symbols-outlined {
  font-size: 15px;
}

.chat-item:hover .chat-item-icon,
.chat-item-child:hover .chat-item-icon {
  opacity: 0;
}

.chat-item:hover .chat-item-delete,
.chat-item-child:hover .chat-item-delete {
  opacity: 1;
  pointer-events: auto;
}

.chat-item-delete:hover {
  color: var(--sn-danger-color);
}

.chat-expand-icon {
  margin-left: auto;
  font-size: 14px !important;
  transition: transform 0.15s ease, opacity 0.15s ease;
  cursor: pointer;
  flex-shrink: 0;
  opacity: 0.2;
}

:host([data-has-sub]) .chat-expand-icon {
  opacity: 0.5;
}

:host([data-has-sub]) .chat-expand-icon:hover {
  opacity: 1;
}

:host([data-expanded]) .chat-expand-icon {
  transform: rotate(90deg);
}

.chat-sub-items {
  width: 100%;
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.2s ease;
}

:host([data-expanded]) .chat-sub-items {
  max-height: 500px;
}

.chat-item-child {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 14px 4px 38px;
  font-size: 12px;
  min-height: 24px;
  position: relative;
  color: var(--sn-text-dim);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}

.chat-item-child:hover {
  background: var(--sn-node-hover);
  color: var(--sn-text);
}

.chat-item-child::before {
  content: '';
  position: absolute;
  left: 20px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--sn-node-hover);
}

:host-context(.chat-nav[collapsed]) .chat-item-label,
:host-context(.chat-nav[collapsed]) .chat-item-adapter,
:host-context(.chat-nav[collapsed]) .chat-sub-items,
:host-context(.chat-nav[collapsed]) .chat-expand-icon,
:host-context(.chat-nav[collapsed]) .chat-status-container {
  display: none;
}

:host-context(.chat-nav[collapsed]) .chat-item {
  position: relative;
  justify-content: center;
  padding: 0;
  overflow: visible;
}

:host-context(.chat-nav[collapsed]) .chat-item::after {
  content: '';
  position: absolute;
  top: 0;
  right: -48px;
  bottom: 0;
  width: 48px;
}

:host-context(.chat-nav[collapsed]) .chat-item-icon-slot {
  position: static;
}

:host-context(.chat-nav[collapsed]) .chat-item:hover .chat-item-icon,
:host-context(.chat-nav[collapsed]) .chat-item-child:hover .chat-item-icon {
  opacity: 1;
}

:host-context(.chat-nav[collapsed]) .chat-item-delete {
  inset: auto -48px 0 auto;
  top: 0;
  width: 48px;
  height: 100%;
  background: var(--sn-node-bg);
  border-radius: 0 4px 4px 0;
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);
  z-index: 30;
  transition: color 0.12s, opacity 0.12s;
}

:host-context(.chat-nav[collapsed]) .chat-item:hover .chat-item-delete,
:host-context(.chat-nav[collapsed]) .chat-item:focus-within .chat-item-delete,
:host-context(.chat-nav[collapsed]) .chat-item-child:hover .chat-item-delete,
:host-context(.chat-nav[collapsed]) .chat-item-child:focus-within .chat-item-delete {
  opacity: 1;
  pointer-events: auto;
}
`;
