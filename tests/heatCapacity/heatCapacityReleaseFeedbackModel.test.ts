import assert from 'node:assert/strict';
import {
  resolveHeatCapacityReleaseFeedback,
} from '../../src/domain/heatCapacity/heatCapacityReleaseFeedbackModel.ts';

const openingStart = resolveHeatCapacityReleaseFeedback({
  releasePathOpen: true,
  pressureDeltaKPa: 6,
  initialPressureDeltaKPa: 6,
  openElapsedS: 0,
});
assert.equal(openingStart.active, true);
assert.equal(openingStart.apertureRatio, 0);
assert.equal(openingStart.flowDriveRatio, 0);
assert.equal(openingStart.progressRatio, 0);

const halfOpen = resolveHeatCapacityReleaseFeedback({
  releasePathOpen: true,
  pressureDeltaKPa: 6,
  initialPressureDeltaKPa: 6,
  openElapsedS: 0.05,
});
assert.ok(Math.abs(halfOpen.apertureRatio - 0.5) < 1e-9);
assert.ok(halfOpen.intensity > 0);

const fullyOpen = resolveHeatCapacityReleaseFeedback({
  releasePathOpen: true,
  pressureDeltaKPa: 6,
  initialPressureDeltaKPa: 6,
  openElapsedS: 0.1,
});
assert.equal(fullyOpen.apertureRatio, 1);
assert.ok(fullyOpen.flowDriveRatio > halfOpen.flowDriveRatio);

const progressed = resolveHeatCapacityReleaseFeedback({
  releasePathOpen: true,
  pressureDeltaKPa: 3,
  initialPressureDeltaKPa: 6,
  openElapsedS: 0.1,
});
assert.ok(progressed.progressRatio > 0.49 && progressed.progressRatio < 0.52);

const closedEarly = resolveHeatCapacityReleaseFeedback({
  releasePathOpen: false,
  pressureDeltaKPa: 3,
  initialPressureDeltaKPa: 6,
  openElapsedS: 0.08,
});
assert.equal(closedEarly.active, false);
assert.equal(closedEarly.stopReason, 'path-closed');

const balanced = resolveHeatCapacityReleaseFeedback({
  releasePathOpen: true,
  pressureDeltaKPa: 0.03,
  initialPressureDeltaKPa: 6,
  openElapsedS: 0.3,
});
assert.equal(balanced.active, false);
assert.equal(balanced.progressRatio, 1);
assert.equal(balanced.stopReason, 'pressure-balanced');

console.log('heatCapacityReleaseFeedbackModel tests passed');
