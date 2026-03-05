/**
 * Dark Default — deep navy theme with blue accents
 *
 * Built on atomic HSL tokens: change a hue value and entire
 * palette rebuilds harmoniously. AI-agent friendly.
 *
 * @module symbiote-node/themes/dark
 */

/** @type {import('./Theme.js').ThemeDefinition} */
export const DARK_DEFAULT = {
  name: 'dark-default',
  tokens: {
    // === Atomic tokens (AI changes these) ===

    // Hues
    '--sn-hue-base': '230',
    '--sn-hue-accent': '215',
    '--sn-hue-success': '142',
    '--sn-hue-warning': '43',
    '--sn-hue-danger': '0',
    '--sn-hue-data': '262',

    // Saturation levels
    '--sn-sat': '30%',
    '--sn-sat-vivid': '60%',
    '--sn-sat-muted': '15%',

    // Lightness levels
    '--sn-lit-bg': '12%',
    '--sn-lit-surface': '18%',
    '--sn-lit-border': '22%',
    '--sn-lit-hover': '28%',
    '--sn-lit-text': '89%',
    '--sn-lit-text-dim': '63%',
    '--sn-lit-accent': '65%',

    // Alpha levels
    '--sn-alpha-overlay': '0.92',
    '--sn-alpha-subtle': '0.15',
    '--sn-alpha-faint': '0.06',

    // === Composed tokens (auto from atomics) ===

    // Canvas
    '--sn-bg': 'hsl(var(--sn-hue-base), var(--sn-sat), var(--sn-lit-bg))',
    '--sn-grid-dot': 'hsla(0, 0%, 100%, var(--sn-alpha-faint))',
    '--sn-grid-size': '20px',

    // Node
    '--sn-node-bg': 'hsl(var(--sn-hue-base), var(--sn-sat), var(--sn-lit-surface))',
    '--sn-node-border': 'hsl(var(--sn-hue-base), var(--sn-sat-muted), var(--sn-lit-border))',
    '--sn-node-radius': '10px',
    '--sn-node-shadow': '0 4px 16px rgba(0, 0, 0, 0.3)',
    '--sn-node-selected': 'hsl(var(--sn-hue-accent), var(--sn-sat-vivid), var(--sn-lit-accent))',
    '--sn-node-hover': 'hsl(var(--sn-hue-base), var(--sn-sat-muted), var(--sn-lit-hover))',
    '--sn-node-header-bg': 'hsl(var(--sn-hue-base), var(--sn-sat), 15%)',

    // Typography
    '--sn-font': "'Inter', sans-serif",
    '--sn-text': 'hsl(var(--sn-hue-base), 15%, var(--sn-lit-text))',
    '--sn-text-dim': 'hsl(var(--sn-hue-base), 15%, var(--sn-lit-text-dim))',

    // Sockets
    '--sn-socket-size': '12px',
    '--sn-socket-border-width': '2px',

    // Connections
    '--sn-conn-color': 'hsl(var(--sn-hue-accent), var(--sn-sat-vivid), var(--sn-lit-accent))',
    '--sn-conn-width': '2',
    '--sn-conn-selected': 'hsl(var(--sn-hue-danger), var(--sn-sat-vivid), var(--sn-lit-accent))',

    // Category accent colors
    '--sn-cat-server': 'hsl(var(--sn-hue-accent), var(--sn-sat-vivid), var(--sn-lit-accent))',
    '--sn-cat-instance': 'hsl(var(--sn-hue-success), var(--sn-sat-vivid), var(--sn-lit-accent))',
    '--sn-cat-control': 'hsl(var(--sn-hue-warning), var(--sn-sat-vivid), var(--sn-lit-accent))',
    '--sn-cat-data': 'hsl(var(--sn-hue-data), var(--sn-sat-vivid), var(--sn-lit-accent))',
    '--sn-cat-default': 'hsl(0, 0%, var(--sn-lit-text-dim))',

    // Context menu
    '--sn-ctx-bg': 'hsl(var(--sn-hue-base), var(--sn-sat), 15%)',
    '--sn-ctx-border': 'hsl(var(--sn-hue-base), var(--sn-sat-muted), var(--sn-lit-hover))',
    '--sn-ctx-color': 'hsl(0, 0%, 88%)',
    '--sn-ctx-hover': 'hsla(var(--sn-hue-accent), var(--sn-sat-vivid), var(--sn-lit-accent), var(--sn-alpha-subtle))',

    // Comments
    '--sn-comment-bg': 'hsla(0, 0%, 100%, 0.05)',
    '--sn-comment-border': 'hsla(0, 0%, 100%, 0.1)',
    '--sn-comment-radius': '6px',

    // Toolbar
    '--sn-toolbar-bg': 'hsla(var(--sn-hue-base), var(--sn-sat), var(--sn-lit-surface), var(--sn-alpha-overlay))',
    '--sn-toolbar-border': 'hsla(0, 0%, 100%, 0.1)',
    '--sn-toolbar-color': 'hsl(var(--sn-hue-base), 12%, 77%)',
    '--sn-toolbar-hover': 'hsla(var(--sn-hue-accent), var(--sn-sat-vivid), var(--sn-lit-accent), 0.2)',
    '--sn-toolbar-active': 'hsl(0, 0%, var(--sn-lit-text))',
    '--sn-toolbar-danger': 'hsla(var(--sn-hue-danger), var(--sn-sat-vivid), var(--sn-lit-accent), 0.25)',
    '--sn-toolbar-danger-color': 'hsl(var(--sn-hue-danger), var(--sn-sat-vivid), var(--sn-lit-accent))',

    // Shape fill/stroke (inherits node tokens, per-shape override possible)
    '--sn-shape-fill': 'var(--sn-node-bg)',
    '--sn-shape-stroke': 'var(--sn-node-border)',
    '--sn-shape-stroke-width': '0.4',
  },
};

/** @type {import('./Palette.js').PaletteDefinition} */
export const DARK_PALETTE = {
  name: 'dark',
  colors: {
    '--sn-hue-base': '230',
    '--sn-hue-accent': '215',
    '--sn-hue-success': '142',
    '--sn-hue-warning': '43',
    '--sn-hue-danger': '0',
    '--sn-hue-data': '262',
    '--sn-sat': '30%',
    '--sn-sat-vivid': '60%',
    '--sn-sat-muted': '15%',
    '--sn-lit-bg': '12%',
    '--sn-lit-surface': '18%',
    '--sn-lit-border': '22%',
    '--sn-lit-hover': '28%',
    '--sn-lit-text': '89%',
    '--sn-lit-text-dim': '63%',
    '--sn-lit-accent': '65%',
    '--sn-alpha-overlay': '0.92',
    '--sn-alpha-subtle': '0.15',
    '--sn-alpha-faint': '0.06',
  },
};
