import type { PromptNoticeRequest } from '../../components/prompts/PromptNoticeDialog.tsx';
import type { PromptForcedNoticeRequest } from '../../components/prompts/PromptNoticeDialog.tsx';
import type { PromptConfirmationRequest } from '../../components/prompts/PromptConfirmDialog.tsx';
import type { useWorkbenchTutorialState } from './useWorkbenchTutorialState.ts';
import type { EXPERIMENT_TUTORIAL_COPY } from './workbenchExperimentTutorialPresentation.ts';
import type { WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';
import type { ExperimentLearningId } from '../learning/experimentLearningModel.ts';
export type WorkbenchTutorialPromptModelInput = Pick<ReturnType<typeof useWorkbenchTutorialState>, 'tutorialNoticeKind' | 'tutorialBlockedNoticeOpen' | 'remoteTutorialOwnerActive' | 'tutorialOperationError'> & {
  activeTutorialExperiment: ExperimentLearningId | null;
  activeTutorialExperimentName: string;
  experimentTutorialCopy: (typeof EXPERIMENT_TUTORIAL_COPY)[WorkbenchLanguagePreference];
  settingsLanguagePreference: WorkbenchLanguagePreference;
  desktopWindowAvailable: boolean;
  reload: () => void;
};
export const deriveWorkbenchTutorialPromptModel = ({ tutorialNoticeKind, tutorialBlockedNoticeOpen, remoteTutorialOwnerActive, tutorialOperationError, activeTutorialExperiment, activeTutorialExperimentName, experimentTutorialCopy, settingsLanguagePreference, desktopWindowAvailable, reload }: WorkbenchTutorialPromptModelInput) => {
const tutorialMilestoneNoticeRequest: PromptNoticeRequest | null = tutorialNoticeKind
    ? {
        id: `experiment-tutorial:${activeTutorialExperiment ?? 'completed'}:${tutorialNoticeKind}`,
        tone: 'standard',
        eyebrow: activeTutorialExperimentName
          ? `${experimentTutorialCopy.resetEyebrow} · ${activeTutorialExperimentName}`
          : experimentTutorialCopy.resetEyebrow,
        title: tutorialNoticeKind === 'start-demo'
          ? experimentTutorialCopy.startDemoTitle
          : tutorialNoticeKind === 'resume-demo'
            ? experimentTutorialCopy.resumeDemoTitle
            : tutorialNoticeKind === 'guide-unlocked'
              ? experimentTutorialCopy.guideUnlockedTitle
              : tutorialNoticeKind === 'resume-guide'
                ? experimentTutorialCopy.resumeGuideTitle
                : experimentTutorialCopy.allUnlockedTitle,
        body: tutorialNoticeKind === 'start-demo'
          ? experimentTutorialCopy.startDemoBody
          : tutorialNoticeKind === 'resume-demo'
            ? experimentTutorialCopy.resumeDemoBody
            : tutorialNoticeKind === 'guide-unlocked'
              ? experimentTutorialCopy.guideUnlockedBody
              : tutorialNoticeKind === 'resume-guide'
                ? experimentTutorialCopy.resumeGuideBody
                : experimentTutorialCopy.allUnlockedBody,
        actionLabel: experimentTutorialCopy.acknowledge,
        closeLabel: experimentTutorialCopy.acknowledge,
        dismiss: { closeButton: false, escape: false, backdrop: true },
      }
    : null;
const tutorialBlockedNoticeRequest: PromptNoticeRequest | null = tutorialBlockedNoticeOpen
    ? {
        id: 'experiment-tutorial:blocked-action',
        tone: 'warning',
        eyebrow: experimentTutorialCopy.blockedEyebrow,
        title: experimentTutorialCopy.blockedTitle,
        body: experimentTutorialCopy.blockedBody,
        actionLabel: experimentTutorialCopy.acknowledge,
        closeLabel: experimentTutorialCopy.acknowledge,
        dismiss: { closeButton: true, escape: true, backdrop: true },
      }
    : null;
const remoteTutorialNoticeRequest: PromptForcedNoticeRequest | null = remoteTutorialOwnerActive
    ? {
        id: 'experiment-tutorial:remote-owner',
        tone: 'warning',
        eyebrow: experimentTutorialCopy.blockedEyebrow,
        title: experimentTutorialCopy.remoteTitle,
        body: desktopWindowAvailable
          ? experimentTutorialCopy.remoteBody
          : experimentTutorialCopy.browserRemoteBody,
        actionLabel: desktopWindowAvailable
          ? experimentTutorialCopy.recheck
          : experimentTutorialCopy.continueHere,
      }
    : null;
const tutorialFailureConfirmation: PromptConfirmationRequest | null = tutorialOperationError
    ? {
        id: 'experiment-tutorial:operation-failed',
        tone: 'warning',
        eyebrow: experimentTutorialCopy.blockedEyebrow,
        title: experimentTutorialCopy.operationFailedTitle,
        body: tutorialOperationError.message,
        consequence: settingsLanguagePreference === 'en'
          ? 'The app has not skipped or unlocked any unfinished learning milestone.'
          : settingsLanguagePreference === 'zh-TW'
            ? '軟體沒有跳過或解鎖任何尚未完成的學習節點。'
            : '软件没有跳过或解锁任何尚未完成的学习节点。',
        cancelLabel: settingsLanguagePreference === 'en' ? 'Exit app' : settingsLanguagePreference === 'zh-TW' ? '退出軟體' : '退出软件',
        confirmLabel: experimentTutorialCopy.retry,
        closeLabel: settingsLanguagePreference === 'en' ? 'Exit app' : settingsLanguagePreference === 'zh-TW' ? '退出軟體' : '退出软件',
        onConfirm: tutorialOperationError.retry ?? (() => reload()),
      }
    : null;
return { tutorialMilestoneNoticeRequest, tutorialBlockedNoticeRequest, remoteTutorialNoticeRequest, tutorialFailureConfirmation };
};
