import type { WorkbenchHeatEffect } from './workbenchHeatEffect.ts';

import React from 'react';








export interface useWorkbenchHeatRuntimeLifecyclePorts {
  demoRuntime: {
    clearHeatCapacityAutoDemoTimers: () => void;
  };
  pump: {
    clearHeatCapacityPumpAnimationTimers: () => void;
  };
  feedback: {
    heatCapacityToastTimerRef: React.MutableRefObject<number | null>;
    heatCapacityPressureAlarmTimerRef: React.MutableRefObject<number | null>;
    heatCapacityPressureAlarmTimerGenerationRef: React.MutableRefObject<number>;
    heatCapacityPressureAlarmDeadlineAtMsRef: React.MutableRefObject<number | null>;
    heatCapacityPressureAlarmFileIdRef: React.MutableRefObject<string | null>;
    heatCapacityClosePumpValveReminderTimerRef: React.MutableRefObject<number | null>;
    heatCapacityClosePumpValveReminderTimerGenerationRef: React.MutableRefObject<number>;
    heatCapacityClosePumpValveReminderDeadlineAtMsRef: React.MutableRefObject<number | null>;
    heatCapacityClosePumpValveReminderFileIdRef: React.MutableRefObject<string | null>;
    heatCapacityRecordSuccessToastTimersRef: React.MutableRefObject<number[]>;
    clearHeatCapacityRecordSuccessToastTimers: () => void;
    clearHeatCapacityToastQueue: () => void;
    clearHeatCapacityPressureAlertUiState: () => void;
    heatCapacityToastDeadlineAtMsRef: React.MutableRefObject<number | null>;
    heatCapacityToastCurrentRef: React.MutableRefObject<import("./../heatCapacity/heatCapacityToastController.ts").HeatCapacityToastMessage | null>;
    heatCapacityToastPausedRef: React.MutableRefObject<{ fileId: string; remainingMs: number; } | null>;
    heatCapacityToastTimerGenerationRef: React.MutableRefObject<number>;
    heatCapacityRecordSuccessReleaseDeadlineAtMsRef: React.MutableRefObject<number | null>;
    heatCapacityRecordSuccessPausedRef: React.MutableRefObject<import("./workbenchHeatCapacityUiCheckpoint.ts").HeatCapacityRecordSuccessTimerPlan | null>;
    heatCapacityRecordSuccessFollowUpMessageRef: React.MutableRefObject<string | null>;
    heatCapacityRecordSuccessFollowUpDeadlineAtMsRef: React.MutableRefObject<number | null>;
    heatCapacityRecordSuccessTimerGenerationRef: React.MutableRefObject<number>;
    scheduleHeatCapacityToastAdvance: (delayMs?: number) => void;
    scheduleHeatCapacityRecordSuccessToastTimers: (followUpMessage: string | null, followUpDelayMs: number | null, releaseDelayMs: number) => void;
  };
  demoState: {
    heatCapacityAutoDemoCompleteToastTimerRef: React.MutableRefObject<number | null>;
    heatCapacityAutoDemoCompleteToastDeadlineAtMsRef: React.MutableRefObject<number | null>;
    heatCapacityAutoDemoStepPanelTimerRef: React.MutableRefObject<number | null>;
    setAutoDemoStepTitle: React.Dispatch<React.SetStateAction<string>>;
    setAutoDemoStepDescription: React.Dispatch<React.SetStateAction<string>>;
    setAutoDemoStepTarget: React.Dispatch<React.SetStateAction<string>>;
    setAutoDemoStepNote: React.Dispatch<React.SetStateAction<string>>;
    setAutoDemoStepPanelMode: React.Dispatch<React.SetStateAction<"hidden" | "visible" | "exiting">>;
    setAutoDemoCompletionMessage: React.Dispatch<React.SetStateAction<string | null>>;
    heatCapacityAutoDemoCompleteToastPausedRef: React.MutableRefObject<{ fileId: string; remainingMs: number; } | null>;
    heatCapacityAutoDemoCompleteToastTimerGenerationRef: React.MutableRefObject<number>;
    heatCapacityAutoDemoStepPanelDeadlineAtMsRef: React.MutableRefObject<number | null>;
    heatCapacityAutoDemoStepPanelPausedRef: React.MutableRefObject<{ fileId: string; remainingMs: number; } | null>;
    heatCapacityAutoDemoStepPanelTimerGenerationRef: React.MutableRefObject<number>;
    autoDemoCompletionMessage: string | null;
    heatCapacityAutoDemoFileIdRef: React.MutableRefObject<string | null>;
    heatCapacityAutoDemoPausedFileIdRef: React.MutableRefObject<string | null>;
  };
  guideState: {
    heatCapacityGuideStartTimerRef: React.MutableRefObject<number | null>;
    guideHeatCapacityPausedPulseRef: React.MutableRefObject<{ fileId: string; controlId: string | null; remainingMs: number; } | null>;
    setGuideHeatCapacityActiveFileId: React.Dispatch<React.SetStateAction<string | null>>;
    setGuideHeatCapacityPulseActive: React.Dispatch<React.SetStateAction<boolean>>;
    setGuideHeatCapacityFocusControlId: React.Dispatch<React.SetStateAction<string | null>>;
    setGuideHeatCapacityRollback: React.Dispatch<React.SetStateAction<{ animation: import("./../../domain/heatCapacity/heatCapacityInstrumentFeedback.ts").HeatCapacityGuideRollbackAnimation; key: number; } | null>>;
    setHeatCapacityGuideProjectedHoles: React.Dispatch<React.SetStateAction<Record<string, import("./workbenchHeatCapacityGuideMaskGeometry.ts").HeatCapacityGuideStrongCutout>>>;
    guideHeatCapacityStrongReminderTimerRef: React.MutableRefObject<number | null>;
    guideHeatCapacityPendingStrongReminderTimerRef: React.MutableRefObject<number | null>;
    guideHeatCapacityActiveFileId: string | null;
  };
  guide: {
    clearGuideHeatCapacityGuidance: () => void;
    clearGuideHeatCapacityStrongReminder: () => void;
    clearGuideHeatCapacityGuidancePulseTimer: () => void;
    clearHeatCapacityGuideStartTimer: () => void;
  };
  lessons: {
    clearHeatCapacityGuideLessonState: () => void;
    clearHeatCapacityGuideLessonTimers: () => void;
    scheduleHeatCapacityGuideLessonClose: (fileId: string, shouldResumeAutoDemo: boolean, delayMs: number) => void;
    clearHeatCapacityGuideLessonRuntimeForFileExit: () => void;
  };
  scene: {
    setHeatCapacityFocusResetKey: React.Dispatch<React.SetStateAction<number>>;
    setHeatCapacityHardSphereVisualResetKey: React.Dispatch<React.SetStateAction<number>>;
    heatCapacityFocusSessionRef: React.MutableRefObject<import("./workbenchHeatCapacityUiCheckpoint.ts").HeatCapacityFocusSession | null>;
    heatCapacityRefreshRestorePendingRef: React.MutableRefObject<boolean>;
    heatCapacityRuntimeFailureFileIdRef: React.MutableRefObject<string | null>;
    setHeatCapacityRuntimeFailureFileId: React.Dispatch<React.SetStateAction<string | null>>;
    heatCapacityRuntimeRecoveryIntentRef: React.MutableRefObject<{ fileId: string; expectedFile: import("./workbenchHeatCapacityStateTypes.ts").WorkbenchHeatCapacityState | null; suspendedAtMs: number; projectedRunState: import("./workbenchFileState.ts").WorkbenchRunState; resumeGuideRunState: boolean; pauseDemoOnRecovery: boolean; } | null>;
  };
  demoUi: {
    clearHeatCapacityAutoDemoUiState: () => void;
    scheduleHeatCapacityAutoDemoCompletionToastExpiry: (delayMs: number) => void;
    scheduleHeatCapacityAutoDemoStepPanelHide: (delayMs: number) => void;
  };
  free: {
    setPendingRemoveHeatCapacityTrialRecord: React.Dispatch<React.SetStateAction<{ trialIndex: number; kind: import("./../../domain/heatCapacity/heatCapacityFreeTrialModel.ts").HeatCapacityFreeTrialRecordRemovalKind; scheme: import("./workbenchHeatCapacityStateTypes.ts").HeatCapacityFreeParameterScheme; } | null>>;
  };
  instrument: {
    heatCapacityRecordControlsClosingTimerRef: React.MutableRefObject<number | null>;
    setHeatCapacityRecordControlsClosing: React.Dispatch<React.SetStateAction<import("./../../domain/heatCapacity/heatCapacityGuideTrialModel.ts").HeatCapacityGuideRecordKind | null>>;
    heatCapacityResetFeedbackTimerRef: React.MutableRefObject<number | null>;
    setHeatCapacityResetFeedbackActionId: React.Dispatch<React.SetStateAction<"reset-guide" | null>>;
  };
  checkpoint: {
    getHeatCapacityRefreshRemainingMs: (deadlineAtMs: number | null) => number | null;
  };
  lessonState: {
    heatCapacityGuideLessonCloseDeadlineAtMsRef: React.MutableRefObject<number | null>;
    heatCapacityGuideLessonClosePausedRef: React.MutableRefObject<import("./workbenchHeatCapacityUiCheckpoint.ts").HeatCapacityLessonCloseTimerPlan | null>;
    heatCapacityGuideLessonCloseShouldResumeDemoRef: React.MutableRefObject<boolean>;
    heatCapacityGuideLessonCloseTimerGenerationRef: React.MutableRefObject<number>;
    heatCapacityGuideLessonCloseTimerRef: React.MutableRefObject<number | null>;
  };
  lifecycle: {
    desktopExitQuiescedRef: React.MutableRefObject<boolean>;
  };
  workspace: {
    activeFileIdRef: React.MutableRefObject<string>;
  };
}

export const useWorkbenchHeatRuntimeLifecycle = (ports: useWorkbenchHeatRuntimeLifecyclePorts) => {
  const { clearHeatCapacityAutoDemoTimers } = ports.demoRuntime;
  const { clearHeatCapacityPumpAnimationTimers } = ports.pump;
  const { heatCapacityToastTimerRef, heatCapacityPressureAlarmTimerRef, heatCapacityPressureAlarmTimerGenerationRef, heatCapacityPressureAlarmDeadlineAtMsRef, heatCapacityPressureAlarmFileIdRef, heatCapacityClosePumpValveReminderTimerRef, heatCapacityClosePumpValveReminderTimerGenerationRef, heatCapacityClosePumpValveReminderDeadlineAtMsRef, heatCapacityClosePumpValveReminderFileIdRef, heatCapacityRecordSuccessToastTimersRef, clearHeatCapacityRecordSuccessToastTimers, clearHeatCapacityToastQueue, clearHeatCapacityPressureAlertUiState, heatCapacityToastDeadlineAtMsRef, heatCapacityToastCurrentRef, heatCapacityToastPausedRef, heatCapacityToastTimerGenerationRef, heatCapacityRecordSuccessReleaseDeadlineAtMsRef, heatCapacityRecordSuccessPausedRef, heatCapacityRecordSuccessFollowUpMessageRef, heatCapacityRecordSuccessFollowUpDeadlineAtMsRef, heatCapacityRecordSuccessTimerGenerationRef, scheduleHeatCapacityToastAdvance, scheduleHeatCapacityRecordSuccessToastTimers } = ports.feedback;
  const { heatCapacityAutoDemoCompleteToastTimerRef, heatCapacityAutoDemoCompleteToastDeadlineAtMsRef, heatCapacityAutoDemoStepPanelTimerRef, setAutoDemoStepTitle, setAutoDemoStepDescription, setAutoDemoStepTarget, setAutoDemoStepNote, setAutoDemoStepPanelMode, setAutoDemoCompletionMessage, heatCapacityAutoDemoCompleteToastPausedRef, heatCapacityAutoDemoCompleteToastTimerGenerationRef, heatCapacityAutoDemoStepPanelDeadlineAtMsRef, heatCapacityAutoDemoStepPanelPausedRef, heatCapacityAutoDemoStepPanelTimerGenerationRef, autoDemoCompletionMessage, heatCapacityAutoDemoFileIdRef, heatCapacityAutoDemoPausedFileIdRef } = ports.demoState;
  const { heatCapacityGuideStartTimerRef, guideHeatCapacityPausedPulseRef, setGuideHeatCapacityActiveFileId, setGuideHeatCapacityPulseActive, setGuideHeatCapacityFocusControlId, setGuideHeatCapacityRollback, setHeatCapacityGuideProjectedHoles, guideHeatCapacityStrongReminderTimerRef, guideHeatCapacityPendingStrongReminderTimerRef, guideHeatCapacityActiveFileId } = ports.guideState;
  const { clearGuideHeatCapacityGuidance, clearGuideHeatCapacityStrongReminder, clearGuideHeatCapacityGuidancePulseTimer, clearHeatCapacityGuideStartTimer } = ports.guide;
  const { clearHeatCapacityGuideLessonState, clearHeatCapacityGuideLessonTimers, scheduleHeatCapacityGuideLessonClose, clearHeatCapacityGuideLessonRuntimeForFileExit } = ports.lessons;
  const { setHeatCapacityFocusResetKey, setHeatCapacityHardSphereVisualResetKey, heatCapacityFocusSessionRef, heatCapacityRefreshRestorePendingRef, heatCapacityRuntimeFailureFileIdRef, setHeatCapacityRuntimeFailureFileId, heatCapacityRuntimeRecoveryIntentRef } = ports.scene;
  const { clearHeatCapacityAutoDemoUiState, scheduleHeatCapacityAutoDemoCompletionToastExpiry, scheduleHeatCapacityAutoDemoStepPanelHide } = ports.demoUi;
  const { setPendingRemoveHeatCapacityTrialRecord } = ports.free;
  const { heatCapacityRecordControlsClosingTimerRef, setHeatCapacityRecordControlsClosing, heatCapacityResetFeedbackTimerRef, setHeatCapacityResetFeedbackActionId } = ports.instrument;
  const { getHeatCapacityRefreshRemainingMs } = ports.checkpoint;
  const { heatCapacityGuideLessonCloseDeadlineAtMsRef, heatCapacityGuideLessonClosePausedRef, heatCapacityGuideLessonCloseShouldResumeDemoRef, heatCapacityGuideLessonCloseTimerGenerationRef, heatCapacityGuideLessonCloseTimerRef } = ports.lessonState;
  const { desktopExitQuiescedRef } = ports.lifecycle;
  const { activeFileIdRef } = ports.workspace;
  const disposeHeatCapacityRuntimeResources = () => {
    clearHeatCapacityAutoDemoTimers();
    clearHeatCapacityPumpAnimationTimers();
    if (heatCapacityToastTimerRef.current !== null) {
      window.clearTimeout(heatCapacityToastTimerRef.current);
      heatCapacityToastTimerRef.current = null;
    }
    if (heatCapacityAutoDemoCompleteToastTimerRef.current !== null) {
      window.clearTimeout(heatCapacityAutoDemoCompleteToastTimerRef.current);
      heatCapacityAutoDemoCompleteToastTimerRef.current = null;
    }
    heatCapacityAutoDemoCompleteToastDeadlineAtMsRef.current = null;
    if (heatCapacityAutoDemoStepPanelTimerRef.current !== null) {
      window.clearTimeout(heatCapacityAutoDemoStepPanelTimerRef.current);
      heatCapacityAutoDemoStepPanelTimerRef.current = null;
    }
    if (heatCapacityPressureAlarmTimerRef.current !== null) {
      heatCapacityPressureAlarmTimerGenerationRef.current += 1;
      window.clearTimeout(heatCapacityPressureAlarmTimerRef.current);
      heatCapacityPressureAlarmTimerRef.current = null;
    }
    heatCapacityPressureAlarmDeadlineAtMsRef.current = null;
    heatCapacityPressureAlarmFileIdRef.current = null;
    if (heatCapacityClosePumpValveReminderTimerRef.current !== null) {
      heatCapacityClosePumpValveReminderTimerGenerationRef.current += 1;
      window.clearTimeout(heatCapacityClosePumpValveReminderTimerRef.current);
      heatCapacityClosePumpValveReminderTimerRef.current = null;
    }
    heatCapacityClosePumpValveReminderDeadlineAtMsRef.current = null;
    heatCapacityClosePumpValveReminderFileIdRef.current = null;
    if (heatCapacityGuideStartTimerRef.current !== null) {
      window.clearTimeout(heatCapacityGuideStartTimerRef.current);
      heatCapacityGuideStartTimerRef.current = null;
    }
    heatCapacityRecordSuccessToastTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    heatCapacityRecordSuccessToastTimersRef.current = [];
  };

  const clearHeatCapacityGuideTransientUiState = () => {
    clearGuideHeatCapacityGuidance();
    clearGuideHeatCapacityStrongReminder();
    clearGuideHeatCapacityGuidancePulseTimer();
    guideHeatCapacityPausedPulseRef.current = null;
    setGuideHeatCapacityActiveFileId(null);
    setGuideHeatCapacityPulseActive(false);
    setGuideHeatCapacityFocusControlId(null);
    setGuideHeatCapacityRollback(null);
    setHeatCapacityGuideProjectedHoles({});
    clearHeatCapacityGuideLessonState();
  };

  const resetHeatCapacitySceneUiState = () => {
    setHeatCapacityFocusResetKey((key) => key + 1);
    setHeatCapacityHardSphereVisualResetKey((key) => key + 1);
    heatCapacityFocusSessionRef.current = null;
  };

  const clearHeatCapacityModeTransientUiRuntime = () => {
    clearHeatCapacityGuideStartTimer();
    clearHeatCapacityRecordSuccessToastTimers();
    clearHeatCapacityToastQueue();
    clearHeatCapacityAutoDemoTimers();
    clearHeatCapacityPumpAnimationTimers();
    clearHeatCapacityAutoDemoUiState();
    clearHeatCapacityPressureAlertUiState();
    clearHeatCapacityGuideTransientUiState();
    setPendingRemoveHeatCapacityTrialRecord(null);
    setAutoDemoStepTitle('');
    setAutoDemoStepDescription('');
    setAutoDemoStepTarget('');
    setAutoDemoStepNote('');
    setAutoDemoStepPanelMode('hidden');
    setAutoDemoCompletionMessage(null);
  };

  const resetHeatCapacityGroupUiRuntime = () => {
    clearHeatCapacityModeTransientUiRuntime();
    resetHeatCapacitySceneUiState();
  };

  const teachingTimerCleanupEffect = { run: () => () => {
    if (heatCapacityRecordControlsClosingTimerRef.current !== null) {
      window.clearTimeout(heatCapacityRecordControlsClosingTimerRef.current);
      heatCapacityRecordControlsClosingTimerRef.current = null;
    }
    clearHeatCapacityGuideLessonTimers();
    clearGuideHeatCapacityGuidancePulseTimer();
    if (guideHeatCapacityStrongReminderTimerRef.current !== null) {
      window.clearTimeout(guideHeatCapacityStrongReminderTimerRef.current);
      guideHeatCapacityStrongReminderTimerRef.current = null;
    }
    if (guideHeatCapacityPendingStrongReminderTimerRef.current !== null) {
      window.clearTimeout(guideHeatCapacityPendingStrongReminderTimerRef.current);
      guideHeatCapacityPendingStrongReminderTimerRef.current = null;
    }
  }, dependencies: [] } satisfies WorkbenchHeatEffect;

  const pauseHeatCapacityTransientUiTimers = (fileId: string) => {
    const toastRemainingMs = getHeatCapacityRefreshRemainingMs(
      heatCapacityToastDeadlineAtMsRef.current,
    );
    if (heatCapacityToastCurrentRef.current && toastRemainingMs !== null) {
      heatCapacityToastPausedRef.current = { fileId, remainingMs: toastRemainingMs };
      heatCapacityToastTimerGenerationRef.current += 1;
      if (heatCapacityToastTimerRef.current !== null) {
        window.clearTimeout(heatCapacityToastTimerRef.current);
        heatCapacityToastTimerRef.current = null;
      }
      heatCapacityToastDeadlineAtMsRef.current = null;
    }

    const recordReleaseRemainingMs = getHeatCapacityRefreshRemainingMs(
      heatCapacityRecordSuccessReleaseDeadlineAtMsRef.current,
    );
    if (recordReleaseRemainingMs !== null) {
      heatCapacityRecordSuccessPausedRef.current = {
        fileId,
        followUpMessage: heatCapacityRecordSuccessFollowUpMessageRef.current,
        followUpRemainingMs: getHeatCapacityRefreshRemainingMs(
          heatCapacityRecordSuccessFollowUpDeadlineAtMsRef.current,
        ),
        releaseRemainingMs: recordReleaseRemainingMs,
      };
      heatCapacityRecordSuccessTimerGenerationRef.current += 1;
      heatCapacityRecordSuccessToastTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      heatCapacityRecordSuccessToastTimersRef.current = [];
      heatCapacityRecordSuccessFollowUpDeadlineAtMsRef.current = null;
      heatCapacityRecordSuccessReleaseDeadlineAtMsRef.current = null;
    }

    const completionRemainingMs = getHeatCapacityRefreshRemainingMs(
      heatCapacityAutoDemoCompleteToastDeadlineAtMsRef.current,
    );
    if (completionRemainingMs !== null) {
      heatCapacityAutoDemoCompleteToastPausedRef.current = {
        fileId,
        remainingMs: completionRemainingMs,
      };
      heatCapacityAutoDemoCompleteToastTimerGenerationRef.current += 1;
      if (heatCapacityAutoDemoCompleteToastTimerRef.current !== null) {
        window.clearTimeout(heatCapacityAutoDemoCompleteToastTimerRef.current);
        heatCapacityAutoDemoCompleteToastTimerRef.current = null;
      }
      heatCapacityAutoDemoCompleteToastDeadlineAtMsRef.current = null;
    }

    const stepPanelRemainingMs = getHeatCapacityRefreshRemainingMs(
      heatCapacityAutoDemoStepPanelDeadlineAtMsRef.current,
    );
    if (stepPanelRemainingMs !== null) {
      heatCapacityAutoDemoStepPanelPausedRef.current = {
        fileId,
        remainingMs: stepPanelRemainingMs,
      };
      heatCapacityAutoDemoStepPanelTimerGenerationRef.current += 1;
      if (heatCapacityAutoDemoStepPanelTimerRef.current !== null) {
        window.clearTimeout(heatCapacityAutoDemoStepPanelTimerRef.current);
        heatCapacityAutoDemoStepPanelTimerRef.current = null;
      }
      heatCapacityAutoDemoStepPanelDeadlineAtMsRef.current = null;
    }

    const lessonCloseRemainingMs = getHeatCapacityRefreshRemainingMs(
      heatCapacityGuideLessonCloseDeadlineAtMsRef.current,
    );
    if (lessonCloseRemainingMs !== null) {
      heatCapacityGuideLessonClosePausedRef.current = {
        fileId,
        remainingMs: lessonCloseRemainingMs,
        shouldResumeAutoDemo: heatCapacityGuideLessonCloseShouldResumeDemoRef.current,
      };
      heatCapacityGuideLessonCloseTimerGenerationRef.current += 1;
      if (heatCapacityGuideLessonCloseTimerRef.current !== null) {
        window.clearTimeout(heatCapacityGuideLessonCloseTimerRef.current);
        heatCapacityGuideLessonCloseTimerRef.current = null;
      }
      heatCapacityGuideLessonCloseDeadlineAtMsRef.current = null;
    }
  };

  const resumeHeatCapacityTransientUiTimers = (fileId: string) => {
    if (
      desktopExitQuiescedRef.current ||
      heatCapacityRefreshRestorePendingRef.current ||
      heatCapacityRuntimeFailureFileIdRef.current !== null ||
      activeFileIdRef.current !== fileId
    ) return;

    const pausedToast = heatCapacityToastPausedRef.current;
    if (pausedToast?.fileId === fileId && heatCapacityToastCurrentRef.current) {
      scheduleHeatCapacityToastAdvance(pausedToast.remainingMs);
    }

    const pausedRecordSequence = heatCapacityRecordSuccessPausedRef.current;
    if (pausedRecordSequence?.fileId === fileId) {
      scheduleHeatCapacityRecordSuccessToastTimers(
        pausedRecordSequence.followUpMessage,
        pausedRecordSequence.followUpRemainingMs,
        pausedRecordSequence.releaseRemainingMs,
      );
    }

    const pausedCompletionToast = heatCapacityAutoDemoCompleteToastPausedRef.current;
    if (pausedCompletionToast?.fileId === fileId && autoDemoCompletionMessage) {
      scheduleHeatCapacityAutoDemoCompletionToastExpiry(pausedCompletionToast.remainingMs);
    }

    const pausedStepPanel = heatCapacityAutoDemoStepPanelPausedRef.current;
    if (pausedStepPanel?.fileId === fileId) {
      scheduleHeatCapacityAutoDemoStepPanelHide(pausedStepPanel.remainingMs);
    }

    const pausedLessonClose = heatCapacityGuideLessonClosePausedRef.current;
    if (pausedLessonClose?.fileId === fileId) {
      scheduleHeatCapacityGuideLessonClose(
        fileId,
        pausedLessonClose.shouldResumeAutoDemo,
        pausedLessonClose.remainingMs,
      );
    }
  };

  const releaseHeatCapacityRuntimeForFileExit = (fileId: string) => {
    if (heatCapacityRuntimeFailureFileIdRef.current === fileId) {
      heatCapacityRuntimeFailureFileIdRef.current = null;
      setHeatCapacityRuntimeFailureFileId((current) => current === fileId ? null : current);
    }
    if (heatCapacityRuntimeRecoveryIntentRef.current?.fileId === fileId) {
      heatCapacityRuntimeRecoveryIntentRef.current = null;
    }
    if (guideHeatCapacityPausedPulseRef.current?.fileId === fileId) {
      guideHeatCapacityPausedPulseRef.current = null;
    }
    const ownsAutoDemo = heatCapacityAutoDemoFileIdRef.current === fileId || heatCapacityAutoDemoPausedFileIdRef.current === fileId;
    const ownsGuideSession = guideHeatCapacityActiveFileId === fileId;
    if (!ownsAutoDemo && !ownsGuideSession && activeFileIdRef.current !== fileId) return;

    if (heatCapacityRecordControlsClosingTimerRef.current !== null) {
      window.clearTimeout(heatCapacityRecordControlsClosingTimerRef.current);
      heatCapacityRecordControlsClosingTimerRef.current = null;
    }
    setHeatCapacityRecordControlsClosing(null);
    if (heatCapacityResetFeedbackTimerRef.current !== null) {
      window.clearTimeout(heatCapacityResetFeedbackTimerRef.current);
      heatCapacityResetFeedbackTimerRef.current = null;
    }
    setHeatCapacityResetFeedbackActionId(null);
    clearHeatCapacityGuideStartTimer();
    clearHeatCapacityRecordSuccessToastTimers();
    clearHeatCapacityToastQueue();
    clearHeatCapacityPressureAlertUiState();
    clearHeatCapacityAutoDemoTimers();
    clearHeatCapacityPumpAnimationTimers();
    clearHeatCapacityAutoDemoUiState();
    clearGuideHeatCapacityGuidance();
    clearGuideHeatCapacityStrongReminder();
    clearGuideHeatCapacityGuidancePulseTimer();
    guideHeatCapacityPausedPulseRef.current = null;
    clearHeatCapacityGuideLessonRuntimeForFileExit();
    setGuideHeatCapacityActiveFileId(null);
    setGuideHeatCapacityFocusControlId(null);
    setGuideHeatCapacityPulseActive(false);
    setGuideHeatCapacityRollback(null);
    heatCapacityFocusSessionRef.current = null;
  };
  return {
    effects: { teachingTimerCleanup: teachingTimerCleanupEffect }, disposeHeatCapacityRuntimeResources, resetHeatCapacitySceneUiState, clearHeatCapacityModeTransientUiRuntime, resetHeatCapacityGroupUiRuntime, pauseHeatCapacityTransientUiTimers, resumeHeatCapacityTransientUiTimers, releaseHeatCapacityRuntimeForFileExit };
};
