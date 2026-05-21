export const COMPONENT_UI_SPECIFIER = 'symbiote-node/ui';
export const COMPONENT_DESCRIPTOR_SCHEMA = 'schemas/component-descriptor-v1.json';

const UI_NAMED_EXPORTS = new Set([
  'GraphNode',
  'NodeSocket',
  'NodeCanvas',
  'CanvasGraph',
  'GraphExplorerShell',
  'ContextMenu',
  'Layout',
  'LayoutSidebar',
  'LayoutNode',
  'ProjectTabs',
  'CodeBlock',
  'SourceViewer',
  'SourceEditor',
  'LoadingOverlay',
  'OutputListPreview',
  'OutputGraphPreview',
  'CellBg',
  'QuickToolbar',
  'InspectorPanel',
  'PaletteBrowser',
  'Minimap',
  'NodeSearch',
  'GraphTabs',
  'Breadcrumb',
  'QuickOpen',
  'ChatMessageItem',
  'ChatTranscript',
  'ChatComposer',
  'ChatList',
  'ChatListItem',
  'ChatSidebarShell',
  'ChatSidebarItem',
  'ChatSidebarSubItem',
  'ListItem',
  'TreeView',
  'GraphFrame',
]);

export let COMPONENTS = [
  {
    tagName: 'graph-node',
    className: 'GraphNode',
    module: 'node/GraphNode/GraphNode.js',
    category: 'node',
    description: 'Interactive graph node component for the node canvas.',
  },
  {
    tagName: 'node-socket',
    className: 'NodeSocket',
    module: 'node/NodeSocket/NodeSocket.js',
    category: 'node',
    description: 'Socket endpoint component for graph node inputs and outputs.',
  },
  {
    tagName: 'node-canvas',
    className: 'NodeCanvas',
    module: 'canvas/NodeCanvas/NodeCanvas.js',
    category: 'canvas',
    description: 'Primary graph canvas custom element.',
  },
  {
    tagName: 'canvas-graph',
    className: 'CanvasGraph',
    module: 'canvas/CanvasGraph/CanvasGraph.js',
    category: 'canvas',
    description: 'Generic hierarchical canvas graph renderer with force layout and selection events.',
  },
  {
    tagName: 'graph-explorer-shell',
    className: 'GraphExplorerShell',
    module: 'canvas/GraphExplorerShell/GraphExplorerShell.js',
    category: 'canvas',
    description: 'Generic graph explorer shell with toolbar, canvas, overlay, legend, and stats slots.',
  },
  {
    tagName: 'context-menu',
    className: 'ContextMenu',
    module: 'menu/ContextMenu/ContextMenu.js',
    category: 'menu',
    description: 'Generic context menu custom element for graph and canvas actions.',
  },
  {
    tagName: 'ctx-item',
    className: 'CtxItem',
    module: 'menu/ContextMenu/ContextMenu.js',
    category: 'menu',
    description: 'Internal item used by context-menu.',
  },
  {
    tagName: 'panel-layout',
    className: 'Layout',
    module: 'layout/Layout/Layout.js',
    category: 'layout',
    description: 'Panel-based application layout shell.',
    contract: {
      status: 'draft',
      schemaVersion: 'component-descriptor-v1',
      dataSchema: 'schemas/runtime-ui-v1.json',
      capabilities: ['layout-tree', 'split-panels', 'panel-registry', 'local-storage'],
      attributes: [
        { name: 'storage-key', type: 'string', description: 'Optional key for persisted layout state.' },
        { name: 'min-panel-size', type: 'number', description: 'Minimum panel size in pixels.' },
      ],
      properties: [
        { name: 'layoutTree', type: 'object', description: 'Pure layout tree data rendered by layout-node children.' },
        { name: 'panelTypes', type: 'object', description: 'Host-provided panel type descriptors keyed by panel type.' },
      ],
      methods: [
        { name: 'registerPanelType', type: 'function', description: 'Registers a renderable panel type descriptor.' },
      ],
      events: [
        { name: 'layout-change', description: 'Bubbles when the layout tree changes.' },
      ],
      themeAliases: [
        '--sn-layout-bg',
        '--sn-layout-gap-bg',
        '--sn-layout-border',
        '--sn-layout-resizer-size',
      ],
    },
  },
  {
    tagName: 'layout-sidebar',
    className: 'LayoutSidebar',
    module: 'layout/LayoutSidebar/LayoutSidebar.js',
    category: 'layout',
    description: 'Sidebar navigation component for the panel layout.',
  },
  {
    tagName: 'layout-node',
    className: 'LayoutNode',
    module: 'layout/LayoutNode/LayoutNode.js',
    category: 'layout',
    description: 'Resizable and dockable layout node component.',
  },
  {
    tagName: 'action-zone',
    className: 'ActionZone',
    module: 'layout/ActionZone/ActionZone.js',
    category: 'layout',
    description: 'Internal split and join gesture control used by layout-node.',
  },
  {
    tagName: 'layout-preview',
    className: 'LayoutPreview',
    module: 'layout/LayoutPreview/LayoutPreview.js',
    category: 'layout',
    description: 'Internal split and join preview overlay used by panel-layout.',
  },
  {
    tagName: 'panel-menu',
    className: 'PanelMenu',
    module: 'layout/PanelMenu/PanelMenu.js',
    category: 'layout',
    description: 'Internal panel type menu used by panel-layout.',
  },
  {
    tagName: 'project-tabs',
    className: 'ProjectTabs',
    module: 'layout/ProjectTabs/ProjectTabs.js',
    category: 'layout',
    description: 'Generic project/workspace tab strip with add, select, and close events.',
    contract: {
      status: 'draft',
      schemaVersion: 'component-descriptor-v1',
      dataSchema: 'schemas/runtime-ui-v1.json',
      capabilities: ['tab-list', 'select', 'close', 'create'],
      properties: [
        { name: 'tabs', type: 'array', description: 'Array of tab descriptors with id, name, color, icon, and closeable fields.' },
        { name: 'activeId', type: 'string', description: 'Active tab id.' },
        { name: 'homeIcon', type: 'string', description: 'Material Symbols icon for the home tab.' },
        { name: 'homeLabel', type: 'string', description: 'Accessible home tab label.' },
        { name: 'addTitle', type: 'string', description: 'Accessible add button title.' },
      ],
      methods: [
        { name: 'setTabs', type: 'function', description: 'Replaces tab data and active tab id.' },
      ],
      events: [
        { name: 'project-tabs-home', description: 'Requests navigation to the home surface.' },
        { name: 'project-tabs-add', description: 'Requests creation or opening of a tab.' },
        {
          name: 'project-tabs-select',
          description: 'Requests tab selection.',
          detail: [{ name: 'id', type: 'string', required: true }],
        },
        {
          name: 'project-tabs-close',
          description: 'Requests tab close.',
          detail: [{ name: 'id', type: 'string', required: true }],
        },
      ],
      themeAliases: [
        '--sn-tabs-height',
        '--sn-tabs-bg',
        '--sn-tabs-active-bg',
        '--sn-tabs-border',
        '--sn-tabs-radius',
      ],
    },
  },
  {
    tagName: 'project-tab-item',
    className: 'ProjectTabItem',
    module: 'layout/ProjectTabs/ProjectTabs.js',
    category: 'layout',
    description: 'Internal tab item used by project-tabs.',
  },
  {
    tagName: 'code-block',
    className: 'CodeBlock',
    module: 'display/CodeBlock/CodeBlock.js',
    category: 'display',
    description: 'Code, markdown, image, and diagnostics display component.',
  },
  {
    tagName: 'cb-squiggle',
    className: 'CbSquiggle',
    module: 'display/CodeBlock/CodeBlock.js',
    category: 'display',
    description: 'Internal diagnostic squiggle marker used by code-block.',
  },
  {
    tagName: 'source-viewer',
    className: 'SourceViewer',
    module: 'display/SourceViewer/SourceViewer.js',
    category: 'display',
    description: 'Source file viewer with code, markdown, image, metadata, actions, and transform modes.',
    contract: {
      status: 'draft',
      schemaVersion: 'component-descriptor-v1',
      dataSchema: 'schemas/runtime-ui-v1.json',
      capabilities: ['source-code', 'markdown-preview', 'image-preview', 'diagnostics', 'transform-toggle'],
      attributes: [
        { name: 'image-api-base', type: 'string', description: 'Optional base URL for resolving image preview sources.' },
      ],
      properties: [
        { name: 'filename', type: 'string', description: 'Current file name or empty-state label.' },
        { name: 'hasFile', type: 'boolean', description: 'Whether a file is currently displayed.' },
        { name: 'viewMode', type: 'string', description: 'Current display mode: source, rendered, or transformed.' },
      ],
      methods: [
        { name: 'showFile', type: 'function', description: 'Displays a source file from pure path, language, code, and optional transform data.' },
        { name: 'showDirectory', type: 'function', description: 'Displays normalized directory text.' },
        { name: 'showImage', type: 'function', description: 'Displays an image path through the nested code-block renderer.' },
        { name: 'showError', type: 'function', description: 'Displays an error state.' },
        { name: 'scrollToLine', type: 'function', description: 'Scrolls nested code-block to a line.' },
        { name: 'setDiagnostics', type: 'function', description: 'Passes diagnostics to nested code-block.' },
      ],
      events: [
        {
          name: 'source-viewer-show-graph',
          description: 'Requests graph focus for the current source path.',
          detail: [{ name: 'path', type: 'string' }],
        },
        {
          name: 'source-viewer-toggle-mode',
          description: 'Fires after the viewer switches source/rendered/transformed mode.',
          detail: [
            { name: 'path', type: 'string' },
            { name: 'mode', type: 'string' },
          ],
        },
      ],
      themeAliases: [
        '--sn-source-bg',
        '--sn-source-header-bg',
        '--sn-source-border',
        '--sn-source-toolbar-gap',
      ],
    },
  },
  {
    tagName: 'source-editor',
    className: 'SourceEditor',
    module: 'display/SourceEditor/SourceEditor.js',
    category: 'display',
    description: 'Generic source text editor with content, dirty state, readonly, disabled, focus, and tab handling.',
    contract: {
      status: 'draft',
      schemaVersion: 'component-descriptor-v1',
      dataSchema: 'schemas/runtime-ui-v1.json',
      capabilities: ['source-editing', 'dirty-state', 'keyboard-tab-indent'],
      properties: [
        { name: 'value', type: 'string', description: 'Editor content.' },
        { name: 'language', type: 'string', description: 'Language label reflected to data-language.' },
        { name: 'placeholder', type: 'string', description: 'Textarea placeholder.' },
        { name: 'ariaLabel', type: 'string', description: 'Accessible editor label.' },
        { name: 'readonly', type: 'boolean', description: 'Readonly editor state.' },
        { name: 'disabled', type: 'boolean', description: 'Disabled editor state.' },
        { name: 'dirty', type: 'boolean', description: 'Whether content differs from host baseline.' },
      ],
      methods: [
        { name: 'getContent', type: 'function', description: 'Returns current editor text.' },
        { name: 'setContent', type: 'function', description: 'Sets editor text and optional dirty state.' },
        { name: 'setEditable', type: 'function', description: 'Toggles disabled state from an editable flag.' },
        { name: 'setLanguage', type: 'function', description: 'Sets language metadata.' },
        { name: 'setDirty', type: 'function', description: 'Sets dirty state.' },
        { name: 'focus', type: 'function', description: 'Focuses the textarea.' },
        { name: 'select', type: 'function', description: 'Selects textarea content.' },
      ],
      events: [
        {
          name: 'source-editor-input',
          description: 'Emits after text changes.',
          detail: [
            { name: 'value', type: 'string', required: true },
            { name: 'dirty', type: 'boolean', required: true },
            { name: 'language', type: 'string', required: true },
          ],
        },
      ],
      themeAliases: [
        '--sn-editor-bg',
        '--sn-editor-text',
        '--sn-editor-border',
        '--sn-editor-radius',
        '--sn-editor-font',
      ],
    },
  },
  {
    tagName: 'sn-loading-overlay',
    className: 'LoadingOverlay',
    module: 'display/LoadingOverlay/LoadingOverlay.js',
    category: 'display',
    description: 'Generic loading overlay with label, phase, progress, and secondary status text.',
    contract: {
      status: 'draft',
      schemaVersion: 'component-descriptor-v1',
      dataSchema: 'schemas/runtime-ui-v1.json',
      capabilities: ['loading-state', 'progress', 'hide-transition'],
      properties: [
        { name: 'label', type: 'string', description: 'Primary loading label.' },
        { name: 'pct', type: 'number', description: 'Progress percentage from 0 to 100.' },
        { name: 'phase', type: 'string', description: 'Current loading phase.' },
        { name: 'sub', type: 'string', description: 'Secondary loading text.' },
        { name: 'isHidden', type: 'boolean', description: 'Hidden transition state.' },
      ],
      methods: [
        { name: 'show', type: 'function', description: 'Shows the overlay.' },
        { name: 'hide', type: 'function', description: 'Hides the overlay and optionally calls completion after transition.' },
        { name: 'setProgress', type: 'function', description: 'Sets clamped progress, phase, and secondary text.' },
      ],
      events: [],
      themeAliases: [
        '--sn-loading-bg',
        '--sn-loading-text',
        '--sn-loading-accent',
        '--sn-loading-radius',
      ],
    },
  },
  {
    tagName: 'output-list-preview',
    className: 'OutputListPreview',
    module: 'display/OutputListPreview/OutputListPreview.js',
    category: 'display',
    description: 'Generic normalized list preview for arbitrary output values.',
  },
  {
    tagName: 'output-graph-preview',
    className: 'OutputGraphPreview',
    module: 'display/OutputGraphPreview/OutputGraphPreview.js',
    category: 'display',
    description: 'Generic normalized graph preview for node and edge output values.',
  },
  {
    tagName: 'cell-bg',
    className: 'CellBg',
    module: 'effects/CellBg/CellBg.js',
    category: 'effects',
    description: 'Animated cellular automaton background effect.',
  },
  {
    tagName: 'quick-toolbar',
    className: 'QuickToolbar',
    module: 'toolbar/QuickToolbar/QuickToolbar.js',
    category: 'toolbar',
    description: 'Floating quick action toolbar for graph editing.',
  },
  {
    tagName: 'inspector-panel',
    className: 'InspectorPanel',
    module: 'inspector/InspectorPanel/InspectorPanel.js',
    category: 'inspector',
    description: 'Inspector panel for selected graph node properties.',
  },
  {
    tagName: 'insp-port-item',
    className: 'InspPortItem',
    module: 'inspector/InspectorPanel/InspectorPanel.js',
    category: 'inspector',
    description: 'Internal port inspector item used by inspector-panel.',
  },
  {
    tagName: 'insp-ctrl-item',
    className: 'InspCtrlItem',
    module: 'inspector/InspectorPanel/InspectorPanel.js',
    category: 'inspector',
    description: 'Internal control inspector item used by inspector-panel.',
  },
  {
    tagName: 'template-preview',
    className: 'TemplatePreview',
    module: 'inspector/TemplatePreview/TemplatePreview.js',
    category: 'inspector',
    description: 'Internal template preview used by inspector-panel.',
  },
  {
    tagName: 'palette-browser',
    className: 'PaletteBrowser',
    module: 'palette/PaletteBrowser/PaletteBrowser.js',
    category: 'palette',
    description: 'Node palette browser for adding graph nodes.',
  },
  {
    tagName: 'pal-item',
    className: 'PalItem',
    module: 'palette/PaletteBrowser/PaletteBrowser.js',
    category: 'palette',
    description: 'Internal palette item used by palette-browser.',
  },
  {
    tagName: 'pal-category',
    className: 'PalCategory',
    module: 'palette/PaletteBrowser/PaletteBrowser.js',
    category: 'palette',
    description: 'Internal palette category used by palette-browser.',
  },
  {
    tagName: 'node-minimap',
    className: 'Minimap',
    module: 'canvas/Minimap/Minimap.js',
    category: 'canvas',
    description: 'Canvas minimap for graph navigation.',
  },
  {
    tagName: 'node-search',
    className: 'NodeSearch',
    module: 'canvas/NodeSearch/NodeSearch.js',
    category: 'canvas',
    description: 'Search component for graph nodes and actions.',
  },
  {
    tagName: 'search-result-item',
    className: 'SearchResultItem',
    module: 'canvas/NodeSearch/NodeSearch.js',
    category: 'canvas',
    description: 'Internal result item used by node-search.',
  },
  {
    tagName: 'graph-tabs',
    className: 'GraphTabs',
    module: 'canvas/GraphTabs/GraphTabs.js',
    category: 'canvas',
    description: 'Tab strip component for multiple graph views.',
  },
  {
    tagName: 'tab-item',
    className: 'TabItem',
    module: 'canvas/GraphTabs/GraphTabs.js',
    category: 'canvas',
    description: 'Internal tab item used by graph-tabs.',
  },
  {
    tagName: 'graph-breadcrumb',
    className: 'Breadcrumb',
    module: 'canvas/Breadcrumb/Breadcrumb.js',
    category: 'canvas',
    description: 'Breadcrumb component for graph and subgraph navigation.',
  },
  {
    tagName: 'breadcrumb-item',
    className: 'BreadcrumbItem',
    module: 'canvas/Breadcrumb/Breadcrumb.js',
    category: 'canvas',
    description: 'Internal breadcrumb item used by graph-breadcrumb.',
  },
  {
    tagName: 'quick-open',
    className: 'QuickOpen',
    module: 'navigation/QuickOpen/QuickOpen.js',
    category: 'navigation',
    description: 'Generic fuzzy quick-open dialog for selecting files or application items.',
  },
  {
    tagName: 'chat-message-item',
    className: 'ChatMessageItem',
    module: 'chat/ChatMessageItem/ChatMessageItem.js',
    category: 'chat',
    description: 'Generic chat message renderer for text, tool, board, and thinking messages.',
  },
  {
    tagName: 'chat-transcript',
    className: 'ChatTranscript',
    module: 'chat/ChatTranscript/ChatTranscript.js',
    category: 'chat',
    description: 'Generic chat transcript shell with message rendering, scroll controls, live status, and delegation card events.',
    contract: {
      status: 'draft',
      schemaVersion: 'component-descriptor-v1',
      dataSchema: 'schemas/runtime-ui-v1.json',
      capabilities: ['chat-transcript', 'message-list', 'scroll-state', 'delegation-card-events'],
      properties: [
        { name: 'messageItems', type: 'array', description: 'Normalized message item descriptors rendered by chat-message-item.' },
      ],
      methods: [
        { name: 'setMessageItems', type: 'function', description: 'Replaces transcript messages from pure data.' },
        { name: 'scrollToBottom', type: 'function', description: 'Scrolls the message container to the bottom.' },
        { name: 'getScrollState', type: 'function', description: 'Returns overflow and bottom-position state.' },
        { name: 'renderLiveStatus', type: 'function', description: 'Renders host-provided live status metadata.' },
        { name: 'updateDelegationTask', type: 'function', description: 'Updates a delegation card by task id.' },
      ],
      events: [
        { name: 'chat-transcript-scroll', description: 'Emits current scroll state.', detail: [{ name: 'isAtBottom', type: 'boolean' }] },
        { name: 'chat-transcript-scroll-bottom', description: 'Emits after scroll-to-bottom is requested.' },
        { name: 'delegation-card-open', description: 'Requests opening a linked delegated chat or task card.' },
        { name: 'message-copy', description: 'Reports copy result for message text.' },
      ],
      themeAliases: [
        '--sn-chat-bg',
        '--sn-chat-message-bg',
        '--sn-chat-message-radius',
        '--sn-chat-gap',
      ],
    },
  },
  {
    tagName: 'chat-composer',
    className: 'ChatComposer',
    module: 'chat/ChatComposer/ChatComposer.js',
    category: 'chat',
    description: 'Generic chat composer with input, context chips, footer controls, and autocomplete host.',
    contract: {
      status: 'draft',
      schemaVersion: 'component-descriptor-v1',
      dataSchema: 'schemas/runtime-ui-v1.json',
      capabilities: ['chat-input', 'context-chips', 'footer-controls', 'autocomplete-host', 'drag-drop-context'],
      properties: [
        { name: 'value', type: 'string', description: 'Current input value.' },
        { name: 'disabled', type: 'boolean', description: 'Disables the textarea.' },
        { name: 'placeholder', type: 'string', description: 'Textarea placeholder.' },
        { name: 'attachedContext', type: 'array', description: 'Context chip descriptors.' },
        { name: 'footerHtml', type: 'string', description: 'Trusted footer controls HTML owned by the host adapter.' },
        { name: 'isSending', type: 'boolean', description: 'Switches send button into stop state.' },
      ],
      methods: [
        { name: 'setValue', type: 'function', description: 'Sets input value.' },
        { name: 'setAttachedContext', type: 'function', description: 'Sets context chip descriptors.' },
        { name: 'setFooterHtml', type: 'function', description: 'Sets trusted footer controls HTML.' },
        { name: 'setDisabled', type: 'function', description: 'Sets disabled state.' },
        { name: 'setSending', type: 'function', description: 'Sets sending state.' },
      ],
      events: [
        { name: 'chat-composer-input', description: 'Emits input value and caret position.' },
        { name: 'chat-composer-submit', description: 'Requests submit from Enter.' },
        { name: 'chat-composer-send', description: 'Requests send or stop from the send button.' },
        { name: 'chat-composer-key', description: 'Passes navigation/autocomplete keys to the host.' },
        { name: 'chat-composer-param-change', description: 'Emits footer control value changes.' },
        { name: 'chat-composer-context-remove', description: 'Requests context chip removal.' },
        { name: 'chat-composer-context-drop', description: 'Requests dropped context attachment.' },
      ],
      themeAliases: [
        '--sn-composer-bg',
        '--sn-composer-border',
        '--sn-composer-radius',
        '--sn-composer-control-gap',
        '--sn-composer-input-min-height',
      ],
    },
  },
  {
    tagName: 'chat-list',
    className: 'ChatList',
    module: 'chat/ChatList/ChatList.js',
    category: 'chat',
    description: 'Generic chat list shell with filters, creation action, item list, and selection/delete events.',
  },
  {
    tagName: 'chat-list-item',
    className: 'ChatListItem',
    module: 'chat/ChatListItem/ChatListItem.js',
    category: 'chat',
    description: 'Generic chat list item with project badge, adapter, preview, metadata, nesting, and delete action.',
  },
  {
    tagName: 'chat-sidebar-shell',
    className: 'ChatSidebarShell',
    module: 'chat/ChatSidebar/ChatSidebar.js',
    category: 'chat',
    description: 'Generic collapsible and resizable chat navigation shell.',
  },
  {
    tagName: 'chat-sidebar-item',
    className: 'ChatSidebarItem',
    module: 'chat/ChatSidebarItem/ChatSidebarItem.js',
    category: 'chat',
    description: 'Generic chat sidebar root item with nested child chat rendering.',
  },
  {
    tagName: 'chat-sidebar-sub-item',
    className: 'ChatSidebarSubItem',
    module: 'chat/ChatSidebarItem/ChatSidebarItem.js',
    category: 'chat',
    description: 'Generic chat sidebar child item.',
  },
  {
    tagName: 'sidebar-section',
    className: 'SidebarSection',
    module: 'layout/LayoutSidebar/SidebarSection.js',
    category: 'layout',
    description: 'Internal section item used by layout-sidebar.',
  },
  {
    tagName: 'sidebar-sub-item',
    className: 'SidebarSubItem',
    module: 'layout/LayoutSidebar/SidebarSection.js',
    category: 'layout',
    description: 'Internal sidebar child item used by layout-sidebar.',
  },
  {
    tagName: 'sn-list-item',
    className: 'ListItem',
    module: 'list/ListItem/ListItem.js',
    category: 'list',
    description: 'Generic selectable list item with label, description, icon, meta text, and item payload event.',
    contract: {
      status: 'draft',
      schemaVersion: 'component-descriptor-v1',
      dataSchema: 'schemas/runtime-ui-v1.json',
      capabilities: ['selectable-list-item', 'keyboard-select', 'payload-event'],
      properties: [
        { name: 'label', type: 'string', description: 'Primary row text.' },
        { name: 'description', type: 'string', description: 'Secondary row text.' },
        { name: 'icon', type: 'string', description: 'Optional Material Symbols icon name.' },
        { name: 'meta', type: 'string', description: 'Trailing metadata text.' },
        { name: 'active', type: 'boolean', description: 'Active row state reflected to host attribute.' },
        { name: 'disabled', type: 'boolean', description: 'Disabled row state reflected to host attribute.' },
        { name: 'item', type: 'object', description: 'Host-owned payload emitted on select.' },
      ],
      methods: [
        { name: 'setItem', type: 'function', description: 'Sets payload and row display properties from one item descriptor.' },
      ],
      events: [
        {
          name: 'sn-list-item-select',
          description: 'Emits selected payload unless the row is disabled.',
          detail: [{ name: 'item', type: 'object' }],
        },
      ],
      themeAliases: [
        '--sn-list-item-bg',
        '--sn-list-item-hover-bg',
        '--sn-list-item-active-bg',
        '--sn-list-item-radius',
        '--sn-list-item-gap',
      ],
    },
  },
  {
    tagName: 'sn-tree-view',
    className: 'TreeView',
    module: 'tree/TreeView/TreeView.js',
    category: 'tree',
    description: 'Generic tree view with selection, expansion, filtering, drag payloads, and host-owned item data.',
    contract: {
      status: 'draft',
      schemaVersion: 'component-descriptor-v1',
      dataSchema: 'schemas/runtime-ui-v1.json',
      capabilities: ['tree-data', 'select', 'expand-collapse', 'filter', 'drag-payload', 'local-storage'],
      properties: [
        { name: 'items', type: 'array', description: 'Tree item descriptors with id/path, label, icon, badges, children, and payload fields.' },
        { name: 'selectedId', type: 'string', description: 'Selected item id or path.' },
        { name: 'expandedIds', type: 'array', description: 'Expanded item ids.' },
        { name: 'defaultExpandedIds', type: 'array', description: 'Initial expanded ids when storage has no value.' },
        { name: 'filterText', type: 'string', description: 'Filter text matched against item labels and metadata.' },
        { name: 'storageKey', type: 'string', description: 'Optional localStorage key for expanded state.' },
        { name: 'toggleBranchesOnSelect', type: 'boolean', description: 'Toggles branch rows when selected.' },
      ],
      methods: [
        { name: 'setItems', type: 'function', description: 'Replaces tree data.' },
        { name: 'collapseAll', type: 'function', description: 'Collapses all branches.' },
        { name: 'expandAncestors', type: 'function', description: 'Expands ancestors for an id or path.' },
        { name: 'scrollSelectedIntoView', type: 'function', description: 'Scrolls selected row into view.' },
      ],
      events: [
        {
          name: 'sn-tree-select',
          description: 'Emits the selected item descriptor.',
          detail: [{ name: 'item', type: 'object', required: true }],
        },
        {
          name: 'sn-tree-dragstart',
          description: 'Emits drag item and payload metadata.',
          detail: [
            { name: 'item', type: 'object', required: true },
            { name: 'payload', type: 'any' },
          ],
        },
      ],
      themeAliases: [
        '--sn-tree-row-height',
        '--sn-tree-indent',
        '--sn-tree-icon-size',
        '--sn-tree-row-radius',
        '--sn-tree-selected-bg',
      ],
    },
  },
  {
    tagName: 'ctrl-item',
    className: 'CtrlItem',
    module: 'node/CtrlItem/CtrlItem.js',
    category: 'node',
    description: 'Internal control item used by graph-node.',
  },
  {
    tagName: 'port-item',
    className: 'PortItem',
    module: 'node/PortItem/PortItem.js',
    category: 'node',
    description: 'Internal port item used by graph-node.',
  },
  {
    tagName: 'graph-frame',
    className: 'GraphFrame',
    module: 'node/GraphFrame/GraphFrame.js',
    category: 'node',
    description: 'Graph canvas frame primitive for grouped node regions.',
  },
].map((component) => {
  let exportName = UI_NAMED_EXPORTS.has(component.className) ? component.className : null;
  let internal = !exportName;
  return {
    ...component,
    internal,
    specifier: COMPONENT_UI_SPECIFIER,
    exportName,
    importKind: internal ? 'side-effect' : 'named',
  };
});

export function listComponents(filter = {}) {
  let { includeInternal = false, ...componentFilter } = filter;
  return COMPONENTS.filter((component) => {
    if (!includeInternal && component.internal) return false;
    for (let [key, value] of Object.entries(componentFilter)) {
      if (component[key] !== value) return false;
    }
    return true;
  });
}

export function getComponent(tagName) {
  return COMPONENTS.find((component) => component.tagName === tagName);
}

export function hasComponent(tagName) {
  return Boolean(getComponent(tagName));
}

export function getComponentModule(tagName) {
  return getComponent(tagName)?.module;
}

export function getComponentSpecifier(tagName) {
  return getComponent(tagName)?.specifier;
}

export function getComponentExportName(tagName) {
  return getComponent(tagName)?.exportName;
}

export function getComponentTags(filter = {}) {
  return listComponents(filter).map((component) => component.tagName);
}
