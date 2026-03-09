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

  & .insp-resize-handle {
    position: absolute;
    top: 0;
    left: -2px;
    width: 5px;
    height: 100%;
    cursor: col-resize;
    z-index: 110;
    transition: background 0.15s;

    &:hover, &.dragging {
      background: var(--sn-node-selected, #4a9eff);
      opacity: 0.5;
    }
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

    &[hidden] {
      display: none;
    }
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
    background: color-mix(in srgb, currentColor 4%, transparent);
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
  background: color-mix(in srgb, currentColor 4%, transparent);
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
  margin-bottom: 12px;
}

.insp-ctrl-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--sn-text-dim, #888);
  margin-bottom: 4px;
  letter-spacing: 0.5px;
}

.insp-ctrl-input-el,
.insp-ctrl-select {
  width: 100%;
  padding: 6px 8px;
  font-size: 12px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  color: var(--sn-text, #d4d4d4);
  background: color-mix(in srgb, currentColor 6%, transparent);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 4px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s;

  &:focus {
    border-color: var(--sn-node-selected, #4a9eff);
  }
}

.insp-ctrl-textarea {
  width: 100%;
  padding: 6px 8px;
  font-size: 11px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  color: var(--sn-text, #d4d4d4);
  background: color-mix(in srgb, currentColor 6%, transparent);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 4px;
  outline: none;
  resize: vertical;
  min-height: 80px;
  box-sizing: border-box;
  line-height: 1.4;
  transition: border-color 0.15s;

  &:focus {
    border-color: var(--sn-node-selected, #4a9eff);
  }
}

.insp-ctrl-select {
  appearance: none;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24'%3E%3Cpath fill='%23888' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 6px center;
  padding-right: 24px;

  & option {
    background: #2a2a3e;
    color: #d4d4d4;
  }
}

.insp-ctrl-toggle {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
  cursor: pointer;

  & input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  & .insp-ctrl-slider {
    position: absolute;
    inset: 0;
    background: rgba(255,255,255,0.1);
    border-radius: 10px;
    transition: background 0.2s;

    &::before {
      content: '';
      position: absolute;
      width: 14px;
      height: 14px;
      left: 3px;
      bottom: 3px;
      background: #aaa;
      border-radius: 50%;
      transition: transform 0.2s, background 0.2s;
    }
  }

  & input:checked + .insp-ctrl-slider {
    background: var(--sn-node-selected, #4a9eff);

    &::before {
      transform: translateX(16px);
      background: white;
    }
  }
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
