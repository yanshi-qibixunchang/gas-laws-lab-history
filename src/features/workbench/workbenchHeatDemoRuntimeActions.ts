import { HEAT_CAPACITY_AUTO_DEMO_RESET_MS } from './workbenchTeachingUiTiming.ts';
import React from 'react';
import { setHeatCapacityPressureZeroOffset } from './workbenchHeatCapacityCalibrationCoordinator.ts';

import { completeHeatCapacityTeachingModeWorkbenchState } from './workbenchHeatCapacityTeachingResultState.ts';
import { prepareHeatCapacityAutoDemoReset, prepareHeatCapacityAutoDemoStart } from './workbenchHeatCapacityTeachingLifecycleState.ts';
import { captureHeatCapacityWorkbenchSample, powerHeatCapacityWorkbenchFile, setHeatCapacityScriptedPumpValveOpen } from './workbenchHeatCapacityRuntimeCoordinator.ts';
import { getHeatCapacityPressureZeroKnobAngleForOffset, isHeatCapacityPressureZeroWithinTolerance } from './workbenchHeatCapacityInstrumentState.ts';


import { captureHeatCapacityModeTransitionDemoClock, resolveHeatCapacityModeTransitionDemoResume } from '../heatCapacity/heatCapacityModeTransitionDemoClock.ts';
import { isGuideU0ZeroReady } from './workbenchHeatCapacityGuideDecisions.ts';

import { createHeatCapacityAutoDemoSteps, getHeatCapacityAutoDemoTimelineItemKey, getHeatCapacityAutoDemoTimeline, type HeatCapacityAutoDemoAction, type HeatCapacityAutoDemoStep, type HeatCapacityAutoDemoTimelineItem } from '../../domain/heatCapacity/heatCapacityAutoDemo.ts';
import { getHeatCapacityRealtimeCopy } from './workbenchHeatCapacityRealtimeCopy.ts';
import { mapHeatCapacityAutoDemoCameraFocusMode } from './workbenchHeatCapacityUiCheckpoint.ts';

export interface createWorkbenchHeatDemoRuntimeActionsPorts {
  demoState: {
    heatCapacityAutoDemoTimersRef: React.MutableRefObject<number[]>;
    heatCapacityAutoDemoFileIdRef: React.MutableRefObject<string | null>;
    setAutoDemoStepIndex: React.Dispatch<React.SetStateAction<number>>;
    setAutoDemoStepTitle: React.Dispatch<React.SetStateAction<string>>;
    setAutoDemoStepDescription: React.Dispatch<React.SetStateAction<string>>;
    setAutoDemoStepTarget: React.Dispatch<React.SetStateAction<string>>;
    setAutoDemoStepProgressCriterion: React.Dispatch<React.SetStateAction<string>>;
    setAutoDemoStepNote: React.Dispatch<React.SetStateAction<string>>;
    setDemoFocusControlId: React.Dispatch<React.SetStateAction<string | null>>;
    setDemoFocusPulseActive: React.Dispatch<React.SetStateAction<boolean>>;
    setAutoDemoPhase: React.Dispatch<React.SetStateAction<import("./../heatCapacity/heatCapacityModeControlModel.ts").HeatCapacityAutoDemoPhase>>;
    heatCapacityAutoDemoStartedAtMsRef: React.MutableRefObject<number>;
    heatCapacityAutoDemoInitialDelayRemainingMsRef: React.MutableRefObject<number>;
    heatCapacityAutoDemoTimelineRef: React.MutableRefObject<import("./../../domain/heatCapacity/heatCapacityAutoDemo.ts").HeatCapacityAutoDemoTimelineItem[]>;
    heatCapacityAutoDemoExecutedItemKeysRef: React.MutableRefObject<Set<string>>;
    heatCapacityAutoDemoLastProcessedTimelineIndexRef: React.MutableRefObject<number>;
    heatCapacityAutoDemoPausedElapsedMsRef: React.MutableRefObject<number>;
    heatCapacityAutoDemoPausedFileIdRef: React.MutableRefObject<string | null>;
    setAutoDemoStepCount: React.Dispatch<React.SetStateAction<number>>;
    setAutoDemoCompletionMessage: React.Dispatch<React.SetStateAction<string | null>>;
    heatCapacityModeTransitionDemoClockRef: React.MutableRefObject<import("./../heatCapacity/heatCapacityModeTransitionDemoClock.ts").HeatCapacityModeTransitionDemoClock | null>;
    autoDemoPaused: boolean;
    autoDemoInteractionLocked: boolean;
    autoDemoPhaseRef: React.MutableRefObject<import("./../heatCapacity/heatCapacityModeControlModel.ts").HeatCapacityAutoDemoPhase>;
    autoDemoRunning: boolean;
  };
  demoUi: {
    cancelHeatCapacityAutoDemoLockedPointerToast: () => void;
    showHeatCapacityAutoDemoStepPanel: () => void;
    setHeatCapacityAutoDemoCameraFocus: (mode: "instrument" | "pump" | "bottle" | null) => void;
    hideHeatCapacityAutoDemoStepPanel: () => void;
    showHeatCapacityAutoDemoCompletionToast: (message?: string, durationMs?: number) => void;
  };
  workspace: {
    updateFileById: (fileId: string, updater: (file: import("./workbenchFileUnion.ts").WorkbenchFileState) => import("./workbenchFileUnion.ts").WorkbenchFileState) => void;
    filesRef: React.MutableRefObject<import("./workbenchFileUnion.ts").WorkbenchFileState[]>;
    activeFileIdRef: React.MutableRefObject<string>;
    activeFile: import("./workbenchFileUnion.ts").WorkbenchFileState;
    updateActiveFile: (updater: (file: import("./workbenchFileUnion.ts").WorkbenchFileState) => import("./workbenchFileUnion.ts").WorkbenchFileState) => void;
  };
  feedback: {
    heatCapacityRealtimeCopy: import("./workbenchHeatCapacityRealtimeCopy.ts").HeatCapacityRealtimeCopy;
    clearHeatCapacityPressureAlertUiState: () => void;
    clearHeatCapacityToastQueue: () => void;
    clearHeatCapacityRecordSuccessToastTimers: () => void;
  };
  instrument: {
    pressHeatCapacityPumpBulb: (fileId?: string, source?: "user" | "autoDemo") => void;
    setHeatCapacityStopcockOpenByFileId: (fileId: string, nextOpen: boolean) => void;
  };
  ui: {
    pushLog: (message: import("./workbenchConsoleLocalization.ts").WorkbenchConsoleMessageInput, kind?: import("./workbenchConsolePresentation.ts").LogKind) => void;
    setSelectedPanel: React.Dispatch<React.SetStateAction<import("./workbenchFileState.ts").WorkbenchPanelKey>>;
  };
  lifecycle: {
    desktopExitQuiescedRef: React.MutableRefObject<boolean>;
    flushWorkspaceAfterRunStateCommit: () => void;
    desktopExitAutoDemoClockRef: React.MutableRefObject<import("./../heatCapacity/heatCapacityModeTransitionDemoClock.ts").HeatCapacityModeTransitionDemoClock | null>;
  };
  scene: {
    heatCapacityRefreshRestorePendingRef: React.MutableRefObject<boolean>;
    heatCapacityRuntimeFailureFileIdRef: React.MutableRefObject<string | null>;
    setHeatCapacityFocusResetKey: React.Dispatch<React.SetStateAction<number>>;
    setHeatCapacityHardSphereVisualResetKey: React.Dispatch<React.SetStateAction<number>>;
    heatCapacityFocusSessionRef: React.MutableRefObject<import("./workbenchHeatCapacityUiCheckpoint.ts").HeatCapacityFocusSession | null>;
  };
  guide: {
    clearGuideHeatCapacityGuidance: () => void;
    clearHeatCapacityGuideStartTimer: () => void;
  };
  guideState: {
    setGuideHeatCapacityActiveFileId: React.Dispatch<React.SetStateAction<string | null>>;
  };
  mode: {
    activateHeatCapacityModeFromExplore: (targetMode: import("./../../domain/heatCapacity/heatCapacityModeTypes.ts").HeatCapacityMode, freeBatchGroupCount?: 3 | 5 | 4 | 6 | 7 | null) => boolean;
    switchHeatCapacityMode: (targetMode: import("./../../domain/heatCapacity/heatCapacityModeTypes.ts").HeatCapacityMode, reason?: import("./../heatCapacity/heatCapacityModeTransitionModel.ts").HeatCapacityModeTransitionReason, teachingResetConfirmed?: boolean) => void;
    exitHeatCapacityTeachingModeToExplore: (sourceMode: "demo" | "guide") => void;
  };
}

export const createWorkbenchHeatDemoRuntimeActions = (ports: createWorkbenchHeatDemoRuntimeActionsPorts) => {
  const { heatCapacityAutoDemoTimersRef, heatCapacityAutoDemoFileIdRef, setAutoDemoStepIndex, setAutoDemoStepTitle, setAutoDemoStepDescription, setAutoDemoStepTarget, setAutoDemoStepProgressCriterion, setAutoDemoStepNote, setDemoFocusControlId, setDemoFocusPulseActive, setAutoDemoPhase, heatCapacityAutoDemoStartedAtMsRef, heatCapacityAutoDemoInitialDelayRemainingMsRef, heatCapacityAutoDemoTimelineRef, heatCapacityAutoDemoExecutedItemKeysRef, heatCapacityAutoDemoLastProcessedTimelineIndexRef, heatCapacityAutoDemoPausedElapsedMsRef, heatCapacityAutoDemoPausedFileIdRef, setAutoDemoStepCount, setAutoDemoCompletionMessage, heatCapacityModeTransitionDemoClockRef, autoDemoPaused, autoDemoInteractionLocked, autoDemoPhaseRef, autoDemoRunning } = ports.demoState;
  const { cancelHeatCapacityAutoDemoLockedPointerToast, showHeatCapacityAutoDemoStepPanel, setHeatCapacityAutoDemoCameraFocus, hideHeatCapacityAutoDemoStepPanel, showHeatCapacityAutoDemoCompletionToast } = ports.demoUi;
  const { updateFileById, filesRef, activeFileIdRef, activeFile, updateActiveFile } = ports.workspace;
  const { heatCapacityRealtimeCopy, clearHeatCapacityPressureAlertUiState, clearHeatCapacityToastQueue, clearHeatCapacityRecordSuccessToastTimers } = ports.feedback;
  const { pressHeatCapacityPumpBulb, setHeatCapacityStopcockOpenByFileId } = ports.instrument;
  const { pushLog, setSelectedPanel } = ports.ui;
  const { desktopExitQuiescedRef, flushWorkspaceAfterRunStateCommit, desktopExitAutoDemoClockRef } = ports.lifecycle;
  const { heatCapacityRefreshRestorePendingRef, heatCapacityRuntimeFailureFileIdRef, setHeatCapacityFocusResetKey, setHeatCapacityHardSphereVisualResetKey, heatCapacityFocusSessionRef } = ports.scene;
  const { clearGuideHeatCapacityGuidance, clearHeatCapacityGuideStartTimer } = ports.guide;
  const { setGuideHeatCapacityActiveFileId } = ports.guideState;
  const { activateHeatCapacityModeFromExplore, switchHeatCapacityMode, exitHeatCapacityTeachingModeToExplore } = ports.mode;
  const clearHeatCapacityAutoDemoTimers = () => {
    heatCapacityAutoDemoTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    heatCapacityAutoDemoTimersRef.current = [];
    cancelHeatCapacityAutoDemoLockedPointerToast();
  };

  const commitHeatCapacityAutoDemoPressureZero = (fileId: string) => {
    updateFileById(fileId, (file) => {
      if (file.kind !== 'heatCapacity') return file;
      const now = Date.now();
      const targetOffset = -(file.pressureSignalMvRaw + file.pressureInitialBiasMv);
      const targetKnobAngle = getHeatCapacityPressureZeroKnobAngleForOffset(targetOffset);
      const zeroedFile = setHeatCapacityPressureZeroOffset(file, targetOffset, 'fineWheel', targetKnobAngle, now);
      const zeroPressureValue = zeroedFile.pressureSignalMv ?? 0;
      const pressureZeroDisplayedSamples = Array.from({ length: 5 }, (_item, index) => ({
        atMs: now - (4 - index) * 100,
        valueMv: zeroPressureValue,
      }));
      return {
        ...zeroedFile,
        pressureZeroDisplayedSamples,
        pressureZeroed: isHeatCapacityPressureZeroWithinTolerance(pressureZeroDisplayedSamples),
      };
    });
  };

  const commitHeatCapacityAutoDemoDefaultReset = (fileId: string) => {
    updateFileById(fileId, (file) => {
      if (file.kind !== 'heatCapacity') return file;
      const now = Date.now();
      return {
        ...prepareHeatCapacityAutoDemoReset(file, now),
        pumpHint: heatCapacityRealtimeCopy.autoDemoPreparingHint,
      };
    });
  };

  const applyHeatCapacityAutoDemoAction = (
    fileId: string,
    action: HeatCapacityAutoDemoAction,
    sampleKey?: Parameters<typeof captureHeatCapacityWorkbenchSample>[1],
    onDeferredComplete?: () => void,
  ): boolean => {
    const now = Date.now();
    if (action === 'pumpStroke') {
      pressHeatCapacityPumpBulb(fileId, 'autoDemo');
      return true;
    }

    if (action === 'closeStopcockForPumping' || action === 'closeStopcockForRecovery') {
      setHeatCapacityStopcockOpenByFileId(fileId, false);
      return true;
    }

    if (action === 'openStopcockForRelease' || action === 'openStopcockForZero') {
      setHeatCapacityStopcockOpenByFileId(fileId, true);
      return true;
    }

    if (action === 'zeroPressure') {
      commitHeatCapacityAutoDemoPressureZero(fileId);
      return true;
    }

    if (action === 'captureSample' && sampleKey === 'zeroedSample') {
      const latestFile = filesRef.current.find((file) => file.id === fileId);
      if (
        !latestFile ||
        latestFile.kind !== 'heatCapacity' ||
        heatCapacityAutoDemoFileIdRef.current !== fileId
      ) {
        return false;
      }
      if (!isGuideU0ZeroReady(latestFile)) {
        const retryTimer = window.setTimeout(() => {
          heatCapacityAutoDemoTimersRef.current = heatCapacityAutoDemoTimersRef.current.filter((id) => id !== retryTimer);
          if (applyHeatCapacityAutoDemoAction(fileId, 'captureSample', 'zeroedSample', onDeferredComplete)) {
            onDeferredComplete?.();
          }
        }, 180);
        heatCapacityAutoDemoTimersRef.current.push(retryTimer);
        return false;
      }
    }

    updateFileById(fileId, (file) => {
      if (file.kind !== 'heatCapacity') return file;

      if (action === 'powerOn') {
        return prepareHeatCapacityAutoDemoStart(file, now);
      }

      if (action === 'openPumpValve') {
        return {
          ...setHeatCapacityScriptedPumpValveOpen(file, true, now),
          pumpHint: heatCapacityRealtimeCopy.pumpHints.pumpValveOpen,
        };
      }

      if (action === 'closePumpValve') {
        return {
          ...setHeatCapacityScriptedPumpValveOpen(file, false, now),
          pumpHint: heatCapacityRealtimeCopy.pumpHints.pumpValveClosed,
        };
      }

      if (action === 'captureSample' && sampleKey) {
        return captureHeatCapacityWorkbenchSample(file, sampleKey, now);
      }

      if (action === 'observeInitialPressure') {
        return {
          ...file,
          pumpHint: heatCapacityRealtimeCopy.pumpHints.observeInitialPressure,
          updatedAt: now,
        };
      }

      if (action === 'powerOff') {
        return {
          ...powerHeatCapacityWorkbenchFile(file, false, now),
          runState: 'running' as const,
          pumpHint: heatCapacityRealtimeCopy.autoDemoReadyToCompleteHint,
        };
      }

      if (action === 'completeTeachingMode') {
        const completedFile = completeHeatCapacityTeachingModeWorkbenchState(file, now);
        window.setTimeout(() => {
          pushLog(
            (language) => getHeatCapacityRealtimeCopy(language).autoDemoImportedCompleteLog(completedFile.name),
            'success',
          );
        }, 0);
        return {
          ...completedFile,
          heatCapacityMaterialsExpanded: true,
          updatedAt: now,
        };
      }

      return file;
    });
    return true;
  };

  const setHeatCapacityAutoDemoStepState = (
    step: HeatCapacityAutoDemoStep,
    stepIndex: number,
    stage: HeatCapacityAutoDemoTimelineItem['stage'],
    focusControlId?: HeatCapacityAutoDemoTimelineItem['focusControlId'],
    cameraFocusMode?: HeatCapacityAutoDemoTimelineItem['cameraFocusMode'],
  ) => {
    showHeatCapacityAutoDemoStepPanel();
    setAutoDemoStepIndex(stepIndex + 1);
    setAutoDemoStepTitle(step.title);
    setAutoDemoStepDescription(stage === 'preview'
      ? `下一步：${step.description}`
      : stage === 'highlight'
      ? `即将操作：${step.description}`
      : stage === 'action'
        ? step.description
        : `观察：${step.note}`);
    setAutoDemoStepTarget(step.target);
    setAutoDemoStepProgressCriterion(step.progressCriterion);
    setAutoDemoStepNote(step.note);
    const nextFocusControlId = focusControlId ?? step.targetControlId ?? null;
    setDemoFocusControlId(stage === 'highlight' ? nextFocusControlId : null);
    setDemoFocusPulseActive(stage === 'highlight' && Boolean(nextFocusControlId));
    if (stage === 'highlight' || stage === 'action') {
      const nextDemoCameraFocusMode = mapHeatCapacityAutoDemoCameraFocusMode(cameraFocusMode);
      if (nextDemoCameraFocusMode) {
        setHeatCapacityAutoDemoCameraFocus(nextDemoCameraFocusMode);
      }
    }
  };

  const finishHeatCapacityAutoDemoUi = (message: string = heatCapacityRealtimeCopy.autoDemoCompletionToast) => {
    clearHeatCapacityAutoDemoTimers();
    setAutoDemoPhase('idle');
    setDemoFocusControlId(null);
    setDemoFocusPulseActive(false);
    setHeatCapacityAutoDemoCameraFocus(null);
    hideHeatCapacityAutoDemoStepPanel();
    showHeatCapacityAutoDemoCompletionToast(message);
  };

  const scheduleHeatCapacityAutoDemoTimeline = (
    demoFileId: string,
    timeline: HeatCapacityAutoDemoTimelineItem[],
    startFromElapsedMs = 0,
    initialDelayMs = 0,
  ) => {
    heatCapacityAutoDemoStartedAtMsRef.current = performance.now() + initialDelayMs - startFromElapsedMs;
    heatCapacityAutoDemoInitialDelayRemainingMsRef.current = Math.max(0, initialDelayMs);
    heatCapacityAutoDemoFileIdRef.current = demoFileId;
    heatCapacityAutoDemoTimelineRef.current = timeline;

    timeline.forEach((timelineItem, timelineIndex) => {
      const timelineItemKey = getHeatCapacityAutoDemoTimelineItemKey(timelineItem, timelineIndex);
      if (heatCapacityAutoDemoExecutedItemKeysRef.current.has(timelineItemKey)) return;
      const timerId = window.setTimeout(() => {
        if (
          desktopExitQuiescedRef.current ||
          heatCapacityRefreshRestorePendingRef.current ||
          heatCapacityRuntimeFailureFileIdRef.current !== null ||
          activeFileIdRef.current !== demoFileId ||
          heatCapacityAutoDemoFileIdRef.current !== demoFileId
        ) {
          heatCapacityAutoDemoTimersRef.current = heatCapacityAutoDemoTimersRef.current.filter((id) => id !== timerId);
          return;
        }
        if (heatCapacityAutoDemoExecutedItemKeysRef.current.has(timelineItemKey)) {
          heatCapacityAutoDemoTimersRef.current = heatCapacityAutoDemoTimersRef.current.filter((id) => id !== timerId);
          return;
        }
        heatCapacityAutoDemoInitialDelayRemainingMsRef.current = 0;
        const markTimelineItemExecuted = () => {
          heatCapacityAutoDemoExecutedItemKeysRef.current.add(timelineItemKey);
          heatCapacityAutoDemoLastProcessedTimelineIndexRef.current = Math.max(
            heatCapacityAutoDemoLastProcessedTimelineIndexRef.current,
            timelineIndex,
          );
        };
        const shouldApplyTimelineUi = timelineIndex >= heatCapacityAutoDemoLastProcessedTimelineIndexRef.current;
        if (shouldApplyTimelineUi) {
          setHeatCapacityAutoDemoStepState(
            timelineItem.step,
            timelineItem.stepIndex,
            timelineItem.stage,
            timelineItem.focusControlId,
            timelineItem.cameraFocusMode,
          );
          if (timelineItem.stage === 'preview') {
            setDemoFocusPulseActive(false);
          }
        }
        let actionCompleted = true;
        if (timelineItem.stage === 'action' && timelineItem.action) {
          actionCompleted = applyHeatCapacityAutoDemoAction(
            demoFileId,
            timelineItem.action.action,
            timelineItem.action.sampleKey,
            markTimelineItemExecuted,
          );
          if (actionCompleted && timelineItem.action.action === 'completeTeachingMode') {
            markTimelineItemExecuted();
            setSelectedPanel('heatCapacityRecords');
            finishHeatCapacityAutoDemoUi();
          }
        }
        if (actionCompleted) markTimelineItemExecuted();
        if (shouldApplyTimelineUi && timelineItem.stage !== 'highlight') setDemoFocusPulseActive(false);
        heatCapacityAutoDemoTimersRef.current = heatCapacityAutoDemoTimersRef.current.filter((id) => id !== timerId);
      }, Math.max(0, initialDelayMs + timelineItem.atMs - startFromElapsedMs));
      heatCapacityAutoDemoTimersRef.current.push(timerId);
    });
  };

  const startHeatCapacityAutoDemoUi = (
    demoFileId: string,
    demoFileName: string,
    deferTimelineUntilModeTransitionCommit = false,
  ) => {
    clearHeatCapacityAutoDemoTimers();
    clearGuideHeatCapacityGuidance();
    setGuideHeatCapacityActiveFileId(null);
    setHeatCapacityAutoDemoCameraFocus(null);
    clearHeatCapacityPressureAlertUiState();
    const steps = createHeatCapacityAutoDemoSteps();
    const timeline = getHeatCapacityAutoDemoTimeline(steps);
    setHeatCapacityFocusResetKey((key) => key + 1);
    setHeatCapacityHardSphereVisualResetKey((key) => key + 1);
    heatCapacityFocusSessionRef.current = null;
    heatCapacityAutoDemoPausedElapsedMsRef.current = 0;
    heatCapacityAutoDemoInitialDelayRemainingMsRef.current = HEAT_CAPACITY_AUTO_DEMO_RESET_MS;
    heatCapacityAutoDemoLastProcessedTimelineIndexRef.current = -1;
    heatCapacityAutoDemoExecutedItemKeysRef.current.clear();
    heatCapacityAutoDemoPausedFileIdRef.current = null;
    const now = Date.now();
    updateFileById(demoFileId, (file) => file.kind === 'heatCapacity'
      ? {
          ...file,
          powerOn: false,
          runState: 'running',
          pumpValveOpen: false,
          pumpValveState: 'closed',
          pumpBulbState: 'idle',
          pumpHint: heatCapacityRealtimeCopy.autoDemoPreparingHint,
          updatedAt: now,
        }
      : file);
    showHeatCapacityAutoDemoStepPanel();
    setAutoDemoPhase('running');
    setAutoDemoStepCount(steps.length);
    setAutoDemoStepIndex(0);
    setAutoDemoStepTitle(heatCapacityRealtimeCopy.autoDemoPreparingTitle);
    setAutoDemoStepDescription(heatCapacityRealtimeCopy.autoDemoInitializingDescription);
    setAutoDemoStepTarget(heatCapacityRealtimeCopy.autoDemoPreparingTarget);
    setAutoDemoStepProgressCriterion(heatCapacityRealtimeCopy.autoDemoPreparingProgress);
    setAutoDemoStepNote(heatCapacityRealtimeCopy.autoDemoPreparingNote);
    clearHeatCapacityToastQueue();
    setAutoDemoCompletionMessage(null);
    setSelectedPanel('preview');
    showHeatCapacityAutoDemoCompletionToast(
      heatCapacityRealtimeCopy.autoDemoInitializingToast,
      HEAT_CAPACITY_AUTO_DEMO_RESET_MS,
    );
    commitHeatCapacityAutoDemoDefaultReset(demoFileId);
    if (deferTimelineUntilModeTransitionCommit) {
      heatCapacityAutoDemoFileIdRef.current = demoFileId;
      heatCapacityAutoDemoTimelineRef.current = timeline;
      heatCapacityAutoDemoStartedAtMsRef.current = performance.now() + HEAT_CAPACITY_AUTO_DEMO_RESET_MS;
      heatCapacityModeTransitionDemoClockRef.current = {
        fileId: demoFileId,
        elapsedMs: 0,
        initialDelayRemainingMs: HEAT_CAPACITY_AUTO_DEMO_RESET_MS,
      };
    } else {
      heatCapacityModeTransitionDemoClockRef.current = null;
      scheduleHeatCapacityAutoDemoTimeline(demoFileId, timeline, 0, HEAT_CAPACITY_AUTO_DEMO_RESET_MS);
    }
    pushLog(
      (language) => getHeatCapacityRealtimeCopy(language).autoDemoStartedLog(demoFileName),
      'success',
    );
  };

  const runHeatCapacityAutoDemo = () => {
    if (
      desktopExitQuiescedRef.current ||
      heatCapacityRefreshRestorePendingRef.current ||
      heatCapacityRuntimeFailureFileIdRef.current !== null
    ) return;
    if (activeFile.kind !== 'heatCapacity') return;
    clearHeatCapacityGuideStartTimer();
    clearHeatCapacityRecordSuccessToastTimers();

    if (autoDemoPaused && activeFile.runState === 'paused' && heatCapacityAutoDemoPausedFileIdRef.current === activeFile.id) {
      clearHeatCapacityAutoDemoTimers();
      showHeatCapacityAutoDemoStepPanel();
      setAutoDemoPhase('running');
      updateActiveFile((file) => file.kind === 'heatCapacity'
        ? {
            ...file,
            runState: 'running',
            lastUpdateMs: Date.now(),
            displayResponseLastUpdateMs: Date.now(),
            updatedAt: Date.now(),
          }
        : file);
      scheduleHeatCapacityAutoDemoTimeline(
        activeFile.id,
        heatCapacityAutoDemoTimelineRef.current,
        heatCapacityAutoDemoPausedElapsedMsRef.current,
        heatCapacityAutoDemoInitialDelayRemainingMsRef.current,
      );
      pushLog(
        (language) => getHeatCapacityRealtimeCopy(language).autoDemoResumedLog(activeFile.name),
        'success',
      );
      return;
    }

    if (autoDemoInteractionLocked || activeFile.runState === 'running') {
      pushLog(
        (language) => getHeatCapacityRealtimeCopy(language).autoDemoRunningLog(activeFile.name),
        'warning',
      );
      return;
    }

    if (activeFile.heatCapacityMode !== 'demo') {
      if (activeFile.heatCapacityMode === null) {
        activateHeatCapacityModeFromExplore('demo');
      } else {
        switchHeatCapacityMode(
          'demo',
          'mode-control',
        );
      }
      return;
    }

    startHeatCapacityAutoDemoUi(activeFile.id, activeFile.name);
  };

  const quiesceHeatCapacityAutoDemoForModeTransition = (fileId: string) => {
    if (autoDemoPhaseRef.current !== 'running' || heatCapacityModeTransitionDemoClockRef.current?.fileId === fileId) return;
    const now = performance.now();
    const demoClock = captureHeatCapacityModeTransitionDemoClock({
      fileId,
      nowMs: now,
      timelineStartedAtMs: heatCapacityAutoDemoStartedAtMsRef.current,
    });
    clearHeatCapacityAutoDemoTimers();
    heatCapacityAutoDemoPausedElapsedMsRef.current = demoClock.elapsedMs;
    heatCapacityAutoDemoInitialDelayRemainingMsRef.current = demoClock.initialDelayRemainingMs;
    heatCapacityModeTransitionDemoClockRef.current = demoClock;
  };

  const resumeQuiescedHeatCapacityAutoDemo = (fileId: string) => {
    const resume = resolveHeatCapacityModeTransitionDemoResume(
      heatCapacityModeTransitionDemoClockRef.current,
      fileId,
      autoDemoPhaseRef.current,
    );
    if (!resume) return;
    scheduleHeatCapacityAutoDemoTimeline(
      fileId,
      heatCapacityAutoDemoTimelineRef.current,
      resume.elapsedMs,
      resume.initialDelayRemainingMs,
    );
    heatCapacityModeTransitionDemoClockRef.current = null;
  };

  const pauseHeatCapacityAutoDemo = () => {
    if (!autoDemoRunning) return;
    heatCapacityModeTransitionDemoClockRef.current = null;
    const now = performance.now();
    const initialDelayRemainingMs = Math.max(0, heatCapacityAutoDemoStartedAtMsRef.current - now);
    const elapsedMs = initialDelayRemainingMs > 0
      ? 0
      : Math.max(0, now - heatCapacityAutoDemoStartedAtMsRef.current);
    heatCapacityAutoDemoPausedElapsedMsRef.current = elapsedMs;
    heatCapacityAutoDemoInitialDelayRemainingMsRef.current = initialDelayRemainingMs;
    heatCapacityAutoDemoPausedFileIdRef.current = activeFile.id;
    clearHeatCapacityAutoDemoTimers();
    setAutoDemoPhase('paused');
    updateActiveFile((file) => file.kind === 'heatCapacity'
      ? { ...file, runState: 'paused', updatedAt: Date.now() }
      : file);
    flushWorkspaceAfterRunStateCommit();
    pushLog(
      (language) => getHeatCapacityRealtimeCopy(language).autoDemoPausedLog(activeFile.name),
      'warning',
    );
  };

  const freezeHeatCapacityAutoDemoForRuntimeFailure = (
    fileId: string,
    failureProjectionDeferred: boolean,
  ) => {
    const shouldPauseDemoOnRecovery = activeFileIdRef.current === fileId &&
      autoDemoPhaseRef.current === 'running';
    if (!shouldPauseDemoOnRecovery) {
      clearHeatCapacityAutoDemoTimers();
      return false;
    }

    const now = performance.now();
    const frozenClock = desktopExitAutoDemoClockRef.current?.fileId === fileId
      ? desktopExitAutoDemoClockRef.current
      : heatCapacityModeTransitionDemoClockRef.current?.fileId === fileId
        ? heatCapacityModeTransitionDemoClockRef.current
        : heatCapacityRefreshRestorePendingRef.current
          ? null
          : captureHeatCapacityModeTransitionDemoClock({
              fileId,
              nowMs: now,
              timelineStartedAtMs: heatCapacityAutoDemoStartedAtMsRef.current,
            });
    if (frozenClock) {
      heatCapacityAutoDemoPausedElapsedMsRef.current = frozenClock.elapsedMs;
      heatCapacityAutoDemoInitialDelayRemainingMsRef.current = frozenClock.initialDelayRemainingMs;
      heatCapacityAutoDemoPausedFileIdRef.current = fileId;
    }
    clearHeatCapacityAutoDemoTimers();
    if (!failureProjectionDeferred) {
      autoDemoPhaseRef.current = 'paused';
      setAutoDemoPhase('paused');
    }
    return true;
  };

  const terminateHeatCapacityAutoDemo = () => {
    exitHeatCapacityTeachingModeToExplore('demo');
    setAutoDemoStepTitle(heatCapacityRealtimeCopy.autoDemoTerminatedTitle);
    setAutoDemoStepDescription(heatCapacityRealtimeCopy.autoDemoTerminatedDescription);
    setAutoDemoStepTarget(heatCapacityRealtimeCopy.autoDemoTerminatedTarget);
    setAutoDemoStepProgressCriterion(heatCapacityRealtimeCopy.autoDemoTerminatedProgress);
    setAutoDemoStepNote(heatCapacityRealtimeCopy.autoDemoTerminatedNote);
    hideHeatCapacityAutoDemoStepPanel();
    showHeatCapacityAutoDemoCompletionToast(heatCapacityRealtimeCopy.autoDemoTerminatedToast);
    pushLog(
      (language) => getHeatCapacityRealtimeCopy(language).autoDemoTerminatedLog(activeFile.name),
      'warning',
    );
  };
  return { clearHeatCapacityAutoDemoTimers, scheduleHeatCapacityAutoDemoTimeline, startHeatCapacityAutoDemoUi, runHeatCapacityAutoDemo, quiesceHeatCapacityAutoDemoForModeTransition, resumeQuiescedHeatCapacityAutoDemo, pauseHeatCapacityAutoDemo, freezeHeatCapacityAutoDemoForRuntimeFailure, terminateHeatCapacityAutoDemo };
};
