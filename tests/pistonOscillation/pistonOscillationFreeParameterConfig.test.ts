import assert from 'node:assert/strict';
import {
  createDefaultPistonOscillationFreeParameterDraft,
  createPistonOscillationFreeParameterSnapshot,
  getPistonOscillationFreeTriggerThresholdRange,
  getPistonOscillationFreePhysicsConfig,
  getPistonOscillationFreeReleaseAsymmetryConfig,
  getPistonOscillationFreeSensorConfig,
  getPistonOscillationFreeTailConfig,
  getPistonOscillationFreeThermalConfig,
  normalizePistonOscillationFreeParameterDraft,
  normalizePistonOscillationFreeParameterSnapshot,
  scalePistonOscillationFreeTriggerThresholdKpa,
} from '../../src/domain/pistonOscillation/pistonOscillationFreeParameterConfig.ts';
import {
  PISTON_OSCILLATION_CURRENT_LINEAR_LOSS_NS_PER_M,
} from '../../src/domain/pistonOscillation/pistonOscillationEquivalentLossModel.ts';
import {
  PISTON_OSCILLATION_TAIL_IRREGULARITY_OBSERVATION_CONFIG,
} from '../../src/domain/pistonOscillation/pistonOscillationTailIrregularityObservationModel.ts';

const defaults = createDefaultPistonOscillationFreeParameterDraft();
assert.equal(defaults.sampleRateHz, null);
assert.equal(defaults.triggerThresholdKpa, null);
assert.equal(defaults.sensorFluctuationEnabled, true);
assert.equal(defaults.tailIrregularityEnabled, true);
assert.equal(
  defaults.equivalentLinearLossNsPerM,
  PISTON_OSCILLATION_CURRENT_LINEAR_LOSS_NS_PER_M,
);
assert.deepEqual(getPistonOscillationFreeTriggerThresholdRange(101.325), {
  minimumKpa: 96,
  maximumKpa: 130,
});
assert.deepEqual(getPistonOscillationFreeTriggerThresholdRange(60), {
  minimumKpa: 56.8,
  maximumKpa: 77,
});
assert.deepEqual(getPistonOscillationFreeTriggerThresholdRange(20), {
  minimumKpa: 20,
  maximumKpa: 25.7,
});
assert.deepEqual(getPistonOscillationFreeTriggerThresholdRange(180), {
  minimumKpa: 170.5,
  maximumKpa: 200,
});
assert.equal(
  scalePistonOscillationFreeTriggerThresholdKpa(120, 101.325, 60),
  71.1,
);

const customized = normalizePistonOscillationFreeParameterDraft({
  ...defaults,
  ambientPressureKpa: 98.4,
  ambientTemperatureK: 301.2,
  sampleRateHz: 500,
  triggerThresholdKpa: 118.5,
  equivalentLinearLossNsPerM: 0.8,
  thermalRelaxationTimeS: 0.08,
  heatFlowLagTimeS: 0.0014,
  sensorResponseTimeS: 0.004,
  releaseNeutralGapS: 0.04,
  releaseSaturationGapS: 0.12,
  releaseMaximumExtraLossNsPerM: 2.5,
  releaseAlignmentTimePeriods: 1.4,
  tailOnsetCycles: 4.25,
  tailIntensity: 1.5,
});

const physics = getPistonOscillationFreePhysicsConfig(customized);
assert.equal(physics.ambientPressurePa, 98_400);
assert.equal(physics.ambientTemperatureK, 301.2);
assert.equal(physics.sensorSampleRateHz, 500);
assert.equal(physics.linearDampingNsPerM, 0.8);

const thermal = getPistonOscillationFreeThermalConfig(customized);
assert.equal(thermal.relaxationTimeAtReferenceHeightS, 0.08);
assert.equal(thermal.heatTransferLagTimeS, 0.0014);

const release = getPistonOscillationFreeReleaseAsymmetryConfig(customized);
assert.equal(release.neutralReleaseGapS, 0.04);
assert.equal(release.saturatedReleaseGapS, 0.12);
assert.equal(release.peakExtraLinearLossNsPerM, 2.5);
assert.equal(release.alignmentTimePeriods, 1.4);

const tail = getPistonOscillationFreeTailConfig(customized);
assert.equal(tail.onsetCycle, 4.25);
assert.equal(
  tail.maximumTimeShiftMs,
  PISTON_OSCILLATION_TAIL_IRREGULARITY_OBSERVATION_CONFIG.maximumTimeShiftMs * 1.5,
);
assert.equal(
  tail.maximumShoulderAmplitudeKpa,
  PISTON_OSCILLATION_TAIL_IRREGULARITY_OBSERVATION_CONFIG
    .maximumShoulderAmplitudeKpa * 1.5,
);

const disabledSensor = getPistonOscillationFreeSensorConfig({
  ...customized,
  sensorFluctuationEnabled: false,
});
assert.equal(disabledSensor.fastFluctuationStandardDeviationPa, 0);
assert.equal(disabledSensor.slowFluctuationStandardDeviationPa, 0);
assert.equal(disabledSensor.driftWanderAmplitudePa, 0);
assert.equal(disabledSensor.driftRatePaPerS, 0);
assert.equal(disabledSensor.noiseStandardDeviationPa, 0);
assert.equal(disabledSensor.responseTimeConstantS, customized.sensorResponseTimeS);

const rejected = normalizePistonOscillationFreeParameterDraft({
  ...customized,
  ambientPressureKpa: -1,
  sampleRateHz: 1001,
  triggerThresholdKpa: 120.25,
  releaseSaturationGapS: 0.01,
}, customized);
assert.equal(rejected.ambientPressureKpa, customized.ambientPressureKpa);
assert.equal(rejected.sampleRateHz, customized.sampleRateHz);
assert.equal(rejected.triggerThresholdKpa, customized.triggerThresholdKpa);
assert.equal(rejected.releaseSaturationGapS, customized.releaseSaturationGapS);

const legacyAbsoluteSnapshot = createPistonOscillationFreeParameterSnapshot({
  ...defaults,
  ambientPressureKpa: 60,
  sampleRateHz: 1_000,
  triggerThresholdKpa: 120,
}, 1_000);
assert.equal(
  normalizePistonOscillationFreeParameterSnapshot(legacyAbsoluteSnapshot)
    ?.parameters.triggerThresholdKpa,
  120,
  'locked snapshots must retain their saved absolute trigger threshold',
);

console.log('pistonOscillationFreeParameterConfig tests passed');
