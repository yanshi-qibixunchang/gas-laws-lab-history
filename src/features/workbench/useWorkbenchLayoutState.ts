import { useRef, useState } from 'react';
import type { WorkbenchHeatCapacityRefreshJsonObject } from './workbenchHeatCapacityRefreshSession.ts';
import { getHeatCapacityRefreshString, getHeatCapacityRefreshNumber } from './workbenchHeatCapacityUiCheckpoint.ts';
import { loadWorkbenchLayoutDefaults, type WorkbenchLayoutDefaults } from './workbenchLayoutCompatibility.ts';
import type { WorkbenchTopMenuId } from './WorkbenchTopCommands.tsx';
import { loadWorkbenchSidebarRefreshState, type WorkbenchSidebarRefreshState } from './workbenchSidebarRefreshState.ts';
import { LEFT_SIDEBAR_MIN, LEFT_SIDEBAR_MAX, PARAM_SIDEBAR_MIN, PARAM_SIDEBAR_MAX } from './workbenchLayoutConstants.ts';
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const useWorkbenchLayoutState = (ports: { initialHeatCapacityRefreshLayout: WorkbenchHeatCapacityRefreshJsonObject; initialHeatCapacityRefreshWindows: WorkbenchHeatCapacityRefreshJsonObject; initialWorkbenchSidebarRefreshState?: WorkbenchSidebarRefreshState; }) => {
  const { initialHeatCapacityRefreshLayout, initialHeatCapacityRefreshWindows } = ports;
  const [initialWorkbenchSidebarRefreshState] = useState(() => ports.initialWorkbenchSidebarRefreshState ?? loadWorkbenchSidebarRefreshState());
  const [workbenchLayoutDefaults, setWorkbenchLayoutDefaults] = useState<WorkbenchLayoutDefaults>(() => loadWorkbenchLayoutDefaults());
  const [openTopMenu, setOpenTopMenu] = useState<WorkbenchTopMenuId>(() => {
    const restored = getHeatCapacityRefreshString(initialHeatCapacityRefreshWindows, 'openTopMenu');
    return restored === 'new' || restored === 'edit' || restored === 'window' || restored === 'settings' || restored === 'help'
      ? restored
      : null;
  });
  const [topMenuLeft, setTopMenuLeft] = useState(() => (
    getHeatCapacityRefreshNumber(initialHeatCapacityRefreshWindows, 'topMenuLeft', 10)
  ));
  const [leftCollapsed, setLeftCollapsed] = useState(() => (
    typeof initialHeatCapacityRefreshLayout.leftCollapsed === 'boolean'
      ? initialHeatCapacityRefreshLayout.leftCollapsed
      : initialWorkbenchSidebarRefreshState.leftCollapsed
  ));
  const [parametersCollapsed, setParametersCollapsed] = useState(() => (
    typeof initialHeatCapacityRefreshLayout.parametersCollapsed === 'boolean'
      ? initialHeatCapacityRefreshLayout.parametersCollapsed
      : initialWorkbenchSidebarRefreshState.parametersCollapsed
  ));
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(() => clamp(
    getHeatCapacityRefreshNumber(initialHeatCapacityRefreshLayout, 'leftSidebarWidth', 286),
    LEFT_SIDEBAR_MIN,
    LEFT_SIDEBAR_MAX,
  ));
  const [parameterSidebarWidth, setParameterSidebarWidth] = useState(() => clamp(
    getHeatCapacityRefreshNumber(initialHeatCapacityRefreshLayout, 'parameterSidebarWidth', 300),
    PARAM_SIDEBAR_MIN,
    PARAM_SIDEBAR_MAX,
  ));
  const [isCanvasFocused, setIsCanvasFocused] = useState(false);
  const [liveWorkspaceResizing, setLiveWorkspaceResizing] = useState(false);
  const topCommandsRef = useRef<HTMLElement | null>(null);
  const topMenuRef = useRef<HTMLDivElement | null>(null);
  const workbenchBodyRef = useRef<HTMLElement | null>(null);
  const workspaceShellRef = useRef<HTMLDivElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const liveWorkspaceRef = useRef<HTMLDivElement | null>(null);
  const sidebarResizeGhostRef = useRef<HTMLDivElement | null>(null);
  const parameterSidebarResizeGhostRef = useRef<HTMLDivElement | null>(null);
  const liveWorkspaceResizeGhostRef = useRef<HTMLDivElement | null>(null);
  const consoleResizeGhostRef = useRef<HTMLDivElement | null>(null);
  const resizeGhostFrameRef = useRef<number | null>(null);
  const consoleResizeRef = useRef<{ startY: number; startHeight: number; shellHeight: number; footerHeight: number } | null>(null);
  const centerWorkspaceRef = useRef<HTMLDivElement | null>(null);
  const fileTabsRef = useRef<HTMLDivElement | null>(null);
  const idealResultWindowRegionRef = useRef<HTMLDivElement | null>(null);
  const toggleTopCommandMenu = (menu: Exclude<WorkbenchTopMenuId, null>, left: number) => {
    setTopMenuLeft(left);
    setOpenTopMenu((current) => (current === menu ? null : menu));
  };
  return { workbenchLayoutDefaults, setWorkbenchLayoutDefaults, openTopMenu, setOpenTopMenu, topMenuLeft, setTopMenuLeft, leftCollapsed, setLeftCollapsed, parametersCollapsed, setParametersCollapsed, leftSidebarWidth, setLeftSidebarWidth, parameterSidebarWidth, setParameterSidebarWidth, isCanvasFocused, setIsCanvasFocused, liveWorkspaceResizing, setLiveWorkspaceResizing, topCommandsRef, topMenuRef, workbenchBodyRef, workspaceShellRef, shellRef, liveWorkspaceRef, sidebarResizeGhostRef, parameterSidebarResizeGhostRef, liveWorkspaceResizeGhostRef, consoleResizeGhostRef, resizeGhostFrameRef, consoleResizeRef, centerWorkspaceRef, fileTabsRef, idealResultWindowRegionRef, toggleTopCommandMenu };
};
