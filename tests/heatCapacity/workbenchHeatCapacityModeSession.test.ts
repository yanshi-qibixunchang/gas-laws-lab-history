import assert from 'node:assert/strict';
import {
  clearHeatCapacityModeSession,
  createDefaultHeatCapacityModeSessionStore,
  normalizeHeatCapacityModeSessionStore,
  prepareHeatCapacityModeSessionForExit,
  restoreHeatCapacityModeSession,
  suspendHeatCapacityModeSession,
} from '../../src/features/workbench/workbenchHeatCapacityModeSession.ts';
import {
  createHeatCapacityModeDeferredTimer,
  createHeatCapacityModeUiCheckpoint,
  type HeatCapacityModeUiCheckpoint,
} from '../../src/features/heatCapacity/heatCapacityModeUiCheckpoint.ts';
import {
  adjustHeatCapacityPressureZeroFine,
  applyHeatCapacityFreeRecordWorkbenchState,
  applyHeatCapacityGuideRecordWorkbenchState,
  completeHeatCapacityFreePreheatWorkbenchState,
  completeHeatCapacityGuidePreheatWorkbenchState,
  completeHeatCapacityTeachingModeWorkbenchState,
  configureHeatCapacityFreeBatchWorkbenchState,
  createDefaultHeatCapacityFile,
  deriveHeatCapacityFreeWorkbenchAttemptWaitTimer,
  enterHeatCapacityFreeModeWorkbenchState,
  freezeHeatCapacityFreeParametersForCurrentGroup,
  getHeatCapacityPressureZeroKnobAngleForOffset,
  powerHeatCapacityWorkbenchFile,
  prepareHeatCapacityAutoDemoReset,
  prepareHeatCapacityAutoDemoStart,
  registerHeatCapacityPumpStroke,
  setHeatCapacityFreeEquilibriumSpeedMultiplier,
  setHeatCapacityFreePumpValveOpen,
  setHeatCapacityFreeStopcockOpen,
  setHeatCapacityGuideEquilibriumSpeedMultiplier,
  setHeatCapacityGuidePumpValveOpen,
  setHeatCapacityGuideStopcockOpen,
  setHeatCapacityPressureZeroOffset,
  setHeatCapacityScriptedStopcockOpen,
  startHeatCapacityGuideWorkbenchState,
  stepHeatCapacityWorkbenchFile,
  type WorkbenchHeatCapacityState,
} from '../../src/features/workbench/workbenchState.ts';
import {
  HEAT_CAPACITY_RELEASE_TIMING,
  HEAT_CAPACITY_STANDARD_OPERATION,
  HEAT_CAPACITY_STANDARD_PUMP_STROKE_INTERVAL_S,
} from '../../src/domain/heatCapacity/heatCapacityDefaultConfig.ts';
import { createDefaultFreeConfigSnapshot } from '../../src/domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  calculateFreeHeatCapacityTrialSignals,
  createHeatCapacityFreeTrial,
} from '../../src/domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import {
  projectWorkbenchPersistenceV3File,
} from '../../src/features/workbench/persistenceV3/projection.ts';
import {
  createHeatCapacityGuideTrial,
} from '../../src/domain/heatCapacity/heatCapacityGuideTrialModel.ts';

const createGuideUiCheckpoint = (
  fileId: string,
  capturedAtMs: number,
  pendingRemainingMs: number | null,
  baseRemainingMs: number | null,
): HeatCapacityModeUiCheckpoint => createHeatCapacityModeUiCheckpoint({
  fileId,
  checkpointId: `${fileId}:${capturedAtMs}`,
  capturedAtMs,
  mode: 'guide',
  scene: {
    focusMode: 'none',
    cameraPose: null,
    cameraTransition: null,
    ultraVisualState: null,
    hardSphereVisualCheckpoint: null,
    focusSession: null,
  },
  pumpAnimation: null,
  payload: {
    kind: 'guide',
    guide: {
      missCount: 0,
      normalReminder: null,
      strongReminder: { active: false, controlId: null },
      lessonDialog: null,
      shownLessonIds: [],
      checklistViewedIndex: 0,
      pendingStrongReminder: pendingRemainingMs === null
        ? null
        : {
            controlId: 'recordU1',
            timer: createHeatCapacityModeDeferredTimer(pendingRemainingMs)!,
          },
      baseStrongReminder: baseRemainingMs === null
        ? null
        : {
            controlId: 'recordU1',
            timer: createHeatCapacityModeDeferredTimer(baseRemainingMs)!,
          },
    },
  },
});

const cloneUnknown = <Value>(value: Value): Value => structuredClone(value);

const FREE_COMMON_PRESSURE_PROJECTION_KEYS = [
  'pressureInitialBiasMv',
  'pressureSignalMvRaw',
  'pressureSignalMvDisplayed',
  'pressureSignalTargetMv',
  'pressureSignalRawReadoutMv',
  'pressureSignalReadoutMv',
] as const;

const getEntryRecord = (
  store: unknown,
  mode: 'demo' | 'guide' | 'free',
) => (store as Record<string, unknown>)[mode] as Record<string, unknown>;

interface GuideFixtureClock {
  nowMs: number;
}

const advanceGuideFixtureClock = (clock: GuideFixtureClock, deltaMs: number) => {
  clock.nowMs += deltaMs;
  return clock.nowMs;
};

const stabilizeGuideFixtureZero = (
  source: WorkbenchHeatCapacityState,
  clock: GuideFixtureClock,
) => {
  const zeroOffsetMv = -source.pressureInitialBiasMv;
  const knobAngle = getHeatCapacityPressureZeroKnobAngleForOffset(zeroOffsetMv);
  let file = source;
  for (let sampleIndex = 0; sampleIndex < 5; sampleIndex += 1) {
    file = setHeatCapacityPressureZeroOffset(
      file,
      zeroOffsetMv,
      'coarseDrag',
      knobAngle,
      advanceGuideFixtureClock(clock, 10),
    );
  }
  return file;
};

const createGuideWaitingU1Fixture = (
  source: WorkbenchHeatCapacityState,
  clock: GuideFixtureClock,
) => {
  let file = startHeatCapacityGuideWorkbenchState(
    source,
    advanceGuideFixtureClock(clock, 10),
  );
  file = powerHeatCapacityWorkbenchFile(file, true, advanceGuideFixtureClock(clock, 10));
  file = completeHeatCapacityGuidePreheatWorkbenchState(
    file,
    advanceGuideFixtureClock(clock, 10),
  );
  file = setHeatCapacityGuideStopcockOpen(file, true, advanceGuideFixtureClock(clock, 10));
  file = stepHeatCapacityWorkbenchFile(
    file,
    advanceGuideFixtureClock(clock, HEAT_CAPACITY_RELEASE_TIMING.openingAnimationDurationMs),
  );
  file = stabilizeGuideFixtureZero(file, clock);
  file = stepHeatCapacityWorkbenchFile(file, advanceGuideFixtureClock(clock, 100));
  const u0Attempt = applyHeatCapacityGuideRecordWorkbenchState(
    file,
    'u0',
    advanceGuideFixtureClock(clock, 10),
  );
  assert.equal(u0Attempt.accepted, true);
  file = setHeatCapacityGuideStopcockOpen(
    u0Attempt.file,
    false,
    advanceGuideFixtureClock(clock, 10),
  );
  file = stepHeatCapacityWorkbenchFile(
    file,
    advanceGuideFixtureClock(clock, HEAT_CAPACITY_RELEASE_TIMING.closingAnimationDurationMs),
  );
  file = setHeatCapacityGuidePumpValveOpen(file, true, advanceGuideFixtureClock(clock, 10));
  const strokeIntervalMs = Math.max(
    10,
    Math.round(HEAT_CAPACITY_STANDARD_PUMP_STROKE_INTERVAL_S * 1_000),
  );
  for (
    let strokeIndex = 0;
    strokeIndex < 40 && file.heatCapacityGuideWorkflow.step !== 'closePumpValveRequired';
    strokeIndex += 1
  ) {
    file = registerHeatCapacityPumpStroke(
      file,
      advanceGuideFixtureClock(clock, strokeIntervalMs),
    );
  }
  assert.equal(file.heatCapacityGuideWorkflow.step, 'closePumpValveRequired');
  file = setHeatCapacityGuidePumpValveOpen(file, false, advanceGuideFixtureClock(clock, 10));
  assert.equal(file.heatCapacityGuideWorkflow.step, 'u1Waiting');
  return file;
};

const advanceGuideFixtureWait = (
  source: WorkbenchHeatCapacityState,
  clock: GuideFixtureClock,
) => {
  const waitStartedAtS = source.heatCapacityGuideWorkflow.waitStartedAtS;
  assert.notEqual(waitStartedAtS, null);
  const elapsedS = source.heatCapacityGuidePhysicsState.simulationTimeS - (waitStartedAtS ?? 0);
  const targetWaitS = source.heatCapacityGuideWorkflow.waitStage === 'u2'
    ? HEAT_CAPACITY_STANDARD_OPERATION.waitAfterReleaseS
    : HEAT_CAPACITY_STANDARD_OPERATION.waitAfterPumpS;
  const remainingS = Math.max(0, targetWaitS - elapsedS);
  return stepHeatCapacityWorkbenchFile(
    source,
    advanceGuideFixtureClock(clock, Math.ceil(remainingS / 16 * 1_000)),
  );
};

const createGuideClosingFixture = (
  waitingU1Source: WorkbenchHeatCapacityState,
  clock: GuideFixtureClock,
) => {
  let file = setHeatCapacityGuideEquilibriumSpeedMultiplier(
    waitingU1Source,
    16,
    advanceGuideFixtureClock(clock, 10),
  );
  file = advanceGuideFixtureWait(file, clock);
  assert.equal(file.heatCapacityGuideWorkflow.step, 'recordU1Required');
  const u1Attempt = applyHeatCapacityGuideRecordWorkbenchState(
    file,
    'u1',
    advanceGuideFixtureClock(clock, 10),
  );
  assert.equal(u1Attempt.accepted, true);
  file = setHeatCapacityGuideStopcockOpen(
    u1Attempt.file,
    true,
    advanceGuideFixtureClock(clock, 10),
  );
  file = stepHeatCapacityWorkbenchFile(
    file,
    advanceGuideFixtureClock(
      clock,
      HEAT_CAPACITY_RELEASE_TIMING.openingAnimationDurationMs +
        HEAT_CAPACITY_RELEASE_TIMING.autoDemoReleaseDurationS * 1_000,
    ),
  );
  assert.equal(file.heatCapacityGuideWorkflow.step, 'closeStopcockAfterReleaseRequired');
  file = setHeatCapacityGuideStopcockOpen(file, false, advanceGuideFixtureClock(clock, 10));
  assert.equal(file.heatCapacityReleaseState.phase, 'closing');
  assert.notEqual(file.heatCapacityGuideWorkflow.releaseCloseResumeAtMs, null);
  return file;
};

const completeGuideFixture = (
  waitingU1Source: WorkbenchHeatCapacityState,
  clock: GuideFixtureClock,
) => {
  let file = createGuideClosingFixture(waitingU1Source, clock);
  file = stepHeatCapacityWorkbenchFile(
    file,
    advanceGuideFixtureClock(clock, HEAT_CAPACITY_RELEASE_TIMING.closingAnimationDurationMs),
  );
  assert.equal(file.heatCapacityGuideWorkflow.step, 'u2Waiting');
  file = advanceGuideFixtureWait(file, clock);
  assert.equal(file.heatCapacityGuideWorkflow.step, 'recordU2Required');
  const u2Attempt = applyHeatCapacityGuideRecordWorkbenchState(
    file,
    'u2',
    advanceGuideFixtureClock(clock, 10),
  );
  assert.equal(u2Attempt.accepted, true);
  file = powerHeatCapacityWorkbenchFile(u2Attempt.file, false, advanceGuideFixtureClock(clock, 10));
  assert.equal(file.heatCapacityGuideWorkflow.step, 'completed');
  return file;
};

const stabilizeFreeFixtureZero = (
  source: WorkbenchHeatCapacityState,
  clock: GuideFixtureClock,
) => {
  const zeroOffsetMv = -source.heatCapacityFreeInstrumentState.sensor.pressureInitialBiasMv;
  const knobAngle = getHeatCapacityPressureZeroKnobAngleForOffset(zeroOffsetMv);
  let file = source;
  for (let sampleIndex = 0; sampleIndex < 5; sampleIndex += 1) {
    file = setHeatCapacityPressureZeroOffset(
      file,
      zeroOffsetMv,
      'coarseDrag',
      knobAngle,
      advanceGuideFixtureClock(clock, 200),
    );
  }
  return file;
};

const advanceFreeFixtureWait = (
  source: WorkbenchHeatCapacityState,
  clock: GuideFixtureClock,
) => {
  const timer = deriveHeatCapacityFreeWorkbenchAttemptWaitTimer(source);
  assert.equal(timer.stage === 'u1-wait' || timer.stage === 'u2-wait', true);
  return stepHeatCapacityWorkbenchFile(
    source,
    advanceGuideFixtureClock(clock, Math.ceil(timer.remainingS / 16 * 1_000)),
  );
};

const createCompletedFreeFixture = (
  source: WorkbenchHeatCapacityState,
  clock: GuideFixtureClock,
  waitForRecommendedDuration = true,
  onRecordCheckpoint?: (
    stage: 'u1-recorded' | 'u2-recorded',
    file: WorkbenchHeatCapacityState,
    clock: GuideFixtureClock,
  ) => void,
) => {
  let file = enterHeatCapacityFreeModeWorkbenchState(
    source,
    advanceGuideFixtureClock(clock, 100),
  );
  file = configureHeatCapacityFreeBatchWorkbenchState(
    file,
    3,
    advanceGuideFixtureClock(clock, 10),
  );
  file = powerHeatCapacityWorkbenchFile(file, true, advanceGuideFixtureClock(clock, 100));
  file = completeHeatCapacityFreePreheatWorkbenchState(
    file,
    advanceGuideFixtureClock(clock, 5_000),
  );
  file = setHeatCapacityFreeStopcockOpen(file, true, advanceGuideFixtureClock(clock, 100));
  file = stepHeatCapacityWorkbenchFile(
    file,
    advanceGuideFixtureClock(clock, HEAT_CAPACITY_RELEASE_TIMING.openingAnimationDurationMs),
  );
  file = stabilizeFreeFixtureZero(file, clock);
  file = stepHeatCapacityWorkbenchFile(file, advanceGuideFixtureClock(clock, 1_000));
  const u0Attempt = applyHeatCapacityFreeRecordWorkbenchState(
    file,
    'u0',
    advanceGuideFixtureClock(clock, 100),
  );
  assert.equal(u0Attempt.accepted, true);
  file = setHeatCapacityFreeStopcockOpen(
    u0Attempt.file,
    false,
    advanceGuideFixtureClock(clock, 100),
  );
  file = stepHeatCapacityWorkbenchFile(
    file,
    advanceGuideFixtureClock(clock, HEAT_CAPACITY_RELEASE_TIMING.closingAnimationDurationMs),
  );
  file = setHeatCapacityFreePumpValveOpen(file, true, advanceGuideFixtureClock(clock, 100));
  const strokeIntervalMs = Math.round(HEAT_CAPACITY_STANDARD_PUMP_STROKE_INTERVAL_S * 1_000);
  for (let strokeIndex = 0; strokeIndex < HEAT_CAPACITY_STANDARD_OPERATION.pumpStrokes; strokeIndex += 1) {
    file = registerHeatCapacityPumpStroke(
      file,
      advanceGuideFixtureClock(clock, strokeIntervalMs),
    );
  }
  file = setHeatCapacityFreePumpValveOpen(file, false, advanceGuideFixtureClock(clock, 100));
  file = setHeatCapacityFreeEquilibriumSpeedMultiplier(
    file,
    16,
    advanceGuideFixtureClock(clock, 100),
  );
  if (waitForRecommendedDuration) {
    file = advanceFreeFixtureWait(file, clock);
  }
  const u1Attempt = applyHeatCapacityFreeRecordWorkbenchState(
    file,
    'u1',
    advanceGuideFixtureClock(clock, 10),
  );
  assert.equal(u1Attempt.accepted, true);
  onRecordCheckpoint?.('u1-recorded', u1Attempt.file, clock);
  file = setHeatCapacityFreeStopcockOpen(
    u1Attempt.file,
    true,
    advanceGuideFixtureClock(clock, 100),
  );
  file = stepHeatCapacityWorkbenchFile(
    file,
    advanceGuideFixtureClock(
      clock,
      HEAT_CAPACITY_RELEASE_TIMING.openingAnimationDurationMs +
        HEAT_CAPACITY_RELEASE_TIMING.autoDemoReleaseDurationS * 1_000,
    ),
  );
  file = setHeatCapacityFreeStopcockOpen(file, false, advanceGuideFixtureClock(clock, 10));
  file = stepHeatCapacityWorkbenchFile(
    file,
    advanceGuideFixtureClock(clock, HEAT_CAPACITY_RELEASE_TIMING.closingAnimationDurationMs),
  );
  if (waitForRecommendedDuration) {
    file = advanceFreeFixtureWait(file, clock);
  }
  const u2Attempt = applyHeatCapacityFreeRecordWorkbenchState(
    file,
    'u2',
    advanceGuideFixtureClock(clock, 10),
  );
  assert.equal(u2Attempt.accepted, true);
  onRecordCheckpoint?.('u2-recorded', u2Attempt.file, clock);
  file = powerHeatCapacityWorkbenchFile(u2Attempt.file, false, advanceGuideFixtureClock(clock, 100));
  assert.equal(file.heatCapacityFreeRunWorkspace.activeAttempt, null);
  assert.notEqual(file.heatCapacityFreeRunWorkspace.trials.at(-1)?.standardReferenceSnapshot, null);
  return file;
};

const createFreePumpingFixture = (
  source: WorkbenchHeatCapacityState,
  clock: GuideFixtureClock,
) => {
  let file = enterHeatCapacityFreeModeWorkbenchState(
    source,
    advanceGuideFixtureClock(clock, 100),
  );
  file = configureHeatCapacityFreeBatchWorkbenchState(
    file,
    3,
    advanceGuideFixtureClock(clock, 10),
  );
  file = powerHeatCapacityWorkbenchFile(file, true, advanceGuideFixtureClock(clock, 100));
  file = completeHeatCapacityFreePreheatWorkbenchState(
    file,
    advanceGuideFixtureClock(clock, 5_000),
  );
  file = setHeatCapacityFreeStopcockOpen(file, true, advanceGuideFixtureClock(clock, 100));
  file = stepHeatCapacityWorkbenchFile(
    file,
    advanceGuideFixtureClock(clock, HEAT_CAPACITY_RELEASE_TIMING.openingAnimationDurationMs),
  );
  file = stabilizeFreeFixtureZero(file, clock);
  file = stepHeatCapacityWorkbenchFile(file, advanceGuideFixtureClock(clock, 1_000));
  const u0Attempt = applyHeatCapacityFreeRecordWorkbenchState(
    file,
    'u0',
    advanceGuideFixtureClock(clock, 100),
  );
  assert.equal(u0Attempt.accepted, true);
  file = setHeatCapacityFreeStopcockOpen(
    u0Attempt.file,
    false,
    advanceGuideFixtureClock(clock, 100),
  );
  file = stepHeatCapacityWorkbenchFile(
    file,
    advanceGuideFixtureClock(clock, HEAT_CAPACITY_RELEASE_TIMING.closingAnimationDurationMs),
  );
  file = setHeatCapacityFreePumpValveOpen(file, true, advanceGuideFixtureClock(clock, 100));
  const strokeIntervalMs = Math.round(HEAT_CAPACITY_STANDARD_PUMP_STROKE_INTERVAL_S * 1_000);
  for (let strokeIndex = 0; strokeIndex < 9; strokeIndex += 1) {
    file = registerHeatCapacityPumpStroke(
      file,
      advanceGuideFixtureClock(clock, strokeIntervalMs),
    );
  }
  assert.equal(file.heatCapacityFreeRunWorkspace.activeAttempt?.stage, 'pumping');
  assert.equal(file.heatCapacityFreeInstrumentState.physics.pumpStrokeCount, 9);
  return file;
};

const freeFixtureClock: GuideFixtureClock = { nowMs: 100 };
const freeSource = createFreePumpingFixture(createDefaultHeatCapacityFile(1), freeFixtureClock);
const freeCapturedAtMs = advanceGuideFixtureClock(freeFixtureClock, 10);

for (const index of [1, 2, 3, 20]) {
  const pristineFreeFile = createDefaultHeatCapacityFile(index);
  const pristineFreeSuspendedFile = suspendHeatCapacityModeSession(
    pristineFreeFile,
    null,
    1_000 + index,
  );
  const pristineFreeStore = pristineFreeSuspendedFile.heatCapacityModeSessions;
  const normalizedPristineFree = normalizeHeatCapacityModeSessionStore(
    cloneUnknown(pristineFreeStore),
    pristineFreeFile.id,
  );
  assert.equal(
    normalizedPristineFree.free.status,
    'suspended',
    'an untouched power-off Free instrument must remain canonical while its teaching projection stays zero',
  );
  assert.deepEqual(
    normalizedPristineFree.free,
    pristineFreeStore.free,
    'the pristine Free exception must preserve the original current-v2 record without rewriting user data',
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      normalizedPristineFree.free.snapshot?.mode === 'free'
        ? normalizedPristineFree.free.snapshot.free
        : {},
      'heatCapacityFreeActiveRunConfigSnapshot',
    ),
    true,
    'persisted mode-session snapshots must retain the compatibility projection',
  );
  const pristineFreeRestored = restoreHeatCapacityModeSession(
    pristineFreeSuspendedFile,
    'free',
    2_000 + index,
  );
  assert.notEqual(pristineFreeRestored, null);
  if (pristineFreeRestored) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(
        pristineFreeRestored,
        'heatCapacityFreeActiveRunConfigSnapshot',
      ),
      false,
      'restoring a mode session must not leak the retired projection into current state',
    );
    const pristineFreeResuspended = suspendHeatCapacityModeSession(
      pristineFreeRestored,
      null,
      3_000 + index,
    );
    assert.equal(
      normalizeHeatCapacityModeSessionStore(
        cloneUnknown(pristineFreeResuspended.heatCapacityModeSessions),
        pristineFreeFile.id,
      ).free.status,
      'suspended',
      'restoring and re-suspending a pristine Free mode must remain in the persistable-state closure',
    );
  }
}

const partiallyChangedPristineFreeFile = createDefaultHeatCapacityFile(21);
const partiallyChangedPristineFreeStore = cloneUnknown(
  suspendHeatCapacityModeSession(partiallyChangedPristineFreeFile, null, 1_021)
    .heatCapacityModeSessions,
);
const partiallyChangedPristineFreeSnapshot = getEntryRecord(
  partiallyChangedPristineFreeStore,
  'free',
).snapshot as Record<string, unknown>;
(partiallyChangedPristineFreeSnapshot.common as Record<string, unknown>).pressureSignalMvRaw = 0.01;
assert.equal(
  normalizeHeatCapacityModeSessionStore(
    partiallyChangedPristineFreeStore,
    partiallyChangedPristineFreeFile.id,
  ).free.status,
  'empty',
  'the pristine Free exception must require all six historical teaching pressure projections to remain exactly zero',
);

const prePowerZeroSource = adjustHeatCapacityPressureZeroFine(
  createDefaultHeatCapacityFile(92),
  1,
  950,
);
assert.equal(prePowerZeroSource.powerOn, false);
assert.equal(prePowerZeroSource.heatCapacityPhase, 'readyToPump');
const prePowerZeroSuspended = suspendHeatCapacityModeSession(prePowerZeroSource, null, 1_000);
assert.equal(
  normalizeHeatCapacityModeSessionStore(
    cloneUnknown(prePowerZeroSuspended.heatCapacityModeSessions),
    prePowerZeroSource.id,
  ).free.status,
  'suspended',
  'a valid pre-power zero adjustment must survive mode-session normalization',
);
const prePowerZeroRestored = restoreHeatCapacityModeSession(prePowerZeroSuspended, 'free', 1_100);
assert.notEqual(prePowerZeroRestored, null);
assert.equal(prePowerZeroRestored?.powerOn, false);
assert.equal(
  prePowerZeroRestored?.heatCapacityPhase,
  'readyToPump',
  'a pre-power zero adjustment must restore its physically derived phase while power remains off',
);

const withSuspendedFree = suspendHeatCapacityModeSession(freeSource, null, freeCapturedAtMs);
assert.equal(withSuspendedFree.heatCapacityModeSessions.free.status, 'suspended');
assert.equal(withSuspendedFree.heatCapacityModeSessions.free.resumeRunState, freeSource.runState);
assert.equal(
  withSuspendedFree.heatCapacityModeSessions.free.snapshot?.mode === 'free'
    ? withSuspendedFree.heatCapacityModeSessions.free.snapshot.free.heatCapacityFreePhysicsState
    : null,
  freeSource.heatCapacityFreeInstrumentState.physics,
  'in-memory mode checkpoints should structurally share immutable physics state instead of deep-cloning it on the UI thread',
);
const suspendedFreeRuntime = withSuspendedFree.heatCapacityModeSessions.free.snapshot?.mode === 'free'
  ? withSuspendedFree.heatCapacityModeSessions.free.snapshot.free
  : null;
assert.notEqual(suspendedFreeRuntime, null);
assert.equal(
  Object.prototype.hasOwnProperty.call(suspendedFreeRuntime, 'heatCapacityFreeInstrumentConfig'),
  false,
  'mode-session compatibility snapshots must not introduce the current nested config field',
);
assert.equal(
  Object.prototype.hasOwnProperty.call(suspendedFreeRuntime, 'heatCapacityFreeInstrumentState'),
  false,
  'mode-session compatibility snapshots must not introduce the current nested instrument-state field',
);
for (const field of [
  'heatCapacityFreeRecordConfig',
  'heatCapacityFreePressureWarningMv',
  'heatCapacityFreeInstrumentNoiseEnabled',
  'heatCapacityFreeEnvironmentConfig',
  'heatCapacityFreePhysicsConfig',
  'heatCapacityFreeSensorConfig',
] as const) {
  assert.equal(
    Object.prototype.hasOwnProperty.call(suspendedFreeRuntime, field),
    true,
    `mode-session compatibility snapshots must retain ${field}`,
  );
}
for (const field of [
  'heatCapacityFreePhysicsState',
  'heatCapacityFreeSensorState',
  'heatCapacityFreeCalibrationState',
] as const) {
  assert.equal(
    Object.prototype.hasOwnProperty.call(suspendedFreeRuntime, field),
    true,
    `mode-session compatibility snapshots must retain ${field}`,
  );
}

const guideFixtureClock: GuideFixtureClock = { nowMs: freeCapturedAtMs + 100 };
const guideSource = createGuideWaitingU1Fixture(withSuspendedFree, guideFixtureClock);
const guideCapturedAtMs = advanceGuideFixtureClock(guideFixtureClock, 10);
const guideUiCheckpoint = createGuideUiCheckpoint(
  guideSource.id,
  guideCapturedAtMs,
  0,
  1_280,
);
const withSuspendedGuide = suspendHeatCapacityModeSession(
  guideSource,
  guideUiCheckpoint,
  guideCapturedAtMs,
);
const suspendedGuideUi = withSuspendedGuide.heatCapacityModeSessions.guide.uiCheckpoint;
assert.equal(suspendedGuideUi?.mode, 'guide');
assert.equal(suspendedGuideUi?.payload.kind, 'guide');
if (suspendedGuideUi?.payload.kind !== 'guide') {
  throw new Error('Expected a Guide UI checkpoint.');
}

const guidePhysicsControlMismatchStore = cloneUnknown(withSuspendedGuide.heatCapacityModeSessions);
const guidePhysicsControlMismatchSnapshot = getEntryRecord(guidePhysicsControlMismatchStore, 'guide')
  .snapshot as Record<string, unknown>;
const guidePhysicsControlMismatchRuntime = guidePhysicsControlMismatchSnapshot.guide as Record<string, unknown>;
const guidePhysicsControlMismatchState = guidePhysicsControlMismatchRuntime
  .heatCapacityGuidePhysicsState as Record<string, unknown>;
guidePhysicsControlMismatchState.lastStopcockOpenedAtS = 70;
guidePhysicsControlMismatchState.lastStopcockClosedAtS = null;
guidePhysicsControlMismatchState.currentStopcockOpenDurationS = 1;
assert.equal(
  normalizeHeatCapacityModeSessionStore(guidePhysicsControlMismatchStore, guideSource.id).guide.status,
  'empty',
  'Guide physical stopcock timing must agree with the persisted closed release control',
);

const guideGlassControlMismatchStore = cloneUnknown(withSuspendedGuide.heatCapacityModeSessions);
const guideGlassControlMismatchSnapshot = getEntryRecord(guideGlassControlMismatchStore, 'guide')
  .snapshot as Record<string, unknown>;
(guideGlassControlMismatchSnapshot.common as Record<string, unknown>).glassPistonState = 'open';
assert.equal(
  normalizeHeatCapacityModeSessionStore(guideGlassControlMismatchStore, guideSource.id).guide.status,
  'empty',
  'Guide glass piston state must agree with the release state and stopcock angle',
);

const completedGuideFixtureClock: GuideFixtureClock = { nowMs: guideCapturedAtMs };
const completedGuideSource = completeGuideFixture(guideSource, completedGuideFixtureClock);
const completedGuideCapturedAtMs = advanceGuideFixtureClock(completedGuideFixtureClock, 10);
const completedGuideStore = suspendHeatCapacityModeSession(
  completedGuideSource,
  null,
  completedGuideCapturedAtMs,
).heatCapacityModeSessions;
const preparedCompletedGuideExit = prepareHeatCapacityModeSessionForExit(
  completedGuideSource,
  null,
  completedGuideCapturedAtMs,
);
assert.equal(
  preparedCompletedGuideExit.heatCapacityModeSessions.guide.status,
  'completed',
  'leaving a completed Guide session must retain its reviewable result',
);
const restoredCompletedGuide = restoreHeatCapacityModeSession(
  preparedCompletedGuideExit,
  'guide',
  completedGuideCapturedAtMs + 100,
);
assert.equal(restoredCompletedGuide?.heatCapacityTeachingStatus, 'completed');
assert.equal(restoredCompletedGuide?.heatCapacityGuideWorkflow.step, 'completed');
assert.equal(
  restoredCompletedGuide?.heatCapacityGuideTrial?.correctedSignals?.gamma,
  completedGuideSource.heatCapacityGuideTrial?.correctedSignals?.gamma,
  'reopening a completed Guide session must restore the original calculated result',
);
const preparedIncompleteGuideExit = prepareHeatCapacityModeSessionForExit(
  guideSource,
  guideUiCheckpoint,
  completedGuideCapturedAtMs + 200,
);
assert.equal(
  preparedIncompleteGuideExit.heatCapacityModeSessions.guide.status,
  'empty',
  'leaving an unfinished Guide session must still discard its progress',
);
const normalizedCompletedGuideStore = normalizeHeatCapacityModeSessionStore(
  cloneUnknown(completedGuideStore),
  completedGuideSource.id,
);
assert.equal(
  normalizedCompletedGuideStore.guide.status,
  'completed',
  'a Guide trial created through the public action route must survive normalization',
);
assert.equal(
  normalizedCompletedGuideStore.guide.snapshot?.mode === 'guide'
    ? normalizedCompletedGuideStore.guide.snapshot.guide.heatCapacityGuideTrial?.correctedSignals?.gamma
    : null,
  completedGuideSource.heatCapacityGuideTrial?.correctedSignals?.gamma,
);
const runningCompletedGuideStore = cloneUnknown(completedGuideStore);
const runningCompletedGuideEntry = getEntryRecord(runningCompletedGuideStore, 'guide');
runningCompletedGuideEntry.resumeRunState = 'running';
const runningCompletedGuideSnapshot = runningCompletedGuideEntry.snapshot as Record<string, unknown>;
(runningCompletedGuideSnapshot.common as Record<string, unknown>).runState = 'running';
assert.equal(
  normalizeHeatCapacityModeSessionStore(runningCompletedGuideStore, completedGuideSource.id)
    .guide.status,
  'empty',
  'a completed Guide entry must not restore as an actively running experiment',
);
const forgedCustomGuideSignalStore = cloneUnknown(completedGuideStore);
const forgedCustomGuideSnapshot = getEntryRecord(forgedCustomGuideSignalStore, 'guide')
  .snapshot as Record<string, unknown>;
const forgedCustomGuideRuntime = forgedCustomGuideSnapshot.guide as Record<string, unknown>;
const forgedCustomGuideTrial = forgedCustomGuideRuntime.heatCapacityGuideTrial as Record<string, unknown>;
(forgedCustomGuideTrial.correctedSignals as Record<string, unknown>).gamma = 999;
assert.equal(
  normalizeHeatCapacityModeSessionStore(forgedCustomGuideSignalStore, completedGuideSource.id)
    .guide.status,
  'empty',
  'Guide trial validation must reject corrected signals that do not match their persisted context',
);

for (const corruption of [
  {
    label: 'calibration version mismatch',
    apply: (trial: Record<string, unknown>) => {
      (trial.u1 as Record<string, unknown>).calibrationVersion = 2;
    },
  },
  {
    label: 'zero event mismatch',
    apply: (trial: Record<string, unknown>) => {
      (trial.u1 as Record<string, unknown>).zeroEventId = 'guide-forged-zero';
    },
  },
  {
    label: 'record timestamp reversal',
    apply: (trial: Record<string, unknown>) => {
      (trial.u1 as Record<string, unknown>).atS = 0.5;
    },
  },
  {
    label: 'event-log timestamp reversal',
    apply: (trial: Record<string, unknown>) => {
      ((trial.eventLog as Record<string, unknown>[])[1]).atS = -1;
    },
  },
  {
    label: 'negative completion timestamp',
    apply: (trial: Record<string, unknown>) => {
      trial.completedAtMs = -1;
    },
  },
]) {
  const corruptedStore = cloneUnknown(completedGuideStore);
  const snapshot = getEntryRecord(corruptedStore, 'guide').snapshot as Record<string, unknown>;
  const runtime = snapshot.guide as Record<string, unknown>;
  corruption.apply(runtime.heatCapacityGuideTrial as Record<string, unknown>);
  assert.equal(
    normalizeHeatCapacityModeSessionStore(corruptedStore, completedGuideSource.id).guide.status,
    'empty',
    `Guide trial validation must reject a ${corruption.label}`,
  );
}

const getFreeCollectionCopies = (store: unknown) => {
  const freeSnapshot = getEntryRecord(store, 'free').snapshot as Record<string, unknown>;
  const runtime = freeSnapshot.free as Record<string, unknown>;
  const domain = runtime.heatCapacityFreeRealDomain as Record<string, unknown>;
  const experimentGroups = runtime.heatCapacityFreeExperimentGroups as Record<string, unknown>;
  const groupCopies = (experimentGroups.groups as Record<string, unknown>[] ?? []).map(
    (group) => {
      const runSeries = group.runSeries as Record<string, unknown>;
      return {
        traceStore: runSeries.traceStore as Record<string, unknown>,
        trials: runSeries.trials as Record<string, unknown>[],
      };
    },
  );
  return [
    {
      traceStore: runtime.heatCapacityFreeTraceStore as Record<string, unknown>,
      trials: runtime.heatCapacityFreeTrials as Record<string, unknown>[],
    },
    {
      traceStore: domain.traceStore as Record<string, unknown>,
      trials: domain.trials as Record<string, unknown>[],
    },
    ...groupCopies,
  ];
};

const semanticFreeFixtureClock: GuideFixtureClock = { nowMs: 100_000 };
const semanticFreeSource = createCompletedFreeFixture(
  createDefaultHeatCapacityFile(93),
  semanticFreeFixtureClock,
);
const completeFreeTrial = semanticFreeSource.heatCapacityFreeRunWorkspace.trials.at(-1)!;
const semanticFreeCapturedAtMs = advanceGuideFixtureClock(semanticFreeFixtureClock, 10);
const semanticFreeSuspendedFile = suspendHeatCapacityModeSession(
  semanticFreeSource,
  null,
  semanticFreeCapturedAtMs,
);
const semanticFreeStore = semanticFreeSuspendedFile.heatCapacityModeSessions;
assert.equal(
  normalizeHeatCapacityModeSessionStore(cloneUnknown(semanticFreeStore), semanticFreeSource.id)
    .free.status,
  'suspended',
  'a fully linked Free trial, trace, and standard reference must survive the mode-session boundary',
);
const semanticFreeV3Projection = projectWorkbenchPersistenceV3File(
  semanticFreeSource,
  93,
);
if (!semanticFreeV3Projection.ok) {
  throw new Error(semanticFreeV3Projection.diagnostics[0].message);
}
const semanticFreeSuspendedV3Projection =
  projectWorkbenchPersistenceV3File(
    semanticFreeSuspendedFile,
    93,
  );
if (!semanticFreeSuspendedV3Projection.ok) {
  throw new Error(
    semanticFreeSuspendedV3Projection.diagnostics[0].message,
  );
}
const staleSuspendedSignalCache = cloneUnknown(
  semanticFreeSuspendedFile,
);
for (const collection of getFreeCollectionCopies(
  staleSuspendedSignalCache.heatCapacityModeSessions,
)) {
  const correctedSignals = collection.trials[0]
    .correctedSignals as Record<string, unknown>;
  correctedSignals.calculationVersion = 'log-pressure-v99';
}
for (const trials of [
  staleSuspendedSignalCache.heatCapacityFreeRunWorkspace.trials,
  staleSuspendedSignalCache.heatCapacityFreeRealDomain.trials,
  ...staleSuspendedSignalCache.heatCapacityFreeExperimentGroups.groups.map(
    (group) => group.runSeries.trials,
  ),
]) {
  const correctedSignals = trials[0]?.correctedSignals as unknown as Record<string, unknown> | null;
  if (correctedSignals) correctedSignals.calculationVersion = 'log-pressure-v99';
}
const repairedSuspendedSignalCache =
  projectWorkbenchPersistenceV3File(
    staleSuspendedSignalCache,
    93,
  );
if (!repairedSuspendedSignalCache.ok) {
  throw new Error(
    repairedSuspendedSignalCache.diagnostics[0].message,
  );
}
assert.equal(
  repairedSuspendedSignalCache.status,
  'repaired-cache',
  'suspended Free corrected-signal caches must be rebuilt from recorded voltages',
);

const earlyFreeFixtureClock: GuideFixtureClock = { nowMs: 300_000 };
const earlyFreeSource = createCompletedFreeFixture(
  createDefaultHeatCapacityFile(94),
  earlyFreeFixtureClock,
  false,
  (stage, file, clock) => {
    const capturedAtMs = clock.nowMs + 1;
    const suspended = suspendHeatCapacityModeSession(file, null, capturedAtMs);
    const normalized = normalizeHeatCapacityModeSessionStore(
      cloneUnknown(suspended.heatCapacityModeSessions),
      file.id,
    );
    assert.equal(
      normalized.free.status,
      'suspended',
      `an early ${stage} active attempt must remain persistable`,
    );
    const restored = restoreHeatCapacityModeSession(
      suspended,
      'free',
      capturedAtMs + 1,
    );
    assert.notEqual(restored, null);
    if (restored) {
      const reSuspended = suspendHeatCapacityModeSession(
        restored,
        null,
        capturedAtMs + 2,
      );
      assert.equal(
        normalizeHeatCapacityModeSessionStore(
          cloneUnknown(reSuspended.heatCapacityModeSessions),
          file.id,
        ).free.status,
        'suspended',
        `an early ${stage} checkpoint must remain canonical after restore`,
      );
    }
  },
);
const earlyFreeStore = suspendHeatCapacityModeSession(
  earlyFreeSource,
  null,
  advanceGuideFixtureClock(earlyFreeFixtureClock, 10),
).heatCapacityModeSessions;
assert.equal(
  normalizeHeatCapacityModeSessionStore(cloneUnknown(earlyFreeStore), earlyFreeSource.id)
    .free.status,
  'suspended',
  'Free records accepted before the recommended wait duration are lower-quality data, not malformed persistence',
);

const progressedFreeWithZeroedCommonProjection = cloneUnknown(semanticFreeStore);
const progressedFreeSnapshot = getEntryRecord(
  progressedFreeWithZeroedCommonProjection,
  'free',
).snapshot as Record<string, unknown>;
const progressedFreeCommon = progressedFreeSnapshot.common as Record<string, unknown>;
for (const key of FREE_COMMON_PRESSURE_PROJECTION_KEYS) {
  progressedFreeCommon[key] = 0;
}
assert.equal(
  normalizeHeatCapacityModeSessionStore(
    progressedFreeWithZeroedCommonProjection,
    semanticFreeSource.id,
  ).free.status,
  'empty',
  'zero pressure projections must never bypass strict validation after Free runtime progress exists',
);

const incompleteFreeRecordTraceStore = cloneUnknown(semanticFreeStore);
for (const collection of getFreeCollectionCopies(incompleteFreeRecordTraceStore)) {
  (collection.trials[0].u1 as Record<string, unknown>).eventId = null;
}
assert.equal(
  normalizeHeatCapacityModeSessionStore(incompleteFreeRecordTraceStore, semanticFreeSource.id).free.status,
  'empty',
  'a traced Free record must retain its complete trial, branch, sample, and event reference',
);

const mismatchedFreeRecordEventStore = cloneUnknown(semanticFreeStore);
for (const collection of getFreeCollectionCopies(mismatchedFreeRecordEventStore)) {
  const trial = collection.trials[0];
  const record = trial.u1 as Record<string, unknown>;
  const traceTrial = (collection.traceStore.traceTrials as Record<string, unknown>[]).find(
    (candidate) => candidate.id === trial.traceTrialId,
  )!;
  const branch = (traceTrial.branches as Record<string, unknown>[]).find(
    (candidate) => candidate.id === record.traceBranchId,
  )!;
  const event = (branch.events as Record<string, unknown>[]).find(
    (candidate) => candidate.id === record.eventId,
  )!;
  event.type = 'record-u2';
}
assert.equal(
  normalizeHeatCapacityModeSessionStore(mismatchedFreeRecordEventStore, semanticFreeSource.id).free.status,
  'empty',
  'each Free record must reference the trace event for its own record kind',
);

const driftedFreeRecordValueStore = cloneUnknown(semanticFreeStore);
for (const collection of getFreeCollectionCopies(driftedFreeRecordValueStore)) {
  const record = collection.trials[0].u1 as Record<string, unknown>;
  record.displayTemperatureMv = (record.displayTemperatureMv as number) + 0.1;
}
assert.equal(
  normalizeHeatCapacityModeSessionStore(driftedFreeRecordValueStore, semanticFreeSource.id).free.status,
  'empty',
  'Free record values must equal the display-truncated values of their referenced trace sample',
);

const impossibleCommonFreePhaseStore = cloneUnknown(semanticFreeStore);
const impossibleCommonFreePhaseSnapshot = getEntryRecord(impossibleCommonFreePhaseStore, 'free')
  .snapshot as Record<string, unknown>;
(impossibleCommonFreePhaseSnapshot.common as Record<string, unknown>).heatCapacityPhase = 'releasing';
assert.equal(
  normalizeHeatCapacityModeSessionStore(impossibleCommonFreePhaseStore, semanticFreeSource.id).free.status,
  'empty',
  'Free common phase must be derived from power, release, physics, and controls',
);

const mismatchedCommonPumpCountStore = cloneUnknown(semanticFreeStore);
const mismatchedCommonPumpCountSnapshot = getEntryRecord(mismatchedCommonPumpCountStore, 'free')
  .snapshot as Record<string, unknown>;
const mismatchedCommonPumpCount = mismatchedCommonPumpCountSnapshot.common as Record<string, unknown>;
mismatchedCommonPumpCount.pumpStrokeCount = (mismatchedCommonPumpCount.pumpStrokeCount as number) + 1;
assert.equal(
  normalizeHeatCapacityModeSessionStore(mismatchedCommonPumpCountStore, semanticFreeSource.id).free.status,
  'empty',
  'Free common pump count must match the authoritative physics state',
);

const mismatchedCommonStopcockStore = cloneUnknown(semanticFreeStore);
const mismatchedCommonStopcockSnapshot = getEntryRecord(mismatchedCommonStopcockStore, 'free')
  .snapshot as Record<string, unknown>;
const mismatchedCommonStopcock = mismatchedCommonStopcockSnapshot.common as Record<string, unknown>;
mismatchedCommonStopcock.glassPistonState = 'open';
mismatchedCommonStopcock.stopcockAngleDeg = 90;
assert.equal(
  normalizeHeatCapacityModeSessionStore(mismatchedCommonStopcockStore, semanticFreeSource.id).free.status,
  'empty',
  'Free stopcock controls must match the persisted release state',
);

const u2WithoutSignalsStore = cloneUnknown(semanticFreeStore);
for (const collection of getFreeCollectionCopies(u2WithoutSignalsStore)) {
  collection.trials[0].correctedSignals = null;
  collection.trials[0].standardReferenceSnapshot = null;
}
assert.equal(
  normalizeHeatCapacityModeSessionStore(u2WithoutSignalsStore, semanticFreeSource.id).free.status,
  'empty',
  'a persisted U2 record must atomically retain its corrected signals',
);

const u2WithoutConfigStore = cloneUnknown(semanticFreeStore);
for (const collection of getFreeCollectionCopies(u2WithoutConfigStore)) {
  collection.trials[0].configSnapshot = null;
  collection.trials[0].standardReferenceSnapshot = null;
}
assert.equal(
  normalizeHeatCapacityModeSessionStore(u2WithoutConfigStore, semanticFreeSource.id).free.status,
  'empty',
  'a persisted U2 record must atomically retain its frozen config snapshot',
);

const completedWithoutReferenceStore = cloneUnknown(semanticFreeStore);
for (const collection of getFreeCollectionCopies(completedWithoutReferenceStore)) {
  collection.trials[0].completedAtMs = 1_000;
  collection.trials[0].standardReferenceSnapshot = null;
}
assert.equal(
  normalizeHeatCapacityModeSessionStore(completedWithoutReferenceStore, semanticFreeSource.id).free.status,
  'empty',
  'a completed Free trial must atomically retain its standard reference',
);

const completedFreeTrialStore = cloneUnknown(semanticFreeStore);
for (const collection of getFreeCollectionCopies(completedFreeTrialStore)) {
  collection.trials[0].completedAtMs = 1_000;
  collection.traceStore.activeTraceTrialId = null;
  (collection.traceStore.traceTrials as Record<string, unknown>[])[0].status = 'completed';
}
assert.equal(
  normalizeHeatCapacityModeSessionStore(completedFreeTrialStore, semanticFreeSource.id).free.status,
  'suspended',
  'a completed Free trial with its standard reference and completed trace must remain restorable',
);

const historicalArchivedFreeTrialStore = cloneUnknown(semanticFreeStore);
for (const collection of getFreeCollectionCopies(historicalArchivedFreeTrialStore)) {
  const trial = collection.trials[0];
  const trialConfig = cloneUnknown(trial.configSnapshot) as Record<string, unknown>;
  trial.configSnapshot = trialConfig;
  const trialPhysics = trialConfig.physics as Record<string, unknown>;
  trialPhysics.releaseOptimalMinS = 0.3;
  trialPhysics.releaseOptimalMaxS = 0.5;
  trialPhysics.autoDemoReleaseDurationS = 0.375;
  const reference = trial.standardReferenceSnapshot as Record<string, unknown>;
  (reference.operationPreset as Record<string, unknown>).releaseDurationS = 0.375;
  reference.releaseDurationS = 0.375;
  (reference.summary as Record<string, unknown>).releaseDurationS = 0.375;
  const referenceConfig = cloneUnknown(reference.configSnapshot) as Record<string, unknown>;
  reference.configSnapshot = referenceConfig;
  const referencePhysics = referenceConfig.physics as Record<string, unknown>;
  referencePhysics.releaseOptimalMinS = 0.3;
  referencePhysics.releaseOptimalMaxS = 0.5;
  referencePhysics.autoDemoReleaseDurationS = 0.375;
  collection.traceStore.activeTraceTrialId = null;
  collection.traceStore.traceTrials = [];
}
assert.equal(
  normalizeHeatCapacityModeSessionStore(
    historicalArchivedFreeTrialStore,
    semanticFreeSource.id,
  ).free.status,
  'suspended',
  'an internally consistent historical v3 reference must remain archived without fabricating a pruned trace',
);

const forgedHistoricalArchivedFreeTrialStore = cloneUnknown(historicalArchivedFreeTrialStore);
for (const collection of getFreeCollectionCopies(forgedHistoricalArchivedFreeTrialStore)) {
  const reference = collection.trials[0].standardReferenceSnapshot as Record<string, unknown>;
  (reference.summary as Record<string, unknown>).releaseDurationS = 0.374;
}
assert.equal(
  normalizeHeatCapacityModeSessionStore(
    forgedHistoricalArchivedFreeTrialStore,
    semanticFreeSource.id,
  ).free.status,
  'empty',
  'a historical archived reference with an inconsistent nested summary must remain rejected',
);
for (const collection of getFreeCollectionCopies(semanticFreeStore)) {
  const reference = collection.trials[0].standardReferenceSnapshot as Record<string, unknown>;
  assert.equal((reference.operationPreset as Record<string, unknown>).releaseDurationS, 0.6);
}
const completedTrialWithActiveTraceStore = cloneUnknown(completedFreeTrialStore);
for (const collection of getFreeCollectionCopies(completedTrialWithActiveTraceStore)) {
  const traceTrial = (collection.traceStore.traceTrials as Record<string, unknown>[])[0];
  traceTrial.status = 'active';
  collection.traceStore.activeTraceTrialId = traceTrial.id;
}
assert.equal(
  normalizeHeatCapacityModeSessionStore(completedTrialWithActiveTraceStore, semanticFreeSource.id).free.status,
  'empty',
  'a completed Free trial must not point at a trace that is still active',
);

const getFreeProjectionRecordCopies = (
  store: unknown,
  runtimeKey: string,
  domainKey: string,
) => {
  const freeSnapshot = getEntryRecord(store, 'free').snapshot as Record<string, unknown>;
  const runtime = freeSnapshot.free as Record<string, unknown>;
  const domain = runtime.heatCapacityFreeParameterScheme === 'ideal'
    ? runtime.heatCapacityFreeIdealDomain as Record<string, unknown>
    : runtime.heatCapacityFreeRealDomain as Record<string, unknown>;
  const records = [runtime[runtimeKey], domain[domainKey]].filter(
    (value): value is Record<string, unknown> => typeof value === 'object' && value !== null,
  );
  return [...new Set(records)];
};

const getPersistedAfterPowerOnRollbackCopies = (store: unknown) => (
  getFreeProjectionRecordCopies(store, 'heatCapacityFreeRollbackSnapshots', 'rollbackSnapshots')
    .map((snapshots) => snapshots.afterPowerOn)
    .filter((value): value is Record<string, unknown> => typeof value === 'object' && value !== null)
    .filter((value, index, values) => values.indexOf(value) === index)
);

const getPersistedBeforeReleaseRollbackCopies = (store: unknown) => (
  getFreeProjectionRecordCopies(store, 'heatCapacityFreeRollbackSnapshots', 'rollbackSnapshots')
    .map((snapshots) => snapshots.beforeRelease)
    .filter((value): value is Record<string, unknown> => typeof value === 'object' && value !== null)
    .filter((value, index, values) => values.indexOf(value) === index)
);

const ghostPumpProcessStore = cloneUnknown(semanticFreeStore);
const ghostPumpSnapshot = getEntryRecord(ghostPumpProcessStore, 'free').snapshot as Record<string, unknown>;
(ghostPumpSnapshot.common as Record<string, unknown>).pumpStrokeCount = 0;
for (const physicsState of getFreeProjectionRecordCopies(
  ghostPumpProcessStore,
  'heatCapacityFreePhysicsState',
  'physicsState',
)) {
  physicsState.pumpStrokeCount = 0;
  physicsState.lastPumpStrokeAtS = null;
  physicsState.pumpProcesses = [{
    startedAtS: physicsState.simulationTimeS,
    strength: 1,
    appliedProgress: 0,
  }];
}
assert.equal(
  normalizeHeatCapacityModeSessionStore(ghostPumpProcessStore, semanticFreeSource.id).free.status,
  'empty',
  'a persisted ghost pump process must not inject gas without an accepted pump stroke',
);

const invalidPumpValveConfigStore = cloneUnknown(semanticFreeStore);
for (const config of getFreeProjectionRecordCopies(
  invalidPumpValveConfigStore,
  'heatCapacityFreePhysicsConfig',
  'physicsConfig',
)) {
  (config.pumpValveExchange as Record<string, unknown>).openingDelayS = -5;
}
assert.equal(
  normalizeHeatCapacityModeSessionStore(invalidPumpValveConfigStore, semanticFreeSource.id).free.status,
  'empty',
  'Free pump-valve exchange config must already be within its canonical range',
);

const invalidLeakageConfigStore = cloneUnknown(semanticFreeStore);
for (const config of getFreeProjectionRecordCopies(
  invalidLeakageConfigStore,
  'heatCapacityFreePhysicsConfig',
  'physicsConfig',
)) {
  (config.leakage as Record<string, unknown>).ratePerS = -0.01;
}
assert.equal(
  normalizeHeatCapacityModeSessionStore(invalidLeakageConfigStore, semanticFreeSource.id).free.status,
  'empty',
  'Free leakage config must not rely on runtime clamping after restore',
);

const invalidDisturbanceConfigStore = cloneUnknown(semanticFreeStore);
for (const config of getFreeProjectionRecordCopies(
  invalidDisturbanceConfigStore,
  'heatCapacityFreePhysicsConfig',
  'physicsConfig',
)) {
  (config.environmentDisturbance as Record<string, unknown>).timeScaleS = 0;
}
assert.equal(
  normalizeHeatCapacityModeSessionStore(invalidDisturbanceConfigStore, semanticFreeSource.id).free.status,
  'empty',
  'Free disturbance config must reject a non-canonical zero time scale',
);

const invalidNonlinearityConfigStore = cloneUnknown(semanticFreeStore);
for (const config of getFreeProjectionRecordCopies(
  invalidNonlinearityConfigStore,
  'heatCapacityFreeSensorConfig',
  'sensorConfig',
)) {
  (config.pressureNonlinearity as Record<string, unknown>).minGain = 1.1;
}
assert.equal(
  normalizeHeatCapacityModeSessionStore(invalidNonlinearityConfigStore, semanticFreeSource.id).free.status,
  'empty',
  'Free pressure nonlinearity config must reject gain outside the unit interval',
);

const invalidPressureThresholdStore = cloneUnknown(semanticFreeStore);
const invalidThresholdSnapshot = getEntryRecord(invalidPressureThresholdStore, 'free')
  .snapshot as Record<string, unknown>;
const invalidThresholdRuntime = invalidThresholdSnapshot.free as Record<string, unknown>;
const invalidThresholdDomain = invalidThresholdRuntime.heatCapacityFreeRealDomain as Record<string, unknown>;
const invalidThresholdDraft = invalidThresholdRuntime.heatCapacityFreeParameterDraft as Record<string, unknown>;
const invalidThresholdRecordConfig = invalidThresholdRuntime.heatCapacityFreeRecordConfig as Record<string, unknown>;
const invalidThresholdDomainRecordConfig = invalidThresholdDomain.recordConfig as Record<string, unknown>;
const dangerMv = invalidThresholdRecordConfig.pressureDangerMv as number;
invalidThresholdRuntime.heatCapacityFreePressureWarningMv = dangerMv;
invalidThresholdDomain.pressureWarningMv = dangerMv;
invalidThresholdDraft.pressureWarningMv = dangerMv;
invalidThresholdDomainRecordConfig.pressureDangerMv = dangerMv;
assert.equal(
  normalizeHeatCapacityModeSessionStore(invalidPressureThresholdStore, semanticFreeSource.id).free.status,
  'empty',
  'Free warning pressure must preserve the canonical safety gap below danger pressure',
);

const freePhysicsControlMismatchStore = cloneUnknown(semanticFreeStore);
for (const state of getFreeProjectionRecordCopies(
  freePhysicsControlMismatchStore,
  'heatCapacityFreePhysicsState',
  'physicsState',
)) {
  state.lastStopcockOpenedAtS = (state.simulationTimeS as number) - 1;
  state.lastStopcockClosedAtS = null;
  state.currentStopcockOpenDurationS = 1;
}
assert.equal(
  normalizeHeatCapacityModeSessionStore(freePhysicsControlMismatchStore, semanticFreeSource.id).free.status,
  'empty',
  'Free physical stopcock timing must agree with the persisted closed release control',
);

const freeReleaseReferenceMismatchStore = cloneUnknown(semanticFreeStore);
for (const state of getFreeProjectionRecordCopies(
  freeReleaseReferenceMismatchStore,
  'heatCapacityFreePhysicsState',
  'physicsState',
)) {
  state.releaseStarted = true;
  state.releaseReference = null;
}
assert.equal(
  normalizeHeatCapacityModeSessionStore(freeReleaseReferenceMismatchStore, semanticFreeSource.id).free.status,
  'empty',
  'Free releaseStarted and releaseReference must describe the same release history',
);

const mutatePersistedFreeTraceBranches = (
  store: unknown,
  mutate: (branch: Record<string, unknown>) => void,
) => {
  const seenTraceStores = new Set<Record<string, unknown>>();
  getFreeCollectionCopies(store).forEach(({ traceStore }) => {
    if (seenTraceStores.has(traceStore)) return;
    seenTraceStores.add(traceStore);
    const traceTrial = (traceStore.traceTrials as Record<string, unknown>[])[0];
    const branch = (traceTrial.branches as Record<string, unknown>[])[0];
    mutate(branch);
  });
};

const currentMarkerShortU1WaitStore = cloneUnknown(semanticFreeStore);
const currentMarkerU1AtS = completeFreeTrial.u1?.atS;
assert.equal(typeof currentMarkerU1AtS, 'number');
mutatePersistedFreeTraceBranches(currentMarkerShortU1WaitStore, (branch) => {
  const closeEvents = (branch.events as Record<string, unknown>[]).filter((event) => (
    event.type === 'pump-valve-close'
    && typeof event.atS === 'number'
    && event.atS <= (currentMarkerU1AtS as number)
  ));
  const lastCloseEvent = closeEvents.at(-1);
  assert.ok(lastCloseEvent, 'completed current Free trace should include a pump-valve-close anchor');
  const adjustedAtS = (currentMarkerU1AtS as number) - 299.999;
  lastCloseEvent.atS = adjustedAtS;
  const referencedSample = (branch.samples as Record<string, unknown>[]).find(
    (sample) => sample.id === lastCloseEvent.traceSampleId,
  );
  assert.ok(referencedSample, 'the adjusted event must retain its referenced trace sample');
  referencedSample.atS = adjustedAtS;
});
assert.equal(
  normalizeHeatCapacityModeSessionStore(currentMarkerShortU1WaitStore, semanticFreeSource.id).free.status,
  'suspended',
  'a short Free U1 wait is a quality outcome and must not make an otherwise linked trace unsavable',
);

const reversedU1AnchorStore = cloneUnknown(semanticFreeStore);
mutatePersistedFreeTraceBranches(reversedU1AnchorStore, (branch) => {
  for (const event of branch.events as Record<string, unknown>[]) {
    if (event.type === 'pump-valve-close') {
      event.atS = (currentMarkerU1AtS as number) + 0.001;
    }
  }
});
assert.equal(
  normalizeHeatCapacityModeSessionStore(reversedU1AnchorStore, semanticFreeSource.id).free.status,
  'empty',
  'a Free U1 record must still retain a pump-valve-close anchor at or before the record',
);

for (const corruption of [
  {
    label: 'sample index reversal',
    apply: (branch: Record<string, unknown>) => {
      branch.samples = [...branch.samples as Record<string, unknown>[]].reverse();
    },
  },
  {
    label: 'event index reversal',
    apply: (branch: Record<string, unknown>) => {
      branch.events = [...branch.events as Record<string, unknown>[]].reverse();
    },
  },
  {
    label: 'sample timestamp regression',
    apply: (branch: Record<string, unknown>) => {
      const samples = branch.samples as Record<string, unknown>[];
      samples[1].atS = (samples[0].atS as number) - 1;
    },
  },
  {
    label: 'event timestamp regression',
    apply: (branch: Record<string, unknown>) => {
      const events = branch.events as Record<string, unknown>[];
      events[1].atS = (events[0].atS as number) - 1;
    },
  },
  {
    label: 'negative next sample timestamp',
    apply: (branch: Record<string, unknown>) => {
      branch.nextSampleAtS = -0.1;
    },
  },
  {
    label: 'non-terminal last kept sample',
    apply: (branch: Record<string, unknown>) => {
      branch.lastKeptSampleId = (branch.samples as Record<string, unknown>[])[0].id;
    },
  },
]) {
  const corruptedStore = cloneUnknown(semanticFreeStore);
  mutatePersistedFreeTraceBranches(corruptedStore, corruption.apply);
  assert.equal(
    normalizeHeatCapacityModeSessionStore(corruptedStore, semanticFreeSource.id).free.status,
    'empty',
    `Free trace validation must reject a ${corruption.label}`,
  );
}

const orderedFreeAppendHistoryStore = cloneUnknown(semanticFreeStore);
assert.equal(
  normalizeHeatCapacityModeSessionStore(orderedFreeAppendHistoryStore, semanticFreeSource.id).free.status,
  'suspended',
  'ordered Free append histories must remain restorable',
);

for (const historyCorruption of [
  {
    label: 'pressure-history append-order regression',
    runtimeKey: 'heatCapacityFreeSensorState',
    domainKey: 'sensorState',
    field: 'pressureHistory',
  },
  {
    label: 'temperature-history append-order regression',
    runtimeKey: 'heatCapacityFreeSensorState',
    domainKey: 'sensorState',
    field: 'temperatureHistory',
  },
  {
    label: 'zero-event append-order regression',
    runtimeKey: 'heatCapacityFreeCalibrationState',
    domainKey: 'calibrationState',
    field: 'zeroEvents',
  },
]) {
  const corruptedStore = cloneUnknown(orderedFreeAppendHistoryStore);
  for (const record of getFreeProjectionRecordCopies(
    corruptedStore,
    historyCorruption.runtimeKey,
    historyCorruption.domainKey,
  )) {
    record[historyCorruption.field] = [...record[historyCorruption.field] as unknown[]].reverse();
  }
  assert.equal(
    normalizeHeatCapacityModeSessionStore(corruptedStore, semanticFreeSource.id).free.status,
    'empty',
    `${historyCorruption.label} must invalidate the containing Free mode session`,
  );
}

const poweredRollbackSource = powerHeatCapacityWorkbenchFile(
  configureHeatCapacityFreeBatchWorkbenchState(
    createDefaultHeatCapacityFile(91),
    3,
    999,
  ),
  true,
  1_000,
);
const orderedRollbackStore = cloneUnknown(suspendHeatCapacityModeSession(
  poweredRollbackSource,
  null,
  1_100,
).heatCapacityModeSessions);
assert.equal(
  normalizeHeatCapacityModeSessionStore(orderedRollbackStore, poweredRollbackSource.id).free.status,
  'suspended',
  'a reachable rollback control projection with ordered histories must remain restorable',
);

for (const rollbackCorruption of [
  {
    label: 'power/phase mismatch',
    apply: (rollback: Record<string, unknown>) => {
      rollback.heatCapacityPhase = 'powerOff';
    },
  },
  {
    label: 'pump-valve state mismatch',
    apply: (rollback: Record<string, unknown>) => {
      rollback.pumpValveOpen = true;
      rollback.pumpValveState = 'closed';
    },
  },
  {
    label: 'stopcock/release mismatch',
    apply: (rollback: Record<string, unknown>) => {
      rollback.glassPistonState = 'open';
      rollback.stopcockAngleDeg = 90;
    },
  },
  {
    label: 'pump-count/physics mismatch',
    apply: (rollback: Record<string, unknown>) => {
      rollback.pumpStrokeCount = (rollback.pumpStrokeCount as number) + 1;
    },
  },
]) {
  const corruptedStore = cloneUnknown(orderedRollbackStore);
  getPersistedAfterPowerOnRollbackCopies(corruptedStore).forEach(rollbackCorruption.apply);
  assert.equal(
    normalizeHeatCapacityModeSessionStore(corruptedStore, poweredRollbackSource.id).free.status,
    'empty',
    `${rollbackCorruption.label} must invalidate the containing Free mode session`,
  );
}

for (const rollbackHistoryCorruption of [
  {
    label: 'rollback sensor append-order regression',
    apply: (rollback: Record<string, unknown>) => {
      const sensorState = rollback.heatCapacityFreeSensorState as Record<string, unknown>;
      sensorState.pressureHistory = [...sensorState.pressureHistory as unknown[]].reverse();
    },
  },
  {
    label: 'rollback calibration append-order regression',
    apply: (rollback: Record<string, unknown>) => {
      const calibrationState = rollback.heatCapacityFreeCalibrationState as Record<string, unknown>;
      calibrationState.zeroEvents = [...calibrationState.zeroEvents as unknown[]].reverse();
    },
  },
]) {
  const corruptedStore = cloneUnknown(semanticFreeStore);
  getPersistedBeforeReleaseRollbackCopies(corruptedStore).forEach(rollbackHistoryCorruption.apply);
  assert.equal(
    normalizeHeatCapacityModeSessionStore(corruptedStore, semanticFreeSource.id).free.status,
    'empty',
    `${rollbackHistoryCorruption.label} must invalidate the containing Free mode session`,
  );
}

const mislabeledInactiveDomainStore = cloneUnknown(semanticFreeStore);
const mislabeledInactiveDomainSnapshot = getEntryRecord(mislabeledInactiveDomainStore, 'free')
  .snapshot as Record<string, unknown>;
const mislabeledInactiveDomainRuntime = mislabeledInactiveDomainSnapshot.free as Record<string, unknown>;
(mislabeledInactiveDomainRuntime.heatCapacityFreeIdealDomain as Record<string, unknown>).scheme = 'real';
assert.equal(
  normalizeHeatCapacityModeSessionStore(mislabeledInactiveDomainStore, semanticFreeSource.id).free.status,
  'empty',
  'the inactive ideal domain must remain bound to the ideal scheme',
);

const swappedFreeDomainsStore = cloneUnknown(semanticFreeStore);
const swappedFreeDomainsSnapshot = getEntryRecord(swappedFreeDomainsStore, 'free').snapshot as Record<string, unknown>;
const swappedFreeDomainsRuntime = swappedFreeDomainsSnapshot.free as Record<string, unknown>;
const previousRealDomain = swappedFreeDomainsRuntime.heatCapacityFreeRealDomain;
swappedFreeDomainsRuntime.heatCapacityFreeRealDomain = swappedFreeDomainsRuntime.heatCapacityFreeIdealDomain;
swappedFreeDomainsRuntime.heatCapacityFreeIdealDomain = previousRealDomain;
assert.equal(
  normalizeHeatCapacityModeSessionStore(swappedFreeDomainsStore, semanticFreeSource.id).free.status,
  'empty',
  'swapping the persisted real and ideal domains must be rejected',
);

const inconsistentInactiveEnvironmentStore = cloneUnknown(semanticFreeStore);
const inconsistentInactiveEnvironmentSnapshot = getEntryRecord(
  inconsistentInactiveEnvironmentStore,
  'free',
).snapshot as Record<string, unknown>;
const inconsistentInactiveEnvironmentRuntime = inconsistentInactiveEnvironmentSnapshot.free as Record<string, unknown>;
const inconsistentInactiveIdealDomain = inconsistentInactiveEnvironmentRuntime
  .heatCapacityFreeIdealDomain as Record<string, unknown>;
const inconsistentInactiveEnvironment = inconsistentInactiveIdealDomain.environmentConfig as Record<string, unknown>;
inconsistentInactiveEnvironment.ambientTemperatureK =
  (inconsistentInactiveEnvironment.ambientTemperatureK as number) + 1;
assert.equal(
  normalizeHeatCapacityModeSessionStore(inconsistentInactiveEnvironmentStore, semanticFreeSource.id)
    .free.status,
  'empty',
  'an inactive Free domain must bind its environment projection to its physics config',
);

const mismatchedFreeGasTypeStore = cloneUnknown(semanticFreeStore);
const mismatchedFreeGasTypeSnapshot = getEntryRecord(mismatchedFreeGasTypeStore, 'free')
  .snapshot as Record<string, unknown>;
const mismatchedFreeGasTypeRuntime = mismatchedFreeGasTypeSnapshot.free as Record<string, unknown>;
mismatchedFreeGasTypeRuntime.heatCapacityFreeGasType = 'helium';
(mismatchedFreeGasTypeRuntime.heatCapacityFreeRealDomain as Record<string, unknown>).gasType = 'helium';
assert.equal(
  normalizeHeatCapacityModeSessionStore(mismatchedFreeGasTypeStore, semanticFreeSource.id).free.status,
  'empty',
  'a Free gas type must remain bound to the physical gamma',
);

const mismatchedFreeParameterDraftStore = cloneUnknown(semanticFreeStore);
const mismatchedFreeParameterDraftSnapshot = getEntryRecord(mismatchedFreeParameterDraftStore, 'free')
  .snapshot as Record<string, unknown>;
const mismatchedFreeParameterDraftRuntime = mismatchedFreeParameterDraftSnapshot.free as Record<string, unknown>;
const mismatchedFreeParameterDraft = mismatchedFreeParameterDraftRuntime
  .heatCapacityFreeParameterDraft as Record<string, unknown>;
mismatchedFreeParameterDraft.ambientPressureKPa =
  (mismatchedFreeParameterDraft.ambientPressureKPa as number) + 1;
assert.equal(
  normalizeHeatCapacityModeSessionStore(mismatchedFreeParameterDraftStore, semanticFreeSource.id)
    .free.status,
  'empty',
  'the editable Free parameter draft must project the active runtime configuration',
);

const frozenFreeSource = freezeHeatCapacityFreeParametersForCurrentGroup(semanticFreeSource);
const frozenFreeStore = suspendHeatCapacityModeSession(
  frozenFreeSource,
  null,
  semanticFreeCapturedAtMs + 10,
).heatCapacityModeSessions;
assert.equal(
  normalizeHeatCapacityModeSessionStore(cloneUnknown(frozenFreeStore), frozenFreeSource.id)
    .free.status,
  'suspended',
  'a correctly frozen Free runtime configuration must remain restorable',
);
const mismatchedActiveRunSnapshotStore = cloneUnknown(frozenFreeStore);
const mismatchedActiveRunSnapshot = getEntryRecord(mismatchedActiveRunSnapshotStore, 'free')
  .snapshot as Record<string, unknown>;
const mismatchedActiveRunRuntime = mismatchedActiveRunSnapshot.free as Record<string, unknown>;
for (const snapshot of [
  mismatchedActiveRunRuntime.heatCapacityFreeActiveRunConfigSnapshot,
  (mismatchedActiveRunRuntime.heatCapacityFreeRealDomain as Record<string, unknown>)
    .activeRunConfigSnapshot,
] as Record<string, unknown>[]) {
  const environment = snapshot.environment as Record<string, unknown>;
  environment.ambientPressureKPa = (environment.ambientPressureKPa as number) + 1;
}
assert.equal(
  normalizeHeatCapacityModeSessionStore(mismatchedActiveRunSnapshotStore, frozenFreeSource.id)
    .free.status,
  'empty',
  'a frozen Free configuration snapshot must match the active domain configs',
);

const forgedFreeThermodynamicProjectionStore = cloneUnknown(semanticFreeStore);
const forgedFreeThermodynamicSnapshot = getEntryRecord(forgedFreeThermodynamicProjectionStore, 'free')
  .snapshot as Record<string, unknown>;
const forgedFreeThermodynamicCommon = forgedFreeThermodynamicSnapshot.common as Record<string, unknown>;
const forgedFreeThermodynamicRuntime = forgedFreeThermodynamicSnapshot.free as Record<string, unknown>;
for (const state of [
  forgedFreeThermodynamicRuntime.heatCapacityFreePhysicsState,
  (forgedFreeThermodynamicRuntime.heatCapacityFreeRealDomain as Record<string, unknown>).physicsState,
] as Record<string, unknown>[]) {
  state.gasTemperatureK = (state.gasTemperatureK as number) + 50;
}
forgedFreeThermodynamicCommon.gasTemperatureK =
  (forgedFreeThermodynamicCommon.gasTemperatureK as number) + 50;
forgedFreeThermodynamicCommon.vesselTemperatureReadoutK =
  (forgedFreeThermodynamicCommon.vesselTemperatureReadoutK as number) + 50;
assert.equal(
  normalizeHeatCapacityModeSessionStore(forgedFreeThermodynamicProjectionStore, semanticFreeSource.id)
    .free.status,
  'empty',
  'stored Free temperature projections must be derived from authoritative amount and internal energy',
);

const futureFreeReleaseStore = cloneUnknown(semanticFreeStore);
const futureFreeReleaseSnapshot = getEntryRecord(futureFreeReleaseStore, 'free').snapshot as Record<string, unknown>;
const futureFreeReleaseCommon = futureFreeReleaseSnapshot.common as Record<string, unknown>;
const futureFreeReleaseRuntime = futureFreeReleaseSnapshot.free as Record<string, unknown>;
const futureClosedRelease = {
  phase: 'closed',
  purpose: 'none',
  attemptId: 0,
  phaseStartedAtS: semanticFreeSource.simulationTimeS + 1,
  openingStartedAtS: null,
  openingCompletedAtS: null,
  closeCommandAtS: null,
  closingCompletedAtS: null,
  releaseDurationS: 0,
  formedRelease: false,
  quickToggle: false,
};
futureFreeReleaseCommon.heatCapacityReleaseState = cloneUnknown(futureClosedRelease);
(futureFreeReleaseRuntime.heatCapacityFreeRealDomain as Record<string, unknown>).releaseState =
  cloneUnknown(futureClosedRelease);
assert.equal(
  normalizeHeatCapacityModeSessionStore(futureFreeReleaseStore, semanticFreeSource.id).free.status,
  'empty',
  'Free release timestamps must not lie after the persisted simulation time',
);

const runningSemanticFreeSource = freezeHeatCapacityFreeParametersForCurrentGroup(semanticFreeSource);
const runningSemanticFreeStore = suspendHeatCapacityModeSession(
  runningSemanticFreeSource,
  null,
  semanticFreeCapturedAtMs + 20,
).heatCapacityModeSessions;
assert.equal(
  normalizeHeatCapacityModeSessionStore(
    cloneUnknown(runningSemanticFreeStore),
    runningSemanticFreeSource.id,
  ).free.status,
  'suspended',
  'an active Free trace with a frozen group config must remain restorable',
);
const futureFreeTraceStore = cloneUnknown(runningSemanticFreeStore);
for (const collection of getFreeCollectionCopies(futureFreeTraceStore)) {
  const traceTrial = (collection.traceStore.traceTrials as Record<string, unknown>[])[0];
  const branch = (traceTrial.branches as Record<string, unknown>[])[0];
  const events = branch.events as Record<string, unknown>[];
  events[events.length - 1].atS = semanticFreeSource.simulationTimeS + 1;
}
assert.equal(
  normalizeHeatCapacityModeSessionStore(futureFreeTraceStore, runningSemanticFreeSource.id).free.status,
  'empty',
  'Free trace events, including release-start, must not lie after the persisted simulation time',
);

const futureNonRunningFreeTraceStore = cloneUnknown(semanticFreeStore);
mutatePersistedFreeTraceBranches(futureNonRunningFreeTraceStore, (branch) => {
  const events = branch.events as Record<string, unknown>[];
  events[events.length - 1].atS = semanticFreeSource.simulationTimeS + 1;
});
assert.equal(
  normalizeHeatCapacityModeSessionStore(futureNonRunningFreeTraceStore, semanticFreeSource.id).free.status,
  'empty',
  'an active Free trace must remain bounded by simulation time even while the experiment group is not running',
);

const mismatchedTrialSchemeStore = cloneUnknown(semanticFreeStore);
for (const collection of getFreeCollectionCopies(mismatchedTrialSchemeStore)) {
  collection.trials[0].parameterScheme = 'ideal';
}
assert.equal(
  normalizeHeatCapacityModeSessionStore(mismatchedTrialSchemeStore, semanticFreeSource.id).free.status,
  'empty',
  'a persisted trial must use the same parameter scheme as its containing domain',
);

for (const projectionCorruption of [
  {
    label: 'simulation time',
    apply: (common: Record<string, unknown>) => {
      common.simulationTimeS = (common.simulationTimeS as number) + 1;
    },
  },
  {
    label: 'gas temperature',
    apply: (common: Record<string, unknown>) => {
      common.gasTemperatureK = (common.gasTemperatureK as number) + 1;
    },
  },
  {
    label: 'pressure delta',
    apply: (common: Record<string, unknown>) => {
      common.pressureDeltaKPa = (common.pressureDeltaKPa as number) + 1;
    },
  },
]) {
  const corruptedStore = cloneUnknown(semanticFreeStore);
  const snapshot = getEntryRecord(corruptedStore, 'free').snapshot as Record<string, unknown>;
  projectionCorruption.apply(snapshot.common as Record<string, unknown>);
  assert.equal(
    normalizeHeatCapacityModeSessionStore(corruptedStore, semanticFreeSource.id).free.status,
    'empty',
    `the Free ${projectionCorruption.label} projection must match its active physical domain`,
  );
}

const forgedFreeCacheStore = cloneUnknown(semanticFreeStore);
const forgedRecordTrial = {
  ...completeFreeTrial,
  u1: completeFreeTrial.u1
    ? { ...completeFreeTrial.u1, displayPressureMv: completeFreeTrial.u1.displayPressureMv + 10 }
    : null,
};
const forgedCorrectedSignals = calculateFreeHeatCapacityTrialSignals(forgedRecordTrial, {
  atmosphericPressureKPa: completeFreeTrial.configSnapshot!.environment.ambientPressureKPa,
  pressureSensitivityMvPerKPa: completeFreeTrial.configSnapshot!.sensor.pressureMvPerKPa,
});
assert.notEqual(forgedCorrectedSignals, null);
for (const collection of getFreeCollectionCopies(forgedFreeCacheStore)) {
  collection.trials[0].correctedSignals = cloneUnknown(forgedCorrectedSignals);
}
assert.equal(
  normalizeHeatCapacityModeSessionStore(forgedFreeCacheStore, semanticFreeSource.id).free.status,
  'empty',
  'a self-consistent Free corrected-signal cache forged from values other than its records must be rejected',
);

const mismatchedTraceIdStore = cloneUnknown(semanticFreeStore);
for (const collection of getFreeCollectionCopies(mismatchedTraceIdStore)) {
  const traceTrial = (collection.traceStore.traceTrials as Record<string, unknown>[])[0];
  const branch = (traceTrial.branches as Record<string, unknown>[])[0];
  const sample = (branch.samples as Record<string, unknown>[])[0];
  const previousSampleId = sample.id;
  sample.id = 'sample-101';
  for (const event of branch.events as Record<string, unknown>[]) {
    if (event.traceSampleId === previousSampleId) event.traceSampleId = sample.id;
  }
  for (const trial of collection.trials) {
    for (const recordKey of ['u0', 'u1', 'u2']) {
      const record = trial[recordKey] as Record<string, unknown> | null;
      if (record?.traceSampleId === previousSampleId) record.traceSampleId = sample.id;
    }
  }
}
assert.equal(
  normalizeHeatCapacityModeSessionStore(mismatchedTraceIdStore, semanticFreeSource.id).free.status,
  'empty',
  'trace sample IDs must match their persisted indexes so the next append cannot collide',
);

for (const corruption of [
  {
    label: 'orphan linked trial',
    apply: (collection: ReturnType<typeof getFreeCollectionCopies>[number]) => {
      const traceTrial = (collection.traceStore.traceTrials as Record<string, unknown>[])[0];
      traceTrial.linkedTrialId = 'missing-free-trial';
    },
  },
  {
    label: 'branch count mismatch',
    apply: (collection: ReturnType<typeof getFreeCollectionCopies>[number]) => {
      collection.trials[0].branchCount = 99;
    },
  },
  {
    label: 'cyclic trace branch parent',
    apply: (collection: ReturnType<typeof getFreeCollectionCopies>[number]) => {
      const traceTrial = (collection.traceStore.traceTrials as Record<string, unknown>[])[0];
      const branch = (traceTrial.branches as Record<string, unknown>[])[0];
      branch.parentBranchId = branch.id;
    },
  },
  {
    label: 'multiple main trace branches',
    apply: (collection: ReturnType<typeof getFreeCollectionCopies>[number]) => {
      const traceTrial = (collection.traceStore.traceTrials as Record<string, unknown>[])[0];
      const branch = (traceTrial.branches as Record<string, unknown>[])[0];
      (traceTrial.branches as Record<string, unknown>[]).push({
        ...cloneUnknown(branch),
        id: 'branch-2',
        parentBranchId: branch.id,
        status: 'main',
        hiddenInDefaultChart: false,
      });
      traceTrial.nextBranchIndex = 3;
    },
  },
  {
    label: 'hidden active trace branch',
    apply: (collection: ReturnType<typeof getFreeCollectionCopies>[number]) => {
      const traceTrial = (collection.traceStore.traceTrials as Record<string, unknown>[])[0];
      const branch = (traceTrial.branches as Record<string, unknown>[])[0];
      branch.hiddenInDefaultChart = true;
    },
  },
  {
    label: 'orphan active trace trial',
    apply: (collection: ReturnType<typeof getFreeCollectionCopies>[number]) => {
      collection.traceStore.activeTraceTrialId = 'missing-trace-trial';
    },
  },
  {
    label: 'orphan record event',
    apply: (collection: ReturnType<typeof getFreeCollectionCopies>[number]) => {
      (collection.trials[0].u1 as Record<string, unknown>).eventId = 'missing-event';
    },
  },
  {
    label: 'record calibration version mismatch',
    apply: (collection: ReturnType<typeof getFreeCollectionCopies>[number]) => {
      const u1 = collection.trials[0].u1 as Record<string, unknown>;
      (collection.trials[0].u2 as Record<string, unknown>).calibrationVersion =
        (u1.calibrationVersion as number) + 1;
    },
  },
  {
    label: 'record zero event mismatch',
    apply: (collection: ReturnType<typeof getFreeCollectionCopies>[number]) => {
      (collection.trials[0].u2 as Record<string, unknown>).zeroEventId = 'zero-event-forged';
    },
  },
  {
    label: 'record timestamp reversal',
    apply: (collection: ReturnType<typeof getFreeCollectionCopies>[number]) => {
      const u1 = collection.trials[0].u1 as Record<string, unknown>;
      (collection.trials[0].u2 as Record<string, unknown>).atS = (u1.atS as number) - 1;
    },
  },
  {
    label: 'completed preheat bias',
    apply: (collection: ReturnType<typeof getFreeCollectionCopies>[number]) => {
      const signals = collection.trials[0].correctedSignals as Record<string, unknown>;
      signals.preheatBiasGamma = 0.001;
      signals.gamma = (signals.formulaGamma as number) + 0.001;
    },
  },
  {
    label: 'out-of-range omitted preheat bias',
    apply: (collection: ReturnType<typeof getFreeCollectionCopies>[number]) => {
      const trial = collection.trials[0];
      const signals = trial.correctedSignals as Record<string, unknown>;
      trial.preheatOutcome = 'omitted';
      signals.preheatBiasGamma = 0.02;
      signals.gamma = (signals.formulaGamma as number) + 0.02;
    },
  },
]) {
  const corruptedStore = cloneUnknown(semanticFreeStore);
  getFreeCollectionCopies(corruptedStore).forEach(corruption.apply);
  assert.equal(
    normalizeHeatCapacityModeSessionStore(corruptedStore, semanticFreeSource.id).free.status,
    'empty',
    `${corruption.label} must invalidate the containing Free mode session`,
  );
}

const mismatchedFreeProjectionStore = cloneUnknown(semanticFreeStore);
const mismatchedFreeProjectionSnapshot = getEntryRecord(mismatchedFreeProjectionStore, 'free')
  .snapshot as Record<string, unknown>;
const mismatchedFreeProjectionRuntime = mismatchedFreeProjectionSnapshot.free as Record<string, unknown>;
mismatchedFreeProjectionRuntime.heatCapacityFreePhysicsState = {
  ...mismatchedFreeProjectionRuntime.heatCapacityFreePhysicsState as Record<string, unknown>,
  gasAmountRatio: 1.25,
};
assert.equal(
  normalizeHeatCapacityModeSessionStore(mismatchedFreeProjectionStore, semanticFreeSource.id).free.status,
  'empty',
  'a Free runtime projection that disagrees with its durable active domain must be rejected',
);

const mismatchedReferenceSummaryStore = cloneUnknown(semanticFreeStore);
for (const collection of getFreeCollectionCopies(mismatchedReferenceSummaryStore)) {
  const reference = collection.trials[0].standardReferenceSnapshot as Record<string, unknown>;
  (reference.summary as Record<string, unknown>).gamma = 9.99;
}
assert.equal(
  normalizeHeatCapacityModeSessionStore(mismatchedReferenceSummaryStore, semanticFreeSource.id).free.status,
  'empty',
  'a current standard reference whose root and nested summaries disagree must be rejected',
);

const forgedReferenceGammaStore = cloneUnknown(semanticFreeStore);
for (const collection of getFreeCollectionCopies(forgedReferenceGammaStore)) {
  const reference = collection.trials[0].standardReferenceSnapshot as Record<string, unknown>;
  reference.gamma = 9.99;
  (reference.summary as Record<string, unknown>).gamma = 9.99;
  (reference.operationUpperBound as Record<string, unknown>).gamma = 9.99;
}
assert.equal(
  normalizeHeatCapacityModeSessionStore(forgedReferenceGammaStore, semanticFreeSource.id).free.status,
  'empty',
  'a self-consistent standard reference forged away from its trial and trace must be rejected',
);

const mismatchedReferenceConfigStore = cloneUnknown(semanticFreeStore);
for (const collection of getFreeCollectionCopies(mismatchedReferenceConfigStore)) {
  const reference = collection.trials[0].standardReferenceSnapshot as Record<string, unknown>;
  const config = reference.configSnapshot as Record<string, unknown>;
  const environment = config.environment as Record<string, unknown>;
  environment.ambientPressureKPa = (environment.ambientPressureKPa as number) + 1;
}
assert.equal(
  normalizeHeatCapacityModeSessionStore(mismatchedReferenceConfigStore, semanticFreeSource.id).free.status,
  'empty',
  'a standard reference with a config snapshot that differs from its trial and trace must be rejected',
);

const missingReferenceStagesStore = cloneUnknown(semanticFreeStore);
for (const collection of getFreeCollectionCopies(missingReferenceStagesStore)) {
  const reference = collection.trials[0].standardReferenceSnapshot as Record<string, unknown>;
  reference.stages = (reference.stages as Record<string, unknown>[]).filter((stage) => (
    stage.id === 'zero'
  ));
}
assert.equal(
  normalizeHeatCapacityModeSessionStore(missingReferenceStagesStore, semanticFreeSource.id).free.status,
  'empty',
  'a current standard reference missing stages used by its trace must be rejected',
);

for (const corruption of [
  {
    label: 'operation preset',
    apply: (reference: Record<string, unknown>) => {
      (reference.operationPreset as Record<string, unknown>).pumpTotalDurationS = 17.5;
    },
  },
  {
    label: 'summary release duration',
    apply: (reference: Record<string, unknown>) => {
      const summary = reference.summary as Record<string, unknown>;
      summary.releaseDurationS = 0.34;
      reference.releaseDurationS = 0.34;
    },
  },
]) {
  const corruptedStore = cloneUnknown(semanticFreeStore);
  for (const collection of getFreeCollectionCopies(corruptedStore)) {
    corruption.apply(collection.trials[0].standardReferenceSnapshot as Record<string, unknown>);
  }
  assert.equal(
    normalizeHeatCapacityModeSessionStore(corruptedStore, semanticFreeSource.id).free.status,
    'empty',
    `a current standard reference with a forged ${corruption.label} must be rejected`,
  );
}

assert.deepEqual(
  suspendedGuideUi.payload.guide.pendingStrongReminder,
  { controlId: 'recordU1', timer: { state: 'due' } },
  'a due reminder must remain distinct from an absent timer',
);

assert.throws(
  () => suspendHeatCapacityModeSession(
    guideSource,
    { ...guideUiCheckpoint, fileId: `${guideSource.id}-other` },
    1_200,
  ),
  /checkpoint mismatch/,
  'a checkpoint from another file must fail before it can contaminate an in-memory mode session',
);
assert.throws(
  () => suspendHeatCapacityModeSession(
    guideSource,
    { ...guideUiCheckpoint, mode: 'free', payload: { kind: 'free' } },
    1_200,
  ),
  /checkpoint mismatch/,
  'a checkpoint from another mode must fail before it can contaminate an in-memory mode session',
);
assert.deepEqual(
  suspendedGuideUi.payload.guide.baseStrongReminder,
  { controlId: 'recordU1', timer: { state: 'waiting', remainingMs: 1_280 } },
  'a waiting reminder must preserve its remaining duration',
);
const checkpointRecord = suspendedGuideUi as unknown as Record<string, unknown>;
for (const forbiddenKey of [
  'modeTransition',
  'modeTransitionDemoClock',
  'ui',
  'windows',
  'drafts',
  'sceneSnapshot',
]) {
  assert.equal(
    Object.prototype.hasOwnProperty.call(checkpointRecord, forbiddenKey),
    false,
    `${forbiddenKey} belongs to the refresh boundary and must not exist in a mode checkpoint`,
  );
}

const normalizedGuideStore = normalizeHeatCapacityModeSessionStore(
  cloneUnknown(withSuspendedGuide.heatCapacityModeSessions),
  guideSource.id,
);
assert.deepEqual(
  normalizedGuideStore.guide.uiCheckpoint?.mode === 'guide'
    ? normalizedGuideStore.guide.uiCheckpoint.payload.guide.pendingStrongReminder
    : null,
  { controlId: 'recordU1', timer: { state: 'due' } },
  'due timers must survive the persistence decoder',
);
assert.deepEqual(
  normalizedGuideStore.guide.uiCheckpoint?.mode === 'guide'
    ? normalizedGuideStore.guide.uiCheckpoint.payload.guide.baseStrongReminder
    : null,
  { controlId: 'recordU1', timer: { state: 'waiting', remainingMs: 1_280 } },
  'waiting timers must survive the persistence decoder',
);

const swappedGuideTimers = suspendHeatCapacityModeSession(
  guideSource,
  createGuideUiCheckpoint(guideSource.id, guideCapturedAtMs + 1, 640, 0),
  guideCapturedAtMs + 1,
);
const normalizedSwappedGuideTimers = normalizeHeatCapacityModeSessionStore(
  cloneUnknown(swappedGuideTimers.heatCapacityModeSessions),
  guideSource.id,
);
const swappedCheckpoint = normalizedSwappedGuideTimers.guide.uiCheckpoint;
assert.equal(swappedCheckpoint?.mode, 'guide');
if (swappedCheckpoint?.mode !== 'guide') throw new Error('Expected a persisted Guide UI checkpoint.');
assert.deepEqual(
  swappedCheckpoint.payload.guide.pendingStrongReminder,
  { controlId: 'recordU1', timer: { state: 'waiting', remainingMs: 640 } },
);
assert.deepEqual(
  swappedCheckpoint.payload.guide.baseStrongReminder,
  { controlId: 'recordU1', timer: { state: 'due' } },
);

const restoredFreeAtMs = freeCapturedAtMs + 1_000;
const restoredFree = restoreHeatCapacityModeSession(withSuspendedGuide, 'free', restoredFreeAtMs);
assert.notEqual(restoredFree, null);
assert.equal(restoredFree?.heatCapacityMode, 'free');
assert.equal(restoredFree?.simulationTimeS, freeSource.simulationTimeS);
assert.equal(restoredFree?.pumpStrokeCount, 9);
assert.equal(restoredFree?.runState, freeSource.runState);
assert.equal(restoredFree?.lastUpdateMs, restoredFreeAtMs);
assert.equal(
  restoredFree?.heatCapacityFreeInstrumentState.physics,
  freeSource.heatCapacityFreeInstrumentState.physics,
  'restoring a mode should reuse its immutable physics snapshot and avoid a second main-thread deep clone',
);
assert.equal(
  restoredFree?.simulationTimeS,
  freeSource.simulationTimeS,
  'an inactive Free session must not consume simulation time while another mode is selected',
);

const restoredGuideAtMs = guideCapturedAtMs + 1_000;
const restoredGuide = restoreHeatCapacityModeSession(withSuspendedGuide, 'guide', restoredGuideAtMs);
assert.notEqual(restoredGuide, null);
assert.equal(restoredGuide?.heatCapacityMode, 'guide');
assert.equal(restoredGuide?.simulationTimeS, guideSource.simulationTimeS);
assert.equal(
  restoredGuide?.heatCapacityGuidePhysicsState.simulationTimeS,
  guideSource.heatCapacityGuidePhysicsState.simulationTimeS,
);
assert.equal(restoredGuide?.heatCapacityGuideWorkflow.step, 'u1Waiting');
assert.equal(
  restoredGuide?.heatCapacityGuideWorkflow.waitStartedAtS,
  guideSource.heatCapacityGuideWorkflow.waitStartedAtS,
);
assert.equal(restoredGuide?.lastUpdateMs, restoredGuideAtMs);
assert.equal(
  (restoredGuide?.heatCapacityGuidePhysicsState.simulationTimeS ?? 0) -
    (restoredGuide?.heatCapacityGuideWorkflow.waitStartedAtS ?? 0),
  guideSource.heatCapacityGuidePhysicsState.simulationTimeS -
    (guideSource.heatCapacityGuideWorkflow.waitStartedAtS ?? 0),
  'the five-minute wait must resume from its exact elapsed simulation time',
);

const demoResetAtMs = restoredGuideAtMs + 500;
const demoResetSource = {
  ...createDefaultHeatCapacityFile(1),
  heatCapacityMode: 'free' as const,
  heatCapacityPhase: 'readyToPump' as const,
  powerOn: false,
  simulationTimeS: 8_863.59,
  heatCapacityGuideTrial: createHeatCapacityGuideTrial('stale-demo-trial'),
};
const demoReset = prepareHeatCapacityAutoDemoReset(demoResetSource, demoResetAtMs, () => 0.75);
assert.equal(demoReset.heatCapacityMode, 'demo');
assert.equal(demoReset.heatCapacityPhase, 'powerOff');
assert.equal(demoReset.powerOn, false);
assert.equal(demoReset.runState, 'running');
assert.equal(demoReset.simulationTimeS, 0);
assert.equal(demoReset.heatCapacityGuideTrial, null);
const suspendedDemoReset = suspendHeatCapacityModeSession(
  demoReset,
  null,
  demoResetAtMs + 1,
);
assert.equal(
  normalizeHeatCapacityModeSessionStore(
    cloneUnknown(suspendedDemoReset.heatCapacityModeSessions),
    demoReset.id,
  ).demo.status,
  'suspended',
  'entering Demo from an operated powered-off Free state must be canonical before the first scripted action',
);

const demoStartedAtMs = restoredGuideAtMs + 1_000;
const demoSource = prepareHeatCapacityAutoDemoStart({
  ...createDefaultHeatCapacityFile(1),
  heatCapacityModeSessions: withSuspendedFree.heatCapacityModeSessions,
}, demoStartedAtMs);
const firstTickDemo = stepHeatCapacityWorkbenchFile(demoSource, demoStartedAtMs + 16);
assert.equal(firstTickDemo.simulationTimeS, 0.016);
assert.equal(
  firstTickDemo.heatCapacityGuidePhysicsState.simulationTimeS,
  0,
  'Demo and Guide use separate runtime engines, so the dormant Guide clock must not be treated as Demo state',
);
const firstTickDemoCapturedAtMs = demoStartedAtMs + 20;
const firstTickDemoSuspended = suspendHeatCapacityModeSession(
  firstTickDemo,
  null,
  firstTickDemoCapturedAtMs,
);
const normalizedFirstTickDemoStore = normalizeHeatCapacityModeSessionStore(
  cloneUnknown(firstTickDemoSuspended.heatCapacityModeSessions),
  firstTickDemo.id,
);
assert.equal(
  normalizedFirstTickDemoStore.demo.status,
  'suspended',
  'a normal Demo runtime tick must remain persistable when its independent Guide engine is dormant',
);
const demoTemperatureRoundingBoundary = {
  ...firstTickDemo,
  gasTemperatureK: 300.5995,
  vesselTemperatureReadoutK: 300.6,
};
const suspendedDemoTemperatureRoundingBoundary = suspendHeatCapacityModeSession(
  demoTemperatureRoundingBoundary,
  null,
  firstTickDemoCapturedAtMs + 1,
);
assert.equal(
  normalizeHeatCapacityModeSessionStore(
    cloneUnknown(suspendedDemoTemperatureRoundingBoundary.heatCapacityModeSessions),
    firstTickDemo.id,
  ).demo.status,
  'suspended',
  'Demo persistence validation must use the same decimal rounding algorithm as the runtime producer',
);
const firstTickDemoCommonCorruptions: readonly {
  label: string;
  mutate: (common: Record<string, unknown>) => void;
}[] = [
  {
    label: 'absolute pressure',
    mutate: (common) => {
      common.gasPressureKPaAbs = (common.gasPressureKPaAbs as number) + 1;
    },
  },
  {
    label: 'pressure delta',
    mutate: (common) => {
      common.pressureDeltaKPa = (common.pressureDeltaKPa as number) + 1;
    },
  },
  {
    label: 'pressure readout',
    mutate: (common) => {
      common.vesselPressureReadoutKPa = (common.vesselPressureReadoutKPa as number) + 1;
    },
  },
  {
    label: 'temperature projection',
    mutate: (common) => {
      common.gasTemperatureK = (common.gasTemperatureK as number) + 1;
    },
  },
  {
    label: 'powered-off phase',
    mutate: (common) => {
      common.heatCapacityPhase = 'powerOff';
    },
  },
  {
    label: 'power state',
    mutate: (common) => {
      common.powerOn = false;
    },
  },
  {
    label: 'powered pressure display',
    mutate: (common) => {
      common.pressureKPa = (common.pressureKPa as number) + 1;
    },
  },
];
for (const corruption of firstTickDemoCommonCorruptions) {
  const corruptedStore = cloneUnknown(firstTickDemoSuspended.heatCapacityModeSessions);
  const corruptedSnapshot = getEntryRecord(corruptedStore, 'demo').snapshot as Record<string, unknown>;
  corruption.mutate(corruptedSnapshot.common as Record<string, unknown>);
  assert.equal(
    normalizeHeatCapacityModeSessionStore(corruptedStore, firstTickDemo.id).demo.status,
    'empty',
    `a current Demo ${corruption.label} mismatch must remain rejected`,
  );
}
const restoredFirstTickDemo = restoreHeatCapacityModeSession(
  firstTickDemoSuspended,
  'demo',
  firstTickDemoCapturedAtMs + 1_000,
);
assert.equal(
  restoredFirstTickDemo?.simulationTimeS,
  firstTickDemo.simulationTimeS,
  'a saved Demo tick must restore the authoritative Demo simulation clock',
);
const reSuspendedFirstTickDemo = suspendHeatCapacityModeSession(
  restoredFirstTickDemo!,
  null,
  firstTickDemoCapturedAtMs + 1_001,
);
assert.equal(
  normalizeHeatCapacityModeSessionStore(
    cloneUnknown(reSuspendedFirstTickDemo.heatCapacityModeSessions),
    firstTickDemo.id,
  ).demo.status,
  'suspended',
  'a restored Demo tick must remain canonical when it is saved again',
);
const openingDemo = setHeatCapacityScriptedStopcockOpen(
  firstTickDemo,
  true,
  demoStartedAtMs + 20,
);
const openingDemoSuspended = suspendHeatCapacityModeSession(
  openingDemo,
  null,
  demoStartedAtMs + 24,
);
assert.equal(
  normalizeHeatCapacityModeSessionStore(
    cloneUnknown(openingDemoSuspended.heatCapacityModeSessions),
    openingDemo.id,
  ).demo.status,
  'suspended',
  'a Demo opening release must use the Demo clock instead of the dormant Guide clock',
);
const demoCapturedAtMs = demoStartedAtMs + 100;
const withSuspendedDemo = suspendHeatCapacityModeSession(demoSource, null, demoCapturedAtMs);
const normalizedDemoStore = normalizeHeatCapacityModeSessionStore(
  cloneUnknown(withSuspendedDemo.heatCapacityModeSessions),
  demoSource.id,
);
assert.equal(
  normalizedDemoStore.demo.status,
  'suspended',
  'a Demo session must use Demo-owned trial semantics without inheriting Guide step controls',
);
const restoredDemoAtMs = demoCapturedAtMs + 1_000;
const restoredDemo = restoreHeatCapacityModeSession(withSuspendedDemo, 'demo', restoredDemoAtMs);
assert.equal(restoredDemo?.runState, 'paused');
assert.equal(restoredDemo?.simulationTimeS, demoSource.simulationTimeS);
assert.equal(
  restoredDemo?.lastUpdateMs,
  demoSource.lastUpdateMs === null
    ? null
    : demoSource.lastUpdateMs + (restoredDemoAtMs - demoCapturedAtMs),
);
assert.equal(
  restoredDemo?.simulationTimeS,
  demoSource.simulationTimeS,
  'returning to Demo must expose a paused checkpoint rather than advancing in the background',
);

const completedDemo = completeHeatCapacityTeachingModeWorkbenchState(demoSource, demoCapturedAtMs + 1_100);
const withCompletedDemo = suspendHeatCapacityModeSession(completedDemo, null, demoCapturedAtMs + 1_200);
assert.equal(withCompletedDemo.heatCapacityModeSessions.demo.status, 'completed');
const preparedCompletedDemoExit = prepareHeatCapacityModeSessionForExit(
  completedDemo,
  null,
  demoCapturedAtMs + 1_200,
);
assert.equal(
  preparedCompletedDemoExit.heatCapacityModeSessions.demo.status,
  'empty',
  'leaving Demo must discard it even after playback completes',
);
assert.equal(
  normalizeHeatCapacityModeSessionStore(
    cloneUnknown(withCompletedDemo.heatCapacityModeSessions),
    completedDemo.id,
  ).demo.status,
  'completed',
  'a completed Demo checkpoint must be canonical before restore',
);
const restoredCompletedDemo = restoreHeatCapacityModeSession(
  withCompletedDemo,
  'demo',
  demoCapturedAtMs + 1_300,
);
assert.equal(restoredCompletedDemo?.runState, 'idle');
assert.equal(restoredCompletedDemo?.heatCapacityTeachingStatus, 'completed');
const reSuspendedCompletedDemo = suspendHeatCapacityModeSession(
  restoredCompletedDemo!,
  null,
  demoCapturedAtMs + 1_400,
);
assert.equal(
  normalizeHeatCapacityModeSessionStore(
    cloneUnknown(reSuspendedCompletedDemo.heatCapacityModeSessions),
    completedDemo.id,
  ).demo.status,
  'completed',
  'restoring and suspending a completed Demo must remain canonical for the next startup',
);

const mismatchedDemoTrialSourceStore = cloneUnknown(withCompletedDemo.heatCapacityModeSessions);
const mismatchedDemoSnapshot = getEntryRecord(mismatchedDemoTrialSourceStore, 'demo')
  .snapshot as Record<string, unknown>;
const mismatchedDemoRuntime = mismatchedDemoSnapshot.demo as Record<string, unknown>;
(mismatchedDemoRuntime.heatCapacityGuideTrial as Record<string, unknown>).source = 'guide';
assert.equal(
  normalizeHeatCapacityModeSessionStore(mismatchedDemoTrialSourceStore, completedDemo.id).demo.status,
  'empty',
  'a Demo mode session must not restore a Guide-owned trial',
);

const clearedGuide = clearHeatCapacityModeSession(withSuspendedDemo, 'guide');
assert.equal(clearedGuide.heatCapacityModeSessions.guide.status, 'empty');
assert.equal(clearedGuide.heatCapacityModeSessions.guide.snapshot, null);
assert.equal(clearedGuide.heatCapacityModeSessions.free.status, 'suspended');

const persistedSessionStore = cloneUnknown(withSuspendedGuide.heatCapacityModeSessions);
const unsupportedSchemaStore = cloneUnknown(persistedSessionStore) as unknown as Record<string, unknown>;
unsupportedSchemaStore.schemaVersion = 1;
assert.deepEqual(
  normalizeHeatCapacityModeSessionStore(unsupportedSchemaStore, guideSource.id),
  createDefaultHeatCapacityModeSessionStore(),
  'the previous schema must be rejected atomically rather than partially migrated',
);

const missingCommonKeyStore = cloneUnknown(persistedSessionStore);
const missingCommonGuideEntry = getEntryRecord(missingCommonKeyStore, 'guide');
delete ((missingCommonGuideEntry.snapshot as Record<string, unknown>).common as Record<string, unknown>)
  .gasTemperatureK;
const normalizedMissingCommonKeyStore = normalizeHeatCapacityModeSessionStore(
  missingCommonKeyStore,
  guideSource.id,
);
assert.equal(normalizedMissingCommonKeyStore.guide.status, 'empty');
assert.equal(
  normalizedMissingCommonKeyStore.free.status,
  'suspended',
  'a malformed entry must be cleared without corrupting a valid sibling mode',
);

for (const entryMutation of [
  {
    label: 'resume run state that disagrees with its snapshot',
    apply: (entry: Record<string, unknown>) => { entry.resumeRunState = 'paused'; },
  },
  {
    label: 'completed status without a completed teaching snapshot',
    apply: (entry: Record<string, unknown>) => { entry.status = 'completed'; },
  },
]) {
  const malformedStore = cloneUnknown(persistedSessionStore);
  entryMutation.apply(getEntryRecord(malformedStore, 'guide'));
  assert.equal(
    normalizeHeatCapacityModeSessionStore(malformedStore, guideSource.id).guide.status,
    'empty',
    `mode session validation must reject a ${entryMutation.label}`,
  );
}

for (const commonMutation of [
  {
    label: 'empty recorded pressures',
    apply: (common: Record<string, unknown>) => { common.recordedPressures = {}; },
  },
  {
    label: 'malformed process sample',
    apply: (common: Record<string, unknown>) => {
      common.heatCapacityProcessSamples = { startSample: {} };
    },
  },
  {
    label: 'empty release state',
    apply: (common: Record<string, unknown>) => { common.heatCapacityReleaseState = {}; },
  },
  {
    label: 'stalled opening release state',
    apply: (common: Record<string, unknown>) => {
      common.heatCapacityReleaseState = {
        phase: 'opening',
        purpose: 'none',
        attemptId: 1,
        phaseStartedAtS: 12,
        openingStartedAtS: null,
        openingCompletedAtS: null,
        closeCommandAtS: null,
        closingCompletedAtS: null,
        releaseDurationS: 0,
        formedRelease: false,
        quickToggle: false,
      };
    },
  },
  {
    label: 'unformed releasing state',
    apply: (common: Record<string, unknown>) => {
      common.heatCapacityReleaseState = {
        phase: 'releasing',
        purpose: 'zeroing',
        attemptId: 1,
        phaseStartedAtS: 12,
        openingStartedAtS: 11.58,
        openingCompletedAtS: null,
        closeCommandAtS: null,
        closingCompletedAtS: null,
        releaseDurationS: 0,
        formedRelease: false,
        quickToggle: false,
      };
    },
  },
  {
    label: 'unformed closed-after-release state',
    apply: (common: Record<string, unknown>) => {
      common.heatCapacityReleaseState = {
        phase: 'closedAfterRelease',
        purpose: 'release',
        attemptId: 1,
        phaseStartedAtS: 13,
        openingStartedAtS: 11.58,
        openingCompletedAtS: 12,
        closeCommandAtS: 12.58,
        closingCompletedAtS: 13,
        releaseDurationS: 0.58,
        formedRelease: false,
        quickToggle: false,
      };
    },
  },
  {
    label: 'invalid pump valve state',
    apply: (common: Record<string, unknown>) => { common.pumpValveState = 'half-open'; },
  },
  {
    label: 'non-finite display timestamp',
    apply: (common: Record<string, unknown>) => { common.displayResponseLastUpdateMs = Number.NaN; },
  },
  {
    label: 'invalid nullable signal',
    apply: (common: Record<string, unknown>) => { common.temperatureSignalMv = '1498.7'; },
  },
  {
    label: 'Guide simulation-time projection mismatch',
    apply: (common: Record<string, unknown>) => {
      common.simulationTimeS = (common.simulationTimeS as number) + 1;
    },
  },
  {
    label: 'Guide gas-temperature projection mismatch',
    apply: (common: Record<string, unknown>) => {
      common.gasTemperatureK = (common.gasTemperatureK as number) + 1;
    },
  },
  {
    label: 'Guide runtime-phase projection mismatch',
    apply: (common: Record<string, unknown>) => { common.heatCapacityPhase = 'releasing'; },
  },
]) {
  const malformedStore = cloneUnknown(persistedSessionStore);
  const guideSnapshot = getEntryRecord(malformedStore, 'guide').snapshot as Record<string, unknown>;
  commonMutation.apply(guideSnapshot.common as Record<string, unknown>);
  const normalized = normalizeHeatCapacityModeSessionStore(malformedStore, guideSource.id);
  assert.equal(
    normalized.guide.status,
    'empty',
    `${commonMutation.label} must invalidate the containing mode snapshot`,
  );
  assert.equal(
    normalized.free.status,
    'suspended',
    `${commonMutation.label} must not invalidate a valid sibling mode`,
  );
}

const poweredFreePowerOffPhaseStore = cloneUnknown(persistedSessionStore);
const poweredFreePowerOffSnapshot = getEntryRecord(poweredFreePowerOffPhaseStore, 'free')
  .snapshot as Record<string, unknown>;
(poweredFreePowerOffSnapshot.common as Record<string, unknown>).heatCapacityPhase = 'powerOff';
assert.equal(
  normalizeHeatCapacityModeSessionStore(poweredFreePowerOffPhaseStore, freeSource.id).free.status,
  'empty',
  'a powered Free session must not restore with the power-off runtime phase',
);

const runningTeachingFreeStore = cloneUnknown(persistedSessionStore);
const runningTeachingFreeSnapshot = getEntryRecord(runningTeachingFreeStore, 'free')
  .snapshot as Record<string, unknown>;
(runningTeachingFreeSnapshot.common as Record<string, unknown>).heatCapacityTeachingStatus = 'running';
assert.equal(
  normalizeHeatCapacityModeSessionStore(runningTeachingFreeStore, freeSource.id).free.status,
  'empty',
  'Free mode must retain the idle teaching status',
);

const idleTeachingGuideStore = cloneUnknown(persistedSessionStore);
const idleTeachingGuideSnapshot = getEntryRecord(idleTeachingGuideStore, 'guide')
  .snapshot as Record<string, unknown>;
(idleTeachingGuideSnapshot.common as Record<string, unknown>).heatCapacityTeachingStatus = 'idle';
assert.equal(
  normalizeHeatCapacityModeSessionStore(idleTeachingGuideStore, guideSource.id).guide.status,
  'empty',
  'an incomplete Guide workflow must retain the running teaching status',
);

const openPumpAfterPumpingStore = cloneUnknown(persistedSessionStore);
const openPumpAfterPumpingSnapshot = getEntryRecord(openPumpAfterPumpingStore, 'guide')
  .snapshot as Record<string, unknown>;
const openPumpAfterPumpingCommon = openPumpAfterPumpingSnapshot.common as Record<string, unknown>;
openPumpAfterPumpingCommon.pumpValveOpen = true;
openPumpAfterPumpingCommon.pumpValveState = 'open';
assert.equal(
  normalizeHeatCapacityModeSessionStore(openPumpAfterPumpingStore, guideSource.id).guide.status,
  'empty',
  'Guide steps from u1Waiting onward must retain a closed pump valve',
);

const openPumpBeforePumpStepStore = cloneUnknown(persistedSessionStore);
const openPumpBeforePumpStepSnapshot = getEntryRecord(openPumpBeforePumpStepStore, 'guide')
  .snapshot as Record<string, unknown>;
const openPumpBeforePumpStepCommon = openPumpBeforePumpStepSnapshot.common as Record<string, unknown>;
openPumpBeforePumpStepCommon.pumpValveOpen = true;
openPumpBeforePumpStepCommon.pumpValveState = 'open';
openPumpBeforePumpStepCommon.heatCapacityPhase = 'readyToPump';
const openPumpBeforePumpStepRuntime = openPumpBeforePumpStepSnapshot.guide as Record<string, unknown>;
const openPumpBeforePumpStepWorkflow =
  openPumpBeforePumpStepRuntime.heatCapacityGuideWorkflow as Record<string, unknown>;
openPumpBeforePumpStepWorkflow.step = 'openPumpValveRequired';
openPumpBeforePumpStepWorkflow.waitStartedAtS = null;
openPumpBeforePumpStepWorkflow.waitStage = null;
assert.equal(
  normalizeHeatCapacityModeSessionStore(openPumpBeforePumpStepStore, guideSource.id).guide.status,
  'empty',
  'Guide must keep the pump valve closed until the open-pump-valve action is completed',
);

const openStopcockWithClosedReleaseStore = cloneUnknown(persistedSessionStore);
const openStopcockWithClosedReleaseSnapshot = getEntryRecord(openStopcockWithClosedReleaseStore, 'guide')
  .snapshot as Record<string, unknown>;
(openStopcockWithClosedReleaseSnapshot.common as Record<string, unknown>).stopcockAngleDeg = 90;
assert.equal(
  normalizeHeatCapacityModeSessionStore(openStopcockWithClosedReleaseStore, guideSource.id).guide.status,
  'empty',
  'a closed Guide release state must retain the closed stopcock angle',
);

const guideClosingFixtureClock: GuideFixtureClock = { nowMs: guideCapturedAtMs };
const guideClosingSource = createGuideClosingFixture(guideSource, guideClosingFixtureClock);
const guideClosingCapturedAtMs = guideClosingFixtureClock.nowMs;
const validGuideReleaseCloseDeadlineStore = suspendHeatCapacityModeSession(
  guideClosingSource,
  null,
  guideClosingCapturedAtMs,
).heatCapacityModeSessions;
assert.equal(
  normalizeHeatCapacityModeSessionStore(validGuideReleaseCloseDeadlineStore, guideSource.id).guide.status,
  'suspended',
  'a release-close resume deadline inside the closing animation window must restore',
);
const futureGuideReleaseCloseDeadlineStore = cloneUnknown(validGuideReleaseCloseDeadlineStore);
const futureGuideReleaseCloseDeadlineSnapshot = getEntryRecord(
  futureGuideReleaseCloseDeadlineStore,
  'guide',
).snapshot as Record<string, unknown>;
const futureGuideReleaseCloseDeadlineRuntime =
  futureGuideReleaseCloseDeadlineSnapshot.guide as Record<string, unknown>;
(futureGuideReleaseCloseDeadlineRuntime.heatCapacityGuideWorkflow as Record<string, unknown>)
  .releaseCloseResumeAtMs = guideClosingCapturedAtMs +
    HEAT_CAPACITY_RELEASE_TIMING.closingAnimationDurationMs + 1_000;
assert.equal(
  normalizeHeatCapacityModeSessionStore(futureGuideReleaseCloseDeadlineStore, guideSource.id)
    .guide.status,
  'empty',
  'a Guide release-close deadline must remain bounded by the persisted closing animation',
);

for (const nestedKey of [
  'heatCapacityGuidePhysicsConfig',
  'heatCapacityGuidePhysicsState',
  'heatCapacityGuideTemperatureSensorState',
  'heatCapacityGuideWorkflow',
] as const) {
  const malformedStore = cloneUnknown(persistedSessionStore);
  const guideSnapshot = getEntryRecord(malformedStore, 'guide').snapshot as Record<string, unknown>;
  (guideSnapshot.guide as Record<string, unknown>)[nestedKey] = {};
  assert.equal(
    normalizeHeatCapacityModeSessionStore(malformedStore, guideSource.id).guide.status,
    'empty',
    `an empty ${nestedKey} object must not be accepted as a Guide runtime`,
  );
}

for (const nestedKey of [
  'heatCapacityFreeParameterDraft',
  'heatCapacityFreeRecordConfig',
  'heatCapacityFreeEnvironmentConfig',
  'heatCapacityFreePhysicsConfig',
  'heatCapacityFreePhysicsState',
  'heatCapacityFreeSensorConfig',
  'heatCapacityFreeSensorState',
  'heatCapacityFreeCalibrationState',
  'heatCapacityFreeRollbackSnapshots',
  'heatCapacityFreeTraceStore',
] as const) {
  const malformedStore = cloneUnknown(persistedSessionStore);
  const freeSnapshot = getEntryRecord(malformedStore, 'free').snapshot as Record<string, unknown>;
  (freeSnapshot.free as Record<string, unknown>)[nestedKey] = {};
  assert.equal(
    normalizeHeatCapacityModeSessionStore(malformedStore, freeSource.id).free.status,
    'empty',
    `an empty ${nestedKey} object must not be accepted as a Free runtime`,
  );
}

const nonPositivePhysicsStore = cloneUnknown(persistedSessionStore);
const nonPositiveGuideSnapshot = getEntryRecord(nonPositivePhysicsStore, 'guide')
  .snapshot as Record<string, unknown>;
const nonPositiveGuideState = (
  (nonPositiveGuideSnapshot.guide as Record<string, unknown>).heatCapacityGuidePhysicsState
) as Record<string, unknown>;
nonPositiveGuideState.amountMol = 0;
assert.equal(
  normalizeHeatCapacityModeSessionStore(nonPositivePhysicsStore, guideSource.id).guide.status,
  'empty',
  'a non-positive thermodynamic amount must be rejected before it reaches the physics kernel',
);

const malformedTeachingProfileStore = cloneUnknown(persistedSessionStore);
const malformedTeachingProfileSnapshot = getEntryRecord(malformedTeachingProfileStore, 'guide')
  .snapshot as Record<string, unknown>;
(malformedTeachingProfileSnapshot.common as Record<string, unknown>).heatCapacityExperimentProfile = {};
assert.equal(
  normalizeHeatCapacityModeSessionStore(malformedTeachingProfileStore, guideSource.id).guide.status,
  'empty',
  'an arbitrary teaching-profile record must not cross the mode-session boundary',
);

for (const malformedFreeRuntime of [
  {
    label: 'active attempt',
    apply: (runtime: Record<string, unknown>) => {
      runtime.heatCapacityFreeActiveAttempt = { arbitrary: true };
    },
  },
  {
    label: 'trial',
    apply: (runtime: Record<string, unknown>) => {
      runtime.heatCapacityFreeTrials = [{ arbitrary: true }];
    },
  },
  {
    label: 'active config snapshot',
    apply: (runtime: Record<string, unknown>) => {
      runtime.heatCapacityFreeActiveRunConfigSnapshot = { arbitrary: true };
    },
  },
  {
    label: 'trace trial',
    apply: (runtime: Record<string, unknown>) => {
      runtime.heatCapacityFreeTraceStore = {
        activeTraceTrialId: null,
        nextTraceTrialIndex: 1,
        traceTrials: [{ arbitrary: true }],
      };
    },
  },
  {
    label: 'rollback snapshot',
    apply: (runtime: Record<string, unknown>) => {
      runtime.heatCapacityFreeRollbackSnapshots = {
        afterPowerOn: { arbitrary: true },
        beforePump: null,
        beforeRelease: null,
      };
    },
  },
]) {
  const malformedStore = cloneUnknown(persistedSessionStore);
  const snapshot = getEntryRecord(malformedStore, 'free').snapshot as Record<string, unknown>;
  malformedFreeRuntime.apply(snapshot.free as Record<string, unknown>);
  assert.equal(
    normalizeHeatCapacityModeSessionStore(malformedStore, freeSource.id).free.status,
    'empty',
    `an arbitrary non-empty ${malformedFreeRuntime.label} record must be rejected`,
  );
}

for (const malformedBranchPayload of [
  { label: 'trace sample', samples: [{ arbitrary: true }], events: [] },
  { label: 'trace event', samples: [], events: [{ arbitrary: true }] },
]) {
  const malformedStore = cloneUnknown(persistedSessionStore);
  const snapshot = getEntryRecord(malformedStore, 'free').snapshot as Record<string, unknown>;
  (snapshot.free as Record<string, unknown>).heatCapacityFreeTraceStore = {
    activeTraceTrialId: 'trace-1',
    nextTraceTrialIndex: 2,
    traceTrials: [{
      id: 'trace-1',
      linkedTrialId: null,
      status: 'active',
      activeBranchId: 'branch-1',
      nextBranchIndex: 2,
      branches: [{
        id: 'branch-1',
        parentBranchId: null,
        createdByEventId: null,
        status: 'main',
        hiddenInDefaultChart: false,
        nextSampleIndex: 1,
        nextEventIndex: 1,
        nextSampleAtS: null,
        lastKeptSampleId: null,
        idleState: {
          lastUserActionAtS: null,
          dormantSinceS: null,
          lastHeartbeatAtS: null,
        },
        samples: malformedBranchPayload.samples,
        events: malformedBranchPayload.events,
      }],
      configSnapshot: createDefaultFreeConfigSnapshot(),
    }],
  };
  assert.equal(
    normalizeHeatCapacityModeSessionStore(malformedStore, freeSource.id).free.status,
    'empty',
    `an arbitrary ${malformedBranchPayload.label} record must not cross the mode-session boundary`,
  );
}

const malformedStandardReferenceStore = cloneUnknown(persistedSessionStore);
const malformedStandardReferenceSnapshot = getEntryRecord(malformedStandardReferenceStore, 'free')
  .snapshot as Record<string, unknown>;
(malformedStandardReferenceSnapshot.free as Record<string, unknown>).heatCapacityFreeTrials = [{
  ...createHeatCapacityFreeTrial('trial-with-malformed-reference'),
  standardReferenceSnapshot: {
    generatorVersion: 'free-standard-reference-v3',
    configSnapshot: {},
    trace: [],
    stages: [],
    recordWindows: [],
    summary: {},
    operationUpperBound: {},
  },
}];
let normalizedMalformedStandardReference: ReturnType<typeof normalizeHeatCapacityModeSessionStore> | null = null;
assert.doesNotThrow(() => {
  normalizedMalformedStandardReference = normalizeHeatCapacityModeSessionStore(
    malformedStandardReferenceStore,
    freeSource.id,
  );
}, 'a malformed standard-reference snapshot must be rejected without throwing during normalization');
assert.equal(
  normalizedMalformedStandardReference?.free.status,
  'empty',
  'a malformed standard-reference snapshot must invalidate the containing mode entry',
);

const malformedGuideTrialStore = cloneUnknown(persistedSessionStore);
const malformedGuideTrialSnapshot = getEntryRecord(malformedGuideTrialStore, 'guide')
  .snapshot as Record<string, unknown>;
(malformedGuideTrialSnapshot.guide as Record<string, unknown>).heatCapacityGuideTrial = {
  arbitrary: true,
};
assert.equal(
  normalizeHeatCapacityModeSessionStore(malformedGuideTrialStore, guideSource.id).guide.status,
  'empty',
  'an arbitrary non-empty Guide trial record must be rejected',
);

const mismatchedGuideWaitStore = cloneUnknown(persistedSessionStore);
const mismatchedGuideWaitSnapshot = getEntryRecord(mismatchedGuideWaitStore, 'guide')
  .snapshot as Record<string, unknown>;
const mismatchedGuideWaitRuntime = mismatchedGuideWaitSnapshot.guide as Record<string, unknown>;
(mismatchedGuideWaitRuntime.heatCapacityGuideWorkflow as Record<string, unknown>).waitStage = 'u2';
assert.equal(
  normalizeHeatCapacityModeSessionStore(mismatchedGuideWaitStore, guideSource.id).guide.status,
  'empty',
  'a Guide waiting step must retain the matching wait-stage checkpoint',
);

const forgedGuideWaitAnchorStore = cloneUnknown(persistedSessionStore);
const forgedGuideWaitAnchorSnapshot = getEntryRecord(forgedGuideWaitAnchorStore, 'guide')
  .snapshot as Record<string, unknown>;
const forgedGuideWaitAnchorRuntime = forgedGuideWaitAnchorSnapshot.guide as Record<string, unknown>;
(forgedGuideWaitAnchorRuntime.heatCapacityGuideWorkflow as Record<string, unknown>).waitStartedAtS = 0;
assert.equal(
  normalizeHeatCapacityModeSessionStore(forgedGuideWaitAnchorStore, guideSource.id).guide.status,
  'empty',
  'a Guide U1 wait anchor must remain bound to the physical pump-valve close timestamp',
);

const prematureGuideRecordStore = cloneUnknown(persistedSessionStore);
const prematureGuideRecordSnapshot = getEntryRecord(prematureGuideRecordStore, 'guide')
  .snapshot as Record<string, unknown>;
const prematureGuideRecordWorkflow = (
  (prematureGuideRecordSnapshot.guide as Record<string, unknown>).heatCapacityGuideWorkflow
) as Record<string, unknown>;
prematureGuideRecordWorkflow.step = 'recordU1Required';
prematureGuideRecordWorkflow.paused = true;
assert.equal(
  normalizeHeatCapacityModeSessionStore(prematureGuideRecordStore, guideSource.id).guide.status,
  'empty',
  'Guide recordU1Required must not restore before its full 300-second wait has elapsed',
);

const mismatchedGuidePauseStore = cloneUnknown(persistedSessionStore);
const mismatchedGuidePauseSnapshot = getEntryRecord(mismatchedGuidePauseStore, 'guide')
  .snapshot as Record<string, unknown>;
const mismatchedGuidePauseRuntime = mismatchedGuidePauseSnapshot.guide as Record<string, unknown>;
(mismatchedGuidePauseRuntime.heatCapacityGuideWorkflow as Record<string, unknown>).paused = true;
assert.equal(
  normalizeHeatCapacityModeSessionStore(mismatchedGuidePauseStore, guideSource.id).guide.status,
  'empty',
  'a Guide workflow pause flag must remain bound to its exact workflow step',
);

const mismatchedGuideTrialSourceStore = cloneUnknown(persistedSessionStore);
const mismatchedGuideTrialSourceSnapshot = getEntryRecord(mismatchedGuideTrialSourceStore, 'guide')
  .snapshot as Record<string, unknown>;
const mismatchedGuideTrialSourceRuntime = mismatchedGuideTrialSourceSnapshot.guide as Record<string, unknown>;
(mismatchedGuideTrialSourceRuntime.heatCapacityGuideTrial as Record<string, unknown>).source = 'demo';
assert.equal(
  normalizeHeatCapacityModeSessionStore(mismatchedGuideTrialSourceStore, guideSource.id).guide.status,
  'empty',
  'a Guide mode session must not restore a Demo-owned trial',
);

const forgedGuideThermodynamicProjectionStore = cloneUnknown(persistedSessionStore);
const forgedGuideThermodynamicSnapshot = getEntryRecord(forgedGuideThermodynamicProjectionStore, 'guide')
  .snapshot as Record<string, unknown>;
const forgedGuideThermodynamicCommon = forgedGuideThermodynamicSnapshot.common as Record<string, unknown>;
const forgedGuideThermodynamicRuntime = forgedGuideThermodynamicSnapshot.guide as Record<string, unknown>;
const forgedGuideThermodynamicState = forgedGuideThermodynamicRuntime
  .heatCapacityGuidePhysicsState as Record<string, unknown>;
forgedGuideThermodynamicState.gasTemperatureK =
  (forgedGuideThermodynamicState.gasTemperatureK as number) + 50;
forgedGuideThermodynamicCommon.gasTemperatureK =
  (forgedGuideThermodynamicCommon.gasTemperatureK as number) + 50;
forgedGuideThermodynamicCommon.vesselTemperatureReadoutK =
  (forgedGuideThermodynamicCommon.vesselTemperatureReadoutK as number) + 50;
assert.equal(
  normalizeHeatCapacityModeSessionStore(forgedGuideThermodynamicProjectionStore, guideSource.id)
    .guide.status,
  'empty',
  'stored Guide temperature projections must be derived from authoritative amount and internal energy',
);

const futureGuideReleaseStore = cloneUnknown(persistedSessionStore);
const futureGuideReleaseSnapshot = getEntryRecord(futureGuideReleaseStore, 'guide')
  .snapshot as Record<string, unknown>;
const futureGuideReleaseCommon = futureGuideReleaseSnapshot.common as Record<string, unknown>;
futureGuideReleaseCommon.heatCapacityReleaseState = {
  phase: 'closed',
  purpose: 'none',
  attemptId: 0,
  phaseStartedAtS: guideSource.simulationTimeS + 1,
  openingStartedAtS: null,
  openingCompletedAtS: null,
  closeCommandAtS: null,
  closingCompletedAtS: null,
  releaseDurationS: 0,
  formedRelease: false,
  quickToggle: false,
};
assert.equal(
  normalizeHeatCapacityModeSessionStore(futureGuideReleaseStore, guideSource.id).guide.status,
  'empty',
  'Guide release timestamps must not lie after the persisted simulation time',
);

const futureGuideRecordStore = cloneUnknown(persistedSessionStore);
const futureGuideRecordSnapshot = getEntryRecord(futureGuideRecordStore, 'guide')
  .snapshot as Record<string, unknown>;
const futureGuideRecordRuntime = futureGuideRecordSnapshot.guide as Record<string, unknown>;
((futureGuideRecordRuntime.heatCapacityGuideTrial as Record<string, unknown>).u0 as Record<string, unknown>)
  .atS = guideSource.simulationTimeS + 1;
assert.equal(
  normalizeHeatCapacityModeSessionStore(futureGuideRecordStore, guideSource.id).guide.status,
  'empty',
  'Guide record and event timestamps must not lie after the persisted simulation time',
);

const earlyGuideWithFutureRecordStore = cloneUnknown(persistedSessionStore);
const earlyGuideWithFutureRecordSnapshot = getEntryRecord(earlyGuideWithFutureRecordStore, 'guide')
  .snapshot as Record<string, unknown>;
const earlyGuideWithFutureRecordCommon = earlyGuideWithFutureRecordSnapshot.common as Record<string, unknown>;
earlyGuideWithFutureRecordCommon.powerOn = false;
earlyGuideWithFutureRecordCommon.heatCapacityPhase = 'powerOff';
const earlyGuideWithFutureRecordWorkflow = (
  (earlyGuideWithFutureRecordSnapshot.guide as Record<string, unknown>).heatCapacityGuideWorkflow
) as Record<string, unknown>;
earlyGuideWithFutureRecordWorkflow.step = 'powerRequired';
earlyGuideWithFutureRecordWorkflow.waitStartedAtS = null;
earlyGuideWithFutureRecordWorkflow.waitStage = null;
assert.equal(
  normalizeHeatCapacityModeSessionStore(earlyGuideWithFutureRecordStore, guideSource.id).guide.status,
  'empty',
  'an early Guide workflow step must reject records from a future step',
);

const staleGuideWaitMetadataStore = cloneUnknown(persistedSessionStore);
const staleGuideWaitMetadataSnapshot = getEntryRecord(staleGuideWaitMetadataStore, 'guide')
  .snapshot as Record<string, unknown>;
(staleGuideWaitMetadataSnapshot.common as Record<string, unknown>).heatCapacityPhase = 'zeroed';
const staleGuideWaitWorkflow = (
  (staleGuideWaitMetadataSnapshot.guide as Record<string, unknown>).heatCapacityGuideWorkflow
) as Record<string, unknown>;
staleGuideWaitWorkflow.step = 'closeStopcockBeforePumpRequired';
assert.equal(
  normalizeHeatCapacityModeSessionStore(staleGuideWaitMetadataStore, guideSource.id).guide.status,
  'empty',
  'a non-waiting Guide workflow step must clear stale wait metadata',
);

const unpoweredRecordU1Store = cloneUnknown(persistedSessionStore);
const unpoweredRecordU1Snapshot = getEntryRecord(unpoweredRecordU1Store, 'guide').snapshot as Record<string, unknown>;
const unpoweredRecordU1Common = unpoweredRecordU1Snapshot.common as Record<string, unknown>;
unpoweredRecordU1Common.powerOn = false;
unpoweredRecordU1Common.heatCapacityPhase = 'powerOff';
const unpoweredRecordU1Workflow = (
  (unpoweredRecordU1Snapshot.guide as Record<string, unknown>).heatCapacityGuideWorkflow
) as Record<string, unknown>;
unpoweredRecordU1Workflow.step = 'recordU1Required';
assert.equal(
  normalizeHeatCapacityModeSessionStore(unpoweredRecordU1Store, guideSource.id).guide.status,
  'empty',
  'recordU1Required must not restore with the apparatus powered off',
);

const completedGuideWithoutTrialStore = cloneUnknown(persistedSessionStore);
const completedGuideWithoutTrialEntry = getEntryRecord(completedGuideWithoutTrialStore, 'guide');
completedGuideWithoutTrialEntry.status = 'completed';
const completedGuideWithoutTrialSnapshot = completedGuideWithoutTrialEntry.snapshot as Record<string, unknown>;
const completedGuideWithoutTrialCommon = completedGuideWithoutTrialSnapshot.common as Record<string, unknown>;
completedGuideWithoutTrialCommon.heatCapacityTeachingStatus = 'completed';
completedGuideWithoutTrialCommon.powerOn = false;
completedGuideWithoutTrialCommon.heatCapacityPhase = 'powerOff';
const completedGuideWithoutTrialRuntime = completedGuideWithoutTrialSnapshot.guide as Record<string, unknown>;
(completedGuideWithoutTrialRuntime.heatCapacityGuideWorkflow as Record<string, unknown>).step = 'completed';
completedGuideWithoutTrialRuntime.heatCapacityGuideTrial = null;
assert.equal(
  normalizeHeatCapacityModeSessionStore(completedGuideWithoutTrialStore, guideSource.id).guide.status,
  'empty',
  'a completed Guide workflow must retain its complete trial evidence',
);

for (const opaquePayload of (() => {
  const cyclicPayload: Record<string, unknown> = {};
  cyclicPayload.self = cyclicPayload;
  const deepPayload: Record<string, unknown> = {};
  let cursor = deepPayload;
  for (let depth = 0; depth < 20; depth += 1) {
    const next: Record<string, unknown> = {};
    cursor.next = next;
    cursor = next;
  }
  return [
    { label: 'cyclic', value: cyclicPayload },
    { label: 'over-depth', value: deepPayload },
  ];
})()) {
  const malformedStore = cloneUnknown(persistedSessionStore);
  const snapshot = getEntryRecord(malformedStore, 'guide').snapshot as Record<string, unknown>;
  (snapshot.guide as Record<string, unknown>).heatCapacityGuideTrial = {
    ...createHeatCapacityGuideTrial(`guide-${opaquePayload.label}`),
    eventLog: [{
      atS: 0,
      type: 'workflow',
      message: opaquePayload.label,
      data: opaquePayload.value,
    }],
  };
  let normalized: ReturnType<typeof normalizeHeatCapacityModeSessionStore> | null = null;
  assert.doesNotThrow(() => {
    normalized = normalizeHeatCapacityModeSessionStore(malformedStore, guideSource.id);
  }, `${opaquePayload.label} opaque event data must never make the public normalizer throw`);
  assert.equal(
    normalized?.guide.status,
    'empty',
    `${opaquePayload.label} opaque event data must invalidate the containing entry`,
  );
}

const malformedFreeDomainStore = cloneUnknown(persistedSessionStore);
const malformedFreeDomainSnapshot = getEntryRecord(malformedFreeDomainStore, 'free')
  .snapshot as Record<string, unknown>;
const malformedFreeDomain = (
  (malformedFreeDomainSnapshot.free as Record<string, unknown>).heatCapacityFreeRealDomain
) as Record<string, unknown>;
malformedFreeDomain.physicsState = {};
assert.equal(
  normalizeHeatCapacityModeSessionStore(malformedFreeDomainStore, freeSource.id).free.status,
  'empty',
  'an empty physics state nested inside a Free domain must invalidate the runtime',
);

const unknownNestedFieldsStore = cloneUnknown(persistedSessionStore);
const unknownNestedFreeSnapshot = getEntryRecord(unknownNestedFieldsStore, 'free')
  .snapshot as Record<string, unknown>;
const unknownNestedFreeRuntime = unknownNestedFreeSnapshot.free as Record<string, unknown>;
(unknownNestedFreeRuntime.heatCapacityFreePhysicsState as Record<string, unknown>).legacyField = 42;
const unknownNestedCommon = unknownNestedFreeSnapshot.common as Record<string, unknown>;
(unknownNestedCommon.recordedPressures as Record<string, unknown>).legacyPressure = 99;
unknownNestedCommon.heatCapacityProcessSamples = {
  ...unknownNestedCommon.heatCapacityProcessSamples as Record<string, unknown>,
  legacySample: { timeS: 1 },
};
const normalizedUnknownNestedFields = normalizeHeatCapacityModeSessionStore(
  unknownNestedFieldsStore,
  freeSource.id,
);
assert.equal(normalizedUnknownNestedFields.free.status, 'suspended');
if (normalizedUnknownNestedFields.free.snapshot?.mode !== 'free') {
  throw new Error('Expected the canonical Free snapshot to survive unknown-field stripping.');
}
assert.equal(
  Object.prototype.hasOwnProperty.call(
    normalizedUnknownNestedFields.free.snapshot.free.heatCapacityFreePhysicsState,
    'legacyField',
  ),
  false,
  'canonical nested physics reconstruction must not retain legacy fields',
);
assert.equal(
  Object.prototype.hasOwnProperty.call(
    normalizedUnknownNestedFields.free.snapshot.common.recordedPressures,
    'legacyPressure',
  ),
  false,
  'canonical pressure reconstruction must not retain legacy fields',
);
assert.equal(
  Object.prototype.hasOwnProperty.call(
    normalizedUnknownNestedFields.free.snapshot.common.heatCapacityProcessSamples,
    'legacySample',
  ),
  false,
  'canonical process-sample reconstruction must not retain unknown sample keys',
);

const mismatchedFileStore = cloneUnknown(persistedSessionStore);
(getEntryRecord(mismatchedFileStore, 'guide').snapshot as Record<string, unknown>).fileId = 'other-file';
assert.equal(
  normalizeHeatCapacityModeSessionStore(mismatchedFileStore, guideSource.id).guide.status,
  'empty',
  'a runtime snapshot from another file must be discarded',
);

const mismatchedModeStore = cloneUnknown(persistedSessionStore);
(getEntryRecord(mismatchedModeStore, 'guide').snapshot as Record<string, unknown>).mode = 'free';
assert.equal(
  normalizeHeatCapacityModeSessionStore(mismatchedModeStore, guideSource.id).guide.status,
  'empty',
  'a runtime snapshot stored under another mode must be discarded',
);

const mismatchedCheckpointFileStore = cloneUnknown(persistedSessionStore);
(getEntryRecord(mismatchedCheckpointFileStore, 'guide').uiCheckpoint as Record<string, unknown>).fileId = 'other-file';
assert.equal(
  normalizeHeatCapacityModeSessionStore(mismatchedCheckpointFileStore, guideSource.id).guide.status,
  'empty',
  'a UI checkpoint from another file must invalidate the whole mode entry',
);

const malformedCheckpointStore = cloneUnknown(persistedSessionStore);
delete (getEntryRecord(malformedCheckpointStore, 'guide').uiCheckpoint as Record<string, unknown>).scene;
assert.equal(
  normalizeHeatCapacityModeSessionStore(malformedCheckpointStore, guideSource.id).guide.status,
  'empty',
  'a malformed dedicated UI checkpoint must not be partially restored',
);

console.log('workbenchHeatCapacityModeSession tests passed');
