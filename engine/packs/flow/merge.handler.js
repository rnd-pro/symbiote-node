/**
 * flow/merge — Multi-input data merge node
 *
 * Combines data from multiple inputs (a, b) into a single output.
 * Supports three modes:
 *   - 'first' (default): returns first non-null input (branch merge after IF)
 *   - 'combine': Object.assign all non-null inputs (deep merge)
 *   - 'append': collect all non-null inputs into an array
 *
 * @module symbiote-node/packs/flow/merge
 */

export default {
  type: 'flow/merge',
  category: 'flow',
  icon: 'merge',

  driver: {
    description: 'Merge branches — combine data from multiple inputs',
    inputs: [
      { name: 'a', type: 'any' },
      { name: 'b', type: 'any' },
    ],
    outputs: [
      { name: 'data', type: 'any' },
    ],
    params: {
      mode: {
        type: 'string',
        default: 'first',
        description: 'first = first non-null, combine = Object.assign, append = array',
      },
    },
  },

  lifecycle: {
    execute: (inputs, params) => {
      const mode = params?.mode || 'first';

      if (mode === 'combine') {
        const merged = {};
        for (const value of Object.values(inputs)) {
          if (value != null && typeof value === 'object') {
            Object.assign(merged, value);
          }
        }
        return { data: merged };
      }

      if (mode === 'append') {
        const items = Object.values(inputs).filter(v => v != null);
        return { data: items };
      }

      // Default: 'first' — first non-null input
      const data = inputs.a != null ? inputs.a : inputs.b;
      return { data };
    },
  },
};
