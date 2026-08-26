import assert from 'node:assert/strict';
import {
  createPistonOscillationLivePressureChannel,
} from '../../src/features/pistonOscillation/pistonOscillationLivePressureChannel.ts';

const channel = createPistonOscillationLivePressureChannel();
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
assert.ok((pressed?.absolutePressureKpa ?? 0) >= 120);
assert.equal(notifications, 2);

channel.clear();
assert.equal(channel.getSnapshot(), null);
assert.equal(notifications, 3);
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
