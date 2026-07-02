import assert from 'node:assert/strict';
import {
  scoreHeatCapacityFreeProcess,
} from '../../src/domain/heatCapacity/heatCapacityFreeProcessScoringModel.ts';
import {
  createCompleteProcessScoringInputFixture,
  createIncompleteProcessScoringInputFixture,
  createOverVentedProcessScoringInputFixture,
} from './helpers/heatCapacityProcessReviewTestFactory.ts';
import {
  appendFreeTraceEvent,
} from '../../src/domain/heatCapacity/heatCapacityFreeTraceModel.ts';

const complete = createCompleteProcessScoringInputFixture();
const completeScore = scoreHeatCapacityFreeProcess(complete);
const recordChainItem = completeScore.items.find((item) => item.id === 'recordChain');

assert.equal(completeScore.maxScore, 100);
assert.deepEqual(completeScore.items.map((item) => item.id), ['pumping', 'release', 'recordChain', 'retake']);
assert.deepEqual(completeScore.items.map((item) => item.maxScore), [20, 20, 50, 10]);
assert.equal(completeScore.total !== null && completeScore.total >= 70, true);
assert.equal(recordChainItem?.status, 'reasonable');
assert.equal(recordChainItem?.score, recordChainItem?.maxScore);
assert.deepEqual(recordChainItem?.details.map((detail) => detail.maxScore), [10, 5, 15, 20]);
assert.deepEqual(recordChainItem?.details.map((detail) => detail.id), [
  'record-chain-completeness',
  'record-chain-result',
  'record-chain-zeroing',
  'record-chain-timing',
]);

for (const item of completeScore.items) {
  assert.equal(Array.isArray(item.details), true, `${item.id} should expose sub-score details`);
  assert.equal((item.details ?? []).length > 0, true, `${item.id} should have sub-score details`);
  assert.equal(
    (item.details ?? []).reduce((sum, detail) => sum + detail.maxScore, 0),
    item.maxScore,
    `${item.id} detail max score should match item max score`,
  );
  assert.equal(
    (item.details ?? []).reduce((sum, detail) => sum + detail.score, 0),
    item.score,
    `${item.id} detail score should match item score`,
  );
  assert.equal(
    (item.details ?? []).some((detail) => detail.reason.length > 0 && detail.recommendation.length > 0),
    true,
    `${item.id} details should explain deductions and fixes`,
  );
}

const overVented = scoreHeatCapacityFreeProcess(createOverVentedProcessScoringInputFixture());
assert.equal(overVented.items.find((item) => item.id === 'release')?.status, 'needs-improvement');
assert.equal((overVented.items.find((item) => item.id === 'release')?.score ?? 20) < 14, true);

const warningFixture = createCompleteProcessScoringInputFixture();
const warningSample = warningFixture.branch.samples[1];
assert.notEqual(warningSample, undefined, 'warning scoring fixture needs a U1 sample');
const warningBranch = appendFreeTraceEvent(warningFixture.branch, {
  atS: warningSample!.atS,
  type: 'pressure-warning',
  traceSampleId: warningSample!.id,
}).branch;
const warningScore = scoreHeatCapacityFreeProcess({
  ...warningFixture,
  branch: warningBranch,
});
const warningPumpingItem = warningScore.items.find((item) => item.id === 'pumping');
assert.equal(
  warningPumpingItem?.details.find((detail) => detail.id === 'pumping-safety')?.score,
  4,
  'pressure warning should be a small teaching deduction, while danger/alarm remains a hard deduction',
);

const incomplete = scoreHeatCapacityFreeProcess(createIncompleteProcessScoringInputFixture());
assert.equal(incomplete.total, null);
assert.equal(incomplete.items.find((item) => item.id === 'recordChain')?.status, 'insufficient-data');

console.log('heatCapacityFreeProcessScoringModel tests passed');
