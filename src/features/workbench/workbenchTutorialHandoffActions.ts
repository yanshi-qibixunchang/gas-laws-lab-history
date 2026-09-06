import { EXPERIMENT_TUTORIAL_INSTANCE_ID } from './workbenchTutorialIdentity.ts';
import { createExperimentTutorialLogs } from './workbenchExperimentTutorialPresentation.ts';
import { createDefaultHeatCapacityFile } from './workbenchHeatCapacityFileFactory.ts';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import type { WorkbenchFileKind } from './workbenchFileKind.ts';
import { type WorkbenchPanelKey } from './workbenchFileState.ts';
import { createDefaultHeatCapacityPistonOscillationFile } from './workbenchPistonOscillationState.ts';
import { createUniqueWorkbenchFileId, getNextWorkbenchFileDisplayIndex } from './workbenchFileIdentity.ts';
import { cloneWorkbenchFiles } from './workbenchFileSnapshot.ts';
import { enterHeatCapacityExploreModeWorkbenchState, prepareHeatCapacityFileForExploreOnOpen } from './workbenchHeatCapacityModeSession.ts';
import { completeExperimentTutorialProfile, skipExperimentTutorialProfile, type AppExperienceProfile, type ExperimentLearningId } from '../learning/experimentLearningModel.ts';
import { persistAppExperienceProfile } from '../learning/experimentLearningStore.ts';
import { releaseExperimentTutorialOwnership, takeOverExperimentTutorialOwnership } from '../learning/experimentLearningChannel.ts';
import { clearExperimentTutorialHandoff, isExperimentTutorialFileId, persistExperimentTutorialHandoff } from '../learning/workbenchTutorialCoordinator.ts';
import type { useWorkbenchTutorialState } from './useWorkbenchTutorialState.ts';
import type { WorkbenchTutorialWorkspacePorts } from './workbenchTutorialWorkspaceActions.ts';

export type WorkbenchTutorialHandoffPorts = Pick<ReturnType<typeof useWorkbenchTutorialState>, 'setTutorialOperationError' | 'setTutorialNoticeKind' | 'tutorialNoticeKindRef' | 'tutorialOrdinaryWorkspaceRef' | 'experienceProfilePersistedRef' | 'experienceProfileRef' | 'tutorialActiveRef' | 'setExperienceProfile' | 'experimentLearningChannelRef'> & Pick<WorkbenchTutorialWorkspacePorts, 'workbenchLayoutDefaults' | 'resetHeatCapacitySceneUiState' | 'clearPistonOscillationTutorialPlayback' | 'selectedPanelRef' | 'commitWorkbenchFileCollections' | 'applyHeatCapacityModeTransitionEvent' | 'setSelectedPanel' | 'setSelectedFileId' | 'setParametersCollapsed' | 'setLogs' | 'settingsLanguagePreference'> & {
  flushWorkspacePersistenceRef: { current: () => Promise<boolean> };
  commitExperienceProfile: (profile: AppExperienceProfile) => boolean;
  replaceVisibleWorkspaceWithExperimentTutorial: (experiment: ExperimentLearningId, milestone: 'demo') => void;
  issuedWorkbenchFileIdsRef: { current: Set<string> };
  suspendActiveHeatCapacityModeForNavigation: () => boolean;
  hideGeneralSettings: () => void;
  window: Window;
};
const defaultHandoffAdapters = { clearExperimentTutorialHandoff, persistExperimentTutorialHandoff, persistAppExperienceProfile, releaseExperimentTutorialOwnership, takeOverExperimentTutorialOwnership };
export const createWorkbenchTutorialHandoffActions = ({
  setTutorialOperationError,
  setTutorialNoticeKind,
  tutorialNoticeKindRef,
  tutorialOrdinaryWorkspaceRef,
  experienceProfilePersistedRef,
  experienceProfileRef,
  tutorialActiveRef,
  setExperienceProfile,
  experimentLearningChannelRef,
  workbenchLayoutDefaults,
  resetHeatCapacitySceneUiState,
  clearPistonOscillationTutorialPlayback,
  selectedPanelRef,
  commitWorkbenchFileCollections,
  applyHeatCapacityModeTransitionEvent,
  setSelectedPanel,
  setSelectedFileId,
  setParametersCollapsed,
  setLogs,
  settingsLanguagePreference,
  flushWorkspacePersistenceRef,
  commitExperienceProfile,
  replaceVisibleWorkspaceWithExperimentTutorial,
  issuedWorkbenchFileIdsRef,
  suspendActiveHeatCapacityModeForNavigation,
  hideGeneralSettings,
  window
}: WorkbenchTutorialHandoffPorts, { clearExperimentTutorialHandoff, persistExperimentTutorialHandoff, persistAppExperienceProfile, releaseExperimentTutorialOwnership, takeOverExperimentTutorialOwnership } = defaultHandoffAdapters) => {
  const finalizeCompletedExperimentTutorialHandoff = async () => {
    const saved = await flushWorkspacePersistenceRef.current();
    if (!saved) {
      setTutorialOperationError({
        message: settingsLanguagePreference === 'en'
          ? 'The unlocked experiment file could not be saved yet.'
          : settingsLanguagePreference === 'zh-TW'
            ? '解鎖後的新實驗檔案尚未能安全儲存。'
            : '解锁后的新实验文件尚未能安全保存。',
        retry: () => { void finalizeCompletedExperimentTutorialHandoff(); },
      });
      return false;
    }
    const cleared = clearExperimentTutorialHandoff();
    if (cleared.ok === false) {
      setTutorialOperationError({
        message: cleared.error.message,
        retry: () => { void finalizeCompletedExperimentTutorialHandoff(); },
      });
      return false;
    }
    try {
      releaseExperimentTutorialOwnership(
        EXPERIMENT_TUTORIAL_INSTANCE_ID,
        window.localStorage,
      );
    } catch {
      // The persistent milestone and ordinary file are already safe.
    }
    void window.hardSphereLabTutorial?.deactivate?.();
    setTutorialOperationError(null);
    setTutorialNoticeKind('all-unlocked');
    return true;
  };
  const handoffUnlockedExperimentTutorial = async (
    completedExperiment: ExperimentLearningId,
    unlockedProfile: AppExperienceProfile,
    retry: () => void,
  ) => {
    const nextTutorialExperiment = unlockedProfile.activeTutorialExperiment;
    if (nextTutorialExperiment) {
      try {
        const ownershipTransferred = takeOverExperimentTutorialOwnership(
          EXPERIMENT_TUTORIAL_INSTANCE_ID,
          nextTutorialExperiment,
          window.localStorage,
        );
        if (!ownershipTransferred) {
          throw new Error('Tutorial ownership could not be transferred to the next experiment.');
        }
      } catch (cause) {
        setTutorialOperationError({
          message: cause instanceof Error ? cause.message : String(cause),
          retry,
        });
        return false;
      }
      if (!commitExperienceProfile(unlockedProfile)) {
        setTutorialOperationError((current) => current ? { ...current, retry } : current);
        return false;
      }
      replaceVisibleWorkspaceWithExperimentTutorial(nextTutorialExperiment, 'demo');
      tutorialNoticeKindRef.current = 'start-demo';
      setTutorialNoticeKind('start-demo');
      setTutorialOperationError(null);
      return true;
    }

    const ordinaryWorkspace = tutorialOrdinaryWorkspaceRef.current ?? {
      files: [] as WorkbenchFileState[],
      closedFiles: [] as WorkbenchFileState[],
      activeFileId: '',
      selectedPanel: 'preview' as WorkbenchPanelKey,
    };
    const ordinaryFiles = cloneWorkbenchFiles([
      ...ordinaryWorkspace.files,
      ...ordinaryWorkspace.closedFiles,
    ]).map((file) => (
      file.kind === 'heatCapacity'
        ? prepareHeatCapacityFileForExploreOnOpen(
            file,
            createDefaultHeatCapacityFile(1),
            Date.now(),
          )
        : file.runState === 'running'
          ? { ...file, runState: 'paused' as const, updatedAt: Date.now() }
          : file
    ));
    const uniqueOrdinaryFiles = ordinaryFiles.filter((file, index, collection) => (
      collection.findIndex((candidate) => candidate.id === file.id) === index &&
      !isExperimentTutorialFileId(file.id)
    ));
    const completedFileKind: WorkbenchFileKind = completedExperiment === 'heatCapacity'
      ? 'heatCapacity'
      : 'heatCapacityPistonOscillation';
    const index = getNextWorkbenchFileDisplayIndex(completedFileKind, uniqueOrdinaryFiles);
    const freshFileId = createUniqueWorkbenchFileId(
      completedFileKind,
      issuedWorkbenchFileIdsRef.current,
    );
    issuedWorkbenchFileIdsRef.current.add(freshFileId);
    const freshFile: WorkbenchFileState = completedExperiment === 'heatCapacity'
      ? enterHeatCapacityExploreModeWorkbenchState({
          ...createDefaultHeatCapacityFile(index, workbenchLayoutDefaults.heatCapacity),
          id: freshFileId,
        }, createDefaultHeatCapacityFile(index, workbenchLayoutDefaults.heatCapacity))
      : {
          ...createDefaultHeatCapacityPistonOscillationFile(
            index,
            workbenchLayoutDefaults.heatCapacityPistonOscillation,
          ),
          id: freshFileId,
        };

    const handoffResult = persistExperimentTutorialHandoff(completedExperiment, freshFileId);
    if (handoffResult.ok === false) {
      setTutorialOperationError({
        message: handoffResult.error.message,
        retry,
      });
      return false;
    }
    const persistResult = persistAppExperienceProfile(unlockedProfile);
    if (persistResult.ok === false) {
      clearExperimentTutorialHandoff();
      setTutorialOperationError({
        message: persistResult.error.message,
        retry,
      });
      return false;
    }

    if (completedExperiment === 'heatCapacity') {
      suspendActiveHeatCapacityModeForNavigation();
      resetHeatCapacitySceneUiState();
    } else {
      clearPistonOscillationTutorialPlayback();
    }
    selectedPanelRef.current = 'preview';
    commitWorkbenchFileCollections([freshFile], uniqueOrdinaryFiles, freshFile.id);
    if (completedExperiment === 'heatCapacity') {
      applyHeatCapacityModeTransitionEvent({ type: 'synchronize', visibleMode: null });
    }
    setSelectedPanel('preview');
    setSelectedFileId(freshFile.id);
    setParametersCollapsed(false);
    setLogs(createExperimentTutorialLogs('unlocked', settingsLanguagePreference));

    tutorialOrdinaryWorkspaceRef.current = null;
    experienceProfilePersistedRef.current = true;
    experienceProfileRef.current = persistResult.profile;
    tutorialActiveRef.current = false;
    setExperienceProfile(persistResult.profile);
    experimentLearningChannelRef.current?.publish(persistResult.profile);
    await finalizeCompletedExperimentTutorialHandoff();
    return true;
  };
  const completeExperimentLearningTutorial = async (experiment: ExperimentLearningId) => {
    const completedProfile = completeExperimentTutorialProfile(
      experienceProfileRef.current,
      experiment,
    );
    if (!completedProfile) return false;
    return handoffUnlockedExperimentTutorial(
      experiment,
      completedProfile,
      () => { void completeExperimentLearningTutorial(experiment); },
    );
  };
  const exitExperimentLearningTutorial = async () => {
    const experiment = experienceProfileRef.current.activeTutorialExperiment;
    if (!experiment) return false;
    const skippedProfile = skipExperimentTutorialProfile(experienceProfileRef.current, experiment);
    if (!skippedProfile) return false;
    hideGeneralSettings();
    return handoffUnlockedExperimentTutorial(
      experiment,
      skippedProfile,
      () => { void exitExperimentLearningTutorial(); },
    );
  };
  return { finalizeCompletedExperimentTutorialHandoff, handoffUnlockedExperimentTutorial, completeExperimentLearningTutorial, exitExperimentLearningTutorial };
};
