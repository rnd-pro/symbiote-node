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

layout-sidebar .sb-header {
  padding: 12px 14px;
  border-bottom: 1px solid var(--sn-node-border, rgba(255, 255, 255, 0.06));
  white-space: nowrap;
  overflow: hidden;

  layout-sidebar[collapsed] & {
    padding: 12px 6px;
  }
}

layout-sidebar .sb-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--sn-text, #d4d4d4);
  letter-spacing: 0.02em;

  layout-sidebar[collapsed] & {
    display: none;
  }
}

layout-sidebar .sb-sections {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px 0;
}

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

/* SidebarSection styles */
sidebar-section {
  display: block;
}

sidebar-section .sec-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px;
  cursor: pointer;
  color: var(--sn-text-dim, #888);
  transition: background 0.12s, color 0.12s;
  white-space: nowrap;
  overflow: hidden;

  &:hover {
    background: var(--sn-node-hover, rgba(255, 255, 255, 0.06));
    color: var(--sn-text, #d4d4d4);
  }

  & .material-symbols-outlined {
    font-size: 20px;
    flex-shrink: 0;
  }

  & .sec-label {
    font-size: 13px;
    font-weight: 500;

    layout-sidebar[collapsed] & {
      display: none;
    }
  }

  & .sec-expand {
    margin-left: auto;
    font-size: 16px;
    transition: transform 0.15s;

    layout-sidebar[collapsed] & {
      display: none;
    }
  }
}

sidebar-section[data-active] > .sec-item {
  color: var(--sn-text, #d4d4d4);
  background: var(--sn-node-hover, rgba(255, 255, 255, 0.06));
  border-left: 2px solid var(--sn-cat-server, #5cb8ff);
  padding-left: 12px;
}

sidebar-section .sec-sub-panels {
  overflow: hidden;
  max-height: 0;
  transition: max-height 0.2s ease;

  layout-sidebar[collapsed] & {
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
