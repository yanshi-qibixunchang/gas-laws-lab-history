import assert from 'node:assert/strict';
import {
  getHeatCapacityToastPolicySpec,
} from '../../src/features/heatCapacity/heatCapacityToastPolicy.ts';

assert.deepEqual(getHeatCapacityToastPolicySpec('guide'), {
  level: 'info',
  options: { source: 'guide' },
});

assert.deepEqual(getHeatCapacityToastPolicySpec('guideBlocked'), {
  level: 'warning',
  options: { source: 'guide-blocked', interrupt: true },
});

assert.deepEqual(getHeatCapacityToastPolicySpec('success'), {
  level: 'success',
  options: { interrupt: true, source: 'guide' },
});

assert.equal(getHeatCapacityToastPolicySpec('pressureWarning').level, 'info');
assert.deepEqual(getHeatCapacityToastPolicySpec('pressureWarning').options, {
  interrupt: true,
  priority: 3,
  source: 'pressure-warning',
});

assert.deepEqual(getHeatCapacityToastPolicySpec('pressureAlarm'), {
  level: 'danger',
  options: { interrupt: true, priority: 4, source: 'pressure-alarm' },
});

assert.deepEqual(getHeatCapacityToastPolicySpec('pressureCloseValve'), {
  level: 'warning',
  options: { interrupt: true, priority: 4, source: 'pressure-close-valve' },
});

console.log('heatCapacityToastPolicy tests passed');
