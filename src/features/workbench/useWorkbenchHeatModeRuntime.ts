import type { WorkbenchHeatEffect } from './workbenchHeatEffect.ts';
import { HEAT_CAPACITY_GUIDE_START_NOTICE_MS, HEAT_CAPACITY_MODE_TRANSITION_VISUAL_MS, HEAT_CAPACITY_MODE_TRANSITION_SETTLE_DEADLINE_MS } from './workbenchTeachingUiTiming.ts';
import React, { useCallback } from 'react';

import { createDefaultHeatCapacityFile } from './workbenchHeatCapacityFileFactory.ts';

import { refreshHeatCapacityPumpFrequency } from './workbenchHeatCapacityRuntimeCoordinator.ts';
import type { HeatCapacityMode } from './workbenchHeatCapacityStateTypes.ts';
import { type HeatCapacitySceneDiscreteMotionState, type HeatCapacitySceneModeTransitionController } from '../heatCapacity/HeatCapacityInstrumentScene';
import { getHeatCapacityModeTransitionVisualRemainingMs } from '../heatCapacity/heatCapacityModeTransitionModel.ts';



import { HEAT_CAPACITY_AUTO_DEMO_ZERO_KNOB_MOTION_DURATION_MS } from '../../domain/heatCapacity/heatCapacityAutoDemo.ts';
import { createWorkbenchActiveModeCheckpointOverride } from './workbenchIndexedDbPersistence.ts';


import { createHeatCapacityModeActions } from './workbenchHeatCapacityModeActions.ts';
import { resolveHeatCapacityModeTarget, shouldConfirmHeatCapacityTeachingProgressReset } from './workbenchHeatCapacityModeActivation.ts';
import { enterHeatCapacityExploreModeWorkbenchState, prepareHeatCapacityModeSessionForExit } from './workbenchHeatCapacityModeSession.ts';

import { isExperimentTutorialModeUnlocked } from '../learning/workbenchTutorialAccessPolicy.ts';


export interface useWorkbenchHeatModeRuntimePorts {
  workspace: {
    filesRef: React.MutableRefObject<import("./workbenchFileUnion.ts").WorkbenchFileState[]>;
    activeFileIdRef: React.MutableRefObject<string>;
    updateFileById: (fileId: string, updater: (file: import("./workbenchFileUnion.ts").WorkbenchFileState) => import("./workbenchFileUnion.ts").WorkbenchFileState) => void;
    activeFile: import("./workbenchFileUnion.ts").WorkbenchFileState;
  };
  sceneRestore: {
    commitHeatCapacityFileProjection: (nextFile: import("./workbenchHeatCapacityStateTypes.ts").WorkbenchHeatCapacityState) => void;
    applyHeatCapacityModeUiProjection: (file: import("./workbenchHeatCapacityStateTypes.ts").WorkbenchHeatCapacityState, checkpoint: import("./../heatCapacity/heatCapacityModeUiCheckpoint.ts").HeatCapacityModeUiCheckpoint | null, modeTransitionRequestId?: number | null) => void;
    restoreHeatCapacityGuideUiCheckpoint: (fileId: string, guideCheckpoint: import("./../heatCapacity/heatCapacityModeUiCheckpoint.ts").HeatCapacityModeGuideCheckpoint) => void;
    activeFileOwnsPendingHeatCapacityRefresh: (file: import("./workbenchHeatCapacityStateTypes.ts").WorkbenchHeatCapacityState) => boolean;
    cancelPendingHeatCapacityRefreshRestore: () => boolean;
  };
  scene: {
    heatCapacityRuntimeFailureFileIdRef: React.MutableRefObject<string | null>;
    heatCapacityModeTransitionStateRef: React.MutableRefObject<import("./../heatCapacity/heatCapacityModeTransitionModel.ts").HeatCapacityModeTransitionState>;
    dispatchHeatCapacityModeTransition: (event: import("./../heatCapacity/heatCapacityModeTransitionModel.ts").HeatCapacityModeTransitionEvent) => import("./../heatCapacity/heatCapacityModeTransitionModel.ts").HeatCapacityModeTransitionState;
    requestHeatCapacityModeTransition: (request: import("./useHeatCapacityModeSessionCoordinator.ts").HeatCapacityModeTransitionRequest, sceneMotionReasons: readonly ("camera" | "orbit" | "instrument" | "pump" | "scripted-zero")[]) => import("./../heatCapacity/heatCapacityModeTransitionModel.ts").HeatCapacityModeTransitionState;
    heatCapacitySceneDiscreteMotionRef: React.MutableRefObject<import("./../heatCapacity/HeatCapacityInstrumentScene.tsx").HeatCapacitySceneDiscreteMotionState>;
    heatCapacityRefreshRestorePendingRef: React.MutableRefObject<boolean>;
    heatCapacityModeTransitionPausedVisualClockRef: React.MutableRefObject<{ requestId: number; remainingMs: number; } | null>;
    heatCapacitySceneModeTransitionControllerRef: React.MutableRefObject<import("./../heatCapacity/HeatCapacityInstrumentScene.tsx").HeatCapacitySceneModeTransitionController | null>;
    setHeatCapacityModeSceneRestoreRequest: React.Dispatch<React.SetStateAction<import("./../heatCapacity/HeatCapacityInstrumentScene.tsx").HeatCapacitySceneModeRestoreRequest | null>>;
    pendingHeatCapacityGuideUiRestoreRef: React.MutableRefObject<{ requestId: number; fileId: string; checkpoint: import("./../heatCapacity/heatCapacityModeUiCheckpoint.ts").HeatCapacityModeGuideCheckpoint; } | null>;
    scheduleHeatCapacityModeTargetPreparationRef: React.MutableRefObject<(requestId: number) => void>;
    heatCapacityModeTransitionPrepareFrameRef: React.MutableRefObject<number | null>;
    heatCapacityModeTransitionVisualTimerRef: React.MutableRefObject<number | null>;
    heatCapacitySceneCheckpointProviderRef: React.MutableRefObject<{ fileId: string; provider: import("./../heatCapacity/HeatCapacityInstrumentScene.tsx").HeatCapacitySceneCheckpointProvider; } | null>;
    heatCapacitySceneCheckpointSuppressPersistenceRef: React.MutableRefObject<boolean>;
    heatCapacityModeTransitionWatchdogHandlerRef: React.MutableRefObject<(event: import("./useHeatCapacityModeSessionCoordinator.ts").HeatCapacityModeTransitionWatchdogEvent) => void>;
    heatCapacityModeTransitionState: import("./../heatCapacity/heatCapacityModeTransitionModel.ts").HeatCapacityModeTransitionState;
    heatCapacityRefreshRestoring: boolean;
    heatCapacityModeTransitionRefreshResumedRef: React.MutableRefObject<boolean>;
    heatCapacitySceneReadyFileId: string | null;
  };
  lifecycle: {
    desktopExitQuiescedRef: React.MutableRefObject<boolean>;
    heatCapacityRefreshPersistRef: React.MutableRefObject<() => void>;
    flushWorkspacePersistenceRef: React.MutableRefObject<(activeModeCheckpointOverride?: import("./workbenchIndexedDbPersistence.ts").WorkbenchActiveModeCheckpointOverride | undefined) => Promise<boolean>>;
    desktopExitQuiesced: boolean;
  };
  ui: {
    setLeftCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
    setParametersCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
    requestPromptConfirmation: (request: import("./../../components/prompts/PromptConfirmDialog.tsx").PromptConfirmationRequest) => boolean;
  };
  runtimeLifecycle: {
    resetHeatCapacitySceneUiState: () => void;
    releaseHeatCapacityRuntimeForFileExit: (fileId: string) => void;
  };
  demoRuntime: {
    startHeatCapacityAutoDemoUi: (demoFileId: string, demoFileName: string, deferTimelineUntilModeTransitionCommit?: boolean) => void;
    quiesceHeatCapacityAutoDemoForModeTransition: (fileId: string) => void;
    resumeQuiescedHeatCapacityAutoDemo: (fileId: string) => void;
  };
  demoUi: {
    showHeatCapacityAutoDemoCompletionToast: (message?: string, durationMs?: number) => void;
    showHeatCapacityTeachingCompletedLockedInteraction: (message?: string | undefined, control?: import("./../../domain/heatCapacity/heatCapacityInstrumentFeedback.ts").HeatCapacityInstrumentControl | undefined) => void;
  };
  feedback: {
    heatCapacityRealtimeCopy: import("./workbenchHeatCapacityRealtimeCopy.ts").HeatCapacityRealtimeCopy;
  };
  demoState: {
    autoDemoRunning: boolean;
    heatCapacityModeTransitionDemoClockRef: React.MutableRefObject<import("./../heatCapacity/heatCapacityModeTransitionDemoClock.ts").HeatCapacityModeTransitionDemoClock | null>;
    heatCapacityAutoDemoTimelineRef: React.MutableRefObject<import("./../../domain/heatCapacity/heatCapacityAutoDemo.ts").HeatCapacityAutoDemoTimelineItem[]>;
    heatCapacityAutoDemoPausedElapsedMsRef: React.MutableRefObject<number>;
    heatCapacityAutoDemoInitialDelayRemainingMsRef: React.MutableRefObject<number>;
    heatCapacityAutoDemoStartedAtMsRef: React.MutableRefObject<number>;
    setAutoDemoTimelineClockMs: React.Dispatch<React.SetStateAction<number>>;
    autoDemoPhase: import("./../heatCapacity/heatCapacityModeControlModel.ts").HeatCapacityAutoDemoPhase;
    autoDemoInteractionLocked: boolean;
  };
  checkpoint: {
    resolveDeferredHeatCapacityGuideUiCheckpoint: (file: import("./workbenchHeatCapacityStateTypes.ts").WorkbenchHeatCapacityState) => import("./../heatCapacity/heatCapacityModeUiCheckpoint.ts").HeatCapacityModeGuideCheckpoint | null;
    buildHeatCapacityModeUiCheckpoint: (currentFile: import("./workbenchHeatCapacityStateTypes.ts").WorkbenchHeatCapacityState, capturedAtMs?: number, guidePayloadOverride?: import("./../heatCapacity/heatCapacityModeUiCheckpoint.ts").HeatCapacityModeGuideCheckpoint | null) => import("./../heatCapacity/heatCapacityModeUiCheckpoint.ts").HeatCapacityModeUiCheckpoint;
  };
  pump: {
    clearHeatCapacityPumpAnimationTimers: () => void;
  };
  preferences: {
    workbenchPromptCopy: typeof import("./workbenchPromptCopies.ts").workbenchPromptCopies[keyof typeof import("./workbenchPromptCopies.ts").workbenchPromptCopies];
  };
  initial: {
    initialHeatCapacityRefreshSession: import("./workbenchHeatCapacityRefreshSession.ts").WorkbenchHeatCapacityRefreshSession | null;
  };
  tutorial: {
    experienceProfile: import("./../learning/experimentLearningModel.ts").AppExperienceProfile;
    tutorialActive: boolean;
    activeTutorialExperiment: import("./../learning/experimentLearningModel.ts").ExperimentLearningId | null;
    setTutorialBlockedNoticeOpen: React.Dispatch<React.SetStateAction<boolean>>;
  };
  free: {
    activeHeatCapacityFreeBatchProgress: import("./../../domain/heatCapacity/heatCapacityFreeBatchModel.ts").HeatCapacityFreeBatchProgress | null;
    setHeatCapacityBatchSetupSelection: React.Dispatch<React.SetStateAction<3 | 4 | 5 | 6 | 7 | null>>;
    setHeatCapacityBatchSetupRequestedFileId: React.Dispatch<React.SetStateAction<string | null>>;
  };
}

export const useWorkbenchHeatModeRuntime = (ports: useWorkbenchHeatModeRuntimePorts) => {
  const { filesRef, activeFileIdRef, updateFileById, activeFile } = ports.workspace;
  const { commitHeatCapacityFileProjection, applyHeatCapacityModeUiProjection, restoreHeatCapacityGuideUiCheckpoint, activeFileOwnsPendingHeatCapacityRefresh, cancelPendingHeatCapacityRefreshRestore } = ports.sceneRestore;
  const { heatCapacityRuntimeFailureFileIdRef, heatCapacityModeTransitionStateRef, dispatchHeatCapacityModeTransition, requestHeatCapacityModeTransition, heatCapacitySceneDiscreteMotionRef, heatCapacityRefreshRestorePendingRef, heatCapacityModeTransitionPausedVisualClockRef, heatCapacitySceneModeTransitionControllerRef, setHeatCapacityModeSceneRestoreRequest, pendingHeatCapacityGuideUiRestoreRef, scheduleHeatCapacityModeTargetPreparationRef, heatCapacityModeTransitionPrepareFrameRef, heatCapacityModeTransitionVisualTimerRef, heatCapacitySceneCheckpointProviderRef, heatCapacitySceneCheckpointSuppressPersistenceRef, heatCapacityModeTransitionWatchdogHandlerRef, heatCapacityModeTransitionState, heatCapacityRefreshRestoring, heatCapacityModeTransitionRefreshResumedRef, heatCapacitySceneReadyFileId } = ports.scene;
  const { desktopExitQuiescedRef, heatCapacityRefreshPersistRef, flushWorkspacePersistenceRef, desktopExitQuiesced } = ports.lifecycle;
  const { setLeftCollapsed, setParametersCollapsed, requestPromptConfirmation } = ports.ui;
  const { resetHeatCapacitySceneUiState, releaseHeatCapacityRuntimeForFileExit } = ports.runtimeLifecycle;
  const { startHeatCapacityAutoDemoUi, quiesceHeatCapacityAutoDemoForModeTransition, resumeQuiescedHeatCapacityAutoDemo } = ports.demoRuntime;
  const { showHeatCapacityAutoDemoCompletionToast, showHeatCapacityTeachingCompletedLockedInteraction } = ports.demoUi;
  const { heatCapacityRealtimeCopy } = ports.feedback;
  const { autoDemoRunning, heatCapacityModeTransitionDemoClockRef, heatCapacityAutoDemoTimelineRef, heatCapacityAutoDemoPausedElapsedMsRef, heatCapacityAutoDemoInitialDelayRemainingMsRef, heatCapacityAutoDemoStartedAtMsRef, setAutoDemoTimelineClockMs, autoDemoPhase, autoDemoInteractionLocked } = ports.demoState;
  const { resolveDeferredHeatCapacityGuideUiCheckpoint, buildHeatCapacityModeUiCheckpoint } = ports.checkpoint;
  const { clearHeatCapacityPumpAnimationTimers } = ports.pump;
  const { workbenchPromptCopy } = ports.preferences;
  const { initialHeatCapacityRefreshSession } = ports.initial;
  const { experienceProfile, tutorialActive, activeTutorialExperiment, setTutorialBlockedNoticeOpen } = ports.tutorial;
  const { activeHeatCapacityFreeBatchProgress, setHeatCapacityBatchSetupSelection, setHeatCapacityBatchSetupRequestedFileId } = ports.free;
  const {
    applyTransitionEvent: applyHeatCapacityModeTransitionEvent,
    activateFromExplore: activateHeatCapacityModeFromExplore,
    exitToExplore: exitHeatCapacityFormalModeToExplore,
    switchMode: switchHeatCapacityMode,
    activateFile: activateHeatCapacityFileMode,
  } = createHeatCapacityModeActions({
    now: Date.now,
    getActiveFile: () => filesRef.current.find((file) => file.id === activeFileIdRef.current),
    getFile: (fileId) => filesRef.current.find((file) => file.id === fileId),
    commitFile: (file) => commitHeatCapacityFileProjection(file),
    hasRuntimeFailure: () => heatCapacityRuntimeFailureFileIdRef.current !== null,
    isDesktopExitQuiesced: () => desktopExitQuiescedRef.current,
    transition: {
      getState: () => heatCapacityModeTransitionStateRef.current,
      dispatch: dispatchHeatCapacityModeTransition,
      request: requestHeatCapacityModeTransition,
      getMotionReasons: () => heatCapacitySceneDiscreteMotionRef.current.reasons,
      schedulePreparation: (requestId) => scheduleHeatCapacityModeTargetPreparation(requestId),
    },
    persistence: {
      requestFrame: (callback) => { window.requestAnimationFrame(callback); },
      refresh: () => heatCapacityRefreshPersistRef.current(),
      flush: () => flushWorkspacePersistenceRef.current(),
    },
    ui: {
      applyMode: (file, checkpoint) => applyHeatCapacityModeUiProjection(file, checkpoint),
      collapsePanels: () => { setLeftCollapsed(true); setParametersCollapsed(true); },
      expandFiles: () => setLeftCollapsed(false),
      resetScene: () => resetHeatCapacitySceneUiState(),
      startDemo: (file) => startHeatCapacityAutoDemoUi(file.id, file.name),
      showGuideStart: () => showHeatCapacityAutoDemoCompletionToast(
        heatCapacityRealtimeCopy.guideModeStartingToast,
        HEAT_CAPACITY_GUIDE_START_NOTICE_MS,
      ),
      requestTeachingReset: (onConfirm) => requestHeatCapacityTeachingProgressReset(onConfirm),
    },
    demo: {
      isRunning: () => autoDemoRunning,
      quiesce: (fileId) => quiesceHeatCapacityAutoDemoForModeTransition(fileId),
      resume: (fileId) => resumeQuiescedHeatCapacityAutoDemo(fileId),
    },
  });

  function finishHeatCapacityModeTransitionAnimation() {
    if (
      desktopExitQuiescedRef.current ||
      heatCapacityRefreshRestorePendingRef.current ||
      heatCapacityRuntimeFailureFileIdRef.current !== null
    ) return;
    const transition = heatCapacityModeTransitionStateRef.current;
    if (transition.phase !== 'animating') return;
    heatCapacityModeTransitionPausedVisualClockRef.current = null;
    heatCapacitySceneModeTransitionControllerRef.current?.finish(transition.requestId);
    setHeatCapacityModeSceneRestoreRequest(null);
    const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    if (
      transition.visibleMode === 'guide' &&
      currentFile?.kind === 'heatCapacity' &&
      currentFile.heatCapacityMode === 'guide'
    ) {
      const guideCheckpoint = resolveDeferredHeatCapacityGuideUiCheckpoint(currentFile);
      if (guideCheckpoint && transition.queuedMode) {
        pendingHeatCapacityGuideUiRestoreRef.current = {
          requestId: transition.requestId,
          fileId: currentFile.id,
          checkpoint: guideCheckpoint,
        };
      } else {
        if (guideCheckpoint) {
          restoreHeatCapacityGuideUiCheckpoint(currentFile.id, guideCheckpoint);
        }
        pendingHeatCapacityGuideUiRestoreRef.current = null;
      }
    } else {
      pendingHeatCapacityGuideUiRestoreRef.current = null;
    }
    const nextState = applyHeatCapacityModeTransitionEvent({
      type: 'animation-finished',
      sceneMotionReasons: heatCapacitySceneDiscreteMotionRef.current.reasons,
    });
    if (nextState.phase === 'preparing-target') {
      scheduleHeatCapacityModeTargetPreparationRef.current(nextState.requestId);
    } else if (nextState.phase === 'idle') {
      if (currentFile?.kind === 'heatCapacity' && currentFile.heatCapacityMode === 'demo') {
        resumeQuiescedHeatCapacityAutoDemo(currentFile.id);
      }
    }
  }

  function applyPreparedHeatCapacityModeTarget(
    requestId: number,
    targetMode: HeatCapacityMode,
    target: ReturnType<typeof resolveHeatCapacityModeTarget>,
  ) {
    heatCapacityModeTransitionPausedVisualClockRef.current = null;
    if (targetMode !== 'demo') {
      heatCapacityModeTransitionDemoClockRef.current = null;
    }
    commitHeatCapacityFileProjection(target.file);
    applyHeatCapacityModeUiProjection(target.file, target.checkpoint, requestId);
    if (target.activation === 'fresh-demo') {
      startHeatCapacityAutoDemoUi(target.file.id, target.file.name, true);
    } else if (target.activation === 'fresh-guide') {
      showHeatCapacityAutoDemoCompletionToast(
        heatCapacityRealtimeCopy.guideModeStartingToast,
        HEAT_CAPACITY_GUIDE_START_NOTICE_MS,
      );
    }
    applyHeatCapacityModeTransitionEvent({
      type: 'target-applied',
      requestId,
      targetMode,
      startedAtMs: Date.now(),
      durationMs: HEAT_CAPACITY_MODE_TRANSITION_VISUAL_MS,
    });
    heatCapacityModeTransitionPrepareFrameRef.current = window.requestAnimationFrame(() => {
      heatCapacityModeTransitionPrepareFrameRef.current = null;
      if (heatCapacityRuntimeFailureFileIdRef.current !== null) return;
      const activeTransition = heatCapacityModeTransitionStateRef.current;
      if (activeTransition.phase !== 'animating' || activeTransition.requestId !== requestId) return;
      heatCapacitySceneModeTransitionControllerRef.current?.start(requestId);
      if (heatCapacityModeTransitionVisualTimerRef.current !== null) {
        window.clearTimeout(heatCapacityModeTransitionVisualTimerRef.current);
      }
      heatCapacityModeTransitionVisualTimerRef.current = window.setTimeout(() => {
        heatCapacityModeTransitionVisualTimerRef.current = null;
        if (heatCapacityRuntimeFailureFileIdRef.current !== null) return;
        const currentTransition = heatCapacityModeTransitionStateRef.current;
        if (currentTransition.phase !== 'animating' || currentTransition.requestId !== requestId) return;
        finishHeatCapacityModeTransitionAnimation();
      }, HEAT_CAPACITY_MODE_TRANSITION_VISUAL_MS);
    });
  }

  const captureHeatCapacityModeSceneMetadata = (fileId: string) => {
    const checkpointRegistration = heatCapacitySceneCheckpointProviderRef.current;
    if (checkpointRegistration?.fileId !== fileId) return;
    heatCapacitySceneCheckpointSuppressPersistenceRef.current = true;
    try {
      checkpointRegistration.provider();
    } finally {
      heatCapacitySceneCheckpointSuppressPersistenceRef.current = false;
    }
  };

  function abortHeatCapacityModeTransitionToVisibleFile(requestId: number) {
    heatCapacityModeTransitionPausedVisualClockRef.current = null;
    heatCapacitySceneModeTransitionControllerRef.current?.finish(requestId);
    setHeatCapacityModeSceneRestoreRequest(null);
    const visibleFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    const visibleMode = visibleFile?.kind === 'heatCapacity'
      ? visibleFile.heatCapacityMode
      : heatCapacityModeTransitionStateRef.current.visibleMode;
    applyHeatCapacityModeTransitionEvent({ type: 'synchronize', visibleMode });
    if (visibleFile?.kind === 'heatCapacity' && visibleFile.heatCapacityMode === 'demo') {
      resumeQuiescedHeatCapacityAutoDemo(visibleFile.id);
    } else {
      heatCapacityModeTransitionDemoClockRef.current = null;
    }
  }

  function prepareHeatCapacityModeTarget(requestId: number) {
    if (
      desktopExitQuiescedRef.current ||
      heatCapacityRefreshRestorePendingRef.current ||
      heatCapacityRuntimeFailureFileIdRef.current !== null
    ) return;
    try {
      const transition = heatCapacityModeTransitionStateRef.current;
      if (
        transition.phase !== 'preparing-target' ||
        transition.requestId !== requestId ||
        !transition.targetMode
      ) return;
      if (heatCapacitySceneDiscreteMotionRef.current.reasons.length > 0) {
        applyHeatCapacityModeTransitionEvent({
          type: 'source-motion-changed',
          sceneMotionReasons: heatCapacitySceneDiscreteMotionRef.current.reasons,
        });
        return;
      }
      const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
      if (!currentFile || currentFile.kind !== 'heatCapacity') {
        applyHeatCapacityModeTransitionEvent({ type: 'synchronize', visibleMode: 'free' });
        return;
      }
      captureHeatCapacityModeSceneMetadata(currentFile.id);
      const now = Date.now();
      const deferredGuideCheckpoint = resolveDeferredHeatCapacityGuideUiCheckpoint(currentFile);
      const sourceCheckpoint = currentFile.heatCapacityMode === 'free'
        ? null
        : buildHeatCapacityModeUiCheckpoint(currentFile, now, deferredGuideCheckpoint);
      const suspendedFile = prepareHeatCapacityModeSessionForExit(
        currentFile,
        sourceCheckpoint,
        now,
      );
      pendingHeatCapacityGuideUiRestoreRef.current = null;
      const target = resolveHeatCapacityModeTarget(suspendedFile, transition.targetMode, now);
      heatCapacitySceneModeTransitionControllerRef.current?.prepare(requestId, null);
      applyPreparedHeatCapacityModeTarget(requestId, transition.targetMode, target);
    } catch (error) {
      console.error('[Workbench] Heat-capacity mode target preparation failed:', error);
      abortHeatCapacityModeTransitionToVisibleFile(requestId);
    }
  }

  function scheduleHeatCapacityModeTargetPreparation(requestId: number) {
    if (heatCapacityRuntimeFailureFileIdRef.current !== null) return;
    if (heatCapacityModeTransitionPrepareFrameRef.current !== null) {
      window.cancelAnimationFrame(heatCapacityModeTransitionPrepareFrameRef.current);
    }
    heatCapacityModeTransitionPrepareFrameRef.current = window.requestAnimationFrame(() => {
      heatCapacityModeTransitionPrepareFrameRef.current = null;
      prepareHeatCapacityModeTarget(requestId);
    });
  }

  scheduleHeatCapacityModeTargetPreparationRef.current = scheduleHeatCapacityModeTargetPreparation;

  const completeHeatCapacityModeSourceMotions = (
    fileId: string,
    reasons: readonly HeatCapacitySceneDiscreteMotionState['reasons'][number][],
  ) => {
    if (reasons.includes('pump')) {
      clearHeatCapacityPumpAnimationTimers();
      updateFileById(fileId, (file) => file.kind === 'heatCapacity'
        ? refreshHeatCapacityPumpFrequency({ ...file, pumpBulbState: 'idle' }, Date.now())
        : file);
    }
    const demoClock = heatCapacityModeTransitionDemoClockRef.current;
    if (reasons.includes('scripted-zero') && demoClock?.fileId === fileId) {
      const zeroAction = heatCapacityAutoDemoTimelineRef.current.find((item) => (
        item.stage === 'action' && item.action?.action === 'zeroPressure'
      ));
      if (zeroAction) {
        const settledElapsedMs = Math.max(
          demoClock.elapsedMs,
          zeroAction.atMs + HEAT_CAPACITY_AUTO_DEMO_ZERO_KNOB_MOTION_DURATION_MS,
        );
        const now = performance.now();
        demoClock.elapsedMs = settledElapsedMs;
        demoClock.initialDelayRemainingMs = 0;
        heatCapacityAutoDemoPausedElapsedMsRef.current = settledElapsedMs;
        heatCapacityAutoDemoInitialDelayRemainingMsRef.current = 0;
        heatCapacityAutoDemoStartedAtMsRef.current = now - settledElapsedMs;
        setAutoDemoTimelineClockMs(now);
      }
    }
  };

  heatCapacityModeTransitionWatchdogHandlerRef.current = ({
    phase,
    requestId,
  }) => {
    if (
      desktopExitQuiescedRef.current ||
      heatCapacityRefreshRestorePendingRef.current ||
      heatCapacityRuntimeFailureFileIdRef.current !== null
    ) return;
    if (heatCapacityModeTransitionPrepareFrameRef.current !== null) {
      window.cancelAnimationFrame(heatCapacityModeTransitionPrepareFrameRef.current);
      heatCapacityModeTransitionPrepareFrameRef.current = null;
    }
    if (heatCapacityModeTransitionVisualTimerRef.current !== null) {
      window.clearTimeout(heatCapacityModeTransitionVisualTimerRef.current);
      heatCapacityModeTransitionVisualTimerRef.current = null;
    }
    void (async () => {
      const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
      const motionReasons = heatCapacitySceneDiscreteMotionRef.current.reasons;
      if (currentFile?.kind === 'heatCapacity') {
        completeHeatCapacityModeSourceMotions(currentFile.id, motionReasons);
      }
      const controller = heatCapacitySceneModeTransitionControllerRef.current;
      let settleDeadlineId: number | null = null;
      const settled = controller
        ? await Promise.race([
            controller.settleMotions(requestId),
            new Promise<boolean>((resolve) => {
              settleDeadlineId = window.setTimeout(
                () => resolve(false),
                HEAT_CAPACITY_MODE_TRANSITION_SETTLE_DEADLINE_MS,
              );
            }),
          ]).finally(() => {
            if (settleDeadlineId !== null) window.clearTimeout(settleDeadlineId);
          })
        : motionReasons.length === 0;
      const currentTransition = heatCapacityModeTransitionStateRef.current;
      if (
        desktopExitQuiescedRef.current ||
        heatCapacityRefreshRestorePendingRef.current ||
        heatCapacityRuntimeFailureFileIdRef.current !== null
      ) return;
      if (currentTransition.phase !== phase || currentTransition.requestId !== requestId) return;
      const remainingReasons = heatCapacitySceneDiscreteMotionRef.current.reasons;
      if (!settled || remainingReasons.length > 0) {
        abortHeatCapacityModeTransitionToVisibleFile(requestId);
        console.error('[Workbench] Heat-capacity mode transition watchdog could not settle scene motion.', {
          requestId,
          phase,
          remainingReasons,
        });
        return;
      }
      if (phase === 'animating') {
        finishHeatCapacityModeTransitionAnimation();
        return;
      }
      if (phase === 'waiting-for-motion') {
        const nextState = applyHeatCapacityModeTransitionEvent({
          type: 'source-motion-changed',
          sceneMotionReasons: [],
        });
        if (nextState.phase === 'preparing-target') {
          prepareHeatCapacityModeTarget(nextState.requestId);
        }
        return;
      }
      prepareHeatCapacityModeTarget(requestId);
    })().catch((error) => {
      if (
        desktopExitQuiescedRef.current ||
        heatCapacityRefreshRestorePendingRef.current ||
        heatCapacityRuntimeFailureFileIdRef.current !== null
      ) return;
      console.error('[Workbench] Heat-capacity mode transition watchdog failed.', error);
      abortHeatCapacityModeTransitionToVisibleFile(requestId);
    });
  };

  const requestHeatCapacityTeachingProgressReset = (onConfirm: () => void) => {
    requestPromptConfirmation({
      id: 'switch-heat-capacity-teaching-mode',
      tone: 'warning',
      ...workbenchPromptCopy.switchTeachingMode,
      closeLabel: workbenchPromptCopy.closeLabel,
      onConfirm,
    });
  };

  const handleHeatCapacitySceneDiscreteMotionChange = useCallback((
    motionState: HeatCapacitySceneDiscreteMotionState,
  ) => {
    heatCapacitySceneDiscreteMotionRef.current = motionState;
    if (heatCapacityRuntimeFailureFileIdRef.current !== null) return;
    if (heatCapacityRefreshRestorePendingRef.current) return;
    const transition = heatCapacityModeTransitionStateRef.current;
    if (transition.phase === 'waiting-for-motion') {
      const nextState = applyHeatCapacityModeTransitionEvent({
        type: 'source-motion-changed',
        sceneMotionReasons: motionState.reasons,
      });
      if (nextState.phase === 'preparing-target') {
        scheduleHeatCapacityModeTargetPreparationRef.current(nextState.requestId);
      }
    }
  }, []);

  const handleHeatCapacitySceneModeTransitionControllerChange = useCallback((
    controller: HeatCapacitySceneModeTransitionController | null,
  ) => {
    heatCapacitySceneModeTransitionControllerRef.current = controller;
  }, []);

  const modeTransitionCleanupEffect = { run: () => () => {
    if (heatCapacityModeTransitionPrepareFrameRef.current !== null) {
      window.cancelAnimationFrame(heatCapacityModeTransitionPrepareFrameRef.current);
    }
    if (heatCapacityModeTransitionVisualTimerRef.current !== null) {
      window.clearTimeout(heatCapacityModeTransitionVisualTimerRef.current);
    }
    pendingHeatCapacityGuideUiRestoreRef.current = null;
    const transition = heatCapacityModeTransitionStateRef.current;
    heatCapacitySceneModeTransitionControllerRef.current?.finish(transition.requestId);
  }, dependencies: [] } satisfies WorkbenchHeatEffect;

  const cancelHeatCapacityModeTransitionForNavigation = (visibleMode: HeatCapacityMode | null) => {
    if (heatCapacityModeTransitionPrepareFrameRef.current !== null) {
      window.cancelAnimationFrame(heatCapacityModeTransitionPrepareFrameRef.current);
      heatCapacityModeTransitionPrepareFrameRef.current = null;
    }
    if (heatCapacityModeTransitionVisualTimerRef.current !== null) {
      window.clearTimeout(heatCapacityModeTransitionVisualTimerRef.current);
      heatCapacityModeTransitionVisualTimerRef.current = null;
    }
    const transition = heatCapacityModeTransitionStateRef.current;
    heatCapacityModeTransitionPausedVisualClockRef.current = null;
    heatCapacitySceneModeTransitionControllerRef.current?.finish(transition.requestId);
    heatCapacitySceneDiscreteMotionRef.current = { active: false, reasons: [] };
    setHeatCapacityModeSceneRestoreRequest(null);
    applyHeatCapacityModeTransitionEvent({ type: 'synchronize', visibleMode });
  };

  const pauseHeatCapacityModeTransitionRuntime = () => {
    if (heatCapacityModeTransitionPrepareFrameRef.current !== null) {
      window.cancelAnimationFrame(heatCapacityModeTransitionPrepareFrameRef.current);
      heatCapacityModeTransitionPrepareFrameRef.current = null;
    }
    if (heatCapacityModeTransitionVisualTimerRef.current !== null) {
      window.clearTimeout(heatCapacityModeTransitionVisualTimerRef.current);
      heatCapacityModeTransitionVisualTimerRef.current = null;
    }
    const transition = heatCapacityModeTransitionStateRef.current;
    if (transition.phase === 'animating') {
      const pausedVisualClock = heatCapacityModeTransitionPausedVisualClockRef.current;
      if (pausedVisualClock?.requestId !== transition.requestId) {
        heatCapacityModeTransitionPausedVisualClockRef.current = {
          requestId: transition.requestId,
          remainingMs: getHeatCapacityModeTransitionVisualRemainingMs(transition),
        };
      }
    } else {
      heatCapacityModeTransitionPausedVisualClockRef.current = null;
    }
    heatCapacitySceneModeTransitionControllerRef.current?.pause(transition.requestId);
  };

  const resumeHeatCapacityModeTransitionRuntime = () => {
    if (
      desktopExitQuiescedRef.current ||
      heatCapacityRefreshRestorePendingRef.current ||
      heatCapacityRuntimeFailureFileIdRef.current !== null
    ) return;
    const transition = heatCapacityModeTransitionStateRef.current;
    if (transition.phase === 'idle') return;
    if (transition.phase === 'waiting-for-motion') {
      const nextState = applyHeatCapacityModeTransitionEvent({
        type: 'source-motion-changed',
        sceneMotionReasons: heatCapacitySceneDiscreteMotionRef.current.reasons,
      });
      if (nextState.phase === 'preparing-target') {
        scheduleHeatCapacityModeTargetPreparation(nextState.requestId);
      }
      return;
    }
    if (transition.phase === 'preparing-target') {
      heatCapacityModeTransitionPausedVisualClockRef.current = null;
      scheduleHeatCapacityModeTargetPreparation(transition.requestId);
      return;
    }
    const pausedVisualClock = heatCapacityModeTransitionPausedVisualClockRef.current;
    const remainingMs = pausedVisualClock?.requestId === transition.requestId
      ? pausedVisualClock.remainingMs
      : getHeatCapacityModeTransitionVisualRemainingMs(transition);
    heatCapacityModeTransitionPausedVisualClockRef.current = null;
    applyHeatCapacityModeTransitionEvent({
      type: 'animation-clock-rebased',
      requestId: transition.requestId,
      startedAtMs: Date.now(),
      durationMs: remainingMs,
    });
    heatCapacitySceneModeTransitionControllerRef.current?.resume(transition.requestId);
    heatCapacityModeTransitionVisualTimerRef.current = window.setTimeout(() => {
      heatCapacityModeTransitionVisualTimerRef.current = null;
      const currentTransition = heatCapacityModeTransitionStateRef.current;
      if (
        desktopExitQuiescedRef.current ||
        heatCapacityRefreshRestorePendingRef.current ||
        heatCapacityRuntimeFailureFileIdRef.current !== null ||
        currentTransition.phase !== 'animating' ||
        currentTransition.requestId !== transition.requestId
      ) return;
      finishHeatCapacityModeTransitionAnimation();
    }, remainingMs);
  };

  const suspendActiveHeatCapacityModeForNavigation = () => {
    const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    if (!currentFile || currentFile.kind !== 'heatCapacity') return false;
    const preservePendingRefresh = activeFileOwnsPendingHeatCapacityRefresh(currentFile);
    cancelHeatCapacityModeTransitionForNavigation(currentFile.heatCapacityMode);
    pendingHeatCapacityGuideUiRestoreRef.current = null;
    if (heatCapacityModeTransitionDemoClockRef.current?.fileId === currentFile.id) {
      heatCapacityModeTransitionDemoClockRef.current = null;
    }
    if (preservePendingRefresh) {
      cancelPendingHeatCapacityRefreshRestore();
    } else {
      captureHeatCapacityModeSceneMetadata(currentFile.id);
      const now = Date.now();
      const preparedFile = prepareHeatCapacityModeSessionForExit(currentFile, null, now);
      const exploreFile = enterHeatCapacityExploreModeWorkbenchState(
        preparedFile,
        createDefaultHeatCapacityFile(1),
        now,
      );
      commitHeatCapacityFileProjection(exploreFile);
    }
    releaseHeatCapacityRuntimeForFileExit(currentFile.id);
    return preservePendingRefresh;
  };

  const activateHeatCapacityFileModeSession = (fileId: string) => {
    const target = activateHeatCapacityFileMode(fileId);
    return target ? createWorkbenchActiveModeCheckpointOverride(
      target.file.id,
      target.file.heatCapacityMode,
      target.checkpoint,
    ) : undefined;
  };

  const exitHeatCapacityTeachingModeToExplore = (
    sourceMode: 'demo' | 'guide',
  ) => {
    exitHeatCapacityFormalModeToExplore(sourceMode);
  };

  const modeSessionProjectionEffect = { run: () => {
    if (heatCapacityRefreshRestorePendingRef.current) return;
    if (heatCapacityModeTransitionStateRef.current.phase !== 'idle') return;
    const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    if (!currentFile || currentFile.kind !== 'heatCapacity') return;
    if (
      currentFile.heatCapacityMode === 'demo' &&
      currentFile.heatCapacityTeachingStatus !== 'completed' &&
      autoDemoPhase === 'idle'
    ) {
      exitHeatCapacityFormalModeToExplore('demo');
      return;
    }
  }, dependencies: [
    activeFile.id,
    activeFile.kind,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityTeachingStatus : null,
    autoDemoPhase,
    heatCapacityModeTransitionState.phase,
  ] } satisfies WorkbenchHeatEffect;

  const modeRuntimeResumeEffect = { run: () => {
    if (desktopExitQuiescedRef.current) return undefined;
    if (heatCapacityRuntimeFailureFileIdRef.current !== null) return undefined;
    if (!initialHeatCapacityRefreshSession) return undefined;
    if (heatCapacityRefreshRestoring || heatCapacityRefreshRestorePendingRef.current) return undefined;
    if (heatCapacityModeTransitionRefreshResumedRef.current) return undefined;
    if (heatCapacitySceneReadyFileId !== initialHeatCapacityRefreshSession.activeHeatCapacityFileId) {
      return undefined;
    }

    let cancelled = false;
    let resumeFrameId: number | null = null;
    const resumePersistedTransition = () => {
      if (
        cancelled ||
        desktopExitQuiescedRef.current ||
        heatCapacityRuntimeFailureFileIdRef.current !== null ||
        heatCapacityModeTransitionRefreshResumedRef.current
      ) return;
      const transition = heatCapacityModeTransitionStateRef.current;
      if (
        transition.phase === 'animating' &&
        heatCapacitySceneModeTransitionControllerRef.current === null
      ) {
        resumeFrameId = window.requestAnimationFrame(resumePersistedTransition);
        return;
      }

      heatCapacityModeTransitionRefreshResumedRef.current = true;
      if (transition.phase === 'idle') return;
      if (transition.phase === 'waiting-for-motion') {
        const nextState = applyHeatCapacityModeTransitionEvent({
          type: 'source-motion-changed',
          sceneMotionReasons: heatCapacitySceneDiscreteMotionRef.current.reasons,
        });
        if (nextState.phase === 'preparing-target') {
          scheduleHeatCapacityModeTargetPreparationRef.current(nextState.requestId);
        }
        return;
      }
      if (transition.phase === 'preparing-target') {
        scheduleHeatCapacityModeTargetPreparationRef.current(transition.requestId);
        return;
      }

      heatCapacityModeTransitionPausedVisualClockRef.current = null;
      heatCapacitySceneModeTransitionControllerRef.current?.resume(transition.requestId);
      const remainingMs = Math.max(0, transition.visualDurationMs);
      if (heatCapacityModeTransitionVisualTimerRef.current !== null) {
        window.clearTimeout(heatCapacityModeTransitionVisualTimerRef.current);
      }
      heatCapacityModeTransitionVisualTimerRef.current = window.setTimeout(() => {
        heatCapacityModeTransitionVisualTimerRef.current = null;
        const currentTransition = heatCapacityModeTransitionStateRef.current;
        if (
          heatCapacityRuntimeFailureFileIdRef.current !== null ||
          currentTransition.phase !== 'animating' ||
          currentTransition.requestId !== transition.requestId
        ) return;
        finishHeatCapacityModeTransitionAnimation();
      }, remainingMs);
    };

    resumeFrameId = window.requestAnimationFrame(resumePersistedTransition);
    return () => {
      cancelled = true;
      if (resumeFrameId !== null) window.cancelAnimationFrame(resumeFrameId);
    };
  }, dependencies: [
    desktopExitQuiesced,
    heatCapacityRefreshRestoring,
    heatCapacitySceneReadyFileId,
    initialHeatCapacityRefreshSession,
  ] } satisfies WorkbenchHeatEffect;

  const handleHeatCapacityModeSegmentClick = (mode: HeatCapacityMode) => {
    if (activeFile.kind !== 'heatCapacity') return;
    const heatCapacityActiveMode = activeFile.heatCapacityMode;
    const tutorialMilestone = experienceProfile.learning.heatCapacity;
    const heatCapacityTutorialActive = tutorialActive && activeTutorialExperiment === 'heatCapacity';
    const heatCapacityTeachingCompleted = activeFile.heatCapacityTeachingStatus === 'completed';
      if (
        heatCapacityTutorialActive &&
        !isExperimentTutorialModeUnlocked(tutorialMilestone, mode)
      ) {
        setTutorialBlockedNoticeOpen(true);
        return;
      }
      if (heatCapacityModeTransitionStateRef.current.phase !== 'idle') {
        switchHeatCapacityMode(mode);
        return;
      }
      if (heatCapacityTeachingCompleted && heatCapacityActiveMode === mode) {
        showHeatCapacityTeachingCompletedLockedInteraction();
        return;
      }
      if (mode === 'free') {
        if (!activeHeatCapacityFreeBatchProgress?.configured) {
          const openFreeBatchSetup = () => {
            if (
              heatCapacityActiveMode !== null &&
              !exitHeatCapacityFormalModeToExplore(heatCapacityActiveMode)
            ) return;
            setHeatCapacityBatchSetupSelection(null);
            setHeatCapacityBatchSetupRequestedFileId(activeFile.id);
          };
          if (
            heatCapacityActiveMode !== null &&
            shouldConfirmHeatCapacityTeachingProgressReset(activeFile, 'free')
          ) {
            requestHeatCapacityTeachingProgressReset(openFreeBatchSetup);
            return;
          }
          openFreeBatchSetup();
        } else if (heatCapacityActiveMode === null) {
          if (activeHeatCapacityFreeBatchProgress.configured) {
            activateHeatCapacityModeFromExplore('free');
          }
        } else if (heatCapacityActiveMode !== 'free' || autoDemoInteractionLocked) {
          switchHeatCapacityMode('free', 'mode-control');
        }
        return;
      }
      if (heatCapacityActiveMode === null) {
        activateHeatCapacityModeFromExplore(mode);
        return;
      }
      if (heatCapacityActiveMode !== mode) {
        switchHeatCapacityMode(mode, 'mode-control');
      }
    };
  return {
    effects: { modeTransitionCleanup: modeTransitionCleanupEffect, modeSessionProjection: modeSessionProjectionEffect, modeRuntimeResume: modeRuntimeResumeEffect }, applyHeatCapacityModeTransitionEvent, activateHeatCapacityModeFromExplore, exitHeatCapacityFormalModeToExplore, switchHeatCapacityMode, captureHeatCapacityModeSceneMetadata, handleHeatCapacitySceneDiscreteMotionChange, handleHeatCapacitySceneModeTransitionControllerChange, pauseHeatCapacityModeTransitionRuntime, resumeHeatCapacityModeTransitionRuntime, suspendActiveHeatCapacityModeForNavigation, activateHeatCapacityFileModeSession, exitHeatCapacityTeachingModeToExplore, handleHeatCapacityModeSegmentClick };
};
