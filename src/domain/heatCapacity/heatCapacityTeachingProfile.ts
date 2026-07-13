import {
  HEAT_CAPACITY_AUTO_DEMO_RESULT_TEMPERATURE_MV,
  HEAT_CAPACITY_AUTO_DEMO_RESULT_U0_MV,
  HEAT_CAPACITY_AUTO_DEMO_RESULT_U1_MV,
} from './heatCapacityDefaultConfig.ts';
import {
  truncateHeatCapacitySignalMv,
} from './heatCapacitySignalDisplayModel.ts';
import {
  HEAT_CAPACITY_TEMPERATURE_BASELINE_MV,
} from './heatCapacitySensorMapping.ts';

// Demo/Guide-only teaching profile. These scripted target fields preserve the
// guided experiment baseline and are not physical truth for Free Mode.
export interface HeatCapacityTeachingProfile {
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
  ambientTemperatureMv: number;
  initialTemperatureMv: number;
  stableTemperatureMv: number;
  releaseTemperatureLowMv: number;
  recoveryTemperatureMv: number;
  pumpEfficiency: number;
  releaseSpeed: number;
  thermalRecoveryRate: number;
  displayNoiseLevel: number;
}

const AIR_THEORETICAL_GAMMA = 1.4;
const AUTO_DEMO_GAMMA_MIN = 1.37;
const AUTO_DEMO_GAMMA_MAX = 1.43;
const AUTO_DEMO_ATMOSPHERIC_PRESSURE_KPA = 101.3;
const AUTO_DEMO_PRESSURE_SENSITIVITY_MV_PER_KPA = 20;

const clampNumber = (value: number, min: number, max: number) => (
  Math.min(max, Math.max(min, value))
);

const roundNumber = (value: number, digits = 3) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const teachingProfileNumericKeys = [
  'gammaTarget',
  'theoreticalGamma',
  'u0TargetMv',
  'u1TargetMv',
  'u2TargetMv',
  'u0MeasuredMv',
  'u1MeasuredMv',
  'u2MeasuredMv',
  'pumpPeakPressureMv',
  'stableBeforeReleaseMv',
  'recoveryPressureMv',
  'ambientTemperatureMv',
  'initialTemperatureMv',
  'stableTemperatureMv',
  'releaseTemperatureLowMv',
  'recoveryTemperatureMv',
  'pumpEfficiency',
  'releaseSpeed',
  'thermalRecoveryRate',
  'displayNoiseLevel',
] as const satisfies readonly (keyof HeatCapacityTeachingProfile)[];

const isTeachingProfileShape = (value: unknown): value is Record<string, number | string> => (
  isRecord(value) &&
  (typeof value.seed === 'number' || typeof value.seed === 'string') &&
  teachingProfileNumericKeys.every((key) => (
    typeof value[key] === 'number' && Number.isFinite(value[key])
  ))
);

export const calculateHeatCapacityGammaFromDisplayedSignals = (
  u0Mv: number,
  u1Mv: number,
  u2Mv: number,
  atmosphericPressureKPa = AUTO_DEMO_ATMOSPHERIC_PRESSURE_KPA,
  pressureSensitivityMvPerKPa = AUTO_DEMO_PRESSURE_SENSITIVITY_MV_PER_KPA,
) => {
  const p0 = atmosphericPressureKPa;
  const p1 = p0 + (u1Mv - u0Mv) / pressureSensitivityMvPerKPa;
  const p2 = p0 + (u2Mv - u0Mv) / pressureSensitivityMvPerKPa;
  const denominator = Math.log(p1 / p2);
  return p1 > p2 && p2 > p0 && denominator > 0
    ? Math.log(p1 / p0) / denominator
    : Number.NaN;
};

export const calculateHeatCapacityU2ForGamma = (
  u0Mv: number,
  u1Mv: number,
  gamma: number,
  atmosphericPressureKPa = AUTO_DEMO_ATMOSPHERIC_PRESSURE_KPA,
  pressureSensitivityMvPerKPa = AUTO_DEMO_PRESSURE_SENSITIVITY_MV_PER_KPA,
) => {
  const p0 = atmosphericPressureKPa;
  const p1 = p0 + (u1Mv - u0Mv) / pressureSensitivityMvPerKPa;
  const p2 = p1 / Math.exp(Math.log(p1 / p0) / gamma);
  return u0Mv + (p2 - p0) * pressureSensitivityMvPerKPa;
};

export const clampHeatCapacityTeachingProfile = (
  profile: HeatCapacityTeachingProfile,
): HeatCapacityTeachingProfile => {
  const requestedGamma = clampNumber(profile.gammaTarget, AUTO_DEMO_GAMMA_MIN, AUTO_DEMO_GAMMA_MAX);
  const u0MeasuredMv = truncateHeatCapacitySignalMv(clampNumber(profile.u0MeasuredMv, -0.03, 0.03));
  const u1MeasuredMv = truncateHeatCapacitySignalMv(clampNumber(profile.u1MeasuredMv, 105, 130));
  const u2MeasuredMv = truncateHeatCapacitySignalMv(
    roundNumber(calculateHeatCapacityU2ForGamma(u0MeasuredMv, u1MeasuredMv, requestedGamma), 6),
  );
  const gammaTarget = roundNumber(calculateHeatCapacityGammaFromDisplayedSignals(
    u0MeasuredMv,
    u1MeasuredMv,
    u2MeasuredMv,
  ), 6);
  const ambientTemperatureMv = HEAT_CAPACITY_TEMPERATURE_BASELINE_MV;
  const initialTemperatureMv = ambientTemperatureMv;
  const stableTemperatureMv = clampNumber(profile.stableTemperatureMv, ambientTemperatureMv - 0.18, ambientTemperatureMv + 0.18);
  const releaseTemperatureLowMv = clampNumber(profile.releaseTemperatureLowMv, ambientTemperatureMv - 1.15, ambientTemperatureMv - 0.25);
  const recoveryTemperatureMv = clampNumber(profile.recoveryTemperatureMv, ambientTemperatureMv - 0.18, ambientTemperatureMv + 0.18);
  return {
    ...profile,
    theoreticalGamma: AIR_THEORETICAL_GAMMA,
    gammaTarget,
    u0TargetMv: u0MeasuredMv,
    u1TargetMv: u1MeasuredMv,
    u2TargetMv: u2MeasuredMv,
    u0MeasuredMv,
    u1MeasuredMv,
    u2MeasuredMv,
    stableBeforeReleaseMv: u1MeasuredMv,
    recoveryPressureMv: u2MeasuredMv,
    pumpPeakPressureMv: clampNumber(Math.max(profile.pumpPeakPressureMv, u1MeasuredMv + 12), 124, 156),
    ambientTemperatureMv,
    initialTemperatureMv: roundNumber(initialTemperatureMv, 2),
    stableTemperatureMv: roundNumber(stableTemperatureMv, 2),
    releaseTemperatureLowMv: roundNumber(releaseTemperatureLowMv, 2),
    recoveryTemperatureMv: roundNumber(recoveryTemperatureMv, 2),
  };
};

export const normalizeHeatCapacityTeachingProfile = (
  value: unknown,
): HeatCapacityTeachingProfile | null => {
  if (!isTeachingProfileShape(value)) return null;
  return clampHeatCapacityTeachingProfile(value as unknown as HeatCapacityTeachingProfile);
};

const AUTO_DEMO_U2_CHOICES_MV = Array.from({ length: 1200 }, (_, index) => index / 10)
  .filter((u2Mv) => {
    const gamma = calculateHeatCapacityGammaFromDisplayedSignals(
      HEAT_CAPACITY_AUTO_DEMO_RESULT_U0_MV,
      HEAT_CAPACITY_AUTO_DEMO_RESULT_U1_MV,
      u2Mv,
    );
    return gamma >= AUTO_DEMO_GAMMA_MIN && gamma <= AUTO_DEMO_GAMMA_MAX;
  });

export const createHeatCapacityAutoDemoProfile = (
  random: () => number = Math.random,
): HeatCapacityTeachingProfile => {
  const randomUnit = clampNumber(random(), 0, 0.999999999);
  const choiceIndex = Math.floor(randomUnit * AUTO_DEMO_U2_CHOICES_MV.length);
  const u2MeasuredMv = AUTO_DEMO_U2_CHOICES_MV[choiceIndex];
  const gammaTarget = calculateHeatCapacityGammaFromDisplayedSignals(
    HEAT_CAPACITY_AUTO_DEMO_RESULT_U0_MV,
    HEAT_CAPACITY_AUTO_DEMO_RESULT_U1_MV,
    u2MeasuredMv,
  );
  return clampHeatCapacityTeachingProfile({
  seed: `auto-demo-${choiceIndex}`,
  gammaTarget,
  theoreticalGamma: AIR_THEORETICAL_GAMMA,
  u0TargetMv: HEAT_CAPACITY_AUTO_DEMO_RESULT_U0_MV,
  u1TargetMv: HEAT_CAPACITY_AUTO_DEMO_RESULT_U1_MV,
  u2TargetMv: u2MeasuredMv,
  u0MeasuredMv: HEAT_CAPACITY_AUTO_DEMO_RESULT_U0_MV,
  u1MeasuredMv: HEAT_CAPACITY_AUTO_DEMO_RESULT_U1_MV,
  u2MeasuredMv,
  pumpPeakPressureMv: HEAT_CAPACITY_AUTO_DEMO_RESULT_U1_MV + 12,
  stableBeforeReleaseMv: HEAT_CAPACITY_AUTO_DEMO_RESULT_U1_MV,
  recoveryPressureMv: u2MeasuredMv,
  ambientTemperatureMv: HEAT_CAPACITY_AUTO_DEMO_RESULT_TEMPERATURE_MV,
  initialTemperatureMv: HEAT_CAPACITY_AUTO_DEMO_RESULT_TEMPERATURE_MV,
  stableTemperatureMv: HEAT_CAPACITY_AUTO_DEMO_RESULT_TEMPERATURE_MV,
  releaseTemperatureLowMv: HEAT_CAPACITY_AUTO_DEMO_RESULT_TEMPERATURE_MV - 0.75,
  recoveryTemperatureMv: HEAT_CAPACITY_AUTO_DEMO_RESULT_TEMPERATURE_MV,
  pumpEfficiency: 1,
  releaseSpeed: 1,
  thermalRecoveryRate: 1,
  displayNoiseLevel: 0,
  });
};
