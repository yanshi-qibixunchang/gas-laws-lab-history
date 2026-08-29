import assert from 'node:assert/strict';
import {
  PISTON_OSCILLATION_ACQUISITION_DISPLAY_FRAME_INTERVAL_MS,
  PISTON_OSCILLATION_ACQUISITION_MAXIMUM_VISIBLE_ADVANCE_MS,
  advancePistonOscillationAcquisitionDisplayClock,
  createPistonOscillationAcquisitionDisplayClock,
  getPistonOscillationAcquisitionPresentedNowMs,
  rebasePistonOscillationAcquisitionDisplayClock,
} from '../../src/features/pistonOscillation/pistonOscillationAcquisitionDisplayClock.ts';

const frameIntervalMs = PISTON_OSCILLATION_ACQUISITION_DISPLAY_FRAME_INTERVAL_MS;
const maximumVisibleAdvanceMs =
  PISTON_OSCILLATION_ACQUISITION_MAXIMUM_VISIBLE_ADVANCE_MS;
let clock = createPistonOscillationAcquisitionDisplayClock(1_000);
clock = advancePistonOscillationAcquisitionDisplayClock(clock, 1_000 + frameIntervalMs);
const presentedBeforeStallMs = getPistonOscillationAcquisitionPresentedNowMs(
  1_000 + frameIntervalMs,
  clock,
);
assert.ok(Math.abs(presentedBeforeStallMs - (1_000 + frameIntervalMs)) < 1e-9);

const wallNowAfterStallMs = 1_000 + frameIntervalMs + 400;
clock = advancePistonOscillationAcquisitionDisplayClock(clock, wallNowAfterStallMs);
const presentedAfterStallMs = getPistonOscillationAcquisitionPresentedNowMs(
  wallNowAfterStallMs,
  clock,
);
assert.ok(
  Math.abs(presentedAfterStallMs - (presentedBeforeStallMs + maximumVisibleAdvanceMs)) < 1e-9,
  'a long calculation must reveal only a bounded portion of already-sampled data',
);
assert.ok(Math.abs(clock.accumulatedLagMs - (400 - maximumVisibleAdvanceMs)) < 1e-9);

const samplesRevealedAfterStall = Math.floor(
  (presentedAfterStallMs - presentedBeforeStallMs) / 1_000 * 1_000 + 1e-9,
);
assert.ok(
  samplesRevealedAfterStall <= Math.ceil(maximumVisibleAdvanceMs),
  'a 1000 Hz series must not jump forward by hundreds of samples after one slow frame',
);

let catchUpWallNowMs = wallNowAfterStallMs;
for (let frameIndex = 0; frameIndex < 30; frameIndex += 1) {
  catchUpWallNowMs += frameIntervalMs;
  clock = advancePistonOscillationAcquisitionDisplayClock(clock, catchUpWallNowMs);
}
assert.ok(
  clock.accumulatedLagMs < 1e-8,
  'bounded display lag must drain over later frames instead of becoming permanent',
);
assert.ok(
  Math.abs(
    getPistonOscillationAcquisitionPresentedNowMs(catchUpWallNowMs, clock)
      - catchUpWallNowMs,
  ) < 1e-8,
);

const pauseRebasedClock = rebasePistonOscillationAcquisitionDisplayClock(clock, 5_000);
assert.equal(pauseRebasedClock.lastWallNowMs, 5_000);
assert.equal(pauseRebasedClock.accumulatedLagMs, clock.accumulatedLagMs);
const resetClock = rebasePistonOscillationAcquisitionDisplayClock(
  pauseRebasedClock,
  6_000,
  { resetLag: true },
);
assert.equal(resetClock.accumulatedLagMs, 0);

assert.throws(
  () => advancePistonOscillationAcquisitionDisplayClock(clock, Number.NaN),
  /wallNowMs/,
);

console.log('pistonOscillationAcquisitionDisplayClock tests passed');
