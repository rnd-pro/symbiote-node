import { css } from '@symbiotejs/symbiote';

export const styles = css`
panel-menu {
  position: fixed;
  z-index: 1000;
  pointer-events: none;

  .menu-container {
    pointer-events: auto;
    background: var(--bg-popup, #2a2a2a);
    border: 1px solid var(--border-popup, #444);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    min-width: 160px;
    padding: 4px 0;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    cursor: pointer;
    color: var(--text-main, #e0e0e0);
    font-size: 0.85rem;
    transition: background 0.1s;

    &:hover {
      background: var(--bg-hover, #3a3a3a);
    }

    &[active] {
      color: var(--accent, #4a9eff);
    }

    .material-symbols-outlined {
      font-size: 18px;
      opacity: 0.8;
    }
  }
}
`;
