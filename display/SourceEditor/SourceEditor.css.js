export default `
:host {
  display: block;
}

source-editor {
  display: block;
  height: 100%;
  min-height: 0;
}

source-editor textarea {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  border: 0;
  outline: 0;
  resize: none;
  padding: var(--sn-source-editor-padding, 14px 16px);
  background: var(--sn-source-editor-bg, var(--sn-bg, hsl(37, 30%, 96%)));
  color: var(--sn-source-editor-color, var(--sn-text, hsl(30, 15%, 18%)));
  font-family: var(--sn-font-mono, 'SF Mono', 'Fira Code', 'Cascadia Code', monospace);
  font-size: var(--sn-source-editor-font-size, 12px);
  line-height: var(--sn-source-editor-line-height, 1.6);
  tab-size: var(--sn-source-editor-tab-size, 2);
}

source-editor textarea::placeholder {
  color: var(--sn-source-editor-placeholder-color, var(--sn-text-dim, hsl(30, 10%, 55%)));
}

source-editor textarea:disabled,
source-editor textarea[readonly] {
  cursor: default;
  opacity: 0.82;
}
`;
