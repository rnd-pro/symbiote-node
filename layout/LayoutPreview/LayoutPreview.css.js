import { css } from '@symbiotejs/symbiote';

export let styles = css`
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
    background: color-mix(in srgb, var(--sn-danger-color, #ef4444) 30%, transparent);
    border: 2px solid color-mix(in srgb, var(--sn-danger-color, #ef4444) 60%, transparent);
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
