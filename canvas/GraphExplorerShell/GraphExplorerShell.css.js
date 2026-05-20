export default /*css*/ `
graph-explorer-shell {
  display: block;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: var(--sn-bg, #1a1a1a);
  contain: strict;
}

graph-explorer-shell .graph-explorer-canvas-layer,
graph-explorer-shell node-canvas,
graph-explorer-shell canvas-graph,
graph-explorer-shell pg-canvas-graph {
  width: 100%;
  height: 100%;
}

graph-explorer-shell node-canvas[hidden],
graph-explorer-shell canvas-graph[hidden],
graph-explorer-shell pg-canvas-graph[hidden] {
  display: none;
}

graph-explorer-shell .graph-explorer-toolbar {
  position: absolute;
  top: var(--sn-graph-explorer-toolbar-top, 8px);
  right: var(--sn-graph-explorer-toolbar-right, 8px);
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--sn-graph-explorer-toolbar-gap, 6px);
  z-index: var(--sn-graph-explorer-toolbar-z, 200);
  max-width: calc(100% - 16px);
}

graph-explorer-shell .graph-explorer-btn {
  min-width: 0;
  min-height: 28px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid var(--sn-node-border, rgba(255, 255, 255, 0.12));
  border-radius: 3px;
  background: var(--sn-node-bg, #222222);
  color: var(--sn-text, #e0e0e0);
  cursor: pointer;
  font-family: var(--sn-font, 'SF Mono', monospace);
  font-size: 10px;
  white-space: nowrap;
  transition: background 150ms, border-color 150ms;
}

graph-explorer-shell .graph-explorer-btn:focus-visible,
graph-explorer-shell .graph-explorer-icon-btn:focus-visible {
  outline: 2px solid var(--sn-node-selected, #d4a04a);
  outline-offset: 2px;
}

graph-explorer-shell .graph-explorer-btn:hover {
  background: var(--sn-node-hover, #2d2d2d);
}

graph-explorer-shell .graph-explorer-btn[data-active] {
  border-color: var(--sn-node-selected, #d4a04a);
  background: var(--sn-warning-bg, rgba(212, 160, 74, 0.1));
}

graph-explorer-shell .graph-explorer-btn .material-symbols-outlined {
  font-size: 14px;
}

graph-explorer-shell .graph-explorer-toolbar-sep {
  width: 1px;
  align-self: stretch;
  margin: 0 4px;
  background: rgba(255, 255, 255, 0.1);
}

graph-explorer-shell .graph-explorer-layer-btn {
  padding: 3px 6px;
  font-size: 9px;
  opacity: 0.7;
}

graph-explorer-shell .graph-explorer-layer-btn[data-active] {
  opacity: 1;
}

graph-explorer-shell .graph-explorer-layer-btn[data-hidden] {
  opacity: 0.3;
  text-decoration: line-through;
}

graph-explorer-shell .graph-explorer-stats {
  position: absolute;
  bottom: var(--sn-graph-explorer-stats-bottom, 8px);
  left: var(--sn-graph-explorer-stats-left, 8px);
  display: flex;
  gap: 12px;
  z-index: var(--sn-graph-explorer-stats-z, 10);
  max-height: 280px;
  overflow-y: auto;
  padding: 4px 10px;
  border: 1px solid var(--sn-border-subtle, rgba(255, 255, 255, 0.08));
  border-radius: 3px;
  background: var(--sn-bg-overlay, rgba(26, 26, 26, 0.9));
  color: var(--sn-text-dim, #888888);
  font-family: var(--sn-font, 'SF Mono', monospace);
  font-size: 10px;
}

graph-explorer-shell .graph-explorer-stat-val {
  color: var(--sn-text, #e0e0e0);
  font-weight: 600;
}
`;
