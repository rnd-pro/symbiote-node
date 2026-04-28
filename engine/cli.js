#!/usr/bin/env node

/**
 * cli.js - AGI-Graph command-line runner
 *
 * Execute, validate, and inspect workflow JSON files.
 *
 * Usage:
 *   node symbiote-node/cli.js run <workflow.json> [--pack custom] [--secrets secrets.json] [--verbose]
 *   node symbiote-node/cli.js validate <workflow.json> [--pack custom]
 *   node symbiote-node/cli.js list [--pack custom]
 *   node symbiote-node/cli.js inspect <workflow.json>
 *
 * @module symbiote-node/cli */

import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

import {
  Graph,
  Executor,
  listDrivers,
  getNodeType,
  findCompatible,
  getNodeMenu,
  validateParams,
  deserialize,
  clearRegistry,
  loadHandlers,
  createServer,
} from './index.js';

let __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Argument Parsing ────────────────────────────────────────────────────────

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

// ─── Secrets Loader ──────────────────────────────────────────────────────────

/**
 * Load secrets from JSON file
 * @param {string} [secretsPath]
 * @returns {Promise<Record<string, string>>}
 */
async function loadSecrets(secretsPath) {
  if (!secretsPath) {
    // Try default location
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

// ─── Pack Loader ─────────────────────────────────────────────────────────────

/**
 * Load domain packs by name
 * @param {string|string[]} packs
 */
async function loadPacks(packs) {
  let packList = Array.isArray(packs) ? packs : packs.split(',');
  for (const pack of packList) {
    let packName = pack.trim();
    try {
      await import(`./packs/${packName}-pack.js`);
      console.log(`  ✔ Pack loaded: ${packName}`);
    } catch (err) {
      console.error(`  ✖ Failed to load pack "${packName}": ${err.message}`);
      process.exit(1);
    }
  }
}

// ─── Commands ────────────────────────────────────────────────────────────────

/**
 * Run a workflow JSON file
 * @param {string} filePath
 * @param {Record<string, string|boolean>} options
 */
async function cmdRun(filePath, options) {
  let verbose = !!options.verbose;
  console.log(`\n🚀 symbiote-node run: ${filePath}\n`);
  // Load packs
  if (options.pack) {
    await loadPacks(/** @type {string} */(options.pack));
  }

  // Load handler files
  if (options.handlers) {
    let dir = resolve(/** @type {string} */(options.handlers));
    let types = await loadHandlers(dir);
    if (verbose) console.log(`  🔧 Loaded ${types.length} handler(s) from ${options.handlers}`);
  }

  // Load secrets
  let secrets = await loadSecrets(/** @type {string|undefined} */(options.secrets));
  if (Object.keys(secrets).length > 0 && verbose) {
    console.log(`  🔑 Secrets loaded: ${Object.keys(secrets).join(', ')}`);
  }

  // Load workflow
  let raw = await readFile(resolve(filePath), 'utf-8');
  let workflowData = JSON.parse(raw);

  console.log(`  📄 Workflow: ${workflowData.name || workflowData.id}`);
  console.log(`  📊 Nodes: ${workflowData.nodes?.length || 0}`);
  console.log(`  🔗 Connections: ${workflowData.connections?.length || 0}`);
  console.log();

  // Deserialize into Graph
  let graph = deserialize(raw);

  // Execute
  let executor = new Executor();
  let t0 = performance.now();

  try {
    let result = await executor.run(graph, {
      cache: workflowData.execution?.cache,
      secrets,
    });

    let elapsed = (performance.now() - t0).toFixed(1);
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
        console.log(`    ${nodeData?.name || nodeId}:`, JSON.stringify(output, null, 2).slice(0, 200));
      }
    }

    // Summary
    let outputNodes = result.executionOrder.filter(id => {
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

  } catch (err) {
    let elapsed = (performance.now() - t0).toFixed(1);
    console.error(`\n  ✖ Execution failed after ${elapsed}ms: ${err.message}\n`);
    process.exit(1);
  }
}

/**
 * Validate a workflow JSON file without executing
 * @param {string} filePath
 * @param {Record<string, string|boolean>} options
 */
async function cmdValidate(filePath, options) {
  console.log(`\n🔍 symbiote-node validate: ${filePath}\n`);
  if (options.pack) {
    await loadPacks(/** @type {string} */(options.pack));
  }

  if (options.handlers) {
    let dir = resolve(/** @type {string} */(options.handlers));
    await loadHandlers(dir);
  }

  let raw = await readFile(resolve(filePath), 'utf-8');
  let data = JSON.parse(raw);

  let errors = 0;
  let warnings = 0;

  // Check all node types exist
  for (const node of (data.nodes || [])) {
    let typeDef = getNodeType(node.type);
    if (!typeDef) {
      console.error(`  ✖ Unknown node type: ${node.type} (node: ${node.id})`);
      errors++;
      continue;
    }

    // Validate params
    let validation = validateParams(node.type, node.params || {});
    if (!validation.valid) {
      for (const err of validation.errors) {
        console.error(`  ✖ ${node.id} (${node.type}): ${err}`);
        errors++;
      }
    }
  }

  // Check connections reference valid nodes
  let nodeIds = new Set((data.nodes || []).map(n => n.id));
  for (const conn of (data.connections || [])) {
    if (!nodeIds.has(conn.from)) {
      console.error(`  ✖ Connection references unknown source node: ${conn.from}`);
      errors++;
    }
    if (!nodeIds.has(conn.to)) {
      console.error(`  ✖ Connection references unknown target node: ${conn.to}`);
      errors++;
    }
  }

  // Check for nodes with no connections (orphans)
  let connectedNodes = new Set();
  for (const conn of (data.connections || [])) {
    connectedNodes.add(conn.from);
    connectedNodes.add(conn.to);
  }
  for (const node of (data.nodes || [])) {
    if (!connectedNodes.has(node.id)) {
      console.warn(`  ⚠ Orphan node: ${node.id} (${node.type})`);
      warnings++;
    }
  }

  console.log();
  if (errors === 0) {
    console.log(`  ✅ Valid (${warnings} warning${warnings !== 1 ? 's' : ''})\n`);
  } else {
    console.error(`  ❌ ${errors} error${errors !== 1 ? 's' : ''}, ${warnings} warning${warnings !== 1 ? 's' : ''}\n`);
    process.exit(1);
  }
}

/**
 * List all registered node types
 * @param {Record<string, string|boolean>} options
 */
async function cmdList(options) {
  console.log(`\n📋 symbiote-node node types\n`);
  if (options.pack) {
    await loadPacks(/** @type {string} */(options.pack));
  }

  if (options.handlers) {
    let dir = resolve(/** @type {string} */(options.handlers));
    await loadHandlers(dir);
  }

  let menu = getNodeMenu();
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

  let total = listDrivers().length;
  console.log(`  Total: ${total} node types\n`);
}

/**
 * Inspect a workflow — show structure without executing
 * @param {string} filePath
 */
async function cmdInspect(filePath) {
  console.log(`\n🔎 symbiote-node inspect: ${filePath}\n`);
  let raw = await readFile(resolve(filePath), 'utf-8');
  let data = JSON.parse(raw);

  console.log(`  Name: ${data.name || '(unnamed)'}`);
  console.log(`  ID: ${data.id || '(none)'}`);
  console.log(`  Version: ${data.version || '(none)'}`);
  console.log();

  // Nodes
  console.log(`  Nodes (${data.nodes?.length || 0}):`);
  for (const node of (data.nodes || [])) {
    let paramKeys = Object.keys(node.params || {});
    let paramStr = paramKeys.length > 0 ? ` {${paramKeys.join(', ')}}` : '';
    console.log(`    ${node.id}  [${node.type}]  ${node.name || ''}${paramStr}`);
  }

  // Connections
  console.log(`\n  Connections (${data.connections?.length || 0}):`);
  for (const conn of (data.connections || [])) {
    console.log(`    ${conn.from}.${conn.out} → ${conn.to}.${conn.in}`);
  }

  // Execution
  if (data.execution) {
    console.log(`\n  Execution: mode=${data.execution.mode}, cache=${data.execution.cache}`);
  }

  console.log();
}

// ─── Main ────────────────────────────────────────────────────────────────────

const HELP = `
symbiote-node CLI — Universal node-based workflow runner
Commands:
  run <file.workflow.json>       Execute a workflow
  validate <file.workflow.json>  Validate without executing
  list                           List all registered node types
  inspect <file.workflow.json>   Show workflow structure
  serve <file.workflow.json>     Start WebSocket + HTTP server

Options:
  --pack <name>      Load domain pack (e.g. "custom")  --handlers <dir>   Load handler files from directory
  --secrets <path>   Path to secrets.json
  --port <number>    Server port (default: 3100)
  --verbose          Show detailed execution log
`;

let { command, target, options } = parseArgs(process.argv);

let cliMap = {
  run: async () => {
    if (!target) { console.error('Usage: symbiote-node run <file.workflow.json>'); process.exit(1); }
    await cmdRun(target, options);
  },
  validate: async () => {
    if (!target) { console.error('Usage: symbiote-node validate <file.workflow.json>'); process.exit(1); }
    await cmdValidate(target, options);
  },
  list: async () => {
    await cmdList(options);
  },
  inspect: async () => {
    if (!target) { console.error('Usage: symbiote-node inspect <file.workflow.json>'); process.exit(1); }
    await cmdInspect(target);
  },
  serve: async () => {
    let port = parseInt(options.port) || 3100;
    await createServer({
      port,
      workflowFile: target,
      handlersDir: options.handlers ? resolve(options.handlers) : undefined,
      watchFiles: true,
      verbose: !!options.verbose,
    });
  },
};

let handler = cliMap[command];
if (handler) {
  await handler();
} else {
  console.log(HELP);
}

