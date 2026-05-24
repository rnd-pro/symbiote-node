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
  });
});
