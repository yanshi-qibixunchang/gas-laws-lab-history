export const PISTON_OSCILLATION_SCREW_DEGREES_PER_GRAIN = 120;
export const PISTON_OSCILLATION_BOTTOM_IMPACT_MIN_DROP_MM = 5;
export const PISTON_OSCILLATION_BOTTOM_IMPACT_FULL_SCALE_DROP_MM = 80;

const clampUnit = (value: number) => Math.min(1, Math.max(0, value));

export class PistonOscillationScrewGrainAccumulator {
  private carriedGrainFraction = 0;

  consume(angleDeltaDeg: number) {
    if (!Number.isFinite(angleDeltaDeg)) return 0;
    const accumulated = this.carriedGrainFraction
      + Math.abs(angleDeltaDeg) / PISTON_OSCILLATION_SCREW_DEGREES_PER_GRAIN;
    const grains = Math.floor(accumulated);
    this.carriedGrainFraction = accumulated - grains;
    return grains;
  }

  reset() {
    this.carriedGrainFraction = 0;
  }
}

export const getPistonOscillationMechanicalVariation = (
  rateRandom: number,
  gainRandom: number,
) => {
  const playbackRate = 0.97 + clampUnit(rateRandom) * 0.06;
  const gainDb = -0.8 + clampUnit(gainRandom) * 1.6;
  return {
    playbackRate,
    gain: 10 ** (gainDb / 20),
  };
};

export const getPistonOscillationVibrationVariation = (
  rateRandom: number,
  gainRandom: number,
) => {
  const playbackRate = 0.985 + clampUnit(rateRandom) * 0.03;
  const gainDb = -0.45 + clampUnit(gainRandom) * 0.9;
  return {
    playbackRate,
    gain: 10 ** (gainDb / 20),
  };
};

export const getPistonOscillationBottomImpactGain = (dropDistanceMm: number) => {
  if (
    !Number.isFinite(dropDistanceMm)
    || dropDistanceMm < PISTON_OSCILLATION_BOTTOM_IMPACT_MIN_DROP_MM
  ) return 0;
  const normalizedDrop = clampUnit(
    (dropDistanceMm - PISTON_OSCILLATION_BOTTOM_IMPACT_MIN_DROP_MM)
      / (PISTON_OSCILLATION_BOTTOM_IMPACT_FULL_SCALE_DROP_MM
        - PISTON_OSCILLATION_BOTTOM_IMPACT_MIN_DROP_MM),
  );
  return 0.18 + 0.82 * normalizedDrop ** 0.65;
};
