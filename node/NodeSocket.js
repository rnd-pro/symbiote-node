/**
 * NodeSocket — connection endpoint circle
 *
 * Visual socket indicator for node ports.
 * Changes color via socket data attribute.
 *
 * @module symbiote-node/components/NodeSocket
 */

import Symbiote, { html, css } from '@symbiotejs/symbiote';

export class NodeSocket extends Symbiote {
  init$ = {};

  renderCallback() {
    this.sub('@data-socket-color', (val) => {
      if (val) {
        this.style.setProperty('--socket-color', val);
      }
    });
  }
}

NodeSocket.template = html`<slot></slot>`;
NodeSocket.reg('node-socket');
