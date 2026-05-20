export default /*css*/ `
:host {
  position: absolute;
  inset: 0;
  display: block;
  color: var(--sn-text);
  font-family: var(--sn-font-ui, inherit);
  z-index: var(--sn-loading-overlay-z, 500);
  pointer-events: none;
}

:host([hidden]) {
  display: none !important;
}

.sn-loading-overlay {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: var(--sn-loading-overlay-gap, 16px);
  width: 100%;
  height: 100%;
  background: var(--sn-loading-overlay-bg, var(--sn-bg));
  opacity: 1;
  transition: opacity 0.3s ease-out;
}

:host([hidden-state]) .sn-loading-overlay {
  opacity: 0;
}

.sn-loading-label,
.sn-loading-phase,
.sn-loading-sub {
  max-width: min(320px, 80%);
  overflow: hidden;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sn-loading-label {
  color: var(--sn-loading-label-color, var(--sn-text-dim));
  font-family: var(--sn-font-mono, monospace);
  font-size: var(--sn-loading-label-size, 11px);
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.sn-loading-phase {
  min-height: 14px;
  color: var(--sn-loading-phase-color, var(--sn-node-selected));
  font-family: var(--sn-font-mono, monospace);
  font-size: var(--sn-loading-phase-size, 10px);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.sn-loading-track {
  width: var(--sn-loading-track-width, 200px);
  max-width: 80%;
  height: var(--sn-loading-track-height, 2px);
  overflow: hidden;
  border-radius: var(--sn-loading-track-radius, 2px);
  background: var(--sn-loading-track-bg, rgba(255, 255, 255, 0.08));
}

.sn-loading-bar {
  height: 100%;
  width: 0%;
  border-radius: inherit;
  background: var(--sn-loading-bar-bg, var(--sn-node-selected));
  box-shadow: var(--sn-loading-bar-shadow, 0 0 8px color-mix(in srgb, var(--sn-node-selected) 45%, transparent));
  transition: width 0.35s ease-out;
}

.sn-loading-sub {
  min-height: 12px;
  color: var(--sn-loading-sub-color, var(--sn-text-dim));
  font-family: var(--sn-font-mono, monospace);
  font-size: var(--sn-loading-sub-size, 9px);
}
`;
