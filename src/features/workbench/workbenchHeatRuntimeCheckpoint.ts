
import React from 'react';
import type { WorkbenchHeatCapacityState } from './workbenchHeatCapacityStateTypes.ts';





import { getHeatCapacityAutoDemoTimelineItemKey } from '../../domain/heatCapacity/heatCapacityAutoDemo.ts';
import { type WorkbenchHeatCapacityRefreshSession } from './workbenchHeatCapacityRefreshSession.ts';

import { createHeatCapacityModeDeferredTimer, createHeatCapacityModeUiCheckpoint, type HeatCapacityModeCameraPoseCheckpoint, type HeatCapacityModeDemoCheckpoint, type HeatCapacityModeGuideCheckpoint, type HeatCapacityModeJsonObject, type HeatCapacityModeLessonDialogCheckpoint, type HeatCapacityModePauseReason, type HeatCapacityModePumpAnimationCheckpoint, type HeatCapacityModeSceneCheckpoint, type HeatCapacityModeUiCheckpoint } from '../heatCapacity/heatCapacityModeUiCheckpoint.ts';

export interface createWorkbenchHeatRuntimeCheckpointPorts {
  scene: {
    pendingHeatCapacityGuideUiRestoreRef: React.MutableRefObject<{ requestId: number; fileId: string; checkpoint: import("./../heatCapacity/heatCapacityModeUiCheckpoint.ts").HeatCapacityModeGuideCheckpoint; } | null>;
    heatCapacityModeTransitionStateRef: React.MutableRefObject<import("./../heatCapacity/heatCapacityModeTransitionModel.ts").HeatCapacityModeTransitionState>;
    heatCapacityRefreshRestorePendingRef: React.MutableRefObject<boolean>;
    heatCapacityCameraPoseRef: React.MutableRefObject<import("./../heatCapacity/HeatCapacityInstrumentScene.tsx").HeatCapacityCameraPose | null>;
    heatCapacitySceneFocusModeRef: React.MutableRefObject<import("./workbenchHeatCapacityUiCheckpoint.ts").HeatCapacityFocusMode>;
    heatCapacityCameraTransitionRef: React.MutableRefObject<import("./../heatCapacity/HeatCapacityInstrumentScene.tsx").HeatCapacityCameraTransitionState | null>;
    heatCapacityUltraVisualStateRef: React.MutableRefObject<import("./../heatCapacity/HeatCapacityUltraInstrumentModel.tsx").HeatCapacityUltraVisualState | null>;
    heatCapacityHardSphereVisualCheckpointRef: React.MutableRefObject<import("./../heatCapacity/HeatCapacityHardSphereLayer.tsx").HeatCapacityHardSphereVisualCheckpoint | null>;
    heatCapacityFocusSessionRef: React.MutableRefObject<import("./workbenchHeatCapacityUiCheckpoint.ts").HeatCapacityFocusSession | null>;
  };
  demoState: {
    heatCapacityAutoDemoTimelineRef: React.MutableRefObject<import("./../../domain/heatCapacity/heatCapacityAutoDemo.ts").HeatCapacityAutoDemoTimelineItem[]>;
    heatCapacityAutoDemoLastProcessedTimelineIndexRef: React.MutableRefObject<number>;
    heatCapacityModeTransitionDemoClockRef: React.MutableRefObject<import("./../heatCapacity/heatCapacityModeTransitionDemoClock.ts").HeatCapacityModeTransitionDemoClock | null>;
    autoDemoPhase: import("./../heatCapacity/heatCapacityModeControlModel.ts").HeatCapacityAutoDemoPhase;
    heatCapacityAutoDemoStartedAtMsRef: React.MutableRefObject<number>;
    heatCapacityAutoDemoInitialDelayRemainingMsRef: React.MutableRefObject<number>;
    heatCapacityAutoDemoPausedElapsedMsRef: React.MutableRefObject<number>;
    heatCapacityAutoDemoExecutedItemKeysRef: React.MutableRefObject<Set<string>>;
    autoDemoStepPanelMode: "hidden" | "visible" | "exiting";
    autoDemoStepIndex: number;
    autoDemoStepCount: number;
    autoDemoStepTitle: string;
    autoDemoStepDescription: string;
    autoDemoStepTarget: string;
    autoDemoStepProgressCriterion: string;
    autoDemoStepNote: string;
    demoFocusControlId: string | null;
    demoFocusPulseActive: boolean;
    demoCameraFocusMode: "instrument" | "pump" | "bottle" | null;
    demoCameraFocusKey: number;
    autoDemoCompletionMessage: string | null;
    heatCapacityAutoDemoCompleteToastPausedRef: React.MutableRefObject<{ fileId: string; remainingMs: number; } | null>;
    heatCapacityAutoDemoCompleteToastDeadlineAtMsRef: React.MutableRefObject<number | null>;
  };
  lifecycle: {
    desktopExitQuiescedRef: React.MutableRefObject<boolean>;
    desktopExitAutoDemoClockRef: React.MutableRefObject<import("./../heatCapacity/heatCapacityModeTransitionDemoClock.ts").HeatCapacityModeTransitionDemoClock | null>;
  };
  initial: {
    initialHeatCapacityRefreshSession: import("./workbenchHeatCapacityRefreshSession.ts").WorkbenchHeatCapacityRefreshSession | null;
  };
  lessonState: {
    heatCapacityGuideLessonDialog: import("./workbenchHeatCapacityGuidePresentation.ts").HeatCapacityGuideLessonDialogState | null;
    heatCapacityLessonAutoResumeDemoRef: React.MutableRefObject<boolean>;
    heatCapacityGuideLessonShownRef: React.MutableRefObject<Set<string>>;
  };
  guideState: {
    guideHeatCapacityPausedPulseRef: React.MutableRefObject<{ fileId: string; controlId: string | null; remainingMs: number; } | null>;
    guideHeatCapacityPulseActive: boolean;
    guideHeatCapacityFocusControlId: string | null;
    guideHeatCapacityPulseDeadlineAtMsRef: React.MutableRefObject<number | null>;
    guideHeatCapacityPendingStrongReminderDeadlineAtMsRef: React.MutableRefObject<number | null>;
    guideHeatCapacityPausedPendingStrongReminderRef: React.MutableRefObject<{ controlId: string | null; remainingMs: number; } | null>;
    guideHeatCapacityStrongReminderTimerContextRef: React.MutableRefObject<{ fileId: string; step: import("./../heatCapacity/heatCapacityGuideStepModel.ts").GuideHeatCapacityStep; controlId: string | null; } | null>;
    guideHeatCapacityRestoredStrongReminderTimerRef: React.MutableRefObject<{ fileId: string; controlId: string | null; remainingMs: number; } | null>;
    guideHeatCapacityStrongReminderDeadlineAtMsRef: React.MutableRefObject<number | null>;
    guideHeatCapacityMissCountRef: React.MutableRefObject<number>;
    guideHeatCapacityStrongReminderActive: boolean;
    guideHeatCapacityStrongReminderControlId: string | null;
    guideHeatCapacityPendingStrongReminderControlIdRef: React.MutableRefObject<string | null>;
  };
  checklist: {
    heatCapacityGuideChecklistViewedIndexRef: React.MutableRefObject<number>;
  };
  pump: {
    heatCapacityPumpAnimationRef: React.MutableRefObject<{ fileId: string | null; releaseTimerId: number | null; idleTimerId: number | null; releaseDeadlineAtMs: number | null; idleDeadlineAtMs: number | null; pausedReleaseRemainingMs: number | null; pausedIdleRemainingMs: number | null; }>;
  };
}

export const createWorkbenchHeatRuntimeCheckpoint = (ports: createWorkbenchHeatRuntimeCheckpointPorts) => {
  const { pendingHeatCapacityGuideUiRestoreRef, heatCapacityModeTransitionStateRef, heatCapacityRefreshRestorePendingRef, heatCapacityCameraPoseRef, heatCapacitySceneFocusModeRef, heatCapacityCameraTransitionRef, heatCapacityUltraVisualStateRef, heatCapacityHardSphereVisualCheckpointRef, heatCapacityFocusSessionRef } = ports.scene;
  const { heatCapacityAutoDemoTimelineRef, heatCapacityAutoDemoLastProcessedTimelineIndexRef, heatCapacityModeTransitionDemoClockRef, autoDemoPhase, heatCapacityAutoDemoStartedAtMsRef, heatCapacityAutoDemoInitialDelayRemainingMsRef, heatCapacityAutoDemoPausedElapsedMsRef, heatCapacityAutoDemoExecutedItemKeysRef, autoDemoStepPanelMode, autoDemoStepIndex, autoDemoStepCount, autoDemoStepTitle, autoDemoStepDescription, autoDemoStepTarget, autoDemoStepProgressCriterion, autoDemoStepNote, demoFocusControlId, demoFocusPulseActive, demoCameraFocusMode, demoCameraFocusKey, autoDemoCompletionMessage, heatCapacityAutoDemoCompleteToastPausedRef, heatCapacityAutoDemoCompleteToastDeadlineAtMsRef } = ports.demoState;
  const { desktopExitQuiescedRef, desktopExitAutoDemoClockRef } = ports.lifecycle;
  const { initialHeatCapacityRefreshSession } = ports.initial;
  const { heatCapacityGuideLessonDialog, heatCapacityLessonAutoResumeDemoRef, heatCapacityGuideLessonShownRef } = ports.lessonState;
  const { guideHeatCapacityPausedPulseRef, guideHeatCapacityPulseActive, guideHeatCapacityFocusControlId, guideHeatCapacityPulseDeadlineAtMsRef, guideHeatCapacityPendingStrongReminderDeadlineAtMsRef, guideHeatCapacityPausedPendingStrongReminderRef, guideHeatCapacityStrongReminderTimerContextRef, guideHeatCapacityRestoredStrongReminderTimerRef, guideHeatCapacityStrongReminderDeadlineAtMsRef, guideHeatCapacityMissCountRef, guideHeatCapacityStrongReminderActive, guideHeatCapacityStrongReminderControlId, guideHeatCapacityPendingStrongReminderControlIdRef } = ports.guideState;
  const { heatCapacityGuideChecklistViewedIndexRef } = ports.checklist;
  const { heatCapacityPumpAnimationRef } = ports.pump;
  const getHeatCapacityRefreshRemainingMs = (deadlineAtMs: number | null) => (
    deadlineAtMs === null ? null : Math.max(0, deadlineAtMs - Date.now())
  );

  const resolveDeferredHeatCapacityGuideUiCheckpoint = (
    file: WorkbenchHeatCapacityState,
  ): HeatCapacityModeGuideCheckpoint | null => {
    if (file.heatCapacityMode !== 'guide') return null;
    const pendingRestore = pendingHeatCapacityGuideUiRestoreRef.current;
    if (pendingRestore?.fileId === file.id) return pendingRestore.checkpoint;
    const transition = heatCapacityModeTransitionStateRef.current;
    if (transition.phase !== 'animating' || transition.visibleMode !== 'guide') return null;
    const storedCheckpoint = file.heatCapacityModeSessions.guide.uiCheckpoint;
    return storedCheckpoint?.fileId === file.id && storedCheckpoint.mode === 'guide'
      ? storedCheckpoint.payload.guide
      : null;
  };

  const captureHeatCapacityDemoUiCheckpoint = (
    currentFile: WorkbenchHeatCapacityState,
  ): {
    demo: HeatCapacityModeDemoCheckpoint;
    modeTransitionDemoClock: WorkbenchHeatCapacityRefreshSession['modeTransitionDemoClock'];
  } => {
    const timeline = heatCapacityAutoDemoTimelineRef.current;
    const lastProcessedTimelineIndex = Math.min(
      timeline.length - 1,
      heatCapacityAutoDemoLastProcessedTimelineIndexRef.current,
    );
    const currentTimelineItem = lastProcessedTimelineIndex >= 0
      ? timeline[lastProcessedTimelineIndex] ?? null
      : null;
    const modeTransitionDemoClock = heatCapacityModeTransitionDemoClockRef.current?.fileId === currentFile.id
      ? heatCapacityModeTransitionDemoClockRef.current
      : null;
    const desktopExitDemoClock = desktopExitQuiescedRef.current &&
      desktopExitAutoDemoClockRef.current?.fileId === currentFile.id
      ? desktopExitAutoDemoClockRef.current
      : null;
    const restoringDemo = heatCapacityRefreshRestorePendingRef.current &&
      initialHeatCapacityRefreshSession?.activeHeatCapacityFileId === currentFile.id &&
      initialHeatCapacityRefreshSession.mode === 'demo';
    const initialDelayRemainingMs = desktopExitDemoClock
      ? desktopExitDemoClock.initialDelayRemainingMs
      : modeTransitionDemoClock
        ? modeTransitionDemoClock.initialDelayRemainingMs
      : restoringDemo
        ? initialHeatCapacityRefreshSession.demo.initialDelayRemainingMs
        : autoDemoPhase === 'running'
          ? Math.max(0, heatCapacityAutoDemoStartedAtMsRef.current - performance.now())
          : heatCapacityAutoDemoInitialDelayRemainingMsRef.current;
    const elapsedMs = desktopExitDemoClock
      ? desktopExitDemoClock.elapsedMs
      : modeTransitionDemoClock
        ? modeTransitionDemoClock.elapsedMs
      : restoringDemo
        ? initialHeatCapacityRefreshSession.demo.elapsedMs
        : autoDemoPhase === 'running'
          ? initialDelayRemainingMs > 0
            ? 0
            : Math.max(0, performance.now() - heatCapacityAutoDemoStartedAtMsRef.current)
          : heatCapacityAutoDemoPausedElapsedMsRef.current;
    const pauseReasons: HeatCapacityModePauseReason[] = [];
    if (autoDemoPhase === 'paused') {
      pauseReasons.push(
        heatCapacityGuideLessonDialog && heatCapacityLessonAutoResumeDemoRef.current
          ? 'lesson-dialog'
          : 'user',
      );
    }
    return {
      modeTransitionDemoClock,
      demo: {
        phase: currentFile.heatCapacityMode === 'demo' ? autoDemoPhase : 'idle',
        elapsedMs: currentFile.heatCapacityMode === 'demo' ? elapsedMs : 0,
        initialDelayRemainingMs: currentFile.heatCapacityMode === 'demo' ? initialDelayRemainingMs : 0,
        pauseReasons: currentFile.heatCapacityMode === 'demo' ? pauseReasons : [],
        timeline: {
          currentItemIndex: currentTimelineItem ? lastProcessedTimelineIndex : null,
          nextItemIndex: Math.max(0, lastProcessedTimelineIndex + 1),
          currentItemKey: currentTimelineItem
            ? getHeatCapacityAutoDemoTimelineItemKey(currentTimelineItem, lastProcessedTimelineIndex)
            : null,
          currentStage: currentTimelineItem?.stage ?? null,
          currentStepId: currentTimelineItem?.step.id ?? null,
          currentStepIndex: currentTimelineItem?.stepIndex ?? null,
          currentActionId: currentTimelineItem?.action
            ? `${currentTimelineItem.action.action}:${currentTimelineItem.action.sampleKey ?? ''}`
            : null,
          itemStartedAtElapsedMs: currentTimelineItem?.atMs ?? null,
          executedItemKeys: timeline
            .map(getHeatCapacityAutoDemoTimelineItemKey)
            .filter((itemKey) => heatCapacityAutoDemoExecutedItemKeysRef.current.has(itemKey)),
        },
        stepPanel: {
          mode: autoDemoStepPanelMode === 'exiting' ? 'hidden' : autoDemoStepPanelMode,
          stepIndex: autoDemoStepIndex,
          stepCount: autoDemoStepCount,
          title: autoDemoStepTitle,
          description: autoDemoStepDescription,
          target: autoDemoStepTarget,
          progressCriterion: autoDemoStepProgressCriterion,
          note: autoDemoStepNote,
        },
        focusControlId: demoFocusControlId,
        focusPulseActive: demoFocusPulseActive,
        cameraMode: demoCameraFocusMode,
        cameraFocusKey: demoCameraFocusKey,
        completionMessage: autoDemoCompletionMessage,
        completionMessageRemainingMs:
          heatCapacityAutoDemoCompleteToastPausedRef.current?.fileId === currentFile.id
            ? heatCapacityAutoDemoCompleteToastPausedRef.current.remainingMs
            : getHeatCapacityRefreshRemainingMs(
                heatCapacityAutoDemoCompleteToastDeadlineAtMsRef.current,
              ),
      },
    };
  };

  const captureHeatCapacityLessonDialogCheckpoint = (): HeatCapacityModeLessonDialogCheckpoint | null => (
    heatCapacityGuideLessonDialog?.kind === 'intro'
      ? {
          kind: 'intro',
          pageIndex: heatCapacityGuideLessonDialog.pageIndex,
          lessonId: null,
        }
      : heatCapacityGuideLessonDialog?.kind === 'step'
        ? {
            kind: 'step',
            pageIndex: null,
            lessonId: heatCapacityGuideLessonDialog.lessonId,
          }
        : null
  );

  const captureHeatCapacityGuideUiCheckpoint = (
    currentFile: WorkbenchHeatCapacityState,
    override: HeatCapacityModeGuideCheckpoint | null = null,
  ): HeatCapacityModeGuideCheckpoint => {
    if (override) return override;
    const pausedNormalReminder = guideHeatCapacityPausedPulseRef.current?.fileId === currentFile.id
      ? guideHeatCapacityPausedPulseRef.current
      : null;
    const normalReminderControlId = pausedNormalReminder?.controlId ?? (
      guideHeatCapacityPulseActive ? guideHeatCapacityFocusControlId : null
    );
    const normalReminderRemainingMs = pausedNormalReminder
      ? pausedNormalReminder.remainingMs
      : guideHeatCapacityPulseActive
        ? getHeatCapacityRefreshRemainingMs(guideHeatCapacityPulseDeadlineAtMsRef.current)
        : null;
    const normalReminderTimer = normalReminderControlId
      ? createHeatCapacityModeDeferredTimer(normalReminderRemainingMs)
      : null;
    const pendingTimer = createHeatCapacityModeDeferredTimer(
      getHeatCapacityRefreshRemainingMs(guideHeatCapacityPendingStrongReminderDeadlineAtMsRef.current) ??
        guideHeatCapacityPausedPendingStrongReminderRef.current?.remainingMs,
    );
    const baseTimerFileId = guideHeatCapacityStrongReminderTimerContextRef.current?.fileId ??
      guideHeatCapacityRestoredStrongReminderTimerRef.current?.fileId ?? null;
    const baseTimer = baseTimerFileId === currentFile.id
      ? createHeatCapacityModeDeferredTimer(
          getHeatCapacityRefreshRemainingMs(guideHeatCapacityStrongReminderDeadlineAtMsRef.current) ??
            guideHeatCapacityRestoredStrongReminderTimerRef.current?.remainingMs,
        )
      : null;
    return {
      missCount: guideHeatCapacityMissCountRef.current,
      normalReminder: normalReminderTimer && normalReminderControlId
        ? { controlId: normalReminderControlId, timer: normalReminderTimer }
        : null,
      strongReminder: {
        active: guideHeatCapacityStrongReminderActive,
        controlId: guideHeatCapacityStrongReminderControlId,
      },
      lessonDialog: captureHeatCapacityLessonDialogCheckpoint(),
      shownLessonIds: Array.from(heatCapacityGuideLessonShownRef.current),
      checklistViewedIndex: heatCapacityGuideChecklistViewedIndexRef.current,
      pendingStrongReminder: pendingTimer
        ? {
            controlId: guideHeatCapacityPendingStrongReminderControlIdRef.current ??
              guideHeatCapacityPausedPendingStrongReminderRef.current?.controlId ?? null,
            timer: pendingTimer,
          }
        : null,
      baseStrongReminder: baseTimer
        ? {
            controlId: guideHeatCapacityStrongReminderTimerContextRef.current?.controlId ??
              guideHeatCapacityRestoredStrongReminderTimerRef.current?.controlId ?? null,
            timer: baseTimer,
          }
        : null,
    };
  };

  const captureHeatCapacityPumpAnimationCheckpoint = (
    currentFile: WorkbenchHeatCapacityState,
  ): {
    fileId: string | null;
    releaseRemainingMs: number | null;
    idleRemainingMs: number | null;
    checkpoint: HeatCapacityModePumpAnimationCheckpoint | null;
  } => {
    const fileId = heatCapacityPumpAnimationRef.current.fileId;
    const releaseRemainingMs = getHeatCapacityRefreshRemainingMs(
      heatCapacityPumpAnimationRef.current.releaseDeadlineAtMs,
    ) ?? heatCapacityPumpAnimationRef.current.pausedReleaseRemainingMs;
    const idleRemainingMs = getHeatCapacityRefreshRemainingMs(
      heatCapacityPumpAnimationRef.current.idleDeadlineAtMs,
    ) ?? heatCapacityPumpAnimationRef.current.pausedIdleRemainingMs;
    const release = createHeatCapacityModeDeferredTimer(releaseRemainingMs);
    const idle = createHeatCapacityModeDeferredTimer(idleRemainingMs);
    return {
      fileId,
      releaseRemainingMs,
      idleRemainingMs,
      checkpoint: fileId === currentFile.id && (release || idle) ? { release, idle } : null,
    };
  };

  const captureHeatCapacitySceneCheckpoint = (
    currentFile: WorkbenchHeatCapacityState,
    capturedAtMs: number,
  ): {
    cameraPose: HeatCapacityModeCameraPoseCheckpoint | null;
    scene: HeatCapacityModeSceneCheckpoint;
  } => {
    const cameraPose = heatCapacityCameraPoseRef.current;
    const cameraCheckpoint: HeatCapacityModeCameraPoseCheckpoint | null = cameraPose ? {
      poseRevision: `${currentFile.id}:${capturedAtMs}`,
      capturedAtMs,
      projection: 'perspective',
      position: cameraPose.position,
      target: cameraPose.target,
      up: [0, 1, 0],
      quaternion: null,
      fovDeg: cameraPose.fov,
      zoom: 1,
      near: 0.1,
      far: 1000,
      cameraMode: null,
      viewport: null,
    } : null;
    return {
      cameraPose: cameraCheckpoint,
      scene: {
        focusMode: heatCapacitySceneFocusModeRef.current,
        cameraPose: cameraCheckpoint,
        cameraTransition: heatCapacityCameraTransitionRef.current as unknown as HeatCapacityModeJsonObject | null,
        ultraVisualState: heatCapacityUltraVisualStateRef.current as unknown as HeatCapacityModeJsonObject | null,
        hardSphereVisualCheckpoint:
          heatCapacityHardSphereVisualCheckpointRef.current as unknown as HeatCapacityModeJsonObject | null,
        focusSession: heatCapacityFocusSessionRef.current as unknown as HeatCapacityModeJsonObject | null,
      },
    };
  };

  const buildHeatCapacityModeUiCheckpoint = (
    currentFile: WorkbenchHeatCapacityState,
    capturedAtMs = Date.now(),
    guidePayloadOverride: HeatCapacityModeGuideCheckpoint | null = null,
  ): HeatCapacityModeUiCheckpoint => {
    const demoCapture = captureHeatCapacityDemoUiCheckpoint(currentFile);
    const guideCapture = captureHeatCapacityGuideUiCheckpoint(currentFile, guidePayloadOverride);
    const pumpCapture = captureHeatCapacityPumpAnimationCheckpoint(currentFile);
    const sceneCapture = captureHeatCapacitySceneCheckpoint(currentFile, capturedAtMs);
    const base = {
      fileId: currentFile.id,
      checkpointId: `${currentFile.id}:${capturedAtMs}:mode`,
      capturedAtMs,
      scene: sceneCapture.scene,
      pumpAnimation: pumpCapture.checkpoint,
    };
    if (currentFile.heatCapacityMode === 'demo') {
      return createHeatCapacityModeUiCheckpoint({
        ...base,
        mode: 'demo',
        payload: { kind: 'demo', demo: demoCapture.demo },
      });
    }
    if (currentFile.heatCapacityMode === 'guide') {
      return createHeatCapacityModeUiCheckpoint({
        ...base,
        mode: 'guide',
        payload: { kind: 'guide', guide: guideCapture },
      });
    }
    return createHeatCapacityModeUiCheckpoint({
      ...base,
      mode: 'free',
      payload: { kind: 'free' },
    });
  };
  return { getHeatCapacityRefreshRemainingMs, resolveDeferredHeatCapacityGuideUiCheckpoint, captureHeatCapacityDemoUiCheckpoint, captureHeatCapacityGuideUiCheckpoint, captureHeatCapacityPumpAnimationCheckpoint, captureHeatCapacitySceneCheckpoint, buildHeatCapacityModeUiCheckpoint };
};
