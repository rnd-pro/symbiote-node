/**
 * Theme — JSON-driven CSS token system for node graph styling
 *
 * Applies design tokens as CSS custom properties on a target element.
 * Themes are plain objects — AI can generate them on the fly.
 *
 * @module symbiote-node/themes/Theme
 */

/**
 * @typedef {Object} ThemeDefinition
 * @property {string} name - Theme identifier
 * @property {Object<string, string>} tokens - CSS custom property key-value pairs
 */

// Re-export all built-in themes
export { DARK_DEFAULT } from './dark.js';
export { LIGHT_CLEAN } from './light.js';
export { SYNTHWAVE } from './synthwave.js';
export { GREY_NEUTRAL } from './grey.js';
export { GLASS } from './glass.js';

/**
 * Mapping from layout global tokens to symbiote-node tokens.
 * Layout module uses --bg-*, --text-* format; this bridges them.
 * @type {Object<string, string>}
 */
const LAYOUT_TOKEN_MAP = {
  '--bg-panel': '--sn-node-bg',
  '--bg-deeper': '--sn-bg',
  '--bg-header': '--sn-node-header-bg',
  '--bg-hover': '--sn-node-hover',
  '--bg-popup': '--sn-ctx-bg',
  '--text-main': '--sn-text',
  '--text-dim': '--sn-text-dim',
  '--text-muted': '--sn-text-dim',
  '--layout-border': '--sn-node-border',
  '--layout-highlight': '--sn-node-selected',
  '--border-popup': '--sn-ctx-border',
  '--accent': '--sn-node-selected',
  '--font-main': '--sn-font',
};

/**
 * Apply a theme to a DOM element
 * @param {HTMLElement} element
 * @param {ThemeDefinition} theme
 */
export function applyTheme(element, theme) {
  for (const [key, value] of Object.entries(theme.tokens)) {
    element.style.setProperty(key, value);
  }
  // Set theme name as attribute for CSS selectors
  element.setAttribute('data-sn-theme', theme.name);
  // Bridge: derive global layout tokens from --sn-* values
  for (const [layoutToken, snToken] of Object.entries(LAYOUT_TOKEN_MAP)) {
    const value = theme.tokens[snToken];
    if (value) {
      element.style.setProperty(layoutToken, value);
    }
  }
}

/**
 * Extract current theme tokens from an element
 * @param {HTMLElement} element
 * @param {ThemeDefinition} reference - reference theme for token keys
 * @returns {ThemeDefinition}
 */
export function extractTheme(element, reference) {
  const tokens = {};
  const computed = getComputedStyle(element);
  for (const key of Object.keys(reference.tokens)) {
    tokens[key] = computed.getPropertyValue(key).trim() || reference.tokens[key];
  }
  return { name: 'extracted', tokens };
}
