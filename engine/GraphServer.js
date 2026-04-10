/**
 * GraphServer.js - WebSocket + HTTP server for symbiote-node
 *
 * Provides real-time graph synchronization between server and UI clients.
 * Supports file-based workflow watching, handler hot-reload, and server-side execution.
 *
 * Protocol messages follow SPEC.md P23 Agent Bridge specification.
 *
 * @module symbiote-node/GraphServer
 */

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
 * Create an symbiote-node server instance
 * @param {ServerOptions} options
 * @returns {Promise<{server: import('http').Server, wss: WebSocketServer, graph: Graph, close: () => Promise<void>}>}
 */
export async function createServer(options = {}) {
  const {
    port = 3100,
    handlersDir,
    workflowFile,
    watchFiles = true,
    verbose = false,
  } = options;

  let graph = new Graph();
  const executor = new Executor();
  const watchers = [];
  const log = verbose ? console.log.bind(console) : () => { };

  // Load initial workflow
  if (workflowFile) {
    try {
      const json = await readFile(resolve(workflowFile), 'utf-8');
      const data = JSON.parse(json);
      graph = deserialize(data);
      log(`📄 Loaded workflow: ${workflowFile} (${graph.nodes.size} nodes)`);
    } catch (err) {
      log(`⚠️  Could not load workflow: ${err.message}`);
    }
  }

  // Load handler files
  if (handlersDir) {
    const dir = resolve(handlersDir);
    const registered = await loadHandlers(dir);
    log(`🔧 Loaded ${registered.length} handler(s) from ${handlersDir}`);

    if (watchFiles) {
      const stopWatch = watchHandlers(dir, (type) => {
        log(`♻️  Handler reloaded: ${type}`);
        broadcast({ type: 'registry:add', payload: { type, category: type.split('/')[0] } });
      });
      watchers.push(stopWatch);
    }
  }

  // ─── HTTP Server ────────────────────────────────────

  const httpServer = createHttpServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);

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
        const data = graph.toJSON();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
        return;
      }

      if (url.pathname === '/api/graph' && req.method === 'POST') {
        const body = await readBody(req);
        const data = JSON.parse(body);
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
        const drivers = listDrivers();
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

  const wss = new WebSocketServer({ server: httpServer });
  /** @type {Set<import('ws').WebSocket>} */
  const clients = new Set();

  wss.on('connection', (ws) => {
    clients.add(ws);
    log(`🔌 Client connected (${clients.size} total)`);

    // Send current state on connect
    ws.send(JSON.stringify({ type: 'graph:update', payload: graph.toJSON() }));

    ws.on('message', async (data) => {
      try {
        const msg = JSON.parse(data.toString());
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
    const json = JSON.stringify(msg);
    for (const client of clients) {
      if (client !== exclude && client.readyState === 1) {
        client.send(json);
      }
    }
  }

  /**
   * Handle incoming WebSocket message
   * @param {{type: string, payload: object}} msg
   * @param {import('ws').WebSocket} ws
   */
  async function handleWsMessage(msg, ws) {
    const { type, payload } = msg;

    switch (type) {
      case 'graph:action': {
        const { action, nodeId, data } = payload;

        switch (action) {
          case 'addNode': {
            const id = graph.addNode(data.type, data.params, data.options);
            broadcast({ type: 'graph:update', payload: graph.toJSON() }, ws);
            ws.send(JSON.stringify({ type: 'graph:actionResult', payload: { action, nodeId: id } }));
            break;
          }
          case 'removeNode': {
            graph.removeNode(nodeId);
            broadcast({ type: 'graph:update', payload: graph.toJSON() }, ws);
            break;
          }
          case 'connect': {
            const { from, out, to, in: inp } = data;
            graph.connect(from, out, to, inp);
            broadcast({ type: 'graph:update', payload: graph.toJSON() }, ws);
            break;
          }
          case 'updateParams': {
            graph.updateParams(nodeId, data.params);
            broadcast({ type: 'graph:update', payload: graph.toJSON() }, ws);
            break;
          }
          case 'execute': {
            await executeAndStream();
            break;
          }
          default:
            ws.send(JSON.stringify({ type: 'error', payload: { message: `Unknown action: ${action}` } }));
        }
        break;
      }

      // Agent UI commands — forward to all other clients
      case 'ui:layout':
      case 'ui:focus':
      case 'ui:select':
      case 'ui:navigate':
      case 'ui:playback':
      case 'ui:notify':
      case 'ui:cursor':
        broadcast(msg, ws);
        break;

      default:
        ws.send(JSON.stringify({ type: 'error', payload: { message: `Unknown message type: ${type}` } }));
    }
  }

  /**
   * Execute graph and stream progress via WebSocket
   */
  async function executeAndStream() {
    const result = await executor.run(graph, {
      onNodeStart: (nodeId) => {
        broadcast({ type: 'node:progress', payload: { nodeId, progress: 0, phase: 'start' } });
      },
      onNodeComplete: (nodeId, output, timeMs) => {
        const cached = !!(output && output._fromCache);
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
      const result = await executeAndStream();
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
    const wfPath = resolve(workflowFile);
    let debounce = null;
    const ac = new AbortController();

    (async () => {
      try {
        const watcher = fsWatch(wfPath, { signal: ac.signal });
        for await (const event of watcher) {
          if (debounce) clearTimeout(debounce);
          debounce = setTimeout(async () => {
            try {
              const json = await readFile(wfPath, 'utf-8');
              const data = JSON.parse(json);
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
