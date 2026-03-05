import { css } from '@symbiotejs/symbiote';

export const styles = css`
node-canvas {
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  background-color: var(--sn-bg, #1a1a2e);
  background-image: radial-gradient(circle, var(--sn-grid-dot, rgba(255,255,255,0.06)) 1px, transparent 1px);
  background-size: var(--sn-grid-size, 20px) var(--sn-grid-size, 20px);
  cursor: grab;

  &:active {
    cursor: grabbing;
  }

  & .canvas-container {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    outline: none;
  }

  &[data-readonly] {
    cursor: default;
  }

  & .content {
    position: absolute;
    top: 0;
    left: 0;
    transform-origin: 0 0;
    will-change: transform;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  & .sn-connections {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: all;
    overflow: visible;
    width: 1px;
    height: 1px;
  }

  & .sn-nodes {
    position: relative;
  }

  & .pseudo-svg {
    position: absolute;
    top: 0;
    left: 0;
    overflow: visible;
    width: 1px;
    height: 1px;
    pointer-events: none;
    z-index: 100;
  }
}

/* Connection paths */
.sn-conn-path {
  fill: none;
  stroke: var(--sn-conn-color, #4a9eff);
  stroke-width: 2;
  opacity: 0.7;
  transition: opacity 0.15s, stroke-width 0.15s;
  pointer-events: stroke;
  cursor: pointer;

  &:hover {
    opacity: 1;
    stroke-width: 3;
  }

  &[data-selected] {
    stroke: var(--sn-conn-selected, #ff6b6b);
    stroke-width: 3;
    opacity: 1;
  }
}

/* Connector endpoint dots */
.sn-conn-dot {
  fill: var(--sn-conn-color, #4a9eff);
  stroke: rgba(255, 255, 255, 0.6);
  stroke-width: 1.5;
  opacity: 0.9;
  pointer-events: none;
  filter: drop-shadow(0 0 2px var(--sn-conn-color, #4a9eff));
}

.pseudo-path {
  fill: none;
  stroke: var(--sn-conn-color, #4a9eff);
  stroke-width: 2;
  opacity: 0.5;
  stroke-dasharray: 8 4;
}

/* Data flow animation */
@keyframes sn-flow {
  from { stroke-dashoffset: 0; }
  to { stroke-dashoffset: -20; }
}

.sn-conn-path[data-flowing] {
  stroke-dasharray: 10 5;
  animation: sn-flow 0.6s linear infinite;
  opacity: 0.9;
}

/* Plus indicator at connection drag endpoint */
.plus-indicator {
  circle {
    fill: var(--sn-node-bg, #16213e);
    stroke: var(--sn-conn-color, #4a9eff);
    stroke-width: 1.5;
    opacity: 0.9;
  }
  line {
    stroke: var(--sn-conn-color, #4a9eff);
    stroke-width: 1.5;
    stroke-linecap: round;
  }
}

/* Socket highlighting during connection drag */
@keyframes sn-socket-glow {
  0%, 100% { box-shadow: 0 0 4px currentColor; }
  50% { box-shadow: 0 0 12px currentColor, 0 0 20px currentColor; }
}

.sn-socket[data-compatible] {
  animation: sn-socket-glow 1s ease-in-out infinite;
  transform: scale(1.3);
  z-index: 10;
}

.sn-socket[data-incompatible] {
  opacity: 0.25;
  transform: scale(0.8);
}

/* Node lift effect when dragging */
.sn-node-lifted {
  filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.5));
  border-color: var(--sn-node-active-border, rgba(74, 158, 255, 0.5)) !important;
}

/* Connector dot: input vs output side */
.sn-dot-output {
  fill: var(--sn-dot-output, #e8915a);
}
.sn-dot-input {
  fill: var(--sn-dot-input, #5ac8e8);
}

/* Connector dot: socket type overrides */
.sn-dot-exec {
  fill: var(--sn-dot-exec, #e8a15a);
  r: 6;
}
.sn-dot-data {
  /* uses side color by default */
}
.sn-dot-ctrl {
  fill: var(--sn-dot-ctrl, #78d97a);
  r: 4;
}

/* Direction arrow on wire midpoint */
.sn-conn-arrow {
  fill: var(--sn-conn-color, #4a9eff);
  opacity: 0.5;
  pointer-events: none;
}
`;
