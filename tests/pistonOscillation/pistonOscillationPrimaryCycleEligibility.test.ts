import assert from 'node:assert/strict';
import {
  analyzePistonOscillationPrimaryCycleEligibility,
  createPistonOscillationFreePeriodSelection,
  createPistonOscillationIncompletePhysicsSnapshot,
  createPistonOscillationRawMeasurementRecord,
  type PistonOscillationRawMeasurementRecord,
  type PistonOscillationRawSample,
} from '../../src/domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import {
  createPistonOscillationIncompletePressOperationEvidence,
} from '../../src/domain/pistonOscillation/pistonOscillationPressInteractionModel.ts';
import {
  createPistonOscillationCurrentRecordTestArtifacts,
} from './helpers/pistonOscillationCurrentRecordTestFactory.ts';

const SAMPLE_RATE_HZ = 1_000;

const createRecord = (
  recordId: string,
  samples: readonly PistonOscillationRawSample[],
  options: {
    recordingPath?: 'falling-trigger' | 'immediate';
    releaseOffsetS?: number | null;
  } = {},
): PistonOscillationRawMeasurementRecord => {
  const artifacts = createPistonOscillationCurrentRecordTestArtifacts({
    lockedHeightMm: 80,
    sampleRateHz: SAMPLE_RATE_HZ,
    samples: [...samples],
  });
  const recordingPath = options.recordingPath ?? 'falling-trigger';
  return createPistonOscillationRawMeasurementRecord({
    recordId,
    capturedAtMs: 1_000,
    measurementIndex: 0,
    targetHeightMm: 80,
    confirmedHeightMm: artifacts.confirmedHeightMm,
    sampleRateHz: SAMPLE_RATE_HZ,
    triggerThresholdKpa: 120,
    recordedDurationS: samples.at(-1)?.timeS ?? 0,
    recordingPath,
    releaseOffsetS: recordingPath === 'immediate'
      ? options.releaseOffsetS ?? null
      : null,
    samples: [...samples],
    pressOperationEvidence: artifacts.pressOperationEvidence,
    sensorObservationSnapshot: artifacts.sensorObservationSnapshot,
    physicsSnapshot: artifacts.physicsSnapshot,
  });
};

const createWave = (
  sampleCount: number,
  pressureAt: (sampleIndex: number) => number,
): PistonOscillationRawSample[] => Array.from({ length: sampleCount }, (_, sampleIndex) => ({
  sampleIndex,
  timeS: sampleIndex / SAMPLE_RATE_HZ,
  absolutePressureKpa: Math.round(pressureAt(sampleIndex) * 100) / 100,
}));

const cleanRecord = createRecord(
  'eligibility-clean',
  createWave(161, (sampleIndex) => 101.4 + 2.4 * Math.cos(2 * Math.PI * sampleIndex / 40)),
);
const cleanReport = analyzePistonOscillationPrimaryCycleEligibility(cleanRecord);
assert.equal(cleanReport.status, 'usable');
assert.equal(cleanReport.reason, 'primary-half-cycle-found');
assert.ok(cleanReport.primaryPeriodCount >= 0.5);
assert.ok(cleanReport.primaryExtrema.length >= 2);

const secondaryPeakRecord = createRecord(
  'eligibility-secondary-peaks',
  createWave(161, (sampleIndex) => (
    101.4
    + 2.4 * Math.cos(2 * Math.PI * sampleIndex / 40)
    + 0.16 * Math.cos(2 * Math.PI * sampleIndex / 5)
  )),
);
const secondaryPeakReport = analyzePistonOscillationPrimaryCycleEligibility(
  secondaryPeakRecord,
);
assert.equal(secondaryPeakReport.status, 'usable');
assert.ok(
  secondaryPeakReport.primaryExtrema.length <= 10,
  'closely spaced secondary peaks must not become the primary half-cycle count',
);
const secondarySelection = createPistonOscillationFreePeriodSelection(
  secondaryPeakRecord,
  0,
  0.16,
  2_000,
);
assert.equal(secondarySelection.issue, null);
assert.ok(secondarySelection.periodCount >= 2.5 && secondarySelection.periodCount <= 4.5);

const exactHalfCycleRecord = createRecord(
  'eligibility-half-cycle',
  createWave(21, (sampleIndex) => 101.4 + 2.4 * Math.cos(Math.PI * sampleIndex / 20)),
);
const exactHalfCycleReport = analyzePistonOscillationPrimaryCycleEligibility(
  exactHalfCycleRecord,
);
assert.equal(exactHalfCycleReport.status, 'usable');
assert.equal(exactHalfCycleReport.primaryPeriodCount, 0.5);
const exactHalfCycleSelection = createPistonOscillationFreePeriodSelection(
  exactHalfCycleRecord,
  0,
  0.02,
  2_100,
);
assert.equal(exactHalfCycleSelection.issue, null);
assert.equal(exactHalfCycleSelection.periodCount, 0.5);

const quantizationOnlyRecord = createRecord(
  'eligibility-quantization-only',
  createWave(161, (sampleIndex) => 101.4 + (sampleIndex % 2 === 0 ? 0.01 : -0.01)),
);
const quantizationOnlyReport = analyzePistonOscillationPrimaryCycleEligibility(
  quantizationOnlyRecord,
);
assert.equal(quantizationOnlyReport.status, 'unusable');
assert.equal(quantizationOnlyReport.reason, 'insufficient-primary-excursion');

const unreleasedSamples = createWave(161, (sampleIndex) => 101.4 + sampleIndex / 100);
const unreleasedArtifacts = createPistonOscillationCurrentRecordTestArtifacts({
  lockedHeightMm: 80,
  sampleRateHz: SAMPLE_RATE_HZ,
  samples: unreleasedSamples,
});
const incompletePhysicsSnapshot = createPistonOscillationIncompletePhysicsSnapshot({
  lockedHeightMm: 80,
  sampleRateHz: SAMPLE_RATE_HZ,
  thermodynamicState: unreleasedArtifacts.physicsSnapshot.initialThermodynamicState!,
});
const unreleasedRecord = createPistonOscillationRawMeasurementRecord({
  recordId: 'eligibility-unreleased',
  capturedAtMs: 1_000,
  measurementIndex: 0,
  targetHeightMm: 80,
  confirmedHeightMm: incompletePhysicsSnapshot.equilibrium.equilibriumHeightM * 1_000,
  sampleRateHz: SAMPLE_RATE_HZ,
  triggerThresholdKpa: 120,
  recordedDurationS: unreleasedSamples.at(-1)!.timeS,
  recordingPath: 'immediate',
  releaseOffsetS: null,
  samples: unreleasedSamples,
  pressOperationEvidence: createPistonOscillationIncompletePressOperationEvidence({
    trace: [],
    capturedUntilMs: 1_000,
  }),
  sensorObservationSnapshot: unreleasedArtifacts.sensorObservationSnapshot,
  physicsSnapshot: incompletePhysicsSnapshot,
});
const unreleasedReport = analyzePistonOscillationPrimaryCycleEligibility(unreleasedRecord);
assert.equal(unreleasedReport.status, 'unusable');
assert.equal(unreleasedReport.reason, 'release-not-observed');

const tooShortRecord = createRecord(
  'eligibility-too-short',
  createWave(3, (sampleIndex) => 101.4 + sampleIndex),
);
const tooShortReport = analyzePistonOscillationPrimaryCycleEligibility(tooShortRecord);
assert.equal(tooShortReport.status, 'unusable');
assert.equal(tooShortReport.reason, 'insufficient-post-release-samples');

console.log('pistonOscillationPrimaryCycleEligibility tests passed');
