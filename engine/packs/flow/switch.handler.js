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
      const { value, data } = inputs;
      const cases = params.cases;
      const result = { default: null };

      // Initialize all case outputs to null
      for (const outputName of Object.values(cases)) {
        result[outputName] = null;
      }

      // Match value to case
      const stringValue = String(value);
      const matchedOutput = cases[stringValue];

      if (matchedOutput) {
        result[matchedOutput] = data;
        // Declare dynamic outputs
        result.dynamicOutputs = Object.values(cases);
      } else {
        result.default = data;
      }

      return result;
    },
  },
};
