/**
 * Agent Portal — default production theme for the Agent Portal UI
 *
 * Neutral Carbon-style shell with Agent Portal blue accents.
 *
 * @module symbiote-node/themes/agent-portal
 */

import { CARBON, CARBON_PALETTE } from './carbon.js';

/** @type {import('./Theme.js').ThemeDefinition} */
export let AGENT_PORTAL = {
  ...CARBON,
  name: 'agent-portal',
  tokens: { ...CARBON.tokens },
};

/** @type {import('./Palette.js').PaletteDefinition} */
export let AGENT_PORTAL_PALETTE = {
  ...CARBON_PALETTE,
  name: 'agent-portal',
  colors: { ...CARBON_PALETTE.colors },
};
