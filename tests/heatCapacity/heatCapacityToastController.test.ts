import assert from 'node:assert/strict';
import {
  createHeatCapacityToastMessage,
  isHeatCapacityGuideToast,
  isHeatCapacityPressureToast,
  resolveHeatCapacityToastAdvance,
  resolveHeatCapacityToastClear,
  resolveHeatCapacityToastShow,
} from '../../src/features/heatCapacity/heatCapacityToastController.ts';

const info = createHeatCapacityToastMessage('ordinary guide', 'info', {
  id: 'info',
  now: 100,
  source: 'guide',
});
const blocked = createHeatCapacityToastMessage('wrong guide action', 'warning', {
  id: 'blocked',
  now: 200,
  source: 'guide-blocked',
});
const pressure = createHeatCapacityToastMessage('close valve', 'warning', {
  id: 'pressure',
  now: 300,
  priority: 4,
  source: 'pressure-close-valve',
});

assert.equal(isHeatCapacityGuideToast(info), true);
assert.equal(isHeatCapacityGuideToast(blocked), true);
assert.equal(isHeatCapacityGuideToast(pressure), false);
assert.equal(isHeatCapacityPressureToast(pressure), true);
assert.equal(isHeatCapacityPressureToast(info), false);

const protectedQueue = resolveHeatCapacityToastShow({
  current: null,
  pending: null,
  pressureAlertActive: true,
}, info);

assert.equal(protectedQueue.changed, false);
assert.equal(protectedQueue.current, null);
assert.equal(protectedQueue.pending, null);

const pressureQueue = resolveHeatCapacityToastShow({
  current: pressure,
  pending: null,
  pressureAlertActive: false,
}, info);

assert.equal(pressureQueue.changed, false, 'ordinary guide tips should not replace an active pressure reminder');
assert.equal(pressureQueue.current?.id, 'pressure');

const replacedQueue = resolveHeatCapacityToastShow({
  current: info,
  pending: null,
  pressureAlertActive: false,
}, blocked, { interrupt: true });

assert.equal(replacedQueue.changed, true);
assert.equal(replacedQueue.shouldRestartTimer, true);
assert.equal(replacedQueue.current?.id, 'blocked');
assert.equal(replacedQueue.pending, null);

const queuedFollowUp = createHeatCapacityToastMessage('follow up', 'success', {
  id: 'follow-up',
  now: 400,
  source: 'guide',
});
const queuedQueue = resolveHeatCapacityToastShow({
  current: info,
  pending: null,
  pressureAlertActive: false,
}, queuedFollowUp);

assert.equal(queuedQueue.changed, true);
assert.equal(queuedQueue.shouldRestartTimer, false);
assert.equal(queuedQueue.current?.id, 'info');
assert.equal(queuedQueue.pending?.id, 'follow-up');

const advancedQueue = resolveHeatCapacityToastAdvance({
  current: blocked,
  pending: queuedFollowUp,
}, 500);

assert.equal(advancedQueue.current?.id, 'follow-up');
assert.equal(advancedQueue.current?.createdAt, 500);
assert.equal(advancedQueue.pending, null);
assert.equal(advancedQueue.shouldContinueTimer, true);

const clearedQueue = resolveHeatCapacityToastClear({
  current: blocked,
  pending: queuedFollowUp,
}, isHeatCapacityGuideToast, 600);

assert.equal(clearedQueue.changed, true);
assert.equal(clearedQueue.current, null);
assert.equal(clearedQueue.pending, null);
assert.equal(clearedQueue.shouldRestartTimer, false);

console.log('heatCapacityToastController tests passed');
