import { html } from '@symbiotejs/symbiote';

export const template = html`
<div ref="canvasContainer" class="canvas-container" tabindex="0">
  <div ref="content" class="content">
    <svg ref="connections" class="sn-connections"></svg>
    <div ref="framesLayer" class="sn-frames"></div>
    <div ref="nodesLayer" class="sn-nodes"></div>
    <quick-toolbar ref="quickToolbar" hidden></quick-toolbar>
  </div>
  <svg ref="pseudoSvg" class="pseudo-svg"></svg>
  <context-menu ref="contextMenu" hidden></context-menu>
  <node-minimap ref="minimap"></node-minimap>
  <node-search ref="nodeSearch" hidden></node-search>
  <graph-breadcrumb ref="breadcrumb" hidden></graph-breadcrumb>
</div>
<inspector-panel ref="inspector" hidden></inspector-panel>
`;
