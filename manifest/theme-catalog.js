export let THEME_NAMES = [
  'default-dark',
  'dark',
  'light',
  'carbon',
  'pcb',
  'neon',
  'grey',
  'synthwave',
  'ebook',
];

export let TOKEN_FILES = [
  { name: 'base', path: 'tokens/base.json', kind: 'base' },
  ...THEME_NAMES.map((name) => ({
    name,
    path: `tokens/themes/${name}.json`,
    kind: 'theme',
    extends: 'tokens/base.json',
  })),
];

export let THEME_TOKENS = {
  'default-dark': {
    name: 'default-dark',
    extends: '../base.json',
    color: {
      background: { $type: 'color', $value: '#1a1a1a' },
      surface: { $type: 'color', $value: '#222222' },
      border: { $type: 'color', $value: 'rgba(255, 255, 255, 0.1)' },
      text: { $type: 'color', $value: '#f0f0f0' },
      textDim: { $type: 'color', $value: '#999999' },
      accent: { $type: 'color', $value: '#4c8bf5' },
      success: { $type: 'color', $value: '#4caf50' },
      warning: { $type: 'color', $value: '#ff9800' },
      danger: { $type: 'color', $value: '#f44336' },
      overlay: { $type: 'color', $value: 'rgba(0, 0, 0, 0.45)' },
    },
    component: {
      panelBackground: { $type: 'color', $value: '#222222' },
      layoutGapBackground: { $type: 'color', $value: 'transparent' },
      nodeHover: { $type: 'color', $value: '#444444' },
      accentBackground: { $type: 'color', $value: 'rgba(76, 139, 245, 0.12)' },
      accentBackgroundSubtle: { $type: 'color', $value: 'rgba(76, 139, 245, 0.06)' },
      accentBorder: { $type: 'color', $value: 'rgba(76, 139, 245, 0.2)' },
      successBorder: { $type: 'color', $value: 'rgba(76, 175, 80, 0.2)' },
      dangerBorder: { $type: 'color', $value: 'rgba(244, 67, 54, 0.2)' },
      dangerBackground: { $type: 'color', $value: 'rgba(244, 67, 54, 0.12)' },
    },
  },
  dark: {
    name: 'dark',
    extends: '../base.json',
    color: {
      background: { $type: 'color', $value: 'hsl(230, 30%, 12%)' },
      surface: { $type: 'color', $value: 'hsl(230, 30%, 18%)' },
      border: { $type: 'color', $value: 'hsl(230, 15%, 22%)' },
      text: { $type: 'color', $value: 'hsl(230, 15%, 89%)' },
      textDim: { $type: 'color', $value: 'hsl(230, 15%, 63%)' },
      accent: { $type: 'color', $value: 'hsl(215, 60%, 65%)' },
    },
  },
  light: {
    name: 'light',
    extends: '../base.json',
    color: {
      background: { $type: 'color', $value: 'hsl(220, 14%, 95%)' },
      surface: { $type: 'color', $value: 'hsl(0, 0%, 100%)' },
      border: { $type: 'color', $value: 'hsl(220, 8%, 78%)' },
      text: { $type: 'color', $value: 'hsl(220, 10%, 15%)' },
      textDim: { $type: 'color', $value: 'hsl(220, 8%, 45%)' },
      accent: { $type: 'color', $value: 'hsl(217, 60%, 50%)' },
    },
  },
  carbon: {
    name: 'carbon',
    extends: '../base.json',
    color: {
      background: { $type: 'color', $value: 'hsl(220, 13%, 9%)' },
      surface: { $type: 'color', $value: 'hsl(220, 13%, 14%)' },
      border: { $type: 'color', $value: 'hsl(220, 10%, 24%)' },
      text: { $type: 'color', $value: 'hsl(210, 16%, 92%)' },
      accent: { $type: 'color', $value: 'hsl(196, 100%, 55%)' },
    },
  },
  pcb: {
    name: 'pcb',
    extends: '../base.json',
    color: {
      background: { $type: 'color', $value: 'hsl(159, 82%, 9%)' },
      surface: { $type: 'color', $value: 'hsl(158, 66%, 13%)' },
      border: { $type: 'color', $value: 'hsl(45, 92%, 48%)' },
      text: { $type: 'color', $value: 'hsl(142, 42%, 88%)' },
      accent: { $type: 'color', $value: 'hsl(45, 92%, 58%)' },
    },
  },
  neon: {
    name: 'neon',
    extends: '../base.json',
    color: {
      background: { $type: 'color', $value: 'hsl(252, 45%, 8%)' },
      surface: { $type: 'color', $value: 'hsl(252, 42%, 13%)' },
      border: { $type: 'color', $value: 'hsl(286, 100%, 62%)' },
      text: { $type: 'color', $value: 'hsl(186, 100%, 88%)' },
      accent: { $type: 'color', $value: 'hsl(286, 100%, 62%)' },
    },
  },
  grey: {
    name: 'grey',
    extends: '../base.json',
    color: {
      background: { $type: 'color', $value: 'hsl(210, 8%, 12%)' },
      surface: { $type: 'color', $value: 'hsl(210, 7%, 18%)' },
      border: { $type: 'color', $value: 'hsl(210, 6%, 30%)' },
      text: { $type: 'color', $value: 'hsl(210, 8%, 88%)' },
      accent: { $type: 'color', $value: 'hsl(210, 16%, 64%)' },
    },
  },
  synthwave: {
    name: 'synthwave',
    extends: '../base.json',
    color: {
      background: { $type: 'color', $value: 'hsl(257, 48%, 10%)' },
      surface: { $type: 'color', $value: 'hsl(257, 44%, 16%)' },
      border: { $type: 'color', $value: 'hsl(326, 95%, 60%)' },
      text: { $type: 'color', $value: 'hsl(46, 100%, 86%)' },
      accent: { $type: 'color', $value: 'hsl(326, 95%, 60%)' },
    },
  },
  ebook: {
    name: 'ebook',
    extends: '../base.json',
    color: {
      background: { $type: 'color', $value: 'hsl(44, 52%, 94%)' },
      surface: { $type: 'color', $value: 'hsl(44, 48%, 98%)' },
      border: { $type: 'color', $value: 'hsl(38, 24%, 72%)' },
      text: { $type: 'color', $value: 'hsl(32, 24%, 20%)' },
      accent: { $type: 'color', $value: 'hsl(207, 48%, 42%)' },
    },
  },
};

export function listThemes() {
  return THEME_NAMES.map((name) => getTheme(name));
}

export function getTheme(name) {
  if (!THEME_NAMES.includes(name)) return undefined;
  return TOKEN_FILES.find((file) => file.name === name);
}

export function getThemeTokens(name) {
  return THEME_TOKENS[name];
}

export function listTokenFiles() {
  return [...TOKEN_FILES];
}

export function flattenTokens(tokenTree, prefix = '', out = {}) {
  for (let [key, value] of Object.entries(tokenTree || {})) {
    if (key.startsWith('$') || key === 'name' || key === 'extends') continue;
    let nextKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && '$value' in value) {
      out[nextKey] = value;
    } else if (value && typeof value === 'object') {
      flattenTokens(value, nextKey, out);
    }
  }
  return out;
}
