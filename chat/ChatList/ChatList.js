import { Symbiote } from '@symbiotejs/symbiote';
import '../ChatListItem/ChatListItem.js';
import template from './ChatList.tpl.js';
import css from './ChatList.css.js';

export class ChatList extends Symbiote {
  init$ = {
    filter: 'all',
    chatItems: [],
    title: 'Chats',
    newLabel: 'New',
    emptyMessage: 'No chats yet.',
    onFilterClick: (event) => {
      this.setFilter(event.currentTarget?.dataset?.filter || 'all');
    },
    onNewChat: () => {
      this.dispatchEvent(new CustomEvent('chat-list-new', { bubbles: true, composed: true }));
    },
    onChatSelect: (event) => {
      let item = this.getChatItemHost(event);
      if (!item?.$.id) return;
      this.dispatchEvent(new CustomEvent('chat-list-select', {
        bubbles: true,
        composed: true,
        detail: { id: item.$.id, item },
      }));
    },
    onChatDelete: (event) => {
      event.stopPropagation();
      let item = this.getChatItemHost(event);
      if (!item?.$.id) return;
      this.dispatchEvent(new CustomEvent('chat-list-delete', {
        bubbles: true,
        composed: true,
        detail: { id: item.$.id, item },
      }));
    },
  };

  renderCallback() {
    this.sub('filter', () => this.syncFilterButtons());
    this.syncFilterButtons();
  }

  setItems(items = []) {
    this.$.chatItems = Array.isArray(items) ? items : [];
    this.renderEmptyState();
  }

  setEmptyMessage(message) {
    this.$.emptyMessage = message || '';
    this.renderEmptyState();
  }

  setFilter(filter = 'all') {
    this.$.filter = filter || 'all';
    this.dispatchEvent(new CustomEvent('chat-list-filter', {
      bubbles: true,
      composed: true,
      detail: { filter: this.$.filter },
    }));
  }

  getChatItemHost(event) {
    return event.composedPath?.().find((el) => el?.tagName?.toLowerCase() === 'chat-list-item')
      || event.target?.closest?.('chat-list-item')
      || event.target?.getRootNode?.().host;
  }

  renderEmptyState() {
    let container = this.ref.items;
    if (!container || this.$.chatItems.length > 0) return;
    container.innerHTML = `
      <div class="ui-empty-state">
        <span class="material-symbols-outlined" style="font-size:32px;display:block;margin-bottom:8px;opacity:0.3">chat_bubble_outline</span>
        ${this.$.emptyMessage}
      </div>
    `;
  }

  syncFilterButtons() {
    this.querySelectorAll('.chat-list-filter-btn').forEach((button) => {
      button.toggleAttribute('active', button.dataset.filter === this.$.filter);
    });
  }
}

ChatList.template = template;
ChatList.rootStyles = css;
ChatList.reg('chat-list');

export default ChatList;
