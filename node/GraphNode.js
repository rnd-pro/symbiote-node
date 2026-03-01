/**
 * GraphNode — visual node card component
 *
 * Renders node header, input/output ports with sockets,
 * and embedded controls. Receives data via _nodeData property.
 *
 * @module symbiote-node/components/GraphNode
 */

import Symbiote from '@symbiotejs/symbiote';
import { template } from './GraphNode.tpl.js';
import { styles } from './GraphNode.css.js';
import './PortItem.js';
import './CtrlItem.js';

/** @type {Object<string, string>} */
const CATEGORY_ICONS = {
  server: 'dns',
  instance: 'memory',
  control: 'tune',
  data: 'database',
  default: 'radio_button_checked',
};

export class GraphNode extends Symbiote {
  destructionDelay = 200;

  init$ = {
    '@node-label': '',
    '@node-category': 'default',
    nodeLabel: '',
    nodeIcon: 'radio_button_checked',
    inputPorts: [],
    outputPorts: [],
    controlsList: [],
  };

  renderCallback() {
    this.sub('@node-label', (val) => {
      this.$.nodeLabel = val || '';
    });
    this.sub('@node-category', (val) => {
      this.$.nodeIcon = CATEGORY_ICONS[val] || CATEGORY_ICONS.default;
    });

    // Populate ports from node data
    if (this._nodeData) {
      this.#populateFromNodeData(this._nodeData);
    }
  }

  /**
   * Populate ports and controls from Node instance
   * @param {import('../core/Node.js').Node} node
   */
  #populateFromNodeData(node) {
    this.set$({
      inputPorts: Object.entries(node.inputs).map(([key, input]) => ({
        key,
        label: input.label || key,
        socketColor: input.socket?.color || 'var(--sn-node-accent)',
        socketName: input.socket?.name || 'any',
        side: 'input',
      })),
      outputPorts: Object.entries(node.outputs).map(([key, output]) => ({
        key,
        label: output.label || key,
        socketColor: output.socket?.color || 'var(--sn-node-accent)',
        socketName: output.socket?.name || 'any',
        side: 'output',
      })),
      controlsList: Object.entries(node.controls).map(([key, ctrl]) => ({
        key,
        label: key,
        inputType: ctrl.type || 'text',
        value: ctrl.value !== undefined ? String(ctrl.value) : '',
        isReadonly: ctrl.readonly || false,
      })),
    });
  }
}

GraphNode.template = template;
GraphNode.rootStyles = styles;

GraphNode.bindAttributes({
  'node-label': 'nodeLabel',
});

GraphNode.reg('graph-node');
