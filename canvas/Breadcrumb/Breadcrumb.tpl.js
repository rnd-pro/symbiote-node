/**
 * Breadcrumb template
 * @module symbiote-node/canvas/Breadcrumb.tpl
 */
import { html } from '@symbiotejs/symbiote';

export const template = html`
  <div ${{ itemize: 'crumbs', 'item-tag': 'breadcrumb-item' }}></div>
`;
