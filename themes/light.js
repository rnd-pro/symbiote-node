/**
 * Light Clean — bright minimal theme
 *
 * Inverted lightness values: bg=95%, surface=100%, text=15%.
 * Same atomic HSL structure as dark theme.
 *
 * @module symbiote-node/themes/light
 */

/** @type {import('./Theme.js').ThemeDefinition} */
export const LIGHT_CLEAN = {
  name: 'light-clean',
  tokens: {
    // === Atomic tokens ===

    // Hues
    '--sn-hue-base': '220',
    '--sn-hue-accent': '217',
    '--sn-hue-success': '142',
    '--sn-hue-warning': '38',
    '--sn-hue-danger': '0',
    '--sn-hue-data': '262',

    // Saturation levels
    '--sn-sat': '14%',
    '--sn-sat-vivid': '60%',
    '--sn-sat-muted': '8%',

    // Lightness levels (inverted for light theme)
    '--sn-lit-bg': '95%',
    '--sn-lit-surface': '100%',
    '--sn-lit-border': '83%',
    '--sn-lit-hover': '90%',
    '--sn-lit-text': '15%',
    '--sn-lit-text-dim': '45%',
    '--sn-lit-accent': '50%',

    // Alpha levels
    '--sn-alpha-overlay': '0.95',
    '--sn-alpha-subtle': '0.1',
    '--sn-alpha-faint': '0.06',

    // === Composed tokens ===

    // Canvas
    '--sn-bg': 'hsl(var(--sn-hue-base), var(--sn-sat), var(--sn-lit-bg))',
    '--sn-grid-dot': 'hsla(0, 0%, 0%, var(--sn-alpha-faint))',
    '--sn-grid-size': '20px',

    // Node
    '--sn-node-bg': 'hsl(0, 0%, var(--sn-lit-surface))',
    '--sn-node-border': 'hsl(var(--sn-hue-base), var(--sn-sat-muted), var(--sn-lit-border))',
    '--sn-node-radius': '10px',
    '--sn-node-shadow': '0 2px 8px rgba(0, 0, 0, 0.08)',
    '--sn-node-selected': 'hsl(var(--sn-hue-accent), var(--sn-sat-vivid), var(--sn-lit-accent))',
    '--sn-node-hover': 'hsl(var(--sn-hue-base), var(--sn-sat-muted), var(--sn-lit-hover))',
    '--sn-node-header-bg': 'hsl(var(--sn-hue-base), var(--sn-sat-muted), 96%)',

    // Typography
    '--sn-font': "'Inter', sans-serif",
    '--sn-text': 'hsl(var(--sn-hue-base), 10%, var(--sn-lit-text))',
    '--sn-text-dim': 'hsl(var(--sn-hue-base), 8%, var(--sn-lit-text-dim))',

    // Sockets
    '--sn-socket-size': '12px',
    '--sn-socket-border-width': '2px',

    // Connections
    '--sn-conn-color': 'hsl(var(--sn-hue-accent), var(--sn-sat-vivid), var(--sn-lit-accent))',
    '--sn-conn-width': '2',
    '--sn-conn-selected': 'hsl(var(--sn-hue-danger), var(--sn-sat-vivid), var(--sn-lit-accent))',

    // Category accent colors
    '--sn-cat-server': 'hsl(var(--sn-hue-accent), var(--sn-sat-vivid), var(--sn-lit-accent))',
    '--sn-cat-instance': 'hsl(var(--sn-hue-success), var(--sn-sat-vivid), 45%)',
    '--sn-cat-control': 'hsl(var(--sn-hue-warning), var(--sn-sat-vivid), var(--sn-lit-accent))',
    '--sn-cat-data': 'hsl(var(--sn-hue-data), var(--sn-sat-vivid), 55%)',
    '--sn-cat-default': 'hsl(0, 0%, var(--sn-lit-text-dim))',

    // Context menu
    '--sn-ctx-bg': 'hsl(0, 0%, var(--sn-lit-surface))',
    '--sn-ctx-border': 'hsl(var(--sn-hue-base), var(--sn-sat-muted), var(--sn-lit-hover))',
    '--sn-ctx-color': 'hsl(var(--sn-hue-base), 10%, var(--sn-lit-text))',
    '--sn-ctx-hover': 'hsla(var(--sn-hue-accent), var(--sn-sat-vivid), var(--sn-lit-accent), var(--sn-alpha-subtle))',

    // Comments
    '--sn-comment-bg': 'hsla(0, 0%, 0%, 0.03)',
    '--sn-comment-border': 'hsla(0, 0%, 0%, 0.08)',
    '--sn-comment-radius': '6px',

    // Toolbar
    '--sn-toolbar-bg': 'hsla(0, 0%, var(--sn-lit-surface), var(--sn-alpha-overlay))',
    '--sn-toolbar-border': 'hsla(0, 0%, 0%, 0.1)',
    '--sn-toolbar-color': 'hsl(var(--sn-hue-base), 8%, 35%)',
    '--sn-toolbar-hover': 'hsla(var(--sn-hue-accent), var(--sn-sat-vivid), var(--sn-lit-accent), 0.12)',
    '--sn-toolbar-active': 'hsl(var(--sn-hue-base), 10%, var(--sn-lit-text))',
    '--sn-toolbar-danger': 'hsla(var(--sn-hue-danger), var(--sn-sat-vivid), var(--sn-lit-accent), 0.15)',
    '--sn-toolbar-danger-color': 'hsl(var(--sn-hue-danger), var(--sn-sat-vivid), var(--sn-lit-accent))',

    // Shape fill/stroke
    '--sn-shape-fill': 'var(--sn-node-bg)',
    '--sn-shape-stroke': 'var(--sn-node-border)',
    '--sn-shape-stroke-width': '0.4',
  },
};

/** @type {import('./Palette.js').PaletteDefinition} */
export const LIGHT_PALETTE = {
  name: 'light',
  colors: {
    '--sn-hue-base': '220',
    '--sn-hue-accent': '217',
    '--sn-hue-success': '142',
    '--sn-hue-warning': '38',
    '--sn-hue-danger': '0',
    '--sn-hue-data': '262',
    '--sn-sat': '14%',
    '--sn-sat-vivid': '60%',
    '--sn-sat-muted': '8%',
    '--sn-lit-bg': '95%',
    '--sn-lit-surface': '100%',
    '--sn-lit-border': '83%',
    '--sn-lit-hover': '90%',
    '--sn-lit-text': '15%',
    '--sn-lit-text-dim': '45%',
    '--sn-lit-accent': '50%',
    '--sn-alpha-overlay': '0.95',
    '--sn-alpha-subtle': '0.1',
    '--sn-alpha-faint': '0.06',
  },
};
