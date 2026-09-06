import type { useWorkbenchDesktopExitState } from './useWorkbenchDesktopExitState.ts';
import type { useWorkbenchWorkspaceCollectionState } from './useWorkbenchWorkspaceCollectionState.ts';
import type { useWorkbenchHeatCapacityController } from './useWorkbenchHeatCapacityController.ts';
import type { useWorkbenchHardSphereRuntimeResources } from './useWorkbenchHardSphereRuntimeResources.ts';
import type { createWorkbenchHardSphereRuntimeRegistry } from './workbenchHardSphereRuntimeRegistry.ts';
import type { useWorkbenchInitialWorkspace } from './useWorkbenchInitialWorkspace.ts';
import type { createWorkbenchHardSphereFrameLoop } from './workbenchHardSphereFrameLoop.ts';
import type { useWorkbenchWorkspacePersistenceResources } from './useWorkbenchWorkspacePersistenceResources.ts';
import { captureHeatCapacityModeTransitionDemoClock } from '../heatCapacity/heatCapacityModeTransitionDemoClock.ts';
export interface WorkbenchDesktopExitQuiescencePorts {
  desktopExitQuiescedRef: ReturnType<typeof useWorkbenchDesktopExitState>['desktopExitQuiescedRef'];
  desktopExitInputBlockedRef: ReturnType<typeof useWorkbenchDesktopExitState>['desktopExitInputBlockedRef'];
  setDesktopExitInputBlocked: ReturnType<typeof useWorkbenchDesktopExitState>['setDesktopExitInputBlocked'];
  filesRef: ReturnType<typeof useWorkbenchWorkspaceCollectionState>['filesRef'];
  activeFileIdRef: ReturnType<typeof useWorkbenchWorkspaceCollectionState>['activeFileIdRef'];
  heatCapacityModeTransitionDemoClockRef: ReturnType<typeof useWorkbenchHeatCapacityController>['lifecycle']['heatCapacityModeTransitionDemoClockRef'];
  desktopExitAutoDemoClockRef: ReturnType<typeof useWorkbenchDesktopExitState>['desktopExitAutoDemoClockRef'];
  autoDemoPhaseRef: ReturnType<typeof useWorkbenchHeatCapacityController>['lifecycle']['autoDemoPhaseRef'];
  heatCapacityAutoDemoStartedAtMsRef: ReturnType<typeof useWorkbenchHeatCapacityController>['bindings']['demo']['heatCapacityAutoDemoStartedAtMsRef'];
  pauseHeatCapacityModeTransitionRuntime: ReturnType<typeof useWorkbenchHeatCapacityController>['lifecycle']['pauseHeatCapacityModeTransitionRuntime'];
  desktopExitQuiescedAtMsRef: ReturnType<typeof useWorkbenchDesktopExitState>['desktopExitQuiescedAtMsRef'];
  setDesktopExitQuiesced: ReturnType<typeof useWorkbenchDesktopExitState>['setDesktopExitQuiesced'];
  standardRuntimeRef: ReturnType<typeof useWorkbenchHardSphereRuntimeResources>['standardRuntimeRef'];
  cancelRuntimeFrame: ReturnType<typeof createWorkbenchHardSphereRuntimeRegistry>['cancelRuntimeFrame'];
  idealRuntimeRef: ReturnType<typeof useWorkbenchHardSphereRuntimeResources>['idealRuntimeRef'];
  clearHeatCapacityAutoDemoTimers: ReturnType<typeof useWorkbenchHeatCapacityController>['lifecycle']['clearHeatCapacityAutoDemoTimers'];
  pauseHeatCapacityTransientUiTimers: ReturnType<typeof useWorkbenchHeatCapacityController>['lifecycle']['pauseHeatCapacityTransientUiTimers'];
  pauseHeatCapacityPressureAlertTimers: ReturnType<typeof useWorkbenchHeatCapacityController>['lifecycle']['pauseHeatCapacityPressureAlertTimers'];
  pauseGuideHeatCapacityReminderTimers: ReturnType<typeof useWorkbenchHeatCapacityController>['lifecycle']['pauseGuideHeatCapacityReminderTimers'];
  pauseHeatCapacityPumpAnimation: ReturnType<typeof useWorkbenchHeatCapacityController>['lifecycle']['pauseHeatCapacityPumpAnimation'];
  desktopExitPausedPressureAlarmRef: ReturnType<typeof useWorkbenchHeatCapacityController>['lifecycle']['desktopExitPausedPressureAlarmRef'];
  desktopExitPausedClosePumpValveReminderRef: ReturnType<typeof useWorkbenchHeatCapacityController>['lifecycle']['desktopExitPausedClosePumpValveReminderRef'];
  heatCapacityRefreshRestorePendingRef: ReturnType<typeof useWorkbenchHeatCapacityController>['lifecycle']['heatCapacityRefreshRestorePendingRef'];
  initialHeatCapacityRefreshSession: ReturnType<typeof useWorkbenchInitialWorkspace>['initialHeatCapacityRefreshSession'];
  rebaseHeatCapacityFileForAutomaticSuspension: ReturnType<typeof useWorkbenchHeatCapacityController>['lifecycle']['rebaseHeatCapacityFileForAutomaticSuspension'];
  setFiles: ReturnType<typeof useWorkbenchWorkspaceCollectionState>['setFiles'];
  heatCapacityRuntimeFailureFileIdRef: ReturnType<typeof useWorkbenchHeatCapacityController>['lifecycle']['heatCapacityRuntimeFailureFileIdRef'];
  heatCapacityPressureAlarmVisibleRef: ReturnType<typeof useWorkbenchHeatCapacityController>['lifecycle']['heatCapacityPressureAlarmVisibleRef'];
  scheduleHeatCapacityPressureAlarmExpiry: ReturnType<typeof useWorkbenchHeatCapacityController>['lifecycle']['scheduleHeatCapacityPressureAlarmExpiry'];
  scheduleHeatCapacityClosePumpValveReminder: ReturnType<typeof useWorkbenchHeatCapacityController>['lifecycle']['scheduleHeatCapacityClosePumpValveReminder'];
  resumeHeatCapacityPumpAnimation: ReturnType<typeof useWorkbenchHeatCapacityController>['lifecycle']['resumeHeatCapacityPumpAnimation'];
  resumeHeatCapacityTransientUiTimers: ReturnType<typeof useWorkbenchHeatCapacityController>['lifecycle']['resumeHeatCapacityTransientUiTimers'];
  heatCapacityModeTransitionStateRef: ReturnType<typeof useWorkbenchHeatCapacityController>['lifecycle']['heatCapacityModeTransitionStateRef'];
  scheduleHeatCapacityAutoDemoTimeline: ReturnType<typeof useWorkbenchHeatCapacityController>['lifecycle']['scheduleHeatCapacityAutoDemoTimeline'];
  heatCapacityAutoDemoTimelineRef: ReturnType<typeof useWorkbenchHeatCapacityController>['bindings']['demo']['heatCapacityAutoDemoTimelineRef'];
  resumeHeatCapacityModeTransitionRuntime: ReturnType<typeof useWorkbenchHeatCapacityController>['lifecycle']['resumeHeatCapacityModeTransitionRuntime'];
  heatCapacitySceneReadyFileIdRef: ReturnType<typeof useWorkbenchHeatCapacityController>['lifecycle']['heatCapacitySceneReadyFileIdRef'];
  recoverHeatCapacityRuntimeIfReadyRef: ReturnType<typeof useWorkbenchHeatCapacityController>['lifecycle']['recoverHeatCapacityRuntimeIfReadyRef'];
  scheduleStandardFrame: ReturnType<typeof createWorkbenchHardSphereFrameLoop>['scheduleStandardFrame'];
  scheduleIdealFrame: ReturnType<typeof createWorkbenchHardSphereFrameLoop>['scheduleIdealFrame'];
  scheduleWorkspacePersistenceRef: ReturnType<typeof useWorkbenchWorkspacePersistenceResources>['scheduleWorkspacePersistenceRef'];
  performance: Pick<Performance, 'now'>;
  Date: Pick<DateConstructor, 'now'>;
}
export const createWorkbenchDesktopExitQuiescence = (ports: WorkbenchDesktopExitQuiescencePorts) => {
 const { desktopExitQuiescedRef, desktopExitInputBlockedRef, setDesktopExitInputBlocked, filesRef, activeFileIdRef, heatCapacityModeTransitionDemoClockRef, desktopExitAutoDemoClockRef, autoDemoPhaseRef, heatCapacityAutoDemoStartedAtMsRef, pauseHeatCapacityModeTransitionRuntime, desktopExitQuiescedAtMsRef, setDesktopExitQuiesced, standardRuntimeRef, cancelRuntimeFrame, idealRuntimeRef, clearHeatCapacityAutoDemoTimers, pauseHeatCapacityTransientUiTimers, pauseHeatCapacityPressureAlertTimers, pauseGuideHeatCapacityReminderTimers, pauseHeatCapacityPumpAnimation, desktopExitPausedPressureAlarmRef, desktopExitPausedClosePumpValveReminderRef, heatCapacityRefreshRestorePendingRef, initialHeatCapacityRefreshSession, rebaseHeatCapacityFileForAutomaticSuspension, setFiles, heatCapacityRuntimeFailureFileIdRef, heatCapacityPressureAlarmVisibleRef, scheduleHeatCapacityPressureAlarmExpiry, scheduleHeatCapacityClosePumpValveReminder, resumeHeatCapacityPumpAnimation, resumeHeatCapacityTransientUiTimers, heatCapacityModeTransitionStateRef, scheduleHeatCapacityAutoDemoTimeline, heatCapacityAutoDemoTimelineRef, resumeHeatCapacityModeTransitionRuntime, heatCapacitySceneReadyFileIdRef, recoverHeatCapacityRuntimeIfReadyRef, scheduleStandardFrame, scheduleIdealFrame, scheduleWorkspacePersistenceRef, performance, Date } = ports;
 const prepareDesktopExitQuiescence = (blockInput = true) => {
    if (desktopExitQuiescedRef.current) {
      if (blockInput && !desktopExitInputBlockedRef.current) {
        desktopExitInputBlockedRef.current = true;
        setDesktopExitInputBlocked(true);
      }
      return;
    }
    desktopExitInputBlockedRef.current = blockInput;
    setDesktopExitInputBlocked(blockInput);
    const activeFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    if (activeFile?.kind === 'heatCapacity') {
      const existingDemoClock = heatCapacityModeTransitionDemoClockRef.current?.fileId === activeFile.id
        ? heatCapacityModeTransitionDemoClockRef.current
        : null;
      desktopExitAutoDemoClockRef.current = autoDemoPhaseRef.current === 'running'
        ? existingDemoClock ?? captureHeatCapacityModeTransitionDemoClock({
            fileId: activeFile.id,
            nowMs: performance.now(),
            timelineStartedAtMs: heatCapacityAutoDemoStartedAtMsRef.current,
          })
        : null;
      heatCapacityModeTransitionDemoClockRef.current = null;
      pauseHeatCapacityModeTransitionRuntime();
    } else {
      desktopExitAutoDemoClockRef.current = null;
    }

    desktopExitQuiescedAtMsRef.current = Date.now();
    desktopExitQuiescedRef.current = true;
    setDesktopExitQuiesced(true);
    Object.keys(standardRuntimeRef.current).forEach(cancelRuntimeFrame);
    Object.keys(idealRuntimeRef.current).forEach(cancelRuntimeFrame);
    clearHeatCapacityAutoDemoTimers();
    if (activeFile?.kind === 'heatCapacity') {
      pauseHeatCapacityTransientUiTimers(activeFile.id);
      pauseHeatCapacityPressureAlertTimers(activeFile.id);
      if (activeFile.heatCapacityMode === 'guide') {
        pauseGuideHeatCapacityReminderTimers(activeFile.id);
      }
      pauseHeatCapacityPumpAnimation(activeFile.id);
    }
  };
  const resumeDesktopExitQuiescence = () => {
    if (!desktopExitQuiescedRef.current) return;
    const pausedPressureAlarm = desktopExitPausedPressureAlarmRef.current;
    const pausedClosePumpValveReminder = desktopExitPausedClosePumpValveReminderRef.current;
    const refreshRestoreOwnedFileId = heatCapacityRefreshRestorePendingRef.current
      ? initialHeatCapacityRefreshSession?.activeHeatCapacityFileId ?? null
      : null;
    const resumedAtMs = Date.now();
    const quiescedAtMs = desktopExitQuiescedAtMsRef.current ?? resumedAtMs;
    desktopExitQuiescedAtMsRef.current = null;
    desktopExitQuiescedRef.current = false;
    desktopExitInputBlockedRef.current = false;
    setDesktopExitInputBlocked(false);
    setDesktopExitQuiesced(false);

    const rebasedFiles = filesRef.current.map((file) => (
      file.kind === 'heatCapacity' &&
      file.id !== refreshRestoreOwnedFileId
      ? rebaseHeatCapacityFileForAutomaticSuspension(file, quiescedAtMs, resumedAtMs)
      : file
    ));
    filesRef.current = rebasedFiles;
    setFiles(rebasedFiles);

    const activeFile = rebasedFiles.find((file) => file.id === activeFileIdRef.current);
    const refreshRestoreOwnsActiveFile = activeFile?.id === refreshRestoreOwnedFileId;
    if (activeFile?.kind === 'heatCapacity' && !refreshRestoreOwnsActiveFile) {
      if (heatCapacityRuntimeFailureFileIdRef.current === null) {
        if (
          pausedPressureAlarm?.fileId === activeFile.id &&
          heatCapacityPressureAlarmVisibleRef.current
        ) {
          scheduleHeatCapacityPressureAlarmExpiry(
            activeFile.id,
            pausedPressureAlarm.remainingMs,
          );
        } else if (pausedClosePumpValveReminder?.fileId === activeFile.id) {
          scheduleHeatCapacityClosePumpValveReminder(
            activeFile.id,
            pausedClosePumpValveReminder.remainingMs,
          );
        }
        resumeHeatCapacityPumpAnimation(activeFile.id);
        resumeHeatCapacityTransientUiTimers(activeFile.id);
      }
      const demoClock = desktopExitAutoDemoClockRef.current;
      if (
        heatCapacityRuntimeFailureFileIdRef.current === null &&
        demoClock?.fileId === activeFile.id &&
        activeFile.heatCapacityMode === 'demo' &&
        autoDemoPhaseRef.current === 'running'
      ) {
        if (heatCapacityModeTransitionStateRef.current.phase !== 'idle') {
          heatCapacityModeTransitionDemoClockRef.current = demoClock;
        } else {
          scheduleHeatCapacityAutoDemoTimeline(
            activeFile.id,
            heatCapacityAutoDemoTimelineRef.current,
            demoClock.elapsedMs,
            demoClock.initialDelayRemainingMs,
          );
        }
      }
    }
    if (
      !refreshRestoreOwnsActiveFile &&
      heatCapacityRuntimeFailureFileIdRef.current === null
    ) {
      desktopExitPausedPressureAlarmRef.current = null;
      desktopExitPausedClosePumpValveReminderRef.current = null;
    }
    desktopExitAutoDemoClockRef.current = null;
    resumeHeatCapacityModeTransitionRuntime();
    const pendingRuntimeRecoveryFileId = heatCapacityRuntimeFailureFileIdRef.current;
    if (
      pendingRuntimeRecoveryFileId !== null &&
      heatCapacitySceneReadyFileIdRef.current === pendingRuntimeRecoveryFileId
    ) {
      recoverHeatCapacityRuntimeIfReadyRef.current(pendingRuntimeRecoveryFileId);
    }

    rebasedFiles.forEach((file) => {
      if (file.runState !== 'running') return;
      if (file.kind === 'standard') scheduleStandardFrame(file.id);
      if (file.kind === 'ideal') scheduleIdealFrame(file.id);
    });
    scheduleWorkspacePersistenceRef.current();
  };
 return { prepareDesktopExitQuiescence, resumeDesktopExitQuiescence };
};
