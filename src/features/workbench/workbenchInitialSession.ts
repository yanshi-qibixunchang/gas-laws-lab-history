import type { ExperimentLearningId } from '../learning/experimentLearningModel.ts';
import type { ExperimentTutorialHandoffLoadResult } from '../learning/workbenchTutorialCoordinator.ts';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import type { WorkbenchPanelKey } from './workbenchFileState.ts';
import type { WorkbenchLayoutDefaults } from './workbenchLayoutCompatibility.ts';
import type { WorkbenchHeatCapacityRefreshSession } from './workbenchHeatCapacityRefreshSession.ts';
import { createExperimentTutorialRuntimeFile } from './workbenchExperimentTutorialWorkspace.ts';
import { createDefaultHeatCapacityFile } from './workbenchHeatCapacityFileFactory.ts';
import { createDefaultHeatCapacityPistonOscillationFile } from './workbenchPistonOscillationState.ts';
import { getNextWorkbenchFileDisplayIndex } from './workbenchFileIdentity.ts';
import { enterHeatCapacityExploreModeWorkbenchState } from './workbenchHeatCapacityModeSession.ts';

export interface WorkbenchInitialSession {
  files: WorkbenchFileState[];
  activeFileId: string;
  selectedPanel: WorkbenchPanelKey;
}
export const resolveWorkbenchInitialSession = ({
  initialTutorialReconstruction, initialActiveTutorialExperiment, initialTutorialHandoffRecovery,
  initialTutorialHandoff, initialOrdinarySession, initialOrdinaryClosedFiles, readLayoutDefaults,
}: {
  initialTutorialReconstruction: boolean;
  initialActiveTutorialExperiment: ExperimentLearningId | null;
  initialTutorialHandoffRecovery: boolean;
  initialTutorialHandoff: ExperimentTutorialHandoffLoadResult;
  initialOrdinarySession: WorkbenchInitialSession;
  initialOrdinaryClosedFiles: WorkbenchFileState[];
  readLayoutDefaults: () => WorkbenchLayoutDefaults;
}): WorkbenchInitialSession => {
    if (initialTutorialReconstruction && initialActiveTutorialExperiment) {
      const tutorialFile = createExperimentTutorialRuntimeFile(
        initialActiveTutorialExperiment,
        readLayoutDefaults(),
      );
      return {
        files: [tutorialFile],
        activeFileId: tutorialFile.id,
        selectedPanel: 'preview' as const,
      };
    }
    if (initialTutorialHandoffRecovery) {
      const ordinaryFiles = [...initialOrdinarySession.files, ...initialOrdinaryClosedFiles];
      const targetFileId = initialTutorialHandoff.status === 'loaded'
        ? initialTutorialHandoff.marker.targetFileId
        : '';
      const existingTargetFile = ordinaryFiles.find((file) => file.id === targetFileId);
      if (existingTargetFile) {
        return {
          files: [existingTargetFile],
          activeFileId: existingTargetFile.id,
          selectedPanel: 'preview' as const,
        };
      }
      const completedExperiment = initialTutorialHandoff.status === 'loaded'
        ? initialTutorialHandoff.marker.experiment
        : 'heatCapacity';
      const completedFileKind = completedExperiment === 'heatCapacity'
        ? 'heatCapacity'
        : 'heatCapacityPistonOscillation';
      const index = getNextWorkbenchFileDisplayIndex(completedFileKind, ordinaryFiles);
      const defaults = readLayoutDefaults();
      const freshFile = completedExperiment === 'heatCapacity'
        ? enterHeatCapacityExploreModeWorkbenchState({
            ...createDefaultHeatCapacityFile(index, defaults.heatCapacity),
            id: targetFileId,
          }, createDefaultHeatCapacityFile(index, defaults.heatCapacity))
        : {
            ...createDefaultHeatCapacityPistonOscillationFile(
              index,
              defaults.heatCapacityPistonOscillation,
            ),
            id: targetFileId,
          };
      return {
        files: [freshFile],
        activeFileId: freshFile.id,
        selectedPanel: 'preview' as const,
      };
    }
    return initialOrdinarySession;
};

export const selectWorkbenchInitialRefreshSession = (
  initialSession: WorkbenchInitialSession,
  loadedHeatCapacityRefreshSession: WorkbenchHeatCapacityRefreshSession | null,
): WorkbenchHeatCapacityRefreshSession | null => {
    if (!loadedHeatCapacityRefreshSession) return null;
    if (initialSession.activeFileId !== loadedHeatCapacityRefreshSession.activeHeatCapacityFileId) return null;
    const heatCapacityFile = initialSession.files.find((file) => (
      file.id === loadedHeatCapacityRefreshSession.activeHeatCapacityFileId
    ));
    if (
      !heatCapacityFile ||
      heatCapacityFile.kind !== 'heatCapacity' ||
      heatCapacityFile.heatCapacityMode !== loadedHeatCapacityRefreshSession.mode
    ) {
      return null;
    }
    return loadedHeatCapacityRefreshSession;
};
