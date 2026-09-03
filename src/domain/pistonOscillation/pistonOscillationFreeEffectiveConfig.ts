import type {
  PistonOscillationFreeExperimentGroup,
} from './pistonOscillationFreeExperimentGroupModel.ts';
import {
  getPistonOscillationFreePhysicsConfig,
  getPistonOscillationFreeReleaseAsymmetryConfig,
  getPistonOscillationFreeSensorConfig,
  getPistonOscillationFreeTailConfig,
  getPistonOscillationFreeThermalConfig,
  type PistonOscillationFreeParameterDraft,
} from './pistonOscillationFreeParameterConfig.ts';
import {
  createPistonOscillationIdealParameterProfile,
} from './pistonOscillationIdealParameterProfile.ts';

export const resolvePistonOscillationFreeEffectiveConfig = (
  group: PistonOscillationFreeExperimentGroup,
  parameterDraft: PistonOscillationFreeParameterDraft,
) => {
  const idealProfile = group.scheme === 'ideal'
    ? createPistonOscillationIdealParameterProfile(
        group.gasMaterialSnapshot.adiabaticIndex,
      )
    : null;
  const parameters = group.parameterSnapshot?.parameters
    ?? idealProfile?.parameters
    ?? parameterDraft;
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
      && parameters.tailIrregularityEnabled,
    heightSnapEnabled: group.scheme === 'ideal',
    scoringEligible: group.scheme === 'real',
  } as const;
};
