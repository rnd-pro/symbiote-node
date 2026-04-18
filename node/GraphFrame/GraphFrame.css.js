/**
 * GraphFrame styles
 * @module symbiote-node/node/GraphFrame.css
 */
import { css } from '@symbiotejs/symbiote';

export const styles = css`
graph-frame {
  position: absolute;
  display: block;
  border: var(--sn-frame-border-width, 2px) var(--sn-frame-border-style, solid) color-mix(in srgb, var(--frame-color, #4a9eff) 60%, transparent);
  border-radius: var(--sn-frame-radius, 12px);
  background: color-mix(in srgb, var(--frame-color, #4a9eff) 8%, transparent);
  z-index: -1;
  pointer-events: all;
  min-width: 120px;
  min-height: 80px;

  & .sn-frame-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    font-family: var(--sn-frame-font, var(--sn-font, 'Inter', sans-serif));
    font-size: var(--sn-frame-font-size, 13px);
    font-weight: 600;
    color: color-mix(in srgb, var(--frame-color, #4a9eff) 90%, white);
    user-select: none;
    cursor: grab;
    border-bottom: 1px solid color-mix(in srgb, var(--frame-color, #4a9eff) 20%, transparent);
  }

  & .sn-frame-icon {
    font-size: 16px;
    opacity: 0.7;
  }

  & .sn-frame-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  & .sn-frame-resize {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 16px;
    height: 16px;
    cursor: nwse-resize;
    border-right: 3px solid color-mix(in srgb, var(--frame-color, #4a9eff) 40%, transparent);
    border-bottom: 3px solid color-mix(in srgb, var(--frame-color, #4a9eff) 40%, transparent);
    border-radius: 0 0 10px 0;
  }

  &:hover {
    border-color: color-mix(in srgb, var(--frame-color, #4a9eff) 80%, transparent);
  }

  &[data-selected] {
    border-color: var(--frame-color, #4a9eff);
    box-shadow: 0 0 12px color-mix(in srgb, var(--frame-color, #4a9eff) 30%, transparent);
  }
}
`;
