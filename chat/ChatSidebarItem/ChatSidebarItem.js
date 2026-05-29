import Symbiote, { html } from '@symbiotejs/symbiote';
import css from './ChatSidebarItem.css.js';
import { translate } from '../../locale/index.js';

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
    agentColor: '',
    statusKind: '',
    statusIcon: '',
    statusTitle: '',
    hasChildren: false,
    isExpanded: false,
    isActive: false,
    subChats: [],
    deleteTitle: translate('chat.sidebar.delete'),
    deleteChatLabel: translate('chat.sidebar.deleteChat'),
    toggleChildrenLabel: translate('chat.sidebar.toggleChildren'),

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
    this.sub('agentColor', (value) => this._syncAgentColor(value));
    this.sub('statusKind', () => this._syncStatus());
    this.sub('statusIcon', () => this._syncStatus());
    this._syncAgentColor(this.$.agentColor);
    this._syncStatus();

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

  _syncAgentColor(value) {
    if (value) {
      this.style.setProperty('--sn-chat-item-icon-color', value);
    } else {
      this.style.removeProperty('--sn-chat-item-icon-color');
    }
  }

  _syncStatus() {
    let hasStatus = Boolean(this.$.statusKind && this.$.statusIcon);
    this.toggleAttribute('data-has-status', hasStatus);
    if (this.ref.statusIcon) {
      this.ref.statusIcon.hidden = !hasStatus;
      if (hasStatus) {
        this.ref.statusIcon.setAttribute('data-status', this.$.statusKind);
      } else {
        this.ref.statusIcon.removeAttribute('data-status');
      }
    }
  }
}

ChatSidebarItem.template = html`
<div class="chat-item" ${{ onclick: 'onItemClick' }}>
  <span class="chat-item-icon-slot">
    <span class="material-symbols-outlined chat-icon chat-item-icon" ${{ textContent: 'icon' }}></span>
    <button class="chat-item-delete" ${{ title: 'deleteTitle', '@aria-label': 'deleteChatLabel', onclick: 'onDelete' }}>
      <span class="material-symbols-outlined">delete</span>
    </button>
  </span>
  <span class="chat-item-label" ${{ textContent: 'cleanName' }}></span>
  <span class="material-symbols-outlined chat-status-icon" ref="statusIcon" ${{ textContent: 'statusIcon', title: 'statusTitle' }}></span>
  <span class="chat-item-adapter" ${{ textContent: 'adapter' }}></span>
  <span class="material-symbols-outlined chat-expand-icon" role="button" tabindex="0" ${{ title: 'toggleChildrenLabel', '@aria-label': 'toggleChildrenLabel', onclick: 'onExpandToggle' }}>chevron_right</span>
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
    agentColor: '',
    statusKind: '',
    statusIcon: '',
    statusTitle: '',
    agentType: '',
    isActive: false,
    deleteTitle: translate('chat.sidebar.delete'),
    deleteChatLabel: translate('chat.sidebar.deleteChat'),

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
    this.sub('agentColor', (value) => this._syncAgentColor(value));
    this.sub('statusKind', () => this._syncStatus());
    this.sub('statusIcon', () => this._syncStatus());
    this._syncAgentColor(this.$.agentColor);
    this._syncStatus();
  }

  _syncAgentColor(value) {
    if (value) {
      this.style.setProperty('--sn-chat-item-icon-color', value);
    } else {
      this.style.removeProperty('--sn-chat-item-icon-color');
    }
  }

  _syncStatus() {
    let hasStatus = Boolean(this.$.statusKind && this.$.statusIcon);
    this.toggleAttribute('data-has-status', hasStatus);
    if (this.ref.statusIcon) {
      this.ref.statusIcon.hidden = !hasStatus;
      if (hasStatus) {
        this.ref.statusIcon.setAttribute('data-status', this.$.statusKind);
      } else {
        this.ref.statusIcon.removeAttribute('data-status');
      }
    }
  }
}

ChatSidebarSubItem.template = html`
<div class="chat-item-child" ${{ onclick: 'onItemClick' }}>
  <span class="chat-item-icon-slot">
    <span class="material-symbols-outlined chat-icon chat-item-icon" ${{ textContent: 'icon' }}></span>
    <button class="chat-item-delete" ${{ title: 'deleteTitle', '@aria-label': 'deleteChatLabel', onclick: 'onDelete' }}>
      <span class="material-symbols-outlined">delete</span>
    </button>
  </span>
  <span class="chat-item-label" ${{ textContent: 'cleanName' }}></span>
  <span class="chat-item-type" ${{ textContent: 'agentType' }}></span>
  <span class="material-symbols-outlined chat-status-icon" ref="statusIcon" ${{ textContent: 'statusIcon', title: 'statusTitle' }}></span>
</div>
`;

ChatSidebarItem.rootStyles = css;
ChatSidebarSubItem.rootStyles = css;
ChatSidebarSubItem.reg('chat-sidebar-sub-item');
ChatSidebarItem.reg('chat-sidebar-item');
