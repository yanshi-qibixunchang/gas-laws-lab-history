import { useEffect } from 'react';
import type { WorkbenchHeatEffect } from './workbenchHeatEffect.ts';

export function useWorkbenchHeatInitialDemoEffects(effects: {
  demoClock: WorkbenchHeatEffect;
}) {
  useEffect(effects.demoClock.run, effects.demoClock.dependencies);
}

export function useWorkbenchHeatPresentationEffects(effects: {
  pressureAlarmProjection: WorkbenchHeatEffect;
  guideFileProjection: WorkbenchHeatEffect;
  lessonDialogProjection: WorkbenchHeatEffect;
  lessonDialogFocus: WorkbenchHeatEffect;
  guideMaskObservation: WorkbenchHeatEffect;
  resetFeedbackCleanup: WorkbenchHeatEffect;
}) {
  useEffect(effects.pressureAlarmProjection.run, effects.pressureAlarmProjection.dependencies);
  useEffect(effects.guideFileProjection.run, effects.guideFileProjection.dependencies);
  useEffect(effects.lessonDialogProjection.run, effects.lessonDialogProjection.dependencies);
  useEffect(effects.lessonDialogFocus.run, effects.lessonDialogFocus.dependencies);
  useEffect(effects.guideMaskObservation.run, effects.guideMaskObservation.dependencies);
  useEffect(effects.resetFeedbackCleanup.run, effects.resetFeedbackCleanup.dependencies);
}

export function useWorkbenchHeatFreeWorkspaceEffects(effects: {
  batchSetupProjection: WorkbenchHeatEffect;
  calculationReviewProjection: WorkbenchHeatEffect;
}) {
  useEffect(effects.batchSetupProjection.run, effects.batchSetupProjection.dependencies);
  useEffect(effects.calculationReviewProjection.run, effects.calculationReviewProjection.dependencies);
}

export function useWorkbenchHeatParameterProjectionEffects(effects: {
  parameterProjection: WorkbenchHeatEffect;
}) {
  useEffect(effects.parameterProjection.run, effects.parameterProjection.dependencies);
}

export function useWorkbenchHeatParameterHelpEffects(effects: {
  parameterHelpPointer: WorkbenchHeatEffect;
  parameterHelpClick: WorkbenchHeatEffect;
}) {
  useEffect(effects.parameterHelpPointer.run, effects.parameterHelpPointer.dependencies);
  useEffect(effects.parameterHelpClick.run, effects.parameterHelpClick.dependencies);
}

export function useWorkbenchHeatRealtimeEffects(effects: {
  realtimeClock: WorkbenchHeatEffect;
}) {
  useEffect(effects.realtimeClock.run, effects.realtimeClock.dependencies);
}

export function useWorkbenchHeatTeachingEffects(effects: {
  teachingTimerCleanup: WorkbenchHeatEffect;
  lessonIntro: WorkbenchHeatEffect;
  checklistStepProjection: WorkbenchHeatEffect;
  lessonStepProjection: WorkbenchHeatEffect;
  checklistCleanup: WorkbenchHeatEffect;
  pumpTargetReset: WorkbenchHeatEffect;
  guideExitReset: WorkbenchHeatEffect;
  guideFileEntry: WorkbenchHeatEffect;
  guideFocusProjection: WorkbenchHeatEffect;
  guidePulse: WorkbenchHeatEffect;
  strongReminderProjection: WorkbenchHeatEffect;
  strongReminderTimer: WorkbenchHeatEffect;
  guideGuardFeedback: WorkbenchHeatEffect;
  pumpAnimationProjection: WorkbenchHeatEffect;
  modeTransitionCleanup: WorkbenchHeatEffect;
  modeSessionProjection: WorkbenchHeatEffect;
}) {
  useEffect(effects.teachingTimerCleanup.run, effects.teachingTimerCleanup.dependencies);
  useEffect(effects.lessonIntro.run, effects.lessonIntro.dependencies);
  useEffect(effects.checklistStepProjection.run, effects.checklistStepProjection.dependencies);
  useEffect(effects.lessonStepProjection.run, effects.lessonStepProjection.dependencies);
  useEffect(effects.checklistCleanup.run, effects.checklistCleanup.dependencies);
  useEffect(effects.pumpTargetReset.run, effects.pumpTargetReset.dependencies);
  useEffect(effects.guideExitReset.run, effects.guideExitReset.dependencies);
  useEffect(effects.guideFileEntry.run, effects.guideFileEntry.dependencies);
  useEffect(effects.guideFocusProjection.run, effects.guideFocusProjection.dependencies);
  useEffect(effects.guidePulse.run, effects.guidePulse.dependencies);
  useEffect(effects.strongReminderProjection.run, effects.strongReminderProjection.dependencies);
  useEffect(effects.strongReminderTimer.run, effects.strongReminderTimer.dependencies);
  useEffect(effects.guideGuardFeedback.run, effects.guideGuardFeedback.dependencies);
  useEffect(effects.pumpAnimationProjection.run, effects.pumpAnimationProjection.dependencies);
  useEffect(effects.modeTransitionCleanup.run, effects.modeTransitionCleanup.dependencies);
  useEffect(effects.modeSessionProjection.run, effects.modeSessionProjection.dependencies);
}

export function useWorkbenchHeatRestoreEffects(effects: {
  initialSceneRestore: WorkbenchHeatEffect;
  sceneRestoreAcknowledgement: WorkbenchHeatEffect;
  modeRuntimeResume: WorkbenchHeatEffect;
}) {
  useEffect(effects.initialSceneRestore.run, effects.initialSceneRestore.dependencies);
  useEffect(effects.sceneRestoreAcknowledgement.run, effects.sceneRestoreAcknowledgement.dependencies);
  useEffect(effects.modeRuntimeResume.run, effects.modeRuntimeResume.dependencies);
}

export function useWorkbenchHeatRecoveryEffects(effects: {
  runtimeRecovery: WorkbenchHeatEffect;
}) {
  useEffect(effects.runtimeRecovery.run, effects.runtimeRecovery.dependencies);
}
