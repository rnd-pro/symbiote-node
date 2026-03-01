/**
 * InspectorPanel — side panel showing selected node properties
 *
 * Displays node label, type, category, inputs/outputs/controls.
 * Updates when selection changes. Shows "No selection" when nothing selected.
 * Symbiote v3: init$, html, css, rootStyles.
 *
 * @module symbiote-node/inspector/InspectorPanel
 */

import Symbiote, { html, css } from '@symbiotejs/symbiote';

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

InspPortItem.template = html`
<div class="sn-insp-port">
  <span class="sn-insp-port-dot"></span>
  <span class="sn-insp-port-label">{{label}}</span>
  <span class="sn-insp-port-type">{{socketType}}</span>
</div>
`;
InspPortItem.reg('sn-insp-port-item');

// Control item for itemize
class InspCtrlItem extends Symbiote {
  key = '';
  label = '';
  value = '';
  type = '';
}

InspCtrlItem.template = html`
<div class="sn-insp-ctrl">
  <span class="sn-insp-ctrl-label">{{label}}</span>
  <span class="sn-insp-ctrl-value">{{value}}</span>
</div>
`;
InspCtrlItem.reg('sn-insp-ctrl-item');

InspectorPanel.template = html`
<div class="sn-insp-header">
  <span class="material-symbols-outlined">info</span>
  <span>Inspector</span>
</div>

<div class="sn-insp-body">
  <div class="sn-insp-empty">
    <span class="material-symbols-outlined">touch_app</span>
    <span>Select a node</span>
  </div>

  <div class="sn-insp-content" style="display:none">
    <div class="sn-insp-field">
      <label>Label</label>
      <div class="sn-insp-value">{{nodeLabel}}</div>
    </div>
    <div class="sn-insp-field">
      <label>Type</label>
      <div class="sn-insp-value sn-insp-tag">{{nodeType}}</div>
    </div>
    <div class="sn-insp-field">
      <label>Category</label>
      <div class="sn-insp-value sn-insp-tag">{{nodeCategory}}</div>
    </div>
    <div class="sn-insp-field">
      <label>ID</label>
      <div class="sn-insp-value sn-insp-mono">{{nodeId}}</div>
    </div>

    <div class="sn-insp-section">
      <div class="sn-insp-section-title">
        <span class="material-symbols-outlined">input</span> Inputs
      </div>
      <div ${{ itemize: 'inputsList', 'item-tag': 'sn-insp-port-item' }}></div>
    </div>

    <div class="sn-insp-section">
      <div class="sn-insp-section-title">
        <span class="material-symbols-outlined">output</span> Outputs
      </div>
      <div ${{ itemize: 'outputsList', 'item-tag': 'sn-insp-port-item' }}></div>
    </div>

    <div class="sn-insp-section">
      <div class="sn-insp-section-title">
        <span class="material-symbols-outlined">tune</span> Controls
      </div>
      <div ${{ itemize: 'controlsList', 'item-tag': 'sn-insp-ctrl-item' }}></div>
    </div>

    <div class="sn-insp-subgraph" style="display:none">
      <div class="sn-insp-section-title">
        <span class="material-symbols-outlined">account_tree</span> Subgraph
      </div>
      <div class="sn-insp-field">
        <label>Inner Nodes</label>
        <div class="sn-insp-value">{{innerNodeCount}}</div>
      </div>
      <button class="sn-insp-enter-btn" ${{ onclick: 'onEnterSubgraph' }}>
        <span class="material-symbols-outlined">login</span>
        Enter Subgraph
      </button>
    </div>
  </div>
</div>
`;

InspectorPanel.rootStyles = css`
inspector-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 280px;
  background: var(--sn-node-bg, #2a2a3e);
  border-left: 1px solid var(--sn-node-border, rgba(255,255,255,0.08));
  display: flex;
  flex-direction: column;
  z-index: 100;
  font-family: var(--sn-font, 'Inter', sans-serif);
  color: var(--sn-text, #d4d4d4);
  overflow-y: auto;
  transition: transform 0.2s ease;

  &[hidden] {
    display: none;
  }

  & .sn-insp-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    font-size: 14px;
    font-weight: 600;
    border-bottom: 1px solid var(--sn-node-border, rgba(255,255,255,0.08));
    background: var(--sn-node-bg, #2a2a3e);
  }

  & .sn-insp-header .material-symbols-outlined {
    font-size: 18px;
    opacity: 0.7;
  }

  & .sn-insp-body {
    flex: 1;
    padding: 12px 16px;
  }

  & .sn-insp-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 40px 0;
    color: var(--sn-text-dim, #888);
    font-size: 13px;
  }

  & .sn-insp-empty .material-symbols-outlined {
    font-size: 32px;
    opacity: 0.4;
  }

  & .sn-insp-field {
    margin-bottom: 12px;
  }

  & .sn-insp-field label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--sn-text-dim, #888);
    margin-bottom: 4px;
    letter-spacing: 0.5px;
  }

  & .sn-insp-value {
    font-size: 13px;
    padding: 6px 8px;
    background: rgba(255,255,255,0.04);
    border-radius: 4px;
  }

  & .sn-insp-tag {
    display: inline-block;
    padding: 2px 8px;
    font-size: 11px;
    border-radius: 4px;
    background: color-mix(in srgb, var(--sn-cat-server, #5cb8ff) 15%, transparent);
    color: var(--sn-cat-server, #5cb8ff);
  }

  & .sn-insp-mono {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 11px;
    opacity: 0.6;
  }

  & .sn-insp-section {
    margin-top: 16px;
  }

  & .sn-insp-section-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--sn-text-dim, #888);
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  & .sn-insp-section-title .material-symbols-outlined {
    font-size: 16px;
    opacity: 0.6;
  }
}

.sn-insp-port {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 4px;
  margin-bottom: 2px;
}

.sn-insp-port:hover {
  background: rgba(255,255,255,0.04);
}

.sn-insp-port-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--sn-cat-server, #5cb8ff);
  flex-shrink: 0;
}

.sn-insp-port-label {
  flex: 1;
}

.sn-insp-port-type {
  font-size: 10px;
  color: var(--sn-text-dim, #888);
  font-family: 'SF Mono', 'Fira Code', monospace;
}

.sn-insp-ctrl {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 4px;
  margin-bottom: 2px;
}

.sn-insp-ctrl:hover {
  background: rgba(255,255,255,0.04);
}

.sn-insp-ctrl-label {
  color: var(--sn-text-dim, #aaa);
}

.sn-insp-ctrl-value {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 11px;
}

.sn-insp-enter-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px 16px;
  margin-top: 12px;
  border: 1px solid rgba(167, 139, 250, 0.3);
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(167, 139, 250, 0.12) 0%, rgba(109, 40, 217, 0.08) 100%);
  color: var(--sn-subgraph-accent, #a78bfa);
  font-family: var(--sn-font, 'Inter', sans-serif);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.1s;
}

.sn-insp-enter-btn:hover {
  background: linear-gradient(135deg, rgba(167, 139, 250, 0.22) 0%, rgba(109, 40, 217, 0.15) 100%);
  border-color: rgba(167, 139, 250, 0.5);
}

.sn-insp-enter-btn:active {
  transform: scale(0.97);
}

.sn-insp-enter-btn .material-symbols-outlined {
  font-size: 18px;
}
`;

InspectorPanel.reg('inspector-panel');
