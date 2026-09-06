import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import type { WorkbenchHeatCapacityState } from './workbenchHeatCapacityStateTypes.ts';
import type { HeatCapacityModeUiCheckpoint } from '../heatCapacity/heatCapacityModeUiCheckpoint.ts';
import {
  resolveWorkbenchActiveModeCheckpointOverride,
  type WorkbenchActiveModeCheckpointOverride,
  type WorkbenchWorkspacePersistenceSnapshot,
} from './workbenchIndexedDbPersistence.ts';
import {
  selectPendingWorkbenchHeatCapacityRefreshSession,
  type WorkbenchHeatCapacityRefreshSession,
} from './workbenchHeatCapacityRefreshSession.ts';
import type { WorkbenchPersistenceReason, WorkbenchPersistenceScheduler } from './workbenchPersistenceScheduler.ts';

type WorkspaceLocation = Pick<WorkbenchWorkspacePersistenceSnapshot,
  'files' | 'closedFiles' | 'activeFileId' | 'selectedPanel'>;

export interface WorkbenchWorkspaceSnapshotPorts {
  readTutorialWorkspace: () => WorkspaceLocation | null;
  readFiles: () => WorkbenchFileState[];
  readClosedFiles: () => WorkbenchFileState[];
  readActiveFileId: () => string;
  readSelectedPanel: () => WorkspaceLocation['selectedPanel'];
  readCapturedAtMs: () => number;
  readRefreshRestorePending: () => boolean;
  initialRefreshSession: WorkbenchHeatCapacityRefreshSession | null;
  buildRefreshSession: (capturedAtMs: number) => WorkbenchHeatCapacityRefreshSession | null;
  buildModeCheckpoint: (file: WorkbenchHeatCapacityState, capturedAtMs: number) => HeatCapacityModeUiCheckpoint | null;
}

// Read through the existing owners at capture time; construction does not capture or save.
export const createWorkbenchWorkspaceSnapshotCapture = (ports: WorkbenchWorkspaceSnapshotPorts) => (
  activeModeCheckpointOverride?: WorkbenchActiveModeCheckpointOverride,
): WorkbenchWorkspacePersistenceSnapshot => {
  const tutorialOrdinaryWorkspace = ports.readTutorialWorkspace();
  if (tutorialOrdinaryWorkspace) {
    return {
      files: tutorialOrdinaryWorkspace.files,
      closedFiles: tutorialOrdinaryWorkspace.closedFiles,
      activeFileId: tutorialOrdinaryWorkspace.activeFileId,
      selectedPanel: tutorialOrdinaryWorkspace.selectedPanel,
      refreshSession: null,
      activeModeCheckpoint: null,
      preserveActiveHeatCapacityModeSession: false,
    };
  }
  const snapshotCapturedAtMs = ports.readCapturedAtMs();
  const activePersistenceFile = ports.readFiles().find((file) => file.id === ports.readActiveFileId());
  const pendingRefreshSession = selectPendingWorkbenchHeatCapacityRefreshSession({
    restorePending: ports.readRefreshRestorePending(),
    initialRefreshSession: ports.initialRefreshSession,
    activeFileId: activePersistenceFile?.kind === 'heatCapacity' ? activePersistenceFile.id : null,
    activeMode: activePersistenceFile?.kind === 'heatCapacity' ? activePersistenceFile.heatCapacityMode : null,
  });
  const checkpointOverride = activePersistenceFile?.kind === 'heatCapacity'
    && activePersistenceFile.heatCapacityMode !== null
    ? resolveWorkbenchActiveModeCheckpointOverride(
        activePersistenceFile.id, activePersistenceFile.heatCapacityMode, activeModeCheckpointOverride,
      )
    : { provided: false, checkpoint: null };
  const refreshSession = activePersistenceFile?.kind === 'heatCapacity'
    && activePersistenceFile.heatCapacityMode !== null
    ? pendingRefreshSession ?? (checkpointOverride.provided ? null : ports.buildRefreshSession(snapshotCapturedAtMs))
    : null;
  const activeModeCheckpoint = activePersistenceFile?.kind === 'heatCapacity'
    && activePersistenceFile.heatCapacityMode !== null
    ? pendingRefreshSession
      ? null
      : checkpointOverride.provided
        ? checkpointOverride.checkpoint
        : ports.buildModeCheckpoint(activePersistenceFile, snapshotCapturedAtMs)
    : null;
  return {
    files: ports.readFiles(),
    closedFiles: ports.readClosedFiles(),
    activeFileId: ports.readActiveFileId(),
    selectedPanel: ports.readSelectedPanel(),
    refreshSession,
    activeModeCheckpoint,
    preserveActiveHeatCapacityModeSession: pendingRefreshSession !== null,
  };
};

export const createWorkbenchWorkspacePersistenceRequests = (ports: {
  capture: ReturnType<typeof createWorkbenchWorkspaceSnapshotCapture>;
  readScheduler: () => WorkbenchPersistenceScheduler<WorkbenchWorkspacePersistenceSnapshot> | null;
}) => ({
  schedule: (reason: WorkbenchPersistenceReason = 'semantic') => (
    ports.readScheduler()?.schedule(ports.capture, reason) ?? false
  ),
  flush: async (activeModeCheckpointOverride?: WorkbenchActiveModeCheckpointOverride) => {
    const snapshot = ports.capture(activeModeCheckpointOverride);
    const scheduler = ports.readScheduler();
    if (!scheduler) return false;
    scheduler.schedule(() => snapshot, 'lifecycle');
    return scheduler.flush();
  },
});
