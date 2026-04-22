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
        const hash = window.location.hash;
        const [base, queryStr] = hash.split('?');
        const params = new URLSearchParams(queryStr || '');
        
        params.set('in', '1');
        
        // Preserve symbol if it exists and path is drillable
        if (!params.has('symbol') || !this.#config.drillableFiles.has(path)) {
          params.delete('symbol');
        }
        
        const newQuery = params.toString();
        history.replaceState(null, '', `#${this.#config.hashPrefix}/${path}?${newQuery}`);
      }
    };

    const handleExit = (e) => {
      const level = e.detail?.level;
      this.#canvasDepth = (typeof level === 'number') ? level : Math.max(0, this.#canvasDepth - 1);
      if (this.#isAutoRouting) return; // Prevent erasing URL when popping out to find hidden nested paths
      
      // Extract the path we were drilled into BEFORE modifying the URL
      const hashPath = window.location.hash.replace(`#${this.#config.hashPrefix}/`, '').split('?')[0].split('&')[0];

      // Find the directory path we just exited from (to focus on it)
      let exitedDirPath = hashPath;
      if (this.#config.fileMap?.has(hashPath)) {
        const parts = hashPath.split('/');
        parts.pop();
        exitedDirPath = parts.join('/') + '/';
      }
      // Walk up to find the nearest known directory
      if (exitedDirPath && !this.#config.dirNodeMap?.has(exitedDirPath)) {
        const segments = exitedDirPath.replace(/\/$/, '').split('/');
        while (segments.length > 0) {
          const candidate = segments.join('/') + '/';
          if (this.#config.dirNodeMap?.has(candidate)) {
            exitedDirPath = candidate;
            break;
          }
          segments.pop();
        }
      }

      const updateUrl = (newPath, setIn = false, setFocus = null) => {
        const hash = window.location.hash;
        const [base, queryStr] = hash.split('?');
        const params = new URLSearchParams(queryStr || '');
        
        let newBase = `#${this.#config.hashPrefix}`;
        if (newPath) newBase += `/${newPath}`;
        
        if (setIn) params.set('in', '1');
        else params.delete('in');
        
        if (setFocus) params.set('focus', setFocus);
        else params.delete('focus');
        
        params.delete('symbol'); // always clear symbol on exit
        
        const newQuery = params.toString();
        const newHash = newQuery ? `${newBase}?${newQuery}` : newBase;
        history.replaceState(null, '', newHash);
      };

      if (this.#canvasDepth > 0) {
        // Still inside a subgraph — update URL to parent context
        if (this.#config.dirNodeMap?.has(exitedDirPath)) {
          updateUrl(exitedDirPath, true, null);
        } else if (exitedDirPath) {
          updateUrl(exitedDirPath, false, null);
        }
      } else {
        // Back at root
        if (exitedDirPath) {
          updateUrl(null, false, exitedDirPath);
        } else {
          updateUrl(null, false, null);
        }
      }

      // Fly to the exited group node at ANY level
      if (exitedDirPath) {
        requestAnimationFrame(() => {
          const nodeId = this.#config.dirNodeMap?.get(exitedDirPath) ||
                         this.#config.fileMap?.get(exitedDirPath);
          if (nodeId && this.#canvas.flyToNode) {
            this.#canvas.flyToNode(nodeId, { zoom: 0.8 });
          } else if (this.#canvas.fitView) {
            this.#canvas.fitView();
          }
        });
      } else if (this.#canvas.fitView) {
        requestAnimationFrame(() => this.#canvas.fitView());
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
   * Reads URL hash and triggers initial drill down + focus sequence.
   * 
   * Universal URL semantics:
   * - `#graph`                                      → root, fit view
   * - `#graph?focus=src/analysis/`                   → root, fly to analysis node
   * - `#graph/src/analysis/?in=1`                    → drill into analysis
   * - `#graph/src/analysis/?in=1&focus=file.js`      → drill into analysis, focus file.js
   * - `#graph/src/analysis/file.js?in=1`             → drill into analysis, drill into file
   * - `#graph/src/analysis/file.js?in=1&symbol=name` → drill into file, focus symbol
   * - `#graph/src/analysis/`                         → (legacy) focus analysis at root
   * 
   * @param {NodeEditor} editor 
   */
  restoreFromHash(editor) {
    if (this.#destroyed || !this.#canvas) return;

    const hash = window.location.hash;
    const prefix = `#${this.#config.hashPrefix}`;
    if (!hash.startsWith(prefix)) return;

    const afterPrefix = hash.slice(prefix.length); // e.g. '/src/analysis/?in=1&focus=file.js' or '?focus=src/analysis/'
    
    // Parse query parameters from the hash
    const qIdx = afterPrefix.indexOf('?');
    const pathPart = qIdx >= 0 ? afterPrefix.slice(0, qIdx) : afterPrefix; // '/src/analysis/' or ''
    const queryStr = qIdx >= 0 ? afterPrefix.slice(qIdx + 1) : '';
    const params = new URLSearchParams(queryStr);
    
    const drillPath = pathPart.replace(/^\//, ''); // strip leading /
    const hasDrillFlag = params.get('in') === '1';
    const focusParam = params.get('focus');
    const symbolParam = params.get('symbol');

    // Case 0: bare #graph — pop all subgraph layers and reset to root view
    if (!drillPath && !focusParam && !hasDrillFlag && !symbolParam) {
      // Event-driven pop: wait for each subgraph-exit before the next drillUp.
      // rAF-polling was unreliable because canvasDepth updates only AFTER the exit
      // event fires — which happens asynchronously during the canvas animation.
      this.#isAutoRouting = true;
      let safetyCounter = 10;
      const doPopStep = () => {
        if (this.#canvasDepth <= 0 || safetyCounter-- <= 0) {
          this.#isAutoRouting = false;
          this.#canvas.fitView?.();
          return;
        }
        // Register exit listener FIRST, then trigger drillUp
        const onExit = () => {
          this.#canvas.removeEventListener('subgraph-exit', onExit);
          // canvasDepth is now decremented by the main handler; recurse
          requestAnimationFrame(doPopStep);
        };
        this.#canvas.addEventListener('subgraph-exit', onExit);
        this.#canvas.drillUp?.();
      };
      doPopStep();
      return;
    }

    // Case 1: #graph?focus=src/analysis/ (root-level focus, no path)
    if (!drillPath && focusParam) {
      this.navigateTo(decodeURIComponent(focusParam), 0, false);
      return;
    }

    // Case 2: #graph/path?in=1 (drill into path)
    if (drillPath && hasDrillFlag) {
      const drilled = this.#restoreDrillDown(drillPath, editor, true);
      
      // After drilling, handle &focus= (select node inside group)
      if (drilled && focusParam) {
        const fullFocusPath = drillPath + decodeURIComponent(focusParam);
        requestAnimationFrame(() => {
          this.navigateTo(fullFocusPath, 0, false);
        });
      }
      
      // Handle &symbol= (focus symbol inside file subgraph)
      if (drilled && symbolParam) {
        requestAnimationFrame(() => {
          this.restoreSymbolFocus(drillPath);
        });
      }
      return;
    }

    // Case 3: #graph/path (legacy — just focus the node at root)
    if (drillPath) {
      this.navigateTo(drillPath, 0, false);
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
        if (autoDrill) {
          this.#runAutoRouting(() => {
            this.#canvas.drillDown(node.id);
          });
          if (this.#canvas.fitView) {
            requestAnimationFrame(() => this.#canvas.fitView());
          }
        } else {
          // Just focus on the directory node without drilling in
          this.#canvas.flyToNode?.(node.id, { zoom: 0.8 }) ||
            this.#canvas.selectNode?.(node.id);
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
        // Case 1: Target is a file or directory hidden inside a deeper subgraph.
        // Walk up the path hierarchy to find the nearest visible ancestor directory.
        let searchPath = targetPath;
        if (isFile) {
          // Start from the file's parent directory
          const parts = targetPath.split('/');
          parts.pop();
          searchPath = parts.join('/') + '/';
          if (searchPath === '/') searchPath = './';
        }

        // Walk UP the directory tree to find the nearest visible ancestor
        let segments = searchPath.replace(/\/$/, '').split('/');
        while (segments.length > 0) {
          const candidateDir = segments.join('/') + '/';
          const dirId = this.#config.dirNodeMap.get(candidateDir);
          if (dirId && positions[dirId]) {
            // Found a visible ancestor — drill into it
            this.#runAutoRouting(() => {
              this.#canvas.drillDown(dirId);
            });
            requestAnimationFrame(() => this.navigateTo(targetPath, depth + 1, autoDrill));
            return true;
          }
          segments.pop();
        }
        // Also try "./" as root
        const rootId = this.#config.dirNodeMap.get('./');
        if (rootId && positions[rootId]) {
          this.#runAutoRouting(() => {
            this.#canvas.drillDown(rootId);
          });
          requestAnimationFrame(() => this.navigateTo(targetPath, depth + 1, autoDrill));
          return true;
        }

        // Case 2: Target is completely off-scope (we are inside wrong group). Drill UP to root.
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
