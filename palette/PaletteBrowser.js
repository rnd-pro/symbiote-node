/**
 * PaletteBrowser — Component library browser panel
 *
 * Displays categorized node types that can be dragged onto the canvas.
 * Similar to TouchDesigner's Component Palette concept.
 * Shows grouped node templates with icons, descriptions, and drag support.
 *
 * @module symbiote-node/palette/PaletteBrowser
 */

import Symbiote from '@symbiotejs/symbiote';
import { template } from './PaletteBrowser.tpl.js';
import { styles } from './PaletteBrowser.css.js';

export class PaletteBrowser extends Symbiote {

  init$ = {
    items: [],
    filterText: '',
  };

  /** @type {Array<{ category: string, color: string, items: Array<{ name: string, icon: string, type: string, desc: string, factory: function }> }>} */
  #categories = [];

  /** @type {function|null} */
  #onSelect = null;

  /**
   * Register palette categories and items
   * @param {Array<{ category: string, color: string, items: Array<{ name: string, icon: string, type: string, desc: string, factory: function }> }>} categories
   */
  setCategories(categories) {
    this.#categories = categories;
    this.#renderList();
  }

  /**
   * Set callback for item selection
   * @param {function} callback - (factory, name) => void
   */
  onSelect(callback) {
    this.#onSelect = callback;
  }

  #renderList(filter = '') {
    const list = this.ref.palList;
    if (!list) return;
    list.replaceChildren();

    const lowerFilter = filter.toLowerCase();

    for (const cat of this.#categories) {
      const filteredItems = lowerFilter
        ? cat.items.filter(it => it.name.toLowerCase().includes(lowerFilter) || it.desc.toLowerCase().includes(lowerFilter))
        : cat.items;

      if (filteredItems.length === 0) continue;

      const catDiv = document.createElement('div');
      catDiv.className = 'pal-category';

      const catHeader = document.createElement('div');
      catHeader.className = 'pal-cat-header';
      const headerIcon = document.createElement('span');
      headerIcon.className = 'material-symbols-outlined';
      headerIcon.textContent = 'expand_more';
      catHeader.append(headerIcon, ` ${cat.category}`);
      catHeader.addEventListener('click', () => {
        catDiv.toggleAttribute('data-collapsed');
      });

      const itemsDiv = document.createElement('div');
      itemsDiv.className = 'pal-cat-items';

      catDiv.append(catHeader, itemsDiv);

      for (const item of filteredItems) {
        const el = document.createElement('div');
        el.className = 'pal-item';
        el.style.setProperty('--item-color', cat.color);

        const itemIcon = document.createElement('span');
        itemIcon.className = 'pal-item-icon material-symbols-outlined';
        itemIcon.textContent = item.icon;

        const itemLabel = document.createElement('span');
        itemLabel.className = 'pal-item-label';
        itemLabel.textContent = item.name;

        const itemDesc = document.createElement('span');
        itemDesc.className = 'pal-item-desc';
        itemDesc.textContent = item.desc;

        el.append(itemIcon, itemLabel, itemDesc);
        el.addEventListener('click', () => {
          if (this.#onSelect) this.#onSelect(item.factory, item.name);
        });
        // Drag support
        el.draggable = true;
        el.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', JSON.stringify({ name: item.name, type: item.type }));
          e.dataTransfer.effectAllowed = 'copy';
        });
        itemsDiv.appendChild(el);
      }

      list.appendChild(catDiv);
    }
  }

  initCallback() {
    super.initCallback();
    this.ref.palSearch?.addEventListener('input', (e) => {
      this.#renderList(e.target.value);
    });
  }
}

PaletteBrowser.template = template;
PaletteBrowser.rootStyles = styles;
PaletteBrowser.reg('palette-browser');
