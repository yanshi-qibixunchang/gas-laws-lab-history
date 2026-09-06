import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import { createDefaultStandardFile, createDefaultIdealFile, type WorkbenchPanelKey } from './workbenchFileState.ts';
import { createDefaultHeatCapacityFile } from './workbenchHeatCapacityFileFactory.ts';
import { createDefaultHeatCapacityPistonOscillationFile } from './workbenchPistonOscillationState.ts';
import { enterHeatCapacityExploreModeWorkbenchState } from './workbenchHeatCapacityModeSession.ts';
import { createUniqueWorkbenchFileId, getNextWorkbenchFileDisplayIndex } from './workbenchFileIdentity.ts';
import { assertNeverWorkbenchFileKind, type WorkbenchFileKind } from './workbenchFileKind.ts';
import { createWorkbenchFileClosePlan, createWorkbenchFileDeletePlan, createWorkbenchFileReopenPlan, createWorkbenchFileSelectionPlan } from './workbenchFileLifecycleCoordinator.ts';
import type { WorkbenchLayoutDefaults } from './workbenchLayoutCompatibility.ts';
import { workbenchCopies } from './workbenchStudioCopy.ts';
import type { workbenchPromptCopies } from './workbenchPromptCopies.ts';
import type { WorkbenchActiveModeCheckpointOverride } from './workbenchIndexedDbPersistence.ts';
import type { PromptConfirmationRequest } from '../../components/prompts/PromptConfirmDialog.tsx';
import type { WorkbenchEditScope } from './workbenchEditSnapshot.ts';
import type { StandardEngineRuntime } from './workbenchSimulationRuntimeTypes.ts';
import type { PhysicsEngine } from '../../domain/hardSphere/PhysicsEngine';
import type { Particle } from '../../shared/types';
import type { WorkbenchMutableRef as Ref, WorkbenchStateSetter as Setter, WorkbenchLogWriter } from './workbenchActionPorts.ts';

export interface WorkbenchFileActionPorts {
  getActiveFile: () => WorkbenchFileState;
  getPendingDeleteFileId: () => string | null;
  filesRef: Ref<WorkbenchFileState[]>;
  closedFilesRef: Ref<WorkbenchFileState[]>;
  activeFileIdRef: Ref<string>;
  selectedPanelRef: Ref<WorkbenchPanelKey>;
  issuedWorkbenchFileIdsRef: Ref<Set<string>>;
  renamingFileIdRef: Ref<string | null>;
  standardRuntimeRef: Ref<Record<string, StandardEngineRuntime>>;
  idealRuntimeRef: Ref<Record<string, StandardEngineRuntime>>;
  workbenchLayoutDefaults: WorkbenchLayoutDefaults;
  workbenchPromptCopy: (typeof workbenchPromptCopies)['zh-CN'];
  captureUndoSnapshot: (label: string, scope: WorkbenchEditScope, fileId?: string) => void;
  guardWorkbenchTutorialAction: (action: 'create-file' | 'open-file' | 'close-file' | 'delete-file') => boolean;
  createStandardRuntime: (file: WorkbenchFileState) => StandardEngineRuntime | null;
  createIdealRuntime: (file: WorkbenchFileState) => StandardEngineRuntime | null;
  snapshotParticles: (engine: PhysicsEngine) => Particle[];
  cancelRuntimeFrame: (fileId: string) => void;
  prepareReopenedWorkbenchFile: (file: WorkbenchFileState) => WorkbenchFileState;
  suspendActiveHeatCapacityModeForNavigation: () => boolean;
  releaseHeatCapacityRuntimeForFileExit: (fileId: string) => void;
  activateHeatCapacityFileModeSession: (fileId: string) => WorkbenchActiveModeCheckpointOverride | undefined;
  commitWorkbenchFileCollections: (files: WorkbenchFileState[], closed: WorkbenchFileState[], activeId: string) => void;
  heatCapacityRefreshPersistRef: Ref<() => void>;
  flushWorkspacePersistenceRef: Ref<(checkpoint?: WorkbenchActiveModeCheckpointOverride) => Promise<boolean>>;
  requestPromptConfirmation: (request: PromptConfirmationRequest) => void;
  setFiles: Setter<WorkbenchFileState[]>;
  setSelectedFileId: Setter<string>;
  setSelectedPanel: Setter<WorkbenchPanelKey>;
  setLeftCollapsed: Setter<boolean>;
  setParametersCollapsed: Setter<boolean>;
  setParameterErrors: Setter<string[]>;
  setIdealAdvancedSettingsOpen: Setter<boolean>;
  setIdealAdvancedSettingsBodyVisible: Setter<boolean>;
  setOpenTopMenu: (menu: null) => void;
  setOpenFileMenuId: Setter<string | null>;
  setPendingDeleteFileId: Setter<string | null>;
  setPendingRemovePointId: Setter<string | null>;
  setPendingClearRelationKey: Setter<string | null>;
  setRenamingFileId: Setter<string | null>;
  setSamplingPresetMenuOpen: Setter<boolean>;
  pushLog: WorkbenchLogWriter;
}

/** Coordinates existing collection owners. Mode suspension and target flush remain ordered. */
export const createWorkbenchFileActions = (ports: WorkbenchFileActionPorts) => {
  const {
    filesRef, closedFilesRef, activeFileIdRef, selectedPanelRef, issuedWorkbenchFileIdsRef,
    renamingFileIdRef, standardRuntimeRef, idealRuntimeRef, workbenchLayoutDefaults, workbenchPromptCopy,
    captureUndoSnapshot, guardWorkbenchTutorialAction, createStandardRuntime, createIdealRuntime,
    snapshotParticles, cancelRuntimeFrame, prepareReopenedWorkbenchFile,
    suspendActiveHeatCapacityModeForNavigation, releaseHeatCapacityRuntimeForFileExit,
    activateHeatCapacityFileModeSession, commitWorkbenchFileCollections,
    heatCapacityRefreshPersistRef, flushWorkspacePersistenceRef, requestPromptConfirmation,
    setFiles, setSelectedFileId, setSelectedPanel, setLeftCollapsed, setParametersCollapsed,
    setParameterErrors, setIdealAdvancedSettingsOpen, setIdealAdvancedSettingsBodyVisible,
    setOpenTopMenu, setOpenFileMenuId, setPendingDeleteFileId, setPendingRemovePointId,
    setPendingClearRelationKey, setRenamingFileId, setSamplingPresetMenuOpen, pushLog,
  } = ports;
  const createFile = (kind: WorkbenchFileKind) => {
    if (!guardWorkbenchTutorialAction('create-file')) return;
    captureUndoSnapshot(`created ${kind} file`, 'workspace');
    const currentFiles = [...filesRef.current, ...closedFilesRef.current];
    const index = getNextWorkbenchFileDisplayIndex(kind, currentFiles);
    const fileId = createUniqueWorkbenchFileId(kind, issuedWorkbenchFileIdsRef.current);
    issuedWorkbenchFileIdsRef.current.add(fileId);
    let file: WorkbenchFileState;
    switch (kind) {
      case 'standard':
        file = createDefaultStandardFile(index, workbenchLayoutDefaults.standard);
        break;
      case 'ideal':
        file = createDefaultIdealFile(index, workbenchLayoutDefaults.ideal);
        break;
      case 'heatCapacity':
        file = createDefaultHeatCapacityFile(index, workbenchLayoutDefaults.heatCapacity);
        break;
      case 'heatCapacityPistonOscillation':
        file = createDefaultHeatCapacityPistonOscillationFile(
          index,
          workbenchLayoutDefaults.heatCapacityPistonOscillation,
        );
        break;
      default:
        file = assertNeverWorkbenchFileKind(kind);
    }
    file = {
      ...file,
      id: fileId,
    };

    if (file.kind === 'heatCapacity') {
      file = enterHeatCapacityExploreModeWorkbenchState(
        file,
        createDefaultHeatCapacityFile(index, workbenchLayoutDefaults.heatCapacity),
      );
    }

    if (file.kind === 'standard' || file.kind === 'ideal') {
      const runtime = file.kind === 'standard' ? createStandardRuntime(file) : createIdealRuntime(file);
      if (runtime) {
        if (file.kind === 'standard') {
          standardRuntimeRef.current[file.id] = runtime;
        } else {
          idealRuntimeRef.current[file.id] = runtime;
        }
        file = {
          ...file,
          stats: runtime.engine.getStats(),
          chartData: runtime.engine.getHistogramData(false),
          particles: snapshotParticles(runtime.engine),
          hardSphereEngineSnapshot: runtime.engine.createSnapshot(),
          ...(file.kind === 'ideal' ? { latestPressureSummary: runtime.engine.getPressureMeasurementSummary() } : {}),
        };
      }
    }

    const currentActiveFile = filesRef.current.find(
      (candidate) => candidate.id === activeFileIdRef.current,
    );
    if (currentActiveFile?.kind === 'heatCapacity') {
      suspendActiveHeatCapacityModeForNavigation();
    } else if (currentActiveFile?.runState === 'running') {
      cancelRuntimeFrame(currentActiveFile.id);
      const pausedFiles = filesRef.current.map((candidate) => candidate.id === currentActiveFile.id
        ? {
            ...candidate,
            runState: 'paused' as const,
            updatedAt: Date.now(),
          }
        : candidate);
      filesRef.current = pausedFiles;
      setFiles(pausedFiles);
      pushLog(
        (language) => workbenchCopies[language].logs.autoPausedCreateFile(currentActiveFile.name),
        'warning',
      );
    }

    const nextFiles = [...filesRef.current, file];
    selectedPanelRef.current = 'preview';
    commitWorkbenchFileCollections(nextFiles, closedFilesRef.current, file.id);
    let activeModeCheckpointOverride: WorkbenchActiveModeCheckpointOverride | undefined;
    if (file.kind === 'heatCapacity') {
      activeModeCheckpointOverride = activateHeatCapacityFileModeSession(file.id);
    }
    heatCapacityRefreshPersistRef.current();
    void flushWorkspacePersistenceRef.current(activeModeCheckpointOverride);
    setSelectedPanel('preview');
    setLeftCollapsed(false);
    setParametersCollapsed(true);
    setParameterErrors([]);
    setIdealAdvancedSettingsOpen(false);
    setIdealAdvancedSettingsBodyVisible(false);
    setOpenTopMenu(null);
    pushLog(
      (language) => workbenchCopies[language].logs.fileCreated(file.name),
      'success',
    );
  };

  const closeWorkbenchFile = (fileId: string) => {
    let file = filesRef.current.find((candidate) => candidate.id === fileId);
    if (!file) return;
    captureUndoSnapshot('closed file', 'workspace');

    const isClosingActiveFile = fileId === activeFileIdRef.current;
    if (isClosingActiveFile && file.kind === 'heatCapacity') {
      suspendActiveHeatCapacityModeForNavigation();
      file = filesRef.current.find((candidate) => candidate.id === fileId) ?? file;
    }

    cancelRuntimeFrame(fileId);
    delete standardRuntimeRef.current[fileId];
    delete idealRuntimeRef.current[fileId];
    if (file.kind === 'heatCapacity' && !isClosingActiveFile) releaseHeatCapacityRuntimeForFileExit(fileId);

    const closePlan = createWorkbenchFileClosePlan(
      filesRef.current,
      closedFilesRef.current,
      activeFileIdRef.current,
      fileId,
      Date.now(),
    );
    if (closePlan.kind !== 'ready') return;
    file = closePlan.file;

    if (isClosingActiveFile) selectedPanelRef.current = 'preview';
    commitWorkbenchFileCollections(
      closePlan.nextFiles,
      closePlan.nextClosedFiles,
      closePlan.nextActiveFileId,
    );
    let activeModeCheckpointOverride: WorkbenchActiveModeCheckpointOverride | undefined;
    if (isClosingActiveFile && closePlan.nextActiveFile?.kind === 'heatCapacity') {
      activeModeCheckpointOverride = activateHeatCapacityFileModeSession(closePlan.nextActiveFile.id);
    }
    heatCapacityRefreshPersistRef.current();
    void flushWorkspacePersistenceRef.current(activeModeCheckpointOverride);
    setOpenFileMenuId(null);
    setPendingDeleteFileId(null);
    if (isClosingActiveFile) {
      setSelectedPanel('preview');
      setLeftCollapsed(false);
      setParametersCollapsed(true);
      setPendingRemovePointId(null);
      setPendingClearRelationKey(null);
      renamingFileIdRef.current = null;
      setRenamingFileId(null);
      setParameterErrors([]);
      setIdealAdvancedSettingsOpen(false);
      setIdealAdvancedSettingsBodyVisible(false);
    }
    pushLog((language) => workbenchCopies[language].logs.fileClosed(file.name), 'warning');
  };

  const requestCloseWorkbenchFile = (file: WorkbenchFileState) => {
    if (!guardWorkbenchTutorialAction('close-file')) return;
    if (file.runState === 'running') {
      requestPromptConfirmation({
        id: `close-running-workbench-file:${file.id}`,
        tone: 'warning',
        ...workbenchPromptCopy.closeRunningExperiment(file.name),
        closeLabel: workbenchPromptCopy.closeLabel,
        onConfirm: () => closeWorkbenchFile(file.id),
      });
      return;
    }

    closeWorkbenchFile(file.id);
  };

  const openClosedWorkbenchFile = (fileId: string) => {
    if (!guardWorkbenchTutorialAction('open-file')) return;
    const file = closedFilesRef.current.find((candidate) => candidate.id === fileId);
    if (!file || filesRef.current.some((candidate) => candidate.id === fileId)) return;
    captureUndoSnapshot('reopened file', 'workspace');

    const currentActiveFile = filesRef.current.find(
      (candidate) => candidate.id === activeFileIdRef.current,
    );
    if (currentActiveFile?.kind === 'heatCapacity') {
      suspendActiveHeatCapacityModeForNavigation();
    } else if (currentActiveFile?.runState === 'running') {
      cancelRuntimeFrame(currentActiveFile.id);
      const pausedFiles = filesRef.current.map((candidate) => candidate.id === currentActiveFile.id
        ? {
            ...candidate,
            runState: 'paused' as const,
            updatedAt: Date.now(),
          }
        : candidate);
      filesRef.current = pausedFiles;
      setFiles(pausedFiles);
      pushLog(
        (language) => workbenchCopies[language].logs.autoPausedSwitchFile(currentActiveFile.name),
        'warning',
      );
    }

    const reopenedFile = prepareReopenedWorkbenchFile(file);
    const reopenPlan = createWorkbenchFileReopenPlan(
      filesRef.current,
      closedFilesRef.current,
      reopenedFile,
    );
    if (reopenPlan.kind !== 'ready') return;
    selectedPanelRef.current = 'preview';
    commitWorkbenchFileCollections(
      reopenPlan.nextFiles,
      reopenPlan.nextClosedFiles,
      reopenPlan.nextActiveFileId,
    );
    let activeModeCheckpointOverride: WorkbenchActiveModeCheckpointOverride | undefined;
    if (reopenPlan.nextActiveFile.kind === 'heatCapacity') {
      activeModeCheckpointOverride = activateHeatCapacityFileModeSession(reopenPlan.nextActiveFile.id);
    }
    heatCapacityRefreshPersistRef.current();
    void flushWorkspacePersistenceRef.current(activeModeCheckpointOverride);
    setSelectedPanel('preview');
    setLeftCollapsed(false);
    setParametersCollapsed(true);
    setParameterErrors([]);
    setIdealAdvancedSettingsOpen(false);
    setIdealAdvancedSettingsBodyVisible(false);
    setOpenTopMenu(null);
    pushLog(
      (language) => workbenchCopies[language].logs.fileOpenedFromCache(reopenedFile.name),
      'success',
    );
  };

  const deleteWorkbenchFile = (fileId: string) => {
    const deletePlan = createWorkbenchFileDeletePlan(
      filesRef.current,
      closedFilesRef.current,
      activeFileIdRef.current,
      fileId,
    );
    if (deletePlan.kind !== 'ready') return;
    const { file } = deletePlan;
    const deletingActiveFile = deletePlan.wasActive;

    captureUndoSnapshot('deleted file', 'workspace');
    if (deletingActiveFile && file.kind === 'heatCapacity') {
      suspendActiveHeatCapacityModeForNavigation();
    }
    cancelRuntimeFrame(fileId);
    delete standardRuntimeRef.current[fileId];
    delete idealRuntimeRef.current[fileId];
    if (file.kind === 'heatCapacity' && !deletingActiveFile) {
      releaseHeatCapacityRuntimeForFileExit(fileId);
    }

    selectedPanelRef.current = 'preview';
    commitWorkbenchFileCollections(
      deletePlan.nextFiles,
      deletePlan.nextClosedFiles,
      deletePlan.nextActiveFileId,
    );
    let activeModeCheckpointOverride: WorkbenchActiveModeCheckpointOverride | undefined;
    if (deletingActiveFile && deletePlan.nextActiveFile?.kind === 'heatCapacity') {
      activeModeCheckpointOverride = activateHeatCapacityFileModeSession(deletePlan.nextActiveFile.id);
    }
    heatCapacityRefreshPersistRef.current();
    void flushWorkspacePersistenceRef.current(activeModeCheckpointOverride);
    setSelectedPanel('preview');
    setLeftCollapsed(false);
    setParametersCollapsed(true);
    setOpenFileMenuId(null);
    setPendingDeleteFileId(null);
    setPendingRemovePointId(null);
    setPendingClearRelationKey(null);
    renamingFileIdRef.current = null;
    setRenamingFileId(null);
    setParameterErrors([]);
    setIdealAdvancedSettingsOpen(false);
    setIdealAdvancedSettingsBodyVisible(false);
    pushLog((language) => workbenchCopies[language].logs.fileRemoved(file.name), 'warning');
  };

  const requestDeleteWorkbenchFile = (file: WorkbenchFileState) => {
    const pendingDeleteFileId = ports.getPendingDeleteFileId();
    if (!guardWorkbenchTutorialAction('delete-file')) return;
    if (pendingDeleteFileId === file.id) {
      deleteWorkbenchFile(file.id);
      return;
    }

    setPendingDeleteFileId(file.id);
    pushLog((language) => workbenchCopies[language].logs.confirmDeleteFile(file.name), 'warning');
  };

  const cancelDeleteWorkbenchFile = () => {
    setPendingDeleteFileId(null);
    setOpenFileMenuId(null);
  };

  const selectFile = (file: WorkbenchFileState) => {
    const activeFile = ports.getActiveFile();
    setSelectedFileId(file.id);
    if (file.id === activeFileIdRef.current) return;
    let selectedFile = file;
    const currentActiveFile = filesRef.current.find((candidate) => (
      candidate.id === activeFileIdRef.current
    )) ?? activeFile;
    const switchingFile = file.id !== activeFileIdRef.current;
    let switchingFromPendingHeatCapacityRefresh = false;
    if (switchingFile && currentActiveFile.kind === 'heatCapacity') {
      switchingFromPendingHeatCapacityRefresh = suspendActiveHeatCapacityModeForNavigation();
    } else if (switchingFile && currentActiveFile.runState === 'running') {
      cancelRuntimeFrame(currentActiveFile.id);
      const pausedFiles = filesRef.current.map((candidate) => candidate.id === currentActiveFile.id
        ? {
            ...candidate,
            runState: 'paused' as const,
            updatedAt: Date.now(),
          }
        : candidate);
      filesRef.current = pausedFiles;
      setFiles(pausedFiles);
      pushLog(
        (language) => workbenchCopies[language].logs.autoPausedSwitchFile(currentActiveFile.name),
        'warning',
      );
    }

    if (switchingFile) {
      const selectionPlan = createWorkbenchFileSelectionPlan(
        filesRef.current,
        activeFileIdRef.current,
        file.id,
        Date.now(),
      );
      if (selectionPlan.kind !== 'ready') return;
      selectedFile = selectionPlan.nextActiveFile;
      if (!switchingFromPendingHeatCapacityRefresh) {
        heatCapacityRefreshPersistRef.current();
        void flushWorkspacePersistenceRef.current();
      }
      commitWorkbenchFileCollections(
        selectionPlan.nextFiles,
        closedFilesRef.current,
        selectionPlan.nextActiveFileId,
      );
    }
    let activeModeCheckpointOverride: WorkbenchActiveModeCheckpointOverride | undefined;
    if (switchingFile && selectedFile.kind === 'heatCapacity') {
      activeModeCheckpointOverride = activateHeatCapacityFileModeSession(selectedFile.id);
    }
    selectedPanelRef.current = 'preview';
    if (switchingFile) {
      void flushWorkspacePersistenceRef.current(activeModeCheckpointOverride);
    }
    setSelectedPanel('preview');
    setLeftCollapsed(false);
    setParametersCollapsed(true);
    setParameterErrors([]);
    setIdealAdvancedSettingsOpen(false);
    setIdealAdvancedSettingsBodyVisible(false);
    setOpenFileMenuId(null);
    setPendingDeleteFileId(null);
    setPendingRemovePointId(null);
    setPendingClearRelationKey(null);
    renamingFileIdRef.current = null;
    setRenamingFileId(null);
    setSamplingPresetMenuOpen(false);
    pushLog((language) => workbenchCopies[language].logs.fileSelected(selectedFile.name));
  };

  return { createFile, closeWorkbenchFile, requestCloseWorkbenchFile, openClosedWorkbenchFile, deleteWorkbenchFile, requestDeleteWorkbenchFile, cancelDeleteWorkbenchFile, selectFile };
};
