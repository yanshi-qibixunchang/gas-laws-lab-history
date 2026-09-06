import type { WorkbenchHeatEffect } from './workbenchHeatEffect.ts';
import React from 'react';

import { refreshHeatCapacityPumpFrequency, shouldCommitHeatCapacityRealtimeTick, stepHeatCapacityWorkbenchFile } from './workbenchHeatCapacityRuntimeCoordinator.ts';
import { evaluateHeatCapacityFreeAttemptTimeoutWorkbenchState } from './workbenchHeatCapacityFreeAttemptState.ts';

export interface useWorkbenchHeatRealtimeClockPorts {
  desktopExitQuiesced: boolean;
  heatCapacityRefreshRestoring: boolean;
  heatCapacityRefreshRestorePendingRef: React.MutableRefObject<boolean>;
  heatCapacityRuntimeFailureFileId: string | null;
  desktopExitQuiescedRef: React.MutableRefObject<boolean>;
  setFiles: React.Dispatch<React.SetStateAction<import("./workbenchFileUnion.ts").WorkbenchFileState[]>>;
  activeFileIdRef: React.MutableRefObject<string>;
  heatCapacityRefreshActiveFileIdRef: React.MutableRefObject<string | null>;
  heatCapacityRuntimeFailureFileIdRef: React.MutableRefObject<string | null>;
  heatCapacityLessonPausedFileIdRef: React.MutableRefObject<string | null>;
  heatCapacityLessonDialogActiveRef: React.MutableRefObject<boolean>;
  filesRef: React.MutableRefObject<import("./workbenchFileUnion.ts").WorkbenchFileState[]>;
  heatCapacityQualityProfile: import("./../heatCapacity/heatCapacityQualityProfiles.ts").HeatCapacityQualityProfile;
}

export const useWorkbenchHeatRealtimeClock = (ports: useWorkbenchHeatRealtimeClockPorts) => {
  const { desktopExitQuiesced, heatCapacityRefreshRestoring, heatCapacityRefreshRestorePendingRef, heatCapacityRuntimeFailureFileId, desktopExitQuiescedRef, setFiles, activeFileIdRef, heatCapacityRefreshActiveFileIdRef, heatCapacityRuntimeFailureFileIdRef, heatCapacityLessonPausedFileIdRef, heatCapacityLessonDialogActiveRef, filesRef, heatCapacityQualityProfile } = ports;
  const realtimeClockEffect = { run: () => {
    if (
      desktopExitQuiesced ||
      heatCapacityRefreshRestoring ||
      heatCapacityRefreshRestorePendingRef.current ||
      heatCapacityRuntimeFailureFileId !== null
    ) return undefined;
    const intervalId = window.setInterval(() => {
      if (desktopExitQuiescedRef.current) return;
      const now = Date.now();
      setFiles((current) => {
        const activeId = activeFileIdRef.current;
        let changed = false;
        const nextFiles = current.map((file) => {
          if (file.id !== activeId || file.kind !== 'heatCapacity') return file;
          if (
            heatCapacityRefreshRestorePendingRef.current &&
            heatCapacityRefreshActiveFileIdRef.current === file.id
          ) {
            return file;
          }
          if (heatCapacityRuntimeFailureFileIdRef.current === file.id) return file;
          if (file.runState === 'paused') return file;
          if (
            heatCapacityLessonPausedFileIdRef.current === file.id ||
            heatCapacityLessonDialogActiveRef.current
          ) {
            return file;
          }
          const refreshedFile = refreshHeatCapacityPumpFrequency(file, now);
          const physicallySteppedFile = refreshedFile.powerOn || refreshedFile.heatCapacityMode === 'free'
            ? stepHeatCapacityWorkbenchFile(refreshedFile, now)
            : refreshedFile;
          const steppedFile = evaluateHeatCapacityFreeAttemptTimeoutWorkbenchState(
            physicallySteppedFile,
            now,
          );
          if (!shouldCommitHeatCapacityRealtimeTick(file, steppedFile)) {
            return file;
          }
          changed = true;
          return steppedFile;
        });
        if (!changed) return current;
        filesRef.current = nextFiles;
        return nextFiles;
      });
    }, heatCapacityQualityProfile.tickIntervalMs);
    return () => window.clearInterval(intervalId);
  }, dependencies: [
    desktopExitQuiesced,
    heatCapacityQualityProfile.tickIntervalMs,
    heatCapacityRefreshRestoring,
    heatCapacityRuntimeFailureFileId,
  ] } satisfies WorkbenchHeatEffect;
  return {
    effects: { realtimeClock: realtimeClockEffect },  };
};
