import assert from 'node:assert/strict';
import {
  HEAT_CAPACITY_ZERO_WHEEL_GESTURE_GAP_MS,
  HeatCapacityRejectedInteractionTracker,
  HeatCapacityWheelGestureTracker,
  createHeatCapacityControlInteractionId,
} from '../../src/features/heatCapacity/heatCapacityControlInteraction.ts';

const dragOne = createHeatCapacityControlInteractionId('pressureZero', 'drag');
const dragTwo = createHeatCapacityControlInteractionId('pressureZero', 'drag');
assert.notEqual(dragOne, dragTwo);

const wheelTracker = new HeatCapacityWheelGestureTracker();
const wheelOne = wheelTracker.getInteractionId(1_000);
assert.equal(
  wheelTracker.getInteractionId(1_000 + HEAT_CAPACITY_ZERO_WHEEL_GESTURE_GAP_MS),
  wheelOne,
  'events at the gesture-gap boundary should remain one wheel operation',
);
const wheelTwo = wheelTracker.getInteractionId(
  1_000 + HEAT_CAPACITY_ZERO_WHEEL_GESTURE_GAP_MS * 2 + 1,
);
assert.notEqual(wheelTwo, wheelOne, 'a quiet gap should begin a new wheel operation');

const rejectedTracker = new HeatCapacityRejectedInteractionTracker();
assert.equal(rejectedTracker.shouldApplyFailure('file-1', 'adjustPressureZero', dragOne), true);
for (let pointerMove = 0; pointerMove < 10; pointerMove += 1) {
  assert.equal(
    rejectedTracker.shouldApplyFailure('file-1', 'adjustPressureZero', dragOne),
    false,
    'every later pointermove in one rejected drag must remain silent',
  );
}
assert.equal(
  rejectedTracker.shouldApplyFailure('file-1', 'adjustPressureZero', dragTwo),
  true,
  'a second drag should count as the next independent mistake',
);
assert.equal(
  rejectedTracker.shouldApplyFailure('file-1', 'adjustPressureZero', dragOne),
  false,
  'an interleaved callback from an older rejected drag must remain deduplicated',
);
assert.equal(
  rejectedTracker.shouldApplyFailure('file-1', 'pumpBulb'),
  true,
  'controls without gesture ids should continue treating each click as independent',
);
rejectedTracker.reset();
assert.equal(rejectedTracker.shouldApplyFailure('file-1', 'adjustPressureZero', dragTwo), true);

console.log('heatCapacityControlInteraction tests passed');
