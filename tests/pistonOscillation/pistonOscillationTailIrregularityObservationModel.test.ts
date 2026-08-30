import assert from 'node:assert/strict';

import {
  createPistonOscillationRawMeasurementRecord,
  normalizePistonOscillationRawMeasurementRecord,
} from '../../src/domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import {
  getPistonOscillationSmallSignalFrequencyFromLockedHeightHz,
  simulatePistonOscillationIdealAdiabaticRelease,
} from '../../src/domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';
import {
  assertPistonOscillationSensorObservationSeries,
  createPistonOscillationDynamicSensorObservationSeries,
} from '../../src/domain/pistonOscillation/pistonOscillationSensorObservationModel.ts';
import {
  PISTON_OSCILLATION_TAIL_IRREGULARITY_OBSERVATION_CONFIG,
  PISTON_OSCILLATION_TAIL_IRREGULARITY_OBSERVATION_MODEL_VERSION,
  applyPistonOscillationTailIrregularityObservation,
} from '../../src/domain/pistonOscillation/pistonOscillationTailIrregularityObservationModel.ts';
import {
  createPistonOscillationCurrentRecordTestArtifacts,
} from './helpers/pistonOscillationCurrentRecordTestFactory.ts';

const trajectory = simulatePistonOscillationIdealAdiabaticRelease({
  lockedHeightMm: 80,
  initialDisplacementMm: -8,
}, {
  sensorSampleRateHz: 1_000,
  trajectoryDurationS: 0.5,
});
const baseSeries = createPistonOscillationDynamicSensorObservationSeries(
  trajectory.samples,
  trajectory.sampleRateHz,
  { config: { seed: 728_391 } },
);
const expectedPeriodS = 1
  / getPistonOscillationSmallSignalFrequencyFromLockedHeightHz(
    80,
    trajectory.config,
  );
const first = applyPistonOscillationTailIrregularityObservation({
  observationSeries: baseSeries,
  expectedPeriodS,
  seed: 19_937,
});
const repeated = applyPistonOscillationTailIrregularityObservation({
  observationSeries: baseSeries,
  expectedPeriodS,
  seed: 19_937,
});
const different = applyPistonOscillationTailIrregularityObservation({
  observationSeries: baseSeries,
  expectedPeriodS,
  seed: 19_938,
});

assert.equal(
  first.modelVersion,
  PISTON_OSCILLATION_TAIL_IRREGULARITY_OBSERVATION_MODEL_VERSION,
);
assert.ok(
  first.events.length >= PISTON_OSCILLATION_TAIL_IRREGULARITY_OBSERVATION_CONFIG
    .minimumEventCount,
);
assert.ok(
  first.events.length <= PISTON_OSCILLATION_TAIL_IRREGULARITY_OBSERVATION_CONFIG
    .maximumEventCount,
);
assert.deepEqual(first, repeated, 'one saved seed must replay the same tail shape');
assert.notDeepEqual(
  first.observationSeries.samples,
  different.observationSeries.samples,
  'a different experiment seed must create a naturally different tail shape',
);
assert.equal(first.observationSeries.sampleRateHz, baseSeries.sampleRateHz);
assert.equal(first.observationSeries.samples.length, baseSeries.samples.length);
assert.equal(
  assertPistonOscillationSensorObservationSeries(first.observationSeries),
  first.observationSeries,
);

const earliestWindowStartS = Math.min(...first.events.map((event) => (
  event.centerTimeS - expectedPeriodS / 2 * 0.28
)));
const firstAffectedSampleIndex = Math.max(
  0,
  Math.floor(earliestWindowStartS * baseSeries.sampleRateHz),
);
assert.deepEqual(
  first.observationSeries.samples.slice(0, firstAffectedSampleIndex),
  baseSeries.samples.slice(0, firstAffectedSampleIndex),
  'the trigger and early cycles must remain byte-for-byte unchanged',
);
assert.deepEqual(
  first.observationSeries.samples.slice(-50),
  baseSeries.samples.slice(-50),
  'the compact tail events must not leave a final baseline offset',
);
const changedSamples = first.observationSeries.samples.filter((sample, index) => (
  sample.absolutePressureKpa
    !== baseSeries.samples[index]?.absolutePressureKpa
));
assert.ok(changedSamples.length > 0, 'the accepted observation model must alter the visible tail');
assert.ok(changedSamples.every((sample) => (
  sample.timeS > PISTON_OSCILLATION_TAIL_IRREGULARITY_OBSERVATION_CONFIG
    .onsetCycle * expectedPeriodS - expectedPeriodS
)));

const artifacts = createPistonOscillationCurrentRecordTestArtifacts({
  lockedHeightMm: 80,
  sampleRateHz: first.observationSeries.sampleRateHz,
  samples: first.observationSeries.samples,
});
const record = createPistonOscillationRawMeasurementRecord({
  recordId: 'tail-irregularity-observation-record',
  capturedAtMs: 1,
  measurementIndex: 0,
  targetHeightMm: 80,
  confirmedHeightMm: artifacts.confirmedHeightMm,
  sampleRateHz: first.observationSeries.sampleRateHz,
  triggerThresholdKpa: 120,
  recordedDurationS: first.observationSeries.samples.at(-1)!.timeS,
  recordingPath: 'falling-trigger',
  releaseOffsetS: null,
  samples: first.observationSeries.samples,
  pressOperationEvidence: artifacts.pressOperationEvidence,
  sensorObservationSnapshot: artifacts.sensorObservationSnapshot,
  physicsSnapshot: artifacts.physicsSnapshot,
});
const restored = normalizePistonOscillationRawMeasurementRecord(
  structuredClone(record),
);
assert.ok(restored);
assert.deepEqual(
  restored?.samples,
  first.observationSeries.samples,
  'saved irregular observations must restore verbatim instead of being regenerated',
);

assert.throws(
  () => applyPistonOscillationTailIrregularityObservation({
    observationSeries: baseSeries,
    expectedPeriodS: 0,
  }),
  /expectedPeriodS/,
);

console.log('pistonOscillationTailIrregularityObservationModel tests passed');
