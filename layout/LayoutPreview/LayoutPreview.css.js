import { css } from '@symbiotejs/symbiote';

export const styles = css`
layout-preview {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 9999;

  &[hidden] {
    display: none;
  }

  .preview-overlay {
    position: absolute;
    background: rgba(255, 100, 100, 0.3);
    border: 2px solid rgba(255, 100, 100, 0.6);
    display: none;
  }

  &[type="join"] .preview-overlay {
    display: block;
  }

  .preview-line {
    position: absolute;
    background: var(--layout-highlight, #888);
    box-shadow: 0 0 8px var(--layout-highlight, #888);
    display: none;
  }

  &[type="split-h"] .preview-line,
  &[type="split-v"] .preview-line {
    display: block;
  }

  /* Hidden attribute overrides */
  .preview-overlay[hidden],
  .preview-line[hidden] {
    display: none !important;
  }
}
`;
