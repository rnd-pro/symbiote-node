import { css } from '@symbiotejs/symbiote';

export const styles = css`
event-log {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 11px;
  background: var(--sn-bg, #1a1a2e);
  color: var(--sn-text, #c8c8d4);
}

event-log .log-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--sn-node-border, rgba(255, 255, 255, 0.06));
  flex-shrink: 0;
}

event-log .log-title {
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.6;
}

event-log .log-count {
  background: color-mix(in srgb, currentColor 8%, transparent);
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 10px;
  opacity: 0.5;
}

event-log .log-header button {
  margin-left: auto;
  background: none;
  border: 1px solid color-mix(in srgb, currentColor 10%, transparent);
  color: inherit;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 10px;
  opacity: 0.5;
  transition: opacity 0.15s;

  &:hover {
    opacity: 1;
    border-color: color-mix(in srgb, currentColor 20%, transparent);
  }
}

event-log .log-entries {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

event-log .log-entry {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 2px 12px;
  transition: background 0.1s;

  &:hover {
    background: color-mix(in srgb, currentColor 3%, transparent);
  }

  &[data-type="flow"] { --entry-color: var(--sn-node-selected, #4a9eff); }
  &[data-type="node"] { --entry-color: var(--sn-cat-data, #a78bfa); }
  &[data-type="connection"] { --entry-color: var(--sn-success-color, #5cd87a); }
  &[data-type="success"] { --entry-color: var(--sn-success-color, #5cd87a); }
  &[data-type="error"] { --entry-color: var(--sn-danger-color, #ef4444); }
  &[data-type="info"] { --entry-color: var(--sn-warning-color, #e2b456); }
}

event-log .log-time {
  color: var(--sn-text-dim, rgba(255, 255, 255, 0.25));
  font-size: 10px;
  flex-shrink: 0;
  min-width: 52px;
}

event-log .log-icon {
  flex-shrink: 0;
  width: 14px;
  text-align: center;
}

event-log .log-msg {
  flex: 1;
  line-height: 1.4;

  & .log-label {
    color: var(--entry-color, #8888a8);
    font-weight: 500;
  }
}
`;
