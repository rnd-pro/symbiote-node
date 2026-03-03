/**
 * ai/beat-detect — Audio beat detection via librosa (SSH)
 *
 * Analyzes audio files to extract:
 * - Beat timestamps and tempo (BPM)
 * - Waveform peaks (configurable resolution)
 * - Energy contour
 * - Quiet zones (silence detection)
 * - Strong onsets (transient detection)
 *
 * Uses Python librosa library on remote server via SSH.
 * Based on Mr-Computer/modules/ai-music-video beat-detector-ssh.js
 *
 * Remote: mr-agent@mr-agent.rnd-pro.com
 * Script: beat-detection.py (uploaded automatically)
 * Venv:   /home/mr-agent/automations/argentine-spanish-bot/venv
 *
 * @module agi-graph/packs/ai/beat-detect
 */

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export default {
  type: 'ai/beat-detect',
  category: 'ai',
  icon: 'graphic_eq',

  driver: {
    description: 'Audio beat detection via librosa — beats, tempo, peaks, energy',
    inputs: [
      { name: 'audioPath', type: 'string' },
    ],
    outputs: [
      { name: 'beats', type: 'any' },
      { name: 'tempo', type: 'number' },
      { name: 'peaks', type: 'any' },
      { name: 'energy', type: 'any' },
      { name: 'quietZones', type: 'any' },
      { name: 'strongOnsets', type: 'any' },
      { name: 'duration', type: 'number' },
      { name: 'error', type: 'string' },
    ],
    params: {
      mode: { type: 'string', default: 'ssh', description: 'ssh | http' },
      peaksPerSecond: { type: 'int', default: 10, description: 'Waveform peaks resolution' },
      sampleRate: { type: 'int', default: 22050, description: 'Audio sample rate for analysis' },
      hopLength: { type: 'int', default: 512, description: 'Hop length for beat tracking' },
      // SSH params
      remoteHost: { type: 'string', default: 'mr-agent@mr-agent.rnd-pro.com', description: 'SSH host' },
      remotePath: { type: 'string', default: '/home/mr-agent/automations/argentine-spanish-bot', description: 'Remote project path' },
      remoteVenv: { type: 'string', default: '/home/mr-agent/automations/argentine-spanish-bot/venv', description: 'Remote Python venv' },
      scriptPath: { type: 'string', default: '', description: 'Local path to beat-detection.py (auto-resolved)' },
      // HTTP params
      endpoint: { type: 'string', default: 'http://localhost:5009', description: 'Beat detection HTTP endpoint' },
      timeout: { type: 'int', default: 180000, description: 'Max wait time (ms)' },
    },
  },

  lifecycle: {
    validate: (inputs) => {
      if (!inputs.audioPath) return false;
      return true;
    },

    cacheKey: (inputs, params) =>
      `beat:${params.mode}:${inputs.audioPath}:${params.peaksPerSecond}:${params.sampleRate}`,

    execute: async (inputs, params) => {
      const { audioPath } = inputs;
      const mode = params.mode || 'ssh';

      if (mode === 'http') {
        return executeHTTP(audioPath, params);
      }
      return executeSSH(audioPath, params);
    },
  },
};

/** @type {Object} Empty result template */
const EMPTY = {
  beats: null, tempo: 0, peaks: null, energy: null,
  quietZones: null, strongOnsets: null, duration: 0, error: null,
};

/**
 * SSH mode: upload audio → run librosa beat detection → parse JSON result
 * @param {string} audioPath - Local path to audio file
 * @param {Object} params - Node params
 * @returns {Promise<Object>}
 */
async function executeSSH(audioPath, params) {
  const host = params.remoteHost || process.env.WHISPER_REMOTE_HOST || 'mr-agent@mr-agent.rnd-pro.com';
  const remotePath = params.remotePath || process.env.WHISPER_REMOTE_PATH || '/home/mr-agent/automations/argentine-spanish-bot';
  const venv = params.remoteVenv || process.env.WHISPER_REMOTE_VENV || `${remotePath}/venv`;
  const sr = params.sampleRate || parseInt(process.env.BEAT_SAMPLE_RATE, 10) || 22050;
  const hop = params.hopLength || parseInt(process.env.BEAT_HOP_LENGTH, 10) || 512;
  const pps = params.peaksPerSecond || 10;
  const remoteTmpDir = '/tmp/agi-graph-beat';

  try {
    // Verify local file exists
    await fs.access(audioPath);

    const filename = path.basename(audioPath);
    const remoteAudio = `${remoteTmpDir}/${filename}`;

    // Setup remote directory
    execSync(`ssh ${host} "mkdir -p ${remoteTmpDir}"`, {
      encoding: 'utf-8', stdio: 'pipe', timeout: 10000,
    });

    // Upload audio
    execSync(`scp "${audioPath}" "${host}:${remoteAudio}"`, {
      encoding: 'utf-8', stdio: 'pipe', timeout: 60000,
    });

    // Upload or locate beat detection script
    let remoteScript = `${remoteTmpDir}/beat-detection.py`;
    const localScript = params.scriptPath
      || path.join(process.cwd(), 'utils/beat-detection.py');

    try {
      await fs.access(localScript);
      execSync(`scp "${localScript}" "${host}:${remoteScript}"`, {
        encoding: 'utf-8', stdio: 'pipe', timeout: 10000,
      });
    } catch {
      // Script might already be on remote, try using module path
      remoteScript = `${remotePath}/utils/beat-detection.py`;
    }

    try {
      // Run beat detection
      const pythonCmd = `${venv}/bin/python3`;
      const cmd = `"${pythonCmd}" "${remoteScript}" "${remoteAudio}" --sr ${sr} --hop ${hop} --pps ${pps}`;
      const fullCmd = `ssh ${host} '${cmd}'`;

      const output = execSync(fullCmd, {
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024,
        timeout: params.timeout || 180000,
      });

      const result = JSON.parse(output);

      return {
        beats: result.beats,
        tempo: result.tempo,
        peaks: result.peaks,
        energy: result.energy,
        quietZones: result.quiet_zones,
        strongOnsets: result.strong_onsets,
        duration: result.duration,
        error: null,
      };
    } finally {
      // Cleanup remote audio
      execSync(`ssh ${host} "rm -f ${remoteAudio}"`, {
        encoding: 'utf-8', stdio: 'pipe', timeout: 5000,
      }).toString();
    }
  } catch (err) {
    return { ...EMPTY, error: err.message };
  }
}

/**
 * HTTP mode: POST audio to beat detection API
 * @param {string} audioPath - Local path to audio file
 * @param {Object} params - Node params
 * @returns {Promise<Object>}
 */
async function executeHTTP(audioPath, params) {
  const endpoint = params.endpoint || 'http://localhost:5009';

  try {
    const audioBuffer = await fs.readFile(audioPath);
    const blob = new Blob([audioBuffer], { type: 'audio/wav' });

    const formData = new FormData();
    formData.append('file', blob, path.basename(audioPath));
    formData.append('sample_rate', String(params.sampleRate || 22050));
    formData.append('hop_length', String(params.hopLength || 512));
    formData.append('peaks_per_second', String(params.peaksPerSecond || 10));

    const response = await fetch(`${endpoint}/analyze`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(params.timeout || 180000),
    });

    if (!response.ok) {
      return { ...EMPTY, error: `Beat API error: ${response.status}` };
    }

    const result = await response.json();

    return {
      beats: result.beats,
      tempo: result.tempo,
      peaks: result.peaks,
      energy: result.energy,
      quietZones: result.quiet_zones,
      strongOnsets: result.strong_onsets,
      duration: result.duration,
      error: null,
    };
  } catch (err) {
    return { ...EMPTY, error: err.message };
  }
}
