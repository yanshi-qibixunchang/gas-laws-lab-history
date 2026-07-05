import assert from 'node:assert/strict';
import {
  selectHeatCapacityModeControlState,
} from '../../src/features/heatCapacity/heatCapacityModeControlModel.ts';

const runningDemo = selectHeatCapacityModeControlState({
  activeMode: 'demo',
  autoDemoInteractionLocked: false,
  autoDemoPaused: false,
  autoDemoRunning: true,
  teachingCompleted: false,
});

assert.equal(runningDemo.expanded, true);
assert.deepEqual(runningDemo.demo.actions.map((action) => action.id), ['pause-demo', 'stop-demo']);
assert.equal(runningDemo.guide.actions.length, 0);
assert.equal(runningDemo.free.actions.length, 0);

const pausedDemo = selectHeatCapacityModeControlState({
  activeMode: 'demo',
  autoDemoInteractionLocked: false,
  autoDemoPaused: true,
  autoDemoRunning: false,
  teachingCompleted: false,
});

assert.deepEqual(pausedDemo.demo.actions.map((action) => action.id), ['resume-demo', 'stop-demo']);

const completedDemo = selectHeatCapacityModeControlState({
  activeMode: 'demo',
  autoDemoInteractionLocked: false,
  autoDemoPaused: false,
  autoDemoRunning: false,
  teachingCompleted: true,
});

assert.deepEqual(completedDemo.demo.actions.map((action) => action.id), ['exit-teaching']);
assert.equal(completedDemo.demo.actions[0]?.tone, 'danger');

const runningGuide = selectHeatCapacityModeControlState({
  activeMode: 'guide',
  autoDemoInteractionLocked: false,
  autoDemoPaused: false,
  autoDemoRunning: false,
  teachingCompleted: false,
});

assert.deepEqual(runningGuide.guide.actions.map((action) => action.id), ['exit-guide']);

const completedGuide = selectHeatCapacityModeControlState({
  activeMode: 'guide',
  autoDemoInteractionLocked: false,
  autoDemoPaused: false,
  autoDemoRunning: false,
  teachingCompleted: true,
});

assert.deepEqual(completedGuide.guide.actions.map((action) => action.id), ['exit-teaching']);

const free = selectHeatCapacityModeControlState({
  activeMode: 'free',
  autoDemoInteractionLocked: false,
  autoDemoPaused: false,
  autoDemoRunning: false,
  teachingCompleted: false,
});

assert.deepEqual(free.free.actions.map((action) => action.id), ['reset-free']);

console.log('heatCapacityModeControlModel tests passed');
