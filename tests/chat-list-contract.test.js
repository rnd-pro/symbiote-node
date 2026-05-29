import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let PKG_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../');

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
      sidebarCss.includes('.chat-nav[collapsed] chat-sidebar-item .chat-item-delete'),
      'ChatSidebarItem compact delete affordance must work in Light DOM collapsed nav'
    );
    assert.ok(
      sidebarCss.includes('.chat-nav[collapsed] chat-sidebar-sub-item .chat-item-delete'),
      'ChatSidebarSubItem compact delete affordance must use the same full flyout hit area'
    );
    assert.ok(
      sidebarCss.includes('.chat-nav[collapsed] chat-sidebar-item .chat-item::after'),
      'ChatSidebarItem compact delete hover bridge must extend into the chat area'
    );
    assert.ok(
      sidebarCss.includes('.chat-nav[collapsed] chat-sidebar-sub-item .chat-item-child::after'),
      'ChatSidebarSubItem compact delete hover bridge must extend into the chat area'
    );
    assert.ok(
      sidebarCss.includes('pointer-events: auto;'),
      'ChatSidebarItem compact delete hover bridge must participate in pointer hit-testing'
    );
    assert.ok(
      sidebarCss.includes('.chat-item:has(.chat-item-delete:hover) .chat-item-delete'),
      'ChatSidebarItem delete affordance must stay visible while the delete button is hovered'
    );
    assert.ok(
      sidebarCss.includes('.chat-nav[collapsed] chat-sidebar-item .chat-item:has(.chat-item-delete:hover) .chat-item-delete'),
      'ChatSidebarItem compact delete affordance must not disappear when pointer moves onto the flyout button'
    );
    assert.equal(
      sidebarCss.includes('.chat-nav[collapsed] chat-sidebar-item .chat-sub-items'),
      false,
      'Collapsed chat navigation must still allow expanded chat groups to render their nested icons'
    );
    assert.equal(
      sidebarCss.includes(':host-context(.chat-nav[collapsed]) .chat-sub-items'),
      false,
      'Shadow-context collapsed chat navigation must not suppress expanded nested chats'
    );
    assert.ok(
      sidebarCss.includes('.chat-nav[collapsed] chat-sidebar-sub-item .chat-item-child::before'),
      'Collapsed nested chat rows must suppress vertical tree rails so they do not cross centered icons'
    );
  });

  it('supports grouped project chat trees with recursive sub-items', () => {
    let sidebarJs = read('chat/ChatSidebarItem/ChatSidebarItem.js');
    let sidebarCss = read('chat/ChatSidebarItem/ChatSidebarItem.css.js');

    assert.ok(
      sidebarJs.includes('isGroup: false'),
      'ChatSidebarItem must expose an explicit group mode for non-chat tree roots'
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
      sidebarCss.includes('chat-sidebar-item[data-group] + chat-sidebar-item[data-group]'),
      'Adjacent project chat groups must use a horizontal divider instead of a vertical rail'
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
