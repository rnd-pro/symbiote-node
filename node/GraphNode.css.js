import { css } from '@symbiotejs/symbiote';

export const styles = css`
graph-node {
  display: block;
  min-width: 180px;
  max-width: 280px;
  border-radius: 10px;
  background: var(--sn-node-bg, #16213e);
  border: 2px solid var(--sn-node-border, #2a2a4a);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  user-select: none;
  cursor: move;
  transition: border-color 0.2s ease-out, box-shadow 0.2s ease-out;
  overflow: visible;
  font-family: var(--sn-font, 'Inter', sans-serif);
  font-size: 13px;
  backface-visibility: hidden;
  -webkit-font-smoothing: antialiased;
  will-change: transform;

  &[data-selected] {
    border-color: var(--sn-node-selected, #4a9eff);
    box-shadow: 0 0 20px rgba(74, 158, 255, 0.3);
  }

  &[data-collapsed] {
    & .sn-controls {
      display: none;
    }
    & .sn-node-body {
      padding: 4px 0;
    }
    & .sn-port-label {
      display: none;
    }
  }

  &[data-muted] {
    opacity: 0.45;
    filter: saturate(0.3);

    & .sn-node-label {
      text-decoration: line-through;
    }
  }

  &[node-type="subgraph"] {
    & .sn-node-body::after {
      content: '⤵ double-click to enter';
      display: block;
      text-align: center;
      font-size: 10px;
      color: var(--sn-text-dim, #a0a0a0);
      opacity: 0.5;
      padding: 6px 0 4px;
    }
  }

  &[data-processing] {
    border-color: var(--sn-node-accent, var(--sn-node-selected, #4a9eff));
    box-shadow: 0 0 16px color-mix(in srgb, var(--sn-node-accent, #4a9eff) 40%, transparent),
                0 0 4px color-mix(in srgb, var(--sn-node-accent, #4a9eff) 60%, transparent);
    animation: sn-node-pulse 1s ease-in-out infinite;
  }

  &[data-completed] {
    border-color: #5cd87a;
    box-shadow: 0 0 8px rgba(92, 216, 122, 0.3);
  }

  &[data-error] {
    border-color: #ef4444;
    box-shadow: 0 0 16px rgba(239, 68, 68, 0.35),
                0 0 4px rgba(239, 68, 68, 0.5);
    animation: sn-node-error-pulse 1.5s ease-in-out infinite;
  }

  &[data-error] .sn-node-header {
    background: rgba(239, 68, 68, 0.15);
  }

  &[data-error]::after {
    content: attr(data-error);
    display: block;
    padding: 4px 12px;
    font-size: 11px;
    color: #fca5a5;
    background: rgba(239, 68, 68, 0.1);
    border-top: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 0 0 10px 10px;
  }

  &:hover {
    border-color: var(--sn-node-hover, #3a3a6a);
  }

  &[node-category="server"] {
    --sn-node-accent: var(--sn-cat-server, #4a9eff);
  }
  &[node-category="instance"] {
    --sn-node-accent: var(--sn-cat-instance, #4ade80);
  }
  &[node-category="control"] {
    --sn-node-accent: var(--sn-cat-control, #fbbf24);
  }
  &[node-category="data"] {
    --sn-node-accent: var(--sn-cat-data, #a78bfa);
  }
  &[node-category="default"] {
    --sn-node-accent: var(--sn-cat-default, #94a3b8);
  }

  /* Shape: pill — compact horizontal capsule */
  &[node-shape="pill"] {
    min-width: 100px;
    max-width: 200px;
    border-radius: 999px;

    & .sn-node-header {
      display: none;
    }
    & .sn-node-body {
      padding: 8px 20px;
      align-items: center;
      justify-content: center;
      flex-direction: row;
      gap: 8px;
    }
    & .sn-inputs, & .sn-outputs {
      padding: 0;
    }
    & .sn-port-in node-socket {
      margin-left: -26px;
    }
    & .sn-port-out node-socket {
      margin-right: -26px;
    }
    & .sn-controls {
      display: none;
    }
  }

  /* Shape: circle — hub/connector node */
  &[node-shape="circle"] {
    min-width: 100px;
    min-height: 100px;
    border-radius: 50%;
    aspect-ratio: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    & .sn-node-header {
      background: transparent;
      border-bottom: none;
      justify-content: center;
      padding: 6px;
    }
    & .sn-node-body {
      padding: 0 8px 8px;
      flex-direction: row;
      align-items: center;
      gap: 0;
    }
    & .sn-inputs {
      position: absolute;
      left: -6px;
      top: 50%;
      transform: translateY(-50%);
    }
    & .sn-outputs {
      position: absolute;
      right: -6px;
      top: 50%;
      transform: translateY(-50%);
    }
    & .sn-port-label {
      display: none;
    }
    & .sn-controls {
      display: none;
    }
  }

  /* Shape: diamond — condition/decision */
  &[node-shape="diamond"] {
    min-width: 100px;
    min-height: 100px;
    border-radius: 4px;
    transform-origin: center;
    clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
    display: flex;
    align-items: center;
    justify-content: center;

    & .sn-node-header {
      display: none;
    }
    & .sn-node-body {
      text-align: center;
      padding: 25% 10%;
    }
    & .sn-controls {
      display: none;
    }
  }

  /* Shape: comment — annotation banner */
  &[node-shape="comment"] {
    min-width: 200px;
    max-width: 400px;
    border-radius: var(--sn-comment-radius, 6px);
    background: var(--sn-comment-bg, rgba(255, 255, 255, 0.05));
    border-color: var(--sn-comment-border, rgba(255, 255, 255, 0.1));
    cursor: default;
    box-shadow: none;

    & .sn-node-header {
      display: none;
    }
    & .sn-node-body {
      padding: 12px 16px;
    }
    & .sn-inputs, & .sn-outputs {
      display: none;
    }
  }

  & .sn-node-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: var(--sn-node-header-bg, color-mix(in srgb, var(--sn-node-accent) 15%, transparent));
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: var(--sn-node-radius, 10px) var(--sn-node-radius, 10px) 0 0;
  }

  & .sn-node-icon {
    font-size: 18px;
    color: var(--sn-node-accent);
    opacity: 1;
  }

  & .sn-node-label {
    font-weight: 600;
    color: var(--sn-text, #e2e8f0);
    opacity: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  & .sn-node-body {
    padding: 8px 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  & .sn-inputs, & .sn-outputs {
    display: flex;
    flex-direction: column;
  }

  & .sn-port {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 12px;
    min-height: 24px;
  }

  & .sn-port-in {
    flex-direction: row;

    & node-socket {
      margin-left: -18px;
    }
  }

  & .sn-port-out {
    flex-direction: row;
    justify-content: flex-end;

    & node-socket {
      margin-right: -18px;
    }
  }

  & .sn-port-label {
    color: var(--sn-text-dim, #94a3b8);
    font-size: 12px;
    white-space: nowrap;
  }

  & .sn-controls {
    padding: 0 12px;
  }

  & .sn-control-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 4px 0;
  }

  & .sn-control-label {
    font-size: 10px;
    text-transform: uppercase;
    color: var(--sn-text-dim, #94a3b8);
    letter-spacing: 0.5px;
  }

  & .sn-control-input {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    padding: 4px 8px;
    color: var(--sn-text, #e2e8f0);
    font-size: 12px;
    outline: none;
    font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;

    &:focus {
      border-color: var(--sn-node-accent);
    }

    &[readonly] {
      opacity: 0.6;
      cursor: default;
    }
  }
}

/* Preview Area — image/text preview at bottom of node */
.sn-preview {
  border-top: 1px solid var(--sn-node-border, rgba(255, 255, 255, 0.06));
  border-radius: 0 0 8px 8px;
  overflow: hidden;
  max-height: 120px;
  background: rgba(0, 0, 0, 0.2);

  &[hidden] {
    display: none;
  }

  & img {
    width: 100%;
    height: auto;
    display: block;
    object-fit: cover;
    max-height: 120px;
  }

  & .sn-preview-text {
    padding: 6px 10px;
    font-size: 11px;
    color: var(--sn-text-dim, #94a3b8);
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    white-space: pre-wrap;
    word-break: break-all;
    line-height: 1.4;
  }
}

node-socket {
  display: block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--socket-color, var(--sn-node-accent, #4a9eff));
  border: 2px solid var(--sn-node-bg, #16213e);
  cursor: crosshair;
  flex-shrink: 0;
  transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
  z-index: 10;
  position: relative;

  /* 44×44px invisible touch target */
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 44px;
    height: 44px;
    transform: translate(-50%, -50%);
  }

  &:hover {
    transform: scale(1.3);
    box-shadow: 0 0 8px var(--socket-color, var(--sn-node-accent));
  }

  /* Port shape: square — array/object types */
  &[data-socket-shape="square"] {
    border-radius: 2px;
  }

  /* Port shape: diamond — execution/trigger */
  &[data-socket-shape="diamond"] {
    border-radius: 1px;
    transform: rotate(45deg) scale(0.85);

    &:hover {
      transform: rotate(45deg) scale(1.1);
    }
  }

  /* Port shape: triangle — trigger/event */
  &[data-socket-shape="triangle"] {
    border-radius: 0;
    background: transparent;
    width: 0;
    height: 0;
    border: 6px solid transparent;
    border-left: 10px solid var(--socket-color, var(--sn-node-accent));
    border-right: none;
  }
}

@keyframes sn-node-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes sn-node-error-pulse {
  0%, 100% { box-shadow: 0 0 16px rgba(239,68,68,0.35), 0 0 4px rgba(239,68,68,0.5); }
  50% { box-shadow: 0 0 24px rgba(239,68,68,0.5), 0 0 8px rgba(239,68,68,0.7); }
}

/* LOD — Level of Detail for zoom levels */
graph-node[data-lod="medium"] {
  & .sn-controls {
    display: none;
  }
}

graph-node[data-lod="minimal"] {
  & .sn-controls {
    display: none;
  }
  & .sn-port-label {
    display: none;
  }
  & .sn-node-body {
    padding: 2px 0;
  }
}

/* Accessibility: reduced motion */
@media (prefers-reduced-motion: reduce) {
  graph-node {
    transition: none;
    animation: none;
  }
  node-socket {
    transition: none;
  }
}
`;
