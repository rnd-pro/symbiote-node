/**
 * Glass — iOS 26 / macOS Liquid Glass inspired theme
 *
 * Frosted translucent surfaces with soft blur. Muted tints,
 * high-contrast vibrancy text, and delicate luminous borders.
 * Designed for dark environments — glass panels glow subtly.
 *
 * @module symbiote-node/themes/glass
 */

/** @type {import('./Theme.js').ThemeDefinition} */
export const GLASS = {
  name: 'glass',
  tokens: {
    // === Atomic tokens ===

    // Hues — cool blue-violet base, iOS system accent
    '--sn-hue-base': '225',
    '--sn-hue-accent': '210',
    '--sn-hue-success': '150',
    '--sn-hue-warning': '38',
    '--sn-hue-danger': '2',
    '--sn-hue-data': '270',

    // Saturation — desaturated base, controlled vibrancy
    '--sn-sat': '18%',
    '--sn-sat-vivid': '72%',
    '--sn-sat-muted': '10%',

    // Lightness — dark base, luminous accents
    '--sn-lit-bg': '8%',
    '--sn-lit-surface': '14%',
    '--sn-lit-border': '25%',
    '--sn-lit-hover': '20%',
    '--sn-lit-text': '92%',
    '--sn-lit-text-dim': '58%',
    '--sn-lit-accent': '68%',

    // Alpha — glass is all about transparency
    '--sn-alpha-overlay': '0.72',
    '--sn-alpha-subtle': '0.12',
    '--sn-alpha-faint': '0.06',

    // Semantic state colors
    '--sn-danger-color': 'hsl(var(--sn-hue-danger), var(--sn-sat-vivid), var(--sn-lit-accent))',
    '--sn-success-color': 'hsl(var(--sn-hue-success), var(--sn-sat-vivid), var(--sn-lit-accent))',
    '--sn-warning-color': 'hsl(var(--sn-hue-warning), var(--sn-sat-vivid), var(--sn-lit-accent))',

    // === Composed tokens ===

    // Canvas — deep dark for contrast with glass panels
    '--sn-bg': 'hsl(var(--sn-hue-base), var(--sn-sat), var(--sn-lit-bg))',
    '--sn-grid-dot': 'hsla(var(--sn-hue-accent), 30%, 50%, 0.08)',
    '--sn-grid-size': '24px',

    // Node — frosted glass panels
    '--sn-node-bg': 'hsla(var(--sn-hue-base), 20%, 16%, var(--sn-alpha-overlay))',
    '--sn-node-border': 'hsla(var(--sn-hue-base), 20%, 40%, 0.25)',
    '--sn-node-radius': '14px',
    '--sn-node-shadow': '0 4px 24px rgba(0, 0, 0, 0.35), inset 0 0.5px 0 hsla(0, 0%, 100%, 0.08)',
    '--sn-shadow-color': 'rgba(0, 0, 0, 0.35)',
    '--sn-node-selected': 'hsl(var(--sn-hue-accent), var(--sn-sat-vivid), var(--sn-lit-accent))',
    '--sn-node-hover': 'hsla(var(--sn-hue-base), 25%, 28%, 0.5)',
    '--sn-node-header-bg': 'hsla(var(--sn-hue-base), 20%, 18%, 0.6)',

    // Typography — SF Pro vibes
    '--sn-font': "'SF Pro Display', 'Inter', -apple-system, sans-serif",
    '--sn-text': 'hsla(0, 0%, 100%, 0.88)',
    '--sn-text-dim': 'hsla(0, 0%, 100%, 0.45)',

    // Sockets
    '--sn-socket-size': '12px',
    '--sn-socket-border-width': '1.5px',

    // Connections — luminous lines
    '--sn-conn-color': 'hsla(var(--sn-hue-accent), var(--sn-sat-vivid), var(--sn-lit-accent), 0.7)',
    '--sn-conn-width': '1.5',
    '--sn-conn-selected': 'hsl(var(--sn-hue-danger), var(--sn-sat-vivid), var(--sn-lit-accent))',

    // Category accent colors — iOS system palette
    '--sn-cat-server': 'hsl(var(--sn-hue-accent), var(--sn-sat-vivid), var(--sn-lit-accent))',
    '--sn-cat-instance': 'hsl(var(--sn-hue-success), var(--sn-sat-vivid), var(--sn-lit-accent))',
    '--sn-cat-control': 'hsl(var(--sn-hue-warning), 65%, 62%)',
    '--sn-cat-data': 'hsl(var(--sn-hue-data), 55%, 70%)',
    '--sn-cat-default': 'hsla(0, 0%, 100%, 0.4)',

    // Context menu — glass panel
    '--sn-ctx-bg': 'hsla(var(--sn-hue-base), 20%, 14%, 0.85)',
    '--sn-ctx-border': 'hsla(var(--sn-hue-base), 20%, 50%, 0.2)',
    '--sn-ctx-color': 'hsla(0, 0%, 100%, 0.88)',
    '--sn-ctx-hover': 'hsla(var(--sn-hue-accent), 40%, 50%, 0.15)',

    // Comments — frosted overlay
    '--sn-comment-bg': 'hsla(var(--sn-hue-base), 15%, 20%, 0.3)',
    '--sn-comment-border': 'hsla(var(--sn-hue-base), 20%, 50%, 0.12)',
    '--sn-comment-radius': '12px',

    // Toolbar — glass bar
    '--sn-toolbar-bg': 'hsla(var(--sn-hue-base), 20%, 12%, 0.7)',
    '--sn-toolbar-border': 'hsla(var(--sn-hue-base), 20%, 50%, 0.15)',
    '--sn-toolbar-color': 'hsla(0, 0%, 100%, 0.65)',
    '--sn-toolbar-hover': 'hsla(var(--sn-hue-accent), 40%, 60%, 0.2)',
    '--sn-toolbar-active': 'hsla(0, 0%, 100%, 0.92)',
    '--sn-toolbar-danger': 'hsla(var(--sn-hue-danger), var(--sn-sat-vivid), 60%, 0.2)',
    '--sn-toolbar-danger-color': 'hsl(var(--sn-hue-danger), var(--sn-sat-vivid), 65%)',

    // Shape fill/stroke — translucent glass shapes
    '--sn-shape-fill': 'hsla(var(--sn-hue-base), 20%, 16%, var(--sn-alpha-overlay))',
    '--sn-shape-stroke': 'hsla(var(--sn-hue-base), 20%, 50%, 0.3)',
    '--sn-shape-stroke-width': '0.3',
  },
};

/** @type {import('./Palette.js').PaletteDefinition} */
export const GLASS_PALETTE = {
  name: 'glass',
  colors: {
    '--sn-hue-base': '225',
    '--sn-hue-accent': '210',
    '--sn-hue-success': '150',
    '--sn-hue-warning': '38',
    '--sn-hue-danger': '2',
    '--sn-hue-data': '270',
    '--sn-sat': '18%',
    '--sn-sat-vivid': '72%',
    '--sn-sat-muted': '10%',
    '--sn-lit-bg': '8%',
    '--sn-lit-surface': '14%',
    '--sn-lit-border': '25%',
    '--sn-lit-hover': '20%',
    '--sn-lit-text': '92%',
    '--sn-lit-text-dim': '58%',
    '--sn-lit-accent': '68%',
    '--sn-alpha-overlay': '0.72',
    '--sn-alpha-subtle': '0.12',
    '--sn-alpha-faint': '0.06',
  },
};
