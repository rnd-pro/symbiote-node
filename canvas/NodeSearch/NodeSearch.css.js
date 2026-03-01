/**
 * NodeSearch styles
 * @module symbiote-node/canvas/NodeSearch.css
 */
import { css } from '@symbiotejs/symbiote';

export const styles = css`
node-search {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  width: 360px;
  z-index: 200;
  font-family: var(--sn-font, 'Inter', sans-serif);

  &[hidden] {
    display: none;
  }

  & .sn-search-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    background: var(--sn-node-bg, #2a2a3e);
    border: 1px solid var(--sn-node-border, rgba(255,255,255,0.12));
    border-radius: 10px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  }

  & .sn-search-icon {
    font-size: 18px;
    color: var(--sn-text-dim, #888);
  }

  & .sn-search-input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    color: var(--sn-text, #d4d4d4);
    font-size: 14px;
    font-family: inherit;
  }

  & .sn-search-input::placeholder {
    color: var(--sn-text-dim, #666);
  }

  & .sn-search-hint {
    font-size: 11px;
    color: var(--sn-text-dim, #555);
    padding: 2px 6px;
    border: 1px solid var(--sn-node-border, rgba(255,255,255,0.08));
    border-radius: 4px;
  }

  & .sn-search-results {
    margin-top: 4px;
    background: var(--sn-node-bg, #2a2a3e);
    border-radius: 8px;
    border: 1px solid var(--sn-node-border, rgba(255,255,255,0.08));
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    overflow: hidden;
    max-height: 300px;
    overflow-y: auto;
  }

  & .sn-search-results:empty {
    display: none;
  }
}

.sn-search-result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  cursor: pointer;
  color: var(--sn-text, #d4d4d4);
  font-size: 13px;
  transition: background 0.1s;

  &:hover {
    background: rgba(255,255,255,0.06);
  }
}

.sn-search-result-type {
  font-size: 11px;
  color: var(--sn-text-dim, #888);
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(255,255,255,0.05);
}
`;
