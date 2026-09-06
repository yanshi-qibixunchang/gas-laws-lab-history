import type { WorkbenchHeatEffect } from './workbenchHeatEffect.ts';

import React, { useCallback } from 'react';

import type { WorkbenchHeatCapacityState } from './workbenchHeatCapacityStateTypes.ts';

import { normalizeHeatCapacityCameraTransitionState, type HeatCapacityCameraPose, type HeatCapacitySceneCheckpointMetadata, type HeatCapacitySceneCheckpointProvider } from '../heatCapacity/HeatCapacityInstrumentScene';
import { normalizeHeatCapacityHardSphereVisualCheckpoint } from '../heatCapacity/HeatCapacityHardSphereLayer.tsx';
import { normalizeHeatCapacityUltraVisualState } from '../heatCapacity/HeatCapacityUltraInstrumentModel.tsx';
import { normalizeHeatCapacityAutoDemoResumeCursor } from '../heatCapacity/heatCapacityAutoDemoPreheatResume.ts';


import { isGuideHeatCapacityPauseStep } from '../heatCapacity/heatCapacityGuideStepModel.ts';
import { createHeatCapacityAutoDemoSteps, getHeatCapacityAutoDemoTimeline } from '../../domain/heatCapacity/heatCapacityAutoDemo.ts';


import { getHeatCapacityRefreshNumber, getHeatCapacityRefreshOptionalNumber, getHeatCapacityRefreshString, normalizeHeatCapacityFocusSession, type HeatCapacityFocusMode } from './workbenchHeatCapacityUiCheckpoint.ts';
import { hasSameHeatCapacityRuntimeRecoveryState, rebaseHeatCapacityFileAfterSuspendedWallClock } from './workbenchHeatCapacityTimeRebase.ts';
import { getHeatCapacityModeDeferredTimerRemainingMs, type HeatCapacityModeGuideCheckpoint, type HeatCapacityModeUiCheckpoint } from '../heatCapacity/heatCapacityModeUiCheckpoint.ts';

export interface useWorkbenchHeatSceneRestorePorts {
  scene: {
    heatCapacityQualityProfile: import("./../heatCapacity/heatCapacityQualityProfiles.ts").HeatCapacityQualityProfile;
    heatCapacityCameraPoseRef: React.MutableRefObject<import("./../heatCapacity/HeatCapacityInstrumentScene.tsx").HeatCapacityCameraPose | null>;
    heatCapacityCameraTransitionRef: React.MutableRefObject<import("./../heatCapacity/HeatCapacityInstrumentScene.tsx").HeatCapacityCameraTransitionState | null>;
    heatCapacityUltraVisualStateRef: React.MutableRefObject<import("./../heatCapacity/HeatCapacityUltraInstrumentModel.tsx").HeatCapacityUltraVisualState | null>;
    heatCapacityHardSphereVisualCheckpointRef: React.MutableRefObject<import("./../heatCapacity/HeatCapacityHardSphereLayer.tsx").HeatCapacityHardSphereVisualCheckpoint | null>;
    heatCapacitySceneFocusModeRef: React.MutableRefObject<import("./workbenchHeatCapacityUiCheckpoint.ts").HeatCapacityFocusMode>;
    heatCapacityFocusSessionRef: React.MutableRefObject<import("./workbenchHeatCapacityUiCheckpoint.ts").HeatCapacityFocusSession | null>;
    setHeatCapacityModeSceneRestoreSession: React.Dispatch<React.SetStateAction<import("./../heatCapacity/heatCapacityModeUiCheckpoint.ts").HeatCapacityModeUiCheckpoint | null>>;
    setHeatCapacityModeSceneRestoreRequest: React.Dispatch<React.SetStateAction<import("./../heatCapacity/HeatCapacityInstrumentScene.tsx").HeatCapacitySceneModeRestoreRequest | null>>;
    setHeatCapacitySceneReadyFileId: React.Dispatch<React.SetStateAction<string | null>>;
    setHeatCapacitySceneRestoreAcknowledged: React.Dispatch<React.SetStateAction<boolean>>;
    heatCapacityRefreshActiveFileIdRef: React.MutableRefObject<string | null>;
    heatCapacityRefreshModeRef: React.MutableRefObject<import("./../../domain/heatCapacity/heatCapacityModeTypes.ts").HeatCapacityMode | null>;
    heatCapacityRefreshCheckpointIdRef: React.MutableRefObject<string>;
    pendingHeatCapacityGuideUiRestoreRef: React.MutableRefObject<{ requestId: number; fileId: string; checkpoint: import("./../heatCapacity/heatCapacityModeUiCheckpoint.ts").HeatCapacityModeGuideCheckpoint; } | null>;
    heatCapacityRefreshRestorePendingRef: React.MutableRefObject<boolean>;
    heatCapacityRefreshRestoreAppliedRef: React.MutableRefObject<boolean>;
    setHeatCapacityInitialSceneRestoreEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    setHeatCapacityRefreshRestoring: React.Dispatch<React.SetStateAction<boolean>>;
    heatCapacitySceneCheckpointProviderRef: React.MutableRefObject<{ fileId: string; provider: import("./../heatCapacity/HeatCapacityInstrumentScene.tsx").HeatCapacitySceneCheckpointProvider; } | null>;
    heatCapacitySceneCheckpointSuppressPersistenceRef: React.MutableRefObject<boolean>;
    heatCapacityRuntimeRecoveryIntentRef: React.MutableRefObject<{ fileId: string; expectedFile: import("./workbenchHeatCapacityStateTypes.ts").WorkbenchHeatCapacityState | null; suspendedAtMs: number; projectedRunState: import("./workbenchFileState.ts").WorkbenchRunState; resumeGuideRunState: boolean; pauseDemoOnRecovery: boolean; } | null>;
    heatCapacitySceneReadyFileId: string | null;
    heatCapacityRuntimeFailureFileIdRef: React.MutableRefObject<string | null>;
    heatCapacityRefreshRestoring: boolean;
    heatCapacitySceneRestoreAcknowledged: boolean;
  };
  guide: {
    restoreGuideHeatCapacityPulse: (fileId: string, controlId: string | null | undefined, remainingMs: number | null | undefined) => void;
  };
  guideState: {
    setGuideHeatCapacityStrongReminderActive: React.Dispatch<React.SetStateAction<boolean>>;
    setGuideHeatCapacityStrongReminderControlId: React.Dispatch<React.SetStateAction<string | null>>;
    guideHeatCapacityMissCountRef: React.MutableRefObject<number>;
    guideHeatCapacityRestoredStrongReminderTimerRef: React.MutableRefObject<{ fileId: string; controlId: string | null; remainingMs: number; } | null>;
    guideHeatCapacityPausedPendingStrongReminderRef: React.MutableRefObject<{ controlId: string | null; remainingMs: number; } | null>;
    guideHeatCapacityActiveFileIdRef: React.MutableRefObject<string | null>;
    setGuideHeatCapacityActiveFileId: React.Dispatch<React.SetStateAction<string | null>>;
    getHeatCapacityGuideStep: (file: import("./workbenchHeatCapacityStateTypes.ts").WorkbenchHeatCapacityState) => import("./../heatCapacity/heatCapacityGuideStepModel.ts").GuideHeatCapacityStep;
  };
  lessonState: {
    heatCapacityGuideLessonShownRef: React.MutableRefObject<Set<string>>;
    heatCapacityLessonDialogActiveRef: React.MutableRefObject<boolean>;
    heatCapacityLessonPausedFileIdRef: React.MutableRefObject<string | null>;
    setHeatCapacityGuideLessonDialog: React.Dispatch<React.SetStateAction<import("./workbenchHeatCapacityGuidePresentation.ts").HeatCapacityGuideLessonDialogState | null>>;
    heatCapacityGuideLessonClosePausedRef: React.MutableRefObject<import("./workbenchHeatCapacityUiCheckpoint.ts").HeatCapacityLessonCloseTimerPlan | null>;
  };
  checklist: {
    heatCapacityGuideChecklistViewedIndexRef: React.MutableRefObject<number>;
    setHeatCapacityGuideChecklistViewedIndex: React.Dispatch<React.SetStateAction<number>>;
  };
  runtimeLifecycle: {
    clearHeatCapacityModeTransientUiRuntime: () => void;
  };
  pump: {
    restorePausedHeatCapacityPumpAnimation: (fileId: string, releaseRemainingMs: number | null, idleRemainingMs: number | null) => void;
    scheduleHeatCapacityPumpAnimation: (fileId: string, releaseDelayMs: number | null, idleDelayMs: number | null) => void;
  };
  demoState: {
    heatCapacityAutoDemoFileIdRef: React.MutableRefObject<string | null>;
    heatCapacityAutoDemoPausedFileIdRef: React.MutableRefObject<string | null>;
    heatCapacityAutoDemoTimelineRef: React.MutableRefObject<import("./../../domain/heatCapacity/heatCapacityAutoDemo.ts").HeatCapacityAutoDemoTimelineItem[]>;
    heatCapacityAutoDemoPausedElapsedMsRef: React.MutableRefObject<number>;
    heatCapacityAutoDemoInitialDelayRemainingMsRef: React.MutableRefObject<number>;
    heatCapacityAutoDemoLastProcessedTimelineIndexRef: React.MutableRefObject<number>;
    heatCapacityAutoDemoExecutedItemKeysRef: React.MutableRefObject<Set<string>>;
    heatCapacityAutoDemoStartedAtMsRef: React.MutableRefObject<number>;
    setAutoDemoPhase: React.Dispatch<React.SetStateAction<import("./../heatCapacity/heatCapacityModeControlModel.ts").HeatCapacityAutoDemoPhase>>;
    heatCapacityModeTransitionDemoClockRef: React.MutableRefObject<import("./../heatCapacity/heatCapacityModeTransitionDemoClock.ts").HeatCapacityModeTransitionDemoClock | null>;
    setAutoDemoStepPanelMode: React.Dispatch<React.SetStateAction<"hidden" | "visible" | "exiting">>;
    setAutoDemoStepIndex: React.Dispatch<React.SetStateAction<number>>;
    setAutoDemoStepCount: React.Dispatch<React.SetStateAction<number>>;
    setAutoDemoStepTitle: React.Dispatch<React.SetStateAction<string>>;
    setAutoDemoStepDescription: React.Dispatch<React.SetStateAction<string>>;
    setAutoDemoStepTarget: React.Dispatch<React.SetStateAction<string>>;
    setAutoDemoStepProgressCriterion: React.Dispatch<React.SetStateAction<string>>;
    setAutoDemoStepNote: React.Dispatch<React.SetStateAction<string>>;
    setDemoFocusControlId: React.Dispatch<React.SetStateAction<string | null>>;
    setDemoFocusPulseActive: React.Dispatch<React.SetStateAction<boolean>>;
    demoCameraFocusModeRef: React.MutableRefObject<"instrument" | "pump" | "bottle" | null>;
    setDemoCameraFocusMode: React.Dispatch<React.SetStateAction<"instrument" | "pump" | "bottle" | null>>;
    setDemoCameraFocusKey: React.Dispatch<React.SetStateAction<number>>;
    setAutoDemoCompletionMessage: React.Dispatch<React.SetStateAction<string | null>>;
    heatCapacityAutoDemoCompleteToastTimerGenerationRef: React.MutableRefObject<number>;
    heatCapacityAutoDemoCompleteToastDeadlineAtMsRef: React.MutableRefObject<number | null>;
    heatCapacityAutoDemoCompleteToastPausedRef: React.MutableRefObject<{ fileId: string; remainingMs: number; } | null>;
  };
  demoUi: {
    showHeatCapacityAutoDemoCompletionToast: (message?: string, durationMs?: number) => void;
    scheduleHeatCapacityAutoDemoCompletionToastExpiry: (delayMs: number) => void;
  };
  lifecycle: {
    desktopExitQuiescedRef: React.MutableRefObject<boolean>;
    skipInitialConsoleScrollRef: React.MutableRefObject<boolean>;
    scheduleHeatCapacitySemanticSceneCheckpointRef: React.MutableRefObject<() => void>;
    heatCapacityLifecycleFlushInProgressRef: React.MutableRefObject<boolean>;
    heatCapacityRefreshPersistRef: React.MutableRefObject<() => void>;
    scheduleWorkspacePersistenceRef: React.MutableRefObject<(reason?: import("./workbenchPersistenceScheduler.ts").WorkbenchPersistenceReason | undefined) => boolean>;
    desktopExitQuiesced: boolean;
  };
  workspace: {
    filesRef: React.MutableRefObject<import("./workbenchFileUnion.ts").WorkbenchFileState[]>;
    setFiles: React.Dispatch<React.SetStateAction<import("./workbenchFileUnion.ts").WorkbenchFileState[]>>;
    activeFileIdRef: React.MutableRefObject<string>;
    activeFileId: string;
  };
  initial: {
    initialHeatCapacityRefreshSession: import("./workbenchHeatCapacityRefreshSession.ts").WorkbenchHeatCapacityRefreshSession | null;
  };
  feedback: {
    heatCapacityPressureAlarmFileIdRef: React.MutableRefObject<string | null>;
    heatCapacityPressureAlarmTimerGenerationRef: React.MutableRefObject<number>;
    heatCapacityPressureAlarmTimerRef: React.MutableRefObject<number | null>;
    heatCapacityPressureAlarmDeadlineAtMsRef: React.MutableRefObject<number | null>;
    desktopExitPausedPressureAlarmRef: React.MutableRefObject<{ fileId: string; remainingMs: number; } | null>;
    heatCapacityPressureAlarmVisibleRef: React.MutableRefObject<boolean>;
    setHeatCapacityPressureAlarmVisible: React.Dispatch<React.SetStateAction<boolean>>;
    heatCapacityClosePumpValveReminderFileIdRef: React.MutableRefObject<string | null>;
    clearHeatCapacityClosePumpValveReminder: () => void;
    clearHeatCapacityToastQueue: () => void;
    heatCapacityToastCurrentRef: React.MutableRefObject<import("./../heatCapacity/heatCapacityToastController.ts").HeatCapacityToastMessage | null>;
    heatCapacityToastTimerGenerationRef: React.MutableRefObject<number>;
    heatCapacityToastDeadlineAtMsRef: React.MutableRefObject<number | null>;
    heatCapacityToastPausedRef: React.MutableRefObject<{ fileId: string; remainingMs: number; } | null>;
    scheduleHeatCapacityToastAdvance: (delayMs?: number) => void;
    heatCapacityRecordSuccessPausedRef: React.MutableRefObject<import("./workbenchHeatCapacityUiCheckpoint.ts").HeatCapacityRecordSuccessTimerPlan | null>;
    scheduleHeatCapacityRecordSuccessToastTimers: (followUpMessage: string | null, followUpDelayMs: number | null, releaseDelayMs: number) => void;
    scheduleHeatCapacityPressureAlarmExpiry: (fileId: string, delayMs: number) => void;
    desktopExitPausedClosePumpValveReminderRef: React.MutableRefObject<{ fileId: string; remainingMs: number; } | null>;
    scheduleHeatCapacityClosePumpValveReminder: (fileId: string, delayMs: number) => void;
  };
  demoRuntime: {
    clearHeatCapacityAutoDemoTimers: () => void;
    scheduleHeatCapacityAutoDemoTimeline: (demoFileId: string, timeline: import("./../../domain/heatCapacity/heatCapacityAutoDemo.ts").HeatCapacityAutoDemoTimelineItem[], startFromElapsedMs?: number, initialDelayMs?: number) => void;
  };
  lessons: {
    scheduleHeatCapacityGuideLessonClose: (fileId: string, shouldResumeAutoDemo: boolean, delayMs: number) => void;
  };
}

export const useWorkbenchHeatSceneRestore = (ports: useWorkbenchHeatSceneRestorePorts) => {
  const { heatCapacityQualityProfile, heatCapacityCameraPoseRef, heatCapacityCameraTransitionRef, heatCapacityUltraVisualStateRef, heatCapacityHardSphereVisualCheckpointRef, heatCapacitySceneFocusModeRef, heatCapacityFocusSessionRef, setHeatCapacityModeSceneRestoreSession, setHeatCapacityModeSceneRestoreRequest, setHeatCapacitySceneReadyFileId, setHeatCapacitySceneRestoreAcknowledged, heatCapacityRefreshActiveFileIdRef, heatCapacityRefreshModeRef, heatCapacityRefreshCheckpointIdRef, pendingHeatCapacityGuideUiRestoreRef, heatCapacityRefreshRestorePendingRef, heatCapacityRefreshRestoreAppliedRef, setHeatCapacityInitialSceneRestoreEnabled, setHeatCapacityRefreshRestoring, heatCapacitySceneCheckpointProviderRef, heatCapacitySceneCheckpointSuppressPersistenceRef, heatCapacityRuntimeRecoveryIntentRef, heatCapacitySceneReadyFileId, heatCapacityRuntimeFailureFileIdRef, heatCapacityRefreshRestoring, heatCapacitySceneRestoreAcknowledged } = ports.scene;
  const { restoreGuideHeatCapacityPulse } = ports.guide;
  const { setGuideHeatCapacityStrongReminderActive, setGuideHeatCapacityStrongReminderControlId, guideHeatCapacityMissCountRef, guideHeatCapacityRestoredStrongReminderTimerRef, guideHeatCapacityPausedPendingStrongReminderRef, guideHeatCapacityActiveFileIdRef, setGuideHeatCapacityActiveFileId, getHeatCapacityGuideStep } = ports.guideState;
  const { heatCapacityGuideLessonShownRef, heatCapacityLessonDialogActiveRef, heatCapacityLessonPausedFileIdRef, setHeatCapacityGuideLessonDialog, heatCapacityGuideLessonClosePausedRef } = ports.lessonState;
  const { heatCapacityGuideChecklistViewedIndexRef, setHeatCapacityGuideChecklistViewedIndex } = ports.checklist;
  const { clearHeatCapacityModeTransientUiRuntime } = ports.runtimeLifecycle;
  const { restorePausedHeatCapacityPumpAnimation, scheduleHeatCapacityPumpAnimation } = ports.pump;
  const { heatCapacityAutoDemoFileIdRef, heatCapacityAutoDemoPausedFileIdRef, heatCapacityAutoDemoTimelineRef, heatCapacityAutoDemoPausedElapsedMsRef, heatCapacityAutoDemoInitialDelayRemainingMsRef, heatCapacityAutoDemoLastProcessedTimelineIndexRef, heatCapacityAutoDemoExecutedItemKeysRef, heatCapacityAutoDemoStartedAtMsRef, setAutoDemoPhase, heatCapacityModeTransitionDemoClockRef, setAutoDemoStepPanelMode, setAutoDemoStepIndex, setAutoDemoStepCount, setAutoDemoStepTitle, setAutoDemoStepDescription, setAutoDemoStepTarget, setAutoDemoStepProgressCriterion, setAutoDemoStepNote, setDemoFocusControlId, setDemoFocusPulseActive, demoCameraFocusModeRef, setDemoCameraFocusMode, setDemoCameraFocusKey, setAutoDemoCompletionMessage, heatCapacityAutoDemoCompleteToastTimerGenerationRef, heatCapacityAutoDemoCompleteToastDeadlineAtMsRef, heatCapacityAutoDemoCompleteToastPausedRef } = ports.demoState;
  const { showHeatCapacityAutoDemoCompletionToast, scheduleHeatCapacityAutoDemoCompletionToastExpiry } = ports.demoUi;
  const { desktopExitQuiescedRef, skipInitialConsoleScrollRef, scheduleHeatCapacitySemanticSceneCheckpointRef, heatCapacityLifecycleFlushInProgressRef, heatCapacityRefreshPersistRef, scheduleWorkspacePersistenceRef, desktopExitQuiesced } = ports.lifecycle;
  const { filesRef, setFiles, activeFileIdRef, activeFileId } = ports.workspace;
  const { initialHeatCapacityRefreshSession } = ports.initial;
  const { heatCapacityPressureAlarmFileIdRef, heatCapacityPressureAlarmTimerGenerationRef, heatCapacityPressureAlarmTimerRef, heatCapacityPressureAlarmDeadlineAtMsRef, desktopExitPausedPressureAlarmRef, heatCapacityPressureAlarmVisibleRef, setHeatCapacityPressureAlarmVisible, heatCapacityClosePumpValveReminderFileIdRef, clearHeatCapacityClosePumpValveReminder, clearHeatCapacityToastQueue, heatCapacityToastCurrentRef, heatCapacityToastTimerGenerationRef, heatCapacityToastDeadlineAtMsRef, heatCapacityToastPausedRef, scheduleHeatCapacityToastAdvance, heatCapacityRecordSuccessPausedRef, scheduleHeatCapacityRecordSuccessToastTimers, scheduleHeatCapacityPressureAlarmExpiry, desktopExitPausedClosePumpValveReminderRef, scheduleHeatCapacityClosePumpValveReminder } = ports.feedback;
  const { clearHeatCapacityAutoDemoTimers, scheduleHeatCapacityAutoDemoTimeline } = ports.demoRuntime;
  const { scheduleHeatCapacityGuideLessonClose } = ports.lessons;
  const setHeatCapacityModeSceneCheckpoint = (
    checkpoint: HeatCapacityModeUiCheckpoint | null,
    modeTransitionRequestId: number | null = null,
  ) => {
    const cameraPose: HeatCapacityCameraPose | null = checkpoint?.scene.cameraPose
      ? {
          position: checkpoint.scene.cameraPose.position,
          target: checkpoint.scene.cameraPose.target,
          fov: checkpoint.scene.cameraPose.fovDeg,
        }
      : null;
    const focusMode: HeatCapacityFocusMode = checkpoint?.scene.focusMode ?? 'none';
    const cameraTransition = normalizeHeatCapacityCameraTransitionState(
      checkpoint?.scene.cameraTransition,
    );
    const ultraVisualState = normalizeHeatCapacityUltraVisualState(
      checkpoint?.scene.ultraVisualState,
    );
    const hardSphereVisualCheckpoint = normalizeHeatCapacityHardSphereVisualCheckpoint(
      checkpoint?.scene.hardSphereVisualCheckpoint,
      heatCapacityQualityProfile.renderModel === 'ultraGlb' ? 'ultra-cylinder' : 'skeleton-box',
    );
    heatCapacityCameraPoseRef.current = cameraPose;
    heatCapacityCameraTransitionRef.current = cameraTransition;
    heatCapacityUltraVisualStateRef.current = ultraVisualState;
    heatCapacityHardSphereVisualCheckpointRef.current = hardSphereVisualCheckpoint;
    heatCapacitySceneFocusModeRef.current = focusMode;
    const focusSession = normalizeHeatCapacityFocusSession(checkpoint?.scene.focusSession);
    heatCapacityFocusSessionRef.current = focusSession?.fileId === checkpoint?.fileId ? focusSession : null;
    setHeatCapacityModeSceneRestoreSession(checkpoint);
    setHeatCapacityModeSceneRestoreRequest(modeTransitionRequestId === null ? null : {
      requestId: modeTransitionRequestId,
      cameraPose,
      focusMode,
      ultraVisualState,
      hardSphereVisualCheckpoint,
    });
    if (modeTransitionRequestId === null) setHeatCapacitySceneReadyFileId(null);
    setHeatCapacitySceneRestoreAcknowledged(true);
  };

  const restoreHeatCapacityGuideUiCheckpoint = (
    fileId: string,
    guideCheckpoint: HeatCapacityModeGuideCheckpoint,
  ) => {
    const normalReminder = guideCheckpoint.normalReminder;
    const normalReminderRemainingMs = getHeatCapacityModeDeferredTimerRemainingMs(
      normalReminder?.timer,
    );
    restoreGuideHeatCapacityPulse(
      fileId,
      normalReminder?.controlId,
      normalReminderRemainingMs,
    );
    setGuideHeatCapacityStrongReminderActive(guideCheckpoint.strongReminder.active);
    setGuideHeatCapacityStrongReminderControlId(guideCheckpoint.strongReminder.controlId);
    guideHeatCapacityMissCountRef.current = guideCheckpoint.missCount;
    const baseStrongReminderRemainingMs = getHeatCapacityModeDeferredTimerRemainingMs(
      guideCheckpoint.baseStrongReminder?.timer,
    );
    guideHeatCapacityRestoredStrongReminderTimerRef.current = baseStrongReminderRemainingMs !== null
      ? {
          fileId,
          controlId: guideCheckpoint.baseStrongReminder?.controlId ?? null,
          remainingMs: baseStrongReminderRemainingMs,
        }
      : null;
    const pendingStrongReminderRemainingMs = getHeatCapacityModeDeferredTimerRemainingMs(
      guideCheckpoint.pendingStrongReminder?.timer,
    );
    guideHeatCapacityPausedPendingStrongReminderRef.current = pendingStrongReminderRemainingMs !== null
      ? {
          controlId: guideCheckpoint.pendingStrongReminder?.controlId ?? null,
          remainingMs: pendingStrongReminderRemainingMs,
        }
      : null;
    heatCapacityGuideLessonShownRef.current = new Set(guideCheckpoint.shownLessonIds);
    heatCapacityGuideChecklistViewedIndexRef.current = guideCheckpoint.checklistViewedIndex;
    setHeatCapacityGuideChecklistViewedIndex(guideCheckpoint.checklistViewedIndex);
    const lessonDialog = guideCheckpoint.lessonDialog;
    if (lessonDialog?.kind === 'intro') {
      heatCapacityLessonDialogActiveRef.current = true;
      heatCapacityLessonPausedFileIdRef.current = fileId;
      setHeatCapacityGuideLessonDialog({ kind: 'intro', pageIndex: lessonDialog.pageIndex });
    } else if (lessonDialog?.kind === 'step') {
      heatCapacityLessonDialogActiveRef.current = true;
      heatCapacityLessonPausedFileIdRef.current = fileId;
      setHeatCapacityGuideLessonDialog({
        kind: 'step',
          lessonId: lessonDialog.lessonId,
      });
    }
  };

  const applyHeatCapacityModeUiProjection = (
    file: WorkbenchHeatCapacityState,
    checkpoint: HeatCapacityModeUiCheckpoint | null,
    modeTransitionRequestId: number | null = null,
  ) => {
    clearHeatCapacityModeTransientUiRuntime();
    setHeatCapacityModeSceneCheckpoint(checkpoint, modeTransitionRequestId);
    heatCapacityRefreshActiveFileIdRef.current = file.id;
    heatCapacityRefreshModeRef.current = file.heatCapacityMode;
    heatCapacityRefreshCheckpointIdRef.current = checkpoint?.checkpointId ?? `${file.id}:${Date.now()}`;

    if (checkpoint?.pumpAnimation) {
      const storedReleaseRemainingMs = getHeatCapacityModeDeferredTimerRemainingMs(
        checkpoint.pumpAnimation.release,
      );
      const storedIdleRemainingMs = getHeatCapacityModeDeferredTimerRemainingMs(
        checkpoint.pumpAnimation.idle,
      );
      const releaseRemainingMs = file.pumpBulbState === 'compressing'
        ? storedReleaseRemainingMs ?? 0
        : null;
      const idleRemainingMs = Math.max(storedIdleRemainingMs ?? 0, releaseRemainingMs ?? 0);
      const restorePaused = file.runState === 'paused' ||
        (checkpoint.mode === 'demo' && checkpoint.payload.demo.phase === 'paused') ||
        (checkpoint.mode === 'guide' && checkpoint.payload.guide.lessonDialog !== null);
      if (restorePaused) {
        restorePausedHeatCapacityPumpAnimation(file.id, releaseRemainingMs, idleRemainingMs);
      } else {
        scheduleHeatCapacityPumpAnimation(file.id, releaseRemainingMs, idleRemainingMs);
      }
    }

    if (file.heatCapacityMode === 'demo' && checkpoint?.mode === 'demo') {
      const demoCheckpoint = checkpoint.payload.demo;
      const steps = createHeatCapacityAutoDemoSteps();
      const timeline = getHeatCapacityAutoDemoTimeline(steps);
      const resumeCursor = normalizeHeatCapacityAutoDemoResumeCursor(timeline, {
        elapsedMs: demoCheckpoint.elapsedMs,
        currentItemIndex: demoCheckpoint.timeline.currentItemIndex,
        currentStepId: demoCheckpoint.timeline.currentStepId,
        executedItemKeys: demoCheckpoint.timeline.executedItemKeys,
      });
      heatCapacityAutoDemoFileIdRef.current = file.id;
      heatCapacityAutoDemoPausedFileIdRef.current = file.id;
      heatCapacityAutoDemoTimelineRef.current = timeline;
      heatCapacityAutoDemoPausedElapsedMsRef.current = resumeCursor.elapsedMs;
      heatCapacityAutoDemoInitialDelayRemainingMsRef.current = demoCheckpoint.initialDelayRemainingMs;
      heatCapacityAutoDemoLastProcessedTimelineIndexRef.current = resumeCursor.lastProcessedTimelineIndex;
      heatCapacityAutoDemoExecutedItemKeysRef.current = new Set(resumeCursor.executedItemKeys);
      heatCapacityAutoDemoStartedAtMsRef.current = performance.now() - resumeCursor.elapsedMs;
      const resumeAfterModeTransition = modeTransitionRequestId !== null && demoCheckpoint.phase === 'running';
      setAutoDemoPhase(resumeAfterModeTransition ? 'running' : 'paused');
      heatCapacityModeTransitionDemoClockRef.current = resumeAfterModeTransition
        ? {
            fileId: file.id,
            elapsedMs: resumeCursor.elapsedMs,
            initialDelayRemainingMs: demoCheckpoint.initialDelayRemainingMs,
          }
        : null;
      setAutoDemoStepPanelMode(
        demoCheckpoint.stepPanel.mode === 'hidden'
          ? 'hidden'
          : demoCheckpoint.stepPanel.mode,
      );
      setAutoDemoStepIndex(demoCheckpoint.stepPanel.stepIndex);
      setAutoDemoStepCount(demoCheckpoint.stepPanel.stepCount || steps.length);
      setAutoDemoStepTitle(demoCheckpoint.stepPanel.title);
      setAutoDemoStepDescription(demoCheckpoint.stepPanel.description);
      setAutoDemoStepTarget(demoCheckpoint.stepPanel.target);
      setAutoDemoStepProgressCriterion(demoCheckpoint.stepPanel.progressCriterion);
      setAutoDemoStepNote(demoCheckpoint.stepPanel.note);
      setDemoFocusControlId(demoCheckpoint.focusControlId);
      setDemoFocusPulseActive(demoCheckpoint.focusPulseActive);
      demoCameraFocusModeRef.current = demoCheckpoint.cameraMode;
      setDemoCameraFocusMode(demoCheckpoint.cameraMode);
      setDemoCameraFocusKey(demoCheckpoint.cameraFocusKey);
      if (
        demoCheckpoint.completionMessage &&
        demoCheckpoint.completionMessageRemainingMs !== null
      ) {
        showHeatCapacityAutoDemoCompletionToast(
          demoCheckpoint.completionMessage,
          demoCheckpoint.completionMessageRemainingMs,
        );
      } else {
        setAutoDemoCompletionMessage(demoCheckpoint.completionMessage);
      }
      return;
    }

    if (file.heatCapacityMode === 'guide') {
      guideHeatCapacityActiveFileIdRef.current = file.id;
      setGuideHeatCapacityActiveFileId(file.id);
      const guideCheckpoint = checkpoint?.mode === 'guide' ? checkpoint.payload.guide : null;
      if (guideCheckpoint && modeTransitionRequestId !== null) {
        pendingHeatCapacityGuideUiRestoreRef.current = {
          requestId: modeTransitionRequestId,
          fileId: file.id,
          checkpoint: guideCheckpoint,
        };
      } else if (guideCheckpoint) {
        restoreHeatCapacityGuideUiCheckpoint(file.id, guideCheckpoint);
      }
      return;
    }

    pendingHeatCapacityGuideUiRestoreRef.current = null;
    guideHeatCapacityActiveFileIdRef.current = null;
    setGuideHeatCapacityActiveFileId(null);
  };

  const commitHeatCapacityFileProjection = (nextFile: WorkbenchHeatCapacityState) => {
    if (desktopExitQuiescedRef.current) return;
    const nextFiles = filesRef.current.map((file) => file.id === nextFile.id ? nextFile : file);
    filesRef.current = nextFiles;
    setFiles(nextFiles);
  };

  const activeFileOwnsPendingHeatCapacityRefresh = (file: WorkbenchHeatCapacityState) => (
    heatCapacityRefreshRestorePendingRef.current &&
    initialHeatCapacityRefreshSession?.activeHeatCapacityFileId === file.id &&
    initialHeatCapacityRefreshSession.mode === file.heatCapacityMode
  );

  const cancelPendingHeatCapacityRefreshRestore = () => {
    const restoreSession = initialHeatCapacityRefreshSession;
    if (!restoreSession || !heatCapacityRefreshRestorePendingRef.current) return false;
    if (heatCapacityPressureAlarmFileIdRef.current === restoreSession.activeHeatCapacityFileId) {
      heatCapacityPressureAlarmTimerGenerationRef.current += 1;
      if (heatCapacityPressureAlarmTimerRef.current !== null) {
        window.clearTimeout(heatCapacityPressureAlarmTimerRef.current);
        heatCapacityPressureAlarmTimerRef.current = null;
      }
      heatCapacityPressureAlarmDeadlineAtMsRef.current = null;
      heatCapacityPressureAlarmFileIdRef.current = null;
      desktopExitPausedPressureAlarmRef.current = null;
      heatCapacityPressureAlarmVisibleRef.current = false;
      setHeatCapacityPressureAlarmVisible(false);
    }
    if (
      heatCapacityClosePumpValveReminderFileIdRef.current === restoreSession.activeHeatCapacityFileId
    ) {
      clearHeatCapacityClosePumpValveReminder();
    }
    clearHeatCapacityToastQueue();
    heatCapacityRefreshRestorePendingRef.current = false;
    heatCapacityRefreshRestoreAppliedRef.current = true;
    skipInitialConsoleScrollRef.current = false;
    setHeatCapacityInitialSceneRestoreEnabled(false);
    setHeatCapacityRefreshRestoring(false);
    setHeatCapacitySceneRestoreAcknowledged(true);
    return true;
  };

  const handleHeatCapacityCameraPoseChange = (sceneFileId: string, cameraPose: HeatCapacityCameraPose) => {
    if (sceneFileId !== activeFileIdRef.current) return;
    heatCapacityCameraPoseRef.current = cameraPose;
  };

  const handleHeatCapacitySceneCheckpointProviderChange = useCallback((
    sceneFileId: string,
    provider: HeatCapacitySceneCheckpointProvider | null,
  ) => {
    if (provider) {
      heatCapacitySceneCheckpointProviderRef.current = { fileId: sceneFileId, provider };
      if (sceneFileId === activeFileIdRef.current) {
        scheduleHeatCapacitySemanticSceneCheckpointRef.current();
      }
      return;
    }
    if (heatCapacitySceneCheckpointProviderRef.current?.fileId === sceneFileId) {
      heatCapacitySceneCheckpointProviderRef.current = null;
    }
  }, []);

  const handleHeatCapacitySceneRestoreRevealComplete = useCallback((sceneFileId: string) => {
    if (sceneFileId !== activeFileIdRef.current) return;
    setHeatCapacityInitialSceneRestoreEnabled(false);
  }, []);

  const handleHeatCapacitySceneCheckpoint = (
    sceneFileId: string,
    cameraPose: HeatCapacityCameraPose,
    metadata: HeatCapacitySceneCheckpointMetadata,
  ) => {
    if (sceneFileId !== activeFileIdRef.current) return;
    const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    if (!currentFile || currentFile.kind !== 'heatCapacity' || currentFile.id !== sceneFileId) return;
    if (
      heatCapacityRefreshActiveFileIdRef.current !== currentFile.id ||
      heatCapacityRefreshModeRef.current !== currentFile.heatCapacityMode
    ) {
      heatCapacityRefreshActiveFileIdRef.current = currentFile.id;
      heatCapacityRefreshModeRef.current = currentFile.heatCapacityMode;
      heatCapacityRefreshCheckpointIdRef.current = `${currentFile.id}:${metadata.capturedAtMs}`;
    }
    heatCapacityCameraPoseRef.current = cameraPose;
    heatCapacityCameraTransitionRef.current = metadata.cameraTransition;
    heatCapacityUltraVisualStateRef.current = metadata.ultraVisualState;
    heatCapacityHardSphereVisualCheckpointRef.current = metadata.hardSphereVisualCheckpoint;
    if (
      !heatCapacityLifecycleFlushInProgressRef.current &&
      !heatCapacitySceneCheckpointSuppressPersistenceRef.current
    ) {
      heatCapacityRefreshPersistRef.current();
    }
  };

  const rebaseHeatCapacityFileForAutomaticSuspension = (
    file: WorkbenchHeatCapacityState,
    suspendedAtMs: number,
    resumedAtMs: number,
  ) => {
    const recoveryIntent = heatCapacityRuntimeRecoveryIntentRef.current;
    const recoveryRevisionMatches = recoveryIntent?.fileId === file.id &&
      recoveryIntent.expectedFile !== null &&
      hasSameHeatCapacityRuntimeRecoveryState(file, recoveryIntent.expectedFile);
    const rebasedFile = rebaseHeatCapacityFileAfterSuspendedWallClock(
      file,
      suspendedAtMs,
      resumedAtMs,
    );
    if (
      recoveryRevisionMatches &&
      recoveryIntent &&
      heatCapacityRuntimeRecoveryIntentRef.current === recoveryIntent
    ) {
      const runtimeIntervalCoveredMs = Math.max(
        0,
        resumedAtMs - Math.max(suspendedAtMs, recoveryIntent.suspendedAtMs),
      );
      heatCapacityRuntimeRecoveryIntentRef.current = {
        ...recoveryIntent,
        expectedFile: rebasedFile,
        suspendedAtMs: recoveryIntent.suspendedAtMs + runtimeIntervalCoveredMs,
      };
    }
    return rebasedFile;
  };

  const initialSceneRestoreEffect = { run: () => {
    if (desktopExitQuiescedRef.current) return;
    const restoreSession = initialHeatCapacityRefreshSession;
    if (!restoreSession || heatCapacityRefreshRestoreAppliedRef.current) return;
    const cancelPendingRestore = () => {
      cancelPendingHeatCapacityRefreshRestore();
      scheduleWorkspacePersistenceRef.current();
    };
    if (activeFileId !== restoreSession.activeHeatCapacityFileId) {
      cancelPendingRestore();
      return;
    }
    if (heatCapacitySceneReadyFileId !== restoreSession.activeHeatCapacityFileId) return;
    const restoredFile = filesRef.current.find((file) => file.id === restoreSession.activeHeatCapacityFileId);
    if (!restoredFile || restoredFile.kind !== 'heatCapacity' || restoredFile.heatCapacityMode !== restoreSession.mode) {
      cancelPendingRestore();
      return;
    }

    heatCapacityRefreshRestoreAppliedRef.current = true;
    const resumedAtMs = Date.now();
    const rebasedFiles = filesRef.current.map((file) => {
      if (file.id !== restoreSession.activeHeatCapacityFileId || file.kind !== 'heatCapacity') return file;
      return rebaseHeatCapacityFileForAutomaticSuspension(
        file,
        restoreSession.capturedAtMs,
        resumedAtMs,
      );
    });
    filesRef.current = rebasedFiles;
    setFiles(rebasedFiles);

    const resumedHeatCapacityFile = rebasedFiles.find(
      (file) => file.id === restoreSession.activeHeatCapacityFileId,
    );
    const restoreRuntimePaused = heatCapacityRuntimeFailureFileIdRef.current !== null;
    if (
      resumedHeatCapacityFile?.kind === 'heatCapacity' &&
      resumedHeatCapacityFile.pumpBulbState !== 'idle'
    ) {
      const storedPumpAnimationFileId = getHeatCapacityRefreshString(
        restoreSession.ui.layout,
        'pumpAnimationFileId',
      );
      const storedReleaseRemainingMs = getHeatCapacityRefreshNumber(
        restoreSession.ui.layout,
        'pumpAnimationReleaseRemainingMs',
        -1,
      );
      const storedIdleRemainingMs = getHeatCapacityRefreshNumber(
        restoreSession.ui.layout,
        'pumpAnimationIdleRemainingMs',
        -1,
      );
      const releaseRemainingMs = resumedHeatCapacityFile.pumpBulbState === 'compressing'
        ? storedPumpAnimationFileId === resumedHeatCapacityFile.id && storedReleaseRemainingMs >= 0
          ? storedReleaseRemainingMs
          : 0
        : null;
      const idleRemainingMs = storedPumpAnimationFileId === resumedHeatCapacityFile.id && storedIdleRemainingMs >= 0
        ? Math.max(storedIdleRemainingMs, releaseRemainingMs ?? 0)
        : releaseRemainingMs ?? 0;
      const restorePumpAnimationPaused = resumedHeatCapacityFile.runState === 'paused' ||
        restoreRuntimePaused ||
        restoreSession.demo.phase === 'paused' ||
        restoreSession.guide.lessonDialog !== null ||
        (
          restoreSession.mode === 'guide' &&
          isGuideHeatCapacityPauseStep(getHeatCapacityGuideStep(resumedHeatCapacityFile))
        );
      if (restorePumpAnimationPaused) {
        restorePausedHeatCapacityPumpAnimation(
          resumedHeatCapacityFile.id,
          releaseRemainingMs,
          idleRemainingMs,
        );
      } else {
        scheduleHeatCapacityPumpAnimation(
          resumedHeatCapacityFile.id,
          releaseRemainingMs,
          idleRemainingMs,
        );
      }
    }

    if (restoreSession.mode === 'demo' && restoreSession.demo.phase !== 'idle') {
      const steps = createHeatCapacityAutoDemoSteps();
      const timeline = getHeatCapacityAutoDemoTimeline(steps);
      const resumeCursor = normalizeHeatCapacityAutoDemoResumeCursor(timeline, {
        elapsedMs: restoreSession.demo.elapsedMs,
        currentItemIndex: restoreSession.demo.timeline.currentItemIndex,
        currentStepId: restoreSession.demo.timeline.currentStepId,
        executedItemKeys: restoreSession.demo.timeline.executedItemKeys,
      });
      heatCapacityAutoDemoFileIdRef.current = restoreSession.activeHeatCapacityFileId;
      heatCapacityAutoDemoTimelineRef.current = timeline;
      heatCapacityAutoDemoPausedElapsedMsRef.current = resumeCursor.elapsedMs;
      heatCapacityAutoDemoInitialDelayRemainingMsRef.current = restoreSession.demo.initialDelayRemainingMs;
      heatCapacityAutoDemoLastProcessedTimelineIndexRef.current = resumeCursor.lastProcessedTimelineIndex;
      heatCapacityAutoDemoExecutedItemKeysRef.current = new Set(resumeCursor.executedItemKeys);
      heatCapacityModeTransitionDemoClockRef.current = null;
      const restoredModeTransitionDemoClock = restoreSession.modeTransitionDemoClock?.fileId ===
        restoreSession.activeHeatCapacityFileId
        ? {
            ...restoreSession.modeTransitionDemoClock,
            elapsedMs: resumeCursor.elapsedMs,
            initialDelayRemainingMs: restoreSession.demo.initialDelayRemainingMs,
          }
        : null;
      if (restoreSession.demo.phase === 'running' && restoredModeTransitionDemoClock) {
        clearHeatCapacityAutoDemoTimers();
        heatCapacityModeTransitionDemoClockRef.current = restoredModeTransitionDemoClock;
        heatCapacityAutoDemoStartedAtMsRef.current = performance.now() - resumeCursor.elapsedMs;
      } else if (
        restoreSession.demo.phase === 'running' &&
        heatCapacityRuntimeFailureFileIdRef.current === null
      ) {
        scheduleHeatCapacityAutoDemoTimeline(
          restoreSession.activeHeatCapacityFileId,
          timeline,
          resumeCursor.elapsedMs,
          restoreSession.demo.initialDelayRemainingMs,
        );
      } else {
        heatCapacityAutoDemoStartedAtMsRef.current = performance.now() +
          restoreSession.demo.initialDelayRemainingMs -
          resumeCursor.elapsedMs;
        heatCapacityAutoDemoPausedFileIdRef.current = restoreSession.activeHeatCapacityFileId;
      }
    }

    const toastRemainingMs = restoreSession.guide.toastQueue.current?.remainingMs ?? null;
    if (heatCapacityToastCurrentRef.current && toastRemainingMs !== null && toastRemainingMs > 0) {
      if (restoreRuntimePaused) {
        heatCapacityToastTimerGenerationRef.current += 1;
        heatCapacityToastDeadlineAtMsRef.current = null;
        heatCapacityToastPausedRef.current = {
          fileId: restoreSession.activeHeatCapacityFileId,
          remainingMs: toastRemainingMs,
        };
      } else {
        scheduleHeatCapacityToastAdvance(toastRemainingMs);
      }
    }

    const restoredRecordSuccess = heatCapacityRecordSuccessPausedRef.current;
    if (
      restoredRecordSuccess?.fileId === restoreSession.activeHeatCapacityFileId &&
      heatCapacityRuntimeFailureFileIdRef.current === null
    ) {
      scheduleHeatCapacityRecordSuccessToastTimers(
        restoredRecordSuccess.followUpMessage,
        restoredRecordSuccess.followUpRemainingMs,
        restoredRecordSuccess.releaseRemainingMs,
      );
    }

    const completionRemainingMs = restoreSession.demo.completionMessageRemainingMs;
    if (
      restoreSession.demo.completionMessage &&
      completionRemainingMs !== null
    ) {
      if (restoreRuntimePaused) {
        heatCapacityAutoDemoCompleteToastTimerGenerationRef.current += 1;
        heatCapacityAutoDemoCompleteToastDeadlineAtMsRef.current = null;
        heatCapacityAutoDemoCompleteToastPausedRef.current = {
          fileId: restoreSession.activeHeatCapacityFileId,
          remainingMs: completionRemainingMs,
        };
      } else {
        scheduleHeatCapacityAutoDemoCompletionToastExpiry(completionRemainingMs);
      }
    }

    const pressureAlarmRemainingMs = restoreSession.guide.pressureAlarmRemainingMs;
    if (restoreSession.guide.pressureAlarmVisible && pressureAlarmRemainingMs !== null && pressureAlarmRemainingMs > 0) {
      heatCapacityPressureAlarmFileIdRef.current = restoreSession.activeHeatCapacityFileId;
      if (restoreRuntimePaused) {
        desktopExitPausedPressureAlarmRef.current = {
          fileId: restoreSession.activeHeatCapacityFileId,
          remainingMs: pressureAlarmRemainingMs,
        };
      } else {
        scheduleHeatCapacityPressureAlarmExpiry(
          restoreSession.activeHeatCapacityFileId,
          pressureAlarmRemainingMs,
        );
      }
    } else {
      const closePumpValveReminderFileId = getHeatCapacityRefreshString(
        restoreSession.ui.layout,
        'closePumpValveReminderFileId',
      );
      const closePumpValveReminderRemainingMs = getHeatCapacityRefreshOptionalNumber(
        restoreSession.ui.layout,
        'closePumpValveReminderRemainingMs',
      );
      if (
        closePumpValveReminderFileId === restoreSession.activeHeatCapacityFileId &&
        closePumpValveReminderRemainingMs !== null
      ) {
        if (restoreRuntimePaused) {
          desktopExitPausedClosePumpValveReminderRef.current = {
            fileId: closePumpValveReminderFileId,
            remainingMs: closePumpValveReminderRemainingMs,
          };
        } else {
          scheduleHeatCapacityClosePumpValveReminder(
            closePumpValveReminderFileId,
            closePumpValveReminderRemainingMs,
          );
        }
      }
    }

    const pendingStrongReminderRemainingMs = getHeatCapacityRefreshOptionalNumber(
      restoreSession.ui.layout,
      'pendingStrongReminderRemainingMs',
    );
    const pendingStrongReminderControlId = getHeatCapacityRefreshString(
      restoreSession.ui.layout,
      'pendingStrongReminderControlId',
    );
    if (pendingStrongReminderRemainingMs !== null) {
      guideHeatCapacityPausedPendingStrongReminderRef.current = {
        controlId: pendingStrongReminderControlId,
        remainingMs: pendingStrongReminderRemainingMs,
      };
    }

    heatCapacityRefreshRestorePendingRef.current = false;
    setHeatCapacityRefreshRestoring(false);
    const restoredLessonClose = heatCapacityGuideLessonClosePausedRef.current;
    if (
      restoredLessonClose?.fileId === restoreSession.activeHeatCapacityFileId &&
      heatCapacityRuntimeFailureFileIdRef.current === null
    ) {
      scheduleHeatCapacityGuideLessonClose(
        restoredLessonClose.fileId,
        restoredLessonClose.shouldResumeAutoDemo,
        restoredLessonClose.remainingMs,
      );
    }
    heatCapacityRefreshPersistRef.current();
  }, dependencies: [activeFileId, desktopExitQuiesced, heatCapacitySceneReadyFileId] } satisfies WorkbenchHeatEffect;

  const sceneRestoreAcknowledgementEffect = { run: () => {
    if (
      desktopExitQuiesced ||
      heatCapacityRefreshRestoring ||
      heatCapacityRefreshRestorePendingRef.current ||
      !heatCapacityRefreshRestoreAppliedRef.current ||
      heatCapacitySceneRestoreAcknowledged
    ) return undefined;

    const acknowledgementFrameId = window.requestAnimationFrame(() => {
      if (desktopExitQuiescedRef.current) return;
      skipInitialConsoleScrollRef.current = false;
      setHeatCapacitySceneRestoreAcknowledged(true);
    });
    return () => window.cancelAnimationFrame(acknowledgementFrameId);
  }, dependencies: [
    desktopExitQuiesced,
    heatCapacityRefreshRestoring,
    heatCapacitySceneRestoreAcknowledged,
  ] } satisfies WorkbenchHeatEffect;
  return {
    effects: { initialSceneRestore: initialSceneRestoreEffect, sceneRestoreAcknowledgement: sceneRestoreAcknowledgementEffect }, restoreHeatCapacityGuideUiCheckpoint, applyHeatCapacityModeUiProjection, commitHeatCapacityFileProjection, activeFileOwnsPendingHeatCapacityRefresh, cancelPendingHeatCapacityRefreshRestore, handleHeatCapacityCameraPoseChange, handleHeatCapacitySceneCheckpointProviderChange, handleHeatCapacitySceneRestoreRevealComplete, handleHeatCapacitySceneCheckpoint, rebaseHeatCapacityFileForAutomaticSuspension };
};
