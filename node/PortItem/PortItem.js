/**
 * PortItem — itemize item for node ports (input/output)
 *
 * Rendered by GraphNode via itemize API.
 * Registers socket with ConnectFlow for interactive connecting.
 *
 * @module symbiote-node/components/PortItem
 */

import Symbiote from '@symbiotejs/symbiote';
import { template } from './PortItem.tpl.js';
import { styles } from './PortItem.css.js';

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

PortItem.template = template;
PortItem.rootStyles = styles;
PortItem.reg('port-item');

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
