function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function subtract(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scale(v, s) {
  return [v[0] * s, v[1] * s, v[2] * s];
}

function normalize(v) {
  let length = Math.hypot(v[0], v[1], v[2]);
  if (!length) return [0, 0, -1];
  return [v[0] / length, v[1] / length, v[2] / length];
}

function degToRad(value) {
  return Number(value || 0) * Math.PI / 180;
}

function panelAxes(panel) {
  let yaw = degToRad(panel.rotation?.[1] || 0);
  let right = [Math.cos(yaw), 0, -Math.sin(yaw)];
  let up = [0, 1, 0];
  let normal = normalize([Math.sin(yaw), 0, Math.cos(yaw)]);
  return { right, up, normal };
}

export function hitTestXRPanel(ray, panel) {
  if (!ray || !panel) return null;
  let origin = ray.origin || [0, 0, 0];
  let direction = normalize(ray.direction || [0, 0, -1]);
  let center = panel.position || [0, 0, -1];
  let [width, height] = panel.size || [1, 1];
  let { right, up, normal } = panelAxes(panel);
  let denom = dot(normal, direction);
  if (Math.abs(denom) < 0.000001) return null;
  let t = dot(normal, subtract(center, origin)) / denom;
  if (t < 0) return null;

  let hitPoint = add(origin, scale(direction, t));
  let local = subtract(hitPoint, center);
  let xMeters = dot(local, right);
  let yMeters = dot(local, up);
  let x = xMeters / width + 0.5;
  let y = 0.5 - yMeters / height;
  if (x < 0 || x > 1 || y < 0 || y > 1) return null;

  return {
    panelId: panel.id,
    point: { x, y },
    worldPoint: hitPoint,
    distance: t,
    panel,
  };
}

export function hitTestXRPanels(ray, panels = []) {
  return panels
    .map((panel) => hitTestXRPanel(ray, panel))
    .filter(Boolean)
    .sort((a, b) => a.distance - b.distance)[0] || null;
}

export function createXRPointerEvent(hit, input = {}, type = 'pointermove') {
  if (!hit) return null;
  return {
    type,
    source: input.source || 'xr-controller',
    targetId: hit.panelId,
    point: hit.point,
    worldPoint: hit.worldPoint,
    distance: hit.distance,
    buttons: {
      primary: Boolean(input.primary),
      secondary: Boolean(input.secondary),
    },
    ray: input.ray || null,
  };
}

export function normalizeXRInputRay(inputSource, frame, referenceSpace) {
  let pose = frame?.getPose?.(inputSource?.targetRaySpace, referenceSpace);
  let transform = pose?.transform;
  if (!transform) return null;
  let matrix = transform.matrix;
  if (Array.isArray(matrix) || ArrayBuffer.isView(matrix)) {
    return {
      origin: [matrix[12], matrix[13], matrix[14]],
      direction: normalize([-matrix[8], -matrix[9], -matrix[10]]),
    };
  }
  return null;
}
