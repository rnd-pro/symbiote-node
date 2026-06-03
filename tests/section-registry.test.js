import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  SECTION_SCOPES,
  createSectionRegistry,
  normalizeSectionScope,
  sectionMatchesScope,
  withGlobalPanel,
} from '../packages/symbiote-ui/layout/LayoutRouter/SectionRegistry.js';
import * as LayoutTree from '../packages/symbiote-ui/layout/LayoutTree.js';

describe('section registry', () => {
  it('registers, sorts, scopes, and resolves layouts', () => {
    let registry = createSectionRegistry();
    registry.registerSection('settings', {
      icon: 'settings',
      label: 'Settings',
      order: 30,
      scope: 'both',
      layout: () => LayoutTree.createPanel('settings'),
    });
    registry.registerSection('home', {
      icon: 'home',
      label: 'Home',
      order: 10,
      scope: 'home',
      layout: () => LayoutTree.createPanel('home-panel'),
    });
    registry.registerSection('project', {
      icon: 'folder',
      label: 'Project',
      order: 20,
      scope: 'project',
    });

    assert.deepEqual(registry.getSections().map((section) => section.id), ['home', 'project', 'settings']);
    assert.deepEqual(registry.getHomeSections().map((section) => section.id), ['home', 'settings']);
    assert.deepEqual(registry.getProjectSections().map((section) => section.id), ['project', 'settings']);
    assert.deepEqual(registry.getSectionsForScope(null).map((section) => section.id), ['home', 'settings']);
    assert.deepEqual(registry.getSectionsForScope('project-id').map((section) => section.id), ['project', 'settings']);
    assert.equal(registry.hasSection('settings'), true);
    assert.equal(registry.getLayout('settings').panelType, 'settings');
    assert.equal(registry.getLayout('missing'), null);
  });

  it('normalizes unknown scopes and matches both scopes', () => {
    assert.equal(normalizeSectionScope('bogus'), SECTION_SCOPES.BOTH);
    assert.equal(sectionMatchesScope({ scope: 'both' }, 'home'), true);
    assert.equal(sectionMatchesScope({ scope: 'project' }, 'home'), false);
  });

  it('wraps layouts with a global panel', () => {
    let layout = withGlobalPanel(() => LayoutTree.createPanel('main'), 'agent-chat', {
      collapsed: false,
      ratio: 0.7,
    })();

    assert.equal(layout.type, 'split');
    assert.equal(layout.ratio, 0.7);
    assert.equal(layout.first.panelType, 'main');
    assert.equal(layout.second.panelType, 'agent-chat');
    assert.equal(layout.second.global, true);
    assert.equal(layout.second.collapsed, false);
  });
});
