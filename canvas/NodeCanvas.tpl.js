import { html } from '@symbiotejs/symbiote';

export const template = html`
<div ref="canvasContainer" class="sn-canvas-container" tabindex="0">
  <div ref="content" class="sn-content">
    <svg ref="connections" class="sn-connections"></svg>
    <div ref="nodesLayer" class="sn-nodes"></div>
    <quick-toolbar ref="quickToolbar" hidden></quick-toolbar>
  </div>
  <svg ref="pseudoSvg" class="sn-pseudo-svg"></svg>
  <context-menu ref="contextMenu" hidden></context-menu>
</div>
`;
