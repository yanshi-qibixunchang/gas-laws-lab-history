import type { WorkbenchHeatEffect } from './workbenchHeatEffect.ts';
import { useMemo, useRef, useState } from 'react';
import { type HeatCapacityAutoDemoPhase } from '../heatCapacity/heatCapacityModeControlModel.ts';
import { createHeatCapacityAutoDemoSteps, getHeatCapacityAutoDemoTimelineItemKey, getHeatCapacityAutoDemoTimeline, type HeatCapacityAutoDemoTimelineItem } from '../../domain/heatCapacity/heatCapacityAutoDemo.ts';
import { type WorkbenchHeatCapacityRefreshSession } from './workbenchHeatCapacityRefreshSession.ts';
import { type HeatCapacityFocusMode } from './workbenchHeatCapacityUiCheckpoint.ts';

export interface useWorkbenchHeatDemoStatePorts {
  initialHeatCapacityRefreshSession: import("./workbenchHeatCapacityRefreshSession.ts").WorkbenchHeatCapacityRefreshSession | null;
  heatCapacityModeTransitionLocked: boolean;
  heatCapacityRefreshRestoring: boolean;
  desktopExitQuiesced: boolean;
  heatCapacityRuntimeFailureFileId: string | null;
}

export const useWorkbenchHeatDemoState = (ports: useWorkbenchHeatDemoStatePorts) => {
  const { initialHeatCapacityRefreshSession, heatCapacityModeTransitionLocked, heatCapacityRefreshRestoring, desktopExitQuiesced, heatCapacityRuntimeFailureFileId } = ports;
  const initialHeatCapacityAutoDemoTimeline = useMemo(() => (
    initialHeatCapacityRefreshSession?.mode === 'demo' && initialHeatCapacityRefreshSession.demo.phase !== 'idle'
      ? getHeatCapacityAutoDemoTimeline(createHeatCapacityAutoDemoSteps())
      : []
  ), [initialHeatCapacityRefreshSession]);

  const heatCapacityAutoDemoTimersRef = useRef<number[]>([]);

  const heatCapacityModeTransitionDemoClockRef = useRef<
    WorkbenchHeatCapacityRefreshSession['modeTransitionDemoClock']
  >(initialHeatCapacityRefreshSession?.modeTransitionDemoClock ?? null);

  const heatCapacityAutoDemoFileIdRef = useRef<string | null>(
    initialHeatCapacityRefreshSession?.mode === 'demo' && initialHeatCapacityRefreshSession.demo.phase !== 'idle'
      ? initialHeatCapacityRefreshSession.activeHeatCapacityFileId
      : null,
  );

  const heatCapacityAutoDemoTimelineRef = useRef<HeatCapacityAutoDemoTimelineItem[]>(
    initialHeatCapacityAutoDemoTimeline,
  );

  const heatCapacityAutoDemoStartedAtMsRef = useRef(0);

  const heatCapacityAutoDemoPausedElapsedMsRef = useRef(
    initialHeatCapacityRefreshSession?.demo.elapsedMs ?? 0,
  );

  const heatCapacityAutoDemoInitialDelayRemainingMsRef = useRef(
    initialHeatCapacityRefreshSession?.demo.initialDelayRemainingMs ?? 0,
  );

  const heatCapacityAutoDemoPausedFileIdRef = useRef<string | null>(
    initialHeatCapacityRefreshSession?.mode === 'demo' && initialHeatCapacityRefreshSession.demo.phase === 'paused'
      ? initialHeatCapacityRefreshSession.activeHeatCapacityFileId
      : null,
  );

  const heatCapacityAutoDemoLastProcessedTimelineIndexRef = useRef(
    initialHeatCapacityRefreshSession?.demo.timeline.currentItemIndex ?? -1,
  );

  const heatCapacityAutoDemoExecutedItemKeysRef = useRef<Set<string>>(new Set(
    initialHeatCapacityRefreshSession?.demo.timeline.executedItemKeys.length
      ? initialHeatCapacityRefreshSession.demo.timeline.executedItemKeys
      : initialHeatCapacityRefreshSession?.demo.timeline.currentItemIndex !== null &&
          initialHeatCapacityRefreshSession?.demo.timeline.currentItemIndex !== undefined
        ? initialHeatCapacityAutoDemoTimeline
            .slice(0, initialHeatCapacityRefreshSession.demo.timeline.currentItemIndex + 1)
            .map(getHeatCapacityAutoDemoTimelineItemKey)
        : [],
  ));

  const demoCameraFocusModeRef = useRef<Exclude<HeatCapacityFocusMode, 'none'> | null>(
    initialHeatCapacityRefreshSession?.demo.cameraMode ?? null,
  );

  const heatCapacityAutoDemoCompleteToastTimerRef = useRef<number | null>(null);

  const heatCapacityAutoDemoCompleteToastTimerGenerationRef = useRef(0);

  const heatCapacityAutoDemoCompleteToastDeadlineAtMsRef = useRef<number | null>(null);

  const heatCapacityAutoDemoCompleteToastPausedRef = useRef<{
    fileId: string;
    remainingMs: number;
  } | null>(
    initialHeatCapacityRefreshSession?.demo.completionMessageRemainingMs !== null &&
    initialHeatCapacityRefreshSession?.demo.completionMessageRemainingMs !== undefined
      ? {
          fileId: initialHeatCapacityRefreshSession.activeHeatCapacityFileId,
          remainingMs: initialHeatCapacityRefreshSession.demo.completionMessageRemainingMs,
        }
      : null,
  );

  const heatCapacityAutoDemoStepPanelTimerRef = useRef<number | null>(null);

  const heatCapacityAutoDemoStepPanelTimerGenerationRef = useRef(0);

  const heatCapacityAutoDemoStepPanelDeadlineAtMsRef = useRef<number | null>(null);

  const heatCapacityAutoDemoStepPanelPausedRef = useRef<{
    fileId: string;
    remainingMs: number;
  } | null>(null);

  const heatCapacityAutoDemoLockedToastLastShownRef = useRef<{ message: string; at: number } | null>(null);

  const heatCapacityAutoDemoLockedPointerToastTimerRef = useRef<number | null>(null);

  const [autoDemoPhase, setAutoDemoPhase] = useState<HeatCapacityAutoDemoPhase>(() => (
    initialHeatCapacityRefreshSession?.mode === 'demo'
      ? initialHeatCapacityRefreshSession.demo.phase
      : 'idle'
  ));

  const autoDemoPhaseRef = useRef(autoDemoPhase);

  autoDemoPhaseRef.current = autoDemoPhase;

  const autoDemoRunning = autoDemoPhase === 'running';

  const autoDemoPaused = autoDemoPhase === 'paused';

  const autoDemoInteractionLocked = autoDemoPhase !== 'idle';

  const [autoDemoTimelineClockMs, setAutoDemoTimelineClockMs] = useState(0);

  const [autoDemoCompletionMessage, setAutoDemoCompletionMessage] = useState<string | null>(
    initialHeatCapacityRefreshSession?.demo.completionMessage ?? null,
  );

  const [demoFocusControlId, setDemoFocusControlId] = useState<string | null>(
    heatCapacityModeTransitionLocked ? null : initialHeatCapacityRefreshSession?.demo.focusControlId ?? null,
  );

  const [demoFocusPulseActive, setDemoFocusPulseActive] = useState(
    heatCapacityModeTransitionLocked ? false : initialHeatCapacityRefreshSession?.demo.focusPulseActive ?? false,
  );

  const [demoCameraFocusMode, setDemoCameraFocusMode] = useState<Exclude<HeatCapacityFocusMode, 'none'> | null>(
    heatCapacityModeTransitionLocked ? null : initialHeatCapacityRefreshSession?.demo.cameraMode ?? null,
  );

  const [demoCameraFocusKey, setDemoCameraFocusKey] = useState(
    initialHeatCapacityRefreshSession?.demo.cameraFocusKey ?? 0,
  );

  const [autoDemoStepIndex, setAutoDemoStepIndex] = useState(
    initialHeatCapacityRefreshSession?.demo.stepPanel.stepIndex ?? 0,
  );

  const [autoDemoStepCount, setAutoDemoStepCount] = useState(
    initialHeatCapacityRefreshSession?.demo.stepPanel.stepCount ?? 0,
  );

  const [autoDemoStepTitle, setAutoDemoStepTitle] = useState(
    initialHeatCapacityRefreshSession?.demo.stepPanel.title ?? '',
  );

  const [autoDemoStepDescription, setAutoDemoStepDescription] = useState(
    initialHeatCapacityRefreshSession?.demo.stepPanel.description ?? '',
  );

  const [autoDemoStepTarget, setAutoDemoStepTarget] = useState(
    initialHeatCapacityRefreshSession?.demo.stepPanel.target ?? '',
  );

  const [autoDemoStepProgressCriterion, setAutoDemoStepProgressCriterion] = useState(
    initialHeatCapacityRefreshSession?.demo.stepPanel.progressCriterion ?? '',
  );

  const [autoDemoStepNote, setAutoDemoStepNote] = useState(
    initialHeatCapacityRefreshSession?.demo.stepPanel.note ?? '',
  );

  const [autoDemoStepPanelMode, setAutoDemoStepPanelMode] = useState<'hidden' | 'visible' | 'exiting'>(
    initialHeatCapacityRefreshSession?.demo.stepPanel.mode ?? 'hidden',
  );

  const demoClockEffect = { run: () => {
    if (
      !autoDemoRunning ||
      heatCapacityRefreshRestoring ||
      desktopExitQuiesced ||
      heatCapacityRuntimeFailureFileId !== null
    ) return undefined;
    const refreshClock = () => setAutoDemoTimelineClockMs(performance.now());
    refreshClock();
    const intervalId = window.setInterval(refreshClock, 50);
    return () => window.clearInterval(intervalId);
  }, dependencies: [
    autoDemoRunning,
    desktopExitQuiesced,
    heatCapacityRefreshRestoring,
    heatCapacityRuntimeFailureFileId,
  ] } satisfies WorkbenchHeatEffect;
  return {
    effects: { demoClock: demoClockEffect }, heatCapacityAutoDemoTimersRef, heatCapacityModeTransitionDemoClockRef, heatCapacityAutoDemoFileIdRef, heatCapacityAutoDemoTimelineRef, heatCapacityAutoDemoStartedAtMsRef, heatCapacityAutoDemoPausedElapsedMsRef, heatCapacityAutoDemoInitialDelayRemainingMsRef, heatCapacityAutoDemoPausedFileIdRef, heatCapacityAutoDemoLastProcessedTimelineIndexRef, heatCapacityAutoDemoExecutedItemKeysRef, demoCameraFocusModeRef, heatCapacityAutoDemoCompleteToastTimerRef, heatCapacityAutoDemoCompleteToastTimerGenerationRef, heatCapacityAutoDemoCompleteToastDeadlineAtMsRef, heatCapacityAutoDemoCompleteToastPausedRef, heatCapacityAutoDemoStepPanelTimerRef, heatCapacityAutoDemoStepPanelTimerGenerationRef, heatCapacityAutoDemoStepPanelDeadlineAtMsRef, heatCapacityAutoDemoStepPanelPausedRef, heatCapacityAutoDemoLockedToastLastShownRef, heatCapacityAutoDemoLockedPointerToastTimerRef, autoDemoPhase, setAutoDemoPhase, autoDemoPhaseRef, autoDemoRunning, autoDemoPaused, autoDemoInteractionLocked, autoDemoTimelineClockMs, setAutoDemoTimelineClockMs, autoDemoCompletionMessage, setAutoDemoCompletionMessage, demoFocusControlId, setDemoFocusControlId, demoFocusPulseActive, setDemoFocusPulseActive, demoCameraFocusMode, setDemoCameraFocusMode, demoCameraFocusKey, setDemoCameraFocusKey, autoDemoStepIndex, setAutoDemoStepIndex, autoDemoStepCount, setAutoDemoStepCount, autoDemoStepTitle, setAutoDemoStepTitle, autoDemoStepDescription, setAutoDemoStepDescription, autoDemoStepTarget, setAutoDemoStepTarget, autoDemoStepProgressCriterion, setAutoDemoStepProgressCriterion, autoDemoStepNote, setAutoDemoStepNote, autoDemoStepPanelMode, setAutoDemoStepPanelMode };
};
