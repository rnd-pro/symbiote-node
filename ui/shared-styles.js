const sharedUiStyles = `
:host {
  display: block;
  height: 100%;
  width: 100%;
  background: var(--sn-panel-bg);
  color: var(--sn-text);
  overflow: hidden;
  font-family: var(--sn-font, 'Inter', -apple-system, sans-serif);
  font-size: 13px;
}

/* === Layouts === */
.ui-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.ui-split-container {
  display: flex;
  height: 100%;
}

.ui-sidebar {
  width: 250px;
  background: var(--sn-bg);
  border-right: 1px solid var(--sn-node-border);
  display: flex;
  flex-direction: column;
}

.ui-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 16px;
}

.ui-sidebar-header {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--sn-node-border);
  gap: 8px;
}

.ui-sidebar-content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.ui-header {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  background: var(--sn-node-bg);
  border-bottom: 1px solid var(--sn-node-border);
  flex-shrink: 0;
  gap: 12px;
}

/* === Titles === */
.ui-title {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--sn-text-dim);
}

.ui-title span.material-symbols-outlined {
  font-size: 16px;
  color: inherit;
}

.ui-title-large {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--sn-text);
}

.ui-title-large span.material-symbols-outlined {
  font-size: 18px;
  color: var(--sn-text-dim);
}

/* === Buttons === */
.ui-btn {
  background: var(--sn-node-bg);
  color: var(--sn-text);
  border: 1px solid var(--sn-node-border);
  padding: 6px 14px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-family: inherit;
  transition: border-color 0.15s, background-color 0.15s;
}

.ui-btn:hover:not(:disabled) {
  border-color: var(--sn-node-selected);
}

.ui-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ui-btn.primary {
  background: var(--sn-node-selected);
  border-color: var(--sn-node-selected);
  color: var(--sn-text, #fff);
}

.ui-btn.primary:hover:not(:disabled) {
  filter: brightness(1.1);
}

.ui-btn.danger {
  color: var(--sn-danger-color);
  border-color: var(--sn-danger-color);
}

.ui-btn.danger:hover:not(:disabled) {
  background: var(--sn-danger-color);
  color: var(--sn-text, #fff);
}

.ui-btn-icon {
  background: transparent;
  border: none;
  color: var(--sn-text-dim);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s;
}

.ui-btn-icon:hover:not(:disabled) {
  color: var(--sn-text);
}

/* === Cards === */
.ui-card {
  background: var(--sn-node-bg);
  border: 1px solid var(--sn-node-border);
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 12px;
}

.ui-card-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--sn-text-dim);
  margin-bottom: 12px;
}

/* === Forms === */
.ui-field {
  margin-bottom: var(--sn-field-margin-block-end);
}

.ui-field label {
  display: block;
  font-size: var(--sn-field-label-size);
  color: var(--sn-field-label-color);
  margin-bottom: var(--sn-field-label-margin-block-end);
  font-weight: var(--sn-field-label-weight);
  line-height: var(--sn-field-label-line-height);
  text-transform: var(--sn-field-label-transform);
}

.ui-field input, .ui-field select, .ui-field textarea {
  width: 100%;
  background: var(--sn-field-control-bg);
  border: 1px solid var(--sn-field-control-border);
  color: var(--sn-field-control-color);
  padding: var(--sn-field-control-padding);
  border-radius: var(--sn-field-control-radius);
  font-family: inherit;
  font-size: var(--sn-field-control-font-size);
  line-height: var(--sn-field-control-line-height);
  transition: border-color 0.15s;
}

.ui-field input:focus, .ui-field select:focus, .ui-field textarea:focus {
  outline: none;
  border-color: var(--sn-field-control-focus-border);
  box-shadow: var(--sn-field-control-focus-shadow);
}

.ui-field textarea {
  min-height: var(--sn-field-textarea-min-height);
  resize: vertical;
}

/* === Lists & Items === */
.ui-list {
  display: flex;
  flex-direction: column;
}

.ui-item {
  padding: 10px 14px;
  background: transparent;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-bottom: 1px solid var(--sn-node-hover);
  transition: background 0.15s;
}

.ui-item:hover {
  background: var(--sn-node-hover);
}

.ui-item.active {
  background: var(--sn-node-bg);
  border-left: 3px solid var(--sn-node-selected);
  padding-left: 11px;
}

.ui-item-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--sn-text);
}

.ui-item.active .ui-item-title {
  color: var(--sn-node-selected);
}

.ui-item-desc {
  font-size: 11px;
  color: var(--sn-text-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* === Badges & Banners === */
.ui-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  background: var(--sn-node-bg);
  border: 1px solid var(--sn-node-border);
  color: var(--sn-text-dim);
}

.ui-badge.success { color: var(--sn-success-color); border-color: var(--sn-success-color); }
.ui-badge.info { color: var(--sn-node-selected); border-color: var(--sn-node-selected); }
.ui-badge.warning { color: var(--sn-warning-color); border-color: var(--sn-warning-color); }
.ui-badge.error { color: var(--sn-danger-color); border-color: var(--sn-danger-color); }

.ui-banner {
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--sn-node-bg);
  border: 1px solid var(--sn-node-border);
}

.ui-banner.running {
  color: var(--sn-node-selected);
  border-color: var(--sn-node-selected);
}

.ui-banner.success {
  color: var(--sn-success-color);
  border-color: var(--sn-success-color);
}

.ui-banner.error {
  color: var(--sn-danger-color);
  border-color: var(--sn-danger-color);
}

/* Specific Detail views inside main */
.ui-details {
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.ui-details-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.ui-details-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--sn-text);
}

.ui-details-desc {
  color: var(--sn-text-dim);
  font-size: 12px;
  line-height: 1.5;
}

/* Utility Animations */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Icon Size Utilities */
.icon-sm { font-size: 14px; }
.icon-md { font-size: 16px; }
.icon-lg { font-size: 18px; }
`;

export { sharedUiStyles };
export default sharedUiStyles;
