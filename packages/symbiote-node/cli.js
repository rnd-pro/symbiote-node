#!/usr/bin/env node

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  cmdInspect,
  cmdList,
  cmdRun,
  cmdValidate,
  parseArgs,
} from 'symbiote-engine/cli';
import { cmdDiscover } from 'symbiote-ui/discover';

let { command, target, options } = parseArgs(process.argv);

let handlers = {
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
    let { createServer } = await import('symbiote-engine/GraphServer.js');
    await createServer({
      port,
      workflowFile: target,
      handlersDir: options.handlers ? resolve(options.handlers) : undefined,
      watchFiles: true,
      verbose: !!options.verbose,
    });
  },
};

let isMain = fileURLToPath(import.meta.url) === process.argv[1];

if (isMain && handlers[command]) {
  await handlers[command]();
} else if (isMain) {
  console.log(`symbiote-node terminal CLI

Runtime commands are provided by symbiote-engine.
Provider discovery is provided by symbiote-ui.

Commands:
  run <workflow.json>
  validate <workflow.json>
  list
  inspect <workflow.json>
  discover
  serve [workflow.json] --port <number>
`);
  if (command && command !== '--help' && command !== '-h') process.exit(1);
}
