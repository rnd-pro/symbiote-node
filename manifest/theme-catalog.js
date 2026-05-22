import { DEFAULT_DARK } from '../themes/default-dark.js';

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

const RUNTIME_THEMES = {
  'default-dark': DEFAULT_DARK,
};

const CSS_TOKEN_CLASSIFIERS = [
  { kind: 'source-control', group: 'control', pattern: /^--sn-theme-/ },
  { kind: 'source-accent', group: 'color', pattern: /^--sn-hue-/ },
  { kind: 'color-cascade', group: 'color', pattern: /^--sn-(sat($|-)|lit-|alpha-)/ },
  { kind: 'color-cascade', group: 'accent', pattern: /^--sn-accent-/ },
  { kind: 'semantic-alias', group: 'surface', pattern: /^--sn-(bg|panel-bg|node-bg|node-border|node-selected|node-accent|node-hover|node-header-bg|node-radius|node-shadow|text|text-dim|bg-overlay|shadow-color)$/ },
  { kind: 'semantic-alias', group: 'status', pattern: /^--sn-(success|warning|danger|cat|subgraph)-/ },
  { kind: 'component-alias', group: 'layout', pattern: /^--sn-layout-/ },
  { kind: 'component-alias', group: 'surface', pattern: /^--sn-card-/ },
  { kind: 'component-alias', group: 'control', pattern: /^--sn-(button|field)-/ },
  { kind: 'component-alias', group: 'status', pattern: /^--sn-(badge|banner|empty-state)-/ },
  { kind: 'component-alias', group: 'navigation-row', pattern: /^--sn-(tree|list-item)-/ },
  { kind: 'component-alias', group: 'chat', pattern: /^--sn-(composer|chat)-/ },
  { kind: 'component-alias', group: 'tabs', pattern: /^--sn-tabs-/ },
  { kind: 'component-alias', group: 'source', pattern: /^--sn-(source|editor)-/ },
  { kind: 'component-alias', group: 'loading', pattern: /^--sn-loading-/ },
  { kind: 'component-alias', group: 'graph', pattern: /^--sn-(socket|conn|grid|shape)-/ },
  { kind: 'component-alias', group: 'context-menu', pattern: /^--sn-ctx-/ },
  { kind: 'component-alias', group: 'toolbar', pattern: /^--sn-toolbar-/ },
  { kind: 'component-alias', group: 'comment', pattern: /^--sn-comment-/ },
  { kind: 'component-alias', group: 'frame', pattern: /^--sn-frame-/ },
  { kind: 'typography-cascade', group: 'typography', pattern: /^--sn-(font|icon-font)/ },
  { kind: 'motion-effects', group: 'effect', pattern: /^--sn-effect-/ },
  { kind: 'motion-effects', group: 'scrollbar', pattern: /^--sn-scrollbar-/ },
  { kind: 'host-bridge-alias', group: 'host-bridge', pattern: /^--(bg-level-2|border-color|text-color|text-color-muted)$/ },
];

function copyData(value) {
  return JSON.parse(JSON.stringify(value));
}

function classifyCssToken(cssVar) {
  let classifier = CSS_TOKEN_CLASSIFIERS.find((item) => item.pattern.test(cssVar));
  if (!classifier) {
    return { kind: 'unclassified', group: 'unknown' };
  }
  return { kind: classifier.kind, group: classifier.group };
}

export let THEME_CONTROLS = {
  'default-dark': [
    { name: 'hue', type: 'number', default: '218', cssVar: '--sn-theme-hue', description: 'Primary accent hue in native CSS HSL space.' },
    { name: 'chroma', type: 'percentage', default: '89%', cssVar: '--sn-theme-chroma', description: 'Primary accent saturation/chroma used by selected, focus, and loading states.' },
    { name: 'backgroundLightness', type: 'percentage', default: '10%', cssVar: '--sn-theme-bg-lightness', description: 'Root surface lightness; can move the preset between darker and lighter modes.' },
    { name: 'surfaceLightness', type: 'percentage', default: '13%', cssVar: '--sn-theme-surface-lightness', description: 'Panel and control surface lightness derived near the background.' },
    { name: 'textLightness', type: 'percentage', default: '94%', cssVar: '--sn-theme-text-lightness', description: 'Foreground text lightness inherited by text aliases.' },
    { name: 'density', type: 'number', default: '1', cssVar: '--sn-theme-density', description: 'Density multiplier for repeated navigation row height.' },
    { name: 'radius', type: 'number', default: '1', cssVar: '--sn-theme-radius-scale', description: 'Radius multiplier for node, row, list, composer, and source action corners.' },
    { name: 'motion', type: 'number', default: '1', cssVar: '--sn-theme-motion-scale', description: 'Global motion multiplier for transitions and feedback effects.' },
    { name: 'elevation', type: 'number', default: '1', cssVar: '--sn-theme-elevation-scale', description: 'Global shadow and overlay intensity multiplier.' },
  ],
};

export let THEME_ELEMENT_GROUPS = [
  {
    name: 'panel',
    description: 'Framed layout surfaces such as sidebars, graph panels, source panes, and dialogs.',
    tokens: ['--sn-panel-bg', '--sn-card-bg', '--sn-card-border', '--sn-card-radius', '--sn-card-padding', '--sn-node-border', '--sn-node-shadow', '--sn-node-radius'],
    usedBy: ['panel-layout', 'sn-card', 'source-viewer', 'source-editor', 'chat-transcript', 'sn-loading-overlay'],
  },
  {
    name: 'control',
    description: 'Interactive controls including buttons, icon buttons, toolbar actions, labels, inputs, selects, and textareas.',
    tokens: ['--sn-button-bg', '--sn-button-border', '--sn-button-color', '--sn-button-hover-border', '--sn-button-primary-bg', '--sn-button-danger-color', '--sn-field-control-bg', '--sn-field-control-border', '--sn-field-label-color', '--sn-field-control-focus-border', '--sn-toolbar-bg', '--sn-toolbar-border', '--sn-toolbar-color', '--sn-toolbar-hover', '--sn-effect-hover-transition', '--sn-effect-focus-ring'],
    usedBy: ['sn-button', 'sn-field', 'project-tabs', 'source-viewer', 'chat-composer'],
  },
  {
    name: 'row',
    description: 'Reusable list/tree/navigation rows with hover, active, selected, and focus states.',
    tokens: ['--sn-tree-row-height', '--sn-tree-panel-row-min-height', '--sn-tree-row-hover-bg', '--sn-tree-row-selected-bg', '--sn-list-item-hover-bg', '--sn-list-item-active-bg'],
    usedBy: ['sn-tree-view', 'sn-tree-panel', 'sn-list-item', 'chat-list-item', 'chat-sidebar-item'],
  },
  {
    name: 'input',
    description: 'Text entry, code entry, composer, and textarea surfaces.',
    tokens: ['--sn-composer-bg', '--sn-source-editor-bg', '--sn-editor-border', '--sn-editor-font', '--sn-effect-focus-ring'],
    usedBy: ['chat-composer', 'source-editor'],
  },
  {
    name: 'code-surface',
    description: 'Read-only and editable source/code surfaces.',
    tokens: ['--sn-source-bg', '--sn-source-header-bg', '--sn-source-border', '--sn-source-editor-bg', '--sn-source-editor-color'],
    usedBy: ['source-viewer', 'source-editor'],
  },
  {
    name: 'status',
    description: 'Badges, loading, success, warning, danger, and transient status feedback.',
    tokens: ['--sn-success-color', '--sn-warning-color', '--sn-danger-color', '--sn-badge-bg', '--sn-badge-border', '--sn-badge-color', '--sn-banner-bg', '--sn-banner-border', '--sn-banner-color', '--sn-empty-state-color', '--sn-loading-bar-bg', '--sn-effect-loading-pulse'],
    usedBy: ['sn-loading-overlay', 'chat-transcript', 'chat-composer'],
  },
  {
    name: 'graph',
    description: 'Graph nodes, edges, clusters, pins, sockets, and graph canvas feedback.',
    tokens: ['--sn-node-bg', '--sn-node-border', '--sn-node-selected', '--sn-conn-color', '--sn-cat-server', '--sn-cat-control', '--sn-cat-data'],
    usedBy: ['node-canvas', 'canvas-graph', 'graph-explorer-shell'],
  },
  {
    name: 'tab',
    description: 'Project and document tabs with active, hover, divider, and close affordances.',
    tokens: ['--sn-tabs-bg', '--sn-tabs-border', '--sn-tabs-active-bg', '--sn-tabs-hover-bg', '--sn-tabs-radius'],
    usedBy: ['project-tabs'],
  },
];

export let THEME_RULE_BLOCKS = [
  {
    name: 'default-dark-source-accents',
    theme: 'default-dark',
    kind: 'source-accent',
    description: 'Minimal human or agent-selected inputs for the default provider theme.',
    parameters: [
      { name: 'hue', type: 'number', default: '218', description: 'Native CSS HSL hue for primary accent and derived state colors.' },
      { name: 'chroma', type: 'percentage', default: '89%', description: 'Native CSS HSL saturation/chroma for accent-derived colors.' },
      { name: 'backgroundLightness', type: 'percentage', default: '10%', description: 'Root surface lightness, adjustable from darker to lighter modes.' },
      { name: 'surfaceLightness', type: 'percentage', default: '13%', description: 'Panel and control surface lightness near the root background.' },
      { name: 'textLightness', type: 'percentage', default: '94%', description: 'Primary foreground lightness for contrast tuning.' },
      { name: 'density', type: 'number', default: '1', description: 'User density modifier for repeated operational surfaces.' },
    ],
    inputs: ['hue', 'chroma', 'backgroundLightness', 'surfaceLightness', 'textLightness', 'density'],
    outputs: ['color.accent', 'color.success', 'color.warning', 'color.danger', 'color.background'],
    formula: 'Source accents define the stable roots used by color, semantic, and component aliases.',
    derivations: [
      { output: 'color.background', inputs: ['backgroundLightness'], expression: 'hsl(0 0% backgroundLightness)', description: 'The page and root app background derive from the neutral lightness control.' },
      { output: 'color.surface', inputs: ['surfaceLightness'], expression: 'hsl(0 0% surfaceLightness)', description: 'Panel surfaces derive from the surface lightness control.' },
      { output: 'color.accent', inputs: ['hue', 'chroma'], expression: 'hsl(hue chroma 63%)', description: 'The primary accent is native CSS HSL so agents can shift hue and chroma at runtime.' },
    ],
  },
  {
    name: 'default-dark-color-cascade',
    theme: 'default-dark',
    kind: 'color-cascade',
    description: 'Derives surfaces, text, borders, overlays, hover, and selected states from source accents.',
    parameters: [
      { name: 'surface.step', type: 'color-mix', default: '+8% luminance over background', description: 'Panel surface offset from the root background.' },
      { name: 'border.alpha', type: 'alpha', default: '0.1', description: 'Subtle divider contrast for dense dark UI.' },
      { name: 'accent.alpha', type: 'alpha', default: '0.06|0.12|0.2', description: 'Subtle, normal, and border accent opacities.' },
    ],
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
    derivations: [
      { output: 'color.text', inputs: ['color.background'], expression: 'contrastText(color.background, 0.92)', description: 'Primary text keeps high contrast over the root background.' },
      { output: 'color.border', inputs: ['color.text'], expression: 'rgba(color.text, 0.1)', description: 'Borders are text-tinted dividers, not independent colors.' },
      { output: 'component.accentBackgroundSubtle', inputs: ['color.accent'], expression: 'rgba(color.accent, 0.06)', description: 'Selected rows and active list items reuse the same subtle accent wash.' },
      { output: 'component.accentBackground', inputs: ['color.accent'], expression: 'rgba(color.accent, 0.12)', description: 'Stronger accent surfaces use the same accent at doubled opacity.' },
      { output: 'component.accentBorder', inputs: ['color.accent'], expression: 'rgba(color.accent, 0.2)', description: 'Accent borders are a higher-opacity form of the primary accent.' },
    ],
  },
  {
    name: 'default-dark-geometry-cascade',
    theme: 'default-dark',
    kind: 'geometry-cascade',
    description: 'Derives density, panel gaps, row heights, radii, and control sizes from one spacing scale.',
    parameters: [
      { name: 'size.unit', type: 'dimension', default: '4px', unit: 'px', description: 'Smallest visual spacing unit.' },
      { name: 'density.compactRow', type: 'dimension', default: '22px', unit: 'px', description: 'Default tree row height for dense project navigation.' },
      { name: 'radius.unit', type: 'dimension', default: '4px', unit: 'px', description: 'Base radius used by rows, source actions, and list items.' },
    ],
    inputs: ['size.grid', 'density.scale'],
    outputs: [
      'component.layoutGapBackground',
      'geometry.treeRowHeight',
      'geometry.composerInputMinHeight',
      'radius.node',
      'radius.control',
    ],
    formula: 'Spacing values are multiples of the base grid; radii and control sizes follow density scale.',
    derivations: [
      { output: 'geometry.treeGap', inputs: ['size.unit'], expression: 'size.unit', description: 'Tree vertical rhythm starts at the base spacing unit.' },
      { output: 'geometry.treeIndent', inputs: ['size.unit'], expression: 'size.unit * 4', description: 'Nested tree levels indent by four spacing units.' },
      { output: 'geometry.treeRowHeight', inputs: ['size.unit', 'density.scale'], expression: 'size.unit * 5.5 when density.scale = compact', description: 'Compact navigation rows stay scan-friendly without wasting vertical space.' },
      { output: 'geometry.tabsHeight', inputs: ['size.unit'], expression: 'size.unit * 9.5', description: 'Project tabs keep enough height for icon, label, and close affordance.' },
      { output: 'geometry.composerRadius', inputs: ['radius.unit'], expression: 'radius.unit * 5', description: 'The main chat input uses a pill radius derived from the same radius unit.' },
    ],
  },
  {
    name: 'default-dark-typography-cascade',
    theme: 'default-dark',
    kind: 'typography-cascade',
    description: 'Defines compact application typography for panels, lists, chat, and code surfaces.',
    parameters: [
      { name: 'font.family', type: 'fontFamily', default: 'Inter, system-ui', description: 'Primary application UI font stack.' },
      { name: 'font.mono', type: 'fontFamily', default: 'JetBrains Mono, Fira Code, monospace', description: 'Code and source display font stack.' },
      { name: 'font.bodySize', type: 'dimension', default: '12px', unit: 'px', description: 'Dense body text size for operational panels.' },
    ],
    inputs: ['font.family', 'font.scale'],
    outputs: ['typography.treeLabelSize', 'typography.listItemDescriptionSize', 'typography.listItemMetaSize', 'typography.iconFont'],
    formula: 'Typography sizes use a compact fixed scale suitable for repeated operational UI work.',
    derivations: [
      { output: 'typography.treeLabelSize', inputs: ['font.bodySize'], expression: 'font.bodySize', description: 'Tree labels inherit the dense body size.' },
      { output: 'typography.listItemDescriptionSize', inputs: ['font.bodySize'], expression: 'font.bodySize - 1px', description: 'Secondary descriptions step down one pixel from body text.' },
      { output: 'typography.listItemMetaSize', inputs: ['font.bodySize'], expression: 'font.bodySize - 2px', description: 'Metadata text is two pixels below body text.' },
      { output: 'typography.iconFont', inputs: ['font.icon'], expression: 'Material Symbols Outlined', description: 'Icon buttons use the shared Material Symbols font family.' },
    ],
  },
  {
    name: 'default-dark-motion-effects',
    theme: 'default-dark',
    kind: 'motion-effects',
    description: 'Defines transition and shadow aliases for hover, active, focus, drag, and loading states.',
    parameters: [
      { name: 'motion.duration.fast', type: 'time', default: '120ms', description: 'Fast hover/focus response duration.' },
      { name: 'motion.easing.standard', type: 'easing', default: 'ease', description: 'Default easing for small UI state changes.' },
      { name: 'focus.alpha', type: 'alpha', default: '0.35', description: 'Focus ring strength derived from the primary accent.' },
    ],
    inputs: ['motion.duration.fast', 'motion.easing.standard', 'shadow.node'],
    outputs: ['effect.hoverTransition', 'effect.focusRing', 'effect.dragShadow', 'effect.loadingPulse'],
    formula: 'Interactive effects reuse fast duration and a single focus/accent ring family.',
    derivations: [
      { output: 'effect.hoverTransition', inputs: ['motion.duration.fast', 'motion.easing.standard'], expression: 'background-color duration.fast easing.standard, border-color duration.fast easing.standard', description: 'Hover transitions affect only inexpensive paint properties.' },
      { output: 'effect.focusRing', inputs: ['color.accent', 'focus.alpha'], expression: '0 0 0 2px rgba(color.accent, focus.alpha)', description: 'Focus rings derive from the same primary accent as selected states.' },
      { output: 'effect.loadingPulse', inputs: ['color.accent'], expression: 'linear-gradient(90deg, transparent, rgba(color.accent, 0.6), transparent)', description: 'Loading effects reuse accent color without new component-specific colors.' },
    ],
  },
  {
    name: 'default-dark-semantic-aliases',
    theme: 'default-dark',
    kind: 'semantic-alias',
    description: 'Maps cascade outputs to semantic application aliases without component ownership.',
    parameters: [
      { name: 'semantic.scope', type: 'string', default: '--sn-*', description: 'Public CSS custom property namespace exposed by symbiote-node.' },
    ],
    inputs: ['color.*', 'size.*', 'radius.*', 'shadow.*', 'font.*'],
    outputs: ['--sn-bg', '--sn-panel-bg', '--sn-node-bg', '--sn-node-border', '--sn-text', '--sn-text-dim'],
    formula: 'Semantic aliases are CSS custom properties consumed through normal cascade inheritance.',
    derivations: [
      { output: '--sn-bg', inputs: ['color.background'], expression: 'color.background', description: 'Root background token.' },
      { output: '--sn-panel-bg', inputs: ['color.surface'], expression: 'color.surface', description: 'Panel background token.' },
      { output: '--sn-node-border', inputs: ['color.border'], expression: 'color.border', description: 'Default node and source border token.' },
      { output: '--sn-node-selected', inputs: ['color.accent'], expression: 'color.accent', description: 'Selected and focus accent token.' },
      { output: '--sn-text-dim', inputs: ['color.textDim'], expression: 'color.textDim', description: 'Muted readable text token.' },
    ],
  },
  {
    name: 'default-dark-component-aliases',
    theme: 'default-dark',
    kind: 'component-alias',
    description: 'Maps semantic theme aliases to reusable Symbiote Node component surfaces.',
    parameters: [
      { name: 'component.scope', type: 'string', default: 'layout|surface|control|status|tree|chat|tabs|source|list|loading', description: 'Component token domains served by the default provider theme.' },
    ],
    inputs: ['--sn-*'],
    outputs: [
      '--sn-layout-gap-bg',
      '--sn-layout-border',
      '--sn-card-bg',
      '--sn-card-border',
      '--sn-button-bg',
      '--sn-button-border',
      '--sn-button-primary-bg',
      '--sn-field-control-bg',
      '--sn-field-control-border',
      '--sn-field-control-focus-border',
      '--sn-badge-bg',
      '--sn-badge-border',
      '--sn-badge-info-color',
      '--sn-banner-bg',
      '--sn-banner-border',
      '--sn-banner-info-color',
      '--sn-empty-state-color',
      '--sn-empty-state-padding',
      '--sn-tree-row-height',
      '--sn-tree-panel-row-min-height',
      '--sn-tree-row-selected-bg',
      '--sn-composer-bg',
      '--sn-chat-message-bg',
      '--sn-tabs-active-bg',
      '--sn-source-header-bg',
      '--sn-source-editor-bg',
      '--sn-list-item-active-bg',
    ],
    appliesTo: ['panel-layout', 'sn-card', 'sn-button', 'sn-field', 'sn-badge', 'sn-banner', 'sn-empty-state', 'sn-tree-view', 'sn-tree-panel', 'chat-composer', 'chat-transcript', 'project-tabs', 'source-viewer', 'source-editor', 'sn-list-item', 'sn-loading-overlay'],
    formula: 'Component aliases bridge design tokens to component CSS without product-level style patches.',
    derivations: [
      { output: '--sn-layout-border', inputs: ['component.layoutBorder'], expression: 'transparent', description: 'Layout split gaps stay transparent without mutating the generic node border.' },
      { output: '--sn-card-bg', inputs: ['--sn-node-bg'], expression: 'var(--sn-node-bg)', description: 'Cards inherit the reusable node surface by default.' },
      { output: '--sn-card-border', inputs: ['--sn-node-border'], expression: 'var(--sn-node-border)', description: 'Cards share the provider border color.' },
      { output: '--sn-button-bg', inputs: ['--sn-node-bg'], expression: 'var(--sn-node-bg)', description: 'Default action controls inherit the normal node surface.' },
      { output: '--sn-button-primary-bg', inputs: ['--sn-node-selected'], expression: 'var(--sn-node-selected)', description: 'Primary actions use the shared selected/accent color.' },
      { output: '--sn-field-control-bg', inputs: ['--sn-bg'], expression: 'var(--sn-bg)', description: 'Form controls inherit the app background inside reusable fields.' },
      { output: '--sn-field-control-focus-border', inputs: ['--sn-node-selected'], expression: 'var(--sn-node-selected)', description: 'Field focus uses the shared selected/accent color.' },
      { output: '--sn-badge-bg', inputs: ['--sn-node-bg'], expression: 'var(--sn-node-bg)', description: 'Badges inherit compact reusable node surfaces.' },
      { output: '--sn-badge-info-color', inputs: ['--sn-node-selected'], expression: 'var(--sn-node-selected)', description: 'Informational badges use the shared selected/accent color.' },
      { output: '--sn-banner-bg', inputs: ['--sn-node-bg'], expression: 'var(--sn-node-bg)', description: 'Banners inherit the normal node surface for inline status feedback.' },
      { output: '--sn-banner-info-color', inputs: ['--sn-node-selected'], expression: 'var(--sn-node-selected)', description: 'Informational and running banners use the shared selected/accent color.' },
      { output: '--sn-empty-state-color', inputs: ['--sn-text-dim'], expression: 'var(--sn-text-dim)', description: 'Empty states inherit muted readable text.' },
      { output: '--sn-empty-state-padding', inputs: ['geometry.spacing'], expression: '20px', description: 'Empty states use the provider spacing scale for placeholder breathing room.' },
      { output: '--sn-tree-row-selected-bg', inputs: ['--sn-accent-bg-subtle'], expression: 'var(--sn-accent-bg-subtle)', description: 'Tree selection uses the shared subtle accent surface.' },
      { output: '--sn-tree-panel-row-min-height', inputs: ['--sn-tree-row-min-height'], expression: 'var(--sn-tree-row-min-height)', description: 'Tree panels inherit the tree row geometry unless a host specializes the panel.' },
      { output: '--sn-composer-bg', inputs: ['--sn-node-bg'], expression: 'var(--sn-node-bg)', description: 'Chat composer inherits the normal node surface.' },
      { output: '--sn-tabs-active-bg', inputs: ['--sn-node-bg'], expression: 'var(--sn-node-bg)', description: 'Active project tabs align with node surfaces.' },
      { output: '--sn-source-editor-bg', inputs: ['--sn-bg'], expression: 'var(--sn-bg)', description: 'Source editing uses the root background for code contrast.' },
    ],
  },
];

export let THEME_TOKENS = {
  'default-dark': {
    name: 'default-dark',
    extends: '../base.json',
    control: {
      hue: { $type: 'number', $value: '218' },
      chroma: { $type: 'percentage', $value: '89%' },
      backgroundLightness: { $type: 'percentage', $value: '10%' },
      surfaceLightness: { $type: 'percentage', $value: '13%' },
      textLightness: { $type: 'percentage', $value: '94%' },
      density: { $type: 'number', $value: '1' },
      radius: { $type: 'number', $value: '1' },
      motion: { $type: 'number', $value: '1' },
      elevation: { $type: 'number', $value: '1' },
    },
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
      accentBackground: { $type: 'color', $value: 'hsl(var(--sn-hue-accent) var(--sn-sat-vivid) var(--sn-lit-accent) / 0.12)' },
      accentBackgroundSubtle: { $type: 'color', $value: 'hsl(var(--sn-hue-accent) var(--sn-sat-vivid) var(--sn-lit-accent) / 0.06)' },
      accentBorder: { $type: 'color', $value: 'hsl(var(--sn-hue-accent) var(--sn-sat-vivid) var(--sn-lit-accent) / 0.2)' },
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
    radius: {
      node: { $type: 'dimension', $value: '8px' },
      control: { $type: 'dimension', $value: '4px' },
    },
    effect: {
      hoverTransition: { $type: 'transition', $value: 'background-color calc(120ms * var(--sn-theme-motion-scale)) ease, border-color calc(120ms * var(--sn-theme-motion-scale)) ease' },
      focusRing: { $type: 'shadow', $value: '0 0 0 2px hsl(var(--sn-hue-accent) var(--sn-sat-vivid) var(--sn-lit-accent) / 0.35)' },
      dragShadow: { $type: 'shadow', $value: '0 14px calc(32px * var(--sn-theme-elevation-scale)) rgba(0, 0, 0, 0.35)' },
      loadingPulse: { $type: 'gradient', $value: 'linear-gradient(90deg, transparent, hsl(var(--sn-hue-accent) var(--sn-sat-vivid) var(--sn-lit-accent) / 0.6), transparent)' },
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

export function getThemeRuleBlocks(themeName) {
  return listThemeRuleBlocks({ theme: themeName });
}

export function getThemeControls(themeName) {
  return copyData(THEME_CONTROLS[themeName] || []);
}

export function listThemeElementGroups() {
  return copyData(THEME_ELEMENT_GROUPS);
}

export function getThemeCssTokens(themeName) {
  return { ...(RUNTIME_THEMES[themeName]?.tokens || {}) };
}

export function listThemeCssTokenClassifications(themeName) {
  return Object.entries(getThemeCssTokens(themeName)).map(([cssVar, value]) => {
    let classification = classifyCssToken(cssVar);
    return {
      cssVar,
      value,
      ...classification,
    };
  });
}

export function getThemeRecipe(themeName) {
  let theme = getTheme(themeName);
  let tokens = getThemeTokens(themeName);
  if (!theme || !tokens) return undefined;
  let cssTokens = getThemeCssTokens(themeName);
  return {
    name: themeName,
    theme: { ...theme },
    tokenFile: theme.path,
    tokens: copyData(tokens),
    flatTokens: copyData(flattenTokens(tokens)),
    cssTokens,
    cssTokenClassifications: listThemeCssTokenClassifications(themeName),
    cssTokenSource: RUNTIME_THEMES[themeName] ? 'runtime-theme' : 'not-runtime-complete',
    controls: getThemeControls(themeName),
    elementGroups: listThemeElementGroups(),
    ruleBlocks: copyData(getThemeRuleBlocks(themeName)),
  };
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
