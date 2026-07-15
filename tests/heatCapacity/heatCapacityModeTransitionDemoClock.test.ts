import assert from 'node:assert/strict';
import {
  captureHeatCapacityModeTransitionDemoClock,
  resolveHeatCapacityModeTransitionDemoResume,
} from '../../src/features/heatCapacity/heatCapacityModeTransitionDemoClock.ts';

const clockDuringInitialDelay = captureHeatCapacityModeTransitionDemoClock({
  fileId: 'demo-file',
  nowMs: 1_000,
  timelineStartedAtMs: 1_800,
});
assert.deepEqual(clockDuringInitialDelay, {
  fileId: 'demo-file',
  elapsedMs: 0,
  initialDelayRemainingMs: 800,
});

const clockDuringTimeline = captureHeatCapacityModeTransitionDemoClock({
  fileId: 'demo-file',
  nowMs: 4_250,
  timelineStartedAtMs: 1_800,
});
assert.deepEqual(clockDuringTimeline, {
  fileId: 'demo-file',
  elapsedMs: 2_450,
  initialDelayRemainingMs: 0,
});

assert.deepEqual(
  resolveHeatCapacityModeTransitionDemoResume(clockDuringTimeline, 'demo-file', 'running'),
  { elapsedMs: 2_450, initialDelayRemainingMs: 0 },
  'a matching running Demo transaction should resume from the exact frozen instant',
);
assert.equal(
  resolveHeatCapacityModeTransitionDemoResume(clockDuringTimeline, 'another-file', 'running'),
  null,
  'a clock owned by another file must never be consumed',
);
assert.equal(
  resolveHeatCapacityModeTransitionDemoResume(clockDuringTimeline, 'demo-file', 'paused'),
  null,
  'a paused Demo must retain its frozen point instead of being scheduled behind the user',
);
assert.equal(
  resolveHeatCapacityModeTransitionDemoResume(null, 'demo-file', 'running'),
  null,
  'after the caller consumes and clears a clock, a second resume must be a no-op',
);

console.log('heatCapacityModeTransitionDemoClock tests passed');
