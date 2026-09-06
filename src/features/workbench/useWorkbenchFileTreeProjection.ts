import { useEffect } from 'react';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import type { WorkbenchMutableRef as Ref, WorkbenchStateSetter as Setter } from './workbenchActionPorts.ts';
export const useWorkbenchFileTreeSelectionProjection = (ports: { activeFileId: string; files: WorkbenchFileState[]; selectedFileId: string; setSelectedFileId: Setter<string>; }) => {
 const { activeFileId, files, selectedFileId, setSelectedFileId } = ports;
 useEffect(() => {
    if (!selectedFileId || files.some((file) => file.id === selectedFileId)) return;
    setSelectedFileId(activeFileId);
  }, [activeFileId, files, selectedFileId]);
};
export const useWorkbenchRenameRefProjection = (renamingFileId: string | null, renamingFileIdRef: Ref<string | null>) => {
 useEffect(() => {
    renamingFileIdRef.current = renamingFileId;
  }, [renamingFileId]);
};
