import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildChatMessageItems,
  buildSessionMetaHtml,
  buildWorkMetaHtml,
  findPreviousAgentText,
  summarizeToolInput,
  toChatMessageItem,
} from '../chat/message-model.js';

describe('chat message model', () => {
  it('maps raw chat messages to renderer items', () => {
    let item = toChatMessageItem({
      role: 'tool',
      name: 'read_file',
      input: { path: 'src/app.js' },
      result: { ok: true },
      elapsed: 62,
      meta: { mode: 'yolo', exitCode: 0, tokens: 42 },
    }, { isLatestTool: true });

    assert.equal(item.type, 'tool');
    assert.equal(item.role, 'tool');
    assert.equal(item.name, 'read_file');
    assert.equal(item.isLatestTool, true);
    assert.equal(item.elapsedText, '1m 2s');
    assert.match(item.metaHtml, /exit 0/);
    assert.match(item.metaHtml, /42 tks/);
  });

  it('moves completed thinking summaries onto the previous agent message', () => {
    let { items, streamingBoards } = buildChatMessageItems([
      { role: 'user', text: 'Do it' },
      { role: 'agent', text: 'Done' },
      { role: 'thinking', done: true, elapsed: 15, meta: { exitCode: 0 } },
      { role: 'board', streaming: true, cardItems: [{ id: 'task-123456789', title: 'Worker' }] },
    ], { hasActiveStream: true });

    assert.equal(items.length, 3);
    assert.equal(items[1].role, 'agent');
    assert.match(items[1].workSummaryHtml, /Worked for 15s/);
    assert.match(items[1].workSummaryHtml, /data-copy-text="Done"/);
    assert.deepEqual(streamingBoards, [['task-123456789']]);
    assert.deepEqual(items[2].cardItems, [{ id: 'task-123456789', title: 'Worker' }]);
    assert.equal(items[2].isStreaming, true);
  });

  it('finds the previous agent response only inside the current user turn', () => {
    let messages = [
      { role: 'agent', text: 'old' },
      { role: 'user', text: 'new turn' },
      { role: 'tool', text: 'work' },
      { role: 'agent', text: 'current' },
      { role: 'thinking', done: true },
    ];

    assert.equal(findPreviousAgentText(messages, 4), 'current');
    assert.equal(findPreviousAgentText(messages, 2), '');
  });

  it('escapes metadata html generated from untrusted values', () => {
    let html = buildWorkMetaHtml({
      mode: '<img src=x onerror=alert(1)>',
      sessionId: '<script>alert(1)</script>',
      errors: '<b>bad</b>',
    });

    assert.doesNotMatch(html, /<script>|<img|<b>/);
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /&lt;b&gt;bad&lt;\/b&gt;/);
  });

  it('builds compact session metadata from task result text', () => {
    let html = buildSessionMetaHtml([
      '- Mode: plan',
      '- Exit code: 1',
      '- Session ID: `abcdef1234567890`',
      '- Tokens: 123',
      '- Cost: $0.25',
    ].join('\n'));

    assert.match(html, /lock/);
    assert.match(html, /exit 1/);
    assert.match(html, /abcdef123456/);
    assert.match(html, /123 tks/);
    assert.match(html, /\$0.25/);
  });

  it('builds compact tool header summaries from common input fields', () => {
    assert.equal(
      summarizeToolInput({ command: 'git status --short --branch' }),
      'git status --short --branch',
    );
    assert.equal(summarizeToolInput({ path: 'web/components/ChatSidebar/ChatSidebar.js' }), 'web/components/ChatSidebar/ChatSidebar.js');
    assert.equal(summarizeToolInput({ args: ['one', 'two'] }), '{"args":["one","two"]}');
    assert.equal(summarizeToolInput(null), '');
    assert.ok(summarizeToolInput({ command: 'x'.repeat(140) }).endsWith('...'));
  });
});
