import {
  HEAT_CAPACITY_AUTO_DEMO_RESULT_GAMMA,
  HEAT_CAPACITY_AUTO_DEMO_RESULT_TEMPERATURE_MV,
  HEAT_CAPACITY_AUTO_DEMO_RESULT_U0_MV,
  HEAT_CAPACITY_AUTO_DEMO_RESULT_U1_MV,
  HEAT_CAPACITY_AUTO_DEMO_RESULT_U2_MV,
} from './heatCapacityDefaultConfig.ts';

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

const clampNumber = (value: number, min: number, max: number) => (
  Math.min(max, Math.max(min, value))
);

const roundNumber = (value: number, digits = 3) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export const clampHeatCapacityTeachingProfile = (
  profile: HeatCapacityTeachingProfile,
): HeatCapacityTeachingProfile => {
  const gammaTarget = clampNumber(profile.gammaTarget, 1.36, 1.44);
  const u1MeasuredMv = clampNumber(profile.u1MeasuredMv, 105, 130);
  const targetU2MeasuredMv = u1MeasuredMv * (1 - 1 / gammaTarget);
  const minGammaU2Mv = u1MeasuredMv * (1 - 1 / 1.36);
  const maxGammaU2Mv = u1MeasuredMv * (1 - 1 / 1.44);
  const u2MeasuredMv = roundNumber(clampNumber(
    profile.u2MeasuredMv,
    Math.max(25, minGammaU2Mv, targetU2MeasuredMv - 0.95),
    Math.min(u1MeasuredMv - 12, maxGammaU2Mv, targetU2MeasuredMv + 0.95),
  ), 2);
  const ambientTemperatureMv = clampNumber(
    Number.isFinite(profile.ambientTemperatureMv) ? profile.ambientTemperatureMv : profile.initialTemperatureMv,
    1498.8,
    1499.3,
  );
  const initialTemperatureMv = clampNumber(profile.initialTemperatureMv, ambientTemperatureMv - 0.05, ambientTemperatureMv + 0.05);
  const stableTemperatureMv = clampNumber(profile.stableTemperatureMv, ambientTemperatureMv - 0.18, ambientTemperatureMv + 0.18);
  const releaseTemperatureLowMv = clampNumber(profile.releaseTemperatureLowMv, ambientTemperatureMv - 1.15, ambientTemperatureMv - 0.25);
  const recoveryTemperatureMv = clampNumber(profile.recoveryTemperatureMv, ambientTemperatureMv - 0.18, ambientTemperatureMv + 0.18);
  return {
    ...profile,
    theoreticalGamma: AIR_THEORETICAL_GAMMA,
    gammaTarget,
    u0MeasuredMv: clampNumber(profile.u0MeasuredMv, -0.03, 0.03),
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

export const createHeatCapacityAutoDemoProfile = (): HeatCapacityTeachingProfile => clampHeatCapacityTeachingProfile({
  seed: 'auto-demo-fixed',
  gammaTarget: HEAT_CAPACITY_AUTO_DEMO_RESULT_GAMMA,
  theoreticalGamma: AIR_THEORETICAL_GAMMA,
  u0TargetMv: HEAT_CAPACITY_AUTO_DEMO_RESULT_U0_MV,
  u1TargetMv: HEAT_CAPACITY_AUTO_DEMO_RESULT_U1_MV,
  u2TargetMv: HEAT_CAPACITY_AUTO_DEMO_RESULT_U2_MV,
  u0MeasuredMv: HEAT_CAPACITY_AUTO_DEMO_RESULT_U0_MV,
  u1MeasuredMv: HEAT_CAPACITY_AUTO_DEMO_RESULT_U1_MV,
  u2MeasuredMv: HEAT_CAPACITY_AUTO_DEMO_RESULT_U2_MV,
  pumpPeakPressureMv: HEAT_CAPACITY_AUTO_DEMO_RESULT_U1_MV + 12,
  stableBeforeReleaseMv: HEAT_CAPACITY_AUTO_DEMO_RESULT_U1_MV,
  recoveryPressureMv: HEAT_CAPACITY_AUTO_DEMO_RESULT_U2_MV,
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
