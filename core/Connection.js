/**
 * Connection — link between two node ports
 *
 * Uses agi-graph naming: from/out/to/in
 * Adds connection ID for selection/history support.
 *
 * @module symbiote-node/core/Connection
 */

import { uid } from './Socket.js';

export class Connection {
  /**
   * @param {import('./Node.js').Node} sourceNode - Source node
   * @param {string} sourceOutput - Output port key
   * @param {import('./Node.js').Node} targetNode - Target node
   * @param {string} targetInput - Input port key
   */
  constructor(sourceNode, sourceOutput, targetNode, targetInput) {
    if (!sourceNode.outputs[sourceOutput]) {
      throw new Error(`source node doesn't have output '${sourceOutput}'`);
    }
    if (!targetNode.inputs[targetInput]) {
      throw new Error(`target node doesn't have input '${targetInput}'`);
    }

    /** @type {string} */
    this.id = uid('conn');

    /** @type {string} - Source node ID (agi-graph: 'from') */
    this.from = sourceNode.id;

    /** @type {string} - Source output key (agi-graph: 'out') */
    this.out = sourceOutput;

    /** @type {string} - Target node ID (agi-graph: 'to') */
    this.to = targetNode.id;

    /** @type {string} - Target input key (agi-graph: 'in') */
    this.in = targetInput;

    /** @type {boolean} */
    this.selected = false;
  }
}
