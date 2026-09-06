import type { Dispatch, SetStateAction } from 'react';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import type { WorkbenchPersistenceReason } from './workbenchPersistenceScheduler.ts';
import { assertUniqueWorkbenchFileCollections } from './workbenchFileIdentity.ts';

type Ref<T> = { current: T };
export interface WorkbenchFileCollectionActionPorts {
  desktopExitQuiescedRef: Ref<boolean>;
  scheduleHeatCapacitySemanticSceneCheckpointRef: Ref<() => void>;
  scheduleWorkspacePersistenceRef: Ref<(reason?: WorkbenchPersistenceReason) => boolean>;
  setFiles: Dispatch<SetStateAction<WorkbenchFileState[]>>;
  filesRef: Ref<WorkbenchFileState[]>;
  closedFilesRef: Ref<WorkbenchFileState[]>;
  activeFileIdRef: Ref<string>;
  setClosedFiles: Dispatch<SetStateAction<WorkbenchFileState[]>>;
  setActiveFileId: Dispatch<SetStateAction<string>>;
  issuedWorkbenchFileIdsRef: Ref<Set<string>>;
}

/** Keep semantic scheduling, runtime frames and atomic navigation commits as distinct lanes. */
export const createWorkbenchFileCollectionActions = (ports: WorkbenchFileCollectionActionPorts) => {
  const { desktopExitQuiescedRef, scheduleHeatCapacitySemanticSceneCheckpointRef, scheduleWorkspacePersistenceRef, setFiles, filesRef, closedFilesRef, activeFileIdRef, setClosedFiles, setActiveFileId, issuedWorkbenchFileIdsRef } = ports;
  const setWorkbenchFiles = (updater: (current: WorkbenchFileState[]) => WorkbenchFileState[]) => {
    if (desktopExitQuiescedRef.current) return;
    scheduleHeatCapacitySemanticSceneCheckpointRef.current();
    scheduleWorkspacePersistenceRef.current('semantic');
    setFiles((current) => {
      const next = updater(current);
      filesRef.current = next;
      return next;
    });
  };

  const commitWorkbenchFileCollections = (
    nextFiles: WorkbenchFileState[],
    nextClosedFiles: WorkbenchFileState[],
    nextActiveFileId: string,
  ) => {
    assertUniqueWorkbenchFileCollections(nextFiles, nextClosedFiles, nextActiveFileId);
    [...nextFiles, ...nextClosedFiles].forEach((file) => {
      issuedWorkbenchFileIdsRef.current.add(file.id);
    });
    filesRef.current = nextFiles;
    closedFilesRef.current = nextClosedFiles;
    activeFileIdRef.current = nextActiveFileId;
    setFiles(nextFiles);
    setClosedFiles(nextClosedFiles);
    setActiveFileId(nextActiveFileId);
    scheduleHeatCapacitySemanticSceneCheckpointRef.current();
    scheduleWorkspacePersistenceRef.current('semantic');
  };

  const updateFileById = (fileId: string, updater: (file: WorkbenchFileState) => WorkbenchFileState) => {
    setWorkbenchFiles((current) => current.map((file) => (file.id === fileId ? updater(file) : file)));
  };

  const updateRuntimeFileById = (
    fileId: string,
    updater: (file: WorkbenchFileState) => WorkbenchFileState,
  ) => {
    if (desktopExitQuiescedRef.current) return;
    setFiles((current) => {
      const next = current.map((file) => (
        file.id === fileId ? updater(file) : file
      ));
      filesRef.current = next;
      return next;
    });
  };

  const updateActiveFile = (updater: (file: WorkbenchFileState) => WorkbenchFileState) => {
    updateFileById(activeFileIdRef.current, updater);
  };
  return { setWorkbenchFiles, commitWorkbenchFileCollections, updateFileById, updateRuntimeFileById, updateActiveFile };
};
