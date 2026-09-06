import type { ExperimentFamiliarityAnswer } from '../onboarding/firstRunExperienceModel.ts';
import { EXPERIMENT_LEARNING_ORDER, skipExperimentTutorialProfile, type AppExperienceProfile, type ExperimentLearningId } from '../learning/experimentLearningModel.ts';
import { APP_EXPERIENCE_PROFILE_STORAGE_KEY } from '../learning/experimentLearningStore.ts';
import { clearExperimentTutorialHandoff } from '../learning/workbenchTutorialCoordinator.ts';
import type { WorkbenchTutorialAccessAction } from '../learning/workbenchTutorialAccessPolicy.ts';
import { EXPERIMENT_TUTORIAL_COPY } from './workbenchExperimentTutorialPresentation.ts';
import { firstRunCopies } from '../onboarding/firstRunCopy.ts';
import type { WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';
import type { PromptConfirmationRequest } from '../../components/prompts/PromptConfirmDialog.tsx';
import type { useWorkbenchTutorialState } from './useWorkbenchTutorialState.ts';
export type WorkbenchTutorialOverlayPorts = Pick<ReturnType<typeof useWorkbenchTutorialState>, 'experienceProfileRef' | 'learningNeedsDraft' | 'setProductIntroReplayPhase' | 'setLearningNeedsReselectOpen' | 'setLearningNeedsDraft' | 'setTutorialOperationError'> & {
  settingsLanguagePreference: WorkbenchLanguagePreference;
  guardWorkbenchTutorialAction: (action: WorkbenchTutorialAccessAction) => boolean;
  requestPromptConfirmation: (request: PromptConfirmationRequest) => void;
  startExperimentLearningTutorial: (experiment: ExperimentLearningId, profile?: AppExperienceProfile) => Promise<void>;
  exitExperimentLearningTutorial: () => Promise<boolean>;
  commitExperienceProfile: (profile: AppExperienceProfile) => boolean;
  prepareDesktopExitQuiescenceRef: { current: (blockInput?: boolean) => void };
  resumeDesktopExitQuiescenceRef: { current: () => void };
  flushWorkspacePersistenceRef: { current: () => Promise<boolean> };
  hideGeneralSettings: () => void;
  window: Window;
  isDevelopment: boolean;
};
export const createWorkbenchTutorialOverlayActions = ({
  experienceProfileRef,
  learningNeedsDraft,
  setProductIntroReplayPhase,
  setLearningNeedsReselectOpen,
  setLearningNeedsDraft,
  setTutorialOperationError,
  settingsLanguagePreference,
  guardWorkbenchTutorialAction,
  requestPromptConfirmation,
  startExperimentLearningTutorial,
  exitExperimentLearningTutorial,
  commitExperienceProfile,
  prepareDesktopExitQuiescenceRef,
  resumeDesktopExitQuiescenceRef,
  flushWorkspacePersistenceRef,
  hideGeneralSettings,
  window,
  isDevelopment
}: WorkbenchTutorialOverlayPorts) => {
  const updateLearningNeedsAnswer = (experiment: ExperimentLearningId, answer: ExperimentFamiliarityAnswer) => {
    setLearningNeedsDraft((current) => ({ ...current, [experiment]: answer }));
  };
  const requestResetExperimentLearning = (experiment: ExperimentLearningId) => {
    if (!guardWorkbenchTutorialAction('reset-learning')) return;
    const copy = EXPERIMENT_TUTORIAL_COPY[settingsLanguagePreference];
    const experimentName = firstRunCopies[settingsLanguagePreference].needs.experimentNames[experiment];
    requestPromptConfirmation({
      id: `reset-${experiment}-learning-progress`,
      tone: 'warning',
      eyebrow: copy.resetEyebrow,
      title: settingsLanguagePreference === 'en'
        ? `Restart the ${experimentName} learning flow?`
        : settingsLanguagePreference === 'zh-TW'
          ? `重新開始「${experimentName}」學習流程？`
          : `重新开始“${experimentName}”学习流程？`,
      body: copy.resetBody,
      consequence: copy.resetConsequence,
      cancelLabel: copy.cancel,
      confirmLabel: copy.confirmReset,
      closeLabel: copy.cancel,
      onConfirm: () => { void startExperimentLearningTutorial(experiment); },
    });
  };
  const closeLearningExperienceOverlay = () => {
    setProductIntroReplayPhase(null);
    setLearningNeedsReselectOpen(false);
    setLearningNeedsDraft({ heatCapacity: null, pistonOscillation: null });
    resumeDesktopExitQuiescenceRef.current();
  };
  const openProductIntroReplay = () => {
    if (!guardWorkbenchTutorialAction('replay-product-intro')) return;
    prepareDesktopExitQuiescenceRef.current(false);
    hideGeneralSettings();
    setLearningNeedsReselectOpen(false);
    setProductIntroReplayPhase('welcome');
  };
  const openLearningNeedsReselect = () => {
    if (!guardWorkbenchTutorialAction('reselect-learning-needs')) return;
    prepareDesktopExitQuiescenceRef.current(false);
    hideGeneralSettings();
    setProductIntroReplayPhase(null);
    const profile = experienceProfileRef.current;
    setLearningNeedsDraft({
      heatCapacity: profile.needs.heatCapacity,
      pistonOscillation: profile.needs.pistonOscillation,
    });
    setLearningNeedsReselectOpen(true);
  };
  const submitLearningNeedsReselect = () => {
    if (Object.values(learningNeedsDraft).some((answer) => answer === null)) return;
    const current = experienceProfileRef.current;
    const nextProfile: AppExperienceProfile = {
      ...current,
      needs: {
        ...current.needs,
        heatCapacity: learningNeedsDraft.heatCapacity,
        pistonOscillation: learningNeedsDraft.pistonOscillation,
      },
      learning: {
        heatCapacity: learningNeedsDraft.heatCapacity === 'known' ? 'unlocked' : 'demo',
        pistonOscillation: learningNeedsDraft.pistonOscillation === 'known' ? 'unlocked' : 'demo',
      },
      activeTutorialExperiment: null,
    };
    const firstTutorialExperiment = EXPERIMENT_LEARNING_ORDER.find((experiment) => (
      nextProfile.needs[experiment] === 'needs-guidance'
    )) ?? null;
    if (!firstTutorialExperiment) {
      if (commitExperienceProfile(nextProfile)) closeLearningExperienceOverlay();
      return;
    }

    const copy = EXPERIMENT_TUTORIAL_COPY[settingsLanguagePreference];
    requestPromptConfirmation({
      id: 'reselect-experiment-learning-needs',
      tone: 'warning',
      eyebrow: copy.resetEyebrow,
      title: settingsLanguagePreference === 'en'
        ? 'Start the selected learning flows?'
        : settingsLanguagePreference === 'zh-TW'
          ? '開始所選的學習流程？'
          : '开始所选的学习流程？',
      body: copy.resetBody,
      consequence: copy.resetConsequence,
      cancelLabel: copy.cancel,
      confirmLabel: copy.confirmReset,
      closeLabel: copy.cancel,
      onConfirm: () => {
        closeLearningExperienceOverlay();
        void startExperimentLearningTutorial(firstTutorialExperiment, nextProfile);
      },
    });
  };
  const requestSimulateFirstRun = () => {
    if (!isDevelopment || !guardWorkbenchTutorialAction('reset-learning')) return;
    const copy = EXPERIMENT_TUTORIAL_COPY[settingsLanguagePreference];
    requestPromptConfirmation({
      id: 'simulate-first-run-experience',
      tone: 'warning',
      eyebrow: copy.resetEyebrow,
      title: copy.simulateFirstRunTitle,
      body: copy.simulateFirstRunBody,
      consequence: copy.resetConsequence,
      cancelLabel: copy.cancel,
      confirmLabel: copy.confirmSimulateFirstRun,
      closeLabel: copy.cancel,
      onConfirm: () => {
        const simulate = async () => {
          hideGeneralSettings();
          prepareDesktopExitQuiescenceRef.current();
          const saved = await flushWorkspacePersistenceRef.current();
          if (!saved) {
            resumeDesktopExitQuiescenceRef.current();
            setTutorialOperationError({
              message: settingsLanguagePreference === 'en'
                ? 'The current workspace could not be saved. First-run state was not changed.'
                : settingsLanguagePreference === 'zh-TW'
                  ? '目前工作區無法安全儲存，首次啟動狀態尚未變更。'
                  : '当前工作区无法安全保存，首次启动状态尚未变更。',
              retry: () => { void simulate(); },
            });
            return;
          }
          try {
            window.localStorage.removeItem(APP_EXPERIENCE_PROFILE_STORAGE_KEY);
            const handoffClear = clearExperimentTutorialHandoff(window.localStorage);
            if (handoffClear.ok === false) throw handoffClear.error;
            window.location.reload();
          } catch (cause) {
            resumeDesktopExitQuiescenceRef.current();
            setTutorialOperationError({
              message: cause instanceof Error ? cause.message : String(cause),
              retry: () => { void simulate(); },
            });
          }
        };
        void simulate();
      },
    });
  };
  const requestExitExperimentLearningTutorial = () => {
    if (!guardWorkbenchTutorialAction('exit-tutorial')) return;
    const copy = EXPERIMENT_TUTORIAL_COPY[settingsLanguagePreference];
    const experiment = experienceProfileRef.current.activeTutorialExperiment;
    const experimentName = experiment
      ? firstRunCopies[settingsLanguagePreference].needs.experimentNames[experiment]
      : '';
    const exitPreview = experiment
      ? skipExperimentTutorialProfile(experienceProfileRef.current, experiment)
      : null;
    const nextTutorialExperiment = exitPreview?.activeTutorialExperiment ?? null;
    const nextExperimentName = nextTutorialExperiment
      ? firstRunCopies[settingsLanguagePreference].needs.experimentNames[nextTutorialExperiment]
      : null;
    requestPromptConfirmation({
      id: 'exit-experiment-learning-tutorial',
      tone: 'warning',
      eyebrow: copy.resetEyebrow,
      title: settingsLanguagePreference === 'en'
        ? `Exit the ${experimentName} learning flow?`
        : settingsLanguagePreference === 'zh-TW'
          ? `退出「${experimentName}」學習流程？`
          : `退出“${experimentName}”学习流程？`,
      body: nextExperimentName
        ? settingsLanguagePreference === 'en'
          ? `This tutorial will end and all ${experimentName} modes will unlock. The ${nextExperimentName} tutorial will begin next.`
          : settingsLanguagePreference === 'zh-TW'
            ? `目前教學將結束並解鎖「${experimentName}」的全部模式，接著開始「${nextExperimentName}」教學。`
            : `当前教程将结束并解锁“${experimentName}”的全部模式，随后开始“${nextExperimentName}”教程。`
        : copy.exitTutorialBody,
      consequence: nextExperimentName
        ? settingsLanguagePreference === 'en'
          ? 'Existing files remain safe and will become available after the remaining learning flow ends.'
          : settingsLanguagePreference === 'zh-TW'
            ? '現有檔案不會遺失，完成剩餘學習流程後即可重新開啟。'
            : '现有文件不会丢失，完成剩余学习流程后即可重新打开。'
        : copy.exitTutorialConsequence,
      cancelLabel: copy.cancel,
      confirmLabel: nextExperimentName
        ? settingsLanguagePreference === 'en'
          ? 'Exit and continue'
          : settingsLanguagePreference === 'zh-TW'
            ? '退出並繼續'
            : '退出并继续'
        : copy.confirmExitTutorial,
      closeLabel: copy.cancel,
      onConfirm: () => { void exitExperimentLearningTutorial(); },
    });
  };
  return { updateLearningNeedsAnswer, requestResetExperimentLearning, closeLearningExperienceOverlay, openProductIntroReplay, openLearningNeedsReselect, submitLearningNeedsReselect, requestSimulateFirstRun, requestExitExperimentLearningTutorial };
};
