export default /*css*/ `
:host {
  display: block;
  color: var(--sn-text);
  font-family: var(--sn-font-ui, inherit);
}

:host([hidden]) {
  display: none !important;
}

.output-graph-preview {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: var(--sn-output-preview-gap, 8px);
  min-width: 0;
  padding: var(--sn-output-preview-padding, 10px);
  border: 1px solid var(--sn-output-preview-border, var(--sn-border));
  border-radius: var(--sn-output-preview-radius, 6px);
  background: var(--sn-output-preview-bg, var(--sn-surface));
}

.output-graph-preview-head,
.output-graph-preview-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 18px;
  color: var(--sn-output-preview-muted, var(--sn-text-dim));
  font-size: 11px;
}

.output-graph-preview-title {
  overflow: hidden;
  color: var(--sn-output-preview-title, var(--sn-text));
  font-size: 12px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.output-graph-preview-count,
.output-graph-preview-foot {
  font-family: var(--sn-font-mono, monospace);
}

.output-graph-preview-empty {
  padding: 8px 0;
  color: var(--sn-output-preview-muted, var(--sn-text-dim));
  font-size: 12px;
}

.output-graph-preview-canvas {
  position: relative;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(128px, 1fr));
  gap: 10px;
  min-height: 96px;
  padding: 8px;
  border-radius: var(--sn-output-preview-canvas-radius, 5px);
  background:
    linear-gradient(var(--sn-output-preview-grid, rgba(255, 255, 255, 0.04)) 1px, transparent 1px),
    linear-gradient(90deg, var(--sn-output-preview-grid, rgba(255, 255, 255, 0.04)) 1px, transparent 1px);
  background-size: 16px 16px;
}

.output-graph-preview-node {
  box-sizing: border-box;
  min-width: 0;
  min-height: 52px;
  padding: 8px 10px;
  border: 1px solid var(--sn-output-preview-item-border, var(--sn-border));
  border-radius: var(--sn-output-preview-item-radius, 5px);
  background: var(--sn-output-preview-item-bg, var(--sn-node-bg));
}

.output-graph-preview-node-label,
.output-graph-preview-node-kind,
.output-graph-preview-node-description,
.output-graph-preview-edge {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.output-graph-preview-node-label {
  color: var(--sn-output-preview-label, var(--sn-text));
  font-size: 12px;
  font-weight: 500;
}

.output-graph-preview-node-kind,
.output-graph-preview-node-description,
.output-graph-preview-edge {
  color: var(--sn-output-preview-muted, var(--sn-text-dim));
  font-size: 10px;
  line-height: 1.35;
}

.output-graph-preview-node-kind,
.output-graph-preview-edge {
  font-family: var(--sn-font-mono, monospace);
}

.output-graph-preview-edges {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.output-graph-preview-edge {
  max-width: 100%;
  padding: 3px 6px;
  border-radius: 999px;
  background: var(--sn-output-preview-edge-bg, var(--sn-node-hover));
}
`;
