export const PISTON_OSCILLATION_ACQUISITION_DISPLAY_FRAME_INTERVAL_MS = 1_000 / 30;
export const PISTON_OSCILLATION_ACQUISITION_MAXIMUM_VISIBLE_ADVANCE_MS = 50;

export interface PistonOscillationAcquisitionDisplayClock {
  lastWallNowMs: number;
  accumulatedLagMs: number;
}

const assertFiniteNonNegative = (name: string, value: number) => {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite non-negative number.`);
  }
  return value;
};

/**
 * The formal sensor series remains sampled at its configured rate. This clock
 * only limits how much of that already-computed series may become visible in a
 * single browser frame, so a long calculation cannot make the chart jump.
 */
export const createPistonOscillationAcquisitionDisplayClock = (
  wallNowMs: number,
): PistonOscillationAcquisitionDisplayClock => ({
  lastWallNowMs: assertFiniteNonNegative('wallNowMs', wallNowMs),
  accumulatedLagMs: 0,
});

export const rebasePistonOscillationAcquisitionDisplayClock = (
  clock: PistonOscillationAcquisitionDisplayClock,
  wallNowMs: number,
  options: { resetLag?: boolean } = {},
): PistonOscillationAcquisitionDisplayClock => ({
  lastWallNowMs: assertFiniteNonNegative('wallNowMs', wallNowMs),
  accumulatedLagMs: options.resetLag
    ? 0
    : assertFiniteNonNegative('clock.accumulatedLagMs', clock.accumulatedLagMs),
});

export const advancePistonOscillationAcquisitionDisplayClock = (
  clock: PistonOscillationAcquisitionDisplayClock,
  wallNowMs: number,
  maximumVisibleAdvanceMs:
    number = PISTON_OSCILLATION_ACQUISITION_MAXIMUM_VISIBLE_ADVANCE_MS,
): PistonOscillationAcquisitionDisplayClock => {
  const nextWallNowMs = assertFiniteNonNegative('wallNowMs', wallNowMs);
  const previousWallNowMs = assertFiniteNonNegative(
    'clock.lastWallNowMs',
    clock.lastWallNowMs,
  );
  const maximumAdvanceMs = assertFiniteNonNegative(
    'maximumVisibleAdvanceMs',
    maximumVisibleAdvanceMs,
  );
  const wallAdvanceMs = Math.max(0, nextWallNowMs - previousWallNowMs);
  const availableAdvanceMs = assertFiniteNonNegative(
    'clock.accumulatedLagMs',
    clock.accumulatedLagMs,
  ) + wallAdvanceMs;
  const visibleAdvanceMs = Math.min(availableAdvanceMs, maximumAdvanceMs);
  return {
    lastWallNowMs: Math.max(previousWallNowMs, nextWallNowMs),
    accumulatedLagMs: availableAdvanceMs - visibleAdvanceMs,
  };
};

export const getPistonOscillationAcquisitionPresentedNowMs = (
  wallNowMs: number,
  clock: PistonOscillationAcquisitionDisplayClock,
) => Math.max(
  0,
  assertFiniteNonNegative('wallNowMs', wallNowMs)
    - assertFiniteNonNegative('clock.accumulatedLagMs', clock.accumulatedLagMs),
);
