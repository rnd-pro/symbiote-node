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

function createButton(action, className, label) {
  let button = document.createElement('button');
  button.type = 'button';
  button.dataset.dialogAction = action;
  button.className = className;
  button.textContent = label;
  return button;
}

function createActions(...buttons) {
  let actions = document.createElement('div');
  actions.className = 'sn-dialog-actions';
  actions.append(...buttons);
  return actions;
}

function createMessage(message) {
  let el = document.createElement('p');
  el.className = 'sn-dialog-message';
  el.textContent = message;
  return el;
}

function createDialog(className) {
  let doc = ensureDocument();
  let dialog = doc.createElement('dialog');
  dialog.className = `sn-dialog ${className}`.trim();
  let style = doc.createElement('style');
  style.textContent = dialogStyles;
  dialog.appendChild(style);
  doc.body.appendChild(dialog);
  return dialog;
}

export function uiConfirm(message) {
  return new Promise((resolve) => {
    let dialog = createDialog('sn-dialog-confirm');
    let body = document.createElement('div');
    body.className = 'sn-dialog-body';
    body.append(
      createMessage(message),
      createActions(
        createButton('cancel', 'sn-dialog-btn', 'Cancel'),
        createButton('confirm', 'sn-dialog-btn sn-dialog-btn-danger', 'Confirm')
      )
    );
    dialog.appendChild(body);
    openDialog(dialog);
    dialog.querySelector('[data-dialog-action="cancel"]').onclick = () => closeDialog(dialog, resolve, false);
    dialog.querySelector('[data-dialog-action="confirm"]').onclick = () => closeDialog(dialog, resolve, true);
  });
}

export function uiPrompt(message, defaultValue = '') {
  return new Promise((resolve) => {
    let dialog = createDialog('sn-dialog-prompt');
    let body = document.createElement('div');
    body.className = 'sn-dialog-body';
    let input = document.createElement('input');
    input.type = 'text';
    input.dataset.dialogInput = '';
    input.className = 'sn-dialog-input';
    input.value = defaultValue;
    body.append(
      createMessage(message),
      input,
      createActions(
        createButton('cancel', 'sn-dialog-btn', 'Cancel'),
        createButton('confirm', 'sn-dialog-btn sn-dialog-btn-primary', 'OK')
      )
    );
    dialog.appendChild(body);
    openDialog(dialog);
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
    let dialog = createDialog('sn-dialog-alert');
    let body = document.createElement('div');
    body.className = 'sn-dialog-body';
    body.append(
      createMessage(message),
      createActions(createButton('ok', 'sn-dialog-btn sn-dialog-btn-primary', 'OK'))
    );
    dialog.appendChild(body);
    openDialog(dialog);
    dialog.querySelector('[data-dialog-action="ok"]').onclick = () => closeDialog(dialog, resolve);
  });
}
