/**
 * PCB Dark — Carbon-based theme with circuit board node styling
 *
 * Extends the Carbon neutral dark palette with PCB-inspired node shapes:
 * - IC chip rectangles with notch markers
 * - Copper-tinted traces for import connections
 * - Pin indicators on sockets
 * - CPU hub styling for high-connectivity nodes
 *
 * Background/surface/text colors match the global Carbon dashboard.
 *
 * @module symbiote-node/themes/pcb
 */

/** @type {import('./Theme.js').ThemeDefinition} */
export const PCB_DARK = {
  name: 'pcb-dark',
  tokens: {
    // === Base: identical to Carbon (dark grey dashboard) ===

    // Canvas
    '--sn-bg': '#1a1a1a',
    '--sn-grid-dot': 'rgba(255, 255, 255, 0.04)',
    '--sn-grid-size': '20px',

    // Node / Panels — same Carbon surfaces
    '--sn-node-bg': '#222222',
    '--sn-node-border': 'rgba(255, 255, 255, 0.12)',
    '--sn-node-radius': '2px',
    '--sn-node-shadow': '0 1px 4px rgba(0, 0, 0, 0.5)',
    '--sn-shadow-color': 'rgba(0, 0, 0, 0.5)',
    '--sn-node-header-bg': '#252525',
    '--sn-node-selected': '#d4a04a',
    '--sn-node-hover': '#2d2d2d',

    // Typography — Carbon standard
    '--sn-font': "'JetBrains Mono', 'Fira Code', 'Inter', monospace",
    '--sn-text': '#e0e0e0',
    '--sn-text-dim': '#888888',

    // Sockets — pin style
    '--sn-socket-size': '10px',
    '--sn-socket-border-width': '2px',

    // Connections — copper traces
    '--sn-conn-color': '#c87533',
    '--sn-conn-width': '1.5',
    '--sn-conn-selected': '#d4a04a',

    // Category accent colors — circuit-inspired
    '--sn-cat-server': '#c87533',     // copper — core/routing
    '--sn-cat-instance': '#4caf50',   // green — active
    '--sn-cat-control': '#d4a04a',    // gold — CPU/hub
    '--sn-cat-data': '#5c8dbf',       // cool blue — data flow
    '--sn-cat-default': '#555555',    // neutral

    // Context menu — matches Carbon
    '--sn-ctx-bg': '#2a2a2a',
    '--sn-ctx-border': 'rgba(255, 255, 255, 0.1)',
    '--sn-ctx-color': '#e0e0e0',
    '--sn-ctx-hover': 'rgba(200, 117, 51, 0.15)',

    // Comments
    '--sn-comment-bg': 'rgba(255, 255, 255, 0.03)',
    '--sn-comment-border': 'rgba(255, 255, 255, 0.06)',
    '--sn-comment-radius': '2px',

    // Toolbar — Carbon base with copper accent
    '--sn-toolbar-bg': 'rgba(34, 34, 34, 0.95)',
    '--sn-toolbar-border': 'rgba(255, 255, 255, 0.08)',
    '--sn-toolbar-color': '#888888',
    '--sn-toolbar-hover': 'rgba(200, 117, 51, 0.18)',
    '--sn-toolbar-active': '#e0e0e0',
    '--sn-toolbar-danger': 'rgba(244, 67, 54, 0.22)',
    '--sn-toolbar-danger-color': '#f44336',

    // Shape fill/stroke
    '--sn-shape-fill': 'var(--sn-node-bg)',
    '--sn-shape-stroke': 'var(--sn-node-border)',
    '--sn-shape-stroke-width': '0.5',

    // Semantic state
    '--sn-danger-color': '#f44336',
    '--sn-success-color': '#4caf50',
    '--sn-warning-color': '#ff9800',

    // Atomic hue tokens
    '--sn-hue-base': '0',
    '--sn-hue-accent': '28',
    '--sn-hue-success': '122',
    '--sn-hue-warning': '36',
    '--sn-hue-danger': '4',
    '--sn-hue-data': '210',
    '--sn-sat': '0%',
    '--sn-sat-vivid': '50%',
    '--sn-sat-muted': '0%',
    '--sn-lit-bg': '10%',
    '--sn-lit-surface': '13%',
    '--sn-lit-border': '17%',
    '--sn-lit-hover': '18%',
    '--sn-lit-text': '88%',
    '--sn-lit-text-dim': '53%',
    '--sn-lit-accent': '55%',
    '--sn-alpha-overlay': '0.95',
    '--sn-alpha-subtle': '0.12',
    '--sn-alpha-faint': '0.04',
  },

  // PCB-specific CSS overrides for IC chip file nodes
  extraCSS: `
    /* Hide Material icons — PCB uses geometric shapes, not icons */
    graph-node .sn-node-icon {
      display: none !important;
    }

    /* Hide watermark icons inside SVG shapes */
    graph-node .sn-shape-watermark {
      display: none !important;
    }

    /* LABEL VISIBILITY MODES */
    /* By default (or data-label-mode="always"), the label is fully visible. */
    graph-node[data-svg-shape] .sn-node-header {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: transparent;
      border: none;
      border-radius: 0;
      border-bottom: none;
      padding: 4px 10px;
      white-space: nowrap;
      opacity: 1;
      pointer-events: none;
      z-index: 1;
      font-size: 11px;
      letter-spacing: 0.3px;
      transition: opacity 0.2s ease-in-out;
    }

    /* 1. HOVER MODE */
    :host([data-label-mode="hover"]) graph-node[data-svg-shape] .sn-node-header {
      opacity: 0;
    }
    :host([data-label-mode="hover"]) graph-node[data-svg-shape]:hover .sn-node-header {
      opacity: 1;
    }

    /* 2. FOCUS MODE */
    :host([data-label-mode="focus"]) graph-node[data-svg-shape] .sn-node-header {
      opacity: 0;
    }
    :host([data-label-mode="focus"]) graph-node[data-svg-shape][data-selected] .sn-node-header,
    :host([data-label-mode="focus"]) graph-node[data-svg-shape][data-neighbor-focused] .sn-node-header {
      opacity: 1;
    }

    /* Hide body (inputs/outputs/controls) — PCB uses perimeter connectors */
    graph-node .sn-node-body {
      display: none !important;
    }

    /* Compact node size for file-level view */
    graph-node[data-svg-shape] {
      min-width: 100px !important;
      min-height: 60px !important;
    }

    /* Label styling */
    graph-node .sn-node-label {
      font-size: 10px;
      font-weight: 500;
      color: var(--sn-text, #e0e0e0);
      text-shadow: 0 1px 3px rgba(0,0,0,0.6);
    }

    /* CPU hub (shield shape) — larger, gold accent labels */
    graph-node[node-shape="shield"] .sn-node-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--sn-cat-control, #d4a04a);
    }

    /* Connection dots — pin style */
    .sn-conn-dot {
      r: 3;
      fill: #c87533;
      stroke: #222;
      stroke-width: 1;
    }
  `,
};
