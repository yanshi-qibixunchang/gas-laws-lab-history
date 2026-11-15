import type {
  PistonOscillationFreeExperimentGroup,
} from './pistonOscillationFreeExperimentGroupModel.ts';
import {
  getPistonOscillationFreePhysicsConfig,
  isPistonOscillationFreeTriggerThresholdKpa,
  getPistonOscillationFreeReleaseAsymmetryConfig,
  getPistonOscillationFreeSensorConfig,
  getPistonOscillationFreeTailConfig,
  getPistonOscillationFreeThermalConfig,
  type PistonOscillationFreeParameterDraft,
} from './pistonOscillationFreeParameterConfig.ts';
import {
  createPistonOscillationIdealParameterProfile,
} from './pistonOscillationIdealParameterProfile.ts';
import { PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_VERSION } from './pistonOscillationRealParameterProfile.ts';

export const resolvePistonOscillationFreeEffectiveConfig = (
  group: PistonOscillationFreeExperimentGroup,
  parameterDraft: PistonOscillationFreeParameterDraft,
) => {
  const idealProfile = group.scheme === 'ideal'
    ? createPistonOscillationIdealParameterProfile(
        group.gasMaterialSnapshot.adiabaticIndex,
        group.parameterProfileVersion,
      )
    : null;
  const parameters = group.parameterSnapshot?.parameters ?? (idealProfile
    ? {
        ...idealProfile.parameters,
        triggerThresholdKpa: isPistonOscillationFreeTriggerThresholdKpa(
          parameterDraft.triggerThresholdKpa,
          idealProfile.parameters.ambientPressureKpa,
        ) ? parameterDraft.triggerThresholdKpa : idealProfile.parameters.triggerThresholdKpa,
        ...(parameterDraft.recordingDurationS === undefined
          ? {} : { recordingDurationS: parameterDraft.recordingDurationS }),
      }
    : {
        ...parameterDraft,
        ...(group.parameterProfileVersion === PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_VERSION
          && parameterDraft.recordingDurationS === undefined ? { recordingDurationS: 1.2 } : {}),
      });
  const basePhysicsConfig = idealProfile?.physicsConfig
    ?? getPistonOscillationFreePhysicsConfig(parameters);
  return {
    scheme: group.scheme,
    gasMaterialSnapshot: { ...group.gasMaterialSnapshot },
    parameterProfileVersion: group.parameterProfileVersion,
    parameters,
    physicsConfig: {
      ...basePhysicsConfig,
      gamma: group.gasMaterialSnapshot.adiabaticIndex,
    },
    thermalConfig: getPistonOscillationFreeThermalConfig(parameters),
    releaseAsymmetryConfig:
      getPistonOscillationFreeReleaseAsymmetryConfig(parameters),
    sensorConfig: getPistonOscillationFreeSensorConfig(parameters),
    tailConfig: getPistonOscillationFreeTailConfig(parameters),
    adiabaticProcess: group.scheme === 'ideal',
    exactSensorObservation: group.scheme === 'ideal',
    tailIrregularityEnabled: group.scheme === 'real'
      && parameters.tailIrregularityEnabled
      && parameters.tailIntensity > 0,
    heightSnapEnabled: group.scheme === 'ideal',
    scoringEligible: group.scheme === 'real',
  } as const;
};
