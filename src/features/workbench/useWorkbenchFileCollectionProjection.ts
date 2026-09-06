import { useEffect } from 'react';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import type { WorkbenchHeatCapacityRefreshSession } from './workbenchHeatCapacityRefreshSession.ts';
import type { WorkbenchMutableRef as Ref, WorkbenchStateSetter as Setter } from './workbenchActionPorts.ts';
export const useWorkbenchFilesRefProjection = (files: WorkbenchFileState[], filesRef: Ref<WorkbenchFileState[]>) => {
 useEffect(() => {
    filesRef.current = files;
  }, [files]);
};
export interface WorkbenchActiveFileProjectionPorts { activeFileId: string; activeFileIdRef: Ref<string>; initialHeatCapacityRefreshSession: WorkbenchHeatCapacityRefreshSession | null; disableHeatCapacityInitialSceneRestore: () => void; heatCapacityRefreshRestorePendingRef: Ref<boolean>; setSelectedFileId: Setter<string>; }
export const projectWorkbenchActiveFile = (ports: WorkbenchActiveFileProjectionPorts) => {
 const { activeFileId, activeFileIdRef, initialHeatCapacityRefreshSession, disableHeatCapacityInitialSceneRestore, heatCapacityRefreshRestorePendingRef, setSelectedFileId } = ports;

    activeFileIdRef.current = activeFileId;
    if (
      initialHeatCapacityRefreshSession &&
      activeFileId !== initialHeatCapacityRefreshSession.activeHeatCapacityFileId
    ) {
      disableHeatCapacityInitialSceneRestore();
    }
    if (heatCapacityRefreshRestorePendingRef.current) return;
    setSelectedFileId(activeFileId);

};
export const useWorkbenchActiveFileProjection = (ports: WorkbenchActiveFileProjectionPorts) => {
 const { activeFileId } = ports;
 useEffect(() => projectWorkbenchActiveFile(ports), [activeFileId]);
};
