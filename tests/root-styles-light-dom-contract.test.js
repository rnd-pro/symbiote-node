import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const LIGHT_DOM_ROOT_STYLE_FILES = [
  ['chat/ChatList/ChatList.css.js', 'chat-list'],
  ['chat/ChatListItem/ChatListItem.css.js', 'chat-list-item'],
  ['chat/ChatMessageItem/ChatMessageItem.css.js', 'chat-message-item'],
  ['chat/ChatSidebar/ChatSidebar.css.js', 'chat-sidebar-shell'],
  ['chat/ChatTranscript/ChatTranscript.css.js', 'chat-transcript'],
  ['display/OutputGraphPreview/OutputGraphPreview.css.js', 'output-graph-preview'],
  ['display/OutputListPreview/OutputListPreview.css.js', 'output-list-preview'],
  ['layout/CrossLayoutPortalBridge/CrossLayoutPortalBridge.js', 'cross-layout-portal-bridge'],
  ['layout/ProjectTabs/ProjectTabs.css.js', 'project-tabs'],
  ['list/ListItem/ListItem.css.js', 'sn-list-item'],
  ['navigation/QuickOpen/QuickOpen.css.js', 'quick-open'],
];

function assertLightDomRootSelector(source, tag, relative) {
  let escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.match(
    source,
    new RegExp(`(^|,)\\s*${escaped}(?:\\s|\\{|\\[|\\.|:|,)`, 'm'),
    `${relative} rootStyles must include ${tag} so Light DOM theme styles apply`
  );
}

describe('Symbiote Light DOM rootStyles contract', () => {
  it('keeps rootStyles selectors addressable outside Shadow DOM', () => {
    for (let [relative, tag] of LIGHT_DOM_ROOT_STYLE_FILES) {
      let source = fs.readFileSync(path.join(ROOT, relative), 'utf8');

      assertLightDomRootSelector(source, tag, relative);
    }
  });
});
