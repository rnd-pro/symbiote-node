import Symbiote, { html } from '@symbiotejs/symbiote';
import css from './ProjectTabs.css.js';
import tpl from './ProjectTabs.tpl.js';

function emit(el, type, detail = {}) {
  el.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true, detail }));
}

export class ProjectTabs extends Symbiote {
  init$ = {
    activeId: null,
    tabs: [],
    homeIcon: 'home',
    homeLabel: 'Home',
    addTitle: 'Open project',
    onHomeClick: () => emit(this, 'project-tabs-home'),
    onAddClick: () => emit(this, 'project-tabs-add'),
  };

  renderCallback() {
    this.sub('activeId', (id) => this.setAttribute('active-id', id || ''));
  }

  setTabs(tabs = [], activeId = this.$.activeId) {
    this.$.activeId = activeId || null;
    this.$.tabs = tabs.map((tab) => ({
      id: tab.id,
      name: tab.name || tab.id,
      color: tab.color || '',
      icon: tab.icon || 'folder',
      closeable: tab.closeable !== false,
      isActive: tab.id === this.$.activeId,
    }));
  }
}

class ProjectTabItem extends Symbiote {
  init$ = {
    id: '',
    name: '',
    color: '',
    icon: 'folder',
    closeable: true,
    isActive: false,
    onClick: (e) => {
      if (e.target.closest('.tab-close')) return;
      emit(this, 'project-tabs-select', { id: this.$.id });
    },
    onCloseClick: (e) => {
      e.stopPropagation();
      emit(this, 'project-tabs-close', { id: this.$.id });
    },
  };

  renderCallback() {
    this.sub('color', (color) => {
      if (color) this.style.setProperty('--tab-accent', color);
      else this.style.removeProperty('--tab-accent');
    });
    this.sub('isActive', (value) => this.toggleAttribute('active', value));
    this.onclick = this.$.onClick;
  }
}

ProjectTabItem.template = html`
  <span class="material-symbols-outlined" ${{ textContent: 'icon' }}></span>
  <span ${{ textContent: 'name' }}></span>
  <button class="tab-close" title="Close" ${{ onclick: 'onCloseClick', '@hidden': '!closeable' }}>×</button>
`;

ProjectTabItem.reg('project-tab-item');

ProjectTabs.template = tpl;
ProjectTabs.rootStyles = css;
ProjectTabs.reg('project-tabs');
