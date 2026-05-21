import Symbiote from '@symbiotejs/symbiote';
import { slotProcessor } from '@symbiotejs/symbiote/core/slotProcessor.js';
import template from './Button.tpl.js';
import css from './Button.css.js';

export class ActionButton extends Symbiote {
  #onKeyDown = (event) => {
    if (this.hasAttribute('disabled')) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.click();
  };

  constructor() {
    super();
    this.templateProcessors.add(slotProcessor);
  }

  connectedCallback() {
    super.connectedCallback?.();
    if (!this.hasAttribute('role')) this.setAttribute('role', 'button');
    if (!this.hasAttribute('tabindex')) this.tabIndex = 0;
    this.addEventListener('keydown', this.#onKeyDown);
  }

  disconnectedCallback() {
    this.removeEventListener('keydown', this.#onKeyDown);
    super.disconnectedCallback?.();
  }
}

ActionButton.template = template;
ActionButton.rootStyles = css;
ActionButton.reg('sn-button');

export default ActionButton;
