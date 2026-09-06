import type { WorkbenchHeatEffect } from './workbenchHeatEffect.ts';
import React from 'react';

import { refreshHeatCapacityPumpFrequency } from './workbenchHeatCapacityRuntimeCoordinator.ts';
import type { HeatCapacityMode } from './workbenchHeatCapacityStateTypes.ts';

import { projectWorkbenchRunStateForRuntimeFailure } from './workbenchRuntimePersistence.ts';

import { hasSameHeatCapacityRuntimeRecoveryState, rebaseHeatCapacityFileAfterSuspendedWallClock } from './workbenchHeatCapacityTimeRebase.ts';

export interface useWorkbenchHeatRuntimeRecoveryPorts {
  scene: {
    heatCapacityRuntimeFailureFileIdRef: React.MutableRefObject<string | null>;
    heatCapacityRefreshRestorePendingRef: React.MutableRefObject<boolean>;
    setHeatCapacityRuntimeFailureFileId: React.Dispatch<React.SetStateAction<string | null>>;
    heatCapacitySceneReadyFileIdRef: React.MutableRefObject<string | null>;
    setHeatCapacitySceneReadyFileId: React.Dispatch<React.SetStateAction<string | null>>;
    heatCapacityRuntimeRecoveryIntentRef: React.MutableRefObject<{ fileId: string; expectedFile: import("./workbenchHeatCapacityStateTypes.ts").WorkbenchHeatCapacityState | null; suspendedAtMs: number; projectedRunState: import("./workbenchFileState.ts").WorkbenchRunState; resumeGuideRunState: boolean; pauseDemoOnRecovery: boolean; } | null>;
    recoverHeatCapacityRuntimeIfReadyRef: React.MutableRefObject<(fileId: string) => void>;
    heatCapacityRefreshRestoring: boolean;
    heatCapacitySceneReadyFileId: string | null;
  };
  workspace: {
    filesRef: React.MutableRefObject<import("./workbenchFileUnion.ts").WorkbenchFileState[]>;
    setFiles: React.Dispatch<React.SetStateAction<import("./workbenchFileUnion.ts").WorkbenchFileState[]>>;
    activeFileIdRef: React.MutableRefObject<string>;
  };
  lifecycle: {
    desktopExitQuiescedRef: React.MutableRefObject<boolean>;
    desktopExitQuiesced: boolean;
  };
  mode: {
    pauseHeatCapacityModeTransitionRuntime: () => void;
    resumeHeatCapacityModeTransitionRuntime: () => void;
  };
  feedback: {
    pauseHeatCapacityPressureAlertTimers: (fileId: string) => void;
    desktopExitPausedPressureAlarmRef: React.MutableRefObject<{ fileId: string; remainingMs: number; } | null>;
    desktopExitPausedClosePumpValveReminderRef: React.MutableRefObject<{ fileId: string; remainingMs: number; } | null>;
    heatCapacityPressureAlarmVisibleRef: React.MutableRefObject<boolean>;
    scheduleHeatCapacityPressureAlarmExpiry: (fileId: string, delayMs: number) => void;
    scheduleHeatCapacityClosePumpValveReminder: (fileId: string, delayMs: number) => void;
  };
  runtimeLifecycle: {
    pauseHeatCapacityTransientUiTimers: (fileId: string) => void;
    resumeHeatCapacityTransientUiTimers: (fileId: string) => void;
  };
  guide: {
    clearHeatCapacityGuideStartTimer: () => void;
    pauseGuideHeatCapacityReminderTimers: (fileId: string) => void;
    clearGuideHeatCapacityGuidancePulseTimer: () => void;
  };
  pump: {
    pauseHeatCapacityPumpAnimation: (fileId: string) => void;
    clearHeatCapacityPumpAnimationTimers: () => void;
  };
  demoRuntime: {
    freezeHeatCapacityAutoDemoForRuntimeFailure: (fileId: string, failureProjectionDeferred: boolean) => boolean;
    clearHeatCapacityAutoDemoTimers: () => void;
  };
  ui: {
    pushLog: (message: import("./workbenchConsoleLocalization.ts").WorkbenchConsoleMessageInput, kind?: import("./workbenchConsolePresentation.ts").LogKind) => void;
  };
  demoState: {
    heatCapacityModeTransitionDemoClockRef: React.MutableRefObject<import("./../heatCapacity/heatCapacityModeTransitionDemoClock.ts").HeatCapacityModeTransitionDemoClock | null>;
    heatCapacityAutoDemoPausedFileIdRef: React.MutableRefObject<string | null>;
    autoDemoPhaseRef: React.MutableRefObject<import("./../heatCapacity/heatCapacityModeControlModel.ts").HeatCapacityAutoDemoPhase>;
    setAutoDemoPhase: React.Dispatch<React.SetStateAction<import("./../heatCapacity/heatCapacityModeControlModel.ts").HeatCapacityAutoDemoPhase>>;
  };
}

export const useWorkbenchHeatRuntimeRecovery = (ports: useWorkbenchHeatRuntimeRecoveryPorts) => {
  const { heatCapacityRuntimeFailureFileIdRef, heatCapacityRefreshRestorePendingRef, setHeatCapacityRuntimeFailureFileId, heatCapacitySceneReadyFileIdRef, setHeatCapacitySceneReadyFileId, heatCapacityRuntimeRecoveryIntentRef, recoverHeatCapacityRuntimeIfReadyRef, heatCapacityRefreshRestoring, heatCapacitySceneReadyFileId } = ports.scene;
  const { filesRef, setFiles, activeFileIdRef } = ports.workspace;
  const { desktopExitQuiescedRef, desktopExitQuiesced } = ports.lifecycle;
  const { pauseHeatCapacityModeTransitionRuntime, resumeHeatCapacityModeTransitionRuntime } = ports.mode;
  const { pauseHeatCapacityPressureAlertTimers, desktopExitPausedPressureAlarmRef, desktopExitPausedClosePumpValveReminderRef, heatCapacityPressureAlarmVisibleRef, scheduleHeatCapacityPressureAlarmExpiry, scheduleHeatCapacityClosePumpValveReminder } = ports.feedback;
  const { pauseHeatCapacityTransientUiTimers, resumeHeatCapacityTransientUiTimers } = ports.runtimeLifecycle;
  const { clearHeatCapacityGuideStartTimer, pauseGuideHeatCapacityReminderTimers, clearGuideHeatCapacityGuidancePulseTimer } = ports.guide;
  const { pauseHeatCapacityPumpAnimation, clearHeatCapacityPumpAnimationTimers } = ports.pump;
  const { freezeHeatCapacityAutoDemoForRuntimeFailure, clearHeatCapacityAutoDemoTimers } = ports.demoRuntime;
  const { pushLog } = ports.ui;
  const { heatCapacityModeTransitionDemoClockRef, heatCapacityAutoDemoPausedFileIdRef, autoDemoPhaseRef, setAutoDemoPhase } = ports.demoState;
  const handleHeatCapacitySceneRuntimeFailure = (fileId: string, error: unknown) => {
    if (heatCapacityRuntimeFailureFileIdRef.current === fileId) return;
    const failedFile = filesRef.current.find((file) => file.id === fileId);
    const failureObservedAt = Date.now();
    const failureProjectionDeferred = desktopExitQuiescedRef.current ||
      heatCapacityRefreshRestorePendingRef.current;
    const failureUpdatedAt = failureProjectionDeferred && failedFile?.kind === 'heatCapacity'
      ? failedFile.updatedAt
      : failureObservedAt;
    heatCapacityRuntimeFailureFileIdRef.current = fileId;
    setHeatCapacityRuntimeFailureFileId(fileId);
    pauseHeatCapacityModeTransitionRuntime();
    pauseHeatCapacityPressureAlertTimers(fileId);
    pauseHeatCapacityTransientUiTimers(fileId);
    heatCapacitySceneReadyFileIdRef.current = null;
    setHeatCapacitySceneReadyFileId((current) => current === fileId ? null : current);
    clearHeatCapacityGuideStartTimer();
    if (failedFile?.kind === 'heatCapacity' && failedFile.heatCapacityMode === 'guide') {
      pauseGuideHeatCapacityReminderTimers(fileId);
    } else {
      clearGuideHeatCapacityGuidancePulseTimer();
    }
    if (failureProjectionDeferred) {
      pauseHeatCapacityPumpAnimation(fileId);
    } else {
      clearHeatCapacityPumpAnimationTimers();
    }
    const pauseDemoOnRecovery = freezeHeatCapacityAutoDemoForRuntimeFailure(
      fileId,
      failureProjectionDeferred,
    );
    const resumeGuideRunState = Boolean(
      failedFile?.kind === 'heatCapacity' &&
      failedFile.heatCapacityMode === 'guide' &&
      failedFile.runState === 'running',
    );
    const projectedRunState = failedFile?.kind === 'heatCapacity'
      ? projectWorkbenchRunStateForRuntimeFailure(failedFile.runState)
      : 'paused';
    let expectedRecoveryFile = failedFile?.kind === 'heatCapacity' ? failedFile : null;
    if (!failureProjectionDeferred) {
      const failedFiles = filesRef.current.map((file) => file.id === fileId && file.kind === 'heatCapacity'
        ? refreshHeatCapacityPumpFrequency({
            ...file,
            runState: projectedRunState,
            pumpBulbState: 'idle',
            updatedAt: failureUpdatedAt,
          }, failureObservedAt)
        : file);
      filesRef.current = failedFiles;
      setFiles(failedFiles);
      const projectedFailureFile = failedFiles.find((file) => file.id === fileId);
      expectedRecoveryFile = projectedFailureFile?.kind === 'heatCapacity'
        ? projectedFailureFile
        : null;
    }
    heatCapacityRuntimeRecoveryIntentRef.current = {
      fileId,
      expectedFile: expectedRecoveryFile,
      suspendedAtMs: failureObservedAt,
      projectedRunState,
      resumeGuideRunState,
      pauseDemoOnRecovery,
    };
    if (!desktopExitQuiescedRef.current) {
      pushLog((language) => {
        const name = failedFile?.name ?? fileId;
        if (language === 'zh-TW') return `${name}：3D 執行階段發生錯誤，計時、音訊與模擬已暫停。`;
        if (language === 'en') return `${name}: A 3D runtime error paused timing, audio, and simulation.`;
        return `${name}：3D 运行时发生错误，计时、音频和模拟已暂停。`;
      }, 'error');
    }
    console.error('[Workbench] Heat-capacity scene runtime failed.', error);
  };

  const handleHeatCapacitySceneRuntimeRecovered = (fileId: string) => {
    if (
      heatCapacityRuntimeFailureFileIdRef.current !== fileId ||
      desktopExitQuiescedRef.current ||
      heatCapacityRefreshRestorePendingRef.current
    ) return;
    const pausedPressureAlarm = desktopExitPausedPressureAlarmRef.current?.fileId === fileId
      ? desktopExitPausedPressureAlarmRef.current
      : null;
    const pausedClosePumpValveReminder =
      desktopExitPausedClosePumpValveReminderRef.current?.fileId === fileId
        ? desktopExitPausedClosePumpValveReminderRef.current
        : null;
    const recoveryIntent = heatCapacityRuntimeRecoveryIntentRef.current;
    let recoveryApplied = false;
    let recoveredMode: HeatCapacityMode | null = null;
    if (
      recoveryIntent?.fileId === fileId &&
      activeFileIdRef.current === fileId
    ) {
      const currentFile = filesRef.current.find((file) => file.id === fileId);
      if (currentFile?.kind === 'heatCapacity') {
        const recoveredAt = Date.now();
        const recoveryStateMatches = recoveryIntent.expectedFile !== null &&
          hasSameHeatCapacityRuntimeRecoveryState(currentFile, recoveryIntent.expectedFile);
        const recoveryRebaseStartMs = recoveryStateMatches
          ? recoveryIntent.suspendedAtMs
          : Math.max(
              recoveryIntent.suspendedAtMs,
              Math.min(recoveredAt, currentFile.updatedAt),
            );
        const recoveredFiles = filesRef.current.map((file) => {
          if (
            file.id !== fileId ||
            file.kind !== 'heatCapacity'
          ) return file;
          const rebasedFile = rebaseHeatCapacityFileAfterSuspendedWallClock(
            file,
            recoveryRebaseStartMs,
            recoveredAt,
          );
          const recoveredRunState = recoveryStateMatches
            ? recoveryIntent.projectedRunState
            : projectWorkbenchRunStateForRuntimeFailure(file.runState);
          const recoveredFile = refreshHeatCapacityPumpFrequency({
            ...rebasedFile,
            runState: recoveredRunState,
            pumpBulbState: 'idle' as const,
            updatedAt: recoveredAt,
          }, recoveredAt);
          return recoveryStateMatches &&
            recoveryIntent.resumeGuideRunState &&
            recoveredFile.heatCapacityMode === 'guide'
            ? {
                ...recoveredFile,
                runState: 'running' as const,
                lastUpdateMs: recoveredAt,
                displayResponseLastUpdateMs: recoveredAt,
              }
            : recoveredFile;
        });
        filesRef.current = recoveredFiles;
        setFiles(recoveredFiles);
        recoveryApplied = true;
        recoveredMode = currentFile.heatCapacityMode;
      }
    }
    if (
      recoveryApplied &&
      recoveredMode === 'demo' &&
      recoveryIntent?.pauseDemoOnRecovery
    ) {
      clearHeatCapacityAutoDemoTimers();
      heatCapacityModeTransitionDemoClockRef.current = null;
      heatCapacityAutoDemoPausedFileIdRef.current = fileId;
      autoDemoPhaseRef.current = 'paused';
      setAutoDemoPhase('paused');
    }
    if (recoveryApplied) {
      clearHeatCapacityPumpAnimationTimers();
    }
    heatCapacityRuntimeRecoveryIntentRef.current = null;
    heatCapacityRuntimeFailureFileIdRef.current = null;
    setHeatCapacityRuntimeFailureFileId((current) => current === fileId ? null : current);
    if (
      !desktopExitQuiescedRef.current &&
      !heatCapacityRefreshRestorePendingRef.current &&
      activeFileIdRef.current === fileId
    ) {
      if (pausedPressureAlarm && heatCapacityPressureAlarmVisibleRef.current) {
        desktopExitPausedClosePumpValveReminderRef.current = null;
        scheduleHeatCapacityPressureAlarmExpiry(fileId, pausedPressureAlarm.remainingMs);
      } else if (pausedClosePumpValveReminder) {
        desktopExitPausedPressureAlarmRef.current = null;
        scheduleHeatCapacityClosePumpValveReminder(fileId, pausedClosePumpValveReminder.remainingMs);
      } else {
        desktopExitPausedPressureAlarmRef.current = null;
        desktopExitPausedClosePumpValveReminderRef.current = null;
      }
    }
    resumeHeatCapacityModeTransitionRuntime();
    resumeHeatCapacityTransientUiTimers(fileId);
  };

  recoverHeatCapacityRuntimeIfReadyRef.current = handleHeatCapacitySceneRuntimeRecovered;

  const handleHeatCapacitySceneReady = (fileId: string) => {
    heatCapacitySceneReadyFileIdRef.current = fileId;
    setHeatCapacitySceneReadyFileId(fileId);
    handleHeatCapacitySceneRuntimeRecovered(fileId);
  };

  const runtimeRecoveryEffect = { run: () => {
    if (
      desktopExitQuiesced ||
      heatCapacityRefreshRestoring ||
      heatCapacityRefreshRestorePendingRef.current
    ) return;
    const pendingRuntimeRecoveryFileId = heatCapacityRuntimeFailureFileIdRef.current;
    if (
      pendingRuntimeRecoveryFileId !== null &&
      heatCapacitySceneReadyFileIdRef.current === pendingRuntimeRecoveryFileId
    ) {
      recoverHeatCapacityRuntimeIfReadyRef.current(pendingRuntimeRecoveryFileId);
    }
  }, dependencies: [desktopExitQuiesced, heatCapacityRefreshRestoring, heatCapacitySceneReadyFileId] } satisfies WorkbenchHeatEffect;
  return {
    effects: { runtimeRecovery: runtimeRecoveryEffect }, handleHeatCapacitySceneRuntimeFailure, handleHeatCapacitySceneReady };
};
