import assert from 'node:assert/strict';
import {
  createHeatCapacityFreeGroupLollipopChartModel,
} from '../../src/domain/heatCapacity/heatCapacityFreeGroupChartModel.ts';
import {
  getHeatCapacityFreeExperimentGroupInvariantErrors,
} from '../../src/domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';
import {
  createProductIntroOutcomeGroupFixture,
  createProductIntroOutcomeReview,
} from '../../src/features/onboarding/productIntroOutcomeFixture.ts';

const fixture = createProductIntroOutcomeGroupFixture();
const review = createProductIntroOutcomeReview();
const chart = createHeatCapacityFreeGroupLollipopChartModel(fixture.group);

assert.deepEqual(getHeatCapacityFreeExperimentGroupInvariantErrors(fixture.collection), []);
assert.equal(fixture.group.runSeries.trials.length, 3);
assert.equal(review.trialOptions.length, 3);
assert.equal(chart.status, 'completed');
assert.equal(chart.points.length, 3);
assert.equal(chart.meanGamma, 1.398);
assert.notEqual(chart.meanGamma, chart.theoreticalGamma);
assert.equal(fixture.group.finalScore?.total, 100);

console.log('productIntroOutcomeFixture tests passed');
