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
assert.equal(standard.score.total !== null && standard.score.total >= 80, true);
assert.equal(standard.summary?.upperBoundGamma !== null, true);
assert.equal(standard.chart.standardTrace.length > 0, true);
assert.equal(standard.chart.standardTrace.some((point) => point.stageId === 'pump'), true);
assert.equal(standard.chart.standardTrace.some((point) => point.stageId === 'release'), true);
assert.equal(standard.chart.standardProcess.feasible, true);
assert.equal(standard.chart.standardProcess.assumptions.disturbancesPreserved, true);
assert.equal(standard.chart.standardWindows.length, 3);
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
