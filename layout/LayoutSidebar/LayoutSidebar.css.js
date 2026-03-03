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

/* Header — matches panel header height */
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

layout-sidebar .sb-header-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 6px;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: var(--sn-text-dim, #888);
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: var(--sn-node-hover, rgba(255, 255, 255, 0.06));
    color: var(--sn-text, #d4d4d4);
  }

  & .material-symbols-outlined {
    font-size: 16px;
  }

  /* Active state when edit mode is on */
  layout-sidebar[edit-mode] & {
    color: var(--sn-cat-server, #5cb8ff);
    background: rgba(92, 184, 255, 0.1);
  }
}

/* Sections container */
layout-sidebar .sb-sections {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px 0;
}

/* Toggle collapse button */
layout-sidebar .sb-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  margin: 4px 6px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--sn-text-dim, #888);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: var(--sn-node-hover, rgba(255, 255, 255, 0.06));
    color: var(--sn-text, #d4d4d4);
  }

  & .material-symbols-outlined {
    font-size: 18px;
    transition: transform 0.2s ease;
  }

  layout-sidebar[collapsed] & .material-symbols-outlined {
    transform: rotate(180deg);
  }
}

/* ═══════════════════════════ SidebarSection ══════════════════════════ */
sidebar-section {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  position: relative;

  /* Hidden section in normal mode — completely hidden */
  &[data-hidden] {
    display: none;
  }

  /* In edit mode, hidden sections ARE shown but dimmed */
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

/* Drag handle — hidden by default, shown in edit mode */
sidebar-section .sec-drag-handle {
  display: none;
  align-items: center;
  padding: 0 2px;
  cursor: grab;
  color: var(--sn-text-dim, #888);

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

/* Main section item row */
sidebar-section .sec-item {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  padding: 6px 14px;
  cursor: pointer;
  color: var(--sn-text-dim, #888);
  transition: background 0.12s, color 0.12s;
  white-space: nowrap;
  overflow: hidden;

  /* When drag handle is visible, reduce left padding */
  layout-sidebar[edit-mode] & {
    padding-left: 4px;
  }

  &:hover {
    background: var(--sn-node-hover, rgba(255, 255, 255, 0.06));
    color: var(--sn-text, #d4d4d4);
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

sidebar-section .sec-expand {
  margin-left: auto;
  font-size: 16px;
  transition: transform 0.15s;

  layout-sidebar[collapsed] & {
    display: none;
  }

  layout-sidebar[edit-mode] & {
    display: none;
  }
}

/* Active section */
sidebar-section[data-active] > .sec-item {
  color: var(--sn-text, #d4d4d4);
  background: var(--sn-node-hover, rgba(255, 255, 255, 0.06));
  border-left: 2px solid var(--sn-cat-server, #5cb8ff);
  padding-left: 12px;

  layout-sidebar[edit-mode] & {
    padding-left: 2px;
  }
}

/* Eye visibility toggle — hidden by default, shown in edit mode */
sidebar-section .sec-eye {
  display: none;
  align-items: center;
  justify-content: center;
  padding: 4px 6px;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: var(--sn-text-dim, #888);
  transition: color 0.15s, background 0.15s;
  flex-shrink: 0;

  &:hover {
    background: var(--sn-node-hover, rgba(255, 255, 255, 0.06));
    color: var(--sn-text, #d4d4d4);
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

  /* Hidden section — dimmed eye icon */
  sidebar-section[data-hidden] & {
    opacity: 0.5;
  }
}

/* Sub-panels */
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
  font-size: 12px;
  color: var(--sn-text-dim, #888);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;

  &:hover {
    background: var(--sn-node-hover, rgba(255, 255, 255, 0.04));
    color: var(--sn-text, #d4d4d4);
  }

  & .material-symbols-outlined {
    font-size: 14px;
    opacity: 0.6;
  }
}
`;
