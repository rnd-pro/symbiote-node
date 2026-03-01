/**
 * InspectorPanel template
 * @module symbiote-node/inspector/InspectorPanel.tpl
 */
import { html } from '@symbiotejs/symbiote';

export const template = html`
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

export const inspPortItemTemplate = html`
<div class="sn-insp-port">
  <span class="sn-insp-port-dot"></span>
  <span class="sn-insp-port-label">{{label}}</span>
  <span class="sn-insp-port-type">{{socketType}}</span>
</div>
`;

export const inspCtrlItemTemplate = html`
<div class="sn-insp-ctrl">
  <span class="sn-insp-ctrl-label">{{label}}</span>
  <span class="sn-insp-ctrl-value">{{value}}</span>
</div>
`;
