import {
  createXRSpatialPreview,
  createXRSpatialScene,
  createXRPointerEvent,
  getWebXRSupport,
  hitTestXRPanels,
} from '../xr/index.js';

const layoutTree = {
  id: 'workspace',
  type: 'split',
  direction: 'horizontal',
  first: {
    id: 'navigation',
    type: 'panel',
    panelType: 'navigation',
    component: 'layout-sidebar',
    panelState: { area: 'left' },
  },
  second: {
    id: 'workbench',
    type: 'split',
    direction: 'vertical',
    first: {
      id: 'graph',
      type: 'panel',
      panelType: 'graph',
      component: 'canvas-graph',
      xr: { anchor: 'front', priority: -2, size: [1.16, 0.72] },
    },
    second: {
      id: 'runtime',
      type: 'panel',
      panelType: 'runtime',
      component: 'sn-data-card',
      panelState: { area: 'lower' },
    },
  },
  global: [
    {
      id: 'inspector',
      type: 'panel',
      panelType: 'inspector',
      component: 'tree-view',
      panelState: { area: 'right' },
    },
    {
      id: 'status',
      type: 'panel',
      panelType: 'status',
      component: 'event-feed',
      panelState: { area: 'status' },
    },
  ],
};

const stage = document.getElementById('stage');
const space = document.getElementById('space');
const status = document.getElementById('status');
const hue = document.getElementById('hue');
const scale = document.getElementById('scale');
const depth = document.getElementById('depth');

let spatialScene = createXRSpatialScene(layoutTree, {
  themeScope: 'default-provider',
  userSpace: { eyeHeight: 1.62, comfortRadius: 2 },
  preview: { pixelsPerMeter: Number(scale.value) },
});
let activeHit = null;
let support = await getWebXRSupport(globalThis);

function updateScene() {
  spatialScene = createXRSpatialScene(layoutTree, {
    themeScope: 'default-provider',
    userSpace: { eyeHeight: 1.62, comfortRadius: 2 },
    preview: { pixelsPerMeter: Number(scale.value) },
  });
}

function positionPanel(element, panel) {
  let preview = createXRSpatialPreview(panel, spatialScene, {
    pixelsPerMeter: Number(scale.value),
    depthScale: Number(depth.value) / 120,
  });

  element.style.width = `${preview.width}px`;
  element.style.height = `${preview.height}px`;
  element.style.opacity = String(preview.opacity);
  element.style.transform = preview.transform;
}

function renderPanels() {
  space.replaceChildren();
  for (let panel of spatialScene.panels) {
    let node = document.createElement('article');
    node.className = 'panel';
    node.dataset.panelId = panel.id;
    node.dataset.hit = String(activeHit?.panelId === panel.id);
    node.innerHTML = `
      <header class="panel-head">
        <span>${panel.panelType}</span>
        <span class="panel-badge">${panel.anchor}</span>
      </header>
      <div class="panel-body">
        <span>${panel.component}</span>
        <span class="row"></span>
        <span class="row"></span>
        <span class="row"></span>
      </div>
    `;
    positionPanel(node, panel);
    space.append(node);
  }
  renderStatus();
}

function renderStatus() {
  let xrMode = support.supported ? 'available' : 'fallback';
  let pointer = activeHit
    ? `${activeHit.panelId} (${activeHit.point.x.toFixed(2)}, ${activeHit.point.y.toFixed(2)})`
    : 'none';
  status.innerHTML = `
    <div>XR capability: ${xrMode}</div>
    <div>Panels: ${spatialScene.panels.length}</div>
    <div>Space: ${spatialScene.coordinateSystem}</div>
    <div>Theme scope: ${spatialScene.themeScope}</div>
    <div>Pointer hit: ${pointer}</div>
  `;
}

function updateTheme() {
  document.documentElement.style.setProperty('--sn-hue', hue.value);
}

function rayFromPointer(event) {
  let rect = stage.getBoundingClientRect();
  let x = (event.clientX - rect.left) / rect.width - 0.5;
  let y = 0.5 - (event.clientY - rect.top) / rect.height;
  return {
    origin: [x * 1.4, 1.32 + y * 0.72, 0],
    direction: [-x * 0.28, -y * 0.18, -1],
  };
}

function updatePointer(event) {
  let ray = rayFromPointer(event);
  activeHit = hitTestXRPanels(ray, spatialScene.panels);
  createXRPointerEvent(activeHit, { source: 'mouse-fallback', primary: event.buttons === 1, ray }, 'pointermove');
  renderPanels();
}

for (let input of [hue, scale, depth]) {
  input.addEventListener('input', () => {
    updateTheme();
    updateScene();
    renderPanels();
  });
}

stage.addEventListener('pointermove', updatePointer);
stage.addEventListener('pointerleave', () => {
  activeHit = null;
  renderPanels();
});

updateTheme();
renderPanels();
