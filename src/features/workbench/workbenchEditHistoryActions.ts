import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import type { WorkbenchPanelKey } from './workbenchFileState.ts';
import type { WorkbenchHeatCapacityState } from './workbenchHeatCapacityStateTypes.ts';
import type { HeatCapacityModeGuideCheckpoint, HeatCapacityModeUiCheckpoint } from '../heatCapacity/heatCapacityModeUiCheckpoint.ts';
import type { WorkbenchActiveModeCheckpointOverride } from './workbenchIndexedDbPersistence.ts';
import type { WorkbenchConsoleMessageInput } from './workbenchConsoleLocalization.ts';
import type { WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';
import { cloneWorkbenchFiles } from './workbenchFileSnapshot.ts';
import { suspendHeatCapacityModeSession } from './workbenchHeatCapacityModeSession.ts';
import { trimWorkbenchEditHistory } from './workbenchEditHistory.ts';
import { workbenchCopies } from './workbenchStudioCopy.ts';
import { shouldCollapseWorkbenchParameterSidebar } from './workbenchPanelAvailability.ts';
import { createFilePresentationSnapshot, type WorkbenchEditSnapshot, type WorkbenchEditScope, type WorkbenchPresentationEditSnapshot, type WorkbenchFileEditSnapshot, type WorkbenchWorkspaceEditSnapshot } from './workbenchEditSnapshot.ts';

type Ref<T> = { current: T };
export interface WorkbenchEditHistoryPorts {
  filesRef: Ref<WorkbenchFileState[]>;
  closedFilesRef: Ref<WorkbenchFileState[]>;
  activeFileIdRef: Ref<string>;
  selectedPanelRef: Ref<WorkbenchPanelKey>;
  undoStackRef: Ref<WorkbenchEditSnapshot[]>;
  redoStackRef: Ref<WorkbenchEditSnapshot[]>;
  tutorialActiveRef: Ref<boolean>;
  scheduleWorkspacePersistenceRef: Ref<() => unknown>;
  flushWorkspacePersistenceRef: Ref<(checkpoint?: WorkbenchActiveModeCheckpointOverride) => Promise<boolean>>;
  activeFileOwnsPendingHeatCapacityRefresh: (file: WorkbenchHeatCapacityState) => boolean;
  resolveDeferredHeatCapacityGuideUiCheckpoint: (file: WorkbenchHeatCapacityState) => HeatCapacityModeGuideCheckpoint | null;
  captureHeatCapacityModeSceneMetadata: (fileId: string) => unknown;
  buildHeatCapacityModeUiCheckpoint: (file: WorkbenchHeatCapacityState, now: number, guide: HeatCapacityModeGuideCheckpoint | null) => HeatCapacityModeUiCheckpoint;
  suspendActiveHeatCapacityModeForNavigation: () => unknown;
  activateHeatCapacityFileModeSession: (fileId: string) => WorkbenchActiveModeCheckpointOverride | undefined;
  commitWorkbenchFileCollections: (files: WorkbenchFileState[], closed: WorkbenchFileState[], activeId: string) => void;
  setWorkbenchFiles: (update: (files: WorkbenchFileState[]) => WorkbenchFileState[]) => void;
  reconcileRuntimeAfterFileRestore: (file: WorkbenchFileState) => void;
  reconcileRuntimesAfterRestore: (files: WorkbenchFileState[]) => void;
  clearEditRestoreTransientUi: () => void;
  setSelectedPanel: (panel: WorkbenchPanelKey) => void;
  setParametersCollapsed: (collapsed: boolean) => void;
  setUndoStack: (stack: WorkbenchEditSnapshot[]) => void;
  setRedoStack: (stack: WorkbenchEditSnapshot[]) => void;
  setOpenTopMenu: (menu: null) => void;
  guardWorkbenchTutorialAction: (action: 'undo' | 'redo') => boolean;
  pushLog: (message: WorkbenchConsoleMessageInput, kind: 'warning' | 'success') => void;
  getLocalizedWorkbenchEditLabel: (label: string, language: WorkbenchLanguagePreference) => string;
}

/** Coordinates existing refs and restore ports; owns no file, runtime or history state. */
export const createWorkbenchEditHistoryActions = (ports: WorkbenchEditHistoryPorts) => {
  const {
    filesRef, closedFilesRef, activeFileIdRef, selectedPanelRef, undoStackRef, redoStackRef,
    tutorialActiveRef, scheduleWorkspacePersistenceRef, flushWorkspacePersistenceRef,
    activeFileOwnsPendingHeatCapacityRefresh, resolveDeferredHeatCapacityGuideUiCheckpoint,
    captureHeatCapacityModeSceneMetadata, buildHeatCapacityModeUiCheckpoint,
    suspendActiveHeatCapacityModeForNavigation, activateHeatCapacityFileModeSession,
    commitWorkbenchFileCollections, setWorkbenchFiles, reconcileRuntimeAfterFileRestore,
    reconcileRuntimesAfterRestore, clearEditRestoreTransientUi,
    setSelectedPanel, setParametersCollapsed, setUndoStack, setRedoStack, setOpenTopMenu,
    guardWorkbenchTutorialAction, pushLog, getLocalizedWorkbenchEditLabel,
  } = ports;
  const createEditSnapshotFiles = () => {
    const currentFiles = filesRef.current;
    const currentFile = currentFiles.find((file) => file.id === activeFileIdRef.current);
    if (!currentFile || currentFile.kind !== 'heatCapacity') return currentFiles;
    if (activeFileOwnsPendingHeatCapacityRefresh(currentFile)) return currentFiles;
    const deferredGuideCheckpoint = resolveDeferredHeatCapacityGuideUiCheckpoint(currentFile);
    captureHeatCapacityModeSceneMetadata(currentFile.id);
    const now = Date.now();
    const checkpoint = buildHeatCapacityModeUiCheckpoint(currentFile, now, deferredGuideCheckpoint);
    const suspendedFile = suspendHeatCapacityModeSession(currentFile, checkpoint, now);
    return currentFiles.map((file) => file.id === suspendedFile.id ? suspendedFile : file);
  };

  const createEditSnapshot = (
    label: string,
    scope: WorkbenchEditScope = 'file',
    fileId = activeFileIdRef.current,
  ): WorkbenchEditSnapshot => {
    if (scope === 'presentation') {
      const targetFile = filesRef.current.find((file) => file.id === fileId);
      if (!targetFile) throw new Error(`Cannot snapshot missing workbench file: ${fileId}.`);
      return {
        kind: 'presentation',
        label,
        fileId,
        presentation: createFilePresentationSnapshot(targetFile),
        selectedPanel: selectedPanelRef.current,
      };
    }
    const sourceFiles = scope === 'workspace' || fileId === activeFileIdRef.current
      ? createEditSnapshotFiles()
      : filesRef.current;
    if (scope === 'workspace') {
      return {
        kind: 'workspace',
        label,
        files: cloneWorkbenchFiles(sourceFiles),
        closedFiles: cloneWorkbenchFiles(closedFilesRef.current),
        activeFileId: activeFileIdRef.current,
        selectedPanel: selectedPanelRef.current,
      };
    }
    const targetFile = sourceFiles.find((file) => file.id === fileId);
    if (!targetFile) throw new Error(`Cannot snapshot missing workbench file: ${fileId}.`);
    return {
      kind: 'file',
      label,
      fileId,
      file: cloneWorkbenchFiles([targetFile])[0]!,
      selectedPanel: selectedPanelRef.current,
    };
  };

  const restorePresentationSnapshot = (snapshot: WorkbenchPresentationEditSnapshot) => {
    setWorkbenchFiles((current) => current.map((file) => {
      if (file.id !== snapshot.fileId || file.kind !== snapshot.presentation.kind) return file;
      return {
        ...file,
        ...structuredClone(snapshot.presentation.state),
      } as WorkbenchFileState;
    }));
    if (activeFileIdRef.current === snapshot.fileId) {
      selectedPanelRef.current = snapshot.selectedPanel;
      setSelectedPanel(snapshot.selectedPanel);
    }
    scheduleWorkspacePersistenceRef.current();
  };

  const restoreFileSnapshot = (snapshot: WorkbenchFileEditSnapshot) => {
    const restoringActiveFile = activeFileIdRef.current === snapshot.fileId;
    const currentFile = filesRef.current.find((file) => file.id === snapshot.fileId);
    if (!currentFile) return;
    if (restoringActiveFile && currentFile.kind === 'heatCapacity') {
      suspendActiveHeatCapacityModeForNavigation();
    }
    const clonedFile = cloneWorkbenchFiles([snapshot.file])[0]!;
    const restoredFile = clonedFile.kind !== 'heatCapacity' && clonedFile.runState === 'running'
      ? { ...clonedFile, runState: 'paused' as const }
      : clonedFile;
    const restoredFiles = filesRef.current.map((file) => file.id === snapshot.fileId ? restoredFile : file);
    commitWorkbenchFileCollections(restoredFiles, closedFilesRef.current, activeFileIdRef.current);
    reconcileRuntimeAfterFileRestore(restoredFile);
    let activeModeCheckpointOverride: WorkbenchActiveModeCheckpointOverride | undefined;
    if (restoringActiveFile && restoredFile.kind === 'heatCapacity') {
      activeModeCheckpointOverride = activateHeatCapacityFileModeSession(restoredFile.id);
    }
    if (restoringActiveFile) {
      selectedPanelRef.current = snapshot.selectedPanel;
      setSelectedPanel(snapshot.selectedPanel);
      setParametersCollapsed(shouldCollapseWorkbenchParameterSidebar(restoredFile));
    }
    clearEditRestoreTransientUi();
    void flushWorkspacePersistenceRef.current(activeModeCheckpointOverride);
  };

  const restoreWorkspaceSnapshot = (snapshot: WorkbenchWorkspaceEditSnapshot) => {
    const currentActiveFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    if (currentActiveFile?.kind === 'heatCapacity') {
      suspendActiveHeatCapacityModeForNavigation();
    }
    const restoredFiles = cloneWorkbenchFiles(snapshot.files).map((file) => (
      file.kind !== 'heatCapacity' && file.runState === 'running'
        ? { ...file, runState: 'paused' as const }
        : file
    ));
    const activeExists = restoredFiles.some((file) => file.id === snapshot.activeFileId);
    const nextActiveFileId = activeExists ? snapshot.activeFileId : restoredFiles[0]?.id ?? '';
    const restoredClosedFiles = cloneWorkbenchFiles(snapshot.closedFiles);
    selectedPanelRef.current = snapshot.selectedPanel;
    commitWorkbenchFileCollections(restoredFiles, restoredClosedFiles, nextActiveFileId);
    reconcileRuntimesAfterRestore(restoredFiles);
    const nextActiveFile = restoredFiles.find((file) => file.id === nextActiveFileId);
    let activeModeCheckpointOverride: WorkbenchActiveModeCheckpointOverride | undefined;
    if (nextActiveFile?.kind === 'heatCapacity') {
      activeModeCheckpointOverride = activateHeatCapacityFileModeSession(nextActiveFile.id);
    }
    setSelectedPanel(snapshot.selectedPanel);
    setParametersCollapsed(shouldCollapseWorkbenchParameterSidebar(nextActiveFile));
    clearEditRestoreTransientUi();
    void flushWorkspacePersistenceRef.current(activeModeCheckpointOverride);
  };

  const restoreSnapshot = (snapshot: WorkbenchEditSnapshot) => {
    if (snapshot.kind === 'presentation') {
      restorePresentationSnapshot(snapshot);
      return;
    }
    if (snapshot.kind === 'file') {
      restoreFileSnapshot(snapshot);
      return;
    }
    restoreWorkspaceSnapshot(snapshot);
  };

  const pushUndoSnapshot = (snapshot: WorkbenchEditSnapshot) => {
    const nextUndoStack = trimWorkbenchEditHistory([...undoStackRef.current, snapshot]);
    undoStackRef.current = nextUndoStack;
    redoStackRef.current = [];
    setUndoStack(nextUndoStack);
    setRedoStack([]);
  };

  const captureUndoSnapshot = (
    label: string,
    scope: WorkbenchEditScope = 'file',
    fileId = activeFileIdRef.current,
  ) => {
    if (tutorialActiveRef.current) return;
    pushUndoSnapshot(createEditSnapshot(label, scope, fileId));
  };

  const undoLastEdit = () => {
    if (!guardWorkbenchTutorialAction('undo')) return;
    const snapshot = undoStackRef.current[undoStackRef.current.length - 1];
    if (!snapshot) return;
    if (
      snapshot.kind !== 'workspace' &&
      !filesRef.current.some((file) => file.id === snapshot.fileId)
    ) {
      undoStackRef.current = [];
      redoStackRef.current = [];
      setUndoStack([]);
      setRedoStack([]);
      return;
    }

    const currentSnapshot = createEditSnapshot(
      snapshot.label,
      snapshot.kind,
      snapshot.kind === 'workspace' ? activeFileIdRef.current : snapshot.fileId,
    );
    const nextUndoStack = undoStackRef.current.slice(0, -1);
    const nextRedoStack = trimWorkbenchEditHistory([...redoStackRef.current, currentSnapshot]);
    undoStackRef.current = nextUndoStack;
    redoStackRef.current = nextRedoStack;
    setUndoStack(nextUndoStack);
    setRedoStack(nextRedoStack);
    restoreSnapshot(snapshot);
    pushLog(
      (language) => workbenchCopies[language].logs.undoAction(
        getLocalizedWorkbenchEditLabel(snapshot.label, language),
      ),
      'warning',
    );
  };

  const redoLastEdit = () => {
    if (!guardWorkbenchTutorialAction('redo')) return;
    const snapshot = redoStackRef.current[redoStackRef.current.length - 1];
    if (!snapshot) return;
    if (
      snapshot.kind !== 'workspace' &&
      !filesRef.current.some((file) => file.id === snapshot.fileId)
    ) {
      undoStackRef.current = [];
      redoStackRef.current = [];
      setUndoStack([]);
      setRedoStack([]);
      return;
    }

    const currentSnapshot = createEditSnapshot(
      snapshot.label,
      snapshot.kind,
      snapshot.kind === 'workspace' ? activeFileIdRef.current : snapshot.fileId,
    );
    const nextRedoStack = redoStackRef.current.slice(0, -1);
    const nextUndoStack = trimWorkbenchEditHistory([...undoStackRef.current, currentSnapshot]);
    undoStackRef.current = nextUndoStack;
    redoStackRef.current = nextRedoStack;
    setUndoStack(nextUndoStack);
    setRedoStack(nextRedoStack);
    restoreSnapshot(snapshot);
    pushLog(
      (language) => workbenchCopies[language].logs.redoAction(
        getLocalizedWorkbenchEditLabel(snapshot.label, language),
      ),
      'success',
    );
  };

  const clearEditHistory = () => {
    if (!guardWorkbenchTutorialAction('undo')) return;
    undoStackRef.current = [];
    redoStackRef.current = [];
    setUndoStack([]);
    setRedoStack([]);
    setOpenTopMenu(null);
    pushLog((language) => workbenchCopies[language].logs.editHistoryCleared, 'warning');
  };

  return { createEditSnapshotFiles, createEditSnapshot, restorePresentationSnapshot, restoreFileSnapshot, restoreWorkspaceSnapshot, restoreSnapshot, pushUndoSnapshot, captureUndoSnapshot, undoLastEdit, redoLastEdit, clearEditHistory };
};
