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

/**
 * setupPanelRouting — high-level panel routing setup
 *
 * Centralizes all routing logic for a panel:
 * - Panel activation (onActivate callback)
 * - List/detail switching via ROUTER/subpath
 * - Tab sync via ?tab= query param
 *
 * Convention:
 *   #panel               → list view, default tab
 *   #panel?tab=groups    → list view, groups tab
 *   #panel/{id}          → detail view
 *
 * Component requirements:
 *   - ref="listWrap"     → container for list view (hidden when detail)
 *   - <detail-component> → detail view element (hidden when list)
 *   - $.activeTab        → tab state property (if tabs configured)
 *
 * @param {import('@symbiotejs/symbiote').default} component
 * @param {string} panelName - Panel section ID (e.g. 'users')
 * @param {Object} config
 * @param {string[]} [config.tabs] - Tab names, first is default
 * @param {{ component: string, loadMethod: string }} [config.detail] - Detail view config
 * @param {Function} [config.onActivate] - Called when panel becomes active (list mode)
 * @param {Object} [config.syncParams] - Additional params to sync via syncWithRouter
 *
 * @example
 * renderCallback() {
 *   setupPanelRouting(this, 'users', {
 *     tabs: ['users', 'groups'],
 *     detail: { component: 'user-detail-view', loadMethod: 'loadUser' },
 *     onActivate: () => this.#loadData(),
 *   });
 * }
 */
export function setupPanelRouting(component, panelName, config = {}) {
  const { tabs, detail, onActivate, syncParams } = config;

  // --- Tab sync via ?tab= ---
  if (tabs && tabs.length > 0) {
    const defaultTab = tabs[0];
    syncWithRouter(component, panelName, {
      activeTab: { param: 'tab', default: defaultTab },
      ...(syncParams || {}),
    });
  } else if (syncParams) {
    syncWithRouter(component, panelName, syncParams);
  }

  /**
   * Check and apply list/detail mode based on ROUTER/subpath
   */
  function checkDetailMode() {
    if (component.$['ROUTER/panel'] !== panelName) return;

    const subpath = component.$['ROUTER/subpath'];
    const listWrap = component.ref?.listWrap;
    const isDetail = !!(detail && subpath);

    // Global signal — CSS can hide tabs/actions via [data-detail]
    component.toggleAttribute('data-detail', isDetail);

    if (isDetail) {
      // --- Detail mode ---
      if (listWrap) listWrap.hidden = true;

      const detailEl = component.querySelector(detail.component);
      if (detailEl) {
        detailEl.hidden = false;
        if (typeof detailEl[detail.loadMethod] === 'function') {
          detailEl[detail.loadMethod](subpath);
        }
      }
    } else {
      // --- List mode ---
      if (listWrap) listWrap.hidden = false;

      if (detail) {
        const detailEl = component.querySelector(detail.component);
        if (detailEl) detailEl.hidden = true;
      }

      if (onActivate) onActivate();
    }
  }

  // Subscribe to panel activation
  component.sub('ROUTER/panel', (panel) => {
    if (panel === panelName) {
      checkDetailMode();
    }
  });

  // Subscribe to subpath changes (list ↔ detail)
  if (detail) {
    component.sub('ROUTER/subpath', () => {
      if (component.$['ROUTER/panel'] === panelName) {
        checkDetailMode();
      }
    });
  }

  // Initial check if already on this panel
  if (component.$['ROUTER/panel'] === panelName) {
    checkDetailMode();
  }
}
