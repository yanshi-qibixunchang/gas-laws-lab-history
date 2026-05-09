import assert from 'node:assert/strict';
import {
  advanceHeatCapacityDemoStep,
  applyHeatCapacityAction,
  createHeatCapacityDemoPlan,
  createHeatCapacityExperiment,
} from '../utils/heatCapacityExperiment.ts';

const plan = createHeatCapacityDemoPlan();
assert.deepEqual(
  plan.map((step) => step.key),
  ['powerOn', 'recordP0', 'pump', 'stabilizeP1', 'recordP1', 'release', 'recover', 'recordP2', 'review'],
  'demo plan should cover the full heat-capacity experiment sequence',
);
assert.ok(plan.every((step) => step.message.length > 0), 'each demo step should carry teaching text');
assert.ok(plan.some((step) => step.highlightedPart === 'Hit_Pump'), 'demo should highlight the pump step');
assert.ok(plan.some((step) => step.highlightedPart === 'Hit_C2'), 'demo should highlight the release valve step');

let state = createHeatCapacityExperiment({ ambientPressure: 100, ambientTemperature: 1 });
for (let index = 0; index < plan.length; index += 1) {
  const resolution = advanceHeatCapacityDemoStep(state, index);
  assert.equal(resolution.step.key, plan[index].key);
  assert.equal(resolution.completed, index === plan.length - 1);
  for (const action of resolution.actions) {
    state = applyHeatCapacityAction(state, action);
  }
}

assert.equal(state.phase, 'completed');
assert.ok(state.recorded.p0);
assert.ok(state.recorded.p1);
assert.ok(state.recorded.p2);
assert.ok(state.result);
assert.equal(state.trials.length, 1);

const afterCompleted = advanceHeatCapacityDemoStep(state, plan.length + 5);
assert.equal(afterCompleted.completed, true);
assert.deepEqual(afterCompleted.actions, []);
assert.equal(afterCompleted.step.key, 'review');

console.log('heatCapacityDemo tests passed');
