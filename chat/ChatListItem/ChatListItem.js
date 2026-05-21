import Symbiote from '@symbiotejs/symbiote';
import template from './ChatListItem.tpl.js';
import css from './ChatListItem.css.js';

export class ChatListItem extends Symbiote {
  init$ = {
    id: '',
    name: '',
    project: '',
    adapter: '',
    status: '',
    time: '',
    lastMessage: '',
    depth: 0,
    isActive: false,
  };

  renderCallback() {
    this.sub('isActive', (isActive) => {
      this.ref.item.classList.toggle('active', Boolean(isActive));
    });
    this.sub('depth', (depth) => {
      this.ref.item.classList.toggle('chat-item-nested', Number(depth) > 0);
    });
  }
}

ChatListItem.template = template;
ChatListItem.rootStyles = css;
ChatListItem.reg('chat-list-item');

export default ChatListItem;
