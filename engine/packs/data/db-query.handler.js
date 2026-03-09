/**
 * data/db-query — Universal SQL query node
 *
 * Executes a parameterized SQL query against the connected database.
 * Parameters are extracted from input data fields specified in params.paramFields.
 *
 * This is a generic node — the DB connection is injected by the host application
 * via context.db (postgres tagged template instance).
 *
 * @module symbiote-node/packs/data/db-query
 */

export default {
  type: 'data/db-query',
  category: 'data',
  icon: 'database',

  driver: {
    description: 'Execute SQL query with parameters from input data',
    inputs: [
      { name: 'data', type: 'any' },
    ],
    outputs: [
      { name: 'rows', type: 'any' },
      { name: 'data', type: 'any' },
    ],
    params: {
      query: { type: 'text', default: '', description: 'SQL query with $1, $2... placeholders' },
      paramFields: { type: 'string', default: '', description: 'Comma-separated field names from input data to use as query params' },
      outputField: { type: 'string', default: 'queryResult', description: 'Field name to store rows in data output' },
    },
  },

  lifecycle: {
    validate: (inputs, params) => {
      return !!params.query;
    },

    execute: async (inputs, params, context) => {
      const data = inputs.data || {};
      const query = params.query;

      // Extract param values from input data
      const paramNames = (params.paramFields || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const paramValues = paramNames.map((field) => data[field]);

      // Execute via context.db (injected by host)
      if (!context?.db) {
        return {
          rows: [],
          data: { ...data, [params.outputField || 'queryResult']: [], error: 'No DB context' },
        };
      }

      const rows = await context.db.unsafe(query, paramValues);
      const outputField = params.outputField || 'queryResult';

      return {
        rows: [...rows],
        data: { ...data, [outputField]: [...rows] },
      };
    },
  },
};
