export const PISTON_OSCILLATION_RELEASE_ASYMMETRY_MODEL_VERSION =
  'piston-oscillation-release-asymmetry-v1' as const;
export const PISTON_OSCILLATION_UNBOUNDED_RELEASE_MODEL_VERSION =
  'piston-oscillation-release-asymmetry-v2' as const;
export type PistonReleaseAsymmetryModelVersion =
  | typeof PISTON_OSCILLATION_RELEASE_ASYMMETRY_MODEL_VERSION
  | typeof PISTON_OSCILLATION_UNBOUNDED_RELEASE_MODEL_VERSION;

export interface PistonOscillationReleaseAsymmetryConfig {
  modelVersion: PistonReleaseAsymmetryModelVersion;
  neutralReleaseGapS: number;
  /** Legacy storage name; in v2 this is a reference gap, not a cap. */
  saturatedReleaseGapS: number;
  peakExtraLinearLossNsPerM: number;
  alignmentTimePeriods: number;
}

/**
 * Short-lived side-contact loss produced when the two supporting hands leave
 * at different times. It supplements the accepted equivalent linear loss
 * without replacing it or changing gas stiffness.
 */
export const DEFAULT_PISTON_OSCILLATION_RELEASE_ASYMMETRY_CONFIG:
PistonOscillationReleaseAsymmetryConfig = Object.freeze({
  modelVersion: PISTON_OSCILLATION_RELEASE_ASYMMETRY_MODEL_VERSION,
  neutralReleaseGapS: 0.06,
  saturatedReleaseGapS: 0.15,
  peakExtraLinearLossNsPerM: 3,
  alignmentTimePeriods: 1,
});

const assertFiniteRange = (
  name: string,
  value: number,
  minimum: number,
  maximum: number,
) => {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} must be between ${minimum} and ${maximum}.`);
  }
  return value;
};

export const normalizePistonOscillationReleaseAsymmetryConfig = (
  input: Partial<PistonOscillationReleaseAsymmetryConfig> = {},
): PistonOscillationReleaseAsymmetryConfig => {
  const neutralReleaseGapS = assertFiniteRange(
    'neutralReleaseGapS',
    input.neutralReleaseGapS
      ?? DEFAULT_PISTON_OSCILLATION_RELEASE_ASYMMETRY_CONFIG.neutralReleaseGapS,
    0,
    10,
  );
  const saturatedReleaseGapS = assertFiniteRange(
    'saturatedReleaseGapS',
    input.saturatedReleaseGapS
      ?? DEFAULT_PISTON_OSCILLATION_RELEASE_ASYMMETRY_CONFIG.saturatedReleaseGapS,
    Number.MIN_VALUE,
    10,
  );
  if (saturatedReleaseGapS <= neutralReleaseGapS) {
    throw new RangeError(
      'saturatedReleaseGapS must be greater than neutralReleaseGapS.',
    );
  }
  return {
    modelVersion: input.modelVersion === PISTON_OSCILLATION_UNBOUNDED_RELEASE_MODEL_VERSION
      ? input.modelVersion : PISTON_OSCILLATION_RELEASE_ASYMMETRY_MODEL_VERSION,
    neutralReleaseGapS,
    saturatedReleaseGapS,
    peakExtraLinearLossNsPerM: assertFiniteRange(
      'peakExtraLinearLossNsPerM',
      input.peakExtraLinearLossNsPerM
        ?? DEFAULT_PISTON_OSCILLATION_RELEASE_ASYMMETRY_CONFIG
          .peakExtraLinearLossNsPerM,
      0,
      100,
    ),
    alignmentTimePeriods: assertFiniteRange(
      'alignmentTimePeriods',
      input.alignmentTimePeriods
        ?? DEFAULT_PISTON_OSCILLATION_RELEASE_ASYMMETRY_CONFIG
          .alignmentTimePeriods,
      0.05,
      10,
    ),
  };
};

export interface PistonOscillationReleaseAsymmetryInput {
  signedReleaseGapS: number | null;
}

export interface PistonOscillationReleaseAsymmetryProfile {
  modelVersion: PistonReleaseAsymmetryModelVersion;
  signedReleaseGapS: number | null;
  absoluteReleaseGapS: number | null;
  severity: number;
  peakExtraLinearLossNsPerM: number;
  alignmentTimeS: number;
}

const smoothstep = (value: number) => {
  const normalized = Math.min(1, Math.max(0, value));
  return normalized ** 2 * (3 - 2 * normalized);
};

export const getPistonOscillationReleaseAsymmetrySeverity = (
  signedReleaseGapS: number | null,
  configInput: Partial<PistonOscillationReleaseAsymmetryConfig> = {},
) => {
  const config = normalizePistonOscillationReleaseAsymmetryConfig(configInput);
  if (signedReleaseGapS === null) return 0;
  if (!Number.isFinite(signedReleaseGapS)) {
    throw new RangeError('signedReleaseGapS must be finite or null.');
  }
  const absoluteReleaseGapS = Math.abs(signedReleaseGapS);
  const relativeGap = (absoluteReleaseGapS - config.neutralReleaseGapS)
    / (config.saturatedReleaseGapS - config.neutralReleaseGapS);
  // Keep the accepted small-gap response, then continue growing with excess
  // delay. This is a phenomenological extension, not apparatus-measured friction.
  return config.modelVersion === PISTON_OSCILLATION_UNBOUNDED_RELEASE_MODEL_VERSION
    && relativeGap > 1 ? relativeGap : smoothstep(relativeGap);
};

export const createPistonOscillationReleaseAsymmetryProfile = (
  input: PistonOscillationReleaseAsymmetryInput,
  naturalPeriodS: number,
  configInput: Partial<PistonOscillationReleaseAsymmetryConfig> = {},
): PistonOscillationReleaseAsymmetryProfile => {
  const config = normalizePistonOscillationReleaseAsymmetryConfig(configInput);
  const normalizedNaturalPeriodS = assertFiniteRange(
    'naturalPeriodS',
    naturalPeriodS,
    Number.MIN_VALUE,
    10,
  );
  const severity = getPistonOscillationReleaseAsymmetrySeverity(
    input.signedReleaseGapS,
    config,
  );
  return {
    modelVersion: config.modelVersion,
    signedReleaseGapS: input.signedReleaseGapS,
    absoluteReleaseGapS: input.signedReleaseGapS === null
      ? null
      : Math.abs(input.signedReleaseGapS),
    severity,
    peakExtraLinearLossNsPerM: config.peakExtraLinearLossNsPerM,
    alignmentTimeS: normalizedNaturalPeriodS * config.alignmentTimePeriods,
  };
};

export const getPistonOscillationReleaseAsymmetryExtraLinearLossNsPerM = (
  profile: PistonOscillationReleaseAsymmetryProfile,
  elapsedSinceReleaseS: number,
) => {
  const elapsedS = assertFiniteRange(
    'elapsedSinceReleaseS',
    elapsedSinceReleaseS,
    0,
    60,
  );
  if (profile.severity === 0 || profile.peakExtraLinearLossNsPerM === 0) return 0;
  return profile.peakExtraLinearLossNsPerM
    * profile.severity
    * Math.exp(-elapsedS / profile.alignmentTimeS);
};
