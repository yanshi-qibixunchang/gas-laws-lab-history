import type { WorkbenchMutableRef as Ref } from './workbenchActionPorts.ts';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import type { HeatCapacitySceneCheckpointProvider } from '../heatCapacity/HeatCapacityInstrumentScene.tsx';
import type { useWorkbenchWorkspacePersistenceResources } from './useWorkbenchWorkspacePersistenceResources.ts';
type Resources = ReturnType<typeof useWorkbenchWorkspacePersistenceResources>;
import { HEAT_CAPACITY_SEMANTIC_CHECKPOINT_DEBOUNCE_MS, HEAT_CAPACITY_SEMANTIC_CHECKPOINT_MAX_WAIT_MS } from './workbenchPersistenceTiming.ts';
export interface WorkbenchSemanticCheckpointPorts extends Pick<Resources, 'heatCapacitySemanticCheckpointDebounceTimerRef' | 'heatCapacitySemanticCheckpointMaxWaitTimerRef'> {
 window: Pick<Window, 'setTimeout' | 'clearTimeout'>; desktopExitQuiescedRef: Ref<boolean>; heatCapacityRefreshRestorePendingRef: Ref<boolean>; heatCapacityModeTransitionStateRef: Ref<{ phase: string }>; heatCapacityRuntimeFailureFileIdRef: Ref<string | null>; filesRef: Ref<WorkbenchFileState[]>; activeFileIdRef: Ref<string>; heatCapacitySceneCheckpointProviderRef: Ref<{ fileId: string; provider: HeatCapacitySceneCheckpointProvider } | null>;
}
export const createWorkbenchSemanticCheckpointActions = (ports: WorkbenchSemanticCheckpointPorts) => {
 const { window, heatCapacitySemanticCheckpointDebounceTimerRef, heatCapacitySemanticCheckpointMaxWaitTimerRef, desktopExitQuiescedRef, heatCapacityRefreshRestorePendingRef, heatCapacityModeTransitionStateRef, heatCapacityRuntimeFailureFileIdRef, filesRef, activeFileIdRef, heatCapacitySceneCheckpointProviderRef } = ports;
 const clearHeatCapacitySemanticCheckpointTimers = () => {
    if (heatCapacitySemanticCheckpointDebounceTimerRef.current !== null) {
      window.clearTimeout(heatCapacitySemanticCheckpointDebounceTimerRef.current);
      heatCapacitySemanticCheckpointDebounceTimerRef.current = null;
    }
    if (heatCapacitySemanticCheckpointMaxWaitTimerRef.current !== null) {
      window.clearTimeout(heatCapacitySemanticCheckpointMaxWaitTimerRef.current);
      heatCapacitySemanticCheckpointMaxWaitTimerRef.current = null;
    }
  };
  const captureActiveHeatCapacitySemanticSceneCheckpoint = () => {
    clearHeatCapacitySemanticCheckpointTimers();
    if (
      desktopExitQuiescedRef.current ||
      heatCapacityRefreshRestorePendingRef.current ||
      heatCapacityModeTransitionStateRef.current.phase !== 'idle' ||
      heatCapacityRuntimeFailureFileIdRef.current !== null
    ) return false;
    const activeSceneFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    const registration = heatCapacitySceneCheckpointProviderRef.current;
    if (
      activeSceneFile?.kind !== 'heatCapacity' ||
      registration?.fileId !== activeSceneFile.id
    ) return false;
    return registration.provider() !== null;
  };
  const scheduleHeatCapacitySemanticSceneCheckpoint = () => {
    if (heatCapacitySemanticCheckpointDebounceTimerRef.current !== null) {
      window.clearTimeout(heatCapacitySemanticCheckpointDebounceTimerRef.current);
    }
    heatCapacitySemanticCheckpointDebounceTimerRef.current = window.setTimeout(
      captureActiveHeatCapacitySemanticSceneCheckpoint,
      HEAT_CAPACITY_SEMANTIC_CHECKPOINT_DEBOUNCE_MS,
    );
    if (heatCapacitySemanticCheckpointMaxWaitTimerRef.current === null) {
      heatCapacitySemanticCheckpointMaxWaitTimerRef.current = window.setTimeout(
        captureActiveHeatCapacitySemanticSceneCheckpoint,
        HEAT_CAPACITY_SEMANTIC_CHECKPOINT_MAX_WAIT_MS,
      );
    }
  };
 return { clearHeatCapacitySemanticCheckpointTimers, captureActiveHeatCapacitySemanticSceneCheckpoint, scheduleHeatCapacitySemanticSceneCheckpoint };
};
