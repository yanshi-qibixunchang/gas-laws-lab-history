import {
  createDefaultPistonOscillationFreeParameterDraft,
  normalizePistonOscillationFreeParameterDraft,
  type PistonOscillationFreeParameterDraft,
} from './pistonOscillationFreeParameterConfig.ts';
import {
  PISTON_OSCILLATION_DRY_AIR_ADIABATIC_INDEX,
  type PistonOscillationGasType,
} from './pistonOscillationGasMaterialModel.ts';

export const PISTON_OSCILLATION_LEGACY_REAL_AIR_PARAMETER_PROFILE_VERSION =
  'piston-oscillation-real-parameter-profile-v1' as const;
export const PISTON_OSCILLATION_PREVIOUS_REAL_AIR_PARAMETER_PROFILE_VERSION =
  'piston-oscillation-real-parameter-profile-v2' as const;
export const PISTON_OSCILLATION_TAIL_CALIBRATED_REAL_AIR_PARAMETER_PROFILE_VERSION =
  'piston-oscillation-real-parameter-profile-v3' as const;
export const PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V4 =
  'piston-oscillation-real-parameter-profile-v4' as const;
export const PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V5 =
  'piston-oscillation-real-parameter-profile-v5' as const;
export const PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V6 =
  'piston-oscillation-real-parameter-profile-v6' as const;
export const PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V7 =
  'piston-oscillation-real-parameter-profile-v7' as const;
export const PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V8 =
  'piston-oscillation-real-parameter-profile-v8' as const;
export const PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_VERSION =
  'piston-oscillation-real-parameter-profile-v9' as const;
export const PISTON_OSCILLATION_LEGACY_PENDING_REAL_HELIUM_PARAMETER_PROFILE_VERSION =
  'piston-oscillation-real-helium-parameter-profile-v1' as const;
export const PISTON_OSCILLATION_PREVIOUS_REAL_HELIUM_PARAMETER_PROFILE_VERSION =
  'piston-oscillation-real-helium-parameter-profile-v2' as const;
export const PISTON_OSCILLATION_REAL_HELIUM_PARAMETER_PROFILE_V3 =
  'piston-oscillation-real-helium-parameter-profile-v3' as const;
export const PISTON_OSCILLATION_REAL_HELIUM_PARAMETER_PROFILE_V4 =
  'piston-oscillation-real-helium-parameter-profile-v4' as const;
export const PISTON_OSCILLATION_REAL_HELIUM_PARAMETER_PROFILE_V5 =
  'piston-oscillation-real-helium-parameter-profile-v5' as const;
export const PISTON_OSCILLATION_REAL_HELIUM_PARAMETER_PROFILE_VERSION =
  'piston-oscillation-real-helium-parameter-profile-v6' as const;

// Match the pressure irregularities in the measured tail while keeping clear peaks.
const REAL_AIR_TAIL_INTENSITY = 0.35;

/**
 * Teaching preset checked against the air acceptance tolerances scaled to helium.
 * The relaxation time still needs pressure records from this apparatus with helium.
 */
export const PISTON_OSCILLATION_REAL_HELIUM_THERMAL_RELAXATION_TIME_S = 0.008;
export const PISTON_OSCILLATION_REAL_HELIUM_ACCEPTANCE_RELATIVE_ERROR_PERCENT =
  0.03 / PISTON_OSCILLATION_DRY_AIR_ADIABATIC_INDEX * 100;
const PREVIOUS_REAL_HELIUM_THERMAL_RELAXATION_TIME_S = 0.09;

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
    ...(gasType === 'helium' ? {
      thermalRelaxationTimeS: PISTON_OSCILLATION_REAL_HELIUM_THERMAL_RELAXATION_TIME_S,
      thermalVolumeExponent: 0.85,
      equivalentLinearLossNsPerM: 0.18,
      heatFlowLagTimeS: 0.0005,
      sensorResponseTimeS: 0.0026,
      tailIntensity: 0,
    } : {
      equivalentLinearLossNsPerM: 0.06,
      thermalRelaxationTimeS: 0.012,
      thermalVolumeExponent: 1,
      heatFlowLagTimeS: 0.0005,
      sensorResponseTimeS: 0.0025,
      tailIntensity: REAL_AIR_TAIL_INTENSITY,
    }),
  }, defaults);
};

// Published versions and source checkpoints can be present in saved experiment groups.
// Local-only helium trials retain their saved drafts and snapshots without a preset.
export const getPistonOscillationStoredRealParameterBaseline = (
  gasType: PistonOscillationGasType,
  profileVersion: string,
): PistonOscillationFreeParameterDraft | undefined => {
  if (profileVersion === getPistonOscillationRealParameterProfileVersion(gasType)) {
    return createPistonOscillationRealParameterDraft(gasType);
  }
  const defaults = createDefaultPistonOscillationFreeParameterDraft();
  if (gasType === 'helium') {
    if (profileVersion === PISTON_OSCILLATION_PREVIOUS_REAL_HELIUM_PARAMETER_PROFILE_VERSION) {
      return { ...defaults, thermalRelaxationTimeS: PREVIOUS_REAL_HELIUM_THERMAL_RELAXATION_TIME_S };
    }
    if (profileVersion === PISTON_OSCILLATION_REAL_HELIUM_PARAMETER_PROFILE_V3) {
      return normalizePistonOscillationFreeParameterDraft({
        ...defaults,
        thermalRelaxationTimeS: 0.0115,
        equivalentLinearLossNsPerM: 0.022,
        tailIntensity: 0,
      }, defaults);
    }
    return undefined;
  }
  if (profileVersion === PISTON_OSCILLATION_LEGACY_REAL_AIR_PARAMETER_PROFILE_VERSION) return defaults;
  if (profileVersion === PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V8) {
    return normalizePistonOscillationFreeParameterDraft({
      ...defaults,
      equivalentLinearLossNsPerM: 0.18,
      thermalRelaxationTimeS: 0.014,
      thermalVolumeExponent: 1.5,
      heatFlowLagTimeS: 0.0005,
      sensorResponseTimeS: 0.002,
      tailIntensity: REAL_AIR_TAIL_INTENSITY,
    }, defaults);
  }
  const previousCalibration = profileVersion === PISTON_OSCILLATION_PREVIOUS_REAL_AIR_PARAMETER_PROFILE_VERSION
    || profileVersion === PISTON_OSCILLATION_TAIL_CALIBRATED_REAL_AIR_PARAMETER_PROFILE_VERSION;
  const airV7 = profileVersion === PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V7;
  const hasResidualLoss = airV7 || profileVersion === PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V6;
  const calibratedObservation = hasResidualLoss
    || profileVersion === PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V5;
  if (!previousCalibration && !calibratedObservation
    && profileVersion !== PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V4) return undefined;
  return normalizePistonOscillationFreeParameterDraft({
    ...defaults,
    equivalentLinearLossNsPerM: hasResidualLoss ? 0.02 : 0,
    thermalRelaxationTimeS: 0.0115,
    thermalVolumeExponent: previousCalibration ? 0.8 : 1.10,
    heatFlowLagTimeS: 0.0005,
    sensorResponseTimeS: previousCalibration || airV7 ? 0.0055 : 0.0065,
    tailIntensity: profileVersion === PISTON_OSCILLATION_PREVIOUS_REAL_AIR_PARAMETER_PROFILE_VERSION
      ? defaults.tailIntensity : calibratedObservation ? REAL_AIR_TAIL_INTENSITY : 0,
  }, defaults);
};

// Ideal mode keeps the editable real draft while using its own profile identifier.
export const inferPistonOscillationRealAirProfileVersion = (
  draft: PistonOscillationFreeParameterDraft,
) => {
  if (draft.thermalVolumeExponent === undefined) {
    return PISTON_OSCILLATION_LEGACY_REAL_AIR_PARAMETER_PROFILE_VERSION;
  }
  if (draft.thermalVolumeExponent === 1) {
    return PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_VERSION;
  }
  if (draft.thermalVolumeExponent === 1.5) {
    return PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V8;
  }
  if (draft.thermalVolumeExponent === 0.8) {
    return draft.tailIntensity === 1
      ? PISTON_OSCILLATION_PREVIOUS_REAL_AIR_PARAMETER_PROFILE_VERSION
      : PISTON_OSCILLATION_TAIL_CALIBRATED_REAL_AIR_PARAMETER_PROFILE_VERSION;
  }
  if (draft.tailIntensity === 0) return PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V4;
  if (draft.equivalentLinearLossNsPerM === 0) return PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V5;
  return draft.sensorResponseTimeS === 0.0065
    ? PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V6
    : PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V7;
};

export const inferPistonOscillationRealHeliumProfileVersion = (
  draft: PistonOscillationFreeParameterDraft,
) => {
  if (draft.thermalRelaxationTimeS === PREVIOUS_REAL_HELIUM_THERMAL_RELAXATION_TIME_S
    && draft.tailIntensity === 1) return PISTON_OSCILLATION_PREVIOUS_REAL_HELIUM_PARAMETER_PROFILE_VERSION;
  if (draft.thermalVolumeExponent === 0.85) {
    return draft.thermalRelaxationTimeS === PISTON_OSCILLATION_REAL_HELIUM_THERMAL_RELAXATION_TIME_S
      ? PISTON_OSCILLATION_REAL_HELIUM_PARAMETER_PROFILE_VERSION
      : PISTON_OSCILLATION_REAL_HELIUM_PARAMETER_PROFILE_V5;
  }
  return draft.thermalVolumeExponent === 0.65
    ? PISTON_OSCILLATION_REAL_HELIUM_PARAMETER_PROFILE_V4
    : PISTON_OSCILLATION_REAL_HELIUM_PARAMETER_PROFILE_V3;
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
 * Replace the gas-sensitive settings and keep any explicitly customized sensor response.
 */
export const applyPistonOscillationRealGasProfile = (
  current: PistonOscillationFreeParameterDraft,
  gasType: PistonOscillationGasType,
  previousDefaultSensorResponseTimeS?: number,
  parameters = createPistonOscillationRealParameterDraft(gasType),
): PistonOscillationFreeParameterDraft => {
  return normalizePistonOscillationFreeParameterDraft({
    ...current,
    equivalentLinearLossNsPerM:
      parameters.equivalentLinearLossNsPerM,
    thermalRelaxationTimeS: parameters.thermalRelaxationTimeS,
    thermalVolumeExponent: parameters.thermalVolumeExponent,
    heatFlowLagTimeS: parameters.heatFlowLagTimeS,
    tailIntensity: parameters.tailIntensity,
    sensorResponseTimeS: current.sensorResponseTimeS === previousDefaultSensorResponseTimeS
      ? parameters.sensorResponseTimeS : current.sensorResponseTimeS,
  }, parameters);
};
