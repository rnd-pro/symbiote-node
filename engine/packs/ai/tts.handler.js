/**
 * ai/tts — Text-to-Speech via Qwen3-TTS
 *
 * Two modes:
 * - SSH: batch script on remote server (mr-agent.rnd-pro.com)
 * - HTTP: POST to Qwen3 TTS HTTP endpoint
 *
 * Supports:
 * - Built-in speakers: ryan, vivian, aiden, dylan, eric, serena, sohee, chelsie, etc.
 * - Voice cloning via ref_audio (reference audio sample)
 * - Language: es (Spanish/Rioplatense), ru (Russian), en (English)
 *
 * Config from Mr-Computer/automations/argentine-spanish-bot:
 *   TTS_SERVER_URL: http://localhost:5008
 *   TTS_VENV_PATH: /home/mr-agent/automations/argentine-spanish-bot/venv
 *   Batch script: utils/generate_qwen3tts_batch.py
 *
 * @module agi-graph/packs/ai/tts
 */

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export default {
  type: 'ai/tts',
  category: 'ai',
  icon: 'record_voice_over',

  driver: {
    description: 'Text-to-Speech via Qwen3-TTS (SSH batch or HTTP)',
    inputs: [
      { name: 'text', type: 'string' },
    ],
    outputs: [
      { name: 'audioPath', type: 'string' },
      { name: 'error', type: 'string' },
    ],
    params: {
      mode: { type: 'string', default: 'http', description: 'ssh | http' },
      language: { type: 'string', default: 'es', description: 'Language: es, ru, en' },
      speaker: { type: 'string', default: 'vivian', description: 'Built-in Qwen3 speaker ID' },
      refAudio: { type: 'string', default: '', description: 'Path to voice reference audio (clone mode)' },
      outputDir: { type: 'string', default: '', description: 'Output directory for generated audio' },
      outputFormat: { type: 'string', default: 'wav', description: 'wav | mp3' },
      exaggeration: { type: 'number', default: 0, description: 'Voice exaggeration (0-1)' },
      cfg: { type: 'number', default: 0.1, description: 'Classifier-free guidance (0-1)' },
      // SSH params
      remoteHost: { type: 'string', default: 'mr-agent@mr-agent.rnd-pro.com', description: 'SSH host' },
      remotePath: { type: 'string', default: '/home/mr-agent/automations/argentine-spanish-bot', description: 'Remote project path' },
      remoteVenv: { type: 'string', default: '/home/mr-agent/automations/argentine-spanish-bot/venv', description: 'Remote Python venv path' },
      device: { type: 'string', default: 'cuda', description: 'cuda | cpu' },
      // HTTP params
      endpoint: { type: 'string', default: 'http://localhost:5008', description: 'TTS HTTP endpoint' },
      timeout: { type: 'int', default: 120000, description: 'Max wait time (ms)' },
    },
  },

  lifecycle: {
    validate: (inputs) => {
      if (!inputs.text) return false;
      return true;
    },

    cacheKey: (inputs, params) =>
      `tts:${params.mode}:${params.speaker}:${params.language}:${inputs.text}`,

    execute: async (inputs, params) => {
      let { text } = inputs;
      let mode = params.mode || 'http';

      if (mode === 'ssh') {
        return executeSSH(text, params);
      }
      return executeHTTP(text, params);
    },
  },
};

/**
 * Qwen3-TTS built-in speaker IDs
 * @type {Set<string>}
 */
const SPEAKERS = new Set([
  'aiden', 'dylan', 'eric', 'ono_anna', 'ryan',
  'serena', 'sohee', 'uncle_fu', 'vivian', 'chelsie',
]);

/**
 * SSH mode: write batch JSON → scp → remote python exec → scp result back
 * @param {string} text - Text to synthesize
 * @param {Object} params - Node params
 * @returns {Promise<Object>}
 */
async function executeSSH(text, params) {
  let host = params.remoteHost || process.env.WHISPER_REMOTE_HOST || 'mr-agent@mr-agent.rnd-pro.com';
  let remotePath = params.remotePath || process.env.WHISPER_REMOTE_PATH || '/home/mr-agent/automations/argentine-spanish-bot';
  let venv = params.remoteVenv || process.env.TTS_VENV_PATH || `${remotePath}/venv`;
  let device = params.device || process.env.PODCAST_TTS_DEVICE || 'cuda';

  let outDir = params.outputDir || path.join(os.tmpdir(), 'agi-graph-tts');
  let taskId = `tts_${Date.now()}`;
  let localWav = path.join(outDir, `${taskId}.wav`);
  let remoteTmpDir = '/tmp/agi-graph-tts';

  try {
    await fs.mkdir(outDir, { recursive: true });

    // Build batch task
    let batchTask = [{
      id: taskId,
      text,
      lang: params.language || 'es',
      prompt: params.refAudio || null,
      out: `${remoteTmpDir}/${taskId}.wav`,
      exaggeration: params.exaggeration ?? 0,
      cfg: params.cfg ?? 0.1,
    }];

    // If using built-in speaker (no refAudio), add speaker param
    if (!params.refAudio && SPEAKERS.has(params.speaker)) {
      batchTask[0].speaker = params.speaker;
    }

    // Write local batch file
    let batchFile = path.join(outDir, `${taskId}_batch.json`);
    await fs.writeFile(batchFile, JSON.stringify(batchTask, null, 2));

    // Ensure remote dir + upload batch
    execSync(`ssh ${host} "mkdir -p ${remoteTmpDir}"`, {
      encoding: 'utf-8', stdio: 'pipe', timeout: 10000,
    });

    let remoteBatch = `${remoteTmpDir}/${taskId}_batch.json`;
    execSync(`scp "${batchFile}" "${host}:${remoteBatch}"`, {
      encoding: 'utf-8', stdio: 'pipe', timeout: 30000,
    });

    try {
      // Run batch script
      let pythonCmd = `${venv}/bin/python`;
      let scriptPath = `${remotePath}/utils/generate_qwen3tts_batch.py`;
      let cmd = `source "${venv}/bin/activate" && "${pythonCmd}" "${scriptPath}" --batch "${remoteBatch}" --device "${device}"`;

      execSync(`ssh ${host} '${cmd}'`, {
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024,
        timeout: params.timeout || 120000,
      });

      // Download result
      let remoteOut = `${remoteTmpDir}/${taskId}.wav`;
      execSync(`scp "${host}:${remoteOut}" "${localWav}"`, {
        encoding: 'utf-8', stdio: 'pipe', timeout: 30000,
      });

      // Cleanup batch + remote output
      await fs.unlink(batchFile).catch(() => { });
      execSync(`ssh ${host} "rm -f ${remoteBatch} ${remoteOut}"`, {
        encoding: 'utf-8', stdio: 'pipe', timeout: 5000,
      }).toString();

      return { audioPath: localWav, error: null };

    } catch (err) {
      await fs.unlink(batchFile).catch(() => { });
      return { audioPath: null, error: err.message };
    }

  } catch (err) {
    return { audioPath: null, error: err.message };
  }
}

/**
 * HTTP mode: POST to Qwen3 TTS endpoint
 * @param {string} text - Text to synthesize
 * @param {Object} params - Node params
 * @returns {Promise<Object>}
 */
async function executeHTTP(text, params) {
  let endpoint = params.endpoint || process.env.TTS_SERVER_URL || 'http://localhost:5008';
  let outDir = params.outputDir || path.join(os.tmpdir(), 'agi-graph-tts');
  let taskId = `tts_${Date.now()}`;
  let outputPath = path.join(outDir, `${taskId}.wav`);

  try {
    await fs.mkdir(outDir, { recursive: true });

    let body = {
      text,
      language: params.language || 'es',
      speaker: params.speaker || 'vivian',
      exaggeration: params.exaggeration ?? 0,
      cfg: params.cfg ?? 0.1,
    };

    // Add ref_audio for voice cloning
    if (params.refAudio) {
      let refBuffer = await fs.readFile(params.refAudio);
      body.ref_audio = refBuffer.toString('base64');
    }

    let response = await fetch(`${endpoint}/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(params.timeout || 120000),
    });

    if (!response.ok) {
      return { audioPath: null, error: `TTS API error: ${response.status}` };
    }

    // Response is audio binary
    let contentType = response.headers.get('content-type') || '';

    if (contentType.includes('audio') || contentType.includes('octet-stream')) {
      let buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(outputPath, buffer);
      return { audioPath: outputPath, error: null };
    }

    // JSON response with file path
    let result = await response.json();
    if (result.audio_path) {
      return { audioPath: result.audio_path, error: null };
    }
    if (result.audio) {
      let buffer = Buffer.from(result.audio, 'base64');
      await fs.writeFile(outputPath, buffer);
      return { audioPath: outputPath, error: null };
    }

    return { audioPath: null, error: 'Unexpected TTS response format' };

  } catch (err) {
    return { audioPath: null, error: err.message };
  }
}
