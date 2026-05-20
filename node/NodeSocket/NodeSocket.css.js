/**
 * NodeSocket styles
 * @module symbiote-node/node/NodeSocket.css
 */
import { css } from '@symbiotejs/symbiote';

export let styles = css`
  node-socket {
    display: block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--socket-color, var(--sn-node-accent, #4a9eff));
    border: 2px solid var(--sn-node-bg, #16213e);
    cursor: crosshair;
    flex-shrink: 0;
    transition:
      transform 0.2s ease-out,
      box-shadow 0.2s ease-out;
    z-index: 10;
    position: relative;

    &::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 44px;
      height: 44px;
      transform: translate(-50%, -50%);
    }

    &:hover {
      transform: scale(1.3);
      box-shadow: 0 0 8px var(--socket-color, var(--sn-node-accent));
    }

    &[data-socket-shape='square'] {
      border-radius: 2px;
    }

    &[data-socket-shape='diamond'] {
      border-radius: 1px;
      transform: rotate(45deg) scale(0.85);

      &:hover {
        transform: rotate(45deg) scale(1.1);
      }
    }

    &[data-socket-shape='triangle'] {
      border-radius: 0;
      background: transparent;
      width: 0;
      height: 0;
      border: 6px solid transparent;
      border-left: 10px solid var(--socket-color, var(--sn-node-accent));
      border-right: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    node-socket {
      transition: none;
    }
  }
`;
