import assert from 'node:assert/strict';
import {
  getPistonOscillationSettlingStateAtProgress,
} from '../../src/domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';
import {
  createPistonOscillationLivePressureChannel,
} from '../../src/features/pistonOscillation/pistonOscillationLivePressureChannel.ts';

const channel = createPistonOscillationLivePressureChannel({
  driftRatePaPerS: 0,
  driftWanderAmplitudePa: 0,
  noiseStandardDeviationPa: 0,
});
let notifications = 0;
const unsubscribe = channel.subscribe(() => {
  notifications += 1;
});

const baseline = channel.publishPhysicalState({
  observedAtMs: 1_000.25,
  equilibriumHeightMm: 80,
  displacementMm: 0,
});
assert.ok(baseline);
assert.equal(baseline?.sampleClockIndex, 1_000);
assert.equal(baseline?.sampledAtMs, 1_000);
assert.equal(baseline?.absolutePressureKpa, 101.89);
assert.equal(notifications, 1);

const duplicateGridSample = channel.publishPhysicalState({
  observedAtMs: 1_000.8,
  equilibriumHeightMm: 80,
  displacementMm: -10.5,
});
assert.equal(duplicateGridSample, baseline, 'one sensor grid time must yield at most one sample');
assert.equal(notifications, 1);

const pressed = channel.publishPhysicalState({
  observedAtMs: 1_001.01,
  equilibriumHeightMm: 80,
  displacementMm: -10.5,
});
assert.ok((pressed?.absolutePressureKpa ?? 0) > (baseline?.absolutePressureKpa ?? 0));
assert.ok(
  (pressed?.absolutePressureKpa ?? 0) < 120,
  'the live reading must visibly lag a rapid pressure rise instead of copying true pressure',
);
assert.equal(pressed?.sensorState.sessionElapsedS, 0.001);
assert.equal(notifications, 2);

const settlingMidpoint = getPistonOscillationSettlingStateAtProgress(80, 0.5);
const settlingObservation = channel.publishPhysicalState({
  observedAtMs: 1_002.01,
  equilibriumHeightMm: settlingMidpoint.pistonHeightM * 1_000,
  displacementMm: 0,
  thermodynamicState: settlingMidpoint,
});
assert.equal(settlingObservation?.thermodynamicPhase, 'settling');
assert.equal(settlingObservation?.truePistonHeightMm, settlingMidpoint.pistonHeightM * 1_000);
assert.equal(settlingObservation?.temperatureK, 293.15);
assert.ok((settlingObservation?.absolutePressureKpa ?? 0) > 101.61);
assert.equal(notifications, 3);

channel.clear();
assert.equal(channel.getSnapshot(), null);
assert.equal(notifications, 4);
const restarted = channel.publishPhysicalState({
  observedAtMs: 2_000.25,
  equilibriumHeightMm: 80,
  displacementMm: 0,
});
assert.equal(restarted?.sensorState.sessionElapsedS, 0);
assert.equal(
  restarted?.absolutePressureKpa,
  baseline?.absolutePressureKpa,
  'clearing the channel must reinitialize current sensor lag and drift state',
);
unsubscribe();

assert.throws(
  () => channel.publishPhysicalState({
    observedAtMs: -1,
    equilibriumHeightMm: 80,
    displacementMm: 0,
  }),
  /observedAtMs/,
);

console.log('pistonOscillationLivePressureChannel tests passed');
