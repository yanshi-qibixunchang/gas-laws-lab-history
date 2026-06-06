import assert from 'node:assert/strict';
import {
  enterHeatCapacityFreeModePolicy,
  resetHeatCapacityFreeTrialsPolicy,
  selectActiveHeatCapacityDisplay,
  selectActiveHeatCapacityTrials,
  type HeatCapacityModePolicyState,
} from '../../src/domain/heatCapacity/heatCapacityFreeModePolicy.ts';
import {
  type HeatCapacityDisplaySource,
} from '../../src/domain/heatCapacity/heatCapacityDisplaySource.ts';

const teachingDisplay: HeatCapacityDisplaySource = {
  source: 'teaching',
  pressureMv: 12,
  temperatureMv: 1499.1,
};

const freeDisplay: HeatCapacityDisplaySource = {
  source: 'free',
  pressureMv: 24,
  temperatureMv: 1498.6,
};

const createPolicyState = (): HeatCapacityModePolicyState => ({
  heatCapacityMode: 'guide',
  teachingTrials: [
    {
      id: 'teaching-current',
      source: 'teaching',
    },
  ],
  freeTrials: [
    {
      id: 'free-1',
      source: 'free',
    },
  ],
  teachingDisplay,
  freeDisplay,
});

const beforeEnter = createPolicyState();
const enteredFree = enterHeatCapacityFreeModePolicy(beforeEnter, 100);
assert.equal(enteredFree.heatCapacityMode, 'free');
assert.deepEqual(enteredFree.freeTrials, beforeEnter.freeTrials, 'entering Free must not clear existing Free trials');

const resetFreeTrials = resetHeatCapacityFreeTrialsPolicy(enteredFree);
assert.deepEqual(resetFreeTrials.freeTrials, []);
assert.deepEqual(resetFreeTrials.teachingTrials, enteredFree.teachingTrials);

const afterTeachingMutation = {
  ...enteredFree,
  teachingTrials: [
    {
      id: 'teaching-2',
      source: 'teaching' as const,
    },
  ],
};
assert.deepEqual(
  afterTeachingMutation.freeTrials,
  enteredFree.freeTrials,
  'teaching trial updates should not overwrite Free trials',
);

assert.deepEqual(selectActiveHeatCapacityDisplay({ ...enteredFree, heatCapacityMode: 'demo' }), teachingDisplay);
assert.deepEqual(selectActiveHeatCapacityDisplay({ ...enteredFree, heatCapacityMode: 'guide' }), teachingDisplay);
assert.deepEqual(selectActiveHeatCapacityDisplay(enteredFree), freeDisplay);

assert.deepEqual(selectActiveHeatCapacityTrials({ ...enteredFree, heatCapacityMode: 'demo' }), {
  source: 'teaching',
  trials: enteredFree.teachingTrials,
});
assert.deepEqual(selectActiveHeatCapacityTrials(enteredFree), {
  source: 'free',
  trials: enteredFree.freeTrials,
});

console.log('heatCapacityFreeModePolicy tests passed');
