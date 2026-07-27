import assert from 'node:assert/strict';
import {
  createEarlyU1RecordReviewFixture,
  createEarlyU2RecordReviewFixture,
  createIncompleteProcessReviewFixture,
  createInsufficientPumpReviewFixture,
  createOverVentedProcessReviewFixture,
  createRetakeReviewFixture,
  createStandardOperationReviewFixture,
} from './helpers/heatCapacityProcessReviewTestFactory.ts';

const standard = createStandardOperationReviewFixture();
assert.equal(standard.status, 'ready');
assert.equal(
  standard.score.total !== null &&
    standard.score.total / standard.score.maxScore >= 0.8,
  true,
);
assert.equal(standard.summary?.upperBoundGamma !== null, true);
assert.notEqual(standard.chart.standardReference, null);
assert.equal((standard.chart.standardReference?.trace.length ?? 0) > 0, true);
assert.equal(standard.chart.standardReference?.trace.some((point) => point.stageId === 'pump'), true);
assert.equal(standard.chart.standardReference?.trace.some((point) => point.stageId === 'release'), true);
assert.equal(standard.chart.standardReference?.summary.feasible, true);
assert.equal(standard.chart.standardReference?.summary.assumptions.disturbancesPreserved, true);
assert.equal(standard.chart.standardReference?.recordWindows.length, 3);
assert.deepEqual(standard.score.items.map((item) => item.id), ['pumping', 'release', 'recordChain', 'retake']);

const insufficientPump = createInsufficientPumpReviewFixture();
assert.equal(insufficientPump.diagnostics.find((row) => row.id === 'pumping')?.status, 'needs-improvement');

const overVented = createOverVentedProcessReviewFixture();
assert.equal(overVented.diagnostics.find((row) => row.id === 'release')?.status, 'needs-improvement');

const earlyU1 = createEarlyU1RecordReviewFixture();
assert.equal(earlyU1.diagnostics.find((row) => row.id === 'recording')?.status, 'review');

const earlyU2 = createEarlyU2RecordReviewFixture();
assert.equal(earlyU2.diagnostics.find((row) => row.id === 'recording')?.status, 'review');

const retake = createRetakeReviewFixture();
assert.equal(retake.summary?.retakeCount, 1);
assert.equal(retake.diagnostics.find((row) => row.id === 'retake')?.status, 'retaken');

const incomplete = createIncompleteProcessReviewFixture();
assert.equal(incomplete.status, 'incomplete');
assert.equal(incomplete.score.total, null);

console.log('heatCapacityProcessReviewAcceptance tests passed');
