export interface HeatCapacityExperimentProfile {
  seed: number | string;
  gammaTarget: number;
  theoreticalGamma: number;
  u0TargetMv: number;
  u1TargetMv: number;
  u2TargetMv: number;
  u0MeasuredMv: number;
  u1MeasuredMv: number;
  u2MeasuredMv: number;
  pumpPeakPressureMv: number;
  stableBeforeReleaseMv: number;
  recoveryPressureMv: number;
  initialTemperatureMv: number;
  stableTemperatureMv: number;
  releaseTemperatureLowMv: number;
  recoveryTemperatureMv: number;
  pumpEfficiency: number;
  releaseSpeed: number;
  thermalRecoveryRate: number;
  displayNoiseLevel: number;
}

export interface AirHeatCapacityTargets {
  U0Mv: number;
  U1Mv: number;
  U2Mv: number;
  gamma: number;
  theoreticalGamma: number;
  relativeErrorPercent: number;
}

const AIR_THEORETICAL_GAMMA = 1.4;

const clampNumber = (value: number, min: number, max: number) => (
  Math.min(max, Math.max(min, value))
);

const roundNumber = (value: number, digits = 3) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const hashSeed = (seed: number | string) => {
  const source = String(seed);
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const createSeededRandom = (seed: number | string) => {
  let state = hashSeed(seed) || 1;
  return () => {
    state = Math.imul(state ^ (state >>> 15), 1 | state);
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
};

const randomUniform = (
  random: () => number,
  min: number,
  max: number,
) => min + (max - min) * random();

const randomNormal = (
  random: () => number,
  mean: number,
  standardDeviation: number,
) => {
  const u1 = Math.max(Number.EPSILON, random());
  const u2 = Math.max(Number.EPSILON, random());
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z0 * standardDeviation;
};

export const createHeatCapacityExperimentSeed = () => (
  `${Date.now()}-${Math.floor(Math.random() * 1_000_000_000)}`
);

export const calculateAirHeatCapacityTargets = (
  profile: Pick<HeatCapacityExperimentProfile, 'u0MeasuredMv' | 'u1MeasuredMv' | 'u2MeasuredMv' | 'theoreticalGamma'>,
): AirHeatCapacityTargets => {
  const gamma = profile.u1MeasuredMv / (profile.u1MeasuredMv - profile.u2MeasuredMv);
  return {
    U0Mv: profile.u0MeasuredMv,
    U1Mv: profile.u1MeasuredMv,
    U2Mv: profile.u2MeasuredMv,
    gamma,
    theoreticalGamma: profile.theoreticalGamma,
    relativeErrorPercent: Math.abs(gamma - profile.theoreticalGamma) / profile.theoreticalGamma * 100,
  };
};

export const clampHeatCapacityExperimentProfile = (
  profile: HeatCapacityExperimentProfile,
): HeatCapacityExperimentProfile => {
  const u1MeasuredMv = clampNumber(profile.u1MeasuredMv, 105, 130);
  const u2MeasuredMv = clampNumber(profile.u2MeasuredMv, 25, u1MeasuredMv - 12);
  return {
    ...profile,
    theoreticalGamma: AIR_THEORETICAL_GAMMA,
    gammaTarget: clampNumber(profile.gammaTarget, 1.36, 1.44),
    u0MeasuredMv: clampNumber(profile.u0MeasuredMv, -0.03, 0.03),
    u1MeasuredMv,
    u2MeasuredMv,
    stableBeforeReleaseMv: u1MeasuredMv,
    recoveryPressureMv: u2MeasuredMv,
    pumpPeakPressureMv: clampNumber(Math.max(profile.pumpPeakPressureMv, u1MeasuredMv + 12), 124, 156),
    releaseTemperatureLowMv: Math.min(profile.releaseTemperatureLowMv, profile.recoveryTemperatureMv - 0.5),
  };
};

export const createHeatCapacityExperimentProfile = (
  seed: number | string = createHeatCapacityExperimentSeed(),
): HeatCapacityExperimentProfile => {
  const random = createSeededRandom(seed);
  const gammaTarget = clampNumber(randomNormal(random, AIR_THEORETICAL_GAMMA, 0.015), 1.36, 1.44);
  const u1TargetMv = randomUniform(random, 105, 130);
  const u2TargetMv = u1TargetMv * (1 - 1 / gammaTarget);
  const u2MeasuredMv = u2TargetMv + randomNormal(random, 0, 0.4);
  const initialTemperatureMv = randomUniform(random, 1498.8, 1499.3);
  const stableTemperatureMv = randomUniform(random, 1525, 1527);
  const releaseTemperatureLowMv = randomUniform(random, 1499, 1502);
  const recoveryTemperatureMv = randomUniform(random, 1520, 1524);
  const u1MeasuredMv = u1TargetMv + randomNormal(random, 0, 0.25);
  const roundedU1MeasuredMv = roundNumber(u1MeasuredMv, 2);
  const roundedU2MeasuredMv = roundNumber(u2MeasuredMv, 2);

  return clampHeatCapacityExperimentProfile({
    seed,
    gammaTarget: roundNumber(gammaTarget, 5),
    theoreticalGamma: AIR_THEORETICAL_GAMMA,
    u0TargetMv: 0,
    u1TargetMv: roundNumber(u1TargetMv, 2),
    u2TargetMv: roundNumber(u2TargetMv, 2),
    u0MeasuredMv: roundNumber(randomUniform(random, -0.03, 0.03), 2),
    u1MeasuredMv: roundedU1MeasuredMv,
    u2MeasuredMv: roundedU2MeasuredMv >= roundedU1MeasuredMv ? roundNumber(roundedU1MeasuredMv * 0.28, 2) : roundedU2MeasuredMv,
    pumpPeakPressureMv: roundNumber(u1TargetMv + randomUniform(random, 14, 24), 2),
    stableBeforeReleaseMv: roundedU1MeasuredMv,
    recoveryPressureMv: roundedU2MeasuredMv,
    initialTemperatureMv: roundNumber(initialTemperatureMv, 2),
    stableTemperatureMv: roundNumber(stableTemperatureMv, 2),
    releaseTemperatureLowMv: roundNumber(releaseTemperatureLowMv, 2),
    recoveryTemperatureMv: roundNumber(recoveryTemperatureMv, 2),
    pumpEfficiency: roundNumber(randomUniform(random, 0.88, 1.12), 3),
    releaseSpeed: roundNumber(randomUniform(random, 0.9, 1.14), 3),
    thermalRecoveryRate: roundNumber(randomUniform(random, 0.86, 1.16), 3),
    displayNoiseLevel: roundNumber(randomUniform(random, 0.02, 0.08), 3),
  });
};
