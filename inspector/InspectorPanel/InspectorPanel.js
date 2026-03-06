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
  init$ = {
    visible: false,
    nodeLabel: '',
    nodeType: '',
    nodeCategory: '',
    nodeId: '',
    inputsList: [],
    outputsList: [],
    controlsList: [],
    hasSelection: false,
    isSubgraph: false,
    innerNodeCount: 0,
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
      this.toggleAttribute('hidden', !val);
    });

    this.sub('hasSelection', (val) => {
      const empty = this.querySelector('.insp-empty');
      const content = this.querySelector('.insp-content');
      if (empty) empty.hidden = val;
      if (content) content.hidden = !val;
    });

    this.sub('isSubgraph', (val) => {
      const sgSection = this.querySelector('.insp-subgraph');
      if (sgSection) sgSection.hidden = !val;
    });

    // Resize drag handle
    const STORAGE_KEY = 'sn-inspector-width';
    const handle = this.querySelector('.insp-resize-handle');

    // Restore saved width
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) this.style.width = saved + 'px';

    if (handle) {
      let startX = 0;
      let startW = 0;

      const onMove = (e) => {
        const delta = startX - e.clientX;
        const newWidth = Math.max(200, Math.min(600, startW + delta));
        this.style.width = newWidth + 'px';
      };

      const onUp = () => {
        handle.classList.remove('dragging');
        localStorage.setItem(STORAGE_KEY, this.offsetWidth);
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
      };

      handle.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        startX = e.clientX;
        startW = this.offsetWidth;
        handle.classList.add('dragging');
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
      });
    }
  }
}

// Port item for itemize
class InspPortItem extends Symbiote {
  init$ = {
    key: '',
    label: '',
    socketType: '',
  };
}

InspPortItem.template = inspPortItemTemplate;
InspPortItem.reg('insp-port-item');

// Control item for itemize
class InspCtrlItem extends Symbiote {
  init$ = {
    key: '',
    label: '',
    value: '',
    type: '',
  };
}

InspCtrlItem.template = inspCtrlItemTemplate;
InspCtrlItem.reg('insp-ctrl-item');

InspectorPanel.template = template;
InspectorPanel.rootStyles = styles;
InspectorPanel.reg('inspector-panel');
