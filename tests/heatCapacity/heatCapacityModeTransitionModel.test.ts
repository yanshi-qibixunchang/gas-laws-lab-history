import assert from 'node:assert/strict';
import {
  createHeatCapacityModeTransitionState,
  isHeatCapacityModeTransitionLocked,
  reduceHeatCapacityModeTransition,
} from '../../src/features/heatCapacity/heatCapacityModeTransitionModel.ts';

let state = createHeatCapacityModeTransitionState('free');
state = reduceHeatCapacityModeTransition(state, {
  type: 'request',
  targetMode: 'guide',
  sceneMotionActive: true,
});
assert.equal(state.phase, 'waiting-for-motion');
assert.equal(state.targetMode, 'guide');
assert.equal(isHeatCapacityModeTransitionLocked(state), true);

state = reduceHeatCapacityModeTransition(state, {
  type: 'request',
  targetMode: 'demo',
  sceneMotionActive: true,
});
assert.equal(state.phase, 'waiting-for-motion');
assert.equal(state.targetMode, 'demo', 'the last request must replace an earlier request before switching starts');

state = reduceHeatCapacityModeTransition(state, { type: 'source-motion-settled' });
assert.equal(state.phase, 'preparing-target');
state = reduceHeatCapacityModeTransition(state, { type: 'target-applied', targetMode: 'demo' });
assert.equal(state.phase, 'animating');
assert.equal(state.visibleMode, 'demo');

state = reduceHeatCapacityModeTransition(state, {
  type: 'request',
  targetMode: 'guide',
  sceneMotionActive: true,
});
state = reduceHeatCapacityModeTransition(state, {
  type: 'request',
  targetMode: 'free',
  sceneMotionActive: true,
});
assert.equal(state.queuedMode, 'free', 'the final click must win while the first transition is animating');
assert.equal(state.visibleMode, 'demo', 'the first target remains the visible outgoing mode until its animation finishes');

state = reduceHeatCapacityModeTransition(state, {
  type: 'animation-finished',
  sceneMotionActive: false,
});
assert.equal(state.phase, 'preparing-target');
assert.equal(state.targetMode, 'free');
assert.equal(state.visibleMode, 'demo');

state = reduceHeatCapacityModeTransition(state, { type: 'target-applied', targetMode: 'free' });
state = reduceHeatCapacityModeTransition(state, {
  type: 'animation-finished',
  sceneMotionActive: false,
});
assert.equal(state.phase, 'idle');
assert.equal(state.visibleMode, 'free');
assert.equal(isHeatCapacityModeTransitionLocked(state), false);

let preparingState = createHeatCapacityModeTransitionState('free');
preparingState = reduceHeatCapacityModeTransition(preparingState, {
  type: 'request',
  targetMode: 'guide',
  sceneMotionActive: false,
});
const firstRequestId = preparingState.requestId;
preparingState = reduceHeatCapacityModeTransition(preparingState, {
  type: 'request',
  targetMode: 'demo',
  sceneMotionActive: false,
});
assert.equal(preparingState.phase, 'preparing-target');
assert.equal(preparingState.targetMode, 'demo');
assert.ok(preparingState.requestId > firstRequestId, 'a newer request must invalidate already scheduled target preparation');

let cancelQueuedState = createHeatCapacityModeTransitionState('free');
cancelQueuedState = reduceHeatCapacityModeTransition(cancelQueuedState, {
  type: 'request',
  targetMode: 'guide',
  sceneMotionActive: false,
});
cancelQueuedState = reduceHeatCapacityModeTransition(cancelQueuedState, {
  type: 'target-applied',
  targetMode: 'guide',
});
cancelQueuedState = reduceHeatCapacityModeTransition(cancelQueuedState, {
  type: 'request',
  targetMode: 'demo',
  sceneMotionActive: true,
});
cancelQueuedState = reduceHeatCapacityModeTransition(cancelQueuedState, {
  type: 'request',
  targetMode: 'guide',
  sceneMotionActive: true,
});
assert.equal(cancelQueuedState.queuedMode, null, 'clicking the currently visible first target must cancel an older queued second transition');

console.log('heatCapacityModeTransitionModel tests passed');
