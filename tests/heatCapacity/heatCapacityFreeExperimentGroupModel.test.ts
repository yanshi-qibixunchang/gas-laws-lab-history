import assert from 'node:assert/strict';
import {
  abandonCurrentHeatCapacityFreeExperimentGroupDraft,
  beginHeatCapacityFreeIdealGroupCalculation,
  completeHeatCapacityFreeIdealExperimentGroupCalculation,
  createEmptyHeatCapacityFreeExperimentGroupCollection,
  createHeatCapacityFreeExperimentGroupDraft,
  getHeatCapacityFreeExperimentGroupInvariantErrors,
  selectCurrentHeatCapacityFreeExperimentGroup,
  setHeatCapacityFreeExperimentGroupDraftScheme,
  startHeatCapacityFreeExperimentGroup,
  updateCurrentHeatCapacityFreeExperimentGroupRunSeries,
} from '../../src/domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';
import {
  calculateHeatCapacityGroupReference,
} from '../../src/domain/heatCapacity/heatCapacityCalculationModel.ts';
import {
  createHeatCapacityCalculationWorkflowSession,
} from '../../src/domain/heatCapacity/heatCapacityCalculationWorkflowModel.ts';
import {
  createDefaultFreeConfigSnapshot,
} from '../../src/domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  createCompleteProcessReviewFixtureParts,
} from './helpers/heatCapacityProcessReviewTestFactory.ts';

const createCompletedTrials = (groupId: string, count: number) => (
  Array.from({ length: count }, (_, index) => {
    const fixture = createCompleteProcessReviewFixtureParts();
    return {
      ...fixture.trial,
      id: `${groupId}:trial:${index + 1}`,
      parameterScheme: 'ideal' as const,
      batchMembership: {
        version: 1 as const,
        batchId: groupId,
        sequence: index + 1,
      },
      completedAtMs: 2_000 + index,
    };
  })
);

let collection = createEmptyHeatCapacityFreeExperimentGroupCollection();
collection = createHeatCapacityFreeExperimentGroupDraft(collection, {
  id: 'draft-1',
  scheme: 'real',
  gasType: 'air',
  targetExperimentCount: 3,
  now: 100,
});
let current = selectCurrentHeatCapacityFreeExperimentGroup(collection);
assert.equal(current?.status, 'draft');
assert.equal(current?.schemeGroupNumber, null, 'a blank draft must not consume a formal group number');
assert.equal(collection.nextSchemeGroupNumber.real, 1);

collection = setHeatCapacityFreeExperimentGroupDraftScheme(collection, 'ideal', 'helium');
current = selectCurrentHeatCapacityFreeExperimentGroup(collection);
assert.equal(current?.scheme, 'ideal');
assert.equal(current?.targetExperimentCount, 3, 'switching a blank draft scheme must preserve experiment count');

const defaultSnapshot = createDefaultFreeConfigSnapshot();
const snapshot = {
  ...defaultSnapshot,
  physics: {
    ...defaultSnapshot.physics,
    gamma: 5 / 3,
  },
};
collection = startHeatCapacityFreeExperimentGroup(collection, snapshot, 200);
current = selectCurrentHeatCapacityFreeExperimentGroup(collection);
assert.equal(current?.status, 'collecting');
assert.equal(current?.schemeGroupNumber, 1);
assert.equal(current?.globalOrder, 1);
assert.equal(collection.nextSchemeGroupNumber.ideal, 2);
assert.equal(collection.nextSchemeGroupNumber.real, 1, 'real numbering must remain isolated');

const rejectedSecondDraft = createHeatCapacityFreeExperimentGroupDraft(collection, {
  id: 'draft-blocked',
  scheme: 'real',
  gasType: 'air',
  targetExperimentCount: 3,
  now: 300,
});
assert.equal(rejectedSecondDraft, collection, 'only one executable unfinished group is allowed');

const idealTrials = createCompletedTrials('draft-1', 3);
collection = updateCurrentHeatCapacityFreeExperimentGroupRunSeries(collection, {
  batch: {
    ...current!.runSeries.batch,
    nextTrialSequence: 4,
  },
  trials: idealTrials,
  traceStore: current!.runSeries.traceStore,
});
const calculationReference = calculateHeatCapacityGroupReference({
  u0Mv: 0,
  u1Mv: 120,
  u2Mv: 50,
  atmosphericPressureKPa: 101.3,
  pressureSensitivityMvPerKPa: 20,
})!;
const calculationSession = createHeatCapacityCalculationWorkflowSession({
  mode: 'free',
  groups: idealTrials.map((trial) => ({ trialId: trial.id, reference: calculationReference })),
  theoreticalGamma: snapshot.physics.gamma,
  presentation: 'interactive',
  now: 400,
});
collection = beginHeatCapacityFreeIdealGroupCalculation(collection, calculationSession, 400);
current = selectCurrentHeatCapacityFreeExperimentGroup(collection);
assert.equal(current?.status, 'awaiting-ideal-calculation');
assert.equal(current?.calculation?.kind, 'ideal-interactive');
const completedCalculationSession = {
  ...calculationSession,
  status: 'completed' as const,
  activeStepId: null,
  completedAtMs: 500,
};
collection = completeHeatCapacityFreeIdealExperimentGroupCalculation(
  collection,
  completedCalculationSession,
  500,
);
current = selectCurrentHeatCapacityFreeExperimentGroup(collection);
assert.equal(current?.status, 'completed');
assert.equal(current?.calculation?.kind, 'ideal-interactive');
assert.equal(current?.finalScore, null, 'ideal groups must never own a score');

const completedSnapshot = structuredClone(current);
collection = createHeatCapacityFreeExperimentGroupDraft(collection, {
  id: 'draft-2',
  scheme: 'real',
  gasType: 'air',
  targetExperimentCount: 4,
  now: 600,
});
assert.equal(selectCurrentHeatCapacityFreeExperimentGroup(collection)?.schemeGroupNumber, null);
collection = abandonCurrentHeatCapacityFreeExperimentGroupDraft(collection);
assert.deepEqual(
  selectCurrentHeatCapacityFreeExperimentGroup(collection),
  completedSnapshot,
  'abandoning a blank draft must restore the latest completed group unchanged',
);
assert.equal(collection.nextSchemeGroupNumber.real, 1, 'abandoning a draft must not consume numbering');
assert.deepEqual(getHeatCapacityFreeExperimentGroupInvariantErrors(collection), []);

console.log('heatCapacityFreeExperimentGroupModel tests passed');
