export let UI_SCHEMA_VERSIONS = [
  {
    version: 'component-descriptor-v1',
    path: 'schemas/component-descriptor-v1.json',
    description: 'JSON Schema for Symbiote Node component provider descriptors.',
  },
  {
    version: 'runtime-ui-v1',
    path: 'schemas/runtime-ui-v1.json',
    description: 'JSON Schema for runtime UI trees assembled from provider component descriptors.',
  },
  {
    version: 'theme-rule-block-v1',
    path: 'schemas/theme-rule-block-v1.json',
    description: 'JSON Schema for composable theme source, cascade, semantic, and component alias blocks.',
  },
];

export let UI_SCHEMAS = {
  'component-descriptor-v1': {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://rnd-pro.github.io/symbiote-node/schemas/component-descriptor-v1.json',
    title: 'Symbiote Node Component Descriptor',
    type: 'object',
    additionalProperties: false,
    required: ['tagName', 'className', 'module', 'specifier', 'importKind', 'category', 'description'],
    properties: {
      tagName: { type: 'string', pattern: '^[a-z][a-z0-9]*(-[a-z0-9]+)+$' },
      className: { type: 'string', minLength: 1 },
      module: { type: 'string', minLength: 1 },
      specifier: { type: 'string', minLength: 1 },
      exportName: { type: ['string', 'null'] },
      importKind: { enum: ['named', 'side-effect'] },
      category: { type: 'string', minLength: 1 },
      description: { type: 'string', minLength: 1 },
      internal: { type: 'boolean' },
      contract: { $ref: '#/$defs/componentContract' },
    },
    $defs: {
      componentContract: {
        type: 'object',
        additionalProperties: false,
        properties: {
          status: { enum: ['draft', 'stable'] },
          schemaVersion: { const: 'component-descriptor-v1' },
          dataSchema: { type: 'string' },
          capabilities: {
            type: 'array',
            items: { type: 'string', minLength: 1 },
            uniqueItems: true,
          },
          properties: {
            type: 'array',
            items: { $ref: '#/$defs/member' },
          },
          attributes: {
            type: 'array',
            items: { $ref: '#/$defs/member' },
          },
          methods: {
            type: 'array',
            items: { $ref: '#/$defs/member' },
          },
          events: {
            type: 'array',
            items: { $ref: '#/$defs/event' },
          },
          slots: {
            type: 'array',
            items: { $ref: '#/$defs/member' },
          },
          cssParts: {
            type: 'array',
            items: { $ref: '#/$defs/member' },
          },
          themeAliases: {
            type: 'array',
            items: { type: 'string', minLength: 1 },
            uniqueItems: true,
          },
          notes: { type: 'string' },
        },
      },
      member: {
        type: 'object',
        additionalProperties: false,
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1 },
          type: { type: 'string' },
          description: { type: 'string' },
          required: { type: 'boolean' },
          readonly: { type: 'boolean' },
        },
      },
      event: {
        type: 'object',
        additionalProperties: false,
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          detail: {
            type: 'array',
            items: { $ref: '#/$defs/member' },
          },
        },
      },
    },
  },
  'runtime-ui-v1': {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://rnd-pro.github.io/symbiote-node/schemas/runtime-ui-v1.json',
    title: 'Symbiote Node Runtime UI Tree',
    type: 'object',
    additionalProperties: false,
    required: ['version', 'root'],
    properties: {
      version: { const: 'runtime-ui-v1' },
      metadata: { type: 'object', additionalProperties: true },
      componentRegistries: {
        type: 'array',
        items: { $ref: '#/$defs/componentRegistry' },
        uniqueItems: true,
      },
      theme: { $ref: '#/$defs/themeRef' },
      root: { $ref: '#/$defs/node' },
    },
    $defs: {
      componentRegistry: {
        type: 'object',
        additionalProperties: true,
        required: ['id'],
        properties: {
          id: { type: 'string', minLength: 1 },
          provider: { type: 'string', minLength: 1 },
          schema: { type: 'string', minLength: 1 },
        },
      },
      themeRef: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          overrides: { type: 'object', additionalProperties: { type: 'string' } },
        },
      },
      node: {
        type: 'object',
        additionalProperties: false,
        required: ['component'],
        properties: {
          id: { type: 'string' },
          component: { type: 'string', minLength: 1 },
          componentRegistry: { type: 'string', minLength: 1 },
          props: { type: 'object', additionalProperties: true },
          attrs: { type: 'object', additionalProperties: { type: ['string', 'number', 'boolean'] } },
          layout: { $ref: '#/$defs/layout' },
          bindings: { type: 'object', additionalProperties: { type: 'string' } },
          events: { type: 'object', additionalProperties: { type: 'string' } },
          theme: { $ref: '#/$defs/themeRef' },
          children: {
            type: 'array',
            items: { $ref: '#/$defs/node' },
          },
        },
      },
      layout: {
        type: 'object',
        additionalProperties: false,
        properties: {
          direction: { enum: ['horizontal', 'vertical'] },
          weight: { type: 'number', minimum: 0 },
          rect: { $ref: '#/$defs/relativeRect' },
          area: { type: 'string', minLength: 1 },
        },
      },
      relativeRect: {
        type: 'object',
        additionalProperties: false,
        required: ['x', 'y', 'width', 'height'],
        properties: {
          x: { type: 'number', minimum: 0, maximum: 1 },
          y: { type: 'number', minimum: 0, maximum: 1 },
          width: { type: 'number', minimum: 0, maximum: 1 },
          height: { type: 'number', minimum: 0, maximum: 1 },
        },
      },
    },
  },
  'theme-rule-block-v1': {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://rnd-pro.github.io/symbiote-node/schemas/theme-rule-block-v1.json',
    title: 'Symbiote Node Theme Rule Block',
    type: 'object',
    additionalProperties: false,
    required: ['name', 'kind', 'description'],
    properties: {
      name: { type: 'string', minLength: 1 },
      theme: { type: 'string', minLength: 1 },
      kind: {
        enum: [
          'source-accent',
          'color-cascade',
          'geometry-cascade',
          'typography-cascade',
          'motion-effects',
          'semantic-alias',
          'component-alias',
        ],
      },
      description: { type: 'string', minLength: 1 },
      parameters: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'type', 'description'],
          properties: {
            name: { type: 'string', minLength: 1 },
            type: { type: 'string', minLength: 1 },
            description: { type: 'string', minLength: 1 },
            default: { type: 'string' },
            unit: { type: 'string' },
          },
        },
      },
      inputs: {
        type: 'array',
        items: { type: 'string', minLength: 1 },
        uniqueItems: true,
      },
      outputs: {
        type: 'array',
        items: { type: 'string', minLength: 1 },
        uniqueItems: true,
      },
      formula: { type: 'string' },
      derivations: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['output', 'expression'],
          properties: {
            output: { type: 'string', minLength: 1 },
            inputs: {
              type: 'array',
              items: { type: 'string', minLength: 1 },
              uniqueItems: true,
            },
            expression: { type: 'string', minLength: 1 },
            description: { type: 'string' },
          },
        },
      },
      appliesTo: {
        type: 'array',
        items: { type: 'string', minLength: 1 },
        uniqueItems: true,
      },
    },
  },
};

export function listUiSchemaVersions() {
  return UI_SCHEMA_VERSIONS.map((schema) => schema.version);
}

export function getUiSchema(version) {
  return UI_SCHEMAS[version];
}
