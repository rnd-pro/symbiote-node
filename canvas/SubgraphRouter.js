export class SubgraphRouter {
  #canvas = null;
  #config = {};
  #isAutoRouting = false;
  #canvasDepth = 0;
  #listeners = [];
  #destroyed = false;

  /**
   * @param {HTMLElement} canvas - NodeCanvas instance
   * @param {Object} config - Configuration options
   * @param {String} [config.hashPrefix='graph'] - URL hash routing prefix
   * @param {Map} [config.fileMap] - Map of file paths to node IDs
   * @param {Map} [config.dirNodeMap] - Map of directory paths to node IDs
   * @param {Map} [config.symbolMap] - Map of symbol IDs to { name, file }
   * @param {Set} [config.drillableFiles] - Set of file paths that contain symbol subgraphs
   * @param {Function} [config.onNavigate] - Callback after successful navigation
   */
  constructor(canvas, config = {}) {
    this.#canvas = canvas;
    this.updateConfig(config);
    this.#bindListeners();
  }

  updateConfig(config = {}) {
    this.#config = {
      hashPrefix: 'graph',
      fileMap: new Map(),
      dirNodeMap: new Map(),
      symbolMap: new Map(),
      drillableFiles: new Set(),
      onNavigate: () => {},
      ...this.#config,
      ...config
    };
  }

  /**
   * Internal router depth tracker
   * @returns {number}
   */
  get depth() {
    return this.#canvasDepth;
  }

  /**
   * Prevent hash rewriting during automatic routing across layers
   */
  #runAutoRouting(fn) {
    this.#isAutoRouting = true;
    fn();
    this.#isAutoRouting = false;
  }

  #bindListeners() {
    const handleEnter = (e) => {
      this.#canvasDepth++;
      if (this.#isAutoRouting) return;

      const nodeId = e.detail?.nodeId;
      if (!nodeId) return;

      // Find the path string for this node ID
      let path = null;
      for (const [key, id] of this.#config.dirNodeMap.entries()) {
        if (id === nodeId) { path = key; break; }
      }
      if (!path) {
        for (const [key, id] of this.#config.fileMap.entries()) {
          if (id === nodeId) { path = key; break; }
        }
      }

      if (path) {
        const symbolHash = window.location.hash.split('&symbol=')[1];
        let suffix = '?in=1';
        if (symbolHash && this.#config.drillableFiles.has(path)) {
          suffix += `&symbol=${symbolHash}`;
        }
        history.replaceState(null, '', `#${this.#config.hashPrefix}/${path}${suffix}`);
      }
    };

    const handleExit = (e) => {
      const level = e.detail?.level;
      this.#canvasDepth = (typeof level === 'number') ? level : Math.max(0, this.#canvasDepth - 1);
      if (this.#isAutoRouting) return; // Prevent erasing URL when popping out to find hidden nested paths
      
      const hashPath = window.location.hash.replace(`#${this.#config.hashPrefix}/`, '').split('?')[0].split('&')[0];

      if (hashPath && this.#canvasDepth > 0) {
        // Still inside a subgraph — find the parent directory to focus on
        let focusPath = hashPath;
        if (this.#config.fileMap.has(hashPath)) {
          const parts = hashPath.split('/');
          parts.pop();
          focusPath = parts.join('/') + '/';
        }
        if (this.#config.dirNodeMap.has(focusPath)) {
          history.replaceState(null, '', `#${this.#config.hashPrefix}/${focusPath}?in=1`);
        } else {
          history.replaceState(null, '', `#${this.#config.hashPrefix}/${focusPath}`);
        }
      } else {
        // Back at root (or no path) — clean URL and show all
        history.replaceState(null, '', `#${this.#config.hashPrefix}`);
        if (this.#canvas.fitView) {
            requestAnimationFrame(() => this.#canvas.fitView());
        }
      }
    };

    this.#canvas.addEventListener('subgraph-enter', handleEnter);
    this.#canvas.addEventListener('subgraph-exit', handleExit);
    
    this.#listeners.push(
      { name: 'subgraph-enter', fn: handleEnter },
      { name: 'subgraph-exit', fn: handleExit }
    );
  }

  /**
   * Reads URL hash and triggers initial drill down + focus sequence
   * @param {NodeEditor} editor 
   */
  restoreFromHash(editor) {
    if (this.#destroyed || !this.#canvas) return;

    if (window.location.hash.startsWith(`#${this.#config.hashPrefix}/`)) {
      const hashStr = window.location.hash.replace(`#${this.#config.hashPrefix}/`, '');
      const hasDrillFlag = window.location.hash.includes('?in=1');
      const targetPath = hashStr.split('?')[0].split('&')[0];
      
      // Attempt generic exact match for deep linking into files
      if (targetPath) {
        // If the URL has ?in=1, try to automatically drill into it if it's a directory
        this.#restoreDrillDown(targetPath, editor, hasDrillFlag);
      }
    }
  }

  #restoreDrillDown(targetPath, editor, autoDrill = false) {
    if (!this.#canvas) return false;

    // Try to find a directory SubgraphNode matching the path
    for (const node of editor.getNodes()) {
      if (!node._isSubgraph) continue;
      const nodePath = node.params?.path;
      if (!nodePath) continue;

      // Exact directory match (e.g. 'src/core/')
      if (nodePath === targetPath) {
        this.#runAutoRouting(() => {
          this.#canvas.drillDown(node.id);
        });
        if (this.#canvas.fitView) {
            requestAnimationFrame(() => this.#canvas.fitView());
        }
        return true;
      }

      // File inside this directory — drill into dir, then focus file
      if (targetPath.startsWith(nodePath)) {
        this.#runAutoRouting(() => {
          this.#canvas.drillDown(node.id);
        });
        // After transition, specifically focus the exact nested file node
        requestAnimationFrame(() => {
          this.navigateTo(targetPath, 0, autoDrill);
        });
        return true;
      }
    }

    return false;
  }

  /**
   * Restore visual symbol focus from &symbol= URL parameter.
   * Called after autoDrill into a file subgraph to select the target function/class node.
   * @param {string} filePath - the file we drilled into
   */
  restoreSymbolFocus(filePath) {
    const hashParts = window.location.hash.split('&symbol=');
    if (hashParts.length < 2) return;
    const symbolName = decodeURIComponent(hashParts[1].split('&')[0]);
    if (!symbolName || !this.#config.symbolMap) return;

    for (const [nodeId, params] of this.#config.symbolMap) {
      if (params.name === symbolName && params.file === filePath) {
        this.#canvas?.selectNode(nodeId);
        return;
      }
    }
  }

  /**
   * Focus viewport on a specific node by path
   * @param {string} targetPath - e.g. 'src/core/event-bus.js'
   * @param {number} depth - Internal recursion depth limit
   * @param {boolean} autoDrill - Attempt to drill into target if it is a Subgraph
   * @returns {boolean} true if node found and focused
   */
  navigateTo(targetPath, depth = 0, autoDrill = false) {
    if (this.#destroyed || !this.#canvas || !this.#config.fileMap || depth > 5) return false;

    // Find node ID by file path string or directory path string
    let targetId = null;
    let isFile = true;
    if (this.#config.fileMap.has(targetPath)) {
      targetId = this.#config.fileMap.get(targetPath);
    } else if (this.#config.dirNodeMap && this.#config.dirNodeMap.has(targetPath)) {
      targetId = this.#config.dirNodeMap.get(targetPath);
      isFile = false;
    }

    if (!targetId) return false;

    const positions = typeof this.#canvas.getPositions === 'function' ? this.#canvas.getPositions() : {};
    const pos = positions[targetId];

    // Auto-traversal engine: if target is not visible on current canvas layer
    if (!pos && typeof this.#canvas.drillDown === 'function') {
      if (this.#config.dirNodeMap) {
        // Case 1: Target is a file, currently hidden inside a directory Subgraph from Root View
        let dirPath = '';
        if (isFile) {
          const parts = targetPath.split('/');
          parts.pop();
          dirPath = parts.join('/') + '/';
          if (dirPath === '/') dirPath = './';
        }

        if (isFile && dirPath && this.#config.dirNodeMap.has(dirPath)) {
          const dirId = this.#config.dirNodeMap.get(dirPath);
          // If parent directory is visible, drill into it!
          if (positions[dirId]) {
            this.#runAutoRouting(() => {
              this.#canvas.drillDown(dirId);
            });
            requestAnimationFrame(() => this.navigateTo(targetPath, depth + 1, autoDrill));
            return true;
          }
        }

        // Case 2: Target is completely off-scope (we are inside wrong group). Drill UP loop to Root.
        if (this.#canvasDepth > 0) {
          this.#runAutoRouting(() => {
            this.#canvas.drillUp?.();
          });
          requestAnimationFrame(() => this.navigateTo(targetPath, depth + 1, autoDrill));
          return true;
        }
      }
      return false; // Unable to locate on any layer
    }
    
    // We found the node on the current layer. If target is a subgraph file and we are commanded to drill into it, do it.
    if (autoDrill && isFile && this.#config.drillableFiles?.has(targetPath)) {
      this.#runAutoRouting(() => {
        this.#canvas.drillDown?.(targetId);
      });
      requestAnimationFrame(() => {
        if (this.#canvas.fitView) this.#canvas.fitView();
        // Restore &symbol= focus from deep-link URL
        this.restoreSymbolFocus(targetPath);
      });
      return true;
    }

    // SubgraphRouter delegates raw center/fly animations up to Canvas if possible
    if (this.#canvas.flyToNode) {
        this.#canvas.flyToNode(targetId, { zoom: 0.8 });
    } else {
        // Safe fallback just in case
        this.#canvas.selectNode?.(targetId);
    }
    
    this.#config.onNavigate(targetPath);
    return true;
  }

  destroy() {
    this.#destroyed = true;
    for (const listener of this.#listeners) {
      this.#canvas.removeEventListener(listener.name, listener.fn);
    }
    this.#listeners = [];
  }
}
