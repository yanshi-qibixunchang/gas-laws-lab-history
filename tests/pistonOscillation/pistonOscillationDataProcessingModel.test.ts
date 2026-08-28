import assert from 'node:assert/strict';
import {
  advancePistonOscillationPeriodRun,
  completePistonOscillationCalculation,
  continuePistonOscillationCalculationAnswer,
  continuePistonOscillationPeriodAnswer,
  createPistonOscillationDataProcessingSession,
  createPistonOscillationPeriodSelection,
  createPistonOscillationRawMeasurementRecord,
  findPistonOscillationExtrema,
  formatPistonOscillationCalculationAnswer,
  formatPistonOscillationPeriod,
  normalizePistonOscillationDataProcessingSession,
  normalizePistonOscillationRawMeasurementRecord,
  revealPistonOscillationCalculationAnswer,
  revealPistonOscillationPeriodAnswer,
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
  DEFAULT_PISTON_OSCILLATION_PHYSICS_CONFIG,
  PISTON_OSCILLATION_PHYSICS_MODEL_VERSION,
  createPistonOscillationEquilibriumState,
} from '../../src/domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';
import {
  PISTON_OSCILLATION_AIR_ADIABATIC_INDEX,
  PISTON_OSCILLATION_AIR_MATERIAL_MODEL_VERSION,
  createPistonOscillationAirMaterialSnapshot,
} from '../../src/domain/pistonOscillation/pistonOscillationAirMaterialModel.ts';
import {
  PISTON_OSCILLATION_TEMPORARY_EQUIVALENT_LOSS_MODEL_VERSION,
  createPistonOscillationEquivalentLossSnapshot,
} from '../../src/domain/pistonOscillation/pistonOscillationEquivalentLossModel.ts';

const SAMPLE_RATE_HZ = 1_000;
const PERIOD_SAMPLES = [40, 36, 32] as const;

const createPhysicsSnapshot = (targetHeightMm: number) => ({
  modelVersion: PISTON_OSCILLATION_PHYSICS_MODEL_VERSION,
  provenance: 'captured' as const,
  airMaterial: createPistonOscillationAirMaterialSnapshot(),
  equivalentLoss: createPistonOscillationEquivalentLossSnapshot(),
  config: { ...DEFAULT_PISTON_OSCILLATION_PHYSICS_CONFIG },
  equilibrium: createPistonOscillationEquilibriumState(targetHeightMm),
  initialDisplacementM: 0.004,
  initialVelocityMPerS: 0,
  integrationSubstepsPerSample: 4,
  triggerTimeS: 0.003,
});

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
  return createPistonOscillationRawMeasurementRecord({
    recordId: `processing-${measurementIndex}`,
    capturedAtMs: 1_000 + measurementIndex,
    measurementIndex,
    targetHeightMm,
    confirmedHeightMm: targetHeightMm,
    sampleRateHz: SAMPLE_RATE_HZ,
    triggerThresholdKpa: 105,
    recordedDurationS: periodSamples * 4 / SAMPLE_RATE_HZ,
    samples,
    physicsSnapshot: createPhysicsSnapshot(targetHeightMm),
  });
};

const records = [
  createOscillationRecord(0, 80, PERIOD_SAMPLES[0]),
  createOscillationRecord(1, 70, PERIOD_SAMPLES[1]),
  createOscillationRecord(2, 60, PERIOD_SAMPLES[2]),
];
assert.equal(
  records[0].physicsSnapshot.airMaterial.modelVersion,
  PISTON_OSCILLATION_AIR_MATERIAL_MODEL_VERSION,
);
assert.equal(
  records[0].physicsSnapshot.airMaterial.adiabaticIndex,
  PISTON_OSCILLATION_AIR_ADIABATIC_INDEX,
);
assert.equal(
  records[0].physicsSnapshot.equivalentLoss.modelVersion,
  PISTON_OSCILLATION_TEMPORARY_EQUIVALENT_LOSS_MODEL_VERSION,
);

const mismatchedAirMaterialRecords = structuredClone(records);
mismatchedAirMaterialRecords[2]!.physicsSnapshot.airMaterial = {
  ...mismatchedAirMaterialRecords[2]!.physicsSnapshot.airMaterial,
  modelVersion: 'another-saved-air-material-version',
  provenance: 'legacy-inferred',
};
assert.throws(
  () => createPistonOscillationDataProcessingSession(mismatchedAirMaterialRecords, 1_999),
  /same saved air material/,
  'runs produced by different saved air materials must not enter one fit',
);
assert.equal(
  normalizePistonOscillationDataProcessingSession(null, mismatchedAirMaterialRecords, 1_999),
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

const fractionalGridSamples: PistonOscillationRawSample[] = Array.from(
  { length: 124 },
  (_, sampleIndex) => ({
    sampleIndex,
    timeS: sampleIndex / SAMPLE_RATE_HZ,
    absolutePressureKpa: 101.325 + Math.cos(2 * Math.PI * sampleIndex / 30.5),
  }),
);
const fractionalGridRecord = createPistonOscillationRawMeasurementRecord({
  recordId: 'fractional-grid-period',
  capturedAtMs: 1_500,
  measurementIndex: 0,
  targetHeightMm: 80,
  confirmedHeightMm: 80,
  sampleRateHz: SAMPLE_RATE_HZ,
  triggerThresholdKpa: 105,
  recordedDurationS: 0.123,
  samples: fractionalGridSamples,
  physicsSnapshot: createPhysicsSnapshot(80),
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
  0.03067 ** 2,
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
assert.equal(processing.processingPolicy.guidedMinimumPeriodCount, 3);
assert.equal(processing.processingPolicy.freeMinimumPeriodCount, 0.5);
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

const areaExpected = calculationProcessing.calculationSession!.answers.area.expectedValue!;
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
tamperedKnowns.airMaterialModelVersion = 'tampered-material';
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
  PISTON_OSCILLATION_AIR_ADIABATIC_INDEX,
  'restoration must derive the relative-error reference from the raw material snapshot',
);
assert.equal(
  restoredCalculation.calculationSession?.knowns.airMaterialModelVersion,
  PISTON_OSCILLATION_AIR_MATERIAL_MODEL_VERSION,
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
  'ordinary-least-squares-v1',
  'the only pre-versioned fit representation must migrate explicitly to OLS v1',
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
assert.equal(invalidPolicyRestored?.processingPolicy.guidedMinimumPeriodCount, 3);
assert.equal(invalidPolicyRestored?.processingPolicy.freeMinimumPeriodCount, 0.5);

const oldSessionWithoutPolicy = structuredClone(processing) as unknown as Record<string, unknown>;
delete oldSessionWithoutPolicy.processingPolicy;
const oldSessionRestored = normalizePistonOscillationDataProcessingSession(
  oldSessionWithoutPolicy,
  records,
  3_470,
);
assert.equal(oldSessionRestored?.processingPolicy.guidedMinimumPeriodCount, 3);

const validCurrentRecord = normalizePistonOscillationRawMeasurementRecord(
  structuredClone(records[0]),
);
assert.ok(validCurrentRecord);
assert.equal(validCurrentRecord.schemaVersion, 3);
assert.equal(validCurrentRecord.acquisitionSettings.recordingPath, 'falling-trigger');
assert.equal(validCurrentRecord.acquisitionSettings.releaseOffsetS, null);

const immediateRecord = createPistonOscillationRawMeasurementRecord({
  recordId: 'immediate-recording',
  capturedAtMs: 0,
  measurementIndex: 0,
  targetHeightMm: 80,
  confirmedHeightMm: 80,
  sampleRateHz: SAMPLE_RATE_HZ,
  triggerThresholdKpa: 100,
  recordedDurationS: records[0].acquisitionSettings.recordedDurationS,
  recordingPath: 'immediate',
  releaseOffsetS: 0.02,
  samples: records[0].samples,
  physicsSnapshot: {
    ...createPhysicsSnapshot(80),
    triggerTimeS: null,
  },
});
assert.equal(immediateRecord.acquisitionSettings.recordingPath, 'immediate');
assert.equal(immediateRecord.acquisitionSettings.releaseOffsetS, 0.02);
assert.equal(immediateRecord.physicsSnapshot.triggerTimeS, null);
const unfinishedImmediateRecord = createPistonOscillationRawMeasurementRecord({
  recordId: 'unfinished-immediate-recording',
  capturedAtMs: 0,
  measurementIndex: 0,
  targetHeightMm: 80,
  confirmedHeightMm: 80,
  sampleRateHz: SAMPLE_RATE_HZ,
  triggerThresholdKpa: 100,
  recordedDurationS: records[0].acquisitionSettings.recordedDurationS,
  recordingPath: 'immediate',
  releaseOffsetS: null,
  samples: records[0].samples,
  physicsSnapshot: {
    ...createPhysicsSnapshot(80),
    triggerTimeS: null,
  },
});
assert.equal(unfinishedImmediateRecord.acquisitionSettings.releaseOffsetS, null);
assert.throws(
  () => createPistonOscillationRawMeasurementRecord({
    recordId: 'invalid-immediate-release',
    capturedAtMs: 0,
    measurementIndex: 0,
    targetHeightMm: 80,
    confirmedHeightMm: 80,
    sampleRateHz: SAMPLE_RATE_HZ,
    triggerThresholdKpa: 100,
    recordedDurationS: records[0].acquisitionSettings.recordedDurationS,
    recordingPath: 'immediate',
    releaseOffsetS: records[0].acquisitionSettings.recordedDurationS + 0.001,
    samples: records[0].samples,
    physicsSnapshot: {
      ...createPhysicsSnapshot(80),
      triggerTimeS: null,
    },
  }),
  /recording path/,
);

const materiallessHistoricalRecord = structuredClone(records[0]) as unknown as Record<string, unknown>;
const materiallessHistoricalPhysics = materiallessHistoricalRecord.physicsSnapshot as Record<
  string,
  unknown
>;
delete materiallessHistoricalPhysics.airMaterial;
delete materiallessHistoricalPhysics.equivalentLoss;
const restoredMateriallessRecord = normalizePistonOscillationRawMeasurementRecord(
  materiallessHistoricalRecord,
);
assert.ok(restoredMateriallessRecord);
assert.equal(restoredMateriallessRecord.physicsSnapshot.airMaterial.provenance, 'legacy-inferred');
assert.equal(
  restoredMateriallessRecord.physicsSnapshot.airMaterial.adiabaticIndex,
  records[0].physicsSnapshot.config.gamma,
);
assert.equal(restoredMateriallessRecord.physicsSnapshot.equivalentLoss.provenance, 'legacy-inferred');

const inconsistentMaterialRecord = structuredClone(records[0]) as unknown as Record<string, unknown>;
const inconsistentMaterialPhysics = inconsistentMaterialRecord.physicsSnapshot as Record<
  string,
  unknown
>;
inconsistentMaterialPhysics.airMaterial = {
  schemaVersion: 1,
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
    confirmedHeightMm: 80,
    sampleRateHz: SAMPLE_RATE_HZ,
    triggerThresholdKpa: 105,
    recordedDurationS: records[0].acquisitionSettings.recordedDurationS - 0.001,
    samples: records[0].samples,
    physicsSnapshot: createPhysicsSnapshot(80),
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
    confirmedHeightMm: 80,
    sampleRateHz: SAMPLE_RATE_HZ,
    triggerThresholdKpa: 105,
    recordedDurationS: records[0].acquisitionSettings.recordedDurationS,
    samples: nonUniformCreationSamples,
    physicsSnapshot: createPhysicsSnapshot(80),
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
assert.equal(legacy.schemaVersion, 3);
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
assert.equal(legacy.physicsSnapshot.airMaterial.provenance, 'legacy-inferred');
assert.equal(legacy.physicsSnapshot.airMaterial.adiabaticIndex, 1.4);
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
