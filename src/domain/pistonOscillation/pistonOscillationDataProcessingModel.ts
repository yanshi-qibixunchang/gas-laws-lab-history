import {
  formatNumericAnswerReference,
  parseNumericAnswerInput,
  validateNumericAnswer,
  type NumericAnswerSpec,
} from '../calculation/numericAnswerValidation.ts';
import {
  roundDecimalPlacesHalfEven,
  roundProductSignificantFiguresHalfEven,
  roundRatioSignificantFiguresHalfEven,
  roundSignificantFiguresHalfEven,
} from '../calculation/decimalHalfEven.ts';
import {
  DEFAULT_PISTON_OSCILLATION_PHYSICS_CONFIG,
  PISTON_OSCILLATION_IDEAL_ADIABATIC_REFERENCE_MODEL_VERSION,
  PISTON_OSCILLATION_CYLINDER_DIAMETER_M,
  PISTON_OSCILLATION_FINITE_THERMAL_EXTENSION_MODEL_VERSION,
  PISTON_OSCILLATION_LEGACY_FINITE_THERMAL_EXTENSION_MODEL_VERSION,
  PISTON_OSCILLATION_LEGACY_THERMAL_PHYSICS_MODEL_VERSION,
  PISTON_OSCILLATION_THERMAL_PHYSICS_MODEL_VERSION,
  createPistonOscillationEquilibriumState,
  createPistonOscillationLoadedEquilibriumState,
  normalizePistonOscillationPhysicsConfig,
  normalizePistonOscillationThermodynamicState,
  type PistonOscillationEquilibriumState,
  type PistonOscillationFiniteThermalExtensionState,
  type PistonOscillationPhysicsConfig,
  type PistonOscillationThermodynamicState,
  type PistonOscillationTrajectory,
} from './pistonOscillationPhysicsEngine.ts';
import {
  advancePistonOscillationPrescribedThermodynamicState,
} from './pistonOscillationThermalPhysicsModel.ts';
import {
  PISTON_OSCILLATION_DRY_AIR_ADIABATIC_INDEX,
  PISTON_OSCILLATION_HELIUM_ADIABATIC_INDEX,
  createPistonOscillationGasMaterialSnapshot,
  isPistonOscillationGasMaterialSnapshot,
  type PistonOscillationGasMaterialSnapshot,
} from './pistonOscillationGasMaterialModel.ts';
import {
  createPistonOscillationEquivalentLossSnapshot,
  isPistonOscillationEquivalentLossSnapshot,
  type PistonOscillationEquivalentLossSnapshot,
} from './pistonOscillationEquivalentLossModel.ts';
import {
  PISTON_OSCILLATION_DYNAMIC_SENSOR_OBSERVATION_MODEL_VERSION,
  PISTON_OSCILLATION_EXACT_PRESSURE_QUANTIZATION,
  PISTON_OSCILLATION_IDEAL_PROCESS_SENSOR_MODEL_VERSION,
  PISTON_OSCILLATION_IDEAL_SENSOR_REFERENCE_MODEL_VERSION,
  PISTON_OSCILLATION_LEGACY_DYNAMIC_SENSOR_OBSERVATION_MODEL_VERSION,
  PISTON_OSCILLATION_SENSOR_PRESSURE_QUANTIZATION,
  PISTON_OSCILLATION_SENSOR_PRESSURE_RESOLUTION_KPA,
  assertPistonOscillationSensorObservationSeries,
  getPistonOscillationObservedTimeS,
  isPistonOscillationDynamicSensorConfig,
  isPistonOscillationDynamicSensorState,
  isPistonOscillationLegacyDynamicSensorConfig,
  isPistonOscillationLegacyDynamicSensorState,
  quantizePistonOscillationObservedPressureKpa,
  type PistonOscillationObservedSample,
  type PistonOscillationStoredDynamicSensorConfig,
  type PistonOscillationStoredDynamicSensorState,
  type PistonOscillationSensorObservationSeries,
} from './pistonOscillationSensorObservationModel.ts';
import {
  PISTON_OSCILLATION_PRESS_INTERACTION_MODEL_VERSION,
  clonePistonOscillationPressOperationEvidence,
  normalizePistonOscillationPressOperationEvidence,
  type PistonOscillationPressOperationEvidence,
} from './pistonOscillationPressInteractionModel.ts';
import {
  createLegacyPistonOscillationGasMaterialSnapshot,
  createLegacyPistonOscillationEquivalentLossSnapshot,
  createLegacyUnknownPistonOscillationPressOperationEvidence,
} from './pistonOscillationLegacyCompatibility.ts';
import {
  doPistonOscillationExperimentContextsAgree,
  normalizePistonOscillationExperimentContextSnapshot,
  type PistonOscillationExperimentContextSnapshot,
} from './pistonOscillationExperimentContextModel.ts';

export const PISTON_OSCILLATION_RAW_MEASUREMENT_SCHEMA_VERSION = 7 as const;
export const PISTON_OSCILLATION_DATA_PROCESSING_SCHEMA_VERSION = 7 as const;
export const PISTON_OSCILLATION_PERIOD_SELECTION_ALGORITHM_VERSION =
  'signal-autocorrelation-primary-extrema-v1' as const;
export const PISTON_OSCILLATION_FREE_PERIOD_SELECTION_ALGORITHM_VERSION =
  'multi-scale-primary-extrema-selection-v1' as const;
export const PISTON_OSCILLATION_PRIMARY_CYCLE_ELIGIBILITY_ALGORITHM_VERSION =
  'multi-scale-primary-half-cycle-v1' as const;
export const PISTON_OSCILLATION_LINEAR_FIT_ALGORITHM_VERSION =
  'display-rounded-ordinary-least-squares-v3' as const;
export const PISTON_OSCILLATION_CALCULATION_MODEL_VERSION =
  'display-rounded-piston-slope-calculation-v3' as const;
export const PISTON_OSCILLATION_GUIDED_MINIMUM_PERIOD_COUNT = 2 as const;
export const PISTON_OSCILLATION_FREE_MINIMUM_PERIOD_COUNT = 0.5 as const;
export const PISTON_OSCILLATION_PROCESSING_POLICY_VERSION =
  'piston-oscillation-processing-policy-v2' as const;
export const PISTON_OSCILLATION_SCORING_POLICY_VERSION =
  'piston-oscillation-free-scoring-policy-v1' as const;
export const PISTON_OSCILLATION_GUIDED_MINIMUM_FIT_POINT_COUNT = 3 as const;
export const PISTON_OSCILLATION_REFERENCE_PRESSURE_PA = 1.01e5 as const;

export type PistonOscillationRawSample = PistonOscillationObservedSample;

export interface PistonOscillationAcquisitionSettingsSnapshot {
  sampleRateHz: number;
  triggerThresholdKpa: number;
  recordedDurationS: number;
  recordingPath: 'falling-trigger' | 'immediate';
  releaseOffsetS: number | null;
}

export interface PistonOscillationPhysicsSnapshot {
  modelVersion: string;
  provenance: 'captured' | 'legacy-inferred';
  captureKind: 'released' | 'incomplete-press' | 'legacy-imported';
  gasMaterial: PistonOscillationGasMaterialSnapshot;
  equivalentLoss: PistonOscillationEquivalentLossSnapshot;
  config: PistonOscillationPhysicsConfig;
  equilibrium: PistonOscillationEquilibriumState;
  initialDisplacementM: number;
  initialVelocityMPerS: number;
  integrationSubstepsPerSample: number;
  triggerTimeS: number | null;
  initialThermodynamicState?: PistonOscillationThermodynamicState | null;
  thermalModel?: PistonOscillationFiniteThermalExtensionState | null;
}

export interface PistonOscillationSensorObservationSnapshot {
  schemaVersion: 1 | 2 | 3 | 4;
  modelVersion: typeof PISTON_OSCILLATION_IDEAL_SENSOR_REFERENCE_MODEL_VERSION | string;
  provenance: 'captured' | 'legacy-migrated';
  sampleRateHz: number;
  pressureResolutionKpa:
    | typeof PISTON_OSCILLATION_SENSOR_PRESSURE_RESOLUTION_KPA
    | null;
  pressureQuantization:
    | typeof PISTON_OSCILLATION_SENSOR_PRESSURE_QUANTIZATION
    | typeof PISTON_OSCILLATION_EXACT_PRESSURE_QUANTIZATION;
  triggerSourceSampleIndex: number | null;
  triggerSourceTimeS: number | null;
  sourceRecordSchemaVersion: number | null;
  dynamicConfig?: PistonOscillationStoredDynamicSensorConfig | null;
  initialDynamicState?: PistonOscillationStoredDynamicSensorState | null;
  finalDynamicState?: PistonOscillationStoredDynamicSensorState | null;
}

export interface PistonOscillationRawMeasurementRecord {
  schemaVersion: typeof PISTON_OSCILLATION_RAW_MEASUREMENT_SCHEMA_VERSION;
  recordId: string;
  capturedAtMs: number;
  measurementIndex: number;
  targetHeightMm: number;
  confirmedHeightMm: number;
  experimentContext: PistonOscillationExperimentContextSnapshot | null;
  acquisitionSettings: PistonOscillationAcquisitionSettingsSnapshot;
  samples: PistonOscillationRawSample[];
  pressOperationEvidence: PistonOscillationPressOperationEvidence;
  sensorObservationSnapshot: PistonOscillationSensorObservationSnapshot;
  physicsSnapshot: PistonOscillationPhysicsSnapshot;
}

export type PistonOscillationExtremumType = 'peak' | 'trough';

export interface PistonOscillationExtremum {
  ordinal: number;
  sampleIndex: number;
  type: PistonOscillationExtremumType;
  timeS: number;
  absolutePressureKpa: number;
}

export type PistonOscillationPrimaryCycleEligibilityStatus =
  | 'usable'
  | 'unusable'
  | 'indeterminate';

export type PistonOscillationPrimaryCycleEligibilityReason =
  | 'primary-half-cycle-found'
  | 'release-not-observed'
  | 'insufficient-post-release-samples'
  | 'insufficient-primary-excursion'
  | 'insufficient-primary-extrema'
  | 'ambiguous-multiscale-extrema';

export interface PistonOscillationPrimaryCycleEligibilityReport {
  schemaVersion: 1;
  algorithmVersion:
    typeof PISTON_OSCILLATION_PRIMARY_CYCLE_ELIGIBILITY_ALGORITHM_VERSION;
  rawMeasurementRecordId: string;
  status: PistonOscillationPrimaryCycleEligibilityStatus;
  reason: PistonOscillationPrimaryCycleEligibilityReason;
  analysisStartSampleIndex: number;
  analysisSampleCount: number;
  expectedHalfPeriodSamples: number;
  smoothingWindowSamples: number;
  pressureRangeKpa: number;
  estimatedNoiseFloorKpa: number;
  minimumPrimaryExcursionKpa: number;
  primaryPeriodCount: number;
  primaryExtrema: PistonOscillationExtremum[];
}

export type PistonOscillationGuidedPeriodAnalysisStatus =
  | 'usable'
  | 'insufficient'
  | 'ambiguous';

export type PistonOscillationGuidedPeriodAnalysisReason =
  | 'primary-period-found'
  | 'insufficient-samples'
  | 'dominant-period-not-found'
  | 'insufficient-primary-extrema'
  | 'inconsistent-primary-period';

export interface PistonOscillationGuidedPeriodAnalysis {
  algorithmVersion: typeof PISTON_OSCILLATION_PERIOD_SELECTION_ALGORITHM_VERSION;
  rawMeasurementRecordId: string;
  status: PistonOscillationGuidedPeriodAnalysisStatus;
  reason: PistonOscillationGuidedPeriodAnalysisReason;
  dominantPeriodSamples: number | null;
  dominantPeriodCorrelation: number;
  smoothingWindowSamples: number;
  estimatedNoiseFloorKpa: number;
  minimumProminenceKpa: number;
  medianPeriodSamples: number | null;
  periodMadRatio: number | null;
  primaryExtrema: PistonOscillationExtremum[];
}

export interface PistonOscillationGuidedPeriodAnalysisOptions {
  rangeStartTimeS?: number;
  rangeEndTimeS?: number;
}

export type PistonOscillationPeriodSelectionIssue =
  | 'insufficient-extrema'
  | 'below-guided-minimum'
  | 'ambiguous-primary-period';

export interface PistonOscillationPeriodSelection {
  algorithmVersion:
    | typeof PISTON_OSCILLATION_PERIOD_SELECTION_ALGORITHM_VERSION
    | typeof PISTON_OSCILLATION_FREE_PERIOD_SELECTION_ALGORITHM_VERSION;
  rangeStartTimeS: number;
  rangeEndTimeS: number;
  extrema: PistonOscillationExtremum[];
  leftEndpoint: PistonOscillationExtremum | null;
  rightEndpoint: PistonOscillationExtremum | null;
  periodCount: number;
  issue: PistonOscillationPeriodSelectionIssue | null;
  selectedAtMs: number;
}

export type PistonOscillationPeriodAnswerStatus =
  | 'unresolved'
  | 'correct'
  | 'revealed';

export type PistonOscillationPeriodFeedbackOutcome =
  | 'empty'
  | 'invalid'
  | 'numeric-wrong'
  | 'precision-wrong'
  | 'wrong';

export interface PistonOscillationPeriodAnswerFeedback {
  outcome: PistonOscillationPeriodFeedbackOutcome;
  numericCorrect: boolean;
  precisionCorrect: boolean;
}

export type PistonOscillationAnswerAttemptOutcome =
  | 'correct'
  | PistonOscillationPeriodFeedbackOutcome
  | 'unknown';

export type PistonOscillationAnswerResolution =
  | 'first-correct'
  | 'retry-correct'
  | 'revealed-after-attempt'
  | 'revealed-without-valid-attempt'
  | null;

export interface PistonOscillationAnswerAttemptSnapshot {
  attemptIndex: number;
  attemptedAtMs: number | null;
  draftRaw: string | null;
  inputKnown: boolean;
  parsedValue: number | null;
  outcome: PistonOscillationAnswerAttemptOutcome;
  numericCorrect: boolean | null;
  precisionCorrect: boolean | null;
}

export interface PistonOscillationPeriodBatchAttemptSnapshot {
  attemptIndex: number;
  attemptedAtMs: number;
  fields: Record<
    PistonOscillationPeriodAnswerField,
    PistonOscillationAnswerAttemptSnapshot
  >;
  allCorrect: boolean;
}

export interface PistonOscillationPeriodAnswerState {
  draftRaw: string;
  expectedValue: number | null;
  status: PistonOscillationPeriodAnswerStatus;
  feedback: PistonOscillationPeriodAnswerFeedback | null;
  attemptCount: number;
  attempts: PistonOscillationAnswerAttemptSnapshot[];
  resolution: PistonOscillationAnswerResolution;
}

export interface PistonOscillationPeriodResult {
  resultVersion: 2;
  leftSampleIndex: number;
  rightSampleIndex: number;
  leftPhase: PistonOscillationExtremumType;
  rightPhase: PistonOscillationExtremumType;
  phaseSpan:
    | 'peak-to-peak'
    | 'peak-to-trough'
    | 'trough-to-peak'
    | 'trough-to-trough';
  t1S: number;
  t2S: number;
  periodCount: number;
  deltaTimeS: number;
  periodS: number;
  periodSquaredS2: number;
  completedAtMs: number;
}

export interface PistonOscillationPeriodRunState {
  rawMeasurementRecordId: string;
  measurementIndex: number;
  targetHeightMm: number;
  fitHeightMm: number;
  sampleRateHz: number;
  selection: PistonOscillationPeriodSelection | null;
  answers: {
    t1: PistonOscillationPeriodAnswerState;
    t2: PistonOscillationPeriodAnswerState;
    period: PistonOscillationPeriodAnswerState;
  };
  batchAttempts: PistonOscillationPeriodBatchAttemptSnapshot[];
  result: PistonOscillationPeriodResult | null;
}

export type PistonOscillationAnswerValidationMode = 'stepwise' | 'batch';

export interface PistonOscillationProcessingPolicySnapshot {
  schemaVersion: 2;
  policyVersion: typeof PISTON_OSCILLATION_PROCESSING_POLICY_VERSION;
  guidedMinimumPeriodCount: number;
  freeMinimumPeriodCount: number;
  answerValidationMode: PistonOscillationAnswerValidationMode;
}

export interface PistonOscillationScoringPolicySnapshot {
  schemaVersion: 1;
  policyVersion: typeof PISTON_OSCILLATION_SCORING_POLICY_VERSION;
  scheme: PistonOscillationExperimentContextSnapshot['scheme'];
  scoringEligible: boolean;
}

export type PistonOscillationDataProcessingAuditEventType =
  | 'selection-finalized'
  | 'endpoint-submitted'
  | 'period-submitted'
  | 'period-entry-revealed'
  | 'period-batch-submitted'
  | 'answer-revealed'
  | 'run-completed'
  | 'run-advanced'
  | 'run-reopened'
  | 'measurement-replaced'
  | 'calculation-ready'
  | 'fit-selection-toggled'
  | 'fit-submitted'
  | 'calculation-answer-edited'
  | 'calculation-step-submitted'
  | 'calculation-field-revealed'
  | 'calculation-batch-submitted'
  | 'calculation-answer-continued'
  | 'calculation-answer-revealed'
  | 'calculation-completed';

export interface PistonOscillationDataProcessingAuditEvent {
  id: string;
  atMs: number;
  type: PistonOscillationDataProcessingAuditEventType;
  runIndex: number;
  payload: Record<string, string | number | boolean | null>;
}

export interface PistonOscillationLinearFitResultSnapshot {
  schemaVersion: 1;
  algorithmVersion: typeof PISTON_OSCILLATION_LINEAR_FIT_ALGORITHM_VERSION;
  slopeMPerS2: number;
  interceptM: number;
  rSquared: number;
  selectedRunIndices: number[];
  points: PistonOscillationLinearFitPointSnapshot[];
  completedAtMs: number;
}

export interface PistonOscillationLinearFitPointSnapshot {
  runIndex: number;
  measurementIndex: number;
  rawMeasurementRecordId: string;
  periodSquaredS2: number;
  heightMm: number;
  heightM: number;
}

export interface PistonOscillationCalculationKnownsSnapshot {
  schemaVersion: 2;
  modelVersion: typeof PISTON_OSCILLATION_CALCULATION_MODEL_VERSION | string;
  gasType: PistonOscillationGasMaterialSnapshot['gasType'];
  gasMaterialModelVersion: string;
  gasMaterialId: string;
  movingMassKg: number;
  cylinderDiameterM: number;
  pressurePa: number;
  referenceGamma: number;
}

export type PistonOscillationCalculationFieldId =
  | 'area'
  | 'gamma'
  | 'relativeError';

export type PistonOscillationCalculationAttemptSnapshot =
  PistonOscillationAnswerAttemptSnapshot;

export interface PistonOscillationCalculationBatchAttemptSnapshot {
  attemptIndex: number;
  attemptedAtMs: number;
  fields: Record<
    PistonOscillationCalculationFieldId,
    PistonOscillationCalculationAttemptSnapshot
  >;
  allCorrect: boolean;
}

export interface PistonOscillationCalculationAnswerState {
  draftRaw: string;
  expectedValue: number | null;
  status: PistonOscillationPeriodAnswerStatus;
  feedback: PistonOscillationPeriodAnswerFeedback | null;
  attempts: PistonOscillationCalculationAttemptSnapshot[];
  resolution: PistonOscillationAnswerResolution;
}

export interface PistonOscillationCalculationSessionSnapshot {
  schemaVersion: 2;
  status: 'selecting-points' | 'calculating' | 'ready-to-exit' | 'completed';
  knowns: PistonOscillationCalculationKnownsSnapshot;
  selectedRunIndices: number[];
  activeFieldId: PistonOscillationCalculationFieldId | null;
  visibleFieldIds: PistonOscillationCalculationFieldId[];
  answers: Record<
    PistonOscillationCalculationFieldId,
    PistonOscillationCalculationAnswerState
  >;
  batchAttempts: PistonOscillationCalculationBatchAttemptSnapshot[];
  startedAtMs: number;
  completedAtMs: number | null;
}

export interface PistonOscillationDataProcessingSession {
  schemaVersion: typeof PISTON_OSCILLATION_DATA_PROCESSING_SCHEMA_VERSION;
  processingPolicy: PistonOscillationProcessingPolicySnapshot;
  scoringPolicy: PistonOscillationScoringPolicySnapshot;
  status: 'period-processing' | 'calculation-ready' | 'completed';
  activeRunIndex: number;
  runs: PistonOscillationPeriodRunState[];
  linearFitResult: PistonOscillationLinearFitResultSnapshot | null;
  calculationSession: PistonOscillationCalculationSessionSnapshot | null;
  audit: PistonOscillationDataProcessingAuditEvent[];
  startedAtMs: number;
  updatedAtMs: number;
}

export type PistonOscillationPeriodAnswerField = 't1' | 't2' | 'period';

export const PISTON_OSCILLATION_CALCULATION_ANSWER_SPECS = {
  area: {
    precision: { type: 'significant-figures', digits: 4 },
    tolerance: { type: 'absolute', value: 0 },
    roundingMode: 'half-even',
  },
  gamma: {
    precision: { type: 'significant-figures', digits: 4 },
    tolerance: { type: 'absolute', value: 0 },
    roundingMode: 'half-even',
  },
  relativeError: {
    precision: { type: 'significant-figures', digits: 3 },
    tolerance: { type: 'absolute', value: 0 },
    roundingMode: 'half-even',
  },
} as const satisfies Record<PistonOscillationCalculationFieldId, NumericAnswerSpec>;

export const PISTON_OSCILLATION_ENDPOINT_TIME_ANSWER_SPEC = {
  precision: { type: 'decimal-places', digits: 3 },
  tolerance: { type: 'absolute', value: 0 },
  roundingMode: 'half-even',
} as const satisfies NumericAnswerSpec;

export const PISTON_OSCILLATION_PERIOD_ANSWER_SPEC = {
  precision: { type: 'significant-figures', digits: 4 },
  tolerance: { type: 'absolute', value: 0 },
  roundingMode: 'half-even',
} as const satisfies NumericAnswerSpec;

const isPlainRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

const normalizePersistedSafeInteger = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) ? value : null;
  }
  if (typeof value !== 'bigint') return null;
  if (
    value < BigInt(Number.MIN_SAFE_INTEGER)
    || value > BigInt(Number.MAX_SAFE_INTEGER)
  ) return null;
  return Number(value);
};

const isCompatiblePersistedVersion = (
  value: unknown,
  currentVersion: string,
) => value === undefined || value === currentVersion;

export const formatPistonOscillationEndpointTime = (value: number) => (
  formatNumericAnswerReference(value, PISTON_OSCILLATION_ENDPOINT_TIME_ANSWER_SPEC)
);

export const formatPistonOscillationPeriod = (value: number) => (
  formatNumericAnswerReference(value, PISTON_OSCILLATION_PERIOD_ANSWER_SPEC)
);

export const formatPistonOscillationPeriodCount = (
  periodCount: number | bigint,
) => {
  const normalizedPeriodCount = typeof periodCount === 'bigint'
    ? normalizePersistedSafeInteger(periodCount)
    : periodCount;
  if (normalizedPeriodCount === null || !Number.isFinite(normalizedPeriodCount)) {
    throw new RangeError('periodCount must be a finite safe number.');
  }
  return Number.isInteger(normalizedPeriodCount)
    ? normalizedPeriodCount.toFixed(0)
    : normalizedPeriodCount.toFixed(1);
};

export const formatPistonOscillationCalculationAnswer = (
  fieldId: PistonOscillationCalculationFieldId,
  value: number,
) => formatNumericAnswerReference(
  value,
  PISTON_OSCILLATION_CALCULATION_ANSWER_SPECS[fieldId],
);

const calculateDisplayedPistonAreaM2 = (
  knowns: PistonOscillationCalculationKnownsSnapshot,
) => {
  const cylinderDiameterM = roundDecimalPlacesHalfEven(
    knowns.cylinderDiameterM * 1_000,
    1,
  ) / 1_000;
  return roundSignificantFiguresHalfEven(
    Math.PI * cylinderDiameterM ** 2 / 4,
    PISTON_OSCILLATION_CALCULATION_ANSWER_SPECS.area.precision.digits,
  );
};

const createPistonOscillationCalculationExpectedValues = (
  knowns: PistonOscillationCalculationKnownsSnapshot,
  fit: PistonOscillationLinearFitResultSnapshot,
) => {
  // Each operand is rounded exactly as it is displayed to the learner. This
  // keeps the reference calculation identical to the written calculation
  // chain instead of silently reusing higher-precision simulation values.
  const movingMassKg = roundDecimalPlacesHalfEven(knowns.movingMassKg, 4);
  const pressurePa = roundSignificantFiguresHalfEven(knowns.pressurePa, 3);
  const slopeMPerS2 = roundSignificantFiguresHalfEven(fit.slopeMPerS2, 5);
  const referenceGamma = roundDecimalPlacesHalfEven(knowns.referenceGamma, 2);
  const areaM2 = calculateDisplayedPistonAreaM2(knowns);
  const gamma = roundSignificantFiguresHalfEven(
    4 * Math.PI ** 2 * movingMassKg * slopeMPerS2 / (areaM2 * pressurePa),
    PISTON_OSCILLATION_CALCULATION_ANSWER_SPECS.gamma.precision.digits,
  );
  const relativeErrorPercent = roundSignificantFiguresHalfEven(
    Math.abs(gamma - referenceGamma) / referenceGamma * 100,
    PISTON_OSCILLATION_CALCULATION_ANSWER_SPECS.relativeError.precision.digits,
  );
  return { areaM2, gamma, relativeErrorPercent };
};

export const getConsistentPistonOscillationGasMaterialSnapshot = (
  records: readonly PistonOscillationRawMeasurementRecord[],
): PistonOscillationGasMaterialSnapshot | null => {
  const first = records[0]?.physicsSnapshot?.gasMaterial;
  if (!first) return null;
  const isConsistent = records.every((record) => {
    const candidate = record.physicsSnapshot?.gasMaterial;
    return candidate !== undefined
      && candidate.gasType === first.gasType
      && candidate.modelVersion === first.modelVersion
      && candidate.materialId === first.materialId
      && candidate.adiabaticIndex === first.adiabaticIndex;
  });
  return isConsistent ? { ...first } : null;
};

const requireConsistentPistonOscillationGasMaterialSnapshot = (
  records: readonly PistonOscillationRawMeasurementRecord[],
) => {
  const gasMaterial = getConsistentPistonOscillationGasMaterialSnapshot(records);
  if (!gasMaterial) {
    throw new RangeError('All fitted runs must use the same saved gas material.');
  }
  return gasMaterial;
};

const requireConsistentPistonOscillationExperimentContextSnapshot = (
  records: readonly PistonOscillationRawMeasurementRecord[],
) => {
  const first = records[0]?.experimentContext ?? null;
  const consistent = first === null
    ? records.every((record) => record.experimentContext === null)
    : records.every((record) => (
        record.experimentContext !== null
        && doPistonOscillationExperimentContextsAgree(
          record.experimentContext,
          first,
        )
      ));
  if (!consistent) {
    throw new RangeError(
      'All fitted runs must use the same saved experiment scheme and parameter profile.',
    );
  }
  return first ? { ...first } : null;
};

export const createPistonOscillationCalculationKnownsSnapshot = (
  records: readonly PistonOscillationRawMeasurementRecord[],
): PistonOscillationCalculationKnownsSnapshot => {
  const gasMaterial = requireConsistentPistonOscillationGasMaterialSnapshot(records);
  requireConsistentPistonOscillationExperimentContextSnapshot(records);
  const firstConfig = records[0]?.physicsSnapshot.config;
  if (firstConfig && records.some((record) => (
    !physicsNumbersAgree(
      record.physicsSnapshot.config.ambientPressurePa,
      firstConfig.ambientPressurePa,
    )
    || !physicsNumbersAgree(
      record.physicsSnapshot.config.movingMassKg,
      firstConfig.movingMassKg,
    )
  ))) {
    throw new RangeError('All fitted runs must use the same saved apparatus parameters.');
  }
  return {
    schemaVersion: 2,
    modelVersion: PISTON_OSCILLATION_CALCULATION_MODEL_VERSION,
    gasType: gasMaterial.gasType,
    gasMaterialModelVersion: gasMaterial.modelVersion,
    gasMaterialId: gasMaterial.materialId,
    movingMassKg: firstConfig?.movingMassKg
      ?? DEFAULT_PISTON_OSCILLATION_PHYSICS_CONFIG.movingMassKg,
    cylinderDiameterM: PISTON_OSCILLATION_CYLINDER_DIAMETER_M,
    pressurePa: firstConfig?.ambientPressurePa
      ?? PISTON_OSCILLATION_REFERENCE_PRESSURE_PA,
    referenceGamma: gasMaterial.adiabaticIndex,
  };
};

const clonePistonOscillationThermodynamicState = (
  state: PistonOscillationThermodynamicState | null | undefined,
) => state
  ? {
      ...state,
      thermal: { ...state.thermal },
    }
  : null;

export const createPistonOscillationPhysicsSnapshot = (
  trajectory: PistonOscillationTrajectory,
  triggerTimeS: number | null,
): PistonOscillationPhysicsSnapshot => {
  const finiteThermal = trajectory.modelVersion
    === PISTON_OSCILLATION_THERMAL_PHYSICS_MODEL_VERSION;
  const idealAdiabatic = trajectory.modelVersion
    === PISTON_OSCILLATION_IDEAL_ADIABATIC_REFERENCE_MODEL_VERSION;
  if (
    (!finiteThermal && !idealAdiabatic)
    || (
      finiteThermal
      && (
        trajectory.initialThermodynamicState?.modelVersion
          !== PISTON_OSCILLATION_THERMAL_PHYSICS_MODEL_VERSION
        || trajectory.initialThermodynamicState.thermal.modelVersion
          !== PISTON_OSCILLATION_FINITE_THERMAL_EXTENSION_MODEL_VERSION
        || trajectory.thermalModel?.modelVersion
          !== PISTON_OSCILLATION_FINITE_THERMAL_EXTENSION_MODEL_VERSION
      )
    )
    || (idealAdiabatic && (
      trajectory.initialThermodynamicState !== null
      || trajectory.thermalModel !== null
      || trajectory.config.linearDampingNsPerM !== 0
    ))
  ) {
    throw new RangeError('Current measurements require a supported physical trajectory.');
  }
  const gasType = trajectory.config.gamma
    === PISTON_OSCILLATION_DRY_AIR_ADIABATIC_INDEX
    ? 'air'
    : trajectory.config.gamma === PISTON_OSCILLATION_HELIUM_ADIABATIC_INDEX
      ? 'helium'
      : null;
  if (gasType === null) {
    throw new RangeError('Current measurements require a versioned gas material.');
  }
  const equivalentLoss = createPistonOscillationEquivalentLossSnapshot(
    trajectory.config.linearDampingNsPerM,
  );
  return {
    modelVersion: trajectory.modelVersion,
    provenance: 'captured',
    captureKind: 'released',
    gasMaterial: createPistonOscillationGasMaterialSnapshot(gasType),
    equivalentLoss,
    config: { ...trajectory.config },
    equilibrium: { ...trajectory.equilibrium },
    initialDisplacementM: trajectory.initialDisplacementM,
    initialVelocityMPerS: trajectory.initialVelocityMPerS,
    integrationSubstepsPerSample: trajectory.integrationSubstepsPerSample,
    triggerTimeS,
    initialThermodynamicState: clonePistonOscillationThermodynamicState(
      trajectory.initialThermodynamicState,
    ),
    thermalModel: trajectory.thermalModel
      ? { ...trajectory.thermalModel }
      : null,
  };
};

export const createPistonOscillationIncompletePhysicsSnapshot = (options: {
  lockedHeightMm: number;
  sampleRateHz: number;
  thermodynamicState: PistonOscillationThermodynamicState;
  linearDampingNsPerM?: number;
  physicsConfig?: Partial<PistonOscillationPhysicsConfig>;
}): PistonOscillationPhysicsSnapshot => {
  const config = normalizePistonOscillationPhysicsConfig({
    ...options.physicsConfig,
    sensorSampleRateHz: options.sampleRateHz,
    linearDampingNsPerM: options.linearDampingNsPerM
      ?? options.physicsConfig?.linearDampingNsPerM,
  });
  const equilibrium = createPistonOscillationLoadedEquilibriumState(
    options.lockedHeightMm,
    config,
  );
  const normalizedThermodynamicState = normalizePistonOscillationThermodynamicState(
    options.thermodynamicState,
    config,
  );
  if (!normalizedThermodynamicState) {
    throw new RangeError('The incomplete capture thermodynamic state is invalid.');
  }
  const thermodynamicState = normalizedThermodynamicState.modelVersion
      === PISTON_OSCILLATION_THERMAL_PHYSICS_MODEL_VERSION
    && normalizedThermodynamicState.thermal.enabled
    ? normalizedThermodynamicState
    : advancePistonOscillationPrescribedThermodynamicState({
        referenceState: normalizedThermodynamicState,
        pistonHeightMm: normalizedThermodynamicState.pistonHeightM * 1_000,
        elapsedS: 0,
        physicsConfig: config,
      });
  const equivalentLoss = createPistonOscillationEquivalentLossSnapshot(
    config.linearDampingNsPerM,
  );
  return {
    modelVersion: thermodynamicState.modelVersion,
    provenance: 'captured',
    captureKind: 'incomplete-press',
    gasMaterial: createPistonOscillationGasMaterialSnapshot(),
    equivalentLoss,
    config,
    equilibrium,
    initialDisplacementM:
      thermodynamicState.pistonHeightM - equilibrium.equilibriumHeightM,
    initialVelocityMPerS: thermodynamicState.velocityMPerS,
    integrationSubstepsPerSample: 1,
    triggerTimeS: null,
    initialThermodynamicState: clonePistonOscillationThermodynamicState(
      thermodynamicState,
    ),
    thermalModel: thermodynamicState.thermal.enabled
      ? { ...thermodynamicState.thermal }
      : null,
  };
};

export const createPistonOscillationSensorObservationSnapshot = (options: {
  sampleRateHz: number;
  triggerSourceSampleIndex: number | null;
  observationSeries: PistonOscillationSensorObservationSeries;
}): PistonOscillationSensorObservationSnapshot => {
  const sampleRateHz = options.sampleRateHz;
  if (!Number.isSafeInteger(sampleRateHz) || sampleRateHz <= 0) {
    throw new RangeError('sampleRateHz must be a positive safe integer.');
  }
  const triggerSourceSampleIndex = options.triggerSourceSampleIndex;
  if (
    triggerSourceSampleIndex !== null
    && (!Number.isSafeInteger(triggerSourceSampleIndex) || triggerSourceSampleIndex < 0)
  ) {
    throw new RangeError('triggerSourceSampleIndex must be null or non-negative.');
  }
  const observationSeries = options.observationSeries;
  if (observationSeries.sampleRateHz !== sampleRateHz) {
    throw new RangeError('The observation series and snapshot sample rates must match.');
  }
  assertPistonOscillationSensorObservationSeries(observationSeries);
  const dynamic = observationSeries.modelVersion
    === PISTON_OSCILLATION_DYNAMIC_SENSOR_OBSERVATION_MODEL_VERSION;
  const exactIdeal = observationSeries.modelVersion
    === PISTON_OSCILLATION_IDEAL_PROCESS_SENSOR_MODEL_VERSION;
  if (!dynamic && !exactIdeal) {
    throw new RangeError('Current measurements require a supported sensor observation model.');
  }
  return {
    schemaVersion: exactIdeal ? 4 : 3,
    modelVersion: observationSeries.modelVersion,
    provenance: 'captured',
    sampleRateHz,
    pressureResolutionKpa: observationSeries.pressureResolutionKpa,
    pressureQuantization: observationSeries.pressureQuantization,
    triggerSourceSampleIndex,
    triggerSourceTimeS: triggerSourceSampleIndex === null
      ? null
      : getPistonOscillationObservedTimeS(triggerSourceSampleIndex, sampleRateHz),
    sourceRecordSchemaVersion: null,
    dynamicConfig: observationSeries.dynamicConfig
      ? { ...observationSeries.dynamicConfig }
      : null,
    initialDynamicState: observationSeries.initialDynamicState
      ? { ...observationSeries.initialDynamicState }
      : null,
    finalDynamicState: observationSeries.finalDynamicState
      ? { ...observationSeries.finalDynamicState }
      : null,
  };
};

const physicsNumbersAgree = (first: number, second: number) => (
  Math.abs(first - second)
    <= Number.EPSILON * Math.max(1, Math.abs(first), Math.abs(second)) * 32
);

const isFiniteThermalPhysicsModelVersion = (modelVersion: string) => (
  modelVersion === PISTON_OSCILLATION_THERMAL_PHYSICS_MODEL_VERSION
  || modelVersion === PISTON_OSCILLATION_LEGACY_THERMAL_PHYSICS_MODEL_VERSION
);

const isValidPistonOscillationPhysicsSnapshot = (
  snapshot: PistonOscillationPhysicsSnapshot,
) => {
  try {
    if (
      typeof snapshot.modelVersion !== 'string'
      || snapshot.modelVersion.length === 0
      || (snapshot.provenance !== 'captured' && snapshot.provenance !== 'legacy-inferred')
      || !['released', 'incomplete-press', 'legacy-imported'].includes(
        snapshot.captureKind,
      )
      || !Number.isFinite(snapshot.initialDisplacementM)
      || !Number.isFinite(snapshot.initialVelocityMPerS)
      || !Number.isSafeInteger(snapshot.integrationSubstepsPerSample)
      || snapshot.integrationSubstepsPerSample < 1
      || !isPistonOscillationGasMaterialSnapshot(snapshot.gasMaterial)
      || !isPistonOscillationEquivalentLossSnapshot(snapshot.equivalentLoss)
      || !physicsNumbersAgree(
        snapshot.gasMaterial.adiabaticIndex,
        snapshot.config.gamma,
      )
      || !physicsNumbersAgree(
        snapshot.equivalentLoss.linearCoefficientNsPerM,
        snapshot.config.linearDampingNsPerM,
      )
      || (
        snapshot.triggerTimeS !== null
        && (
          !Number.isFinite(snapshot.triggerTimeS)
          || snapshot.triggerTimeS < 0
          || snapshot.triggerTimeS > snapshot.config.trajectoryDurationS
        )
      )
    ) return false;
    const normalizedConfig = normalizePistonOscillationPhysicsConfig(snapshot.config);
    const normalizedInitialThermodynamicState =
      snapshot.initialThermodynamicState === null
      || snapshot.initialThermodynamicState === undefined
        ? null
        : normalizePistonOscillationThermodynamicState(
            snapshot.initialThermodynamicState,
            normalizedConfig,
          );
    if (isFiniteThermalPhysicsModelVersion(snapshot.modelVersion)) {
      if (
        !normalizedInitialThermodynamicState
        || normalizedInitialThermodynamicState.modelVersion !== snapshot.modelVersion
        || !normalizedInitialThermodynamicState.thermal.enabled
        || !snapshot.thermalModel?.enabled
        || snapshot.thermalModel.modelVersion
          !== normalizedInitialThermodynamicState.thermal.modelVersion
        || !physicsNumbersAgree(
          snapshot.thermalModel.relaxationTimeAtReferenceHeightS,
          normalizedInitialThermodynamicState.thermal.relaxationTimeAtReferenceHeightS,
        )
        || !physicsNumbersAgree(
          snapshot.thermalModel.referenceGraduatedHeightM,
          normalizedInitialThermodynamicState.thermal.referenceGraduatedHeightM,
        )
        || !physicsNumbersAgree(
          snapshot.thermalModel.volumeExponent,
          normalizedInitialThermodynamicState.thermal.volumeExponent,
        )
      ) return false;
      if (snapshot.modelVersion === PISTON_OSCILLATION_THERMAL_PHYSICS_MODEL_VERSION) {
        if (
          snapshot.thermalModel.modelVersion
            !== PISTON_OSCILLATION_FINITE_THERMAL_EXTENSION_MODEL_VERSION
          || normalizedInitialThermodynamicState.thermal.modelVersion
            !== PISTON_OSCILLATION_FINITE_THERMAL_EXTENSION_MODEL_VERSION
          || !physicsNumbersAgree(
            snapshot.thermalModel.heatTransferRateW,
            normalizedInitialThermodynamicState.thermal.heatTransferRateW,
          )
          || !physicsNumbersAgree(
            snapshot.thermalModel.heatTransferLagTimeS,
            normalizedInitialThermodynamicState.thermal.heatTransferLagTimeS,
          )
        ) return false;
      } else if (
        snapshot.thermalModel.modelVersion
          !== PISTON_OSCILLATION_LEGACY_FINITE_THERMAL_EXTENSION_MODEL_VERSION
        || normalizedInitialThermodynamicState.thermal.modelVersion
          !== PISTON_OSCILLATION_LEGACY_FINITE_THERMAL_EXTENSION_MODEL_VERSION
      ) return false;
    }
    if (
      snapshot.modelVersion
        === PISTON_OSCILLATION_IDEAL_ADIABATIC_REFERENCE_MODEL_VERSION
      && (
        normalizedInitialThermodynamicState !== null
        || snapshot.thermalModel != null
        || snapshot.config.linearDampingNsPerM !== 0
      )
    ) return false;
    const configKeys = Object.keys(normalizedConfig) as Array<keyof PistonOscillationPhysicsConfig>;
    if (configKeys.some((key) => !physicsNumbersAgree(
      normalizedConfig[key],
      snapshot.config[key],
    ))) return false;
    if (
      !Number.isFinite(snapshot.equilibrium.equilibriumHeightM)
      || snapshot.equilibrium.equilibriumHeightM < 0
      || snapshot.equilibrium.equilibriumHeightM > 0.08
    ) return false;
    const expectedEquilibrium = createPistonOscillationEquilibriumState(
      snapshot.equilibrium.equilibriumHeightM * 1_000,
      normalizedConfig,
    );
    const equilibriumKeys = Object.keys(expectedEquilibrium) as Array<
      keyof PistonOscillationEquilibriumState
    >;
    return equilibriumKeys.every((key) => physicsNumbersAgree(
      expectedEquilibrium[key],
      snapshot.equilibrium[key],
    ));
  } catch {
    return false;
  }
};

export const createPistonOscillationRawMeasurementRecord = (options: {
  recordId: string;
  capturedAtMs: number;
  measurementIndex: number;
  targetHeightMm: number;
  confirmedHeightMm: number;
  sampleRateHz: number;
  triggerThresholdKpa: number;
  recordedDurationS: number;
  recordingPath: PistonOscillationAcquisitionSettingsSnapshot['recordingPath'];
  releaseOffsetS: number | null;
  samples: PistonOscillationRawSample[];
  pressOperationEvidence: PistonOscillationPressOperationEvidence;
  sensorObservationSnapshot: PistonOscillationSensorObservationSnapshot;
  physicsSnapshot: PistonOscillationPhysicsSnapshot;
  experimentContext?: PistonOscillationExperimentContextSnapshot | null;
}): PistonOscillationRawMeasurementRecord => {
  const experimentContext = options.experimentContext == null
    ? null
    : normalizePistonOscillationExperimentContextSnapshot(options.experimentContext);
  if (options.experimentContext != null && experimentContext === null) {
    throw new RangeError('The experiment context snapshot is invalid.');
  }
  if (!Number.isSafeInteger(options.sampleRateHz) || options.sampleRateHz <= 0) {
    throw new RangeError('sampleRateHz must be a positive safe integer.');
  }
  if (!Number.isFinite(options.recordedDurationS) || options.recordedDurationS < 0) {
    throw new RangeError('recordedDurationS must be finite and non-negative.');
  }
  const recordingPath = options.recordingPath;
  const releaseOffsetS = options.releaseOffsetS;
  if (
    (recordingPath !== 'falling-trigger' && recordingPath !== 'immediate')
    || (
      releaseOffsetS !== null
      && (!Number.isFinite(releaseOffsetS) || releaseOffsetS < 0)
    )
    || (recordingPath === 'falling-trigger' && releaseOffsetS !== null)
    || (
      recordingPath === 'immediate'
      && releaseOffsetS !== null
      && releaseOffsetS > options.recordedDurationS
    )
  ) {
    throw new RangeError('The acquisition recording path is invalid.');
  }
  const rawIntervalCount = options.recordedDurationS * options.sampleRateHz;
  const intervalCount = Math.round(rawIntervalCount);
  if (Math.abs(rawIntervalCount - intervalCount) > 1e-9) {
    throw new RangeError('recordedDurationS must lie on the sample-time grid.');
  }
  if (options.samples.length !== intervalCount + 1) {
    throw new RangeError('samples must contain every observation in the recording interval.');
  }
  if (
    !isValidPistonOscillationPhysicsSnapshot(options.physicsSnapshot)
    || options.physicsSnapshot.config.sensorSampleRateHz !== options.sampleRateHz
    || !physicsNumbersAgree(
      options.physicsSnapshot.equilibrium.equilibriumHeightM * 1_000,
      options.confirmedHeightMm,
    )
  ) {
    throw new RangeError('physicsSnapshot is inconsistent with the captured measurement.');
  }
  const sensorObservationSnapshot = options.sensorObservationSnapshot;
  if (sensorObservationSnapshot.sampleRateHz !== options.sampleRateHz) {
    throw new RangeError('The sensor snapshot and acquisition sample rates must match.');
  }
  const dynamicSensorSnapshot = sensorObservationSnapshot.modelVersion
    === PISTON_OSCILLATION_DYNAMIC_SENSOR_OBSERVATION_MODEL_VERSION;
  const exactIdealSensorSnapshot = sensorObservationSnapshot.modelVersion
    === PISTON_OSCILLATION_IDEAL_PROCESS_SENSOR_MODEL_VERSION;
  const idealExperiment = experimentContext?.scheme === 'ideal';
  const dynamicConfig = sensorObservationSnapshot.dynamicConfig;
  const initialDynamicState = sensorObservationSnapshot.initialDynamicState;
  const finalDynamicState = sensorObservationSnapshot.finalDynamicState;
  if (
    (idealExperiment ? !exactIdealSensorSnapshot : !dynamicSensorSnapshot)
    || sensorObservationSnapshot.schemaVersion !== (idealExperiment ? 4 : 3)
    || (idealExperiment
      ? dynamicConfig != null || initialDynamicState != null || finalDynamicState != null
      : !isPistonOscillationDynamicSensorConfig(dynamicConfig)
        || (
          initialDynamicState !== null
          && initialDynamicState !== undefined
          && !isPistonOscillationDynamicSensorState(initialDynamicState)
        )
        || !isPistonOscillationDynamicSensorState(finalDynamicState))
    || sensorObservationSnapshot.provenance !== 'captured'
    || (idealExperiment
      ? sensorObservationSnapshot.pressureResolutionKpa !== null
        || sensorObservationSnapshot.pressureQuantization
          !== PISTON_OSCILLATION_EXACT_PRESSURE_QUANTIZATION
      : sensorObservationSnapshot.pressureResolutionKpa
          !== PISTON_OSCILLATION_SENSOR_PRESSURE_RESOLUTION_KPA
        || sensorObservationSnapshot.pressureQuantization
          !== PISTON_OSCILLATION_SENSOR_PRESSURE_QUANTIZATION)
    || (
      sensorObservationSnapshot.triggerSourceSampleIndex !== null
      && (
        !Number.isSafeInteger(sensorObservationSnapshot.triggerSourceSampleIndex)
        || sensorObservationSnapshot.triggerSourceSampleIndex < 0
        || sensorObservationSnapshot.triggerSourceTimeS
          !== getPistonOscillationObservedTimeS(
            sensorObservationSnapshot.triggerSourceSampleIndex,
            options.sampleRateHz,
          )
      )
    )
    || (
      sensorObservationSnapshot.triggerSourceSampleIndex === null
      && sensorObservationSnapshot.triggerSourceTimeS !== null
    )
  ) {
    throw new RangeError('The sensor observation snapshot is invalid.');
  }
  const samples = options.samples.map((sample, sampleIndex) => {
    const expectedTimeS = getPistonOscillationObservedTimeS(
      sampleIndex,
      options.sampleRateHz,
    );
    if (
      sample.sampleIndex !== sampleIndex
      || !Number.isFinite(sample.timeS)
      || Math.abs(sample.timeS - expectedTimeS) > 1e-12
      || !Number.isFinite(sample.absolutePressureKpa)
      || sample.absolutePressureKpa <= 0
    ) {
      throw new RangeError(`samples[${sampleIndex}] is not a valid sensor observation.`);
    }
    return {
      sampleIndex,
      timeS: expectedTimeS,
      absolutePressureKpa: sample.absolutePressureKpa,
    };
  });
  assertPistonOscillationSensorObservationSeries({
    modelVersion: idealExperiment
      ? PISTON_OSCILLATION_IDEAL_PROCESS_SENSOR_MODEL_VERSION
      : PISTON_OSCILLATION_DYNAMIC_SENSOR_OBSERVATION_MODEL_VERSION,
    sampleRateHz: options.sampleRateHz,
    pressureResolutionKpa: idealExperiment
      ? null
      : PISTON_OSCILLATION_SENSOR_PRESSURE_RESOLUTION_KPA,
    pressureQuantization: idealExperiment
      ? PISTON_OSCILLATION_EXACT_PRESSURE_QUANTIZATION
      : PISTON_OSCILLATION_SENSOR_PRESSURE_QUANTIZATION,
    samples,
    dynamicConfig: isPistonOscillationDynamicSensorConfig(dynamicConfig)
      ? dynamicConfig
      : null,
    initialDynamicState: isPistonOscillationDynamicSensorState(initialDynamicState)
      ? initialDynamicState
      : null,
    finalDynamicState: isPistonOscillationDynamicSensorState(finalDynamicState)
      ? finalDynamicState
      : null,
  });
  const recordedDurationS = samples.at(-1)?.timeS ?? 0;
  const pressOperationEvidence = normalizePistonOscillationPressOperationEvidence(
    options.pressOperationEvidence,
  );
  if (
    !pressOperationEvidence
    || options.pressOperationEvidence.modelVersion
      !== PISTON_OSCILLATION_PRESS_INTERACTION_MODEL_VERSION
    || pressOperationEvidence.provenance !== 'captured'
    || pressOperationEvidence.completion === 'legacy-unknown'
    || options.physicsSnapshot.provenance !== 'captured'
    || options.physicsSnapshot.captureKind === 'legacy-imported'
    || options.physicsSnapshot.modelVersion !== (idealExperiment
      ? PISTON_OSCILLATION_IDEAL_ADIABATIC_REFERENCE_MODEL_VERSION
      : PISTON_OSCILLATION_THERMAL_PHYSICS_MODEL_VERSION)
    || (
      pressOperationEvidence.completion === 'released'
      && options.physicsSnapshot.captureKind !== 'released'
    )
    || (
      pressOperationEvidence.completion === 'not-released'
      && options.physicsSnapshot.captureKind !== 'incomplete-press'
    )
    || (recordingPath === 'falling-trigger' && pressOperationEvidence.completion !== 'released')
    || (
      recordingPath === 'immediate'
      && pressOperationEvidence.completion === 'released'
      && releaseOffsetS === null
    )
    || (
      recordingPath === 'immediate'
      && pressOperationEvidence.completion === 'not-released'
      && releaseOffsetS !== null
    )
  ) {
    throw new RangeError('pressOperationEvidence is invalid.');
  }
  return {
    schemaVersion: PISTON_OSCILLATION_RAW_MEASUREMENT_SCHEMA_VERSION,
    recordId: options.recordId,
    capturedAtMs: options.capturedAtMs,
    measurementIndex: options.measurementIndex,
    targetHeightMm: options.targetHeightMm,
    confirmedHeightMm: options.confirmedHeightMm,
    experimentContext,
    acquisitionSettings: {
      sampleRateHz: options.sampleRateHz,
      triggerThresholdKpa: options.triggerThresholdKpa,
      recordedDurationS,
      recordingPath,
      releaseOffsetS,
    },
    samples,
    pressOperationEvidence: clonePistonOscillationPressOperationEvidence(
      pressOperationEvidence,
    ),
    sensorObservationSnapshot: {
      ...sensorObservationSnapshot,
      dynamicConfig: sensorObservationSnapshot.dynamicConfig
        ? { ...sensorObservationSnapshot.dynamicConfig }
        : null,
      initialDynamicState: sensorObservationSnapshot.initialDynamicState
        ? { ...sensorObservationSnapshot.initialDynamicState }
        : null,
      finalDynamicState: sensorObservationSnapshot.finalDynamicState
        ? { ...sensorObservationSnapshot.finalDynamicState }
        : null,
    },
    physicsSnapshot: {
      ...options.physicsSnapshot,
      gasMaterial: { ...options.physicsSnapshot.gasMaterial },
      equivalentLoss: { ...options.physicsSnapshot.equivalentLoss },
      config: { ...options.physicsSnapshot.config },
      equilibrium: { ...options.physicsSnapshot.equilibrium },
      initialThermodynamicState: clonePistonOscillationThermodynamicState(
        options.physicsSnapshot.initialThermodynamicState,
      ),
      thermalModel: options.physicsSnapshot.thermalModel
        ? { ...options.physicsSnapshot.thermalModel }
        : null,
    },
  };
};

export const clonePistonOscillationRawMeasurementRecord = (
  record: PistonOscillationRawMeasurementRecord,
): PistonOscillationRawMeasurementRecord => ({
  ...record,
  experimentContext: record.experimentContext
    ? { ...record.experimentContext }
    : null,
  acquisitionSettings: { ...record.acquisitionSettings },
  samples: record.samples.map((sample) => ({ ...sample })),
  pressOperationEvidence: clonePistonOscillationPressOperationEvidence(
    record.pressOperationEvidence,
  ),
  sensorObservationSnapshot: {
    ...record.sensorObservationSnapshot,
    dynamicConfig: record.sensorObservationSnapshot.dynamicConfig
      ? { ...record.sensorObservationSnapshot.dynamicConfig }
      : null,
    initialDynamicState: record.sensorObservationSnapshot.initialDynamicState
      ? { ...record.sensorObservationSnapshot.initialDynamicState }
      : null,
    finalDynamicState: record.sensorObservationSnapshot.finalDynamicState
      ? { ...record.sensorObservationSnapshot.finalDynamicState }
      : null,
  },
  physicsSnapshot: {
    ...record.physicsSnapshot,
    gasMaterial: { ...record.physicsSnapshot.gasMaterial },
    equivalentLoss: { ...record.physicsSnapshot.equivalentLoss },
    config: { ...record.physicsSnapshot.config },
    equilibrium: { ...record.physicsSnapshot.equilibrium },
    initialThermodynamicState: clonePistonOscillationThermodynamicState(
      record.physicsSnapshot.initialThermodynamicState,
    ),
    thermalModel: record.physicsSnapshot.thermalModel
      ? { ...record.physicsSnapshot.thermalModel }
      : null,
  },
});

const createLegacyPhysicsSnapshot = (
  targetHeightMm: number,
): PistonOscillationPhysicsSnapshot => ({
  modelVersion: 'legacy-unknown',
  provenance: 'legacy-inferred',
  captureKind: 'legacy-imported',
  gasMaterial: createLegacyPistonOscillationGasMaterialSnapshot(
    DEFAULT_PISTON_OSCILLATION_PHYSICS_CONFIG.gamma,
  ),
  equivalentLoss: createLegacyPistonOscillationEquivalentLossSnapshot(
    DEFAULT_PISTON_OSCILLATION_PHYSICS_CONFIG.linearDampingNsPerM,
  ),
  config: { ...DEFAULT_PISTON_OSCILLATION_PHYSICS_CONFIG },
  equilibrium: createPistonOscillationEquilibriumState(targetHeightMm),
  initialDisplacementM: 0,
  initialVelocityMPerS: 0,
  integrationSubstepsPerSample: 1,
  triggerTimeS: null,
  initialThermodynamicState: null,
  thermalModel: null,
});

const normalizePhysicsConfig = (
  value: unknown,
): PistonOscillationPhysicsConfig | null => {
  if (!isPlainRecord(value)) return null;
  const keys = [
    'gamma',
    'ambientPressurePa',
    'ambientTemperatureK',
    'movingMassKg',
    'equivalentDeadVolumeHeightM',
    'linearDampingNsPerM',
    'sensorSampleRateHz',
    'trajectoryDurationS',
  ] as const;
  if (keys.some((key) => !isFiniteNumber(value[key]))) return null;
  return Object.fromEntries(
    keys.map((key) => [key, value[key]]),
  ) as unknown as PistonOscillationPhysicsConfig;
};

const normalizeEquilibrium = (
  value: unknown,
  config: PistonOscillationPhysicsConfig,
): PistonOscillationEquilibriumState | null => {
  if (!isPlainRecord(value)) return null;
  const keys = [
    'cylinderAreaM2',
    'equilibriumHeightM',
    'effectiveGasHeightM',
    'equilibriumVolumeM3',
    'equilibriumPressurePa',
    'gasAmountMol',
  ] as const;
  if (keys.some((key) => !isFiniteNumber(value[key]))) return null;
  const normalized = Object.fromEntries(
    keys.map((key) => [key, value[key]]),
  ) as unknown as Omit<
    PistonOscillationEquilibriumState,
    'graduatedCylinderVolumeM3' | 'sealedDeadVolumeM3'
  >;
  const derivedGraduatedVolumeM3 = normalized.cylinderAreaM2
    * normalized.equilibriumHeightM;
  const graduatedCylinderVolumeM3 = isFiniteNumber(value.graduatedCylinderVolumeM3)
    ? value.graduatedCylinderVolumeM3
    : derivedGraduatedVolumeM3;
  const sealedDeadVolumeM3 = isFiniteNumber(value.sealedDeadVolumeM3)
    ? value.sealedDeadVolumeM3
    : normalized.equilibriumVolumeM3 - graduatedCylinderVolumeM3;
  if (graduatedCylinderVolumeM3 < 0 || sealedDeadVolumeM3 < 0) return null;
  let derived: PistonOscillationEquilibriumState;
  try {
    derived = createPistonOscillationEquilibriumState(
      normalized.equilibriumHeightM * 1_000,
      config,
    );
  } catch {
    return null;
  }
  return {
    ...normalized,
    graduatedCylinderVolumeM3,
    sealedDeadVolumeM3,
    lockedHeightM: isFiniteNumber(value.lockedHeightM)
      ? value.lockedHeightM
      : derived.lockedHeightM,
    lockedGraduatedCylinderVolumeM3: isFiniteNumber(
      value.lockedGraduatedCylinderVolumeM3,
    )
      ? value.lockedGraduatedCylinderVolumeM3
      : derived.lockedGraduatedCylinderVolumeM3,
    lockedVolumeM3: isFiniteNumber(value.lockedVolumeM3)
      ? value.lockedVolumeM3
      : derived.lockedVolumeM3,
    lockedPressurePa: isFiniteNumber(value.lockedPressurePa)
      ? value.lockedPressurePa
      : derived.lockedPressurePa,
    lockedTemperatureK: isFiniteNumber(value.lockedTemperatureK)
      ? value.lockedTemperatureK
      : derived.lockedTemperatureK,
    settlingDisplacementM: isFiniteNumber(value.settlingDisplacementM)
      ? value.settlingDisplacementM
      : derived.settlingDisplacementM,
  };
};

const normalizePhysicsSnapshot = (
  value: unknown,
  targetHeightMm: number,
  migrateLegacy: boolean,
): PistonOscillationPhysicsSnapshot | null => {
  const fallback = () => migrateLegacy
    ? createLegacyPhysicsSnapshot(targetHeightMm)
    : null;
  if (!isPlainRecord(value)) return fallback();
  const config = normalizePhysicsConfig(value.config);
  const equilibrium = config
    ? normalizeEquilibrium(value.equilibrium, config)
    : null;
  const captureKind = value.captureKind === 'released'
    || value.captureKind === 'incomplete-press'
    || value.captureKind === 'legacy-imported'
    ? value.captureKind
    : migrateLegacy
      ? typeof value.modelVersion === 'string'
        && isFiniteThermalPhysicsModelVersion(value.modelVersion)
        && value.provenance === 'captured'
        ? 'released'
        : 'legacy-imported'
      : null;
  if (
    !config
    || !equilibrium
    || captureKind === null
    || typeof value.modelVersion !== 'string'
    || value.modelVersion.length === 0
    || (value.provenance !== 'captured' && value.provenance !== 'legacy-inferred')
    || !isFiniteNumber(value.initialDisplacementM)
    || !isFiniteNumber(value.initialVelocityMPerS)
    || !Number.isInteger(value.integrationSubstepsPerSample)
    || (value.integrationSubstepsPerSample as number) < 1
    || (!migrateLegacy && value.triggerTimeS === undefined)
    || (
      value.triggerTimeS !== null
      && value.triggerTimeS !== undefined
      && !isFiniteNumber(value.triggerTimeS)
    )
  ) return fallback();
  const storedGasMaterial = value.gasMaterial ?? value.airMaterial;
  const gasMaterialCandidate = isPlainRecord(storedGasMaterial)
    && storedGasMaterial.gasType === undefined
    ? { ...storedGasMaterial, gasType: 'air' }
    : storedGasMaterial;
  const gasMaterial = storedGasMaterial === undefined
    ? createLegacyPistonOscillationGasMaterialSnapshot(config.gamma)
    : isPistonOscillationGasMaterialSnapshot(gasMaterialCandidate)
      ? { ...gasMaterialCandidate }
      : null;
  const equivalentLoss = value.equivalentLoss === undefined
    ? createLegacyPistonOscillationEquivalentLossSnapshot(config.linearDampingNsPerM)
    : isPistonOscillationEquivalentLossSnapshot(value.equivalentLoss)
      ? { ...value.equivalentLoss }
      : null;
  if (!gasMaterial || !equivalentLoss) return fallback();
  const initialThermodynamicState = value.initialThermodynamicState === undefined
    || value.initialThermodynamicState === null
    ? null
    : normalizePistonOscillationThermodynamicState(
        value.initialThermodynamicState,
        config,
      );
  if (value.initialThermodynamicState != null && !initialThermodynamicState) {
    return fallback();
  }
  let thermalModel: PistonOscillationFiniteThermalExtensionState | null = null;
  if (value.thermalModel !== undefined && value.thermalModel !== null) {
    if (
      !isPlainRecord(value.thermalModel)
      || value.thermalModel.enabled !== true
      || !isFiniteNumber(value.thermalModel.wallTemperatureK)
      || !isFiniteNumber(value.thermalModel.cumulativeHeatTransferJ)
      || !isFiniteNumber(value.thermalModel.relaxationTimeAtReferenceHeightS)
      || !isFiniteNumber(value.thermalModel.referenceGraduatedHeightM)
      || !isFiniteNumber(value.thermalModel.volumeExponent)
    ) return fallback();
    if (
      value.thermalModel.modelVersion
        === PISTON_OSCILLATION_LEGACY_FINITE_THERMAL_EXTENSION_MODEL_VERSION
      && value.thermalModel.provenance === 'identified-candidate'
    ) {
      thermalModel = {
        modelVersion:
          PISTON_OSCILLATION_LEGACY_FINITE_THERMAL_EXTENSION_MODEL_VERSION,
        enabled: true,
        wallTemperatureK: value.thermalModel.wallTemperatureK,
        cumulativeHeatTransferJ: value.thermalModel.cumulativeHeatTransferJ,
        relaxationTimeAtReferenceHeightS:
          value.thermalModel.relaxationTimeAtReferenceHeightS,
        referenceGraduatedHeightM: value.thermalModel.referenceGraduatedHeightM,
        volumeExponent: value.thermalModel.volumeExponent,
        provenance: 'identified-candidate',
      };
    } else if (
      value.thermalModel.modelVersion
        === PISTON_OSCILLATION_FINITE_THERMAL_EXTENSION_MODEL_VERSION
      && value.thermalModel.provenance === 'wp-t1-review-candidate'
      && isFiniteNumber(value.thermalModel.heatTransferRateW)
      && isFiniteNumber(value.thermalModel.heatTransferLagTimeS)
      && value.thermalModel.heatTransferLagTimeS > 0
    ) {
      thermalModel = {
        modelVersion: PISTON_OSCILLATION_FINITE_THERMAL_EXTENSION_MODEL_VERSION,
        enabled: true,
        wallTemperatureK: value.thermalModel.wallTemperatureK,
        cumulativeHeatTransferJ: value.thermalModel.cumulativeHeatTransferJ,
        relaxationTimeAtReferenceHeightS:
          value.thermalModel.relaxationTimeAtReferenceHeightS,
        referenceGraduatedHeightM: value.thermalModel.referenceGraduatedHeightM,
        volumeExponent: value.thermalModel.volumeExponent,
        heatTransferRateW: value.thermalModel.heatTransferRateW,
        heatTransferLagTimeS: value.thermalModel.heatTransferLagTimeS,
        provenance: 'wp-t1-review-candidate',
      };
    } else return fallback();
  }
  const snapshot: PistonOscillationPhysicsSnapshot = {
    modelVersion: value.modelVersion,
    provenance: value.provenance,
    captureKind,
    gasMaterial,
    equivalentLoss,
    config,
    equilibrium,
    initialDisplacementM: value.initialDisplacementM,
    initialVelocityMPerS: value.initialVelocityMPerS,
    integrationSubstepsPerSample: value.integrationSubstepsPerSample as number,
    triggerTimeS: value.triggerTimeS === null || value.triggerTimeS === undefined
      ? null
      : isFiniteNumber(value.triggerTimeS)
        ? value.triggerTimeS
        : null,
    initialThermodynamicState: clonePistonOscillationThermodynamicState(
      initialThermodynamicState,
    ),
    thermalModel,
  };
  return isValidPistonOscillationPhysicsSnapshot(snapshot) ? snapshot : fallback();
};

const normalizeRawSamples = (
  value: unknown,
  sampleRateHz: number,
  migrateLegacy: boolean,
): PistonOscillationRawSample[] | null => {
  if (!Array.isArray(value) || value.length < 2) return null;
  const samples: PistonOscillationRawSample[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const sample = value[index];
    if (!isPlainRecord(sample) || !isFiniteNumber(sample.timeS)) return null;
    const absolutePressureKpa = isFiniteNumber(sample.absolutePressureKpa)
      ? sample.absolutePressureKpa
      : isFiniteNumber(sample.pressureKpa)
        ? sample.pressureKpa
        : null;
    const expectedTimeS = getPistonOscillationObservedTimeS(index, sampleRateHz);
    if (
      absolutePressureKpa === null
      || absolutePressureKpa <= 0
      || sample.timeS < 0
      || (!migrateLegacy && sample.sampleIndex !== index)
      || (
        migrateLegacy
        && sample.sampleIndex !== undefined
        && sample.sampleIndex !== index
      )
      || Math.abs(sample.timeS - expectedTimeS) > 1e-12
    ) return null;
    samples.push({
      sampleIndex: index,
      timeS: expectedTimeS,
      absolutePressureKpa: migrateLegacy
        ? quantizePistonOscillationObservedPressureKpa(absolutePressureKpa * 1_000)
        : absolutePressureKpa,
    });
  }
  if (migrateLegacy) {
    try {
      assertPistonOscillationSensorObservationSeries({
        modelVersion: PISTON_OSCILLATION_IDEAL_SENSOR_REFERENCE_MODEL_VERSION,
        sampleRateHz,
        pressureResolutionKpa: PISTON_OSCILLATION_SENSOR_PRESSURE_RESOLUTION_KPA,
        pressureQuantization: PISTON_OSCILLATION_SENSOR_PRESSURE_QUANTIZATION,
        samples,
      });
    } catch {
      return null;
    }
  }
  return samples;
};

const normalizeSensorObservationSnapshot = (
  value: unknown,
  sampleRateHz: number,
  physicsSnapshot: PistonOscillationPhysicsSnapshot,
  migrateLegacy: boolean,
  sourceRecordSchemaVersion: number | null,
): PistonOscillationSensorObservationSnapshot | null => {
  if (isPlainRecord(value)) {
    const currentDynamic = value.modelVersion
      === PISTON_OSCILLATION_DYNAMIC_SENSOR_OBSERVATION_MODEL_VERSION;
    const exactIdeal = value.modelVersion
      === PISTON_OSCILLATION_IDEAL_PROCESS_SENSOR_MODEL_VERSION;
    const legacyDynamic = value.modelVersion
      === PISTON_OSCILLATION_LEGACY_DYNAMIC_SENSOR_OBSERVATION_MODEL_VERSION;
    const dynamic = currentDynamic || legacyDynamic;
    if (
      (!migrateLegacy && !dynamic && !exactIdeal)
      ||
      (
        exactIdeal
          ? value.schemaVersion !== 4
          : currentDynamic
          ? value.schemaVersion !== 3
          : legacyDynamic
            ? value.schemaVersion !== 2
          : value.schemaVersion !== 1
            || value.modelVersion !== PISTON_OSCILLATION_IDEAL_SENSOR_REFERENCE_MODEL_VERSION
      )
      || (
        value.provenance !== 'captured'
        && value.provenance !== 'legacy-migrated'
      )
      || (!migrateLegacy && value.provenance !== 'captured')
      || value.sampleRateHz !== sampleRateHz
      || (exactIdeal
        ? value.pressureResolutionKpa !== null
          || value.pressureQuantization
            !== PISTON_OSCILLATION_EXACT_PRESSURE_QUANTIZATION
        : value.pressureResolutionKpa
            !== PISTON_OSCILLATION_SENSOR_PRESSURE_RESOLUTION_KPA
          || value.pressureQuantization
            !== PISTON_OSCILLATION_SENSOR_PRESSURE_QUANTIZATION)
    ) return null;
    const triggerSourceSampleIndex = value.triggerSourceSampleIndex === null
      ? null
      : Number.isSafeInteger(value.triggerSourceSampleIndex)
        && (value.triggerSourceSampleIndex as number) >= 0
        ? value.triggerSourceSampleIndex as number
        : null;
    if (
      value.triggerSourceSampleIndex !== null
      && triggerSourceSampleIndex === null
    ) return null;
    const triggerSourceTimeS = triggerSourceSampleIndex === null
      ? null
      : getPistonOscillationObservedTimeS(triggerSourceSampleIndex, sampleRateHz);
    if (
      value.triggerSourceTimeS !== triggerSourceTimeS
      || (
        value.sourceRecordSchemaVersion !== null
        && !isFiniteNumber(value.sourceRecordSchemaVersion)
      )
    ) return null;
    let dynamicConfig: PistonOscillationStoredDynamicSensorConfig | null = null;
    let initialDynamicState: PistonOscillationStoredDynamicSensorState | null = null;
    let finalDynamicState: PistonOscillationStoredDynamicSensorState | null = null;
    if (currentDynamic) {
      const configValue = value.dynamicConfig;
      const initialStateValue = value.initialDynamicState;
      const finalStateValue = value.finalDynamicState;
      if (
        !isPistonOscillationDynamicSensorConfig(configValue)
        || !isPistonOscillationDynamicSensorState(finalStateValue)
        || (
          initialStateValue !== null
          && !isPistonOscillationDynamicSensorState(initialStateValue)
        )
      ) return null;
      finalDynamicState = { ...finalStateValue };
      initialDynamicState = initialStateValue === null
        ? null
        : isPistonOscillationDynamicSensorState(initialStateValue)
          ? { ...initialStateValue }
          : null;
      dynamicConfig = { ...configValue };
    } else if (legacyDynamic) {
      const configValue = value.dynamicConfig;
      const initialStateValue = value.initialDynamicState;
      const finalStateValue = value.finalDynamicState;
      if (
        !isPistonOscillationLegacyDynamicSensorConfig(configValue)
        || !isPistonOscillationLegacyDynamicSensorState(finalStateValue)
        || (
          initialStateValue !== null
          && !isPistonOscillationLegacyDynamicSensorState(initialStateValue)
        )
      ) return null;
      dynamicConfig = { ...configValue };
      initialDynamicState = initialStateValue === null
        ? null
        : isPistonOscillationLegacyDynamicSensorState(initialStateValue)
          ? { ...initialStateValue }
          : null;
      finalDynamicState = { ...finalStateValue };
    }
    return {
      schemaVersion: exactIdeal ? 4 : currentDynamic ? 3 : legacyDynamic ? 2 : 1,
      modelVersion: exactIdeal
        ? PISTON_OSCILLATION_IDEAL_PROCESS_SENSOR_MODEL_VERSION
        : currentDynamic
        ? PISTON_OSCILLATION_DYNAMIC_SENSOR_OBSERVATION_MODEL_VERSION
        : legacyDynamic
          ? PISTON_OSCILLATION_LEGACY_DYNAMIC_SENSOR_OBSERVATION_MODEL_VERSION
          : PISTON_OSCILLATION_IDEAL_SENSOR_REFERENCE_MODEL_VERSION,
      provenance: value.provenance,
      sampleRateHz,
      pressureResolutionKpa: exactIdeal
        ? null
        : PISTON_OSCILLATION_SENSOR_PRESSURE_RESOLUTION_KPA,
      pressureQuantization: exactIdeal
        ? PISTON_OSCILLATION_EXACT_PRESSURE_QUANTIZATION
        : PISTON_OSCILLATION_SENSOR_PRESSURE_QUANTIZATION,
      triggerSourceSampleIndex,
      triggerSourceTimeS,
      sourceRecordSchemaVersion: value.sourceRecordSchemaVersion as number | null,
      dynamicConfig,
      initialDynamicState,
      finalDynamicState,
    };
  }
  const inferredTriggerSampleIndex = physicsSnapshot.triggerTimeS === null
    ? null
    : Math.max(0, Math.round(physicsSnapshot.triggerTimeS * sampleRateHz));
  return {
    schemaVersion: 1,
    modelVersion: PISTON_OSCILLATION_IDEAL_SENSOR_REFERENCE_MODEL_VERSION,
    provenance: 'legacy-migrated',
    sampleRateHz,
    pressureResolutionKpa: PISTON_OSCILLATION_SENSOR_PRESSURE_RESOLUTION_KPA,
    pressureQuantization: PISTON_OSCILLATION_SENSOR_PRESSURE_QUANTIZATION,
    triggerSourceSampleIndex: inferredTriggerSampleIndex,
    triggerSourceTimeS: inferredTriggerSampleIndex === null
      ? null
      : getPistonOscillationObservedTimeS(inferredTriggerSampleIndex, sampleRateHz),
    sourceRecordSchemaVersion,
    dynamicConfig: null,
    initialDynamicState: null,
    finalDynamicState: null,
  };
};

export const normalizePistonOscillationRawMeasurementRecord = (
  value: unknown,
  fallbackMeasurementIndex = 0,
): PistonOscillationRawMeasurementRecord | null => {
  if (!isPlainRecord(value)) return null;
  const acquisitionSettings = isPlainRecord(value.acquisitionSettings)
    ? value.acquisitionSettings
    : value;
  const measurementIndex = Number.isInteger(value.measurementIndex)
    && (value.measurementIndex as number) >= 0
    ? value.measurementIndex as number
    : fallbackMeasurementIndex;
  const targetHeightMm = isFiniteNumber(value.targetHeightMm)
    ? value.targetHeightMm
    : isFiniteNumber(value.confirmedHeightMm)
      ? value.confirmedHeightMm
      : null;
  const confirmedHeightMm = isFiniteNumber(value.confirmedHeightMm)
    ? value.confirmedHeightMm
    : targetHeightMm;
  const sampleRateHz = acquisitionSettings
    && isFiniteNumber(acquisitionSettings.sampleRateHz)
    ? acquisitionSettings.sampleRateHz
    : null;
  const triggerThresholdKpa = acquisitionSettings
    && isFiniteNumber(acquisitionSettings.triggerThresholdKpa)
    ? acquisitionSettings.triggerThresholdKpa
    : null;
  const recordedDurationS = acquisitionSettings
    && isFiniteNumber(acquisitionSettings.recordedDurationS)
    ? acquisitionSettings.recordedDurationS
    : null;
  const sourceRecordSchemaVersion = isFiniteNumber(value.schemaVersion)
    ? value.schemaVersion
    : null;
  const migrateLegacy = value.schemaVersion !== PISTON_OSCILLATION_RAW_MEASUREMENT_SCHEMA_VERSION;
  const recordingPath = acquisitionSettings.recordingPath === 'immediate'
    ? 'immediate'
    : acquisitionSettings.recordingPath === 'falling-trigger' || migrateLegacy
      ? 'falling-trigger'
      : null;
  const releaseOffsetS = recordingPath === 'immediate'
    ? acquisitionSettings.releaseOffsetS == null
      ? null
      : isFiniteNumber(acquisitionSettings.releaseOffsetS)
        ? acquisitionSettings.releaseOffsetS
        : Number.NaN
    : null;
  if (
    targetHeightMm === null
    || confirmedHeightMm === null
    || sampleRateHz === null
    || !Number.isSafeInteger(sampleRateHz)
    || sampleRateHz <= 0
    || triggerThresholdKpa === null
    || triggerThresholdKpa <= 0
    || recordedDurationS === null
    || recordedDurationS <= 0
    || recordingPath === null
    || (
      recordingPath === 'immediate'
      && releaseOffsetS !== null
      && (
        !Number.isFinite(releaseOffsetS)
        || releaseOffsetS < 0
        || releaseOffsetS > recordedDurationS
      )
    )
    || (recordingPath === 'falling-trigger' && acquisitionSettings.releaseOffsetS != null)
  ) return null;
  if (!migrateLegacy && !isPlainRecord(value.sensorObservationSnapshot)) return null;
  const samples = normalizeRawSamples(value.samples, sampleRateHz, migrateLegacy);
  if (!samples) return null;
  const expectedIntervalCount = Math.round(recordedDurationS * sampleRateHz);
  if (
    Math.abs(recordedDurationS * sampleRateHz - expectedIntervalCount) > 1e-9
    || samples.length !== expectedIntervalCount + 1
  ) return null;
  const capturedAtMs = isFiniteNumber(value.capturedAtMs) ? value.capturedAtMs : 0;
  const physicsSnapshot = normalizePhysicsSnapshot(
    value.physicsSnapshot,
    targetHeightMm,
    migrateLegacy,
  );
  if (
    !physicsSnapshot
    || physicsSnapshot.config.sensorSampleRateHz !== sampleRateHz
    || !physicsNumbersAgree(
      physicsSnapshot.equilibrium.equilibriumHeightM * 1_000,
      confirmedHeightMm,
    )
  ) return null;
  const sensorObservationSnapshot = normalizeSensorObservationSnapshot(
    value.sensorObservationSnapshot,
    sampleRateHz,
    physicsSnapshot,
    migrateLegacy,
    sourceRecordSchemaVersion,
  );
  if (!sensorObservationSnapshot) return null;
  if (!migrateLegacy) {
    try {
      const exactIdealObservation = sensorObservationSnapshot.modelVersion
        === PISTON_OSCILLATION_IDEAL_PROCESS_SENSOR_MODEL_VERSION;
      assertPistonOscillationSensorObservationSeries({
        modelVersion: exactIdealObservation
          ? PISTON_OSCILLATION_IDEAL_PROCESS_SENSOR_MODEL_VERSION
          : PISTON_OSCILLATION_IDEAL_SENSOR_REFERENCE_MODEL_VERSION,
        sampleRateHz,
        pressureResolutionKpa: sensorObservationSnapshot.pressureResolutionKpa,
        pressureQuantization: sensorObservationSnapshot.pressureQuantization,
        samples,
        dynamicConfig: null,
        initialDynamicState: null,
        finalDynamicState: null,
      });
    } catch {
      return null;
    }
  }
  const pressOperationEvidence = migrateLegacy && value.pressOperationEvidence === undefined
    ? createLegacyUnknownPistonOscillationPressOperationEvidence()
    : normalizePistonOscillationPressOperationEvidence(value.pressOperationEvidence);
  if (
    !pressOperationEvidence
    || (
      !migrateLegacy
      && (
        pressOperationEvidence.modelVersion
          !== PISTON_OSCILLATION_PRESS_INTERACTION_MODEL_VERSION
        || pressOperationEvidence.provenance !== 'captured'
        || pressOperationEvidence.completion === 'legacy-unknown'
      )
    )
  ) return null;
  const experimentContext = value.experimentContext == null
    ? null
    : normalizePistonOscillationExperimentContextSnapshot(value.experimentContext);
  if (value.experimentContext != null && experimentContext === null) return null;
  if (
    !migrateLegacy
    && experimentContext === null
    && (
      sensorObservationSnapshot.modelVersion
        === PISTON_OSCILLATION_IDEAL_PROCESS_SENSOR_MODEL_VERSION
      || physicsSnapshot.modelVersion
        === PISTON_OSCILLATION_IDEAL_ADIABATIC_REFERENCE_MODEL_VERSION
    )
  ) return null;
  if (!migrateLegacy && experimentContext !== null) {
    const idealExperiment = experimentContext.scheme === 'ideal';
    if (
      sensorObservationSnapshot.modelVersion !== (idealExperiment
        ? PISTON_OSCILLATION_IDEAL_PROCESS_SENSOR_MODEL_VERSION
        : PISTON_OSCILLATION_DYNAMIC_SENSOR_OBSERVATION_MODEL_VERSION)
      || physicsSnapshot.modelVersion !== (idealExperiment
        ? PISTON_OSCILLATION_IDEAL_ADIABATIC_REFERENCE_MODEL_VERSION
        : PISTON_OSCILLATION_THERMAL_PHYSICS_MODEL_VERSION)
    ) return null;
  }
  return {
    schemaVersion: PISTON_OSCILLATION_RAW_MEASUREMENT_SCHEMA_VERSION,
    recordId: typeof value.recordId === 'string' && value.recordId.length > 0
      ? value.recordId
      : `legacy-piston-measurement-${measurementIndex}-${capturedAtMs}`,
    capturedAtMs,
    measurementIndex,
    targetHeightMm,
    confirmedHeightMm,
    experimentContext,
    acquisitionSettings: {
      sampleRateHz,
      triggerThresholdKpa,
      recordedDurationS: samples.at(-1)?.timeS ?? recordedDurationS,
      recordingPath,
      releaseOffsetS,
    },
    samples,
    pressOperationEvidence,
    sensorObservationSnapshot,
    physicsSnapshot,
  };
};

export const findPistonOscillationExtrema = (
  samples: readonly PistonOscillationRawSample[],
): PistonOscillationExtremum[] => {
  const candidates: Omit<PistonOscillationExtremum, 'ordinal'>[] = [];
  for (let index = 1; index < samples.length - 1; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    const next = samples[index + 1];
    if (!previous || !current || !next) continue;
    const currentPressure = current.absolutePressureKpa;
    const isPeak = currentPressure >= previous.absolutePressureKpa
      && currentPressure >= next.absolutePressureKpa
      && (
        currentPressure > previous.absolutePressureKpa
        || currentPressure > next.absolutePressureKpa
      );
    const isTrough = currentPressure <= previous.absolutePressureKpa
      && currentPressure <= next.absolutePressureKpa
      && (
        currentPressure < previous.absolutePressureKpa
        || currentPressure < next.absolutePressureKpa
      );
    if (!isPeak && !isTrough) continue;
    const candidate = {
      sampleIndex: current.sampleIndex,
      type: isPeak ? 'peak' as const : 'trough' as const,
      timeS: current.timeS,
      absolutePressureKpa: currentPressure,
    };
    const previousCandidate = candidates.at(-1);
    if (previousCandidate?.type === candidate.type) {
      const candidateMoreExtreme = candidate.type === 'peak'
        ? candidate.absolutePressureKpa > previousCandidate.absolutePressureKpa
        : candidate.absolutePressureKpa < previousCandidate.absolutePressureKpa;
      if (candidateMoreExtreme) candidates[candidates.length - 1] = candidate;
    } else {
      candidates.push(candidate);
    }
  }
  return candidates.map((candidate, ordinal) => ({ ...candidate, ordinal }));
};

const getSortedQuantile = (values: readonly number[], quantile: number) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((first, second) => first - second);
  const index = Math.max(0, Math.min(
    sorted.length - 1,
    Math.round((sorted.length - 1) * quantile),
  ));
  return sorted[index] ?? 0;
};

const smoothPistonOscillationPressure = (
  values: readonly number[],
  windowSamples: number,
) => {
  const normalizedWindow = Math.max(1, Math.floor(windowSamples));
  if (normalizedWindow <= 1 || values.length <= 2) return [...values];
  const radius = Math.floor(normalizedWindow / 2);
  const prefix = [0];
  for (const value of values) prefix.push((prefix.at(-1) ?? 0) + value);
  const pass = values.map((_, index) => {
    const start = Math.max(0, index - radius);
    const end = Math.min(values.length, index + radius + 1);
    return ((prefix[end] ?? 0) - (prefix[start] ?? 0)) / Math.max(1, end - start);
  });
  const secondPrefix = [0];
  for (const value of pass) secondPrefix.push((secondPrefix.at(-1) ?? 0) + value);
  return pass.map((_, index) => {
    const start = Math.max(0, index - radius);
    const end = Math.min(pass.length, index + radius + 1);
    return ((secondPrefix[end] ?? 0) - (secondPrefix[start] ?? 0))
      / Math.max(1, end - start);
  });
};

const estimatePistonOscillationNoiseFloorKpa = (
  samples: readonly PistonOscillationRawSample[],
  pressureResolutionKpa: number,
) => {
  const secondDifferences: number[] = [];
  for (let index = 1; index < samples.length - 1; index += 1) {
    const previous = samples[index - 1]?.absolutePressureKpa;
    const current = samples[index]?.absolutePressureKpa;
    const next = samples[index + 1]?.absolutePressureKpa;
    if (previous === undefined || current === undefined || next === undefined) continue;
    secondDifferences.push(Math.abs(next - 2 * current + previous));
  }
  return Math.max(
    pressureResolutionKpa,
    getSortedQuantile(secondDifferences, 0.5) * 0.75,
  );
};

const getExpectedPistonOscillationHalfPeriodSamples = (
  record: PistonOscillationRawMeasurementRecord,
) => {
  const { config, equilibrium } = record.physicsSnapshot;
  const angularFrequencyRadPerS = Math.sqrt(
    config.gamma
      * equilibrium.equilibriumPressurePa
      * equilibrium.cylinderAreaM2
      / (config.movingMassKg * equilibrium.effectiveGasHeightM),
  );
  const frequencyHz = angularFrequencyRadPerS / (2 * Math.PI);
  const sampleRateHz = record.acquisitionSettings.sampleRateHz;
  if (!Number.isFinite(frequencyHz) || frequencyHz <= 0) {
    return Math.max(2, sampleRateHz / 40);
  }
  return Math.max(2, sampleRateHz / (2 * frequencyHz));
};

interface PistonOscillationSmoothedExtremumCandidate {
  localIndex: number;
  type: PistonOscillationExtremumType;
  smoothedPressureKpa: number;
}

const findSmoothedPistonOscillationExtrema = (
  smoothedPressureKpa: readonly number[],
  slopeEpsilonKpa: number,
  endpointPressureKpa: readonly number[] = smoothedPressureKpa,
): PistonOscillationSmoothedExtremumCandidate[] => {
  if (smoothedPressureKpa.length < 2) return [];
  const slopes = Array.from(
    { length: smoothedPressureKpa.length - 1 },
    (_, index) => (smoothedPressureKpa[index + 1] ?? 0)
      - (smoothedPressureKpa[index] ?? 0),
  );
  const maximumAbsoluteSlope = slopes.reduce(
    (maximum, slope) => Math.max(maximum, Math.abs(slope)),
    0,
  );
  if (maximumAbsoluteSlope <= slopeEpsilonKpa) return [];
  const signs = slopes.map((slope) => (
    slope > slopeEpsilonKpa ? 1 : slope < -slopeEpsilonKpa ? -1 : 0
  ));
  const firstNonZeroSlopeIndex = signs.findIndex((sign) => sign !== 0);
  let lastNonZeroSlopeIndex = -1;
  for (let index = signs.length - 1; index >= 0; index -= 1) {
    if (signs[index] !== 0) {
      lastNonZeroSlopeIndex = index;
      break;
    }
  }
  if (firstNonZeroSlopeIndex < 0 || lastNonZeroSlopeIndex < 0) return [];
  const candidates: PistonOscillationSmoothedExtremumCandidate[] = [];
  const endpointSlopes = Array.from(
    { length: Math.max(0, endpointPressureKpa.length - 1) },
    (_, index) => (endpointPressureKpa[index + 1] ?? 0)
      - (endpointPressureKpa[index] ?? 0),
  );
  const maximumEndpointAbsoluteSlope = endpointSlopes.reduce(
    (maximum, slope) => Math.max(maximum, Math.abs(slope)),
    0,
  );
  const endpointProbeCount = Math.max(
    1,
    Math.min(4, Math.floor(endpointSlopes.length / 4)),
  );
  const firstEndpointSlope = endpointSlopes.slice(0, endpointProbeCount).reduce(
    (sum, slope) => sum + Math.abs(slope),
    0,
  ) / endpointProbeCount;
  if (firstEndpointSlope <= maximumEndpointAbsoluteSlope * 0.4) {
    const firstSign = signs[firstNonZeroSlopeIndex];
    candidates.push({
      localIndex: 0,
      type: firstSign === -1 ? 'peak' : 'trough',
      smoothedPressureKpa: smoothedPressureKpa[0] ?? 0,
    });
  }
  let previousSign = signs[firstNonZeroSlopeIndex] ?? 0;
  for (let slopeIndex = firstNonZeroSlopeIndex + 1; slopeIndex <= lastNonZeroSlopeIndex; slopeIndex += 1) {
    const sign = signs[slopeIndex] ?? 0;
    if (sign === 0) continue;
    if (previousSign > 0 && sign < 0) {
      candidates.push({
        localIndex: slopeIndex,
        type: 'peak',
        smoothedPressureKpa: smoothedPressureKpa[slopeIndex] ?? 0,
      });
    } else if (previousSign < 0 && sign > 0) {
      candidates.push({
        localIndex: slopeIndex,
        type: 'trough',
        smoothedPressureKpa: smoothedPressureKpa[slopeIndex] ?? 0,
      });
    }
    previousSign = sign;
  }
  const lastEndpointSlope = endpointSlopes.slice(-endpointProbeCount).reduce(
    (sum, slope) => sum + Math.abs(slope),
    0,
  ) / endpointProbeCount;
  if (lastEndpointSlope <= maximumEndpointAbsoluteSlope * 0.4) {
    const lastSign = signs[lastNonZeroSlopeIndex];
    candidates.push({
      localIndex: smoothedPressureKpa.length - 1,
      type: lastSign === 1 ? 'peak' : 'trough',
      smoothedPressureKpa: smoothedPressureKpa.at(-1) ?? 0,
    });
  }
  return candidates.reduce<PistonOscillationSmoothedExtremumCandidate[]>((alternating, candidate) => {
    const previous = alternating.at(-1);
    if (!previous || previous.type !== candidate.type) {
      alternating.push(candidate);
      return alternating;
    }
    const candidateMoreExtreme = candidate.type === 'peak'
      ? candidate.smoothedPressureKpa > previous.smoothedPressureKpa
      : candidate.smoothedPressureKpa < previous.smoothedPressureKpa;
    if (candidateMoreExtreme) alternating[alternating.length - 1] = candidate;
    return alternating;
  }, []);
};

const selectPrimaryPistonOscillationExtrema = (
  candidates: readonly PistonOscillationSmoothedExtremumCandidate[],
  samples: readonly PistonOscillationRawSample[],
  expectedHalfPeriodSamples: number,
  minimumExcursionKpa: number,
) => {
  const minimumSeparationSamples = Math.max(2, Math.floor(expectedHalfPeriodSamples * 0.6));
  const maximumSeparationSamples = Math.max(
    minimumSeparationSamples,
    Math.ceil(expectedHalfPeriodSamples * 4),
  );
  const acceptedIndices = new Set<number>();
  for (let index = 0; index < candidates.length - 1; index += 1) {
    const left = candidates[index];
    const right = candidates[index + 1];
    if (!left || !right || left.type === right.type) continue;
    const separationSamples = right.localIndex - left.localIndex;
    const excursionKpa = Math.abs(
      right.smoothedPressureKpa - left.smoothedPressureKpa,
    );
    if (
      separationSamples < minimumSeparationSamples
      || separationSamples > maximumSeparationSamples
      || excursionKpa < minimumExcursionKpa
    ) continue;
    acceptedIndices.add(index);
    acceptedIndices.add(index + 1);
  }
  const selected = candidates.flatMap((candidate, index) => {
    if (!acceptedIndices.has(index)) return [];
    const sample = samples[candidate.localIndex];
    if (!sample) return [];
    return [{
      ordinal: 0,
      sampleIndex: sample.sampleIndex,
      type: candidate.type,
      timeS: sample.timeS,
      absolutePressureKpa: sample.absolutePressureKpa,
    } satisfies PistonOscillationExtremum];
  });
  return selected.reduce<PistonOscillationExtremum[]>((alternating, extremum) => {
    const previous = alternating.at(-1);
    if (!previous || previous.type !== extremum.type) {
      alternating.push(extremum);
      return alternating;
    }
    const extremumMoreExtreme = extremum.type === 'peak'
      ? extremum.absolutePressureKpa > previous.absolutePressureKpa
      : extremum.absolutePressureKpa < previous.absolutePressureKpa;
    if (extremumMoreExtreme) alternating[alternating.length - 1] = extremum;
    return alternating;
  }, []).map((extremum, ordinal) => ({ ...extremum, ordinal }));
};

export const analyzePistonOscillationPrimaryCycleEligibility = (
  record: PistonOscillationRawMeasurementRecord,
): PistonOscillationPrimaryCycleEligibilityReport => {
  const immediateReleaseNotObserved = record.acquisitionSettings.recordingPath === 'immediate'
    && record.acquisitionSettings.releaseOffsetS === null;
  const analysisStartTimeS = record.acquisitionSettings.recordingPath === 'immediate'
    ? record.acquisitionSettings.releaseOffsetS ?? 0
    : 0;
  const analysisSamples = record.samples.filter((sample) => sample.timeS >= analysisStartTimeS);
  const analysisStartSampleIndex = analysisSamples[0]?.sampleIndex
    ?? record.samples.at(-1)?.sampleIndex
    ?? 0;
  const expectedHalfPeriodSamples = getExpectedPistonOscillationHalfPeriodSamples(record);
  const maximumWindow = Math.max(1, Math.floor(analysisSamples.length / 5));
  const smoothingWindowSamples = Math.max(1, Math.min(
    maximumWindow,
    Math.round(expectedHalfPeriodSamples * 0.18),
  ));
  const pressureResolutionKpa = record.sensorObservationSnapshot.pressureResolutionKpa
    ?? Number.EPSILON * Math.max(
      1,
      ...analysisSamples.map((sample) => Math.abs(sample.absolutePressureKpa)),
    ) * 16;
  const noiseFloorKpa = estimatePistonOscillationNoiseFloorKpa(
    analysisSamples,
    pressureResolutionKpa,
  );
  const pressureValues = analysisSamples.map((sample) => sample.absolutePressureKpa);
  const pressureRangeKpa = Math.max(
    0,
    getSortedQuantile(pressureValues, 0.95) - getSortedQuantile(pressureValues, 0.05),
  );
  const minimumPrimaryExcursionKpa = Math.max(
    pressureResolutionKpa * 6,
    noiseFloorKpa * 4,
    pressureRangeKpa * 0.08,
  );
  const createReport = (
    status: PistonOscillationPrimaryCycleEligibilityStatus,
    reason: PistonOscillationPrimaryCycleEligibilityReason,
    primaryExtrema: PistonOscillationExtremum[] = [],
  ): PistonOscillationPrimaryCycleEligibilityReport => ({
    schemaVersion: 1,
    algorithmVersion: PISTON_OSCILLATION_PRIMARY_CYCLE_ELIGIBILITY_ALGORITHM_VERSION,
    rawMeasurementRecordId: record.recordId,
    status,
    reason,
    analysisStartSampleIndex,
    analysisSampleCount: analysisSamples.length,
    expectedHalfPeriodSamples,
    smoothingWindowSamples,
    pressureRangeKpa,
    estimatedNoiseFloorKpa: noiseFloorKpa,
    minimumPrimaryExcursionKpa,
    primaryPeriodCount: Math.max(0, (primaryExtrema.length - 1) / 2),
    primaryExtrema,
  });
  if (immediateReleaseNotObserved) {
    return createReport('unusable', 'release-not-observed');
  }
  if (analysisSamples.length < Math.max(4, Math.floor(expectedHalfPeriodSamples * 0.25))) {
    return createReport('unusable', 'insufficient-post-release-samples');
  }
  if (pressureRangeKpa < minimumPrimaryExcursionKpa) {
    return createReport('unusable', 'insufficient-primary-excursion');
  }
  const coarsePressure = smoothPistonOscillationPressure(
    pressureValues,
    smoothingWindowSamples,
  );
  const slopeEpsilonKpa = Math.max(
    Number.EPSILON,
    pressureResolutionKpa / Math.max(2, smoothingWindowSamples * 3),
  );
  const coarseCandidates = findSmoothedPistonOscillationExtrema(
    coarsePressure,
    slopeEpsilonKpa,
    pressureValues,
  );
  const primaryExtrema = selectPrimaryPistonOscillationExtrema(
    coarseCandidates,
    analysisSamples,
    expectedHalfPeriodSamples,
    minimumPrimaryExcursionKpa,
  );
  if (primaryExtrema.length >= 2) {
    return createReport('usable', 'primary-half-cycle-found', primaryExtrema);
  }
  const mediumWindowSamples = Math.max(1, Math.floor(smoothingWindowSamples / 2));
  const mediumCandidates = findSmoothedPistonOscillationExtrema(
    smoothPistonOscillationPressure(pressureValues, mediumWindowSamples),
    slopeEpsilonKpa,
    pressureValues,
  );
  const mediumExtrema = selectPrimaryPistonOscillationExtrema(
    mediumCandidates,
    analysisSamples,
    expectedHalfPeriodSamples,
    minimumPrimaryExcursionKpa,
  );
  if (mediumExtrema.length >= 2) {
    return createReport('indeterminate', 'ambiguous-multiscale-extrema', mediumExtrema);
  }
  return createReport('unusable', 'insufficient-primary-extrema');
};

export const findPistonOscillationPrimaryExtrema = (
  record: PistonOscillationRawMeasurementRecord,
) => analyzePistonOscillationPrimaryCycleEligibility(record).primaryExtrema;

const detrendPistonOscillationPressure = (
  values: readonly number[],
) => {
  if (values.length <= 1) return values.map(() => 0);
  const centerIndex = (values.length - 1) / 2;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  let covariance = 0;
  let indexVariance = 0;
  for (let index = 0; index < values.length; index += 1) {
    const centeredIndex = index - centerIndex;
    covariance += centeredIndex * ((values[index] ?? mean) - mean);
    indexVariance += centeredIndex * centeredIndex;
  }
  const slope = indexVariance > 0 ? covariance / indexVariance : 0;
  return values.map((value, index) => (
    value - (mean + slope * (index - centerIndex))
  ));
};

const getNormalizedPistonOscillationAutocorrelation = (
  values: readonly number[],
  lag: number,
) => {
  const overlap = values.length - lag;
  if (overlap < 3) return 0;
  let leftMean = 0;
  let rightMean = 0;
  for (let index = 0; index < overlap; index += 1) {
    leftMean += values[index] ?? 0;
    rightMean += values[index + lag] ?? 0;
  }
  leftMean /= overlap;
  rightMean /= overlap;
  let covariance = 0;
  let leftEnergy = 0;
  let rightEnergy = 0;
  for (let index = 0; index < overlap; index += 1) {
    const left = (values[index] ?? 0) - leftMean;
    const right = (values[index + lag] ?? 0) - rightMean;
    covariance += left * right;
    leftEnergy += left * left;
    rightEnergy += right * right;
  }
  const denominator = Math.sqrt(leftEnergy * rightEnergy);
  return denominator > Number.EPSILON ? covariance / denominator : 0;
};

interface PistonOscillationDominantPeriodEstimate {
  periodSamples: number | null;
  correlation: number;
}

const estimatePistonOscillationDominantPeriod = (
  detrendedPressureKpa: readonly number[],
  sampleRateHz: number,
): PistonOscillationDominantPeriodEstimate => {
  const minimumPeriodSamples = Math.max(6, Math.round(sampleRateHz * 0.008));
  const maximumPeriodSamples = Math.min(
    Math.floor((detrendedPressureKpa.length - 1) / 2),
    Math.max(minimumPeriodSamples + 1, Math.round(sampleRateHz * 0.12)),
  );
  if (maximumPeriodSamples <= minimumPeriodSamples) {
    return { periodSamples: null, correlation: 0 };
  }
  const correlations = new Map<number, number>();
  for (let lag = minimumPeriodSamples - 1; lag <= maximumPeriodSamples + 1; lag += 1) {
    correlations.set(
      lag,
      getNormalizedPistonOscillationAutocorrelation(detrendedPressureKpa, lag),
    );
  }
  const candidates: Array<{ lag: number; correlation: number; score: number }> = [];
  for (let lag = minimumPeriodSamples; lag <= maximumPeriodSamples; lag += 1) {
    const correlation = correlations.get(lag) ?? 0;
    const previous = correlations.get(lag - 1) ?? Number.NEGATIVE_INFINITY;
    const next = correlations.get(lag + 1) ?? Number.NEGATIVE_INFINITY;
    if (correlation <= 0 || correlation < previous || correlation <= next) continue;
    candidates.push({
      lag,
      correlation,
      score: correlation * Math.sqrt((detrendedPressureKpa.length - lag)
        / detrendedPressureKpa.length),
    });
  }
  if (candidates.length === 0) {
    return { periodSamples: null, correlation: 0 };
  }
  const bestScore = candidates.reduce(
    (maximum, candidate) => Math.max(maximum, candidate.score),
    Number.NEGATIVE_INFINITY,
  );
  const selected = candidates
    .filter((candidate) => candidate.score >= bestScore * 0.85)
    .sort((first, second) => first.lag - second.lag)[0];
  if (!selected || selected.correlation < 0.2) {
    return { periodSamples: null, correlation: selected?.correlation ?? 0 };
  }
  return {
    periodSamples: selected.lag,
    correlation: selected.correlation,
  };
};

interface PistonOscillationProminentExtremumCandidate
  extends PistonOscillationSmoothedExtremumCandidate {
  prominenceKpa: number;
}

const getPistonOscillationCandidateProminence = (
  candidate: PistonOscillationSmoothedExtremumCandidate,
  smoothedPressureKpa: readonly number[],
  radiusSamples: number,
) => {
  const start = Math.max(0, candidate.localIndex - radiusSamples);
  const end = Math.min(smoothedPressureKpa.length - 1, candidate.localIndex + radiusSamples);
  const left = smoothedPressureKpa.slice(start, candidate.localIndex + 1);
  const right = smoothedPressureKpa.slice(candidate.localIndex, end + 1);
  if (left.length === 0 || right.length === 0) return 0;
  if (candidate.type === 'peak') {
    const leftMinimum = Math.min(...left);
    const rightMinimum = Math.min(...right);
    return candidate.smoothedPressureKpa - Math.max(leftMinimum, rightMinimum);
  }
  const leftMaximum = Math.max(...left);
  const rightMaximum = Math.max(...right);
  return Math.min(leftMaximum, rightMaximum) - candidate.smoothedPressureKpa;
};

const selectPistonOscillationGuidedExtremumChain = (
  candidates: readonly PistonOscillationProminentExtremumCandidate[],
  samples: readonly PistonOscillationRawSample[],
  dominantPeriodSamples: number,
) => {
  type CandidateChain = {
    indices: number[];
    intervalDeviation: number;
    prominence: number;
  };
  const expectedHalfPeriodSamples = dominantPeriodSamples / 2;
  const minimumSeparationSamples = dominantPeriodSamples * 0.28;
  const maximumSeparationSamples = dominantPeriodSamples * 0.72;
  const chains: CandidateChain[] = [];
  candidates.forEach((candidate, candidateIndex) => {
    let best: CandidateChain = {
      indices: [candidateIndex],
      intervalDeviation: 0,
      prominence: candidate.prominenceKpa,
    };
    for (let previousIndex = 0; previousIndex < candidateIndex; previousIndex += 1) {
      const previousCandidate = candidates[previousIndex];
      const previousChain = chains[previousIndex];
      if (!previousCandidate || !previousChain || previousCandidate.type === candidate.type) continue;
      const separationSamples = candidate.localIndex - previousCandidate.localIndex;
      if (
        separationSamples < minimumSeparationSamples
        || separationSamples > maximumSeparationSamples
      ) continue;
      const extended: CandidateChain = {
        indices: [...previousChain.indices, candidateIndex],
        intervalDeviation: previousChain.intervalDeviation
          + Math.abs(separationSamples - expectedHalfPeriodSamples)
            / expectedHalfPeriodSamples,
        prominence: previousChain.prominence + candidate.prominenceKpa,
      };
      const extendedIsBetter = extended.indices.length > best.indices.length
        || (
          extended.indices.length === best.indices.length
          && (
            extended.intervalDeviation < best.intervalDeviation - 1e-9
            || (
              Math.abs(extended.intervalDeviation - best.intervalDeviation) <= 1e-9
              && extended.prominence > best.prominence
            )
          )
      );
      if (extendedIsBetter) best = extended;
    }
    chains.push(best);
  });
  const best = chains.reduce<CandidateChain | null>((current, candidate) => {
    if (!current || candidate.indices.length > current.indices.length) return candidate;
    if (candidate.indices.length < current.indices.length) return current;
    if (candidate.intervalDeviation < current.intervalDeviation - 1e-9) return candidate;
    if (
      Math.abs(candidate.intervalDeviation - current.intervalDeviation) <= 1e-9
      && candidate.prominence > current.prominence
    ) return candidate;
    return current;
  }, null);
  return (best?.indices ?? []).flatMap((candidateIndex) => {
    const candidate = candidates[candidateIndex];
    const sample = candidate ? samples[candidate.localIndex] : null;
    return candidate && sample
      ? [{
          ordinal: 0,
          sampleIndex: sample.sampleIndex,
          type: candidate.type,
          timeS: sample.timeS,
          absolutePressureKpa: sample.absolutePressureKpa,
        } satisfies PistonOscillationExtremum]
      : [];
  }).map((extremum, ordinal) => ({ ...extremum, ordinal }));
};

export const analyzePistonOscillationGuidedPeriod = (
  record: PistonOscillationRawMeasurementRecord,
  options: PistonOscillationGuidedPeriodAnalysisOptions = {},
): PistonOscillationGuidedPeriodAnalysis => {
  const recordingEndS = record.samples.at(-1)?.timeS
    ?? record.acquisitionSettings.recordedDurationS;
  const rangeStartTimeS = Math.max(
    0,
    Math.min(recordingEndS, Math.min(
      options.rangeStartTimeS ?? 0,
      options.rangeEndTimeS ?? recordingEndS,
    )),
  );
  const rangeEndTimeS = Math.max(
    rangeStartTimeS,
    Math.min(recordingEndS, Math.max(
      options.rangeStartTimeS ?? 0,
      options.rangeEndTimeS ?? recordingEndS,
    )),
  );
  const hasExplicitRange = options.rangeStartTimeS !== undefined
    || options.rangeEndTimeS !== undefined;
  const rangeContextS = hasExplicitRange
    ? Math.min(0.12, Math.max(0.008, (rangeEndTimeS - rangeStartTimeS) * 0.25))
    : 0;
  const analysisStartTimeS = Math.max(0, rangeStartTimeS - rangeContextS);
  const analysisEndTimeS = Math.min(recordingEndS, rangeEndTimeS + rangeContextS);
  const samples = record.samples.filter((sample) => (
    sample.timeS >= analysisStartTimeS && sample.timeS <= analysisEndTimeS
  ));
  const sampleRateHz = record.acquisitionSettings.sampleRateHz;
  const pressureResolutionKpa = record.sensorObservationSnapshot.pressureResolutionKpa
    ?? Number.EPSILON * Math.max(
      1,
      ...samples.map((sample) => Math.abs(sample.absolutePressureKpa)),
    ) * 16;
  const estimatedNoiseFloorKpa = estimatePistonOscillationNoiseFloorKpa(
    samples,
    pressureResolutionKpa,
  );
  const createReport = (
    status: PistonOscillationGuidedPeriodAnalysisStatus,
    reason: PistonOscillationGuidedPeriodAnalysisReason,
    options: Partial<Omit<
      PistonOscillationGuidedPeriodAnalysis,
      'algorithmVersion' | 'rawMeasurementRecordId' | 'status' | 'reason'
    >> = {},
  ): PistonOscillationGuidedPeriodAnalysis => ({
    algorithmVersion: PISTON_OSCILLATION_PERIOD_SELECTION_ALGORITHM_VERSION,
    rawMeasurementRecordId: record.recordId,
    status,
    reason,
    dominantPeriodSamples: options.dominantPeriodSamples ?? null,
    dominantPeriodCorrelation: options.dominantPeriodCorrelation ?? 0,
    smoothingWindowSamples: options.smoothingWindowSamples ?? 1,
    estimatedNoiseFloorKpa,
    minimumProminenceKpa: options.minimumProminenceKpa ?? 0,
    medianPeriodSamples: options.medianPeriodSamples ?? null,
    periodMadRatio: options.periodMadRatio ?? null,
    primaryExtrema: options.primaryExtrema ?? [],
  });
  if (samples.length < 12 || !Number.isSafeInteger(sampleRateHz) || sampleRateHz <= 0) {
    return createReport('insufficient', 'insufficient-samples');
  }
  const pressureValues = samples.map((sample) => sample.absolutePressureKpa);
  const initialSmoothingWindowSamples = Math.max(
    1,
    Math.min(Math.floor(samples.length / 8), Math.round(sampleRateHz * 0.003)),
  );
  const initiallySmoothed = smoothPistonOscillationPressure(
    pressureValues,
    initialSmoothingWindowSamples,
  );
  const dominantPeriod = estimatePistonOscillationDominantPeriod(
    detrendPistonOscillationPressure(initiallySmoothed),
    sampleRateHz,
  );
  if (dominantPeriod.periodSamples === null) {
    return createReport('ambiguous', 'dominant-period-not-found', {
      smoothingWindowSamples: initialSmoothingWindowSamples,
      dominantPeriodCorrelation: dominantPeriod.correlation,
    });
  }
  const smoothingWindowSamples = Math.max(
    1,
    Math.min(
      Math.floor(samples.length / 8),
      Math.round(dominantPeriod.periodSamples * 0.12),
    ),
  );
  const smoothedPressureKpa = smoothPistonOscillationPressure(
    pressureValues,
    smoothingWindowSamples,
  );
  const pressureRangeKpa = Math.max(
    0,
    getSortedQuantile(pressureValues, 0.95) - getSortedQuantile(pressureValues, 0.05),
  );
  const minimumProminenceKpa = Math.max(
    pressureResolutionKpa * 4,
    estimatedNoiseFloorKpa * 3,
    pressureRangeKpa * 0.025,
  );
  const slopeEpsilonKpa = Math.max(
    Number.EPSILON,
    pressureResolutionKpa / Math.max(2, smoothingWindowSamples * 3),
  );
  const prominenceRadiusSamples = Math.max(
    2,
    Math.round(dominantPeriod.periodSamples * 0.45),
  );
  const prominentCandidates = findSmoothedPistonOscillationExtrema(
    smoothedPressureKpa,
    slopeEpsilonKpa,
    pressureValues,
  ).map((candidate) => ({
    ...candidate,
    prominenceKpa: getPistonOscillationCandidateProminence(
      candidate,
      smoothedPressureKpa,
      prominenceRadiusSamples,
    ),
  })).filter((candidate) => candidate.prominenceKpa >= minimumProminenceKpa);
  const contextualPrimaryExtrema = selectPistonOscillationGuidedExtremumChain(
    prominentCandidates,
    samples,
    dominantPeriod.periodSamples,
  );
  const primaryExtrema = contextualPrimaryExtrema.filter((extremum) => (
    extremum.timeS >= rangeStartTimeS && extremum.timeS <= rangeEndTimeS
  )).map((extremum, ordinal) => ({ ...extremum, ordinal }));
  if (primaryExtrema.length < 3) {
    return createReport('insufficient', 'insufficient-primary-extrema', {
      dominantPeriodSamples: dominantPeriod.periodSamples,
      dominantPeriodCorrelation: dominantPeriod.correlation,
      smoothingWindowSamples,
      minimumProminenceKpa,
      primaryExtrema,
    });
  }
  const samePhasePeriodSamples = primaryExtrema.slice(0, -2).flatMap((extremum, index) => {
    const following = primaryExtrema[index + 2];
    return following && following.type === extremum.type
      ? [following.sampleIndex - extremum.sampleIndex]
      : [];
  });
  const medianPeriodSamples = getSortedQuantile(samePhasePeriodSamples, 0.5);
  const periodMadSamples = getSortedQuantile(
    samePhasePeriodSamples.map((periodSamples) => Math.abs(
      periodSamples - medianPeriodSamples,
    )),
    0.5,
  );
  const periodMadRatio = medianPeriodSamples > 0
    ? periodMadSamples / medianPeriodSamples
    : Number.POSITIVE_INFINITY;
  const dominantPeriodDisagreement = dominantPeriod.periodSamples > 0
    ? Math.abs(medianPeriodSamples - dominantPeriod.periodSamples)
      / dominantPeriod.periodSamples
    : Number.POSITIVE_INFINITY;
  const consistent = samePhasePeriodSamples.length > 0
    && dominantPeriodDisagreement <= 0.12
    && periodMadRatio <= 0.12;
  return createReport(
    consistent ? 'usable' : 'ambiguous',
    consistent ? 'primary-period-found' : 'inconsistent-primary-period',
    {
      dominantPeriodSamples: dominantPeriod.periodSamples,
      dominantPeriodCorrelation: dominantPeriod.correlation,
      smoothingWindowSamples,
      minimumProminenceKpa,
      medianPeriodSamples,
      periodMadRatio,
      primaryExtrema,
    },
  );
};

export const findPistonOscillationGuidedPrimaryExtrema = (
  record: PistonOscillationRawMeasurementRecord,
) => analyzePistonOscillationGuidedPeriod(record).primaryExtrema;

const getSelectionPeriodCount = (
  leftEndpoint: PistonOscillationExtremum,
  rightEndpoint: PistonOscillationExtremum,
) => (rightEndpoint.ordinal - leftEndpoint.ordinal) / 2;

const calculatePistonOscillationPeriodFromSelection = (
  selection: PistonOscillationPeriodSelection,
  sampleRateHz: number,
): number | null => {
  const leftEndpoint = selection.leftEndpoint;
  const rightEndpoint = selection.rightEndpoint;
  if (
    !leftEndpoint
    || !rightEndpoint
    || !Number.isSafeInteger(leftEndpoint.sampleIndex)
    || !Number.isSafeInteger(rightEndpoint.sampleIndex)
    || !Number.isSafeInteger(leftEndpoint.ordinal)
    || !Number.isSafeInteger(rightEndpoint.ordinal)
    || !Number.isSafeInteger(sampleRateHz)
    || sampleRateHz <= 0
  ) return null;
  const sampleIndexDifference = rightEndpoint.sampleIndex - leftEndpoint.sampleIndex;
  const halfPeriodCount = rightEndpoint.ordinal - leftEndpoint.ordinal;
  if (sampleIndexDifference <= 0 || halfPeriodCount <= 0) return null;
  return roundRatioSignificantFiguresHalfEven(
    BigInt(sampleIndexDifference) * BigInt(2),
    BigInt(sampleRateHz) * BigInt(halfPeriodCount),
    PISTON_OSCILLATION_PERIOD_ANSWER_SPEC.precision.digits,
  );
};

export const createPistonOscillationPeriodSelection = (
  record: PistonOscillationRawMeasurementRecord,
  rawRangeStartTimeS: number,
  rawRangeEndTimeS: number,
  minimumPeriodCount: number,
  nowMs: number,
  freeMinimumPeriodCount: number = PISTON_OSCILLATION_FREE_MINIMUM_PERIOD_COUNT,
  extremaMode: 'guided' | 'observed' | 'primary' = 'guided',
): PistonOscillationPeriodSelection => {
  const recordingEndS = record.samples.at(-1)?.timeS
    ?? record.acquisitionSettings.recordedDurationS;
  const rangeStartTimeS = Math.max(
    0,
    Math.min(recordingEndS, Math.min(rawRangeStartTimeS, rawRangeEndTimeS)),
  );
  const rangeEndTimeS = Math.max(
    rangeStartTimeS,
    Math.min(recordingEndS, Math.max(rawRangeStartTimeS, rawRangeEndTimeS)),
  );
  const guidedAnalysis = extremaMode === 'guided'
    ? analyzePistonOscillationGuidedPeriod(record, {
        rangeStartTimeS,
        rangeEndTimeS,
      })
    : null;
  let extrema = (extremaMode === 'primary'
    ? findPistonOscillationPrimaryExtrema(record)
    : extremaMode === 'guided'
      ? guidedAnalysis!.primaryExtrema
      : findPistonOscillationExtrema(record.samples)).filter((extremum) => (
    extremum.timeS >= rangeStartTimeS && extremum.timeS <= rangeEndTimeS
  ));
  let leftEndpoint = extrema[0] ?? null;
  let rightEndpoint = extrema.at(-1) ?? null;
  if (extremaMode === 'guided') {
    const samePhasePairs = (['peak', 'trough'] as const).flatMap((type) => {
      const matching = extrema.filter((extremum) => extremum.type === type);
      const left = matching[0];
      const right = matching.at(-1);
      return left && right && right.ordinal > left.ordinal
        ? [{ left, right }]
        : [];
    });
    const longestPair = samePhasePairs.sort((first, second) => (
      (second.right.ordinal - second.left.ordinal)
      - (first.right.ordinal - first.left.ordinal)
    ))[0] ?? null;
    leftEndpoint = longestPair?.left ?? null;
    rightEndpoint = longestPair?.right ?? null;
    extrema = leftEndpoint && rightEndpoint
      ? extrema.filter((extremum) => (
          extremum.ordinal >= leftEndpoint!.ordinal
          && extremum.ordinal <= rightEndpoint!.ordinal
        ))
      : [];
  }
  const periodCount = leftEndpoint && rightEndpoint
    ? getSelectionPeriodCount(leftEndpoint, rightEndpoint)
    : 0;
  const issue = periodCount < freeMinimumPeriodCount
    ? 'insufficient-extrema' as const
    : periodCount < minimumPeriodCount
      ? 'below-guided-minimum' as const
      : guidedAnalysis?.status === 'ambiguous'
        ? 'ambiguous-primary-period' as const
      : null;
  return {
    algorithmVersion: extremaMode === 'primary'
      ? PISTON_OSCILLATION_FREE_PERIOD_SELECTION_ALGORITHM_VERSION
      : PISTON_OSCILLATION_PERIOD_SELECTION_ALGORITHM_VERSION,
    rangeStartTimeS,
    rangeEndTimeS,
    extrema,
    leftEndpoint,
    rightEndpoint,
    periodCount,
    issue,
    selectedAtMs: nowMs,
  };
};

export const createPistonOscillationFreePeriodSelection = (
  record: PistonOscillationRawMeasurementRecord,
  rawRangeStartTimeS: number,
  rawRangeEndTimeS: number,
  nowMs: number,
) => createPistonOscillationPeriodSelection(
  record,
  rawRangeStartTimeS,
  rawRangeEndTimeS,
  PISTON_OSCILLATION_FREE_MINIMUM_PERIOD_COUNT,
  nowMs,
  PISTON_OSCILLATION_FREE_MINIMUM_PERIOD_COUNT,
  'primary',
);

const createAnswer = (): PistonOscillationPeriodAnswerState => ({
  draftRaw: '',
  expectedValue: null,
  status: 'unresolved',
  feedback: null,
  attemptCount: 0,
  attempts: [],
  resolution: null,
});

export const createPistonOscillationProcessingPolicySnapshot = (
  answerValidationMode: PistonOscillationAnswerValidationMode = 'stepwise',
): PistonOscillationProcessingPolicySnapshot => ({
  schemaVersion: 2,
  policyVersion: PISTON_OSCILLATION_PROCESSING_POLICY_VERSION,
  guidedMinimumPeriodCount: PISTON_OSCILLATION_GUIDED_MINIMUM_PERIOD_COUNT,
  freeMinimumPeriodCount: PISTON_OSCILLATION_FREE_MINIMUM_PERIOD_COUNT,
  answerValidationMode,
});

export const createPistonOscillationScoringPolicySnapshot = (
  records: readonly PistonOscillationRawMeasurementRecord[],
): PistonOscillationScoringPolicySnapshot => {
  const experimentContext = requireConsistentPistonOscillationExperimentContextSnapshot(records);
  // Records created before experiment groups existed are Real measurements by
  // definition. Current records always carry an explicit group-bound scheme.
  const scheme = experimentContext?.scheme ?? 'real';
  return {
    schemaVersion: 1,
    policyVersion: PISTON_OSCILLATION_SCORING_POLICY_VERSION,
    scheme,
    scoringEligible: scheme === 'real',
  };
};

const createRun = (
  record: PistonOscillationRawMeasurementRecord,
): PistonOscillationPeriodRunState => ({
  rawMeasurementRecordId: record.recordId,
  measurementIndex: record.measurementIndex,
  targetHeightMm: record.targetHeightMm,
  fitHeightMm: record.experimentContext?.scheme === 'ideal'
    ? record.confirmedHeightMm
    : record.targetHeightMm,
  sampleRateHz: record.acquisitionSettings.sampleRateHz,
  selection: null,
  answers: {
    t1: createAnswer(),
    t2: createAnswer(),
    period: createAnswer(),
  },
  batchAttempts: [],
  result: null,
});

const createCalculationAnswer = (
  expectedValue: number | null = null,
): PistonOscillationCalculationAnswerState => ({
  draftRaw: '',
  expectedValue,
  status: 'unresolved',
  feedback: null,
  attempts: [],
  resolution: null,
});

export const createPistonOscillationCalculationSession = (
  records: readonly PistonOscillationRawMeasurementRecord[],
  nowMs: number,
): PistonOscillationCalculationSessionSnapshot => {
  const knowns = createPistonOscillationCalculationKnownsSnapshot(records);
  const areaM2 = calculateDisplayedPistonAreaM2(knowns);
  return {
    schemaVersion: 2,
    status: 'selecting-points',
    knowns,
    selectedRunIndices: [],
    activeFieldId: null,
    visibleFieldIds: [],
    answers: {
      area: createCalculationAnswer(areaM2),
      gamma: createCalculationAnswer(),
      relativeError: createCalculationAnswer(),
    },
    batchAttempts: [],
    startedAtMs: nowMs,
    completedAtMs: null,
  };
};

export interface CreatePistonOscillationDataProcessingSessionOptions {
  answerValidationMode?: PistonOscillationAnswerValidationMode;
}

export const createPistonOscillationDataProcessingSession = (
  records: readonly PistonOscillationRawMeasurementRecord[],
  nowMs: number,
  options: CreatePistonOscillationDataProcessingSessionOptions = {},
): PistonOscillationDataProcessingSession => {
  requireConsistentPistonOscillationGasMaterialSnapshot(records);
  const scoringPolicy = createPistonOscillationScoringPolicySnapshot(records);
  return {
    schemaVersion: PISTON_OSCILLATION_DATA_PROCESSING_SCHEMA_VERSION,
    processingPolicy: createPistonOscillationProcessingPolicySnapshot(
      options.answerValidationMode,
    ),
    scoringPolicy,
    status: 'period-processing',
    activeRunIndex: 0,
    runs: [...records]
      .sort((first, second) => first.measurementIndex - second.measurementIndex)
      .map(createRun),
    linearFitResult: null,
    calculationSession: null,
    audit: [],
    startedAtMs: nowMs,
    updatedAtMs: nowMs,
  };
};

const appendAudit = (
  session: PistonOscillationDataProcessingSession,
  type: PistonOscillationDataProcessingAuditEventType,
  runIndex: number,
  atMs: number,
  payload: PistonOscillationDataProcessingAuditEvent['payload'],
): PistonOscillationDataProcessingAuditEvent[] => [
  ...session.audit,
  {
    id: `${atMs}:${session.audit.length}:${type}:${runIndex}`,
    atMs,
    type,
    runIndex,
    payload,
  },
];

const replaceRun = (
  session: PistonOscillationDataProcessingSession,
  runIndex: number,
  replace: (run: PistonOscillationPeriodRunState) => PistonOscillationPeriodRunState,
): PistonOscillationDataProcessingSession => ({
  ...session,
  runs: session.runs.map((run, index) => index === runIndex ? replace(run) : run),
});

export const clearPistonOscillationPeriodSelection = (
  session: PistonOscillationDataProcessingSession,
  runIndex: number,
  nowMs: number,
): PistonOscillationDataProcessingSession => {
  const run = session.runs[runIndex];
  if (
    session.status !== 'period-processing'
    || runIndex !== session.activeRunIndex
    || !run
    || run.result !== null
  ) return session;
  return {
    ...replaceRun(session, runIndex, (current) => ({
      ...current,
      selection: null,
      answers: {
        t1: createAnswer(),
        t2: createAnswer(),
        period: createAnswer(),
      },
      batchAttempts: [],
    })),
    updatedAtMs: nowMs,
  };
};

const selectPistonOscillationPeriodRangeWithMinimum = (
  session: PistonOscillationDataProcessingSession,
  records: readonly PistonOscillationRawMeasurementRecord[],
  runIndex: number,
  rangeStartTimeS: number,
  rangeEndTimeS: number,
  minimumPeriodCount: number,
  nowMs: number,
  extremaMode: 'guided' | 'observed' | 'primary' = 'guided',
): PistonOscillationDataProcessingSession => {
  const run = session.runs[runIndex];
  const record = run
    ? records.find((candidate) => candidate.recordId === run.rawMeasurementRecordId)
    : null;
  if (
    session.status !== 'period-processing'
    || runIndex !== session.activeRunIndex
    || !run
    || run.result !== null
    || !record
    || !Number.isFinite(rangeStartTimeS)
    || !Number.isFinite(rangeEndTimeS)
  ) return session;
  const selection = createPistonOscillationPeriodSelection(
    record,
    rangeStartTimeS,
    rangeEndTimeS,
    minimumPeriodCount,
    nowMs,
    session.processingPolicy.freeMinimumPeriodCount,
    extremaMode,
  );
  const t1 = createAnswer();
  const t2 = createAnswer();
  if (selection.leftEndpoint && selection.rightEndpoint) {
    t1.expectedValue = selection.leftEndpoint.timeS;
    t2.expectedValue = selection.rightEndpoint.timeS;
  }
  const next = replaceRun(session, runIndex, (current) => ({
    ...current,
    selection,
    answers: {
      t1,
      t2,
      period: createAnswer(),
    },
    batchAttempts: [],
    result: null,
  }));
  return {
    ...next,
    updatedAtMs: nowMs,
    audit: appendAudit(session, 'selection-finalized', runIndex, nowMs, {
      rangeStartTimeS: selection.rangeStartTimeS,
      rangeEndTimeS: selection.rangeEndTimeS,
      leftSampleIndex: selection.leftEndpoint?.sampleIndex ?? null,
      rightSampleIndex: selection.rightEndpoint?.sampleIndex ?? null,
      leftPhase: selection.leftEndpoint?.type ?? null,
      rightPhase: selection.rightEndpoint?.type ?? null,
      periodCount: selection.periodCount,
      accepted: selection.issue === null,
      issue: selection.issue,
    }),
  };
};

export const selectPistonOscillationPeriodRange = (
  session: PistonOscillationDataProcessingSession,
  records: readonly PistonOscillationRawMeasurementRecord[],
  runIndex: number,
  rangeStartTimeS: number,
  rangeEndTimeS: number,
  _minimumPeriodCount: number,
  nowMs: number,
) => selectPistonOscillationPeriodRangeWithMinimum(
  session,
  records,
  runIndex,
  rangeStartTimeS,
  rangeEndTimeS,
  session.processingPolicy.guidedMinimumPeriodCount,
  nowMs,
  'guided',
);

export const selectPistonOscillationFreePeriodRange = (
  session: PistonOscillationDataProcessingSession,
  records: readonly PistonOscillationRawMeasurementRecord[],
  runIndex: number,
  rangeStartTimeS: number,
  rangeEndTimeS: number,
  nowMs: number,
) => selectPistonOscillationPeriodRangeWithMinimum(
  session,
  records,
  runIndex,
  rangeStartTimeS,
  rangeEndTimeS,
  session.processingPolicy.freeMinimumPeriodCount,
  nowMs,
  'primary',
);

export const updatePistonOscillationPeriodAnswerDraft = (
  session: PistonOscillationDataProcessingSession,
  runIndex: number,
  field: PistonOscillationPeriodAnswerField,
  draftRaw: string,
  nowMs: number,
): PistonOscillationDataProcessingSession => {
  const run = session.runs[runIndex];
  if (
    session.status !== 'period-processing'
    || runIndex !== session.activeRunIndex
    || !run
    || run.result !== null
    || run.answers[field].status !== 'unresolved'
    || run.answers[field].feedback !== null
  ) return session;
  return {
    ...replaceRun(session, runIndex, (current) => ({
      ...current,
      answers: {
        ...current.answers,
        [field]: {
          ...current.answers[field],
          draftRaw,
        },
      },
    })),
    updatedAtMs: nowMs,
  };
};

const getFeedback = (
  validation: ReturnType<typeof validateNumericAnswer>,
): PistonOscillationPeriodAnswerFeedback | null => {
  if (validation.correct) return null;
  const outcome = validation.parseResult.status === 'empty'
    ? 'empty' as const
    : validation.parseResult.status === 'invalid'
      ? 'invalid' as const
      : validation.numericCorrect && !validation.precisionCorrect
        ? 'precision-wrong' as const
        : !validation.numericCorrect && validation.precisionCorrect
          ? 'numeric-wrong' as const
          : 'wrong' as const;
  return {
    outcome,
    numericCorrect: validation.numericCorrect,
    precisionCorrect: validation.precisionCorrect,
  };
};

const submitAnswer = (
  answer: PistonOscillationPeriodAnswerState,
  spec: NumericAnswerSpec,
  nowMs: number,
) => {
  if (answer.status !== 'unresolved' || answer.feedback !== null || answer.expectedValue === null) {
    return { answer, outcome: null as string | null };
  }
  const validation = validateNumericAnswer(answer.draftRaw, answer.expectedValue, spec);
  const feedback = getFeedback(validation);
  const outcome = validation.correct ? 'correct' as const : feedback?.outcome ?? 'wrong';
  const attempts = [
    ...answer.attempts,
    {
      attemptIndex: answer.attempts.length + 1,
      attemptedAtMs: nowMs,
      draftRaw: answer.draftRaw,
      inputKnown: true,
      parsedValue: validation.parseResult.status === 'valid'
        ? validation.parseResult.parsed.value
        : null,
      outcome,
      numericCorrect: validation.numericCorrect,
      precisionCorrect: validation.precisionCorrect,
    } satisfies PistonOscillationAnswerAttemptSnapshot,
  ];
  const resolution: PistonOscillationAnswerResolution = validation.correct
    ? attempts.length === 1 ? 'first-correct' : 'retry-correct'
    : null;
  return {
    answer: {
      ...answer,
      status: validation.correct ? 'correct' as const : 'unresolved' as const,
      feedback,
      attemptCount: attempts.length,
      attempts,
      resolution,
    },
    outcome,
  };
};

const areEndpointsResolved = (run: PistonOscillationPeriodRunState) => (
  run.answers.t1.status !== 'unresolved' && run.answers.t2.status !== 'unresolved'
);

export const submitPistonOscillationPeriodEndpoints = (
  session: PistonOscillationDataProcessingSession,
  runIndex: number,
  nowMs: number,
): PistonOscillationDataProcessingSession => {
  const run = session.runs[runIndex];
  if (
    session.status !== 'period-processing'
    || runIndex !== session.activeRunIndex
    || !run
    || run.selection?.issue !== null
    || !run.selection?.leftEndpoint
    || !run.selection.rightEndpoint
    || run.result !== null
  ) return session;
  const t1Submission = submitAnswer(
    run.answers.t1,
    PISTON_OSCILLATION_ENDPOINT_TIME_ANSWER_SPEC,
    nowMs,
  );
  const t2Submission = submitAnswer(
    run.answers.t2,
    PISTON_OSCILLATION_ENDPOINT_TIME_ANSWER_SPEC,
    nowMs,
  );
  let nextRun: PistonOscillationPeriodRunState = {
    ...run,
    answers: {
      ...run.answers,
      t1: t1Submission.answer,
      t2: t2Submission.answer,
    },
  };
  if (areEndpointsResolved(nextRun)) {
    nextRun = {
      ...nextRun,
      answers: {
        ...nextRun.answers,
        period: {
          ...nextRun.answers.period,
          expectedValue: calculatePistonOscillationPeriodFromSelection(
            nextRun.selection!,
            nextRun.sampleRateHz,
          ),
        },
      },
    };
  }
  const next = replaceRun(session, runIndex, () => nextRun);
  return {
    ...next,
    updatedAtMs: nowMs,
    audit: appendAudit(session, 'endpoint-submitted', runIndex, nowMs, {
      t1DraftRaw: run.answers.t1.draftRaw,
      t2DraftRaw: run.answers.t2.draftRaw,
      t1Outcome: t1Submission.outcome,
      t2Outcome: t2Submission.outcome,
      endpointsResolved: areEndpointsResolved(nextRun),
    }),
  };
};

export const continuePistonOscillationPeriodAnswer = (
  session: PistonOscillationDataProcessingSession,
  runIndex: number,
  field: PistonOscillationPeriodAnswerField,
  nowMs: number,
): PistonOscillationDataProcessingSession => {
  const run = session.runs[runIndex];
  if (
    session.status !== 'period-processing'
    || runIndex !== session.activeRunIndex
    || !run
    || run.answers[field].status !== 'unresolved'
    || run.answers[field].feedback === null
  ) return session;
  return {
    ...replaceRun(session, runIndex, (current) => ({
      ...current,
      answers: {
        ...current.answers,
        [field]: {
          ...current.answers[field],
          feedback: null,
        },
      },
    })),
    updatedAtMs: nowMs,
  };
};

const createPeriodResult = (
  run: PistonOscillationPeriodRunState,
  completedAtMs: number,
): PistonOscillationPeriodResult | null => {
  const selection = run.selection;
  if (
    !selection?.leftEndpoint
    || !selection.rightEndpoint
    || selection.issue !== null
    || run.answers.period.expectedValue === null
  ) return null;
  const t1S = run.answers.t1.expectedValue!;
  const t2S = run.answers.t2.expectedValue!;
  const periodS = calculatePistonOscillationPeriodFromSelection(
    selection,
    run.sampleRateHz,
  );
  if (periodS === null) return null;
  return {
    resultVersion: 2,
    leftSampleIndex: selection.leftEndpoint.sampleIndex,
    rightSampleIndex: selection.rightEndpoint.sampleIndex,
    leftPhase: selection.leftEndpoint.type,
    rightPhase: selection.rightEndpoint.type,
    phaseSpan: `${selection.leftEndpoint.type}-to-${selection.rightEndpoint.type}`,
    t1S,
    t2S,
    periodCount: selection.periodCount,
    deltaTimeS: (
      selection.rightEndpoint.sampleIndex - selection.leftEndpoint.sampleIndex
    ) / run.sampleRateHz,
    periodS,
    periodSquaredS2: roundProductSignificantFiguresHalfEven(periodS, periodS, 5),
    completedAtMs,
  };
};

export const revealPistonOscillationPeriodAnswer = (
  session: PistonOscillationDataProcessingSession,
  runIndex: number,
  field: PistonOscillationPeriodAnswerField,
  nowMs: number,
): PistonOscillationDataProcessingSession => {
  const run = session.runs[runIndex];
  const currentAnswer = run?.answers[field];
  if (
    session.status !== 'period-processing'
    || runIndex !== session.activeRunIndex
    || !run
    || !currentAnswer
    || currentAnswer.status !== 'unresolved'
    || currentAnswer.feedback === null
    || currentAnswer.expectedValue === null
  ) return session;
  let nextRun: PistonOscillationPeriodRunState = {
    ...run,
    answers: {
      ...run.answers,
      [field]: {
        ...currentAnswer,
        draftRaw: field === 'period'
          ? formatPistonOscillationPeriod(currentAnswer.expectedValue)
          : formatPistonOscillationEndpointTime(currentAnswer.expectedValue),
        status: 'revealed',
        feedback: null,
        resolution: currentAnswer.attempts.some((attempt) => attempt.parsedValue !== null)
          ? 'revealed-after-attempt'
          : 'revealed-without-valid-attempt',
      },
    },
  };
  if ((field === 't1' || field === 't2') && areEndpointsResolved(nextRun)) {
    nextRun = {
      ...nextRun,
      answers: {
        ...nextRun.answers,
        period: {
          ...nextRun.answers.period,
          expectedValue: calculatePistonOscillationPeriodFromSelection(
            nextRun.selection!,
            nextRun.sampleRateHz,
          ),
        },
      },
    };
  }
  if (field === 'period') {
    nextRun = {
      ...nextRun,
      result: createPeriodResult(nextRun, nowMs),
    };
  }
  const next = replaceRun(session, runIndex, () => nextRun);
  const audit = appendAudit(session, 'answer-revealed', runIndex, nowMs, {
    field,
    revealedDraftRaw: nextRun.answers[field].draftRaw,
  });
  return {
    ...next,
    updatedAtMs: nowMs,
    audit: nextRun.result
      ? [
          ...audit,
          {
            id: `${nowMs}:${audit.length}:run-completed:${runIndex}`,
            atMs: nowMs,
            type: 'run-completed',
            runIndex,
            payload: {
              periodS: nextRun.result.periodS,
              periodSquaredS2: nextRun.result.periodSquaredS2,
              revealed: true,
            },
          },
        ]
      : audit,
  };
};

export const submitPistonOscillationPeriod = (
  session: PistonOscillationDataProcessingSession,
  runIndex: number,
  nowMs: number,
): PistonOscillationDataProcessingSession => {
  const run = session.runs[runIndex];
  if (
    session.status !== 'period-processing'
    || runIndex !== session.activeRunIndex
    || !run
    || !areEndpointsResolved(run)
    || run.answers.period.expectedValue === null
    || run.result !== null
  ) return session;
  const submission = submitAnswer(
    run.answers.period,
    PISTON_OSCILLATION_PERIOD_ANSWER_SPEC,
    nowMs,
  );
  let nextRun: PistonOscillationPeriodRunState = {
    ...run,
    answers: {
      ...run.answers,
      period: submission.answer,
    },
  };
  if (submission.answer.status === 'correct') {
    nextRun = {
      ...nextRun,
      result: createPeriodResult(nextRun, nowMs),
    };
  }
  const next = replaceRun(session, runIndex, () => nextRun);
  const audit = appendAudit(session, 'period-submitted', runIndex, nowMs, {
    draftRaw: run.answers.period.draftRaw,
    outcome: submission.outcome,
  });
  return {
    ...next,
    updatedAtMs: nowMs,
    audit: nextRun.result
      ? [
          ...audit,
          {
            id: `${nowMs}:${audit.length}:run-completed:${runIndex}`,
            atMs: nowMs,
            type: 'run-completed',
            runIndex,
            payload: {
              periodS: nextRun.result.periodS,
              periodSquaredS2: nextRun.result.periodSquaredS2,
              revealed: false,
            },
          },
        ]
      : audit,
  };
};

const PERIOD_BATCH_FIELD_ORDER: readonly PistonOscillationPeriodAnswerField[] = [
  't1',
  't2',
  'period',
];

const getPistonOscillationPeriodAnswerSpec = (
  field: PistonOscillationPeriodAnswerField,
) => field === 'period'
  ? PISTON_OSCILLATION_PERIOD_ANSWER_SPEC
  : PISTON_OSCILLATION_ENDPOINT_TIME_ANSWER_SPEC;

export const getInvalidPistonOscillationPeriodBatchFields = (
  run: PistonOscillationPeriodRunState,
) => PERIOD_BATCH_FIELD_ORDER.filter((field) => (
  parseNumericAnswerInput(run.answers[field].draftRaw).status !== 'valid'
));

export const revealPistonOscillationFreePeriodEntry = (
  session: PistonOscillationDataProcessingSession,
  runIndex: number,
  nowMs: number,
): PistonOscillationDataProcessingSession => {
  const run = session.runs[runIndex];
  if (
    session.processingPolicy.answerValidationMode !== 'batch'
    || session.status !== 'period-processing'
    || runIndex !== session.activeRunIndex
    || !run
    || run.selection?.issue !== null
    || !run.selection?.leftEndpoint
    || !run.selection.rightEndpoint
    || run.result !== null
    || run.answers.period.expectedValue !== null
    || run.answers.t1.draftRaw.trim().length === 0
    || run.answers.t2.draftRaw.trim().length === 0
  ) return session;
  const expectedValue = calculatePistonOscillationPeriodFromSelection(
    run.selection,
    run.sampleRateHz,
  );
  if (expectedValue === null) return session;
  return {
    ...replaceRun(session, runIndex, (current) => ({
      ...current,
      answers: {
        ...current.answers,
        period: {
          ...current.answers.period,
          expectedValue,
        },
      },
    })),
    audit: appendAudit(session, 'period-entry-revealed', runIndex, nowMs, {
      t1DraftRaw: run.answers.t1.draftRaw,
      t2DraftRaw: run.answers.t2.draftRaw,
    }),
    updatedAtMs: nowMs,
  };
};

const createBatchFieldAttemptSnapshot = (
  answer: PistonOscillationPeriodAnswerState | PistonOscillationCalculationAnswerState,
  spec: NumericAnswerSpec,
  attemptIndex: number,
  nowMs: number,
): PistonOscillationAnswerAttemptSnapshot => {
  if (answer.expectedValue === null) {
    return {
      attemptIndex,
      attemptedAtMs: nowMs,
      draftRaw: answer.draftRaw,
      inputKnown: true,
      parsedValue: null,
      outcome: 'unknown',
      numericCorrect: null,
      precisionCorrect: null,
    };
  }
  const validation = validateNumericAnswer(answer.draftRaw, answer.expectedValue, spec);
  const feedback = getFeedback(validation);
  return {
    attemptIndex,
    attemptedAtMs: nowMs,
    draftRaw: answer.draftRaw,
    inputKnown: true,
    parsedValue: validation.parseResult.status === 'valid'
      ? validation.parseResult.parsed.value
      : null,
    outcome: validation.correct ? 'correct' : feedback?.outcome ?? 'wrong',
    numericCorrect: validation.numericCorrect,
    precisionCorrect: validation.precisionCorrect,
  };
};

export const continuePistonOscillationFreePeriodBatch = (
  session: PistonOscillationDataProcessingSession,
  runIndex: number,
  nowMs: number,
): PistonOscillationDataProcessingSession => {
  const run = session.runs[runIndex];
  if (
    session.processingPolicy.answerValidationMode !== 'batch'
    || session.status !== 'period-processing'
    || runIndex !== session.activeRunIndex
    || !run
    || !PERIOD_BATCH_FIELD_ORDER.some((field) => (
      run.answers[field].status === 'unresolved'
      && run.answers[field].feedback !== null
    ))
  ) return session;
  return {
    ...replaceRun(session, runIndex, (current) => ({
      ...current,
      answers: Object.fromEntries(PERIOD_BATCH_FIELD_ORDER.map((field) => [
        field,
        current.answers[field].status === 'unresolved'
          ? { ...current.answers[field], feedback: null }
          : current.answers[field],
      ])) as PistonOscillationPeriodRunState['answers'],
    })),
    updatedAtMs: nowMs,
  };
};

export const submitPistonOscillationFreePeriodBatch = (
  session: PistonOscillationDataProcessingSession,
  runIndex: number,
  nowMs: number,
): PistonOscillationDataProcessingSession => {
  const run = session.runs[runIndex];
  if (
    session.processingPolicy.answerValidationMode !== 'batch'
    || session.status !== 'period-processing'
    || runIndex !== session.activeRunIndex
    || !run
    || run.selection?.issue !== null
    || run.answers.period.expectedValue === null
    || run.result !== null
    || getInvalidPistonOscillationPeriodBatchFields(run).length > 0
    || PERIOD_BATCH_FIELD_ORDER.some((field) => run.answers[field].feedback !== null)
  ) return session;
  const attemptIndex = run.batchAttempts.length + 1;
  const fieldSnapshots = Object.fromEntries(PERIOD_BATCH_FIELD_ORDER.map((field) => [
    field,
    createBatchFieldAttemptSnapshot(
      run.answers[field],
      getPistonOscillationPeriodAnswerSpec(field),
      attemptIndex,
      nowMs,
    ),
  ])) as PistonOscillationPeriodBatchAttemptSnapshot['fields'];
  const answers = Object.fromEntries(PERIOD_BATCH_FIELD_ORDER.map((field) => {
    const current = run.answers[field];
    if (current.status !== 'unresolved') return [field, current];
    return [
      field,
      submitAnswer(current, getPistonOscillationPeriodAnswerSpec(field), nowMs).answer,
    ];
  })) as PistonOscillationPeriodRunState['answers'];
  let nextRun: PistonOscillationPeriodRunState = {
    ...run,
    answers,
    batchAttempts: [
      ...run.batchAttempts,
      {
        attemptIndex,
        attemptedAtMs: nowMs,
        fields: fieldSnapshots,
        allCorrect: PERIOD_BATCH_FIELD_ORDER.every((field) => (
          fieldSnapshots[field].outcome === 'correct'
        )),
      },
    ],
  };
  const allResolved = PERIOD_BATCH_FIELD_ORDER.every((field) => (
    nextRun.answers[field].status !== 'unresolved'
  ));
  if (allResolved) nextRun = { ...nextRun, result: createPeriodResult(nextRun, nowMs) };
  const next = replaceRun(session, runIndex, () => nextRun);
  const audit = appendAudit(session, 'period-batch-submitted', runIndex, nowMs, {
    attemptIndex,
    t1Outcome: fieldSnapshots.t1.outcome,
    t2Outcome: fieldSnapshots.t2.outcome,
    periodOutcome: fieldSnapshots.period.outcome,
    allCorrect: allResolved,
  });
  return {
    ...next,
    updatedAtMs: nowMs,
    audit: nextRun.result
      ? [
          ...audit,
          {
            id: `${nowMs}:${audit.length}:run-completed:${runIndex}`,
            atMs: nowMs,
            type: 'run-completed',
            runIndex,
            payload: {
              periodS: nextRun.result.periodS,
              periodSquaredS2: nextRun.result.periodSquaredS2,
              revealed: false,
              validationMode: 'batch',
            },
          },
        ]
      : audit,
  };
};

export const revealPistonOscillationFreePeriodAnswer = (
  session: PistonOscillationDataProcessingSession,
  runIndex: number,
  field: PistonOscillationPeriodAnswerField,
  nowMs: number,
): PistonOscillationDataProcessingSession => {
  const run = session.runs[runIndex];
  const currentAnswer = run?.answers[field];
  if (
    session.processingPolicy.answerValidationMode !== 'batch'
    || session.status !== 'period-processing'
    || runIndex !== session.activeRunIndex
    || !run
    || !currentAnswer
    || currentAnswer.status !== 'unresolved'
    || currentAnswer.feedback === null
    || currentAnswer.expectedValue === null
  ) return session;
  let nextRun: PistonOscillationPeriodRunState = {
    ...run,
    answers: {
      ...run.answers,
      [field]: {
        ...currentAnswer,
        draftRaw: field === 'period'
          ? formatPistonOscillationPeriod(currentAnswer.expectedValue)
          : formatPistonOscillationEndpointTime(currentAnswer.expectedValue),
        status: 'revealed',
        feedback: null,
        resolution: currentAnswer.attempts.some((attempt) => attempt.parsedValue !== null)
          ? 'revealed-after-attempt'
          : 'revealed-without-valid-attempt',
      },
    },
  };
  const allResolved = PERIOD_BATCH_FIELD_ORDER.every((candidate) => (
    nextRun.answers[candidate].status !== 'unresolved'
  ));
  if (allResolved) nextRun = { ...nextRun, result: createPeriodResult(nextRun, nowMs) };
  const next = replaceRun(session, runIndex, () => nextRun);
  const audit = appendAudit(session, 'answer-revealed', runIndex, nowMs, {
    field,
    revealedDraftRaw: nextRun.answers[field].draftRaw,
    validationMode: 'batch',
  });
  return {
    ...next,
    updatedAtMs: nowMs,
    audit: nextRun.result
      ? [
          ...audit,
          {
            id: `${nowMs}:${audit.length}:run-completed:${runIndex}`,
            atMs: nowMs,
            type: 'run-completed',
            runIndex,
            payload: {
              periodS: nextRun.result.periodS,
              periodSquaredS2: nextRun.result.periodSquaredS2,
              revealed: true,
              validationMode: 'batch',
            },
          },
        ]
      : audit,
  };
};

export const advancePistonOscillationPeriodRun = (
  session: PistonOscillationDataProcessingSession,
  nowMs: number,
  records: readonly PistonOscillationRawMeasurementRecord[] = [],
): PistonOscillationDataProcessingSession => {
  if (session.status !== 'period-processing') return session;
  const run = session.runs[session.activeRunIndex];
  if (!run?.result) return session;
  const isLastRun = session.activeRunIndex === session.runs.length - 1;
  const audit = appendAudit(
    session,
    isLastRun ? 'calculation-ready' : 'run-advanced',
    session.activeRunIndex,
    nowMs,
    {
      nextRunIndex: isLastRun ? null : session.activeRunIndex + 1,
    },
  );
  return {
    ...session,
    status: isLastRun ? 'calculation-ready' : session.status,
    activeRunIndex: isLastRun ? session.activeRunIndex : session.activeRunIndex + 1,
    calculationSession: isLastRun
      ? createPistonOscillationCalculationSession(records, nowMs)
      : session.calculationSession,
    updatedAtMs: nowMs,
    audit,
  };
};

export const reopenPreviousPistonOscillationPeriodRun = (
  session: PistonOscillationDataProcessingSession,
  nowMs: number,
): PistonOscillationDataProcessingSession => {
  if (
    session.status !== 'period-processing'
    || session.activeRunIndex <= 0
  ) return session;
  const previousRunIndex = session.activeRunIndex - 1;
  const archivedRunsJson = JSON.stringify(
    session.runs.slice(previousRunIndex).map((run, offset) => ({
      runIndex: previousRunIndex + offset,
      selection: run.selection,
      answers: run.answers,
      result: run.result,
    })),
  );
  return {
    ...session,
    activeRunIndex: previousRunIndex,
    runs: session.runs.map((run, runIndex) => runIndex < previousRunIndex
      ? run
      : {
          ...run,
          selection: null,
          answers: {
            t1: createAnswer(),
            t2: createAnswer(),
            period: createAnswer(),
          },
          batchAttempts: [],
          result: null,
        }),
    linearFitResult: null,
    calculationSession: null,
    audit: appendAudit(session, 'run-reopened', previousRunIndex, nowMs, {
      previousActiveRunIndex: session.activeRunIndex,
      archivedRunsJson,
    }),
    updatedAtMs: nowMs,
  };
};

export const replacePistonOscillationProcessingMeasurement = (
  session: PistonOscillationDataProcessingSession,
  records: readonly PistonOscillationRawMeasurementRecord[],
  runIndex: number,
  replacement: PistonOscillationRawMeasurementRecord,
  nowMs: number,
): PistonOscillationDataProcessingSession => {
  const existingRun = session.runs[runIndex];
  if (
    session.processingPolicy.answerValidationMode !== 'batch'
    || session.status !== 'period-processing'
    || runIndex !== session.activeRunIndex
    || !existingRun
    || replacement.measurementIndex !== existingRun.measurementIndex
    || !records.some((record) => record.recordId === replacement.recordId)
  ) return session;
  const replacementRun = createRun(replacement);
  return {
    ...session,
    runs: session.runs.map((run, index) => index === runIndex ? replacementRun : run),
    activeRunIndex: runIndex,
    linearFitResult: null,
    calculationSession: null,
    audit: appendAudit(session, 'measurement-replaced', runIndex, nowMs, {
      previousRecordId: existingRun.rawMeasurementRecordId,
      replacementRecordId: replacement.recordId,
      measurementIndex: replacement.measurementIndex,
    }),
    updatedAtMs: nowMs,
  };
};

const getLinearFitPoint = (
  run: PistonOscillationPeriodRunState,
  runIndex: number,
): PistonOscillationLinearFitPointSnapshot | null => {
  if (!run.result) return null;
  const periodSquaredS2 = roundSignificantFiguresHalfEven(
    run.result.periodSquaredS2,
    5,
  );
  const heightMm = roundSignificantFiguresHalfEven(run.fitHeightMm, 4);
  return {
    runIndex,
    measurementIndex: run.measurementIndex,
    rawMeasurementRecordId: run.rawMeasurementRecordId,
    periodSquaredS2,
    heightMm,
    heightM: heightMm / 1000,
  };
};

export const calculatePistonOscillationLinearFit = (
  points: readonly PistonOscillationLinearFitPointSnapshot[],
  completedAtMs: number,
): PistonOscillationLinearFitResultSnapshot | null => {
  if (points.length < PISTON_OSCILLATION_GUIDED_MINIMUM_FIT_POINT_COUNT) return null;
  const meanX = points.reduce((sum, point) => sum + point.periodSquaredS2, 0)
    / points.length;
  const meanY = points.reduce((sum, point) => sum + point.heightM, 0)
    / points.length;
  let covariance = 0;
  let varianceX = 0;
  for (const point of points) {
    const deltaX = point.periodSquaredS2 - meanX;
    covariance += deltaX * (point.heightM - meanY);
    varianceX += deltaX ** 2;
  }
  if (!Number.isFinite(varianceX) || varianceX <= Number.EPSILON) return null;
  const slopeMPerS2 = covariance / varianceX;
  const interceptM = meanY - slopeMPerS2 * meanX;
  const residualSumSquares = points.reduce((sum, point) => {
    const expectedHeightM = slopeMPerS2 * point.periodSquaredS2 + interceptM;
    return sum + (point.heightM - expectedHeightM) ** 2;
  }, 0);
  const totalSumSquares = points.reduce(
    (sum, point) => sum + (point.heightM - meanY) ** 2,
    0,
  );
  const rSquared = totalSumSquares <= Number.EPSILON
    ? residualSumSquares <= Number.EPSILON ? 1 : 0
    : 1 - residualSumSquares / totalSumSquares;
  if (
    !Number.isFinite(slopeMPerS2)
    || !Number.isFinite(interceptM)
    || !Number.isFinite(rSquared)
  ) return null;
  return {
    schemaVersion: 1,
    algorithmVersion: PISTON_OSCILLATION_LINEAR_FIT_ALGORITHM_VERSION,
    slopeMPerS2,
    interceptM,
    rSquared,
    selectedRunIndices: points.map((point) => point.runIndex),
    points: points.map((point) => ({ ...point })),
    completedAtMs,
  };
};

export const togglePistonOscillationFitRun = (
  session: PistonOscillationDataProcessingSession,
  runIndex: number,
  nowMs: number,
): PistonOscillationDataProcessingSession => {
  const calculationSession = session.calculationSession;
  const run = session.runs[runIndex];
  if (
    session.status !== 'calculation-ready'
    || !calculationSession
    || calculationSession.status !== 'selecting-points'
    || session.linearFitResult !== null
    || !run?.result
  ) return session;
  const selected = calculationSession.selectedRunIndices.includes(runIndex);
  const selectedRunIndices = selected
    ? calculationSession.selectedRunIndices.filter((index) => index !== runIndex)
    : [...calculationSession.selectedRunIndices, runIndex].sort((a, b) => a - b);
  return {
    ...session,
    calculationSession: {
      ...calculationSession,
      selectedRunIndices,
    },
    audit: appendAudit(session, 'fit-selection-toggled', runIndex, nowMs, {
      selected: !selected,
      selectedPointCount: selectedRunIndices.length,
    }),
    updatedAtMs: nowMs,
  };
};

export interface SubmitPistonOscillationLinearFitOptions {
  requireAllRuns?: boolean;
  minimumPointCount?: number;
}

export const submitPistonOscillationLinearFit = (
  session: PistonOscillationDataProcessingSession,
  nowMs: number,
  options: SubmitPistonOscillationLinearFitOptions = {},
): PistonOscillationDataProcessingSession => {
  const calculationSession = session.calculationSession;
  if (
    session.status !== 'calculation-ready'
    || !calculationSession
    || calculationSession.status !== 'selecting-points'
    || session.linearFitResult !== null
  ) return session;
  const selectedRunIndices = calculationSession.selectedRunIndices
    .filter((runIndex, index, indices) => (
      indices.indexOf(runIndex) === index && session.runs[runIndex]?.result !== null
    ))
    .sort((a, b) => a - b);
  const minimumPointCount = Math.max(
    PISTON_OSCILLATION_GUIDED_MINIMUM_FIT_POINT_COUNT,
    options.minimumPointCount ?? PISTON_OSCILLATION_GUIDED_MINIMUM_FIT_POINT_COUNT,
  );
  if (
    selectedRunIndices.length < minimumPointCount
    || (options.requireAllRuns === true && selectedRunIndices.length !== session.runs.length)
  ) return session;
  const points = selectedRunIndices.flatMap((runIndex) => {
    const point = getLinearFitPoint(session.runs[runIndex]!, runIndex);
    return point ? [point] : [];
  });
  const linearFitResult = calculatePistonOscillationLinearFit(points, nowMs);
  if (!linearFitResult) return session;
  const { areaM2, gamma, relativeErrorPercent } =
    createPistonOscillationCalculationExpectedValues(
      calculationSession.knowns,
      linearFitResult,
    );
  if (!Number.isFinite(gamma) || !Number.isFinite(relativeErrorPercent)) return session;
  return {
    ...session,
    linearFitResult,
    calculationSession: {
      ...calculationSession,
      status: 'calculating',
      selectedRunIndices,
      activeFieldId: 'area',
      visibleFieldIds: ['area'],
      answers: {
        area: createCalculationAnswer(areaM2),
        gamma: createCalculationAnswer(gamma),
        relativeError: createCalculationAnswer(relativeErrorPercent),
      },
      batchAttempts: [],
    },
    audit: appendAudit(session, 'fit-submitted', -1, nowMs, {
      selectedPointCount: selectedRunIndices.length,
      slopeMPerS2: linearFitResult.slopeMPerS2,
      interceptM: linearFitResult.interceptM,
      rSquared: linearFitResult.rSquared,
    }),
    updatedAtMs: nowMs,
  };
};

const CALCULATION_FIELD_ORDER: readonly PistonOscillationCalculationFieldId[] = [
  'area',
  'gamma',
  'relativeError',
];

const advanceCalculationField = (
  calculationSession: PistonOscillationCalculationSessionSnapshot,
  resolvedFieldId: PistonOscillationCalculationFieldId,
) => {
  const currentIndex = CALCULATION_FIELD_ORDER.indexOf(resolvedFieldId);
  const activeFieldId = CALCULATION_FIELD_ORDER[currentIndex + 1] ?? null;
  return {
    ...calculationSession,
    status: activeFieldId ? 'calculating' as const : 'ready-to-exit' as const,
    activeFieldId,
    visibleFieldIds: activeFieldId
      ? [...new Set([...calculationSession.visibleFieldIds, activeFieldId])]
      : calculationSession.visibleFieldIds,
  };
};

export const updatePistonOscillationCalculationDraft = (
  session: PistonOscillationDataProcessingSession,
  fieldId: PistonOscillationCalculationFieldId,
  draftRaw: string,
  nowMs: number,
): PistonOscillationDataProcessingSession => {
  const calculationSession = session.calculationSession;
  const answer = calculationSession?.answers[fieldId];
  if (
    session.status !== 'calculation-ready'
    || calculationSession?.status !== 'calculating'
    || calculationSession.activeFieldId !== fieldId
    || !answer
    || answer.status !== 'unresolved'
    || answer.feedback !== null
  ) return session;
  return {
    ...session,
    calculationSession: {
      ...calculationSession,
      answers: {
        ...calculationSession.answers,
        [fieldId]: { ...answer, draftRaw },
      },
    },
    audit: appendAudit(session, 'calculation-answer-edited', -1, nowMs, {
      fieldId,
      draftRaw,
      draftLength: draftRaw.length,
    }),
    updatedAtMs: nowMs,
  };
};

export const submitPistonOscillationCalculationField = (
  session: PistonOscillationDataProcessingSession,
  fieldId: PistonOscillationCalculationFieldId,
  nowMs: number,
): PistonOscillationDataProcessingSession => {
  const calculationSession = session.calculationSession;
  const answer = calculationSession?.answers[fieldId];
  if (
    session.status !== 'calculation-ready'
    || calculationSession?.status !== 'calculating'
    || calculationSession.activeFieldId !== fieldId
    || !answer
    || answer.status !== 'unresolved'
    || answer.feedback !== null
    || answer.expectedValue === null
  ) return session;
  const validation = validateNumericAnswer(
    answer.draftRaw,
    answer.expectedValue,
    PISTON_OSCILLATION_CALCULATION_ANSWER_SPECS[fieldId],
  );
  const feedback = getFeedback(validation);
  const outcome = validation.correct ? 'correct' as const : feedback?.outcome ?? 'wrong';
  const nextAnswer: PistonOscillationCalculationAnswerState = {
    ...answer,
    status: validation.correct ? 'correct' : 'unresolved',
    feedback,
    attempts: [
      ...answer.attempts,
      {
        attemptIndex: answer.attempts.length + 1,
        attemptedAtMs: nowMs,
        draftRaw: answer.draftRaw,
        inputKnown: true,
        parsedValue: validation.parseResult.status === 'valid'
          ? validation.parseResult.parsed.value
          : null,
        outcome,
        numericCorrect: validation.numericCorrect,
        precisionCorrect: validation.precisionCorrect,
      },
    ],
    resolution: validation.correct
      ? answer.attempts.length === 0 ? 'first-correct' : 'retry-correct'
      : null,
  };
  const withAnswer: PistonOscillationCalculationSessionSnapshot = {
    ...calculationSession,
    answers: {
      ...calculationSession.answers,
      [fieldId]: nextAnswer,
    },
  };
  const nextCalculationSession = validation.correct
    ? advanceCalculationField(withAnswer, fieldId)
    : withAnswer;
  return {
    ...session,
    calculationSession: nextCalculationSession,
    audit: appendAudit(session, 'calculation-step-submitted', -1, nowMs, {
      fieldId,
      draftRaw: answer.draftRaw,
      outcome,
      numericCorrect: validation.numericCorrect,
      precisionCorrect: validation.precisionCorrect,
    }),
    updatedAtMs: nowMs,
  };
};

export const continuePistonOscillationCalculationAnswer = (
  session: PistonOscillationDataProcessingSession,
  fieldId: PistonOscillationCalculationFieldId,
  nowMs: number,
): PistonOscillationDataProcessingSession => {
  const calculationSession = session.calculationSession;
  const answer = calculationSession?.answers[fieldId];
  if (
    session.status !== 'calculation-ready'
    || calculationSession?.status !== 'calculating'
    || calculationSession.activeFieldId !== fieldId
    || answer?.status !== 'unresolved'
    || answer.feedback === null
  ) return session;
  return {
    ...session,
    calculationSession: {
      ...calculationSession,
      answers: {
        ...calculationSession.answers,
        [fieldId]: { ...answer, feedback: null },
      },
    },
    audit: appendAudit(session, 'calculation-answer-continued', -1, nowMs, { fieldId }),
    updatedAtMs: nowMs,
  };
};

export const revealPistonOscillationCalculationAnswer = (
  session: PistonOscillationDataProcessingSession,
  fieldId: PistonOscillationCalculationFieldId,
  nowMs: number,
): PistonOscillationDataProcessingSession => {
  const calculationSession = session.calculationSession;
  const answer = calculationSession?.answers[fieldId];
  if (
    session.status !== 'calculation-ready'
    || calculationSession?.status !== 'calculating'
    || calculationSession.activeFieldId !== fieldId
    || answer?.status !== 'unresolved'
    || answer.feedback === null
    || answer.expectedValue === null
  ) return session;
  const nextAnswer: PistonOscillationCalculationAnswerState = {
    ...answer,
    draftRaw: formatPistonOscillationCalculationAnswer(fieldId, answer.expectedValue),
    status: 'revealed',
    feedback: null,
    resolution: answer.attempts.some((attempt) => attempt.parsedValue !== null)
      ? 'revealed-after-attempt'
      : 'revealed-without-valid-attempt',
  };
  const withAnswer: PistonOscillationCalculationSessionSnapshot = {
    ...calculationSession,
    answers: {
      ...calculationSession.answers,
      [fieldId]: nextAnswer,
    },
  };
  return {
    ...session,
    calculationSession: advanceCalculationField(withAnswer, fieldId),
    audit: appendAudit(session, 'calculation-answer-revealed', -1, nowMs, {
      fieldId,
      revealedDraftRaw: nextAnswer.draftRaw,
    }),
    updatedAtMs: nowMs,
  };
};

export const getInvalidPistonOscillationCalculationBatchFields = (
  calculationSession: PistonOscillationCalculationSessionSnapshot,
) => CALCULATION_FIELD_ORDER.filter((fieldId) => (
  parseNumericAnswerInput(calculationSession.answers[fieldId].draftRaw).status !== 'valid'
));

export const updatePistonOscillationFreeCalculationDraft = (
  session: PistonOscillationDataProcessingSession,
  fieldId: PistonOscillationCalculationFieldId,
  draftRaw: string,
  nowMs: number,
): PistonOscillationDataProcessingSession => {
  const calculationSession = session.calculationSession;
  const answer = calculationSession?.answers[fieldId];
  if (
    session.processingPolicy.answerValidationMode !== 'batch'
    || session.status !== 'calculation-ready'
    || calculationSession?.status !== 'calculating'
    || !calculationSession.visibleFieldIds.includes(fieldId)
    || !answer
    || answer.status !== 'unresolved'
    || answer.feedback !== null
  ) return session;
  return {
    ...session,
    calculationSession: {
      ...calculationSession,
      answers: {
        ...calculationSession.answers,
        [fieldId]: { ...answer, draftRaw },
      },
    },
    audit: appendAudit(session, 'calculation-answer-edited', -1, nowMs, {
      fieldId,
      draftRaw,
      draftLength: draftRaw.length,
      validationMode: 'batch',
    }),
    updatedAtMs: nowMs,
  };
};

export const revealNextPistonOscillationFreeCalculationField = (
  session: PistonOscillationDataProcessingSession,
  currentFieldId: PistonOscillationCalculationFieldId,
  nowMs: number,
): PistonOscillationDataProcessingSession => {
  const calculationSession = session.calculationSession;
  const visibleFieldIds = calculationSession?.visibleFieldIds ?? [];
  const currentVisibleIndex = visibleFieldIds.indexOf(currentFieldId);
  const currentOrderIndex = CALCULATION_FIELD_ORDER.indexOf(currentFieldId);
  const nextFieldId = CALCULATION_FIELD_ORDER[currentOrderIndex + 1] ?? null;
  if (
    session.processingPolicy.answerValidationMode !== 'batch'
    || session.status !== 'calculation-ready'
    || calculationSession?.status !== 'calculating'
    || currentVisibleIndex !== visibleFieldIds.length - 1
    || calculationSession.answers[currentFieldId].draftRaw.trim().length === 0
    || !nextFieldId
  ) return session;
  return {
    ...session,
    calculationSession: {
      ...calculationSession,
      activeFieldId: nextFieldId,
      visibleFieldIds: [...visibleFieldIds, nextFieldId],
    },
    audit: appendAudit(session, 'calculation-field-revealed', -1, nowMs, {
      currentFieldId,
      nextFieldId,
      currentDraftRaw: calculationSession.answers[currentFieldId].draftRaw,
    }),
    updatedAtMs: nowMs,
  };
};

export const continuePistonOscillationFreeCalculationBatch = (
  session: PistonOscillationDataProcessingSession,
  nowMs: number,
): PistonOscillationDataProcessingSession => {
  const calculationSession = session.calculationSession;
  if (
    session.processingPolicy.answerValidationMode !== 'batch'
    || session.status !== 'calculation-ready'
    || calculationSession?.status !== 'calculating'
    || !CALCULATION_FIELD_ORDER.some((fieldId) => (
      calculationSession.answers[fieldId].status === 'unresolved'
      && calculationSession.answers[fieldId].feedback !== null
    ))
  ) return session;
  return {
    ...session,
    calculationSession: {
      ...calculationSession,
      answers: Object.fromEntries(CALCULATION_FIELD_ORDER.map((fieldId) => [
        fieldId,
        calculationSession.answers[fieldId].status === 'unresolved'
          ? { ...calculationSession.answers[fieldId], feedback: null }
          : calculationSession.answers[fieldId],
      ])) as PistonOscillationCalculationSessionSnapshot['answers'],
    },
    updatedAtMs: nowMs,
  };
};

export const submitPistonOscillationFreeCalculationBatch = (
  session: PistonOscillationDataProcessingSession,
  nowMs: number,
): PistonOscillationDataProcessingSession => {
  const calculationSession = session.calculationSession;
  if (
    session.processingPolicy.answerValidationMode !== 'batch'
    || session.status !== 'calculation-ready'
    || calculationSession?.status !== 'calculating'
    || calculationSession.visibleFieldIds.length !== CALCULATION_FIELD_ORDER.length
    || getInvalidPistonOscillationCalculationBatchFields(calculationSession).length > 0
    || CALCULATION_FIELD_ORDER.some((fieldId) => (
      calculationSession.answers[fieldId].feedback !== null
    ))
  ) return session;
  const attemptIndex = calculationSession.batchAttempts.length + 1;
  const fieldSnapshots = Object.fromEntries(CALCULATION_FIELD_ORDER.map((fieldId) => [
    fieldId,
    createBatchFieldAttemptSnapshot(
      calculationSession.answers[fieldId],
      PISTON_OSCILLATION_CALCULATION_ANSWER_SPECS[fieldId],
      attemptIndex,
      nowMs,
    ),
  ])) as PistonOscillationCalculationBatchAttemptSnapshot['fields'];
  const answers = Object.fromEntries(CALCULATION_FIELD_ORDER.map((fieldId) => {
    const answer = calculationSession.answers[fieldId];
    if (answer.status !== 'unresolved' || answer.expectedValue === null) {
      return [fieldId, answer];
    }
    const validation = validateNumericAnswer(
      answer.draftRaw,
      answer.expectedValue,
      PISTON_OSCILLATION_CALCULATION_ANSWER_SPECS[fieldId],
    );
    const feedback = getFeedback(validation);
    const attempt = fieldSnapshots[fieldId];
    const attempts = [...answer.attempts, attempt];
    return [fieldId, {
      ...answer,
      status: validation.correct ? 'correct' as const : 'unresolved' as const,
      feedback,
      attempts,
      resolution: validation.correct
        ? attempts.length === 1 ? 'first-correct' as const : 'retry-correct' as const
        : null,
    }];
  })) as PistonOscillationCalculationSessionSnapshot['answers'];
  const allResolved = CALCULATION_FIELD_ORDER.every((fieldId) => (
    answers[fieldId].status !== 'unresolved'
  ));
  const nextCalculationSession: PistonOscillationCalculationSessionSnapshot = {
    ...calculationSession,
    status: allResolved ? 'ready-to-exit' : 'calculating',
    activeFieldId: allResolved ? null : calculationSession.activeFieldId,
    answers,
    batchAttempts: [
      ...calculationSession.batchAttempts,
      {
        attemptIndex,
        attemptedAtMs: nowMs,
        fields: fieldSnapshots,
        allCorrect: CALCULATION_FIELD_ORDER.every((fieldId) => (
          fieldSnapshots[fieldId].outcome === 'correct'
        )),
      },
    ],
  };
  return {
    ...session,
    calculationSession: nextCalculationSession,
    audit: appendAudit(session, 'calculation-batch-submitted', -1, nowMs, {
      attemptIndex,
      areaOutcome: fieldSnapshots.area.outcome,
      gammaOutcome: fieldSnapshots.gamma.outcome,
      relativeErrorOutcome: fieldSnapshots.relativeError.outcome,
      allCorrect: allResolved,
    }),
    updatedAtMs: nowMs,
  };
};

export const revealPistonOscillationFreeCalculationAnswer = (
  session: PistonOscillationDataProcessingSession,
  fieldId: PistonOscillationCalculationFieldId,
  nowMs: number,
): PistonOscillationDataProcessingSession => {
  const calculationSession = session.calculationSession;
  const answer = calculationSession?.answers[fieldId];
  if (
    session.processingPolicy.answerValidationMode !== 'batch'
    || session.status !== 'calculation-ready'
    || calculationSession?.status !== 'calculating'
    || !calculationSession.visibleFieldIds.includes(fieldId)
    || answer?.status !== 'unresolved'
    || answer.feedback === null
    || answer.expectedValue === null
  ) return session;
  const nextAnswer: PistonOscillationCalculationAnswerState = {
    ...answer,
    draftRaw: formatPistonOscillationCalculationAnswer(fieldId, answer.expectedValue),
    status: 'revealed',
    feedback: null,
    resolution: answer.attempts.some((attempt) => attempt.parsedValue !== null)
      ? 'revealed-after-attempt'
      : 'revealed-without-valid-attempt',
  };
  const answers = {
    ...calculationSession.answers,
    [fieldId]: nextAnswer,
  };
  const allResolved = CALCULATION_FIELD_ORDER.every((candidate) => (
    answers[candidate].status !== 'unresolved'
  ));
  return {
    ...session,
    calculationSession: {
      ...calculationSession,
      status: allResolved ? 'ready-to-exit' : 'calculating',
      activeFieldId: allResolved ? null : calculationSession.activeFieldId,
      answers,
    },
    audit: appendAudit(session, 'calculation-answer-revealed', -1, nowMs, {
      fieldId,
      revealedDraftRaw: nextAnswer.draftRaw,
      validationMode: 'batch',
    }),
    updatedAtMs: nowMs,
  };
};

export const completePistonOscillationCalculation = (
  session: PistonOscillationDataProcessingSession,
  nowMs: number,
): PistonOscillationDataProcessingSession => {
  const calculationSession = session.calculationSession;
  if (
    session.status !== 'calculation-ready'
    || calculationSession?.status !== 'ready-to-exit'
    || !session.linearFitResult
  ) return session;
  return {
    ...session,
    status: 'completed',
    calculationSession: {
      ...calculationSession,
      status: 'completed',
      activeFieldId: null,
      completedAtMs: nowMs,
    },
    audit: appendAudit(session, 'calculation-completed', -1, nowMs, {
      gamma: calculationSession.answers.gamma.expectedValue,
      relativeErrorPercent: calculationSession.answers.relativeError.expectedValue,
    }),
    updatedAtMs: nowMs,
  };
};

const isStoredAnswerAttemptOutcome = (
  value: unknown,
): value is PistonOscillationAnswerAttemptOutcome => (
  value === 'correct'
  || value === 'empty'
  || value === 'invalid'
  || value === 'numeric-wrong'
  || value === 'precision-wrong'
  || value === 'wrong'
  || value === 'unknown'
);

const normalizeStoredAnswerAttempts = (
  value: unknown,
  legacyAttemptCount = 0,
): PistonOscillationAnswerAttemptSnapshot[] => {
  const attempts = Array.isArray(value)
    ? value.flatMap((attempt, index) => {
        if (!isPlainRecord(attempt) || !isStoredAnswerAttemptOutcome(attempt.outcome)) return [];
        const inputKnown = attempt.inputKnown === false
          ? false
          : typeof attempt.draftRaw === 'string';
        return [{
          attemptIndex: Number.isSafeInteger(attempt.attemptIndex)
            && (attempt.attemptIndex as number) > 0
            ? attempt.attemptIndex as number
            : index + 1,
          attemptedAtMs: isFiniteNumber(attempt.attemptedAtMs)
            ? attempt.attemptedAtMs
            : null,
          draftRaw: inputKnown && typeof attempt.draftRaw === 'string'
            ? attempt.draftRaw
            : null,
          inputKnown,
          parsedValue: attempt.parsedValue === null || isFiniteNumber(attempt.parsedValue)
            ? attempt.parsedValue as number | null
            : null,
          outcome: attempt.outcome,
          numericCorrect: typeof attempt.numericCorrect === 'boolean'
            ? attempt.numericCorrect
            : null,
          precisionCorrect: typeof attempt.precisionCorrect === 'boolean'
            ? attempt.precisionCorrect
            : null,
        } satisfies PistonOscillationAnswerAttemptSnapshot];
      })
    : [];
  if (attempts.length > 0 || legacyAttemptCount <= 0) return attempts;
  return Array.from({ length: legacyAttemptCount }, (_, index) => ({
    attemptIndex: index + 1,
    attemptedAtMs: null,
    draftRaw: null,
    inputKnown: false,
    parsedValue: null,
    outcome: 'unknown' as const,
    numericCorrect: null,
    precisionCorrect: null,
  }));
};

const normalizeStoredBatchFieldAttempt = (
  value: unknown,
): PistonOscillationAnswerAttemptSnapshot | null => (
  normalizeStoredAnswerAttempts([value], 0)[0] ?? null
);

const normalizeStoredPeriodBatchAttempts = (
  value: unknown,
): PistonOscillationPeriodBatchAttemptSnapshot[] => Array.isArray(value)
  ? value.flatMap((attempt, index) => {
      if (!isPlainRecord(attempt) || !isPlainRecord(attempt.fields)) return [];
      const t1 = normalizeStoredBatchFieldAttempt(attempt.fields.t1);
      const t2 = normalizeStoredBatchFieldAttempt(attempt.fields.t2);
      const period = normalizeStoredBatchFieldAttempt(attempt.fields.period);
      if (!t1 || !t2 || !period || !isFiniteNumber(attempt.attemptedAtMs)) return [];
      return [{
        attemptIndex: Number.isSafeInteger(attempt.attemptIndex)
          && (attempt.attemptIndex as number) > 0
          ? attempt.attemptIndex as number
          : index + 1,
        attemptedAtMs: attempt.attemptedAtMs,
        fields: { t1, t2, period },
        allCorrect: attempt.allCorrect === true,
      } satisfies PistonOscillationPeriodBatchAttemptSnapshot];
    })
  : [];

const normalizeStoredCalculationBatchAttempts = (
  value: unknown,
): PistonOscillationCalculationBatchAttemptSnapshot[] => Array.isArray(value)
  ? value.flatMap((attempt, index) => {
      if (!isPlainRecord(attempt) || !isPlainRecord(attempt.fields)) return [];
      const area = normalizeStoredBatchFieldAttempt(attempt.fields.area);
      const gamma = normalizeStoredBatchFieldAttempt(attempt.fields.gamma);
      const relativeError = normalizeStoredBatchFieldAttempt(attempt.fields.relativeError);
      if (
        !area
        || !gamma
        || !relativeError
        || !isFiniteNumber(attempt.attemptedAtMs)
      ) return [];
      return [{
        attemptIndex: Number.isSafeInteger(attempt.attemptIndex)
          && (attempt.attemptIndex as number) > 0
          ? attempt.attemptIndex as number
          : index + 1,
        attemptedAtMs: attempt.attemptedAtMs,
        fields: { area, gamma, relativeError },
        allCorrect: attempt.allCorrect === true,
      } satisfies PistonOscillationCalculationBatchAttemptSnapshot];
    })
  : [];

const resolveStoredAnswerResolution = (
  status: PistonOscillationPeriodAnswerStatus,
  attempts: readonly PistonOscillationAnswerAttemptSnapshot[],
): PistonOscillationAnswerResolution => {
  if (status === 'correct') return attempts.length <= 1 ? 'first-correct' : 'retry-correct';
  if (status === 'revealed') {
    return attempts.some((attempt) => attempt.parsedValue !== null)
      ? 'revealed-after-attempt'
      : 'revealed-without-valid-attempt';
  }
  return null;
};

const normalizeAnswer = (
  value: unknown,
  fallback: PistonOscillationPeriodAnswerState,
  spec: NumericAnswerSpec,
  formatExpectedValue: (expectedValue: number) => string,
): PistonOscillationPeriodAnswerState => {
  if (!isPlainRecord(value)) return fallback;
  const persistedStatus = value.status === 'correct' || value.status === 'revealed'
    ? value.status
    : 'unresolved';
  const persistedDraftRaw = typeof value.draftRaw === 'string' ? value.draftRaw : '';
  const expectedValue = fallback.expectedValue;
  const persistedCorrectStillValid = persistedStatus === 'correct'
    && expectedValue !== null
    && validateNumericAnswer(persistedDraftRaw, expectedValue, spec).correct;
  const status = persistedStatus === 'revealed' && expectedValue !== null
    ? 'revealed'
    : persistedCorrectStillValid
      ? 'correct'
      : 'unresolved';
  const feedback: PistonOscillationPeriodAnswerFeedback | null = isPlainRecord(value.feedback)
    && (
      value.feedback.outcome === 'empty'
      || value.feedback.outcome === 'invalid'
      || value.feedback.outcome === 'numeric-wrong'
      || value.feedback.outcome === 'precision-wrong'
      || value.feedback.outcome === 'wrong'
    )
    ? {
        outcome: value.feedback.outcome,
        numericCorrect: value.feedback.numericCorrect === true,
        precisionCorrect: value.feedback.precisionCorrect === true,
    }
    : null;
  const persistedAttemptCount = Number.isInteger(value.attemptCount)
    && (value.attemptCount as number) >= 0
    ? value.attemptCount as number
    : 0;
  const legacyAttemptCount = Math.max(
    persistedAttemptCount,
    status === 'correct' || status === 'revealed' ? 1 : 0,
  );
  const attempts = normalizeStoredAnswerAttempts(value.attempts, legacyAttemptCount);
  return {
    draftRaw: status === 'revealed' && expectedValue !== null
      ? formatExpectedValue(expectedValue)
      : persistedDraftRaw,
    expectedValue,
    status,
    feedback: status === 'unresolved' ? feedback : null,
    attemptCount: attempts.length,
    attempts,
    resolution: resolveStoredAnswerResolution(status, attempts),
  };
};

const normalizePistonOscillationProcessingPolicy = (
  value: unknown,
  answerValidationMode?: PistonOscillationAnswerValidationMode,
): PistonOscillationProcessingPolicySnapshot => {
  const fallback = createPistonOscillationProcessingPolicySnapshot(answerValidationMode);
  const compatiblePolicyVersion = isPlainRecord(value)
    && (
      value.policyVersion === PISTON_OSCILLATION_PROCESSING_POLICY_VERSION
      || value.policyVersion === 'piston-oscillation-processing-policy-v1'
    );
  if (
    !isPlainRecord(value)
    || (value.schemaVersion !== 1 && value.schemaVersion !== 2)
    || !compatiblePolicyVersion
    || !isFiniteNumber(value.guidedMinimumPeriodCount)
    || !isFiniteNumber(value.freeMinimumPeriodCount)
    || value.freeMinimumPeriodCount < PISTON_OSCILLATION_FREE_MINIMUM_PERIOD_COUNT
    || value.guidedMinimumPeriodCount < value.freeMinimumPeriodCount
  ) return fallback;
  return {
    schemaVersion: 2,
    policyVersion: PISTON_OSCILLATION_PROCESSING_POLICY_VERSION,
    guidedMinimumPeriodCount: value.guidedMinimumPeriodCount,
    freeMinimumPeriodCount: value.freeMinimumPeriodCount,
    answerValidationMode: answerValidationMode
      ?? (value.answerValidationMode === 'batch' ? 'batch' : 'stepwise'),
  };
};

const restoreSelection = (
  value: unknown,
  record: PistonOscillationRawMeasurementRecord,
  processingPolicy: PistonOscillationProcessingPolicySnapshot,
  nowMs: number,
): PistonOscillationPeriodSelection | null => {
  if (
    !isPlainRecord(value)
    || (
      !isCompatiblePersistedVersion(
        value.algorithmVersion,
        PISTON_OSCILLATION_PERIOD_SELECTION_ALGORITHM_VERSION,
      )
      && value.algorithmVersion !== PISTON_OSCILLATION_FREE_PERIOD_SELECTION_ALGORITHM_VERSION
    )
    || !isFiniteNumber(value.rangeStartTimeS)
    || !isFiniteNumber(value.rangeEndTimeS)
  ) return null;
  const persistedExtremaMode = value.algorithmVersion
    === PISTON_OSCILLATION_FREE_PERIOD_SELECTION_ALGORITHM_VERSION
    ? 'primary' as const
    : 'guided' as const;
  const regenerated = createPistonOscillationPeriodSelection(
    record,
    value.rangeStartTimeS,
    value.rangeEndTimeS,
    processingPolicy.guidedMinimumPeriodCount,
    isFiniteNumber(value.selectedAtMs) ? value.selectedAtMs : nowMs,
    processingPolicy.freeMinimumPeriodCount,
    persistedExtremaMode,
  );
  const resolveEndpoint = (candidate: unknown) => {
    if (!isPlainRecord(candidate)) return null;
    const sampleIndex = normalizePersistedSafeInteger(candidate.sampleIndex);
    return sampleIndex === null
      ? null
      : regenerated.extrema.find((extremum) => (
          extremum.sampleIndex === sampleIndex
        )) ?? null;
  };
  const leftEndpoint = resolveEndpoint(value.leftEndpoint);
  const rightEndpoint = resolveEndpoint(value.rightEndpoint);
  if (!leftEndpoint || !rightEndpoint || rightEndpoint.ordinal <= leftEndpoint.ordinal) {
    return null;
  }
  const periodCount = getSelectionPeriodCount(leftEndpoint, rightEndpoint);
  const issue = periodCount < processingPolicy.freeMinimumPeriodCount
    ? 'insufficient-extrema' as const
    : processingPolicy.answerValidationMode === 'stepwise'
      && periodCount < processingPolicy.guidedMinimumPeriodCount
      ? 'below-guided-minimum' as const
      : regenerated.issue === 'ambiguous-primary-period'
        ? 'ambiguous-primary-period' as const
      : null;
  return {
    algorithmVersion: regenerated.algorithmVersion,
    rangeStartTimeS: regenerated.rangeStartTimeS,
    rangeEndTimeS: regenerated.rangeEndTimeS,
    extrema: regenerated.extrema,
    leftEndpoint,
    rightEndpoint,
    periodCount,
    issue,
    selectedAtMs: isFiniteNumber(value.selectedAtMs) ? value.selectedAtMs : nowMs,
  };
};

const normalizeResult = (
  value: unknown,
  run: PistonOscillationPeriodRunState,
): PistonOscillationPeriodResult | null => {
  const leftSampleIndex = isPlainRecord(value)
    ? normalizePersistedSafeInteger(value.leftSampleIndex)
    : null;
  const rightSampleIndex = isPlainRecord(value)
    ? normalizePersistedSafeInteger(value.rightSampleIndex)
    : null;
  if (
    !isPlainRecord(value)
    || !run.selection?.leftEndpoint
    || !run.selection.rightEndpoint
    || leftSampleIndex !== run.selection.leftEndpoint.sampleIndex
    || rightSampleIndex !== run.selection.rightEndpoint.sampleIndex
    || run.answers.t1.status === 'unresolved'
    || run.answers.t2.status === 'unresolved'
    || run.answers.period.status === 'unresolved'
    || !isFiniteNumber(value.completedAtMs)
  ) {
    return null;
  }
  return createPeriodResult(run, value.completedAtMs);
};

const normalizeCalculationKnowns = (
  value: unknown,
  records: readonly PistonOscillationRawMeasurementRecord[],
): PistonOscillationCalculationKnownsSnapshot | null => {
  const fallback = createPistonOscillationCalculationKnownsSnapshot(records);
  if (!isPlainRecord(value)) return fallback;
  if (
    (value.schemaVersion !== undefined && value.schemaVersion !== 1 && value.schemaVersion !== 2)
    || !isCompatiblePersistedVersion(
      value.modelVersion,
      PISTON_OSCILLATION_CALCULATION_MODEL_VERSION,
    )
  ) return null;
  const movingMassKg = isFiniteNumber(value.movingMassKg) && value.movingMassKg > 0
    ? value.movingMassKg
    : fallback.movingMassKg;
  const cylinderDiameterM = isFiniteNumber(value.cylinderDiameterM)
    && value.cylinderDiameterM > 0
    ? value.cylinderDiameterM
    : fallback.cylinderDiameterM;
  const pressurePa = isFiniteNumber(value.pressurePa) && value.pressurePa > 0
    ? value.pressurePa
    : fallback.pressurePa;
  return {
    schemaVersion: 2,
    modelVersion: PISTON_OSCILLATION_CALCULATION_MODEL_VERSION,
    gasType: fallback.gasType,
    gasMaterialModelVersion: fallback.gasMaterialModelVersion,
    gasMaterialId: fallback.gasMaterialId,
    movingMassKg,
    cylinderDiameterM,
    pressurePa,
    // The saved raw-measurement material snapshot is authoritative. Persisted
    // derived knowns from an older calculation session cannot replace it.
    referenceGamma: fallback.referenceGamma,
  };
};

const normalizeCalculationAnswer = (
  value: unknown,
  expectedValue: number,
  fieldId: PistonOscillationCalculationFieldId,
): PistonOscillationCalculationAnswerState => {
  const fallback = createCalculationAnswer(expectedValue);
  if (!isPlainRecord(value)) return fallback;
  const persistedStatus = value.status === 'correct' || value.status === 'revealed'
    ? value.status
    : 'unresolved';
  const persistedDraftRaw = typeof value.draftRaw === 'string' ? value.draftRaw : '';
  const persistedCorrectStillValid = persistedStatus === 'correct'
    && validateNumericAnswer(
      persistedDraftRaw,
      expectedValue,
      PISTON_OSCILLATION_CALCULATION_ANSWER_SPECS[fieldId],
    ).correct;
  const status = persistedStatus === 'revealed'
    ? 'revealed'
    : persistedCorrectStillValid
      ? 'correct'
      : 'unresolved';
  const feedback = status === 'unresolved'
    && isPlainRecord(value.feedback)
    && (
      value.feedback.outcome === 'empty'
      || value.feedback.outcome === 'invalid'
      || value.feedback.outcome === 'numeric-wrong'
      || value.feedback.outcome === 'precision-wrong'
      || value.feedback.outcome === 'wrong'
    )
    ? {
        outcome: value.feedback.outcome,
        numericCorrect: value.feedback.numericCorrect === true,
        precisionCorrect: value.feedback.precisionCorrect === true,
      } satisfies PistonOscillationPeriodAnswerFeedback
    : null;
  const attempts = normalizeStoredAnswerAttempts(
    value.attempts,
    status === 'correct' || status === 'revealed' ? 1 : 0,
  );
  return {
    draftRaw: status === 'revealed'
      ? formatPistonOscillationCalculationAnswer(fieldId, expectedValue)
      : persistedDraftRaw,
    expectedValue,
    status,
    feedback,
    attempts,
    resolution: resolveStoredAnswerResolution(status, attempts),
  };
};

const normalizeLinearFitResult = (
  value: unknown,
  runs: readonly PistonOscillationPeriodRunState[],
): PistonOscillationLinearFitResultSnapshot | null => {
  if (
    !isPlainRecord(value)
    || (value.schemaVersion !== undefined && value.schemaVersion !== 1)
    || !isCompatiblePersistedVersion(
      value.algorithmVersion,
      PISTON_OSCILLATION_LINEAR_FIT_ALGORITHM_VERSION,
    )
    || !Array.isArray(value.selectedRunIndices)
  ) return null;
  const selectedRunIndices = value.selectedRunIndices.flatMap((candidate) => (
    Number.isInteger(candidate)
    && (candidate as number) >= 0
    && (candidate as number) < runs.length
    && runs[candidate as number]?.result
      ? [candidate as number]
      : []
  )).filter((runIndex, index, indices) => indices.indexOf(runIndex) === index)
    .sort((a, b) => a - b);
  const points = selectedRunIndices.flatMap((runIndex) => {
    const point = getLinearFitPoint(runs[runIndex]!, runIndex);
    return point ? [point] : [];
  });
  if (points.length < PISTON_OSCILLATION_GUIDED_MINIMUM_FIT_POINT_COUNT) return null;
  return calculatePistonOscillationLinearFit(
    points,
    isFiniteNumber(value.completedAtMs) ? value.completedAtMs : 0,
  );
};

const normalizeCalculationSession = (
  value: unknown,
  records: readonly PistonOscillationRawMeasurementRecord[],
  fitResult: PistonOscillationLinearFitResultSnapshot | null,
  nowMs: number,
  answerValidationMode: PistonOscillationAnswerValidationMode,
): PistonOscillationCalculationSessionSnapshot => {
  const persisted = isPlainRecord(value) ? value : null;
  const fallback = createPistonOscillationCalculationSession(records, nowMs);
  const knowns = normalizeCalculationKnowns(persisted?.knowns, records);
  if (knowns === null) return null;
  const selectedRunIndices = fitResult?.selectedRunIndices
    ?? (Array.isArray(persisted?.selectedRunIndices)
      ? persisted.selectedRunIndices.flatMap((candidate) => (
          Number.isInteger(candidate) && (candidate as number) >= 0
            ? [candidate as number]
            : []
        )).filter((runIndex, index, indices) => indices.indexOf(runIndex) === index)
      : []);
  const initialAreaM2 = calculateDisplayedPistonAreaM2(knowns);
  if (!fitResult) {
    return {
      ...fallback,
      knowns,
      selectedRunIndices,
      answers: {
        ...fallback.answers,
        area: createCalculationAnswer(initialAreaM2),
      },
      startedAtMs: isFiniteNumber(persisted?.startedAtMs)
        ? persisted.startedAtMs
        : fallback.startedAtMs,
    };
  }
  const { areaM2, gamma, relativeErrorPercent } =
    createPistonOscillationCalculationExpectedValues(knowns, fitResult);
  const persistedAnswers = isPlainRecord(persisted?.answers) ? persisted.answers : null;
  const area = normalizeCalculationAnswer(persistedAnswers?.area, areaM2, 'area');
  let gammaAnswer = normalizeCalculationAnswer(
    persistedAnswers?.gamma,
    gamma,
    'gamma',
  );
  let relativeError = normalizeCalculationAnswer(
    persistedAnswers?.relativeError,
    relativeErrorPercent,
    'relativeError',
  );
  if (answerValidationMode === 'stepwise' && area.status === 'unresolved') {
    gammaAnswer = createCalculationAnswer(gamma);
    relativeError = createCalculationAnswer(relativeErrorPercent);
  } else if (answerValidationMode === 'stepwise' && gammaAnswer.status === 'unresolved') {
    relativeError = createCalculationAnswer(relativeErrorPercent);
  }
  const allResolved = area.status !== 'unresolved'
    && gammaAnswer.status !== 'unresolved'
    && relativeError.status !== 'unresolved';
  const persistedCompleted = persisted?.status === 'completed' && allResolved;
  const activeFieldId: PistonOscillationCalculationFieldId | null = allResolved
    ? null
    : area.status === 'unresolved'
      ? 'area'
      : gammaAnswer.status === 'unresolved'
        ? 'gamma'
        : 'relativeError';
  const persistedVisibleFieldIdsValue = persisted?.visibleFieldIds;
  const persistedVisibleFieldIds = Array.isArray(persistedVisibleFieldIdsValue)
    ? CALCULATION_FIELD_ORDER.filter((fieldId) => (
        persistedVisibleFieldIdsValue.includes(fieldId)
      ))
    : [];
  const activeFieldOrderIndex = persisted?.activeFieldId === 'area'
    || persisted?.activeFieldId === 'gamma'
    || persisted?.activeFieldId === 'relativeError'
    ? CALCULATION_FIELD_ORDER.indexOf(persisted.activeFieldId)
    : -1;
  const inferredVisibleCount = Math.max(
    1,
    activeFieldOrderIndex + 1,
    area.status !== 'unresolved' ? 2 : 1,
    gammaAnswer.status !== 'unresolved' ? 3 : 1,
    relativeError.status !== 'unresolved' ? 3 : 1,
    gammaAnswer.draftRaw.length > 0 ? 2 : 1,
    relativeError.draftRaw.length > 0 ? 3 : 1,
  );
  const visibleFieldIds = allResolved
    ? [...CALCULATION_FIELD_ORDER]
    : persistedVisibleFieldIds.length > 0
      ? persistedVisibleFieldIds
      : CALCULATION_FIELD_ORDER.slice(0, inferredVisibleCount);
  return {
    schemaVersion: 2,
    status: persistedCompleted
      ? 'completed'
      : allResolved
        ? 'ready-to-exit'
        : 'calculating',
    knowns,
    selectedRunIndices: fitResult.selectedRunIndices,
    activeFieldId: answerValidationMode === 'batch'
      ? allResolved ? null : visibleFieldIds.at(-1) ?? 'area'
      : activeFieldId,
    visibleFieldIds,
    answers: {
      area,
      gamma: gammaAnswer,
      relativeError,
    },
    batchAttempts: normalizeStoredCalculationBatchAttempts(persisted?.batchAttempts),
    startedAtMs: isFiniteNumber(persisted?.startedAtMs)
      ? persisted.startedAtMs
      : fallback.startedAtMs,
    completedAtMs: persistedCompleted && isFiniteNumber(persisted?.completedAtMs)
      ? persisted.completedAtMs
      : null,
  };
};

export const normalizePistonOscillationDataProcessingSession = (
  value: unknown,
  records: readonly PistonOscillationRawMeasurementRecord[],
  nowMs = Date.now(),
  options: CreatePistonOscillationDataProcessingSessionOptions = {},
): PistonOscillationDataProcessingSession | null => {
  if (records.length === 0) return null;
  if (!getConsistentPistonOscillationGasMaterialSnapshot(records)) return null;
  const fallback = createPistonOscillationDataProcessingSession(records, nowMs, options);
  if (!isPlainRecord(value) || !Array.isArray(value.runs)) return fallback;
  const processingPolicy = normalizePistonOscillationProcessingPolicy(
    value.processingPolicy,
    options.answerValidationMode,
  );
  const persistedRuns = value.runs;
  const restoredRuns = fallback.runs.map((fallbackRun) => {
    const record = records.find((candidate) => (
      candidate.recordId === fallbackRun.rawMeasurementRecordId
    ))!;
    const persisted = persistedRuns.find((candidate) => (
      isPlainRecord(candidate)
      && (
        candidate.rawMeasurementRecordId === record.recordId
        || candidate.measurementIndex === record.measurementIndex
      )
    ));
    if (!isPlainRecord(persisted)) return fallbackRun;
    const selection = restoreSelection(
      persisted.selection,
      record,
      processingPolicy,
      nowMs,
    );
    const t1Expected = selection?.leftEndpoint
      ? selection.leftEndpoint.timeS
      : null;
    const t2Expected = selection?.rightEndpoint
      ? selection.rightEndpoint.timeS
      : null;
    const t1 = normalizeAnswer(
      isPlainRecord(persisted.answers) ? persisted.answers.t1 : null,
      { ...createAnswer(), expectedValue: t1Expected },
      PISTON_OSCILLATION_ENDPOINT_TIME_ANSWER_SPEC,
      formatPistonOscillationEndpointTime,
    );
    const t2 = normalizeAnswer(
      isPlainRecord(persisted.answers) ? persisted.answers.t2 : null,
      { ...createAnswer(), expectedValue: t2Expected },
      PISTON_OSCILLATION_ENDPOINT_TIME_ANSWER_SPEC,
      formatPistonOscillationEndpointTime,
    );
    const persistedAnswers = isPlainRecord(persisted.answers) ? persisted.answers : null;
    const persistedPeriodAnswer = isPlainRecord(persistedAnswers?.period)
      ? persistedAnswers.period
      : null;
    const batchPeriodWasRevealed = processingPolicy.answerValidationMode === 'batch'
      && (
        isFiniteNumber(persistedPeriodAnswer?.expectedValue)
        || (typeof persistedPeriodAnswer?.draftRaw === 'string'
          && persistedPeriodAnswer.draftRaw.length > 0)
        || (Array.isArray(persisted.batchAttempts) && persisted.batchAttempts.length > 0)
      );
    const periodExpected = selection
      && (
        batchPeriodWasRevealed
        || (t1.status !== 'unresolved' && t2.status !== 'unresolved')
      )
      ? calculatePistonOscillationPeriodFromSelection(
          selection,
          record.acquisitionSettings.sampleRateHz,
        )
      : null;
    const period = normalizeAnswer(
      persistedPeriodAnswer,
      { ...createAnswer(), expectedValue: periodExpected },
      PISTON_OSCILLATION_PERIOD_ANSWER_SPEC,
      formatPistonOscillationPeriod,
    );
    let run: PistonOscillationPeriodRunState = {
      ...fallbackRun,
      selection,
      answers: { t1, t2, period },
      batchAttempts: normalizeStoredPeriodBatchAttempts(persisted.batchAttempts),
      result: null,
    };
    run = {
      ...run,
      result: normalizeResult(persisted.result, run),
    };
    return run;
  });
  const firstIncompleteRunIndex = restoredRuns.findIndex((run) => run.result === null);
  const runs = firstIncompleteRunIndex < 0
    ? restoredRuns
    : restoredRuns.map((run, runIndex) => (
        runIndex <= firstIncompleteRunIndex ? run : fallback.runs[runIndex]!
      ));
  const allRunsCompleted = runs.every((run) => run.result !== null);
  const activeRunIndex = Number.isInteger(value.activeRunIndex)
    ? Math.max(0, Math.min(runs.length - 1, value.activeRunIndex as number))
    : Math.max(0, runs.findIndex((run) => run.result === null));
  const restoredLinearFitResult = allRunsCompleted
    ? normalizeLinearFitResult(value.linearFitResult, runs)
    : null;
  const restoredCalculationSession = allRunsCompleted
    ? normalizeCalculationSession(
        value.calculationSession,
        records,
        restoredLinearFitResult,
        isFiniteNumber(value.updatedAtMs) ? value.updatedAtMs : nowMs,
        processingPolicy.answerValidationMode,
      )
    : null;
  const calculationVersionUnsupported = allRunsCompleted
    && restoredCalculationSession === null;
  const linearFitResult = calculationVersionUnsupported
    ? null
    : restoredLinearFitResult;
  const calculationSession = calculationVersionUnsupported
    ? createPistonOscillationCalculationSession(
        records,
        isFiniteNumber(value.updatedAtMs) ? value.updatedAtMs : nowMs,
      )
    : restoredCalculationSession;
  const status = !allRunsCompleted
    ? 'period-processing' as const
    : calculationSession?.status === 'completed'
      ? 'completed' as const
      : 'calculation-ready' as const;
  const audit = Array.isArray(value.audit)
    ? value.audit.filter(isPlainRecord).flatMap((event, index) => {
        if (
          !isFiniteNumber(event.atMs)
          || !Number.isInteger(event.runIndex)
          || typeof event.type !== 'string'
        ) return [];
        return [{
          id: typeof event.id === 'string' ? event.id : `restored:${index}`,
          atMs: event.atMs,
          type: event.type as PistonOscillationDataProcessingAuditEventType,
          runIndex: event.runIndex as number,
          payload: isPlainRecord(event.payload)
            ? event.payload as PistonOscillationDataProcessingAuditEvent['payload']
            : {},
        }];
      })
    : [];
  return {
    ...fallback,
    processingPolicy,
    status,
    activeRunIndex: status === 'period-processing'
      ? Math.min(activeRunIndex, Math.max(0, runs.findIndex((run) => run.result === null)))
      : runs.length - 1,
    runs,
    linearFitResult,
    calculationSession,
    audit,
    startedAtMs: isFiniteNumber(value.startedAtMs) ? value.startedAtMs : fallback.startedAtMs,
    updatedAtMs: isFiniteNumber(value.updatedAtMs) ? value.updatedAtMs : fallback.updatedAtMs,
  };
};
