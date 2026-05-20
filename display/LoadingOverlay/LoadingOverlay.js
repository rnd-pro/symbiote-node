import { Symbiote } from '@symbiotejs/symbiote';
import template from './LoadingOverlay.tpl.js';
import css from './LoadingOverlay.css.js';

export class LoadingOverlay extends Symbiote {
  init$ = {
    label: 'Loading',
    pct: 0,
    phase: 'Initializing...',
    sub: '',
    isHidden: false,
  };

  renderCallback() {
    this.sub('isHidden', (value) => {
      this.toggleAttribute('hidden-state', Boolean(value));
    });
  }

  show() {
    this.$.isHidden = false;
  }

  hide(onComplete) {
    this.$.isHidden = true;
    if (onComplete) {
      setTimeout(onComplete, 350);
    }
  }

  setProgress(pct, phase, sub = '') {
    let value = Number(pct);
    this.$.pct = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
    this.$.phase = phase || '';
    this.$.sub = sub || '';
  }
}

LoadingOverlay.template = template;
LoadingOverlay.rootStyles = css;
LoadingOverlay.reg('sn-loading-overlay');

export default LoadingOverlay;
