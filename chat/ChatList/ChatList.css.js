export default /*css*/ `
:host {
  display: block;
}

.chat-list {
  width: 100%;
  border-right: none;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--sn-node-bg);
  color: var(--sn-text);
  overflow: hidden;
}

.ui-sidebar-header {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--sn-node-border);
  flex-shrink: 0;
}

.ui-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
  color: var(--sn-text);
}

.ui-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 24px;
  border: 1px solid var(--sn-node-border);
  border-radius: 4px;
  background: var(--sn-node-hover);
  color: var(--sn-text);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.ui-btn:hover {
  border-color: var(--sn-node-selected);
}

.ui-sidebar-content {
  min-height: 0;
  overflow: auto;
}

.chat-list-icon {
  font-size: 16px;
}

.chat-list-empty-icon {
  display: block;
  margin-block-end: 8px;
  font-size: 32px;
  opacity: 0.3;
}

.chat-list-title {
  flex: none;
}

.chat-list-new-btn {
  margin-left: auto;
  padding: 4px 10px;
}

.chat-list-new-btn-icon {
  font-size: 14px;
}

.chat-list-items {
  padding: 4px 0;
}

.chat-list-filter-bar {
  display: flex;
  gap: 4px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--sn-node-border);
  flex-shrink: 0;
}

.chat-list-filter-btn {
  background: transparent;
  border: 1px solid transparent;
  color: var(--sn-text-dim);
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  font-family: inherit;
  transition: color 0.15s, background 0.15s, border-color 0.15s;
}

.chat-list-filter-btn:hover {
  color: var(--sn-text);
}

.chat-list-filter-btn[active] {
  background: var(--sn-node-bg);
  border-color: var(--sn-node-border);
  color: var(--sn-text);
}
`;
