import { isExperimentTutorialActive } from '../learning/experimentLearningModel.ts';
import { claimExperimentTutorialOwnership, createExperimentLearningChannel, EXPERIMENT_TUTORIAL_OWNER_STORAGE_KEY, releaseExperimentTutorialOwnership, takeOverExperimentTutorialOwnership } from '../learning/experimentLearningChannel.ts';
import { isExperimentTutorialFileId } from '../learning/workbenchTutorialCoordinator.ts';
import { cloneWorkbenchFiles } from './workbenchFileSnapshot.ts';
import { mergeArchivedNamespacesIntoTutorialWorkspace, type TutorialOrdinaryWorkspace } from './workbenchExperimentTutorialWorkspace.ts';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import type { WorkbenchPanelKey } from './workbenchFileState.ts';
import type { useWorkbenchTutorialState } from './useWorkbenchTutorialState.ts';

export type WorkbenchTutorialOwnershipPorts = Pick<ReturnType<typeof useWorkbenchTutorialState>, 'tutorialActiveRef' | 'experienceProfileRef' | 'setRemoteTutorialOwnerActive' | 'tutorialOwnershipAdoptionRef' | 'setTutorialOperationError' | 'tutorialOwnershipClaimRef' | 'tutorialOrdinaryWorkspaceRef' | 'setExperienceProfile' | 'experimentLearningChannelRef' | 'setTutorialNoticeKind'> & {
  filesRef: { current: WorkbenchFileState[] };
  closedFilesRef: { current: WorkbenchFileState[] };
  activeFileIdRef: { current: string };
  selectedPanelRef: { current: WorkbenchPanelKey };
  refreshTutorialOrdinaryWorkspaceFromPersistence: () => Promise<TutorialOrdinaryWorkspace>;
  flushWorkspacePersistenceRef: { current: () => Promise<boolean> };
  initialTutorialEntryKind: 'start' | 'resume';
  EXPERIMENT_TUTORIAL_INSTANCE_ID: string;
  window: Window;
  document: Document;
};
const defaultOwnershipAdapters = { claimExperimentTutorialOwnership, createExperimentLearningChannel, releaseExperimentTutorialOwnership, takeOverExperimentTutorialOwnership, mergeArchivedNamespacesIntoTutorialWorkspace };
export const connectWorkbenchTutorialOwnership = ({
  tutorialActiveRef,
  experienceProfileRef,
  setRemoteTutorialOwnerActive,
  tutorialOwnershipAdoptionRef,
  setTutorialOperationError,
  tutorialOwnershipClaimRef,
  tutorialOrdinaryWorkspaceRef,
  setExperienceProfile,
  experimentLearningChannelRef,
  setTutorialNoticeKind,
  filesRef,
  closedFilesRef,
  activeFileIdRef,
  selectedPanelRef,
  refreshTutorialOrdinaryWorkspaceFromPersistence,
  flushWorkspacePersistenceRef,
  initialTutorialEntryKind,
  EXPERIMENT_TUTORIAL_INSTANCE_ID,
  window,
  document
}: WorkbenchTutorialOwnershipPorts, { claimExperimentTutorialOwnership, createExperimentLearningChannel, releaseExperimentTutorialOwnership, takeOverExperimentTutorialOwnership, mergeArchivedNamespacesIntoTutorialWorkspace } = defaultOwnershipAdapters) => {
  const browserOwnership = !window.hardSphereLabWindow;
  const releaseOwnership = () => {
    try {
      releaseExperimentTutorialOwnership(
        EXPERIMENT_TUTORIAL_INSTANCE_ID,
        window.localStorage,
      );
    } catch {
      // Ownership expires automatically if the page terminates abruptly.
    }
  };
  const claimCurrentTutorial = (force = false) => {
    if (!tutorialActiveRef.current) {
      setRemoteTutorialOwnerActive(false);
      return;
    }
    const tutorialExperiment = experienceProfileRef.current.activeTutorialExperiment;
    if (!tutorialExperiment) return;
    const ownsVisibleTutorial = filesRef.current.some((file) => (
      isExperimentTutorialFileId(file.id, tutorialExperiment)
    ));
    if (!browserOwnership && !ownsVisibleTutorial) return;
    try {
      const claimed = force
        ? takeOverExperimentTutorialOwnership(
            EXPERIMENT_TUTORIAL_INSTANCE_ID,
            tutorialExperiment,
            window.localStorage,
          )
        : claimExperimentTutorialOwnership(
            EXPERIMENT_TUTORIAL_INSTANCE_ID,
            tutorialExperiment,
            window.localStorage,
          );
      if (!claimed) {
        setRemoteTutorialOwnerActive(true);
        return;
      }
      if (browserOwnership) {
        void tutorialOwnershipAdoptionRef.current();
      } else {
        setRemoteTutorialOwnerActive(false);
      }
    } catch (cause) {
      setTutorialOperationError({
        message: cause instanceof Error ? cause.message : String(cause),
        retry: () => claimCurrentTutorial(force),
      });
    }
  };
  tutorialOwnershipClaimRef.current = claimCurrentTutorial;
  const channel = createExperimentLearningChannel(
    EXPERIMENT_TUTORIAL_INSTANCE_ID,
    ({ profile }) => {
      const externalTutorialActive = isExperimentTutorialActive(profile);
      const ownsVisibleTutorial = filesRef.current.some((file) => (
        isExperimentTutorialFileId(file.id, profile.activeTutorialExperiment)
      ));
      experienceProfileRef.current = profile;
      tutorialActiveRef.current = externalTutorialActive;
      if (
        browserOwnership &&
        externalTutorialActive &&
        !ownsVisibleTutorial &&
        !tutorialOrdinaryWorkspaceRef.current
      ) {
        tutorialOrdinaryWorkspaceRef.current = {
          files: cloneWorkbenchFiles(filesRef.current),
          closedFiles: cloneWorkbenchFiles(closedFilesRef.current),
          activeFileId: activeFileIdRef.current,
          selectedPanel: selectedPanelRef.current,
        };
        void refreshTutorialOrdinaryWorkspaceFromPersistence().catch(() => {
          // A takeover retries this authoritative read and reports any failure then.
        });
      }
      setExperienceProfile(profile);
      if (externalTutorialActive && !ownsVisibleTutorial) {
        setRemoteTutorialOwnerActive(true);
        claimCurrentTutorial();
      } else if (!externalTutorialActive) {
        setRemoteTutorialOwnerActive(false);
      }
    },
  );
  experimentLearningChannelRef.current = channel;
  claimCurrentTutorial();
  if (
    tutorialActiveRef.current &&
    filesRef.current.some((file) => (
      isExperimentTutorialFileId(
        file.id,
        experienceProfileRef.current.activeTutorialExperiment,
      )
    ))
  ) {
    void window.hardSphereLabTutorial?.activate?.()
      .then(async (result) => {
        if (result.status === 'ok') {
          const archivedNamespaces = result.archivedNamespaces ?? [];
          try {
            const ordinaryWorkspace = tutorialOrdinaryWorkspaceRef.current;
            if (!ordinaryWorkspace) {
              throw new Error('The tutorial-safe workspace cache is unavailable.');
            }
            tutorialOrdinaryWorkspaceRef.current =
              await mergeArchivedNamespacesIntoTutorialWorkspace(
                ordinaryWorkspace,
                archivedNamespaces,
              );
            const saved = await flushWorkspacePersistenceRef.current();
            if (!saved) {
              throw new Error('The saved experiment files could not be moved into the tutorial-safe cache.');
            }
            const finalized = await window.hardSphereLabTutorial?.finalizeActivation?.(
              archivedNamespaces,
            );
            if (finalized && finalized.status !== 'ok') {
              throw new Error(finalized.message ?? 'Desktop tutorial archive could not be finalized.');
            }
            setTutorialNoticeKind(
              initialTutorialEntryKind === 'start' &&
              experienceProfileRef.current.activeTutorialExperiment !== null &&
              experienceProfileRef.current.learning[
                experienceProfileRef.current.activeTutorialExperiment
              ] === 'demo'
                ? 'start-demo'
                : experienceProfileRef.current.activeTutorialExperiment !== null &&
                  experienceProfileRef.current.learning[
                    experienceProfileRef.current.activeTutorialExperiment
                  ] === 'guide'
                  ? 'resume-guide'
                  : 'resume-demo',
            );
          } catch (cause) {
            setTutorialOperationError({
              message: cause instanceof Error ? cause.message : String(cause),
              retry: () => window.location.reload(),
            });
          }
          return;
        }
        if (result.status === 'blocked') {
          setRemoteTutorialOwnerActive(true);
          return;
        }
        setTutorialOperationError({
          message: result.message ?? 'Desktop tutorial lock could not be restored.',
          retry: () => window.location.reload(),
        });
      })
      .catch((cause) => {
        setTutorialOperationError({
          message: cause instanceof Error ? cause.message : String(cause),
          retry: () => window.location.reload(),
        });
      });
  }
  const heartbeatId = window.setInterval(claimCurrentTutorial, 5_000);
  const handleOwnerStorage = (event: StorageEvent) => {
    if (event.key !== EXPERIMENT_TUTORIAL_OWNER_STORAGE_KEY) return;
    claimCurrentTutorial();
  };
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') claimCurrentTutorial();
  };
  const handlePageShow = () => claimCurrentTutorial();
  if (browserOwnership) {
    window.addEventListener('storage', handleOwnerStorage);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);
  }
  window.addEventListener('pagehide', releaseOwnership);
  return () => {
    window.clearInterval(heartbeatId);
    if (browserOwnership) {
      window.removeEventListener('storage', handleOwnerStorage);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    }
    window.removeEventListener('pagehide', releaseOwnership);
    releaseOwnership();
    channel.close();
    if (tutorialOwnershipClaimRef.current === claimCurrentTutorial) {
      tutorialOwnershipClaimRef.current = () => undefined;
    }
    if (experimentLearningChannelRef.current === channel) {
      experimentLearningChannelRef.current = null;
    }
  };
};
