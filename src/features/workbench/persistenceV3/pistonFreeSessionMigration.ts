import {
  roundProductSignificantFiguresHalfEven,
} from '../../../domain/calculation/decimalHalfEven.ts';
import { parseNumericAnswerInput } from '../../../domain/calculation/numericAnswerValidation.ts';
import {
  createPistonOscillationCalculationSession,
  createPistonOscillationDataProcessingSession,
  normalizePistonOscillationDataProcessingSession,
  createPistonOscillationScoringPolicySnapshot,
  PISTON_OSCILLATION_CALCULATION_MODEL_VERSION,
  PISTON_OSCILLATION_LINEAR_FIT_ALGORITHM_VERSION,
  PISTON_OSCILLATION_DATA_PROCESSING_SCHEMA_VERSION,
  PISTON_OSCILLATION_PRIMARY_CYCLE_ELIGIBILITY_ALGORITHM_VERSION,
  PISTON_OSCILLATION_RAW_MEASUREMENT_SCHEMA_VERSION,
  type PistonOscillationRawMeasurementRecord,
} from '../../../domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import { PISTON_PRECISION_VERSION } from '../../../domain/pistonOscillation/pistonOscillationPrecisionModel.ts';
import { evaluatePistonUncertaintyEligibility } from '../../../domain/pistonOscillation/pistonOscillationUncertaintyEligibility.ts';
import { cleanPistonUncertaintySnapshot, LEGACY_PISTON_PRESSURE_METADATA } from '../../../domain/pistonOscillation/pistonUncertaintySnapshotMigration.ts';
import { PISTON_UNCERTAINTY_VERSION, PISTON_LEGACY_UNCERTAINTY_VERSION, PISTON_EXPANDED_UNCERTAINTY_VERSION, PISTON_STANDARD_UNCERTAINTY_VERSION, createPistonUncertaintyProfile } from '../../../domain/pistonOscillation/pistonOscillationUncertaintyModel.ts';
import {
  createPistonOscillationFreeExperimentContextSnapshot,
  normalizePistonOscillationFreeExperimentGroup,
  PISTON_OSCILLATION_REAL_PARAMETER_PROFILE_VERSION,
  type PistonOscillationFreeExperimentGroup,
} from '../../../domain/pistonOscillation/pistonOscillationFreeExperimentGroupModel.ts';
import {
  createPistonOscillationFreeParameterDraftFromMeasurement,
  normalizePistonOscillationFreeParameterDraft,
  normalizePistonOscillationFreeParameterSnapshot,
} from '../../../domain/pistonOscillation/pistonOscillationFreeParameterConfig.ts';
import {
  PISTON_OSCILLATION_FREE_EVENT_SCHEMA_VERSION,
  PISTON_OSCILLATION_FREE_SESSION_SCHEMA_VERSION,
} from '../../../domain/pistonOscillation/pistonOscillationFreeWorkflowModel.ts';
import {
  canonicalizeWorkbenchPersistenceV3Json,
} from './fingerprint.ts';

type JsonRecord = Record<string, unknown>;
const isRecord = (value: unknown): value is JsonRecord => (
  value !== null && typeof value === 'object' && !Array.isArray(value)
);
const equal = (left: unknown, right: unknown) => (
  canonicalizeWorkbenchPersistenceV3Json(left) === canonicalizeWorkbenchPersistenceV3Json(right)
);
const exactKeys = (value: unknown, keys: readonly string[]): value is JsonRecord => (
  isRecord(value) && Object.keys(value).length === keys.length
  && keys.every((key) => Object.hasOwn(value, key))
);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const nullableFinite = (value: unknown) => value === null || finite(value);
const periodFields = ['t1', 't2', 'period'] as const;
const calculationFields = ['area', 'gamma', 'relativeError'] as const;
const knownProcessingEvents = [
  'selection-finalized', 'endpoint-submitted', 'period-submitted', 'period-entry-revealed',
  'period-batch-submitted', 'answer-revealed', 'run-completed', 'run-advanced', 'run-reopened',
  'measurement-replaced', 'calculation-ready', 'fit-selection-toggled', 'fit-submitted',
  'calculation-answer-edited', 'calculation-step-submitted', 'calculation-field-revealed',
  'calculation-batch-submitted', 'calculation-answer-continued', 'calculation-answer-revealed',
  'calculation-completed',
] as const;

const isKnownEligibility = (value: unknown, measurement: PistonOscillationRawMeasurementRecord) => {
  if (!exactKeys(value, [
    'schemaVersion', 'algorithmVersion', 'rawMeasurementRecordId', 'status', 'reason',
    'analysisStartSampleIndex', 'analysisSampleCount', 'expectedHalfPeriodSamples',
    'smoothingWindowSamples', 'pressureRangeKpa', 'estimatedNoiseFloorKpa',
    'minimumPrimaryExcursionKpa', 'primaryPeriodCount', 'primaryExtrema',
  ]) || value.schemaVersion !== 1
    || value.algorithmVersion !== PISTON_OSCILLATION_PRIMARY_CYCLE_ELIGIBILITY_ALGORITHM_VERSION
    || value.rawMeasurementRecordId !== measurement.recordId
    || !['usable', 'unusable', 'indeterminate'].includes(value.status as string)
    || ![
      'primary-half-cycle-found', 'release-not-observed', 'insufficient-post-release-samples',
      'insufficient-primary-excursion', 'insufficient-primary-extrema', 'ambiguous-multiscale-extrema',
    ].includes(value.reason as string)
    || !Number.isSafeInteger(value.analysisStartSampleIndex)
    || !Number.isSafeInteger(value.analysisSampleCount)
    || !Number.isSafeInteger(value.smoothingWindowSamples)
    || (value.smoothingWindowSamples as number) < 1
    || !['expectedHalfPeriodSamples', 'pressureRangeKpa', 'estimatedNoiseFloorKpa', 'minimumPrimaryExcursionKpa']
      .every((key) => finite(value[key]) && value[key] >= 0)
    || !Array.isArray(value.primaryExtrema)) return false;
  const start = value.analysisStartSampleIndex as number;
  const count = value.analysisSampleCount as number;
  const analysisStartTimeS = measurement.acquisitionSettings.recordingPath === 'immediate'
    ? measurement.acquisitionSettings.releaseOffsetS ?? 0 : 0;
  const analysisSamples = measurement.samples.filter((sample) => sample.timeS >= analysisStartTimeS);
  const expectedStart = analysisSamples[0]?.sampleIndex ?? measurement.samples.at(-1)?.sampleIndex ?? 0;
  if (start < 0 || count < 0 || start + count > measurement.samples.length
    || start !== expectedStart || count !== analysisSamples.length
    || value.primaryPeriodCount !== Math.max(0, (value.primaryExtrema.length - 1) / 2)) return false;
  const extrema = value.primaryExtrema;
  if (value.status === 'usable'
    ? value.reason !== 'primary-half-cycle-found' || extrema.length < 2
    : value.status === 'indeterminate'
      ? value.reason !== 'ambiguous-multiscale-extrema' || extrema.length < 2
      : value.reason === 'primary-half-cycle-found' || value.reason === 'ambiguous-multiscale-extrema'
        || extrema.length !== 0) return false;
  return extrema.every((extremum, ordinal) => {
    if (!exactKeys(extremum, ['ordinal', 'sampleIndex', 'type', 'timeS', 'absolutePressureKpa'])
      || extremum.ordinal !== ordinal || !Number.isSafeInteger(extremum.sampleIndex)
      || (extremum.type !== 'peak' && extremum.type !== 'trough')) return false;
    const index = extremum.sampleIndex as number;
    const sample = measurement.samples[index];
    const previous = extrema[ordinal - 1] as JsonRecord | undefined;
    return index >= start && index < start + count && sample !== undefined
      && extremum.timeS === sample.timeS && extremum.absolutePressureKpa === sample.absolutePressureKpa
      && (!previous || (index > (previous.sampleIndex as number) && extremum.type !== previous.type));
  });
};

const isKnownProcessingAudit = (value: unknown, runCount: number, allowUncertainty = false) => (
  Array.isArray(value) && value.every((event) => {
    if (!exactKeys(event, ['id', 'atMs', 'type', 'runIndex', 'payload'])
      || typeof event.id !== 'string' || event.id.length === 0
      || !finite(event.atMs) || event.atMs < 0
      || !(knownProcessingEvents.includes(event.type as typeof knownProcessingEvents[number]) || (allowUncertainty && event.type === 'uncertainty-action'))
      || !Number.isInteger(event.runIndex) || !isRecord(event.payload)
      || !Object.values(event.payload).every((entry) => entry === null || typeof entry === 'string'
        || typeof entry === 'boolean' || finite(entry))) return false;
    const globalEvent = event.type === 'fit-submitted' || event.type === 'uncertainty-action'
      || ((event.type as string).startsWith('calculation-') && event.type !== 'calculation-ready');
    return globalEvent ? event.runIndex === -1
      : (event.runIndex as number) >= 0 && (event.runIndex as number) < runCount;
  })
);

const hasConsistentOutcomeFlags = (value: JsonRecord) => {
  if (value.outcome === 'correct') return value.numericCorrect === true && value.precisionCorrect === true;
  if (value.outcome === 'numeric-wrong') return value.numericCorrect === false && value.precisionCorrect === true;
  if (value.outcome === 'precision-wrong') return value.numericCorrect === true && value.precisionCorrect === false;
  return ['empty', 'invalid', 'wrong'].includes(value.outcome as string)
    && value.numericCorrect === false && value.precisionCorrect === false;
};

// Check the old evidence's own relationships without grading its numeric answer
// again. Input parsing is unchanged; historical tolerances are not consulted.
const isKnownAnswerAttempt = (value: unknown): value is JsonRecord => {
  if (!exactKeys(value, [
    'attemptIndex', 'attemptedAtMs', 'draftRaw', 'inputKnown', 'parsedValue',
    'outcome', 'numericCorrect', 'precisionCorrect',
  ]) || !Number.isSafeInteger(value.attemptIndex) || (value.attemptIndex as number) < 1) return false;
  if (value.outcome === 'unknown') {
    // The old normalizer synthesized absent history. The old batch model also
    // recorded known input with no judgement when an expected value was absent.
    return value.parsedValue === null && value.numericCorrect === null && value.precisionCorrect === null
      && (value.inputKnown === false
        ? value.draftRaw === null && value.attemptedAtMs === null
        : value.inputKnown === true && typeof value.draftRaw === 'string' && finite(value.attemptedAtMs));
  }
  if (value.inputKnown !== true || typeof value.draftRaw !== 'string'
    || !finite(value.attemptedAtMs) || !hasConsistentOutcomeFlags(value)) return false;
  const parsed = parseNumericAnswerInput(value.draftRaw);
  return parsed.status === 'valid'
    ? !['empty', 'invalid'].includes(value.outcome as string) && value.parsedValue === parsed.parsed.value
    : value.outcome === parsed.status && value.parsedValue === null;
};

const isKnownAnswer = (value: unknown, period: boolean) => {
  if (!exactKeys(value, [
    'draftRaw', 'expectedValue', 'status', 'feedback', 'attempts', 'resolution',
    ...(period ? ['attemptCount'] : []),
  ]) || typeof value.draftRaw !== 'string' || !nullableFinite(value.expectedValue)
    || !['unresolved', 'correct', 'revealed'].includes(value.status as string)
    || !Array.isArray(value.attempts) || !value.attempts.every(isKnownAnswerAttempt)
    || (period && value.attemptCount !== value.attempts.length)) return false;
  const attempts = value.attempts;
  const last = attempts.at(-1);
  const resolution = value.status === 'correct'
    ? attempts.length <= 1 ? 'first-correct' : 'retry-correct'
    : value.status === 'revealed'
      ? attempts.some((attempt) => attempt.parsedValue !== null)
        ? 'revealed-after-attempt' : 'revealed-without-valid-attempt'
      : null;
  if (value.resolution !== resolution
    || attempts.slice(0, -1).some((attempt) => attempt.outcome === 'correct')) return false;
  if (value.status === 'correct') {
    return value.feedback === null && finite(value.expectedValue) && last !== undefined
      && (last.outcome === 'unknown' || (last.outcome === 'correct' && value.draftRaw === last.draftRaw));
  }
  if (last?.outcome === 'correct') return false;
  if (value.status === 'revealed') {
    return value.feedback === null && finite(value.expectedValue) && last !== undefined;
  }
  if (value.feedback === null) return true; // Continue permits editing after an unsuccessful attempt.
  if (!exactKeys(value.feedback, ['outcome', 'numericCorrect', 'precisionCorrect'])
    || !hasConsistentOutcomeFlags(value.feedback) || value.feedback.outcome === 'correct') return false;
  // Older missing history cannot establish a feedback match; known history can.
  return last === undefined || last.outcome === 'unknown' || (
    value.draftRaw === last.draftRaw && value.feedback.outcome === last.outcome
    && value.feedback.numericCorrect === last.numericCorrect
    && value.feedback.precisionCorrect === last.precisionCorrect
  );
};

const isKnownBatchAttempts = (value: unknown, fields: readonly string[]) => (
  Array.isArray(value) && value.every((batch, index) => {
    if (!exactKeys(batch, ['attemptIndex', 'attemptedAtMs', 'fields', 'allCorrect'])
      || batch.attemptIndex !== index + 1 || !finite(batch.attemptedAtMs)
      || !exactKeys(batch.fields, fields)) return false;
    const snapshots = fields.map((field) => (batch.fields as JsonRecord)[field]);
    return snapshots.every(isKnownAnswerAttempt)
      && snapshots.every((attempt) => attempt.attemptIndex === batch.attemptIndex
        && attempt.attemptedAtMs === batch.attemptedAtMs)
      && batch.allCorrect === snapshots.every((attempt) => attempt.outcome === 'correct');
  })
);

const validRunIndices = (value: unknown, runCount: number): value is number[] => (
  Array.isArray(value) && value.every((index) => Number.isInteger(index) && index >= 0 && index < runCount)
  && new Set(value).size === value.length
);

const isKnownObsoleteCalculation = (value: unknown, runCount: number): value is JsonRecord => (
  exactKeys(value, [
    'schemaVersion', 'status', 'knowns', 'selectedRunIndices', 'activeFieldId',
    'visibleFieldIds', 'answers', 'batchAttempts', 'startedAtMs', 'completedAtMs',
  ]) && value.schemaVersion === 2
  && ['selecting-points', 'calculating', 'ready-to-exit', 'completed'].includes(value.status as string)
  && validRunIndices(value.selectedRunIndices, runCount)
  && (value.activeFieldId === null || calculationFields.includes(value.activeFieldId as typeof calculationFields[number]))
  && Array.isArray(value.visibleFieldIds)
  && value.visibleFieldIds.every((field, index) => field === calculationFields[index])
  && exactKeys(value.answers, calculationFields)
  && calculationFields.every((field) => isKnownAnswer((value.answers as JsonRecord)[field], false))
  && isKnownBatchAttempts(value.batchAttempts, calculationFields)
  && finite(value.startedAtMs) && nullableFinite(value.completedAtMs)
);

const isExactLegacyNegativeFit = (fit: JsonRecord) => {
  // ordinary-least-squares-v1 can emit a negative R² from floating-point
  // roundoff. Accept it only when all three saved values exactly reproduce
  // that version's operation order over the already validated original points.
  const points = fit.points as Array<{ periodSquaredS2: number; heightM: number }>;
  const meanX = points.reduce((sum, point) => sum + point.periodSquaredS2, 0) / points.length;
  const meanY = points.reduce((sum, point) => sum + point.heightM, 0) / points.length;
  let covariance = 0;
  let varianceX = 0;
  for (const point of points) {
    const deltaX = point.periodSquaredS2 - meanX;
    covariance += deltaX * (point.heightM - meanY);
    varianceX += deltaX ** 2;
  }
  if (!Number.isFinite(varianceX) || varianceX <= Number.EPSILON) return false;
  const slope = covariance / varianceX;
  const intercept = meanY - slope * meanX;
  const residualSumSquares = points.reduce((sum, point) => (
    sum + (point.heightM - (slope * point.periodSquaredS2 + intercept)) ** 2
  ), 0);
  const totalSumSquares = points.reduce((sum, point) => sum + (point.heightM - meanY) ** 2, 0);
  const rSquared = totalSumSquares <= Number.EPSILON
    ? residualSumSquares <= Number.EPSILON ? 1 : 0
    : 1 - residualSumSquares / totalSumSquares;
  return fit.slopeMPerS2 === slope && fit.interceptM === intercept && fit.rSquared === rSquared;
};

const isKnownObsoleteFit = (value: unknown, runs: JsonRecord[]) => value === null || (
  exactKeys(value, [
    'schemaVersion', 'algorithmVersion', 'slopeMPerS2', 'interceptM', 'rSquared',
    'selectedRunIndices', 'points', 'completedAtMs',
  ]) && value.schemaVersion === 1
  && value.algorithmVersion === 'ordinary-least-squares-v1'
  && finite(value.slopeMPerS2) && finite(value.interceptM) && finite(value.rSquared)
  && value.rSquared <= 1
  && finite(value.completedAtMs) && value.completedAtMs >= 0
  && validRunIndices(value.selectedRunIndices, runs.length) && value.selectedRunIndices.length >= 3
  && Array.isArray(value.points) && value.points.length === value.selectedRunIndices.length
  && value.points.every((point, index) => {
    if (!exactKeys(point, [
      'runIndex', 'measurementIndex', 'rawMeasurementRecordId', 'periodSquaredS2', 'heightMm', 'heightM',
    ])) return false;
    const selected = value.selectedRunIndices as number[];
    const run = runs[selected[index]!];
    return point.runIndex === selected[index] && (index === 0 || selected[index]! > selected[index - 1]!)
      && run !== undefined && isRecord(run.result)
      && point.measurementIndex === run.measurementIndex
      && point.rawMeasurementRecordId === run.rawMeasurementRecordId
      && point.periodSquaredS2 === run.result.periodSquaredS2
      && finite(run.targetHeightMm) && point.heightMm === run.targetHeightMm
      && point.heightM === run.targetHeightMm / 1000;
  })
  && (value.rSquared >= 0 || isExactLegacyNegativeFit(value))
);

const hasConsistentCalculationState = (processing: JsonRecord, calculation: JsonRecord) => {
  const fit = processing.linearFitResult;
  const answers = calculation.answers as JsonRecord;
  const allResolved = calculationFields.every((field) => (answers[field] as JsonRecord).status !== 'unresolved');
  const visibleFields = calculation.visibleFieldIds as string[];
  if (processing.status !== (calculation.status === 'completed' ? 'completed' : 'calculation-ready')
    || ((processing.runs as JsonRecord[]).some((run) => run.result === null))
    || (calculation.status === 'completed'
      ? !finite(calculation.completedAtMs) || calculation.completedAtMs < 0
      : calculation.completedAtMs !== null)) return false;
  if (calculation.status === 'selecting-points') {
    if (!isRecord(calculation.knowns) || !finite(calculation.knowns.cylinderDiameterM)) return false;
    // Free 8/9's pre-fit factory stored only this initial area expectation;
    // no draft or submitted evidence existed before a fit was accepted.
    const initialAreaM2 = Math.PI * calculation.knowns.cylinderDiameterM ** 2 / 4;
    return fit === null && calculation.activeFieldId === null && visibleFields.length === 0
      && (calculation.batchAttempts as unknown[]).length === 0
      && calculationFields.every((field) => {
        const answer = answers[field] as JsonRecord;
        return answer.status === 'unresolved' && answer.draftRaw === '' && answer.feedback === null
          && (answer.attempts as unknown[]).length === 0
          && answer.expectedValue === (field === 'area' ? initialAreaM2 : null);
      });
  }
  if (!isRecord(fit) || !equal(calculation.selectedRunIndices, fit.selectedRunIndices)) return false;
  if (calculation.status === 'calculating') {
    return !allResolved && visibleFields.length > 0 && calculation.activeFieldId === visibleFields.at(-1);
  }
  return allResolved && calculation.activeFieldId === null && equal(visibleFields, calculationFields);
};

const migrateMeasurement = (value: unknown, sourceVersion: 8 | 9) => {
  if (!isRecord(value) || value.schemaVersion !== (sourceVersion === 8 ? 5 : 6)
    || Object.hasOwn(value, 'experimentContext') || !isRecord(value.physicsSnapshot)) return false;
  if (sourceVersion === 8) {
    const physics = value.physicsSnapshot;
    if (!isRecord(physics.airMaterial) || Object.hasOwn(physics, 'gasMaterial')
      || Object.hasOwn(physics.airMaterial, 'gasType')) return false;
    physics.gasMaterial = { ...physics.airMaterial, gasType: 'air' };
    delete physics.airMaterial;
  }
  value.schemaVersion = PISTON_OSCILLATION_RAW_MEASUREMENT_SCHEMA_VERSION;
  return true;
};

const migrateProcessing = (
  value: unknown,
  sourceVersion: 8 | 9,
  measurements: PistonOscillationRawMeasurementRecord[],
) => {
  if (value === null) return true;
  if (!isRecord(value) || value.schemaVersion !== (sourceVersion === 8 ? 5 : 6)
    || !['period-processing', 'calculation-ready', 'completed'].includes(value.status as string)
    || Object.hasOwn(value, 'scoringPolicy') || !Array.isArray(value.runs)) return false;
  if (!value.runs.every(isRecord) || !isKnownObsoleteFit(value.linearFitResult, value.runs)
    || !isKnownProcessingAudit(value.audit, value.runs.length)) return false;
  if (!value.runs.every((run) => exactKeys(run.answers, periodFields)
    && periodFields.every((field) => isKnownAnswer((run.answers as JsonRecord)[field], true))
    && isKnownBatchAttempts(run.batchAttempts, periodFields))) return false;
  if (value.calculationSession !== null && (
    !isKnownObsoleteCalculation(value.calculationSession, value.runs.length)
    || !hasConsistentCalculationState(value, value.calculationSession)
  )) return false;
  value.schemaVersion = PISTON_OSCILLATION_DATA_PROCESSING_SCHEMA_VERSION;
  value.scoringPolicy = createPistonOscillationScoringPolicySnapshot(measurements);
  for (const run of value.runs) {
    if (!isRecord(run) || Object.hasOwn(run, 'fitHeightMm')) return false;
    run.fitHeightMm = run.targetHeightMm;
    if (run.result !== null) {
      if (!isRecord(run.result) || run.result.resultVersion !== 1 || !finite(run.result.periodS)
        || run.result.periodSquaredS2 !== run.result.periodS * run.result.periodS) return false;
      run.result.resultVersion = 2;
      run.result.periodSquaredS2 = roundProductSignificantFiguresHalfEven(run.result.periodS, run.result.periodS, 5);
    }
  }
  if (value.calculationSession === null) return value.linearFitResult === null;
  const calculation = value.calculationSession;
  if (!isKnownObsoleteCalculation(calculation, value.runs.length)
    || !isRecord(calculation.knowns) || !finite(value.updatedAtMs)) return false;
  const knowns = { ...calculation.knowns };
  if (knowns.modelVersion !== 'piston-slope-calculation-v1') return false;
  if (sourceVersion === 8) {
    if (knowns.schemaVersion !== 1 || Object.hasOwn(knowns, 'gasType')
      || Object.hasOwn(knowns, 'gasMaterialModelVersion') || Object.hasOwn(knowns, 'gasMaterialId')) return false;
    knowns.schemaVersion = 2;
    knowns.gasType = 'air';
    knowns.gasMaterialModelVersion = knowns.airMaterialModelVersion;
    knowns.gasMaterialId = knowns.airMaterialId;
    delete knowns.airMaterialModelVersion;
    delete knowns.airMaterialId;
  }
  knowns.modelVersion = PISTON_OSCILLATION_CALCULATION_MODEL_VERSION;
  const reset = createPistonOscillationCalculationSession(measurements, value.updatedAtMs);
  if (!equal(knowns, reset.knowns)) return false;
  // Only these named obsolete downstream algorithms may be invalidated.
  // Raw observations, endpoint/period answers, audit and every other field
  // remain in the candidate and must exactly match the current projection.
  value.linearFitResult = null;
  value.calculationSession = reset;
  value.status = 'calculation-ready';
  return true;
};

const hasObsoletePrecision = (value: JsonRecord) => isRecord(value.dataProcessing)
  && value.dataProcessing.schemaVersion === PISTON_OSCILLATION_DATA_PROCESSING_SCHEMA_VERSION
  && value.dataProcessing.precisionVersion === undefined;

const hasObsoleteTeaching = (value: JsonRecord) => isRecord(value.dataProcessing)
  && value.dataProcessing.schemaVersion === PISTON_OSCILLATION_DATA_PROCESSING_SCHEMA_VERSION
  && value.dataProcessing.precisionVersion === PISTON_PRECISION_VERSION
  && [PISTON_LEGACY_UNCERTAINTY_VERSION, PISTON_EXPANDED_UNCERTAINTY_VERSION, PISTON_STANDARD_UNCERTAINTY_VERSION].includes(value.dataProcessing.uncertaintyCourseVersion as typeof PISTON_LEGACY_UNCERTAINTY_VERSION);

// Only derived progress from the explicitly recognised obsolete courses is
// discarded. The outer exact comparison still protects all measured records,
// apparatus settings, operation history and other session authority.
const upgradeTeaching = (candidate: JsonRecord) => {
  if (!hasObsoleteTeaching(candidate) || !Array.isArray(candidate.savedMeasurements)
    || !finite(candidate.updatedAtMs)) return false;
  const processing = candidate.dataProcessing as JsonRecord;
  const isStandardCourse = processing.uncertaintyCourseVersion === PISTON_STANDARD_UNCERTAINTY_VERSION;
  const allowed = ['schemaVersion', 'precisionVersion', 'precisionNotice', 'uncertaintyCourseVersion', 'uncertaintyEligibility',
    'processingPolicy', 'scoringPolicy', 'status', 'activeRunIndex', 'runs', 'linearFitResult',
    'calculationSession', 'audit', 'startedAtMs', 'updatedAtMs'];
  if (Object.keys(processing).some(key => !allowed.includes(key))
    || !Array.isArray(processing.runs) || !Array.isArray(processing.audit)
    || !finite(processing.startedAtMs) || !finite(processing.updatedAtMs)
    || !['period-processing', 'calculation-ready', 'completed'].includes(processing.status as string)) return false;
  const fresh = createPistonOscillationDataProcessingSession(
    candidate.savedMeasurements as PistonOscillationRawMeasurementRecord[], candidate.updatedAtMs,
    { answerValidationMode: 'batch', includeUncertainty: true });
  if (!equal(processing.processingPolicy, fresh.processingPolicy)
    || !equal(processing.scoringPolicy, fresh.scoringPolicy)
    || processing.runs.length !== fresh.runs.length
    || !isKnownProcessingAudit(processing.audit, fresh.runs.length, true)) return false;
  for (const [index, value] of processing.runs.entries()) {
    if (!isRecord(value) || Object.keys(value).some(key => !Object.hasOwn(fresh.runs[index]!, key))
      || !exactKeys(value.answers, periodFields)
      || !periodFields.every(field => isKnownAnswer((value.answers as JsonRecord)[field], true))
      || !isKnownBatchAttempts(value.batchAttempts, periodFields)) return false;
    for (const key of ['rawMeasurementRecordId', 'measurementIndex', 'targetHeightMm', 'fitHeightMm', 'sampleRateHz'] as const) {
      if (value[key] !== fresh.runs[index]![key]) return false;
    }
  }
  if (processing.linearFitResult !== null) {
    const fit = processing.linearFitResult;
    if (!exactKeys(fit, ['schemaVersion', 'algorithmVersion', 'precisionPlan', 'slopeMPerS2', 'interceptM', 'rSquared', 'selectedRunIndices', 'completedAtMs', 'points'])
      || fit.schemaVersion !== 1 || fit.algorithmVersion !== PISTON_OSCILLATION_LINEAR_FIT_ALGORITHM_VERSION
      || !isRecord(fit.precisionPlan) || fit.precisionPlan.version !== PISTON_PRECISION_VERSION) return false;
  }
  if (processing.calculationSession !== null) {
    const calculation = processing.calculationSession;
    if (!isRecord(calculation) || !isRecord(calculation.uncertainty)
      || Object.keys(calculation).some(key => !['schemaVersion', 'status', 'knowns', 'selectedRunIndices',
        'activeFieldId', 'visibleFieldIds', 'answers', 'batchAttempts', 'startedAtMs', 'completedAtMs', 'uncertainty'].includes(key))) return false;
    const expectedKnowns = createPistonOscillationCalculationSession(
      candidate.savedMeasurements as PistonOscillationRawMeasurementRecord[], candidate.updatedAtMs, true).knowns;
    if (calculation.schemaVersion !== 2 || !equal(calculation.knowns, expectedKnowns)
      || !['selecting-points', 'calculating', 'ready-to-exit', 'completed'].includes(calculation.status as string)
      || !exactKeys(calculation.answers, calculationFields)
      || !calculationFields.every(field => {
        const value = (calculation.answers as JsonRecord)[field];
        if (!isRecord(value)) return false;
        const { significantFigures, ...answer } = value;
        return (significantFigures === undefined || (Number.isInteger(significantFigures) && Number(significantFigures) >= 2 && Number(significantFigures) <= 12))
          && isKnownAnswer(answer, false);
      }) || !isKnownBatchAttempts(calculation.batchAttempts, calculationFields)) return false;
    const course = calculation.uncertainty;
    if (!exactKeys(course, ['version', 'profile', 'fingerprint', 'readPhases', 'answers', 'resetNotice'])
      || course.version !== processing.uncertaintyCourseVersion || typeof course.fingerprint !== 'string'
      || typeof course.resetNotice !== 'boolean' || !Array.isArray(course.readPhases)
      || course.readPhases.some(phase => !['A', 'B', 'C'].includes(phase as string))) return false;
    const { pressureStandardPa: _given, ...profile } = createPistonUncertaintyProfile();
    const isV1 = course.version === PISTON_LEGACY_UNCERTAINTY_VERSION;
    const oldProfile = isV1
      ? { ...profile, ...LEGACY_PISTON_PRESSURE_METADATA, coverage: 2, version: PISTON_LEGACY_UNCERTAINTY_VERSION }
      : isStandardCourse
        ? { ...createPistonUncertaintyProfile(), version: PISTON_STANDARD_UNCERTAINTY_VERSION }
        : { ...createPistonUncertaintyProfile(), coverage: 2, version: PISTON_EXPANDED_UNCERTAINTY_VERSION };
    if (!equal(course.profile, oldProfile)) return false;
    const fields = isV1 ? ['residual', 'slopeA', 'gammaA', 'mass', 'diameter', 'pressureCalibration', 'pressureReadout',
      'pressure', 'heightScale', 'timeScale', 'heightReadout', 'slopeReadout', 'slopeSupplement', 'slopeB',
      'gammaB', 'combined', 'relative', 'expanded', 'result']
      : ['meanX', 'sxx', 'residual', 'slopeA', 'gammaA', 'mass', 'diameter', 'gammaB', 'combined', 'relative', isStandardCourse ? 'reportCombined' : 'expanded', 'result'];
    // Recognise snapshots with and without the preliminary fit-statistic exercises.
    const answerFields = !isV1 && exactKeys(course.answers, fields.filter(field => !['meanX', 'sxx'].includes(field)))
      ? fields.filter(field => !['meanX', 'sxx'].includes(field)) : fields;
    if (!exactKeys(course.answers, answerFields) || !answerFields.every(field => {
      const answer = (course.answers as JsonRecord)[field];
      return exactKeys(answer, ['draft', 'status', 'feedback', 'attempts']) && typeof answer.draft === 'string'
        && ['unresolved', 'correct', 'revealed'].includes(answer.status as string)
        && (answer.feedback === null || ['empty', 'invalid', 'numeric-wrong', 'precision-wrong'].includes(answer.feedback as string))
        && Array.isArray(answer.attempts) && answer.attempts.every(attempt => exactKeys(attempt, ['atMs', 'raw', 'outcome'])
          && finite(attempt.atMs) && typeof attempt.raw === 'string'
          && ['correct', 'revealed', 'empty', 'invalid', 'numeric-wrong', 'precision-wrong'].includes(attempt.outcome as string));
    })) return false;
  }
  if (isStandardCourse) {
    // Only the uncertainty course changed. Retain every period, fit and base
    // calculation; the exact comparison rejects any other normalization repair.
    const normalized = normalizePistonOscillationDataProcessingSession(processing,
      candidate.savedMeasurements as PistonOscillationRawMeasurementRecord[], candidate.updatedAtMs,
      { answerValidationMode: 'batch', includeUncertainty: true,
        uncertaintyEligibility: processing.uncertaintyEligibility as ReturnType<typeof evaluatePistonUncertaintyEligibility> | undefined });
    if (!normalized) return false;
    const retained = { ...processing, uncertaintyCourseVersion: PISTON_UNCERTAINTY_VERSION,
      status: normalized.status,
      calculationSession: isRecord(processing.calculationSession) && normalized.calculationSession
        ? { ...processing.calculationSession, uncertainty: normalized.calculationSession.uncertainty,
            status: normalized.calculationSession.status, completedAtMs: normalized.calculationSession.completedAtMs }
        : processing.calculationSession };
    if (!equal(retained, normalized)) return false;
    candidate.dataProcessing = retained;
    return true;
  }
  candidate.dataProcessing = { ...fresh, precisionNotice: 'teaching-updated' };
  return true;
};

// Validate the old calculation evidence before replacing only that obsolete
// progress. Everything outside dataProcessing still requires exact equality.
const upgradeProcessingPrecision = (candidate: JsonRecord) => {
  if (candidate.dataProcessing === null) return true;
  if (!hasObsoletePrecision(candidate) || !Array.isArray(candidate.savedMeasurements)
    || !finite(candidate.updatedAtMs)) return false;
  const original = candidate.dataProcessing as JsonRecord;
  const legacy = JSON.parse(canonicalizeWorkbenchPersistenceV3Json(original)) as JsonRecord;
  delete legacy.uncertaintyEligibility;
  if (legacy.uncertaintyCourseVersion !== undefined) {
    if (![PISTON_UNCERTAINTY_VERSION, PISTON_LEGACY_UNCERTAINTY_VERSION, PISTON_EXPANDED_UNCERTAINTY_VERSION, PISTON_STANDARD_UNCERTAINTY_VERSION].includes(legacy.uncertaintyCourseVersion as typeof PISTON_UNCERTAINTY_VERSION)) return false;
    delete legacy.uncertaintyCourseVersion;
    if (isRecord(legacy.calculationSession) && legacy.calculationSession.uncertainty !== undefined) {
      if (!isRecord(legacy.calculationSession.uncertainty)
        || legacy.calculationSession.uncertainty.version !== original.uncertaintyCourseVersion) return false;
      delete legacy.calculationSession.uncertainty;
    }
  }
  const saved = candidate.savedMeasurements as PistonOscillationRawMeasurementRecord[];
  const normalized = normalizePistonOscillationDataProcessingSession(legacy, saved, candidate.updatedAtMs,
    { answerValidationMode: 'batch' });
  if ([PISTON_UNCERTAINTY_VERSION, PISTON_LEGACY_UNCERTAINTY_VERSION, PISTON_EXPANDED_UNCERTAINTY_VERSION, PISTON_STANDARD_UNCERTAINTY_VERSION].includes(original.uncertaintyCourseVersion as typeof PISTON_UNCERTAINTY_VERSION) && normalized) {
    // The old course could hold an otherwise finished base calculation open.
    if (!['period-processing', 'calculation-ready', 'completed'].includes(legacy.status as string)) return false;
    legacy.status = normalized.status;
    if (isRecord(legacy.calculationSession) && normalized.calculationSession) {
      if (!['selecting-points', 'calculating', 'ready-to-exit', 'completed'].includes(legacy.calculationSession.status as string)) return false;
      legacy.calculationSession.status = normalized.calculationSession.status;
    }
  }
  if (!equal(legacy, normalized)) return false;
  candidate.dataProcessing = {
    ...createPistonOscillationDataProcessingSession(saved, candidate.updatedAtMs,
      { answerValidationMode: 'batch', includeUncertainty: true }),
    precisionNotice: 'upgraded',
  };
  return true;
};

// Validate the previous course before applying the new scope. This permits only
// derived eligibility/course changes, never repairs to measurement authority.
const migrateUncertaintyEligibility = (candidate: JsonRecord) => {
  if (candidate.dataProcessing === null) return true;
  if (!isRecord(candidate.dataProcessing) || !isRecord(candidate.experimentGroup)
    || !Array.isArray(candidate.savedMeasurements) || !finite(candidate.updatedAtMs)) return false;
  const { uncertaintyEligibility: _oldEligibility, ...previous } = candidate.dataProcessing;
  const records = candidate.savedMeasurements as PistonOscillationRawMeasurementRecord[];
  const options = { answerValidationMode: 'batch' as const,
    unifiedPrecision: previous.precisionVersion === PISTON_PRECISION_VERSION,
    includeUncertainty: previous.uncertaintyCourseVersion === PISTON_UNCERTAINTY_VERSION };
  const validated = normalizePistonOscillationDataProcessingSession(previous, records, candidate.updatedAtMs, options);
  if (!equal(previous, validated)) return false;
  const eligibility = evaluatePistonUncertaintyEligibility(candidate.experimentGroup as unknown as PistonOscillationFreeExperimentGroup);
  candidate.dataProcessing = normalizePistonOscillationDataProcessingSession(previous, records, candidate.updatedAtMs,
    { ...options, unifiedPrecision: true, includeUncertainty: eligibility.eligible, uncertaintyEligibility: eligibility });
  return true;
};

const hasObsoleteEligibility = (value: JsonRecord) => {
  if (!isRecord(value.dataProcessing) || !isRecord(value.experimentGroup)) return false;
  try {
    const expected = evaluatePistonUncertaintyEligibility(value.experimentGroup as unknown as PistonOscillationFreeExperimentGroup);
    return value.dataProcessing.uncertaintyEligibility === undefined
      || !equal(value.dataProcessing.uncertaintyEligibility, expected)
      || (value.dataProcessing.uncertaintyCourseVersion === PISTON_UNCERTAINTY_VERSION) !== expected.eligible;
  } catch { return false; }
};

export const isKnownPistonFreeSessionMigrationSource = (value: unknown) => (
  isRecord(value) && (value.schemaVersion === 8 || value.schemaVersion === 9
    || (value.schemaVersion === PISTON_OSCILLATION_FREE_SESSION_SCHEMA_VERSION && (hasObsoletePrecision(value) || hasObsoleteTeaching(value)
      || cleanPistonUncertaintySnapshot(value.dataProcessing) !== value.dataProcessing || hasObsoleteEligibility(value))))
);

/**
 * Allows the explicit Free 8/9 -> 10 domain changes. This is a whitelist
 * comparison, not a permissive normalization: unknown or altered authority
 * survives in the candidate and fails the final exact comparison.
 */
export const isAllowedPistonFreeSessionMigration = (source: unknown, canonical: unknown) => {
  if (!isRecord(source) || !isKnownPistonFreeSessionMigrationSource(source)
    || !isRecord(canonical) || canonical.schemaVersion !== PISTON_OSCILLATION_FREE_SESSION_SCHEMA_VERSION) return false;
  try {
    const candidate = JSON.parse(canonicalizeWorkbenchPersistenceV3Json(source)) as JsonRecord;
    const sourceVersion = source.schemaVersion;
    if (sourceVersion === PISTON_OSCILLATION_FREE_SESSION_SCHEMA_VERSION) {
      const cleaned = cleanPistonUncertaintySnapshot(candidate.dataProcessing);
      candidate.dataProcessing = cleaned;
      if (hasObsoleteTeaching(candidate) && !upgradeTeaching(candidate)) return false;
      if (hasObsoletePrecision(candidate) && !upgradeProcessingPrecision(candidate)) return false;
      return migrateUncertaintyEligibility(candidate) && equal(candidate, canonical);
    }
    if (sourceVersion !== 8 && sourceVersion !== 9) return false;
    if (!Array.isArray(candidate.savedMeasurements) || !Array.isArray(candidate.excludedAttempts)
      || !Array.isArray(candidate.audit)) return false;
    const measurements = [...candidate.savedMeasurements];
    if (candidate.acquisitionCandidate !== null) measurements.push(candidate.acquisitionCandidate);
    for (const attempt of candidate.excludedAttempts) {
      if (!isRecord(attempt)) return false;
      measurements.push(attempt.measurement);
    }
    if (!measurements.every((measurement) => migrateMeasurement(measurement, sourceVersion))) return false;
    const saved = candidate.savedMeasurements as PistonOscillationRawMeasurementRecord[];
    if (!isRecord(candidate.primaryCycleEligibilityByRecordId)
      || Object.keys(candidate.primaryCycleEligibilityByRecordId).length !== saved.length
      || !saved.every((measurement) => isKnownEligibility(
        (candidate.primaryCycleEligibilityByRecordId as JsonRecord)[measurement.recordId], measurement,
      ))) return false;
    if (!candidate.excludedAttempts.every((attempt) => isRecord(attempt) && (
      attempt.primaryCycleEligibility === null || isKnownEligibility(
        attempt.primaryCycleEligibility, attempt.measurement as PistonOscillationRawMeasurementRecord,
      )
    ))) return false;
    let group: PistonOscillationFreeExperimentGroup;
    if (sourceVersion === 8) {
      if (Object.hasOwn(candidate, 'experimentGroup') || !Object.hasOwn(candidate, 'frozenParameterSnapshot')) return false;
      const frozen = normalizePistonOscillationFreeParameterSnapshot(candidate.frozenParameterSnapshot);
      if (!equal(frozen, candidate.frozenParameterSnapshot)) return false;
      const parameters = normalizePistonOscillationFreeParameterDraft(candidate.parameterDraft);
      if (!equal(parameters, candidate.parameterDraft)) return false;
      if (candidate.startedAtMs !== null && !finite(candidate.startedAtMs)) return false;
      const irreversibleEvent = candidate.audit.find((event) => isRecord(event) && (
        ['acquisition-excluded', 'measurement-saved', 'measurement-deleted'].includes(event.type as string)
        || (event.type === 'operation-observed' && ['startAcquisition', 'redoAcquisition', 'bottomImpact'].includes(event.operation as string))
      )) as JsonRecord | undefined;
      const acquisition = isRecord(candidate.acquisitionCandidate) ? candidate.acquisitionCandidate : null;
      const firstExcluded = candidate.excludedAttempts[0] as JsonRecord | undefined;
      group = normalizePistonOscillationFreeExperimentGroup(undefined, {
        fallbackGroupId: `piston-free-group:legacy:${candidate.startedAtMs ?? 0}`,
        fallbackCreatedAtMs: candidate.startedAtMs as number | null,
        fallbackParameters: frozen?.parameters ?? (saved[0]
          ? createPistonOscillationFreeParameterDraftFromMeasurement(saved[0]) : parameters),
        fallbackGasMaterialSnapshot: saved[0]?.physicsSnapshot.gasMaterial,
        legacyParameterSnapshot: frozen,
        forceLock: frozen !== null || measurements.length > 0 || candidate.reacquisition !== null
          || candidate.dataProcessing !== null || irreversibleEvent !== undefined,
        forceLockAtMs: (irreversibleEvent?.occurredAtMs ?? acquisition?.capturedAtMs
          ?? saved[0]?.capturedAtMs ?? firstExcluded?.excludedAtMs ?? candidate.startedAtMs ?? 0) as number,
      });
      candidate.experimentGroup = group;
      delete candidate.frozenParameterSnapshot;
    } else {
      if (!isRecord(candidate.experimentGroup) || Object.hasOwn(candidate, 'frozenParameterSnapshot')) return false;
      group = candidate.experimentGroup as unknown as PistonOscillationFreeExperimentGroup;
    }
    if (group.scheme !== 'real' || group.gasMaterialSnapshot.gasType !== 'air'
      || group.parameterProfileVersion !== PISTON_OSCILLATION_REAL_PARAMETER_PROFILE_VERSION) return false;
    for (const measurement of measurements) {
      (measurement as JsonRecord).experimentContext = createPistonOscillationFreeExperimentContextSnapshot(group, 'legacy-inferred');
    }
    for (const event of candidate.audit) {
      if (!isRecord(event) || event.schemaVersion !== (sourceVersion === 8 ? 2 : 3)) return false;
      event.schemaVersion = PISTON_OSCILLATION_FREE_EVENT_SCHEMA_VERSION;
    }
    if (!migrateProcessing(candidate.dataProcessing, sourceVersion, saved)) return false;
    if (!upgradeProcessingPrecision(candidate)) return false;
    candidate.schemaVersion = PISTON_OSCILLATION_FREE_SESSION_SCHEMA_VERSION;
    return migrateUncertaintyEligibility(candidate) && equal(candidate, canonical);
  } catch {
    return false;
  }
};
