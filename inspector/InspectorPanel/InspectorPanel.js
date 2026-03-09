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
import '../TemplatePreview/TemplatePreview.js';

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
    isFireable: false,
    isSubgraph: false,
    isTemplateBuilder: false,
    innerNodeCount: 0,
    onFire: () => {
      if (this._currentNodeId) {
        this.dispatchEvent(new CustomEvent('node-fire', {
          detail: { nodeId: this._currentNodeId },
          bubbles: true,
          composed: true,
        }));
      }
    },
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
   * @param {*} node - Node instance or node-like object
   */
  inspect(node) {
    if (!node) {
      this.clear();
      return;
    }

    const inputs = Object.entries(node.inputs).map(([key, port]) => ({
      key,
      label: port.label || key,
      socketType: port.socket?.name || 'any',
    }));

    const outputs = Object.entries(node.outputs).map(([key, port]) => ({
      key,
      label: port.label || key,
      socketType: port.socket?.name || 'any',
    }));

    const controls = Object.entries(node.controls).map(([key, ctrl]) => ({
      key,
      label: ctrl.label || key,
      value: ctrl.value ?? '',
      type: ctrl.type || 'text',
      options: (ctrl.options || []).join(','),
    }));

    const isSubgraph = !!node._isSubgraph;
    let innerNodeCount = 0;
    if (isSubgraph && node.innerEditor) {
      innerNodeCount = node.innerEditor.getNodes().length;
    }

    this._currentNodeId = node.id;

    // Check if node is fireable (inject or trigger with testData)
    const driver = node.driver || node._driver;
    const isFireable = !!(driver?.fireable) ||
      node.type === 'debug/inject' ||
      (node.category === 'trigger' || node.category === 'queue');

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
      isFireable,
      isSubgraph,
      isTemplateBuilder: node.type === 'transform/template-builder' || node.type === 'transform/template',
      innerNodeCount,
    });

    // Populate template-preview with current template value
    if (node.type === 'transform/template-builder' || node.type === 'transform/template') {
      requestAnimationFrame(() => {
        /** @type {*} */
        const preview = this.querySelector('template-preview');
        if (preview && node.params?.template) {
          preview.$.template = node.params.template;
        }
      });
    }
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
      isFireable: false,
      isSubgraph: false,
      isTemplateBuilder: false,
      innerNodeCount: 0,
    });
  }

  renderCallback() {
    this.sub('visible', (val) => {
      this.toggleAttribute('hidden', !val);
    });

    // Listen for control value changes from InspCtrlItem
    this.addEventListener('ctrl-change', (/** @type {CustomEvent} */ e) => {
      const { key, value } = e.detail;
      if (this._currentNodeId && this._canvas) {
        const editor = this._canvas._editor;
        if (editor) {
          const node = editor.getNode(this._currentNodeId);
          if (node && node.controls[key]) {
            node.controls[key].setValue(value);
          }
          // Also update params for serialization
          if (node && node.params) {
            node.params[key] = value;
          }
          // Update template-preview when template field changes
          if (key === 'template') {
            const preview = this.querySelector('template-preview');
            if (preview) preview.$.template = value;
          }
        }
      }
    });

    this.sub('hasSelection', (val) => {
      /** @type {HTMLElement} */
      const empty = this.querySelector('.insp-empty');
      /** @type {HTMLElement} */
      const content = this.querySelector('.insp-content');
      if (empty) empty.hidden = val;
      if (content) content.hidden = !val;
    });

    this.sub('isSubgraph', (val) => {
      /** @type {HTMLElement} */
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

      /** @param {PointerEvent} e */
      const onMove = (e) => {
        const delta = startX - e.clientX;
        const newWidth = Math.max(200, Math.min(600, startW + delta));
        this.style.width = newWidth + 'px';
      };

      const onUp = () => {
        handle.classList.remove('dragging');
        localStorage.setItem(STORAGE_KEY, String(this.offsetWidth));
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
      };

      handle.addEventListener('pointerdown', (/** @type {PointerEvent} */ e) => {
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

// Control item for itemize — renders editable form controls
class InspCtrlItem extends Symbiote {
  init$ = {
    key: '',
    label: '',
    value: '',
    type: 'text',
    options: '',
  };

  renderCallback() {
    /** @type {HTMLElement} */
    const container = this.querySelector('.insp-ctrl-input');
    if (!container) return;

    this.sub('type', (type) => {
      this._renderControl(container, type);
    });
  }

  /**
   * Render the appropriate control element
   * @param {HTMLElement} container
   * @param {string} type
   */
  _renderControl(container, type) {
    container.innerHTML = '';

    if (type === 'textarea') {
      const el = document.createElement('textarea');
      el.className = 'insp-ctrl-textarea';
      el.value = this.$.value || '';
      el.rows = 6;
      el.spellcheck = false;
      el.addEventListener('input', () => this._emitChange(el.value));
      container.appendChild(el);
    } else if (type === 'boolean') {
      const label = document.createElement('label');
      label.className = 'insp-ctrl-toggle';
      const el = document.createElement('input');
      el.type = 'checkbox';
      el.checked = this.$.value === true || this.$.value === 'true';
      el.addEventListener('change', () => this._emitChange(el.checked));
      const slider = document.createElement('span');
      slider.className = 'insp-ctrl-slider';
      label.appendChild(el);
      label.appendChild(slider);
      container.appendChild(label);
    } else if (type === 'select') {
      const el = document.createElement('select');
      el.className = 'insp-ctrl-select';
      const opts = typeof this.$.options === 'string'
        ? this.$.options.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      for (const opt of opts) {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        if (opt === String(this.$.value)) option.selected = true;
        el.appendChild(option);
      }
      el.addEventListener('change', () => this._emitChange(el.value));
      container.appendChild(el);
    } else {
      // text / number
      const el = document.createElement('input');
      el.className = 'insp-ctrl-input-el';
      el.type = type === 'number' ? 'number' : 'text';
      el.value = this.$.value ?? '';
      el.spellcheck = false;
      el.addEventListener('input', () => {
        this._emitChange(type === 'number' ? Number(el.value) : el.value);
      });
      container.appendChild(el);
    }
  }

  /**
   * Emit change event to parent InspectorPanel
   * @param {*} value
   */
  _emitChange(value) {
    this.$.value = value;
    this.dispatchEvent(new CustomEvent('ctrl-change', {
      bubbles: true,
      detail: { key: this.$.key, value },
    }));
  }
}

InspCtrlItem.template = inspCtrlItemTemplate;
InspCtrlItem.reg('insp-ctrl-item');

InspectorPanel.template = template;
InspectorPanel.rootStyles = styles;
InspectorPanel.reg('inspector-panel');
