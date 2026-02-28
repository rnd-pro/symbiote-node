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

/**
 * Apply a theme to a DOM element
 * @param {HTMLElement} element
 * @param {ThemeDefinition} theme
 */
export function applyTheme(element, theme) {
  for (const [key, value] of Object.entries(theme.tokens)) {
    element.style.setProperty(key, value);
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
