import assert from 'node:assert/strict';
import {
  resolveHeatCapacityGuidePulseRestore,
} from '../../src/features/heatCapacity/heatCapacityGuidePulseClock.ts';

const pausedRefreshPulse = resolveHeatCapacityGuidePulseRestore({
  fileId: 'heat-guide-refresh',
  controlId: 'recordU1',
  remainingMs: 1_400,
  clockRunning: false,
});
assert.deepEqual(pausedRefreshPulse, {
  state: 'paused',
  fileId: 'heat-guide-refresh',
  controlId: 'recordU1',
  remainingMs: 1_400,
});

const pausedModeSessionPulse = resolveHeatCapacityGuidePulseRestore({
  fileId: 'heat-guide-mode-session',
  controlId: 'pressureZero',
  remainingMs: 750,
  clockRunning: false,
});
assert.equal(pausedModeSessionPulse.state, 'paused');

assert.deepEqual(resolveHeatCapacityGuidePulseRestore({
  fileId: 'heat-guide-running',
  controlId: 'pumpBulb',
  remainingMs: 2_200,
  clockRunning: true,
}), {
  state: 'scheduled',
  fileId: 'heat-guide-running',
  controlId: 'pumpBulb',
  remainingMs: 2_200,
});

for (const remainingMs of [0, -1, null, Number.NaN, Number.POSITIVE_INFINITY]) {
  assert.deepEqual(resolveHeatCapacityGuidePulseRestore({
    fileId: 'heat-guide-expired',
    controlId: 'recordU2',
    remainingMs,
    clockRunning: false,
  }), { state: 'cleared' }, 'an expired or invalid pulse must never become a permanent paused highlight');
}

assert.deepEqual(resolveHeatCapacityGuidePulseRestore({
  fileId: 'heat-guide-missing-control',
  controlId: '   ',
  remainingMs: 500,
  clockRunning: true,
}), { state: 'cleared' });

console.log('heatCapacityGuidePulseClock tests passed');
