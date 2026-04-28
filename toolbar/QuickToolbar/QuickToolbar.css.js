/**
 * QuickToolbar styles
 * @module symbiote-node/toolbar/QuickToolbar.css
 */
import { css } from '@symbiotejs/symbiote';

export let styles = css`
quick-toolbar {
  position: absolute;
  z-index: 150;
  pointer-events: all;
  transform-origin: center bottom;

  &[hidden] {
    display: none;
  }

  & .toolbar {
    display: flex;
    gap: 2px;
    padding: 4px;
    border-radius: 10px;
    background: var(--sn-toolbar-bg, rgba(22, 33, 62, 0.92));
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--sn-toolbar-border, rgba(255, 255, 255, 0.1));
    box-shadow: 0 8px 32px var(--sn-shadow-color, rgba(0, 0, 0, 0.45)), 0 0 0 1px var(--sn-shadow-color, rgba(0, 0, 0, 0.1));
    transform: translateX(-50%);
    animation: toolbar-in 0.2s ease-out;
  }
}

@keyframes toolbar-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(6px) scale(0.92);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

.tb-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--sn-toolbar-color, #c0c8d8);
  cursor: pointer;
  transition: background 0.12s, color 0.12s, transform 0.12s;

  &[hidden] {
    display: none;
  }

  &:hover {
    background: var(--sn-toolbar-hover, rgba(74, 158, 255, 0.2));
    color: var(--sn-toolbar-active, #e2e8f0);
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
}

.tb-btn--danger:hover {
  background: var(--sn-toolbar-danger, rgba(255, 107, 107, 0.25));
  color: var(--sn-toolbar-danger-color, #ff6b6b);
}

.tb-btn--enter:hover {
  background: color-mix(in srgb, var(--sn-cat-data, #a78bfa) 25%, transparent);
  color: var(--sn-cat-data, #a78bfa);
}

.tb-icon {
  font-size: 18px;
  pointer-events: none;
}
`;
