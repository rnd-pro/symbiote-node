import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let PKG_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../packages/symbiote-ui');

function read(relative) {
  return fs.readFileSync(path.join(PKG_ROOT, relative), 'utf8');
}

describe('chat list components', () => {
  it('keeps chat list shell classes namespaced to chat components', () => {
    let template = read('chat/ChatList/ChatList.tpl.js');
    let css = read('chat/ChatList/ChatList.css.js');
    let source = `${template}\n${css}`;

    for (let className of ['ui-sidebar', 'ui-sidebar-header', 'ui-sidebar-content', 'ui-title']) {
      assert.equal(source.includes(className), false, `ChatList must not keep ${className}`);
    }
    for (let className of ['chat-list-shell', 'chat-list-header', 'chat-list-content', 'chat-list-title']) {
      assert.equal(source.includes(className), true, `ChatList must define ${className}`);
    }
    assert.equal(template.includes('<sn-button'), true, 'ChatList controls must compose sn-button');
    assert.equal(template.includes('<button'), false, 'ChatList must not own raw button shells');
    assert.equal(template.includes("'item-tag': 'chat-list-item'"), true, 'ChatList must keep chat-list-item rendering');
  });

  it('keeps chat list item state on host attributes and chat classes', () => {
    let template = read('chat/ChatListItem/ChatListItem.tpl.js');
    let css = read('chat/ChatListItem/ChatListItem.css.js');
    let js = read('chat/ChatListItem/ChatListItem.js');
    let source = `${template}\n${css}`;

    assert.equal(source.includes('ui-item'), false, 'ChatListItem must not keep ui-item');
    assert.equal(source.includes('chat-list-item'), true, 'ChatListItem must use a chat namespaced item class');
    assert.equal(js.includes("toggleAttribute('active'"), true, 'ChatListItem must reflect active state to the host');
    assert.equal(js.includes("toggleAttribute('nested'"), true, 'ChatListItem must reflect nesting state to the host');
  });

  it('keeps portal chat composition styled for Light DOM hosts', () => {
    let composerCss = read('chat/ChatComposer/ChatComposer.css.js');
    let chatSidebarCss = read('chat/ChatSidebar/ChatSidebar.css.js');
    let sidebarJs = read('chat/ChatSidebarItem/ChatSidebarItem.js');
    let sidebarCss = read('chat/ChatSidebarItem/ChatSidebarItem.css.js');

    assert.ok(
      composerCss.includes('chat-composer {'),
      'ChatComposer must publish a Light DOM host selector for its main input block'
    );
    assert.ok(
      composerCss.includes('chat-composer.drag-over .composer-body'),
      'ChatComposer drag-over styling must work without Shadow DOM :host'
    );
    assert.ok(
      composerCss.includes('sn-button.btn-send[variant="icon"] {'),
      'ChatComposer send affordance must override the shared icon-button background contract'
    );
    assert.ok(
      composerCss.includes('background: var(--sn-button-bg);'),
      'ChatComposer send affordance must render as an inverted action button'
    );
    assert.ok(
      composerCss.includes('border: 0;'),
      'ChatComposer send affordance must remove the shared button border'
    );
    assert.ok(
      composerCss.includes('--sn-button-hover-bg: var(--sn-composer-send-hover-bg);'),
      'ChatComposer send hover must use the project accent theme token'
    );
    assert.ok(
      composerCss.includes('sn-button.btn-send[variant="icon"].btn-stop') &&
      composerCss.includes('--sn-button-bg: var(--sn-danger-color);') &&
      composerCss.includes('sn-button.btn-send[variant="icon"].btn-stop::after') &&
      composerCss.includes('background: var(--sn-text);'),
      'ChatComposer stop affordance must use a red button with a CSS-rendered filled light square'
    );
    assert.ok(
      composerCss.includes('.voice-preview[hidden]'),
      'ChatComposer voice preview hidden state must override its flex display'
    );
    assert.ok(
      composerCss.includes('.voice-preview-content'),
      'ChatComposer voice preview must keep status and transcript in a stable content column'
    );
    assert.ok(
      read('chat/ChatComposer/ChatComposer.js').includes('<div class="composer-body voice-preview"'),
      'ChatComposer voice preview must reuse the composer input shell layout'
    );
    assert.ok(
      read('chat/ChatComposer/ChatComposer.js').includes("preview.className = `composer-body voice-preview ${mode}`"),
      'ChatComposer voice preview state updates must preserve the shared composer shell class'
    );
    assert.ok(
      composerCss.includes('.voice-preview-status[hidden]'),
      'ChatComposer voice preview status must hide independently from the transcript body'
    );
    assert.ok(
      composerCss.includes('.voice-preview-btn[hidden]'),
      'ChatComposer voice preview actions must support hidden buttons'
    );
    assert.equal(
      composerCss.includes('.voice-preview-btn.stop'),
      false,
      'ChatComposer voice preview must not keep a destructive stop button style for approval'
    );
    assert.ok(
      read('control/Button/Button.css.js').includes('sn-button[variant="success"]'),
      'Shared sn-button must expose a success variant through theme tokens'
    );
    assert.ok(
      read('themes/default-provider.js').includes("'--sn-button-success-bg': 'var(--sn-success-color)'"),
      'Default provider theme must define success button tokens'
    );
    assert.ok(
      read('chat/ChatComposer/ChatComposer.js').includes("setVoicePreview({ mode = 'recording', text = '', status = ''"),
      'ChatComposer must own a voice preview API with separate transcript and status fields'
    );
    assert.ok(
      read('chat/ChatComposer/ChatComposer.js').includes('chat-composer-voice-approve'),
      'ChatComposer recording preview must expose an approve event instead of a stop-only action'
    );
    assert.ok(
      read('chat/ChatComposer/ChatComposer.js').includes('this.ref.voiceCancelBtn.hidden = false'),
      'ChatComposer recording preview must show the cancel action alongside approve'
    );
    assert.ok(
      read('chat/ChatComposer/ChatComposer.js').includes('commandHints = []') &&
      read('chat/ChatComposer/ChatComposer.js').includes('voiceCommandHints') &&
      read('chat/ChatComposer/ChatComposer.js').includes('voice-command-hint') &&
      composerCss.includes('.voice-command-hints') &&
      composerCss.includes('.voice-command-hint') &&
      !read('chat/ChatComposer/ChatComposer.js').includes('chat-composer-voice-command-toggle'),
      'ChatComposer recording preview must expose passive voice command hints instead of an embedded toggle'
    );
    assert.ok(
      sidebarCss.includes('.chat-nav[collapsed] chat-sidebar-item .chat-item-delete'),
      'ChatSidebarItem compact delete affordance must work in Light DOM collapsed nav'
    );
    assert.ok(
      sidebarCss.includes('.chat-nav[collapsed] chat-sidebar-item[data-expanded] > .chat-sub-items') &&
      sidebarCss.includes('.chat-nav[collapsed] chat-sidebar-sub-item[data-expanded] > .chat-sub-items'),
      'ChatSidebarItem compact nav must show expanded nested chat lists'
    );
    assert.ok(
      composerCss.includes('.btn-wake-listen') &&
      composerCss.includes('.btn-wake-listen.listening') &&
      composerCss.includes('.btn-voice-response') &&
      composerCss.includes('.btn-voice-command') &&
      composerCss.includes('.btn-voice-response[hidden]') &&
      composerCss.includes('.btn-voice-response.enabled'),
      'ChatComposer voice controls must style continuous listening and voice response buttons next to mic'
    );
    assert.ok(
      sidebarCss.includes('--sn-chat-compact-label-width'),
      'ChatSidebarItem compact flyout must reserve label width through a reusable CSS token'
    );
    assert.ok(
      sidebarCss.includes('--sn-chat-compact-label-ch'),
      'ChatSidebarItem compact flyout must size labels from per-row text length'
    );
    assert.ok(
      sidebarJs.includes('getCompactChatLabelCh'),
      'ChatSidebarItem must expose a deterministic compact label width helper'
    );
    assert.ok(
      sidebarJs.includes('getCompactChatLabelWidthPx') && sidebarJs.includes('measureText(label).width'),
      'ChatSidebarItem compact flyout width must be measured from the rendered chat title'
    );
    assert.ok(
      sidebarJs.includes('COMPACT_LABEL_MIN_CH'),
      'ChatSidebarItem compact label helper must declare its minimum clamp'
    );
    assert.ok(
      sidebarJs.includes('COMPACT_LABEL_MIN_PX') && sidebarJs.includes('COMPACT_LABEL_MAX_PX'),
      'ChatSidebarItem compact label measurement must clamp measured text width'
    );
    assert.ok(
      sidebarJs.includes('COMPACT_LABEL_MAX_CH'),
      'ChatSidebarItem compact label helper must declare its maximum clamp'
    );
    assert.ok(
      sidebarCss.includes('calc(var(--sn-chat-compact-label-ch, 18) * 5px + 20px)'),
      'ChatSidebarItem compact flyout width must resolve consistently across label and delete controls'
    );
    assert.ok(
      sidebarCss.includes('.chat-nav[collapsed] chat-sidebar-item .chat-item:hover .chat-item-label'),
      'ChatSidebarItem compact flyout must expose the chat title with the delete affordance'
    );
    assert.ok(
      sidebarCss.includes('inset-inline-start: 46px;') && sidebarCss.includes('inset: 0 auto 0 calc(46px + var(--sn-chat-compact-label-width));'),
      'ChatSidebarItem compact delete affordance must slide out after the chat title'
    );
    assert.ok(
      sidebarCss.includes('.chat-nav[collapsed] chat-sidebar-sub-item .chat-item-delete'),
      'ChatSidebarSubItem compact delete affordance must use the same full flyout hit area'
    );
    assert.ok(
      !sidebarCss.includes('.chat-nav[collapsed] chat-sidebar-item .chat-item::after'),
      'ChatSidebarItem compact flyout must not expose an invisible hover bridge'
    );
    assert.ok(
      !sidebarCss.includes('.chat-nav[collapsed] chat-sidebar-sub-item .chat-item-child::after'),
      'ChatSidebarSubItem compact flyout must not expose an invisible hover bridge'
    );
    assert.ok(
      sidebarCss.includes('.chat-item:has(.chat-item-delete:hover) .chat-item-delete'),
      'ChatSidebarItem delete affordance must stay visible while the delete button is hovered'
    );
    assert.ok(
      sidebarCss.includes('.chat-nav[collapsed] chat-sidebar-item .chat-item:has(.chat-item-delete:hover) .chat-item-delete'),
      'ChatSidebarItem compact delete affordance must not disappear when pointer moves onto the flyout button'
    );
    assert.ok(
      sidebarCss.includes('.chat-nav[collapsed] chat-sidebar-item .chat-sub-items'),
      'Collapsed chat navigation must hide nested chat lists'
    );
    assert.equal(
      chatSidebarCss.includes('.chat-nav[collapsed] .chat-nav-resize-handle') && chatSidebarCss.includes('pointer-events: none;'),
      false,
      'Collapsed chat navigation must keep the resize handle draggable'
    );
    assert.ok(
      sidebarCss.includes('.chat-nav[collapsed] chat-sidebar-item .chat-item:hover') && sidebarCss.includes('z-index: 30;'),
      'Collapsed chat flyout rows must stack above the resize handle while hovered'
    );
    assert.ok(
      sidebarCss.includes(':host-context(.chat-nav[collapsed]) .chat-sub-items'),
      'Shadow-context collapsed chat navigation must hide nested chat lists'
    );
    assert.ok(
      sidebarCss.includes('.chat-nav[collapsed] chat-sidebar-sub-item .chat-item-child::before'),
      'Collapsed nested chat rows must suppress vertical tree rails so they do not cross centered icons'
    );
    assert.ok(
      sidebarJs.includes("metaLabel: ''") &&
      sidebarJs.includes("textContent: 'metaLabel'") &&
      !sidebarJs.includes("textContent: 'agentType'"),
      'ChatSidebarItem must display semantic metadata labels instead of technical adapter names'
    );
    assert.ok(
      sidebarJs.includes("'@data-id': 'id'") &&
      sidebarJs.includes("'@data-parent': 'id'"),
      'ChatSidebarItem must expose row ids for delegated sidebar selection and expansion'
    );
    assert.ok(
      sidebarCss.includes('.chat-item-type:empty') &&
      sidebarCss.includes('display: none;'),
      'ChatSidebarItem must hide empty metadata badges'
    );
    assert.ok(
      sidebarCss.includes('chat-sidebar-sub-item[data-active] > .chat-item-child') &&
      sidebarCss.includes('padding-left: 36px;') &&
      sidebarCss.includes('chat-sidebar-sub-item .chat-sub-items chat-sidebar-sub-item[data-active] > .chat-item-child') &&
      sidebarCss.includes('padding-left: 56px;'),
      'ChatSidebarSubItem active rows must preserve nested indentation while showing the active border'
    );
  });

  it('supports grouped project chat trees with recursive sub-items', () => {
    let shellJs = read('chat/ChatSidebar/ChatSidebar.js');
    let sidebarJs = read('chat/ChatSidebarItem/ChatSidebarItem.js');
    let sidebarCss = read('chat/ChatSidebarItem/ChatSidebarItem.css.js');

    assert.ok(
      sidebarJs.includes('isGroup: false'),
      'ChatSidebarItem must expose an explicit group mode for non-chat tree roots'
    );
    assert.ok(
      shellJs.includes("closest('.chat-item, .chat-item-child')"),
      'ChatSidebar must delegate selection for both root and nested chat rows'
    );
    assert.ok(
      sidebarJs.includes("emit(this, 'chat-sidebar-toggle'"),
      'ChatSidebarItem group and expand controls must emit toggle events instead of selecting chats'
    );
    assert.ok(
      sidebarJs.includes('this.toggleAttribute(\'data-group\', value)'),
      'ChatSidebarItem must reflect project groups to a host attribute for theme styling'
    );
    assert.equal(
      (sidebarJs.match(/item-tag="chat-sidebar-sub-item"/g) || []).length,
      2,
      'ChatSidebarItem and ChatSidebarSubItem must both render recursive chat-sidebar-sub-item children'
    );
    assert.ok(
      sidebarCss.includes('var(--sn-chat-item-icon-color, var(--sn-cat-server)) 14%'),
      'Active chat rows must derive selection tint from the project or agent icon color'
    );
    assert.ok(
      sidebarCss.includes('chat-sidebar-item[data-group] > .chat-item .chat-item-delete'),
      'Project group roots must not expose chat delete controls'
    );
    assert.ok(
      shellJs.includes('setGroupDividers(enabled)'),
      'ChatSidebarShell must expose grouped divider policy as a reusable library control'
    );
    assert.ok(
      sidebarCss.includes('.chat-nav[data-group-dividers] chat-sidebar-item[data-group] + chat-sidebar-item[data-group]'),
      'Adjacent project chat groups must use opt-in horizontal dividers'
    );
    assert.ok(
      sidebarCss.includes('inline-size: 16px;'),
      'Project chat group dividers must match the icon width in collapsed navigation'
    );
    assert.ok(
      sidebarCss.includes('background: var(--sn-tabs-divider);'),
      'Project chat group dividers must reuse the project tabs divider token'
    );
    assert.ok(
      sidebarCss.includes('chat-sidebar-sub-item[data-expanded] > .chat-sub-items'),
      'Nested chat sub-items must be able to expand their own child chats'
    );
  });
});
