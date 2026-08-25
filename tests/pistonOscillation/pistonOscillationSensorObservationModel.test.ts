import assert from 'node:assert/strict';
import {
  PISTON_OSCILLATION_FORMAL_SAMPLE_RATE_HZ,
  PISTON_OSCILLATION_SENSOR_OBSERVATION_MODEL_VERSION,
  PISTON_OSCILLATION_SENSOR_PRESSURE_QUANTIZATION,
  PISTON_OSCILLATION_SENSOR_PRESSURE_RESOLUTION_KPA,
  assertPistonOscillationSensorObservationSeries,
  createPistonOscillationRecordedObservationSamples,
  createPistonOscillationSensorObservationSeries,
  findPistonOscillationObservedFallingTriggerSample,
  formatPistonOscillationObservedPressureKpa,
  formatPistonOscillationObservedTimeS,
  getPistonOscillationObservedTimeS,
  quantizePistonOscillationObservedPressureKpa,
  type PistonOscillationSensorObservationSeries,
} from '../../src/domain/pistonOscillation/pistonOscillationSensorObservationModel.ts';
import {
  simulatePistonOscillationRelease,
} from '../../src/domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';

assert.equal(PISTON_OSCILLATION_FORMAL_SAMPLE_RATE_HZ, 1_000);
assert.equal(PISTON_OSCILLATION_SENSOR_PRESSURE_RESOLUTION_KPA, 0.01);
assert.equal(PISTON_OSCILLATION_SENSOR_PRESSURE_QUANTIZATION, 'truncate-toward-zero');
assert.equal(
  PISTON_OSCILLATION_SENSOR_OBSERVATION_MODEL_VERSION,
  'piston-oscillation-sensor-observation-v1',
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
const observations = createPistonOscillationSensorObservationSeries(
  physicalSamples,
  1_000,
);
assert.equal(observations.modelVersion, PISTON_OSCILLATION_SENSOR_OBSERVATION_MODEL_VERSION);
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

const physicalTrajectory = simulatePistonOscillationRelease({
  equilibriumHeightMm: 80,
  initialDisplacementMm: -8,
}, {
  sensorSampleRateHz: 1_000,
  trajectoryDurationS: 0.1,
});
const trajectoryObservations = createPistonOscillationSensorObservationSeries(
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
  () => createPistonOscillationSensorObservationSeries([], 1_000),
  /at least one sample/,
);
assert.throws(
  () => createPistonOscillationSensorObservationSeries(
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
