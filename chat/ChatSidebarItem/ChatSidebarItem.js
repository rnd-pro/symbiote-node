import Symbiote, { html } from '@symbiotejs/symbiote';
import css from './ChatSidebarItem.css.js';

function emit(el, type, detail = {}) {
  el.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true, detail }));
}

export class ChatSidebarItem extends Symbiote {
  init$ = {
    id: '',
    name: '',
    cleanName: '',
    adapter: '',
    icon: 'chat',
    iconStyle: '',
    statusHtml: '',
    hasChildren: false,
    isExpanded: false,
    isActive: false,
    subChats: [],

    onItemClick: (event) => {
      if (event.target.closest('.chat-item-delete') || event.target.closest('.chat-expand-icon')) return;
      event.stopPropagation();
      if (this.$.id) emit(this, 'chat-sidebar-select', { id: this.$.id, item: this.$ });
    },

    onExpandToggle: (event) => {
      event.stopPropagation();
      if (!this.$.hasChildren) return;
      this.$.isExpanded = !this.$.isExpanded;
      emit(this, 'chat-sidebar-toggle', {
        id: this.$.id,
        expanded: this.$.isExpanded,
        item: this.$,
      });
    },

    onDelete: (event) => {
      event.stopPropagation();
      if (this.$.id) emit(this, 'chat-sidebar-delete', { id: this.$.id, item: this.$ });
    },
  };

  renderCallback() {
    this.sub('isActive', (value) => {
      this.toggleAttribute('data-active', value);
      this._syncAutoExpanded();
    });

    this.sub('isExpanded', (value) => {
      this.toggleAttribute('data-expanded', value);
    });

    this.sub('hasChildren', (value) => {
      this.toggleAttribute('data-has-sub', value);
      if (!value) this.$.isExpanded = false;
    });

    this.sub('subChats', (chats) => {
      let has = chats && chats.length > 0;
      this.$.hasChildren = has;
      this._syncAutoExpanded();
    });
  }

  _syncAutoExpanded() {
    let chats = this.$.subChats || [];
    let hasActiveChild = chats.some((chat) => chat.isActive);
    let hasRunningChild = chats.some((chat) => chat.pendingTaskId);
    if (chats.length && (this.$.isActive || hasActiveChild || hasRunningChild)) {
      this.$.isExpanded = true;
    }
  }
}

ChatSidebarItem.template = html`
<div class="chat-item" ${{ onclick: 'onItemClick' }}>
  <span class="chat-item-icon-slot">
    <span class="material-symbols-outlined chat-icon chat-item-icon" ${{ textContent: 'icon', style: 'iconStyle' }}></span>
    <button class="chat-item-delete" title="Delete" aria-label="Delete chat" ${{ onclick: 'onDelete' }}>
      <span class="material-symbols-outlined">delete</span>
    </button>
  </span>
  <span class="chat-item-label" ${{ textContent: 'cleanName' }}></span>
  <span class="chat-status-container" ${{ innerHTML: 'statusHtml' }}></span>
  <span class="chat-item-adapter" ${{ textContent: 'adapter' }}></span>
  <span class="material-symbols-outlined chat-expand-icon" role="button" tabindex="0" title="Toggle child chats" aria-label="Toggle child chats" ${{ onclick: 'onExpandToggle' }}>chevron_right</span>
</div>
<div class="chat-sub-items" itemize="subChats" item-tag="chat-sidebar-sub-item"></div>
`;

export class ChatSidebarSubItem extends Symbiote {
  init$ = {
    id: '',
    name: '',
    cleanName: '',
    adapter: '',
    icon: 'subdirectory_arrow_right',
    iconStyle: '',
    statusHtml: '',
    agentType: '',
    isActive: false,

    onItemClick: (event) => {
      if (event.target.closest('.chat-item-delete')) return;
      event.stopPropagation();
      if (this.$.id) emit(this, 'chat-sidebar-select', { id: this.$.id, item: this.$ });
    },

    onDelete: (event) => {
      event.stopPropagation();
      if (this.$.id) emit(this, 'chat-sidebar-delete', { id: this.$.id, item: this.$ });
    },
  };

  renderCallback() {
    this.sub('isActive', (value) => {
      this.toggleAttribute('data-active', value);
    });
  }
}

ChatSidebarSubItem.template = html`
<div class="chat-item-child" ${{ onclick: 'onItemClick' }}>
  <span class="chat-item-icon-slot">
    <span class="material-symbols-outlined chat-icon chat-item-icon" ${{ textContent: 'icon', style: 'iconStyle' }}></span>
    <button class="chat-item-delete" title="Delete" aria-label="Delete chat" ${{ onclick: 'onDelete' }}>
      <span class="material-symbols-outlined">delete</span>
    </button>
  </span>
  <span class="chat-item-label" ${{ textContent: 'cleanName' }}></span>
  <span class="chat-item-type" ${{ textContent: 'agentType' }}></span>
  <span class="chat-status-container" ${{ innerHTML: 'statusHtml' }}></span>
</div>
`;

ChatSidebarItem.rootStyles = css;
ChatSidebarSubItem.rootStyles = css;
ChatSidebarSubItem.reg('chat-sidebar-sub-item');
ChatSidebarItem.reg('chat-sidebar-item');
