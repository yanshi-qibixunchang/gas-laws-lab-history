import {
  createDefaultPistonOscillationFreeParameterDraft,
  normalizePistonOscillationFreeParameterDraft,
  type PistonOscillationFreeParameterDraft,
} from './pistonOscillationFreeParameterConfig.ts';
import type {
  PistonOscillationGasType,
} from './pistonOscillationGasMaterialModel.ts';

export const PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_VERSION =
  'piston-oscillation-real-parameter-profile-v1' as const;
export const PISTON_OSCILLATION_LEGACY_PENDING_REAL_HELIUM_PARAMETER_PROFILE_VERSION =
  'piston-oscillation-real-helium-parameter-profile-v1' as const;
export const PISTON_OSCILLATION_REAL_HELIUM_PARAMETER_PROFILE_VERSION =
  'piston-oscillation-real-helium-parameter-profile-v2' as const;

/**
 * Device-specific teaching candidate. It is calibrated against this
 * simulation's normal 80/70/60 mm workflow and is not an apparatus-certified
 * helium heat-transfer constant.
 */
export const PISTON_OSCILLATION_REAL_HELIUM_THERMAL_RELAXATION_TIME_S = 0.09;
export const PISTON_OSCILLATION_REAL_HELIUM_ACCEPTANCE_RELATIVE_ERROR_PERCENT = 3;

export interface PistonOscillationRealParameterProfile {
  version:
    | typeof PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_VERSION
    | typeof PISTON_OSCILLATION_REAL_HELIUM_PARAMETER_PROFILE_VERSION;
  gasType: PistonOscillationGasType;
  parameters: PistonOscillationFreeParameterDraft;
  calibrationScope: 'software-teaching-candidate-not-apparatus-certified';
  acceptanceRelativeErrorPercent: number | null;
}

export const getPistonOscillationRealParameterProfileVersion = (
  gasType: PistonOscillationGasType,
) => gasType === 'helium'
  ? PISTON_OSCILLATION_REAL_HELIUM_PARAMETER_PROFILE_VERSION
  : PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_VERSION;

export const createPistonOscillationRealParameterDraft = (
  gasType: PistonOscillationGasType = 'air',
): PistonOscillationFreeParameterDraft => {
  const defaults = createDefaultPistonOscillationFreeParameterDraft();
  return normalizePistonOscillationFreeParameterDraft({
    ...defaults,
    thermalRelaxationTimeS: gasType === 'helium'
      ? PISTON_OSCILLATION_REAL_HELIUM_THERMAL_RELAXATION_TIME_S
      : defaults.thermalRelaxationTimeS,
  }, defaults);
};

export const createPistonOscillationRealParameterProfile = (
  gasType: PistonOscillationGasType = 'air',
): PistonOscillationRealParameterProfile => ({
  version: getPistonOscillationRealParameterProfileVersion(gasType),
  gasType,
  parameters: createPistonOscillationRealParameterDraft(gasType),
  calibrationScope: 'software-teaching-candidate-not-apparatus-certified',
  acceptanceRelativeErrorPercent: gasType === 'helium'
    ? PISTON_OSCILLATION_REAL_HELIUM_ACCEPTANCE_RELATIVE_ERROR_PERCENT
    : null,
});

/**
 * A gas change preserves environment, acquisition, sensor and user-operation
 * settings, but replaces gas-sensitive apparatus-loss and heat-transfer
 * values with the selected gas profile.
 */
export const applyPistonOscillationRealGasProfile = (
  current: PistonOscillationFreeParameterDraft,
  gasType: PistonOscillationGasType,
): PistonOscillationFreeParameterDraft => {
  const profile = createPistonOscillationRealParameterProfile(gasType);
  return normalizePistonOscillationFreeParameterDraft({
    ...current,
    equivalentLinearLossNsPerM:
      profile.parameters.equivalentLinearLossNsPerM,
    thermalRelaxationTimeS: profile.parameters.thermalRelaxationTimeS,
    heatFlowLagTimeS: profile.parameters.heatFlowLagTimeS,
  }, profile.parameters);
};
