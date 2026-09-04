import assert from 'node:assert/strict';
import {
  PISTON_OSCILLATION_PERIOD_SELECTION_ALGORITHM_VERSION,
  analyzePistonOscillationGuidedPeriod,
  createPistonOscillationDataProcessingSession,
  createPistonOscillationPeriodSelection,
  createPistonOscillationRawMeasurementRecord,
  findPistonOscillationExtrema,
  normalizePistonOscillationDataProcessingSession,
  selectPistonOscillationPeriodRange,
  type PistonOscillationRawMeasurementRecord,
  type PistonOscillationRawSample,
} from '../../src/domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import {
  createPistonOscillationCurrentRecordTestArtifacts,
} from './helpers/pistonOscillationCurrentRecordTestFactory.ts';

const SAMPLE_RATE_HZ = 1_000;
const PRIMARY_PERIOD_SAMPLES = 40;

const createWave = (
  sampleCount: number,
  pressureAt: (sampleIndex: number) => number,
): PistonOscillationRawSample[] => Array.from({ length: sampleCount }, (_, sampleIndex) => ({
  sampleIndex,
  timeS: sampleIndex / SAMPLE_RATE_HZ,
  absolutePressureKpa: Math.round(pressureAt(sampleIndex) * 100) / 100,
}));

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

const tailMicroPeakRecord = createRecord(
  'guided-tail-micro-peaks',
  createWave(181, (sampleIndex) => {
    const primary = 2.4
      * Math.exp(-sampleIndex / 210)
      * Math.cos(2 * Math.PI * sampleIndex / PRIMARY_PERIOD_SAMPLES);
    const tailBlend = Math.max(0, Math.min(1, (sampleIndex - 90) / 35));
    const tailMicroPeaks = tailBlend * 0.18 * Math.sin(2 * Math.PI * sampleIndex / 6);
    return 101.4 + primary + tailMicroPeaks + sampleIndex * 0.0015;
  }),
);
const rawTailExtrema = findPistonOscillationExtrema(tailMicroPeakRecord.samples);
const tailAnalysis = analyzePistonOscillationGuidedPeriod(tailMicroPeakRecord);
assert.equal(tailAnalysis.status, 'usable');
assert.equal(tailAnalysis.reason, 'primary-period-found');
assert.equal(
  tailAnalysis.algorithmVersion,
  PISTON_OSCILLATION_PERIOD_SELECTION_ALGORITHM_VERSION,
);
assert.ok(
  tailAnalysis.dominantPeriodSamples !== null
    && Math.abs(tailAnalysis.dominantPeriodSamples - PRIMARY_PERIOD_SAMPLES) <= 2,
  `dominant period should remain near ${PRIMARY_PERIOD_SAMPLES} samples`,
);
assert.ok(
  rawTailExtrema.length >= tailAnalysis.primaryExtrema.length + 6,
  'tail micro-peaks should remain observable without becoming primary extrema',
);
assert.ok(tailAnalysis.primaryExtrema.length >= 7);
for (let index = 1; index < tailAnalysis.primaryExtrema.length; index += 1) {
  const previous = tailAnalysis.primaryExtrema[index - 1]!;
  const current = tailAnalysis.primaryExtrema[index]!;
  assert.notEqual(previous.type, current.type);
  assert.ok(current.sampleIndex - previous.sampleIndex >= 11);
}

const tailSelection = createPistonOscillationPeriodSelection(
  tailMicroPeakRecord,
  0.005,
  0.17,
  2,
  2_000,
);
assert.equal(tailSelection.issue, null);
assert.ok(tailSelection.periodCount >= 3);
assert.equal(tailSelection.leftEndpoint?.type, tailSelection.rightEndpoint?.type);
assert.ok(tailSelection.periodCount % 1 === 0, 'Guide should count complete same-phase periods');
const selectedPeriodS = (
  (tailSelection.rightEndpoint!.sampleIndex - tailSelection.leftEndpoint!.sampleIndex)
  / SAMPLE_RATE_HZ
  / tailSelection.periodCount
);
assert.ok(Math.abs(selectedPeriodS - 0.04) <= 0.002);

const tailRangeAnalysis = analyzePistonOscillationGuidedPeriod(tailMicroPeakRecord, {
  rangeStartTimeS: 0.04,
  rangeEndTimeS: 0.16,
});
assert.ok(tailRangeAnalysis.primaryExtrema.every((extremum) => (
  extremum.timeS >= 0.04 && extremum.timeS <= 0.16
)), 'Guide analysis should evaluate the selected range instead of the whole record');

const changedGammaRecord = structuredClone(tailMicroPeakRecord);
changedGammaRecord.physicsSnapshot.config.gamma = 9.99;
const changedGammaAnalysis = analyzePistonOscillationGuidedPeriod(changedGammaRecord);
assert.equal(
  changedGammaAnalysis.dominantPeriodSamples,
  tailAnalysis.dominantPeriodSamples,
  'Guide period detection must not use the configured gamma as a period prior',
);
assert.deepEqual(
  changedGammaAnalysis.primaryExtrema.map((extremum) => extremum.sampleIndex),
  tailAnalysis.primaryExtrema.map((extremum) => extremum.sampleIndex),
);

const shortRecord = createRecord(
  'guided-one-cycle',
  createWave(61, (sampleIndex) => (
    101.4 + 2.4 * Math.cos(2 * Math.PI * sampleIndex / PRIMARY_PERIOD_SAMPLES)
  )),
);
const shortSelection = createPistonOscillationPeriodSelection(
  shortRecord,
  0,
  0.06,
  2,
  2_100,
);
assert.ok(shortSelection.periodCount < 2);
assert.ok(shortSelection.issue !== null, 'fewer than two complete periods must be rejected');

let chirpedPhase = 0;
const chirpedSamples = createWave(181, (sampleIndex) => {
  const localPeriod = 24 + sampleIndex * 0.16;
  chirpedPhase += 2 * Math.PI / localPeriod;
  return 101.4 + 2.2 * Math.cos(chirpedPhase);
});
const chirpedRecord = createRecord('guided-unstable-chirp', chirpedSamples);
const chirpedAnalysis = analyzePistonOscillationGuidedPeriod(chirpedRecord);
assert.equal(chirpedAnalysis.status, 'ambiguous');
const chirpedSelection = createPistonOscillationPeriodSelection(
  chirpedRecord,
  0,
  0.18,
  2,
  2_200,
);
assert.equal(chirpedSelection.issue, 'ambiguous-primary-period');
let chirpedProcessing = createPistonOscillationDataProcessingSession(
  [chirpedRecord],
  2_210,
);
chirpedProcessing = selectPistonOscillationPeriodRange(
  chirpedProcessing,
  [chirpedRecord],
  0,
  0,
  0.18,
  2,
  2_220,
);
assert.equal(chirpedProcessing.runs[0]?.selection?.issue, 'ambiguous-primary-period');
const restoredChirpedProcessing = normalizePistonOscillationDataProcessingSession(
  structuredClone(chirpedProcessing),
  [chirpedRecord],
  2_230,
);
assert.equal(
  restoredChirpedProcessing?.runs[0]?.selection?.issue,
  'ambiguous-primary-period',
  'refreshing must not turn an unstable selection into an accepted calculation input',
);

const startedAtMs = performance.now();
for (let iteration = 0; iteration < 100; iteration += 1) {
  analyzePistonOscillationGuidedPeriod(tailMicroPeakRecord);
}
const elapsedMs = performance.now() - startedAtMs;
assert.ok(elapsedMs < 1_000, `100 Guide analyses should finish within 1 s; got ${elapsedMs} ms`);

console.log('pistonOscillationGuidedPeriodRecognition tests passed');
