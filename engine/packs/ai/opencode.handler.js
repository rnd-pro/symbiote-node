/**
 * ai/opencode — AI inference via OpenCode REST API + OpenRouter
 *
 * Connects to a running OpenCode (Crush) instance, creates a session,
 * sends a prompt, and polls a file for the AI's JSON output.
 * Model-agnostic: works with any model available through OpenRouter
 * (DeepSeek, Claude, Gemini, etc.).
 *
 * Pattern from radio-conversation-service.js:
 *   POST /session → create session
 *   POST /session/:id/message → send prompt (fire & forget)
 *   Poll output file → wait for JSON result
 *
 * @module agi-graph/packs/ai/opencode
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export default {
  type: 'ai/opencode',
  category: 'ai',
  icon: 'psychology',

  driver: {
    description: 'AI inference via OpenCode + OpenRouter (DeepSeek, Claude, Gemini, etc.)',
    inputs: [
      { name: 'prompt', type: 'string' },
      { name: 'context', type: 'any' },
    ],
    outputs: [
      { name: 'result', type: 'any' },
      { name: 'error', type: 'string' },
    ],
    params: {
      model: { type: 'string', default: 'deepseek/deepseek-v3.2', description: 'OpenRouter model ID' },
      provider: { type: 'string', default: 'openrouter', description: 'Model provider' },
      opencodeUrl: { type: 'string', default: 'http://127.0.0.1:4096', description: 'OpenCode API URL' },
      timeout: { type: 'int', default: 300000, description: 'Max wait time (ms)' },
      outputDir: { type: 'string', default: '', description: 'Workspace dir for file exchange' },
    },
  },

  lifecycle: {
    validate: (inputs) => {
      if (!inputs.prompt) return false;
      return true;
    },

    cacheKey: (inputs, params) =>
      `opencode:${params.model}:${inputs.prompt}:${JSON.stringify(inputs.context)}`,

    execute: async (inputs, params) => {
      let { prompt, context } = inputs;
      let {
        model,
        provider,
        opencodeUrl,
        timeout,
        outputDir,
      } = params;

      let baseUrl = opencodeUrl || process.env.OPENCODE_URL || 'http://127.0.0.1:4096';
      let modelConfig = {
        providerID: provider || process.env.OPENCODE_PROVIDER || 'openrouter',
        modelID: model || process.env.OPENCODE_MODEL || 'deepseek/deepseek-v3.2',
      };

      // Workspace for file-based communication
      let workspace = outputDir || process.env.OPENCODE_WORKSPACE ||
        path.join(os.tmpdir(), 'agi-graph-opencode');
      await fs.mkdir(workspace, { recursive: true });

      let taskPath = path.join(workspace, 'task.json');
      let outputPath = path.join(workspace, 'output.json');

      // Write task file with context
      await fs.writeFile(taskPath, JSON.stringify({
        type: 'agi-graph-ai',
        prompt,
        context,
        timestamp: Date.now(),
      }, null, 2), 'utf8');

      // Clean previous output
      try { await fs.unlink(outputPath); } catch { /* ignore */ }

      try {
        // 1. Create session
        let sessionRes = await fetch(`${baseUrl}/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: `agi-graph ${Date.now()}` }),
        });

        if (!sessionRes.ok) {
          return { result: null, error: `Session creation failed: ${sessionRes.status}` };
        }

        let session = await sessionRes.json();

        // 2. Build full prompt with workspace instructions
        let contextBlock = context
          ? `\n\n## Context\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\``
          : '';

        let fullPrompt = `${prompt}${contextBlock}

## Workspace: ${workspace}

### Instructions:
1. Read task from ${taskPath}
2. Process the request
3. Write result as JSON to ${outputPath}

Output format: { "result": <your_result> }`;

        // 3. Send message (fire & forget)
        let msgRes = await fetch(`${baseUrl}/session/${session.id}/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: modelConfig,
            parts: [{ type: 'text', text: fullPrompt }],
          }),
          signal: AbortSignal.timeout(120000),
        });

        if (!msgRes.ok) {
          return { result: null, error: `Message send failed: ${msgRes.status}` };
        }

        // 4. Poll for output file
        let startTime = Date.now();
        let pollInterval = 3000;

        while (Date.now() - startTime < timeout) {
          try {
            let content = await fs.readFile(outputPath, 'utf8');
            let parsed = JSON.parse(content);

            if (parsed.result !== undefined) {
              return { result: parsed.result, error: null };
            }
            // If the file exists but has no result key, return entire content
            if (Object.keys(parsed).length > 0) {
              return { result: parsed, error: null };
            }
          } catch {
            // File not ready yet
          }

          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }

        return { result: null, error: `Timeout after ${timeout}ms waiting for AI response` };

      } catch (err) {
        return { result: null, error: err.message };
      }
    },
  },
};
