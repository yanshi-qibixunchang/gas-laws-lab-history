import assert from 'node:assert/strict';
import {
  DEFAULT_PISTON_OSCILLATION_DYNAMIC_SENSOR_CONFIG,
  PISTON_OSCILLATION_DYNAMIC_SENSOR_OBSERVATION_MODEL_VERSION,
  PISTON_OSCILLATION_SENSOR_OBSERVATION_MODEL_VERSION,
  PISTON_OSCILLATION_SENSOR_PRESSURE_QUANTIZATION,
  PISTON_OSCILLATION_SENSOR_PRESSURE_RESOLUTION_KPA,
  assertPistonOscillationSensorObservationSeries,
  getPistonOscillationObservedTimeS,
  type PistonOscillationSensorObservationSeries,
} from '../../src/domain/pistonOscillation/pistonOscillationSensorObservationModel.ts';
import {
  createPistonOscillationContinuousObservationSeries,
  createPistonOscillationContinuousRecordingSamples,
} from '../../src/features/pistonOscillation/pistonOscillationContinuousRecordingModel.ts';
import type {
  PistonOscillationLivePressureObservation,
} from '../../src/features/pistonOscillation/pistonOscillationLivePressureChannel.ts';

const SAMPLE_RATE_HZ = 10;

const createSeries = (pressuresKpa: readonly number[]): PistonOscillationSensorObservationSeries => ({
  modelVersion: PISTON_OSCILLATION_SENSOR_OBSERVATION_MODEL_VERSION,
  sampleRateHz: SAMPLE_RATE_HZ,
  pressureResolutionKpa: PISTON_OSCILLATION_SENSOR_PRESSURE_RESOLUTION_KPA,
  pressureQuantization: PISTON_OSCILLATION_SENSOR_PRESSURE_QUANTIZATION,
  samples: pressuresKpa.map((absolutePressureKpa, sampleIndex) => ({
    sampleIndex,
    timeS: getPistonOscillationObservedTimeS(sampleIndex, SAMPLE_RATE_HZ),
    absolutePressureKpa,
  })),
});

const createLiveObservation = (
  sampledAtMs: number,
  absolutePressureKpa: number,
): PistonOscillationLivePressureObservation => ({
  sampleClockIndex: sampledAtMs,
  sampledAtMs,
  physicalPressurePa: absolutePressureKpa * 1_000,
  absolutePressureKpa,
  equilibriumHeightMm: 50,
  displacementMm: 0,
  truePistonHeightMm: 50,
  temperatureK: 293.15,
  thermodynamicPhase: 'sealed-loaded',
  sensorState: {
    modelVersion: PISTON_OSCILLATION_DYNAMIC_SENSOR_OBSERVATION_MODEL_VERSION,
    filteredPressurePa: absolutePressureKpa * 1_000,
    sessionElapsedS: sampledAtMs / 1_000,
    nextNoiseSampleIndex: sampledAtMs,
  },
  sensorConfig: { ...DEFAULT_PISTON_OSCILLATION_DYNAMIC_SENSOR_CONFIG },
});

const firstRelease = createSeries([
  121, 119, 117, 115, 113, 111, 109, 107, 105, 103, 102, 101,
]);
const secondRelease = createSeries([
  130, 116, 110, 106, 103, 101, 100, 101, 101, 101, 101, 101,
]);
const releaseSegments = [
  { startedAtMs: 1_000, observationSeries: firstRelease },
  { startedAtMs: 1_800, observationSeries: secondRelease },
];
const pressStartedAtMs = [1_600];
const liveObservations = [
  createLiveObservation(1_600, 110),
  createLiveObservation(1_700, 125),
  createLiveObservation(1_800, 130),
];

const samples = createPistonOscillationContinuousRecordingSamples({
  durationS: 1.2,
  sampleRateHz: SAMPLE_RATE_HZ,
  recordingStartedAtMs: 1_100,
  releaseSegments,
  pressStartedAtMs,
  liveObservations,
});

assert.equal(samples.length, 13);
assert.equal(samples[0]?.absolutePressureKpa, 119);
assert.equal(samples[4]?.absolutePressureKpa, 111);
assert.equal(samples[5]?.absolutePressureKpa, 110);
assert.equal(samples[6]?.absolutePressureKpa, 125);
assert.equal(samples[7]?.absolutePressureKpa, 130);
assert.equal(samples[8]?.absolutePressureKpa, 116);
assert.deepEqual(
  samples.map((sample) => sample.timeS),
  Array.from({ length: 13 }, (_, sampleIndex) => sampleIndex / SAMPLE_RATE_HZ),
);

const continuousSeries = createPistonOscillationContinuousObservationSeries({
  samples,
  sampleRateHz: SAMPLE_RATE_HZ,
  releaseSegments,
  pressStartedAtMs,
  liveObservations,
});
assert.equal(
  continuousSeries.modelVersion,
  PISTON_OSCILLATION_DYNAMIC_SENSOR_OBSERVATION_MODEL_VERSION,
);
assert.doesNotThrow(() => assertPistonOscillationSensorObservationSeries(continuousSeries));

const stillPressingSamples = createPistonOscillationContinuousRecordingSamples({
  durationS: 0.7,
  sampleRateHz: SAMPLE_RATE_HZ,
  recordingStartedAtMs: 1_100,
  releaseSegments: releaseSegments.slice(0, 1),
  pressStartedAtMs,
  liveObservations: liveObservations.slice(0, 2),
});
assert.equal(stillPressingSamples.at(-1)?.absolutePressureKpa, 125);
