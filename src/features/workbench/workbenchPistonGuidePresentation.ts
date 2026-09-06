import { type PromptViewportFeedbackMessage } from '../../components/prompts/promptViewportFeedbackController.ts';
import { type PistonOscillationShellCopy, type PistonOscillationGuideStrongTargetId } from '../pistonOscillation/index.ts';
import { type PistonOscillationGuideStep, PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM, type PistonOscillationGuideAction, type PistonOscillationGuideGuardResult } from '../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts';

export type PistonOscillationGuideLessonDialogState =
  | { kind: 'intro'; fileId: string; pageIndex: number; closing: boolean }
  | { kind: 'heightReset'; fileId: string; closing: boolean }
  | { kind: 'pressureRange'; fileId: string; closing: boolean }
  | { kind: 'lockingScrew'; fileId: string; closing: boolean }
  | { kind: 'multiPeriod'; fileId: string; closing: boolean }
  | { kind: 'freeReacquisition'; fileId: string; closing: boolean }
  | { kind: 'completion'; fileId: string; closing: boolean };

export type PistonOscillationGuidePressureIssue = 'underpressure' | 'overpressure';

export interface PistonOscillationGuideCompletionToastState {
  id: number;
  fileId: string;
  kicker: string;
  message: string;
}

export interface PistonOscillationGuideLessonView {
  key: string;
  title: string;
  body: string;
}

export type PistonOscillationGuideFeedbackSource = 'guide';

export type PistonOscillationGuideFeedbackState = PromptViewportFeedbackMessage<
  PistonOscillationGuideFeedbackSource
>;

export const getPistonOscillationGuideReminderText = (
  copy: PistonOscillationShellCopy,
  step: PistonOscillationGuideStep,
  measurementIndex: 0 | 1 | 2,
  targetId?: PistonOscillationGuideStrongTargetId | null,
): string => {
  const measurementNumber = measurementIndex + 1;
  const targetHeightMm = PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM[measurementIndex];
  if (targetId === 'powerButton' && step !== 'powerOn' && step !== 'powerOff') {
    return copy.guide.powerRequiredReminder;
  }
  switch (step) {
    case 'powerOn': return copy.guide.powerOnDetail;
    case 'parameterSetup': return copy.guide.parameterSetupDetail;
    case 'firstHeightAdjustment':
    case 'nextHeightAdjustment': return copy.guide.adjustHeightDetail(targetHeightMm);
    case 'screwLock': return copy.guide.lockScrewDetail;
    case 'hoseReconnect': return copy.guide.reconnectHoseDetail;
    case 'screwLoosen': return copy.guide.loosenScrewDetail;
    case 'acquisitionReady': return copy.guide.startAcquisitionDetail;
    case 'waitingTrigger': return copy.guide.releasePistonDetail;
    case 'recording': return copy.guide.recordingDetail;
    case 'pauseAvailable':
    case 'curveFrozen': return copy.guide.pauseRecordingDetail;
    case 'awaitingSaveOrRedo': return copy.guide.saveCurveDetail(measurementNumber);
    case 'crossRunDisconnect': return copy.guide.crossRunDisconnectDetail;
    case 'periodProcessing':
      if (targetId === 'periodTool') return copy.processing.selectionToolReminder;
      if (targetId === 'periodEndpoints') return copy.processing.endpointReminder;
      if (targetId === 'periodAnswer') return copy.processing.periodReminder;
      if (targetId === 'periodNext') return copy.processing.nextReminder;
      return copy.processing.selectionReminder;
    case 'powerOff': return copy.guide.powerOffDetail;
    case 'calculationReady': return copy.processing.calculationReady;
    case 'completionReview': return copy.guide.completedDetail;
    case 'completed': return copy.guide.completedDetail;
    default: return copy.guide.reminderBody;
  }
};

export const getPistonOscillationGuideGuardFeedbackText = (
  copy: PistonOscillationShellCopy,
  action: PistonOscillationGuideAction,
  guard: PistonOscillationGuideGuardResult,
  targetHeightMm: number,
) => {
  if (guard.reason === 'powerRequired') return copy.guide.powerRequiredReminder;
  if (guard.reason === 'wrongTargetHeight') {
    return copy.feedback.targetHeightRequired(targetHeightMm);
  }
  if (guard.reason === 'rightHandMustBeReleased') {
    return copy.feedback.releaseRightHandBeforeLock;
  }
  if (guard.reason === 'bothHandsRequired') return copy.feedback.bothHandsBeforePress;
  if (guard.reason === 'leftHandRequired') {
    return action === 'disconnectHose'
      ? copy.feedback.leftHandBeforeDisconnect
      : copy.feedback.leftHandBeforeLock;
  }
  return copy.feedback.wrongStep;
};
