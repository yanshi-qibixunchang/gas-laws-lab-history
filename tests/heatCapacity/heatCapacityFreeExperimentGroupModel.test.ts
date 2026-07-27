import assert from 'node:assert/strict';
import {
  abandonCurrentHeatCapacityFreeExperimentGroupDraft,
  beginHeatCapacityFreeIdealGroupProcessing,
  completeHeatCapacityFreeIdealExperimentGroup,
  createEmptyHeatCapacityFreeExperimentGroupCollection,
  createHeatCapacityFreeExperimentGroupDraft,
  getHeatCapacityFreeExperimentGroupInvariantErrors,
  selectCurrentHeatCapacityFreeExperimentGroup,
  setHeatCapacityFreeExperimentGroupDraftScheme,
  startHeatCapacityFreeExperimentGroup,
  updateCurrentHeatCapacityFreeExperimentGroupRunSeries,
} from '../../src/domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';
import {
  calculateFreeHeatCapacityMeanResult,
} from '../../src/domain/heatCapacity/heatCapacityFreeTrialModel.ts';
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

collection = setHeatCapacityFreeExperimentGroupDraftScheme(collection, 'ideal', 'air');
current = selectCurrentHeatCapacityFreeExperimentGroup(collection);
assert.equal(current?.scheme, 'ideal');
assert.equal(current?.targetExperimentCount, 3, 'switching a blank draft scheme must preserve experiment count');

const snapshot = createDefaultFreeConfigSnapshot();
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
collection = beginHeatCapacityFreeIdealGroupProcessing(collection, 400);
current = selectCurrentHeatCapacityFreeExperimentGroup(collection);
assert.equal(current?.status, 'awaiting-ideal-processing');
const idealResult = calculateFreeHeatCapacityMeanResult(idealTrials, {
  theoreticalGamma: snapshot.physics.gamma,
});
collection = completeHeatCapacityFreeIdealExperimentGroup(collection, idealResult, 500);
current = selectCurrentHeatCapacityFreeExperimentGroup(collection);
assert.equal(current?.status, 'completed');
assert.equal(current?.calculation?.kind, 'ideal-automatic');
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
