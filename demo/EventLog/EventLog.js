/**
 * EventLog — real-time event log panel for the node editor demo
 *
 * Subscribes to editor events (node/connection/flow lifecycle) and
 * displays them as a scrollable, color-coded log with timestamps.
 *
 * @module symbiote-node/demo/EventLog
 */

import Symbiote from '@symbiotejs/symbiote';
import { template } from './EventLog.tpl.js';
import { styles } from './EventLog.css.js';

const ICONS = {
  flow: '▶',
  node: '◆',
  connection: '⤳',
  success: '✓',
  error: '✗',
  info: 'ℹ',
};

export class EventLog extends Symbiote {
  init$ = {
    logCount: 0,
    onClear: () => this.clear(),
  };

  /** @type {import('../../core/Editor.js').Editor|null} */
  _editor = null;

  /** @type {Function[]} */
  _unsubs = [];

  /** @type {number} */
  _count = 0;

  /** @type {number|null} */
  _startTime = null;

  /**
   * Attach to an editor instance and start listening
   * @param {import('../../core/Editor.js').Editor} editor
   */
  listen(editor) {
    this._editor = editor;
    this._startTime = Date.now();

    const events = [
      ['flowstart', 'flow', (d) => `Flow started — ${d.nodes.length} nodes`],
      ['nodeprocessing', 'node', (d) => `Processing <span class="log-label">${this._label(d.nodeId)}</span>`],
      ['nodecompleted', 'success', (d) => `Completed <span class="log-label">${this._label(d.nodeId)}</span>`],
      ['flowcomplete', 'success', () => 'Flow complete'],
      ['nodecreated', 'info', (d) => `Node created: <span class="log-label">${d.label}</span>`],
      ['noderemoved', 'error', (d) => `Node removed: <span class="log-label">${d.label}</span>`],
      ['connectioncreated', 'connection', (d) => `Connected <span class="log-label">${this._label(d.from)}</span> → <span class="log-label">${this._label(d.to)}</span>`],
      ['connectionremoved', 'connection', (d) => `Disconnected <span class="log-label">${this._label(d.from)}</span> ✕ <span class="log-label">${this._label(d.to)}</span>`],
    ];

    for (const [event, type, fmt] of events) {
      const handler = (data) => this.log(type, fmt(data));
      const unsub = editor.on(event, handler);
      this._unsubs.push(unsub);
    }
  }

  /**
   * Get node label by ID
   * @param {string} nodeId
   * @returns {string}
   */
  _label(nodeId) {
    return this._editor?.getNode(nodeId)?.label || nodeId;
  }

  /**
   * Add a log entry
   * @param {string} type
   * @param {string} message - supports HTML
   */
  log(type, message) {
    this._count++;
    this.$.logCount = this._count;

    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.setAttribute('data-type', type);

    const elapsed = Date.now() - (this._startTime || Date.now());
    const sec = (elapsed / 1000).toFixed(1);

    entry.innerHTML = `<span class="log-time">${sec}s</span><span class="log-icon">${ICONS[type] || '•'}</span><span class="log-msg">${message}</span>`;

    const entries = this.ref.entries;
    entries.appendChild(entry);

    // Auto-scroll to bottom
    requestAnimationFrame(() => {
      entries.scrollTop = entries.scrollHeight;
    });
  }

  /** Clear all entries */
  clear() {
    this._count = 0;
    this.$.logCount = 0;
    this._startTime = Date.now();
    if (this.ref.entries) {
      this.ref.entries.innerHTML = '';
    }
  }

  destroyCallback() {
    for (const unsub of this._unsubs) unsub();
    this._unsubs = [];
  }
}

EventLog.template = template;
EventLog.rootStyles = styles;
EventLog.reg('event-log');
