import type { WorkbenchHeatEffect } from './workbenchHeatEffect.ts';
import type { GuideHeatCapacityGuardResult } from './workbenchHeatGuideTypes.ts';
import { GUIDE_HEAT_CAPACITY_STRONG_REMINDER_DELAY_MS, GUIDE_HEAT_CAPACITY_GUIDANCE_PULSE_INTERVAL_MS } from './workbenchTeachingUiTiming.ts';

import React from 'react';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';

import { resolveHeatCapacityGuidePulseRestore } from '../heatCapacity/heatCapacityGuidePulseClock.ts';
import { canProceedAfterPumping } from './workbenchHeatCapacityGuideDecisions.ts';
import { getGuideStepGuidance as selectGuideStepGuidance } from './workbenchHeatCapacityGuideGuidance.ts';
import { HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS, isHeatCapacityGuideToast, type HeatCapacityToastLevel, type HeatCapacityToastSource } from '../heatCapacity/heatCapacityToastController.ts';

import { getHeatCapacityGuideAllowedActions, getHeatCapacityGuideRollbackAnimation, isGuideHeatCapacityPauseStep, isHeatCapacityGuideRecordStep, type GuideHeatCapacityAction, type GuideHeatCapacityStep } from '../heatCapacity/heatCapacityGuideStepModel.ts';

import { type HeatCapacityControlInteractionId } from '../heatCapacity/heatCapacityControlInteraction.ts';


export interface useWorkbenchHeatGuideRuntimePorts {
  preferences: {
    settingsLanguagePreference: "zh-CN" | "zh-TW" | "en";
  };
  feedback: {
    heatCapacityRealtimeCopy: import("./workbenchHeatCapacityRealtimeCopy.ts").HeatCapacityRealtimeCopy;
    isHeatCapacityPressureAlertActive: () => boolean;
    showHeatCapacityPolicyToast: (text: string, policy: import("./../heatCapacity/heatCapacityToastPolicy.ts").HeatCapacityToastPolicy, levelOverride?: import("./../heatCapacity/heatCapacityToastController.ts").HeatCapacityToastLevel | undefined) => void;
    clearHeatCapacityToastBySource: (predicate: (message: import("./../heatCapacity/heatCapacityToastController.ts").HeatCapacityToastMessage | null) => boolean) => void;
    heatCapacityRecordToastSequenceActive: boolean;
  };
  guideState: {
    heatCapacityGuideStartTimerRef: React.MutableRefObject<number | null>;
    guideHeatCapacityPausedPulseRef: React.MutableRefObject<{ fileId: string; controlId: string | null; remainingMs: number; } | null>;
    guideHeatCapacityPulseTimerRef: React.MutableRefObject<number | null>;
    guideHeatCapacityPulseDeadlineAtMsRef: React.MutableRefObject<number | null>;
    guideHeatCapacityPulseActive: boolean;
    guideHeatCapacityFocusControlId: string | null;
    setGuideHeatCapacityPulseActive: React.Dispatch<React.SetStateAction<boolean>>;
    setGuideHeatCapacityFocusControlId: React.Dispatch<React.SetStateAction<string | null>>;
    guideHeatCapacityGuidancePulseTimerRef: React.MutableRefObject<number | null>;
    guideHeatCapacityPendingStrongReminderTimerRef: React.MutableRefObject<number | null>;
    guideHeatCapacityPendingStrongReminderDeadlineAtMsRef: React.MutableRefObject<number | null>;
    guideHeatCapacityPendingStrongReminderControlIdRef: React.MutableRefObject<string | null>;
    guideHeatCapacityPausedPendingStrongReminderRef: React.MutableRefObject<{ controlId: string | null; remainingMs: number; } | null>;
    guideHeatCapacityStrongReminderTimerContextRef: React.MutableRefObject<{ fileId: string; step: import("./../heatCapacity/heatCapacityGuideStepModel.ts").GuideHeatCapacityStep; controlId: string | null; } | null>;
    guideHeatCapacityStrongReminderDeadlineAtMsRef: React.MutableRefObject<number | null>;
    guideHeatCapacityStrongReminderTimerRef: React.MutableRefObject<number | null>;
    guideHeatCapacityRestoredStrongReminderTimerRef: React.MutableRefObject<{ fileId: string; controlId: string | null; remainingMs: number; } | null>;
    setGuideHeatCapacityStrongReminderControlId: React.Dispatch<React.SetStateAction<string | null>>;
    setGuideHeatCapacityStrongReminderFocusKey: React.Dispatch<React.SetStateAction<number>>;
    setGuideHeatCapacityStrongReminderActive: React.Dispatch<React.SetStateAction<boolean>>;
    guideHeatCapacityMissCountRef: React.MutableRefObject<number>;
    guideHeatCapacityRejectedInteractionRef: React.MutableRefObject<import("./../heatCapacity/heatCapacityControlInteraction.ts").HeatCapacityRejectedInteractionTracker>;
    getHeatCapacityGuideStep: (file: import("./workbenchHeatCapacityStateTypes.ts").WorkbenchHeatCapacityState) => import("./../heatCapacity/heatCapacityGuideStepModel.ts").GuideHeatCapacityStep;
    setGuideHeatCapacityRollback: React.Dispatch<React.SetStateAction<{ animation: import("./../../domain/heatCapacity/heatCapacityInstrumentFeedback.ts").HeatCapacityGuideRollbackAnimation; key: number; } | null>>;
    guideHeatCapacityActiveFileId: string | null;
    guideHeatCapacityStrongReminderActive: boolean;
    guideHeatCapacityStrongReminderControlId: string | null;
    activeHeatCapacityGuideFileId: string | null;
    activeHeatCapacityGuideStep: import("./../heatCapacity/heatCapacityGuideStepModel.ts").GuideHeatCapacityStep;
    guidePassivePumpTargetNoticeKeyRef: React.MutableRefObject<string | null>;
    guideHeatCapacityActiveFileIdRef: React.MutableRefObject<string | null>;
  };
  workspace: {
    activeFileIdRef: React.MutableRefObject<string>;
    filesRef: React.MutableRefObject<import("./workbenchFileUnion.ts").WorkbenchFileState[]>;
    activeFile: import("./workbenchFileUnion.ts").WorkbenchFileState;
  };
  lifecycle: {
    desktopExitQuiescedRef: React.MutableRefObject<boolean>;
    desktopExitQuiesced: boolean;
  };
  tutorial: {
    tutorialNoticeKindRef: React.MutableRefObject<import("./workbenchExperimentTutorialPresentation.ts").ExperimentTutorialNoticeKind | null>;
  };
  scene: {
    heatCapacityRuntimeFailureFileIdRef: React.MutableRefObject<string | null>;
    heatCapacityModeTransitionStateRef: React.MutableRefObject<import("./../heatCapacity/heatCapacityModeTransitionModel.ts").HeatCapacityModeTransitionState>;
    heatCapacityRefreshRestorePendingRef: React.MutableRefObject<boolean>;
    setHeatCapacityFocusResetKey: React.Dispatch<React.SetStateAction<number>>;
    heatCapacityFocusSessionRef: React.MutableRefObject<import("./workbenchHeatCapacityUiCheckpoint.ts").HeatCapacityFocusSession | null>;
    heatCapacityRuntimeFailureFileId: string | null;
    heatCapacityRefreshRestoring: boolean;
    heatCapacityModeTransitionLocked: boolean;
  };
  checkpoint: {
    getHeatCapacityRefreshRemainingMs: (deadlineAtMs: number | null) => number | null;
  };
  lessonState: {
    heatCapacityLessonDialogActiveRef: React.MutableRefObject<boolean>;
    heatCapacityLessonDialogActive: boolean;
  };
  focus: {
    exitHeatCapacityFocusMode: () => void;
  };
  demoState: {
    autoDemoInteractionLocked: boolean;
  };
}

export const useWorkbenchHeatGuideRuntime = (ports: useWorkbenchHeatGuideRuntimePorts) => {
  const { settingsLanguagePreference } = ports.preferences;
  const { heatCapacityRealtimeCopy, isHeatCapacityPressureAlertActive, showHeatCapacityPolicyToast, clearHeatCapacityToastBySource, heatCapacityRecordToastSequenceActive } = ports.feedback;
  const { heatCapacityGuideStartTimerRef, guideHeatCapacityPausedPulseRef, guideHeatCapacityPulseTimerRef, guideHeatCapacityPulseDeadlineAtMsRef, guideHeatCapacityPulseActive, guideHeatCapacityFocusControlId, setGuideHeatCapacityPulseActive, setGuideHeatCapacityFocusControlId, guideHeatCapacityGuidancePulseTimerRef, guideHeatCapacityPendingStrongReminderTimerRef, guideHeatCapacityPendingStrongReminderDeadlineAtMsRef, guideHeatCapacityPendingStrongReminderControlIdRef, guideHeatCapacityPausedPendingStrongReminderRef, guideHeatCapacityStrongReminderTimerContextRef, guideHeatCapacityStrongReminderDeadlineAtMsRef, guideHeatCapacityStrongReminderTimerRef, guideHeatCapacityRestoredStrongReminderTimerRef, setGuideHeatCapacityStrongReminderControlId, setGuideHeatCapacityStrongReminderFocusKey, setGuideHeatCapacityStrongReminderActive, guideHeatCapacityMissCountRef, guideHeatCapacityRejectedInteractionRef, getHeatCapacityGuideStep, setGuideHeatCapacityRollback, guideHeatCapacityActiveFileId, guideHeatCapacityStrongReminderActive, guideHeatCapacityStrongReminderControlId, activeHeatCapacityGuideFileId, activeHeatCapacityGuideStep, guidePassivePumpTargetNoticeKeyRef, guideHeatCapacityActiveFileIdRef } = ports.guideState;
  const { activeFileIdRef, filesRef, activeFile } = ports.workspace;
  const { desktopExitQuiescedRef, desktopExitQuiesced } = ports.lifecycle;
  const { tutorialNoticeKindRef } = ports.tutorial;
  const { heatCapacityRuntimeFailureFileIdRef, heatCapacityModeTransitionStateRef, heatCapacityRefreshRestorePendingRef, setHeatCapacityFocusResetKey, heatCapacityFocusSessionRef, heatCapacityRuntimeFailureFileId, heatCapacityRefreshRestoring, heatCapacityModeTransitionLocked } = ports.scene;
  const { getHeatCapacityRefreshRemainingMs } = ports.checkpoint;
  const { heatCapacityLessonDialogActiveRef, heatCapacityLessonDialogActive } = ports.lessonState;
  const { exitHeatCapacityFocusMode } = ports.focus;
  const { autoDemoInteractionLocked } = ports.demoState;
  const getGuideStepGuidance = (
    step: GuideHeatCapacityStep,
    file?: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ) => selectGuideStepGuidance(step, file, settingsLanguagePreference, heatCapacityRealtimeCopy);

  const clearHeatCapacityGuideStartTimer = () => {
    if (heatCapacityGuideStartTimerRef.current !== null) {
      window.clearTimeout(heatCapacityGuideStartTimerRef.current);
      heatCapacityGuideStartTimerRef.current = null;
    }
  };

  const isHeatCapacityGuideReminderClockRunning = (fileId = activeFileIdRef.current) => {
    if (desktopExitQuiescedRef.current) return false;
    if (tutorialNoticeKindRef.current !== null) return false;
    if (heatCapacityRuntimeFailureFileIdRef.current !== null) return false;
    if (heatCapacityModeTransitionStateRef.current.phase !== 'idle') return false;
    if (heatCapacityRefreshRestorePendingRef.current) return false;
    if (activeFileIdRef.current !== fileId) return false;
    const file = filesRef.current.find((candidate) => candidate.id === fileId);
    return Boolean(
      file?.kind === 'heatCapacity' &&
      file.heatCapacityMode === 'guide' &&
      file.runState === 'running',
    );
  };

  const pauseGuideHeatCapacityPulse = (fileId: string) => {
    const existingPausedPulse = guideHeatCapacityPausedPulseRef.current?.fileId === fileId
      ? guideHeatCapacityPausedPulseRef.current
      : null;
    const hadRunningPulse = guideHeatCapacityPulseTimerRef.current !== null ||
      guideHeatCapacityPulseDeadlineAtMsRef.current !== null ||
      guideHeatCapacityPulseActive ||
      guideHeatCapacityFocusControlId !== null ||
      existingPausedPulse !== null;
    const remainingMs = getHeatCapacityRefreshRemainingMs(
      guideHeatCapacityPulseDeadlineAtMsRef.current,
    ) ?? existingPausedPulse?.remainingMs ?? null;
    if (guideHeatCapacityPulseTimerRef.current !== null) {
      window.clearTimeout(guideHeatCapacityPulseTimerRef.current);
      guideHeatCapacityPulseTimerRef.current = null;
    }
    if (hadRunningPulse) {
      const plan = resolveHeatCapacityGuidePulseRestore({
        fileId,
        controlId: guideHeatCapacityFocusControlId ?? existingPausedPulse?.controlId ?? null,
        remainingMs,
        clockRunning: false,
      });
      guideHeatCapacityPausedPulseRef.current = plan.state === 'paused'
        ? {
            fileId: plan.fileId,
            controlId: plan.controlId,
            remainingMs: plan.remainingMs,
          }
        : null;
    }
    guideHeatCapacityPulseDeadlineAtMsRef.current = null;
    setGuideHeatCapacityPulseActive(false);
    setGuideHeatCapacityFocusControlId(null);
  };

  const restoreGuideHeatCapacityPulse = (
    fileId: string,
    controlId: string | null | undefined,
    remainingMs: number | null | undefined,
  ) => {
    if (guideHeatCapacityPulseTimerRef.current !== null) {
      window.clearTimeout(guideHeatCapacityPulseTimerRef.current);
      guideHeatCapacityPulseTimerRef.current = null;
    }
    guideHeatCapacityPulseDeadlineAtMsRef.current = null;
    guideHeatCapacityPausedPulseRef.current = null;
    const plan = resolveHeatCapacityGuidePulseRestore({
      fileId,
      controlId,
      remainingMs,
      clockRunning: isHeatCapacityGuideReminderClockRunning(fileId),
    });
    if (plan.state === 'cleared') {
      setGuideHeatCapacityPulseActive(false);
      setGuideHeatCapacityFocusControlId(null);
      return;
    }
    if (plan.state === 'paused') {
      guideHeatCapacityPausedPulseRef.current = {
        fileId: plan.fileId,
        controlId: plan.controlId,
        remainingMs: plan.remainingMs,
      };
      setGuideHeatCapacityPulseActive(false);
      setGuideHeatCapacityFocusControlId(null);
      return;
    }
    setGuideHeatCapacityFocusControlId(plan.controlId);
    setGuideHeatCapacityPulseActive(true);
    guideHeatCapacityPulseDeadlineAtMsRef.current = Date.now() + plan.remainingMs;
    guideHeatCapacityPulseTimerRef.current = window.setTimeout(() => {
      if (!isHeatCapacityGuideReminderClockRunning(plan.fileId)) {
        pauseGuideHeatCapacityPulse(plan.fileId);
        return;
      }
      guideHeatCapacityPulseTimerRef.current = null;
      guideHeatCapacityPulseDeadlineAtMsRef.current = null;
      guideHeatCapacityPausedPulseRef.current = null;
      setGuideHeatCapacityPulseActive(false);
      setGuideHeatCapacityFocusControlId(null);
    }, plan.remainingMs);
  };

  const pulseGuideHeatCapacityControl = (
    controlId?: string | null,
    durationMs = 2200,
  ) => {
    if (heatCapacityModeTransitionStateRef.current.phase !== 'idle') return;
    if (heatCapacityRefreshRestorePendingRef.current) return;
    if (heatCapacityRuntimeFailureFileIdRef.current !== null) return;
    if (!isHeatCapacityGuideReminderClockRunning()) return;
    const safeDurationMs = Math.max(0, durationMs);
    restoreGuideHeatCapacityPulse(activeFileIdRef.current, controlId, safeDurationMs);
  };

  const clearGuideHeatCapacityGuidancePulseTimer = () => {
    if (guideHeatCapacityGuidancePulseTimerRef.current !== null) {
      window.clearInterval(guideHeatCapacityGuidancePulseTimerRef.current);
      guideHeatCapacityGuidancePulseTimerRef.current = null;
    }
  };

  const showGuideHeatCapacityGuidance = (
    message: string,
    controlId?: string | null,
    level: HeatCapacityToastLevel = 'info',
    source: Extract<HeatCapacityToastSource, 'guide' | 'guide-blocked'> = 'guide',
  ) => {
    if (heatCapacityModeTransitionStateRef.current.phase !== 'idle') return;
    if (heatCapacityRefreshRestorePendingRef.current) return;
    if (heatCapacityRuntimeFailureFileIdRef.current !== null) return;
    if (!isHeatCapacityGuideReminderClockRunning()) return;
    if (isHeatCapacityPressureAlertActive()) return;
    showHeatCapacityPolicyToast(message, source === 'guide-blocked' ? 'guideBlocked' : 'guide', level);
    pulseGuideHeatCapacityControl(controlId);
  };

  const clearGuideHeatCapacityGuidance = () => {
    clearHeatCapacityToastBySource(isHeatCapacityGuideToast);
    setGuideHeatCapacityPulseActive(false);
    setGuideHeatCapacityFocusControlId(null);
    if (guideHeatCapacityPulseTimerRef.current !== null) {
      window.clearTimeout(guideHeatCapacityPulseTimerRef.current);
      guideHeatCapacityPulseTimerRef.current = null;
    }
    guideHeatCapacityPulseDeadlineAtMsRef.current = null;
  };

  const clearGuideHeatCapacityPendingStrongReminderTimer = () => {
    if (guideHeatCapacityPendingStrongReminderTimerRef.current !== null) {
      window.clearTimeout(guideHeatCapacityPendingStrongReminderTimerRef.current);
      guideHeatCapacityPendingStrongReminderTimerRef.current = null;
    }
    guideHeatCapacityPendingStrongReminderDeadlineAtMsRef.current = null;
    guideHeatCapacityPendingStrongReminderControlIdRef.current = null;
    guideHeatCapacityPausedPendingStrongReminderRef.current = null;
  };

  const pauseGuideHeatCapacityReminderTimers = (fileId: string) => {
    clearGuideHeatCapacityGuidancePulseTimer();
    pauseGuideHeatCapacityPulse(fileId);

    const strongTimerContext = guideHeatCapacityStrongReminderTimerContextRef.current;
    const strongRemainingMs = getHeatCapacityRefreshRemainingMs(
      guideHeatCapacityStrongReminderDeadlineAtMsRef.current,
    );
    if (guideHeatCapacityStrongReminderTimerRef.current !== null) {
      window.clearTimeout(guideHeatCapacityStrongReminderTimerRef.current);
      guideHeatCapacityStrongReminderTimerRef.current = null;
    }
    if (strongTimerContext?.fileId === fileId) {
      if (strongRemainingMs !== null) {
        guideHeatCapacityRestoredStrongReminderTimerRef.current = {
          fileId,
          controlId: strongTimerContext.controlId,
          remainingMs: strongRemainingMs,
        };
      }
      guideHeatCapacityStrongReminderDeadlineAtMsRef.current = null;
      guideHeatCapacityStrongReminderTimerContextRef.current = null;
    }

    const pendingRemainingMs = getHeatCapacityRefreshRemainingMs(
      guideHeatCapacityPendingStrongReminderDeadlineAtMsRef.current,
    );
    if (guideHeatCapacityPendingStrongReminderTimerRef.current !== null) {
      window.clearTimeout(guideHeatCapacityPendingStrongReminderTimerRef.current);
      guideHeatCapacityPendingStrongReminderTimerRef.current = null;
    }
    if (pendingRemainingMs !== null) {
      guideHeatCapacityPausedPendingStrongReminderRef.current = {
        controlId: guideHeatCapacityPendingStrongReminderControlIdRef.current,
        remainingMs: pendingRemainingMs,
      };
    }
    guideHeatCapacityPendingStrongReminderDeadlineAtMsRef.current = null;
    guideHeatCapacityPendingStrongReminderControlIdRef.current = null;
  };

  const isHeatCapacityLessonQueueBlocked = () => heatCapacityLessonDialogActiveRef.current;

  const activateGuideHeatCapacityStrongReminder = (controlId?: string | null) => {
    if (heatCapacityModeTransitionStateRef.current.phase !== 'idle') return false;
    if (heatCapacityRefreshRestorePendingRef.current) return false;
    if (heatCapacityRuntimeFailureFileIdRef.current !== null) return false;
    if (!isHeatCapacityGuideReminderClockRunning()) return false;
    if (isHeatCapacityPressureAlertActive()) return false;
    if (isHeatCapacityLessonQueueBlocked()) return false;
    if (guideHeatCapacityStrongReminderTimerRef.current !== null) {
      window.clearTimeout(guideHeatCapacityStrongReminderTimerRef.current);
      guideHeatCapacityStrongReminderTimerRef.current = null;
    }
    clearGuideHeatCapacityPendingStrongReminderTimer();
    clearGuideHeatCapacityGuidance();
    setGuideHeatCapacityStrongReminderControlId(controlId ?? null);
    setGuideHeatCapacityStrongReminderFocusKey((key) => key + 1);
    pulseGuideHeatCapacityControl(controlId ?? null);
    setGuideHeatCapacityStrongReminderActive(true);
    return true;
  };

  const scheduleGuideHeatCapacityStrongReminderAfterDelay = (
    controlId: string | null | undefined,
    delayMs: number,
  ) => {
    clearGuideHeatCapacityPendingStrongReminderTimer();
    const safeDelayMs = Math.max(0, delayMs);
    if (
      heatCapacityModeTransitionStateRef.current.phase !== 'idle' ||
      heatCapacityRuntimeFailureFileIdRef.current !== null ||
      !isHeatCapacityGuideReminderClockRunning()
    ) {
      guideHeatCapacityPausedPendingStrongReminderRef.current = {
        controlId: controlId ?? null,
        remainingMs: safeDelayMs,
      };
      return;
    }
    guideHeatCapacityPendingStrongReminderControlIdRef.current = controlId ?? null;
    guideHeatCapacityPendingStrongReminderDeadlineAtMsRef.current = Date.now() + safeDelayMs;
    guideHeatCapacityPendingStrongReminderTimerRef.current = window.setTimeout(() => {
      guideHeatCapacityPendingStrongReminderTimerRef.current = null;
      guideHeatCapacityPendingStrongReminderDeadlineAtMsRef.current = null;
      guideHeatCapacityPendingStrongReminderControlIdRef.current = null;
      if (
        heatCapacityModeTransitionStateRef.current.phase !== 'idle' ||
        heatCapacityRuntimeFailureFileIdRef.current !== null ||
        !isHeatCapacityGuideReminderClockRunning()
      ) {
        guideHeatCapacityPausedPendingStrongReminderRef.current = {
          controlId: controlId ?? null,
          remainingMs: 0,
        };
        return;
      }
      if (isHeatCapacityLessonQueueBlocked()) return;
      activateGuideHeatCapacityStrongReminder(controlId ?? null);
    }, safeDelayMs);
  };

  const scheduleGuideHeatCapacityStrongReminderAfterToast = (controlId?: string | null) => {
    scheduleGuideHeatCapacityStrongReminderAfterDelay(
      controlId,
      HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS,
    );
  };

  const clearGuideHeatCapacityStrongReminder = () => {
    if (guideHeatCapacityStrongReminderTimerRef.current !== null) {
      window.clearTimeout(guideHeatCapacityStrongReminderTimerRef.current);
      guideHeatCapacityStrongReminderTimerRef.current = null;
    }
    guideHeatCapacityStrongReminderDeadlineAtMsRef.current = null;
    guideHeatCapacityStrongReminderTimerContextRef.current = null;
    guideHeatCapacityRestoredStrongReminderTimerRef.current = null;
    clearGuideHeatCapacityPendingStrongReminderTimer();
    guideHeatCapacityMissCountRef.current = 0;
    guideHeatCapacityRejectedInteractionRef.current.reset();
    setGuideHeatCapacityStrongReminderActive(false);
    setGuideHeatCapacityStrongReminderControlId(null);
  };

  const clearGuideHeatCapacityStrongReminderFocus = () => {
    setHeatCapacityFocusResetKey((key) => key + 1);
    heatCapacityFocusSessionRef.current = null;
  };

  const shouldResetStrongFocusAfterAllowedAction = (
    controlId: string | null,
    action: GuideHeatCapacityAction,
  ) => (
    (controlId === 'stopcock' && (action === 'openStopcock' || action === 'closeStopcock')) ||
    (controlId === 'pumpValve' && (action === 'openPumpValve' || action === 'closePumpValve'))
  );

  const registerGuideHeatCapacityMiss = (_guard: GuideHeatCapacityGuardResult) => {
    const missCount = guideHeatCapacityMissCountRef.current + 1;
    guideHeatCapacityMissCountRef.current = missCount;
    return missCount >= 2;
  };

  const getGuideHeatCapacityGuard = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
    action: GuideHeatCapacityAction,
  ): GuideHeatCapacityGuardResult => {
    const step = getHeatCapacityGuideStep(file);
    const guidance = getGuideStepGuidance(step, file);
    const rollbackAnimation = getHeatCapacityGuideRollbackAnimation(action);
    const allowedActions = getHeatCapacityGuideAllowedActions(step);
    if (
      action === 'closePumpValve' &&
      (step === 'pumpRequired' || step === 'closePumpValveRequired') &&
      !canProceedAfterPumping(file)
    ) {
      return {
        allowed: false,
        expectedControlId: 'pumpBulb',
        expectedMessage: heatCapacityRealtimeCopy.guidePumpInsufficientReminder,
        expectedLevel: 'warning',
        rollbackAnimation: 'valveBounce',
      };
    }
    if (step === 'stabilizeBeforeReleaseRequired') {
      return {
        allowed: false,
        expectedControlId: 'recordU1',
        expectedMessage: guidance.message,
        expectedLevel: 'warning',
        rollbackAnimation,
        suppressStrongReminder: true,
      };
    }
    if (step === 'recoverRequired') {
      return {
        allowed: false,
        expectedControlId: 'recordU2',
        expectedMessage: guidance.message,
        expectedLevel: 'warning',
        rollbackAnimation,
        suppressStrongReminder: true,
      };
    }
    if (allowedActions.includes(action)) return { allowed: true };
    if (isHeatCapacityGuideRecordStep(step)) {
      return {
        allowed: false,
        expectedControlId: guidance.controlId ?? undefined,
        rollbackAnimation,
        suppressGuidance: true,
      };
    }
    return {
      allowed: false,
      expectedControlId: guidance.controlId ?? undefined,
      expectedMessage: guidance.message,
      expectedLevel: 'warning',
      rollbackAnimation,
    };
  };

  const applyGuideHeatCapacityGuardFailure = (guard: GuideHeatCapacityGuardResult) => {
    if (guard.rollbackAnimation) {
      setGuideHeatCapacityRollback((previous) => ({
        animation: guard.rollbackAnimation!,
        key: Math.max(Date.now(), (previous?.key ?? 0) + 1),
      }));
    }
    const shouldOpenStrongReminder = guard.suppressStrongReminder ? false : registerGuideHeatCapacityMiss(guard);
    if (guard.suppressGuidance) {
      if (shouldOpenStrongReminder) scheduleGuideHeatCapacityStrongReminderAfterToast(guard.expectedControlId ?? null);
      return;
    }
    showGuideHeatCapacityGuidance(guard.expectedMessage ?? '', guard.expectedControlId, guard.expectedLevel ?? 'warning', 'guide-blocked');
    if (shouldOpenStrongReminder) {
      scheduleGuideHeatCapacityStrongReminderAfterToast(guard.expectedControlId ?? null);
    }
  };

  const guardGuideHeatCapacityAction = (
    action: GuideHeatCapacityAction,
    source: 'user' | 'autoDemo' = 'user',
    interactionId?: HeatCapacityControlInteractionId,
  ) => {
    if (source === 'autoDemo') return true;
    if (!activeFile || activeFile.kind !== 'heatCapacity') return true;
    if (guideHeatCapacityActiveFileId !== activeFile.id) return true;
    const guard = getGuideHeatCapacityGuard(activeFile, action);
    if (guard.allowed) {
      const activeStrongReminderControlId = guideHeatCapacityStrongReminderActive
        ? guideHeatCapacityStrongReminderControlId
        : null;
      clearGuideHeatCapacityStrongReminder();
      clearGuideHeatCapacityGuidance();
      clearGuideHeatCapacityPendingStrongReminderTimer();
      if (shouldResetStrongFocusAfterAllowedAction(activeStrongReminderControlId, action)) {
        clearGuideHeatCapacityStrongReminderFocus();
      }
      return true;
    }
    if (!guideHeatCapacityRejectedInteractionRef.current.shouldApplyFailure(
      activeFile.id,
      action,
      interactionId,
    )) return false;
    applyGuideHeatCapacityGuardFailure(guard);
    return false;
  };

  const guideExitResetEffect = { run: () => {
    const runtimeFailureOwnsActiveGuide = Boolean(
      heatCapacityRuntimeFailureFileId &&
      heatCapacityRuntimeFailureFileId === activeHeatCapacityGuideFileId,
    );
    const reminderOwnsActiveGuide = Boolean(
      activeFile.kind === 'heatCapacity' &&
      activeFile.heatCapacityMode === 'guide' &&
      activeFile.id === guideHeatCapacityActiveFileId,
    );
    const guideReminderClockStopped = reminderOwnsActiveGuide && (
      runtimeFailureOwnsActiveGuide || !isHeatCapacityGuideReminderClockRunning(activeFile.id)
    );
    if (guideReminderClockStopped) {
      pauseGuideHeatCapacityPulse(activeFile.id);
      clearGuideHeatCapacityGuidancePulseTimer();
      return;
    }
    const pausedPulse = guideHeatCapacityPausedPulseRef.current;
    if (!pausedPulse) return;
    if (
      heatCapacityRefreshRestoring ||
      heatCapacityModeTransitionLocked ||
      activeFile.kind !== 'heatCapacity' ||
      activeFile.id !== pausedPulse.fileId ||
      activeFile.heatCapacityMode !== 'guide' ||
      activeFile.runState !== 'running' ||
      guideHeatCapacityActiveFileId !== pausedPulse.fileId
    ) return;
    guideHeatCapacityPausedPulseRef.current = null;
    restoreGuideHeatCapacityPulse(
      pausedPulse.fileId,
      pausedPulse.controlId,
      pausedPulse.remainingMs,
    );
  }, dependencies: [
    activeFile.id,
    activeFile.kind,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null,
    activeFile.kind === 'heatCapacity' ? activeFile.runState : null,
    activeHeatCapacityGuideFileId,
    guideHeatCapacityActiveFileId,
    guideHeatCapacityFocusControlId,
    guideHeatCapacityPulseActive,
    desktopExitQuiesced,
    heatCapacityModeTransitionLocked,
    heatCapacityRefreshRestoring,
    heatCapacityRuntimeFailureFileId,
  ] } satisfies WorkbenchHeatEffect;

  const guideFileEntryEffect = { run: () => {
    if (desktopExitQuiesced) return;
    if (heatCapacityRefreshRestoring) return;
    if (heatCapacityModeTransitionLocked) return;
    if (heatCapacityRuntimeFailureFileId === activeHeatCapacityGuideFileId) return;
    if (!activeHeatCapacityGuideFileId) return;
    if (guideHeatCapacityActiveFileId !== activeHeatCapacityGuideFileId) return;
    if (activeFile.kind !== 'heatCapacity' || activeFile.heatCapacityMode !== 'guide') return;
    if (activeFile.runState !== 'running') return;
    if (activeHeatCapacityGuideStep !== 'closePumpValveRequired') return;
    const focusSession = heatCapacityFocusSessionRef.current;
    if (focusSession?.fileId === activeFile.id && focusSession.mode === 'pump') {
      exitHeatCapacityFocusMode();
    }
    const noticeKey = `${activeFile.id}:${activeFile.pumpStrokeCount}:close-pump-valve`;
    if (guidePassivePumpTargetNoticeKeyRef.current === noticeKey) return;
    guidePassivePumpTargetNoticeKeyRef.current = noticeKey;
    const guidance = getGuideStepGuidance('closePumpValveRequired', activeFile);
    showGuideHeatCapacityGuidance(guidance.message, guidance.controlId, 'info', 'guide');
  }, dependencies: [
    activeFile.id,
    activeFile.kind,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null,
    activeFile.kind === 'heatCapacity' ? activeFile.runState : null,
    activeFile.kind === 'heatCapacity' ? activeFile.pumpStrokeCount : null,
    activeHeatCapacityGuideFileId,
    activeHeatCapacityGuideStep,
    desktopExitQuiesced,
    guideHeatCapacityActiveFileId,
    heatCapacityRefreshRestoring,
    heatCapacityModeTransitionLocked,
    heatCapacityRuntimeFailureFileId,
  ] } satisfies WorkbenchHeatEffect;

  const guideFocusProjectionEffect = { run: () => {
    if (desktopExitQuiesced) return;
    if (heatCapacityRefreshRestoring) return;
    if (heatCapacityModeTransitionLocked) return;
    if (heatCapacityRuntimeFailureFileId === activeHeatCapacityGuideFileId) return;
    if (!activeHeatCapacityGuideFileId) return;
    if (guideHeatCapacityActiveFileId !== activeHeatCapacityGuideFileId) return;
    if (activeFile.kind !== 'heatCapacity' || activeFile.runState !== 'running') return;
    if (!isGuideHeatCapacityPauseStep(activeHeatCapacityGuideStep)) return;
    if (heatCapacityRecordToastSequenceActive) return;
    if (heatCapacityLessonDialogActive) return;
    if (isHeatCapacityGuideRecordStep(activeHeatCapacityGuideStep)) {
      clearGuideHeatCapacityGuidance();
    }
    const latestFile = filesRef.current.find((file) => file.id === activeHeatCapacityGuideFileId);
    if (!latestFile || latestFile.kind !== 'heatCapacity') return;
    const guidance = getGuideStepGuidance(activeHeatCapacityGuideStep, latestFile);
    if (
      guideHeatCapacityPulseDeadlineAtMsRef.current !== null &&
      guideHeatCapacityPulseActive &&
      guideHeatCapacityFocusControlId === guidance.controlId
    ) {
      return;
    }
    pulseGuideHeatCapacityControl(guidance.controlId);
  }, dependencies: [
    activeHeatCapacityGuideFileId,
    activeHeatCapacityGuideStep,
    activeFile.kind,
    activeFile.kind === 'heatCapacity' ? activeFile.runState : null,
    desktopExitQuiesced,
    heatCapacityRecordToastSequenceActive,
    heatCapacityLessonDialogActive,
    guideHeatCapacityActiveFileId,
    guideHeatCapacityFocusControlId,
    guideHeatCapacityPulseActive,
    heatCapacityRefreshRestoring,
    heatCapacityModeTransitionLocked,
    heatCapacityRuntimeFailureFileId,
    settingsLanguagePreference,
  ] } satisfies WorkbenchHeatEffect;

  const guidePulseEffect = { run: () => {
    clearGuideHeatCapacityGuidancePulseTimer();
    if (desktopExitQuiesced) return undefined;
    if (heatCapacityRefreshRestoring) return undefined;
    if (heatCapacityModeTransitionLocked) return undefined;
    if (heatCapacityRuntimeFailureFileId === activeHeatCapacityGuideFileId) return undefined;
    if (!activeHeatCapacityGuideFileId) return undefined;
    if (guideHeatCapacityActiveFileId !== activeHeatCapacityGuideFileId) return undefined;
    if (activeFile.kind !== 'heatCapacity' || activeFile.runState !== 'running') return undefined;
    if (autoDemoInteractionLocked) return undefined;
    if (heatCapacityRecordToastSequenceActive) return undefined;
    if (heatCapacityLessonDialogActive) return undefined;
    if (
      activeHeatCapacityGuideStep === 'idle' ||
      activeHeatCapacityGuideStep === 'preheatRequired' ||
      activeHeatCapacityGuideStep === 'stabilizeBeforeReleaseRequired' ||
      activeHeatCapacityGuideStep === 'recoverRequired' ||
      activeHeatCapacityGuideStep === 'completed'
    ) return undefined;
    const guideSessionFileId = activeHeatCapacityGuideFileId;
    guideHeatCapacityGuidancePulseTimerRef.current = window.setInterval(() => {
      const latestFile = filesRef.current.find((file) => file.id === guideSessionFileId);
      if (!latestFile || latestFile.kind !== 'heatCapacity') return;
      if (latestFile.runState !== 'running') return;
      if (guideHeatCapacityActiveFileIdRef.current !== guideSessionFileId) return;
      if (heatCapacityModeTransitionStateRef.current.phase !== 'idle') return;
      if (desktopExitQuiescedRef.current) return;
      if (heatCapacityRuntimeFailureFileIdRef.current === guideSessionFileId) return;
      if (autoDemoInteractionLocked) return;
      if (heatCapacityRecordToastSequenceActive) return;
      if (isHeatCapacityLessonQueueBlocked()) return;
      const latestStep = getHeatCapacityGuideStep(latestFile);
      if (latestStep === 'idle' || latestStep === 'preheatRequired' || latestStep === 'completed') return;
      const guidance = getGuideStepGuidance(latestStep, latestFile);
      pulseGuideHeatCapacityControl(guidance.controlId);
    }, GUIDE_HEAT_CAPACITY_GUIDANCE_PULSE_INTERVAL_MS);
    return () => {
      clearGuideHeatCapacityGuidancePulseTimer();
    };
  }, dependencies: [
    activeHeatCapacityGuideFileId,
    activeHeatCapacityGuideStep,
    activeFile.kind,
    activeFile.kind === 'heatCapacity' ? activeFile.runState : null,
    autoDemoInteractionLocked,
    desktopExitQuiesced,
    heatCapacityRecordToastSequenceActive,
    heatCapacityLessonDialogActive,
    guideHeatCapacityActiveFileId,
    heatCapacityRefreshRestoring,
    heatCapacityModeTransitionLocked,
    heatCapacityRuntimeFailureFileId,
    settingsLanguagePreference,
  ] } satisfies WorkbenchHeatEffect;

  const strongReminderTimerEffect = { run: () => {
    const previousTimerContext = guideHeatCapacityStrongReminderTimerContextRef.current;
    const previousRemainingMs = getHeatCapacityRefreshRemainingMs(
      guideHeatCapacityStrongReminderDeadlineAtMsRef.current,
    );
    if (guideHeatCapacityStrongReminderTimerRef.current !== null) {
      window.clearTimeout(guideHeatCapacityStrongReminderTimerRef.current);
      guideHeatCapacityStrongReminderTimerRef.current = null;
    }
    const runtimeFailureOwnsActiveGuide = Boolean(
      heatCapacityRuntimeFailureFileId &&
      heatCapacityRuntimeFailureFileId === activeHeatCapacityGuideFileId,
    );
    const guideReminderClockStopped = Boolean(
      activeFile.kind === 'heatCapacity' &&
      activeFile.id === activeHeatCapacityGuideFileId &&
      activeFile.heatCapacityMode === 'guide' &&
      activeFile.runState !== 'running',
    );
    if (desktopExitQuiesced || heatCapacityModeTransitionLocked || runtimeFailureOwnsActiveGuide || guideReminderClockStopped) {
      if (previousTimerContext && previousRemainingMs !== null) {
        guideHeatCapacityRestoredStrongReminderTimerRef.current = {
          fileId: previousTimerContext.fileId,
          controlId: previousTimerContext.controlId,
          remainingMs: previousRemainingMs,
        };
        guideHeatCapacityStrongReminderDeadlineAtMsRef.current = null;
        guideHeatCapacityStrongReminderTimerContextRef.current = null;
      }
      return undefined;
    }
    if (heatCapacityRefreshRestoring) return undefined;
    const clearStaleStrongReminder = () => {
      setGuideHeatCapacityStrongReminderActive(false);
      setGuideHeatCapacityStrongReminderControlId(null);
      guideHeatCapacityMissCountRef.current = 0;
    };
    const clearStrongReminderTimerCheckpoint = () => {
      guideHeatCapacityStrongReminderDeadlineAtMsRef.current = null;
      guideHeatCapacityStrongReminderTimerContextRef.current = null;
      guideHeatCapacityRestoredStrongReminderTimerRef.current = null;
    };
    if (!activeHeatCapacityGuideFileId) {
      clearStaleStrongReminder();
      clearStrongReminderTimerCheckpoint();
      return undefined;
    }
    if (guideHeatCapacityActiveFileId !== activeHeatCapacityGuideFileId) {
      clearStaleStrongReminder();
      clearStrongReminderTimerCheckpoint();
      return undefined;
    }
    if (autoDemoInteractionLocked) {
      clearStaleStrongReminder();
      clearStrongReminderTimerCheckpoint();
      return undefined;
    }
    if (heatCapacityRecordToastSequenceActive) {
      clearStaleStrongReminder();
      clearStrongReminderTimerCheckpoint();
      return undefined;
    }
    if (heatCapacityLessonDialogActive) {
      clearStrongReminderTimerCheckpoint();
      return undefined;
    }
    if (activeFile.kind !== 'heatCapacity' || activeFile.id !== activeHeatCapacityGuideFileId) {
      clearStaleStrongReminder();
      clearStrongReminderTimerCheckpoint();
      return undefined;
    }
    if (
      activeHeatCapacityGuideStep === 'idle' ||
      activeHeatCapacityGuideStep === 'preheatRequired' ||
      activeHeatCapacityGuideStep === 'stabilizeBeforeReleaseRequired' ||
      activeHeatCapacityGuideStep === 'recoverRequired' ||
      activeHeatCapacityGuideStep === 'completed'
    ) {
      clearStaleStrongReminder();
      clearStrongReminderTimerCheckpoint();
      return undefined;
    }
    const guidance = getGuideStepGuidance(activeHeatCapacityGuideStep, activeFile);
    if (
      guideHeatCapacityStrongReminderActive &&
      guideHeatCapacityStrongReminderControlId === guidance.controlId
    ) {
      clearStrongReminderTimerCheckpoint();
      return undefined;
    }
    clearStaleStrongReminder();
    const guideSessionFileId = activeHeatCapacityGuideFileId;
    const nextTimerContext = {
      fileId: guideSessionFileId,
      step: activeHeatCapacityGuideStep,
      controlId: guidance.controlId ?? null,
    };
    const restoredTimer = guideHeatCapacityRestoredStrongReminderTimerRef.current;
    const matchesPreviousTimer = previousTimerContext?.fileId === nextTimerContext.fileId &&
      previousTimerContext.step === nextTimerContext.step &&
      previousTimerContext.controlId === nextTimerContext.controlId;
    const matchesRestoredTimer = restoredTimer?.fileId === nextTimerContext.fileId &&
      restoredTimer.controlId === nextTimerContext.controlId;
    const delayMs = matchesPreviousTimer && previousRemainingMs !== null
      ? previousRemainingMs
      : matchesRestoredTimer
        ? restoredTimer.remainingMs
        : GUIDE_HEAT_CAPACITY_STRONG_REMINDER_DELAY_MS;
    guideHeatCapacityRestoredStrongReminderTimerRef.current = null;
    guideHeatCapacityStrongReminderTimerContextRef.current = nextTimerContext;
    guideHeatCapacityStrongReminderDeadlineAtMsRef.current = Date.now() + delayMs;
    guideHeatCapacityStrongReminderTimerRef.current = window.setTimeout(() => {
      guideHeatCapacityStrongReminderTimerRef.current = null;
      guideHeatCapacityStrongReminderDeadlineAtMsRef.current = null;
      guideHeatCapacityStrongReminderTimerContextRef.current = null;
      const latestFile = filesRef.current.find((file) => file.id === guideSessionFileId);
      if (!latestFile || latestFile.kind !== 'heatCapacity') return;
      if (desktopExitQuiescedRef.current) {
        guideHeatCapacityRestoredStrongReminderTimerRef.current = {
          fileId: guideSessionFileId,
          controlId: nextTimerContext.controlId,
          remainingMs: 0,
        };
        return;
      }
      if (heatCapacityModeTransitionStateRef.current.phase !== 'idle') {
        guideHeatCapacityRestoredStrongReminderTimerRef.current = {
          fileId: guideSessionFileId,
          controlId: nextTimerContext.controlId,
          remainingMs: 0,
        };
        return;
      }
      if (heatCapacityRuntimeFailureFileIdRef.current === guideSessionFileId) {
        guideHeatCapacityRestoredStrongReminderTimerRef.current = {
          fileId: guideSessionFileId,
          controlId: nextTimerContext.controlId,
          remainingMs: 0,
        };
        return;
      }
      if (latestFile.runState !== 'running') {
        guideHeatCapacityRestoredStrongReminderTimerRef.current = {
          fileId: guideSessionFileId,
          controlId: nextTimerContext.controlId,
          remainingMs: 0,
        };
        return;
      }
      if (guideHeatCapacityActiveFileIdRef.current !== guideSessionFileId) return;
      if (autoDemoInteractionLocked) return;
      if (heatCapacityRecordToastSequenceActive) return;
      if (isHeatCapacityLessonQueueBlocked()) return;
      const latestStep = getHeatCapacityGuideStep(latestFile);
      if (latestStep === 'idle' || latestStep === 'completed') return;
      if (latestStep === 'stabilizeBeforeReleaseRequired' || latestStep === 'recoverRequired') return;
      if (isHeatCapacityGuideRecordStep(latestStep) && latestStep !== activeHeatCapacityGuideStep) return;
      const guidance = getGuideStepGuidance(latestStep, latestFile);
      activateGuideHeatCapacityStrongReminder(guidance.controlId);
    }, delayMs);
    return () => {
      if (guideHeatCapacityStrongReminderTimerRef.current !== null) {
        window.clearTimeout(guideHeatCapacityStrongReminderTimerRef.current);
        guideHeatCapacityStrongReminderTimerRef.current = null;
      }
    };
  }, dependencies: [
    activeHeatCapacityGuideFileId,
    activeHeatCapacityGuideStep,
    activeFile.id,
    activeFile.kind,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null,
    activeFile.kind === 'heatCapacity' ? activeFile.runState : null,
    autoDemoInteractionLocked,
    desktopExitQuiesced,
    heatCapacityRecordToastSequenceActive,
    heatCapacityLessonDialogActive,
    guideHeatCapacityActiveFileId,
    guideHeatCapacityStrongReminderActive,
    guideHeatCapacityStrongReminderControlId,
    heatCapacityRefreshRestoring,
    heatCapacityModeTransitionLocked,
    heatCapacityRuntimeFailureFileId,
    settingsLanguagePreference,
  ] } satisfies WorkbenchHeatEffect;

  const guideGuardFeedbackEffect = { run: () => {
    const runtimeFailureOwnsActiveGuide = Boolean(
      heatCapacityRuntimeFailureFileId &&
      heatCapacityRuntimeFailureFileId === activeHeatCapacityGuideFileId,
    );
    const guideReminderClockStopped = Boolean(
      activeFile.kind === 'heatCapacity' &&
      activeFile.id === activeHeatCapacityGuideFileId &&
      activeFile.heatCapacityMode === 'guide' &&
      activeFile.runState !== 'running',
    );
    if (desktopExitQuiesced || heatCapacityModeTransitionLocked || runtimeFailureOwnsActiveGuide || guideReminderClockStopped) {
      const remainingMs = getHeatCapacityRefreshRemainingMs(
        guideHeatCapacityPendingStrongReminderDeadlineAtMsRef.current,
      );
      if (guideHeatCapacityPendingStrongReminderTimerRef.current !== null) {
        window.clearTimeout(guideHeatCapacityPendingStrongReminderTimerRef.current);
        guideHeatCapacityPendingStrongReminderTimerRef.current = null;
      }
      if (remainingMs !== null) {
        guideHeatCapacityPausedPendingStrongReminderRef.current = {
          controlId: guideHeatCapacityPendingStrongReminderControlIdRef.current,
          remainingMs,
        };
      }
      guideHeatCapacityPendingStrongReminderDeadlineAtMsRef.current = null;
      guideHeatCapacityPendingStrongReminderControlIdRef.current = null;
      return;
    }
    if (heatCapacityRefreshRestoring) return;
    const pausedReminder = guideHeatCapacityPausedPendingStrongReminderRef.current;
    if (!pausedReminder) return;
    if (
      activeFile.kind !== 'heatCapacity' ||
      activeFile.heatCapacityMode !== 'guide' ||
      activeFile.runState !== 'running' ||
      guideHeatCapacityActiveFileId !== activeFile.id
    ) return;
    guideHeatCapacityPausedPendingStrongReminderRef.current = null;
    scheduleGuideHeatCapacityStrongReminderAfterDelay(
      pausedReminder.controlId,
      pausedReminder.remainingMs,
    );
  }, dependencies: [
    activeFile.id,
    activeFile.kind,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null,
    activeFile.kind === 'heatCapacity' ? activeFile.runState : null,
    desktopExitQuiesced,
    guideHeatCapacityActiveFileId,
    heatCapacityModeTransitionLocked,
    heatCapacityRefreshRestoring,
    heatCapacityRuntimeFailureFileId,
  ] } satisfies WorkbenchHeatEffect;
  const pumpTargetResetEffect = { run: () => {
    if (
      activeFile.kind === 'heatCapacity' &&
      activeFile.heatCapacityMode === 'guide' &&
      activeFile.heatCapacityGuideWorkflow.step === 'pumpRequired'
    ) {
      guidePassivePumpTargetNoticeKeyRef.current = null;
    }
  }, dependencies: [
    activeFile.id,
    activeFile.kind,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityGuideWorkflow.step : null,
  ] } satisfies WorkbenchHeatEffect;

  const strongReminderProjectionEffect = { run: () => {
    if (desktopExitQuiesced) return;
    if (heatCapacityModeTransitionLocked || heatCapacityRefreshRestoring) return;
    if (heatCapacityRuntimeFailureFileId === activeHeatCapacityGuideFileId) return;
    if (!activeHeatCapacityGuideFileId) return;
    if (guideHeatCapacityActiveFileId !== activeHeatCapacityGuideFileId) return;
    if (activeFile.kind !== 'heatCapacity') return;
    if (activeFile.id !== activeHeatCapacityGuideFileId) return;
    if (activeFile.heatCapacityMode !== 'guide') return;
    if (activeFile.runState !== 'running') return;
    const workflow = activeFile.heatCapacityGuideWorkflow;
    if (!workflow.strongReminderActive || !workflow.strongReminderTargetControlId) return;
    if (heatCapacityRecordToastSequenceActive) return;
    if (heatCapacityLessonDialogActive) return;
    if (
      guideHeatCapacityStrongReminderActive &&
      guideHeatCapacityStrongReminderControlId === workflow.strongReminderTargetControlId
    ) {
      return;
    }
    activateGuideHeatCapacityStrongReminder(workflow.strongReminderTargetControlId);
  }, dependencies: [
    activeFile.id,
    activeFile.kind,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null,
    activeFile.kind === 'heatCapacity' ? activeFile.runState : null,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityGuideWorkflow.step : null,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityGuideWorkflow.strongReminderActive : null,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityGuideWorkflow.strongReminderTargetControlId : null,
    activeHeatCapacityGuideFileId,
    desktopExitQuiesced,
    heatCapacityRecordToastSequenceActive,
    heatCapacityLessonDialogActive,
    guideHeatCapacityActiveFileId,
    guideHeatCapacityStrongReminderActive,
    guideHeatCapacityStrongReminderControlId,
    heatCapacityModeTransitionLocked,
    heatCapacityRefreshRestoring,
    heatCapacityRuntimeFailureFileId,
  ] } satisfies WorkbenchHeatEffect;
  return {
    effects: { guideExitReset: guideExitResetEffect, guideFileEntry: guideFileEntryEffect, guideFocusProjection: guideFocusProjectionEffect, guidePulse: guidePulseEffect, strongReminderTimer: strongReminderTimerEffect, guideGuardFeedback: guideGuardFeedbackEffect, pumpTargetReset: pumpTargetResetEffect, strongReminderProjection: strongReminderProjectionEffect }, getGuideStepGuidance, clearHeatCapacityGuideStartTimer, restoreGuideHeatCapacityPulse, clearGuideHeatCapacityGuidancePulseTimer, showGuideHeatCapacityGuidance, clearGuideHeatCapacityGuidance, pauseGuideHeatCapacityReminderTimers, activateGuideHeatCapacityStrongReminder, clearGuideHeatCapacityStrongReminder, guardGuideHeatCapacityAction };
};
