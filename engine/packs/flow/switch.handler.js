/**
 * flow/switch — Multi-branch routing node
 *
 * Routes data to one of N case outputs based on value match.
 * Falls back to 'default' output if no case matches.
 *
 * @module agi-graph/packs/flow/switch
 */

export default {
  type: 'flow/switch',
  category: 'flow',
  icon: 'alt_route',

  driver: {
    description: 'Multi-branch routing by value match',
    inputs: [
      { name: 'value', type: 'any' },
      { name: 'data', type: 'any' },
    ],
    outputs: [
      { name: 'default', type: 'any' },
    ],
    params: {
      cases: { type: 'object', default: {}, description: 'Map of value → output name' },
    },
  },

  lifecycle: {
    validate: (inputs) => inputs.data !== undefined,
    execute: (inputs, params) => {
      const { data } = inputs;
      // Auto-extract value from data[field] when no explicit value input
      const value = inputs.value !== undefined
        ? inputs.value
        : (params.field && data ? data[params.field] : undefined);
      const cases = params.cases;
      const hasCases = cases && Object.keys(cases).length > 0;
      const result = { default: null };

      if (hasCases) {
        // Explicit cases mode: value → mapped output name
        for (const outputName of Object.values(cases)) {
          result[outputName] = null;
        }
        const stringValue = String(value);
        const matchedOutput = cases[stringValue];
        if (matchedOutput) {
          result[matchedOutput] = data;
          result.dynamicOutputs = Object.values(cases);
        } else {
          result.default = data;
        }
      } else {
        // Direct routing: value IS the output name (e.g. 'created' → output 'created')
        const outputName = String(value);
        result[outputName] = data;
        result.dynamicOutputs = [outputName];
      }

      return result;
    },
  },
};
