/**
 * flow/merge — First-non-null merge node
 *
 * Returns the first non-null input from a and b.
 * Useful after IF branches to merge back into single path.
 *
 * @module symbiote-node/packs/flow/merge
 */

export default {
  type: 'flow/merge',
  category: 'flow',
  icon: 'merge',

  driver: {
    description: 'Merge branches — returns first non-null input',
    inputs: [
      { name: 'a', type: 'any' },
      { name: 'b', type: 'any' },
    ],
    outputs: [
      { name: 'output', type: 'any' },
    ],
    params: {},
  },

  lifecycle: {
    execute: (inputs) => {
      const output = inputs.a != null ? inputs.a : inputs.b;
      return { output };
    },
  },
};
