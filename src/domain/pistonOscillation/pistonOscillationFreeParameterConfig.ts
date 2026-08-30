import type {
  PistonOscillationRawMeasurementRecord,
} from './pistonOscillationDataProcessingModel.ts';
import {
  PISTON_OSCILLATION_CURRENT_LINEAR_LOSS_NS_PER_M,
} from './pistonOscillationEquivalentLossModel.ts';
import {
  DEFAULT_PISTON_OSCILLATION_PHYSICS_CONFIG,
  normalizePistonOscillationPhysicsConfig,
  type PistonOscillationPhysicsConfig,
} from './pistonOscillationPhysicsEngine.ts';
import {
  DEFAULT_PISTON_OSCILLATION_RELEASE_ASYMMETRY_CONFIG,
  normalizePistonOscillationReleaseAsymmetryConfig,
  type PistonOscillationReleaseAsymmetryConfig,
} from './pistonOscillationReleaseAsymmetryModel.ts';
import {
  DEFAULT_PISTON_OSCILLATION_DYNAMIC_SENSOR_CONFIG,
  normalizePistonOscillationDynamicSensorConfig,
  type PistonOscillationDynamicSensorConfig,
} from './pistonOscillationSensorObservationModel.ts';
import {
  PISTON_OSCILLATION_TAIL_IRREGULARITY_OBSERVATION_CONFIG,
  type PistonOscillationTailIrregularityObservationConfig,
} from './pistonOscillationTailIrregularityObservationModel.ts';
import {
  DEFAULT_PISTON_OSCILLATION_THERMAL_MODEL_CONFIG,
  normalizePistonOscillationThermalModelConfig,
  type PistonOscillationThermalModelConfig,
} from './pistonOscillationThermalPhysicsModel.ts';

export const PISTON_OSCILLATION_FREE_PARAMETER_SNAPSHOT_SCHEMA_VERSION = 1 as const;

export interface PistonOscillationFreeParameterDraft {
  ambientPressureKpa: number;
  ambientTemperatureK: number;
  sampleRateHz: number | null;
  triggerThresholdKpa: number | null;
  sensorFluctuationEnabled: boolean;
  tailIrregularityEnabled: boolean;
  equivalentLinearLossNsPerM: number;
  thermalRelaxationTimeS: number;
  heatFlowLagTimeS: number;
  sensorResponseTimeS: number;
  fastFluctuationStandardDeviationPa: number;
  slowFluctuationStandardDeviationPa: number;
  driftWanderAmplitudePa: number;
  driftRatePaPerS: number;
  releaseNeutralGapS: number;
  releaseSaturationGapS: number;
  releaseMaximumExtraLossNsPerM: number;
  releaseAlignmentTimePeriods: number;
  tailOnsetCycles: number;
  tailIntensity: number;
}

export interface PistonOscillationFreeParameterSnapshot {
  schemaVersion: typeof PISTON_OSCILLATION_FREE_PARAMETER_SNAPSHOT_SCHEMA_VERSION;
  frozenAtMs: number;
  parameters: PistonOscillationFreeParameterDraft;
}

export const PISTON_OSCILLATION_FREE_PARAMETER_RANGES = Object.freeze({
  ambientPressureKpa: { minimum: 20, maximum: 200 },
  ambientTemperatureK: { minimum: 150, maximum: 400 },
  sampleRateHz: { minimum: 1, maximum: 1_000 },
  triggerThresholdKpa: { minimum: 96, maximum: 130 },
  equivalentLinearLossNsPerM: { minimum: 0, maximum: 10 },
  thermalRelaxationTimeS: { minimum: 0.001, maximum: 5 },
  heatFlowLagTimeS: { minimum: 0.0005, maximum: 0.05 },
  sensorResponseTimeS: { minimum: 0.0001, maximum: 1 },
  fluctuationStandardDeviationPa: { minimum: 0, maximum: 1_000 },
  driftWanderAmplitudePa: { minimum: 0, maximum: 1_000 },
  driftRatePaPerS: { minimum: -100, maximum: 100 },
  releaseGapS: { minimum: 0, maximum: 10 },
  releaseMaximumExtraLossNsPerM: { minimum: 0, maximum: 100 },
  releaseAlignmentTimePeriods: { minimum: 0.05, maximum: 10 },
  tailOnsetCycles: { minimum: 0, maximum: 20 },
  tailIntensity: { minimum: 0, maximum: 3 },
});

const isPlainRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isFiniteInRange = (
  value: unknown,
  minimum: number,
  maximum: number,
): value is number => (
  typeof value === 'number'
  && Number.isFinite(value)
  && value >= minimum
  && value <= maximum
);

const readNumber = (
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
) => isFiniteInRange(value, minimum, maximum) ? value : fallback;

const readNullableSampleRate = (value: unknown) => (
  Number.isSafeInteger(value)
  && (value as number) >= PISTON_OSCILLATION_FREE_PARAMETER_RANGES.sampleRateHz.minimum
  && (value as number) <= PISTON_OSCILLATION_FREE_PARAMETER_RANGES.sampleRateHz.maximum
    ? value as number
    : null
);

const readNullableTriggerThreshold = (value: unknown) => (
  isFiniteInRange(
    value,
    PISTON_OSCILLATION_FREE_PARAMETER_RANGES.triggerThresholdKpa.minimum,
    PISTON_OSCILLATION_FREE_PARAMETER_RANGES.triggerThresholdKpa.maximum,
  )
  && Number.isSafeInteger(Math.round(value * 10))
  && Math.abs(value * 10 - Math.round(value * 10)) < 1e-8
    ? value
    : null
);

export const createDefaultPistonOscillationFreeParameterDraft = ():
PistonOscillationFreeParameterDraft => ({
  ambientPressureKpa: DEFAULT_PISTON_OSCILLATION_PHYSICS_CONFIG.ambientPressurePa / 1_000,
  ambientTemperatureK: DEFAULT_PISTON_OSCILLATION_PHYSICS_CONFIG.ambientTemperatureK,
  sampleRateHz: null,
  triggerThresholdKpa: null,
  sensorFluctuationEnabled: true,
  tailIrregularityEnabled: true,
  equivalentLinearLossNsPerM: PISTON_OSCILLATION_CURRENT_LINEAR_LOSS_NS_PER_M,
  thermalRelaxationTimeS:
    DEFAULT_PISTON_OSCILLATION_THERMAL_MODEL_CONFIG.relaxationTimeAtReferenceHeightS,
  heatFlowLagTimeS: DEFAULT_PISTON_OSCILLATION_THERMAL_MODEL_CONFIG.heatTransferLagTimeS,
  sensorResponseTimeS: DEFAULT_PISTON_OSCILLATION_DYNAMIC_SENSOR_CONFIG.responseTimeConstantS,
  fastFluctuationStandardDeviationPa:
    DEFAULT_PISTON_OSCILLATION_DYNAMIC_SENSOR_CONFIG.fastFluctuationStandardDeviationPa,
  slowFluctuationStandardDeviationPa:
    DEFAULT_PISTON_OSCILLATION_DYNAMIC_SENSOR_CONFIG.slowFluctuationStandardDeviationPa,
  driftWanderAmplitudePa:
    DEFAULT_PISTON_OSCILLATION_DYNAMIC_SENSOR_CONFIG.driftWanderAmplitudePa,
  driftRatePaPerS: DEFAULT_PISTON_OSCILLATION_DYNAMIC_SENSOR_CONFIG.driftRatePaPerS,
  releaseNeutralGapS:
    DEFAULT_PISTON_OSCILLATION_RELEASE_ASYMMETRY_CONFIG.neutralReleaseGapS,
  releaseSaturationGapS:
    DEFAULT_PISTON_OSCILLATION_RELEASE_ASYMMETRY_CONFIG.saturatedReleaseGapS,
  releaseMaximumExtraLossNsPerM:
    DEFAULT_PISTON_OSCILLATION_RELEASE_ASYMMETRY_CONFIG.peakExtraLinearLossNsPerM,
  releaseAlignmentTimePeriods:
    DEFAULT_PISTON_OSCILLATION_RELEASE_ASYMMETRY_CONFIG.alignmentTimePeriods,
  tailOnsetCycles: PISTON_OSCILLATION_TAIL_IRREGULARITY_OBSERVATION_CONFIG.onsetCycle,
  tailIntensity: 1,
});

export const normalizePistonOscillationFreeParameterDraft = (
  value: unknown,
  fallbackInput: PistonOscillationFreeParameterDraft =
    createDefaultPistonOscillationFreeParameterDraft(),
): PistonOscillationFreeParameterDraft => {
  const valueRecord = isPlainRecord(value) ? value : {};
  const ranges = PISTON_OSCILLATION_FREE_PARAMETER_RANGES;
  const releaseNeutralGapS = readNumber(
    valueRecord.releaseNeutralGapS,
    fallbackInput.releaseNeutralGapS,
    ranges.releaseGapS.minimum,
    ranges.releaseGapS.maximum,
  );
  const releaseSaturationGapS = readNumber(
    valueRecord.releaseSaturationGapS,
    fallbackInput.releaseSaturationGapS,
    Math.max(Number.MIN_VALUE, releaseNeutralGapS + 1e-6),
    ranges.releaseGapS.maximum,
  );
  return {
    ambientPressureKpa: readNumber(
      valueRecord.ambientPressureKpa,
      fallbackInput.ambientPressureKpa,
      ranges.ambientPressureKpa.minimum,
      ranges.ambientPressureKpa.maximum,
    ),
    ambientTemperatureK: readNumber(
      valueRecord.ambientTemperatureK,
      fallbackInput.ambientTemperatureK,
      ranges.ambientTemperatureK.minimum,
      ranges.ambientTemperatureK.maximum,
    ),
    sampleRateHz: valueRecord.sampleRateHz === null
      ? null
      : readNullableSampleRate(valueRecord.sampleRateHz) ?? fallbackInput.sampleRateHz,
    triggerThresholdKpa: valueRecord.triggerThresholdKpa === null
      ? null
      : readNullableTriggerThreshold(valueRecord.triggerThresholdKpa)
        ?? fallbackInput.triggerThresholdKpa,
    sensorFluctuationEnabled: typeof valueRecord.sensorFluctuationEnabled === 'boolean'
      ? valueRecord.sensorFluctuationEnabled
      : fallbackInput.sensorFluctuationEnabled,
    tailIrregularityEnabled: typeof valueRecord.tailIrregularityEnabled === 'boolean'
      ? valueRecord.tailIrregularityEnabled
      : fallbackInput.tailIrregularityEnabled,
    equivalentLinearLossNsPerM: readNumber(
      valueRecord.equivalentLinearLossNsPerM,
      fallbackInput.equivalentLinearLossNsPerM,
      ranges.equivalentLinearLossNsPerM.minimum,
      ranges.equivalentLinearLossNsPerM.maximum,
    ),
    thermalRelaxationTimeS: readNumber(
      valueRecord.thermalRelaxationTimeS,
      fallbackInput.thermalRelaxationTimeS,
      ranges.thermalRelaxationTimeS.minimum,
      ranges.thermalRelaxationTimeS.maximum,
    ),
    heatFlowLagTimeS: readNumber(
      valueRecord.heatFlowLagTimeS,
      fallbackInput.heatFlowLagTimeS,
      ranges.heatFlowLagTimeS.minimum,
      ranges.heatFlowLagTimeS.maximum,
    ),
    sensorResponseTimeS: readNumber(
      valueRecord.sensorResponseTimeS,
      fallbackInput.sensorResponseTimeS,
      ranges.sensorResponseTimeS.minimum,
      ranges.sensorResponseTimeS.maximum,
    ),
    fastFluctuationStandardDeviationPa: readNumber(
      valueRecord.fastFluctuationStandardDeviationPa,
      fallbackInput.fastFluctuationStandardDeviationPa,
      ranges.fluctuationStandardDeviationPa.minimum,
      ranges.fluctuationStandardDeviationPa.maximum,
    ),
    slowFluctuationStandardDeviationPa: readNumber(
      valueRecord.slowFluctuationStandardDeviationPa,
      fallbackInput.slowFluctuationStandardDeviationPa,
      ranges.fluctuationStandardDeviationPa.minimum,
      ranges.fluctuationStandardDeviationPa.maximum,
    ),
    driftWanderAmplitudePa: readNumber(
      valueRecord.driftWanderAmplitudePa,
      fallbackInput.driftWanderAmplitudePa,
      ranges.driftWanderAmplitudePa.minimum,
      ranges.driftWanderAmplitudePa.maximum,
    ),
    driftRatePaPerS: readNumber(
      valueRecord.driftRatePaPerS,
      fallbackInput.driftRatePaPerS,
      ranges.driftRatePaPerS.minimum,
      ranges.driftRatePaPerS.maximum,
    ),
    releaseNeutralGapS,
    releaseSaturationGapS,
    releaseMaximumExtraLossNsPerM: readNumber(
      valueRecord.releaseMaximumExtraLossNsPerM,
      fallbackInput.releaseMaximumExtraLossNsPerM,
      ranges.releaseMaximumExtraLossNsPerM.minimum,
      ranges.releaseMaximumExtraLossNsPerM.maximum,
    ),
    releaseAlignmentTimePeriods: readNumber(
      valueRecord.releaseAlignmentTimePeriods,
      fallbackInput.releaseAlignmentTimePeriods,
      ranges.releaseAlignmentTimePeriods.minimum,
      ranges.releaseAlignmentTimePeriods.maximum,
    ),
    tailOnsetCycles: readNumber(
      valueRecord.tailOnsetCycles,
      fallbackInput.tailOnsetCycles,
      ranges.tailOnsetCycles.minimum,
      ranges.tailOnsetCycles.maximum,
    ),
    tailIntensity: readNumber(
      valueRecord.tailIntensity,
      fallbackInput.tailIntensity,
      ranges.tailIntensity.minimum,
      ranges.tailIntensity.maximum,
    ),
  };
};

export const createPistonOscillationFreeParameterSnapshot = (
  parameters: PistonOscillationFreeParameterDraft,
  frozenAtMs: number,
): PistonOscillationFreeParameterSnapshot => ({
  schemaVersion: PISTON_OSCILLATION_FREE_PARAMETER_SNAPSHOT_SCHEMA_VERSION,
  frozenAtMs,
  parameters: normalizePistonOscillationFreeParameterDraft(parameters),
});

export const normalizePistonOscillationFreeParameterSnapshot = (
  value: unknown,
): PistonOscillationFreeParameterSnapshot | null => {
  if (!isPlainRecord(value)
    || value.schemaVersion !== PISTON_OSCILLATION_FREE_PARAMETER_SNAPSHOT_SCHEMA_VERSION
    || typeof value.frozenAtMs !== 'number'
    || !Number.isFinite(value.frozenAtMs)
    || value.frozenAtMs < 0
    || !isPlainRecord(value.parameters)) return null;
  return createPistonOscillationFreeParameterSnapshot(
    normalizePistonOscillationFreeParameterDraft(value.parameters),
    value.frozenAtMs,
  );
};

export const getPistonOscillationFreePhysicsConfig = (
  draft: PistonOscillationFreeParameterDraft,
): PistonOscillationPhysicsConfig => normalizePistonOscillationPhysicsConfig({
  ambientPressurePa: draft.ambientPressureKpa * 1_000,
  ambientTemperatureK: draft.ambientTemperatureK,
  linearDampingNsPerM: draft.equivalentLinearLossNsPerM,
  sensorSampleRateHz: draft.sampleRateHz ?? 1_000,
});

export const getPistonOscillationFreeThermalConfig = (
  draft: PistonOscillationFreeParameterDraft,
): PistonOscillationThermalModelConfig => normalizePistonOscillationThermalModelConfig({
  relaxationTimeAtReferenceHeightS: draft.thermalRelaxationTimeS,
  heatTransferLagTimeS: draft.heatFlowLagTimeS,
});

export const getPistonOscillationFreeSensorConfig = (
  draft: PistonOscillationFreeParameterDraft,
  seed?: number,
): PistonOscillationDynamicSensorConfig => normalizePistonOscillationDynamicSensorConfig({
  responseTimeConstantS: draft.sensorResponseTimeS,
  driftRatePaPerS: draft.sensorFluctuationEnabled ? draft.driftRatePaPerS : 0,
  driftWanderAmplitudePa: draft.sensorFluctuationEnabled
    ? draft.driftWanderAmplitudePa
    : 0,
  fastFluctuationStandardDeviationPa: draft.sensorFluctuationEnabled
    ? draft.fastFluctuationStandardDeviationPa
    : 0,
  slowFluctuationStandardDeviationPa: draft.sensorFluctuationEnabled
    ? draft.slowFluctuationStandardDeviationPa
    : 0,
  noiseStandardDeviationPa: draft.sensorFluctuationEnabled
    ? DEFAULT_PISTON_OSCILLATION_DYNAMIC_SENSOR_CONFIG.noiseStandardDeviationPa
    : 0,
  seed,
});

export const getPistonOscillationFreeReleaseAsymmetryConfig = (
  draft: PistonOscillationFreeParameterDraft,
): PistonOscillationReleaseAsymmetryConfig => normalizePistonOscillationReleaseAsymmetryConfig({
  neutralReleaseGapS: draft.releaseNeutralGapS,
  saturatedReleaseGapS: draft.releaseSaturationGapS,
  peakExtraLinearLossNsPerM: draft.releaseMaximumExtraLossNsPerM,
  alignmentTimePeriods: draft.releaseAlignmentTimePeriods,
});

export const getPistonOscillationFreeTailConfig = (
  draft: PistonOscillationFreeParameterDraft,
): Partial<PistonOscillationTailIrregularityObservationConfig> => {
  const defaults = PISTON_OSCILLATION_TAIL_IRREGULARITY_OBSERVATION_CONFIG;
  return {
    onsetCycle: draft.tailOnsetCycles,
    minimumTimeShiftMs: defaults.minimumTimeShiftMs * draft.tailIntensity,
    maximumTimeShiftMs: defaults.maximumTimeShiftMs * draft.tailIntensity,
    minimumShoulderAmplitudeKpa:
      defaults.minimumShoulderAmplitudeKpa * draft.tailIntensity,
    maximumShoulderAmplitudeKpa:
      defaults.maximumShoulderAmplitudeKpa * draft.tailIntensity,
  };
};

export const createPistonOscillationFreeParameterDraftFromMeasurement = (
  measurement: PistonOscillationRawMeasurementRecord,
): PistonOscillationFreeParameterDraft => {
  const defaults = createDefaultPistonOscillationFreeParameterDraft();
  const config = measurement.physicsSnapshot.config;
  const thermal = measurement.physicsSnapshot.thermalModel;
  const sensor = measurement.sensorObservationSnapshot.dynamicConfig;
  const currentSensor = sensor?.modelVersion
    === DEFAULT_PISTON_OSCILLATION_DYNAMIC_SENSOR_CONFIG.modelVersion
    ? sensor
    : null;
  return normalizePistonOscillationFreeParameterDraft({
    ...defaults,
    ambientPressureKpa: config.ambientPressurePa / 1_000,
    ambientTemperatureK: config.ambientTemperatureK,
    sampleRateHz: measurement.acquisitionSettings.sampleRateHz,
    triggerThresholdKpa: measurement.acquisitionSettings.triggerThresholdKpa,
    equivalentLinearLossNsPerM: config.linearDampingNsPerM,
    thermalRelaxationTimeS:
      thermal?.relaxationTimeAtReferenceHeightS ?? defaults.thermalRelaxationTimeS,
    heatFlowLagTimeS: thermal?.enabled && 'heatTransferLagTimeS' in thermal
      ? thermal.heatTransferLagTimeS
      : defaults.heatFlowLagTimeS,
    sensorResponseTimeS: sensor?.responseTimeConstantS ?? defaults.sensorResponseTimeS,
    sensorFluctuationEnabled: Boolean(sensor && (
      sensor.driftRatePaPerS !== 0
      || sensor.driftWanderAmplitudePa !== 0
      || sensor.noiseStandardDeviationPa !== 0
      || (currentSensor?.fastFluctuationStandardDeviationPa ?? 0) !== 0
      || (currentSensor?.slowFluctuationStandardDeviationPa ?? 0) !== 0
    )),
    fastFluctuationStandardDeviationPa:
      currentSensor?.fastFluctuationStandardDeviationPa
        ?? defaults.fastFluctuationStandardDeviationPa,
    slowFluctuationStandardDeviationPa:
      currentSensor?.slowFluctuationStandardDeviationPa
        ?? defaults.slowFluctuationStandardDeviationPa,
    driftWanderAmplitudePa:
      sensor?.driftWanderAmplitudePa ?? defaults.driftWanderAmplitudePa,
    driftRatePaPerS: sensor?.driftRatePaPerS ?? defaults.driftRatePaPerS,
  });
};

const numbersAgree = (first: number, second: number) => (
  Math.abs(first - second)
    <= Math.max(1e-10, Number.EPSILON * Math.max(1, Math.abs(first), Math.abs(second)) * 64)
);

export const doesPistonOscillationMeasurementMatchFreeParameters = (
  measurement: PistonOscillationRawMeasurementRecord,
  draft: PistonOscillationFreeParameterDraft,
) => {
  const config = measurement.physicsSnapshot.config;
  const thermal = measurement.physicsSnapshot.thermalModel;
  return measurement.acquisitionSettings.sampleRateHz === draft.sampleRateHz
    && measurement.acquisitionSettings.triggerThresholdKpa === draft.triggerThresholdKpa
    && numbersAgree(config.ambientPressurePa, draft.ambientPressureKpa * 1_000)
    && numbersAgree(config.ambientTemperatureK, draft.ambientTemperatureK)
    && numbersAgree(config.linearDampingNsPerM, draft.equivalentLinearLossNsPerM)
    && Boolean(thermal)
    && numbersAgree(
      thermal?.relaxationTimeAtReferenceHeightS ?? Number.NaN,
      draft.thermalRelaxationTimeS,
    )
    && numbersAgree(
      thermal?.enabled && 'heatTransferLagTimeS' in thermal
        ? thermal.heatTransferLagTimeS
        : Number.NaN,
      draft.heatFlowLagTimeS,
    );
};
