export default `
:host {
  display: flex;
  flex: 1;
  min-height: 0;
  position: relative;
  background: var(--sn-chat-bg, transparent);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: var(--sn-chat-transcript-padding, 24px 20px 12px);
  display: flex;
  flex-direction: column;
  gap: var(--sn-chat-gap, 8px);
  position: relative;
  z-index: 1;
}

chat-message-item {
  display: contents;
}

.scroll-bottom-btn {
  position: absolute;
  left: 50%;
  bottom: var(--sn-chat-scroll-bottom, var(--chat-transcript-scroll-bottom, 92px));
  z-index: 30;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: var(--sn-node-bg, #222222);
  color: var(--sn-text-dim, #a0a0a0);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transform: translateX(-50%) translateY(4px);
  box-shadow: var(--sn-shadow-lg, 0 6px 18px rgba(0, 0, 0, 0.28));
  transition: opacity 0.15s ease, transform 0.15s ease, background 0.12s ease, color 0.12s ease;
}

.scroll-bottom-btn.visible {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(-50%) translateY(0);
}

.scroll-bottom-btn:hover {
  background: var(--sn-node-hover, #444444);
  color: var(--sn-text, #f0f0f0);
}

.scroll-bottom-btn .material-symbols-outlined {
  font-size: 18px;
}

.live-status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 12px;
  color: var(--sn-text-dim);
  animation: status-fade-in 0.2s ease;
}

.live-status-indicator .material-symbols-outlined {
  color: var(--sn-cat-server, hsl(215, 60%, 55%));
}

@keyframes status-fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
`;
