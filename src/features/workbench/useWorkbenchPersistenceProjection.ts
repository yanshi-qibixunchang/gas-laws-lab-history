import { useEffect } from 'react';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import type { WorkbenchPanelKey } from './workbenchFileState.ts';
import type { HeatCapacityMode } from './workbenchHeatCapacityStateTypes.ts';
import type { WorkbenchPersistenceReason } from './workbenchPersistenceScheduler.ts';

type Ref<T> = { current: T };
export interface WorkbenchPersistenceProjectionPorts {
  activeFileId: string;
  files: WorkbenchFileState[];
  closedFiles: WorkbenchFileState[];
  selectedPanel: WorkbenchPanelKey;
  closedFilesRef: Ref<WorkbenchFileState[]>;
  selectedPanelRef: Ref<WorkbenchPanelKey>;
  scheduleWorkspacePersistenceRef: Ref<(reason?: WorkbenchPersistenceReason) => boolean>;
  scheduleHeatCapacitySemanticSceneCheckpointRef: Ref<() => void>;
  workspacePersistenceLocationRef: Ref<{ fileId: string; mode: HeatCapacityMode | null }>;
  flushWorkspacePersistenceRef: Ref<() => Promise<boolean>>;
}

/** Called at the original effect position, after scheduler setup and active-file reference sync. */
export const useWorkbenchPersistenceProjection = ({ activeFileId, files, closedFiles, selectedPanel, closedFilesRef, selectedPanelRef, scheduleWorkspacePersistenceRef, scheduleHeatCapacitySemanticSceneCheckpointRef, workspacePersistenceLocationRef, flushWorkspacePersistenceRef }: WorkbenchPersistenceProjectionPorts) => {
  useEffect(() => {
    closedFilesRef.current = closedFiles;
    selectedPanelRef.current = selectedPanel;
    scheduleWorkspacePersistenceRef.current('semantic');
  }, [activeFileId, closedFiles, selectedPanel]);

  useEffect(() => {
    const activePersistenceFile = files.find((file) => file.id === activeFileId);
    const runtimeCheckpointAccepted =
      scheduleWorkspacePersistenceRef.current('runtime-checkpoint');
    if (
      runtimeCheckpointAccepted &&
      activePersistenceFile?.kind === 'heatCapacity'
    ) {
      scheduleHeatCapacitySemanticSceneCheckpointRef.current();
    }
    const nextLocation = {
      fileId: activeFileId,
      mode: activePersistenceFile?.kind === 'heatCapacity'
        ? activePersistenceFile.heatCapacityMode
        : null,
    };
    const previousLocation = workspacePersistenceLocationRef.current;
    workspacePersistenceLocationRef.current = nextLocation;
    if (
      previousLocation.fileId !== nextLocation.fileId ||
      previousLocation.mode !== nextLocation.mode
    ) {
      flushWorkspacePersistenceRef.current();
    }
  }, [activeFileId, files]);
};
