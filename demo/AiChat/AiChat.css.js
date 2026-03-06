import { css } from '@symbiotejs/symbiote';

export const styles = css`
ai-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--sn-bg, #1a1a2e);
  color: var(--sn-text, #c8c8d4);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13px;
}

ai-chat .chat-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--sn-node-border, rgba(255, 255, 255, 0.06));
  flex-shrink: 0;
}

ai-chat .chat-icon {
  font-size: 16px;
  background: linear-gradient(135deg, var(--sn-cat-data, #a78bfa), var(--sn-node-selected, #4a9eff));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

ai-chat .chat-title {
  font-weight: 600;
  font-size: 13px;
}

ai-chat .chat-status {
  margin-left: auto;
  font-size: 10px;
  opacity: 0.4;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

ai-chat .chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

ai-chat .chat-bubble {
  max-width: 90%;
  padding: 8px 12px;
  border-radius: 12px;
  line-height: 1.5;
  font-size: 12.5px;
  animation: chat-fade-in 0.2s ease-out;
}

ai-chat .chat-bubble[data-role="user"] {
  align-self: flex-end;
  background: linear-gradient(135deg, color-mix(in srgb, var(--sn-node-selected, #4a9eff) 20%, transparent), color-mix(in srgb, var(--sn-cat-data, #a78bfa) 20%, transparent));
  border: 1px solid color-mix(in srgb, var(--sn-node-selected, #4a9eff) 15%, transparent);
  border-bottom-right-radius: 4px;
}

ai-chat .chat-bubble[data-role="ai"] {
  align-self: flex-start;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-bottom-left-radius: 4px;
}

ai-chat .chat-bubble[data-role="ai"] .ai-prefix {
  color: var(--sn-cat-data, #a78bfa);
  font-weight: 600;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  display: block;
  margin-bottom: 4px;
}

ai-chat .chat-bubble code {
  background: rgba(255, 255, 255, 0.08);
  padding: 1px 4px;
  border-radius: 3px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 11px;
}

ai-chat .chat-input-area {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  padding: 10px 12px;
  border-top: 1px solid var(--sn-node-border, rgba(255, 255, 255, 0.06));
  flex-shrink: 0;
}

ai-chat .chat-input-area textarea {
  flex: 1;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: inherit;
  font-family: inherit;
  font-size: 12px;
  padding: 8px 10px;
  resize: none;
  outline: none;
  transition: border-color 0.15s;

  &:focus {
    border-color: color-mix(in srgb, var(--sn-node-selected, #4a9eff) 30%, transparent);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.2);
  }
}

ai-chat .chat-send {
  background: linear-gradient(135deg, var(--sn-node-selected, #4a9eff), var(--sn-cat-data, #a78bfa));
  border: none;
  border-radius: 8px;
  color: white;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: opacity 0.15s, transform 0.1s;

  &:hover { opacity: 0.85; }
  &:active { transform: scale(0.95); }

  & .material-symbols-outlined { font-size: 18px; }
}

ai-chat .typing-dots {
  display: inline-flex;
  gap: 3px;
  padding: 4px 0;
}

ai-chat .typing-dots span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  animation: typing-bounce 1.2s ease-in-out infinite;

  &:nth-child(2) { animation-delay: 0.2s; }
  &:nth-child(3) { animation-delay: 0.4s; }
}

@keyframes typing-bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.3; }
  30% { transform: translateY(-4px); opacity: 0.8; }
}

@keyframes chat-fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
`;
