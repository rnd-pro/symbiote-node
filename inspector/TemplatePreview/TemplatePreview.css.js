/**
 * TemplatePreview styles
 * @module symbiote-node/inspector/TemplatePreview.css
 */
import { css } from '@symbiotejs/symbiote';

export const styles = css`
template-preview {
  display: block;
  padding-top: 8px;

  & .tpl-preview-section {
    margin-bottom: 10px;
  }

  & .tpl-chips-label,
  & .tpl-preview-label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--sn-text-dim, #888);
    margin-bottom: 4px;
    letter-spacing: 0.5px;
  }

  & .tpl-chips-label .material-symbols-outlined,
  & .tpl-preview-label .material-symbols-outlined {
    font-size: 14px;
    opacity: 0.6;
  }

  & .tpl-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  & .tpl-chips-empty {
    font-size: 11px;
    color: var(--sn-text-dim, #666);
    font-style: italic;
    padding: 4px 0;

    &[hidden] {
      display: none;
    }
  }

  & .tpl-test-data {
    width: 100%;
    padding: 6px 8px;
    font-size: 11px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    color: var(--sn-text, #d4d4d4);
    background: color-mix(in srgb, currentColor 6%, transparent);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 4px;
    outline: none;
    resize: vertical;
    min-height: 50px;
    box-sizing: border-box;
    line-height: 1.4;
    transition: border-color 0.15s;

    &:focus {
      border-color: var(--sn-node-selected, #4a9eff);
    }
  }

  & .tpl-preview-result {
    font-size: 12px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    color: var(--sn-text, #d4d4d4);
    background: color-mix(in srgb, currentColor 4%, transparent);
    border: 1px solid rgba(255,255,255,0.04);
    border-radius: 4px;
    padding: 8px;
    white-space: pre-wrap;
    word-break: break-word;
    min-height: 30px;
    line-height: 1.4;
  }
}

.tpl-chip {
  display: inline-block;
  padding: 2px 8px;
  font-size: 11px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  border-radius: 10px;
  background: color-mix(in srgb, #4caf50 20%, transparent);
  color: #81c784;
  border: 1px solid rgba(76, 175, 80, 0.3);

  &[data-missing] {
    background: color-mix(in srgb, #f44336 20%, transparent);
    color: #ef9a9a;
    border-color: rgba(244, 67, 54, 0.3);
  }
}
`;
