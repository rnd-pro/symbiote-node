import {
  WEBXR_FEATURES,
  WEBXR_MODES,
  createWebXRRenderLoop,
  endWebXRSession,
  listWebXRInputSources,
  requestWebXRReferenceSpace,
  requestWebXRSession,
} from './webxr.js';
import { applyXRThemeToPanel, createXRThemeSnapshot } from './theme-bridge.js';

function initialState(options = {}) {
  return {
    status: 'idle',
    mode: null,
    scene: options.scene || null,
    session: null,
    referenceSpace: null,
    inputSources: [],
    frameCount: 0,
    lastFrameTime: null,
    reason: null,
    themeSnapshot: options.themeSnapshot || null,
    renderMode: 'dom-fallback',
  };
}

export function createXRSceneController(options = {}) {
  let target = options.globalThis || globalThis;
  let referenceSpaceType = options.referenceSpaceType || WEBXR_FEATURES.localFloor;
  let renderLoop = null;
  let onFrame = options.onFrame || null;
  let state = initialState(options);

  function snapshotState() {
    return {
      ...state,
      inputSources: [...state.inputSources],
      scene: state.scene,
      session: state.session,
      referenceSpace: state.referenceSpace,
      themeSnapshot: state.themeSnapshot,
    };
  }

  function setScene(scene, sceneOptions = {}) {
    let themeSnapshot = sceneOptions.themeSnapshot || state.themeSnapshot || createXRThemeSnapshot(sceneOptions.themeRoot, {
      themeScope: scene?.themeScope,
    });
    state = {
      ...state,
      scene: scene
        ? {
          ...scene,
          panels: scene.panels.map((panel) => applyXRThemeToPanel(panel, themeSnapshot)),
          themeScope: scene.themeScope || themeSnapshot.themeScope,
        }
        : null,
      themeSnapshot,
    };
    return snapshotState();
  }

  async function start(mode = WEBXR_MODES.immersiveVr, sessionOptions = {}) {
    if (state.status === 'running') {
      return { ok: true, state: snapshotState() };
    }

    let sessionResult = await requestWebXRSession(target, mode, sessionOptions);
    if (!sessionResult.ok) {
      state = {
        ...state,
        status: 'fallback',
        mode,
        reason: sessionResult.reason || 'unsupported',
        renderMode: 'dom-fallback',
      };
      return { ok: false, reason: state.reason, state: snapshotState() };
    }

    let referenceResult = await requestWebXRReferenceSpace(sessionResult.session, referenceSpaceType);
    if (!referenceResult.ok) {
      await endWebXRSession(sessionResult.session);
      state = {
        ...state,
        status: 'fallback',
        mode,
        reason: referenceResult.reason || 'reference-space-failed',
        renderMode: 'dom-fallback',
      };
      return { ok: false, reason: state.reason, state: snapshotState() };
    }

    state = {
      ...state,
      status: 'running',
      mode,
      session: sessionResult.session,
      referenceSpace: referenceResult.referenceSpace,
      inputSources: listWebXRInputSources(sessionResult.session),
      reason: null,
      renderMode: 'webxr-session',
    };

    renderLoop = createWebXRRenderLoop(sessionResult.session, (time, frame, session) => {
      state = {
        ...state,
        frameCount: state.frameCount + 1,
        lastFrameTime: time,
        inputSources: listWebXRInputSources(session),
      };
      onFrame?.(time, frame, snapshotState());
    });

    return { ok: true, state: snapshotState() };
  }

  async function stop() {
    renderLoop?.stop();
    renderLoop = null;
    let session = state.session;
    let ended = await endWebXRSession(session);
    state = {
      ...state,
      status: 'stopped',
      session: null,
      referenceSpace: null,
      inputSources: [],
      renderMode: 'dom-fallback',
    };
    return { ok: ended, state: snapshotState() };
  }

  return {
    setScene,
    start,
    stop,
    getState: snapshotState,
  };
}
