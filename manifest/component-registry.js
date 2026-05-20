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
    tagName: 'panel-layout',
    className: 'Layout',
    module: 'layout/Layout/Layout.js',
    category: 'layout',
    description: 'Panel-based application layout shell.',
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
    tagName: 'project-tabs',
    className: 'ProjectTabs',
    module: 'layout/ProjectTabs/ProjectTabs.js',
    category: 'layout',
    description: 'Generic project/workspace tab strip with add, select, and close events.',
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
  },
  {
    tagName: 'source-editor',
    className: 'SourceEditor',
    module: 'display/SourceEditor/SourceEditor.js',
    category: 'display',
    description: 'Generic source text editor with content, dirty state, readonly, disabled, focus, and tab handling.',
  },
  {
    tagName: 'sn-loading-overlay',
    className: 'LoadingOverlay',
    module: 'display/LoadingOverlay/LoadingOverlay.js',
    category: 'display',
    description: 'Generic loading overlay with label, phase, progress, and secondary status text.',
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
    tagName: 'palette-browser',
    className: 'PaletteBrowser',
    module: 'palette/PaletteBrowser/PaletteBrowser.js',
    category: 'palette',
    description: 'Node palette browser for adding graph nodes.',
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
    tagName: 'graph-tabs',
    className: 'GraphTabs',
    module: 'canvas/GraphTabs/GraphTabs.js',
    category: 'canvas',
    description: 'Tab strip component for multiple graph views.',
  },
  {
    tagName: 'graph-breadcrumb',
    className: 'Breadcrumb',
    module: 'canvas/Breadcrumb/Breadcrumb.js',
    category: 'canvas',
    description: 'Breadcrumb component for graph and subgraph navigation.',
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
  },
  {
    tagName: 'chat-composer',
    className: 'ChatComposer',
    module: 'chat/ChatComposer/ChatComposer.js',
    category: 'chat',
    description: 'Generic chat composer with input, context chips, footer controls, and autocomplete host.',
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
    tagName: 'sn-list-item',
    className: 'ListItem',
    module: 'list/ListItem/ListItem.js',
    category: 'list',
    description: 'Generic selectable list item with label, description, icon, meta text, and item payload event.',
  },
  {
    tagName: 'sn-tree-view',
    className: 'TreeView',
    module: 'tree/TreeView/TreeView.js',
    category: 'tree',
    description: 'Generic tree view with selection, expansion, filtering, drag payloads, and host-owned item data.',
  },
];

export function listComponents(filter = {}) {
  return COMPONENTS.filter((component) => {
    for (let [key, value] of Object.entries(filter)) {
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

export function getComponentTags() {
  return COMPONENTS.map((component) => component.tagName);
}
