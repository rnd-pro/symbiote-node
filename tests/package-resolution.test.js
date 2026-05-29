/**
 * Package resolution contract tests for symbiote-node.
 *
 * These tests exercise package self-resolution through package.json#exports,
 * not local relative file imports.
 *
 * Run: node --test tests/package-resolution.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('package exports resolution', () => {
  it('exposes stable public entrypoints', async () => {
    let root = await import('symbiote-node');
    let ui = await import('symbiote-node/ui');
    let engine = await import('symbiote-node/engine');
    let graph = await import('symbiote-node/graph');
    let locale = await import('symbiote-node/locale');
    let manifest = await import('symbiote-node/manifest');
    let layout = await import('symbiote-node/layout');
    let xr = await import('symbiote-node/xr');
    let markdownFormatter = await import('symbiote-node/display/markdown-formatter');

    assert.equal(typeof root.NodeEditor, 'function');
    assert.equal(typeof root.createForceLayoutPayload, 'function');
    assert.equal(typeof root.createHtmlInCanvasAdapter, 'function');
    assert.equal(typeof root.createWebXRAdapter, 'function');
    assert.equal(root.DEFAULT_LOCALE, 'en');
    assert.equal(typeof root.createTranslator, 'function');
    assert.equal(root.applyTheme, undefined, 'DOM theme helpers must live in symbiote-node/ui');
    assert.equal(root.applyPalette, undefined, 'DOM palette helpers must live in symbiote-node/ui');
    assert.equal(root.applySkin, undefined, 'DOM skin helpers must live in symbiote-node/ui');
    assert.equal(root.ForceLayout, undefined, 'Worker-backed layout must live in symbiote-node/ui');
    assert.equal(typeof ui.ForceLayout, 'function');
    assert.equal(typeof ui.createHtmlInCanvasAdapter, 'function');
    assert.equal(ui.HTML_IN_CANVAS_RENDERER.status, 'experimental');
    assert.equal(typeof ui.createWebXRAdapter, 'function');
    assert.equal(ui.WEBXR_RENDERER.status, 'experimental');
    assert.ok('GraphExplorerShell' in ui, 'UI entrypoint must expose GraphExplorerShell binding');
    assert.equal(typeof ui.computeInitialGraphPositions, 'function');
    assert.ok('Layout' in ui, 'UI entrypoint must expose Layout binding');
    assert.ok('CrossLayoutPortalBridge' in ui, 'UI entrypoint must expose CrossLayoutPortalBridge binding');
    assert.equal(typeof ui.ensureMaterialSymbols, 'function');
    assert.ok('CellBg' in ui, 'UI entrypoint must expose CellBg binding');
    assert.ok('ChatTranscript' in ui, 'UI entrypoint must expose ChatTranscript binding');
    assert.ok('ChatComposer' in ui, 'UI entrypoint must expose ChatComposer binding');
    assert.ok('ChatList' in ui, 'UI entrypoint must expose ChatList binding');
    assert.ok('ChatListItem' in ui, 'UI entrypoint must expose ChatListItem binding');
    assert.ok('TreeView' in ui, 'UI entrypoint must expose TreeView binding');
    assert.ok('TreePanel' in ui, 'UI entrypoint must expose TreePanel binding');
    assert.ok('SurfaceCard' in ui, 'UI entrypoint must expose SurfaceCard binding');
    assert.ok('ActionButton' in ui, 'UI entrypoint must expose ActionButton binding');
    assert.ok('FormField' in ui, 'UI entrypoint must expose FormField binding');
    assert.equal(typeof ui.sharedUiStyles, 'string');
    assert.match(ui.sharedUiStyles, /:host/);
    assert.doesNotMatch(ui.sharedUiStyles, /\.ui-/);
    assert.equal(typeof ui.escapeHtml, 'function');
    assert.equal(typeof ui.uiAlert, 'function');
    assert.equal(typeof ui.uiConfirm, 'function');
    assert.equal(typeof ui.uiPrompt, 'function');
    assert.equal(typeof ui.detectBrowserLocale, 'function');
    assert.equal(typeof ui.configureBrowserLocalization, 'function');
    assert.ok('SourceEditor' in ui, 'UI entrypoint must expose SourceEditor binding');
    assert.ok('navigate' in ui, 'UI entrypoint must expose router binding');
    assert.equal(typeof engine.Graph, 'function');
    assert.equal(typeof graph.normalizeGraphModel, 'function');
    assert.equal(typeof graph.normalizeProjectPackage, 'function');
    assert.equal(typeof graph.normalizeProjectTransaction, 'function');
    assert.equal(typeof graph.applyProjectTransaction, 'function');
    assert.equal(typeof graph.updateLayoutNode, 'function');
    assert.equal(typeof graph.createProjectRuntime, 'function');
    assert.equal(locale.DEFAULT_LOCALE, 'en');
    assert.deepEqual(locale.SUPPORTED_LOCALES, ['en', 'ru', 'es']);
    assert.equal(locale.normalizeLocale('es-AR'), 'es');
    assert.equal(typeof root.normalizeGraphModel, 'function');
    assert.equal(typeof manifest.listComponents, 'function');
    assert.equal(typeof layout.createSectionRegistry, 'function');
    assert.equal(typeof layout.LayoutTree.collectPanels, 'function');
    assert.equal(typeof layout.setupPanelRouting, 'function');
    assert.equal(typeof layout.navigate, 'function');
    assert.ok(!('Layout' in layout), 'Layout entrypoint must stay SSR-safe; use symbiote-node/ui for components');
    assert.equal(typeof xr.projectLayoutToXR, 'function');
    assert.equal(typeof xr.adjustXRPanelPoseForComfort, 'function');
    assert.equal(typeof xr.adjustXRPanelRotationForViewer, 'function');
    assert.equal(typeof xr.createXRPanelContentViewport, 'function');
    assert.equal(typeof xr.createXRPanelFacingSummary, 'function');
    assert.equal(typeof xr.createXRPanelPoseComfortSummary, 'function');
    assert.equal(typeof xr.createXRPanelTextureQualitySummary, 'function');
    assert.equal(typeof xr.createXRSceneQualitySummary, 'function');
    assert.equal(typeof xr.createXRSpatialScene, 'function');
    assert.equal(typeof xr.createXRSceneController, 'function');
    assert.equal(typeof xr.createXRPanelHost, 'function');
    assert.equal(typeof xr.createXRHtmlCanvasDiagnostics, 'function');
    assert.equal(typeof xr.createXRHtmlCanvasRenderer, 'function');
    assert.equal(typeof xr.createXRTextureDebugModeSummary, 'function');
    assert.equal(typeof xr.createXRTextureGateSummary, 'function');
    assert.equal(typeof xr.createXRWebGLLayerTarget, 'function');
    assert.equal(typeof xr.XR_THREE_WEBXR_ADAPTER, 'object');
    assert.equal(typeof xr.createXRThreePanelTextureBridge, 'function');
    assert.equal(typeof xr.createXRThreeHtmlCanvasTextureResolver, 'function');
    assert.equal(typeof xr.createXRThreePanelSceneAdapter, 'function');
    assert.equal(typeof xr.createXRThreeControllerRayAdapter, 'function');
    assert.equal(typeof xr.createXRThreeWebXRAdapter, 'function');
    assert.equal(typeof xr.createXRThreeRenderHost, 'function');
    assert.equal(typeof xr.createXRThreeSessionController, 'function');
    assert.equal(typeof xr.createXRWebGLLayerPanelRenderer, 'function');
    assert.equal(typeof xr.createXRThemeSnapshot, 'function');
    assert.equal(typeof xr.createWebXRLaunchRecommendation, 'function');
    assert.equal(typeof xr.createWebXRLaunchGateSummary, 'function');
    assert.equal(typeof xr.createXRReadinessSummary, 'function');
    assert.equal(typeof xr.hitTestXRPanels, 'function');
    assert.equal(typeof xr.createXRPointerHit, 'function');
    assert.equal(typeof xr.createXRPointerHitFromDomEvent, 'function');
    assert.equal(typeof xr.createXRPanelPointerTarget, 'function');
    assert.equal(typeof xr.createXRPanelGestureState, 'function');
    assert.equal(typeof xr.updateXRPanelGesture, 'function');
    assert.equal(typeof xr.createXRLayoutTransactionFromGesture, 'function');
    assert.equal(typeof xr.createXRLayoutTransactionFromPanelPose, 'function');
    assert.equal(typeof xr.WEBXR_EMULATION_RUNTIME, 'object');
    assert.equal(typeof xr.createWebXREmulationAdapter, 'function');
    assert.equal(typeof xr.getWebXREmulationSupport, 'function');
    assert.equal(typeof xr.installWebXREmulationRuntime, 'function');
    assert.equal(typeof markdownFormatter.formatMarkdown, 'function');
    assert.equal(typeof markdownFormatter.escapeHtml, 'function');
  });

  it('does not expose removed legacy themes as package subpaths', async () => {
    for (let theme of ['dark', 'light', 'synthwave', 'grey', 'neon', 'carbon', 'pcb', 'ebook', 'default-dark']) {
      await assert.rejects(import(`symbiote-node/themes/${theme}.js`));
    }
    await assert.doesNotReject(import('symbiote-node/themes/default-provider.js'));
  });

  it('exposes markdown formatting as a reusable display utility', async () => {
    let { formatMarkdown } = await import('symbiote-node/display/markdown-formatter');

    let html = formatMarkdown('**Ready** `@[src/app.js]`');

    assert.match(html, /<strong>Ready<\/strong>/);
    assert.match(html, /<span class="markdown-mention">@\[src\/app\.js\]<\/span>/);
  });

  it('keeps browser implementation deep imports private', async () => {
    let privateSubpaths = [
      'symbiote-node/ui/index.js',
      'symbiote-node/canvas/ForceLayout.js',
      'symbiote-node/layout/Layout/Layout.js',
      'symbiote-node/canvas/graph-explorer.js',
      'symbiote-node/interactions/Drag.js',
      'symbiote-node/node/GraphNode/GraphNode.js',
      'symbiote-node/toolbar/QuickToolbar/QuickToolbar.js',
      'symbiote-node/inspector/InspectorPanel/InspectorPanel.js',
      'symbiote-node/palette/PaletteBrowser/PaletteBrowser.js',
      'symbiote-node/menu/ContextMenu/ContextMenu.js',
      'symbiote-node/navigation/QuickOpen/QuickOpen.js',
      'symbiote-node/effects/CellBg/CellBg.js',
      'symbiote-node/canvas/CanvasGraph/CanvasGraph.js',
      'symbiote-node/canvas/GraphExplorerShell/GraphExplorerShell.js',
      'symbiote-node/chat/message-model.js',
      'symbiote-node/chat/ChatMessageItem/ChatMessageItem.js',
      'symbiote-node/chat/ChatTranscript/ChatTranscript.js',
      'symbiote-node/chat/ChatComposer/ChatComposer.js',
      'symbiote-node/chat/ChatList/ChatList.js',
      'symbiote-node/chat/ChatListItem/ChatListItem.js',
      'symbiote-node/chat/ChatSidebar/ChatSidebar.js',
      'symbiote-node/chat/ChatSidebarItem/ChatSidebarItem.js',
      'symbiote-node/tree/TreeView/TreeView.js',
      'symbiote-node/layout/ProjectTabs/ProjectTabs.js',
      'symbiote-node/display/CodeBlock/CodeBlock.js',
      'symbiote-node/display/SourceViewer/SourceViewer.js',
      'symbiote-node/display/SourceEditor/SourceEditor.js',
      'symbiote-node/engine/packs/ai/grok-generate.handler.js',
      'symbiote-node/engine/packs/ai/opencode.handler.js',
    ];

    for (let specifier of privateSubpaths) {
      await assert.rejects(
        import(specifier),
        (error) => error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED',
        `${specifier} must be private; use symbiote-node/ui`
      );
    }
  });
});
