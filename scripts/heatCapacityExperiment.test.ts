import assert from 'node:assert/strict';
import {
  HARD_SPHERE_GAMMA,
  applyHeatCapacityAction,
  calculateGamma,
  calculateGammaSummary,
  createHeatCapacityExperiment,
} from '../utils/heatCapacityExperiment.ts';

const closeTo = (actual: number, expected: number, tolerance = 1e-6) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
};

const p0 = 100;
const p1 = 160;
const idealP2 = p1 / Math.pow(p1 / p0, 1 / HARD_SPHERE_GAMMA);

closeTo(calculateGamma(p0, p1, idealP2) ?? 0, HARD_SPHERE_GAMMA);
assert.equal(calculateGamma(Number.NaN, p1, idealP2), null);
assert.equal(calculateGamma(p0, Number.POSITIVE_INFINITY, idealP2), null);
assert.equal(calculateGamma(0, p1, idealP2), null);
assert.equal(calculateGamma(p0, p0, idealP2), null);
assert.equal(calculateGamma(p0, p1, p0), null);
assert.equal(calculateGamma(p0, p1, p1), null);

const summary = calculateGammaSummary([
  { p0, p1, p2: idealP2, timestamp: 1 },
  { p0, p1, p2: idealP2 * 1.002, timestamp: 2 },
]);
assert.equal(summary.validCount, 2);
assert.ok(summary.meanGamma !== null);
assert.ok(summary.relativeErrorPercent !== null);
assert.ok(summary.relativeErrorPercent < 1);

let state = createHeatCapacityExperiment({ ambientPressure: p0, ambientTemperature: 1 });
assert.equal(state.phase, 'equalizing');
assert.equal(state.mode, 'guided');

const sanitized = createHeatCapacityExperiment({
  ambientPressure: -1,
  ambientTemperature: Number.NaN,
  particleCount: 0,
  vesselLength: -4,
});
assert.ok(sanitized.ambientPressure > 0);
assert.ok(sanitized.ambientTemperature > 0);
assert.ok(sanitized.particleCount > 0);
assert.ok(sanitized.vesselLength > 0);
assert.equal(sanitized.pressure, sanitized.ambientPressure);
assert.equal(sanitized.temperature, sanitized.ambientTemperature);

const blocked = applyHeatCapacityAction(state, { type: 'recordP1' });
assert.equal(blocked.phase, 'equalizing');
assert.equal(blocked.lastError, 'p1 cannot be recorded before the gas is pressurized and stable.');

state = applyHeatCapacityAction(state, { type: 'recordP0' });
assert.equal(state.phase, 'pumping');
assert.equal(state.recorded.p0, p0);
assert.equal(state.instrument.c1Open, true);
assert.equal(state.instrument.c2Open, false);

state = applyHeatCapacityAction(state, { type: 'pump', strokes: 6 });
assert.equal(state.phase, 'pumping');
assert.ok(state.pressure > p0);
assert.ok(state.temperature > 1);
assert.ok(state.instrument.pumpProgress > 0);

state = applyHeatCapacityAction(state, { type: 'stabilizeP1' });
assert.equal(state.phase, 'stabilizingP1');
assert.equal(state.temperature, 1);
assert.equal(state.instrument.highlightedPart, 'Pressure_Gauge_Needle');

const blockedRecordP1 = applyHeatCapacityAction(state, { type: 'recordP1' });
assert.equal(blockedRecordP1.phase, 'stabilizingP1');
assert.equal(blockedRecordP1.lastError, 'p1 can only be recorded after the high-pressure gas has stabilized.');

const blockedRelease = applyHeatCapacityAction(state, { type: 'release', durationMs: 420, closeDelayMs: 0 });
assert.equal(blockedRelease.phase, 'stabilizingP1');
assert.equal(blockedRelease.lastError, 'C2 can only release gas after p1 has been recorded.');

state = applyHeatCapacityAction(state, { type: 'stabilizeP1' });
assert.equal(state.phase, 'recordP1');
assert.equal(state.temperature, 1);

state = applyHeatCapacityAction(state, { type: 'recordP1' });
assert.equal(state.phase, 'releasing');
assert.ok(state.recorded.p1 && state.recorded.p1 > p0);
assert.equal(state.instrument.c1Open, false);
assert.equal(state.instrument.c2Open, false);

state = applyHeatCapacityAction(state, { type: 'release', durationMs: 420, closeDelayMs: 0 });
assert.equal(state.phase, 'recovering');
assert.equal(state.instrument.c2Open, false);
assert.ok(state.temperature < 1);
assert.ok(state.pendingP2 !== null && state.pendingP2 > p0 && state.pendingP2 < (state.recorded.p1 ?? Number.POSITIVE_INFINITY));

state = applyHeatCapacityAction(state, { type: 'recover' });
assert.equal(state.phase, 'recordP2');
assert.equal(state.temperature, 1);
assert.ok(state.pressure > p0);

state = applyHeatCapacityAction(state, { type: 'recordP2' });
assert.equal(state.phase, 'completed');
assert.ok(state.recorded.p2);
assert.ok(state.result);
assert.ok(state.result.relativeErrorPercent < 2);
assert.equal(state.trials.length, 1);

const resetAfterTrial = applyHeatCapacityAction(state, { type: 'reset' });
assert.equal(resetAfterTrial.phase, 'equalizing');
assert.equal(resetAfterTrial.recorded.p0, null);
assert.equal(resetAfterTrial.recorded.p1, null);
assert.equal(resetAfterTrial.recorded.p2, null);
assert.equal(resetAfterTrial.result, null);
assert.equal(resetAfterTrial.trials.length, 1);

const idealRelease = createHeatCapacityExperiment({ ambientPressure: p0 });
const idealPath = [
  { type: 'recordP0' as const },
  { type: 'pump' as const, strokes: 6 },
  { type: 'stabilizeP1' as const },
  { type: 'stabilizeP1' as const },
  { type: 'recordP1' as const },
  { type: 'release' as const, durationMs: 420, closeDelayMs: 0 },
  { type: 'recover' as const },
  { type: 'recordP2' as const },
].reduce(applyHeatCapacityAction, idealRelease);

const poorRelease = createHeatCapacityExperiment({ ambientPressure: p0 });
const poorPath = [
  { type: 'recordP0' as const },
  { type: 'pump' as const, strokes: 6 },
  { type: 'stabilizeP1' as const },
  { type: 'stabilizeP1' as const },
  { type: 'recordP1' as const },
  { type: 'release' as const, durationMs: 1800, closeDelayMs: 320 },
  { type: 'recover' as const },
  { type: 'recordP2' as const },
].reduce(applyHeatCapacityAction, poorRelease);

assert.ok(idealPath.result);
assert.ok(poorPath.result);
assert.ok(poorPath.result.relativeErrorPercent > idealPath.result.relativeErrorPercent);

console.log('heatCapacityExperiment tests passed');
