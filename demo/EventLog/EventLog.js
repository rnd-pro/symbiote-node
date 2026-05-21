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

function appendLabelMarkup(parent, message) {
  let parts = String(message).split(/(<span class="log-label">.*?<\/span>)/g);
  for (let part of parts) {
    let labelMatch = part.match(/^<span class="log-label">(.*)<\/span>$/);
    if (labelMatch) {
      let span = document.createElement('span');
      span.className = 'log-label';
      span.textContent = labelMatch[1];
      parent.appendChild(span);
    } else if (part) {
      parent.append(part);
    }
  }
}

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
      [
        'nodeprocessing',
        'node',
        (d) => `Processing <span class="log-label">${this._label(d.nodeId)}</span>`,
      ],
      [
        'nodecompleted',
        'success',
        (d) => `Completed <span class="log-label">${this._label(d.nodeId)}</span>`,
      ],
      ['flowcomplete', 'success', () => 'Flow complete'],
      ['nodecreated', 'info', (d) => `Node created: <span class="log-label">${d.label}</span>`],
      ['noderemoved', 'error', (d) => `Node removed: <span class="log-label">${d.label}</span>`],
      [
        'connectioncreated',
        'connection',
        (d) =>
          `Connected <span class="log-label">${this._label(d.from)}</span> → <span class="log-label">${this._label(d.to)}</span>`,
      ],
      [
        'connectionremoved',
        'connection',
        (d) =>
          `Disconnected <span class="log-label">${this._label(d.from)}</span> ✕ <span class="log-label">${this._label(d.to)}</span>`,
      ],
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

    let time = document.createElement('span');
    time.className = 'log-time';
    time.textContent = `${sec}s`;
    let icon = document.createElement('span');
    icon.className = 'log-icon';
    icon.textContent = ICONS[type] || '•';
    let msg = document.createElement('span');
    msg.className = 'log-msg';
    appendLabelMarkup(msg, message);
    entry.append(time, icon, msg);

    const entries = this.ref.entries;
    entries.appendChild(entry);


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
      this.ref.entries.replaceChildren();
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
