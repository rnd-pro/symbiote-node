export const WEBXR_RENDERER_NAME = 'webxr';

export const WEBXR_MODES = Object.freeze({
  inline: 'inline',
  immersiveVr: 'immersive-vr',
  immersiveAr: 'immersive-ar',
});

export const WEBXR_FEATURES = Object.freeze({
  local: 'local',
  localFloor: 'local-floor',
  boundedFloor: 'bounded-floor',
  viewer: 'viewer',
  domOverlay: 'dom-overlay',
  hitTest: 'hit-test',
  anchors: 'anchors',
  handTracking: 'hand-tracking',
  layers: 'layers',
});

export const WEBXR_RENDERER = Object.freeze({
  name: WEBXR_RENDERER_NAME,
  status: 'experimental',
  specifier: 'symbiote-node/xr',
  description: 'WebXR capability, session, render-loop, and input adapter primitives for spatial host applications.',
  modes: Object.values(WEBXR_MODES),
  fallback: 'dom-canvas',
  capabilities: [
    'immersive-vr',
    'immersive-ar',
    'inline-xr',
    'xr-layout-projection',
    'xr-spatial-scene',
    'xr-scene-controller',
    'xr-theme-bridge',
    'xr-panel-host',
    'xr-content-viewport',
    'xr-html-in-canvas-renderer',
    'xr-pointer-normalization',
    'xr-content-pointer-target',
    'xr-panel-gesture',
    'xr-layout-transaction',
    'xr-emulated-test-runtime',
    'iwer-emulation-runtime',
    'dom-overlay-optional',
    'webgl-layer',
    'feature-detected-fallback',
  ],
  features: Object.values(WEBXR_FEATURES),
});

function hasFn(source, name) {
  return typeof source?.[name] === 'function';
}

function getXR(target) {
  return target?.navigator?.xr || null;
}

async function sessionSupported(xr, mode) {
  if (!hasFn(xr, 'isSessionSupported')) return false;
  try {
    return Boolean(await xr.isSessionSupported(mode));
  } catch {
    return false;
  }
}

export async function getWebXRSupport(target = globalThis) {
  let xr = getXR(target);
  let modes = {
    inline: await sessionSupported(xr, WEBXR_MODES.inline),
    immersiveVr: await sessionSupported(xr, WEBXR_MODES.immersiveVr),
    immersiveAr: await sessionSupported(xr, WEBXR_MODES.immersiveAr),
  };

  return {
    name: WEBXR_RENDERER_NAME,
    status: 'experimental',
    supported: Boolean(xr) && Object.values(modes).some(Boolean),
    fallback: WEBXR_RENDERER.fallback,
    modes,
    apis: {
      navigatorXrAvailable: Boolean(xr),
      isSessionSupportedAvailable: hasFn(xr, 'isSessionSupported'),
      requestSessionAvailable: hasFn(xr, 'requestSession'),
      XRWebGLLayerAvailable: typeof target?.XRWebGLLayer === 'function',
      XRReferenceSpaceAvailable: typeof target?.XRReferenceSpace === 'function',
      XRFrameAvailable: typeof target?.XRFrame === 'function',
      XRInputSourceAvailable: typeof target?.XRInputSource === 'function',
    },
    features: WEBXR_RENDERER.features,
  };
}

export function normalizeWebXRSessionOptions(options = {}) {
  let requiredFeatures = [...new Set(options.requiredFeatures || [])];
  let optionalFeatures = [...new Set(options.optionalFeatures || [
    WEBXR_FEATURES.localFloor,
    WEBXR_FEATURES.boundedFloor,
    WEBXR_FEATURES.handTracking,
    WEBXR_FEATURES.hitTest,
    WEBXR_FEATURES.domOverlay,
    WEBXR_FEATURES.layers,
  ])];
  let normalized = { requiredFeatures, optionalFeatures };
  if (options.domOverlayRoot) {
    normalized.domOverlay = { root: options.domOverlayRoot };
  }
  return normalized;
}

export async function requestWebXRSession(target = globalThis, mode = WEBXR_MODES.immersiveVr, options = {}) {
  let xr = getXR(target);
  if (!hasFn(xr, 'requestSession')) {
    return { ok: false, reason: 'unsupported', session: null };
  }
  try {
    let session = await xr.requestSession(mode, normalizeWebXRSessionOptions(options));
    return { ok: true, mode, session };
  } catch (error) {
    return {
      ok: false,
      mode,
      reason: error?.name || 'request-failed',
      message: error?.message || '',
      session: null,
    };
  }
}

export async function endWebXRSession(session) {
  if (!hasFn(session, 'end')) return false;
  await session.end();
  return true;
}

export function createWebXRLayer(target = globalThis, session, gl, options = {}) {
  if (typeof target?.XRWebGLLayer !== 'function') {
    return { ok: false, reason: 'unsupported', layer: null };
  }
  if (!session || !gl) {
    return { ok: false, reason: 'missing-session-or-context', layer: null };
  }
  try {
    return { ok: true, layer: new target.XRWebGLLayer(session, gl, options) };
  } catch (error) {
    return {
      ok: false,
      reason: error?.name || 'layer-failed',
      message: error?.message || '',
      layer: null,
    };
  }
}

export function syncWebXRCanvas(canvas, gl, session) {
  let layer = session?.renderState?.baseLayer || null;
  if (!canvas || !layer) return false;
  let width = Number(layer.framebufferWidth || 0);
  let height = Number(layer.framebufferHeight || 0);
  if (!width || !height) return false;
  canvas.width = width;
  canvas.height = height;
  if (hasFn(gl, 'bindFramebuffer')) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
  }
  return true;
}

export function createWebXRRenderLoop(session, callback) {
  let active = true;
  let handle = null;
  let loop = (time, frame) => {
    if (!active) return;
    callback?.(time, frame, session);
    if (active && hasFn(session, 'requestAnimationFrame')) {
      handle = session.requestAnimationFrame(loop);
    }
  };
  if (hasFn(session, 'requestAnimationFrame')) {
    handle = session.requestAnimationFrame(loop);
  }
  return {
    stop() {
      active = false;
      if (handle != null && hasFn(session, 'cancelAnimationFrame')) {
        session.cancelAnimationFrame(handle);
      }
    },
  };
}

export async function requestWebXRReferenceSpace(session, type = WEBXR_FEATURES.localFloor) {
  if (!hasFn(session, 'requestReferenceSpace')) {
    return { ok: false, reason: 'unsupported', referenceSpace: null };
  }
  try {
    return {
      ok: true,
      type,
      referenceSpace: await session.requestReferenceSpace(type),
    };
  } catch (error) {
    return {
      ok: false,
      type,
      reason: error?.name || 'reference-space-failed',
      message: error?.message || '',
      referenceSpace: null,
    };
  }
}

export function listWebXRInputSources(session) {
  return Array.from(session?.inputSources || []);
}

export function createWebXRAdapter(options = {}) {
  let target = options.globalThis || globalThis;
  let session = null;

  return {
    ...WEBXR_RENDERER,
    async getSupport() {
      return getWebXRSupport(target);
    },
    async isSupported(mode = WEBXR_MODES.immersiveVr) {
      let xr = getXR(target);
      return sessionSupported(xr, mode);
    },
    async requestSession(mode = WEBXR_MODES.immersiveVr, sessionOptions = {}) {
      let result = await requestWebXRSession(target, mode, sessionOptions);
      if (result.ok) session = result.session;
      return result;
    },
    async endSession() {
      let ended = await endWebXRSession(session);
      session = null;
      return ended;
    },
    getSession() {
      return session;
    },
    requestReferenceSpace(type) {
      return requestWebXRReferenceSpace(session, type);
    },
    createLayer(gl, layerOptions) {
      return createWebXRLayer(target, session, gl, layerOptions);
    },
    createRenderLoop(callback) {
      return createWebXRRenderLoop(session, callback);
    },
    getInputSources() {
      return listWebXRInputSources(session);
    },
  };
}
