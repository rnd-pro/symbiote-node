/**
 * agi-graph - Universal node-based execution engine
 *
 * AI-first, domain-agnostic graph runtime.
 * Zero dependencies, pure ESM.
 *
 * @module agi-graph
 */

// Core
export { Graph } from './Graph.js';
export { Executor } from './Executor.js';
export { History } from './History.js';
export { nanoid } from './nanoid.js';

// Registry (AI discovery)
export {
  registerNodeType,
  registerPack,
  getNodeType,
  listDrivers,
  findCompatible,
  findByCapability,
  getNodeMenu,
  registerCustomDrivers,
  validateParams,
  listPacks,
  clearRegistry,
} from './Registry.js';

// Socket types
export {
  registerSocketType,
  registerSocketTypes,
  getSocketType,
  getAllSocketTypes,
  areSocketsCompatible,
} from './SocketTypes.js';

// Persistence
export {
  serialize,
  deserialize,
  saveToFile,
  loadFromFile,
} from './Persistence.js';

// Lifecycle
export { runLifecycle } from './Lifecycle.js';

// Handler loader (Node.js only)
export { loadHandlers, watchHandlers } from './HandlerLoader.js';

// Agent UI commands
export * as AgentUI from './AgentUICommands.js';

// Graph server — import directly: import { createServer } from 'symbiote-node/engine/GraphServer.js'
// Not re-exported here because it requires 'ws' package (optional peer dependency)
