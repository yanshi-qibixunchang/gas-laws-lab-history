import { PISTON_DEFAULT_TRIGGER_KPA } from './pistonOscillationRecordingSettings.ts';
import {
  createDefaultPistonOscillationFreeParameterDraft,
  normalizePistonOscillationFreeParameterDraft,
  type PistonOscillationFreeParameterDraft,
} from './pistonOscillationFreeParameterConfig.ts';
import {
  DEFAULT_PISTON_OSCILLATION_PHYSICS_CONFIG,
  normalizePistonOscillationPhysicsConfig,
  type PistonOscillationPhysicsConfig,
} from './pistonOscillationPhysicsEngine.ts';

import { PISTON_OSCILLATION_UNBOUNDED_RELEASE_MODEL_VERSION } from './pistonOscillationReleaseAsymmetryModel.ts';
export const PISTON_PREVIOUS_DISSIPATIVE_IDEAL_PROFILE_VERSION = 'piston-oscillation-ideal-internal-dissipation-v1' as const;
export const PISTON_DISSIPATIVE_IDEAL_PROFILE_VERSION = 'piston-oscillation-ideal-internal-dissipation-v2' as const;

export const PISTON_OSCILLATION_IDEAL_PARAMETER_PROFILE_VERSION =
  'piston-oscillation-ideal-parameter-profile-v1' as const;
export const PISTON_OSCILLATION_IDEAL_AIR_PARAMETER_PROFILE_VERSION =
  'piston-oscillation-ideal-air-parameter-profile-v2' as const;

type PistonOscillationIdealParameterProfileVersion =
  | typeof PISTON_DISSIPATIVE_IDEAL_PROFILE_VERSION
  | typeof PISTON_PREVIOUS_DISSIPATIVE_IDEAL_PROFILE_VERSION
  | typeof PISTON_OSCILLATION_IDEAL_PARAMETER_PROFILE_VERSION
  | typeof PISTON_OSCILLATION_IDEAL_AIR_PARAMETER_PROFILE_VERSION;

export const PISTON_OSCILLATION_IDEAL_SAMPLE_RATE_HZ = 1_000 as const;
export const PISTON_OSCILLATION_IDEAL_TRIGGER_THRESHOLD_KPA = PISTON_DEFAULT_TRIGGER_KPA;

export interface PistonOscillationIdealParameterProfile {
  version: PistonOscillationIdealParameterProfileVersion;
  parameters: PistonOscillationFreeParameterDraft;
  physicsConfig: PistonOscillationPhysicsConfig;
  heightPolicy: 'plan-target-magnetic-snap-with-physical-final-coordinate';
  thermalProcess: 'adiabatic';
  sensorObservation: 'exact-zero-lag';
  tailObservation: 'disabled';
  scoringEligible: false;
}

export const createPistonOscillationIdealParameterDraft = (
  version: string = PISTON_OSCILLATION_IDEAL_PARAMETER_PROFILE_VERSION,
) => {
  const defaults = createDefaultPistonOscillationFreeParameterDraft();
  return normalizePistonOscillationFreeParameterDraft({
    ...defaults,
    ambientPressureKpa:
      DEFAULT_PISTON_OSCILLATION_PHYSICS_CONFIG.ambientPressurePa / 1_000,
    ambientTemperatureK:
      DEFAULT_PISTON_OSCILLATION_PHYSICS_CONFIG.ambientTemperatureK,
    sampleRateHz: PISTON_OSCILLATION_IDEAL_SAMPLE_RATE_HZ,
    triggerThresholdKpa: PISTON_OSCILLATION_IDEAL_TRIGGER_THRESHOLD_KPA,
    ...(version === PISTON_OSCILLATION_IDEAL_AIR_PARAMETER_PROFILE_VERSION
      ? { recordingDurationS: 1 } : {}),
    sensorFluctuationEnabled: false,
    tailIrregularityEnabled: false,
    equivalentLinearLossNsPerM: 0,
    fastFluctuationStandardDeviationPa: 0,
    slowFluctuationStandardDeviationPa: 0,
    driftWanderAmplitudePa: 0,
    driftRatePaPerS: 0,
    tailIntensity: 0,
  }, defaults);
};

export const createPistonOscillationIdealParameterProfile = (
  gamma: number,
  profileVersion: string = PISTON_OSCILLATION_IDEAL_PARAMETER_PROFILE_VERSION,
): PistonOscillationIdealParameterProfile => {
  const version = profileVersion === PISTON_DISSIPATIVE_IDEAL_PROFILE_VERSION
    || profileVersion === PISTON_PREVIOUS_DISSIPATIVE_IDEAL_PROFILE_VERSION
    || profileVersion === PISTON_OSCILLATION_IDEAL_AIR_PARAMETER_PROFILE_VERSION
    ? profileVersion : PISTON_OSCILLATION_IDEAL_PARAMETER_PROFILE_VERSION;
  const internalDissipationEnabled = version === PISTON_DISSIPATIVE_IDEAL_PROFILE_VERSION
    || version === PISTON_PREVIOUS_DISSIPATIVE_IDEAL_PROFILE_VERSION;
  const parameters = createPistonOscillationIdealParameterDraft(version);
  if (internalDissipationEnabled) parameters.recordingDurationS = gamma === 1.4 ? 1.2 : 3;
  if (version === PISTON_DISSIPATIVE_IDEAL_PROFILE_VERSION) {
    parameters.releaseAsymmetryModelVersion = PISTON_OSCILLATION_UNBOUNDED_RELEASE_MODEL_VERSION;
  }
  return {
    version,
    parameters,
    physicsConfig: normalizePistonOscillationPhysicsConfig({
      ...DEFAULT_PISTON_OSCILLATION_PHYSICS_CONFIG,
      gamma,
      ...(internalDissipationEnabled ? {
        internalDissipationMolarMassKgPerMol: gamma === 1.4 ? 0.02897 : 0.004002602,
      } : {}),
      ambientPressurePa: parameters.ambientPressureKpa * 1_000,
      ambientTemperatureK: parameters.ambientTemperatureK,
      linearDampingNsPerM: 0,
      sensorSampleRateHz: PISTON_OSCILLATION_IDEAL_SAMPLE_RATE_HZ,
    }),
    heightPolicy: 'plan-target-magnetic-snap-with-physical-final-coordinate',
    thermalProcess: 'adiabatic',
    sensorObservation: 'exact-zero-lag',
    tailObservation: 'disabled',
    scoringEligible: false,
  };
};
