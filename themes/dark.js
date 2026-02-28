/**
 * Dark Default — deep navy theme with blue accents
 *
 * @module symbiote-node/themes/dark
 */

/** @type {import('./Theme.js').ThemeDefinition} */
export const DARK_DEFAULT = {
  name: 'dark-default',
  tokens: {
    '--sn-bg': '#1a1a2e',
    '--sn-grid-dot': 'rgba(255,255,255,0.06)',
    '--sn-grid-size': '20px',
    '--sn-node-bg': '#16213e',
    '--sn-node-border': '#2a2a4a',
    '--sn-node-radius': '10px',
    '--sn-node-shadow': '0 4px 16px rgba(0, 0, 0, 0.3)',
    '--sn-node-selected': '#4a9eff',
    '--sn-node-hover': '#3a3a6a',
    '--sn-font': "'Inter', sans-serif",
    '--sn-text': '#e2e8f0',
    '--sn-text-dim': '#94a3b8',
    '--sn-socket-size': '12px',
    '--sn-socket-border-width': '2px',
    '--sn-conn-color': '#4a9eff',
    '--sn-conn-width': '2',
    '--sn-conn-selected': '#ff6b6b',
    '--sn-cat-server': '#4a9eff',
    '--sn-cat-instance': '#4ade80',
    '--sn-cat-control': '#fbbf24',
    '--sn-cat-data': '#a78bfa',
    '--sn-cat-default': '#94a3b8',
    '--sn-ctx-bg': '#1e1e3a',
    '--sn-ctx-border': '#3a3a6a',
    '--sn-ctx-color': '#e0e0e0',
    '--sn-ctx-hover': 'rgba(74, 158, 255, 0.15)',
    '--sn-comment-bg': 'rgba(255, 255, 255, 0.05)',
    '--sn-comment-border': 'rgba(255, 255, 255, 0.1)',
    '--sn-comment-radius': '6px',

    // Toolbar
    '--sn-toolbar-bg': 'rgba(22, 33, 62, 0.92)',
    '--sn-toolbar-border': 'rgba(255, 255, 255, 0.1)',
    '--sn-toolbar-color': '#c0c8d8',
    '--sn-toolbar-hover': 'rgba(74, 158, 255, 0.2)',
    '--sn-toolbar-active': '#e2e8f0',
    '--sn-toolbar-danger': 'rgba(255, 107, 107, 0.25)',
    '--sn-toolbar-danger-color': '#ff6b6b',
  },
};

/** @type {import('./Palette.js').PaletteDefinition} */
export const DARK_PALETTE = {
  name: 'dark',
  colors: {
    '--sn-bg': '#1a1a2e',
    '--sn-grid-dot': 'rgba(255,255,255,0.06)',
    '--sn-node-bg': '#16213e',
    '--sn-node-border': '#2a2a4a',
    '--sn-node-selected': '#4a9eff',
    '--sn-node-hover': '#3a3a6a',
    '--sn-text': '#e2e8f0',
    '--sn-text-dim': '#94a3b8',
    '--sn-conn-color': '#4a9eff',
    '--sn-conn-selected': '#ff6b6b',
    '--sn-cat-server': '#4a9eff',
    '--sn-cat-instance': '#4ade80',
    '--sn-cat-control': '#fbbf24',
    '--sn-cat-data': '#a78bfa',
    '--sn-cat-default': '#94a3b8',
    '--sn-ctx-bg': '#1e1e3a',
    '--sn-ctx-border': '#3a3a6a',
    '--sn-ctx-color': '#e0e0e0',
    '--sn-ctx-hover': 'rgba(74, 158, 255, 0.15)',
    '--sn-comment-bg': 'rgba(255, 255, 255, 0.05)',
    '--sn-comment-border': 'rgba(255, 255, 255, 0.1)',
    '--sn-toolbar-bg': 'rgba(22, 33, 62, 0.92)',
    '--sn-toolbar-border': 'rgba(255, 255, 255, 0.1)',
    '--sn-toolbar-color': '#c0c8d8',
    '--sn-toolbar-hover': 'rgba(74, 158, 255, 0.2)',
    '--sn-toolbar-active': '#e2e8f0',
    '--sn-toolbar-danger': 'rgba(255, 107, 107, 0.25)',
    '--sn-toolbar-danger-color': '#ff6b6b',
  },
};
