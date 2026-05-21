export const COMPONENT_UI_SPECIFIER = 'symbiote-node/ui';

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
  },
  {
    tagName: 'sn-tree-view',
    className: 'TreeView',
    module: 'tree/TreeView/TreeView.js',
    category: 'tree',
    description: 'Generic tree view with selection, expansion, filtering, drag payloads, and host-owned item data.',
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
