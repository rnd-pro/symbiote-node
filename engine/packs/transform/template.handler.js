/**
 * transform/template — String template interpolation
 *
 * Replaces {{variable}} placeholders in template string with values from data object.
 * Supports nested access via dot notation: {{user.name}}.
 *
 * @module agi-graph/packs/transform/template
 */

export default {
  type: 'transform/template',
  category: 'transform',
  icon: 'text_snippet',

  driver: {
    description: 'Template interpolation — replace {{var}} with data values',
    inputs: [
      { name: 'template', type: 'string' },
      { name: 'data', type: 'any' },
    ],
    outputs: [
      { name: 'result', type: 'string' },
      { name: 'data', type: 'any' },
    ],
    params: {
      template: { type: 'textarea', default: '', description: 'Message template ({{var}} syntax)' },
    },
  },

  lifecycle: {
    // No validate: template comes from params.template or inputs.template
    // Execute handles both cases

    cacheKey: (inputs) =>
      `tpl:${inputs.template}:${JSON.stringify(inputs.data)}`,

    execute: async (inputs, params) => {
      const template = params?.template || inputs.template;
      const { data } = inputs;

      const result = template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        const trimmed = key.trim();
        // Support dot notation: {{user.name}}
        const value = trimmed.split('.').reduce((obj, k) => {
          if (obj === null || obj === undefined) return undefined;
          return obj[k];
        }, data);

        if (value === undefined) {
          console.warn(`[template] ⚠️ Missing variable "${trimmed}" in data keys: [${data ? Object.keys(data).join(', ') : 'NO DATA'}]`);
          return match;
        }
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      });

      // Output rendered text in both formats:
      // - result: raw string (for chaining)
      // - data: full context with text field (for telegram/chat)
      const outputField = params?.outputField || 'text';
      return {
        result,
        data: { ...(typeof data === 'object' ? data : {}), [outputField]: result },
      };
    },
  },
};
