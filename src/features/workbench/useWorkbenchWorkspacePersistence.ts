import { createWorkbenchWorkspaceSnapshotCapture, createWorkbenchWorkspacePersistenceRequests, type WorkbenchWorkspaceSnapshotPorts } from './workbenchWorkspacePersistenceActions.ts';
import { createWorkbenchSemanticCheckpointActions, type WorkbenchSemanticCheckpointPorts } from './workbenchSemanticCheckpointActions.ts';
import { createWorkbenchLifecycleCheckpointActions, type WorkbenchLifecycleCheckpointPorts } from './workbenchLifecycleCheckpointActions.ts';
import type { useWorkbenchWorkspacePersistenceResources } from './useWorkbenchWorkspacePersistenceResources.ts';
type Resources = ReturnType<typeof useWorkbenchWorkspacePersistenceResources>;
export const useWorkbenchWorkspacePersistence = (ports: {
 snapshot: WorkbenchWorkspaceSnapshotPorts;
 readScheduler: Parameters<typeof createWorkbenchWorkspacePersistenceRequests>[0]['readScheduler'];
 semantic: WorkbenchSemanticCheckpointPorts;
 lifecycle: Omit<WorkbenchLifecycleCheckpointPorts, 'clearHeatCapacitySemanticCheckpointTimers'>;
 resources: Pick<Resources, 'scheduleWorkspacePersistenceRef' | 'flushWorkspacePersistenceRef' | 'heatCapacityRefreshPersistRef' | 'scheduleHeatCapacitySemanticSceneCheckpointRef' | 'persistWorkspaceLifecycleCheckpointRef'>;
}) => {
 const { scheduleWorkspacePersistenceRef, flushWorkspacePersistenceRef, heatCapacityRefreshPersistRef, scheduleHeatCapacitySemanticSceneCheckpointRef, persistWorkspaceLifecycleCheckpointRef } = ports.resources;
 const { heatCapacityRefreshRestorePendingRef, window } = ports.semantic;
 const persistCurrentHeatCapacityRefreshSession = () => {
    if (heatCapacityRefreshRestorePendingRef.current) return;
    scheduleWorkspacePersistenceRef.current();
  };
 heatCapacityRefreshPersistRef.current = persistCurrentHeatCapacityRefreshSession;
 const createWorkspacePersistenceSnapshot = createWorkbenchWorkspaceSnapshotCapture(ports.snapshot);
 const workspacePersistenceRequests = createWorkbenchWorkspacePersistenceRequests({ capture: createWorkspacePersistenceSnapshot, readScheduler: ports.readScheduler });
 scheduleWorkspacePersistenceRef.current = workspacePersistenceRequests.schedule;
 flushWorkspacePersistenceRef.current = workspacePersistenceRequests.flush;
 const semantic = createWorkbenchSemanticCheckpointActions(ports.semantic);
 scheduleHeatCapacitySemanticSceneCheckpointRef.current = semantic.scheduleHeatCapacitySemanticSceneCheckpoint;
 const lifecycle = createWorkbenchLifecycleCheckpointActions({ ...ports.lifecycle, clearHeatCapacitySemanticCheckpointTimers: semantic.clearHeatCapacitySemanticCheckpointTimers });
 persistWorkspaceLifecycleCheckpointRef.current = lifecycle.persistWorkspaceLifecycleCheckpoint;
 const flushWorkspaceAfterRunStateCommit = () => {
    window.setTimeout(() => {
      void persistWorkspaceLifecycleCheckpointRef.current();
    }, 0);
  };
 return { clearHeatCapacitySemanticCheckpointTimers: semantic.clearHeatCapacitySemanticCheckpointTimers, flushWorkspaceAfterRunStateCommit };
};
