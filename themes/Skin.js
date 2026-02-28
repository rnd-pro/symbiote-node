/**
 * Skin — geometry-only design tokens
 *
 * Contains only structural properties: border-radius, spacing,
 * sizes, shadows, fonts. Independent of colors.
 * Can be extracted from Stitch designs.
 *
 * @module symbiote-node/themes/Skin
 */

/**
 * @typedef {Object} SkinDefinition
 * @property {string} name
 * @property {Object<string, string>} geometry
 */

/** @type {SkinDefinition} */
export const MODERN_SKIN = {
  name: 'modern',
  geometry: {
    '--sn-node-radius': '10px',
    '--sn-node-shadow': '0 4px 16px rgba(0, 0, 0, 0.3)',
    '--sn-socket-size': '12px',
    '--sn-socket-border-width': '2px',
    '--sn-font': "'Inter', sans-serif",
    '--sn-font-size': '13px',
    '--sn-grid-size': '20px',
    '--sn-conn-width': '2',
    '--sn-comment-radius': '6px',
  },
};

/** @type {SkinDefinition} */
export const COMPACT_SKIN = {
  name: 'compact',
  geometry: {
    '--sn-node-radius': '6px',
    '--sn-node-shadow': '0 2px 8px rgba(0, 0, 0, 0.2)',
    '--sn-socket-size': '10px',
    '--sn-socket-border-width': '1.5px',
    '--sn-font': "'Inter', sans-serif",
    '--sn-font-size': '12px',
    '--sn-grid-size': '16px',
    '--sn-conn-width': '1.5',
    '--sn-comment-radius': '4px',
  },
};

/** @type {SkinDefinition} */
export const ROUNDED_SKIN = {
  name: 'rounded',
  geometry: {
    '--sn-node-radius': '16px',
    '--sn-node-shadow': '0 6px 24px rgba(0, 0, 0, 0.25)',
    '--sn-socket-size': '14px',
    '--sn-socket-border-width': '2.5px',
    '--sn-font': "'Space Grotesk', sans-serif",
    '--sn-font-size': '14px',
    '--sn-grid-size': '24px',
    '--sn-conn-width': '2.5',
    '--sn-comment-radius': '12px',
  },
};

/**
 * Apply skin to element
 * @param {HTMLElement} element
 * @param {SkinDefinition} skin
 */
export function applySkin(element, skin) {
  for (const [key, value] of Object.entries(skin.geometry)) {
    element.style.setProperty(key, value);
  }
}
