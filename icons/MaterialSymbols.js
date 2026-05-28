const MATERIAL_SYMBOLS_BASE_URL =
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200';

const ICON_NAME_RE = /^[a-z0-9_]+$/;

/** @type {Set<string>} */
const loadedIcons = new Set();

const LINK_SELECTOR = 'link[data-sn-material-symbols="managed"]';

/** @type {{ autoload: boolean, hrefBuilder: ((iconNames: string[]) => string)|null }} */
const config = {
  autoload: true,
  hrefBuilder: null,
};

/**
 * Configure Material Symbols loading for host apps with strict CSP, privacy,
 * or self-hosted font requirements.
 * @param {{ autoload?: boolean, hrefBuilder?: ((iconNames: string[]) => string)|null }} options
 */
export function configureMaterialSymbols(options = {}) {
  if (typeof options.autoload === 'boolean') config.autoload = options.autoload;
  if ('hrefBuilder' in options) config.hrefBuilder = options.hrefBuilder || null;
}

/**
 * Ensure Material Symbols ligatures used by built-in UI are available.
 * Host pages may load a narrow `icon_names` subset, so components that own
 * fixed icons must add their own subset instead of relying on page-level lists.
 * @param {string[]} iconNames
 */
export function ensureMaterialSymbols(iconNames) {
  if (!config.autoload || !isBrowserDocument()) return;

  const names = [...new Set(iconNames.filter((name) => typeof name === 'string' && ICON_NAME_RE.test(name)))].sort();
  if (names.length === 0) return;

  let changed = false;
  for (const name of names) {
    if (loadedIcons.has(name)) continue;
    loadedIcons.add(name);
    changed = true;
  }
  if (!changed) return;

  const iconList = [...loadedIcons].sort();
  const href = config.hrefBuilder
    ? config.hrefBuilder(iconList)
    : `${MATERIAL_SYMBOLS_BASE_URL}&icon_names=${iconList.map(encodeURIComponent).join(',')}`;
  if (!href) return;

  let link = document.querySelector(LINK_SELECTOR);
  if (!link) {
    link = document.createElement('link');
    link.rel = 'stylesheet';
    link.dataset.snMaterialSymbols = 'managed';
    document.head.append(link);
  }
  link.href = href;
  link.dataset.snMaterialSymbolsIcons = iconList.join(',');
}

function isBrowserDocument() {
  return typeof document !== 'undefined'
    && typeof window !== 'undefined'
    && document.nodeType === 9
    && !!document.head;
}
