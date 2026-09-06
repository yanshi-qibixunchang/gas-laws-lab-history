import type { WorkbenchHeatEffect } from './workbenchHeatEffect.ts';
import React, { useRef, useState } from 'react';

import { refreshHeatCapacityPumpFrequency } from './workbenchHeatCapacityRuntimeCoordinator.ts';

export interface useWorkbenchHeatPumpAnimationPorts {
  desktopExitQuiescedRef: React.MutableRefObject<boolean>;
  heatCapacityRefreshRestorePendingRef: React.MutableRefObject<boolean>;
  heatCapacityRuntimeFailureFileIdRef: React.MutableRefObject<string | null>;
  activeFileIdRef: React.MutableRefObject<string>;
  updateFileById: (fileId: string, updater: (file: import("./workbenchFileUnion.ts").WorkbenchFileState) => import("./workbenchFileUnion.ts").WorkbenchFileState) => void;
  activeFile: import("./workbenchFileUnion.ts").WorkbenchFileState;
  heatCapacityRefreshRestoring: boolean;
  heatCapacityLessonDialogActive: boolean;
  autoDemoPaused: boolean;
}

export const useWorkbenchHeatPumpAnimation = (ports: useWorkbenchHeatPumpAnimationPorts) => {
  const { desktopExitQuiescedRef, heatCapacityRefreshRestorePendingRef, heatCapacityRuntimeFailureFileIdRef, activeFileIdRef, updateFileById, activeFile, heatCapacityRefreshRestoring, heatCapacityLessonDialogActive, autoDemoPaused } = ports;
  const heatCapacityPumpAnimationRef = useRef<{
    fileId: string | null;
    releaseTimerId: number | null;
    idleTimerId: number | null;
    releaseDeadlineAtMs: number | null;
    idleDeadlineAtMs: number | null;
    pausedReleaseRemainingMs: number | null;
    pausedIdleRemainingMs: number | null;
  }>({
    fileId: null,
    releaseTimerId: null,
    idleTimerId: null,
    releaseDeadlineAtMs: null,
    idleDeadlineAtMs: null,
    pausedReleaseRemainingMs: null,
    pausedIdleRemainingMs: null,
  });

  const [heatCapacityPumpPulseId, setHeatCapacityPumpPulseId] = useState(0);

  const clearHeatCapacityPumpAnimationTimers = () => {
    const animationTimers = heatCapacityPumpAnimationRef.current;
    if (animationTimers.releaseTimerId !== null) {
      window.clearTimeout(animationTimers.releaseTimerId);
      animationTimers.releaseTimerId = null;
    }
    if (animationTimers.idleTimerId !== null) {
      window.clearTimeout(animationTimers.idleTimerId);
      animationTimers.idleTimerId = null;
    }
    animationTimers.fileId = null;
    animationTimers.releaseDeadlineAtMs = null;
    animationTimers.idleDeadlineAtMs = null;
    animationTimers.pausedReleaseRemainingMs = null;
    animationTimers.pausedIdleRemainingMs = null;
  };

  const pauseHeatCapacityPumpAnimation = (fileId: string) => {
    const animationTimers = heatCapacityPumpAnimationRef.current;
    if (animationTimers.fileId !== fileId) return;
    const now = Date.now();
    animationTimers.pausedReleaseRemainingMs = animationTimers.releaseDeadlineAtMs === null
      ? animationTimers.pausedReleaseRemainingMs
      : Math.max(0, animationTimers.releaseDeadlineAtMs - now);
    animationTimers.pausedIdleRemainingMs = animationTimers.idleDeadlineAtMs === null
      ? animationTimers.pausedIdleRemainingMs
      : Math.max(0, animationTimers.idleDeadlineAtMs - now);
    if (animationTimers.releaseTimerId !== null) {
      window.clearTimeout(animationTimers.releaseTimerId);
      animationTimers.releaseTimerId = null;
    }
    if (animationTimers.idleTimerId !== null) {
      window.clearTimeout(animationTimers.idleTimerId);
      animationTimers.idleTimerId = null;
    }
    animationTimers.releaseDeadlineAtMs = null;
    animationTimers.idleDeadlineAtMs = null;
  };

  const restorePausedHeatCapacityPumpAnimation = (
    fileId: string,
    releaseRemainingMs: number | null,
    idleRemainingMs: number | null,
  ) => {
    clearHeatCapacityPumpAnimationTimers();
    const animationTimers = heatCapacityPumpAnimationRef.current;
    animationTimers.fileId = fileId;
    animationTimers.pausedReleaseRemainingMs = releaseRemainingMs;
    animationTimers.pausedIdleRemainingMs = idleRemainingMs;
  };

  const scheduleHeatCapacityPumpAnimation = (
    fileId: string,
    releaseDelayMs: number | null,
    idleDelayMs: number | null,
  ) => {
    clearHeatCapacityPumpAnimationTimers();
    const animationTimers = heatCapacityPumpAnimationRef.current;
    animationTimers.fileId = fileId;
    animationTimers.pausedReleaseRemainingMs = null;
    animationTimers.pausedIdleRemainingMs = null;
    if (releaseDelayMs !== null) {
      const normalizedReleaseDelayMs = Math.max(0, releaseDelayMs);
      animationTimers.releaseDeadlineAtMs = Date.now() + normalizedReleaseDelayMs;
      animationTimers.releaseTimerId = window.setTimeout(() => {
        animationTimers.releaseTimerId = null;
        animationTimers.releaseDeadlineAtMs = null;
        if (
          desktopExitQuiescedRef.current ||
          heatCapacityRefreshRestorePendingRef.current ||
          heatCapacityRuntimeFailureFileIdRef.current !== null ||
          activeFileIdRef.current !== fileId ||
          animationTimers.fileId !== fileId
        ) return;
        updateFileById(fileId, (file) => file.kind === 'heatCapacity'
          ? { ...file, pumpBulbState: 'releasing', updatedAt: Date.now() }
          : file);
      }, normalizedReleaseDelayMs);
    }
    if (idleDelayMs !== null) {
      const normalizedIdleDelayMs = Math.max(0, idleDelayMs);
      animationTimers.idleDeadlineAtMs = Date.now() + normalizedIdleDelayMs;
      animationTimers.idleTimerId = window.setTimeout(() => {
        animationTimers.idleTimerId = null;
        animationTimers.idleDeadlineAtMs = null;
        if (
          desktopExitQuiescedRef.current ||
          heatCapacityRefreshRestorePendingRef.current ||
          heatCapacityRuntimeFailureFileIdRef.current !== null ||
          activeFileIdRef.current !== fileId ||
          animationTimers.fileId !== fileId
        ) return;
        animationTimers.fileId = null;
        updateFileById(fileId, (file) => file.kind === 'heatCapacity'
          ? refreshHeatCapacityPumpFrequency({ ...file, pumpBulbState: 'idle' }, Date.now())
          : file);
      }, normalizedIdleDelayMs);
    }
  };

  const resumeHeatCapacityPumpAnimation = (fileId: string) => {
    const animationTimers = heatCapacityPumpAnimationRef.current;
    if (animationTimers.fileId !== fileId) return;
    const releaseRemainingMs = animationTimers.pausedReleaseRemainingMs;
    const idleRemainingMs = animationTimers.pausedIdleRemainingMs;
    if (releaseRemainingMs === null && idleRemainingMs === null) return;
    scheduleHeatCapacityPumpAnimation(fileId, releaseRemainingMs, idleRemainingMs);
  };

  const pumpAnimationProjectionEffect = { run: () => {
    if (activeFile.kind !== 'heatCapacity') return;
    if (activeFile.pumpBulbState === 'idle') {
      if (heatCapacityPumpAnimationRef.current.fileId === activeFile.id) {
        clearHeatCapacityPumpAnimationTimers();
      }
      return;
    }
    const timeFrozen = heatCapacityRefreshRestoring ||
      activeFile.runState === 'paused' ||
      heatCapacityLessonDialogActive ||
      autoDemoPaused ||
      (activeFile.heatCapacityMode === 'guide' && activeFile.heatCapacityGuideWorkflow.paused);
    if (timeFrozen) {
      pauseHeatCapacityPumpAnimation(activeFile.id);
      return;
    }
    resumeHeatCapacityPumpAnimation(activeFile.id);
  }, dependencies: [
    activeFile.id,
    activeFile.kind,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityGuideWorkflow.paused : false,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null,
    activeFile.kind === 'heatCapacity' ? activeFile.pumpBulbState : null,
    activeFile.runState,
    autoDemoPaused,
    heatCapacityLessonDialogActive,
    heatCapacityRefreshRestoring,
  ] } satisfies WorkbenchHeatEffect;
  return {
    effects: { pumpAnimationProjection: pumpAnimationProjectionEffect }, heatCapacityPumpAnimationRef, heatCapacityPumpPulseId, setHeatCapacityPumpPulseId, clearHeatCapacityPumpAnimationTimers, pauseHeatCapacityPumpAnimation, restorePausedHeatCapacityPumpAnimation, scheduleHeatCapacityPumpAnimation, resumeHeatCapacityPumpAnimation };
};
