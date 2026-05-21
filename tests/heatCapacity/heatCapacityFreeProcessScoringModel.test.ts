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
const completeRecordingItem = completeScore.items.find((item) => item.id === 'recording');

assert.equal(completeScore.maxScore, 100);
assert.equal(completeScore.items.map((item) => item.id).join(','), 'completeness,zeroing,pumping,release,recording,retake');
assert.equal(completeScore.total !== null && completeScore.total >= 70, true);
assert.equal(completeRecordingItem?.status, 'reasonable');
assert.equal(completeRecordingItem?.score, completeRecordingItem?.maxScore);
assert.equal(
  [
    completeRecordingItem?.evidence,
    completeRecordingItem?.relation,
    completeRecordingItem?.recommendation,
  ].join('\n').includes('推荐记录窗口'),
  false,
  'recording score should judge the official record stability, not the operation upper-bound window',
);
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

const forbiddenExplanatoryCopy = [
  '共同决定',
  '主要扣分来源',
  '可用于评分',
  '不按理论答案反推',
  '过程和结果来自同一条主线',
  '分支只作为过程参考',
];
for (const item of completeScore.items) {
  const itemCopy = [
    item.evidence,
    item.relation,
    item.recommendation,
    ...(item.details ?? []).flatMap((detail) => [
      detail.evidence,
      detail.reason,
      detail.recommendation,
    ]),
  ].join('\n');
  for (const forbidden of forbiddenExplanatoryCopy) {
    assert.equal(
      itemCopy.includes(forbidden),
      false,
      `${item.id} should avoid explanatory copy: ${forbidden}`,
    );
  }
  for (const detail of item.details ?? []) {
    if (detail.score === detail.maxScore) {
      assert.equal(detail.reason, '无误。', `${detail.id} full-score reason should be concise`);
      assert.equal(detail.recommendation, '无误。', `${detail.id} full-score recommendation should be concise`);
    }
  }
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
assert.equal(warningPumpingItem?.score, warningPumpingItem?.maxScore);
assert.equal(
  warningPumpingItem?.details.find((detail) => detail.id === 'pumping-safety')?.score,
  6,
  'pressure warning should not deduct process score; only alarm/danger should deduct',
);

const incomplete = scoreHeatCapacityFreeProcess(createIncompleteProcessScoringInputFixture());
assert.equal(incomplete.total, null);
assert.equal(incomplete.items.find((item) => item.id === 'completeness')?.status, 'insufficient-data');

console.log('heatCapacityFreeProcessScoringModel tests passed');
