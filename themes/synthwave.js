/**
 * Synthwave — neon retrowave theme
 *
 * @module symbiote-node/themes/synthwave
 */

/** @type {import('./Theme.js').ThemeDefinition} */
export const SYNTHWAVE = {
  name: 'synthwave',
  tokens: {
    '--sn-bg': '#0a0a1a',
    '--sn-grid-dot': 'rgba(255, 0, 255, 0.08)',
    '--sn-grid-size': '24px',
    '--sn-node-bg': '#1a0a2e',
    '--sn-node-border': '#4a1a6a',
    '--sn-node-radius': '12px',
    '--sn-node-shadow': '0 4px 20px rgba(180, 0, 255, 0.2)',
    '--sn-node-selected': '#ff00ff',
    '--sn-node-hover': '#6a2a8a',
    '--sn-font': "'Space Grotesk', sans-serif",
    '--sn-text': '#f0d0ff',
    '--sn-text-dim': '#8a6a9a',
    '--sn-socket-size': '14px',
    '--sn-socket-border-width': '2px',
    '--sn-conn-color': '#ff00ff',
    '--sn-conn-width': '2.5',
    '--sn-conn-selected': '#00ffff',
    '--sn-cat-server': '#ff6ec7',
    '--sn-cat-instance': '#00ffff',
    '--sn-cat-control': '#ffff00',
    '--sn-cat-data': '#ff00ff',
    '--sn-cat-default': '#8a6a9a',
    '--sn-ctx-bg': '#1a0a2e',
    '--sn-ctx-border': '#4a1a6a',
    '--sn-ctx-color': '#f0d0ff',
    '--sn-ctx-hover': 'rgba(255, 0, 255, 0.2)',
    '--sn-comment-bg': 'rgba(255, 0, 255, 0.05)',
    '--sn-comment-border': 'rgba(255, 0, 255, 0.15)',
    '--sn-comment-radius': '8px',

    // Toolbar
    '--sn-toolbar-bg': 'rgba(26, 10, 46, 0.92)',
    '--sn-toolbar-border': 'rgba(255, 0, 255, 0.2)',
    '--sn-toolbar-color': '#c0a0d8',
    '--sn-toolbar-hover': 'rgba(255, 0, 255, 0.2)',
    '--sn-toolbar-active': '#f0d0ff',
    '--sn-toolbar-danger': 'rgba(255, 80, 80, 0.25)',
    '--sn-toolbar-danger-color': '#ff6060',
  },
};

/** @type {import('./Palette.js').PaletteDefinition} */
export const SYNTHWAVE_PALETTE = {
  name: 'synthwave',
  colors: {
    '--sn-bg': '#0a0a1a',
    '--sn-grid-dot': 'rgba(255, 0, 255, 0.08)',
    '--sn-node-bg': '#1a0a2e',
    '--sn-node-border': '#4a1a6a',
    '--sn-node-selected': '#ff00ff',
    '--sn-node-hover': '#6a2a8a',
    '--sn-text': '#f0d0ff',
    '--sn-text-dim': '#8a6a9a',
    '--sn-conn-color': '#ff00ff',
    '--sn-conn-selected': '#00ffff',
    '--sn-cat-server': '#ff6ec7',
    '--sn-cat-instance': '#00ffff',
    '--sn-cat-control': '#ffff00',
    '--sn-cat-data': '#ff00ff',
    '--sn-cat-default': '#8a6a9a',
    '--sn-ctx-bg': '#1a0a2e',
    '--sn-ctx-border': '#4a1a6a',
    '--sn-ctx-color': '#f0d0ff',
    '--sn-ctx-hover': 'rgba(255, 0, 255, 0.2)',
    '--sn-comment-bg': 'rgba(255, 0, 255, 0.05)',
    '--sn-comment-border': 'rgba(255, 0, 255, 0.15)',
    '--sn-toolbar-bg': 'rgba(26, 10, 46, 0.92)',
    '--sn-toolbar-border': 'rgba(255, 0, 255, 0.2)',
    '--sn-toolbar-color': '#c0a0d8',
    '--sn-toolbar-hover': 'rgba(255, 0, 255, 0.2)',
    '--sn-toolbar-active': '#f0d0ff',
    '--sn-toolbar-danger': 'rgba(255, 80, 80, 0.25)',
    '--sn-toolbar-danger-color': '#ff6060',
  },
};
