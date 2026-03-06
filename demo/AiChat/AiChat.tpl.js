import { html } from '@symbiotejs/symbiote';

export const template = html`
<div class="chat-header">
  <span class="chat-icon">✦</span>
  <span class="chat-title">AI Assistant</span>
  <span class="chat-status">{{status}}</span>
</div>
<div class="chat-messages" ref="messages"></div>
<div class="chat-input-area">
  <textarea
    ref="input"
    placeholder="Ask about this workflow..."
    rows="2"
    ${{ onkeydown: 'onKeyDown' }}
  ></textarea>
  <button class="chat-send" ${{ onclick: 'onSend' }}>
    <span class="material-symbols-outlined">send</span>
  </button>
</div>
`;
