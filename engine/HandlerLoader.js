/**
 * HandlerLoader.js - File-based node handler loader
 *
 * Scans directories for .handler.js files and registers them
 * as node types. Supports hot reload via fs.watch.
 *
 * Handler file convention:
 *   export default {
 *     type: 'category/name',
 *     category: 'category',
 *     icon: 'icon_name',
 *     driver: { inputs, outputs, params, ... },
 *     lifecycle: { validate, cacheKey, execute, postProcess },
 *   };
 *
 * @module symbiote-node/HandlerLoader */

import { readdir, stat } from 'node:fs/promises';
import { join, relative, extname } from 'node:path';
import { watch } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { registerNodeType } from './Registry.js';

/**
 * Recursively find all .handler.js files in a directory
 * @param {string} dir - Directory to scan
 * @returns {Promise<string[]>} Absolute file paths
 */
async function findHandlerFiles(dir) {
  const results = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await findHandlerFiles(fullPath);
      results.push(...nested);
    } else if (entry.name.endsWith('.handler.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Load a single handler file and register it
 * @param {string} filePath - Absolute path to .handler.js file
 * @returns {Promise<string|null>} Registered type name or null on error
 */
async function loadHandler(filePath) {
  const fileUrl = pathToFileURL(filePath).href;
  // Cache-bust for hot reload
  const url = `${fileUrl}?t=${Date.now()}`;

  const module = await import(url);
  const handler = module.default;

  if (!handler?.type) {
    throw new Error(`Handler file ${filePath} missing 'type' field in default export`);
  }

  // Build node type definition from handler
  const nodeDef = {
    type: handler.type,
    category: handler.category || handler.type.split('/')[0],
    icon: handler.icon,
    driver: handler.driver || {},
  };

  // Attach lifecycle hooks if present
  if (handler.lifecycle) {
    nodeDef.lifecycle = handler.lifecycle;
  }

  // Attach process function if present (legacy mode)
  if (handler.process) {
    nodeDef.process = handler.process;
  }

  registerNodeType(nodeDef);
  return handler.type;
}

/**
 * Scan a directory for .handler.js files and register them
 * @param {string} dir - Directory to scan (e.g., 'nodes/')
 * @returns {Promise<string[]>} List of registered type names
 */
export async function loadHandlers(dir) {
  const files = await findHandlerFiles(dir);
  const registered = [];

  for (const file of files) {
    try {
      const type = await loadHandler(file);
      if (type) registered.push(type);
    } catch (err) {
      console.error(`🔴 [symbiote-node] Failed to load handler ${relative(dir, file)}: ${err.message}`);    }
  }

  return registered;
}

/**
 * Watch a directory for new/changed .handler.js files
 * Auto-registers them on change.
 *
 * @param {string} dir - Directory to watch
 * @param {object} [options={}]
 * @param {function} [options.onRegister] - Callback(type, filePath)
 * @param {function} [options.onError] - Callback(filePath, error)
 * @returns {{close: function}} Watcher handle
 */
export function watchHandlers(dir, options = {}) {
  const { onRegister, onError } = options;

  const watcher = watch(dir, { recursive: true }, async (eventType, filename) => {
    if (!filename?.endsWith('.handler.js')) return;

    const filePath = join(dir, filename);

    // Verify file exists (could be a delete event)
    try {
      await stat(filePath);
    } catch {
      return; // File deleted, ignore
    }

    try {
      const type = await loadHandler(filePath);
      if (type && onRegister) onRegister(type, filePath);
    } catch (err) {
      if (onError) onError(filePath, err);
      else console.error(`🔴 [symbiote-node] Watch error for ${filename}: ${err.message}`);    }
  });

  return {
    close: () => watcher.close(),
  };
}
