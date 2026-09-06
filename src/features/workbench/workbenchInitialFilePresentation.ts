import { normalizeHeatCapacityFileName } from './workbenchHeatCapacityFileFactory.ts';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import type { WorkbenchHeatCapacityState } from './workbenchHeatCapacityStateTypes.ts';
import { WORKBENCH_HEAT_CAPACITY_SPLIT_DEFAULT_RATIO, clampWorkbenchLiveSplitRatio, type WorkbenchPanelKey } from './workbenchFileState.ts';
import { normalizeIdealWindowLayoutState, normalizeStandardResultsLayout, type WorkbenchLayoutDefaults } from './workbenchLayoutCompatibility.ts';
import { HEAT_CAPACITY_TAB_IDS, heatCapacityTabIdToPanelKey } from './workbenchHeatCapacityTabRegistry.ts';
import { type WorkbenchHeatCapacityRefreshSession } from './workbenchHeatCapacityRefreshSession.ts';
import { getHeatCapacityRefreshRunState } from './workbenchHeatCapacityUiCheckpoint.ts';

export const normalizeWorkbenchInitialFiles = (
  initialFiles: WorkbenchFileState[],
  defaults: WorkbenchLayoutDefaults,
  initialHeatCapacityRefreshSession: WorkbenchHeatCapacityRefreshSession | null,
): WorkbenchFileState[] => {
  const initialHeatCapacityRefreshLayout = initialHeatCapacityRefreshSession?.ui.layout ?? {};
  return initialFiles.map((file) => {
    if (file.kind === 'ideal') {
      return {
        ...file,
        liveWorkspaceSplitRatio: clampWorkbenchLiveSplitRatio(file.liveWorkspaceSplitRatio),
        idealWindowLayout: normalizeIdealWindowLayoutState(file.idealWindowLayout, defaults.ideal),
      };
    }
    if (file.kind === 'heatCapacity') {
      const openHeatCapacityTabs = Array.from(new Set(
        file.openHeatCapacityTabs.filter((tab) => HEAT_CAPACITY_TAB_IDS.includes(tab)),
      ));
      const activeHeatCapacityTabId = file.activeHeatCapacityTabId && openHeatCapacityTabs.includes(file.activeHeatCapacityTabId)
        ? file.activeHeatCapacityTabId
        : openHeatCapacityTabs[0] ?? null;
      const normalizedFile: WorkbenchHeatCapacityState = {
        ...file,
        name: normalizeHeatCapacityFileName(file.name),
        visiblePanels: ['preview', 'realtime', ...openHeatCapacityTabs.map(heatCapacityTabIdToPanelKey)] as WorkbenchPanelKey[],
        openHeatCapacityTabs,
        activeHeatCapacityTabId,
        heatCapacityMaterialsExpanded: file.heatCapacityMaterialsExpanded !== false,
        heatCapacityTabContainerHeight: file.heatCapacityTabContainerHeight || 0.5,
        liveWorkspaceSplitRatio: clampWorkbenchLiveSplitRatio(file.liveWorkspaceSplitRatio ?? defaults.heatCapacity.liveWorkspaceSplitRatio),
      };
      if (file.id !== initialHeatCapacityRefreshSession?.activeHeatCapacityFileId) return normalizedFile;
      const restoredRunState = getHeatCapacityRefreshRunState(
        initialHeatCapacityRefreshLayout.runState,
        initialHeatCapacityRefreshSession.mode === 'demo'
          ? initialHeatCapacityRefreshSession.demo.phase === 'running'
            ? 'running'
            : initialHeatCapacityRefreshSession.demo.phase === 'paused'
              ? 'paused'
              : normalizedFile.runState
          : normalizedFile.runState,
      );
      return {
        ...normalizedFile,
        runState: restoredRunState,
      };
    }
    if (file.kind === 'heatCapacityPistonOscillation') {
      const storedSplitRatio = clampWorkbenchLiveSplitRatio(file.liveWorkspaceSplitRatio);
      return {
        ...file,
        runState: 'idle' as const,
        liveWorkspaceSplitRatio:
          storedSplitRatio === WORKBENCH_HEAT_CAPACITY_SPLIT_DEFAULT_RATIO
            ? defaults.heatCapacityPistonOscillation.liveWorkspaceSplitRatio
            : storedSplitRatio,
      };
    }
    return {
      ...file,
      liveWorkspaceSplitRatio: clampWorkbenchLiveSplitRatio(file.liveWorkspaceSplitRatio),
      standardResultsLayout: normalizeStandardResultsLayout(file.standardResultsLayout, defaults.standard),
    };
  });
};
