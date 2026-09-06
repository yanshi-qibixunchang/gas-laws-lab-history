import type { AppExperienceProfile } from '../learning/experimentLearningModel.ts';
import { type ConsoleLog } from './workbenchConsolePresentation.ts';
import { createExperimentTutorialLogs } from './workbenchExperimentTutorialPresentation.ts';
import { useEffect } from 'react';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import { type WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';
import { unlockExperimentGuideProfile, type ExperimentLearningId } from '../learning/experimentLearningModel.ts';
import { isExperimentTutorialFileId } from '../learning/workbenchTutorialCoordinator.ts';
import type { useWorkbenchTutorialState } from './useWorkbenchTutorialState.ts';

export type WorkbenchTutorialProgressPorts = Pick<ReturnType<typeof useWorkbenchTutorialState>, 'tutorialNoticeKindRef' | 'setTutorialNoticeKind' | 'experienceProfileRef' | 'setTutorialOperationError' | 'tutorialGuideUnlockPendingRef' | 'tutorialActive' | 'activeTutorialExperiment' | 'experienceProfile'> & {
  commitExperienceProfile: (profile: AppExperienceProfile) => boolean;
  setLogs: (logs: ConsoleLog[]) => void;
  settingsLanguagePreference: WorkbenchLanguagePreference;
  activateHeatCapacityModeFromExplore: (mode: 'demo' | 'guide') => void;
  activatePistonOscillationTutorialMode: (mode: 'demo' | 'guide') => void;
  switchHeatCapacityMode: (mode: 'guide', source: 'mode-control', confirmed: true) => void;
  activeFile: WorkbenchFileState;
  heatCapacityModeTransitionState: { phase: string };
  completeExperimentLearningTutorial: (experiment: ExperimentLearningId) => Promise<boolean>;
  window: Window;
};
export const useWorkbenchTutorialProgress = ({
  tutorialNoticeKindRef,
  setTutorialNoticeKind,
  experienceProfileRef,
  setTutorialOperationError,
  tutorialGuideUnlockPendingRef,
  tutorialActive,
  activeTutorialExperiment,
  experienceProfile,
  commitExperienceProfile,
  setLogs,
  settingsLanguagePreference,
  activateHeatCapacityModeFromExplore,
  activatePistonOscillationTutorialMode,
  switchHeatCapacityMode,
  activeFile,
  heatCapacityModeTransitionState,
  completeExperimentLearningTutorial,
  window
}: WorkbenchTutorialProgressPorts) => {
  const handleExperimentTutorialNoticeAction = () => {
    const noticeKind = tutorialNoticeKindRef.current;
    if (!noticeKind) return;
    tutorialNoticeKindRef.current = null;
    setTutorialNoticeKind(null);
    const experiment = experienceProfileRef.current.activeTutorialExperiment;
    if (!experiment) return;
    if (noticeKind === 'start-demo' || noticeKind === 'resume-demo') {
      window.requestAnimationFrame(() => {
        if (experiment === 'heatCapacity') activateHeatCapacityModeFromExplore('demo');
        else activatePistonOscillationTutorialMode('demo');
      });
      return;
    }
    if (noticeKind === 'resume-guide') {
      window.requestAnimationFrame(() => {
        if (experiment === 'heatCapacity') activateHeatCapacityModeFromExplore('guide');
        else activatePistonOscillationTutorialMode('guide');
      });
    }
  };
  const advanceExperimentTutorialToGuide = (experiment: ExperimentLearningId) => {
    const currentProfile = experienceProfileRef.current;
    const guideProfile = unlockExperimentGuideProfile(currentProfile, experiment);
    if (!guideProfile) return;
    if (!commitExperienceProfile(guideProfile)) {
      setTutorialOperationError((current) => current
        ? { ...current, retry: () => advanceExperimentTutorialToGuide(experiment) }
        : current);
      return;
    }
    setLogs(createExperimentTutorialLogs('guide', settingsLanguagePreference));
    tutorialGuideUnlockPendingRef.current = true;
    if (experiment === 'heatCapacity') {
      switchHeatCapacityMode('guide', 'mode-control', true);
    } else {
      activatePistonOscillationTutorialMode('guide');
    }
  };
  useEffect(() => {
    if (!tutorialActive) return;
    if (activeTutorialExperiment !== 'heatCapacity') return;
    if (experienceProfile.learning.heatCapacity !== 'demo') return;
    if (!isExperimentTutorialFileId(activeFile.id, 'heatCapacity')) return;
    if (activeFile.kind !== 'heatCapacity' || activeFile.heatCapacityMode !== 'demo') return;
    if (activeFile.heatCapacityTeachingStatus !== 'completed') return;
    advanceExperimentTutorialToGuide('heatCapacity');
  }, [
    activeFile.id,
    activeFile.kind,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityTeachingStatus : null,
    experienceProfile.learning.heatCapacity,
    activeTutorialExperiment,
    tutorialActive,
  ]);
  useEffect(() => {
    if (!tutorialActive || activeTutorialExperiment !== 'pistonOscillation') return;
    if (experienceProfile.learning.pistonOscillation !== 'demo') return;
    if (!isExperimentTutorialFileId(activeFile.id, 'pistonOscillation')) return;
    if (
      activeFile.kind !== 'heatCapacityPistonOscillation' ||
      activeFile.pistonOscillationDemoSession.status !== 'completed'
    ) return;
    advanceExperimentTutorialToGuide('pistonOscillation');
  }, [
    activeFile.id,
    activeFile.kind,
    activeFile.kind === 'heatCapacityPistonOscillation'
      ? activeFile.pistonOscillationDemoSession.status
      : null,
    activeTutorialExperiment,
    experienceProfile.learning.pistonOscillation,
    tutorialActive,
  ]);
  useEffect(() => {
    if (!tutorialGuideUnlockPendingRef.current) return;
    if (!tutorialActive || activeTutorialExperiment === null) return;
    if (experienceProfile.learning[activeTutorialExperiment] !== 'guide') return;
    if (activeTutorialExperiment === 'heatCapacity') {
      if (activeFile.kind !== 'heatCapacity' || activeFile.heatCapacityMode !== 'guide') return;
      if (heatCapacityModeTransitionState.phase !== 'idle') return;
    } else if (
      activeFile.kind !== 'heatCapacityPistonOscillation' ||
      activeFile.pistonOscillationGuideSession.status !== 'active'
    ) return;
    tutorialGuideUnlockPendingRef.current = false;
    tutorialNoticeKindRef.current = 'guide-unlocked';
    setTutorialNoticeKind('guide-unlocked');
  }, [
    activeFile.id,
    activeFile.kind,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null,
    activeFile.kind === 'heatCapacityPistonOscillation'
      ? activeFile.pistonOscillationGuideSession.status
      : null,
    activeTutorialExperiment,
    experienceProfile.learning.heatCapacity,
    experienceProfile.learning.pistonOscillation,
    heatCapacityModeTransitionState.phase,
    tutorialActive,
  ]);
  useEffect(() => {
    if (!tutorialActive || activeTutorialExperiment !== 'pistonOscillation') return;
    if (experienceProfile.learning.pistonOscillation !== 'guide') return;
    if (!isExperimentTutorialFileId(activeFile.id, 'pistonOscillation')) return;
    if (
      activeFile.kind !== 'heatCapacityPistonOscillation' ||
      activeFile.pistonOscillationGuideSession.status !== 'completed'
    ) return;
    void completeExperimentLearningTutorial('pistonOscillation');
  }, [
    activeFile.id,
    activeFile.kind,
    activeFile.kind === 'heatCapacityPistonOscillation'
      ? activeFile.pistonOscillationGuideSession.status
      : null,
    activeTutorialExperiment,
    experienceProfile.learning.pistonOscillation,
    tutorialActive,
  ]);
  return { handleExperimentTutorialNoticeAction };
};
