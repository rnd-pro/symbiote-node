/**
 * Default Dark — default production theme for symbiote-node UI
 *
 * Neutral Carbon-style shell with blue accents.
 *
 * @module symbiote-node/themes/default-dark
 */

const DEFAULT_DARK_TOKENS = {
  '--sn-hue-base': '0',
  '--sn-hue-accent': '218',
  '--sn-hue-success': '122',
  '--sn-hue-warning': '36',
  '--sn-hue-danger': '4',
  '--sn-hue-data': '265',

  '--sn-sat': '0%',
  '--sn-sat-vivid': '55%',
  '--sn-sat-muted': '0%',

  '--sn-lit-bg': '10%',
  '--sn-lit-surface': '13%',
  '--sn-lit-border': '17%',
  '--sn-lit-hover': '27%',
  '--sn-lit-text': '94%',
  '--sn-lit-text-dim': '60%',
  '--sn-lit-accent': '63%',

  '--sn-alpha-overlay': '0.95',
  '--sn-alpha-subtle': '0.15',
  '--sn-alpha-faint': '0.06',

  '--sn-danger-color': '#f44336',
  '--sn-success-color': '#4caf50',
  '--sn-warning-color': '#ff9800',

  '--sn-bg': '#1a1a1a',
  '--sn-panel-bg': '#222222',
  '--sn-layout-gap-bg': 'transparent',
  '--sn-bg-overlay': 'rgba(0, 0, 0, 0.45)',
  '--sn-grid-dot': 'rgba(255, 255, 255, 0.06)',
  '--sn-grid-size': '20px',

  '--sn-node-bg': '#222222',
  '--sn-node-border': 'rgba(255, 255, 255, 0.1)',
  '--sn-node-radius': '6px',
  '--sn-node-shadow': '0 2px 8px rgba(0, 0, 0, 0.4)',
  '--sn-shadow-color': 'rgba(0, 0, 0, 0.4)',
  '--sn-node-header-bg': '#222222',
  '--sn-node-selected': '#4c8bf5',
  '--sn-node-hover': '#444444',

  '--sn-font': "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  '--sn-font-mono': "'JetBrains Mono', 'Fira Code', monospace",
  '--sn-text': '#f0f0f0',
  '--sn-text-dim': '#999999',

  '--sn-socket-size': '12px',
  '--sn-socket-border-width': '2px',

  '--sn-conn-color': '#4c8bf5',
  '--sn-conn-width': '2',
  '--sn-conn-selected': '#f44336',

  '--sn-cat-server': '#4c8bf5',
  '--sn-cat-instance': '#4caf50',
  '--sn-cat-control': '#ff9800',
  '--sn-cat-data': '#9c27b0',
  '--sn-cat-default': '#666666',
  '--sn-subgraph-accent': 'var(--sn-cat-data)',

  '--sn-ctx-bg': '#2a2a2a',
  '--sn-ctx-border': 'rgba(255, 255, 255, 0.1)',
  '--sn-ctx-color': '#f0f0f0',
  '--sn-ctx-hover': 'rgba(76, 139, 245, 0.15)',

  '--sn-accent-bg': 'rgba(76, 139, 245, 0.12)',
  '--sn-accent-bg-subtle': 'rgba(76, 139, 245, 0.06)',
  '--sn-accent-border': 'rgba(76, 139, 245, 0.2)',
  '--sn-accent-glow': '0 0 12px rgba(76, 139, 245, 0.12)',
  '--sn-success-border': 'rgba(76, 175, 80, 0.2)',
  '--sn-danger-border': 'rgba(244, 67, 54, 0.2)',
  '--sn-danger-bg': 'rgba(244, 67, 54, 0.12)',

  '--sn-comment-bg': 'rgba(255, 255, 255, 0.04)',
  '--sn-comment-border': 'rgba(255, 255, 255, 0.08)',
  '--sn-comment-radius': '4px',

  '--sn-toolbar-bg': 'rgba(34, 34, 34, 0.95)',
  '--sn-toolbar-border': 'rgba(255, 255, 255, 0.08)',
  '--sn-toolbar-color': '#999999',
  '--sn-toolbar-hover': 'rgba(76, 139, 245, 0.18)',
  '--sn-toolbar-active': '#f0f0f0',
  '--sn-toolbar-danger': 'rgba(244, 67, 54, 0.22)',
  '--sn-toolbar-danger-color': '#f44336',

  '--sn-shape-fill': 'var(--sn-node-bg)',
  '--sn-shape-stroke': 'var(--sn-node-border)',
  '--sn-shape-stroke-width': '0.4',

  '--bg-level-2': 'var(--sn-node-bg)',
  '--border-color': 'var(--sn-node-border)',
  '--text-color': 'var(--sn-text)',
  '--text-color-muted': 'var(--sn-text-dim)',
};

const DEFAULT_DARK_PALETTE_COLORS = {
  '--sn-hue-base': '0',
  '--sn-hue-accent': '218',
  '--sn-hue-success': '122',
  '--sn-hue-warning': '36',
  '--sn-hue-danger': '4',
  '--sn-hue-data': '265',
  '--sn-sat': '0%',
  '--sn-sat-vivid': '55%',
  '--sn-sat-muted': '0%',
  '--sn-lit-bg': '10%',
  '--sn-lit-surface': '13%',
  '--sn-lit-border': '17%',
  '--sn-lit-hover': '27%',
  '--sn-lit-text': '94%',
  '--sn-lit-text-dim': '60%',
  '--sn-lit-accent': '63%',
  '--sn-alpha-overlay': '0.95',
  '--sn-alpha-subtle': '0.15',
  '--sn-alpha-faint': '0.06',
};

/** @type {import('./Theme.js').ThemeDefinition} */
export let DEFAULT_DARK = {
  name: 'default-dark',
  tokens: { ...DEFAULT_DARK_TOKENS },
};

/** @type {import('./Palette.js').PaletteDefinition} */
export let DEFAULT_DARK_PALETTE = {
  name: 'default-dark',
  colors: { ...DEFAULT_DARK_PALETTE_COLORS },
};
