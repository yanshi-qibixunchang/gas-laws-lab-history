import { isExperimentTutorialFileId } from '../learning/workbenchTutorialCoordinator.ts';
import type { ExperimentTutorialNoticeKind } from './workbenchExperimentTutorialPresentation.ts';
import { EXPERIMENT_TUTORIAL_INSTANCE_ID } from './workbenchTutorialIdentity.ts';
import { type TutorialOrdinaryWorkspace, mergeArchivedNamespacesIntoTutorialWorkspace } from './workbenchExperimentTutorialWorkspace.ts';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import { type WorkbenchPanelKey } from './workbenchFileState.ts';
import { cloneWorkbenchFiles } from './workbenchFileSnapshot.ts';
import { type WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';
import { startExperimentTutorialProfile, type AppExperienceProfile, type ExperimentLearningId, type ExperimentLearningMilestone } from '../learning/experimentLearningModel.ts';
import { claimExperimentTutorialOwnership, releaseExperimentTutorialOwnership } from '../learning/experimentLearningChannel.ts';
import type { useWorkbenchTutorialState } from './useWorkbenchTutorialState.ts';

export type WorkbenchTutorialActivationPorts = Pick<ReturnType<typeof useWorkbenchTutorialState>, 'setTutorialOperationError' | 'setTutorialNoticeKind' | 'experienceProfileRef' | 'tutorialActiveRef' | 'setRemoteTutorialOwnerActive' | 'tutorialOrdinaryWorkspaceRef' | 'tutorialOwnershipAdoptionPendingRef' | 'tutorialOwnershipClaimRef' | 'tutorialNoticeKindRef'> & {
  flushWorkspacePersistenceRef: { current: () => Promise<boolean> };
  settingsLanguagePreference: WorkbenchLanguagePreference;
  filesRef: { current: WorkbenchFileState[] };
  closedFilesRef: { current: WorkbenchFileState[] };
  activeFileIdRef: { current: string };
  selectedPanelRef: { current: WorkbenchPanelKey };
  suspendActiveHeatCapacityModeForNavigation: () => boolean;
  commitExperienceProfile: (profile: AppExperienceProfile) => boolean;
  hideGeneralSettings: () => void;
  replaceVisibleWorkspaceWithExperimentTutorial: (experiment: ExperimentLearningId, milestone: ExperimentLearningMilestone) => void;
  window: Window;
  document: Document;
  refreshTutorialOrdinaryWorkspaceFromPersistence: ReturnType<typeof useWorkbenchTutorialState>['refreshTutorialOrdinaryWorkspaceFromPersistence'];
};
export const createWorkbenchTutorialActivationActions = ({
  setTutorialOperationError,
  setTutorialNoticeKind,
  experienceProfileRef,
  tutorialActiveRef,
  setRemoteTutorialOwnerActive,
  tutorialOrdinaryWorkspaceRef,
  flushWorkspacePersistenceRef,
  settingsLanguagePreference,
  filesRef,
  activeFileIdRef,
  suspendActiveHeatCapacityModeForNavigation,
  closedFilesRef,
  selectedPanelRef,
  commitExperienceProfile,
  hideGeneralSettings,
  replaceVisibleWorkspaceWithExperimentTutorial,
  window,
  tutorialOwnershipAdoptionPendingRef,
  tutorialOwnershipClaimRef,
  tutorialNoticeKindRef,
  refreshTutorialOrdinaryWorkspaceFromPersistence,
  document
}: WorkbenchTutorialActivationPorts) => {
  const adoptWorkbenchTutorialOwnership = async () => {
    if (window.hardSphereLabWindow || tutorialOwnershipAdoptionPendingRef.current) return;
    if (!tutorialActiveRef.current) {
      setRemoteTutorialOwnerActive(false);
      return;
    }
    const tutorialExperiment = experienceProfileRef.current.activeTutorialExperiment;
    if (!tutorialExperiment) return;
    if (filesRef.current.some((file) => isExperimentTutorialFileId(file.id, tutorialExperiment))) {
      setRemoteTutorialOwnerActive(false);
      return;
    }

    tutorialOwnershipAdoptionPendingRef.current = true;
    try {
      const ordinaryWorkspace = await refreshTutorialOrdinaryWorkspaceFromPersistence();
      if (document.visibilityState === 'hidden') return;
      if (!tutorialActiveRef.current) {
        setRemoteTutorialOwnerActive(false);
        return;
      }
      const stillOwnsTutorial = claimExperimentTutorialOwnership(
        EXPERIMENT_TUTORIAL_INSTANCE_ID,
        tutorialExperiment,
        window.localStorage,
      );
      if (!stillOwnsTutorial) {
        setRemoteTutorialOwnerActive(true);
        return;
      }

      const currentOrdinaryFile = filesRef.current.find((file) => (
        file.id === activeFileIdRef.current
      ));
      if (currentOrdinaryFile?.kind === 'heatCapacity') {
        suspendActiveHeatCapacityModeForNavigation();
      }
      tutorialOrdinaryWorkspaceRef.current = ordinaryWorkspace;
      const milestone = experienceProfileRef.current.learning[tutorialExperiment];
      replaceVisibleWorkspaceWithExperimentTutorial(tutorialExperiment, milestone);
      const nextNoticeKind: ExperimentTutorialNoticeKind = milestone === 'guide'
        ? 'resume-guide'
        : 'resume-demo';
      tutorialNoticeKindRef.current = nextNoticeKind;
      setTutorialNoticeKind(nextNoticeKind);
      setTutorialOperationError(null);
      setRemoteTutorialOwnerActive(false);
    } catch (cause) {
      try {
        releaseExperimentTutorialOwnership(
          EXPERIMENT_TUTORIAL_INSTANCE_ID,
          window.localStorage,
        );
      } catch {
        // The lease still expires automatically if browser storage is unavailable.
      }
      setRemoteTutorialOwnerActive(false);
      setTutorialOperationError({
        message: cause instanceof Error ? cause.message : String(cause),
        retry: () => tutorialOwnershipClaimRef.current(true),
      });
    } finally {
      tutorialOwnershipAdoptionPendingRef.current = false;
    }
  };
  const finalizeExperimentTutorialActivation = async (
    archivedNamespaces: string[],
  ) => {
    const saved = await flushWorkspacePersistenceRef.current();
    if (!saved) {
      setTutorialOperationError({
        message: settingsLanguagePreference === 'en'
          ? 'The saved experiment files could not be moved into the tutorial-safe cache yet.'
          : settingsLanguagePreference === 'zh-TW'
            ? '已儲存的實驗檔案尚未能移入教學安全快取。'
            : '已保存的实验文件尚未能移入教程安全缓存。',
        retry: () => { void finalizeExperimentTutorialActivation(archivedNamespaces); },
      });
      return false;
    }
    const finalizeActivation = window.hardSphereLabTutorial?.finalizeActivation;
    if (finalizeActivation) {
      const result = await finalizeActivation(archivedNamespaces).catch((cause) => ({
        status: 'error' as const,
        message: cause instanceof Error ? cause.message : String(cause),
      }));
      if (result.status !== 'ok') {
        setTutorialOperationError({
          message: result.message ?? 'Desktop tutorial archive could not be finalized.',
          retry: () => { void finalizeExperimentTutorialActivation(archivedNamespaces); },
        });
        return false;
      }
    }
    setTutorialOperationError(null);
    setTutorialNoticeKind('start-demo');
    return true;
  };
  const startExperimentLearningTutorial = async (
    experiment: ExperimentLearningId,
    sourceProfile: AppExperienceProfile = experienceProfileRef.current,
  ) => {
    if (tutorialActiveRef.current) return;
    const saved = await flushWorkspacePersistenceRef.current();
    if (!saved) {
      setTutorialOperationError({
        message: settingsLanguagePreference === 'en'
          ? 'The current workspace could not be saved. No learning progress was changed.'
          : settingsLanguagePreference === 'zh-TW'
            ? '目前工作區無法安全儲存，學習進度尚未變更。'
            : '当前工作区无法安全保存，学习进度尚未变更。',
        retry: () => { void startExperimentLearningTutorial(experiment, sourceProfile); },
      });
      return;
    }

    try {
      const claimed = claimExperimentTutorialOwnership(
        EXPERIMENT_TUTORIAL_INSTANCE_ID,
        experiment,
        window.localStorage,
      );
      if (!claimed) {
        setRemoteTutorialOwnerActive(true);
        return;
      }
    } catch (cause) {
      setTutorialOperationError({
        message: cause instanceof Error ? cause.message : String(cause),
        retry: () => { void startExperimentLearningTutorial(experiment, sourceProfile); },
      });
      return;
    }

    let archivedNamespaces: string[] = [];
    const desktopTutorialActivation = window.hardSphereLabTutorial?.activate?.();
    if (desktopTutorialActivation) {
      const activationResult = await desktopTutorialActivation.catch((cause) => ({
        status: 'error' as const,
        message: cause instanceof Error ? cause.message : String(cause),
      }));
      if (activationResult.status !== 'ok') {
        releaseExperimentTutorialOwnership(EXPERIMENT_TUTORIAL_INSTANCE_ID, window.localStorage);
        setTutorialOperationError({
          message: activationResult.message ?? 'Desktop tutorial lock could not be acquired.',
          retry: () => { void startExperimentLearningTutorial(experiment, sourceProfile); },
        });
        return;
      }
      archivedNamespaces = activationResult.archivedNamespaces ?? [];
    }

    const currentOrdinaryFile = filesRef.current.find((file) => (
      file.id === activeFileIdRef.current
    ));
    if (currentOrdinaryFile?.kind === 'heatCapacity') {
      suspendActiveHeatCapacityModeForNavigation();
    }
    const ordinaryWorkspace: TutorialOrdinaryWorkspace = {
      files: cloneWorkbenchFiles(filesRef.current),
      closedFiles: cloneWorkbenchFiles(closedFilesRef.current),
      activeFileId: activeFileIdRef.current,
      selectedPanel: selectedPanelRef.current,
    };
    let mergedOrdinaryWorkspace: TutorialOrdinaryWorkspace;
    try {
      mergedOrdinaryWorkspace = await mergeArchivedNamespacesIntoTutorialWorkspace(
        ordinaryWorkspace,
        archivedNamespaces,
      );
    } catch (cause) {
      void window.hardSphereLabTutorial?.deactivate?.();
      releaseExperimentTutorialOwnership(EXPERIMENT_TUTORIAL_INSTANCE_ID, window.localStorage);
      setTutorialOperationError({
        message: cause instanceof Error ? cause.message : String(cause),
        retry: () => { void startExperimentLearningTutorial(experiment, sourceProfile); },
      });
      return;
    }

    const nextProfile = startExperimentTutorialProfile(sourceProfile, experiment);
    if (!commitExperienceProfile(nextProfile)) {
      setTutorialOperationError((current) => current
        ? { ...current, retry: () => { void startExperimentLearningTutorial(experiment, sourceProfile); } }
        : current);
      void window.hardSphereLabTutorial?.deactivate?.();
      releaseExperimentTutorialOwnership(EXPERIMENT_TUTORIAL_INSTANCE_ID, window.localStorage);
      return;
    }

    tutorialOrdinaryWorkspaceRef.current = mergedOrdinaryWorkspace;
    setTutorialOperationError(null);
    setRemoteTutorialOwnerActive(false);
    hideGeneralSettings();
    replaceVisibleWorkspaceWithExperimentTutorial(experiment, 'demo');
    await finalizeExperimentTutorialActivation(archivedNamespaces);
  };
  return { finalizeExperimentTutorialActivation, startExperimentLearningTutorial, adoptWorkbenchTutorialOwnership };
};
