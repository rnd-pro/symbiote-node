#!/usr/bin/env node
/**
 * cli.js - symbiote-node command-line runner
 *
 * Execute, validate, and inspect workflow JSON files.
 * Agent-facing --json mode available for commands that produce structured output.
 *
 * Usage:
 *   node symbiote-node/cli.js run <workflow.json> [--pack custom] [--secrets secrets.json] [--verbose] [--json]
 *   node symbiote-node/cli.js validate <workflow.json> [--pack custom] [--json]
 *   node symbiote-node/cli.js list [--pack custom] [--json]
 *   node symbiote-node/cli.js inspect <workflow.json> [--json]
 *   node symbiote-node/cli.js discover
 *
 * @module symbiote-node/cli */

import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

import {
  Executor,
  listDrivers,
  getNodeType,
  getNodeMenu,
  validateParams,
  deserialize,
  loadHandlers,
  listPacks,
  getAllSocketTypes,
} from './index.js';

import {
  listComponents,
  THEME_NAMES,
  getTheme,
  getThemeTokens,
  getThemeRecipe,
  getThemeControls,
  listThemeElementGroups,
  listTokenFiles,
  listThemeRuleBlocks,
  RULESETS,
  listRules,
  listGraphSchemas,
  listProjectSchemas,
  UI_SCHEMA_VERSIONS,
  getUiSchema,
} from '../manifest/index.js';
import { HTML_IN_CANVAS_RENDERER } from '../canvas/html-in-canvas.js';
import { WEBXR_RENDERER, XR_THREE_WEBXR_ADAPTER } from '../xr/index.js';
import { DEFAULT_LOCALE, LOCALE_CATALOG_KEYS, SUPPORTED_LOCALES } from '../locale/index.js';

let __dirname = dirname(fileURLToPath(import.meta.url));
let PKG_PATH = resolve(__dirname, '../package.json');
let PKG = JSON.parse(readFileSync(PKG_PATH, 'utf-8'));

const EXPORT_ENTRYPOINTS = [
  {
    specifier: 'symbiote-node',
    kind: 'node-safe',
    description: 'Node-safe graph/core API, themes, shapes, plugins, and pure utilities.',
  },
  {
    specifier: 'symbiote-node/core',
    kind: 'node-safe',
    description: 'Core graph editor data model primitives.',
  },
  {
    specifier: 'symbiote-node/engine',
    kind: 'node-safe',
    description: 'Server-side graph runtime, registry, executor, and serialization helpers.',
  },
  {
    specifier: 'symbiote-node/graph',
    kind: 'node-safe',
    description: 'Universal graph model normalization for UI, workflow, automation, and media projects.',
  },
  {
    specifier: 'symbiote-node/locale',
    kind: 'node-safe',
    description: 'Node-safe localization catalogs and translation helpers for built-in UI strings.',
  },
  {
    specifier: 'symbiote-node/manifest',
    kind: 'node-safe',
    description: 'Agent-readable component, theme, token, rule, and schema catalogs.',
  },
  {
    specifier: 'symbiote-node/layout',
    kind: 'ssr-safe',
    description: 'Layout tree, section registry, and router helpers without browser components.',
  },
  {
    specifier: 'symbiote-node/xr',
    kind: 'ssr-safe',
    description: 'WebXR capability, spatial layout projection, and XR pointer helpers without renderer lock-in.',
  },
  {
    specifier: 'symbiote-node/ui',
    kind: 'browser',
    description: 'Browser Web Components, layout modules, themes, router helpers, chat, navigation, and display modules.',
  },
  {
    specifier: 'symbiote-node/display/highlight',
    kind: 'node-safe',
    description: 'Syntax highlighting and markdown rendering helpers.',
  },
  {
    specifier: 'symbiote-node/display/markdown-formatter',
    kind: 'node-safe',
    description: 'Markdown formatting helpers shared by chat and host applications.',
  },
  {
    specifier: 'symbiote-node/display/network-approval-page',
    kind: 'node-safe',
    description: 'Autonomous provider-themed network approval page renderer for pre-app browser authorization.',
  },
  {
    specifier: 'symbiote-node/custom-elements.json',
    kind: 'metadata',
    description: 'Custom Elements manifest for editor/docs/design-system tooling.',
  },
  {
    specifier: 'symbiote-node/tokens/*',
    kind: 'metadata',
    description: 'Design token JSON files.',
  },
  {
    specifier: 'symbiote-node/rules/*',
    kind: 'metadata',
    description: 'Machine-readable library and Symbiote rules.',
  },
  {
    specifier: 'symbiote-node/schemas/*',
    kind: 'metadata',
    description: 'Graph schema JSON files.',
  },
];

function listPackageExportSubpaths() {
  return Object.keys(PKG.exports || {}).sort().map((subpath) => {
    let target = PKG.exports[subpath];
    let importTarget = typeof target === 'string' ? target : target?.import || target?.default || null;
    return {
      subpath,
      specifier: subpath === '.' ? PKG.name : `${PKG.name}/${subpath.replace(/^\.\//, '')}`,
      target: importTarget,
    };
  });
}


/**
 * Parse CLI arguments into command and options
 * @param {string[]} argv
 * @returns {{command: string, target: string, options: Record<string, string|boolean>}}
 */
function parseArgs(argv) {
  let args = argv.slice(2);
  let command = args[0];
  let target = '';
  /** @type {Record<string, string|boolean>} */
  let options = {};

  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      let key = args[i].slice(2);
      let next = args[i + 1];
      if (next && !next.startsWith('--')) {
        options[key] = next;
        i++;
      } else {
        options[key] = true;
      }
    } else if (!target) {
      target = args[i];
    }
  }

  return { command, target, options };
}


/**
 * Load secrets from JSON file
 * @param {string} [secretsPath]
 * @returns {Promise<Record<string, string>>}
 */
async function loadSecrets(secretsPath) {
  if (!secretsPath) {

    let defaultPath = resolve(process.cwd(), 'secrets.json');
    try {
      let data = await readFile(defaultPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  try {
    let data = await readFile(resolve(secretsPath), 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`⚠ Could not load secrets from ${secretsPath}: ${err.message}`);
    return {};
  }
}


/**
 * Load domain packs by name
 * @param {string|string[]} packs
 * @param {Object} [options]
 * @param {boolean} [options.quiet]
 * @returns {Promise<void>}
 */
async function loadPacks(packs, options = {}) {
  let packList = Array.isArray(packs) ? packs : packs.split(',');
  for (const pack of packList) {
    let packName = pack.trim();
    try {
      await import(`./packs/${packName}-pack.js`);
      if (!options.quiet) console.log(`  ✔ Pack loaded: ${packName}`);
    } catch (err) {
      console.error(`  ✖ Failed to load pack "${packName}": ${err.message}`);
      process.exit(1);
    }
  }
}

/**
 * Run a workflow JSON file
 * @param {string} filePath
 * @param {Record<string, string|boolean>} options
 * @returns {Promise<object>}
 */
async function cmdRun(filePath, options) {
  let verbose = !!options.verbose;
  let json = !!options.json;

  if (options.pack) {
    await loadPacks(/** @type {string} */ (options.pack), { quiet: json });
  }


  if (options.handlers) {
    let dir = resolve(/** @type {string} */ (options.handlers));
    let types = await loadHandlers(dir);
    if (verbose && !json) console.log(`  🔧 Loaded ${types.length} handler(s) from ${options.handlers}`);
  }


  let secrets = await loadSecrets(/** @type {string|undefined} */ (options.secrets));
  if (Object.keys(secrets).length > 0 && verbose && !json) {
    console.log(`  🔑 Secrets loaded: ${Object.keys(secrets).join(', ')}`);
  }


  let raw = await readFile(resolve(filePath), 'utf-8');
  let workflowData = JSON.parse(raw);

  if (!json) {
    console.log(`\n🚀 symbiote-node run: ${filePath}\n`);
    console.log(`  📄 Workflow: ${workflowData.name || workflowData.id}`);
    console.log(`  📊 Nodes: ${workflowData.nodes?.length || 0}`);
    console.log(`  🔗 Connections: ${workflowData.connections?.length || 0}`);
    console.log();
  }


  let graph = deserialize(raw);


  let executor = new Executor();
  let t0 = performance.now();

  try {
    let result = await executor.run(graph, {
      cache: workflowData.execution?.cache,
      secrets,
    });

    let elapsed = (performance.now() - t0).toFixed(1);

    let jsonResult = {
      command: 'run',
      file: filePath,
      success: true,
      durationMs: parseFloat(elapsed),
      workflowName: workflowData.name || workflowData.id || null,
      nodeCount: result.executionOrder.length,
      executionOrder: result.executionOrder,
      outputs: result.outputs,
      log: result.log.map((entry) => ({
        nodeId: entry.nodeId,
        nodeName: graph.getNode(entry.nodeId)?.name || entry.nodeId,
        timeMs: entry.time,
        skipped: entry.skipped || false,
      })),
    };

    if (json) return jsonResult;

    console.log(`  ✔ Execution complete in ${elapsed}ms`);
    console.log(`  📋 Execution order: ${result.executionOrder.length} nodes`);

    if (verbose) {
      console.log('\n  Execution log:');
      for (const entry of result.log) {
        let status = entry.skipped ? '⏭ skipped' : `✔ ${entry.time.toFixed(2)}ms`;
        let nodeData = graph.getNode(entry.nodeId);
        console.log(`    ${nodeData?.name || entry.nodeId}: ${status}`);
      }

      console.log('\n  Outputs:');
      for (const [nodeId, output] of Object.entries(result.outputs)) {
        let nodeData = graph.getNode(nodeId);
        console.log(
          `    ${nodeData?.name || nodeId}:`,
          JSON.stringify(output, null, 2).slice(0, 200)
        );
      }
    }


    let outputNodes = result.executionOrder.filter((id) => {
      let node = graph.getNode(id);
      return node?.type?.startsWith('output/');
    });

    if (outputNodes.length > 0) {
      console.log(`\n  Output nodes:`);
      for (const id of outputNodes) {
        let node = graph.getNode(id);
        console.log(`    → ${node.name || node.type} (${id})`);
      }
    }

    console.log(`\n✅ Done\n`);

    return jsonResult;
  } catch (err) {
    let elapsed = (performance.now() - t0).toFixed(1);

    let jsonError = {
      command: 'run',
      file: filePath,
      success: false,
      durationMs: parseFloat(elapsed),
      error: err.message,
    };

    if (json) return jsonError;

    console.error(`\n  ✖ Execution failed after ${elapsed}ms: ${err.message}\n`);
    process.exit(1);
  }
}

/**
 * Validate a workflow JSON file without executing
 * @param {string} filePath
 * @param {Record<string, string|boolean>} options
 * @returns {Promise<object>}
 */
async function cmdValidate(filePath, options) {
  let json = !!options.json;
  if (!json) console.log(`\n🔍 symbiote-node validate: ${filePath}\n`);
  if (options.pack) {
    await loadPacks(/** @type {string} */ (options.pack), { quiet: json });
  }

  if (options.handlers) {
    let dir = resolve(/** @type {string} */ (options.handlers));
    await loadHandlers(dir);
  }

  let raw = await readFile(resolve(filePath), 'utf-8');
  let data = JSON.parse(raw);

  let errors = [];
  let warnings = [];


  for (const node of data.nodes || []) {
    let typeDef = getNodeType(node.type);
    if (!typeDef) {
      errors.push({ nodeId: node.id, type: node.type, message: `Unknown node type` });
      continue;
    }


    let validation = validateParams(node.type, node.params || {});
    if (!validation.valid) {
      for (const err of validation.errors) {
        errors.push({ nodeId: node.id, type: node.type, message: err });
      }
    }
  }


  let nodeIds = new Set((data.nodes || []).map((n) => n.id));
  for (const conn of data.connections || []) {
    if (!nodeIds.has(conn.from)) {
      errors.push({ kind: 'connection', from: conn.from, message: 'Unknown source node' });
    }
    if (!nodeIds.has(conn.to)) {
      errors.push({ kind: 'connection', to: conn.to, message: 'Unknown target node' });
    }
  }


  let connectedNodes = new Set();
  for (const conn of data.connections || []) {
    connectedNodes.add(conn.from);
    connectedNodes.add(conn.to);
  }
  for (const node of data.nodes || []) {
    if (!connectedNodes.has(node.id)) {
      warnings.push({ nodeId: node.id, type: node.type, message: 'Orphan node' });
    }
  }

  let errorCount = errors.length;
  let warningCount = warnings.length;

  let jsonResult = {
    command: 'validate',
    file: filePath,
    valid: errorCount === 0,
    errors,
    warnings,
    errorCount,
    warningCount,
  };

  if (json) return jsonResult;

  for (const err of errors) {
    console.error(`  ✖ ${err.nodeId || err.from || ''} (${err.type || ''}): ${err.message}`);
  }
  for (const warn of warnings) {
    console.warn(`  ⚠ ${warn.nodeId} (${warn.type}): ${warn.message}`);
  }

  console.log();
  if (errorCount === 0) {
    console.log(`  ✅ Valid (${warningCount} warning${warningCount !== 1 ? 's' : ''})\n`);
  } else {
    console.error(
      `  ❌ ${errorCount} error${errorCount !== 1 ? 's' : ''}, ${warningCount} warning${warningCount !== 1 ? 's' : ''}\n`
    );
    process.exit(1);
  }

  return jsonResult;
}

/**
 * List all registered node types
 * @param {Record<string, string|boolean>} options
 * @returns {Promise<object>}
 */
async function cmdList(options) {
  let json = !!options.json;
  if (!json) console.log(`\n📋 symbiote-node node types\n`);
  if (options.pack) {
    await loadPacks(/** @type {string} */ (options.pack), { quiet: json });
  }

  if (options.handlers) {
    let dir = resolve(/** @type {string} */ (options.handlers));
    await loadHandlers(dir);
  }

  let menu = getNodeMenu();
  let drivers = listDrivers();
  let total = drivers.length;

  let jsonResult = {
    command: 'list',
    total,
    categories: menu.map((group) => ({
      category: group.category,
      nodes: group.nodes.map((node) => {
        let typeDef = getNodeType(node.type);
        return {
          type: node.type,
          icon: node.icon,
          description: node.description,
          inputCount: typeDef?.driver.inputs?.length || 0,
          outputCount: typeDef?.driver.outputs?.length || 0,
        };
      }),
    })),
    drivers: drivers.map((d) => ({
      type: d.type,
      category: d.category,
      icon: d.icon,
      inputs: (d.driver.inputs || []).map((inp) => ({ name: inp.name, type: inp.type, label: inp.label })),
      outputs: (d.driver.outputs || []).map((out) => ({ name: out.name, type: out.type, label: out.label })),
      description: d.driver.description,
      params: Object.entries(d.driver.params || {}).map(([name, p]) => ({ name, type: p.type, required: p.required, default: p.default })),
    })),
  };

  if (json) return jsonResult;

  for (const group of menu) {
    console.log(`  ═══ ${group.category.toUpperCase()} ═══`);
    for (const node of group.nodes) {
      let typeDef = getNodeType(node.type);
      let ins = typeDef?.driver.inputs?.length || 0;
      let outs = typeDef?.driver.outputs?.length || 0;
      console.log(`    ${node.type}  [${ins}→${outs}]  ${node.description || ''}`);
    }
    console.log();
  }

  console.log(`  Total: ${total} node types\n`);

  return jsonResult;
}

/**
 * Inspect a workflow — show structure without executing
 * @param {string} filePath
 * @param {Object} [options]
 * @returns {Promise<object>}
 */
async function cmdInspect(filePath, options = {}) {
  let json = !!options.json;
  if (!json) console.log(`\n🔎 symbiote-node inspect: ${filePath}\n`);
  let raw = await readFile(resolve(filePath), 'utf-8');
  let data = JSON.parse(raw);

  let nodes = (data.nodes || []).map((node) => ({
    id: node.id,
    type: node.type,
    name: node.name || null,
    params: node.params || {},
    paramKeys: Object.keys(node.params || {}),
  }));

  let connections = (data.connections || []).map((conn) => ({
    from: conn.from,
    out: conn.out,
    to: conn.to,
    in: conn.in,
  }));

  let jsonResult = {
    command: 'inspect',
    file: filePath,
    name: data.name || null,
    id: data.id || null,
    version: data.version || null,
    nodeCount: nodes.length,
    connectionCount: connections.length,
    nodes,
    connections,
    execution: data.execution || null,
  };

  if (json) return jsonResult;

  console.log(`  Name: ${data.name || '(unnamed)'}`);
  console.log(`  ID: ${data.id || '(none)'}`);
  console.log(`  Version: ${data.version || '(none)'}`);
  console.log();


  console.log(`  Nodes (${data.nodes?.length || 0}):`);
  for (const node of data.nodes || []) {
    let paramKeys = Object.keys(node.params || {});
    let paramStr = paramKeys.length > 0 ? ` {${paramKeys.join(', ')}}` : '';
    console.log(`    ${node.id}  [${node.type}]  ${node.name || ''}${paramStr}`);
  }


  console.log(`\n  Connections (${data.connections?.length || 0}):`);
  for (const conn of data.connections || []) {
    console.log(`    ${conn.from}.${conn.out} → ${conn.to}.${conn.in}`);
  }


  if (data.execution) {
    console.log(`\n  Execution: mode=${data.execution.mode}, cache=${data.execution.cache}`);
  }

  console.log();

  return jsonResult;
}

/**
 * Discover — expose manifests, rules, themes, schemas, and registry for agents.
 * Always outputs machine-readable JSON.
 * @param {Object} [options]
 * @returns {Promise<object>}
 */
async function cmdDiscover(options = {}) {
  if (options.pack) {
    await loadPacks(/** @type {string} */ (options.pack), { quiet: true });
  }

  if (options.handlers) {
    let dir = resolve(/** @type {string} */ (options.handlers));
    await loadHandlers(dir);
  }

  let drivers = listDrivers();
  let menu = getNodeMenu();
  let socketTypes = getAllSocketTypes();
  let packs = listPacks();

  let data = {
    command: 'discover',
    package: {
      name: PKG.name,
      version: PKG.version,
      description: PKG.description,
    },
    exports: {
      subpaths: listPackageExportSubpaths(),
      entrypoints: EXPORT_ENTRYPOINTS,
    },
    registry: {
      totalDrivers: drivers.length,
      drivers: drivers.map((d) => ({
        type: d.type,
        category: d.category,
        icon: d.icon,
        inputs: (d.driver.inputs || []).map((inp) => ({ name: inp.name, type: inp.type, label: inp.label })),
        outputs: (d.driver.outputs || []).map((out) => ({ name: out.name, type: out.type, label: out.label })),
        description: d.driver.description,
        params: Object.entries(d.driver.params || {}).map(([name, p]) => ({ name, type: p.type, required: p.required, default: p.default })),
      })),
      menu: menu.map((group) => ({
        category: group.category,
        nodes: group.nodes,
      })),
      packs,
    },
    socketTypes: [...socketTypes.entries()].map(([name, s]) => ({
      name,
      label: s.label || name,
      color: s.color || null,
      description: s.description || null,
    })),
    manifest: {
      localization: {
        defaultLocale: DEFAULT_LOCALE,
        supportedLocales: [...SUPPORTED_LOCALES],
        autoDetection: 'browser-navigator-languages',
        catalogKeys: [...LOCALE_CATALOG_KEYS],
      },
      renderers: [
        HTML_IN_CANVAS_RENDERER,
        WEBXR_RENDERER,
        XR_THREE_WEBXR_ADAPTER,
      ],
      components: listComponents().map((c) => ({
        tagName: c.tagName,
        className: c.className,
        module: c.module,
        specifier: c.specifier,
        exportName: c.exportName,
        importKind: c.importKind,
        category: c.category,
        description: c.description,
        contract: c.contract || null,
      })),
      themes: THEME_NAMES.map((name) => ({
        name,
        ...getTheme(name),
        tokens: getThemeTokens(name),
      })),
      themeRuleBlocks: listThemeRuleBlocks(),
      themeControls: Object.fromEntries(THEME_NAMES.map((name) => [name, getThemeControls(name)])),
      themeElementGroups: listThemeElementGroups(),
      themeRecipes: THEME_NAMES.map((name) => getThemeRecipe(name)).filter(Boolean),
      tokenFiles: listTokenFiles(),
      rulesets: RULESETS.map((rs) => ({
        name: rs.name,
        version: rs.version,
        path: rs.path,
        description: rs.description,
        rules: listRules({ ruleset: rs.name }),
      })),
      rules: listRules(),
      schemas: [
        ...listGraphSchemas(),
        ...listProjectSchemas(),
        ...UI_SCHEMA_VERSIONS.map((sv) => ({
          version: sv.version,
          path: sv.path,
          description: sv.description,
          ...getUiSchema(sv.version),
        })),
      ],
    },
  };

  return data;
}


const HELP = `
symbiote-node CLI — Universal node-based workflow runner
Commands:
  run <file.workflow.json>       Execute a workflow
  validate <file.workflow.json>  Validate without executing
  list                           List all registered node types
  inspect <file.workflow.json>   Show workflow structure
  discover                       Output machine-readable registry + manifests (for agents)
  serve <file.workflow.json>     Start WebSocket + HTTP server

Options:
  --json             Output machine-readable JSON (run, validate, list, inspect)
  --pack <name>      Load domain pack (e.g. "custom")
  --handlers <dir>   Load handler files from directory
  --secrets <path>   Path to secrets.json
  --port <number>    Server port (default: 3100)
  --verbose          Show detailed execution log
`;

let cliMap = {
  run: async () => {
    if (!target) {
      console.error('Usage: symbiote-node run <file.workflow.json>');
      process.exit(1);
    }
    let result = await cmdRun(target, options);
    if (options.json && result) {
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      if (!result.success) process.exit(1);
    }
    return result;
  },
  validate: async () => {
    if (!target) {
      console.error('Usage: symbiote-node validate <file.workflow.json>');
      process.exit(1);
    }
    let result = await cmdValidate(target, options);
    if (options.json && result) {
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      if (!result.valid) process.exit(1);
    }
    return result;
  },
  list: async () => {
    let result = await cmdList(options);
    if (options.json && result) {
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    }
    return result;
  },
  inspect: async () => {
    if (!target) {
      console.error('Usage: symbiote-node inspect <file.workflow.json>');
      process.exit(1);
    }
    let result = await cmdInspect(target, options);
    if (options.json && result) {
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    }
    return result;
  },
  discover: async () => {
    let result = await cmdDiscover(options);
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    return result;
  },
  serve: async () => {
    let port = parseInt(options.port) || 3100;
    let { createServer } = await import('./GraphServer.js');
    await createServer({
      port,
      workflowFile: target,
      handlersDir: options.handlers ? resolve(options.handlers) : undefined,
      watchFiles: true,
      verbose: !!options.verbose,
    });
  },
};

let { command, target, options } = parseArgs(process.argv);

let handler = cliMap[command];


export { cmdRun, cmdValidate, cmdList, cmdInspect, cmdDiscover, parseArgs };

let isMain = fileURLToPath(import.meta.url) === process.argv[1];

if (isMain && handler) {
  await handler();
} else if (isMain) {
  console.log(HELP);
  if (command && command !== '--help' && command !== '-h') process.exit(1);
}
