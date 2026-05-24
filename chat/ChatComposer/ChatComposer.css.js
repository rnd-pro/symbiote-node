export default `
:host,
chat-composer {
  --chat-composer-bg: var(--sn-composer-bg);
  --chat-composer-action-bg: var(--sn-composer-action-bg);
  display: block;
  padding: var(--sn-composer-padding);
  position: relative;
  z-index: 2;
}

.composer-body {
  display: flex;
  align-items: flex-end;
  gap: var(--sn-composer-control-gap);
  background: var(--chat-composer-bg);
  border-radius: var(--sn-composer-radius);
  padding: var(--sn-composer-body-padding);
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
  min-height: var(--sn-composer-input-min-height);
  max-height: 200px;
  overflow-y: auto;
}

.composer-body textarea::placeholder {
  color: var(--sn-text-dim);
}

.btn-send {
  --sn-button-icon-size: var(--sn-composer-send-size);
  --sn-button-icon-font-size: var(--sn-composer-send-icon-size);
  --sn-button-border: transparent;
  --sn-button-radius: 50%;
  --sn-button-bg: var(--chat-composer-action-bg);
  --sn-button-hover-bg: color-mix(in srgb, var(--chat-composer-action-bg) 78%, var(--sn-text) 12%);
  --sn-button-hover-border: transparent;
  --sn-button-color: var(--sn-text-dim);
  --sn-button-disabled-opacity: 0.3;
  --sn-button-focus-ring: 2px solid color-mix(in srgb, var(--sn-text-dim) 50%, transparent);
  color: var(--sn-text-dim);
  box-shadow: var(--sn-shadow-sm);
  transition: background 0.15s, box-shadow 0.15s, transform 0.1s;
}

.btn-send .material-symbols-outlined {
  font-size: var(--sn-composer-send-icon-size);
}

.btn-send:hover {
  color: var(--sn-text);
  box-shadow: var(--sn-shadow-md);
  transform: scale(1.05);
}

.btn-send:focus-visible {
  outline-offset: 2px;
}

.btn-send[disabled] {
  transform: none;
}

.btn-send.btn-stop {
  --sn-button-bg: var(--sn-danger-color);
  --sn-button-hover-bg: var(--sn-danger-color);
  color: var(--sn-text);
}

.btn-send.btn-stop:hover {
  color: var(--sn-text);
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
  appearance: auto;
  field-sizing: content;
  width: fit-content;
  padding: 0;
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
  width: var(--sn-composer-collapsed-control-width);
  max-width: var(--sn-composer-collapsed-control-width);
  padding-right: var(--sn-composer-collapsed-control-padding);
  color: transparent !important;
}

@container composer-footer (width <= 560px) {
  .composer-priority-1 .composer-footer-select,
  .composer-priority-1 .composer-footer-label {
    width: var(--sn-composer-collapsed-control-width);
    max-width: var(--sn-composer-collapsed-control-width);
    padding-right: var(--sn-composer-collapsed-control-padding);
    color: transparent !important;
  }
}

@container composer-footer (width <= 500px) {
  .composer-priority-2 .composer-footer-select,
  .composer-priority-2 .composer-footer-label {
    width: var(--sn-composer-collapsed-control-width);
    max-width: var(--sn-composer-collapsed-control-width);
    padding-right: var(--sn-composer-collapsed-control-padding);
    color: transparent !important;
  }
}

@container composer-footer (width <= 440px) {
  .composer-priority-3 .composer-footer-select,
  .composer-priority-3 .composer-footer-label {
    width: var(--sn-composer-collapsed-control-width);
    max-width: var(--sn-composer-collapsed-control-width);
    padding-right: var(--sn-composer-collapsed-control-padding);
    color: transparent !important;
  }
}

@container composer-footer (width <= 380px) {
  .composer-priority-4 .composer-footer-select,
  .composer-priority-4 .composer-footer-label {
    width: var(--sn-composer-collapsed-control-width);
    max-width: var(--sn-composer-collapsed-control-width);
    padding-right: var(--sn-composer-collapsed-control-padding);
    color: transparent !important;
  }
}

@container composer-footer (width <= 320px) {
  .composer-priority-5 .composer-footer-select,
  .composer-priority-5 .composer-footer-label {
    width: var(--sn-composer-collapsed-control-width);
    max-width: var(--sn-composer-collapsed-control-width);
    padding-right: var(--sn-composer-collapsed-control-padding);
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
  --sn-button-icon-size: 16px;
  --sn-button-icon-font-size: 13px;
  --sn-button-border: transparent;
  --sn-button-radius: 4px;
  --sn-button-bg: transparent;
  --sn-button-hover-bg: transparent;
  --sn-button-hover-border: transparent;
  --sn-button-color: var(--sn-text-dim);
  --sn-button-focus-ring: var(--sn-effect-focus-ring);
  color: var(--sn-text-dim);
  line-height: 1;
}

.context-remove:hover {
  color: var(--sn-danger-color);
}

:host(.drag-over) .composer-body,
chat-composer.drag-over .composer-body {
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
  background: color-mix(in srgb, var(--sn-node-bg) 95%, transparent);
  border: 1px solid color-mix(in srgb, var(--sn-node-hover) 45%, transparent);
  border-radius: 16px;
  padding: 4px;
  margin-bottom: 6px;
  box-shadow: var(--sn-shadow-xl);
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
