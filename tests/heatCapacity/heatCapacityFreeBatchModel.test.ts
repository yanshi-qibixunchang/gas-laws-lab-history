import assert from 'node:assert/strict';
import {
  HEAT_CAPACITY_FREE_BATCH_GROUP_OPTIONS,
  HEAT_CAPACITY_FREE_BATCH_LEGACY_VERSION,
  HEAT_CAPACITY_FREE_BATCH_VERSION,
  allocateHeatCapacityFreeTrialIdentity,
  completeHeatCapacityFreeBatchExperiment,
  configureHeatCapacityFreeBatch,
  createEmptyHeatCapacityFreeBatchState,
  dispatchHeatCapacityFreeBatchVersion,
  deriveHeatCapacityFreeBatchProgress,
  isHeatCapacityFreeBatchGroupCount,
  isHeatCapacityFreeBatchLocked,
  normalizeHeatCapacityFreeBatchState,
  planHeatCapacityFreeBatchAggregateMigration,
  shouldStartHeatCapacityFreeBatchCalculation,
  startHeatCapacityFreeBatch,
  type HeatCapacityFreeBatchState,
  type HeatCapacityFreeBatchStateV1,
} from '../../src/domain/heatCapacity/heatCapacityFreeBatchModel.ts';
import {
  createHeatCapacityFreeBatchTrial,
  createHeatCapacityFreeTrial,
  type HeatCapacityFreeTrial,
} from '../../src/domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import {
  configureHeatCapacityFreeBatchWorkbenchState,
  createDefaultHeatCapacityFile,
  freezeHeatCapacityFreeParametersForCurrentGroup,
} from '../../src/features/workbench/workbenchState.ts';

const createCompletedTrial = (
  batch: HeatCapacityFreeBatchState,
  id: string,
): {
  batch: HeatCapacityFreeBatchState;
  trial: HeatCapacityFreeTrial;
} => {
  const allocation = allocateHeatCapacityFreeTrialIdentity(
    batch,
    () => id,
  );
  assert.notEqual(allocation, null);
  return {
    batch: allocation!.batch,
    trial: {
      ...createHeatCapacityFreeBatchTrial(allocation!.identity),
      u1: { displayPressureMv: 100 } as HeatCapacityFreeTrial['u1'],
      u2: { displayPressureMv: 50 } as HeatCapacityFreeTrial['u2'],
      correctedSignals: { gamma: 1.4 } as HeatCapacityFreeTrial['correctedSignals'],
      completedAtMs: 1,
    },
  };
};

const applyMigrationAssignments = (
  trials: HeatCapacityFreeTrial[],
  plan: Extract<
    ReturnType<typeof planHeatCapacityFreeBatchAggregateMigration>,
    { ok: true }
  >,
) => trials.map((trial, index) => {
  const assignment = plan.assignments[index]!;
  return {
    ...trial,
    id: assignment.id,
    batchMembership: { ...assignment.batchMembership },
  };
});

assert.equal(HEAT_CAPACITY_FREE_BATCH_VERSION, 2);
assert.equal(
  createHeatCapacityFreeTrial('legacy-compatible').batchMembership,
  null,
  'the legacy-compatible trial factory must remain source compatible',
);

const completedTrialShape = (trial: HeatCapacityFreeTrial): HeatCapacityFreeTrial => ({
  ...trial,
  u1: { displayPressureMv: 100 } as HeatCapacityFreeTrial['u1'],
  u2: { displayPressureMv: 50 } as HeatCapacityFreeTrial['u2'],
  correctedSignals: { gamma: 1.4 } as HeatCapacityFreeTrial['correctedSignals'],
  completedAtMs: 1,
});

assert.deepEqual(HEAT_CAPACITY_FREE_BATCH_GROUP_OPTIONS, [3, 4, 5, 6, 7]);
assert.equal(isHeatCapacityFreeBatchGroupCount(3), true);
assert.equal(isHeatCapacityFreeBatchGroupCount(7), true);
assert.equal(isHeatCapacityFreeBatchGroupCount(2), false);
assert.equal(isHeatCapacityFreeBatchGroupCount(8), false);
assert.equal(isHeatCapacityFreeBatchGroupCount('3'), false);

const empty = createEmptyHeatCapacityFreeBatchState();
assert.equal(empty.version, 2);
assert.equal(empty.nextTrialSequence, 1);
assert.deepEqual(deriveHeatCapacityFreeBatchProgress(empty, []), {
  configured: false,
  locked: false,
  targetGroupCount: null,
  completedGroupCount: 0,
  currentGroupNumber: null,
  allGroupsRecorded: false,
});

const configured = configureHeatCapacityFreeBatch(empty, 3, 'batch-1', 100);
assert.equal(configured.targetGroupCount, 3);
assert.equal(configured.id, 'batch-1');
assert.equal(configured.configuredAtMs, 100);
assert.equal(configured.startedAtMs, null);
assert.equal(configured.nextTrialSequence, 1);

const frozenFile = freezeHeatCapacityFreeParametersForCurrentGroup(
  configureHeatCapacityFreeBatchWorkbenchState(
    createDefaultHeatCapacityFile(1),
    3,
    99,
  ),
);
const snapshot = frozenFile.heatCapacityFreeActiveRunConfigSnapshot;
assert.notEqual(snapshot, null);
const started = startHeatCapacityFreeBatch(configured, snapshot!, 200);
assert.equal(isHeatCapacityFreeBatchLocked(started), true);
assert.equal(started.startedAtMs, 200);
assert.equal(started.frozenConfigSnapshot, snapshot);
assert.equal(
  configureHeatCapacityFreeBatch(started, 7, 'replacement', 300),
  started,
  'a started batch cannot change its group count',
);

const firstCompleted = createCompletedTrial(started, 'trial-1');
assert.equal(started.nextTrialSequence, 1, 'identity allocation must not mutate its source batch');
assert.equal(firstCompleted.batch.nextTrialSequence, 2);
assert.deepEqual(firstCompleted.trial.batchMembership, {
  version: 1,
  batchId: 'batch-1',
  sequence: 1,
});
const oneComplete = [firstCompleted.trial];
assert.deepEqual(deriveHeatCapacityFreeBatchProgress(firstCompleted.batch, oneComplete), {
  configured: true,
  locked: true,
  targetGroupCount: 3,
  completedGroupCount: 1,
  currentGroupNumber: 2,
  allGroupsRecorded: false,
});
assert.equal(
  shouldStartHeatCapacityFreeBatchCalculation(firstCompleted.batch, oneComplete, false),
  false,
);

const secondCompleted = createCompletedTrial(firstCompleted.batch, 'trial-2');
const thirdCompleted = createCompletedTrial(secondCompleted.batch, 'trial-3');
const allComplete = [
  firstCompleted.trial,
  secondCompleted.trial,
  thirdCompleted.trial,
];
assert.equal(
  deriveHeatCapacityFreeBatchProgress(thirdCompleted.batch, allComplete).allGroupsRecorded,
  true,
);
assert.equal(
  shouldStartHeatCapacityFreeBatchCalculation(thirdCompleted.batch, allComplete, true),
  false,
);
assert.equal(
  shouldStartHeatCapacityFreeBatchCalculation(thirdCompleted.batch, allComplete, false),
  true,
);
assert.equal(
  deriveHeatCapacityFreeBatchProgress(thirdCompleted.batch, [
    ...allComplete,
    completedTrialShape(createHeatCapacityFreeTrial('foreign-trial')),
  ]).completedGroupCount,
  3,
  'unbatched or foreign trials must not count toward the active batch',
);

const completed = completeHeatCapacityFreeBatchExperiment(thirdCompleted.batch, 400);
assert.equal(completed.experimentCompletedAtMs, 400);
assert.equal(shouldStartHeatCapacityFreeBatchCalculation(completed, allComplete, false), false);

const legacyBatch: HeatCapacityFreeBatchStateV1 = {
  version: HEAT_CAPACITY_FREE_BATCH_LEGACY_VERSION,
  id: 'legacy-batch',
  targetGroupCount: 3,
  frozenConfigSnapshot: snapshot,
  configuredAtMs: 100,
  startedAtMs: 200,
  experimentCompletedAtMs: null,
  calculationSession: null,
};
assert.equal(dispatchHeatCapacityFreeBatchVersion(legacyBatch).kind, 'v1');
assert.equal(dispatchHeatCapacityFreeBatchVersion(started).kind, 'v2');
assert.deepEqual(dispatchHeatCapacityFreeBatchVersion(null), { kind: 'missing' });
assert.equal(
  dispatchHeatCapacityFreeBatchVersion({
    ...started,
    opaqueAuthority: 'must-not-be-dropped',
  }).kind,
  'invalid',
  'same-version batch authority must use the exact canonical key set',
);
assert.deepEqual(
  dispatchHeatCapacityFreeBatchVersion({ ...legacyBatch, version: 99 }),
  { kind: 'unsupported-future', version: 99 },
);
assert.throws(
  () => normalizeHeatCapacityFreeBatchState(legacyBatch),
  /requires aggregate identity migration/,
  'a started v1 batch must not reset its identity high-water outside aggregate migration',
);
assert.throws(
  () => normalizeHeatCapacityFreeBatchState({ ...legacyBatch, version: 99 }),
  /Unsupported future Free batch version/,
  'future versions must never be silently normalized into the current schema',
);

const deletedLastLegacyTrials = [
  createHeatCapacityFreeTrial('free-trial-1'),
  createHeatCapacityFreeTrial('free-trial-2'),
];
const deletedLastPlan = planHeatCapacityFreeBatchAggregateMigration({
  batch: legacyBatch,
  trials: deletedLastLegacyTrials,
  traceNextTrialIndex: 4,
});
if ('reason' in deletedLastPlan) throw new Error(deletedLastPlan.reason);
assert.equal(deletedLastPlan.ok, true);
assert.equal(deletedLastPlan.status, 'migrated');
assert.equal(
  deletedLastPlan.batch.nextTrialSequence,
  4,
  'trace high-water must prevent reuse after the last trial was deleted',
);
assert.deepEqual(
  deletedLastPlan.assignments.map((assignment) => assignment.batchMembership.sequence),
  [1, 2],
);

const duplicateLegacyTrials = [
  createHeatCapacityFreeTrial('free-trial-1'),
  createHeatCapacityFreeTrial('free-trial-3'),
  createHeatCapacityFreeTrial('free-trial-3'),
];
const duplicatePlan = planHeatCapacityFreeBatchAggregateMigration({
  batch: legacyBatch,
  trials: duplicateLegacyTrials,
  traceNextTrialIndex: 4,
});
if ('reason' in duplicatePlan) throw new Error(duplicatePlan.reason);
assert.equal(duplicatePlan.ok, true);
assert.equal(duplicatePlan.status, 'relationship-repair-required');
assert.deepEqual(
  duplicatePlan.assignments.map((assignment) => assignment.id),
  [
    'free-trial-1',
    'free-trial-3',
    'legacy-batch:trial:4',
  ],
);
assert.deepEqual(
  duplicatePlan.assignments.map((assignment) => assignment.batchMembership.sequence),
  [1, 3, 4],
);
assert.deepEqual(duplicatePlan.trialIdRewrites, [{
  trialIndex: 2,
  previousId: 'free-trial-3',
  id: 'legacy-batch:trial:4',
}]);
assert.equal(duplicatePlan.batch.nextTrialSequence, 5);

const migratedDuplicateTrials = applyMigrationAssignments(
  duplicateLegacyTrials,
  duplicatePlan,
);
const exactPlan = planHeatCapacityFreeBatchAggregateMigration({
  batch: duplicatePlan.batch,
  trials: migratedDuplicateTrials,
  traceNextTrialIndex: 4,
});
if ('reason' in exactPlan) throw new Error(exactPlan.reason);
assert.equal(exactPlan.ok, true);
assert.equal(exactPlan.status, 'exact');
assert.deepEqual(exactPlan.trialIdRewrites, []);

const repairedTraceHighWaterPlan = planHeatCapacityFreeBatchAggregateMigration({
  batch: {
    ...exactPlan.batch,
    nextTrialSequence: 5,
  },
  trials: migratedDuplicateTrials,
  traceNextTrialIndex: 8,
});
if ('reason' in repairedTraceHighWaterPlan) {
  throw new Error(repairedTraceHighWaterPlan.reason);
}
assert.equal(repairedTraceHighWaterPlan.ok, true);
assert.equal(repairedTraceHighWaterPlan.status, 'migrated');
assert.equal(
  repairedTraceHighWaterPlan.batch.nextTrialSequence,
  8,
  'a current batch must migrate forward to the trace identity high-water',
);

const invalidCurrentCounterPlan = planHeatCapacityFreeBatchAggregateMigration({
  batch: {
    ...duplicatePlan.batch,
    nextTrialSequence: 4,
  },
  trials: migratedDuplicateTrials,
});
assert.deepEqual(
  invalidCurrentCounterPlan.ok
    ? null
    : invalidCurrentCounterPlan.status,
  'invalid',
  'a current batch must never accept a counter at or below an issued sequence',
);

const extraMembershipAuthorityPlan =
  planHeatCapacityFreeBatchAggregateMigration({
    batch: exactPlan.batch,
    trials: migratedDuplicateTrials.map((trial, index) => (
      index === 0
        ? {
            ...trial,
            batchMembership: {
              ...trial.batchMembership!,
              opaqueAuthority: 'must-not-be-dropped',
            },
          }
        : trial
    )),
  });
assert.deepEqual(
  extraMembershipAuthorityPlan.ok
    ? null
    : extraMembershipAuthorityPlan.status,
  'invalid',
  'same-version membership authority must use the exact canonical key set',
);

console.log('heatCapacityFreeBatchModel tests passed');
