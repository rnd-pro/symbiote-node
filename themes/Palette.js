/**
 * Palette — color-only design tokens
 *
 * Contains only chromatic properties: backgrounds, text colors,
 * accents, category colors, connection colors.
 * Separated from geometry (Skin) for independent swapping.
 *
 * @module symbiote-node/themes/Palette
 */

/**
 * @typedef {Object} PaletteDefinition
 * @property {string} name
 * @property {Object<string, string>} colors
 */

// Re-export all built-in palettes
export { DARK_PALETTE } from './dark.js';
export { LIGHT_PALETTE } from './light.js';
export { SYNTHWAVE_PALETTE } from './synthwave.js';
export { GREY_PALETTE } from './grey.js';

/**
 * Apply palette to element
 * @param {HTMLElement} element
 * @param {PaletteDefinition} palette
 */
export function applyPalette(element, palette) {
  for (const [key, value] of Object.entries(palette.colors)) {
    element.style.setProperty(key, value);
  }
}
