import { HEAT_CAPACITY_AUTO_DEMO_LOCKED_TOAST_DEDUPE_MS, HEAT_CAPACITY_AUTO_DEMO_LOCKED_POINTER_FALLBACK_MS, HEAT_CAPACITY_AUTO_DEMO_STEP_PANEL_EXIT_MS } from './workbenchTeachingUiTiming.ts';
import React from 'react';



import { getHeatCapacityGuideRollbackAnimationForControl, type HeatCapacityInstrumentControl } from '../../domain/heatCapacity/heatCapacityInstrumentFeedback.ts';

import { type HeatCapacityFocusMode } from './workbenchHeatCapacityUiCheckpoint.ts';

export interface createWorkbenchHeatDemoUiActionsPorts {
  scene: {
    heatCapacityModeTransitionLocked: boolean;
    setHeatCapacityFocusResetKey: React.Dispatch<React.SetStateAction<number>>;
    heatCapacityFocusSessionRef: React.MutableRefObject<import("./workbenchHeatCapacityUiCheckpoint.ts").HeatCapacityFocusSession | null>;
  };
  demoState: {
    heatCapacityAutoDemoLockedPointerToastTimerRef: React.MutableRefObject<number | null>;
    heatCapacityAutoDemoLockedToastLastShownRef: React.MutableRefObject<{ message: string; at: number; } | null>;
    heatCapacityAutoDemoCompleteToastTimerRef: React.MutableRefObject<number | null>;
    heatCapacityAutoDemoCompleteToastTimerGenerationRef: React.MutableRefObject<number>;
    heatCapacityAutoDemoCompleteToastPausedRef: React.MutableRefObject<{ fileId: string; remainingMs: number; } | null>;
    heatCapacityAutoDemoCompleteToastDeadlineAtMsRef: React.MutableRefObject<number | null>;
    setAutoDemoCompletionMessage: React.Dispatch<React.SetStateAction<string | null>>;
    heatCapacityAutoDemoStepPanelTimerRef: React.MutableRefObject<number | null>;
    heatCapacityAutoDemoStepPanelTimerGenerationRef: React.MutableRefObject<number>;
    heatCapacityAutoDemoStepPanelPausedRef: React.MutableRefObject<{ fileId: string; remainingMs: number; } | null>;
    heatCapacityAutoDemoStepPanelDeadlineAtMsRef: React.MutableRefObject<number | null>;
    setAutoDemoStepPanelMode: React.Dispatch<React.SetStateAction<"hidden" | "visible" | "exiting">>;
    demoCameraFocusModeRef: React.MutableRefObject<"instrument" | "pump" | "bottle" | null>;
    setDemoCameraFocusMode: React.Dispatch<React.SetStateAction<"instrument" | "pump" | "bottle" | null>>;
    setDemoCameraFocusKey: React.Dispatch<React.SetStateAction<number>>;
    setAutoDemoPhase: React.Dispatch<React.SetStateAction<import("./../heatCapacity/heatCapacityModeControlModel.ts").HeatCapacityAutoDemoPhase>>;
    setDemoFocusControlId: React.Dispatch<React.SetStateAction<string | null>>;
    setDemoFocusPulseActive: React.Dispatch<React.SetStateAction<boolean>>;
    setAutoDemoStepIndex: React.Dispatch<React.SetStateAction<number>>;
    setAutoDemoStepCount: React.Dispatch<React.SetStateAction<number>>;
    setAutoDemoStepTitle: React.Dispatch<React.SetStateAction<string>>;
    setAutoDemoStepDescription: React.Dispatch<React.SetStateAction<string>>;
    setAutoDemoStepTarget: React.Dispatch<React.SetStateAction<string>>;
    setAutoDemoStepNote: React.Dispatch<React.SetStateAction<string>>;
    heatCapacityAutoDemoFileIdRef: React.MutableRefObject<string | null>;
    heatCapacityAutoDemoPausedFileIdRef: React.MutableRefObject<string | null>;
    heatCapacityAutoDemoPausedElapsedMsRef: React.MutableRefObject<number>;
    heatCapacityAutoDemoInitialDelayRemainingMsRef: React.MutableRefObject<number>;
    heatCapacityAutoDemoLastProcessedTimelineIndexRef: React.MutableRefObject<number>;
    heatCapacityAutoDemoExecutedItemKeysRef: React.MutableRefObject<Set<string>>;
    heatCapacityAutoDemoTimelineRef: React.MutableRefObject<import("./../../domain/heatCapacity/heatCapacityAutoDemo.ts").HeatCapacityAutoDemoTimelineItem[]>;
  };
  feedback: {
    heatCapacityRealtimeCopy: import("./workbenchHeatCapacityRealtimeCopy.ts").HeatCapacityRealtimeCopy;
    showHeatCapacityToast: (text: string, level?: import("./../heatCapacity/heatCapacityToastController.ts").HeatCapacityToastLevel, options?: { interrupt?: boolean | undefined; priority?: number | undefined; source?: import("./../heatCapacity/heatCapacityToastController.ts").HeatCapacityToastSource | undefined; }) => void;
  };
  ui: {
    isHeatCapacityModalLocked: () => boolean;
  };
  workspace: {
    activeFile: import("./workbenchFileUnion.ts").WorkbenchFileState;
  };
  guideState: {
    setGuideHeatCapacityRollback: React.Dispatch<React.SetStateAction<{ animation: import("./../../domain/heatCapacity/heatCapacityInstrumentFeedback.ts").HeatCapacityGuideRollbackAnimation; key: number; } | null>>;
  };
}

export const createWorkbenchHeatDemoUiActions = (ports: createWorkbenchHeatDemoUiActionsPorts) => {
  const { heatCapacityModeTransitionLocked, setHeatCapacityFocusResetKey, heatCapacityFocusSessionRef } = ports.scene;
  const { heatCapacityAutoDemoLockedPointerToastTimerRef, heatCapacityAutoDemoLockedToastLastShownRef, heatCapacityAutoDemoCompleteToastTimerRef, heatCapacityAutoDemoCompleteToastTimerGenerationRef, heatCapacityAutoDemoCompleteToastPausedRef, heatCapacityAutoDemoCompleteToastDeadlineAtMsRef, setAutoDemoCompletionMessage, heatCapacityAutoDemoStepPanelTimerRef, heatCapacityAutoDemoStepPanelTimerGenerationRef, heatCapacityAutoDemoStepPanelPausedRef, heatCapacityAutoDemoStepPanelDeadlineAtMsRef, setAutoDemoStepPanelMode, demoCameraFocusModeRef, setDemoCameraFocusMode, setDemoCameraFocusKey, setAutoDemoPhase, setDemoFocusControlId, setDemoFocusPulseActive, setAutoDemoStepIndex, setAutoDemoStepCount, setAutoDemoStepTitle, setAutoDemoStepDescription, setAutoDemoStepTarget, setAutoDemoStepNote, heatCapacityAutoDemoFileIdRef, heatCapacityAutoDemoPausedFileIdRef, heatCapacityAutoDemoPausedElapsedMsRef, heatCapacityAutoDemoInitialDelayRemainingMsRef, heatCapacityAutoDemoLastProcessedTimelineIndexRef, heatCapacityAutoDemoExecutedItemKeysRef, heatCapacityAutoDemoTimelineRef } = ports.demoState;
  const { heatCapacityRealtimeCopy, showHeatCapacityToast } = ports.feedback;
  const { isHeatCapacityModalLocked } = ports.ui;
  const { activeFile } = ports.workspace;
  const heatCapacityTeachingCompleted = activeFile.kind === 'heatCapacity' && activeFile.heatCapacityTeachingStatus === 'completed';
  const { setGuideHeatCapacityRollback } = ports.guideState;
  const cancelHeatCapacityAutoDemoLockedPointerToast = () => {
    if (heatCapacityAutoDemoLockedPointerToastTimerRef.current !== null) {
      window.clearTimeout(heatCapacityAutoDemoLockedPointerToastTimerRef.current);
      heatCapacityAutoDemoLockedPointerToastTimerRef.current = null;
    }
  };

  const showHeatCapacityAutoDemoLockedToast = (message: string = heatCapacityRealtimeCopy.autoDemoLockedToast) => {
    if (isHeatCapacityModalLocked()) return;
    cancelHeatCapacityAutoDemoLockedPointerToast();
    const now = Date.now();
    const lastShown = heatCapacityAutoDemoLockedToastLastShownRef.current;
    if (
      lastShown &&
      lastShown.message === message &&
      now - lastShown.at < HEAT_CAPACITY_AUTO_DEMO_LOCKED_TOAST_DEDUPE_MS
    ) {
      return;
    }
    heatCapacityAutoDemoLockedToastLastShownRef.current = { message, at: now };
    showHeatCapacityToast(message, 'warning');
  };

  const scheduleHeatCapacityAutoDemoLockedPointerToast = () => {
    cancelHeatCapacityAutoDemoLockedPointerToast();
    heatCapacityAutoDemoLockedPointerToastTimerRef.current = window.setTimeout(() => {
      heatCapacityAutoDemoLockedPointerToastTimerRef.current = null;
      showHeatCapacityAutoDemoLockedToast();
    }, HEAT_CAPACITY_AUTO_DEMO_LOCKED_POINTER_FALLBACK_MS);
  };

  const showHeatCapacityTeachingCompletedLockedInteraction = (
    message?: string,
    control?: HeatCapacityInstrumentControl,
  ) => {
    const fallbackMessage = activeFile.kind === 'heatCapacity' && activeFile.heatCapacityMode === 'guide'
      ? heatCapacityRealtimeCopy.guideCompletedLockedToast
      : heatCapacityRealtimeCopy.autoDemoCompletedLockedToast;
    const rollbackAnimation = control
      ? getHeatCapacityGuideRollbackAnimationForControl(control)
      : null;
    if (rollbackAnimation) {
      setGuideHeatCapacityRollback((previous) => ({
        animation: rollbackAnimation,
        key: Math.max(Date.now(), (previous?.key ?? 0) + 1),
      }));
    }
    showHeatCapacityAutoDemoLockedToast(message ?? fallbackMessage);
  };

  const scheduleHeatCapacityAutoDemoCompletionToastExpiry = (delayMs: number) => {
    if (heatCapacityAutoDemoCompleteToastTimerRef.current !== null) {
      window.clearTimeout(heatCapacityAutoDemoCompleteToastTimerRef.current);
    }
    const normalizedDelayMs = Math.max(0, delayMs);
    const timerGeneration = ++heatCapacityAutoDemoCompleteToastTimerGenerationRef.current;
    heatCapacityAutoDemoCompleteToastPausedRef.current = null;
    heatCapacityAutoDemoCompleteToastDeadlineAtMsRef.current = Date.now() + normalizedDelayMs;
    heatCapacityAutoDemoCompleteToastTimerRef.current = window.setTimeout(() => {
      if (timerGeneration !== heatCapacityAutoDemoCompleteToastTimerGenerationRef.current) return;
      heatCapacityAutoDemoCompleteToastTimerRef.current = null;
      heatCapacityAutoDemoCompleteToastDeadlineAtMsRef.current = null;
      setAutoDemoCompletionMessage(null);
    }, normalizedDelayMs);
  };

  const showHeatCapacityAutoDemoCompletionToast = (message: string = heatCapacityRealtimeCopy.autoDemoCompletionToast, durationMs = 3000) => {
    setAutoDemoCompletionMessage(message);
    scheduleHeatCapacityAutoDemoCompletionToastExpiry(durationMs);
  };

  const scheduleHeatCapacityAutoDemoStepPanelHide = (delayMs: number) => {
    if (heatCapacityAutoDemoStepPanelTimerRef.current !== null) {
      window.clearTimeout(heatCapacityAutoDemoStepPanelTimerRef.current);
    }
    const normalizedDelayMs = Math.max(0, delayMs);
    const timerGeneration = ++heatCapacityAutoDemoStepPanelTimerGenerationRef.current;
    heatCapacityAutoDemoStepPanelPausedRef.current = null;
    heatCapacityAutoDemoStepPanelDeadlineAtMsRef.current = Date.now() + normalizedDelayMs;
    heatCapacityAutoDemoStepPanelTimerRef.current = window.setTimeout(() => {
      if (timerGeneration !== heatCapacityAutoDemoStepPanelTimerGenerationRef.current) return;
      heatCapacityAutoDemoStepPanelTimerRef.current = null;
      heatCapacityAutoDemoStepPanelDeadlineAtMsRef.current = null;
      setAutoDemoStepPanelMode('hidden');
    }, normalizedDelayMs);
  };

  const showHeatCapacityAutoDemoStepPanel = () => {
    heatCapacityAutoDemoStepPanelTimerGenerationRef.current += 1;
    if (heatCapacityAutoDemoStepPanelTimerRef.current !== null) {
      window.clearTimeout(heatCapacityAutoDemoStepPanelTimerRef.current);
      heatCapacityAutoDemoStepPanelTimerRef.current = null;
    }
    heatCapacityAutoDemoStepPanelDeadlineAtMsRef.current = null;
    heatCapacityAutoDemoStepPanelPausedRef.current = null;
    setAutoDemoStepPanelMode('visible');
  };

  const hideHeatCapacityAutoDemoStepPanel = () => {
    setAutoDemoStepPanelMode((currentMode) => (currentMode === 'hidden' ? 'hidden' : 'exiting'));
    scheduleHeatCapacityAutoDemoStepPanelHide(HEAT_CAPACITY_AUTO_DEMO_STEP_PANEL_EXIT_MS);
  };

  const setHeatCapacityAutoDemoCameraFocus = (mode: Exclude<HeatCapacityFocusMode, 'none'> | null) => {
    if (demoCameraFocusModeRef.current === mode) return;
    demoCameraFocusModeRef.current = mode;
    setDemoCameraFocusMode(mode);
    if (mode) {
      setDemoCameraFocusKey((key) => key + 1);
      return;
    }
    setHeatCapacityFocusResetKey((key) => key + 1);
    heatCapacityFocusSessionRef.current = null;
  };

  const clearHeatCapacityAutoDemoUiState = () => {
    cancelHeatCapacityAutoDemoLockedPointerToast();
    heatCapacityAutoDemoCompleteToastTimerGenerationRef.current += 1;
    if (heatCapacityAutoDemoCompleteToastTimerRef.current !== null) {
      window.clearTimeout(heatCapacityAutoDemoCompleteToastTimerRef.current);
      heatCapacityAutoDemoCompleteToastTimerRef.current = null;
    }
    heatCapacityAutoDemoCompleteToastDeadlineAtMsRef.current = null;
    heatCapacityAutoDemoCompleteToastPausedRef.current = null;
    heatCapacityAutoDemoStepPanelTimerGenerationRef.current += 1;
    if (heatCapacityAutoDemoStepPanelTimerRef.current !== null) {
      window.clearTimeout(heatCapacityAutoDemoStepPanelTimerRef.current);
      heatCapacityAutoDemoStepPanelTimerRef.current = null;
    }
    heatCapacityAutoDemoStepPanelDeadlineAtMsRef.current = null;
    heatCapacityAutoDemoStepPanelPausedRef.current = null;
    setAutoDemoPhase('idle');
    setAutoDemoCompletionMessage(null);
    setDemoFocusControlId(null);
    setDemoFocusPulseActive(false);
    setHeatCapacityAutoDemoCameraFocus(null);
    setAutoDemoStepIndex(0);
    setAutoDemoStepCount(0);
    setAutoDemoStepTitle('');
    setAutoDemoStepDescription('');
    setAutoDemoStepTarget('');
    setAutoDemoStepNote('');
    setAutoDemoStepPanelMode('hidden');
    heatCapacityAutoDemoFileIdRef.current = null;
    heatCapacityAutoDemoPausedFileIdRef.current = null;
    heatCapacityAutoDemoPausedElapsedMsRef.current = 0;
    heatCapacityAutoDemoInitialDelayRemainingMsRef.current = 0;
    heatCapacityAutoDemoLastProcessedTimelineIndexRef.current = -1;
    heatCapacityAutoDemoExecutedItemKeysRef.current.clear();
    heatCapacityAutoDemoTimelineRef.current = [];
  };
  const handleHeatCapacitySceneLockedInteraction = (
                message?: string,
                control?: HeatCapacityInstrumentControl,
              ) => {
                cancelHeatCapacityAutoDemoLockedPointerToast();
                if (heatCapacityModeTransitionLocked) return;
                if (isHeatCapacityModalLocked()) return;
                if (heatCapacityTeachingCompleted) {
                  showHeatCapacityTeachingCompletedLockedInteraction(message, control);
                  return;
                }
                showHeatCapacityAutoDemoLockedToast(message);
              };

  return { handleHeatCapacitySceneLockedInteraction, cancelHeatCapacityAutoDemoLockedPointerToast, showHeatCapacityAutoDemoLockedToast, scheduleHeatCapacityAutoDemoLockedPointerToast, showHeatCapacityTeachingCompletedLockedInteraction, scheduleHeatCapacityAutoDemoCompletionToastExpiry, showHeatCapacityAutoDemoCompletionToast, scheduleHeatCapacityAutoDemoStepPanelHide, showHeatCapacityAutoDemoStepPanel, hideHeatCapacityAutoDemoStepPanel, setHeatCapacityAutoDemoCameraFocus, clearHeatCapacityAutoDemoUiState };
};
