
import React, { useEffect, useMemo, useState } from 'react';

import { PISTON_OSCILLATION_DEMO_DURATION_MS } from "../pistonOscillation/pistonOscillationDemoTimeline.ts";
import { createPistonOscillationDemoPlaybackChannel } from "../pistonOscillation/pistonOscillationDemoPlaybackChannel.ts";
import { completePistonOscillationDemoSession, resolvePistonOscillationDemoSession } from '../../domain/pistonOscillation/pistonOscillationDemoSessionModel.ts';

export interface useWorkbenchPistonDemoRuntimePorts {
  activeFile: import("./workbenchFileUnion.ts").WorkbenchFileState;
  initialActiveWorkbenchFile: import("./workbenchFileUnion.ts").WorkbenchFileState | undefined;
  pistonOscillationGuideLessonDialog: import("./workbenchPistonGuidePresentation.ts").PistonOscillationGuideLessonDialogState | null;
  setWorkbenchFiles: (updater: (files: import("./workbenchFileUnion.ts").WorkbenchFileState[]) => import("./workbenchFileUnion.ts").WorkbenchFileState[]) => void;
  activeFileIdRef: React.MutableRefObject<string>;
  setLeftCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  flushWorkspacePersistenceRef: React.MutableRefObject<() => Promise<boolean>>;
}

export interface WorkbenchPistonDemoClockPorts extends Pick<useWorkbenchPistonDemoRuntimePorts, 'pistonOscillationGuideLessonDialog' | 'setWorkbenchFiles' | 'activeFileIdRef' | 'setLeftCollapsed' | 'flushWorkspacePersistenceRef'> {
  pistonOscillationDemoPlayback: ReturnType<ReturnType<typeof createPistonOscillationDemoPlaybackChannel>['getSnapshot']>;
  pistonOscillationDemoPlaybackChannel: ReturnType<typeof createPistonOscillationDemoPlaybackChannel>;
  setPistonOscillationDemoPlayback: React.Dispatch<React.SetStateAction<WorkbenchPistonDemoClockPorts['pistonOscillationDemoPlayback']>>;
}

export const startWorkbenchPistonDemoClock = (ports: WorkbenchPistonDemoClockPorts) => {
  const { pistonOscillationDemoPlayback, pistonOscillationGuideLessonDialog, pistonOscillationDemoPlaybackChannel, setPistonOscillationDemoPlayback, setWorkbenchFiles, activeFileIdRef, setLeftCollapsed, flushWorkspacePersistenceRef } = ports;
  if (
      pistonOscillationDemoPlayback.phase !== 'running'
      || pistonOscillationGuideLessonDialog !== null
    ) return undefined;
  const playbackFileId = pistonOscillationDemoPlayback.fileId;
  const currentSnapshot = pistonOscillationDemoPlaybackChannel.getSnapshot();
  const resumedElapsedMs = currentSnapshot.fileId === playbackFileId
      ? currentSnapshot.elapsedMs
      : pistonOscillationDemoPlayback.elapsedMs;
  const startedAtMs = performance.now() - resumedElapsedMs;
  const timer = window.setInterval(() => {
      const elapsedMs = Math.min(
        PISTON_OSCILLATION_DEMO_DURATION_MS,
        performance.now() - startedAtMs,
      );
      const completed = elapsedMs >= PISTON_OSCILLATION_DEMO_DURATION_MS;
      pistonOscillationDemoPlaybackChannel.publish({
        fileId: playbackFileId,
        phase: completed ? 'completed' : 'running',
        elapsedMs,
      });
      if (!completed) return;
      const completedAtMs = Date.now();
      setPistonOscillationDemoPlayback((current) => (
        current.phase === 'running' && current.fileId === playbackFileId
          ? { ...current, elapsedMs, phase: 'completed' }
          : current
      ));
      setWorkbenchFiles((current) => current.map((file) => (
        file.id === playbackFileId && file.kind === 'heatCapacityPistonOscillation'
          ? {
              ...file,
              updatedAt: completedAtMs,
              pistonOscillationDemoSession: completePistonOscillationDemoSession(
                PISTON_OSCILLATION_DEMO_DURATION_MS,
                completedAtMs,
              ),
            }
          : file
      )));
      if (activeFileIdRef.current === playbackFileId) setLeftCollapsed(false);
      window.setTimeout(() => {
        void flushWorkspacePersistenceRef.current();
      }, 0);
    }, 50);
  return () => window.clearInterval(timer);
};

export const useWorkbenchPistonDemoRuntime = (ports: useWorkbenchPistonDemoRuntimePorts) => {
  const { activeFile, initialActiveWorkbenchFile, pistonOscillationGuideLessonDialog, setWorkbenchFiles, activeFileIdRef, setLeftCollapsed, flushWorkspacePersistenceRef } = ports;
  const [pistonOscillationDemoPlayback, setPistonOscillationDemoPlayback] = useState<{
    fileId: string | null;
    phase: 'idle' | 'running' | 'paused' | 'terminated' | 'completed';
    elapsedMs: number;
  }>(() => {
    if (initialActiveWorkbenchFile?.kind !== 'heatCapacityPistonOscillation') {
      return { fileId: null, phase: 'idle', elapsedMs: 0 };
    }
    const restored = resolvePistonOscillationDemoSession(
      initialActiveWorkbenchFile.pistonOscillationDemoSession,
      PISTON_OSCILLATION_DEMO_DURATION_MS,
      Date.now(),
    );
    return {
      fileId: restored.status === 'idle' ? null : initialActiveWorkbenchFile.id,
      phase: restored.status,
      elapsedMs: restored.elapsedMs,
    };
  });

  const pistonOscillationDemoPlaybackChannel = useMemo(
    () => createPistonOscillationDemoPlaybackChannel(),
    [],
  );

  useEffect(() => {
    if (activeFile.kind !== 'heatCapacityPistonOscillation') return;
    const resolved = resolvePistonOscillationDemoSession(
      activeFile.pistonOscillationDemoSession,
      PISTON_OSCILLATION_DEMO_DURATION_MS,
      Date.now(),
    );
    const snapshot = {
      fileId: resolved.status === 'idle' ? null : activeFile.id,
      phase: resolved.status,
      elapsedMs: resolved.elapsedMs,
    } as const;
    pistonOscillationDemoPlaybackChannel.publish(snapshot);
    setPistonOscillationDemoPlayback((current) => {
      if (
        current.fileId === snapshot.fileId
        && current.phase === snapshot.phase
        && snapshot.phase === 'running'
      ) return current;
      return snapshot;
    });
    if (
      resolved.status === 'completed'
      && activeFile.pistonOscillationDemoSession.status !== 'completed'
    ) {
      setWorkbenchFiles((current) => current.map((file) => (
        file.id === activeFile.id && file.kind === 'heatCapacityPistonOscillation'
          ? {
              ...file,
              pistonOscillationDemoSession: resolved,
              updatedAt: Date.now(),
            }
          : file
      )));
      setLeftCollapsed(false);
      window.setTimeout(() => {
        void flushWorkspacePersistenceRef.current();
      }, 0);
    }
  }, [
    activeFile.id,
    activeFile.kind === 'heatCapacityPistonOscillation'
      ? activeFile.pistonOscillationDemoSession.status
      : null,
    activeFile.kind === 'heatCapacityPistonOscillation'
      ? activeFile.pistonOscillationDemoSession.updatedAtMs
      : null,
    pistonOscillationDemoPlaybackChannel,
  ]);

  useEffect(() => startWorkbenchPistonDemoClock({ pistonOscillationDemoPlayback, pistonOscillationGuideLessonDialog, pistonOscillationDemoPlaybackChannel, setPistonOscillationDemoPlayback, setWorkbenchFiles, activeFileIdRef, setLeftCollapsed, flushWorkspacePersistenceRef }), [
    pistonOscillationDemoPlayback.fileId,
    pistonOscillationDemoPlayback.phase,
    pistonOscillationDemoPlaybackChannel,
    pistonOscillationGuideLessonDialog,
  ]);
  return { pistonOscillationDemoPlayback, setPistonOscillationDemoPlayback, pistonOscillationDemoPlaybackChannel };
};
