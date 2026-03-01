/**
 * PortItem — itemize item for node ports (input/output)
 *
 * Rendered by GraphNode via itemize API.
 * Registers socket with ConnectFlow for interactive connecting.
 *
 * @module symbiote-node/components/PortItem
 */

import Symbiote, { html, css } from '@symbiotejs/symbiote';

export class PortItem extends Symbiote {
  key = '';
  label = '';
  socketColor = '';
  socketName = 'any';
  side = 'input';

  renderCallback() {
    this.sub('socketColor', (val) => {
      if (val) this.style.setProperty('--socket-color', val);
    });
    this.sub('side', (val) => {
      if (val) this.setAttribute('data-side', val);
    });
    this.sub('socketName', (val) => {
      const shape = PortItem.SOCKET_SHAPES[val] || 'circle';
      const socketEl = this.ref.socket;
      if (socketEl) socketEl.setAttribute('data-socket-shape', shape);
    });

    // Deferred socket registration — _canvas may not be set yet
    this.#deferRegisterSocket(0);
  }

  /**
   * Retry registration until graph-node._canvas is available
   * @param {number} attempt
   */
  #deferRegisterSocket(attempt) {
    if (attempt > 10) return;

    const socketEl = this.ref.socket;
    if (!socketEl) return;

    const graphNode = this.closest('graph-node');
    if (!graphNode || !graphNode._canvas) {
      requestAnimationFrame(() => this.#deferRegisterSocket(attempt + 1));
      return;
    }

    const connectFlow = graphNode._canvas.getConnectFlow();
    if (!connectFlow) return;

    const nodeId = graphNode.getAttribute('node-id');
    const key = this.$.key;
    const side = this.$.side;

    /** @type {import('../interactions/ConnectFlow.js').SocketData} */
    const socketData = { nodeId, key, side, element: socketEl };
    socketEl._socketData = socketData;

    connectFlow.registerSocket(socketEl, socketData);
  }
}

PortItem.template = html`
<div ref="socket" class="sn-socket" ${{ '@data-key': 'key' }}></div>
<span class="sn-port-label">{{label}}</span>
`;

PortItem.rootStyles = css`
sn-port-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 12px;
  min-height: 28px;

  &[data-side="input"] {
    flex-direction: row;

    & .sn-socket {
      margin-left: -22px;
    }
  }

  &[data-side="output"] {
    flex-direction: row-reverse;

    & .sn-socket {
      margin-right: -22px;
    }
  }

  & .sn-socket {
    position: relative;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: transparent;
    cursor: crosshair;
    flex-shrink: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;

    &::after {
      content: '';
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--socket-color, var(--sn-node-accent, #4a9eff));
      border: 2px solid var(--sn-node-bg, #16213e);
      transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
      pointer-events: none;
    }

    &[data-socket-shape="square"]::after {
      border-radius: 2px;
    }

    &[data-socket-shape="diamond"]::after {
      border-radius: 1px;
      transform: rotate(45deg) scale(0.85);
    }

    &[data-socket-shape="diamond"]:hover::after {
      transform: rotate(45deg) scale(1.1);
    }

    &[data-socket-shape="triangle"]::after {
      border-radius: 0;
      background: transparent;
      width: 0;
      height: 0;
      border: 6px solid transparent;
      border-left: 10px solid var(--socket-color, var(--sn-node-accent));
      border-right: none;
    }

    &:hover::after {
      transform: scale(1.3);
      box-shadow: 0 0 8px var(--socket-color, var(--sn-node-accent));
    }
  }

  & .sn-port-label {
    color: var(--sn-text-dim, #94a3b8);
    font-size: 12px;
    white-space: nowrap;
  }
}
`;

PortItem.reg('sn-port-item');

/** @type {Object<string, string>} - Socket type name to visual shape */
PortItem.SOCKET_SHAPES = {
  number: 'circle',
  string: 'circle',
  boolean: 'circle',
  any: 'circle',
  array: 'square',
  object: 'square',
  json: 'square',
  exec: 'diamond',
  execution: 'diamond',
  trigger: 'diamond',
  event: 'triangle',
  signal: 'triangle',
};
