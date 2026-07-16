import assert from 'node:assert/strict';
import {
  HEAT_CAPACITY_FREE_ATTEMPT_POWER_OFF_TIMEOUT_MS,
  HEAT_CAPACITY_FREE_ATTEMPT_TARGET_WAIT_S,
  createHeatCapacityFreeAttempt,
  deriveHeatCapacityFreeAttemptWaitTimer,
  evaluateHeatCapacityFreeAttemptPowerOffTimeout,
  normalizeHeatCapacityFreeAttempt,
  setHeatCapacityFreeAttemptInvalidPromptDismissed,
  setHeatCapacityFreeAttemptPower,
  startHeatCapacityFreeAttempt,
  transitionHeatCapacityFreeAttempt,
  type HeatCapacityFreeAttempt,
  type HeatCapacityFreeAttemptEvent,
  type HeatCapacityFreeAttemptInvalidReason,
} from '../../src/domain/heatCapacity/heatCapacityFreeAttemptModel.ts';

const event = (
  type: HeatCapacityFreeAttemptEvent['type'],
  atS: number,
  wallClockMs = atS * 1_000,
): HeatCapacityFreeAttemptEvent => ({ type, atS, wallClockMs });

const createU0Attempt = (powerOn = true) => createHeatCapacityFreeAttempt({
  startReason: 'u0-recorded',
  preheatOutcome: 'completed',
  atS: 10,
  wallClockMs: 10_000,
  powerOn,
});

const pumpOnce = (attempt = createU0Attempt()) => transitionHeatCapacityFreeAttempt(
  attempt,
  event('effective-pump', 12),
);

const startU1Wait = (attempt = pumpOnce()) => transitionHeatCapacityFreeAttempt(
  attempt,
  event('pump-valve-closed', 14),
);

assert.equal(HEAT_CAPACITY_FREE_ATTEMPT_TARGET_WAIT_S, 300);
assert.equal(HEAT_CAPACITY_FREE_ATTEMPT_POWER_OFF_TIMEOUT_MS, 60_000);

const u0Attempt = createU0Attempt();
assert.deepEqual(u0Attempt, {
  status: 'active',
  startReason: 'u0-recorded',
  stage: 'preparing',
  preheatOutcome: 'completed',
  startedAtS: 10,
  startedAtWallClockMs: 10_000,
  effectivePumpCount: 0,
  u1WaitStartedAtS: null,
  u1RecordedAtS: null,
  releaseStartedAtS: null,
  releaseClosedAtS: null,
  u2WaitStartedAtS: null,
  u2RecordedAtS: null,
  powerOffStartedAtWallClockMs: null,
  invalidReason: null,
  invalidatedAtS: null,
  invalidatedAtWallClockMs: null,
  invalidPromptDismissed: false,
});

const effectivePumpStart = createHeatCapacityFreeAttempt({
  startReason: 'effective-pump',
  preheatOutcome: 'omitted',
  atS: 2,
  wallClockMs: 2_000,
  powerOn: false,
});
assert.equal(effectivePumpStart.stage, 'pumping');
assert.equal(effectivePumpStart.effectivePumpCount, 1);
assert.equal(effectivePumpStart.preheatOutcome, 'omitted');
assert.equal(effectivePumpStart.powerOffStartedAtWallClockMs, 2_000);
assert.equal(
  startHeatCapacityFreeAttempt(effectivePumpStart, {
    startReason: 'u0-recorded',
    preheatOutcome: 'completed',
    atS: 100,
    wallClockMs: 100_000,
    powerOn: true,
  }),
  effectivePumpStart,
  'an existing active or invalid attempt must survive until an explicit reset',
);

const pumped = pumpOnce();
assert.equal(pumped.stage, 'pumping');
assert.equal(pumped.effectivePumpCount, 1);

const u1Waiting = startU1Wait(pumped);
assert.equal(u1Waiting.stage, 'waiting-u1');
assert.equal(u1Waiting.u1WaitStartedAtS, 14);
assert.deepEqual(deriveHeatCapacityFreeAttemptWaitTimer(u1Waiting, 313.999), {
  stage: 'u1-wait',
  anchorAtS: 14,
  elapsedS: 299.999,
  targetS: 300,
  remainingS: 0.001,
  reachedTarget: false,
});
assert.deepEqual(deriveHeatCapacityFreeAttemptWaitTimer(u1Waiting, 319), {
  stage: 'u1-wait',
  anchorAtS: 14,
  elapsedS: 305,
  targetS: 300,
  remainingS: 0,
  reachedTarget: true,
});

const u1Recorded = transitionHeatCapacityFreeAttempt(
  u1Waiting,
  event('u1-recorded', 319),
);
assert.equal(u1Recorded.stage, 'u1-recorded');
assert.equal(u1Recorded.u1RecordedAtS, 319);
assert.equal(
  deriveHeatCapacityFreeAttemptWaitTimer(u1Recorded, 320).stage,
  'u1-wait',
  'the U1 timer remains visible until release starts',
);

const releasing = transitionHeatCapacityFreeAttempt(
  u1Recorded,
  event('release-started', 320),
);
assert.equal(releasing.stage, 'releasing');
assert.equal(releasing.releaseStartedAtS, 320);
assert.equal(deriveHeatCapacityFreeAttemptWaitTimer(releasing, 320).stage, 'idle');

const u2Waiting = transitionHeatCapacityFreeAttempt(
  releasing,
  event('release-closed', 320.35),
);
assert.equal(u2Waiting.stage, 'waiting-u2');
assert.equal(u2Waiting.releaseClosedAtS, 320.35);
assert.equal(u2Waiting.u2WaitStartedAtS, 320.35);
assert.deepEqual(deriveHeatCapacityFreeAttemptWaitTimer(u2Waiting, 620.35), {
  stage: 'u2-wait',
  anchorAtS: 320.35,
  elapsedS: 300,
  targetS: 300,
  remainingS: 0,
  reachedTarget: true,
});

const u2Recorded = transitionHeatCapacityFreeAttempt(
  u2Waiting,
  event('u2-recorded', 621),
);
assert.equal(u2Recorded.stage, 'u2-recorded');
assert.equal(u2Recorded.u2RecordedAtS, 621);
assert.equal(deriveHeatCapacityFreeAttemptWaitTimer(u2Recorded, 700).stage, 'u2-wait');
for (const canonicalAttempt of [
  u0Attempt,
  pumped,
  u1Waiting,
  u1Recorded,
  releasing,
  u2Waiting,
  u2Recorded,
]) {
  assert.deepEqual(
    normalizeHeatCapacityFreeAttempt(canonicalAttempt),
    canonicalAttempt,
    `the ${canonicalAttempt.stage} attempt stage must round-trip through persistence`,
  );
}
assert.equal(
  normalizeHeatCapacityFreeAttempt({ ...u1Waiting, u1WaitStartedAtS: null }),
  null,
  'restore must reject a waiting U1 attempt without its timer anchor',
);
assert.equal(
  normalizeHeatCapacityFreeAttempt({ ...u2Waiting, releaseClosedAtS: null }),
  null,
  'restore must reject a waiting U2 attempt without a completed release anchor',
);
assert.equal(
  normalizeHeatCapacityFreeAttempt({ ...u1Waiting, invalidReason: 'release-before-u1' }),
  null,
  'restore must reject active attempts carrying invalid-only state',
);
assert.equal(
  normalizeHeatCapacityFreeAttempt({ ...u0Attempt, u1WaitStartedAtS: 11 }),
  null,
  'restore must reject future-stage timestamps attached to a preparing attempt',
);
assert.equal(
  normalizeHeatCapacityFreeAttempt({ ...u2Waiting, u2WaitStartedAtS: 0 }),
  null,
  'restore must reject a forged U2 wait anchor that predates the release close',
);
assert.equal(
  normalizeHeatCapacityFreeAttempt({ ...u2Waiting, u2WaitStartedAtS: 320.4 }),
  null,
  'the U2 wait anchor must be the exact release-close transition timestamp',
);
assert.equal(
  normalizeHeatCapacityFreeAttempt({ ...releasing, releaseStartedAtS: 13 }),
  null,
  'attempt stage timestamps must remain monotonic',
);
assert.equal(
  normalizeHeatCapacityFreeAttempt({ ...u0Attempt, invalidPromptDismissed: true }),
  null,
  'an active attempt must not persist invalid-only prompt state',
);

const assertInvalid = (
  attempt: HeatCapacityFreeAttempt,
  invalidEvent: HeatCapacityFreeAttemptEvent,
  reason: HeatCapacityFreeAttemptInvalidReason,
) => {
  const invalid = transitionHeatCapacityFreeAttempt(attempt, invalidEvent);
  assert.equal(invalid.status, 'invalid');
  assert.equal(invalid.invalidReason, reason);
  assert.equal(invalid.invalidatedAtS, invalidEvent.atS);
  assert.equal(invalid.invalidatedAtWallClockMs, invalidEvent.wallClockMs);
  assert.equal(invalid.invalidPromptDismissed, false);
  assert.equal(deriveHeatCapacityFreeAttemptWaitTimer(invalid, invalidEvent.atS).stage, 'idle');
  return invalid;
};

const invalidWaitingU1 = assertInvalid(
  u1Waiting,
  event('pump-valve-opened', 20),
  'reopen-pump-valve-during-u1',
);
assert.deepEqual(normalizeHeatCapacityFreeAttempt(invalidWaitingU1), invalidWaitingU1);
assert.equal(
  normalizeHeatCapacityFreeAttempt({
    ...invalidWaitingU1,
    invalidReason: 'repump-after-u1',
  }),
  null,
  'an invalid reason must be reachable from the stage that was frozen at invalidation',
);
assert.equal(
  normalizeHeatCapacityFreeAttempt({ ...invalidWaitingU1, invalidatedAtS: 13 }),
  null,
  'invalidation must not predate the latest attempt-stage transition',
);
assertInvalid(
  u1Waiting,
  event('effective-pump', 20),
  'effective-pump-during-u1',
);
assertInvalid(
  u1Waiting,
  event('release-started', 20),
  'release-before-u1',
);
assertInvalid(
  u1Recorded,
  event('effective-pump', 321),
  'repump-after-u1',
);
assertInvalid(
  pumped,
  event('zero-adjusted', 13),
  'zero-after-effective-pump',
);
assertInvalid(
  u2Waiting,
  event('stopcock-opened', 321),
  'open-stopcock-during-u2',
);
assertInvalid(
  u2Waiting,
  event('pump-valve-opened', 321),
  'pump-during-u2',
);

const poweredOff = setHeatCapacityFreeAttemptPower(
  createU0Attempt(),
  { powerOn: false, atS: 11, wallClockMs: 11_000 },
);
assert.equal(poweredOff.powerOffStartedAtWallClockMs, 11_000);
assert.equal(
  setHeatCapacityFreeAttemptPower(
    poweredOff,
    { powerOn: false, atS: 20, wallClockMs: 20_000 },
  ).powerOffStartedAtWallClockMs,
  11_000,
  'repeated power-off updates must preserve the start of the continuous interval',
);
assert.equal(
  evaluateHeatCapacityFreeAttemptPowerOffTimeout(poweredOff, {
    atS: 70.999,
    wallClockMs: 70_999,
  }).status,
  'active',
);

const restoredBeforeTimeout = setHeatCapacityFreeAttemptPower(poweredOff, {
  powerOn: true,
  atS: 70.999,
  wallClockMs: 70_999,
});
assert.equal(restoredBeforeTimeout.status, 'active');
assert.equal(restoredBeforeTimeout.powerOffStartedAtWallClockMs, null);

const timedOut = evaluateHeatCapacityFreeAttemptPowerOffTimeout(poweredOff, {
  atS: 71,
  wallClockMs: 71_000,
});
assert.equal(timedOut.status, 'invalid');
assert.equal(timedOut.invalidReason, 'power-off-timeout');
assert.deepEqual(normalizeHeatCapacityFreeAttempt(timedOut), timedOut);
assert.equal(
  normalizeHeatCapacityFreeAttempt({ ...timedOut, invalidatedAtWallClockMs: 70_999 }),
  null,
  'a restored power-off timeout must retain the full timeout interval',
);

const timedOutWhilePoweringBackOn = setHeatCapacityFreeAttemptPower(poweredOff, {
  powerOn: true,
  atS: 71,
  wallClockMs: 71_000,
});
assert.equal(timedOutWhilePoweringBackOn.status, 'invalid');
assert.equal(timedOutWhilePoweringBackOn.invalidReason, 'power-off-timeout');

const dismissed = setHeatCapacityFreeAttemptInvalidPromptDismissed(timedOut, true);
assert.equal(dismissed.invalidPromptDismissed, true);
assert.equal(
  transitionHeatCapacityFreeAttempt(dismissed, event('effective-pump', 100)).invalidReason,
  'power-off-timeout',
  'the first invalid reason and timestamp are immutable',
);
assert.equal(
  setHeatCapacityFreeAttemptInvalidPromptDismissed(createU0Attempt(), true)
    .invalidPromptDismissed,
  false,
  'an active attempt has no invalid prompt to dismiss',
);

console.log('heatCapacityFreeAttemptModel tests passed');
