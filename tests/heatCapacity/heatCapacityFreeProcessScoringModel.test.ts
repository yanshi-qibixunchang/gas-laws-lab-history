import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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

const scoringModelSource = readFileSync(
  join(process.cwd(), 'src', 'domain', 'heatCapacity', 'heatCapacityFreeProcessScoringModel.ts'),
  'utf8',
);

assert.doesNotMatch(
  scoringModelSource,
  /HeatCapacityFreeStandardReferenceSnapshot|HeatCapacityOperationUpperBound|upperBound:\s*HeatCapacityOperationUpperBound|standardReference\?:/,
  'process scoring input should only depend on the actual process and summary, not review reference-limit fields',
);

const complete = createCompleteProcessScoringInputFixture();
const completeScore = scoreHeatCapacityFreeProcess(complete);
const recordChainItem = completeScore.items.find((item) => item.id === 'recordChain');

assert.equal(completeScore.maxScore, 100);
assert.deepEqual(completeScore.items.map((item) => item.id), ['pumping', 'release', 'recordChain', 'retake']);
assert.deepEqual(completeScore.items.map((item) => item.maxScore), [20, 30, 40, 10]);
assert.equal(completeScore.total !== null && completeScore.total >= 70, true);
assert.equal(recordChainItem?.status, 'reasonable');
assert.equal(recordChainItem?.score, recordChainItem?.maxScore);
assert.deepEqual(recordChainItem?.details.map((detail) => detail.maxScore), [8, 12, 10, 10]);
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
assert.equal((overVented.items.find((item) => item.id === 'release')?.score ?? 30) <= 6, true);

const longReleaseFixture = createCompleteProcessScoringInputFixture();
const releaseOpenEvent = longReleaseFixture.branch.events.find((event) => (
  event.type === 'stopcock-open' && longReleaseFixture.summary.u1 && event.atS > longReleaseFixture.summary.u1.atS
));
assert.notEqual(releaseOpenEvent, undefined, 'long release fixture needs a release open event');
const longReleaseBranch = {
  ...longReleaseFixture.branch,
  events: longReleaseFixture.branch.events.map((event) => (
    event.type === 'stopcock-close' && releaseOpenEvent && event.atS >= releaseOpenEvent.atS
      ? { ...event, atS: releaseOpenEvent.atS + 12 }
      : event
  )),
};
const longRelease = scoreHeatCapacityFreeProcess({
  ...longReleaseFixture,
  branch: longReleaseBranch,
});
assert.equal(
  (longRelease.items.find((item) => item.id === 'release')?.score ?? 30) <= 6,
  true,
  'a 12 s release should be treated as a severe operation error',
);

const createReleaseDurationScore = (durationS: number) => {
  const fixture = createCompleteProcessScoringInputFixture();
  const openEvent = fixture.branch.events.find((event) => (
    event.type === 'stopcock-open' && fixture.summary.u1 && event.atS > fixture.summary.u1.atS
  ));
  assert.notEqual(openEvent, undefined, 'release duration fixture needs a release open event');
  const branch = {
    ...fixture.branch,
    events: fixture.branch.events.map((event) => (
      event.type === 'stopcock-close' && openEvent && event.atS >= openEvent.atS
        ? { ...event, atS: openEvent.atS + durationS }
        : event
    )),
  };
  const score = scoreHeatCapacityFreeProcess({ ...fixture, branch });
  const release = score.items.find((item) => item.id === 'release');
  assert.notEqual(release, undefined, 'release score item should exist');
  return release!;
};

const releaseAt010 = createReleaseDurationScore(0.1);
const releaseAt035 = createReleaseDurationScore(0.35);
const releaseAt080 = createReleaseDurationScore(0.8);
const releaseAt250 = createReleaseDurationScore(2.5);
assert.equal(
  releaseAt035.score > releaseAt010.score && releaseAt035.score > releaseAt080.score,
  true,
  'release duration scoring should peak at the 0.35 s standard operation',
);
assert.equal(
  releaseAt010.score > releaseAt250.score && releaseAt080.score > releaseAt250.score,
  true,
  '0.1-0.8 s releases should remain partial-score operations instead of being treated like long venting',
);
assert.equal(releaseAt035.status, 'reasonable');
assert.equal(releaseAt010.status, 'review');
assert.equal(releaseAt080.status, 'review');

const largeResultDeviation = scoreHeatCapacityFreeProcess({
  ...complete,
  summary: {
    ...complete.summary,
    relativeErrorPercent: 25,
  },
});
const largeDeviationRecordChain = largeResultDeviation.items.find((item) => item.id === 'recordChain');
assert.equal(
  largeDeviationRecordChain?.details.find((detail) => detail.id === 'record-chain-result')?.score,
  0,
  'large gamma deviation should reduce the result score instead of only checking calculability',
);

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
