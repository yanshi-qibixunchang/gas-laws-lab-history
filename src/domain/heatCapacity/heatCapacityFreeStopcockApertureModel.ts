import {
  HEAT_CAPACITY_RELEASE_TIMING,
} from './heatCapacityDefaultConfig.ts';

const clampNonNegative = (value: number) => (
  Number.isFinite(value) && value > 0 ? value : 0
);

export const getHeatCapacityReleaseApertureRatio = (openElapsedS: number) => {
  const rampDurationS = HEAT_CAPACITY_RELEASE_TIMING.releaseApertureRampS;
  if (rampDurationS <= 0) return 1;
  const progress = Math.min(1, clampNonNegative(openElapsedS) / rampDurationS);
  return progress * progress * (3 - 2 * progress);
};

export const integrateHeatCapacityReleaseAperture = (openElapsedS: number) => {
  const elapsedS = clampNonNegative(openElapsedS);
  const rampDurationS = HEAT_CAPACITY_RELEASE_TIMING.releaseApertureRampS;
  const rampElapsedS = Math.min(elapsedS, rampDurationS);
  const x = rampElapsedS / rampDurationS;
  const rampIntegralS = rampDurationS *
    (x * x * x - 0.5 * x * x * x * x);
  return rampIntegralS + Math.max(0, elapsedS - rampDurationS);
};

export const getHeatCapacityReleaseApertureEffectiveDtS = (
  openElapsedBeforeS: number,
  dtS: number,
) => {
  const startS = clampNonNegative(openElapsedBeforeS);
  const endS = startS + clampNonNegative(dtS);
  return Math.max(
    0,
    integrateHeatCapacityReleaseAperture(endS) - integrateHeatCapacityReleaseAperture(startS),
  );
};
