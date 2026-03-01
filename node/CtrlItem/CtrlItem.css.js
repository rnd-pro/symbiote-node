/**
 * CtrlItem styles
 * @module symbiote-node/node/CtrlItem.css
 */
import { css } from '@symbiotejs/symbiote';

export const styles = css`
ctrl-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 12px;

  & .sn-ctrl-label {
    font-size: 10px;
    text-transform: uppercase;
    color: var(--sn-text-dim, #94a3b8);
    letter-spacing: 0.5px;
  }

  & .sn-ctrl-input {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    padding: 4px 8px;
    color: var(--sn-text, #e2e8f0);
    font-size: 12px;
    outline: none;
    font-family: inherit;

    &:focus {
      border-color: var(--sn-node-accent, #4a9eff);
    }

    &[readonly] {
      opacity: 0.6;
      cursor: default;
    }
  }
}
`;
