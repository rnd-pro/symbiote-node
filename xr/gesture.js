function numberOr(value, fallback) {
  let number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundMetric(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function normalizePoint(point = {}) {
  return {
    x: clamp(numberOr(point.x, 0), 0, 1),
    y: clamp(numberOr(point.y, 0), 0, 1),
  };
}

function normalizeRect(rect = {}) {
  return {
    x: clamp(numberOr(rect.x, 0), 0, 1),
    y: clamp(numberOr(rect.y, 0), 0, 1),
    width: clamp(numberOr(rect.width, 1), 0.04, 1),
    height: clamp(numberOr(rect.height, 1), 0.04, 1),
  };
}

function rectFromPanel(panel = {}) {
  return normalizeRect(panel.relativeRect || panel.layoutNode?.layout?.rect || { x: 0, y: 0, width: 1, height: 1 });
}

function moveRect(rect, delta, options = {}) {
  let minWidth = numberOr(options.minWidth, 0.04);
  let minHeight = numberOr(options.minHeight, 0.04);
  let width = clamp(rect.width, minWidth, 1);
  let height = clamp(rect.height, minHeight, 1);
  return {
    x: roundMetric(clamp(rect.x + delta.x, 0, 1 - width)),
    y: roundMetric(clamp(rect.y + delta.y, 0, 1 - height)),
    width: roundMetric(width),
    height: roundMetric(height),
  };
}

function resizeRect(rect, delta, options = {}) {
  let minWidth = numberOr(options.minWidth, 0.08);
  let minHeight = numberOr(options.minHeight, 0.08);
  let width = clamp(rect.width + delta.x, minWidth, 1 - rect.x);
  let height = clamp(rect.height + delta.y, minHeight, 1 - rect.y);
  return {
    x: roundMetric(rect.x),
    y: roundMetric(rect.y),
    width: roundMetric(width),
    height: roundMetric(height),
  };
}

function resolveGestureMode(options = {}) {
  if (options.mode === 'resize' || options.operation === 'resize') return 'resize';
  if (options.mode === 'move' || options.operation === 'move') return 'move';
  return 'read-only';
}

export function createXRPanelGestureState(options = {}) {
  let panel = options.panel || {};
  let startPointer = normalizePoint(options.pointerEvent?.point || options.point);
  let startRect = normalizeRect(options.relativeRect || panel.relativeRect || rectFromPanel(panel));
  return {
    version: 'xr-panel-gesture-v1',
    mode: resolveGestureMode(options),
    status: options.status || 'ready',
    layoutId: String(options.layoutId || ''),
    panelId: String(options.panelId || panel.id || options.nodeId || ''),
    nodeId: String(options.nodeId || panel.layoutNode?.id || panel.id || ''),
    component: panel.component || panel.panelType || '',
    startPoint: startPointer,
    point: startPointer,
    startRect,
    relativeRect: startRect,
    contentPoint: options.pointerEvent?.contentPoint || null,
    delta: { x: 0, y: 0 },
    operation: resolveGestureMode(options),
  };
}

export function updateXRPanelGesture(state = {}, pointerEvent = {}, options = {}) {
  let point = normalizePoint(pointerEvent.point);
  let startPoint = normalizePoint(state.startPoint);
  let delta = {
    x: roundMetric(point.x - startPoint.x),
    y: roundMetric(point.y - startPoint.y),
  };
  let operation = resolveGestureMode({ ...state, ...options });
  let startRect = normalizeRect(state.startRect || state.relativeRect);
  let relativeRect = operation === 'resize'
    ? resizeRect(startRect, delta, options)
    : operation === 'move'
      ? moveRect(startRect, delta, options)
      : startRect;

  return {
    ...state,
    mode: operation,
    status: pointerEvent.buttons?.primary || options.active ? 'dragging' : 'select',
    point,
    contentPoint: pointerEvent.contentPoint || state.contentPoint || null,
    delta,
    relativeRect,
    operation,
  };
}

export function createXRLayoutTransactionFromGesture(state = {}, options = {}) {
  if (!state.nodeId || !state.layoutId) {
    return null;
  }
  if (state.operation !== 'move' && state.operation !== 'resize') {
    return null;
  }
  if (!state.delta || (state.delta.x === 0 && state.delta.y === 0)) {
    return null;
  }
  return {
    version: 'project-transaction-v1',
    id: options.id || `tx:xr-layout:${state.layoutId}:${state.nodeId}`,
    targetProject: options.targetProject || null,
    operations: [{
      type: 'layout.updateNode',
      layout: state.layoutId,
      nodeId: state.nodeId,
      patch: {
        layout: {
          rect: state.relativeRect,
        },
      },
    }],
    metadata: {
      source: 'symbiote-node/xr',
      gesture: {
        panelId: state.panelId,
        operation: state.operation,
        delta: state.delta,
        contentPoint: state.contentPoint,
      },
    },
  };
}
