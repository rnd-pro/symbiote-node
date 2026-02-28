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
        { label: 'Select All', icon: 'select_all', action: () => this.selectAll() },
        { label: 'Fit View', icon: 'fit_screen', action: () => this.fitView(container) },
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
}
