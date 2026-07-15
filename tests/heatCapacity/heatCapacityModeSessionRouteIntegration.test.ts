import assert from 'node:assert/strict';
import {
  createHeatCapacityAutoDemoSteps,
  deriveHeatCapacityAutoDemoWaitTimer,
  getHeatCapacityAutoDemoTimeline,
  HEAT_CAPACITY_AUTO_DEMO_WAIT_SPEED_MULTIPLIER,
} from '../../src/domain/heatCapacity/heatCapacityAutoDemo.ts';
import {
  HEAT_CAPACITY_RELEASE_TIMING,
  HEAT_CAPACITY_STANDARD_OPERATION,
  HEAT_CAPACITY_STANDARD_PUMP_STROKE_INTERVAL_S,
} from '../../src/domain/heatCapacity/heatCapacityDefaultConfig.ts';
import { selectHeatCapacityFreeProcessReview } from '../../src/domain/heatCapacity/heatCapacityFreeProcessReviewModel.ts';
import type { HeatCapacityMode } from '../../src/domain/heatCapacity/heatCapacityModeTypes.ts';
import {
  captureHeatCapacityModeRuntimeSnapshot,
  restoreHeatCapacityModeSession,
  suspendHeatCapacityModeSession,
  type HeatCapacityModeRuntimeSnapshot,
} from '../../src/features/workbench/workbenchHeatCapacityModeSession.ts';
import {
  createHeatCapacityModeUiCheckpoint,
  type HeatCapacityModeUiCheckpoint,
} from '../../src/features/heatCapacity/heatCapacityModeUiCheckpoint.ts';
import {
  createWorkbenchHeatCapacityRefreshSession,
  type WorkbenchHeatCapacityRefreshSession,
} from '../../src/features/workbench/workbenchHeatCapacityRefreshSession.ts';
import {
  applyHeatCapacityFreeRecordWorkbenchState,
  applyHeatCapacityGuideRecordWorkbenchState,
  captureHeatCapacityWorkbenchSample,
  completeHeatCapacityFreePreheatWorkbenchState,
  completeHeatCapacityGuidePreheatWorkbenchState,
  completeHeatCapacityTeachingModeWorkbenchState,
  createDefaultHeatCapacityFile,
  deriveHeatCapacityFreeWorkbenchAttemptWaitTimer,
  enterHeatCapacityFreeModeWorkbenchState,
  getHeatCapacityPressureZeroKnobAngleForOffset,
  powerHeatCapacityWorkbenchFile,
  prepareHeatCapacityAutoDemoStart,
  registerHeatCapacityPumpStroke,
  setHeatCapacityFreeEquilibriumSpeedMultiplier,
  setHeatCapacityFreePumpValveOpen,
  setHeatCapacityFreeStopcockOpen,
  setHeatCapacityGuideEquilibriumSpeedMultiplier,
  setHeatCapacityGuidePumpValveOpen,
  setHeatCapacityGuideStopcockOpen,
  setHeatCapacityPressureZeroOffset,
  setHeatCapacityScriptedPumpValveOpen,
  setHeatCapacityScriptedStopcockOpen,
  startHeatCapacityGuideWorkbenchState,
  stepHeatCapacityWorkbenchFile,
  type WorkbenchHeatCapacityState,
} from '../../src/features/workbench/workbenchState.ts';

type DomainBreakpoint = 'pump-ready' | 'u2-recovery-midpoint';
type Route = readonly [HeatCapacityMode, HeatCapacityMode, HeatCapacityMode] |
  readonly [HeatCapacityMode, HeatCapacityMode, HeatCapacityMode, HeatCapacityMode, HeatCapacityMode];

interface TestClock {
  nowMs: number;
}

interface SuspendedModeFixture {
  file: WorkbenchHeatCapacityState;
  expectedSnapshot: HeatCapacityModeRuntimeSnapshot;
  expectedResult: ReturnType<typeof selectCompletedModeResult>;
  uiCheckpoint: HeatCapacityModeUiCheckpoint;
}

const createModeUiCheckpointFromRefreshFixture = (
  session: WorkbenchHeatCapacityRefreshSession,
): HeatCapacityModeUiCheckpoint => {
  const base = {
    fileId: session.activeHeatCapacityFileId,
    checkpointId: session.checkpointId,
    capturedAtMs: session.capturedAtMs,
    scene: {
      cameraPose: session.cameraPose,
      cameraTransition: null,
      ultraVisualState: null,
      hardSphereVisualCheckpoint: null,
      focusSession: null,
    },
    pumpAnimation: null,
  };
  if (session.mode === 'demo') {
    return createHeatCapacityModeUiCheckpoint({
      ...base,
      mode: 'demo',
      payload: { kind: 'demo', demo: session.demo },
    });
  }
  if (session.mode === 'guide') {
    return createHeatCapacityModeUiCheckpoint({
      ...base,
      mode: 'guide',
      payload: {
        kind: 'guide',
        guide: {
          missCount: session.guide.missCount,
          normalReminder: null,
          strongReminder: {
            active: session.guide.strongReminder.active,
            controlId: session.guide.strongReminder.controlId,
          },
          lessonDialog: session.guide.lessonDialog,
          shownLessonIds: session.guide.shownLessonIds,
          checklistViewedIndex: 0,
          pendingStrongReminder: null,
          baseStrongReminder: null,
        },
      },
    });
  }
  return createHeatCapacityModeUiCheckpoint({
    ...base,
    mode: 'free',
    payload: { kind: 'free' },
  });
};

const nextTime = (clock: TestClock, deltaMs: number) => {
  clock.nowMs += deltaMs;
  return clock.nowMs;
};

const forkClock = (clock: TestClock): TestClock => ({ nowMs: clock.nowMs });

const activateFreshMode = (
  file: WorkbenchHeatCapacityState,
  mode: HeatCapacityMode,
  clock: TestClock,
) => {
  const now = nextTime(clock, 100);
  if (mode === 'demo') return prepareHeatCapacityAutoDemoStart(file, now);
  if (mode === 'guide') return startHeatCapacityGuideWorkbenchState(file, now);
  return enterHeatCapacityFreeModeWorkbenchState(file, now);
};

const stabilizePressureZero = (
  file: WorkbenchHeatCapacityState,
  clock: TestClock,
) => {
  const zeroOffset = file.heatCapacityMode === 'demo'
    ? -(file.pressureSignalMvRaw + file.pressureInitialBiasMv)
    : file.heatCapacityMode === 'guide'
      ? -file.pressureInitialBiasMv
      : -file.heatCapacityFreeSensorState.pressureInitialBiasMv;
  const knobAngle = getHeatCapacityPressureZeroKnobAngleForOffset(zeroOffset);
  let nextFile = file;
  for (let sampleIndex = 0; sampleIndex < 5; sampleIndex += 1) {
    nextFile = setHeatCapacityPressureZeroOffset(
      nextFile,
      zeroOffset,
      file.heatCapacityMode === 'demo' ? 'fineWheel' : 'coarseDrag',
      knobAngle,
      nextTime(clock, 200),
    );
  }
  return nextFile;
};

const advanceGuideToPumpReady = (
  source: WorkbenchHeatCapacityState,
  clock: TestClock,
) => {
  let file = powerHeatCapacityWorkbenchFile(source, true, nextTime(clock, 100));
  file = completeHeatCapacityGuidePreheatWorkbenchState(file, nextTime(clock, 5_000));
  file = setHeatCapacityGuideStopcockOpen(file, true, nextTime(clock, 100));
  file = stabilizePressureZero(file, clock);
  file = stepHeatCapacityWorkbenchFile(file, nextTime(clock, 1_000));
  const u0Attempt = applyHeatCapacityGuideRecordWorkbenchState(file, 'u0', nextTime(clock, 100));
  assert.equal(u0Attempt.accepted, true, 'Guide must record a real U0 before pumping');
  file = setHeatCapacityGuideStopcockOpen(u0Attempt.file, false, nextTime(clock, 100));
  file = setHeatCapacityGuidePumpValveOpen(file, true, nextTime(clock, 100));
  assert.equal(file.heatCapacityGuideWorkflow.step, 'pumpRequired');
  return file;
};

const advanceFreeToPumpReady = (
  source: WorkbenchHeatCapacityState,
  clock: TestClock,
) => {
  let file = powerHeatCapacityWorkbenchFile(source, true, nextTime(clock, 100));
  file = completeHeatCapacityFreePreheatWorkbenchState(file, nextTime(clock, 5_000));
  file = setHeatCapacityFreeStopcockOpen(file, true, nextTime(clock, 100));
  file = stepHeatCapacityWorkbenchFile(file, nextTime(clock, 500));
  file = stabilizePressureZero(file, clock);
  file = stepHeatCapacityWorkbenchFile(file, nextTime(clock, 1_000));
  const u0Attempt = applyHeatCapacityFreeRecordWorkbenchState(file, 'u0', nextTime(clock, 100));
  assert.equal(u0Attempt.accepted, true, 'Free must record a real U0 before pumping');
  file = setHeatCapacityFreeStopcockOpen(u0Attempt.file, false, nextTime(clock, 100));
  file = stepHeatCapacityWorkbenchFile(file, nextTime(clock, HEAT_CAPACITY_RELEASE_TIMING.closingAnimationDurationMs));
  file = setHeatCapacityFreePumpValveOpen(file, true, nextTime(clock, 100));
  assert.equal(file.heatCapacityFreeActiveAttempt?.stage, 'preparing');
  return file;
};

const advanceDemoToPrePump = (
  source: WorkbenchHeatCapacityState,
  clock: TestClock,
) => {
  let file = setHeatCapacityScriptedStopcockOpen(source, true, nextTime(clock, 100));
  file = stepHeatCapacityWorkbenchFile(file, nextTime(clock, HEAT_CAPACITY_RELEASE_TIMING.openingAnimationDurationMs));
  file = stabilizePressureZero(file, clock);
  file = stepHeatCapacityWorkbenchFile(file, nextTime(clock, 1_000));
  file = captureHeatCapacityWorkbenchSample(file, 'zeroedSample', nextTime(clock, 1));
  file = setHeatCapacityScriptedStopcockOpen(file, false, nextTime(clock, 100));
  file = stepHeatCapacityWorkbenchFile(file, nextTime(clock, HEAT_CAPACITY_RELEASE_TIMING.closingAnimationDurationMs));
  assert.equal(file.heatCapacityMode, 'demo');
  assert.equal(file.pressureZeroed, true);
  assert.equal(file.pumpValveOpen, false);
  assert.equal(file.heatCapacityReleaseState.phase, 'closed');
  return file;
};

const advanceDemoToU2Midpoint = (
  source: WorkbenchHeatCapacityState,
  clock: TestClock,
) => {
  let file = advanceDemoToPrePump(source, clock);
  file = setHeatCapacityScriptedPumpValveOpen(file, true, nextTime(clock, 100));
  const strokeIntervalMs = Math.round(HEAT_CAPACITY_STANDARD_PUMP_STROKE_INTERVAL_S * 1_000);
  for (let strokeIndex = 0; strokeIndex < HEAT_CAPACITY_STANDARD_OPERATION.pumpStrokes; strokeIndex += 1) {
    file = registerHeatCapacityPumpStroke(file, nextTime(clock, strokeIntervalMs));
  }
  file = captureHeatCapacityWorkbenchSample(file, 'pumpPeakSample', nextTime(clock, 1));
  file = setHeatCapacityScriptedPumpValveOpen(file, false, nextTime(clock, 100));
  file = stepHeatCapacityWorkbenchFile(
    file,
    nextTime(clock, HEAT_CAPACITY_STANDARD_OPERATION.waitAfterPumpS * 1_000),
  );
  file = captureHeatCapacityWorkbenchSample(file, 'stableBeforeReleaseSample', nextTime(clock, 1));
  file = setHeatCapacityScriptedStopcockOpen(file, true, nextTime(clock, 100));
  file = stepHeatCapacityWorkbenchFile(
    file,
    nextTime(
      clock,
      HEAT_CAPACITY_RELEASE_TIMING.openingAnimationDurationMs +
        HEAT_CAPACITY_RELEASE_TIMING.autoDemoReleaseDurationS * 1_000,
    ),
  );
  file = captureHeatCapacityWorkbenchSample(file, 'releaseLowSample', nextTime(clock, 1));
  file = setHeatCapacityScriptedStopcockOpen(file, false, nextTime(clock, 1));
  file = stepHeatCapacityWorkbenchFile(
    file,
    nextTime(clock, HEAT_CAPACITY_RELEASE_TIMING.closingAnimationDurationMs),
  );
  file = stepHeatCapacityWorkbenchFile(
    file,
    nextTime(clock, HEAT_CAPACITY_STANDARD_OPERATION.waitAfterReleaseS / 2 * 1_000),
  );
  assert.notEqual(file.heatCapacityProcessSamples.stableBeforeReleaseSample, undefined);
  assert.notEqual(file.heatCapacityProcessSamples.releaseLowSample, undefined);
  return file;
};

const pumpGuideToTarget = (
  source: WorkbenchHeatCapacityState,
  clock: TestClock,
) => {
  let file = source;
  const strokeIntervalMs = Math.round(HEAT_CAPACITY_STANDARD_PUMP_STROKE_INTERVAL_S * 1_000);
  for (
    let strokeIndex = 0;
    strokeIndex < 40 && file.heatCapacityGuideWorkflow.step !== 'closePumpValveRequired';
    strokeIndex += 1
  ) {
    file = registerHeatCapacityPumpStroke(file, nextTime(clock, strokeIntervalMs));
  }
  assert.equal(file.heatCapacityGuideWorkflow.step, 'closePumpValveRequired');
  assert.equal(file.pumpStrokeCount > 0, true);
  return file;
};

const pumpFreeStandardSequence = (
  source: WorkbenchHeatCapacityState,
  clock: TestClock,
) => {
  let file = source;
  const strokeIntervalMs = Math.round(HEAT_CAPACITY_STANDARD_PUMP_STROKE_INTERVAL_S * 1_000);
  for (let strokeIndex = 0; strokeIndex < HEAT_CAPACITY_STANDARD_OPERATION.pumpStrokes; strokeIndex += 1) {
    file = registerHeatCapacityPumpStroke(file, nextTime(clock, strokeIntervalMs));
  }
  return file;
};

const advanceGuideWaitToElapsed = (
  source: WorkbenchHeatCapacityState,
  targetElapsedS: number,
  clock: TestClock,
) => {
  const waitStartedAtS = source.heatCapacityGuideWorkflow.waitStartedAtS;
  assert.notEqual(waitStartedAtS, null);
  const currentElapsedS = source.heatCapacityGuidePhysicsState.simulationTimeS - (waitStartedAtS ?? 0);
  const remainingS = Math.max(0, targetElapsedS - currentElapsedS);
  return stepHeatCapacityWorkbenchFile(
    source,
    nextTime(clock, Math.ceil(remainingS / 16 * 1_000)),
  );
};

const advanceFreeWaitToElapsed = (
  source: WorkbenchHeatCapacityState,
  targetElapsedS: number,
  clock: TestClock,
) => {
  const timer = deriveHeatCapacityFreeWorkbenchAttemptWaitTimer(source);
  assert.equal(timer.stage === 'u1-wait' || timer.stage === 'u2-wait', true);
  const remainingS = Math.max(0, targetElapsedS - timer.elapsedS);
  return stepHeatCapacityWorkbenchFile(
    source,
    nextTime(clock, Math.ceil(remainingS / 16 * 1_000)),
  );
};

const advanceGuidePumpReadyToU2Midpoint = (
  source: WorkbenchHeatCapacityState,
  clock: TestClock,
) => {
  let file = pumpGuideToTarget(source, clock);
  file = setHeatCapacityGuidePumpValveOpen(file, false, nextTime(clock, 100));
  file = setHeatCapacityGuideEquilibriumSpeedMultiplier(file, 16, nextTime(clock, 100));
  file = advanceGuideWaitToElapsed(file, HEAT_CAPACITY_STANDARD_OPERATION.waitAfterPumpS, clock);
  assert.equal(file.heatCapacityGuideWorkflow.step, 'recordU1Required');
  const u1Attempt = applyHeatCapacityGuideRecordWorkbenchState(file, 'u1', nextTime(clock, 1));
  assert.equal(u1Attempt.accepted, true);
  file = setHeatCapacityGuideStopcockOpen(u1Attempt.file, true, nextTime(clock, 100));
  file = stepHeatCapacityWorkbenchFile(
    file,
    nextTime(
      clock,
      HEAT_CAPACITY_RELEASE_TIMING.openingAnimationDurationMs +
        HEAT_CAPACITY_RELEASE_TIMING.autoDemoReleaseDurationS * 1_000,
    ),
  );
  assert.equal(file.heatCapacityGuideWorkflow.step, 'closeStopcockAfterReleaseRequired');
  file = setHeatCapacityGuideStopcockOpen(file, false, nextTime(clock, 1));
  file = stepHeatCapacityWorkbenchFile(
    file,
    nextTime(clock, HEAT_CAPACITY_RELEASE_TIMING.closingAnimationDurationMs),
  );
  assert.equal(file.heatCapacityGuideWorkflow.step, 'u2Waiting');
  file = setHeatCapacityGuideEquilibriumSpeedMultiplier(file, 16, nextTime(clock, 1));
  file = advanceGuideWaitToElapsed(file, HEAT_CAPACITY_STANDARD_OPERATION.waitAfterReleaseS / 2, clock);
  const elapsedS = file.heatCapacityGuidePhysicsState.simulationTimeS -
    (file.heatCapacityGuideWorkflow.waitStartedAtS ?? 0);
  assert.equal(Math.abs(elapsedS - HEAT_CAPACITY_STANDARD_OPERATION.waitAfterReleaseS / 2) < 1e-6, true);
  return file;
};

const advanceFreePumpReadyToU2Midpoint = (
  source: WorkbenchHeatCapacityState,
  clock: TestClock,
) => {
  let file = pumpFreeStandardSequence(source, clock);
  file = setHeatCapacityFreePumpValveOpen(file, false, nextTime(clock, 100));
  assert.equal(file.heatCapacityFreeActiveAttempt?.stage, 'waiting-u1');
  file = setHeatCapacityFreeEquilibriumSpeedMultiplier(file, 16, nextTime(clock, 100));
  file = advanceFreeWaitToElapsed(file, HEAT_CAPACITY_STANDARD_OPERATION.waitAfterPumpS, clock);
  const u1Attempt = applyHeatCapacityFreeRecordWorkbenchState(file, 'u1', nextTime(clock, 1));
  assert.equal(u1Attempt.accepted, true);
  file = setHeatCapacityFreeStopcockOpen(u1Attempt.file, true, nextTime(clock, 100));
  file = stepHeatCapacityWorkbenchFile(
    file,
    nextTime(
      clock,
      HEAT_CAPACITY_RELEASE_TIMING.openingAnimationDurationMs +
        HEAT_CAPACITY_RELEASE_TIMING.autoDemoReleaseDurationS * 1_000,
    ),
  );
  file = setHeatCapacityFreeStopcockOpen(file, false, nextTime(clock, 1));
  file = stepHeatCapacityWorkbenchFile(
    file,
    nextTime(clock, HEAT_CAPACITY_RELEASE_TIMING.closingAnimationDurationMs),
  );
  assert.equal(file.heatCapacityFreeActiveAttempt?.stage, 'waiting-u2');
  file = setHeatCapacityFreeEquilibriumSpeedMultiplier(file, 16, nextTime(clock, 1));
  file = advanceFreeWaitToElapsed(file, HEAT_CAPACITY_STANDARD_OPERATION.waitAfterReleaseS / 2, clock);
  const timer = deriveHeatCapacityFreeWorkbenchAttemptWaitTimer(file);
  assert.equal(timer.stage, 'u2-wait');
  assert.equal(Math.abs(timer.elapsedS - HEAT_CAPACITY_STANDARD_OPERATION.waitAfterReleaseS / 2) < 1e-6, true);
  return file;
};

const advanceToBreakpoint = (
  source: WorkbenchHeatCapacityState,
  mode: HeatCapacityMode,
  breakpoint: DomainBreakpoint,
  clock: TestClock,
) => {
  if (mode === 'demo') {
    return breakpoint === 'pump-ready'
      ? advanceDemoToPrePump(source, clock)
      : advanceDemoToU2Midpoint(source, clock);
  }
  const pumpReady = mode === 'guide'
    ? advanceGuideToPumpReady(source, clock)
    : advanceFreeToPumpReady(source, clock);
  if (breakpoint === 'pump-ready') return pumpReady;
  return mode === 'guide'
    ? advanceGuidePumpReadyToU2Midpoint(pumpReady, clock)
    : advanceFreePumpReadyToU2Midpoint(pumpReady, clock);
};

const completeGuideFromBreakpoint = (
  source: WorkbenchHeatCapacityState,
  breakpoint: DomainBreakpoint,
  clock: TestClock,
) => {
  let file = breakpoint === 'pump-ready'
    ? advanceGuidePumpReadyToU2Midpoint(source, clock)
    : source;
  file = advanceGuideWaitToElapsed(file, HEAT_CAPACITY_STANDARD_OPERATION.waitAfterReleaseS, clock);
  assert.equal(file.heatCapacityGuideWorkflow.step, 'recordU2Required');
  const u2Attempt = applyHeatCapacityGuideRecordWorkbenchState(file, 'u2', nextTime(clock, 1));
  assert.equal(u2Attempt.accepted, true);
  file = powerHeatCapacityWorkbenchFile(u2Attempt.file, false, nextTime(clock, 100));
  assert.equal(file.heatCapacityGuideWorkflow.step, 'completed');
  return file;
};

const completeFreeFromBreakpoint = (
  source: WorkbenchHeatCapacityState,
  breakpoint: DomainBreakpoint,
  clock: TestClock,
) => {
  let file = breakpoint === 'pump-ready'
    ? advanceFreePumpReadyToU2Midpoint(source, clock)
    : source;
  file = advanceFreeWaitToElapsed(file, HEAT_CAPACITY_STANDARD_OPERATION.waitAfterReleaseS, clock);
  const u2Attempt = applyHeatCapacityFreeRecordWorkbenchState(file, 'u2', nextTime(clock, 1));
  assert.equal(u2Attempt.accepted, true);
  file = powerHeatCapacityWorkbenchFile(u2Attempt.file, false, nextTime(clock, 100));
  assert.equal(file.heatCapacityFreeActiveAttempt, null);
  assert.notEqual(file.heatCapacityFreeTrials.at(-1)?.completedAtMs, null);
  return file;
};

const completeFromBreakpoint = (
  source: WorkbenchHeatCapacityState,
  mode: HeatCapacityMode,
  breakpoint: DomainBreakpoint,
  clock: TestClock,
) => {
  if (mode === 'demo') {
    return completeHeatCapacityTeachingModeWorkbenchState(source, nextTime(clock, 100));
  }
  return mode === 'guide'
    ? completeGuideFromBreakpoint(source, breakpoint, clock)
    : completeFreeFromBreakpoint(source, breakpoint, clock);
};

const completeFreshMode = (
  source: WorkbenchHeatCapacityState,
  mode: HeatCapacityMode,
  clock: TestClock,
) => {
  const activated = activateFreshMode(source, mode, clock);
  const baselineClock = forkClock(clock);
  const baseline = mode === 'demo'
    ? completeHeatCapacityTeachingModeWorkbenchState(activated, nextTime(baselineClock, 100))
    : completeFromBreakpoint(
        advanceToBreakpoint(activated, mode, 'pump-ready', baselineClock),
        mode,
        'pump-ready',
        baselineClock,
      );
  const actual = mode === 'demo'
    ? completeHeatCapacityTeachingModeWorkbenchState(activated, nextTime(clock, 100))
    : completeFromBreakpoint(
        advanceToBreakpoint(activated, mode, 'pump-ready', clock),
        mode,
        'pump-ready',
        clock,
      );
  assert.deepEqual(selectCompletedModeResult(actual), selectCompletedModeResult(baseline));
  return actual;
};

const getDemoTimelineCheckpoint = (breakpoint: DomainBreakpoint) => {
  const timeline = getHeatCapacityAutoDemoTimeline(createHeatCapacityAutoDemoSteps());
  if (breakpoint === 'pump-ready') {
    const prePumpItemIndex = timeline.findIndex((item) => item.step.id === 'open-pump-valve');
    assert.notEqual(prePumpItemIndex, -1);
    const item = timeline[prePumpItemIndex];
    return {
      elapsedMs: item.atMs,
      itemIndex: prePumpItemIndex,
      item,
    };
  }
  const recoveryStepIndex = createHeatCapacityAutoDemoSteps().findIndex((step) => step.id === 'thermal-recovery');
  assert.notEqual(recoveryStepIndex, -1);
  const recoveryStartMs = Math.min(
    ...timeline
      .filter((item) => item.stepIndex === recoveryStepIndex)
      .map((item) => item.atMs),
  );
  const elapsedMs = recoveryStartMs +
    HEAT_CAPACITY_STANDARD_OPERATION.waitAfterReleaseS / 2 /
      HEAT_CAPACITY_AUTO_DEMO_WAIT_SPEED_MULTIPLIER * 1_000;
  let itemIndex = -1;
  timeline.forEach((item, index) => {
    if (item.atMs <= elapsedMs) itemIndex = index;
  });
  assert.notEqual(itemIndex, -1);
  const item = timeline[itemIndex];
  return {
    elapsedMs,
    itemIndex,
    item,
  };
};

const createSuspensionUiCheckpoint = (
  file: WorkbenchHeatCapacityState,
  mode: HeatCapacityMode,
  breakpoint: DomainBreakpoint,
  now: number,
) => {
  const checkpoint = createWorkbenchHeatCapacityRefreshSession(file.id, mode, now);
  if (mode !== 'demo') return createModeUiCheckpointFromRefreshFixture(checkpoint);
  const demoPoint = getDemoTimelineCheckpoint(breakpoint);
  return createModeUiCheckpointFromRefreshFixture({
    ...checkpoint,
    demo: {
      ...checkpoint.demo,
      phase: 'running' as const,
      elapsedMs: demoPoint.elapsedMs,
      timeline: {
        ...checkpoint.demo.timeline,
        currentItemIndex: demoPoint.itemIndex,
        nextItemIndex: demoPoint.itemIndex + 1,
        currentStage: demoPoint.item.stage,
        currentStepId: demoPoint.item.step.id,
        currentStepIndex: demoPoint.item.stepIndex,
        currentActionId: demoPoint.item.action?.action ?? null,
        itemStartedAtElapsedMs: demoPoint.item.atMs,
      },
      stepPanel: {
        mode: 'visible' as const,
        stepIndex: demoPoint.item.stepIndex + 1,
        stepCount: createHeatCapacityAutoDemoSteps().length,
        title: demoPoint.item.step.title,
        description: demoPoint.item.step.description,
        target: demoPoint.item.step.target,
        progressCriterion: demoPoint.item.step.progressCriterion,
        note: demoPoint.item.step.note,
      },
      cameraMode: demoPoint.item.cameraFocusMode ?? null,
    },
  });
};

const normalizeRestoredSnapshot = (
  snapshot: HeatCapacityModeRuntimeSnapshot,
) => ({
  ...snapshot,
  common: {
    ...snapshot.common,
    runState: 'idle' as const,
    lastUpdateMs: null,
    displayResponseLastUpdateMs: null,
  },
});

const assertRestoredSnapshot = (
  restored: WorkbenchHeatCapacityState,
  expected: HeatCapacityModeRuntimeSnapshot,
) => {
  const actual = captureHeatCapacityModeRuntimeSnapshot(restored);
  assert.equal(actual.mode, expected.mode);
  if (expected.mode === 'demo') {
    assert.equal(restored.runState, 'paused', 'restored Demo sessions must wait for an explicit resume');
  } else {
    assert.equal(restored.runState, expected.common.runState);
  }
  assert.deepEqual(normalizeRestoredSnapshot(actual), normalizeRestoredSnapshot(expected));
};

function selectCompletedModeResult(file: WorkbenchHeatCapacityState) {
  if (file.heatCapacityMode === 'free') {
    const trial = file.heatCapacityFreeTrials.at(-1);
    assert.notEqual(trial, undefined);
    assert.notEqual(trial?.u0, null);
    assert.notEqual(trial?.u1, null);
    assert.notEqual(trial?.u2, null);
    assert.notEqual(trial?.correctedSignals, null);
    const review = selectHeatCapacityFreeProcessReview({
      trials: file.heatCapacityFreeTrials,
      traceStore: file.heatCapacityFreeTraceStore,
      theoreticalGamma: file.theoreticalGamma,
      selectedTrialId: trial?.id,
    });
    assert.equal(review.status, 'ready');
    assert.notEqual(review.score.total, null);
    return {
      mode: 'free' as const,
      groupStatus: file.heatCapacityFreeExperimentGroupStatus,
      u0: trial?.u0?.displayPressureMv,
      u1: trial?.u1?.displayPressureMv,
      u2: trial?.u2?.displayPressureMv,
      corrected: trial?.correctedSignals,
      score: review.score.total,
    };
  }
  const trial = file.heatCapacityGuideTrial;
  assert.equal(file.heatCapacityTeachingStatus, 'completed');
  assert.notEqual(trial, null);
  assert.notEqual(trial?.u0, null);
  assert.notEqual(trial?.u1, null);
  assert.notEqual(trial?.u2, null);
  assert.notEqual(trial?.correctedSignals, null);
  return {
    mode: file.heatCapacityMode,
    teachingStatus: file.heatCapacityTeachingStatus,
    source: trial?.source,
    u0: trial?.u0?.displayPressureMv,
    u1: trial?.u1?.displayPressureMv,
    u2: trial?.u2?.displayPressureMv,
    corrected: trial?.correctedSignals,
  };
}

const prepareSuspendedModeFixture = (
  source: WorkbenchHeatCapacityState,
  mode: HeatCapacityMode,
  breakpoint: DomainBreakpoint,
  clock: TestClock,
): SuspendedModeFixture => {
  const activated = activateFreshMode(source, mode, clock);
  const baselineClock = forkClock(clock);
  const baselineBreakpoint = advanceToBreakpoint(activated, mode, breakpoint, baselineClock);
  const baselineCompleted = completeFromBreakpoint(baselineBreakpoint, mode, breakpoint, baselineClock);
  const actualBreakpoint = advanceToBreakpoint(activated, mode, breakpoint, clock);
  return {
    file: actualBreakpoint,
    expectedSnapshot: captureHeatCapacityModeRuntimeSnapshot(actualBreakpoint),
    expectedResult: selectCompletedModeResult(baselineCompleted),
    uiCheckpoint: createSuspensionUiCheckpoint(actualBreakpoint, mode, breakpoint, clock.nowMs),
  };
};

const suspendFixture = (
  fixture: SuspendedModeFixture,
  clock: TestClock,
) => suspendHeatCapacityModeSession(
  fixture.file,
  fixture.uiCheckpoint,
  nextTime(clock, 1),
);

const suspendCompletedMode = (
  file: WorkbenchHeatCapacityState,
  clock: TestClock,
) => suspendHeatCapacityModeSession(
  file,
  createModeUiCheckpointFromRefreshFixture(
    createWorkbenchHeatCapacityRefreshSession(file.id, file.heatCapacityMode, clock.nowMs),
  ),
  nextTime(clock, 1),
);

const restoreFixture = (
  source: WorkbenchHeatCapacityState,
  fixture: SuspendedModeFixture,
  clock: TestClock,
) => {
  const restored = restoreHeatCapacityModeSession(source, fixture.expectedSnapshot.mode, nextTime(clock, 100));
  assert.notEqual(restored, null);
  assertRestoredSnapshot(restored!, fixture.expectedSnapshot);
  if (fixture.expectedSnapshot.mode === 'demo') {
    const storedCheckpoint = restored!.heatCapacityModeSessions.demo.uiCheckpoint;
    assert.equal(storedCheckpoint?.mode, 'demo');
    if (storedCheckpoint?.mode !== 'demo' || fixture.uiCheckpoint.mode !== 'demo') {
      throw new Error('Expected a Demo UI checkpoint.');
    }
    assert.equal(storedCheckpoint.payload.demo.phase, 'running');
    assert.equal(
      storedCheckpoint.payload.demo.elapsedMs,
      fixture.uiCheckpoint.payload.demo.elapsedMs,
    );
  }
  return restored!;
};

const runSessionRoute = (
  route: Route,
  breakpoint: DomainBreakpoint,
  routeIndex: number,
) => {
  const clock: TestClock = { nowMs: 1_000_000 + routeIndex * 1_000_000 };
  let file = createDefaultHeatCapacityFile(700 + routeIndex);
  const first = prepareSuspendedModeFixture(file, route[0], breakpoint, clock);
  file = suspendFixture(first, clock);

  if (route.length === 3) {
    file = completeFreshMode(file, route[1], clock);
    file = suspendCompletedMode(file, clock);
    file = restoreFixture(file, first, clock);
    file = completeFromBreakpoint(file, route[0], breakpoint, clock);
    assert.deepEqual(selectCompletedModeResult(file), first.expectedResult);
    return;
  }

  const second = prepareSuspendedModeFixture(file, route[1], breakpoint, clock);
  file = suspendFixture(second, clock);
  file = completeFreshMode(file, route[2], clock);
  file = suspendCompletedMode(file, clock);
  file = restoreFixture(file, second, clock);
  file = completeFromBreakpoint(file, route[1], breakpoint, clock);
  assert.deepEqual(selectCompletedModeResult(file), second.expectedResult);
  file = suspendCompletedMode(file, clock);
  file = restoreFixture(file, first, clock);
  file = completeFromBreakpoint(file, route[0], breakpoint, clock);
  assert.deepEqual(selectCompletedModeResult(file), first.expectedResult);
};

const allModes: readonly HeatCapacityMode[] = ['demo', 'guide', 'free'];
const pumpRoutes: Route[] = [
  ...allModes.flatMap((first) => allModes
    .filter((second) => second !== first)
    .map((second) => [first, second, first] as const)),
  ...allModes.flatMap((first) => allModes
    .filter((second) => second !== first)
    .flatMap((second) => allModes
      .filter((third) => third !== first && third !== second)
      .map((third) => [first, second, third, second, first] as const))),
];

assert.equal(pumpRoutes.length, 12);
pumpRoutes.forEach((route, routeIndex) => {
  runSessionRoute(route, 'pump-ready', routeIndex);
});

const u2DomainRoutes: Route[] = pumpRoutes;

u2DomainRoutes.forEach((route, routeIndex) => {
  runSessionRoute(route, 'u2-recovery-midpoint', pumpRoutes.length + routeIndex);
});

// Demo's visible wait clock is owned by the UI timeline. The route fixtures above
// pair its real scripted Workbench state with this exact public 150/300 s instant.
{
  const timeline = getHeatCapacityAutoDemoTimeline(createHeatCapacityAutoDemoSteps());
  const recoveryStepIndex = createHeatCapacityAutoDemoSteps().findIndex((step) => step.id === 'thermal-recovery');
  assert.notEqual(recoveryStepIndex, -1);
  const recoveryItems = timeline.filter((item) => item.stepIndex === recoveryStepIndex);
  const recoveryStartedAtMs = Math.min(...recoveryItems.map((item) => item.atMs));
  const recoveryMidpointElapsedMs = recoveryStartedAtMs +
    HEAT_CAPACITY_STANDARD_OPERATION.waitAfterReleaseS / 2 /
      HEAT_CAPACITY_AUTO_DEMO_WAIT_SPEED_MULTIPLIER * 1_000;
  const timer = deriveHeatCapacityAutoDemoWaitTimer(timeline, recoveryMidpointElapsedMs);
  assert.deepEqual(timer, {
    stage: 'u2',
    elapsedS: HEAT_CAPACITY_STANDARD_OPERATION.waitAfterReleaseS / 2,
    targetS: HEAT_CAPACITY_STANDARD_OPERATION.waitAfterReleaseS,
    speedMultiplier: HEAT_CAPACITY_AUTO_DEMO_WAIT_SPEED_MULTIPLIER,
    phase: 'active',
  });
}

console.log(
  `heatCapacityModeSessionRouteIntegration tests passed (${pumpRoutes.length} pre-pump routes, ` +
    `${u2DomainRoutes.length} U2 midpoint routes with Demo timeline semantics)`,
);
