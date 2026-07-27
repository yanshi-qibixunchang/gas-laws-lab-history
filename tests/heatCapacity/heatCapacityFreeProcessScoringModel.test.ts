import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  quantizeHeatCapacityScore,
  roundHeatCapacityHalfToEven,
  scoreHeatCapacityReleaseDuration,
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
import {
  HEAT_CAPACITY_RELEASE_TIMING,
} from '../../src/domain/heatCapacity/heatCapacityDefaultConfig.ts';
import {
  HEAT_CAPACITY_FREE_SCORING_LEGACY_VERSION,
} from '../../src/domain/heatCapacity/heatCapacityFreeBatchModel.ts';

const scoringModelSource = readFileSync(
  join(process.cwd(), 'src', 'domain', 'heatCapacity', 'heatCapacityFreeProcessScoringModel.ts'),
  'utf8',
);

assert.equal(roundHeatCapacityHalfToEven(0.725, 2), 0.72);
assert.equal(roundHeatCapacityHalfToEven(0.715, 2), 0.72);
assert.equal(roundHeatCapacityHalfToEven(0.735, 2), 0.74);
assert.equal(quantizeHeatCapacityScore(22.25), 22);
assert.equal(quantizeHeatCapacityScore(22.5), 22.5);
assert.equal(quantizeHeatCapacityScore(22.75), 23);

assert.doesNotMatch(
  scoringModelSource,
  /HeatCapacityFreeStandardReferenceSnapshot|HeatCapacityOperationUpperBound|upperBound:\s*HeatCapacityOperationUpperBound|standardReference\?:/,
  'process scoring input should only depend on the actual process and summary, not review reference-limit fields',
);

const complete = createCompleteProcessScoringInputFixture();
const completeScore = scoreHeatCapacityFreeProcess(complete);
const recordChainItem = completeScore.items.find((item) => item.id === 'recordChain');

assert.equal(completeScore.maxScore, 75);
assert.deepEqual(completeScore.items.map((item) => item.id), ['pumping', 'release', 'recordChain', 'retake']);
assert.deepEqual(completeScore.items.map((item) => item.maxScore), [15, 25, 30, 5]);
assert.equal(completeScore.total !== null && completeScore.total >= 52.5, true);
assert.equal(
  completeScore.total !== null && Number.isInteger(completeScore.total * 2),
  true,
  'the complete operation score should use half-point increments',
);
assert.equal(recordChainItem?.status, 'reasonable');
assert.equal(recordChainItem?.score, recordChainItem?.maxScore);
assert.deepEqual(recordChainItem?.details.map((detail) => detail.maxScore), [4, 8, 8, 7, 3]);
assert.deepEqual(recordChainItem?.details.map((detail) => detail.id), [
  'record-chain-completeness',
  'record-chain-result',
  'record-chain-zeroing',
  'record-chain-timing',
  'record-chain-preheat',
]);

for (const item of completeScore.items) {
  assert.equal(Number.isInteger(item.score * 2), true, `${item.id} score should use half-point increments`);
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
  assert.equal(
    item.details.every((detail) => Number.isInteger(detail.score * 2)),
    true,
    `${item.id} detail scores should use half-point increments`,
  );
}

const overVented = scoreHeatCapacityFreeProcess(createOverVentedProcessScoringInputFixture());
assert.equal(overVented.items.find((item) => item.id === 'release')?.status, 'needs-improvement');
assert.equal((overVented.items.find((item) => item.id === 'release')?.score ?? 25) <= 5, true);

const longReleaseFixture = createCompleteProcessScoringInputFixture();
const releaseOpenEvent = longReleaseFixture.branch.events.find((event) => (
  event.type === 'release-start' && longReleaseFixture.summary.u1 && event.atS > longReleaseFixture.summary.u1.atS
));
assert.notEqual(releaseOpenEvent, undefined, 'long release fixture needs a release open event');
const longReleaseBranch = {
  ...longReleaseFixture.branch,
  events: longReleaseFixture.branch.events.map((event) => (
    event.type === 'stopcock-close' && releaseOpenEvent && event.atS >= releaseOpenEvent.atS
      ? { ...event, atS: releaseOpenEvent.atS + 12, payload: { ...event.payload, releaseDurationS: 12 } }
      : event
  )),
};
const longRelease = scoreHeatCapacityFreeProcess({
  ...longReleaseFixture,
  branch: longReleaseBranch,
});
assert.equal(
  (longRelease.items.find((item) => item.id === 'release')?.score ?? 25) <= 5,
  true,
  'a 12 s release should be treated as a severe operation error',
);

const createReleaseDurationScore = (durationS: number) => {
  const fixture = createCompleteProcessScoringInputFixture();
  const openEvent = fixture.branch.events.find((event) => (
    event.type === 'release-start' && fixture.summary.u1 && event.atS > fixture.summary.u1.atS
  ));
  assert.notEqual(openEvent, undefined, 'release duration fixture needs a release open event');
  const branch = {
    ...fixture.branch,
    events: fixture.branch.events.map((event) => (
      event.type === 'stopcock-close' && openEvent && event.atS >= openEvent.atS
        ? { ...event, atS: openEvent.atS + durationS, payload: { ...event.payload, releaseDurationS: durationS } }
        : event
    )),
  };
  const score = scoreHeatCapacityFreeProcess({ ...fixture, branch });
  const release = score.items.find((item) => item.id === 'release');
  assert.notEqual(release, undefined, 'release score item should exist');
  return release!;
};

const releaseAt030 = createReleaseDurationScore(HEAT_CAPACITY_RELEASE_TIMING.releaseOptimalMinS);
const releaseAt0375 = createReleaseDurationScore(HEAT_CAPACITY_RELEASE_TIMING.autoDemoReleaseDurationS);
const releaseAt050 = createReleaseDurationScore(HEAT_CAPACITY_RELEASE_TIMING.releaseOptimalMaxS);
const releaseAt020 = createReleaseDurationScore(HEAT_CAPACITY_RELEASE_TIMING.releaseOptimalMinS - 0.1);
const releaseAt010 = createReleaseDurationScore(HEAT_CAPACITY_RELEASE_TIMING.releaseOptimalMinS - 0.2);
const releaseAt060 = createReleaseDurationScore(HEAT_CAPACITY_RELEASE_TIMING.releaseOptimalMaxS + 0.1);
const releaseAt080 = createReleaseDurationScore(HEAT_CAPACITY_RELEASE_TIMING.releaseOptimalMaxS + 0.3);
assert.equal(releaseAt030.score, releaseAt0375.score);
assert.equal(releaseAt0375.score, releaseAt050.score);
assert.equal(releaseAt020.score < releaseAt030.score, true);
assert.equal(releaseAt010.score < releaseAt020.score, true);
assert.equal(releaseAt060.score < releaseAt050.score, true);
assert.equal(releaseAt080.score < releaseAt060.score, true);
assert.equal(releaseAt060.score, 18.5);
for (const release of [releaseAt030, releaseAt0375, releaseAt050, releaseAt020, releaseAt010, releaseAt060, releaseAt080]) {
  assert.equal(Number.isInteger(release.score * 2), true, 'release item scores should use half-point increments');
  assert.equal(
    release.details.reduce((sum, detail) => sum + detail.score, 0),
    release.score,
    'quantized release details should add up to the displayed release score',
  );
  assert.equal(
    release.details.every((detail) => Number.isInteger(detail.score * 2)),
    true,
    'release detail scores should use half-point increments',
  );
}
assert.equal(releaseAt0375.status, 'reasonable');
assert.equal(scoreHeatCapacityReleaseDuration(HEAT_CAPACITY_RELEASE_TIMING.releaseOptimalMinS).valveScore, 12);
assert.equal(scoreHeatCapacityReleaseDuration(HEAT_CAPACITY_RELEASE_TIMING.autoDemoReleaseDurationS).valveScore, 12);
assert.equal(scoreHeatCapacityReleaseDuration(HEAT_CAPACITY_RELEASE_TIMING.releaseOptimalMaxS).valveScore, 12);

const largeResultDeviation = scoreHeatCapacityFreeProcess({
  ...complete,
  trial: {
    ...complete.trial,
    correctedSignals: complete.trial.correctedSignals
      ? { ...complete.trial.correctedSignals, gamma: complete.traceTrial.configSnapshot.physics.gamma + 0.12 }
      : null,
  },
});
const largeDeviationRecordChain = largeResultDeviation.items.find((item) => item.id === 'recordChain');
assert.equal(
  largeDeviationRecordChain?.details.find((detail) => detail.id === 'record-chain-result')?.score,
  0,
  'large gamma deviation should reduce the result score instead of only checking calculability',
);

const missingU0Fixture = createCompleteProcessScoringInputFixture();
const missingU0Score = scoreHeatCapacityFreeProcess({
  ...missingU0Fixture,
  trial: {
    ...missingU0Fixture.trial,
    u0: null,
    correctedSignals: missingU0Fixture.trial.correctedSignals
      ? {
          ...missingU0Fixture.trial.correctedSignals,
          U0DisplayMv: 0,
          u0Source: 'assumed-zero',
        }
      : null,
  },
});
const missingU0RecordChain = missingU0Score.items.find((item) => item.id === 'recordChain');
assert.notEqual(missingU0Score.total, null, 'missing U0 should not suppress the final score');
assert.equal(
  missingU0RecordChain?.details.find((detail) => detail.id === 'record-chain-completeness')?.score,
  4,
  'missing U0 must not be deducted again as incomplete data',
);
assert.equal(
  missingU0RecordChain?.details.find((detail) => detail.id === 'record-chain-zeroing')?.score,
  0,
  'missing U0 should deduct the dedicated 8-point zeroing item',
);
assert.equal(
  missingU0RecordChain?.details.find((detail) => detail.id === 'record-chain-timing')?.score,
  7,
  'missing U0 must not be deducted again from record timing',
);

const omittedPreheatFixture = createCompleteProcessScoringInputFixture();
const omittedPreheatScore = scoreHeatCapacityFreeProcess({
  ...omittedPreheatFixture,
  trial: {
    ...omittedPreheatFixture.trial,
    preheatOutcome: 'omitted',
  },
});
const omittedPreheatRecordChain = omittedPreheatScore.items.find((item) => item.id === 'recordChain');
assert.equal(
  omittedPreheatRecordChain?.details.find((detail) => detail.id === 'record-chain-preheat')?.score,
  0,
);
assert.equal(
  omittedPreheatRecordChain?.score,
  (recordChainItem?.score ?? 0) - 3,
  'omitted preheat should deduct exactly three points from the record chain',
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
  3.5,
  'pressure warning should be a small teaching deduction, while danger/alarm remains a hard deduction',
);

const incomplete = scoreHeatCapacityFreeProcess(createIncompleteProcessScoringInputFixture());
assert.equal(incomplete.total, null);
assert.equal(incomplete.items.find((item) => item.id === 'recordChain')?.status, 'insufficient-data');

const legacyScore = scoreHeatCapacityFreeProcess(
  complete,
  HEAT_CAPACITY_FREE_SCORING_LEGACY_VERSION,
);
assert.equal(legacyScore.maxScore, 100);
assert.deepEqual(legacyScore.items.map((item) => item.maxScore), [20, 30, 40, 10]);

console.log('heatCapacityFreeProcessScoringModel tests passed');
