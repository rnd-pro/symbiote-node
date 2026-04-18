/**
 * LayoutRouter — universal hash-based router for layout system
 *
 * Uses Symbiote PubSub named data context (ROUTER) to provide
 * reactive routing across the application.
 *
 * URL format: #panel/subpath?param1=value&param2=value
 *
 * Usage in templates: {{ROUTER/panel}}, {{ROUTER/subpath}}, {{ROUTER/query}}
 * Usage in code: this.$['ROUTER/panel'], this.sub('ROUTER/panel', cb)
 *
 * @module symbiote-node/layout/LayoutRouter
 */
import { PubSub } from '@symbiotejs/symbiote';

const CTX = 'ROUTER';

const routerCtx = PubSub.registerCtx({
  panel: 'default',
  subpath: '',
  query: '',
}, CTX);

/**
 * Parse query string into object
 * @param {string} str - Query string (without leading ?)
 * @returns {Object<string, string>}
 */
export function parseQuery(str) {
  if (!str) return {};
  const result = {};
  for (const pair of str.split('&')) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx >= 0) {
      result[decodeURIComponent(pair.substring(0, eqIdx))] = decodeURIComponent(pair.substring(eqIdx + 1));
    }
  }
  return result;
}

/**
 * Build query string from key-value object
 * @param {Object<string, string>} params
 * @returns {string}
 */
export function buildQuery(params) {
  const entries = Object.entries(params).filter(([, v]) => v !== '' && v != null);
  if (entries.length === 0) return '';
  return entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
}

/**
 * Build full hash string from parts
 * @param {string} panel
 * @param {string} [subpath]
 * @param {Object} [params]
 * @returns {string}
 */
export function buildHash(panel, subpath, params) {
  let hash = panel;
  if (subpath) hash += '/' + subpath;
  const q = params ? buildQuery(params) : '';
  if (q) hash += '?' + q;
  return hash;
}

/**
 * Navigate to a new route — updates URL and PubSub context
 * @param {string} panel - Master panel section ID
 * @param {string} [subpath] - Sub-path (entity ID, etc.)
 * @param {Object} [params] - Query parameters
 */
export function navigate(panel, subpath = '', params = {}) {
  if (typeof location === 'undefined') return;
  const hash = buildHash(panel, subpath, params);
  // Use pushState instead of location.hash to ensure clean URL
  // (location.hash preserves stale query strings like ?monitoring)
  history.pushState(null, '', location.pathname + '#' + hash);
  syncFromHash();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('hashchange'));
  }
}

/**
 * Update only query params of current route (keeps panel/subpath)
 * Uses replaceState to avoid cluttering browser history
 * @param {Object} params - Params to merge
 */
export function updateParams(params) {
  if (typeof location === 'undefined') return;
  const currentQuery = parseQuery(routerCtx.read('query'));
  const merged = { ...currentQuery };
  for (const [k, v] of Object.entries(params)) {
    if (v === '' || v == null) {
      delete merged[k];
    } else {
      merged[k] = v;
    }
  }
  const query = buildQuery(merged);
  const hash = buildHash(routerCtx.read('panel'), routerCtx.read('subpath'), merged);
  history.replaceState(null, '', '#' + hash);
  routerCtx.pub('query', query);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('hashchange'));
  }
}

/**
 * Sync PubSub context from current URL hash
 */
function syncFromHash() {
  const raw = location.hash.replace(/^#/, '') || 'default';

  const qIdx = raw.indexOf('?');
  const pathPart = qIdx >= 0 ? raw.substring(0, qIdx) : raw;
  const queryPart = qIdx >= 0 ? raw.substring(qIdx + 1) : '';

  const slashIdx = pathPart.indexOf('/');
  const panel = slashIdx >= 0 ? pathPart.substring(0, slashIdx) : pathPart;
  const subpath = slashIdx >= 0 ? pathPart.substring(slashIdx + 1) : '';

  routerCtx.pub('panel', panel);
  routerCtx.pub('subpath', subpath);
  routerCtx.pub('query', queryPart);
}

/**
 * Get current route state
 * @returns {{ panel: string, subpath: string, query: string }}
 */
export function getRoute() {
  return {
    panel: routerCtx.read('panel'),
    subpath: routerCtx.read('subpath'),
    query: routerCtx.read('query'),
  };
}

/**
 * Set default panel (first section to show if hash is empty)
 * @param {string} panel
 */
export function setDefaultPanel(panel) {
  if (typeof location === 'undefined') return;
  if (!location.hash || location.hash === '#') {
    navigate(panel);
  }
}

// Initial sync + listen to hashchange (browser-only)
if (typeof location !== 'undefined' && typeof window !== 'undefined') {
  syncFromHash();
  window.addEventListener('hashchange', syncFromHash);
}
