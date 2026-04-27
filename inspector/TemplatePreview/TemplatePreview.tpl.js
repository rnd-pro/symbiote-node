/**
 * TemplatePreview template
 * @module symbiote-node/inspector/TemplatePreview.tpl
 */
import { html } from '@symbiotejs/symbiote';

export let template = html`
<div class="tpl-preview-section">
  <div class="tpl-chips-label">
    <span class="material-symbols-outlined">sell</span> Placeholders
  </div>
  <div class="tpl-chips" itemize="placeholderChips">
    <template>
      <span class="tpl-chip">{{name}}</span>
    </template>
  </div>
  <div class="tpl-chips-empty" ${{ '@hidden': '!noPlaceholders' }}>
    Type {field} in template to add placeholders
  </div>
</div>
<div class="tpl-preview-section">
  <div class="tpl-preview-label">
    <span class="material-symbols-outlined">data_object</span> Test Data (JSON)
  </div>
  <textarea class="tpl-test-data" rows="3" spellcheck="false"></textarea>
</div>
<div class="tpl-preview-section">
  <div class="tpl-preview-label">
    <span class="material-symbols-outlined">visibility</span> Preview
  </div>
  <div class="tpl-preview-result" ${{ textContent: 'previewText' }}></div>
</div>
`;
