import { useRef, useState } from 'react';
import type { WorkbenchInitialSession } from './workbenchInitialSession.ts';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import type { WorkbenchPanelKey } from './workbenchFileState.ts';
import type { WorkbenchHeatCapacityState } from './workbenchHeatCapacityStateTypes.ts';
import type { WorkbenchHeatCapacityRefreshSession } from './workbenchHeatCapacityRefreshSession.ts';
import { loadWorkbenchLayoutDefaults } from './workbenchLayoutCompatibility.ts';
import { normalizeWorkbenchInitialFiles } from './workbenchInitialFilePresentation.ts';
export const useWorkbenchWorkspaceCollectionState = (ports: { initialSession: WorkbenchInitialSession; initialHeatCapacityRefreshSession: WorkbenchHeatCapacityRefreshSession | null; getInitialClosedFiles: () => WorkbenchFileState[] }) => {
  const { initialSession, initialHeatCapacityRefreshSession, getInitialClosedFiles } = ports;
  const [files, setFiles] = useState<WorkbenchFileState[]>(() => normalizeWorkbenchInitialFiles(
    initialSession.files,
    loadWorkbenchLayoutDefaults(),
    initialHeatCapacityRefreshSession,
  ));
  const [closedFiles, setClosedFiles] = useState<WorkbenchFileState[]>(getInitialClosedFiles);
  const [activeFileId, setActiveFileId] = useState(initialSession.activeFileId);
  const [selectedPanel, setSelectedPanel] = useState<WorkbenchPanelKey>(initialSession.selectedPanel);
  const filesRef = useRef<WorkbenchFileState[]>(files);
  const closedFilesRef = useRef<WorkbenchFileState[]>(closedFiles);
  const issuedWorkbenchFileIdsRef = useRef(new Set(
    [
      ...files.map((file) => file.id),
      ...closedFiles.map((file) => file.id),
    ],
  ));
  const activeFileIdRef = useRef(initialSession.activeFileId);
  const selectedPanelRef = useRef<WorkbenchPanelKey>(initialSession.selectedPanel);
  const workspacePersistenceLocationRef = useRef({
    fileId: initialSession.activeFileId,
    mode: initialSession.files.find((file) => file.id === initialSession.activeFileId)?.kind === 'heatCapacity'
      ? (initialSession.files.find((file) => file.id === initialSession.activeFileId) as WorkbenchHeatCapacityState).heatCapacityMode
      : null,
  });
  return { files, setFiles, closedFiles, setClosedFiles, activeFileId, setActiveFileId, selectedPanel, setSelectedPanel, filesRef, closedFilesRef, issuedWorkbenchFileIdsRef, activeFileIdRef, selectedPanelRef, workspacePersistenceLocationRef };
};
