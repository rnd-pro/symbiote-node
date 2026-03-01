/**
 * InspectorPanel styles
 * @module symbiote-node/inspector/InspectorPanel.css
 */
import { css } from '@symbiotejs/symbiote';

export const styles = css`
inspector-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 280px;
  background: var(--sn-node-bg, #2a2a3e);
  border-left: 1px solid var(--sn-node-border, rgba(255,255,255,0.08));
  display: flex;
  flex-direction: column;
  z-index: 100;
  font-family: var(--sn-font, 'Inter', sans-serif);
  color: var(--sn-text, #d4d4d4);
  overflow-y: auto;
  transition: transform 0.2s ease;

  &[hidden] {
    display: none;
  }

  & .insp-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    font-size: 14px;
    font-weight: 600;
    border-bottom: 1px solid var(--sn-node-border, rgba(255,255,255,0.08));
    background: var(--sn-node-bg, #2a2a3e);
  }

  & .insp-header .material-symbols-outlined {
    font-size: 18px;
    opacity: 0.7;
  }

  & .insp-body {
    flex: 1;
    padding: 12px 16px;
  }

  & .insp-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 40px 0;
    color: var(--sn-text-dim, #888);
    font-size: 13px;
  }

  & .insp-empty .material-symbols-outlined {
    font-size: 32px;
    opacity: 0.4;
  }

  & .insp-field {
    margin-bottom: 12px;
  }

  & .insp-field label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--sn-text-dim, #888);
    margin-bottom: 4px;
    letter-spacing: 0.5px;
  }

  & .insp-value {
    font-size: 13px;
    padding: 6px 8px;
    background: rgba(255,255,255,0.04);
    border-radius: 4px;
  }

  & .insp-tag {
    display: inline-block;
    padding: 2px 8px;
    font-size: 11px;
    border-radius: 4px;
    background: color-mix(in srgb, var(--sn-cat-server, #5cb8ff) 15%, transparent);
    color: var(--sn-cat-server, #5cb8ff);
  }

  & .insp-mono {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 11px;
    opacity: 0.6;
  }

  & .insp-section {
    margin-top: 16px;
  }

  & .insp-section-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--sn-text-dim, #888);
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  & .insp-section-title .material-symbols-outlined {
    font-size: 16px;
    opacity: 0.6;
  }
}

.insp-port {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 4px;
  margin-bottom: 2px;
}

.insp-port:hover {
  background: rgba(255,255,255,0.04);
}

.insp-port-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--sn-cat-server, #5cb8ff);
  flex-shrink: 0;
}

.insp-port-label {
  flex: 1;
}

.insp-port-type {
  font-size: 10px;
  color: var(--sn-text-dim, #888);
  font-family: 'SF Mono', 'Fira Code', monospace;
}

.insp-ctrl {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 4px;
  margin-bottom: 2px;
}

.insp-ctrl:hover {
  background: rgba(255,255,255,0.04);
}

.insp-ctrl-label {
  color: var(--sn-text-dim, #aaa);
}

.insp-ctrl-value {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 11px;
}

.insp-enter-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px 16px;
  margin-top: 12px;
  border: 1px solid rgba(167, 139, 250, 0.3);
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(167, 139, 250, 0.12) 0%, rgba(109, 40, 217, 0.08) 100%);
  color: var(--sn-subgraph-accent, #a78bfa);
  font-family: var(--sn-font, 'Inter', sans-serif);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.1s;
}

.insp-enter-btn:hover {
  background: linear-gradient(135deg, rgba(167, 139, 250, 0.22) 0%, rgba(109, 40, 217, 0.15) 100%);
  border-color: rgba(167, 139, 250, 0.5);
}

.insp-enter-btn:active {
  transform: scale(0.97);
}

.insp-enter-btn .material-symbols-outlined {
  font-size: 18px;
}
`;
