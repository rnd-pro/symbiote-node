/**
 * routerSync — bidirectional URL ↔ component state sync
 *
 * Maps URL query params to component init$ properties and vice versa.
 * Only syncs when the component's panel is active.
 *
 * Supports two mapping formats:
 *
 * Simple:  { componentProp: 'urlParam' }
 * Extended: { componentProp: { param: 'urlParam', default: 'all', type: 'number' } }
 *
 * @example
 * // Simple format:
 * syncWithRouter(this, 'jobs', {
 *   filterStatus: 'status',
 *   filterRegion: 'region',
 * });
 *
 * // Extended format:
 * syncWithRouter(this, 'jobs', {
 *   filterStatus: { param: 'status', default: 'all' },
 *   currentPage: { param: 'page', default: 1, type: 'number' },
 * });
 *
 * @module symbiote-node/layout/LayoutRouter/routerSync
 */
import { parseQuery, updateParams } from './LayoutRouter.js';

/**
 * Normalize mapping entry to { param, defaultVal, type }
 * @param {string | { param: string, default?: *, type?: string }} entry
 * @returns {{ param: string, defaultVal: *, type: string }}
 */
function normalizeMapping(entry) {
  if (typeof entry === 'string') {
    return { param: entry, defaultVal: undefined, type: 'string' };
  }
  return {
    param: entry.param,
    defaultVal: entry.default,
    type: entry.type ?? 'string',
  };
}

/**
 * Cast value to the target type
 * @param {string} value
 * @param {string} type
 * @returns {*}
 */
function castValue(value, type) {
  if (type === 'number') return Number(value);
  if (type === 'boolean') return value === 'true';
  return value;
}

/**
 * Sync component state with router URL params
 *
 * @param {import('@symbiotejs/symbiote').default} component - Symbiote component
 * @param {string} panelName - Panel this component belongs to
 * @param {Object<string, string | { param: string, default?: *, type?: string }>} mapping
 */
export function syncWithRouter(component, panelName, mapping) {
  let syncing = false;

  // Pre-normalize all mapping entries
  const normalizedMap = {};
  for (const [prop, entry] of Object.entries(mapping)) {
    normalizedMap[prop] = normalizeMapping(entry);
  }

  /**
   * Read URL params into component state
   */
  function readFromURL() {
    if (syncing) return;
    syncing = true;
    const query = parseQuery(component.$['ROUTER/query']);
    for (const [prop, { param, defaultVal, type }] of Object.entries(normalizedMap)) {
      const rawValue = query[param];
      if (rawValue !== undefined) {
        const val = castValue(rawValue, type);
        if (component.$[prop] !== val) {
          component.$[prop] = val;
        }
      } else if (defaultVal !== undefined) {
        // Apply default when param missing from URL
        if (component.$[prop] !== defaultVal) {
          component.$[prop] = defaultVal;
        }
      }
    }
    syncing = false;
  }

  /**
   * Write component state to URL params
   * @param {string} prop - Changed property name
   */
  function writeToURL(prop) {
    if (syncing) return;
    if (component.$['ROUTER/panel'] !== panelName) return;
    syncing = true;
    const { param, defaultVal } = normalizedMap[prop];
    const value = component.$[prop];
    // Skip writing default values to keep URL clean
    if (value === defaultVal) {
      updateParams({ [param]: '' });
    } else {
      updateParams({ [param]: String(value) });
    }
    syncing = false;
  }

  // Subscribe to route changes — read URL when this panel becomes active
  component.sub('ROUTER/panel', (panel) => {
    if (panel === panelName) {
      readFromURL();
    }
  });

  // Subscribe to query changes — update component when URL params change
  component.sub('ROUTER/query', () => {
    if (component.$['ROUTER/panel'] !== panelName) return;
    readFromURL();
  });

  // Subscribe to component property changes — write to URL
  for (const prop of Object.keys(normalizedMap)) {
    component.sub(prop, () => {
      if (component.$['ROUTER/panel'] === panelName) {
        writeToURL(prop);
      }
    });
  }

  // Initial read if already on this panel
  if (component.$['ROUTER/panel'] === panelName) {
    readFromURL();
  }
}
