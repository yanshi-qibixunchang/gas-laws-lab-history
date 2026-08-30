import assert from 'node:assert/strict';
import {
  DEFAULT_PISTON_OSCILLATION_DYNAMIC_SENSOR_CONFIG,
  PISTON_OSCILLATION_CORRELATED_FLUCTUATION_MODEL_VERSION,
  PISTON_OSCILLATION_DYNAMIC_SENSOR_CONFIG_VERSION,
  PISTON_OSCILLATION_FORMAL_SAMPLE_RATE_HZ,
  PISTON_OSCILLATION_DYNAMIC_SENSOR_OBSERVATION_MODEL_VERSION,
  PISTON_OSCILLATION_IDEAL_SENSOR_REFERENCE_MODEL_VERSION,
  PISTON_OSCILLATION_LEGACY_DYNAMIC_SENSOR_CONFIG_VERSION,
  PISTON_OSCILLATION_LEGACY_DYNAMIC_SENSOR_OBSERVATION_MODEL_VERSION,
  PISTON_OSCILLATION_SENSOR_PRESSURE_QUANTIZATION,
  PISTON_OSCILLATION_SENSOR_PRESSURE_RESOLUTION_KPA,
  assertPistonOscillationSensorObservationSeries,
  createInitialPistonOscillationDynamicSensorState,
  createPistonOscillationRecordedObservationSamples,
  createPistonOscillationDynamicSensorObservationSeries,
  createPistonOscillationIdealSensorReferenceSeries,
  createPistonOscillationSensorSessionSeed,
  findPistonOscillationObservedFallingTriggerSample,
  formatPistonOscillationObservedPressureKpa,
  formatPistonOscillationObservedTimeS,
  getPistonOscillationObservedTimeS,
  observePistonOscillationDynamicPressure,
  quantizePistonOscillationObservedPressureKpa,
  type PistonOscillationSensorObservationSeries,
} from '../../src/domain/pistonOscillation/pistonOscillationSensorObservationModel.ts';
import {
  simulatePistonOscillationIdealAdiabaticRelease,
} from '../../src/domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';
import {
  createPistonOscillationRawMeasurementRecord,
  normalizePistonOscillationRawMeasurementRecord,
} from '../../src/domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import {
  createPistonOscillationCurrentRecordTestArtifacts,
} from './helpers/pistonOscillationCurrentRecordTestFactory.ts';

assert.equal(PISTON_OSCILLATION_FORMAL_SAMPLE_RATE_HZ, 1_000);
assert.equal(PISTON_OSCILLATION_SENSOR_PRESSURE_RESOLUTION_KPA, 0.01);
assert.equal(PISTON_OSCILLATION_SENSOR_PRESSURE_QUANTIZATION, 'truncate-toward-zero');
assert.equal(
  PISTON_OSCILLATION_IDEAL_SENSOR_REFERENCE_MODEL_VERSION,
  'piston-oscillation-sensor-observation-v1',
);
assert.equal(
  PISTON_OSCILLATION_DYNAMIC_SENSOR_OBSERVATION_MODEL_VERSION,
  'piston-oscillation-sensor-observation-correlated-fluctuation-v3',
);
assert.equal(
  PISTON_OSCILLATION_DYNAMIC_SENSOR_CONFIG_VERSION,
  'piston-oscillation-sensor-candidate-config-v2',
);
assert.equal(
  DEFAULT_PISTON_OSCILLATION_DYNAMIC_SENSOR_CONFIG
    .correlatedFluctuationModelVersion,
  PISTON_OSCILLATION_CORRELATED_FLUCTUATION_MODEL_VERSION,
);
assert.equal(
  DEFAULT_PISTON_OSCILLATION_DYNAMIC_SENSOR_CONFIG.fastFluctuationTimeConstantS,
  0.002,
);
assert.equal(
  DEFAULT_PISTON_OSCILLATION_DYNAMIC_SENSOR_CONFIG.slowFluctuationTimeConstantS,
  0.018,
);
const firstSessionSeed = createPistonOscillationSensorSessionSeed();
const secondSessionSeed = createPistonOscillationSensorSessionSeed();
assert.ok(Number.isSafeInteger(firstSessionSeed));
assert.ok(Number.isSafeInteger(secondSessionSeed));
assert.notEqual(
  firstSessionSeed,
  secondSessionSeed,
  'separate live sensor sessions must not reuse the immediately preceding seed',
);

const stepPhysicalSamples = Array.from({ length: 50 }, (_, sampleIndex) => ({
  pressurePa: sampleIndex < 10 ? 101_325 : 121_325,
}));
const dynamicStep = createPistonOscillationDynamicSensorObservationSeries(
  stepPhysicalSamples,
  1_000,
  {
    config: {
      driftRatePaPerS: 0,
      driftWanderAmplitudePa: 0,
      fastFluctuationStandardDeviationPa: 0,
      slowFluctuationStandardDeviationPa: 0,
      noiseStandardDeviationPa: 0,
    },
  },
);
assert.equal(
  dynamicStep.modelVersion,
  PISTON_OSCILLATION_DYNAMIC_SENSOR_OBSERVATION_MODEL_VERSION,
);
assert.equal(
  dynamicStep.samples[10]?.absolutePressureKpa,
  106.99,
  'the 3 ms first-order response must not jump directly to a pressure step',
);
assert.ok((dynamicStep.samples[20]?.absolutePressureKpa ?? 0) > 120.8);
assert.equal(assertPistonOscillationSensorObservationSeries(dynamicStep), dynamicStep);
assert.equal('pressurePa' in dynamicStep.samples[10]!, false);

const continuedDynamic = createPistonOscillationDynamicSensorObservationSeries(
  Array.from({ length: 1_000 }, () => ({ pressurePa: 101_325 })),
  1_000,
  { initialState: dynamicStep.finalDynamicState },
);
assert.ok(
  (continuedDynamic.finalDynamicState?.sessionElapsedS ?? 0)
    > (dynamicStep.finalDynamicState?.sessionElapsedS ?? 0),
  'drift time must continue across runs inside one sensor session',
);
const seamlessContinuation = createPistonOscillationDynamicSensorObservationSeries(
  [{ pressurePa: 130_000 }, { pressurePa: 130_000 }],
  1_000,
  {
    initialState: dynamicStep.finalDynamicState,
    initialObservedPressureKpa: dynamicStep.samples.at(-1)!.absolutePressureKpa,
  },
);
assert.equal(
  seamlessContinuation.samples[0]?.absolutePressureKpa,
  dynamicStep.samples.at(-1)?.absolutePressureKpa,
  'the release series must begin at the exact live reading without a UI seam',
);
const repeatedDynamic = createPistonOscillationDynamicSensorObservationSeries(
  stepPhysicalSamples,
  1_000,
  {
    config: {
      driftRatePaPerS: 0,
      driftWanderAmplitudePa: 0,
      fastFluctuationStandardDeviationPa: 0,
      slowFluctuationStandardDeviationPa: 0,
      noiseStandardDeviationPa: 0,
    },
  },
);
assert.deepEqual(repeatedDynamic, dynamicStep, 'candidate observation noise must be deterministic');

const getStandardDeviation = (values: readonly number[]) => {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce(
    (sum, value) => sum + (value - mean) ** 2,
    0,
  ) / values.length);
};
const getLagOneCorrelation = (values: readonly number[]) => {
  const left = values.slice(0, -1);
  const right = values.slice(1);
  const leftMean = left.reduce((sum, value) => sum + value, 0) / left.length;
  const rightMean = right.reduce((sum, value) => sum + value, 0) / right.length;
  let covariance = 0;
  let leftVariance = 0;
  let rightVariance = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftDelta = (left[index] ?? 0) - leftMean;
    const rightDelta = (right[index] ?? 0) - rightMean;
    covariance += leftDelta * rightDelta;
    leftVariance += leftDelta * leftDelta;
    rightVariance += rightDelta * rightDelta;
  }
  return covariance / Math.sqrt(leftVariance * rightVariance);
};

let correlatedState: ReturnType<
  typeof createInitialPistonOscillationDynamicSensorState
> | null = null;
const correlatedResidualPa: number[] = [];
for (let sampleIndex = 0; sampleIndex < 4_000; sampleIndex += 1) {
  const observation = observePistonOscillationDynamicPressure({
    physicalPressurePa: 101_325,
    state: correlatedState,
    config: {
      driftRatePaPerS: 0,
      driftWanderAmplitudePa: 0,
      noiseStandardDeviationPa: 0,
      seed: 728_391,
    },
  });
  correlatedState = observation.state;
  correlatedResidualPa.push(
    observation.components.fastFluctuationPa
      + observation.components.slowFluctuationPa,
  );
}
const settledCorrelatedResidualPa = correlatedResidualPa.slice(500);
assert.ok(
  getStandardDeviation(settledCorrelatedResidualPa) > 8,
  'the two correlated components must create a visible but small pressure residual',
);
assert.ok(
  getStandardDeviation(settledCorrelatedResidualPa) < 16,
  'the candidate residual must stay near the intended pascal-scale envelope',
);
assert.ok(
  getLagOneCorrelation(settledCorrelatedResidualPa) > 0.65,
  'neighboring samples must remain correlated instead of becoming white-noise teeth',
);
const correlatedSeries = createPistonOscillationDynamicSensorObservationSeries(
  Array.from({ length: 600 }, () => ({ pressurePa: 101_325 })),
  1_000,
  {
    config: {
      driftRatePaPerS: 0,
      driftWanderAmplitudePa: 0,
      seed: 728_391,
    },
  },
);
const repeatedCorrelatedSeries = createPistonOscillationDynamicSensorObservationSeries(
  Array.from({ length: 600 }, () => ({ pressurePa: 101_325 })),
  1_000,
  {
    config: {
      driftRatePaPerS: 0,
      driftWanderAmplitudePa: 0,
      seed: 728_391,
    },
  },
);
const differentSeedSeries = createPistonOscillationDynamicSensorObservationSeries(
  Array.from({ length: 600 }, () => ({ pressurePa: 101_325 })),
  1_000,
  {
    config: {
      driftRatePaPerS: 0,
      driftWanderAmplitudePa: 0,
      seed: 728_392,
    },
  },
);
assert.deepEqual(
  repeatedCorrelatedSeries,
  correlatedSeries,
  'one saved seed must reproduce the exact correlated observation series',
);
assert.notDeepEqual(
  differentSeedSeries.samples,
  correlatedSeries.samples,
  'a new experiment seed must produce a naturally different observation series',
);

assert.equal(getPistonOscillationObservedTimeS(0), 0);
assert.equal(getPistonOscillationObservedTimeS(10), 0.01);
assert.equal(getPistonOscillationObservedTimeS(193), 0.193);
assert.equal(formatPistonOscillationObservedTimeS(0.01), '0.010');
assert.equal(formatPistonOscillationObservedTimeS(0.193), '0.193');

assert.equal(
  quantizePistonOscillationObservedPressureKpa(102_667.89),
  102.66,
  'pressure must be truncated toward zero instead of rounded',
);
assert.equal(quantizePistonOscillationObservedPressureKpa(93_609.99), 93.6);
assert.equal(quantizePistonOscillationObservedPressureKpa(101_000), 101);
assert.equal(formatPistonOscillationObservedPressureKpa(93.6), '93.60');
assert.equal(formatPistonOscillationObservedPressureKpa(101), '101.00');

const physicalSamples = [
  { timeS: 99, pressurePa: 106_019.9 },
  { timeS: 99, pressurePa: 105_009.9 },
  { timeS: 99, pressurePa: 104_999.9 },
  { timeS: 99, pressurePa: 104_800.8 },
  { timeS: 99, pressurePa: 104_900.1 },
];
const observations = createPistonOscillationIdealSensorReferenceSeries(
  physicalSamples,
  1_000,
);
assert.equal(observations.modelVersion, PISTON_OSCILLATION_IDEAL_SENSOR_REFERENCE_MODEL_VERSION);
assert.deepEqual(
  observations.samples,
  [
    { sampleIndex: 0, timeS: 0, absolutePressureKpa: 106.01 },
    { sampleIndex: 1, timeS: 0.001, absolutePressureKpa: 105 },
    { sampleIndex: 2, timeS: 0.002, absolutePressureKpa: 104.99 },
    { sampleIndex: 3, timeS: 0.003, absolutePressureKpa: 104.8 },
    { sampleIndex: 4, timeS: 0.004, absolutePressureKpa: 104.9 },
  ],
  'formal times must come from sample indices; source physical times must not leak through',
);
assert.equal(assertPistonOscillationSensorObservationSeries(observations), observations);

const physicalTrajectory = simulatePistonOscillationIdealAdiabaticRelease({
  equilibriumHeightMm: 80,
  initialDisplacementMm: -8,
}, {
  sensorSampleRateHz: 1_000,
  trajectoryDurationS: 0.1,
});
const trajectoryObservations = createPistonOscillationIdealSensorReferenceSeries(
  physicalTrajectory.samples,
  physicalTrajectory.sampleRateHz,
);
assert.equal(trajectoryObservations.samples.length, physicalTrajectory.samples.length);
assert.equal(trajectoryObservations.samples[100]?.timeS, 0.1);
assert.equal(
  trajectoryObservations.samples[1]?.absolutePressureKpa,
  quantizePistonOscillationObservedPressureKpa(
    physicalTrajectory.samples[1]!.pressurePa,
  ),
  'the observation boundary may read physical pressure but must only expose its quantized value',
);
assert.equal(
  'pressurePa' in trajectoryObservations.samples[1]!,
  false,
  'formal observations must not retain the hidden high-precision pressure field',
);

const dynamicTrajectoryObservations = createPistonOscillationDynamicSensorObservationSeries(
  physicalTrajectory.samples,
  physicalTrajectory.sampleRateHz,
);
const dynamicRecordArtifacts = createPistonOscillationCurrentRecordTestArtifacts({
  lockedHeightMm: 80,
  sampleRateHz: dynamicTrajectoryObservations.sampleRateHz,
  samples: dynamicTrajectoryObservations.samples,
});
const dynamicRecord = createPistonOscillationRawMeasurementRecord({
  recordId: 'dynamic-sensor-record',
  capturedAtMs: 1,
  measurementIndex: 0,
  targetHeightMm: 80,
  confirmedHeightMm: dynamicRecordArtifacts.confirmedHeightMm,
  sampleRateHz: dynamicTrajectoryObservations.sampleRateHz,
  triggerThresholdKpa: 105,
  recordedDurationS: 0.1,
  recordingPath: 'falling-trigger',
  releaseOffsetS: null,
  samples: dynamicTrajectoryObservations.samples,
  pressOperationEvidence: dynamicRecordArtifacts.pressOperationEvidence,
  sensorObservationSnapshot: dynamicRecordArtifacts.sensorObservationSnapshot,
  physicsSnapshot: dynamicRecordArtifacts.physicsSnapshot,
});
assert.equal(dynamicRecord.sensorObservationSnapshot.schemaVersion, 3);
assert.equal(
  dynamicRecord.sensorObservationSnapshot.modelVersion,
  PISTON_OSCILLATION_DYNAMIC_SENSOR_OBSERVATION_MODEL_VERSION,
);
const normalizedDynamicRecord = normalizePistonOscillationRawMeasurementRecord(
  structuredClone(dynamicRecord),
);
assert.ok(normalizedDynamicRecord);
assert.deepEqual(normalizedDynamicRecord?.samples, dynamicRecord.samples);
assert.deepEqual(
  normalizedDynamicRecord?.sensorObservationSnapshot.dynamicConfig,
  dynamicRecord.sensorObservationSnapshot.dynamicConfig,
);

const currentFinalSensorState = dynamicRecord.sensorObservationSnapshot.finalDynamicState;
assert.ok(currentFinalSensorState);
const legacyDynamicRecord = {
  ...structuredClone(dynamicRecord),
  sensorObservationSnapshot: {
    ...structuredClone(dynamicRecord.sensorObservationSnapshot),
    schemaVersion: 2,
    modelVersion: PISTON_OSCILLATION_LEGACY_DYNAMIC_SENSOR_OBSERVATION_MODEL_VERSION,
    dynamicConfig: {
      modelVersion: PISTON_OSCILLATION_LEGACY_DYNAMIC_SENSOR_CONFIG_VERSION,
      responseTimeConstantS: 0.003,
      driftRatePaPerS: 0.2,
      driftWanderAmplitudePa: 8,
      driftWanderPeriodS: 180,
      noiseStandardDeviationPa: 4,
      seed: 1_597_334_677,
      provenance: 'educational-candidate',
    },
    initialDynamicState: null,
    finalDynamicState: {
      modelVersion:
        PISTON_OSCILLATION_LEGACY_DYNAMIC_SENSOR_OBSERVATION_MODEL_VERSION,
      filteredPressurePa: currentFinalSensorState!.filteredPressurePa,
      sessionElapsedS: currentFinalSensorState!.sessionElapsedS,
      nextNoiseSampleIndex: currentFinalSensorState!.nextNoiseSampleIndex,
    },
  },
};
const normalizedLegacyDynamicRecord = normalizePistonOscillationRawMeasurementRecord(
  legacyDynamicRecord,
);
assert.ok(normalizedLegacyDynamicRecord, 'existing v2 sensor records must remain readable');
assert.equal(normalizedLegacyDynamicRecord?.sensorObservationSnapshot.schemaVersion, 2);
assert.equal(
  normalizedLegacyDynamicRecord?.sensorObservationSnapshot.modelVersion,
  PISTON_OSCILLATION_LEGACY_DYNAMIC_SENSOR_OBSERVATION_MODEL_VERSION,
);
assert.deepEqual(
  normalizedLegacyDynamicRecord?.samples,
  dynamicRecord.samples,
  'upgrading the app must not regenerate or reinterpret saved v2 samples',
);

const freshSeamState = createInitialPistonOscillationDynamicSensorState(101_000);
const freshSeamSeries = createPistonOscillationDynamicSensorObservationSeries(
  [{ pressurePa: 101_000 }],
  1_000,
  {
    initialState: freshSeamState,
    initialObservedPressureKpa: 101,
  },
);
assert.equal(
  assertPistonOscillationSensorObservationSeries(freshSeamSeries),
  freshSeamSeries,
  'a reused seam sample may preserve the incoming sensor state without inventing a tick',
);

const fallingTrigger = findPistonOscillationObservedFallingTriggerSample(
  observations,
  105,
);
assert.deepEqual(
  fallingTrigger,
  { sampleIndex: 2, timeS: 0.002, absolutePressureKpa: 104.99 },
  'trigger must be the first below-threshold discrete observation, not an interpolated crossing',
);
assert.equal(
  findPistonOscillationObservedFallingTriggerSample(observations, 104),
  null,
);

const recording = createPistonOscillationRecordedObservationSamples(
  observations,
  fallingTrigger!.sampleIndex,
  0.002,
);
assert.deepEqual(recording, [
  { sampleIndex: 0, timeS: 0, absolutePressureKpa: 104.99 },
  { sampleIndex: 1, timeS: 0.001, absolutePressureKpa: 104.8 },
  { sampleIndex: 2, timeS: 0.002, absolutePressureKpa: 104.9 },
]);

assert.throws(
  () => getPistonOscillationObservedTimeS(-1),
  /sampleIndex/,
);
assert.throws(
  () => getPistonOscillationObservedTimeS(1, 0),
  /sampleRateHz/,
);
assert.throws(
  () => quantizePistonOscillationObservedPressureKpa(Number.NaN),
  /pressurePa/,
);
assert.throws(
  () => createPistonOscillationIdealSensorReferenceSeries([], 1_000),
  /at least one sample/,
);
assert.throws(
  () => createPistonOscillationIdealSensorReferenceSeries(
    Array.from({ length: 2 }, (_, index) => (
      index === 0 ? { pressurePa: 101_000 } : undefined
    )) as unknown as Array<{ pressurePa: number }>,
  ),
  /physicalSamples\[1\] is missing/,
);

const invalidTimeGrid = structuredClone(observations) as PistonOscillationSensorObservationSeries;
invalidTimeGrid.samples[2]!.timeS = 0.0025;
assert.throws(
  () => assertPistonOscillationSensorObservationSeries(invalidTimeGrid),
  /sample-time grid/,
);

const missingSample = structuredClone(observations) as PistonOscillationSensorObservationSeries;
missingSample.samples[2]!.sampleIndex = 3;
assert.throws(
  () => assertPistonOscillationSensorObservationSeries(missingSample),
  /sample index/,
);

const invalidPressureGrid = structuredClone(observations) as PistonOscillationSensorObservationSeries;
invalidPressureGrid.samples[2]!.absolutePressureKpa = 104.991;
assert.throws(
  () => assertPistonOscillationSensorObservationSeries(invalidPressureGrid),
  /pressure grid/,
);

assert.throws(
  () => createPistonOscillationRecordedObservationSamples(observations, 2, 0.003),
  /does not contain the requested recording window/,
);
assert.throws(
  () => createPistonOscillationRecordedObservationSamples(observations, 1, 0.0025),
  /recordedDurationS must lie on the sample-time grid/,
);

console.log('pistonOscillationSensorObservationModel tests passed');
