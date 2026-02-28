/**
 * Light Clean — bright minimal theme
 *
 * @module symbiote-node/themes/light
 */

/** @type {import('./Theme.js').ThemeDefinition} */
export const LIGHT_CLEAN = {
  name: 'light-clean',
  tokens: {
    '--sn-bg': '#f0f2f5',
    '--sn-grid-dot': 'rgba(0,0,0,0.06)',
    '--sn-grid-size': '20px',
    '--sn-node-bg': '#ffffff',
    '--sn-node-border': '#d1d5db',
    '--sn-node-radius': '10px',
    '--sn-node-shadow': '0 2px 8px rgba(0, 0, 0, 0.08)',
    '--sn-node-selected': '#3b82f6',
    '--sn-node-hover': '#e5e7eb',
    '--sn-font': "'Inter', sans-serif",
    '--sn-text': '#1f2937',
    '--sn-text-dim': '#6b7280',
    '--sn-socket-size': '12px',
    '--sn-socket-border-width': '2px',
    '--sn-conn-color': '#3b82f6',
    '--sn-conn-width': '2',
    '--sn-conn-selected': '#ef4444',
    '--sn-cat-server': '#3b82f6',
    '--sn-cat-instance': '#22c55e',
    '--sn-cat-control': '#f59e0b',
    '--sn-cat-data': '#8b5cf6',
    '--sn-cat-default': '#6b7280',
    '--sn-ctx-bg': '#ffffff',
    '--sn-ctx-border': '#e5e7eb',
    '--sn-ctx-color': '#1f2937',
    '--sn-ctx-hover': 'rgba(59, 130, 246, 0.1)',
    '--sn-comment-bg': 'rgba(0, 0, 0, 0.03)',
    '--sn-comment-border': 'rgba(0, 0, 0, 0.08)',
    '--sn-comment-radius': '6px',

    // Toolbar
    '--sn-toolbar-bg': 'rgba(255, 255, 255, 0.95)',
    '--sn-toolbar-border': 'rgba(0, 0, 0, 0.1)',
    '--sn-toolbar-color': '#4b5563',
    '--sn-toolbar-hover': 'rgba(59, 130, 246, 0.12)',
    '--sn-toolbar-active': '#1f2937',
    '--sn-toolbar-danger': 'rgba(239, 68, 68, 0.15)',
    '--sn-toolbar-danger-color': '#ef4444',
  },
};

/** @type {import('./Palette.js').PaletteDefinition} */
export const LIGHT_PALETTE = {
  name: 'light',
  colors: {
    '--sn-bg': '#f0f2f5',
    '--sn-grid-dot': 'rgba(0,0,0,0.06)',
    '--sn-node-bg': '#ffffff',
    '--sn-node-border': '#d1d5db',
    '--sn-node-selected': '#3b82f6',
    '--sn-node-hover': '#e5e7eb',
    '--sn-text': '#1f2937',
    '--sn-text-dim': '#6b7280',
    '--sn-conn-color': '#3b82f6',
    '--sn-conn-selected': '#ef4444',
    '--sn-cat-server': '#3b82f6',
    '--sn-cat-instance': '#22c55e',
    '--sn-cat-control': '#f59e0b',
    '--sn-cat-data': '#8b5cf6',
    '--sn-cat-default': '#6b7280',
    '--sn-ctx-bg': '#ffffff',
    '--sn-ctx-border': '#e5e7eb',
    '--sn-ctx-color': '#1f2937',
    '--sn-ctx-hover': 'rgba(59, 130, 246, 0.1)',
    '--sn-comment-bg': 'rgba(0, 0, 0, 0.03)',
    '--sn-comment-border': 'rgba(0, 0, 0, 0.08)',
    '--sn-toolbar-bg': 'rgba(255, 255, 255, 0.95)',
    '--sn-toolbar-border': 'rgba(0, 0, 0, 0.1)',
    '--sn-toolbar-color': '#4b5563',
    '--sn-toolbar-hover': 'rgba(59, 130, 246, 0.12)',
    '--sn-toolbar-active': '#1f2937',
    '--sn-toolbar-danger': 'rgba(239, 68, 68, 0.15)',
    '--sn-toolbar-danger-color': '#ef4444',
  },
};
