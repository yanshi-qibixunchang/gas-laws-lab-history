export const FREE_STOPCOCK_APERTURE_RAMP_S = 0.1;

const clampUnit = (value: number) => (
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
);

const clampNonNegative = (value: number) => (
  Number.isFinite(value) && value > 0 ? value : 0
);

export const getFreeStopcockAperture = (openElapsedS: number) => {
  const x = clampUnit(clampNonNegative(openElapsedS) / FREE_STOPCOCK_APERTURE_RAMP_S);
  return x * x * (3 - 2 * x);
};

export const integrateFreeStopcockAperture = (openElapsedS: number) => {
  const elapsedS = clampNonNegative(openElapsedS);
  const rampElapsedS = Math.min(elapsedS, FREE_STOPCOCK_APERTURE_RAMP_S);
  const x = rampElapsedS / FREE_STOPCOCK_APERTURE_RAMP_S;
  const rampIntegralS = FREE_STOPCOCK_APERTURE_RAMP_S *
    (x * x * x - 0.5 * x * x * x * x);
  return rampIntegralS + Math.max(0, elapsedS - FREE_STOPCOCK_APERTURE_RAMP_S);
};

export const getFreeStopcockApertureEffectiveDtS = (
  openElapsedBeforeS: number,
  dtS: number,
) => {
  const startS = clampNonNegative(openElapsedBeforeS);
  const endS = startS + clampNonNegative(dtS);
  return Math.max(
    0,
    integrateFreeStopcockAperture(endS) - integrateFreeStopcockAperture(startS),
  );
};
