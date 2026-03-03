/**
 * ai/face-detect — Face detection via HTTP API (InsightFace SCRFD GPU)
 *
 * Client for remote face detection service on mr-agent.rnd-pro.com:5050.
 * Supports SSH tunnel for local access.
 *
 * Operations:
 * - analyze:    Video face detection (suitable for lipsync?)
 * - track:      Dense face tracking with mouth + bbox
 * - track-gpu:  GPU InsightFace tracking with landmarks, age, gender
 * - mouth:      Mouth position detection (for speech bubble placement)
 * - frames-gpu: Face tracking on WebP frame sequences
 *
 * Based on Mr-Computer/modules/ai-music-video/src/utils/face-detector.js
 *
 * @module agi-graph/packs/ai/face-detect
 */

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export default {
  type: 'ai/face-detect',
  category: 'ai',
  icon: 'face',

  driver: {
    description: 'Face detection via HTTP API — tracking, mouth position, landmarks',
    inputs: [
      { name: 'mediaPath', type: 'string' },
    ],
    outputs: [
      { name: 'result', type: 'any' },
      { name: 'detected', type: 'boolean' },
      { name: 'error', type: 'string' },
    ],
    params: {
      operation: { type: 'string', default: 'analyze', description: 'analyze | track | track-gpu | mouth | frames-gpu' },
      endpoint: { type: 'string', default: 'http://localhost:5050', description: 'Face detection service URL' },
      minCoverage: { type: 'number', default: 5, description: 'Minimum face coverage % (analyze mode)' },
      step: { type: 'int', default: 3, description: 'Frame sampling interval (track modes)' },
      fps: { type: 'int', default: 30, description: 'FPS for frames-gpu mode' },
      remoteHost: { type: 'string', default: 'mr-agent@mr-agent.rnd-pro.com', description: 'SSH host for SCP uploads' },
      useRemotePath: { type: 'boolean', default: false, description: 'Send file path instead of uploading (when on same server)' },
      timeout: { type: 'int', default: 120000, description: 'Max wait time (ms)' },
    },
  },

  lifecycle: {
    validate: (inputs) => {
      if (!inputs.mediaPath) return false;
      return true;
    },

    cacheKey: (inputs, params) =>
      `face:${params.operation}:${params.step}:${inputs.mediaPath}`,

    execute: async (inputs, params) => {
      const { mediaPath } = inputs;
      const op = params.operation || 'analyze';

      const ops = { analyze, track, 'track-gpu': trackGpu, mouth, 'frames-gpu': framesGpu };
      const handler = ops[op];
      if (!handler) {
        return { result: null, detected: false, error: `Unknown operation: ${op}` };
      }

      return handler(mediaPath, params);
    },
  },
};

/**
 * Check if running on the mr-agent server
 * @returns {boolean}
 */
function isOnServer() {
  try {
    return os.hostname().includes('mr-agent') || os.hostname().includes('rnd-pro');
  } catch {
    return false;
  }
}

/**
 * Upload file to remote server via SCP if needed
 * @param {string} localPath - Local file path
 * @param {string} host - SSH host
 * @returns {{remotePath: string, cleanup: boolean}}
 */
async function prepareRemotePath(localPath, host, params) {
  if (params.useRemotePath || isOnServer()) {
    return { remotePath: path.resolve(localPath), cleanup: false };
  }

  const filename = `face_${Date.now()}_${path.basename(localPath)}`;
  const remotePath = `/tmp/${filename}`;

  execSync(`scp -q "${path.resolve(localPath)}" "${host}:${remotePath}"`, {
    stdio: 'pipe', timeout: 60000,
  });

  return { remotePath, cleanup: true };
}

/**
 * Clean up remote file
 * @param {string} remotePath
 * @param {string} host
 */
function cleanupRemote(remotePath, host) {
  try {
    execSync(`ssh ${host} "rm -f ${remotePath}"`, {
      stdio: 'pipe', timeout: 10000,
    });
  } catch { /* ignore */ }
}

/**
 * analyze — Video face detection suitability
 */
async function analyze(mediaPath, params) {
  const endpoint = params.endpoint || 'http://localhost:5050';
  const host = params.remoteHost || 'mr-agent@mr-agent.rnd-pro.com';

  try {
    if (params.useRemotePath || isOnServer()) {
      const response = await fetch(`${endpoint}/analyze?min_coverage=${params.minCoverage || 5}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_path: path.resolve(mediaPath) }),
        signal: AbortSignal.timeout(params.timeout || 120000),
      });
      const result = await response.json();
      return { result, detected: result.suitable || false, error: null };
    }

    // Upload via curl for remote analysis
    const { remotePath, cleanup } = await prepareRemotePath(mediaPath, host, params);
    try {
      const response = await fetch(`${endpoint}/analyze?min_coverage=${params.minCoverage || 5}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_path: remotePath }),
        signal: AbortSignal.timeout(params.timeout || 120000),
      });
      const result = await response.json();
      return { result, detected: result.suitable || false, error: null };
    } finally {
      if (cleanup) cleanupRemote(remotePath, host);
    }
  } catch (err) {
    return { result: null, detected: false, error: err.message };
  }
}

/**
 * track — Dense face tracking with mouth + bbox
 */
async function track(mediaPath, params) {
  const endpoint = params.endpoint || 'http://localhost:5050';
  const host = params.remoteHost || 'mr-agent@mr-agent.rnd-pro.com';

  try {
    const { remotePath, cleanup } = await prepareRemotePath(mediaPath, host, params);
    try {
      const response = await fetch(`${endpoint}/track-face`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_path: remotePath, step: params.step || 3 }),
        signal: AbortSignal.timeout(params.timeout || 120000),
      });
      const result = await response.json();
      result.detected = (result.detectedFrames || 0) > 0;
      return { result, detected: result.detected, error: null };
    } finally {
      if (cleanup) cleanupRemote(remotePath, host);
    }
  } catch (err) {
    return { result: null, detected: false, error: err.message };
  }
}

/**
 * track-gpu — InsightFace GPU tracking with landmarks, bbox, age, gender
 */
async function trackGpu(mediaPath, params) {
  const endpoint = params.endpoint || 'http://localhost:5050';
  const host = params.remoteHost || 'mr-agent@mr-agent.rnd-pro.com';

  try {
    const { remotePath, cleanup } = await prepareRemotePath(mediaPath, host, params);
    try {
      const response = await fetch(`${endpoint}/track-face-gpu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_path: remotePath, step: params.step || 1 }),
        signal: AbortSignal.timeout(params.timeout || 120000),
      });
      const result = await response.json();
      result.detected = (result.detectedFrames || 0) > 0;
      return { result, detected: result.detected, error: null };
    } finally {
      if (cleanup) cleanupRemote(remotePath, host);
    }
  } catch (err) {
    return { result: null, detected: false, error: err.message };
  }
}

/**
 * mouth — Mouth position detection (for speech bubble placement)
 */
async function mouth(mediaPath, params) {
  const endpoint = params.endpoint || 'http://localhost:5050';
  const host = params.remoteHost || 'mr-agent@mr-agent.rnd-pro.com';

  try {
    const { remotePath, cleanup } = await prepareRemotePath(mediaPath, host, params);
    try {
      const response = await fetch(`${endpoint}/analyze-mouth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_path: remotePath }),
        signal: AbortSignal.timeout(params.timeout || 120000),
      });
      const result = await response.json();
      return { result, detected: result.detected || false, error: null };
    } finally {
      if (cleanup) cleanupRemote(remotePath, host);
    }
  } catch (err) {
    return { result: null, detected: false, error: err.message };
  }
}

/**
 * frames-gpu — GPU face tracking on WebP frame sequences
 */
async function framesGpu(mediaPath, params) {
  const endpoint = params.endpoint || 'http://localhost:5050';
  const host = params.remoteHost || 'mr-agent@mr-agent.rnd-pro.com';

  try {
    let remotePath = path.resolve(mediaPath);
    let cleanup = false;

    // If not on server, rsync frames directory to remote
    if (!params.useRemotePath && !isOnServer()) {
      const dirName = `face_frames_${Date.now()}`;
      remotePath = `/tmp/${dirName}`;

      execSync(`rsync -az --quiet "${path.resolve(mediaPath)}/" "${host}:${remotePath}/"`, {
        stdio: 'pipe', timeout: 120000,
      });
      cleanup = true;
    }

    try {
      const response = await fetch(`${endpoint}/track-face-frames-gpu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frames_dir: remotePath,
          fps: params.fps || 30,
          step: params.step || 1,
        }),
        signal: AbortSignal.timeout(params.timeout || 120000),
      });
      const result = await response.json();
      result.detected = (result.detectedFrames || 0) > 0;
      return { result, detected: result.detected, error: null };
    } finally {
      if (cleanup) {
        try {
          execSync(`ssh ${host} "rm -rf ${remotePath}"`, {
            stdio: 'pipe', timeout: 10000,
          });
        } catch { /* ignore */ }
      }
    }
  } catch (err) {
    return { result: null, detected: false, error: err.message };
  }
}
