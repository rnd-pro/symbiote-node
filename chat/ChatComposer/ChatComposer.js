import Symbiote, { html } from '@symbiotejs/symbiote';
import css from './ChatComposer.css.js';

function emit(el, type, detail = {}) {
  el.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true, detail }));
}

export class ChatComposer extends Symbiote {
  init$ = {
    value: '',
    disabled: false,
    placeholder: 'Ask anything',
    attachedContext: [],
    footerHtml: '',
    isSending: false,

    onInput: (event) => {
      let input = event.target;
      this.$.value = input.value;
      this.resizeInput();
      emit(this, 'chat-composer-input', {
        value: input.value,
        selectionStart: input.selectionStart,
      });
    },

    onKeyDown: (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        emit(this, 'chat-composer-submit');
        return;
      }
      if (event.key === 'Escape' || event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Tab') {
        emit(this, 'chat-composer-key', { key: event.key, event });
      }
    },

    onSend: () => {
      emit(this, 'chat-composer-send');
    },

    onParamChange: (event) => {
      let el = event.target;
      if (!el || (!el.classList.contains('composer-footer-select') && !el.classList.contains('composer-footer-checkbox'))) return;
      emit(this, 'chat-composer-param-change', {
        id: el.dataset.param,
        value: el.type === 'checkbox' ? el.checked : el.value,
        inputType: el.type,
      });
    },

    onRemoveContext: (event) => {
      emit(this, 'chat-composer-context-remove', {
        key: event.currentTarget?.dataset?.key,
      });
    },

    onDragOver: (event) => {
      event.preventDefault();
      this.classList.add('drag-over');
    },

    onDragLeave: () => {
      this.classList.remove('drag-over');
    },

    onDrop: (event) => {
      event.preventDefault();
      this.classList.remove('drag-over');
      let path = event.dataTransfer?.getData('text/plain');
      if (path && path.trim()) {
        emit(this, 'chat-composer-context-drop', { path: path.trim() });
      }
    },
  };

  renderCallback() {
    this.sub('value', (value) => {
      let input = this.getInputElement();
      if (input && input.value !== value) {
        input.value = value || '';
        this.resizeInput();
      }
    });
    this.sub('isSending', () => this._syncSendingState());
    this.sub('disabled', () => this._syncDisabledState());
    queueMicrotask(() => {
      this._syncSendingState();
      this._syncDisabledState();
    });
  }

  getInputElement() {
    return this.ref.chatInput || null;
  }

  getAutocompleteElement() {
    return this.ref.autocompletePopup || null;
  }

  getParamControls() {
    return [...(this.ref.footer?.querySelectorAll('.composer-footer-select, .composer-footer-checkbox') || [])];
  }

  setValue(value) {
    this.$.value = value || '';
  }

  setAttachedContext(items) {
    this.$.attachedContext = Array.isArray(items) ? items : [];
  }

  setFooterHtml(htmlStr) {
    this.$.footerHtml = htmlStr || '';
  }

  setDisabled(disabled) {
    this.$.disabled = Boolean(disabled);
  }

  setPlaceholder(placeholder) {
    this.$.placeholder = placeholder || '';
  }

  setSending(active) {
    this.$.isSending = Boolean(active);
  }

  resizeInput() {
    let input = this.getInputElement();
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 200)}px`;
  }

  resetInputHeight() {
    let input = this.getInputElement();
    if (input) input.style.height = 'auto';
  }

  _syncSendingState() {
    let btn = this.ref.btnSend;
    let icon = this.ref.sendIcon;
    if (!btn || !icon) return;
    if (this.$.isSending) {
      btn.classList.add('btn-stop');
      icon.textContent = 'stop';
    } else {
      btn.classList.remove('btn-stop');
      icon.textContent = 'arrow_upward';
    }
  }

  _syncDisabledState() {
    let input = this.getInputElement();
    if (input) input.disabled = Boolean(this.$.disabled);
  }
}

ChatComposer.template = html`
<div ${{ ondragover: 'onDragOver', ondragleave: 'onDragLeave', ondrop: 'onDrop' }}>
  <div class="chat-context-bar" itemize="attachedContext">
    <div class="context-chip" title="{{title}}">
      <span class="material-symbols-outlined icon-sm">{{icon}}</span>
      <span class="context-path">{{name}}</span>
      <button class="context-remove" ${{ '@data-key': 'key', onclick: '^onRemoveContext' }}>x</button>
    </div>
  </div>
  <div class="composer-body">
    <textarea ref="chatInput" rows="1"
      ${{ value: 'value', disabled: 'disabled', placeholder: 'placeholder',
          oninput: 'onInput', onkeydown: 'onKeyDown' }}></textarea>
    <button class="btn-send" ref="btnSend" ${{ onclick: 'onSend' }}>
      <span class="material-symbols-outlined" ref="sendIcon">arrow_upward</span>
    </button>
  </div>
  <div class="composer-footer" ref="footer" ${{ innerHTML: 'footerHtml', onchange: 'onParamChange' }}></div>
  <div class="autocomplete-popup" ref="autocompletePopup"></div>
</div>
`;

ChatComposer.rootStyles = css;
ChatComposer.reg('chat-composer');
