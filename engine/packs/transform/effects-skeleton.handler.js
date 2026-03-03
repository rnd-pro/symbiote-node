/**
 * transform/effects-skeleton — Beat data → visual effects metadata
 *
 * Pure data transform: analyzes beat/energy arrays to produce
 * structured metadata for driving visual effects (transitions,
 * drops, fades, intensity zones).
 *
 * Input: beatData from ai/beat-detect handler
 * Output: effects skeleton with zones, anchors, markers
 *
 * Ported from Mr-Computer/modules/ai-music-video/src/services/effects-skeleton.js
 *
 * @module agi-graph/packs/transform/effects-skeleton
 */

export default {
  type: 'transform/effects-skeleton',
  category: 'transform',
  icon: 'equalizer',

  driver: {
    description: 'Analyze beat data → intensity zones, drops, fades, transitions',
    inputs: [
      { name: 'beatData', type: 'any' },
    ],
    outputs: [
      { name: 'skeleton', type: 'any' },
      { name: 'error', type: 'string' },
    ],
    params: {
      energyPerSecond: { type: 'int', default: 10, description: 'Energy samples per second' },
      fadeWindowSize: { type: 'number', default: 2.0, description: 'Fade detection window (seconds)' },
      transitionThreshold: { type: 'number', default: 0.25, description: 'Intensity change threshold' },
      dropThreshold: { type: 'number', default: 0.7, description: 'Drop peak threshold (0-1)' },
      // annotate mode
      segments: { type: 'any', default: null, description: 'Timeline segments to annotate with effects' },
    },
  },

  lifecycle: {
    validate: (inputs) => {
      if (!inputs.beatData) return false;
      return true;
    },

    cacheKey: (inputs, params) => {
      const bd = inputs.beatData;
      return `effects:${bd.duration || 0}:${bd.tempo || 0}:${params.energyPerSecond}`;
    },

    execute: async (inputs, params) => {
      try {
        const skeleton = generateEffectsSkeleton(inputs.beatData, params);

        // If segments provided, annotate them with effects
        if (params.segments) {
          skeleton.annotatedSegments = annotateSegmentsWithEffects(params.segments, skeleton);
        }

        return { skeleton, error: null };
      } catch (err) {
        return { skeleton: null, error: err.message };
      }
    },
  },
};

// --- Pure analysis functions (ported from effects-skeleton.js) ---

/**
 * Detect intensity zones from energy data
 * @param {number[]} energy - Energy values per time unit
 * @param {number} eps - Samples per second
 * @returns {Array<{start: number, end: number, level: string, avgEnergy: number}>}
 */
function detectIntensityZones(energy, eps) {
  if (!energy || energy.length === 0) return [];

  const sorted = [...energy].sort((a, b) => a - b);
  const lowThreshold = sorted[Math.floor(sorted.length * 0.33)];
  const highThreshold = sorted[Math.floor(sorted.length * 0.66)];

  const zones = [];
  let current = null;

  for (let i = 0; i < energy.length; i++) {
    const time = i / eps;
    const e = energy[i];
    const level = e <= lowThreshold ? 'low' : e >= highThreshold ? 'high' : 'medium';

    if (!current || current.level !== level) {
      if (current) {
        current.end = time;
        current.avgEnergy = current._sum / current._n;
        delete current._sum;
        delete current._n;
        zones.push(current);
      }
      current = { start: time, end: time, level, _sum: e, _n: 1 };
    } else {
      current.end = time;
      current._sum += e;
      current._n++;
    }
  }

  if (current) {
    current.avgEnergy = current._sum / current._n;
    delete current._sum;
    delete current._n;
    zones.push(current);
  }

  // Merge short zones (< 1s)
  const merged = [];
  for (const zone of zones) {
    if (zone.end - zone.start < 1.0 && merged.length > 0) {
      merged[merged.length - 1].end = zone.end;
    } else {
      merged.push(zone);
    }
  }
  return merged;
}

/**
 * Find fade zones — where intensity decreases significantly
 * @param {number[]} energy
 * @param {number} eps
 * @param {number} windowSize - Seconds
 * @returns {Array<{start: number, end: number, fadeAmount: number}>}
 */
function detectFadeZones(energy, eps, windowSize) {
  if (!energy || energy.length === 0) return [];

  const ws = Math.floor(windowSize * eps);
  const fades = [];

  for (let i = ws; i < energy.length; i++) {
    const prevAvg = energy.slice(i - ws, i).reduce((a, b) => a + b, 0) / ws;
    const currEnd = Math.min(i + ws, energy.length);
    const currAvg = energy.slice(i, currEnd).reduce((a, b) => a + b, 0) / (currEnd - i);

    const fadeAmount = prevAvg - currAvg;
    if (fadeAmount > 0.15) {
      const time = i / eps;
      const last = fades[fades.length - 1];
      if (!last || time - last.end > 2.0) {
        fades.push({
          start: time - windowSize,
          end: time + windowSize,
          fadeAmount: Math.round(fadeAmount * 100) / 100,
        });
      }
    }
  }
  return fades;
}

/**
 * Detect transition anchors — significant intensity changes
 * @param {number[]} energy
 * @param {number} eps
 * @param {number} threshold
 * @returns {Array<{time: number, type: string, magnitude: number}>}
 */
function detectTransitionAnchors(energy, eps, threshold) {
  if (!energy || energy.length === 0) return [];

  const anchors = [];
  for (let i = 1; i < energy.length; i++) {
    const change = energy[i] - energy[i - 1];
    if (Math.abs(change) > threshold) {
      anchors.push({
        time: i / eps,
        type: change > 0 ? 'rise' : 'drop',
        magnitude: Math.round(Math.abs(change) * 100) / 100,
      });
    }
  }

  // Deduplicate within 1s
  const deduped = [];
  for (const a of anchors) {
    const last = deduped[deduped.length - 1];
    if (!last || a.time - last.time > 1.0) {
      deduped.push(a);
    } else if (a.magnitude > last.magnitude) {
      deduped[deduped.length - 1] = a;
    }
  }
  return deduped;
}

/**
 * Detect drop points — high energy peaks
 * @param {number[]} energy
 * @param {number} eps
 * @param {number[]} strongOnsets
 * @param {number} threshold
 * @returns {Array<{time: number, intensity: number, source: string}>}
 */
function detectDropPoints(energy, eps, strongOnsets, threshold) {
  if (!energy || energy.length === 0) return [];

  const drops = [];
  const maxEnergy = Math.max(...energy);

  for (let i = 1; i < energy.length - 1; i++) {
    if (energy[i] > energy[i - 1] && energy[i] > energy[i + 1] && energy[i] > maxEnergy * threshold) {
      drops.push({
        time: i / eps,
        intensity: Math.round((energy[i] / maxEnergy) * 100) / 100,
        source: 'energy-peak',
      });
    }
  }

  for (const onset of strongOnsets) {
    drops.push({ time: onset, intensity: 0.8, source: 'strong-onset' });
  }

  drops.sort((a, b) => a.time - b.time);

  const deduped = [];
  for (const d of drops) {
    const last = deduped[deduped.length - 1];
    if (!last || d.time - last.time > 0.5) deduped.push(d);
    else if (d.intensity > last.intensity) deduped[deduped.length - 1] = d;
  }
  return deduped;
}

/**
 * Get interpolated energy at a time point
 * @param {number} time
 * @param {number[]} energy
 * @param {number} eps
 * @returns {number}
 */
function getEnergyAtTime(time, energy, eps) {
  if (!energy || energy.length === 0) return 0.5;
  const idx = time * eps;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo < 0) return energy[0] || 0.5;
  if (hi >= energy.length) return energy[energy.length - 1] || 0.5;
  if (lo === hi) return energy[lo];
  const f = idx - lo;
  return energy[lo] * (1 - f) + energy[hi] * f;
}

/**
 * Generate beat markers with per-beat energy
 * @param {number[]} beats
 * @param {number[]} energy
 * @param {number} eps
 * @returns {Array<{time: number, index: number, energy: number, isStrong: boolean, isDownbeat: boolean}>}
 */
function generateBeatMarkers(beats, energy, eps) {
  if (!beats || beats.length === 0) return [];

  const evals = beats.map(t => getEnergyAtTime(t, energy, eps));
  const avg = evals.reduce((a, b) => a + b, 0) / evals.length;
  const strongThreshold = avg * 1.3;

  return beats.map((time, index) => {
    const e = getEnergyAtTime(time, energy, eps);
    return {
      time,
      index,
      energy: Math.round(e * 1000) / 1000,
      isStrong: e > strongThreshold,
      isDownbeat: index % 4 === 0,
      isOffbeat: index % 2 === 1,
    };
  });
}

/**
 * Detect high-resolution transitions using beat timestamps
 * @param {number[]} beats
 * @param {number[]} energy
 * @param {number} eps
 * @returns {Array<{time: number, type: string, magnitude: number, beatIndex: number}>}
 */
function detectHiResTransitions(beats, energy, eps) {
  if (!beats || beats.length < 2) return [];

  const transitions = [];
  const windowBeats = 4;
  const threshold = 0.2;

  for (let i = windowBeats; i < beats.length; i++) {
    let prevSum = 0;
    for (let j = i - windowBeats; j < i; j++) {
      prevSum += getEnergyAtTime(beats[j], energy, eps);
    }
    const prevAvg = prevSum / windowBeats;

    let currSum = 0;
    const end = Math.min(i + windowBeats, beats.length);
    for (let j = i; j < end; j++) {
      currSum += getEnergyAtTime(beats[j], energy, eps);
    }
    const currAvg = currSum / (end - i);

    const change = currAvg - prevAvg;
    if (Math.abs(change) > threshold) {
      transitions.push({
        time: beats[i],
        beatIndex: i,
        type: change > 0 ? 'rise' : 'drop',
        magnitude: Math.round(Math.abs(change) * 100) / 100,
      });
    }
  }

  const deduped = [];
  for (const t of transitions) {
    const last = deduped[deduped.length - 1];
    if (!last || t.beatIndex - last.beatIndex > 2) deduped.push(t);
    else if (t.magnitude > last.magnitude) deduped[deduped.length - 1] = t;
  }
  return deduped;
}

/**
 * Generate complete effects skeleton from beat data
 * @param {Object} beatData - Data from ai/beat-detect
 * @param {Object} params - Handler params
 * @returns {Object} Effects skeleton
 */
function generateEffectsSkeleton(beatData, params) {
  const {
    energy = [],
    peaks = [],
    beats = [],
    tempo = 120,
    duration = 0,
    quietZones = [],
    strongOnsets = [],
  } = beatData;

  // Support both snake_case (librosa output) and camelCase
  const rawQuietZones = beatData.quiet_zones || quietZones;
  const rawStrongOnsets = beatData.strong_onsets || strongOnsets;
  const rawEps = beatData.energy_per_second || params.energyPerSecond || 10;
  const rawDownbeats = beatData.downbeats || [];

  const eps = rawEps;

  const intensityZones = detectIntensityZones(energy, eps);
  const fadeZones = detectFadeZones(energy, eps, params.fadeWindowSize || 2.0);
  const transitionAnchors = detectTransitionAnchors(energy, eps, params.transitionThreshold || 0.25);
  const dropPoints = detectDropPoints(energy, eps, rawStrongOnsets, params.dropThreshold || 0.7);
  const beatMarkers = generateBeatMarkers(beats, energy, eps);
  const hiResTransitions = detectHiResTransitions(beats, energy, eps);

  const normalizedQuietZones = rawQuietZones.map(z => ({
    start: z.start,
    end: z.end || (z.start + (z.duration || 0)),
    duration: z.duration || (z.end ? z.end - z.start : 0),
  }));

  const downbeatAnchors = rawDownbeats.map(t => ({ time: t, type: 'downbeat' }));

  return {
    metadata: {
      duration,
      tempo,
      totalEnergySamples: energy.length,
      energyPerSecond: eps,
      totalBeats: beats.length,
      resolution: 'millisecond',
    },
    intensityZones,
    fadeZones,
    transitionAnchors,
    hiResTransitions,
    dropPoints,
    quietZones: normalizedQuietZones,
    downbeatAnchors,
    beatMarkers,
  };
}

/**
 * Annotate timeline segments with effects metadata
 * @param {Array} segments - Timeline segments [{start, end, ...}]
 * @param {Object} skeleton - Effects skeleton
 * @returns {Array} Segments with .effects field
 */
function annotateSegmentsWithEffects(segments, skeleton) {
  return segments.map(seg => {
    const { start, end } = seg;
    const mid = (start + end) / 2;

    const zone = skeleton.intensityZones.find(z => z.start <= mid && z.end >= mid);
    const inFade = skeleton.fadeZones.some(z => z.start <= end && z.end >= start);
    const drops = skeleton.dropPoints.filter(d => d.time >= start && d.time <= end);
    const trans = skeleton.transitionAnchors.filter(a => a.time >= start && a.time <= end);

    return {
      ...seg,
      effects: {
        intensity: zone?.level || 'medium',
        avgEnergy: zone?.avgEnergy || 0.5,
        isFadeCandidate: inFade,
        hasDrops: drops.length > 0,
        dropCount: drops.length,
        hasTransition: trans.length > 0,
        transitionType: trans[0]?.type || null,
      },
    };
  });
}
