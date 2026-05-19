import assert from 'node:assert/strict';
import {
  enterHeatCapacityFreeModePolicy,
  exitHeatCapacityFreeModePolicy,
  resetHeatCapacityFreeTrialsPolicy,
  selectActiveHeatCapacityDisplay,
  selectActiveHeatCapacityTrials,
  type HeatCapacityModePolicyState,
  type HeatCapacityTeachingSnapshot,
} from '../components/heatCapacity/heatCapacityFreeModePolicy.ts';
import {
  type HeatCapacityDisplaySource,
} from '../components/heatCapacity/heatCapacityDisplaySource.ts';

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

const teachingSnapshot: HeatCapacityTeachingSnapshot = {
  teachingRuntime: {
    phase: 'sealedStabilizing',
    activeStepIndex: 3,
  },
  teachingTrials: [
    {
      id: 'teaching-1',
      source: 'teaching',
    },
  ],
  teachingProcessingResult: {
    gamma: 1.39,
  },
  activeTeachingStep: 'record-u1',
  panelState: {
    activePanelId: 'records',
  },
  messageState: {
    text: 'Wait for pressure to stabilize.',
    tone: 'info',
  },
  teachingModeIdentity: 'guide',
};

const createPolicyState = (): HeatCapacityModePolicyState => ({
  heatCapacityMode: 'guide',
  pausedTeachingSnapshot: teachingSnapshot,
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
assert.deepEqual(
  enteredFree.pausedTeachingSnapshot,
  teachingSnapshot,
  'entering Free should keep a paused Demo/Guide teaching snapshot',
);
assert.notEqual(
  enteredFree.pausedTeachingSnapshot,
  teachingSnapshot,
  'paused teaching snapshot should be cloned so Free reset cannot mutate it',
);
teachingSnapshot.teachingRuntime.phase = 'mutated-after-enter';
assert.equal(
  enteredFree.pausedTeachingSnapshot?.teachingRuntime.phase,
  'sealedStabilizing',
  'Free Mode runtime reset must not mutate the paused teaching snapshot',
);

const resetFreeTrials = resetHeatCapacityFreeTrialsPolicy(enteredFree);
assert.deepEqual(resetFreeTrials.freeTrials, []);
assert.deepEqual(resetFreeTrials.teachingTrials, enteredFree.teachingTrials);
assert.deepEqual(resetFreeTrials.pausedTeachingSnapshot?.teachingTrials, enteredFree.pausedTeachingSnapshot?.teachingTrials);

const exitedFree = exitHeatCapacityFreeModePolicy(enteredFree, 130);
assert.equal(exitedFree.heatCapacityMode, 'guide');
assert.deepEqual(exitedFree.teachingTrials, enteredFree.pausedTeachingSnapshot?.teachingTrials);
assert.deepEqual(exitedFree.freeTrials, enteredFree.freeTrials, 'exiting Free must not overwrite Free trials');
assert.equal(exitedFree.pausedTeachingSnapshot, null);

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
