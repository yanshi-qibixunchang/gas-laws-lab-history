import assert from 'node:assert/strict';
import {
  HEAT_CAPACITY_RELEASE_TIMING,
  HEAT_CAPACITY_STANDARD_OPERATION,
  HEAT_CAPACITY_STANDARD_PUMP_STROKE_INTERVAL_S,
} from '../../src/domain/heatCapacity/heatCapacityDefaultConfig.ts';
import {
  normalizeHeatCapacityModeSessionStore,
  restoreHeatCapacityModeSession,
  suspendHeatCapacityModeSession,
} from '../../src/features/workbench/workbenchHeatCapacityModeSession.ts';
import {
  applyHeatCapacityFreeRecordWorkbenchState,
  completeHeatCapacityFreePreheatWorkbenchState,
  configureHeatCapacityFreeBatchWorkbenchState,
  createDefaultHeatCapacityFile,
  enterHeatCapacityFreeModeWorkbenchState,
  getHeatCapacityFreeBatchProgress,
  powerHeatCapacityWorkbenchFile,
  registerHeatCapacityPumpStroke,
  removeHeatCapacityFreeTrialRecordWorkbenchState,
  setHeatCapacityFreePumpValveOpen,
  setHeatCapacityFreeStopcockOpen,
  prepareNextHeatCapacityFreeExperimentWorkbenchState,
  stepHeatCapacityWorkbenchFile,
} from '../../src/features/workbench/workbenchState.ts';

const assertFreeModeSessionPersistable = (
  file: ReturnType<typeof createDefaultHeatCapacityFile>,
  capturedAtMs: number,
  message: string,
) => {
  const suspended = suspendHeatCapacityModeSession(file, null, capturedAtMs);
  const normalized = normalizeHeatCapacityModeSessionStore(
    structuredClone(suspended.heatCapacityModeSessions),
    file.id,
  );
  assert.equal(normalized.free.status, 'suspended', message);
  return suspended;
};

let unzeroed = createDefaultHeatCapacityFile(101);
unzeroed = enterHeatCapacityFreeModeWorkbenchState(unzeroed, 100);
unzeroed = configureHeatCapacityFreeBatchWorkbenchState(unzeroed, 3, 200);
unzeroed = completeHeatCapacityFreePreheatWorkbenchState(unzeroed, 300);
unzeroed = powerHeatCapacityWorkbenchFile(unzeroed, true, 400);
unzeroed = setHeatCapacityFreeStopcockOpen(unzeroed, true, 500);
unzeroed = stepHeatCapacityWorkbenchFile(
  unzeroed,
  500 + HEAT_CAPACITY_RELEASE_TIMING.openingAnimationDurationMs + 1,
);
assert.equal(unzeroed.pressureZeroed, false);
const unzeroedU0Attempt = applyHeatCapacityFreeRecordWorkbenchState(
  unzeroed,
  'u0',
  2_000,
);
assert.equal(
  unzeroedU0Attempt.accepted,
  true,
  'the normal Free UI route intentionally accepts U0 without a zero event',
);
assertFreeModeSessionPersistable(
  unzeroedU0Attempt.file,
  2_001,
  'every U0 record accepted by the normal Free route must remain persistable',
);

const pristine = createDefaultHeatCapacityFile(102);
const pristineSuspended = assertFreeModeSessionPersistable(
  pristine,
  1_000,
  'a pristine Free mode must be persistable',
);
const pristineRestored = restoreHeatCapacityModeSession(
  pristineSuspended,
  'free',
  2_000,
);
assert.notEqual(pristineRestored, null);
if (pristineRestored) {
  assertFreeModeSessionPersistable(
    pristineRestored,
    3_000,
    'restore followed by re-suspend must preserve the persistable-state closure',
  );
}

interface ReachabilityClock {
  nowMs: number;
}

const advanceClock = (clock: ReachabilityClock, deltaMs: number) => {
  clock.nowMs += deltaMs;
  return clock.nowMs;
};

const completeNaturalFreeGroup = (
  source: ReturnType<typeof createDefaultHeatCapacityFile>,
  clock: ReachabilityClock,
) => {
  let file = powerHeatCapacityWorkbenchFile(source, true, advanceClock(clock, 100));
  file = completeHeatCapacityFreePreheatWorkbenchState(file, advanceClock(clock, 5_000));
  file = setHeatCapacityFreeStopcockOpen(file, true, advanceClock(clock, 100));
  file = stepHeatCapacityWorkbenchFile(
    file,
    advanceClock(clock, HEAT_CAPACITY_RELEASE_TIMING.openingAnimationDurationMs),
  );
  const u0 = applyHeatCapacityFreeRecordWorkbenchState(
    file,
    'u0',
    advanceClock(clock, 100),
  );
  assert.equal(u0.accepted, true);
  file = setHeatCapacityFreeStopcockOpen(u0.file, false, advanceClock(clock, 100));
  file = stepHeatCapacityWorkbenchFile(
    file,
    advanceClock(clock, HEAT_CAPACITY_RELEASE_TIMING.closingAnimationDurationMs),
  );
  file = setHeatCapacityFreePumpValveOpen(file, true, advanceClock(clock, 100));
  const strokeIntervalMs = Math.round(HEAT_CAPACITY_STANDARD_PUMP_STROKE_INTERVAL_S * 1_000);
  for (
    let strokeIndex = 0;
    strokeIndex < HEAT_CAPACITY_STANDARD_OPERATION.pumpStrokes;
    strokeIndex += 1
  ) {
    file = registerHeatCapacityPumpStroke(file, advanceClock(clock, strokeIntervalMs));
  }
  file = setHeatCapacityFreePumpValveOpen(file, false, advanceClock(clock, 100));
  const u1 = applyHeatCapacityFreeRecordWorkbenchState(
    file,
    'u1',
    advanceClock(clock, 100),
  );
  assert.equal(u1.accepted, true);
  file = setHeatCapacityFreeStopcockOpen(u1.file, true, advanceClock(clock, 100));
  file = stepHeatCapacityWorkbenchFile(
    file,
    advanceClock(
      clock,
      HEAT_CAPACITY_RELEASE_TIMING.openingAnimationDurationMs +
        HEAT_CAPACITY_RELEASE_TIMING.autoDemoReleaseDurationS * 1_000,
    ),
  );
  file = setHeatCapacityFreeStopcockOpen(file, false, advanceClock(clock, 100));
  file = stepHeatCapacityWorkbenchFile(
    file,
    advanceClock(clock, HEAT_CAPACITY_RELEASE_TIMING.closingAnimationDurationMs),
  );
  const u2 = applyHeatCapacityFreeRecordWorkbenchState(
    file,
    'u2',
    advanceClock(clock, 100),
  );
  assert.equal(u2.accepted, true);
  file = powerHeatCapacityWorkbenchFile(u2.file, false, advanceClock(clock, 100));
  assert.notEqual(file.heatCapacityFreeTrials.at(-1)?.completedAtMs, null);
  return file;
};

const replacementClock: ReachabilityClock = { nowMs: 10_000 };
let replacement = enterHeatCapacityFreeModeWorkbenchState(
  createDefaultHeatCapacityFile(103),
  advanceClock(replacementClock, 100),
);
replacement = configureHeatCapacityFreeBatchWorkbenchState(
  replacement,
  4,
  advanceClock(replacementClock, 100),
);
for (let groupIndex = 0; groupIndex < 3; groupIndex += 1) {
  replacement = completeNaturalFreeGroup(replacement, replacementClock);
  if (groupIndex < 2) {
    const currentExperimentGroupId = replacement.heatCapacityFreeExperimentGroups.currentGroupId;
    replacement = prepareNextHeatCapacityFreeExperimentWorkbenchState(
      replacement,
      advanceClock(replacementClock, 100),
    );
    assert.equal(
      replacement.heatCapacityFreeExperimentGroups.currentGroupId,
      currentExperimentGroupId,
      'automatic experiment advance must keep the current experiment group attached',
    );
    assert.equal(
      getHeatCapacityFreeBatchProgress(replacement).currentGroupNumber,
      groupIndex + 2,
      'automatic experiment advance must expose the next experiment number',
    );
  }
}
assert.deepEqual(
  replacement.heatCapacityFreeTrials.map((trial) => trial.batchMembership?.sequence),
  [1, 2, 3],
);
replacement = removeHeatCapacityFreeTrialRecordWorkbenchState(
  replacement,
  1,
  'trial',
  advanceClock(replacementClock, 100),
);
assert.deepEqual(
  replacement.heatCapacityFreeTrials.map((trial) => trial.batchMembership?.sequence),
  [1, 3],
);
assertFreeModeSessionPersistable(
  replacement,
  advanceClock(replacementClock, 10),
  'deleting a completed middle group must leave the batch persistable',
);
replacement = prepareNextHeatCapacityFreeExperimentWorkbenchState(
  replacement,
  advanceClock(replacementClock, 100),
);
replacement = powerHeatCapacityWorkbenchFile(
  replacement,
  true,
  advanceClock(replacementClock, 100),
);
replacement = completeHeatCapacityFreePreheatWorkbenchState(
  replacement,
  advanceClock(replacementClock, 5_000),
);
replacement = setHeatCapacityFreeStopcockOpen(
  replacement,
  true,
  advanceClock(replacementClock, 100),
);
replacement = stepHeatCapacityWorkbenchFile(
  replacement,
  advanceClock(replacementClock, HEAT_CAPACITY_RELEASE_TIMING.openingAnimationDurationMs),
);
const replacementU0 = applyHeatCapacityFreeRecordWorkbenchState(
  replacement,
  'u0',
  advanceClock(replacementClock, 100),
);
assert.equal(replacementU0.accepted, true);
assert.equal(
  new Set(replacementU0.file.heatCapacityFreeTrials.map((trial) => trial.id)).size,
  replacementU0.file.heatCapacityFreeTrials.length,
  'a replacement group must receive a stable internal identity that was never reused',
);
assert.deepEqual(
  replacementU0.file.heatCapacityFreeTrials.map(
    (trial) => trial.batchMembership?.sequence,
  ),
  [1, 3, 4],
  'deleting the displayed second row must not renumber or reuse internal identities',
);
assertFreeModeSessionPersistable(
  replacementU0.file,
  advanceClock(replacementClock, 10),
  'a replacement group created after deleting the middle row must remain persistable',
);

console.log('workbenchPersistenceReachability tests passed');
