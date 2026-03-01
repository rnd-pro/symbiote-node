/**
 * Grey Neutral — professional muted grey theme
 *
 * @module symbiote-node/themes/grey
 */

/** @type {import('./Theme.js').ThemeDefinition} */
export const GREY_NEUTRAL = {
  name: 'grey-neutral',
  tokens: {
    '--sn-bg': '#2d2d2d',
    '--sn-grid-dot': 'rgba(255,255,255,0.1)',
    '--sn-grid-size': '20px',
    '--sn-node-bg': '#3d3d3d',
    '--sn-node-border': '#555555',
    '--sn-node-radius': '6px',
    '--sn-node-shadow': '0 2px 8px rgba(0, 0, 0, 0.4)',
    '--sn-node-header-bg': '#333333',
    '--sn-node-selected': '#5a9fd4',
    '--sn-node-hover': '#4a4a4a',
    '--sn-font': "'Inter', sans-serif",
    '--sn-text': '#d4d4d4',
    '--sn-text-dim': '#a0a0a0',
    '--sn-socket-size': '12px',
    '--sn-socket-border-width': '2px',
    '--sn-conn-color': '#8a8a8a',
    '--sn-conn-width': '2',
    '--sn-conn-selected': '#e06050',
    '--sn-cat-server': '#5cb8ff',
    '--sn-cat-instance': '#5cd87a',
    '--sn-cat-control': '#f0b840',
    '--sn-cat-data': '#b08aef',
    '--sn-cat-default': '#9a9a9a',
    '--sn-ctx-bg': '#383838',
    '--sn-ctx-border': '#505050',
    '--sn-ctx-color': '#d4d4d4',
    '--sn-ctx-hover': 'rgba(90, 159, 212, 0.15)',
    '--sn-comment-bg': 'rgba(255, 255, 255, 0.04)',
    '--sn-comment-border': 'rgba(255, 255, 255, 0.08)',
    '--sn-comment-radius': '4px',

    // Toolbar
    '--sn-toolbar-bg': 'rgba(56, 56, 56, 0.94)',
    '--sn-toolbar-border': 'rgba(255, 255, 255, 0.08)',
    '--sn-toolbar-color': '#aaaaaa',
    '--sn-toolbar-hover': 'rgba(90, 159, 212, 0.18)',
    '--sn-toolbar-active': '#d4d4d4',
    '--sn-toolbar-danger': 'rgba(224, 96, 80, 0.22)',
    '--sn-toolbar-danger-color': '#e06050',
  },
};

/** @type {import('./Palette.js').PaletteDefinition} */
export const GREY_PALETTE = {
  name: 'grey',
  colors: {
    '--sn-bg': '#2d2d2d',
    '--sn-grid-dot': 'rgba(255,255,255,0.1)',
    '--sn-node-bg': '#3d3d3d',
    '--sn-node-border': '#555555',
    '--sn-node-selected': '#5a9fd4',
    '--sn-node-hover': '#4a4a4a',
    '--sn-text': '#d4d4d4',
    '--sn-text-dim': '#a0a0a0',
    '--sn-conn-color': '#8a8a8a',
    '--sn-conn-selected': '#e06050',
    '--sn-cat-server': '#5cb8ff',
    '--sn-cat-instance': '#5cd87a',
    '--sn-cat-control': '#f0b840',
    '--sn-cat-data': '#b08aef',
    '--sn-cat-default': '#9a9a9a',
    '--sn-ctx-bg': '#383838',
    '--sn-ctx-border': '#505050',
    '--sn-ctx-color': '#d4d4d4',
    '--sn-ctx-hover': 'rgba(90, 159, 212, 0.15)',
    '--sn-comment-bg': 'rgba(255, 255, 255, 0.04)',
    '--sn-comment-border': 'rgba(255, 255, 255, 0.08)',
    '--sn-toolbar-bg': 'rgba(56, 56, 56, 0.94)',
    '--sn-toolbar-border': 'rgba(255, 255, 255, 0.08)',
    '--sn-toolbar-color': '#aaaaaa',
    '--sn-toolbar-hover': 'rgba(90, 159, 212, 0.18)',
    '--sn-toolbar-active': '#d4d4d4',
    '--sn-toolbar-danger': 'rgba(224, 96, 80, 0.22)',
    '--sn-toolbar-danger-color': '#e06050',
  },
};
