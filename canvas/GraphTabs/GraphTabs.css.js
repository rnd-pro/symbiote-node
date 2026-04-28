/**
 * GraphTabs styles
 * @module symbiote-node/canvas/GraphTabs.css
 */
import { css } from '@symbiotejs/symbiote';

export let styles = css`
  graph-tabs {
    display: flex;
    align-items: stretch;
    height: 32px;
    background: var(--sn-ctx-bg, #1e1e2e);
    border-bottom: 1px solid var(--sn-node-border, rgba(255, 255, 255, 0.08));
    font-family: var(--sn-font, 'Inter', sans-serif);
    font-size: 12px;
    color: var(--sn-text-dim, #a0a0a0);
    overflow-x: auto;
    overflow-y: hidden;
    user-select: none;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  tab-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 14px;
    cursor: pointer;
    white-space: nowrap;
    border-right: 1px solid var(--sn-node-border, rgba(255, 255, 255, 0.06));
    transition: background 0.15s ease-out, color 0.15s ease-out;
    position: relative;

    &:hover {
      background: color-mix(in srgb, currentColor 4%, transparent);
      color: var(--sn-text, #cdd6f4);
    }

    &[data-active] {
      background: var(--sn-node-bg, #2d2d3d);
      color: var(--sn-text, #cdd6f4);

      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: var(--sn-node-selected, #4a9eff);
      }
    }

    & .material-symbols-outlined {
      font-size: 14px;
    }

    & .tab-close {
      font-size: 14px;
      opacity: 0;
      transition: opacity 0.15s;
      padding: 2px;
      border-radius: 3px;

      &:hover {
        background: color-mix(in srgb, currentColor 10%, transparent);
      }
    }

    &:hover .tab-close {
      opacity: 0.7;
    }
  }

  .tab-add {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    cursor: pointer;
    color: var(--sn-text-dim, #a0a0a0);
    transition: background 0.15s ease-out, color 0.15s ease-out;

    &:hover {
      background: color-mix(in srgb, currentColor 4%, transparent);
      color: var(--sn-text, #cdd6f4);
    }

    & .material-symbols-outlined {
      font-size: 16px;
    }
  }
`;
