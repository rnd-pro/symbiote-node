import Symbiote, { css, html } from '@symbiotejs/symbiote';

class AgentPanel extends Symbiote {
  isoMode = true;

  init$ = {
    title: 'Agent Panel',
    status: 'ready',
  };
}

AgentPanel.template = html`
<section class="agent-panel">
  <h2>{{title}}</h2>
  <p>Status: {{status}}</p>
</section>
`;

AgentPanel.rootStyles = css`
agent-panel {
  display: block;
  border: 1px solid var(--sn-color-border, #d8dbe2);
  padding: 12px;
}
`;

AgentPanel.reg('agent-panel');

export default AgentPanel;
