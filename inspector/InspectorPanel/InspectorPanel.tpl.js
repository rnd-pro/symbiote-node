/**
 * InspectorPanel template
 * @module symbiote-node/inspector/InspectorPanel.tpl
 */
import { html } from '@symbiotejs/symbiote';

export const template = html`
<div class="insp-header">
  <span class="material-symbols-outlined">info</span>
  <span>Inspector</span>
</div>

<div class="insp-body">
  <div class="insp-empty">
    <span class="material-symbols-outlined">touch_app</span>
    <span>Select a node</span>
  </div>

  <div class="insp-content" hidden>
    <div class="insp-field">
      <label>Label</label>
      <div class="insp-value">{{nodeLabel}}</div>
    </div>
    <div class="insp-field">
      <label>Type</label>
      <div class="insp-value insp-tag">{{nodeType}}</div>
    </div>
    <div class="insp-field">
      <label>Category</label>
      <div class="insp-value insp-tag">{{nodeCategory}}</div>
    </div>
    <div class="insp-field">
      <label>ID</label>
      <div class="insp-value insp-mono">{{nodeId}}</div>
    </div>

    <div class="insp-section">
      <div class="insp-section-title">
        <span class="material-symbols-outlined">input</span> Inputs
      </div>
      <div ${{ itemize: 'inputsList', 'item-tag': 'insp-port-item' }}></div>
    </div>

    <div class="insp-section">
      <div class="insp-section-title">
        <span class="material-symbols-outlined">output</span> Outputs
      </div>
      <div ${{ itemize: 'outputsList', 'item-tag': 'insp-port-item' }}></div>
    </div>

    <div class="insp-section">
      <div class="insp-section-title">
        <span class="material-symbols-outlined">tune</span> Controls
      </div>
      <div ${{ itemize: 'controlsList', 'item-tag': 'insp-ctrl-item' }}></div>
    </div>

    <div class="insp-subgraph" hidden>
      <div class="insp-section-title">
        <span class="material-symbols-outlined">account_tree</span> Subgraph
      </div>
      <div class="insp-field">
        <label>Inner Nodes</label>
        <div class="insp-value">{{innerNodeCount}}</div>
      </div>
      <button class="insp-enter-btn" ${{ onclick: 'onEnterSubgraph' }}>
        <span class="material-symbols-outlined">login</span>
        Enter Subgraph
      </button>
    </div>
  </div>
</div>
`;

export const inspPortItemTemplate = html`
<div class="insp-port">
  <span class="insp-port-dot"></span>
  <span class="insp-port-label">{{label}}</span>
  <span class="insp-port-type">{{socketType}}</span>
</div>
`;

export const inspCtrlItemTemplate = html`
<div class="insp-ctrl">
  <span class="insp-ctrl-label">{{label}}</span>
  <span class="insp-ctrl-value">{{value}}</span>
</div>
`;
