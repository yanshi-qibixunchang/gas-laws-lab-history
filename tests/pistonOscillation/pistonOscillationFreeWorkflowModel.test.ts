import assert from 'node:assert/strict';
import {
  PISTON_OSCILLATION_FREE_BASELINE_TARGET_HEIGHTS_MM,
  PISTON_OSCILLATION_FREE_DEFAULT_SAMPLE_RATE_HZ,
  PISTON_OSCILLATION_FREE_DEFAULT_TRIGGER_THRESHOLD_KPA,
  createDefaultPistonOscillationFreeSession,
  createPistonOscillationFreeExperimentPlan,
  getPistonOscillationFreeCurrentTargetHeightMm,
  isPistonOscillationFreePlanComplete,
  isValidPistonOscillationFreeExperimentPlan,
  normalizePistonOscillationFreeSession,
  transitionPistonOscillationFreeSession,
} from '../../src/domain/pistonOscillation/pistonOscillationFreeWorkflowModel.ts';

const baseline = createDefaultPistonOscillationFreeSession();
assert.equal(baseline.status, 'idle');
assert.deepEqual(
  baseline.experimentPlan.targetHeightsMm,
  PISTON_OSCILLATION_FREE_BASELINE_TARGET_HEIGHTS_MM,
);
assert.equal(baseline.sampleRateHz, PISTON_OSCILLATION_FREE_DEFAULT_SAMPLE_RATE_HZ);
assert.equal(
  baseline.triggerThresholdKpa,
  PISTON_OSCILLATION_FREE_DEFAULT_TRIGGER_THRESHOLD_KPA,
);
assert.equal(getPistonOscillationFreeCurrentTargetHeightMm(baseline), 80);
assert.equal(isPistonOscillationFreePlanComplete(baseline), false);

assert.equal(isValidPistonOscillationFreeExperimentPlan([80, 70, 60]), true);
assert.equal(isValidPistonOscillationFreeExperimentPlan([80, 60, 30]), true);
assert.equal(isValidPistonOscillationFreeExperimentPlan([80, 70]), false);
assert.equal(isValidPistonOscillationFreeExperimentPlan([80, 70, 60, 50, 40, 30, 20]), false);
assert.equal(isValidPistonOscillationFreeExperimentPlan([60, 70, 80]), false);
assert.equal(isValidPistonOscillationFreeExperimentPlan([80, 70, 70]), false);
assert.throws(() => createPistonOscillationFreeExperimentPlan([80, 70]));

const active = transitionPistonOscillationFreeSession(baseline, {
  type: 'start',
  nowMs: 100,
});
assert.equal(active.status, 'active');
assert.equal(active.startedAtMs, 100);
assert.equal(active.audit.length, 1);
assert.equal(active.audit[0]?.type, 'session-started');

const configured = transitionPistonOscillationFreeSession(active, {
  type: 'setPlan',
  targetHeightsMm: [80, 60, 30],
  nowMs: 110,
});
assert.deepEqual(configured.experimentPlan.targetHeightsMm, [80, 60, 30]);
assert.equal(configured.audit.at(-1)?.type, 'plan-updated');

const withPower = transitionPistonOscillationFreeSession(configured, {
  type: 'setPower',
  powerOn: true,
  nowMs: 120,
});
assert.equal(withPower.powerOn, true);
assert.deepEqual(withPower.audit.at(-1)?.payload, { powerOn: true });

const withOperation = transitionPistonOscillationFreeSession(withPower, {
  type: 'observeOperation',
  operation: 'releasePiston',
  nowMs: 130,
  payload: {
    releaseGapMs: 18,
    firstReleasedHand: 'left',
  },
});
assert.equal(withOperation.audit.at(-1)?.operation, 'releasePiston');
assert.deepEqual(withOperation.audit.at(-1)?.payload, {
  releaseGapMs: 18,
  firstReleasedHand: 'left',
});

const paused = transitionPistonOscillationFreeSession(withOperation, {
  type: 'pause',
  nowMs: 140,
});
assert.equal(paused.status, 'paused');
assert.equal(paused.powerOn, false);
assert.equal(paused.audit.at(-1)?.type, 'session-paused');

const resumed = transitionPistonOscillationFreeSession(paused, {
  type: 'start',
  nowMs: 150,
});
assert.equal(resumed.status, 'active');
assert.equal(resumed.startedAtMs, 100);
assert.equal(resumed.audit.at(-1)?.type, 'session-resumed');

const repaired = normalizePistonOscillationFreeSession({
  ...resumed,
  status: 'active',
  experimentPlan: { targetHeightsMm: [30, 40, 50] },
  sampleRateHz: 0,
  triggerThresholdKpa: Number.NaN,
  audit: [
    ...resumed.audit,
    {
      sequence: 999,
      eventId: 'invalid-event',
      occurredAtMs: 160,
      type: 'unknown',
      measurementIndex: null,
      targetHeightMm: null,
      operation: null,
      payload: {},
    },
  ],
});
assert.deepEqual(
  repaired.experimentPlan.targetHeightsMm,
  PISTON_OSCILLATION_FREE_BASELINE_TARGET_HEIGHTS_MM,
);
assert.equal(repaired.sampleRateHz, PISTON_OSCILLATION_FREE_DEFAULT_SAMPLE_RATE_HZ);
assert.equal(
  repaired.triggerThresholdKpa,
  PISTON_OSCILLATION_FREE_DEFAULT_TRIGGER_THRESHOLD_KPA,
);
assert.equal(repaired.audit.some((event) => event.eventId === 'invalid-event'), false);

const reset = transitionPistonOscillationFreeSession(resumed, {
  type: 'reset',
  nowMs: 200,
});
assert.equal(reset.status, 'active');
assert.equal(reset.startedAtMs, 200);
assert.equal(reset.audit.length, 1);
assert.equal(reset.audit[0]?.type, 'session-reset');

console.log('pistonOscillationFreeWorkflowModel tests passed');
