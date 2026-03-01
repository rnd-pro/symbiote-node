/**
 * InspectorPanel — side panel showing selected node properties
 *
 * Displays node label, type, category, inputs/outputs/controls.
 * Updates when selection changes. Shows "No selection" when nothing selected.
 *
 * @module symbiote-node/inspector/InspectorPanel
 */

import Symbiote from '@symbiotejs/symbiote';
import { template, inspPortItemTemplate, inspCtrlItemTemplate } from './InspectorPanel.tpl.js';
import { styles } from './InspectorPanel.css.js';

export class InspectorPanel extends Symbiote {
  visible = false;
  nodeLabel = '';
  nodeType = '';
  nodeCategory = '';
  nodeId = '';
  inputsList = [];
  outputsList = [];
  controlsList = [];
  hasSelection = false;
  isSubgraph = false;
  innerNodeCount = 0;

  init$ = {
    onEnterSubgraph: () => {
      if (this._canvas && this._currentNodeId) {
        this._canvas.drillDown(this._currentNodeId);
      }
    },
  };

  /** @type {*} */
  _canvas = null;

  /** @type {string|null} */
  _currentNodeId = null;

  /**
   * Show inspector for a node
   * @param {import('../core/Node.js').Node} node
   */
  inspect(node) {
    if (!node) {
      this.clear();
      return;
    }

    const inputs = Object.entries(node.inputs).map(([key, port]) => ({
      key,
      label: port.label || key,
      socketType: port.socket?.type || 'any',
    }));

    const outputs = Object.entries(node.outputs).map(([key, port]) => ({
      key,
      label: port.label || key,
      socketType: port.socket?.type || 'any',
    }));

    const controls = Object.entries(node.controls).map(([key, ctrl]) => ({
      key,
      label: ctrl.label || key,
      value: ctrl.value || '',
      type: ctrl.type || 'text',
    }));

    const isSubgraph = !!node._isSubgraph;
    let innerNodeCount = 0;
    if (isSubgraph && node.innerEditor) {
      innerNodeCount = node.innerEditor.getNodes().length;
    }

    this._currentNodeId = node.id;

    this.set$({
      nodeLabel: node.label,
      nodeType: node.type || 'default',
      nodeCategory: node.category || 'default',
      nodeId: node.id,
      inputsList: inputs,
      outputsList: outputs,
      controlsList: controls,
      hasSelection: true,
      visible: true,
      isSubgraph,
      innerNodeCount,
    });
  }

  /** Clear inspector */
  clear() {
    this._currentNodeId = null;
    this.set$({
      hasSelection: false,
      nodeLabel: '',
      nodeType: '',
      nodeCategory: '',
      nodeId: '',
      inputsList: [],
      outputsList: [],
      controlsList: [],
      isSubgraph: false,
      innerNodeCount: 0,
    });
  }

  renderCallback() {
    this.sub('visible', (val) => {
      if (val) this.removeAttribute('hidden');
      else this.setAttribute('hidden', '');
    });

    this.sub('hasSelection', (val) => {
      const empty = this.querySelector('.sn-insp-empty');
      const content = this.querySelector('.sn-insp-content');
      if (empty) empty.style.display = val ? 'none' : '';
      if (content) content.style.display = val ? '' : 'none';
    });

    this.sub('isSubgraph', (val) => {
      const sgSection = this.querySelector('.sn-insp-subgraph');
      if (sgSection) sgSection.style.display = val ? '' : 'none';
    });
  }
}

// Port item for itemize
class InspPortItem extends Symbiote {
  key = '';
  label = '';
  socketType = '';
}

InspPortItem.template = inspPortItemTemplate;
InspPortItem.reg('sn-insp-port-item');

// Control item for itemize
class InspCtrlItem extends Symbiote {
  key = '';
  label = '';
  value = '';
  type = '';
}

InspCtrlItem.template = inspCtrlItemTemplate;
InspCtrlItem.reg('sn-insp-ctrl-item');

InspectorPanel.template = template;
InspectorPanel.rootStyles = styles;
InspectorPanel.reg('inspector-panel');
