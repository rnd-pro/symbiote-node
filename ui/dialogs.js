import { escapeHtml } from '../display/markdown-formatter.js';

const dialogStyles = `
.sn-dialog {
  border: 1px solid var(--sn-node-border);
  border-radius: 6px;
  padding: 0;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  background: var(--sn-panel-bg);
  color: var(--sn-text);
}

.sn-dialog::backdrop {
  background: rgba(0, 0, 0, 0.45);
}

.sn-dialog-body {
  padding: 20px;
  font-family: var(--sn-font, sans-serif);
  font-size: 14px;
  min-width: 250px;
}

.sn-dialog-message {
  margin: 0 0 20px 0;
  white-space: pre-wrap;
}

.sn-dialog-prompt .sn-dialog-message {
  margin-bottom: 10px;
}

.sn-dialog-input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px;
  border: 1px solid var(--sn-node-border);
  border-radius: 4px;
  background: var(--sn-bg);
  color: var(--sn-text);
  outline: none;
  font-family: inherit;
}

.sn-dialog-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.sn-dialog-prompt .sn-dialog-actions {
  margin-top: 20px;
}

.sn-dialog-btn {
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

.sn-dialog-btn:hover:not(:disabled) {
  border-color: var(--sn-node-selected);
}

.sn-dialog-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sn-dialog-btn-primary {
  background: var(--sn-node-selected);
  border-color: var(--sn-node-selected);
  color: var(--sn-text, #fff);
}

.sn-dialog-btn-danger {
  color: var(--sn-danger-color);
  border-color: var(--sn-danger-color);
}

.sn-dialog-btn-danger:hover:not(:disabled) {
  background: var(--sn-danger-color);
  color: var(--sn-text, #fff);
}
`;

function ensureDocument() {
  if (typeof document === 'undefined' || !document.createElement || !document.body) {
    throw new Error('Dialog helpers require a browser document.');
  }
  return document;
}

function openDialog(dialog) {
  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    dialog.setAttribute('open', '');
  }
}

function closeDialog(dialog, resolve, value) {
  if (typeof dialog.close === 'function') {
    dialog.close();
  }
  dialog.remove();
  resolve(value);
}

function createDialog(className, bodyHtml) {
  const doc = ensureDocument();
  const dialog = doc.createElement('dialog');
  dialog.className = `sn-dialog ${className}`.trim();
  dialog.innerHTML = `
    <style>${dialogStyles}</style>
    ${bodyHtml}
  `;
  doc.body.appendChild(dialog);
  return dialog;
}

export function uiConfirm(message) {
  return new Promise((resolve) => {
    const dialog = createDialog('sn-dialog-confirm', `
      <div class="sn-dialog-body">
        <p class="sn-dialog-message">${escapeHtml(message)}</p>
        <div class="sn-dialog-actions">
          <button type="button" data-dialog-action="cancel" class="sn-dialog-btn">Cancel</button>
          <button type="button" data-dialog-action="confirm" class="sn-dialog-btn sn-dialog-btn-danger">Confirm</button>
        </div>
      </div>
    `);
    openDialog(dialog);
    dialog.querySelector('[data-dialog-action="cancel"]').onclick = () => closeDialog(dialog, resolve, false);
    dialog.querySelector('[data-dialog-action="confirm"]').onclick = () => closeDialog(dialog, resolve, true);
  });
}

export function uiPrompt(message, defaultValue = '') {
  return new Promise((resolve) => {
    const dialog = createDialog('sn-dialog-prompt', `
      <div class="sn-dialog-body">
        <p class="sn-dialog-message">${escapeHtml(message)}</p>
        <input type="text" data-dialog-input class="sn-dialog-input" value="${escapeHtml(defaultValue)}" />
        <div class="sn-dialog-actions">
          <button type="button" data-dialog-action="cancel" class="sn-dialog-btn">Cancel</button>
          <button type="button" data-dialog-action="confirm" class="sn-dialog-btn sn-dialog-btn-primary">OK</button>
        </div>
      </div>
    `);
    openDialog(dialog);
    const input = dialog.querySelector('[data-dialog-input]');
    input.focus();
    input.onkeydown = (event) => {
      if (event.key === 'Enter') closeDialog(dialog, resolve, input.value);
    };
    dialog.querySelector('[data-dialog-action="cancel"]').onclick = () => closeDialog(dialog, resolve, null);
    dialog.querySelector('[data-dialog-action="confirm"]').onclick = () => closeDialog(dialog, resolve, input.value);
  });
}

export function uiAlert(message) {
  return new Promise((resolve) => {
    const dialog = createDialog('sn-dialog-alert', `
      <div class="sn-dialog-body">
        <p class="sn-dialog-message">${escapeHtml(message)}</p>
        <div class="sn-dialog-actions">
          <button type="button" data-dialog-action="ok" class="sn-dialog-btn sn-dialog-btn-primary">OK</button>
        </div>
      </div>
    `);
    openDialog(dialog);
    dialog.querySelector('[data-dialog-action="ok"]').onclick = () => closeDialog(dialog, resolve);
  });
}
