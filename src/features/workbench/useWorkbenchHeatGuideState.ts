import type { WorkbenchHeatEffect } from './workbenchHeatEffect.ts';
import { type HeatCapacityGuideStrongCutout } from './workbenchHeatCapacityGuideMaskGeometry.ts';
import { useRef, useState } from 'react';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import { isHeatCapacityFreePreheatRequired } from './workbenchHeatCapacityTeachingLifecycleState.ts';
import { resolveHeatCapacityGuidePulseRestore } from '../heatCapacity/heatCapacityGuidePulseClock.ts';
import { getHeatCapacityGuideStep as selectHeatCapacityGuideStep } from './workbenchHeatCapacityGuideDecisions.ts';
import { type GuideHeatCapacityStep } from '../heatCapacity/heatCapacityGuideStepModel.ts';
import { type HeatCapacityGuideRollbackAnimation } from '../../domain/heatCapacity/heatCapacityInstrumentFeedback.ts';
import { HeatCapacityRejectedInteractionTracker } from '../heatCapacity/heatCapacityControlInteraction.ts';
import { createHeatCapacityAutoDemoSteps } from '../../domain/heatCapacity/heatCapacityAutoDemo.ts';

import { getHeatCapacityRefreshOptionalNumber, getHeatCapacityRefreshString } from './workbenchHeatCapacityUiCheckpoint.ts';


export interface useWorkbenchHeatGuideStatePorts {
  initialHeatCapacityRefreshSession: import("./workbenchHeatCapacityRefreshSession.ts").WorkbenchHeatCapacityRefreshSession | null;
  initialHeatCapacityRefreshLayout: import("./../heatCapacity/heatCapacityModeUiCheckpoint.ts").HeatCapacityModeJsonObject;
  heatCapacityModeTransitionLocked: boolean;
  autoDemoInteractionLocked: boolean;
  activeFile: import("./workbenchFileUnion.ts").WorkbenchFileState;
  autoDemoStepIndex: number;
}

export const useWorkbenchHeatGuideState = (ports: useWorkbenchHeatGuideStatePorts) => {
  const { initialHeatCapacityRefreshSession, initialHeatCapacityRefreshLayout, heatCapacityModeTransitionLocked, autoDemoInteractionLocked, activeFile, autoDemoStepIndex } = ports;
  const initialHeatCapacityGuidePulsePlan = resolveHeatCapacityGuidePulseRestore({
    fileId: initialHeatCapacityRefreshSession?.activeHeatCapacityFileId,
    controlId: initialHeatCapacityRefreshSession?.guide.normalReminder.controlId,
    remainingMs: initialHeatCapacityRefreshSession?.guide.normalReminder.remainingMs,
    clockRunning: false,
  });

  const heatCapacityGuideStartTimerRef = useRef<number | null>(null);

  const guidePassivePumpTargetNoticeKeyRef = useRef<string | null>(null);

  const guideHeatCapacityPulseTimerRef = useRef<number | null>(null);

  const guideHeatCapacityPulseDeadlineAtMsRef = useRef<number | null>(null);

  const guideHeatCapacityPausedPulseRef = useRef<{
    fileId: string;
    controlId: string | null;
    remainingMs: number;
  } | null>(initialHeatCapacityGuidePulsePlan.state === 'paused'
    ? {
        fileId: initialHeatCapacityGuidePulsePlan.fileId,
        controlId: initialHeatCapacityGuidePulsePlan.controlId,
        remainingMs: initialHeatCapacityGuidePulsePlan.remainingMs,
      }
    : null);

  const guideHeatCapacityGuidancePulseTimerRef = useRef<number | null>(null);

  const guideHeatCapacityStrongReminderTimerRef = useRef<number | null>(null);

  const guideHeatCapacityStrongReminderDeadlineAtMsRef = useRef<number | null>(null);

  const guideHeatCapacityStrongReminderTimerContextRef = useRef<{
    fileId: string;
    step: GuideHeatCapacityStep;
    controlId: string | null;
  } | null>(null);

  const guideHeatCapacityRestoredStrongReminderTimerRef = useRef<{
    fileId: string;
    controlId: string | null;
    remainingMs: number;
  } | null>((() => {
    const remainingMs = getHeatCapacityRefreshOptionalNumber(
      initialHeatCapacityRefreshLayout,
      'baseStrongReminderRemainingMs',
    );
    const fileId = getHeatCapacityRefreshString(
      initialHeatCapacityRefreshLayout,
      'baseStrongReminderFileId',
    );
    if (!fileId || remainingMs === null) return null;
    return {
      fileId,
      controlId: getHeatCapacityRefreshString(
        initialHeatCapacityRefreshLayout,
        'baseStrongReminderControlId',
      ),
      remainingMs,
    };
  })());

  const guideHeatCapacityPendingStrongReminderTimerRef = useRef<number | null>(null);

  const guideHeatCapacityPendingStrongReminderDeadlineAtMsRef = useRef<number | null>(null);

  const guideHeatCapacityPendingStrongReminderControlIdRef = useRef<string | null>(null);

  const guideHeatCapacityPausedPendingStrongReminderRef = useRef<{
    controlId: string | null;
    remainingMs: number;
  } | null>(null);

  const guideHeatCapacityMissCountRef = useRef(initialHeatCapacityRefreshSession?.guide.missCount ?? 0);

  const guideHeatCapacityRejectedInteractionRef = useRef(new HeatCapacityRejectedInteractionTracker());

  const guideHeatCapacityActiveFileIdRef = useRef<string | null>(
    initialHeatCapacityRefreshSession?.mode === 'guide'
      ? initialHeatCapacityRefreshSession.activeHeatCapacityFileId
      : null,
  );

  const heatCapacityGuideMaskRef = useRef<HTMLDivElement | null>(null);

  const [guideHeatCapacityActiveFileId, setGuideHeatCapacityActiveFileId] = useState<string | null>(
    initialHeatCapacityRefreshSession?.mode === 'guide'
      ? initialHeatCapacityRefreshSession.activeHeatCapacityFileId
      : null,
  );

  const [guideHeatCapacityFocusControlId, setGuideHeatCapacityFocusControlId] = useState<string | null>(
    null,
  );

  const [guideHeatCapacityPulseActive, setGuideHeatCapacityPulseActive] = useState(
    false,
  );

  const [guideHeatCapacityStrongReminderActive, setGuideHeatCapacityStrongReminderActive] = useState(
    heatCapacityModeTransitionLocked ? false : initialHeatCapacityRefreshSession?.guide.strongReminder.active ?? false,
  );

  const [guideHeatCapacityStrongReminderControlId, setGuideHeatCapacityStrongReminderControlId] = useState<string | null>(
    heatCapacityModeTransitionLocked ? null : initialHeatCapacityRefreshSession?.guide.strongReminder.controlId ?? null,
  );

  const [guideHeatCapacityStrongReminderFocusKey, setGuideHeatCapacityStrongReminderFocusKey] = useState(0);

  const [heatCapacityGuideMaskBounds, setHeatCapacityGuideMaskBounds] = useState({ width: 1, height: 1 });

  const [heatCapacityGuideProjectedHoles, setHeatCapacityGuideProjectedHoles] = useState<Record<string, HeatCapacityGuideStrongCutout>>({});

  const [guideHeatCapacityRollback, setGuideHeatCapacityRollback] = useState<{
    animation: HeatCapacityGuideRollbackAnimation;
    key: number;
  } | null>(null);

  const guideFileProjectionEffect = { run: () => {
    guideHeatCapacityActiveFileIdRef.current = guideHeatCapacityActiveFileId;
  }, dependencies: [guideHeatCapacityActiveFileId] } satisfies WorkbenchHeatEffect;

  const guideMaskObservationEffect = { run: () => {
    if (!guideHeatCapacityStrongReminderActive) return undefined;
    const maskRoot = heatCapacityGuideMaskRef.current;
    if (!maskRoot) return undefined;
    const updateBounds = () => {
      const rect = maskRoot.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      setHeatCapacityGuideMaskBounds((previous) => (
        previous.width === width && previous.height === height ? previous : { width, height }
      ));
    };
    updateBounds();
    const observer = new ResizeObserver(updateBounds);
    observer.observe(maskRoot);
    window.addEventListener('resize', updateBounds);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateBounds);
    };
  }, dependencies: [guideHeatCapacityStrongReminderActive] } satisfies WorkbenchHeatEffect;

  const getHeatCapacityGuideStep = (
    file: Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
  ): GuideHeatCapacityStep => selectHeatCapacityGuideStep(file, autoDemoInteractionLocked);

  const activeHeatCapacityGuideFileId = activeFile.kind === 'heatCapacity' ? activeFile.id : null;

  const activeHeatCapacityGuideStep: GuideHeatCapacityStep = activeFile.kind === 'heatCapacity'
    ? getHeatCapacityGuideStep(activeFile)
    : 'idle';

  const activeHeatCapacityDemoStep = autoDemoStepIndex > 0
    ? createHeatCapacityAutoDemoSteps()[autoDemoStepIndex - 1] ?? null
    : null;

  const activeHeatCapacityPreheatMode: 'demo' | 'guide' | 'free' | null = activeFile.kind !== 'heatCapacity'
    ? null
    : activeFile.heatCapacityMode === 'demo' &&
        autoDemoInteractionLocked &&
        activeHeatCapacityDemoStep?.id === 'sensor-preheat'
      ? 'demo'
      : activeFile.heatCapacityMode === 'guide' &&
          activeFile.heatCapacityGuideWorkflow.step === 'preheatRequired'
        ? 'guide'
        : isHeatCapacityFreePreheatRequired(activeFile)
          ? 'free'
          : null;

  const activeHeatCapacityPreheatLocked = activeHeatCapacityPreheatMode !== null;
  return {
    effects: { guideFileProjection: guideFileProjectionEffect, guideMaskObservation: guideMaskObservationEffect }, heatCapacityGuideStartTimerRef, guidePassivePumpTargetNoticeKeyRef, guideHeatCapacityPulseTimerRef, guideHeatCapacityPulseDeadlineAtMsRef, guideHeatCapacityPausedPulseRef, guideHeatCapacityGuidancePulseTimerRef, guideHeatCapacityStrongReminderTimerRef, guideHeatCapacityStrongReminderDeadlineAtMsRef, guideHeatCapacityStrongReminderTimerContextRef, guideHeatCapacityRestoredStrongReminderTimerRef, guideHeatCapacityPendingStrongReminderTimerRef, guideHeatCapacityPendingStrongReminderDeadlineAtMsRef, guideHeatCapacityPendingStrongReminderControlIdRef, guideHeatCapacityPausedPendingStrongReminderRef, guideHeatCapacityMissCountRef, guideHeatCapacityRejectedInteractionRef, guideHeatCapacityActiveFileIdRef, heatCapacityGuideMaskRef, guideHeatCapacityActiveFileId, setGuideHeatCapacityActiveFileId, guideHeatCapacityFocusControlId, setGuideHeatCapacityFocusControlId, guideHeatCapacityPulseActive, setGuideHeatCapacityPulseActive, guideHeatCapacityStrongReminderActive, setGuideHeatCapacityStrongReminderActive, guideHeatCapacityStrongReminderControlId, setGuideHeatCapacityStrongReminderControlId, guideHeatCapacityStrongReminderFocusKey, setGuideHeatCapacityStrongReminderFocusKey, heatCapacityGuideMaskBounds, heatCapacityGuideProjectedHoles, setHeatCapacityGuideProjectedHoles, guideHeatCapacityRollback, setGuideHeatCapacityRollback, getHeatCapacityGuideStep, activeHeatCapacityGuideFileId, activeHeatCapacityGuideStep, activeHeatCapacityPreheatMode, activeHeatCapacityPreheatLocked };
};
