/**
 * ViewportActions — context menu, keyboard shortcuts, viewport utilities
 *
 * Handles right-click menus (canvas/node/connection),
 * keyboard shortcuts (Delete, Ctrl+A, Escape),
 * fitView, selectAll, deleteSelected, and socket highlighting.
 * Extracted from NodeCanvas to reduce complexity.
 *
 * @module symbiote-node/canvas/ViewportActions
 */

export class ViewportActions {

  /** @type {import('../core/Editor.js').NodeEditor} */
  #editor;

  /** @type {import('../interactions/Selector.js').Selector} */
  #selector;

  /** @type {Map<string, HTMLElement>} */
  #nodeViews;

  /** @type {boolean} */
  #readonly = false;

  /** @type {Array|null} - clipboard for copy/paste */
  #clipboard = null;

  /**
   * @param {object} config
   * @param {import('../core/Editor.js').NodeEditor} config.editor
   * @param {import('../interactions/Selector.js').Selector} config.selector
   * @param {Map<string, HTMLElement>} config.nodeViews
   */
  constructor({ editor, selector, nodeViews }) {
    this.#editor = editor;
    this.#selector = selector;
    this.#nodeViews = nodeViews;
  }

  /** @param {boolean} readonly */
  setReadonly(readonly) {
    this.#readonly = readonly;
  }

  /**
   * Keyboard handler — bind to container
   * @param {KeyboardEvent} e
   */
  handleKeydown = (e) => {
    if (this.#readonly) return;

    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      this.deleteSelected();
    }

    if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.selectAll();
    }

    if (e.key === 'Escape') {
      this.#selector.unselectAll();
    }

    // Copy selected nodes
    if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.#copySelected();
    }

    // Paste nodes
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.#pasteNodes();
    }

    // Align horizontal
    if (e.key === 'h' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
      e.preventDefault();
      this.alignSelectedHorizontal();
    }

    // Align vertical
    if (e.key === 'j' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
      e.preventDefault();
      this.alignSelectedVertical();
    }
  };

  /** Select all nodes */
  selectAll() {
    for (const [id] of this.#nodeViews) {
      this.#selector.selectNode(id, true);
    }
  }

  /** Delete all selected nodes and connections */
  deleteSelected() {
    if (!this.#editor || this.#readonly) return;

    for (const connId of this.#selector.getSelectedConnections()) {
      this.#editor.removeConnection(connId);
    }

    for (const nodeId of this.#selector.getSelectedNodes()) {
      this.#editor.removeNode(nodeId);
    }

    this.#selector.unselectAll();
  }

  /** Delete a single node */
  deleteNode(nodeId) {
    if (!this.#editor || this.#readonly) return;
    this.#editor.removeNode(nodeId);
  }

  /** Emit clone event for a node */
  cloneNode(nodeId) {
    if (!this.#editor || this.#readonly) return;
    this.#editor.emit('contextclone', { nodeId });
  }

  /**
   * Toggle collapsed state on a node
   * @param {string} nodeId
   */
  collapseNode(nodeId) {
    if (!this.#editor) return;
    const node = this.#editor.getNode(nodeId);
    if (!node) return;
    node.collapsed = !node.collapsed;
    const el = this.#nodeViews.get(nodeId);
    if (el) {
      if (node.collapsed) {
        el.setAttribute('data-collapsed', '');
      } else {
        el.removeAttribute('data-collapsed');
      }
    }
    this.#editor.emit('nodecollapse', { nodeId, collapsed: node.collapsed });
  }

  /**
   * Toggle muted state on a node
   * @param {string} nodeId
   */
  muteNode(nodeId) {
    if (!this.#editor) return;
    const node = this.#editor.getNode(nodeId);
    if (!node) return;
    node.muted = !node.muted;
    const el = this.#nodeViews.get(nodeId);
    if (el) {
      if (node.muted) {
        el.setAttribute('data-muted', '');
      } else {
        el.removeAttribute('data-muted');
      }
    }
    this.#editor.emit('nodemute', { nodeId, muted: node.muted });
  }

  /** Delete a single connection */
  deleteConnection(connId) {
    if (!this.#editor || this.#readonly) return;
    this.#editor.removeConnection(connId);
  }

  /**
   * Show context menu based on click target
   * @param {MouseEvent} e
   * @param {HTMLElement} contextMenuEl - context-menu component
   * @param {HTMLElement} container - canvas container for coordinate calc
   * @param {{ panX: number, panY: number, zoom: number }} transform
   */
  showContextMenu(e, contextMenuEl, container, transform) {
    if (this.#readonly) return;
    e.preventDefault();

    const target = e.target.closest('graph-node');
    const connTarget = e.target.closest('.sn-conn-path');
    if (!contextMenuEl) return;

    const rect = container.getBoundingClientRect();
    const menuX = e.clientX - rect.left;
    const menuY = e.clientY - rect.top;

    if (target) {
      const nodeId = target.getAttribute('node-id');
      contextMenuEl.show(menuX, menuY, [
        { label: 'Delete Node', icon: 'delete', action: () => this.deleteNode(nodeId) },
        { label: 'Clone Node', icon: 'content_copy', action: () => this.cloneNode(nodeId) },
        { label: 'Select All', icon: 'select_all', action: () => this.selectAll() },
      ]);
    } else if (connTarget) {
      const connId = connTarget.getAttribute('data-conn-id');
      contextMenuEl.show(menuX, menuY, [
        { label: 'Delete Connection', icon: 'link_off', action: () => this.deleteConnection(connId) },
      ]);
    } else {
      const graphX = (e.clientX - rect.left - transform.panX) / transform.zoom;
      const graphY = (e.clientY - rect.top - transform.panY) / transform.zoom;
      contextMenuEl.show(menuX, menuY, [
        { label: 'Add Node', icon: 'add_box', action: () => this.#editor?.emit('contextadd', { x: graphX, y: graphY }) },
        { label: 'Add Comment', icon: 'sticky_note_2', action: () => this.#editor?.emit('contextaddcomment', { x: graphX, y: graphY }) },
        { label: 'Add Frame', icon: 'dashboard', action: () => this.#editor?.emit('contextaddframe', { x: graphX, y: graphY }) },
        { label: 'Paste', icon: 'content_paste', action: () => this.#pasteNodes(graphX, graphY) },
        { label: 'Select All', icon: 'select_all', action: () => this.selectAll() },
        { label: 'Fit View', icon: 'fit_screen', action: () => this.fitView(container) },
        { label: 'Auto Layout', icon: 'auto_fix_high', action: () => this.#editor?.emit('autolayout') },
      ]);
    }
  }

  /**
   * Fit all nodes into viewport
   * @param {HTMLElement} container
   * @returns {{ zoom: number, panX: number, panY: number }|null}
   */
  fitView(container) {
    if (this.#nodeViews.size === 0) return null;
    const cw = container.clientWidth;
    const ch = container.clientHeight;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [, el] of this.#nodeViews) {
      const p = el._position;
      const w = el.offsetWidth || 180;
      const h = el.offsetHeight || 60;
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x + w > maxX) maxX = p.x + w;
      if (p.y + h > maxY) maxY = p.y + h;
    }

    const padding = 60;
    const contentW = maxX - minX + padding * 2;
    const contentH = maxY - minY + padding * 2;
    const zoom = Math.min(cw / contentW, ch / contentH, 2);

    return {
      zoom,
      panX: (cw - contentW * zoom) / 2 - (minX - padding) * zoom,
      panY: (ch - contentH * zoom) / 2 - (minY - padding) * zoom,
    };
  }

  /**
   * Highlight sockets compatible with picked socket
   * @param {object} socketData
   * @param {HTMLElement} nodesLayer
   */
  highlightCompatibleSockets(socketData, nodesLayer) {
    const node = this.#editor.getNode(socketData.nodeId);
    if (!node) return;

    const isOutput = socketData.side === 'output';
    const pickedPort = isOutput ? node.outputs[socketData.key] : node.inputs[socketData.key];
    if (!pickedPort) return;

    const pickedSocket = pickedPort.socket;

    for (const [nodeId, el] of this.#nodeViews) {
      if (nodeId === socketData.nodeId) continue;
      const targetNode = this.#editor.getNode(nodeId);
      if (!targetNode) continue;

      const ports = isOutput ? targetNode.inputs : targetNode.outputs;
      for (const [key, port] of Object.entries(ports)) {
        const sockets = el.querySelectorAll(`.sn-socket[data-key="${key}"]`);
        for (const sock of sockets) {
          if (pickedSocket.isCompatibleWith(port.socket)) {
            sock.setAttribute('data-compatible', '');
          } else {
            sock.setAttribute('data-incompatible', '');
          }
        }
      }

      const sameSidePorts = isOutput ? targetNode.outputs : targetNode.inputs;
      for (const [key] of Object.entries(sameSidePorts)) {
        const sockets = el.querySelectorAll(`.sn-socket[data-key="${key}"]`);
        for (const sock of sockets) {
          sock.setAttribute('data-incompatible', '');
        }
      }
    }
  }

  /**
   * Clear all socket highlights
   * @param {HTMLElement} nodesLayer
   */
  clearSocketHighlights(nodesLayer) {
    const all = nodesLayer.querySelectorAll('.sn-socket[data-compatible], .sn-socket[data-incompatible]');
    for (const sock of all) {
      sock.removeAttribute('data-compatible');
      sock.removeAttribute('data-incompatible');
    }
  }

  /**
   * Show port hints: highlight compatible ports and show them on the nearest side
   * @param {number} worldX - Cursor X in graph coordinates
   * @param {number} worldY - Cursor Y in graph coordinates
   * @param {object} socketData - Picked socket data
   */
  updatePortHints(worldX, worldY, socketData) {
    const pickedNode = this.#editor.getNode(socketData.nodeId);
    if (!pickedNode) return;

    const isOutput = socketData.side === 'output';
    const pickedPort = isOutput ? pickedNode.outputs[socketData.key] : pickedNode.inputs[socketData.key];
    if (!pickedPort) return;

    const pickedSocket = pickedPort.socket;

    for (const [nodeId, el] of this.#nodeViews) {
      if (nodeId === socketData.nodeId) continue;
      const targetNode = this.#editor.getNode(nodeId);
      if (!targetNode) continue;

      // Check if node has any compatible ports on the opposite side
      const ports = isOutput ? targetNode.inputs : targetNode.outputs;
      let hasCompatible = false;
      for (const [, port] of Object.entries(ports)) {
        if (pickedSocket.isCompatibleWith(port.socket)) {
          hasCompatible = true;
          break;
        }
      }

      if (hasCompatible) {
        // Determine nearest side: left or right based on cursor X vs node center X
        const nodePos = el._position;
        const nodeW = el.offsetWidth || 180;
        const nodeCenterX = nodePos ? nodePos.x + nodeW / 2 : 0;
        const hint = worldX < nodeCenterX ? 'left' : 'right';
        el.setAttribute('data-port-hint', hint);
      } else {
        el.removeAttribute('data-port-hint');
      }
    }
  }

  /**
   * Clear all port hints
   */
  clearPortHints() {
    for (const [, el] of this.#nodeViews) {
      el.removeAttribute('data-port-hint');
    }
  }

  /**
   * Handle connection dropped in empty space
   * @param {number} x
   * @param {number} y
   * @param {object} socketData
   */
  handleDropEmpty(x, y, socketData) {
    const node = this.#editor.getNode(socketData.nodeId);
    if (!node) return;

    const isOutput = socketData.side === 'output';
    const port = isOutput ? node.outputs[socketData.key] : node.inputs[socketData.key];
    const socketType = port?.socket?.type || 'any';

    this.#editor.emit('dropinempty', {
      x, y,
      sourceNodeId: socketData.nodeId,
      sourceKey: socketData.key,
      sourceSide: socketData.side,
      socketType,
    });
  }

  // --- Copy/Paste ---

  #copySelected() {
    const selected = this.#selector.getSelectedNodes();
    if (selected.length === 0) return;

    this.#clipboard = selected.map(nodeId => {
      const node = this.#editor.getNode(nodeId);
      const el = this.#nodeViews.get(nodeId);
      if (!node) return null;
      return {
        label: node.label,
        type: node.type,
        category: node.category,
        shape: node.shape,
        params: { ...node.params },
        position: el?._position ? { ...el._position } : { x: 0, y: 0 },
      };
    }).filter(Boolean);
  }

  /**
   * Paste copied nodes at optional position
   * @param {number} [x]
   * @param {number} [y]
   */
  #pasteNodes(x, y) {
    if (!this.#clipboard || this.#clipboard.length === 0) return;

    const offset = 30;
    for (const data of this.#clipboard) {
      const posX = x != null ? x : data.position.x + offset;
      const posY = y != null ? y : data.position.y + offset;
      this.#editor.emit('contextclone', {
        label: data.label,
        type: data.type,
        category: data.category,
        shape: data.shape,
        x: posX,
        y: posY,
      });
    }
  }

  // --- Align Tools ---

  /** Align selected nodes horizontally (same Y) */
  alignSelectedHorizontal() {
    const selected = this.#selector.getSelectedNodes();
    if (selected.length < 2) return;

    let totalY = 0;
    for (const nodeId of selected) {
      const el = this.#nodeViews.get(nodeId);
      totalY += el?._position?.y || 0;
    }
    const avgY = totalY / selected.length;

    for (const nodeId of selected) {
      const el = this.#nodeViews.get(nodeId);
      if (el?._position) {
        this.#editor.emit('nodemovetopos', {
          nodeId,
          x: el._position.x,
          y: avgY,
        });
      }
    }
  }

  /** Align selected nodes vertically (same X) */
  alignSelectedVertical() {
    const selected = this.#selector.getSelectedNodes();
    if (selected.length < 2) return;

    let totalX = 0;
    for (const nodeId of selected) {
      const el = this.#nodeViews.get(nodeId);
      totalX += el?._position?.x || 0;
    }
    const avgX = totalX / selected.length;

    for (const nodeId of selected) {
      const el = this.#nodeViews.get(nodeId);
      if (el?._position) {
        this.#editor.emit('nodemovetopos', {
          nodeId,
          x: avgX,
          y: el._position.y,
        });
      }
    }
  }
}
