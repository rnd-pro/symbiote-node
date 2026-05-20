export default `
:host {
  --chat-composer-bg: var(--sn-node-bg, #222222);
  --chat-composer-action-bg: var(--sn-node-hover, #444444);
  display: block;
  padding: 12px 20px 16px;
  position: relative;
  z-index: 2;
}

.composer-body {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  background: var(--chat-composer-bg);
  border-radius: 20px;
  padding: 8px 8px 8px 16px;
  transition: background 0.15s;
}

.composer-body:focus-within {
  background: var(--chat-composer-bg);
}

.composer-body textarea {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--sn-text);
  padding: 4px 0;
  outline: none;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.4;
  resize: none;
  min-height: 20px;
  max-height: 200px;
  overflow-y: auto;
}

.composer-body textarea::placeholder {
  color: var(--sn-text-dim);
}

.btn-send {
  width: 32px;
  height: 32px;
  min-width: 32px;
  border-radius: 50%;
  border: none;
  background: var(--chat-composer-action-bg);
  color: var(--sn-text-dim, #a0a0a0);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: var(--sn-shadow-sm, 0 1px 4px rgba(0, 0, 0, 0.22));
  transition: background 0.15s, box-shadow 0.15s, transform 0.1s;
}

.btn-send .material-symbols-outlined {
  font-size: 18px;
}

.btn-send:hover {
  background: color-mix(in srgb, var(--chat-composer-action-bg) 78%, var(--sn-text, #ffffff) 12%);
  color: var(--sn-text, #f0f0f0);
  box-shadow: var(--sn-shadow-md, 0 2px 8px rgba(0, 0, 0, 0.28));
  transform: scale(1.05);
}

.btn-send:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--sn-text-dim, #a0a0a0) 50%, transparent);
  outline-offset: 2px;
}

.btn-send:disabled {
  opacity: 0.3;
  cursor: default;
  transform: none;
}

.btn-send.btn-stop {
  background: var(--sn-danger-color);
  color: var(--sn-text, #ffffff);
}

.btn-send.btn-stop:hover {
  background: var(--sn-danger-color);
  color: var(--sn-text, #ffffff);
}

.btn-send.btn-stop .material-symbols-outlined {
  font-variation-settings: 'FILL' 1;
}

.composer-footer {
  container: composer-footer / inline-size;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 16px 0;
  min-height: 0;
  overflow: hidden;
}

.composer-footer:empty {
  display: none;
}

.composer-footer-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 24px;
  padding: 3px 8px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--sn-text-dim);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  white-space: nowrap;
  min-width: 0;
  flex: 0 1 auto;
}

.composer-footer-btn:hover {
  background: var(--sn-node-hover);
  color: var(--sn-text);
}

.composer-footer-btn .material-symbols-outlined {
  font-size: 14px;
  opacity: 0.75;
  flex: 0 0 auto;
}

.composer-footer-btn:hover .material-symbols-outlined {
  opacity: 1;
}

.composer-footer-select {
  background: transparent;
  border: none;
  color: var(--sn-text-dim);
  font-size: 11px;
  font-family: inherit;
  font-weight: 500;
  outline: none;
  cursor: pointer;
  appearance: none;
  field-sizing: content;
  width: fit-content;
  padding: 0 12px 0 0;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%228%22%20height%3D%228%22%20viewBox%3D%220%200%208%208%22%3E%3Cpath%20fill%3D%22%23888%22%20d%3D%22M2%203L4%206L6%203H2Z%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right center;
  background-size: 8px;
  min-width: 0;
  max-width: 160px;
  text-overflow: ellipsis;
}

.composer-footer-select option {
  background: var(--sn-node-bg);
  color: var(--sn-text);
}

.composer-param-model .composer-footer-select {
  max-width: 190px;
}

.composer-toggle-icon {
  font-size: 20px !important;
}

.composer-footer-label {
  overflow: hidden;
  text-overflow: ellipsis;
}

.composer-param-collapsed .composer-footer-select,
.composer-param-collapsed .composer-footer-label {
  width: 10px;
  max-width: 10px;
  padding-right: 10px;
  color: transparent !important;
}

@container composer-footer (width <= 560px) {
  .composer-priority-1 .composer-footer-select,
  .composer-priority-1 .composer-footer-label {
    width: 10px;
    max-width: 10px;
    padding-right: 10px;
    color: transparent !important;
  }
}

@container composer-footer (width <= 500px) {
  .composer-priority-2 .composer-footer-select,
  .composer-priority-2 .composer-footer-label {
    width: 10px;
    max-width: 10px;
    padding-right: 10px;
    color: transparent !important;
  }
}

@container composer-footer (width <= 440px) {
  .composer-priority-3 .composer-footer-select,
  .composer-priority-3 .composer-footer-label {
    width: 10px;
    max-width: 10px;
    padding-right: 10px;
    color: transparent !important;
  }
}

@container composer-footer (width <= 380px) {
  .composer-priority-4 .composer-footer-select,
  .composer-priority-4 .composer-footer-label {
    width: 10px;
    max-width: 10px;
    padding-right: 10px;
    color: transparent !important;
  }
}

@container composer-footer (width <= 320px) {
  .composer-priority-5 .composer-footer-select,
  .composer-priority-5 .composer-footer-label {
    width: 10px;
    max-width: 10px;
    padding-right: 10px;
    color: transparent !important;
  }
}

.chat-context-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 8px 8px;
  min-height: 0;
}

.chat-context-bar:empty {
  display: none;
}

.context-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--sn-node-hover);
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 11px;
  color: var(--sn-text-dim);
}

.context-path {
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.context-remove {
  background: transparent;
  border: none;
  color: var(--sn-text-dim);
  cursor: pointer;
  padding: 0 2px;
  font-size: 14px;
  line-height: 1;
}

.context-remove:hover {
  color: var(--sn-danger-color);
}

:host(.drag-over) .composer-body {
  background: var(--chat-composer-action-bg);
  outline: 1px dashed var(--sn-node-border);
  outline-offset: -1px;
}

.autocomplete-popup {
  display: none;
  position: absolute;
  bottom: 100%;
  left: 20px;
  right: 20px;
  max-height: 240px;
  overflow-y: auto;
  background: color-mix(in srgb, var(--sn-node-bg, #222222) 95%, transparent);
  border: 1px solid color-mix(in srgb, var(--sn-node-hover, #444444) 45%, transparent);
  border-radius: 16px;
  padding: 4px;
  margin-bottom: 6px;
  box-shadow: var(--sn-shadow-xl, 0 -8px 28px rgba(0, 0, 0, 0.32));
  z-index: 10;
  backdrop-filter: blur(8px);
}

.autocomplete-popup.visible {
  display: block;
}

.autocomplete-header {
  padding: 6px 10px 4px;
  font-size: 10px;
  font-weight: 600;
  color: var(--sn-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.autocomplete-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  color: var(--sn-text);
  opacity: 0.75;
  transition: background 0.1s, opacity 0.1s, color 0.1s;
}

.autocomplete-item:hover,
.autocomplete-item.active {
  background: var(--sn-node-hover);
  color: var(--sn-text);
  opacity: 1;
}

.autocomplete-item .material-symbols-outlined {
  font-size: 16px;
  color: var(--sn-text-dim);
}

.autocomplete-item-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.autocomplete-item-hint {
  font-size: 10px;
  color: var(--sn-text-dim);
}
`;
