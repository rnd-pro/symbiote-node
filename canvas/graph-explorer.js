export const GRAPH_PATH_STYLES = ['pcb', 'bezier', 'orthogonal', 'straight'];

export const GRAPH_DIRECTORY_FRAME_COLORS = [
  'rgba(200, 117, 51, 0.25)',
  'rgba(212, 160, 74, 0.20)',
  'rgba(100, 180, 120, 0.20)',
  'rgba(80, 150, 200, 0.20)',
  'rgba(160, 100, 200, 0.20)',
  'rgba(200, 80, 80, 0.20)',
  'rgba(120, 200, 200, 0.20)',
  'rgba(200, 180, 80, 0.20)',
];

export function resolveInitialGraphViewMode(urlParams) {
  const modeParam = urlParams.get('mode') || (urlParams.get('flat') === 'true' ? 'flat' : null);
  return modeParam === 'flat' ? 'flat' : 'structured';
}

export function renderGraphViewModeButton(button, viewMode) {
  if (!button) return;
  const label = viewMode === 'flat' ? 'FLAT' : 'TREE';
  const icon = viewMode === 'flat' ? 'account_tree' : 'grid_view';
  button.innerHTML = `<span class="material-symbols-outlined">${icon}</span>${label}`;
  if (viewMode === 'structured') {
    button.setAttribute('data-active', '');
  } else {
    button.removeAttribute('data-active');
  }
}

export function getNextGraphPathStyle(currentStyle) {
  const index = GRAPH_PATH_STYLES.indexOf(currentStyle);
  return GRAPH_PATH_STYLES[(index + 1) % GRAPH_PATH_STYLES.length] || 'pcb';
}

export function getGraphPathStyleDisplay(style) {
  switch (style) {
    case 'bezier':
      return { icon: 'timeline', text: 'BEZIER', active: false };
    case 'orthogonal':
      return { icon: 'polyline', text: 'ORTHO', active: false };
    case 'straight':
      return { icon: 'horizontal_rule', text: 'STRAIGHT', active: false };
    case 'pcb':
    default:
      return { icon: 'route', text: 'PCB', active: true };
  }
}

export function renderGraphPathStyleButton(button, style) {
  if (!button) return;
  const { icon, text, active } = getGraphPathStyleDisplay(style);
  button.innerHTML = `<span class="material-symbols-outlined">${icon}</span>${text}`;
  if (active) {
    button.setAttribute('data-active', '');
  } else {
    button.removeAttribute('data-active');
  }
}

export function addGraphDirectoryFrames({
  editor,
  fileMap,
  dirFiles,
  positions,
  FrameClass,
  colors = GRAPH_DIRECTORY_FRAME_COLORS,
}) {
  if (!dirFiles || dirFiles.size < 2) return;

  const padding = 30;
  const nodeWidth = 120;
  const nodeHeight = 80;
  let colorIdx = 0;

  for (const [dir, files] of dirFiles) {
    if (files.length < 2) continue;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let hasPositions = false;

    for (const file of files) {
      const nodeId = fileMap.get(file);
      if (!nodeId) continue;
      const pos = positions[nodeId];
      if (!pos) continue;
      hasPositions = true;

      if (pos.x < minX) minX = pos.x;
      if (pos.y < minY) minY = pos.y;
      if (pos.x + nodeWidth > maxX) maxX = pos.x + nodeWidth;
      if (pos.y + nodeHeight > maxY) maxY = pos.y + nodeHeight;
    }

    if (!hasPositions) continue;

    const dirLabel = dir.replace(/\/$/, '').split('/').pop() || 'root';
    const color = colors[colorIdx % colors.length];
    colorIdx++;

    try {
      const frame = new FrameClass(dirLabel, {
        x: minX - padding,
        y: minY - padding,
        width: (maxX - minX) + padding * 2,
        height: (maxY - minY) + padding * 2,
        color,
      });
      editor.addFrame(frame);
    } catch {
      // Invalid frame geometry should not prevent rendering the graph.
    }
  }
}

export function setGraphLayerVisible(canvas, layer, visible) {
  if (!canvas) return;

  if (layer === 'zones') {
    const frames = canvas.querySelectorAll('graph-frame');
    for (const frame of frames) {
      frame.style.display = visible ? '' : 'none';
      frame.hidden = !visible;
    }
  } else if (layer === 'vias') {
    if (visible) {
      canvas.removeAttribute('data-hide-vias');
    } else {
      canvas.setAttribute('data-hide-vias', '');
    }
  }
}

export function toggleGraphLayerButtonState(button) {
  const isActive = button.hasAttribute('data-active');
  if (isActive) {
    button.removeAttribute('data-active');
    button.setAttribute('data-hidden', '');
  } else {
    button.setAttribute('data-active', '');
    button.removeAttribute('data-hidden');
  }
  return !isActive;
}
