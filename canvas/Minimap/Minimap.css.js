/**
 * Minimap styles
 * @module symbiote-node/canvas/Minimap.css
 */
import { css } from '@symbiotejs/symbiote';

export let styles = css`
node-minimap {
  position: absolute;
  bottom: 16px;
  right: 16px;
  width: 200px;
  height: 140px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--sn-node-border, rgba(255,255,255,0.08));
  box-shadow: 0 4px 16px var(--sn-shadow-color, rgba(0,0,0,0.3));
  z-index: 90;
  cursor: crosshair;
  opacity: 1;
  transition: opacity 0.4s ease;

  &[hidden] {
    display: none;
  }

  &[data-fading] {
    opacity: 0;
    pointer-events: none;
  }

  & canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
}

.sn-minimap-toggle {
  position: absolute;
  bottom: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid var(--sn-node-border, rgba(255,255,255,0.08));
  background: var(--sn-node-bg, #2a2a3e);
  color: var(--sn-text-dim, #888);
  cursor: pointer;
  z-index: 89;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: color 0.15s, border-color 0.15s;

  & .material-symbols-outlined {
    font-size: 18px;
  }

  &:hover {
    color: var(--sn-text, #ddd);
    border-color: var(--sn-node-selected, #4a9eff);
  }

  &[data-active] {
    color: var(--sn-node-selected, #4a9eff);
    border-color: var(--sn-node-selected, #4a9eff);
  }
}
`;
