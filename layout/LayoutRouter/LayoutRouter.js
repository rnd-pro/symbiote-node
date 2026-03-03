/**
 * LayoutRouter — universal hash-based router for layout system
 *
 * Uses Symbiote PubSub named data context (ROUTER) to provide
 * reactive routing across the application.
 *
 * URL format: #section/path?param1=value&param2=value
 *
 * Usage in templates: {{ROUTER/section}}, {{ROUTER/path}}
 * Usage in code: this.$['ROUTER/section'], this.sub('ROUTER/section', cb)
 *
 * @module symbiote-node/layout/LayoutRouter
 */
import { PubSub } from '@symbiotejs/symbiote';

const CTX = 'ROUTER';

const routerCtx = PubSub.registerCtx({
  section: 'default',
  path: '',
  params: '',
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
    const [key, val] = pair.split('=');
    if (key) result[decodeURIComponent(key)] = decodeURIComponent(val ?? '');
  }
  return result;
}

/**
 * Build full hash string from parts
 * @param {string} section
 * @param {string} [path]
 * @param {Object} [params]
 * @returns {string}
 */
export function buildHash(section, path, params) {
  let hash = section;
  if (path) hash += '/' + path;
  const q = params
    ? Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&')
    : '';
  if (q) hash += '?' + q;
  return hash;
}

/**
 * Navigate to a new route — updates URL and PubSub context
 * @param {string} section - Master panel section ID
 * @param {string} [path] - Sub-path (entity ID, etc.)
 * @param {Object} [params] - Query parameters
 */
export function navigate(section, path, params) {
  const hash = buildHash(section, path, params);
  location.hash = hash;
  // hashchange will trigger syncFromHash
}

/**
 * Update only query params of current route (keeps section/path)
 * @param {Object} params - Params to merge
 */
export function updateParams(params) {
  const currentQuery = parseQuery(routerCtx.read('params'));
  const merged = { ...currentQuery, ...params };
  // Remove empty values
  for (const [k, v] of Object.entries(merged)) {
    if (v === '' || v === undefined || v === null) delete merged[k];
  }
  const query = Object.entries(merged)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  const hash = buildHash(routerCtx.read('section'), routerCtx.read('path'), merged);
  history.replaceState(null, '', '#' + hash);
  routerCtx.pub('params', query);
}

/**
 * Sync PubSub context from current URL hash
 */
function syncFromHash() {
  const raw = location.hash.replace(/^#/, '') || 'default';
  const [pathPart, queryPart = ''] = raw.split('?');
  const segments = pathPart.split('/');
  const section = segments[0] || 'default';
  const path = segments.slice(1).join('/');

  routerCtx.pub('section', section);
  routerCtx.pub('path', path);
  routerCtx.pub('params', queryPart);
}

/**
 * Get current route state
 * @returns {{ section: string, path: string, params: string }}
 */
export function getRoute() {
  return {
    section: routerCtx.read('section'),
    path: routerCtx.read('path'),
    params: routerCtx.read('params'),
  };
}

/**
 * Set default section (first section to show if hash is empty)
 * @param {string} section
 */
export function setDefaultSection(section) {
  if (!location.hash || location.hash === '#') {
    navigate(section);
  }
}

// Initial sync + listen to hashchange
syncFromHash();
window.addEventListener('hashchange', syncFromHash);
