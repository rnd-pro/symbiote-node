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

export let THEME_RULE_BLOCKS = [
  {
    name: 'default-dark-source-accents',
    kind: 'source-accent',
    description: 'Minimal human or agent-selected inputs for the default dark provider theme.',
    inputs: ['accent.primary', 'accent.success', 'accent.warning', 'accent.danger', 'neutral.background'],
    outputs: ['color.accent', 'color.success', 'color.warning', 'color.danger', 'color.background'],
    formula: 'Source accents define the stable roots used by color, semantic, and component aliases.',
  },
  {
    name: 'default-dark-color-cascade',
    kind: 'color-cascade',
    description: 'Derives surfaces, text, borders, overlays, hover, and selected states from source accents.',
    inputs: ['color.background', 'color.surface', 'color.accent'],
    outputs: [
      'color.text',
      'color.textDim',
      'color.border',
      'color.overlay',
      'component.accentBackground',
      'component.accentBackgroundSubtle',
      'component.accentBorder',
    ],
    formula: 'Surface and state colors are derived as transparent mixes over the background and accent roots.',
  },
  {
    name: 'default-dark-geometry-cascade',
    kind: 'geometry-cascade',
    description: 'Derives density, panel gaps, row heights, radii, and control sizes from one spacing scale.',
    inputs: ['size.grid', 'density.scale'],
    outputs: [
      'component.layoutGapBackground',
      'component.treeRowHeight',
      'component.composerInputMinHeight',
      'radius.node',
      'radius.control',
    ],
    formula: 'Spacing values are multiples of the base grid; radii and control sizes follow density scale.',
  },
  {
    name: 'default-dark-typography-cascade',
    kind: 'typography-cascade',
    description: 'Defines compact application typography for panels, lists, chat, and code surfaces.',
    inputs: ['font.family', 'font.scale'],
    outputs: ['font.body', 'font.label', 'font.caption', 'font.code'],
    formula: 'Typography sizes use a compact fixed scale suitable for repeated operational UI work.',
  },
  {
    name: 'default-dark-motion-effects',
    kind: 'motion-effects',
    description: 'Defines transition and shadow aliases for hover, active, focus, drag, and loading states.',
    inputs: ['motion.duration.fast', 'motion.easing.standard', 'shadow.node'],
    outputs: ['effect.hoverTransition', 'effect.focusRing', 'effect.dragShadow', 'effect.loadingPulse'],
    formula: 'Interactive effects reuse fast duration and a single focus/accent ring family.',
  },
  {
    name: 'default-dark-semantic-aliases',
    kind: 'semantic-alias',
    description: 'Maps cascade outputs to semantic application aliases without component ownership.',
    inputs: ['color.*', 'size.*', 'radius.*', 'shadow.*', 'font.*'],
    outputs: ['--sn-bg', '--sn-panel-bg', '--sn-node-bg', '--sn-node-border', '--sn-text', '--sn-text-dim'],
    formula: 'Semantic aliases are CSS custom properties consumed through normal cascade inheritance.',
  },
  {
    name: 'default-dark-component-aliases',
    kind: 'component-alias',
    description: 'Maps semantic theme aliases to reusable Symbiote Node component surfaces.',
    inputs: ['--sn-*'],
    outputs: [
      '--sn-layout-gap-bg',
      '--sn-layout-border',
      '--sn-tree-row-height',
      '--sn-tree-row-selected-bg',
      '--sn-composer-bg',
      '--sn-chat-message-bg',
      '--sn-tabs-active-bg',
      '--sn-source-header-bg',
      '--sn-source-editor-bg',
      '--sn-list-item-active-bg',
    ],
    appliesTo: ['panel-layout', 'sn-tree-view', 'chat-composer', 'chat-transcript', 'project-tabs', 'source-viewer', 'source-editor', 'sn-list-item', 'sn-loading-overlay'],
    formula: 'Component aliases bridge design tokens to component CSS without product-level style patches.',
  },
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
      layoutBorder: { $type: 'color', $value: 'transparent' },
      layoutResizerBackground: { $type: 'color', $value: 'transparent' },
      layoutResizerHoverBackground: { $type: 'color', $value: 'rgba(255, 255, 255, 0.08)' },
      nodeHover: { $type: 'color', $value: '#444444' },
      accentBackground: { $type: 'color', $value: 'rgba(76, 139, 245, 0.12)' },
      accentBackgroundSubtle: { $type: 'color', $value: 'rgba(76, 139, 245, 0.06)' },
      accentBorder: { $type: 'color', $value: 'rgba(76, 139, 245, 0.2)' },
      successBorder: { $type: 'color', $value: 'rgba(76, 175, 80, 0.2)' },
      dangerBorder: { $type: 'color', $value: 'rgba(244, 67, 54, 0.2)' },
      dangerBackground: { $type: 'color', $value: 'rgba(244, 67, 54, 0.12)' },
      scrollbarThumb: { $type: 'color', $value: 'rgba(255, 255, 255, 0.08)' },
      scrollbarThumbHover: { $type: 'color', $value: 'rgba(255, 255, 255, 0.25)' },
    },
    geometry: {
      layoutResizerSize: { $type: 'dimension', $value: '6px' },
      treeGap: { $type: 'dimension', $value: '4px' },
      treeIndent: { $type: 'dimension', $value: '16px' },
      treeRowHeight: { $type: 'dimension', $value: '22px' },
      treeRowPaddingBlock: { $type: 'dimension', $value: '2px' },
      treeRowRadius: { $type: 'dimension', $value: '4px' },
      treeIconSize: { $type: 'dimension', $value: '15px' },
      treeBadgeRadius: { $type: 'dimension', $value: '8px' },
      listItemRadius: { $type: 'dimension', $value: '4px' },
      listItemGap: { $type: 'dimension', $value: '10px' },
      listItemMinHeight: { $type: 'dimension', $value: '34px' },
      tabsHeight: { $type: 'dimension', $value: '38px' },
      tabsItemHeight: { $type: 'dimension', $value: '32px' },
      composerRadius: { $type: 'dimension', $value: '20px' },
      composerControlGap: { $type: 'dimension', $value: '8px' },
      composerInputMinHeight: { $type: 'dimension', $value: '20px' },
      chatGap: { $type: 'dimension', $value: '8px' },
      sourceActionRadius: { $type: 'dimension', $value: '4px' },
      sourceEditorFontSize: { $type: 'dimension', $value: '12px' },
      loadingOverlayGap: { $type: 'dimension', $value: '16px' },
      loadingTrackRadius: { $type: 'dimension', $value: '2px' },
    },
    typography: {
      fontUi: { $type: 'fontFamily', $value: 'var(--sn-font)' },
      fontMono: { $type: 'fontFamily', $value: "'JetBrains Mono', 'Fira Code', monospace" },
      iconFont: { $type: 'fontFamily', $value: "'Material Symbols Outlined'" },
      treeLabelSize: { $type: 'dimension', $value: '12px' },
      treeBadgeSize: { $type: 'dimension', $value: '10px' },
      listItemLabelSize: { $type: 'dimension', $value: '12px' },
      listItemDescriptionSize: { $type: 'dimension', $value: '11px' },
      listItemMetaSize: { $type: 'dimension', $value: '10px' },
    },
    alias: {
      layoutGapBackground: { $type: 'color', $value: 'var(--sn-layout-gap-bg)' },
      layoutBorder: { $type: 'color', $value: 'var(--sn-layout-border)' },
      treeRowSelectedBackground: { $type: 'color', $value: 'var(--sn-accent-bg-subtle)' },
      treeRowSelectedBorder: { $type: 'color', $value: 'transparent' },
      listItemActiveBackground: { $type: 'color', $value: 'var(--sn-accent-bg-subtle)' },
      composerBackground: { $type: 'color', $value: 'var(--sn-node-bg)' },
      composerActionBackground: { $type: 'color', $value: 'var(--sn-node-hover)' },
      tabsBackground: { $type: 'color', $value: 'transparent' },
      tabsActiveBackground: { $type: 'color', $value: 'var(--sn-node-bg)' },
      sourceBackground: { $type: 'color', $value: 'var(--sn-bg)' },
      sourceHeaderBackground: { $type: 'color', $value: 'var(--sn-node-header-bg)' },
      sourceEditorBackground: { $type: 'color', $value: 'var(--sn-bg)' },
      loadingBackground: { $type: 'color', $value: 'var(--sn-bg)' },
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

export function listThemeRuleBlocks(filter = {}) {
  return THEME_RULE_BLOCKS.filter((block) => {
    for (let [key, value] of Object.entries(filter)) {
      if (block[key] !== value) return false;
    }
    return true;
  });
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
