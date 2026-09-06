import { useRef } from 'react';
import type { WorkbenchPersistenceReason } from './workbenchPersistenceScheduler.ts';
import type { WorkbenchActiveModeCheckpointOverride } from './workbenchIndexedDbPersistence.ts';
import type { WorkbenchHeatCapacityRefreshSession } from './workbenchHeatCapacityRefreshSession.ts';
export const useWorkbenchWorkspacePersistenceResources = (initialHeatCapacityRefreshSession: WorkbenchHeatCapacityRefreshSession | null) => {

  const scheduleWorkspacePersistenceRef = useRef<(
    reason?: WorkbenchPersistenceReason,
  ) => boolean>(() => false);
  const flushWorkspacePersistenceRef = useRef<(
    activeModeCheckpointOverride?: WorkbenchActiveModeCheckpointOverride,
  ) => Promise<boolean>>(async () => false);
  const persistWorkspaceLifecycleCheckpointRef = useRef<(forceFresh?: boolean) => Promise<boolean>>(async () => false);
  const heatCapacityRefreshPersistRef = useRef<() => void>(() => undefined);
  const heatCapacitySemanticCheckpointDebounceTimerRef = useRef<number | null>(null);
  const heatCapacitySemanticCheckpointMaxWaitTimerRef = useRef<number | null>(null);
  const scheduleHeatCapacitySemanticSceneCheckpointRef = useRef<() => void>(() => undefined);
  const heatCapacityLifecycleFlushInProgressRef = useRef(false);
  const heatCapacityLifecycleFlushPromiseRef = useRef<Promise<boolean> | null>(null);
  const heatCapacityLifecycleLastCompletedFlushAtMsRef = useRef<number | null>(null);
  const skipInitialConsoleScrollRef = useRef(initialHeatCapacityRefreshSession !== null);
  return { scheduleWorkspacePersistenceRef, flushWorkspacePersistenceRef, persistWorkspaceLifecycleCheckpointRef, heatCapacityRefreshPersistRef, heatCapacitySemanticCheckpointDebounceTimerRef, heatCapacitySemanticCheckpointMaxWaitTimerRef, scheduleHeatCapacitySemanticSceneCheckpointRef, heatCapacityLifecycleFlushInProgressRef, heatCapacityLifecycleFlushPromiseRef, heatCapacityLifecycleLastCompletedFlushAtMsRef, skipInitialConsoleScrollRef };
};
