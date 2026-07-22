import assert from 'node:assert/strict';
import {
  selectHeatCapacityModeControlState,
} from '../../src/features/heatCapacity/heatCapacityModeControlModel.ts';

const runningDemo = selectHeatCapacityModeControlState({
  activeMode: 'demo',
  autoDemoPhase: 'running',
  teachingCompleted: false,
  freeBatchCompleted: false,
});

assert.equal(runningDemo.expanded, true);
assert.deepEqual(runningDemo.demo.actions.map((action) => action.id), ['pause-demo', 'stop-demo']);
assert.equal(runningDemo.guide.actions.length, 0);
assert.equal(runningDemo.free.actions.length, 0);

const pausedDemo = selectHeatCapacityModeControlState({
  activeMode: 'demo',
  autoDemoPhase: 'paused',
  teachingCompleted: false,
  freeBatchCompleted: false,
});

assert.deepEqual(pausedDemo.demo.actions.map((action) => action.id), ['resume-demo', 'stop-demo']);

const completedDemo = selectHeatCapacityModeControlState({
  activeMode: 'demo',
  autoDemoPhase: 'idle',
  teachingCompleted: true,
  freeBatchCompleted: false,
});

assert.deepEqual(completedDemo.demo.actions.map((action) => action.id), ['exit-teaching']);
assert.equal(completedDemo.demo.actions[0]?.tone, 'danger');

const runningGuide = selectHeatCapacityModeControlState({
  activeMode: 'guide',
  autoDemoPhase: 'idle',
  teachingCompleted: false,
  freeBatchCompleted: false,
});

assert.deepEqual(runningGuide.guide.actions.map((action) => action.id), ['reset-guide', 'exit-guide']);

const completedGuide = selectHeatCapacityModeControlState({
  activeMode: 'guide',
  autoDemoPhase: 'idle',
  teachingCompleted: true,
  freeBatchCompleted: false,
});

assert.deepEqual(completedGuide.guide.actions.map((action) => action.id), ['reset-guide', 'exit-teaching']);

const free = selectHeatCapacityModeControlState({
  activeMode: 'free',
  autoDemoPhase: 'idle',
  teachingCompleted: false,
  freeBatchCompleted: false,
});

assert.deepEqual(free.free.actions.map((action) => action.id), ['reset-free', 'exit-free']);

const completedFree = selectHeatCapacityModeControlState({
  activeMode: 'free',
  autoDemoPhase: 'idle',
  teachingCompleted: false,
  freeBatchCompleted: true,
});

assert.deepEqual(completedFree.free.actions.map((action) => action.id), ['exit-free']);

const explore = selectHeatCapacityModeControlState({
  activeMode: null,
  autoDemoPhase: 'idle',
  teachingCompleted: false,
  freeBatchCompleted: false,
});

assert.equal(explore.expanded, false);
assert.equal(explore.demo.active, false);
assert.equal(explore.guide.active, false);
assert.equal(explore.free.active, false);
assert.deepEqual(explore.free.actions, []);

console.log('heatCapacityModeControlModel tests passed');
