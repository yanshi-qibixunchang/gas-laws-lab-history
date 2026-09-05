import assert from 'node:assert/strict';
import {
  PISTON_OSCILLATION_CALCULATION_ANSWER_SPECS,
  PISTON_OSCILLATION_GUIDED_MINIMUM_PERIOD_COUNT,
  advancePistonOscillationPeriodRun,
  completePistonOscillationCalculation,
  continuePistonOscillationCalculationAnswer,
  continuePistonOscillationPeriodAnswer,
  createPistonOscillationDataProcessingSession,
  createPistonOscillationIncompletePhysicsSnapshot,
  createPistonOscillationPeriodSelection,
  createPistonOscillationRawMeasurementRecord,
  findPistonOscillationExtrema,
  formatPistonOscillationCalculationAnswer,
  formatPistonOscillationPeriod,
  formatPistonOscillationPeriodCount,
  normalizePistonOscillationDataProcessingSession,
  normalizePistonOscillationRawMeasurementRecord,
  revealPistonOscillationCalculationAnswer,
  revealPistonOscillationPeriodAnswer,
  reopenPreviousPistonOscillationPeriodRun,
  selectPistonOscillationPeriodRange,
  submitPistonOscillationCalculationField,
  submitPistonOscillationLinearFit,
  submitPistonOscillationPeriod,
  submitPistonOscillationPeriodEndpoints,
  togglePistonOscillationFitRun,
  updatePistonOscillationCalculationDraft,
  updatePistonOscillationPeriodAnswerDraft,
  type PistonOscillationDataProcessingSession,
  type PistonOscillationRawMeasurementRecord,
  type PistonOscillationRawSample,
} from '../../src/domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import {
  formatDecimalPlacesHalfEven,
  formatSignificantFiguresHalfEven,
} from '../../src/domain/calculation/decimalHalfEven.ts';
import {
  PISTON_OSCILLATION_LEGACY_FINITE_THERMAL_EXTENSION_MODEL_VERSION,
  PISTON_OSCILLATION_LEGACY_THERMAL_PHYSICS_MODEL_VERSION,
  type PistonOscillationThermodynamicState,
} from '../../src/domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';
type MutableFiniteThermalSnapshot = {
  modelVersion: string;
  provenance: string;
  heatTransferRateW?: number;
  heatTransferLagTimeS?: number;
};
type MutablePersistedRecord = Record<string, unknown> & {
  physicsSnapshot: {
    modelVersion: string;
    initialThermodynamicState: {
      modelVersion: string;
      thermal: MutableFiniteThermalSnapshot;
    };
    thermalModel: MutableFiniteThermalSnapshot;
  };
};
import {
  PISTON_OSCILLATION_DRY_AIR_ADIABATIC_INDEX,
  PISTON_OSCILLATION_DRY_AIR_MATERIAL_MODEL_VERSION,
} from '../../src/domain/pistonOscillation/pistonOscillationGasMaterialModel.ts';
import {
  PISTON_OSCILLATION_CURRENT_LINEAR_LOSS_NS_PER_M,
  PISTON_OSCILLATION_EQUIVALENT_LOSS_MODEL_VERSION,
  PISTON_OSCILLATION_LEGACY_BASELINE_EQUIVALENT_LOSS_KIND,
  PISTON_OSCILLATION_LEGACY_BASELINE_EQUIVALENT_LOSS_MODEL_VERSION,
  PISTON_OSCILLATION_LEGACY_LINEAR_LOSS_NS_PER_M,
  PISTON_OSCILLATION_LEGACY_RELEASE_REVIEW_LOSS_KIND,
  PISTON_OSCILLATION_LEGACY_RELEASE_REVIEW_LOSS_MODEL_VERSION,
} from '../../src/domain/pistonOscillation/pistonOscillationEquivalentLossModel.ts';
import {
  createPistonOscillationIncompletePressOperationEvidence,
} from '../../src/domain/pistonOscillation/pistonOscillationPressInteractionModel.ts';
import {
  createPistonOscillationExperimentContextSnapshot,
} from '../../src/domain/pistonOscillation/pistonOscillationExperimentContextModel.ts';
import {
  createPistonOscillationCurrentRecordTestArtifacts,
} from './helpers/pistonOscillationCurrentRecordTestFactory.ts';

const SAMPLE_RATE_HZ = 1_000;
const PERIOD_SAMPLES = [40, 36, 32] as const;

const createOscillationRecord = (
  measurementIndex: number,
  targetHeightMm: number,
  periodSamples: number,
): PistonOscillationRawMeasurementRecord => {
  const halfPeriodSamples = periodSamples / 2;
  const samples: PistonOscillationRawSample[] = Array.from(
    { length: periodSamples * 4 + 1 },
    (_, sampleIndex) => {
      const phase = sampleIndex % periodSamples;
      return {
        sampleIndex,
        timeS: sampleIndex / SAMPLE_RATE_HZ,
        absolutePressureKpa: 100 + Math.abs(phase - halfPeriodSamples) / 10,
      };
    },
  );
  const artifacts = createPistonOscillationCurrentRecordTestArtifacts({
    lockedHeightMm: targetHeightMm,
    sampleRateHz: SAMPLE_RATE_HZ,
    samples,
  });
  return createPistonOscillationRawMeasurementRecord({
    recordId: `processing-${measurementIndex}`,
    capturedAtMs: 1_000 + measurementIndex,
    measurementIndex,
    targetHeightMm,
    confirmedHeightMm: artifacts.confirmedHeightMm,
    sampleRateHz: SAMPLE_RATE_HZ,
    triggerThresholdKpa: 105,
    recordedDurationS: periodSamples * 4 / SAMPLE_RATE_HZ,
    recordingPath: 'falling-trigger',
    releaseOffsetS: null,
    samples,
    pressOperationEvidence: artifacts.pressOperationEvidence,
    sensorObservationSnapshot: artifacts.sensorObservationSnapshot,
    physicsSnapshot: artifacts.physicsSnapshot,
  });
};

const records = [
  createOscillationRecord(0, 80, PERIOD_SAMPLES[0]),
  createOscillationRecord(1, 70, PERIOD_SAMPLES[1]),
  createOscillationRecord(2, 60, PERIOD_SAMPLES[2]),
];
assert.equal(
  records[0].physicsSnapshot.gasMaterial.modelVersion,
  PISTON_OSCILLATION_DRY_AIR_MATERIAL_MODEL_VERSION,
);
assert.equal(
  records[0].physicsSnapshot.gasMaterial.adiabaticIndex,
  PISTON_OSCILLATION_DRY_AIR_ADIABATIC_INDEX,
);
assert.equal(records[0].physicsSnapshot.gasMaterial.gasType, 'air');
assert.equal(
  Object.hasOwn(records[0].physicsSnapshot, 'airMaterial'),
  false,
  'new measurements must not write the retired airMaterial field',
);
assert.equal(
  records[0].physicsSnapshot.equivalentLoss.modelVersion,
  PISTON_OSCILLATION_EQUIVALENT_LOSS_MODEL_VERSION,
);

const legacyBaselineCapturedRecord = {
  ...structuredClone(records[0]),
  schemaVersion: 6,
};
legacyBaselineCapturedRecord.physicsSnapshot.config.linearDampingNsPerM =
  PISTON_OSCILLATION_LEGACY_LINEAR_LOSS_NS_PER_M;
legacyBaselineCapturedRecord.physicsSnapshot.equivalentLoss = {
  schemaVersion: 1,
  modelVersion: PISTON_OSCILLATION_LEGACY_BASELINE_EQUIVALENT_LOSS_MODEL_VERSION,
  kind: PISTON_OSCILLATION_LEGACY_BASELINE_EQUIVALENT_LOSS_KIND,
  linearCoefficientNsPerM: PISTON_OSCILLATION_LEGACY_LINEAR_LOSS_NS_PER_M,
  provenance: 'captured',
};
assert.ok(
  normalizePistonOscillationRawMeasurementRecord(legacyBaselineCapturedRecord),
  'records captured with the prior 0.434 loss snapshot must remain readable',
);
const legacyReviewCapturedRecord = {
  ...structuredClone(records[0]),
  schemaVersion: 6,
};
legacyReviewCapturedRecord.physicsSnapshot.equivalentLoss = {
  schemaVersion: 1,
  modelVersion: PISTON_OSCILLATION_LEGACY_RELEASE_REVIEW_LOSS_MODEL_VERSION,
  kind: PISTON_OSCILLATION_LEGACY_RELEASE_REVIEW_LOSS_KIND,
  linearCoefficientNsPerM: PISTON_OSCILLATION_CURRENT_LINEAR_LOSS_NS_PER_M,
  provenance: 'captured',
};
assert.ok(
  normalizePistonOscillationRawMeasurementRecord(legacyReviewCapturedRecord),
  'records captured with the pre-formal 1.1 review snapshot must remain readable',
);

const mismatchedGasMaterialRecords = structuredClone(records);
mismatchedGasMaterialRecords[2]!.physicsSnapshot.gasMaterial = {
  ...mismatchedGasMaterialRecords[2]!.physicsSnapshot.gasMaterial,
  modelVersion: 'another-saved-air-material-version',
  provenance: 'legacy-inferred',
};
assert.throws(
  () => createPistonOscillationDataProcessingSession(mismatchedGasMaterialRecords, 1_999),
  /same saved gas material/,
  'runs produced by different saved gas materials must not enter one fit',
);
const mismatchedExperimentContextRecords = structuredClone(records);
mismatchedExperimentContextRecords.forEach((record) => {
  record.experimentContext = createPistonOscillationExperimentContextSnapshot({
    groupId: 'piston-context-group',
    scheme: 'real',
    parameterProfileVersion: 'piston-oscillation-real-parameter-profile-v1',
  });
});
mismatchedExperimentContextRecords[2]!.experimentContext =
  createPistonOscillationExperimentContextSnapshot({
    groupId: 'piston-context-group',
    scheme: 'ideal',
    parameterProfileVersion: 'piston-oscillation-ideal-parameter-profile-v1',
  });
assert.throws(
  () => createPistonOscillationDataProcessingSession(
    mismatchedExperimentContextRecords,
    2_000,
  ),
  /same saved experiment scheme and parameter profile/,
  'runs from different schemes or parameter profiles must not enter one fit',
);
const partiallyContextualizedRecords = structuredClone(records);
partiallyContextualizedRecords[0]!.experimentContext =
  mismatchedExperimentContextRecords[0]!.experimentContext;
assert.throws(
  () => createPistonOscillationDataProcessingSession(
    partiallyContextualizedRecords,
    2_001,
  ),
  /same saved experiment scheme and parameter profile/,
  'new contextualized runs must not be mixed with unbound legacy records',
);
assert.equal(
  normalizePistonOscillationDataProcessingSession(null, mismatchedGasMaterialRecords, 1_999),
  null,
);

const getSelectionRange = (periodSamples: number) => ({
  startS: (periodSamples / 2 - 1) / SAMPLE_RATE_HZ,
  endS: (periodSamples * 3.5 + 1) / SAMPLE_RATE_HZ,
});

const extrema = findPistonOscillationExtrema(records[0].samples);
assert.equal(extrema.length, 7);
assert.deepEqual(
  extrema.slice(0, 4).map((extremum) => [extremum.type, extremum.sampleIndex]),
  [
    ['trough', 20],
    ['peak', 40],
    ['trough', 60],
    ['peak', 80],
  ],
);

const firstRange = getSelectionRange(PERIOD_SAMPLES[0]);
const validSelection = createPistonOscillationPeriodSelection(
  records[0],
  firstRange.startS,
  firstRange.endS,
  3,
  2_000,
);
assert.equal(validSelection.issue, null);
assert.equal(validSelection.leftEndpoint?.sampleIndex, 20);
assert.equal(validSelection.rightEndpoint?.sampleIndex, 140);
assert.equal(validSelection.periodCount, 3);
assert.equal(validSelection.extrema.length, 7);

assert.equal(PISTON_OSCILLATION_GUIDED_MINIMUM_PERIOD_COUNT, 2);
const exactGuidedMinimumSelection = createPistonOscillationPeriodSelection(
  records[0],
  extrema[0]!.timeS,
  extrema[4]!.timeS,
  PISTON_OSCILLATION_GUIDED_MINIMUM_PERIOD_COUNT,
  2_001,
);
assert.equal(exactGuidedMinimumSelection.periodCount, 2);
assert.equal(exactGuidedMinimumSelection.issue, null);
const belowNewGuidedMinimumSelection = createPistonOscillationPeriodSelection(
  records[0],
  extrema[0]!.timeS,
  extrema[3]!.timeS,
  PISTON_OSCILLATION_GUIDED_MINIMUM_PERIOD_COUNT,
  2_002,
);
assert.equal(belowNewGuidedMinimumSelection.periodCount, 1);
assert.equal(belowNewGuidedMinimumSelection.issue, 'below-guided-minimum');

const fractionalGridSamples: PistonOscillationRawSample[] = Array.from(
  { length: 124 },
  (_, sampleIndex) => ({
    sampleIndex,
    timeS: sampleIndex / SAMPLE_RATE_HZ,
    absolutePressureKpa: Math.trunc((
      101.32 + Math.cos(2 * Math.PI * sampleIndex / 30.5)
    ) * 100) / 100,
  }),
);
const fractionalGridArtifacts = createPistonOscillationCurrentRecordTestArtifacts({
  lockedHeightMm: 80,
  sampleRateHz: SAMPLE_RATE_HZ,
  samples: fractionalGridSamples,
});
const fractionalGridRecord = createPistonOscillationRawMeasurementRecord({
  recordId: 'fractional-grid-period',
  capturedAtMs: 1_500,
  measurementIndex: 0,
  targetHeightMm: 80,
  confirmedHeightMm: fractionalGridArtifacts.confirmedHeightMm,
  sampleRateHz: SAMPLE_RATE_HZ,
  triggerThresholdKpa: 105,
  recordedDurationS: 0.123,
  recordingPath: 'falling-trigger',
  releaseOffsetS: null,
  samples: fractionalGridSamples,
  pressOperationEvidence: fractionalGridArtifacts.pressOperationEvidence,
  sensorObservationSnapshot: fractionalGridArtifacts.sensorObservationSnapshot,
  physicsSnapshot: fractionalGridArtifacts.physicsSnapshot,
});
let fractionalGridProcessing = createPistonOscillationDataProcessingSession(
  [fractionalGridRecord],
  2_010,
);
fractionalGridProcessing = selectPistonOscillationPeriodRange(
  fractionalGridProcessing,
  [fractionalGridRecord],
  0,
  0.014,
  0.108,
  3,
  2_011,
);
assert.equal(fractionalGridProcessing.runs[0].selection?.leftEndpoint?.sampleIndex, 15);
assert.equal(fractionalGridProcessing.runs[0].selection?.rightEndpoint?.sampleIndex, 107);
fractionalGridProcessing = updatePistonOscillationPeriodAnswerDraft(
  fractionalGridProcessing,
  0,
  't1',
  '0.015',
  2_012,
);
fractionalGridProcessing = updatePistonOscillationPeriodAnswerDraft(
  fractionalGridProcessing,
  0,
  't2',
  '0.107',
  2_013,
);
fractionalGridProcessing = submitPistonOscillationPeriodEndpoints(
  fractionalGridProcessing,
  0,
  2_014,
);
assert.equal(fractionalGridProcessing.runs[0].answers.period.expectedValue, 0.03067);
fractionalGridProcessing = updatePistonOscillationPeriodAnswerDraft(
  fractionalGridProcessing,
  0,
  'period',
  '0.03067',
  2_015,
);
fractionalGridProcessing = submitPistonOscillationPeriod(
  fractionalGridProcessing,
  0,
  2_016,
);
assert.equal(fractionalGridProcessing.runs[0].result?.periodS, 0.03067);
assert.equal(
  fractionalGridProcessing.runs[0].result?.periodSquaredS2,
  0.00094065,
);

// Reproduce the displayed 0.03250 s period seen in the fresh Guide acceptance.
// Its exact square is 0.00105625: the retained even digit must not round up
// because a binary multiplication produces 0.0010562500000000001.
const squareTieSamples: PistonOscillationRawSample[] = Array.from(
  { length: 131 },
  (_, sampleIndex) => ({
    sampleIndex,
    timeS: sampleIndex / SAMPLE_RATE_HZ,
    absolutePressureKpa: Number((
      101 + 3 * Math.cos(2 * Math.PI * (sampleIndex - 30) / 32.5)
    ).toFixed(2)),
  }),
);
const squareTieArtifacts = createPistonOscillationCurrentRecordTestArtifacts({
  lockedHeightMm: 60,
  sampleRateHz: SAMPLE_RATE_HZ,
  samples: squareTieSamples,
});
const squareTieRecord = createPistonOscillationRawMeasurementRecord({
  recordId: 'displayed-period-square-half-even-tie',
  capturedAtMs: 1_500,
  measurementIndex: 0,
  targetHeightMm: 60,
  sampleRateHz: SAMPLE_RATE_HZ,
  triggerThresholdKpa: 105,
  recordedDurationS: 0.130,
  recordingPath: 'falling-trigger',
  releaseOffsetS: null,
  samples: squareTieSamples,
  ...squareTieArtifacts,
});
let squareTieProcessing = createPistonOscillationDataProcessingSession([squareTieRecord], 2_020);
squareTieProcessing = selectPistonOscillationPeriodRange(
  squareTieProcessing, [squareTieRecord], 0, 0.028, 0.100, 2, 2_021,
);
assert.equal(squareTieProcessing.runs[0].selection?.periodCount, 2);
for (const [field, draft] of [['t1', '0.030'], ['t2', '0.095']] as const) {
  squareTieProcessing = updatePistonOscillationPeriodAnswerDraft(
    squareTieProcessing, 0, field, draft, 2_022,
  );
}
squareTieProcessing = submitPistonOscillationPeriodEndpoints(squareTieProcessing, 0, 2_023);
squareTieProcessing = updatePistonOscillationPeriodAnswerDraft(
  squareTieProcessing, 0, 'period', '0.03250', 2_024,
);
squareTieProcessing = submitPistonOscillationPeriod(squareTieProcessing, 0, 2_025);
assert.equal(squareTieProcessing.runs[0].result?.periodS, 0.03250);
assert.equal(squareTieProcessing.runs[0].result?.periodSquaredS2, 0.0010562);
const staleSquare = structuredClone(squareTieProcessing);
staleSquare.runs[0].result!.periodSquaredS2 = 0.0010563;
assert.equal(
  normalizePistonOscillationDataProcessingSession(staleSquare, [squareTieRecord], 2_026)
    ?.runs[0].result?.periodSquaredS2,
  0.0010562,
  'restoration must regenerate the square from the accepted displayed period',
);

const belowGuidedMinimum = createPistonOscillationPeriodSelection(
  records[0],
  0.019,
  0.101,
  3,
  2_001,
);
assert.equal(belowGuidedMinimum.periodCount, 2);
assert.equal(belowGuidedMinimum.issue, 'below-guided-minimum');

const insufficientSelection = createPistonOscillationPeriodSelection(
  records[0],
  0.021,
  0.039,
  3,
  2_002,
);
assert.equal(insufficientSelection.periodCount, 0);
assert.equal(insufficientSelection.issue, 'insufficient-extrema');

let processing = createPistonOscillationDataProcessingSession(records, 3_000);
assert.equal(processing.processingPolicy.guidedMinimumPeriodCount, 2);
assert.equal(processing.processingPolicy.freeMinimumPeriodCount, 0.5);
assert.equal(processing.schemaVersion, 7);
assert.deepEqual(processing.scoringPolicy, {
  schemaVersion: 1,
  policyVersion: 'piston-oscillation-free-scoring-policy-v1',
  scheme: 'real',
  scoringEligible: true,
});
const tamperedScoringPolicy = structuredClone(processing) as unknown as Record<string, unknown>;
tamperedScoringPolicy.scoringPolicy = {
  schemaVersion: 1,
  policyVersion: 'tampered-scoring-policy',
  scheme: 'ideal',
  scoringEligible: false,
};
assert.deepEqual(
  normalizePistonOscillationDataProcessingSession(
    tamperedScoringPolicy,
    records,
    3_001,
  )?.scoringPolicy,
  processing.scoringPolicy,
  'restoration must derive scoring eligibility from saved experiment context instead of persisted score claims',
);
processing = selectPistonOscillationPeriodRange(
  processing,
  records,
  0,
  firstRange.startS,
  firstRange.endS,
  99,
  3_010,
);
assert.equal(processing.runs[0].selection?.periodCount, 3);
assert.equal(processing.runs[0].selection?.issue, null);
assert.equal(processing.runs[0].answers.t1.expectedValue, 0.02);
assert.equal(processing.runs[0].answers.t2.expectedValue, 0.14);

processing = submitPistonOscillationPeriodEndpoints(processing, 0, 3_020);
assert.equal(processing.runs[0].answers.t1.feedback?.outcome, 'empty');
assert.equal(processing.runs[0].answers.t2.feedback?.outcome, 'empty');
processing = continuePistonOscillationPeriodAnswer(processing, 0, 't1', 3_030);
processing = continuePistonOscillationPeriodAnswer(processing, 0, 't2', 3_031);
processing = updatePistonOscillationPeriodAnswerDraft(processing, 0, 't1', '0.020', 3_040);
processing = updatePistonOscillationPeriodAnswerDraft(processing, 0, 't2', '0.140', 3_041);
processing = submitPistonOscillationPeriodEndpoints(processing, 0, 3_050);
assert.equal(processing.runs[0].answers.t1.status, 'correct');
assert.equal(processing.runs[0].answers.t2.status, 'correct');
assert.deepEqual(
  processing.runs[0].answers.t1.attempts.map((attempt) => ({
    attemptIndex: attempt.attemptIndex,
    attemptedAtMs: attempt.attemptedAtMs,
    draftRaw: attempt.draftRaw,
    outcome: attempt.outcome,
  })),
  [
    { attemptIndex: 1, attemptedAtMs: 3_020, draftRaw: '', outcome: 'empty' },
    { attemptIndex: 2, attemptedAtMs: 3_050, draftRaw: '0.020', outcome: 'correct' },
  ],
);
assert.equal(processing.runs[0].answers.t1.resolution, 'retry-correct');
assert.equal(processing.runs[0].answers.period.expectedValue, 0.04);
assert.equal(formatPistonOscillationPeriod(0.04), '0.04000');
assert.equal(formatPistonOscillationPeriodCount(3n), '3');
assert.equal(formatPistonOscillationPeriodCount(2.5), '2.5');
assert.throws(
  () => formatPistonOscillationPeriodCount(BigInt(Number.MAX_SAFE_INTEGER) + 1n),
  /finite safe number/,
);

processing = updatePistonOscillationPeriodAnswerDraft(processing, 0, 'period', '0.04', 3_060);
processing = submitPistonOscillationPeriod(processing, 0, 3_070);
assert.equal(processing.runs[0].answers.period.feedback?.outcome, 'precision-wrong');
processing = continuePistonOscillationPeriodAnswer(processing, 0, 'period', 3_080);
processing = updatePistonOscillationPeriodAnswerDraft(processing, 0, 'period', '0.04000', 3_090);
processing = submitPistonOscillationPeriod(processing, 0, 3_100);
assert.equal(processing.runs[0].answers.period.status, 'correct');
assert.equal(processing.runs[0].answers.period.resolution, 'retry-correct');
assert.deepEqual(
  processing.runs[0].answers.period.attempts.map((attempt) => attempt.draftRaw),
  ['0.04', '0.04000'],
);
assert.equal(processing.runs[0].result?.periodS, 0.04);
assert.equal(processing.runs[0].result?.periodSquaredS2, 0.0016);
assert.equal(processing.runs[0].result?.deltaTimeS, 0.12);
processing = advancePistonOscillationPeriodRun(processing, 3_110, records);
assert.equal(processing.activeRunIndex, 1);

const completeRunByReveal = (
  source: PistonOscillationDataProcessingSession,
  runIndex: number,
  nowMs: number,
) => {
  const range = getSelectionRange(PERIOD_SAMPLES[runIndex]!);
  let next = selectPistonOscillationPeriodRange(
    source,
    records,
    runIndex,
    range.startS,
    range.endS,
    3,
    nowMs,
  );
  next = updatePistonOscillationPeriodAnswerDraft(next, runIndex, 't1', '9.999', nowMs + 1);
  next = updatePistonOscillationPeriodAnswerDraft(next, runIndex, 't2', '9.999', nowMs + 2);
  next = submitPistonOscillationPeriodEndpoints(next, runIndex, nowMs + 3);
  next = revealPistonOscillationPeriodAnswer(next, runIndex, 't1', nowMs + 4);
  next = revealPistonOscillationPeriodAnswer(next, runIndex, 't2', nowMs + 5);
  next = updatePistonOscillationPeriodAnswerDraft(next, runIndex, 'period', '9.999', nowMs + 6);
  next = submitPistonOscillationPeriod(next, runIndex, nowMs + 7);
  next = revealPistonOscillationPeriodAnswer(next, runIndex, 'period', nowMs + 8);
  assert.equal(next.runs[runIndex].answers.period.status, 'revealed');
  assert.equal(next.runs[runIndex].answers.period.resolution, 'revealed-after-attempt');
  assert.ok(next.runs[runIndex].result);
  return next;
};

processing = completeRunByReveal(processing, 1, 3_200);
assert.equal(processing.runs[1].result?.periodS, 0.036);
assert.equal(processing.runs[1].answers.period.draftRaw, '0.03600');
processing = advancePistonOscillationPeriodRun(processing, 3_220, records);
assert.equal(processing.activeRunIndex, 2);
const laterDraftBeforeReturn = updatePistonOscillationPeriodAnswerDraft(
  processing,
  2,
  't1',
  '0.123',
  3_221,
);
const returnedToPreviousRun = reopenPreviousPistonOscillationPeriodRun(
  laterDraftBeforeReturn,
  3_222,
);
assert.equal(returnedToPreviousRun.activeRunIndex, 1);
assert.equal(returnedToPreviousRun.runs[0].result !== null, true);
assert.equal(returnedToPreviousRun.runs[1].result, null);
assert.equal(returnedToPreviousRun.runs[2].answers.t1.draftRaw, '');
const reopenedAudit = returnedToPreviousRun.audit.at(-1);
assert.equal(reopenedAudit?.type, 'run-reopened');
const archivedRuns = JSON.parse(
  String(reopenedAudit?.payload.archivedRunsJson),
) as Array<{
  runIndex: number;
  answers: { t1: { draftRaw: string } };
  result: unknown;
}>;
assert.ok(archivedRuns[0]?.result);
assert.equal(archivedRuns[1]?.answers.t1.draftRaw, '0.123');
const restoredReturnedRun = normalizePistonOscillationDataProcessingSession(
  structuredClone(returnedToPreviousRun),
  records,
  3_223,
);
assert.equal(restoredReturnedRun?.activeRunIndex, 1);
assert.equal(
  restoredReturnedRun?.audit.at(-1)?.payload.archivedRunsJson,
  reopenedAudit?.payload.archivedRunsJson,
  'returning to modify a prior run must preserve superseded answers across restart',
);
processing = completeRunByReveal(processing, 2, 3_300);
assert.equal(processing.runs[2].result?.periodS, 0.032);
processing = advancePistonOscillationPeriodRun(processing, 3_320, records);
assert.equal(processing.status, 'calculation-ready');
assert.equal(processing.runs.every((run) => run.result !== null), true);

const legacyAttemptPersistence = structuredClone(processing) as unknown as Record<string, unknown>;
const legacyAttemptRuns = legacyAttemptPersistence.runs as Array<Record<string, unknown>>;
const legacyAttemptAnswers = legacyAttemptRuns[0].answers as Record<string, Record<string, unknown>>;
delete legacyAttemptAnswers.t1.attempts;
delete legacyAttemptAnswers.t1.resolution;
legacyAttemptAnswers.t1.attemptCount = 2;
const migratedLegacyAttempts = normalizePistonOscillationDataProcessingSession(
  legacyAttemptPersistence,
  records,
  3_325,
);
assert.deepEqual(
  migratedLegacyAttempts?.runs[0].answers.t1.attempts,
  [1, 2].map((attemptIndex) => ({
    attemptIndex,
    attemptedAtMs: null,
    draftRaw: null,
    inputKnown: false,
    parsedValue: null,
    outcome: 'unknown',
    numericCorrect: null,
    precisionCorrect: null,
  })),
  'legacy attempt counts should migrate as explicitly unknown instead of inventing raw answers',
);

let calculationProcessing = structuredClone(processing);
calculationProcessing = togglePistonOscillationFitRun(calculationProcessing, 0, 3_330);
calculationProcessing = togglePistonOscillationFitRun(calculationProcessing, 1, 3_331);
const fitRejectedWithMissingRow = submitPistonOscillationLinearFit(
  calculationProcessing,
  3_332,
  { requireAllRuns: true },
);
assert.equal(fitRejectedWithMissingRow.linearFitResult, null);
calculationProcessing = togglePistonOscillationFitRun(calculationProcessing, 2, 3_333);
calculationProcessing = submitPistonOscillationLinearFit(
  calculationProcessing,
  3_334,
  { requireAllRuns: true },
);
assert.ok(calculationProcessing.linearFitResult);
assert.deepEqual(calculationProcessing.linearFitResult.selectedRunIndices, [0, 1, 2]);
assert.ok(calculationProcessing.linearFitResult.slopeMPerS2 > 0);
assert.ok(calculationProcessing.linearFitResult.rSquared > 0.99);
assert.equal(calculationProcessing.calculationSession?.activeFieldId, 'area');
assert.deepEqual(
  Object.values(PISTON_OSCILLATION_CALCULATION_ANSWER_SPECS).map((spec) => spec.tolerance),
  [
    { type: 'absolute', value: 0 },
    { type: 'absolute', value: 0 },
    { type: 'absolute', value: 0 },
  ],
  'every piston calculation field must require the unique rounded reference value',
);

const knowns = calculationProcessing.calculationSession!.knowns;
const displayMassKg = Number(formatDecimalPlacesHalfEven(knowns.movingMassKg, 4));
const displayDiameterM = Number(
  formatDecimalPlacesHalfEven(knowns.cylinderDiameterM * 1_000, 1),
) / 1_000;
const displayPressurePa = Number(formatSignificantFiguresHalfEven(knowns.pressurePa, 3));
const displaySlopeMPerS2 = Number(formatSignificantFiguresHalfEven(
  calculationProcessing.linearFitResult.slopeMPerS2,
  5,
));
assert.deepEqual(
  calculationProcessing.linearFitResult.points.map((point) => ({
    periodSquaredS2: point.periodSquaredS2,
    heightMm: point.heightMm,
  })),
  calculationProcessing.runs.map((run) => ({
    periodSquaredS2: Number(formatSignificantFiguresHalfEven(
      run.result!.periodSquaredS2,
      5,
    )),
    heightMm: Number(formatSignificantFiguresHalfEven(run.fitHeightMm, 4)),
  })),
  'the fit must use the same rounded coordinates shown in the calculation window',
);

const areaExpected = calculationProcessing.calculationSession!.answers.area.expectedValue!;
assert.equal(
  areaExpected,
  Number(formatPistonOscillationCalculationAnswer(
    'area',
    Math.PI * displayDiameterM ** 2 / 4,
  )),
  'the area reference must be calculated from the displayed diameter',
);
calculationProcessing = updatePistonOscillationCalculationDraft(
  calculationProcessing,
  'area',
  formatPistonOscillationCalculationAnswer('area', areaExpected),
  3_340,
);
calculationProcessing = submitPistonOscillationCalculationField(
  calculationProcessing,
  'area',
  3_341,
);
assert.equal(calculationProcessing.calculationSession?.answers.area.resolution, 'first-correct');
calculationProcessing = submitPistonOscillationCalculationField(
  calculationProcessing,
  'gamma',
  3_342,
);
assert.equal(calculationProcessing.calculationSession?.answers.gamma.feedback?.outcome, 'empty');
const calculationRevealWithoutValue = revealPistonOscillationCalculationAnswer(
  calculationProcessing,
  'gamma',
  3_342.5,
);
assert.equal(
  calculationRevealWithoutValue.calculationSession?.answers.gamma.resolution,
  'revealed-without-valid-attempt',
);
calculationProcessing = continuePistonOscillationCalculationAnswer(
  calculationProcessing,
  'gamma',
  3_343,
);
const gammaExpected = calculationProcessing.calculationSession!.answers.gamma.expectedValue!;
assert.equal(
  gammaExpected,
  Number(formatPistonOscillationCalculationAnswer(
    'gamma',
    4 * Math.PI ** 2 * displayMassKg * displaySlopeMPerS2
      / (areaExpected * displayPressurePa),
  )),
  'the gamma reference must use only displayed operands and the rounded area answer',
);
calculationProcessing = updatePistonOscillationCalculationDraft(
  calculationProcessing,
  'gamma',
  formatPistonOscillationCalculationAnswer('gamma', gammaExpected),
  3_344,
);
calculationProcessing = submitPistonOscillationCalculationField(
  calculationProcessing,
  'gamma',
  3_345,
);
const relativeErrorExpected = calculationProcessing
  .calculationSession!.answers.relativeError.expectedValue!;
const displayReferenceGamma = Number(formatDecimalPlacesHalfEven(knowns.referenceGamma, 2));
assert.equal(
  relativeErrorExpected,
  Number(formatPistonOscillationCalculationAnswer(
    'relativeError',
    Math.abs(gammaExpected - displayReferenceGamma) / displayReferenceGamma * 100,
  )),
  'the relative-error reference must use the rounded gamma and displayed reference gamma',
);
calculationProcessing = updatePistonOscillationCalculationDraft(
  calculationProcessing,
  'relativeError',
  '0.00',
  3_346,
);
calculationProcessing = submitPistonOscillationCalculationField(
  calculationProcessing,
  'relativeError',
  3_347,
);
calculationProcessing = revealPistonOscillationCalculationAnswer(
  calculationProcessing,
  'relativeError',
  3_348,
);
assert.equal(
  calculationProcessing.calculationSession?.answers.relativeError.resolution,
  'revealed-after-attempt',
);
calculationProcessing = completePistonOscillationCalculation(calculationProcessing, 3_349);
assert.equal(calculationProcessing.status, 'completed');

const authoritativeFit = structuredClone(calculationProcessing.linearFitResult!);
const authoritativeFirstResult = structuredClone(calculationProcessing.runs[0].result!);
const tamperedPersistence = structuredClone(calculationProcessing) as unknown as Record<string, unknown>;
const tamperedRuns = tamperedPersistence.runs as Array<Record<string, unknown>>;
const tamperedFirstSelection = tamperedRuns[0].selection as Record<string, unknown>;
tamperedFirstSelection.periodCount = 999;
const tamperedExtrema = tamperedFirstSelection.extrema as Array<Record<string, unknown>>;
tamperedExtrema[0].timeS = 123;
tamperedExtrema[0].absolutePressureKpa = -5;
Object.assign(tamperedRuns[0].result as Record<string, unknown>, {
  t1S: 99,
  t2S: 100,
  periodCount: 999,
  deltaTimeS: 1,
  periodS: 9,
  periodSquaredS2: 81,
});
Object.assign(tamperedPersistence.linearFitResult as Record<string, unknown>, {
  slopeMPerS2: -999,
  interceptM: 999,
  rSquared: -100,
  points: [],
});
const tamperedCalculation = tamperedPersistence.calculationSession as Record<string, unknown>;
const tamperedKnowns = tamperedCalculation.knowns as Record<string, unknown>;
tamperedKnowns.referenceGamma = 1.2;
tamperedKnowns.gasMaterialModelVersion = 'tampered-material';
const tamperedCalculationAnswers = tamperedCalculation.answers as Record<string, Record<string, unknown>>;
tamperedCalculationAnswers.gamma.expectedValue = 999;
tamperedCalculationAnswers.relativeError.draftRaw = '999';

const restoredCalculation = normalizePistonOscillationDataProcessingSession(
  tamperedPersistence,
  records,
  3_400,
);
assert.ok(restoredCalculation);
assert.equal(restoredCalculation.status, 'completed');
assert.equal(
  restoredCalculation.calculationSession?.knowns.referenceGamma,
  PISTON_OSCILLATION_DRY_AIR_ADIABATIC_INDEX,
  'restoration must derive the relative-error reference from the raw material snapshot',
);
assert.equal(
  restoredCalculation.calculationSession?.knowns.gasMaterialModelVersion,
  PISTON_OSCILLATION_DRY_AIR_MATERIAL_MODEL_VERSION,
);
assert.equal(restoredCalculation.calculationSession?.knowns.gasType, 'air');
assert.equal(
  Object.hasOwn(restoredCalculation.calculationSession?.knowns ?? {}, 'airMaterialId'),
  false,
  'normalized calculation knowns must not keep retired air-specific fields',
);
assert.deepEqual(restoredCalculation.runs[0].result, authoritativeFirstResult);
assert.equal(restoredCalculation.runs[0].selection?.periodCount, 3);
assert.equal(restoredCalculation.runs[0].selection?.leftEndpoint?.timeS, 0.02);
assert.equal(
  restoredCalculation.runs[0].selection?.leftEndpoint?.absolutePressureKpa,
  records[0].samples[20].absolutePressureKpa,
);
assert.equal(restoredCalculation.linearFitResult?.slopeMPerS2, authoritativeFit.slopeMPerS2);
assert.equal(restoredCalculation.linearFitResult?.interceptM, authoritativeFit.interceptM);
assert.equal(restoredCalculation.linearFitResult?.rSquared, authoritativeFit.rSquared);
assert.equal(restoredCalculation.calculationSession?.answers.gamma.attempts.length, 2);
assert.equal(
  restoredCalculation.calculationSession?.answers.relativeError.draftRaw,
  formatPistonOscillationCalculationAnswer(
    'relativeError',
    restoredCalculation.calculationSession!.answers.relativeError.expectedValue!,
  ),
);

const bigintSelectionPersistence = structuredClone(
  processing,
) as unknown as Record<string, unknown>;
const bigintSelectionRuns = bigintSelectionPersistence.runs as Array<
  Record<string, unknown>
>;
for (const persistedRun of bigintSelectionRuns) {
  const persistedSelection = persistedRun.selection as Record<string, unknown>;
  const persistedLeftEndpoint = persistedSelection.leftEndpoint as Record<string, unknown>;
  const persistedRightEndpoint = persistedSelection.rightEndpoint as Record<string, unknown>;
  persistedSelection.periodCount = BigInt(persistedSelection.periodCount as number);
  persistedLeftEndpoint.sampleIndex = BigInt(persistedLeftEndpoint.sampleIndex as number);
  persistedRightEndpoint.sampleIndex = BigInt(persistedRightEndpoint.sampleIndex as number);
  const persistedResult = persistedRun.result as Record<string, unknown>;
  persistedResult.periodCount = BigInt(persistedResult.periodCount as number);
  persistedResult.leftSampleIndex = BigInt(persistedResult.leftSampleIndex as number);
  persistedResult.rightSampleIndex = BigInt(persistedResult.rightSampleIndex as number);
}
const restoredBigintSelections = normalizePistonOscillationDataProcessingSession(
  bigintSelectionPersistence,
  records,
  3_402,
);
assert.ok(restoredBigintSelections);
assert.equal(restoredBigintSelections.status, 'calculation-ready');
assert.equal(restoredBigintSelections.runs.every((run) => (
  typeof run.selection?.periodCount === 'number'
  && typeof run.result?.periodCount === 'number'
)), true);
assert.deepEqual(
  restoredBigintSelections.runs.map((run) => run.result),
  processing.runs.map((run) => run.result),
  'legacy bigint endpoints must be restored as the authoritative numeric result',
);

const unsupportedSelectionVersion = structuredClone(
  processing,
) as unknown as Record<string, unknown>;
const unsupportedSelectionRuns = unsupportedSelectionVersion.runs as Array<
  Record<string, unknown>
>;
(unsupportedSelectionRuns[0].selection as Record<string, unknown>)
  .algorithmVersion = 'future-extrema-v99';
const unsupportedSelectionRestored = normalizePistonOscillationDataProcessingSession(
  unsupportedSelectionVersion,
  records,
  3_405,
);
assert.equal(unsupportedSelectionRestored?.status, 'period-processing');
assert.equal(
  unsupportedSelectionRestored?.runs[0].selection,
  null,
  'an unknown extrema algorithm must require that run to be processed again',
);

const missingFitVersion = structuredClone(
  calculationProcessing,
) as unknown as Record<string, unknown>;
delete (missingFitVersion.linearFitResult as Record<string, unknown>).algorithmVersion;
const migratedMissingFitVersion = normalizePistonOscillationDataProcessingSession(
  missingFitVersion,
  records,
  3_406,
);
assert.equal(
  migratedMissingFitVersion?.linearFitResult?.algorithmVersion,
  'display-rounded-ordinary-least-squares-v3',
  'the only pre-versioned fit representation must migrate to the current display-rounded fit',
);

const unsupportedFitVersion = structuredClone(
  calculationProcessing,
) as unknown as Record<string, unknown>;
(unsupportedFitVersion.linearFitResult as Record<string, unknown>)
  .algorithmVersion = 'future-fit-v99';
const unsupportedFitRestored = normalizePistonOscillationDataProcessingSession(
  unsupportedFitVersion,
  records,
  3_407,
);
assert.equal(unsupportedFitRestored?.status, 'calculation-ready');
assert.equal(unsupportedFitRestored?.linearFitResult, null);
assert.equal(
  unsupportedFitRestored?.calculationSession?.status,
  'selecting-points',
  'an unknown fit algorithm must require a new fit instead of silently using OLS v1',
);

const unsupportedCalculationVersion = structuredClone(
  calculationProcessing,
) as unknown as Record<string, unknown>;
const unsupportedCalculationSession = unsupportedCalculationVersion
  .calculationSession as Record<string, unknown>;
(unsupportedCalculationSession.knowns as Record<string, unknown>)
  .modelVersion = 'future-calculation-v99';
const unsupportedCalculationRestored = normalizePistonOscillationDataProcessingSession(
  unsupportedCalculationVersion,
  records,
  3_408,
);
assert.equal(unsupportedCalculationRestored?.status, 'calculation-ready');
assert.equal(
  unsupportedCalculationRestored?.linearFitResult,
  null,
  'an unknown calculation formula must not reuse a fit in a silently replaced calculation',
);
assert.equal(
  unsupportedCalculationRestored?.calculationSession?.status,
  'selecting-points',
);

const binarySquareCalculation = structuredClone(calculationProcessing);
const binarySquarePersisted = binarySquareCalculation as unknown as Record<string, unknown>;
(binarySquarePersisted.linearFitResult as Record<string, unknown>).algorithmVersion =
  'display-rounded-ordinary-least-squares-v2';
((binarySquarePersisted.calculationSession as Record<string, unknown>)
  .knowns as Record<string, unknown>).modelVersion =
  'display-rounded-piston-slope-calculation-v2';
const restoredBinarySquareCalculation = normalizePistonOscillationDataProcessingSession(
  binarySquarePersisted, records, 3_409,
);
assert.equal(restoredBinarySquareCalculation?.status, 'calculation-ready');
assert.equal(restoredBinarySquareCalculation?.linearFitResult, null);
assert.equal(restoredBinarySquareCalculation?.calculationSession?.status, 'selecting-points');
assert.deepEqual(
  restoredBinarySquareCalculation?.runs.map((run) => run.result),
  calculationProcessing.runs.map((run) => run.result),
  'v2 downstream calculations must reset while valid displayed period results survive',
);

const staleCorrectPersistence = structuredClone(calculationProcessing) as unknown as Record<string, unknown>;
const staleCalculation = staleCorrectPersistence.calculationSession as Record<string, unknown>;
const staleAnswers = staleCalculation.answers as Record<string, Record<string, unknown>>;
staleAnswers.gamma.draftRaw = '9.999';
const staleCorrectRestored = normalizePistonOscillationDataProcessingSession(
  staleCorrectPersistence,
  records,
  3_410,
);
assert.equal(staleCorrectRestored?.status, 'calculation-ready');
assert.equal(staleCorrectRestored?.calculationSession?.status, 'calculating');
assert.equal(staleCorrectRestored?.calculationSession?.activeFieldId, 'gamma');
assert.equal(staleCorrectRestored?.calculationSession?.answers.gamma.status, 'unresolved');
assert.equal(staleCorrectRestored?.calculationSession?.answers.relativeError.status, 'unresolved');

const stalePeriodPersistence = structuredClone(processing) as unknown as Record<string, unknown>;
const stalePeriodRuns = stalePeriodPersistence.runs as Array<Record<string, unknown>>;
const staleFirstAnswers = stalePeriodRuns[0].answers as Record<string, Record<string, unknown>>;
staleFirstAnswers.t1.draftRaw = '9.999';
const stalePeriodRestored = normalizePistonOscillationDataProcessingSession(
  stalePeriodPersistence,
  records,
  3_420,
);
assert.equal(stalePeriodRestored?.status, 'period-processing');
assert.equal(stalePeriodRestored?.runs[0].answers.t1.status, 'unresolved');
assert.equal(stalePeriodRestored?.runs[0].answers.period.status, 'unresolved');
assert.equal(stalePeriodRestored?.runs[0].result, null);

const revealedPersistence = structuredClone(processing) as unknown as Record<string, unknown>;
const revealedRuns = revealedPersistence.runs as Array<Record<string, unknown>>;
const revealedSecondAnswers = revealedRuns[1].answers as Record<string, Record<string, unknown>>;
revealedSecondAnswers.period.draftRaw = '999';
const revealedRestored = normalizePistonOscillationDataProcessingSession(
  revealedPersistence,
  records,
  3_430,
);
assert.equal(revealedRestored?.runs[1].answers.period.status, 'revealed');
assert.equal(revealedRestored?.runs[1].answers.period.draftRaw, '0.03600');

const invalidEndpointPersistence = structuredClone(processing) as unknown as Record<string, unknown>;
const invalidEndpointRuns = invalidEndpointPersistence.runs as Array<Record<string, unknown>>;
const invalidFirstSelection = invalidEndpointRuns[0].selection as Record<string, unknown>;
(invalidFirstSelection.leftEndpoint as Record<string, unknown>).sampleIndex = 21;
const invalidEndpointRestored = normalizePistonOscillationDataProcessingSession(
  invalidEndpointPersistence,
  records,
  3_440,
);
assert.equal(invalidEndpointRestored?.status, 'period-processing');
assert.equal(invalidEndpointRestored?.runs[0].selection, null);

const customPolicyPersistence = structuredClone(processing) as unknown as Record<string, unknown>;
customPolicyPersistence.processingPolicy = {
  schemaVersion: 1,
  policyVersion: 'piston-oscillation-processing-policy-v1',
  guidedMinimumPeriodCount: 4,
  freeMinimumPeriodCount: 1,
};
const customPolicyRestored = normalizePistonOscillationDataProcessingSession(
  customPolicyPersistence,
  records,
  3_450,
);
assert.equal(customPolicyRestored?.processingPolicy.guidedMinimumPeriodCount, 4);
assert.equal(customPolicyRestored?.runs[0].selection?.issue, 'below-guided-minimum');

const invalidPolicyPersistence = structuredClone(processing) as unknown as Record<string, unknown>;
invalidPolicyPersistence.processingPolicy = {
  schemaVersion: 1,
  policyVersion: 'legacy-policy',
  guidedMinimumPeriodCount: -1,
  freeMinimumPeriodCount: 0,
};
const invalidPolicyRestored = normalizePistonOscillationDataProcessingSession(
  invalidPolicyPersistence,
  records,
  3_460,
);
assert.equal(invalidPolicyRestored?.processingPolicy.guidedMinimumPeriodCount, 2);
assert.equal(invalidPolicyRestored?.processingPolicy.freeMinimumPeriodCount, 0.5);

const oldSessionWithoutPolicy = structuredClone(processing) as unknown as Record<string, unknown>;
delete oldSessionWithoutPolicy.processingPolicy;
const oldSessionRestored = normalizePistonOscillationDataProcessingSession(
  oldSessionWithoutPolicy,
  records,
  3_470,
);
assert.equal(oldSessionRestored?.processingPolicy.guidedMinimumPeriodCount, 2);

const validCurrentRecord = normalizePistonOscillationRawMeasurementRecord(
  structuredClone(records[0]),
);
assert.ok(validCurrentRecord);
assert.equal(validCurrentRecord.schemaVersion, 7);
assert.equal(validCurrentRecord.experimentContext, null);
assert.equal(validCurrentRecord.acquisitionSettings.recordingPath, 'falling-trigger');
assert.equal(validCurrentRecord.acquisitionSettings.releaseOffsetS, null);

const legacyFiniteThermalRecord = structuredClone(records[0]) as unknown as MutablePersistedRecord;
const legacyFiniteThermalPhysics = legacyFiniteThermalRecord.physicsSnapshot;
legacyFiniteThermalPhysics.modelVersion =
  PISTON_OSCILLATION_LEGACY_THERMAL_PHYSICS_MODEL_VERSION;
legacyFiniteThermalPhysics.initialThermodynamicState.modelVersion =
  PISTON_OSCILLATION_LEGACY_THERMAL_PHYSICS_MODEL_VERSION;
for (const thermal of [
  legacyFiniteThermalPhysics.initialThermodynamicState.thermal,
  legacyFiniteThermalPhysics.thermalModel,
]) {
  thermal.modelVersion =
    PISTON_OSCILLATION_LEGACY_FINITE_THERMAL_EXTENSION_MODEL_VERSION;
  thermal.provenance = 'identified-candidate';
  delete thermal.heatTransferRateW;
  delete thermal.heatTransferLagTimeS;
}
const restoredLegacyFiniteThermalRecord =
  normalizePistonOscillationRawMeasurementRecord(legacyFiniteThermalRecord);
assert.ok(restoredLegacyFiniteThermalRecord);
assert.equal(
  restoredLegacyFiniteThermalRecord.physicsSnapshot.modelVersion,
  PISTON_OSCILLATION_LEGACY_THERMAL_PHYSICS_MODEL_VERSION,
);

const releasedImmediatePhysics = {
  ...records[0].physicsSnapshot,
  triggerTimeS: null,
};
const immediateRecord = createPistonOscillationRawMeasurementRecord({
  recordId: 'immediate-recording',
  capturedAtMs: 0,
  measurementIndex: 0,
  targetHeightMm: 80,
  confirmedHeightMm: records[0].confirmedHeightMm,
  sampleRateHz: SAMPLE_RATE_HZ,
  triggerThresholdKpa: 100,
  recordedDurationS: records[0].acquisitionSettings.recordedDurationS,
  recordingPath: 'immediate',
  releaseOffsetS: 0.02,
  samples: records[0].samples,
  pressOperationEvidence: records[0].pressOperationEvidence,
  sensorObservationSnapshot: records[0].sensorObservationSnapshot,
  physicsSnapshot: releasedImmediatePhysics,
});
assert.equal(immediateRecord.acquisitionSettings.recordingPath, 'immediate');
assert.equal(immediateRecord.acquisitionSettings.releaseOffsetS, 0.02);
assert.equal(immediateRecord.physicsSnapshot.triggerTimeS, null);
const incompleteThermodynamicState = records[0].physicsSnapshot
  .initialThermodynamicState as PistonOscillationThermodynamicState;
const incompletePhysicsSnapshot = createPistonOscillationIncompletePhysicsSnapshot({
  lockedHeightMm: 80,
  sampleRateHz: SAMPLE_RATE_HZ,
  thermodynamicState: incompleteThermodynamicState,
});
assert.equal(
  incompletePhysicsSnapshot.config.linearDampingNsPerM,
  PISTON_OSCILLATION_LEGACY_LINEAR_LOSS_NS_PER_M,
  'compatibility callers without an explicit loss must retain the historical default',
);
const currentIncompletePhysicsSnapshot = createPistonOscillationIncompletePhysicsSnapshot({
  lockedHeightMm: 80,
  sampleRateHz: SAMPLE_RATE_HZ,
  thermodynamicState: incompleteThermodynamicState,
  linearDampingNsPerM:
    PISTON_OSCILLATION_CURRENT_LINEAR_LOSS_NS_PER_M,
});
assert.equal(
  currentIncompletePhysicsSnapshot.config.linearDampingNsPerM,
  PISTON_OSCILLATION_CURRENT_LINEAR_LOSS_NS_PER_M,
  'new incomplete press captures must record the formal current loss',
);
const incompletePressOperationEvidence =
  createPistonOscillationIncompletePressOperationEvidence({
    trace: [],
    capturedUntilMs: 0,
  });
const unfinishedImmediateRecord = createPistonOscillationRawMeasurementRecord({
  recordId: 'unfinished-immediate-recording',
  capturedAtMs: 0,
  measurementIndex: 0,
  targetHeightMm: 80,
  confirmedHeightMm: incompletePhysicsSnapshot.equilibrium.equilibriumHeightM * 1_000,
  sampleRateHz: SAMPLE_RATE_HZ,
  triggerThresholdKpa: 100,
  recordedDurationS: records[0].acquisitionSettings.recordedDurationS,
  recordingPath: 'immediate',
  releaseOffsetS: null,
  samples: records[0].samples,
  pressOperationEvidence: incompletePressOperationEvidence,
  sensorObservationSnapshot: records[0].sensorObservationSnapshot,
  physicsSnapshot: incompletePhysicsSnapshot,
});
assert.equal(unfinishedImmediateRecord.acquisitionSettings.releaseOffsetS, null);
assert.throws(
  () => createPistonOscillationRawMeasurementRecord({
    recordId: 'invalid-immediate-release',
    capturedAtMs: 0,
    measurementIndex: 0,
    targetHeightMm: 80,
    confirmedHeightMm: records[0].confirmedHeightMm,
    sampleRateHz: SAMPLE_RATE_HZ,
    triggerThresholdKpa: 100,
    recordedDurationS: records[0].acquisitionSettings.recordedDurationS,
    recordingPath: 'immediate',
    releaseOffsetS: records[0].acquisitionSettings.recordedDurationS + 0.001,
    samples: records[0].samples,
    pressOperationEvidence: records[0].pressOperationEvidence,
    sensorObservationSnapshot: records[0].sensorObservationSnapshot,
    physicsSnapshot: releasedImmediatePhysics,
  }),
  /recording path/,
);

const materiallessHistoricalRecord = structuredClone(records[0]) as unknown as Record<string, unknown>;
materiallessHistoricalRecord.schemaVersion = 4;
const materiallessHistoricalPhysics = materiallessHistoricalRecord.physicsSnapshot as Record<
  string,
  unknown
>;
delete materiallessHistoricalPhysics.gasMaterial;
delete materiallessHistoricalPhysics.equivalentLoss;
const restoredMateriallessRecord = normalizePistonOscillationRawMeasurementRecord(
  materiallessHistoricalRecord,
);
assert.ok(restoredMateriallessRecord);
assert.equal(restoredMateriallessRecord.physicsSnapshot.gasMaterial.provenance, 'legacy-inferred');
assert.equal(
  restoredMateriallessRecord.physicsSnapshot.gasMaterial.adiabaticIndex,
  records[0].physicsSnapshot.config.gamma,
);
assert.equal(restoredMateriallessRecord.physicsSnapshot.equivalentLoss.provenance, 'legacy-inferred');

const legacyAirFieldRecord = structuredClone(records[0]) as unknown as Record<string, unknown>;
legacyAirFieldRecord.schemaVersion = 5;
const legacyAirFieldPhysics = legacyAirFieldRecord.physicsSnapshot as Record<string, unknown>;
const legacyAirMaterial = {
  ...(legacyAirFieldPhysics.gasMaterial as Record<string, unknown>),
};
delete legacyAirMaterial.gasType;
legacyAirFieldPhysics.airMaterial = legacyAirMaterial;
delete legacyAirFieldPhysics.gasMaterial;
const restoredLegacyAirFieldRecord = normalizePistonOscillationRawMeasurementRecord(
  legacyAirFieldRecord,
);
assert.ok(restoredLegacyAirFieldRecord);
assert.equal(restoredLegacyAirFieldRecord.physicsSnapshot.gasMaterial.gasType, 'air');
assert.equal(
  restoredLegacyAirFieldRecord.physicsSnapshot.gasMaterial.modelVersion,
  PISTON_OSCILLATION_DRY_AIR_MATERIAL_MODEL_VERSION,
);
assert.equal(
  Object.hasOwn(restoredLegacyAirFieldRecord.physicsSnapshot, 'airMaterial'),
  false,
  'legacy airMaterial must be consumed at the read boundary and rewritten as gasMaterial',
);
assert.deepEqual(
  normalizePistonOscillationRawMeasurementRecord(restoredLegacyAirFieldRecord),
  restoredLegacyAirFieldRecord,
  'the airMaterial-to-gasMaterial migration must be idempotent',
);

const inconsistentMaterialRecord = structuredClone(records[0]) as unknown as Record<string, unknown>;
const inconsistentMaterialPhysics = inconsistentMaterialRecord.physicsSnapshot as Record<
  string,
  unknown
>;
inconsistentMaterialPhysics.gasMaterial = {
  schemaVersion: 1,
  gasType: 'air',
  modelVersion: 'legacy-physics-config-air-material',
  materialId: 'dry-air',
  adiabaticIndex: 1.3,
  provenance: 'legacy-inferred',
};
assert.equal(
  normalizePistonOscillationRawMeasurementRecord(inconsistentMaterialRecord),
  null,
  'a saved air property and the state-equation gamma must agree',
);

assert.throws(
  () => createPistonOscillationRawMeasurementRecord({
    recordId: 'duration-mismatch',
    capturedAtMs: 0,
    measurementIndex: 0,
    targetHeightMm: 80,
    confirmedHeightMm: records[0].confirmedHeightMm,
    sampleRateHz: SAMPLE_RATE_HZ,
    triggerThresholdKpa: 105,
    recordedDurationS: records[0].acquisitionSettings.recordedDurationS - 0.001,
    recordingPath: 'falling-trigger',
    releaseOffsetS: null,
    samples: records[0].samples,
    pressOperationEvidence: records[0].pressOperationEvidence,
    sensorObservationSnapshot: records[0].sensorObservationSnapshot,
    physicsSnapshot: records[0].physicsSnapshot,
  }),
  /every observation/,
);

const nonUniformCreationSamples = structuredClone(records[0].samples);
nonUniformCreationSamples[2]!.timeS += 0.0005;
assert.throws(
  () => createPistonOscillationRawMeasurementRecord({
    recordId: 'non-uniform-time',
    capturedAtMs: 0,
    measurementIndex: 0,
    targetHeightMm: 80,
    confirmedHeightMm: records[0].confirmedHeightMm,
    sampleRateHz: SAMPLE_RATE_HZ,
    triggerThresholdKpa: 105,
    recordedDurationS: records[0].acquisitionSettings.recordedDurationS,
    recordingPath: 'falling-trigger',
    releaseOffsetS: null,
    samples: nonUniformCreationSamples,
    pressOperationEvidence: records[0].pressOperationEvidence,
    sensorObservationSnapshot: records[0].sensorObservationSnapshot,
    physicsSnapshot: records[0].physicsSnapshot,
  }),
  /valid sensor observation/,
);

const invalidObservationPolicy = structuredClone(records[0]) as unknown as Record<string, unknown>;
(invalidObservationPolicy.sensorObservationSnapshot as Record<string, unknown>).pressureQuantization = 'round';
assert.equal(normalizePistonOscillationRawMeasurementRecord(invalidObservationPolicy), null);

const missingObservationPolicy = structuredClone(records[0]) as unknown as Record<string, unknown>;
delete missingObservationPolicy.sensorObservationSnapshot;
assert.equal(normalizePistonOscillationRawMeasurementRecord(missingObservationPolicy), null);

const missingCurrentPhysics = structuredClone(records[0]) as unknown as Record<string, unknown>;
delete missingCurrentPhysics.physicsSnapshot;
assert.equal(normalizePistonOscillationRawMeasurementRecord(missingCurrentPhysics), null);

const invalidCurrentMass = structuredClone(records[0]) as unknown as Record<string, unknown>;
const invalidCurrentPhysics = invalidCurrentMass.physicsSnapshot as Record<string, unknown>;
(invalidCurrentPhysics.config as Record<string, unknown>).movingMassKg = -0.035;
assert.equal(
  normalizePistonOscillationRawMeasurementRecord(invalidCurrentMass),
  null,
  'a non-physical mass must not enter restored gamma calculations',
);

const mismatchedPhysicalHeight = structuredClone(records[0]) as unknown as Record<string, unknown>;
mismatchedPhysicalHeight.confirmedHeightMm = 79.8;
assert.equal(
  normalizePistonOscillationRawMeasurementRecord(mismatchedPhysicalHeight),
  null,
  'the confirmed physical height must agree with the captured physics snapshot',
);

const mismatchedPhysicsSampleRate = structuredClone(records[0]) as unknown as Record<string, unknown>;
const mismatchedRatePhysics = mismatchedPhysicsSampleRate.physicsSnapshot as Record<string, unknown>;
(mismatchedRatePhysics.config as Record<string, unknown>).sensorSampleRateHz = 500;
assert.equal(
  normalizePistonOscillationRawMeasurementRecord(mismatchedPhysicsSampleRate),
  null,
  'the physics producer and formal sensor record must use the same sample rate',
);

const invalidObservedSample = structuredClone(records[0]) as unknown as Record<string, unknown>;
const invalidObservedSamples = invalidObservedSample.samples as Array<Record<string, unknown>>;
invalidObservedSamples[1].absolutePressureKpa = 100.001;
assert.equal(normalizePistonOscillationRawMeasurementRecord(invalidObservedSample), null);

const legacy = normalizePistonOscillationRawMeasurementRecord({
  schemaVersion: 1,
  measurementIndex: 0,
  targetHeightMm: 80,
  sampleRateHz: 1000,
  triggerThresholdKpa: 105,
  recordedDurationS: 0.001,
  samples: [
    { timeS: 0, pressureKpa: 104.809 },
    { timeS: 0.001, pressureKpa: 101.325 },
  ],
});
assert.ok(legacy);
assert.equal(legacy.schemaVersion, 7);
assert.equal(legacy.experimentContext, null);
assert.equal(legacy.pressOperationEvidence.provenance, 'legacy-unknown');
assert.equal(legacy.acquisitionSettings.recordingPath, 'falling-trigger');
assert.equal(legacy.acquisitionSettings.releaseOffsetS, null);
assert.equal(legacy.confirmedHeightMm, 80);
assert.equal(legacy.samples[0].timeS, 0);
assert.equal(legacy.samples[1].timeS, 0.001);
assert.equal(legacy.samples[0].absolutePressureKpa, 104.8);
assert.equal(legacy.samples[1].absolutePressureKpa, 101.32);
assert.equal(legacy.sensorObservationSnapshot.provenance, 'legacy-migrated');
assert.equal(legacy.sensorObservationSnapshot.sourceRecordSchemaVersion, 1);
assert.equal(legacy.physicsSnapshot.provenance, 'legacy-inferred');
assert.equal(legacy.physicsSnapshot.modelVersion, 'legacy-unknown');
assert.equal(legacy.physicsSnapshot.gasMaterial.provenance, 'legacy-inferred');
assert.equal(legacy.physicsSnapshot.gasMaterial.adiabaticIndex, 1.4);
assert.equal(legacy.physicsSnapshot.equivalentLoss.provenance, 'legacy-inferred');

const legacyWithMissingSamples = {
  schemaVersion: 1,
  measurementIndex: 0,
  targetHeightMm: 80,
  sampleRateHz: 1000,
  triggerThresholdKpa: 105,
  recordedDurationS: 0.1,
  samples: [
    { timeS: 0, pressureKpa: 104.809 },
    { timeS: 0.1, pressureKpa: 101.325 },
  ],
};
assert.equal(
  normalizePistonOscillationRawMeasurementRecord(legacyWithMissingSamples),
  null,
  'legacy migration must not invent unobserved samples across a time gap',
);

const currentWithMissingTail = structuredClone(records[0]) as unknown as Record<string, unknown>;
(currentWithMissingTail.samples as unknown[]).pop();
assert.equal(
  normalizePistonOscillationRawMeasurementRecord(currentWithMissingTail),
  null,
  'current records must contain every observation declared by their duration',
);

console.log('pistonOscillationDataProcessingModel tests passed');
