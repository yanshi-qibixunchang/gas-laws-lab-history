import assert from 'node:assert/strict';
import {
  beginHeatCapacityFreeIdealGroupProcessing,
  completeHeatCapacityFreeIdealExperimentGroup,
  createEmptyHeatCapacityFreeExperimentGroupCollection,
  createHeatCapacityFreeExperimentGroupDraft,
  selectCurrentHeatCapacityFreeExperimentGroup,
  startHeatCapacityFreeExperimentGroup,
  updateCurrentHeatCapacityFreeExperimentGroupRunSeries,
} from '../../src/domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';
import {
  createHeatCapacityFreeAllGroupsOverviewModel,
  createHeatCapacityFreeGroupLollipopChartModel,
} from '../../src/domain/heatCapacity/heatCapacityFreeGroupChartModel.ts';
import {
  calculateFreeHeatCapacityMeanResult,
} from '../../src/domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import {
  createDefaultFreeConfigSnapshot,
} from '../../src/domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  createCompleteProcessReviewFixtureParts,
} from './helpers/heatCapacityProcessReviewTestFactory.ts';

const snapshot = createDefaultFreeConfigSnapshot();
const createTrials = (groupId: string, count: number) => Array.from({ length: count }, (_, index) => {
  const trial = createCompleteProcessReviewFixtureParts().trial;
  return {
    ...trial,
    id: `${groupId}:trial:${index + 1}`,
    parameterScheme: 'ideal' as const,
    batchMembership: {
      version: 1 as const,
      batchId: groupId,
      sequence: index + 1,
    },
    completedAtMs: 1_000 + index,
    correctedSignals: trial.correctedSignals
      ? {
          ...trial.correctedSignals,
          gamma: trial.correctedSignals.gamma + index * 0.001,
        }
      : null,
  };
});

let collection = createHeatCapacityFreeExperimentGroupDraft(
  createEmptyHeatCapacityFreeExperimentGroupCollection('ideal'),
  {
    id: 'ideal-group',
    scheme: 'ideal',
    gasType: 'air',
    targetExperimentCount: 4,
    now: 100,
  },
);
collection = startHeatCapacityFreeExperimentGroup(collection, snapshot, 200);
let group = selectCurrentHeatCapacityFreeExperimentGroup(collection)!;
const twoTrials = createTrials(group.id, 2);
collection = updateCurrentHeatCapacityFreeExperimentGroupRunSeries(collection, {
  ...group.runSeries,
  batch: { ...group.runSeries.batch, nextTrialSequence: 3 },
  trials: twoTrials,
});
group = selectCurrentHeatCapacityFreeExperimentGroup(collection)!;
assert.equal(createHeatCapacityFreeGroupLollipopChartModel(group).status, 'hidden');

const threeTrials = createTrials(group.id, 3);
collection = updateCurrentHeatCapacityFreeExperimentGroupRunSeries(collection, {
  ...group.runSeries,
  batch: { ...group.runSeries.batch, nextTrialSequence: 4 },
  trials: threeTrials,
});
group = selectCurrentHeatCapacityFreeExperimentGroup(collection)!;
const stagedChart = createHeatCapacityFreeGroupLollipopChartModel(group);
assert.equal(stagedChart.status, 'in-progress');
assert.equal(stagedChart.points.length, 3);
assert.equal(stagedChart.typeAStandardUncertainty, null, 'ideal groups show basic results without uncertainty');
assert.equal(createHeatCapacityFreeAllGroupsOverviewModel(collection).points[0]?.completed, false);

const fourTrials = createTrials(group.id, 4);
collection = updateCurrentHeatCapacityFreeExperimentGroupRunSeries(collection, {
  ...group.runSeries,
  batch: { ...group.runSeries.batch, nextTrialSequence: 5 },
  trials: fourTrials,
});
collection = beginHeatCapacityFreeIdealGroupProcessing(collection, 300);
const result = calculateFreeHeatCapacityMeanResult(fourTrials, {
  theoreticalGamma: snapshot.physics.gamma,
});
collection = completeHeatCapacityFreeIdealExperimentGroup(collection, result, 400);
group = selectCurrentHeatCapacityFreeExperimentGroup(collection)!;
const completedChart = createHeatCapacityFreeGroupLollipopChartModel(group);
assert.equal(completedChart.status, 'completed');
assert.equal(completedChart.points.length, 4);
assert.equal(createHeatCapacityFreeAllGroupsOverviewModel(collection).points[0]?.completed, true);

console.log('heatCapacityFreeGroupChartModel tests passed');
