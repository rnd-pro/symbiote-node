export default `
:host {
  display: block;
}

  source-viewer {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }
  source-viewer:not([has-file]) code-block {
    display: none;
  }
  .sv-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 11px;
    color: var(--sn-text-dim);
    border-bottom: 1px solid var(--sn-source-border, var(--sn-node-border));
    background: var(--sn-source-header-bg, var(--sn-node-header-bg));
    gap: var(--sn-source-toolbar-gap, 8px);
  }
  .sv-filename {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
  .sv-controls {
    display: flex;
    align-items: center;
    gap: var(--sn-source-toolbar-gap, 8px);
    flex-shrink: 0;
  }
  .sv-stats {
    font-size: 10px;
    color: var(--sn-cat-server);
    white-space: nowrap;
  }
  .sv-action {
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 2px 8px;
    border: 1px solid var(--sn-source-border, var(--sn-node-border));
    border-radius: var(--sn-source-action-radius, 4px);
    background: var(--sn-source-action-bg, var(--sn-bg));
    color: var(--sn-text-dim);
    font-family: inherit;
    font-size: 10px;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    transition: all 120ms ease;
  }
  .sv-action:hover {
    background: var(--sn-source-action-hover-bg, var(--sn-node-hover));
    color: var(--sn-text);
  }
  source-viewer[mode-raw] .sv-action {
    background: var(--sn-accent-bg-subtle);
    border-color: var(--sn-cat-server);
    color: var(--sn-cat-server);
  }
  .sv-action[hidden] {
    display: none;
  }
  code-block {
    flex: 1;
    min-height: 0;
  }
`;
