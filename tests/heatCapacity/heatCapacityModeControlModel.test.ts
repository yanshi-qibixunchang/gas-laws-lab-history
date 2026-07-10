import assert from 'node:assert/strict';
import {
  selectHeatCapacityModeControlState,
} from '../../src/features/heatCapacity/heatCapacityModeControlModel.ts';

const runningDemo = selectHeatCapacityModeControlState({
  activeMode: 'demo',
  autoDemoPhase: 'running',
  teachingCompleted: false,
});

assert.equal(runningDemo.expanded, true);
assert.deepEqual(runningDemo.demo.actions.map((action) => action.id), ['pause-demo', 'stop-demo']);
assert.equal(runningDemo.guide.actions.length, 0);
assert.equal(runningDemo.free.actions.length, 0);

const pausedDemo = selectHeatCapacityModeControlState({
  activeMode: 'demo',
  autoDemoPhase: 'paused',
  teachingCompleted: false,
});

assert.deepEqual(pausedDemo.demo.actions.map((action) => action.id), ['resume-demo', 'stop-demo']);

const completedDemo = selectHeatCapacityModeControlState({
  activeMode: 'demo',
  autoDemoPhase: 'idle',
  teachingCompleted: true,
});

assert.deepEqual(completedDemo.demo.actions.map((action) => action.id), ['exit-teaching']);
assert.equal(completedDemo.demo.actions[0]?.tone, 'danger');

const runningGuide = selectHeatCapacityModeControlState({
  activeMode: 'guide',
  autoDemoPhase: 'idle',
  teachingCompleted: false,
});

assert.deepEqual(runningGuide.guide.actions.map((action) => action.id), ['exit-guide']);

const completedGuide = selectHeatCapacityModeControlState({
  activeMode: 'guide',
  autoDemoPhase: 'idle',
  teachingCompleted: true,
});

assert.deepEqual(completedGuide.guide.actions.map((action) => action.id), ['exit-teaching']);

const free = selectHeatCapacityModeControlState({
  activeMode: 'free',
  autoDemoPhase: 'idle',
  teachingCompleted: false,
});

assert.deepEqual(free.free.actions.map((action) => action.id), ['reset-free']);

console.log('heatCapacityModeControlModel tests passed');
