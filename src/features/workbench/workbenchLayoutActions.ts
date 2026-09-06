import type React from 'react';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import { createDefaultIdealWindowLayout, createDefaultStandardResultsLayout, clampWorkbenchLiveSplitRatio, WORKBENCH_LIVE_SPLIT_MIN_RATIO, WORKBENCH_LIVE_SPLIT_MAX_RATIO, type WorkbenchHeatCapacityTabId } from './workbenchFileState.ts';
import { IDEAL_RESULT_MIN_HEIGHT_RATIO, IDEAL_RESULT_MAX_HEIGHT_RATIO, normalizeStandardResultsLayout, normalizeIdealWindowLayoutState, sanitizeWorkbenchLayoutDefaultState, sanitizeWorkbenchLayoutDefaults, persistWorkbenchLayoutDefaults, isWorkbenchFileLayoutDefault, type WorkbenchLayoutDefaults } from './workbenchLayoutCompatibility.ts';
import { LEFT_SIDEBAR_MIN, LEFT_SIDEBAR_MAX, PARAM_SIDEBAR_MIN, PARAM_SIDEBAR_MAX, HEAT_CAPACITY_MATERIALS_MIN_HEIGHT_RATIO, STANDARD_RESULTS_BOTTOM_INSET, RESIZER_GRAB_SAFE_SPACE } from './workbenchLayoutConstants.ts';
import { workbenchCopies } from './workbenchStudioCopy.ts';
import type { WorkbenchEditSnapshot } from './workbenchEditSnapshot.ts';
import type { WorkbenchMutableRef as Ref, WorkbenchStateSetter as Setter, WorkbenchLogWriter } from './workbenchActionPorts.ts';

type WorkbenchLayoutView = {
  activeFile: WorkbenchFileState; workbenchLayoutDefaults: WorkbenchLayoutDefaults;
  openTopMenu: string | null; leftSidebarWidth: number; parameterSidebarWidth: number;
  isWorkbenchEmpty: boolean; liveWorkspaceSplitRatio: number; consoleCollapsed: boolean; consoleHeightPx: number;
};
export interface WorkbenchLayoutActionPorts {
  getView: () => WorkbenchLayoutView;
  window: Pick<Window, 'requestAnimationFrame' | 'cancelAnimationFrame' | 'addEventListener' | 'removeEventListener' | 'innerHeight'>;
  document: Pick<Document, 'body'>;
  workspaceShellRef: Ref<HTMLElement | null>; workbenchBodyRef: Ref<HTMLElement | null>;
  sidebarResizeGhostRef: Ref<HTMLElement | null>; parameterSidebarResizeGhostRef: Ref<HTMLElement | null>;
  idealResultWindowRegionRef: Ref<HTMLElement | null>; centerWorkspaceRef: Ref<HTMLElement | null>;
  fileTabsRef: Ref<HTMLElement | null>; liveWorkspaceRef: Ref<HTMLElement | null>;
  liveWorkspaceResizeGhostRef: Ref<HTMLElement | null>; shellRef: Ref<HTMLElement | null>;
  consoleResizeGhostRef: Ref<HTMLElement | null>; resizeGhostFrameRef: Ref<number | null>;
  consoleResizeRef: Ref<{ startY: number; startHeight: number; shellHeight: number; footerHeight: number } | null>;
  createEditSnapshot: (label: string, scope: 'presentation') => WorkbenchEditSnapshot;
  pushUndoSnapshot: (snapshot: WorkbenchEditSnapshot) => void;
  captureUndoSnapshot: (label: string, scope: 'presentation') => void;
  updateActiveFile: (update: (file: WorkbenchFileState) => WorkbenchFileState) => void;
  setWorkbenchFiles: (update: (files: WorkbenchFileState[]) => WorkbenchFileState[]) => void;
  setLeftSidebarWidth: Setter<number>; setParameterSidebarWidth: Setter<number>;
  setLiveWorkspaceResizing: Setter<boolean>; setConsoleHeightPx: Setter<number>;
  setWorkbenchLayoutDefaults: Setter<WorkbenchLayoutDefaults>;
  setOpenTopMenu: (menu: null) => void; pushLog: WorkbenchLogWriter;
}
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Owns per-drag closures and listeners; commits through the existing layout/history ports. */
export const createWorkbenchLayoutActions = (ports: WorkbenchLayoutActionPorts) => {
  const { window, document, workspaceShellRef, workbenchBodyRef, sidebarResizeGhostRef,
    parameterSidebarResizeGhostRef, idealResultWindowRegionRef, centerWorkspaceRef, fileTabsRef,
    liveWorkspaceRef, liveWorkspaceResizeGhostRef, shellRef, consoleResizeGhostRef, resizeGhostFrameRef,
    consoleResizeRef, createEditSnapshot, pushUndoSnapshot, captureUndoSnapshot, updateActiveFile,
    setWorkbenchFiles, setLeftSidebarWidth, setParameterSidebarWidth, setLiveWorkspaceResizing,
    setConsoleHeightPx, setWorkbenchLayoutDefaults, setOpenTopMenu, pushLog } = ports;
  const startSidebarResize = (side: 'left' | 'params', event: React.MouseEvent) => {
    const { openTopMenu, leftSidebarWidth, parameterSidebarWidth } = ports.getView();
    if (openTopMenu) return;

    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = side === 'left' ? leftSidebarWidth : parameterSidebarWidth;
    const workspaceShellWidth = workspaceShellRef.current?.getBoundingClientRect().width ?? 0;
    let pendingSidebarWidth = startWidth;
    let didResize = false;

    const updateSidebarGhost = () => {
      if (side === 'left') {
        sidebarResizeGhostRef.current?.style.setProperty('--studio-left-resize-ghost-x', `${pendingSidebarWidth}px`);
        return;
      }
      parameterSidebarResizeGhostRef.current?.style.setProperty(
        '--studio-params-resize-ghost-x',
        `${Math.max(0, workspaceShellWidth - pendingSidebarWidth)}px`,
      );
    };
    updateSidebarGhost();

    const handleMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      pendingSidebarWidth = side === 'left'
        ? clamp(startWidth + delta, LEFT_SIDEBAR_MIN, LEFT_SIDEBAR_MAX)
        : clamp(startWidth - delta, PARAM_SIDEBAR_MIN, PARAM_SIDEBAR_MAX);
      didResize = true;
      scheduleResizeGhostUpdate(updateSidebarGhost);
    };

    const finishResize = (commit: boolean) => {
      cancelResizeGhostFrame();
      document.body.classList.remove('studio-resizing');
      workbenchBodyRef.current?.classList.remove('studio-left-sidebar-resizing');
      workspaceShellRef.current?.classList.remove('studio-params-sidebar-resizing');
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      if (commit && didResize) {
        if (side === 'left') {
          setLeftSidebarWidth(pendingSidebarWidth);
        } else {
          setParameterSidebarWidth(pendingSidebarWidth);
        }
      }
    };

    const handleUp = () => finishResize(true);

    document.body.classList.add('studio-resizing');
    if (side === 'left') {
      workbenchBodyRef.current?.classList.add('studio-left-sidebar-resizing');
    } else {
      workspaceShellRef.current?.classList.add('studio-params-sidebar-resizing');
    }
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const startIdealResultWindowResize = (event: React.MouseEvent) => {
    const { activeFile } = ports.getView();
    if (activeFile.kind !== 'ideal') return;
    event.preventDefault();
    event.stopPropagation();

    const workspaceHeight = idealResultWindowRegionRef.current?.getBoundingClientRect().height
      ?? centerWorkspaceRef.current?.getBoundingClientRect().height
      ?? 0;
    if (workspaceHeight <= 0) return;

    const snapshot = createEditSnapshot('resized ideal result window', 'presentation');
    const startY = event.clientY;
    const startRatio = activeFile.idealWindowLayout.heightRatio;
    let didResize = false;

    const handleMove = (moveEvent: MouseEvent) => {
      const deltaRatio = (startY - moveEvent.clientY) / workspaceHeight;
      const nextRatio = startRatio + deltaRatio;
      const clampedRatio = clamp(nextRatio, IDEAL_RESULT_MIN_HEIGHT_RATIO, IDEAL_RESULT_MAX_HEIGHT_RATIO);
      didResize = true;
      updateActiveFile((file) => {
        if (file.kind !== 'ideal') return file;
        return {
          ...file,
          idealWindowLayout: {
            ...file.idealWindowLayout,
            heightRatio: clampedRatio,
            hasCustomHeight: true,
          },
          updatedAt: Date.now(),
        };
      });
    };

    const handleUp = () => {
      document.body.classList.remove('studio-vertical-resizing');
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      if (didResize) {
        pushUndoSnapshot(snapshot);
      }
    };

    document.body.classList.add('studio-vertical-resizing');
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const getStandardResultsMaxHeightRatio = () => {
    const workspaceRect = centerWorkspaceRef.current?.getBoundingClientRect();
    const fileTabsRect = fileTabsRef.current?.getBoundingClientRect();
    if (!workspaceRect || workspaceRect.height <= 0) return IDEAL_RESULT_MAX_HEIGHT_RATIO;

    const fileTabOverlap = fileTabsRect
      ? Math.max(0, fileTabsRect.bottom - workspaceRect.top)
      : 0;
    const reservedTopSpace = Math.max(RESIZER_GRAB_SAFE_SPACE, fileTabOverlap + RESIZER_GRAB_SAFE_SPACE);
    const availableHeight = workspaceRect.height - STANDARD_RESULTS_BOTTOM_INSET - reservedTopSpace;
    return clamp(
      availableHeight / workspaceRect.height,
      IDEAL_RESULT_MIN_HEIGHT_RATIO,
      IDEAL_RESULT_MAX_HEIGHT_RATIO,
    );
  };

  const getHeatCapacityMaterialsMaxHeightRatio = () => {
    const workspaceRect = centerWorkspaceRef.current?.getBoundingClientRect();
    if (!workspaceRect || workspaceRect.height <= 0) return IDEAL_RESULT_MAX_HEIGHT_RATIO;

    const liveWorkspaceRect = liveWorkspaceRef.current?.getBoundingClientRect();
    if (liveWorkspaceRect && liveWorkspaceRect.height > 0) {
      const liveWorkspaceCoverageHeight = liveWorkspaceRect.height;
      return clamp(
        liveWorkspaceCoverageHeight / workspaceRect.height,
        HEAT_CAPACITY_MATERIALS_MIN_HEIGHT_RATIO,
        IDEAL_RESULT_MAX_HEIGHT_RATIO,
      );
    }

    const fileTabsRect = fileTabsRef.current?.getBoundingClientRect();
    const fileTabOverlap = fileTabsRect
      ? Math.max(0, fileTabsRect.bottom - workspaceRect.top)
      : 0;
    const reservedTopSpace = Math.max(RESIZER_GRAB_SAFE_SPACE, fileTabOverlap + RESIZER_GRAB_SAFE_SPACE);
    const availableHeight = workspaceRect.height - STANDARD_RESULTS_BOTTOM_INSET - reservedTopSpace;
    return clamp(
      availableHeight / workspaceRect.height,
      HEAT_CAPACITY_MATERIALS_MIN_HEIGHT_RATIO,
      IDEAL_RESULT_MAX_HEIGHT_RATIO,
    );
  };

  const startStandardResultsResize = (event: React.MouseEvent) => {
    const { activeFile } = ports.getView();
    if (activeFile.kind !== 'standard') return;
    event.preventDefault();
    event.stopPropagation();

    const workspaceHeight = centerWorkspaceRef.current?.getBoundingClientRect().height ?? 0;
    if (workspaceHeight <= 0) return;

    const snapshot = createEditSnapshot('resized standard Results window', 'presentation');
    const startY = event.clientY;
    const startRatio = normalizeStandardResultsLayout(activeFile.standardResultsLayout).heightRatio;
    const maxHeightRatio = getStandardResultsMaxHeightRatio();
    let didResize = false;

    const handleMove = (moveEvent: MouseEvent) => {
      const deltaRatio = (startY - moveEvent.clientY) / workspaceHeight;
      const nextRatio = startRatio + deltaRatio;
      didResize = true;
      updateActiveFile((file) => {
        if (file.kind !== 'standard') return file;
        return {
          ...file,
          standardResultsLayout: {
            ...normalizeStandardResultsLayout(file.standardResultsLayout),
            heightRatio: clamp(nextRatio, IDEAL_RESULT_MIN_HEIGHT_RATIO, maxHeightRatio),
          },
          updatedAt: Date.now(),
        };
      });
    };

    const handleUp = () => {
      document.body.classList.remove('studio-vertical-resizing');
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      if (didResize) {
        pushUndoSnapshot(snapshot);
      }
    };

    document.body.classList.add('studio-vertical-resizing');
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const startHeatCapacityMaterialsResize = (event: React.MouseEvent) => {
    const { activeFile } = ports.getView();
    if (activeFile.kind !== 'heatCapacity') return;
    event.preventDefault();
    event.stopPropagation();

    const workspaceHeight = centerWorkspaceRef.current?.getBoundingClientRect().height ?? 0;
    if (workspaceHeight <= 0) return;

    const snapshot = createEditSnapshot('resized heat-capacity materials window', 'presentation');
    const startY = event.clientY;
    const maxHeightRatio = getHeatCapacityMaterialsMaxHeightRatio();
    const startRatio = clamp(
      activeFile.heatCapacityTabContainerHeight || 0.5,
      HEAT_CAPACITY_MATERIALS_MIN_HEIGHT_RATIO,
      maxHeightRatio,
    );
    let didResize = false;

    const handleMove = (moveEvent: MouseEvent) => {
      const deltaRatio = (startY - moveEvent.clientY) / workspaceHeight;
      const nextRatio = clamp(
        startRatio + deltaRatio,
        HEAT_CAPACITY_MATERIALS_MIN_HEIGHT_RATIO,
        maxHeightRatio,
      );
      didResize = true;
      updateActiveFile((file) => (
        file.kind === 'heatCapacity'
          ? { ...file, heatCapacityTabContainerHeight: nextRatio, updatedAt: Date.now() }
          : file
      ));
    };

    const handleUp = () => {
      document.body.classList.remove('studio-vertical-resizing');
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      if (didResize) pushUndoSnapshot(snapshot);
    };

    document.body.classList.add('studio-vertical-resizing');
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const cancelResizeGhostFrame = () => {
    if (resizeGhostFrameRef.current === null) return;
    window.cancelAnimationFrame(resizeGhostFrameRef.current);
    resizeGhostFrameRef.current = null;
  };

  const scheduleResizeGhostUpdate = (updateGhost: () => void) => {
    cancelResizeGhostFrame();
    resizeGhostFrameRef.current = window.requestAnimationFrame(() => {
      resizeGhostFrameRef.current = null;
      updateGhost();
    });
  };

  const startLiveWorkspaceResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    const { activeFile, isWorkbenchEmpty, liveWorkspaceSplitRatio } = ports.getView();
    if (isWorkbenchEmpty) return;
    const workspace = liveWorkspaceRef.current ?? event.currentTarget.parentElement;
    if (!workspace) return;

    event.preventDefault();
    event.stopPropagation();

    const initialWorkspaceRect = workspace.getBoundingClientRect();
    const resizerWidth = event.currentTarget.getBoundingClientRect().width || 8;
    if (initialWorkspaceRect.width <= resizerWidth) return;

    const getNextRatio = (clientX: number) => {
      const workspaceRect = workspace.getBoundingClientRect();
      const availableWidth = workspaceRect.width - resizerWidth;
      if (availableWidth <= 0) return clampWorkbenchLiveSplitRatio(activeFile.liveWorkspaceSplitRatio);
      return clamp(
        (clientX - workspaceRect.left - resizerWidth / 2) / availableWidth,
        WORKBENCH_LIVE_SPLIT_MIN_RATIO,
        WORKBENCH_LIVE_SPLIT_MAX_RATIO,
      );
    };

    let pendingLiveWorkspaceSplitRatio = liveWorkspaceSplitRatio;
    let didResize = false;
    liveWorkspaceResizeGhostRef.current?.style.setProperty(
      '--studio-live-resize-ghost-x',
      `${(pendingLiveWorkspaceSplitRatio * 100).toFixed(3)}%`,
    );

    const handleMove = (moveEvent: PointerEvent) => {
      pendingLiveWorkspaceSplitRatio = getNextRatio(moveEvent.clientX);
      didResize = true;
      scheduleResizeGhostUpdate(() => {
        liveWorkspaceResizeGhostRef.current?.style.setProperty(
          '--studio-live-resize-ghost-x',
          `${(pendingLiveWorkspaceSplitRatio * 100).toFixed(3)}%`,
        );
      });
    };

    const finishResize = (commit: boolean) => {
      cancelResizeGhostFrame();
      setLiveWorkspaceResizing(false);
      document.body.classList.remove('studio-horizontal-resizing');
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleCancel);
      if (commit && didResize) {
        updateActiveFile((file) => ({
          ...file,
          liveWorkspaceSplitRatio: pendingLiveWorkspaceSplitRatio,
          updatedAt: Date.now(),
        }));
      }
    };
    const handleUp = () => finishResize(true);
    const handleCancel = () => finishResize(false);

    setLiveWorkspaceResizing(true);
    document.body.classList.add('studio-horizontal-resizing');
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleCancel);
  };

  const startConsoleResize = (event: React.PointerEvent<HTMLDivElement>) => {
    const { consoleCollapsed, consoleHeightPx } = ports.getView();
    if (consoleCollapsed) return;
    event.preventDefault();
    event.stopPropagation();
    const shellRect = shellRef.current?.getBoundingClientRect();
    const consoleRect = event.currentTarget.parentElement?.getBoundingClientRect();
    const shellHeight = shellRect?.height ?? window.innerHeight;
    const footerHeight = shellRect && consoleRect ? Math.max(0, shellRect.bottom - consoleRect.bottom) : 24;
    consoleResizeRef.current = {
      startY: event.clientY,
      startHeight: consoleHeightPx,
      shellHeight,
      footerHeight,
    };
    let pendingConsoleHeightPx = consoleHeightPx;
    let didResize = false;
    shellRef.current?.classList.add('studio-console-resizing');
    consoleResizeGhostRef.current?.style.setProperty(
      '--studio-console-resize-ghost-y',
      `${shellHeight - footerHeight - pendingConsoleHeightPx}px`,
    );

    const handleMove = (moveEvent: PointerEvent) => {
      const resizeState = consoleResizeRef.current;
      if (!resizeState) return;
      const maxHeight = Math.max(180, Math.min(420, Math.round(window.innerHeight * 0.48)));
      pendingConsoleHeightPx = clamp(resizeState.startHeight + resizeState.startY - moveEvent.clientY, 96, maxHeight);
      didResize = true;
      scheduleResizeGhostUpdate(() => {
        consoleResizeGhostRef.current?.style.setProperty(
          '--studio-console-resize-ghost-y',
          `${resizeState.shellHeight - resizeState.footerHeight - pendingConsoleHeightPx}px`,
        );
      });
    };

    const finishResize = (commit: boolean) => {
      cancelResizeGhostFrame();
      consoleResizeRef.current = null;
      shellRef.current?.classList.remove('studio-console-resizing');
      document.body.classList.remove('studio-vertical-resizing');
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleCancel);
      if (commit && didResize) {
        setConsoleHeightPx(pendingConsoleHeightPx);
      }
    };
    const handleUp = () => finishResize(true);
    const handleCancel = () => finishResize(false);

    document.body.classList.add('studio-vertical-resizing');
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleCancel);
  };

  const saveCurrentWorkbenchLayoutAsDefault = () => {
    const { activeFile, workbenchLayoutDefaults, isWorkbenchEmpty } = ports.getView();
    if (isWorkbenchEmpty) {
      pushLog((language) => workbenchCopies[language].logs.layoutSaveNeedsFile, 'warning');
      return;
    }

    const nextFileDefaults = sanitizeWorkbenchLayoutDefaultState({
      resultsHeightRatio: activeFile.kind === 'ideal'
        ? normalizeIdealWindowLayoutState(activeFile.idealWindowLayout, workbenchLayoutDefaults.ideal).heightRatio
        : activeFile.kind === 'standard'
          ? normalizeStandardResultsLayout(activeFile.standardResultsLayout, workbenchLayoutDefaults.standard).heightRatio
          : activeFile.kind === 'heatCapacity'
            ? workbenchLayoutDefaults.heatCapacity.resultsHeightRatio
            : workbenchLayoutDefaults.heatCapacityPistonOscillation.resultsHeightRatio,
      liveWorkspaceSplitRatio: activeFile.liveWorkspaceSplitRatio,
    });
    const nextDefaults = sanitizeWorkbenchLayoutDefaults({
      ...workbenchLayoutDefaults,
      [activeFile.kind]: nextFileDefaults,
    });

    setWorkbenchLayoutDefaults(nextDefaults);
    persistWorkbenchLayoutDefaults(nextDefaults);
    setOpenTopMenu(null);
    pushLog(
      (language) => workbenchCopies[language].logs.layoutDefaultSaved(activeFile.name),
      'success',
    );
  };

  const resetLayout = () => {
    const { activeFile, workbenchLayoutDefaults } = ports.getView();
    if (isWorkbenchFileLayoutDefault(activeFile, workbenchLayoutDefaults)) {
      setOpenTopMenu(null);
      pushLog((language) => workbenchCopies[language].logs.layoutAlreadyDefault(activeFile.name));
      return;
    }

    captureUndoSnapshot('reset layout', 'presentation');
    setWorkbenchFiles((current) =>
      current.map((file) =>
        file.id === activeFile.id
          ? {
              ...file,
              visiblePanels: ['preview', 'realtime'],
              ...(file.kind === 'heatCapacity'
                ? {
                    openHeatCapacityTabs: [] as WorkbenchHeatCapacityTabId[],
                    activeHeatCapacityTabId: null,
                    heatCapacityMaterialsExpanded: true,
                    heatCapacityTabContainerHeight: 0.5,
                    liveWorkspaceSplitRatio: workbenchLayoutDefaults.heatCapacity.liveWorkspaceSplitRatio,
                  }
                : file.kind === 'ideal'
                ? {
                    idealWindowLayout: createDefaultIdealWindowLayout({ heightRatio: workbenchLayoutDefaults.ideal.resultsHeightRatio }),
                    liveWorkspaceSplitRatio: workbenchLayoutDefaults.ideal.liveWorkspaceSplitRatio,
                  }
                : file.kind === 'heatCapacityPistonOscillation'
                ? {
                    pistonOscillationMaterialsExpanded: true,
                    liveWorkspaceSplitRatio:
                      workbenchLayoutDefaults.heatCapacityPistonOscillation.liveWorkspaceSplitRatio,
                  }
                : {
                    standardResultsLayout: createDefaultStandardResultsLayout({ heightRatio: workbenchLayoutDefaults.standard.resultsHeightRatio }),
                    liveWorkspaceSplitRatio: workbenchLayoutDefaults.standard.liveWorkspaceSplitRatio,
                  }),
            }
          : file,
      ),
    );
    setOpenTopMenu(null);
    pushLog((language) => workbenchCopies[language].logs.layoutReset(activeFile.name), 'warning');
  };

  return { startSidebarResize, startIdealResultWindowResize, getStandardResultsMaxHeightRatio, getHeatCapacityMaterialsMaxHeightRatio, startStandardResultsResize, startHeatCapacityMaterialsResize, cancelResizeGhostFrame, scheduleResizeGhostUpdate, startLiveWorkspaceResize, startConsoleResize, saveCurrentWorkbenchLayoutAsDefault, resetLayout };
};
