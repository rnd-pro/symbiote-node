/**
 * Minimap styles
 * @module symbiote-node/canvas/Minimap.css
 */
import { css } from '@symbiotejs/symbiote';

export const styles = css`
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

  &[hidden] {
    display: none;
  }

  & canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
}
`;
