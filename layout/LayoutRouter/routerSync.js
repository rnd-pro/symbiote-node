/**
 * routerSync — bidirectional URL ↔ component state sync
 *
 * Maps URL query params to component init$ properties and vice versa.
 * Only syncs when the component's section is active.
 *
 * @example
 * import { syncWithRouter } from 'symbiote-node/layout/LayoutRouter/routerSync.js';
 *
 * // In renderCallback:
 * syncWithRouter(this, 'jobs', {
 *   statusFilter: 'status',   // component prop → URL param
 *   regionFilter: 'region',
 *   page: 'page',
 * });
 *
 * @module symbiote-node/layout/LayoutRouter/routerSync
 */
import { parseQuery, updateParams } from './LayoutRouter.js';

/**
 * Sync component state with router URL params
 *
 * @param {import('@symbiotejs/symbiote').default} component - Symbiote component
 * @param {string} sectionName - Section this component belongs to
 * @param {Object<string, string>} mapping - { componentProp: urlParam }
 */
export function syncWithRouter(component, sectionName, mapping) {
  let syncing = false;

  /**
   * Read URL params into component state
   */
  function readFromURL() {
    if (syncing) return;
    syncing = true;
    const query = parseQuery(component.$['ROUTER/params']);
    for (const [prop, param] of Object.entries(mapping)) {
      if (query[param] !== undefined && component.$[prop] !== query[param]) {
        component.$[prop] = query[param];
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
    if (component.$['ROUTER/section'] !== sectionName) return;
    syncing = true;
    const param = mapping[prop];
    const value = component.$[prop];
    updateParams({ [param]: value });
    syncing = false;
  }

  // Subscribe to route changes — read URL when this section becomes active
  component.sub('ROUTER/section', (section) => {
    if (section === sectionName) {
      readFromURL();
    }
  });

  // Subscribe to params changes — update component when URL params change
  component.sub('ROUTER/params', () => {
    if (component.$['ROUTER/section'] !== sectionName) return;
    readFromURL();
  });

  // Subscribe to component property changes — write to URL
  for (const prop of Object.keys(mapping)) {
    component.sub(prop, () => {
      if (component.$['ROUTER/section'] === sectionName) {
        writeToURL(prop);
      }
    });
  }

  // Initial read if already on this section
  if (component.$['ROUTER/section'] === sectionName) {
    readFromURL();
  }
}
