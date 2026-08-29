import assert from 'node:assert/strict';
import {
  getPistonOscillationGuideScrewInteractionMode,
  resolvePistonOscillationGuideScrewFeedback,
  resolvePistonOscillationGuideScrewDelta,
} from '../../src/features/pistonOscillation/pistonOscillationGuideScrewInteraction.ts';
import {
  getPistonLockingScrewClampState,
} from '../../src/features/pistonOscillation/pistonOscillationModelMotion.ts';

assert.equal(getPistonOscillationGuideScrewInteractionMode('screwLock'), 'tighten');
assert.equal(getPistonOscillationGuideScrewInteractionMode('hoseReconnect'), 'protectLocked');
assert.equal(getPistonOscillationGuideScrewInteractionMode('screwLoosen'), 'loosen');
assert.equal(getPistonOscillationGuideScrewInteractionMode('acquisitionReady'), 'protectLoose');
assert.equal(getPistonOscillationGuideScrewInteractionMode('waitingTrigger'), 'protectLoose');
assert.equal(getPistonOscillationGuideScrewInteractionMode('nextHeightAdjustment'), null);

assert.deepEqual(
  resolvePistonOscillationGuideScrewDelta(0.59, 0.02, 'tighten'),
  {
    attemptedDirection: 'clockwise',
    expectedDirection: 'clockwise',
    nextProgress: 0.61,
    feedback: 'none',
    authorizationAction: 'tightenScrew',
  },
);
assert.deepEqual(
  resolvePistonOscillationGuideScrewDelta(0.4, -0.1, 'tighten'),
  {
    attemptedDirection: 'counterclockwise',
    expectedDirection: 'clockwise',
    nextProgress: 0.30000000000000004,
    feedback: 'wrongDirection',
    authorizationAction: null,
  },
);

assert.deepEqual(
  resolvePistonOscillationGuideScrewDelta(0.7, 0.5, 'protectLocked'),
  {
    attemptedDirection: 'clockwise',
    expectedDirection: 'clockwise',
    nextProgress: 1,
    feedback: 'none',
    authorizationAction: null,
  },
);
assert.equal(
  resolvePistonOscillationGuideScrewDelta(0.8, -0.1, 'protectLocked').feedback,
  'wrongDirection',
);
const protectedLocked = resolvePistonOscillationGuideScrewDelta(
  0.8,
  -0.3,
  'protectLocked',
);
assert.equal(protectedLocked.feedback, 'boundaryBlocked');
assert.equal(protectedLocked.nextProgress, 0.6);
assert.equal(getPistonLockingScrewClampState(protectedLocked.nextProgress), 'locked');

assert.equal(
  resolvePistonOscillationGuideScrewDelta(0.61, -0.02, 'loosen').authorizationAction,
  'loosenScrew',
);
assert.equal(
  resolvePistonOscillationGuideScrewDelta(0.2, -0.5, 'protectLoose').nextProgress,
  0,
);
assert.equal(
  resolvePistonOscillationGuideScrewDelta(0.2, 0.2, 'protectLoose').feedback,
  'wrongDirection',
);
const protectedLoose = resolvePistonOscillationGuideScrewDelta(0.5, 0.2, 'protectLoose');
assert.equal(protectedLoose.feedback, 'boundaryBlocked');
assert.equal(getPistonLockingScrewClampState(protectedLoose.nextProgress), 'loose');
assert.ok(protectedLoose.nextProgress < 0.6);

const immediateBoundaryFeedback = resolvePistonOscillationGuideScrewFeedback(
  'boundaryBlocked',
  { softFeedbackShown: false, boundaryFeedbackShown: false },
);
assert.deepEqual(immediateBoundaryFeedback, {
  feedback: 'wrongDirection',
  nextState: { softFeedbackShown: true, boundaryFeedbackShown: false },
});
const continuedBoundaryFeedback = resolvePistonOscillationGuideScrewFeedback(
  'boundaryBlocked',
  immediateBoundaryFeedback.nextState,
);
assert.deepEqual(continuedBoundaryFeedback, {
  feedback: 'boundaryBlocked',
  nextState: { softFeedbackShown: true, boundaryFeedbackShown: true },
});
assert.equal(
  resolvePistonOscillationGuideScrewFeedback(
    'boundaryBlocked',
    continuedBoundaryFeedback.nextState,
  ).feedback,
  'none',
);

console.log('pistonOscillationGuideScrewInteraction tests passed');
