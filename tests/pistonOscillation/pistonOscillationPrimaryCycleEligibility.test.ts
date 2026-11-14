import assert from 'node:assert/strict';
import {
  analyzePistonOscillationPrimaryCycleEligibility,
  createPistonOscillationFreePeriodSelection,
  createPistonOscillationRawMeasurementRecord,
  type PistonOscillationRawMeasurementRecord,
  type PistonOscillationRawSample,
} from '../../src/domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import { restoreHistoricalImmediateRecord } from './helpers/pistonOscillationHistoricalRecordFixtures.ts';
import { createPistonOscillationExperimentContextSnapshot } from '../../src/domain/pistonOscillation/pistonOscillationExperimentContextModel.ts';
import { PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_VERSION } from '../../src/domain/pistonOscillation/pistonOscillationRealParameterProfile.ts';
import {
  createPistonOscillationCurrentRecordTestArtifacts,
} from './helpers/pistonOscillationCurrentRecordTestFactory.ts';

const SAMPLE_RATE_HZ = 1_000;

const createRecord = (
  recordId: string,
  samples: readonly PistonOscillationRawSample[],
): PistonOscillationRawMeasurementRecord => {
  const artifacts = createPistonOscillationCurrentRecordTestArtifacts({
    lockedHeightMm: 80,
    sampleRateHz: SAMPLE_RATE_HZ,
    samples: [...samples],
  });
  return createPistonOscillationRawMeasurementRecord({
    recordId,
    capturedAtMs: 1_000,
    measurementIndex: 0,
    targetHeightMm: 80,
    confirmedHeightMm: artifacts.confirmedHeightMm,
    sampleRateHz: SAMPLE_RATE_HZ,
    triggerThresholdKpa: 120,
    recordedDurationS: samples.at(-1)?.timeS ?? 0,
    recordingPath: 'falling-trigger',
    releaseOffsetS: null,
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

const calibratedAirContext = createPistonOscillationExperimentContextSnapshot({
  groupId: 'calibrated-air',
  scheme: 'real',
  parameterProfileVersion: PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_VERSION,
});
const decayingRecord = createRecord('eligibility-regular-tail', createWave(501, (index) => (
  101.4 + 8 * Math.exp(-index / 98) * Math.cos(2 * Math.PI * index / 40)
)));
const originalTail = analyzePistonOscillationPrimaryCycleEligibility(decayingRecord);
const calibratedTail = analyzePistonOscillationPrimaryCycleEligibility({
  ...decayingRecord,
  experimentContext: calibratedAirContext,
});
assert.ok(calibratedTail.primaryPeriodCount > originalTail.primaryPeriodCount);
assert.deepEqual(calibratedTail.primaryExtrema.slice(0, 5), originalTail.primaryExtrema.slice(0, 5));
assert.equal(analyzePistonOscillationPrimaryCycleEligibility({
  ...quantizationOnlyRecord,
  experimentContext: calibratedAirContext,
}).status, 'unusable');

const unreleasedSamples = createWave(161, (sampleIndex) => 101.4 + sampleIndex / 100);
const unreleasedRecord = restoreHistoricalImmediateRecord(
  createRecord('eligibility-unreleased', unreleasedSamples),
  null,
);
assert.ok(unreleasedRecord);
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
