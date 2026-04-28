/**
 * GraphServer.js - WebSocket + HTTP server for symbiote-node *
 * Provides real-time graph synchronization between server and UI clients.
 * Supports file-based workflow watching, handler hot-reload, and server-side execution.
 *
 * Protocol messages follow SPEC.md P23 Agent Bridge specification.
 *
 * @module symbiote-node/GraphServer */

import { createServer as createHttpServer } from 'node:http';
import { readFile, writeFile, watch as fsWatch } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { WebSocketServer } from 'ws';

import { Graph } from './Graph.js';
import { Executor } from './Executor.js';
import { getNodeType, listDrivers } from './Registry.js';
import { loadHandlers, watchHandlers } from './HandlerLoader.js';

/**
 * @typedef {object} ServerOptions
 * @property {number} [port=3100] - HTTP/WebSocket port
 * @property {string} [handlersDir] - Directory for .handler.js files
 * @property {string} [workflowFile] - Path to .workflow.json
 * @property {boolean} [watchFiles=true] - Enable file watching
 * @property {boolean} [verbose=false] - Verbose logging
 */

/**
 * Create an symbiote-node server instance * @param {ServerOptions} options
 * @returns {Promise<{server: import('http').Server, wss: WebSocketServer, graph: Graph, close: () => Promise<void>}>}
 */
export async function createServer(options = {}) {
  let {
    port = 3100,
    handlersDir,
    workflowFile,
    watchFiles = true,
    verbose = false,
  } = options;

  let graph = new Graph();
  let executor = new Executor();
  let watchers = [];
  let log = verbose ? console.log.bind(console) : () => { };

  // Load initial workflow
  if (workflowFile) {
    try {
      let json = await readFile(resolve(workflowFile), 'utf-8');
      let data = JSON.parse(json);
      graph = deserialize(data);
      log(`📄 Loaded workflow: ${workflowFile} (${graph.nodes.size} nodes)`);
    } catch (err) {
      log(`⚠️  Could not load workflow: ${err.message}`);
    }
  }

  // Load handler files
  if (handlersDir) {
    let dir = resolve(handlersDir);
    let registered = await loadHandlers(dir);
    log(`🔧 Loaded ${registered.length} handler(s) from ${handlersDir}`);

    if (watchFiles) {
      let stopWatch = watchHandlers(dir, (type) => {
        log(`♻️  Handler reloaded: ${type}`);
        broadcast({ type: 'registry:add', payload: { type, category: type.split('/')[0] } });
      });
      watchers.push(stopWatch);
    }
  }

  // ─── HTTP Server ────────────────────────────────────

  let httpServer = createHttpServer(async (req, res) => {
    let url = new URL(req.url, `http://localhost:${port}`);

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    try {
      if (url.pathname === '/api/graph' && req.method === 'GET') {
        let data = graph.toJSON();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
        return;
      }

      if (url.pathname === '/api/graph' && req.method === 'POST') {
        let body = await readBody(req);
        let data = JSON.parse(body);
        graph = new Graph();
        graph.fromJSON(data);
        broadcast({ type: 'graph:update', payload: graph.toJSON() });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      if (url.pathname === '/api/graph/execute' && req.method === 'POST') {
        await executeGraph(res);
        return;
      }

      if (url.pathname === '/api/registry' && req.method === 'GET') {
        let drivers = listDrivers();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(drivers));
        return;
      }

      // Health check
      if (url.pathname === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', nodes: graph.nodes.size }));
        return;
      }

      res.writeHead(404);
      res.end('Not Found');
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });

  // ─── WebSocket Server ────────────────────────────────

  let wss = new WebSocketServer({ server: httpServer });
  /** @type {Set<import('ws').WebSocket>} */
  let clients = new Set();

  wss.on('connection', (ws) => {
    clients.add(ws);
    log(`🔌 Client connected (${clients.size} total)`);

    // Send current state on connect
    ws.send(JSON.stringify({ type: 'graph:update', payload: graph.toJSON() }));

    ws.on('message', async (data) => {
      try {
        let msg = JSON.parse(data.toString());
        await handleWsMessage(msg, ws);
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', payload: { message: err.message } }));
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      log(`🔌 Client disconnected (${clients.size} total)`);
    });
  });

  /**
   * Broadcast message to all connected clients
   * @param {object} msg
   * @param {import('ws').WebSocket} [exclude] - Client to exclude
   */
  function broadcast(msg, exclude) {
    let json = JSON.stringify(msg);
    for (const client of clients) {
      if (client !== exclude && client.readyState === 1) {
        client.send(json);
      }
    }
  }

  // ── WS Command Map ─────────────────────────────────
  // cmdMap[type]?.(payload, ws) — one-liner dispatch per BEST-PRACTICES §5

  let UI_PASSTHROUGH = new Set(['ui:layout', 'ui:focus', 'ui:select', 'ui:navigate', 'ui:playback', 'ui:notify', 'ui:cursor']);

  let graphActionMap = {
    addNode: (payload, ws) => {
      let { data } = payload;
      let id = graph.addNode(data.type, data.params, data.options);
      broadcast({ type: 'graph:update', payload: graph.toJSON() }, ws);
      ws.send(JSON.stringify({ type: 'graph:actionResult', payload: { action: 'addNode', nodeId: id } }));
    },
    removeNode: (payload, ws) => {
      graph.removeNode(payload.nodeId);
      broadcast({ type: 'graph:update', payload: graph.toJSON() }, ws);
    },
    connect: (payload, ws) => {
      let { from, out, to, in: inp } = payload.data;
      graph.connect(from, out, to, inp);
      broadcast({ type: 'graph:update', payload: graph.toJSON() }, ws);
    },
    updateParams: (payload, ws) => {
      graph.updateParams(payload.nodeId, payload.data.params);
      broadcast({ type: 'graph:update', payload: graph.toJSON() }, ws);
    },
    execute: async () => {
      await executeAndStream();
    },
  };

  let cmdMap = {
    'graph:action': (payload, ws) => {
      let handler = graphActionMap[payload.action];
      if (handler) return handler(payload, ws);
      ws.send(JSON.stringify({ type: 'error', payload: { message: `Unknown action: ${payload.action}` } }));
    },
  };

  /**
   * Handle incoming WebSocket message
   * @param {{type: string, payload: object}} msg
   * @param {import('ws').WebSocket} ws
   */
  async function handleWsMessage(msg, ws) {
    let { type, payload } = msg;

    // UI passthrough — forward to all other clients
    if (UI_PASSTHROUGH.has(type)) {
      broadcast(msg, ws);
      return;
    }

    let handler = cmdMap[type];
    if (handler) return handler(payload, ws);

    ws.send(JSON.stringify({ type: 'error', payload: { message: `Unknown message type: ${type}` } }));
  }

  /**
   * Execute graph and stream progress via WebSocket
   */
  async function executeAndStream() {
    let result = await executor.run(graph, {
      onNodeStart: (nodeId) => {
        broadcast({ type: 'node:progress', payload: { nodeId, progress: 0, phase: 'start' } });
      },
      onNodeComplete: (nodeId, output, timeMs) => {
        let cached = !!(output && output._fromCache);
        broadcast({ type: 'node:result', payload: { nodeId, status: 'done', cached, timeMs } });
      },
      onNodeSkipped: (nodeId) => {
        broadcast({ type: 'node:result', payload: { nodeId, status: 'skipped' } });
      },
    });

    broadcast({ type: 'graph:executed', payload: { totalTime: result.totalTime, log: result.log } });

    // Save to workflow file if configured
    if (workflowFile) {
      try {
        await writeFile(resolve(workflowFile), JSON.stringify(graph.toJSON(), null, 2));
      } catch (err) {
        log(`⚠️  Could not save workflow: ${err.message}`);
      }
    }

    return result;
  }

  /**
   * Execute graph via HTTP and return result
   * @param {import('http').ServerResponse} res
   */
  async function executeGraph(res) {
    try {
      let result = await executeAndStream();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        totalTime: result.totalTime,
        outputs: result.outputs,
        log: result.log,
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  }

  // ─── File Watching ────────────────────────────────

  if (watchFiles && workflowFile) {
    let wfPath = resolve(workflowFile);
    let debounce = null;
    let ac = new AbortController();

    (async () => {
      try {
        let watcher = fsWatch(wfPath, { signal: ac.signal });
        for await (const event of watcher) {
          if (debounce) clearTimeout(debounce);
          debounce = setTimeout(async () => {
            try {
              let json = await readFile(wfPath, 'utf-8');
              let data = JSON.parse(json);
              graph = deserialize(data);
              broadcast({ type: 'graph:update', payload: data });
              log(`📄 Workflow reloaded: ${workflowFile}`);
            } catch (err) {
              log(`⚠️  Workflow reload error: ${err.message}`);
            }
          }, 200);
        }
      } catch (err) {
        if (err.name !== 'AbortError') log(`⚠️  Workflow watch error: ${err.message}`);
      }
    })();

    watchers.push(() => ac.abort());
  }

  // ─── Start & Close ────────────────────────────────

  await new Promise((resolve) => httpServer.listen(port, resolve));
  log(`🚀 symbiote-node server on http://localhost:${port}`);
  async function close() {
    for (const stop of watchers) {
      if (typeof stop === 'function') stop();
    }
    for (const client of clients) {
      client.close();
    }
    wss.close();
    await new Promise((resolve) => httpServer.close(resolve));
    log('🛑 Server stopped');
  }

  return { server: httpServer, wss, graph, executor, broadcast, close };
}

/**
 * Read HTTP request body
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<string>}
 */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}
