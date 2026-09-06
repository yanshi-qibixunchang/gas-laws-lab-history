import { createExperimentTutorialRuntimeFile } from './workbenchExperimentTutorialWorkspace.ts';
import { type ConsoleLog } from './workbenchConsolePresentation.ts';
import { createExperimentTutorialLogs } from './workbenchExperimentTutorialPresentation.ts';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import { type WorkbenchPanelKey } from './workbenchFileState.ts';
import type { WorkbenchEditSnapshot } from './workbenchEditSnapshot.ts';
import { type WorkbenchLayoutDefaults } from './workbenchLayoutCompatibility.ts';
import { type WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';
import { type ExperimentLearningId, type ExperimentLearningMilestone } from '../learning/experimentLearningModel.ts';

export interface WorkbenchTutorialWorkspacePorts {
  workbenchLayoutDefaults: WorkbenchLayoutDefaults;
  filesRef: { current: WorkbenchFileState[] };
  cancelRuntimeFrame: (fileId: string) => void;
  standardRuntimeRef: { current: Record<string, unknown> };
  idealRuntimeRef: { current: Record<string, unknown> };
  resetHeatCapacitySceneUiState: () => void;
  clearPistonOscillationTutorialPlayback: () => void;
  selectedPanelRef: { current: WorkbenchPanelKey };
  commitWorkbenchFileCollections: (files: WorkbenchFileState[], closedFiles: WorkbenchFileState[], activeFileId: string) => void;
  applyHeatCapacityModeTransitionEvent: (event: { type: 'synchronize'; visibleMode: null }) => unknown;
  setSelectedPanel: (panel: WorkbenchPanelKey) => void;
  setSelectedFileId: (id: string) => void;
  setParametersCollapsed: (collapsed: boolean) => void;
  setUndoStack: (stack: WorkbenchEditSnapshot[]) => void;
  setRedoStack: (stack: WorkbenchEditSnapshot[]) => void;
  undoStackRef: { current: WorkbenchEditSnapshot[] };
  redoStackRef: { current: WorkbenchEditSnapshot[] };
  setOpenFileMenuId: (id: null) => void;
  setPendingDeleteFileId: (id: null) => void;
  setHeatCapacityCalculationReviewOpen: (open: boolean) => void;
  clearPistonOscillationReviewWindows: () => void;
  setHeatCapacityBatchSetupRequestedFileId: (id: null) => void;
  setLogs: (logs: ConsoleLog[]) => void;
  settingsLanguagePreference: WorkbenchLanguagePreference;
}
export const createWorkbenchTutorialWorkspaceActions = ({
  workbenchLayoutDefaults,
  filesRef,
  cancelRuntimeFrame,
  standardRuntimeRef,
  idealRuntimeRef,
  resetHeatCapacitySceneUiState,
  clearPistonOscillationTutorialPlayback,
  selectedPanelRef,
  commitWorkbenchFileCollections,
  applyHeatCapacityModeTransitionEvent,
  setSelectedPanel,
  setSelectedFileId,
  setParametersCollapsed,
  setUndoStack,
  setRedoStack,
  undoStackRef,
  redoStackRef,
  setOpenFileMenuId,
  setPendingDeleteFileId,
  setHeatCapacityCalculationReviewOpen,
  clearPistonOscillationReviewWindows,
  setHeatCapacityBatchSetupRequestedFileId,
  setLogs,
  settingsLanguagePreference
}: WorkbenchTutorialWorkspacePorts) => {
  const replaceVisibleWorkspaceWithExperimentTutorial = (
    experiment: ExperimentLearningId,
    milestone: ExperimentLearningMilestone,
  ) => {
    const tutorialFile = createExperimentTutorialRuntimeFile(
      experiment,
      workbenchLayoutDefaults,
    );
    [...filesRef.current].forEach((file) => {
      cancelRuntimeFrame(file.id);
      delete standardRuntimeRef.current[file.id];
      delete idealRuntimeRef.current[file.id];
    });
    if (experiment === 'heatCapacity') {
      resetHeatCapacitySceneUiState();
    } else {
      clearPistonOscillationTutorialPlayback();
    }
    selectedPanelRef.current = 'preview';
    commitWorkbenchFileCollections([tutorialFile], [], tutorialFile.id);
    if (experiment === 'heatCapacity') {
      applyHeatCapacityModeTransitionEvent({ type: 'synchronize', visibleMode: null });
    }
    setSelectedPanel('preview');
    setSelectedFileId(tutorialFile.id);
    setParametersCollapsed(false);
    setUndoStack([]);
    setRedoStack([]);
    undoStackRef.current = [];
    redoStackRef.current = [];
    setOpenFileMenuId(null);
    setPendingDeleteFileId(null);
    setHeatCapacityCalculationReviewOpen(false);
    clearPistonOscillationReviewWindows();
    setHeatCapacityBatchSetupRequestedFileId(null);
    setLogs(createExperimentTutorialLogs(milestone, settingsLanguagePreference));
  };
  return { replaceVisibleWorkspaceWithExperimentTutorial };
};
