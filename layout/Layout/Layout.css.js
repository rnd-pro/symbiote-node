import { css } from '@symbiotejs/symbiote';

export const styles = css`
panel-layout {
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  font-family: var(--font-main);

  &[hidden] {
    display: none;
  }

  .layout-root {
    display: flex;
    width: 100%;
    height: 100%;
  }

  /* Fullscreen tab bar */
  .fullscreen-tab-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 28px;
    background: var(--bg-deeper, #1a1a1a);
    display: flex;
    align-items: stretch;
    gap: 0;
    z-index: 10002;
    padding: 0;

    &[hidden] {
      display: none;
    }
  }

  .tab-list {
    display: contents;
  }

  .fullscreen-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 12px;
    height: 28px;
    border: none;
    border-left: none;
    border-right: none;
    background: var(--bg-deeper, #1a1a1a);
    color: var(--text-muted, #666);
    cursor: pointer;
    font-size: 12px;
    font-family: inherit;
    transition: background 0.15s, color 0.15s;

    .material-symbols-outlined {
      font-size: 16px;
    }

    &:hover {
      background: var(--bg-header, #2d2d2d);
      color: var(--text-main, #e0e0e0);
    }

    &[active] {
      height: 29px;
      margin-bottom: -1px;
      position: relative;
      z-index: 1;
      background: var(--bg-header, #2d2d2d);
      color: var(--text-main, #e0e0e0);
      border-left: 1px solid var(--layout-border, #333);
      border-right: 1px solid var(--layout-border, #333);
    }
  }

  .tab-filler {
    flex: 1;
    height: 28px;
    background: var(--bg-deeper, #1a1a1a);
  }
}
`;
