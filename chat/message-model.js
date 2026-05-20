import { escapeHtml, formatElapsed } from '../display/markdown-formatter.js';

export function buildSessionMetaHtml(text) {
  if (!text) return '';
  let chips = [];
  let modeMatch = text.match(/- Mode:\s*(.+)/i);
  if (modeMatch) {
    let mode = modeMatch[1].trim();
    let iconName = mode === 'yolo' ? 'bolt' : mode === 'plan' ? 'lock' : 'settings';
    chips.push(`<span class="meta-chip"><span class="material-symbols-outlined" style="font-size:12px">${iconName}</span> ${escapeHtml(mode)}</span>`);
  }
  let exitMatch = text.match(/- Exit code:\s*(\d+)/i);
  if (exitMatch) {
    let code = parseInt(exitMatch[1]);
    let cls = code === 0 ? 'meta-ok' : 'meta-err';
    chips.push(`<span class="meta-chip ${cls}">exit ${code}</span>`);
  }
  let sidMatch = text.match(/- Session ID:\s*`([^`]+)`/i);
  if (sidMatch) {
    chips.push(`<span class="meta-chip meta-sid" title="${escapeHtml(sidMatch[1])}">${escapeHtml(sidMatch[1].substring(0, 12))}...</span>`);
  }
  let tokensMatch = text.match(/- Tokens:\s*(\d+)/i);
  if (tokensMatch) {
    chips.push(`<span class="meta-chip meta-info" title="Tokens">${tokensMatch[1]} tks</span>`);
  }
  let costMatch = text.match(/- Cost:\s*\$?([\d.]+)/i);
  if (costMatch) {
    chips.push(`<span class="meta-chip meta-info" title="Cost">$${costMatch[1]}</span>`);
  }
  return chips.join('');
}

export function buildWorkMetaHtml(meta) {
  if (!meta) return '';
  let items = [];
  if (meta.mode) {
    let iconName = meta.mode === 'yolo' ? 'bolt' : 'settings';
    items.push(`<span class="meta-chip"><span class="material-symbols-outlined" style="font-size:12px">${iconName}</span> ${escapeHtml(meta.mode)}</span>`);
  }
  if (meta.exitCode != null) {
    let cls = meta.exitCode === 0 ? 'meta-ok' : 'meta-err';
    items.push(`<span class="meta-chip ${cls}">exit ${meta.exitCode}</span>`);
  }
  if (meta.sessionId) {
    items.push(`<span class="meta-chip meta-sid" title="${escapeHtml(meta.sessionId)}">${escapeHtml(meta.sessionId.substring(0, 16))}...</span>`);
  }
  if (meta.tools) items.push(`<span class="meta-chip">${meta.tools} tool call${meta.tools > 1 ? 's' : ''}</span>`);
  if (meta.tokens != null) items.push(`<span class="meta-chip meta-info">${meta.tokens} tks</span>`);
  if (meta.cost != null) items.push(`<span class="meta-chip meta-info">$${meta.cost.toFixed(4)}</span>`);
  if (meta.errors) items.push(`<span class="meta-chip meta-err">${escapeHtml(meta.errors)}</span>`);
  return items.join('');
}

export function findPreviousAgentText(messages, fromIndex) {
  for (let i = fromIndex - 1; i >= 0; i--) {
    let msg = messages[i];
    if (msg?.role === 'agent' && typeof msg.text === 'string' && msg.text.trim()) return msg.text;
    if (msg?.role === 'user') break;
  }
  return '';
}

export function buildWorkSummaryHtml(msg, copyText) {
  let metaHtml = buildWorkMetaHtml(msg?.meta);
  let bodyHtml = metaHtml ? `<div class="work-body">${metaHtml}</div>` : '';
  let copyBtn = copyText
    ? `<button class="work-copy-btn" type="button" title="Copy response" data-copy-text="${escapeHtml(copyText)}"><span class="material-symbols-outlined">content_copy</span></button>`
    : '';
  return `<div class="work-summary-wrap"><details class="work-summary"><summary><span class="material-symbols-outlined" style="font-size:16px;color:var(--sn-success-color)">check_circle</span>Worked for ${escapeHtml(formatElapsed(msg?.elapsed || 0))}</summary>${bodyHtml}</details>${copyBtn}</div>`;
}

export function toChatMessageItem(msg, options = {}) {
  return {
    type: msg?.type || msg?.role,
    role: msg?.role,
    text: msg?.text || msg?.content || '',
    isStreaming: Boolean(options.isLatestStreaming),
    isLatestTool: Boolean(options.isLatestTool),
    name: msg?.name || '',
    input: msg?.input || null,
    result: msg?.result || null,
    done: Boolean(msg?.done),
    elapsedText: formatElapsed(msg?.elapsed || 0),
    status: msg?.status || '',
    metaHtml: buildWorkMetaHtml(msg?.meta),
    taskIds: msg?.taskIds || [],
    workSummaryHtml: '',
    copyText: '',
  };
}

export function buildChatMessageItems(messages = [], options = {}) {
  let source = Array.isArray(messages) ? messages : [];
  let hasActiveStream = Boolean(options.hasActiveStream);
  let items = [];
  let streamingBoards = [];
  let lastAgentItem = null;
  let lastStreamingIndex = -1;
  let lastToolIndex = -1;

  for (let i = 0; i < source.length; i++) {
    let msg = source[i];
    if (msg?.streaming) lastStreamingIndex = i;
    if (msg?.role === 'tool') lastToolIndex = i;
  }

  for (let i = 0; i < source.length; i++) {
    let msg = source[i];
    let isLatestStreaming = hasActiveStream && i === lastStreamingIndex && Boolean(msg?.streaming);

    if (msg?.role === 'thinking' && msg.done) {
      let copyText = findPreviousAgentText(source, i);
      if (lastAgentItem) {
        lastAgentItem.workSummaryHtml = buildWorkSummaryHtml(msg, copyText);
        continue;
      }
    }

    let item = toChatMessageItem(msg, {
      isLatestStreaming,
      isLatestTool: i === lastToolIndex,
    });
    if (msg?.role === 'thinking' && msg.done) {
      item.copyText = findPreviousAgentText(source, i);
    }
    items.push(item);

    if (msg?.role === 'agent') lastAgentItem = item;
    if (msg?.role === 'board' && item.isStreaming && msg.taskIds?.length) {
      streamingBoards.push([...msg.taskIds]);
    }
  }

  return { items, streamingBoards };
}
