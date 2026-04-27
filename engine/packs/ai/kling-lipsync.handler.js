/**
 * ai/kling-lipsync — Kling API lip-sync animation
 *
 * Adds lip-sync mouth animation to videos via Kling API.
 * JWT authentication with HMAC-SHA256 signing.
 *
 * 3-step pipeline:
 * 1. identify-face: detect faces in video → session_id + face_id
 * 2. advanced-lip-sync: create task with audio + face → task_id
 * 3. poll: wait for completion → download result video
 *
 * Ported from Mr-Computer/modules/ai-music-video/src/services/kling-lipsync.js
 *
 * @module agi-graph/packs/ai/kling-lipsync
 */

import { createHmac } from 'crypto';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

export default {
  type: 'ai/kling-lipsync',
  category: 'ai',
  icon: 'record_voice_over',

  driver: {
    description: 'Kling API lip-sync: detect face → animate mouth → download result',
    inputs: [
      { name: 'videoUrl', type: 'string' },
      { name: 'audioPath', type: 'string' },
    ],
    outputs: [
      { name: 'result', type: 'any' },
      { name: 'error', type: 'string' },
    ],
    params: {
      operation: { type: 'string', default: 'lipsync', description: 'Operation: identify-face | lipsync | poll | batch' },
      accessKey: { type: 'string', default: '', description: 'Kling API access key' },
      secretKey: { type: 'string', default: '', description: 'Kling API secret key' },
      baseUrl: { type: 'string', default: 'https://api.klingai.com', description: 'Kling API base URL' },
      publicBaseUrl: { type: 'string', default: '', description: 'Public URL for file server (ngrok/cloudflared)' },
      outputDir: { type: 'string', default: '/tmp/kling-lipsync', description: 'Output directory for results' },
      // For poll operation
      taskId: { type: 'string', default: '', description: 'Task ID to poll' },
      maxWaitMs: { type: 'int', default: 300000, description: 'Max poll wait time (ms)' },
      // For lipsync operation
      startTime: { type: 'number', default: 0, description: 'Audio start time (seconds)' },
      endTime: { type: 'number', default: 0, description: 'Audio end time (seconds)' },
      segmentId: { type: 'string', default: '', description: 'Segment identifier' },
      // For batch operation
      segments: { type: 'any', default: null, description: 'Segments array with start/end/promptId' },
      videoMap: { type: 'any', default: null, description: 'Map of promptId → videoPath' },
      concurrency: { type: 'int', default: 2, description: 'Max concurrent batch tasks' },
    },
  },

  lifecycle: {
    validate: (inputs, params) => {
      if (!params.accessKey || !params.secretKey) return false;

      let op = params.operation;
      if (op === 'identify-face' && !inputs.videoUrl) return false;
      if (op === 'poll' && !params.taskId) return false;
      if (op === 'lipsync' && (!inputs.videoUrl || !inputs.audioPath)) return false;
      if (op === 'batch' && (!params.segments || !inputs.audioPath)) return false;

      return true;
    },

    cacheKey: (inputs, params) => {
      return `kling:${params.operation}:${params.segmentId || params.taskId || inputs.videoUrl || ''}`;
    },

    execute: async (inputs, params) => {
      try {
        let op = params.operation;
        let token = generateJWT(params.accessKey, params.secretKey);

        if (op === 'identify-face') {
          let data = await identifyFace(inputs.videoUrl, token, params.baseUrl);
          return { result: data, error: null };
        }

        if (op === 'poll') {
          let data = await pollTaskCompletion(params.taskId, token, params);
          return { result: data, error: null };
        }

        if (op === 'lipsync') {
          let result = await processSegment(inputs, params);
          return { result, error: null };
        }

        if (op === 'batch') {
          let results = await processBatch(inputs, params);
          return { result: { processed: results.size, results: Object.fromEntries(results) }, error: null };
        }

        return { result: null, error: `Unknown operation: ${op}` };
      } catch (err) {
        return { result: null, error: err.message };
      }
    },
  },
};

// --- JWT Authentication ---

/**
 * Generate JWT token for Kling API authentication
 * @param {string} accessKey
 * @param {string} secretKey
 * @returns {string}
 */
function generateJWT(accessKey, secretKey) {
  let header = { alg: 'HS256', typ: 'JWT' };
  let now = Math.floor(Date.now() / 1000);
  let payload = {
    iss: accessKey,
    exp: now + 1800,
    nbf: now - 5,
  };

  let base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  let base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');

  let signature = createHmac('sha256', secretKey)
    .update(`${base64Header}.${base64Payload}`)
    .digest('base64url');

  return `${base64Header}.${base64Payload}.${signature}`;
}

// --- API Operations ---

/**
 * Step 1: Identify face in video
 * @param {string} videoUrl
 * @param {string} token
 * @param {string} baseUrl
 * @returns {Promise<Object>}
 */
async function identifyFace(videoUrl, token, baseUrl) {
  let response = await fetch(`${baseUrl}/v1/videos/identify-face`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ video_url: videoUrl }),
  });

  if (!response.ok) {
    let errorText = await response.text();
    throw new Error(`Kling identify-face error: ${response.status} - ${errorText}`);
  }

  let result = await response.json();
  if (result.code !== 0) {
    throw new Error(`Kling API error: ${result.code} - ${result.message}`);
  }

  return result.data;
}

/**
 * Step 2: Create lip-sync task
 * @param {string} sessionId
 * @param {string} faceId
 * @param {string} soundFile - Base64 audio
 * @param {number} soundDurationMs
 * @param {number} faceStartMs
 * @param {string} token
 * @param {string} baseUrl
 * @returns {Promise<Object>}
 */
async function createLipsyncTask(sessionId, faceId, soundFile, soundDurationMs, faceStartMs, token, baseUrl) {
  let response = await fetch(`${baseUrl}/v1/videos/advanced-lip-sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      session_id: sessionId,
      face_choose: [{
        face_id: faceId,
        sound_file: soundFile,
        sound_start_time: 0,
        sound_end_time: soundDurationMs,
        sound_insert_time: faceStartMs,
        sound_volume: 1,
        original_audio_volume: 0,
      }],
    }),
  });

  if (!response.ok) {
    let errorText = await response.text();
    throw new Error(`Kling advanced-lip-sync error: ${response.status} - ${errorText}`);
  }

  let result = await response.json();
  if (result.code !== 0) {
    throw new Error(`Kling API error: ${result.code} - ${result.message}`);
  }

  return result.data;
}

/**
 * Step 3: Poll for task completion
 * @param {string} taskId
 * @param {string} token
 * @param {Object} params
 * @returns {Promise<Object>}
 */
async function pollTaskCompletion(taskId, token, params) {
  let startTime = Date.now();
  let maxWaitMs = params.maxWaitMs;
  let pollInterval = 5000;

  while (Date.now() - startTime < maxWaitMs) {
    // Refresh token for each poll
    let freshToken = generateJWT(params.accessKey, params.secretKey);

    let response = await fetch(`${params.baseUrl}/v1/videos/advanced-lip-sync/${taskId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${freshToken}` },
    });

    if (!response.ok) {
      let errorText = await response.text();
      throw new Error(`Kling poll error: ${response.status} - ${errorText}`);
    }

    let result = await response.json();
    if (result.code !== 0) {
      throw new Error(`Kling API error: ${result.code} - ${result.message}`);
    }

    let status = result.data?.task_status;

    if (status === 'succeed') {
      return result.data;
    }
    if (status === 'failed') {
      throw new Error(`Lipsync task failed: ${result.data?.task_status_msg || 'Unknown error'}`);
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Lipsync task timed out after ${maxWaitMs / 1000}s`);
}

/**
 * Download result video
 * @param {string} videoUrl
 * @param {string} outputPath
 * @returns {Promise<string>}
 */
async function downloadResult(videoUrl, outputPath) {
  let response = await fetch(videoUrl);
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.status}`);
  }

  let buffer = await response.arrayBuffer();
  await writeFile(outputPath, Buffer.from(buffer));
  return outputPath;
}

// --- Audio Utilities ---

/**
 * Extract audio clip using FFmpeg
 * @param {string} audioPath
 * @param {number} startTime
 * @param {number} endTime
 * @param {string} outputPath
 * @returns {string}
 */
function extractAudioClip(audioPath, startTime, endTime, outputPath) {
  if (existsSync(outputPath)) return outputPath;

  let duration = endTime - startTime;
  let cmd = `ffmpeg -y -i "${path.resolve(audioPath)}" -ss ${startTime.toFixed(3)} -t ${duration.toFixed(3)} ` +
    `-c:a libmp3lame -q:a 2 "${outputPath}" 2>/dev/null`;

  execSync(cmd, { stdio: 'pipe' });
  return outputPath;
}

/**
 * Convert audio file to base64 data URI
 * @param {string} audioPath
 * @returns {Promise<string>}
 */
async function audioToBase64(audioPath) {
  let buffer = await readFile(path.resolve(audioPath));
  return `data:audio/mpeg;base64,${buffer.toString('base64')}`;
}

// --- High-level pipeline ---

/**
 * Process single segment: extract audio → identify face → create task → poll → download
 * @param {Object} inputs
 * @param {Object} params
 * @returns {Promise<Object>}
 */
async function processSegment(inputs, params) {
  let { startTime, endTime, segmentId, outputDir, accessKey, secretKey, baseUrl } = params;

  let lipsyncDir = path.join(outputDir, 'lipsync-videos');
  let clipsDir = path.join(outputDir, 'audio-clips');
  await mkdir(lipsyncDir, { recursive: true });
  await mkdir(clipsDir, { recursive: true });

  let outputPath = path.join(lipsyncDir, `${segmentId}.mp4`);
  if (existsSync(outputPath)) {
    return { videoPath: outputPath, cached: true };
  }

  // 1. Extract audio clip
  let clipPath = path.join(clipsDir, `${segmentId}.mp3`);
  extractAudioClip(inputs.audioPath, startTime, endTime, clipPath);
  let audioDurationMs = Math.round((endTime - startTime) * 1000);

  // 2. Convert to base64
  let audioBase64 = await audioToBase64(clipPath);

  // 3. Identify face
  let token = generateJWT(accessKey, secretKey);
  let faceData = await identifyFace(inputs.videoUrl, token, baseUrl);

  if (!faceData.face_data || faceData.face_data.length === 0) {
    throw new Error('No face detected in video');
  }

  let face = faceData.face_data[0];

  // 4. Create task
  token = generateJWT(accessKey, secretKey);
  let task = await createLipsyncTask(
    faceData.session_id,
    face.face_id,
    audioBase64,
    audioDurationMs,
    face.start_time || 0,
    token,
    baseUrl,
  );

  // 5. Poll
  let result = await pollTaskCompletion(task.task_id, token, params);

  // 6. Download
  let resultVideoUrl = result.task_result?.videos?.[0]?.url;
  if (!resultVideoUrl) {
    throw new Error('No video URL in task result');
  }

  await downloadResult(resultVideoUrl, outputPath);
  return { videoPath: outputPath, taskId: task.task_id, cached: false };
}

/**
 * Process batch of segments with concurrency
 * @param {Object} inputs
 * @param {Object} params
 * @returns {Promise<Map>}
 */
async function processBatch(inputs, params) {
  let segments = params.segments;
  let videoMap = params.videoMap || {};
  let concurrency = params.concurrency;
  let results = new Map();

  for (let i = 0; i < segments.length; i += concurrency) {
    let batch = segments.slice(i, i + concurrency);

    let batchResults = await Promise.allSettled(
      batch.map(async (segment) => {
        let videoUrl = videoMap[segment.promptId];
        if (!videoUrl) return null;

        let segParams = {
          ...params,
          segmentId: segment.promptId,
          startTime: segment.start,
          endTime: segment.end,
        };

        let result = await processSegment(
          { videoUrl, audioPath: inputs.audioPath },
          segParams,
        );
        return { promptId: segment.promptId, ...result };
      })
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value) {
        results.set(result.value.promptId, result.value.videoPath);
      }
    }
  }

  return results;
}
