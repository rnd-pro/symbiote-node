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
    color: var(--sn-text-dim, hsl(30, 10%, 45%));
    border-bottom: 1px solid var(--sn-source-border, var(--sn-node-border, hsl(35, 18%, 80%)));
    background: var(--sn-source-header-bg, var(--sn-node-header-bg, hsl(37, 25%, 93%)));
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
    color: var(--sn-cat-server, hsl(210, 45%, 45%));
    white-space: nowrap;
  }
  .sv-action {
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 2px 8px;
    border: 1px solid var(--sn-source-border, var(--sn-node-border, hsl(35, 18%, 80%)));
    border-radius: var(--sn-source-action-radius, 4px);
    background: var(--sn-source-action-bg, var(--sn-bg, hsl(37, 30%, 91%)));
    color: var(--sn-text-dim, hsl(30, 10%, 45%));
    font-family: inherit;
    font-size: 10px;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    transition: all 120ms ease;
  }
  .sv-action:hover {
    background: var(--sn-source-action-hover-bg, var(--sn-node-hover, hsl(36, 22%, 88%)));
    color: var(--sn-text, hsl(30, 15%, 18%));
  }
  source-viewer[mode-raw] .sv-action {
    background: hsla(210, 45%, 45%, 0.12);
    border-color: var(--sn-cat-server, hsl(210, 45%, 45%));
    color: var(--sn-cat-server, hsl(210, 45%, 45%));
  }
  .sv-action[hidden] {
    display: none;
  }
  code-block {
    flex: 1;
    min-height: 0;
  }
`;
