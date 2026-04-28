/**
 * ai/whisper — Audio transcription with word-level timestamps
 *
 * Two modes:
 * - SSH: uploads audio to remote server via scp, runs Whisper via SSH
 * - HTTP: sends audio to a Whisper HTTP endpoint (e.g., faster-whisper-server)
 *
 * SSH remote config from Mr-Computer/modules/ai-music-video/whisper-ssh.js:
 *   Host: mr-agent@mr-agent.rnd-pro.com
 *   Venv: /home/mr-agent/automations/argentine-spanish-bot/venv
 *   Script: utils/whisper-word-timing.py
 *
 * @module agi-graph/packs/ai/whisper
 */

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

export default {
  type: 'ai/whisper',
  category: 'ai',
  icon: 'hearing',

  driver: {
    description: 'Audio transcription with word-level timestamps (SSH or HTTP mode)',
    inputs: [
      { name: 'audioPath', type: 'string' },
    ],
    outputs: [
      { name: 'text', type: 'string' },
      { name: 'words', type: 'any' },
      { name: 'duration', type: 'number' },
      { name: 'error', type: 'string' },
    ],
    params: {
      mode: { type: 'string', default: 'ssh', description: 'ssh | http' },
      language: { type: 'string', default: 'es', description: 'Language code' },
      model: { type: 'string', default: 'medium', description: 'Whisper model: tiny, base, small, medium, large-v3' },
      device: { type: 'string', default: 'cuda', description: 'cuda | cpu' },
      // SSH params
      remoteHost: { type: 'string', default: 'mr-agent@mr-agent.rnd-pro.com', description: 'SSH host' },
      remotePath: { type: 'string', default: '/home/mr-agent/automations/argentine-spanish-bot', description: 'Remote project path' },
      remoteVenv: { type: 'string', default: '/home/mr-agent/automations/argentine-spanish-bot/venv', description: 'Remote Python venv' },
      // HTTP params
      endpoint: { type: 'string', default: 'http://localhost:5001', description: 'Whisper HTTP endpoint' },
      timeout: { type: 'int', default: 300000, description: 'Max wait time (ms)' },
    },
  },

  lifecycle: {
    validate: (inputs) => {
      if (!inputs.audioPath) return false;
      return true;
    },

    cacheKey: (inputs, params) =>
      `whisper:${params.mode}:${params.model}:${inputs.audioPath}`,

    execute: async (inputs, params) => {
      let { audioPath } = inputs;
      let mode = params.mode || process.env.WHISPER_MODE || 'ssh';

      if (mode === 'http') {
        return executeHTTP(audioPath, params);
      }
      return executeSSH(audioPath, params);
    },
  },
};

/**
 * SSH mode: scp upload → remote python exec → parse JSON output
 * @param {string} audioPath - Local audio file path
 * @param {Object} params - Node params
 * @returns {Promise<Object>} Result with text, words, duration
 */
async function executeSSH(audioPath, params) {
  let host = params.remoteHost || process.env.WHISPER_REMOTE_HOST || 'mr-agent@mr-agent.rnd-pro.com';
  let remotePath = params.remotePath || process.env.WHISPER_REMOTE_PATH || '/home/mr-agent/automations/argentine-spanish-bot';
  let venv = params.remoteVenv || process.env.WHISPER_REMOTE_VENV || `${remotePath}/venv`;
  let model = params.model || process.env.WHISPER_MODEL || 'medium';
  let device = params.device || process.env.WHISPER_DEVICE || 'cuda';
  let language = params.language || 'es';
  let remoteTmpDir = '/tmp/agi-graph-whisper';

  try {
    // Verify file exists
    await fs.access(audioPath);

    let filename = path.basename(audioPath);
    let remoteAudioPath = `${remoteTmpDir}/${filename}`;

    // Ensure remote dir
    execSync(`ssh ${host} "mkdir -p ${remoteTmpDir}"`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 10000,
    });

    // Upload audio
    execSync(`scp "${audioPath}" "${host}:${remoteAudioPath}"`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 60000,
    });

    try {
      // Run Whisper
      let pythonCmd = `${venv}/bin/python3`;
      let whisperScript = `${remotePath}/utils/whisper-word-timing.py`;

      let cmd = `"${pythonCmd}" "${whisperScript}" "${remoteAudioPath}" "${language}" --model "${model}" --device "${device}"`;
      let fullCmd = `ssh ${host} '${cmd}'`;

      let output = execSync(fullCmd, {
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024,
        timeout: params.timeout || 300000,
      });

      let words = JSON.parse(output);
      let text = words.map(w => w.word).join(' ');
      let duration = words.length > 0
        ? words[words.length - 1].end
        : 0;

      return { text, words, duration, error: null };

    } finally {
      // Cleanup remote file
      try {
        execSync(`ssh ${host} "rm -f ${remoteAudioPath}"`, {
          encoding: 'utf-8',
          stdio: 'pipe',
          timeout: 5000,
        });
      } catch { /* ignore */ }
    }

  } catch (err) {
    return { text: null, words: null, duration: 0, error: err.message };
  }
}

/**
 * HTTP mode: POST audio to Whisper endpoint via FormData
 * @param {string} audioPath - Local audio file path
 * @param {Object} params - Node params
 * @returns {Promise<Object>} Result with text, words, duration
 */
async function executeHTTP(audioPath, params) {
  let endpoint = params.endpoint || process.env.WHISPER_ENDPOINT || 'http://localhost:5001';
  let language = params.language || 'es';

  try {
    let audioBuffer = await fs.readFile(audioPath);
    let blob = new Blob([audioBuffer], { type: 'audio/wav' });

    let formData = new FormData();
    formData.append('file', blob, path.basename(audioPath));
    formData.append('language', language);
    formData.append('word_timestamps', 'true');

    if (params.model) {
      formData.append('model', params.model);
    }

    let response = await fetch(`${endpoint}/transcribe`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(params.timeout || 300000),
    });

    if (!response.ok) {
      return { text: null, words: null, duration: 0, error: `Whisper API error: ${response.status}` };
    }

    let result = await response.json();
    let words = result.words || [];
    let text = result.text || words.map(w => w.word).join(' ');
    let duration = words.length > 0
      ? words[words.length - 1].end
      : 0;

    return { text, words, duration, error: null };

  } catch (err) {
    return { text: null, words: null, duration: 0, error: err.message };
  }
}
