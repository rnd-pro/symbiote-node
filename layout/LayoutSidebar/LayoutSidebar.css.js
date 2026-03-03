/**
 * LayoutSidebar styles
 * @module symbiote-node/layout/LayoutSidebar
 */
import { css } from '@symbiotejs/symbiote';

export const sidebarStyles = css`
layout-sidebar {
  display: flex;
  flex-direction: column;
  width: 220px;
  min-width: 220px;
  background: var(--sn-bg, #1e1e1e);
  border-right: 1px solid var(--sn-node-border, rgba(255, 255, 255, 0.06));
  overflow: hidden;
  transition: width 0.2s ease, min-width 0.2s ease;
  user-select: none;

  &[collapsed] {
    width: 48px;
    min-width: 48px;
  }
}

/* ═══════════════════════ Header — same as panel headers ═══════════════════════ */
layout-sidebar .sb-header {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px 4px;
  min-height: 28px;
  background: var(--bg-header, var(--sn-bg, #1e1e1e));
  border-bottom: 1px solid var(--sn-node-border, rgba(255, 255, 255, 0.06));
  flex-shrink: 0;
}

layout-sidebar .sb-header-spacer {
  flex: 1;
}

/* Header buttons — same style as panel header-btn */
layout-sidebar .sb-header-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 6px;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-dim, var(--sn-text-dim, #888));
  font-size: 0.75rem;
  transition: background 0.1s, color 0.1s;

  &:hover {
    background: var(--bg-hover, var(--sn-node-hover, rgba(255, 255, 255, 0.06)));
    color: var(--text-main, var(--sn-text, #d4d4d4));
  }

  & .material-symbols-outlined {
    font-size: 16px;
  }

  /* Active tune button in edit mode */
  layout-sidebar[edit-mode] &:first-child {
    color: var(--sn-cat-server, #5cb8ff);
    background: rgba(92, 184, 255, 0.1);
  }
}

/* Collapse icon rotation */
layout-sidebar .sb-collapse-icon {
  transition: transform 0.2s ease;
}

layout-sidebar[collapsed] .sb-collapse-icon {
  transform: rotate(180deg);
}

/* ═══════════════════════ Sections container ═══════════════════════ */
layout-sidebar .sb-sections {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px 0;
}

/* ═══════════════════════ SidebarSection ═══════════════════════ */
sidebar-section {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  position: relative;

  /* Hidden section in normal mode */
  &[data-hidden] {
    display: none;
  }

  /* In edit mode, hidden sections are dimmed */
  layout-sidebar[edit-mode] &[data-hidden] {
    display: flex;
    opacity: 0.35;
  }

  /* Drag states */
  &[data-dragging] {
    opacity: 0.4;
  }

  &[data-dragover] {
    border-top: 2px solid var(--sn-cat-server, #5cb8ff);
  }
}

/* Drag handle — edit mode only */
sidebar-section .sec-drag-handle {
  display: none;
  align-items: center;
  padding: 0 2px;
  cursor: grab;
  color: var(--text-dim, var(--sn-text-dim, #888));

  &:active {
    cursor: grabbing;
  }

  & .material-symbols-outlined {
    font-size: 16px;
  }

  layout-sidebar[edit-mode] & {
    display: flex;
  }

  layout-sidebar[collapsed] & {
    display: none;
  }
}

/* Section row */
sidebar-section .sec-item {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  padding: 6px 14px;
  min-height: 28px;
  cursor: pointer;
  color: var(--text-dim, var(--sn-text-dim, #888));
  transition: background 0.12s, color 0.12s;
  white-space: nowrap;
  overflow: hidden;

  layout-sidebar[edit-mode] & {
    padding-left: 4px;
  }

  &:hover {
    background: var(--bg-hover, var(--sn-node-hover, rgba(255, 255, 255, 0.06)));
    color: var(--text-main, var(--sn-text, #d4d4d4));
  }
}

sidebar-section .sec-icon {
  font-size: 20px;
  flex-shrink: 0;
}

sidebar-section .sec-label {
  font-size: 13px;
  font-weight: 500;

  layout-sidebar[collapsed] & {
    display: none;
  }
}

/* Expand chevron */
sidebar-section .sec-expand {
  margin-left: auto;
  font-size: 16px;
  transition: transform 0.15s, opacity 0.15s;

  layout-sidebar[collapsed] & {
    display: none;
  }

  layout-sidebar[edit-mode] & {
    display: none;
  }

  /* Inactive state when no sub-panels */
  sidebar-section:not([data-has-sub]) & {
    opacity: 0.2;
    cursor: default;
  }
}

/* Active section */
sidebar-section[data-active] > .sec-item {
  color: var(--text-main, var(--sn-text, #d4d4d4));
  background: var(--bg-hover, var(--sn-node-hover, rgba(255, 255, 255, 0.06)));
  border-left: 2px solid var(--sn-cat-server, #5cb8ff);
  padding-left: 12px;

  layout-sidebar[edit-mode] & {
    padding-left: 2px;
  }
}

/* Eye visibility button — edit mode only */
sidebar-section .sec-eye {
  display: none;
  align-items: center;
  justify-content: center;
  padding: 4px 6px;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-dim, var(--sn-text-dim, #888));
  transition: color 0.15s, background 0.15s;
  flex-shrink: 0;

  &:hover {
    background: var(--bg-hover, var(--sn-node-hover, rgba(255, 255, 255, 0.06)));
    color: var(--text-main, var(--sn-text, #d4d4d4));
  }

  & .material-symbols-outlined {
    font-size: 16px;
  }

  layout-sidebar[edit-mode] & {
    display: flex;
  }

  layout-sidebar[collapsed] & {
    display: none;
  }

  sidebar-section[data-hidden] & {
    opacity: 0.5;
  }
}

/* ═══════════════════════ Sub-panels ═══════════════════════ */
sidebar-section .sec-sub-panels {
  width: 100%;
  overflow: hidden;
  max-height: 0;
  transition: max-height 0.2s ease;

  layout-sidebar[collapsed] & {
    display: none;
  }

  layout-sidebar[edit-mode] & {
    display: none;
  }
}

sidebar-section[data-expanded] .sec-sub-panels {
  max-height: 300px;
}

sidebar-section[data-expanded] .sec-expand {
  transform: rotate(90deg);
}

sidebar-section .sub-panel-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 14px 4px 38px;
  min-height: 24px;
  font-size: 12px;
  color: var(--text-dim, var(--sn-text-dim, #888));
  cursor: default;
  transition: background 0.12s, color 0.12s;

  &:hover {
    background: var(--bg-hover, var(--sn-node-hover, rgba(255, 255, 255, 0.04)));
    color: var(--text-main, var(--sn-text, #d4d4d4));
  }

  & .material-symbols-outlined {
    font-size: 14px;
    opacity: 0.6;
  }
}

/* Close button on sub-panel items */
sidebar-section .sub-panel-close {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  padding: 2px;
  background: transparent;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  color: var(--text-dim, var(--sn-text-dim, #888));
  opacity: 0;
  transition: opacity 0.12s, background 0.12s, color 0.12s;

  & .material-symbols-outlined {
    font-size: 14px;
  }

  &:hover {
    background: rgba(255, 80, 80, 0.15);
    color: #ff6b6b;
  }
}

/* Show close only on hover of non-master items */
sidebar-section .sub-panel-item:hover .sub-panel-close {
  opacity: 1;
}

/* Hide close button on master panel items */
sidebar-sub-item[data-master] .sub-panel-close {
  display: none;
}
`;
