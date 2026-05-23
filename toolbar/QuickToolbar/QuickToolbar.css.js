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
      background: var(--sn-toolbar-bg);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--sn-toolbar-border);
      box-shadow:
        0 8px 32px var(--sn-shadow-color),
        0 0 0 1px var(--sn-shadow-color);
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
    --sn-button-icon-size: 32px;
    --sn-button-icon-font-size: 18px;
    --sn-button-border: transparent;
    --sn-button-radius: 6px;
    --sn-button-bg: transparent;
    --sn-button-hover-bg: var(--sn-toolbar-hover);
    --sn-button-hover-border: transparent;
    --sn-button-color: var(--sn-toolbar-color);
    --sn-button-focus-ring: var(--sn-effect-focus-ring);
    color: var(--sn-toolbar-color);
    transition:
      background 0.12s,
      color 0.12s,
      transform 0.12s;

    &[hidden] {
      display: none;
    }

    &:hover {
      color: var(--sn-toolbar-active);
      transform: scale(1.1);
    }

    &:active {
      transform: scale(0.95);
    }
  }

  .tb-btn--danger:hover {
    --sn-button-hover-bg: var(--sn-toolbar-danger);
    color: var(--sn-toolbar-danger-color);
  }

  .tb-btn--enter:hover {
    --sn-button-hover-bg: color-mix(in srgb, var(--sn-cat-data) 25%, transparent);
    color: var(--sn-cat-data);
  }

  .tb-icon {
    font-size: 18px;
    pointer-events: none;
  }
`;
