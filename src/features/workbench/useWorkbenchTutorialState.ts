import { createWorkbenchTutorialOrdinaryWorkspaceActions } from './workbenchTutorialOrdinaryWorkspace.ts';
import { useRef, useState } from 'react';
import { isExperimentTutorialActive, type AppExperienceProfile, type ExperimentLearningId } from '../learning/experimentLearningModel.ts';
import { createExperimentLearningChannel } from '../learning/experimentLearningChannel.ts';
import type { ExperimentFamiliarityAnswer } from '../onboarding/firstRunExperienceModel.ts';
import type { ExperimentTutorialNoticeKind } from './workbenchExperimentTutorialPresentation.ts';
import type { TutorialOrdinaryWorkspace } from './workbenchExperimentTutorialWorkspace.ts';
import type { useWorkbenchInitialWorkspace } from './useWorkbenchInitialWorkspace.ts';

export type WorkbenchTutorialInitialState = Pick<ReturnType<typeof useWorkbenchInitialWorkspace>, 'initialExperienceProfileLoad' | 'initialTutorialReconstruction' | 'initialTutorialHandoffRecovery' | 'initialActiveTutorialExperiment' | 'initialOrdinarySession' | 'initialOrdinaryClosedFiles'> & { initialTutorialEntryKind: 'start' | 'resume' };
export const useWorkbenchTutorialState = ({ initialExperienceProfileLoad, initialTutorialReconstruction, initialTutorialHandoffRecovery, initialActiveTutorialExperiment, initialOrdinarySession, initialOrdinaryClosedFiles, initialTutorialEntryKind }: WorkbenchTutorialInitialState) => {
  const [experienceProfile, setExperienceProfile] = useState<AppExperienceProfile>(
    initialExperienceProfileLoad.profile,
  );
  const [tutorialNoticeKind, setTutorialNoticeKind] = useState<ExperimentTutorialNoticeKind | null>(() => {
    if (initialTutorialHandoffRecovery) return null;
    if (!initialTutorialReconstruction) return null;
    if (window.hardSphereLabTutorial) return null;
    if (
      initialTutorialEntryKind === 'start' &&
      initialActiveTutorialExperiment !== null &&
      initialExperienceProfileLoad.profile.learning[initialActiveTutorialExperiment] === 'demo'
    ) return 'start-demo';
    return initialActiveTutorialExperiment !== null &&
      initialExperienceProfileLoad.profile.learning[initialActiveTutorialExperiment] === 'guide'
      ? 'resume-guide'
      : 'resume-demo';
  });
  const tutorialNoticeKindRef = useRef<ExperimentTutorialNoticeKind | null>(tutorialNoticeKind);
  const [tutorialBlockedNoticeOpen, setTutorialBlockedNoticeOpen] = useState(false);
  const [remoteTutorialOwnerActive, setRemoteTutorialOwnerActive] = useState(false);
  const [productIntroReplayPhase, setProductIntroReplayPhase] = useState<'welcome' | 'product' | null>(null);
  const [learningNeedsReselectOpen, setLearningNeedsReselectOpen] = useState(false);
  const [learningNeedsDraft, setLearningNeedsDraft] = useState<Record<ExperimentLearningId, ExperimentFamiliarityAnswer | null>>({
    heatCapacity: null,
    pistonOscillation: null,
  });
  const [tutorialOperationError, setTutorialOperationError] = useState<{
    message: string;
    retry: (() => void) | null;
  } | null>(null);
  const tutorialGuideUnlockPendingRef = useRef(false);
  const experienceProfileRef = useRef(experienceProfile);
  const experienceProfilePersistedRef = useRef(initialExperienceProfileLoad.persisted);
  const activeTutorialExperiment = experienceProfile.activeTutorialExperiment;
  const tutorialActive = isExperimentTutorialActive(experienceProfile);
  const tutorialActiveRef = useRef(tutorialActive);
  const tutorialOrdinaryWorkspaceRef = useRef<TutorialOrdinaryWorkspace | null>(
    initialTutorialReconstruction
      ? {
          files: initialOrdinarySession.files,
          closedFiles: initialOrdinaryClosedFiles,
          activeFileId: initialOrdinarySession.activeFileId,
          selectedPanel: initialOrdinarySession.selectedPanel,
        }
      : null,
  );
  const experimentLearningChannelRef = useRef<ReturnType<typeof createExperimentLearningChannel> | null>(null);
  const tutorialOwnershipAdoptionPendingRef = useRef(false);
  const tutorialOwnershipAdoptionRef = useRef<() => Promise<void>>(async () => undefined);
  const tutorialOwnershipClaimRef = useRef<(force?: boolean) => void>(() => undefined);
  const tutorialOrdinaryWorkspaceRefreshRef = useRef<Promise<TutorialOrdinaryWorkspace> | null>(null);
  const { refreshTutorialOrdinaryWorkspaceFromPersistence } = createWorkbenchTutorialOrdinaryWorkspaceActions({ tutorialOrdinaryWorkspaceRef, tutorialOrdinaryWorkspaceRefreshRef });
  return {
    refreshTutorialOrdinaryWorkspaceFromPersistence,
    experienceProfile,
    setExperienceProfile,
    tutorialNoticeKind,
    setTutorialNoticeKind,
    tutorialNoticeKindRef,
    tutorialBlockedNoticeOpen,
    setTutorialBlockedNoticeOpen,
    remoteTutorialOwnerActive,
    setRemoteTutorialOwnerActive,
    productIntroReplayPhase,
    setProductIntroReplayPhase,
    learningNeedsReselectOpen,
    setLearningNeedsReselectOpen,
    learningNeedsDraft,
    setLearningNeedsDraft,
    tutorialOperationError,
    setTutorialOperationError,
    tutorialGuideUnlockPendingRef,
    experienceProfileRef,
    experienceProfilePersistedRef,
    activeTutorialExperiment,
    tutorialActive,
    tutorialActiveRef,
    tutorialOrdinaryWorkspaceRef,
    experimentLearningChannelRef,
    tutorialOwnershipAdoptionPendingRef,
    tutorialOwnershipAdoptionRef,
    tutorialOwnershipClaimRef,
    tutorialOrdinaryWorkspaceRefreshRef
  };
};
