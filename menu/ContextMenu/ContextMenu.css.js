/**
 * ContextMenu styles
 * @module symbiote-node/menu/ContextMenu.css
 */
import { css } from '@symbiotejs/symbiote';

export const styles = css`
context-menu {
  position: absolute;
  inset: 0;
  z-index: 200;
  pointer-events: none;

  &[hidden] {
    display: none;
  }

  & .sn-ctx-backdrop {
    position: absolute;
    inset: 0;
    pointer-events: all;
  }

  & .sn-ctx-menu {
    position: absolute;
    pointer-events: all;
    min-width: 160px;
    background: var(--sn-ctx-bg, #1e1e3a);
    border: 1px solid var(--sn-ctx-border, #3a3a6a);
    border-radius: 8px;
    box-shadow: 0 8px 24px var(--sn-shadow-color, rgba(0, 0, 0, 0.5));
    padding: 4px;
    overflow: hidden;
  }
}

.sn-ctx-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--sn-ctx-color, #e0e0e0);
  font-family: var(--sn-font, 'Inter', sans-serif);
  font-size: 13px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.1s;

  &:hover {
    background: var(--sn-ctx-hover, rgba(74, 158, 255, 0.15));
  }
}

.sn-ctx-icon {
  font-size: 18px;
  opacity: 0.7;
}

/* === Liquid Glass theme overrides === */
[data-sn-theme="glass"] .sn-ctx-menu {
  backdrop-filter: blur(24px) saturate(1.5);
  -webkit-backdrop-filter: blur(24px) saturate(1.5);
  border: 1px solid hsla(0, 0%, 100%, 0.15);
  border-radius: 14px;
  box-shadow:
    0 8px 32px var(--sn-shadow-color, rgba(0, 0, 0, 0.4)),
    inset 0 1px 0 hsla(0, 0%, 100%, 0.1);
}
`;
