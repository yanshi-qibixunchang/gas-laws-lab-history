import {
  advancePistonOscillationPeriodRun,
  analyzePistonOscillationPrimaryCycleEligibility,
  clearPistonOscillationPeriodSelection,
  clonePistonOscillationRawMeasurementRecord,
  completePistonOscillationCalculation,
  continuePistonOscillationFreeCalculationBatch,
  continuePistonOscillationFreePeriodBatch,
  createPistonOscillationDataProcessingSession,
  normalizePistonOscillationDataProcessingSession,
  normalizePistonOscillationRawMeasurementRecord,
  replacePistonOscillationProcessingMeasurement,
  revealNextPistonOscillationFreeCalculationField,
  revealPistonOscillationFreeCalculationAnswer,
  revealPistonOscillationFreePeriodAnswer,
  revealPistonOscillationFreePeriodEntry,
  reopenPreviousPistonOscillationPeriodRun,
  selectPistonOscillationFreePeriodRange,
  submitPistonOscillationFreeCalculationBatch,
  submitPistonOscillationFreePeriodBatch,
  submitPistonOscillationLinearFit,
  togglePistonOscillationFitRun,
  updatePistonOscillationFreeCalculationDraft,
  updatePistonOscillationPeriodAnswerDraft,
  type PistonOscillationCalculationFieldId,
  type PistonOscillationDataProcessingSession,
  type PistonOscillationPeriodAnswerField,
  type PistonOscillationPrimaryCycleEligibilityReport,
  type PistonOscillationRawMeasurementRecord,
} from './pistonOscillationDataProcessingModel.ts';
import {
  createPistonOscillationAtmosphericLockedState,
  normalizePistonOscillationThermodynamicState,
  resolvePistonOscillationStablePhysicalState,
  type PistonOscillationThermodynamicState,
} from './pistonOscillationPhysicsEngine.ts';
import {
  createLegacyPistonOscillationLooseConnectedThermodynamicState,
} from './pistonOscillationLegacyCompatibility.ts';
import {
  createDefaultPistonOscillationFreeParameterDraft,
  createPistonOscillationFreeParameterDraftFromMeasurement,
  createPistonOscillationFreeParameterSnapshot,
  doesPistonOscillationMeasurementMatchFreeParameters,
  getPistonOscillationFreePhysicsConfig,
  isPistonOscillationFreeTriggerThresholdKpa,
  isPistonOscillationStoredTriggerThresholdKpa,
  normalizePistonOscillationFreeParameterDraft,
  normalizePistonOscillationFreeParameterSnapshot,
  PISTON_OSCILLATION_FREE_TRIGGER_REFERENCE_AMBIENT_PRESSURE_KPA,
  scalePistonOscillationFreeTriggerThresholdKpa,
  type PistonOscillationFreeParameterDraft,
  type PistonOscillationFreeParameterSnapshot,
} from './pistonOscillationFreeParameterConfig.ts';

export const PISTON_OSCILLATION_FREE_SESSION_SCHEMA_VERSION = 8 as const;
export const PISTON_OSCILLATION_FREE_PLAN_SCHEMA_VERSION = 3 as const;
export const PISTON_OSCILLATION_FREE_TARGET_SCHEMA_VERSION = 1 as const;
export const PISTON_OSCILLATION_FREE_EXCLUDED_ATTEMPT_SCHEMA_VERSION = 2 as const;
export const PISTON_OSCILLATION_FREE_REACQUISITION_SCHEMA_VERSION = 1 as const;
export const PISTON_OSCILLATION_FREE_INSTRUMENT_STATE_SCHEMA_VERSION = 2 as const;
export const PISTON_OSCILLATION_FREE_EVENT_SCHEMA_VERSION = 2 as const;
export const PISTON_OSCILLATION_FREE_MINIMUM_MEASUREMENT_COUNT = 3 as const;
export const PISTON_OSCILLATION_FREE_MAXIMUM_MEASUREMENT_COUNT = 6 as const;
export const PISTON_OSCILLATION_FREE_TARGET_HEIGHTS_MM = [80, 70, 60, 50, 40, 30] as const;

export type PistonOscillationFreeSessionStatus = 'idle' | 'active' | 'paused';

export type PistonOscillationFreeTargetSource = 'system' | 'custom';

export interface PistonOscillationFreePlanTarget {
  schemaVersion: typeof PISTON_OSCILLATION_FREE_TARGET_SCHEMA_VERSION;
  targetId: string;
  heightMm: number;
  source: PistonOscillationFreeTargetSource;
}

export interface PistonOscillationFreeExperimentPlan {
  schemaVersion: typeof PISTON_OSCILLATION_FREE_PLAN_SCHEMA_VERSION;
  planId: string;
  targets: PistonOscillationFreePlanTarget[];
  targetHeightsMm: number[];
  customHeightCandidatesMm: number[];
}

export type PistonOscillationFreeExcludedAttemptReason =
  | 'redo'
  | 'deleted'
  | 'insufficient-primary-period';

export interface PistonOscillationFreeExcludedAttempt {
  schemaVersion: typeof PISTON_OSCILLATION_FREE_EXCLUDED_ATTEMPT_SCHEMA_VERSION;
  attemptId: string;
  targetId: string;
  measurementIndex: number;
  reason: PistonOscillationFreeExcludedAttemptReason;
  excludedAtMs: number;
  measurement: PistonOscillationRawMeasurementRecord;
  primaryCycleEligibility: PistonOscillationPrimaryCycleEligibilityReport | null;
}

export interface PistonOscillationFreeReacquisitionState {
  schemaVersion: typeof PISTON_OSCILLATION_FREE_REACQUISITION_SCHEMA_VERSION;
  targetId: string;
  measurementIndex: number;
  excludedRecordId: string;
  returnRunIndex: number;
  requestedAtMs: number;
}

export interface PistonOscillationFreeInstrumentState {
  schemaVersion: typeof PISTON_OSCILLATION_FREE_INSTRUMENT_STATE_SCHEMA_VERSION;
  focusMode: 'overview' | 'pistonFocus' | 'hoseFocus' | 'powerFocus';
  hoseState: 'connected' | 'disconnected';
  nominalHeightMm: number;
  equilibriumHeightMm: number;
  pistonOffsetMm: number;
  lockingScrewProgress: number;
  heightAdjustmentStage: 'readingHeight' | 'lockingHeight';
  pistonPhase: 'idle' | 'ready' | 'pressing' | 'adjustingHeight' | 'holding' | 'falling' | 'rebounding';
  thermodynamicState: PistonOscillationThermodynamicState;
}

export type PistonOscillationFreeInstrumentStateInput = Omit<
  PistonOscillationFreeInstrumentState,
  'schemaVersion' | 'nominalHeightMm' | 'thermodynamicState'
> & Partial<Pick<
  PistonOscillationFreeInstrumentState,
  'nominalHeightMm' | 'thermodynamicState'
>>;

export type PistonOscillationFreeObservedOperation =
  | 'togglePower'
  | 'confirmHeight'
  | 'tightenScrew'
  | 'loosenScrew'
  | 'disconnectHose'
  | 'reconnectHose'
  | 'leftHandPress'
  | 'leftHandRelease'
  | 'startAcquisition'
  | 'pauseAcquisition'
  | 'redoAcquisition'
  | 'saveMeasurement'
  | 'releasePiston'
  | 'bottomImpact';

export type PistonOscillationFreeAuditEventType =
  | 'session-started'
  | 'session-resumed'
  | 'session-paused'
  | 'session-reset'
  | 'plan-updated'
  | 'power-changed'
  | 'parameter-changed'
  | 'parameters-restored'
  | 'acquisition-setting-changed'
  | 'operation-observed'
  | 'acquisition-excluded'
  | 'measurement-saved'
  | 'measurement-deleted';

export type PistonOscillationFreeAuditPrimitive = string | number | boolean | null;

export interface PistonOscillationFreeAuditEvent {
  schemaVersion: typeof PISTON_OSCILLATION_FREE_EVENT_SCHEMA_VERSION;
  sequence: number;
  eventId: string;
  occurredAtMs: number;
  type: PistonOscillationFreeAuditEventType;
  measurementIndex: number | null;
  targetHeightMm: number | null;
  operation: PistonOscillationFreeObservedOperation | null;
  payload: Record<string, PistonOscillationFreeAuditPrimitive>;
}

export interface PistonOscillationFreeSession {
  schemaVersion: typeof PISTON_OSCILLATION_FREE_SESSION_SCHEMA_VERSION;
  status: PistonOscillationFreeSessionStatus;
  startedAtMs: number | null;
  updatedAtMs: number | null;
  experimentPlan: PistonOscillationFreeExperimentPlan | null;
  measurementIndex: number;
  powerOn: boolean;
  advancedParametersRiskAcknowledged: boolean;
  parameterDraft: PistonOscillationFreeParameterDraft;
  frozenParameterSnapshot: PistonOscillationFreeParameterSnapshot | null;
  sampleRateHz: number | null;
  triggerThresholdKpa: number | null;
  acquisitionCandidate: PistonOscillationRawMeasurementRecord | null;
  acquisitionCandidateTargetId: string | null;
  savedMeasurements: PistonOscillationRawMeasurementRecord[];
  savedMeasurementTargetIds: Record<string, string>;
  excludedAttempts: PistonOscillationFreeExcludedAttempt[];
  primaryCycleEligibilityByRecordId: Record<
    string,
    PistonOscillationPrimaryCycleEligibilityReport
  >;
  reacquisition: PistonOscillationFreeReacquisitionState | null;
  instrumentState: PistonOscillationFreeInstrumentState;
  dataProcessing: PistonOscillationDataProcessingSession | null;
  audit: PistonOscillationFreeAuditEvent[];
}

interface PistonOscillationFreeTimedEvent {
  nowMs: number;
}

export type PistonOscillationFreeEvent =
  | ({ type: 'start' | 'pause' | 'reset' } & PistonOscillationFreeTimedEvent)
  | ({
      type: 'setPlan';
      targetHeightsMm: readonly number[];
      customHeightCandidatesMm?: readonly number[];
    } & PistonOscillationFreeTimedEvent)
  | ({
      type: 'setPower';
      powerOn: boolean;
    } & PistonOscillationFreeTimedEvent)
  | ({
      type: 'setAcquisitionSetting';
      field: 'sampleRateHz' | 'triggerThresholdKpa';
      value: number;
    } & PistonOscillationFreeTimedEvent)
  | ({
      type: 'setParameterDraft';
      parameterDraft: PistonOscillationFreeParameterDraft;
    } & PistonOscillationFreeTimedEvent)
  | ({ type: 'restoreDefaultParameters' } & PistonOscillationFreeTimedEvent)
  | ({ type: 'acknowledgeAdvancedParametersRisk' } & PistonOscillationFreeTimedEvent)
  | ({
      type: 'observeOperation';
      operation: PistonOscillationFreeObservedOperation;
      measurementIndex?: number;
      targetHeightMm?: number;
      payload?: Record<string, PistonOscillationFreeAuditPrimitive>;
    } & PistonOscillationFreeTimedEvent)
  | ({
      type: 'saveMeasurement';
      measurement: PistonOscillationRawMeasurementRecord;
    } & PistonOscillationFreeTimedEvent)
  | ({
      type: 'freezeAcquisition';
      measurement: PistonOscillationRawMeasurementRecord;
    } & PistonOscillationFreeTimedEvent)
  | ({ type: 'clearAcquisition' } & PistonOscillationFreeTimedEvent)
  | ({
      type: 'setInstrumentState';
      instrumentState: PistonOscillationFreeInstrumentStateInput;
    } & PistonOscillationFreeTimedEvent)
  | ({
      type: 'deleteMeasurement';
      measurementIndex: number;
    } & PistonOscillationFreeTimedEvent)
  | ({ type: 'clearPeriodSelection'; runIndex: number } & PistonOscillationFreeTimedEvent)
  | ({
      type: 'requestUnusableMeasurementRedo';
      runIndex: number;
    } & PistonOscillationFreeTimedEvent)
  | ({
      type: 'selectPeriodRange';
      runIndex: number;
      rangeStartTimeS: number;
      rangeEndTimeS: number;
    } & PistonOscillationFreeTimedEvent)
  | ({
      type: 'editPeriodAnswer';
      runIndex: number;
      field: PistonOscillationPeriodAnswerField;
      value: string;
    } & PistonOscillationFreeTimedEvent)
  | ({ type: 'revealPeriodEntry'; runIndex: number } & PistonOscillationFreeTimedEvent)
  | ({ type: 'submitPeriodBatch'; runIndex: number } & PistonOscillationFreeTimedEvent)
  | ({ type: 'continuePeriodBatch'; runIndex: number } & PistonOscillationFreeTimedEvent)
  | ({
      type: 'revealPeriodAnswer';
      runIndex: number;
      field: PistonOscillationPeriodAnswerField;
    } & PistonOscillationFreeTimedEvent)
  | ({ type: 'advancePeriodRun' } & PistonOscillationFreeTimedEvent)
  | ({ type: 'reopenPreviousPeriodRun' } & PistonOscillationFreeTimedEvent)
  | ({ type: 'toggleFitRun'; runIndex: number } & PistonOscillationFreeTimedEvent)
  | ({ type: 'submitLinearFit' } & PistonOscillationFreeTimedEvent)
  | ({
      type: 'editCalculationAnswer';
      field: PistonOscillationCalculationFieldId;
      value: string;
    } & PistonOscillationFreeTimedEvent)
  | ({
      type: 'revealNextCalculationField';
      field: PistonOscillationCalculationFieldId;
    } & PistonOscillationFreeTimedEvent)
  | ({ type: 'submitCalculationBatch' } & PistonOscillationFreeTimedEvent)
  | ({ type: 'continueCalculationBatch' } & PistonOscillationFreeTimedEvent)
  | ({
      type: 'revealCalculationAnswer';
      field: PistonOscillationCalculationFieldId;
    } & PistonOscillationFreeTimedEvent)
  | ({ type: 'completeCalculation' } & PistonOscillationFreeTimedEvent);

const FREE_EVENT_TYPES: readonly PistonOscillationFreeAuditEventType[] = [
  'session-started',
  'session-resumed',
  'session-paused',
  'session-reset',
  'plan-updated',
  'power-changed',
  'parameter-changed',
  'parameters-restored',
  'acquisition-setting-changed',
  'operation-observed',
  'acquisition-excluded',
  'measurement-saved',
  'measurement-deleted',
];

const FREE_OPERATIONS: readonly PistonOscillationFreeObservedOperation[] = [
  'togglePower',
  'confirmHeight',
  'tightenScrew',
  'loosenScrew',
  'disconnectHose',
  'reconnectHose',
  'leftHandPress',
  'leftHandRelease',
  'startAcquisition',
  'pauseAcquisition',
  'redoAcquisition',
  'saveMeasurement',
  'releasePiston',
  'bottomImpact',
];

const MAX_PERSISTED_FREE_AUDIT_EVENTS = 4096;
const MAX_PERSISTED_FREE_EXCLUDED_ATTEMPTS = 256;

const isPlainRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

const isNonNegativeInteger = (value: unknown): value is number => (
  Number.isSafeInteger(value) && (value as number) >= 0
);

const isAuditPrimitive = (value: unknown): value is PistonOscillationFreeAuditPrimitive => (
  value === null || typeof value === 'string' || typeof value === 'boolean' || isFiniteNumber(value)
);

const normalizeAuditPayload = (
  value: unknown,
): Record<string, PistonOscillationFreeAuditPrimitive> => {
  if (!isPlainRecord(value)) return {};
  return Object.entries(value).reduce<Record<string, PistonOscillationFreeAuditPrimitive>>(
    (payload, [key, candidate], index) => {
      if (index < 32 && isAuditPrimitive(candidate)) payload[key] = candidate;
      return payload;
    },
    {},
  );
};

export const isValidPistonOscillationFreeExperimentPlan = (
  targetHeightsMm: readonly number[],
) => {
  if (
    targetHeightsMm.length < PISTON_OSCILLATION_FREE_MINIMUM_MEASUREMENT_COUNT
    || targetHeightsMm.length > PISTON_OSCILLATION_FREE_MAXIMUM_MEASUREMENT_COUNT
  ) return false;
  return targetHeightsMm.every((heightMm) => (
    Number.isSafeInteger(heightMm) && heightMm >= 10 && heightMm <= 80
  )) && new Set(targetHeightsMm).size === targetHeightsMm.length;
};

export const isValidPistonOscillationFreeCustomHeightMm = (heightMm: number) => (
  Number.isSafeInteger(heightMm) && heightMm >= 10 && heightMm <= 80
);

const isSystemFreeTargetHeightMm = (heightMm: number) => (
  PISTON_OSCILLATION_FREE_TARGET_HEIGHTS_MM.includes(
    heightMm as (typeof PISTON_OSCILLATION_FREE_TARGET_HEIGHTS_MM)[number],
  )
);

const normalizeCustomHeightCandidates = (
  value: readonly number[] | undefined,
  selectedTargetHeightsMm: readonly number[],
) => [...new Set([
  ...(value ?? []).filter((heightMm) => (
    isValidPistonOscillationFreeCustomHeightMm(heightMm)
    && !isSystemFreeTargetHeightMm(heightMm)
  )),
  ...selectedTargetHeightsMm.filter((heightMm) => !isSystemFreeTargetHeightMm(heightMm)),
])].sort((first, second) => second - first);

const createPlanTargetId = (planId: string, heightMm: number) => (
  `${planId}:height:${heightMm}`
);

export const createPistonOscillationFreeExperimentPlan = (
  targetHeightsMm: readonly number[],
  options: {
    planId?: string;
    customHeightCandidatesMm?: readonly number[];
  } = {},
): PistonOscillationFreeExperimentPlan => {
  if (!isValidPistonOscillationFreeExperimentPlan(targetHeightsMm)) {
    throw new RangeError('Free-mode target heights must contain 3–6 unique integer heights from 10 to 80 mm.');
  }
  const sortedTargetHeightsMm = [...targetHeightsMm].sort((first, second) => second - first);
  const planId = typeof options.planId === 'string' && options.planId.trim().length > 0
    ? options.planId.trim()
    : `piston-free-plan:${sortedTargetHeightsMm.join('-')}`;
  const customHeightCandidatesMm = normalizeCustomHeightCandidates(
    options.customHeightCandidatesMm,
    sortedTargetHeightsMm,
  );
  const targets = sortedTargetHeightsMm.map<PistonOscillationFreePlanTarget>((heightMm) => ({
    schemaVersion: PISTON_OSCILLATION_FREE_TARGET_SCHEMA_VERSION,
    targetId: createPlanTargetId(planId, heightMm),
    heightMm,
    source: isSystemFreeTargetHeightMm(heightMm) ? 'system' : 'custom',
  }));
  return {
    schemaVersion: PISTON_OSCILLATION_FREE_PLAN_SCHEMA_VERSION,
    planId,
    targets,
    targetHeightsMm: sortedTargetHeightsMm,
    customHeightCandidatesMm,
  };
};

const normalizeExperimentPlan = (value: unknown): PistonOscillationFreeExperimentPlan | null => {
  if (
    !isPlainRecord(value)
    || !Array.isArray(value.targetHeightsMm)
    || !isValidPistonOscillationFreeExperimentPlan(value.targetHeightsMm as number[])
  ) return null;
  const targetHeightsMm = value.targetHeightsMm as number[];
  return createPistonOscillationFreeExperimentPlan(targetHeightsMm, {
    planId: typeof value.planId === 'string' && value.planId.trim().length > 0
      ? value.planId
      : `legacy-piston-free-plan:${[...targetHeightsMm]
          .sort((first, second) => second - first)
          .join('-')}`,
    customHeightCandidatesMm: Array.isArray(value.customHeightCandidatesMm)
      ? value.customHeightCandidatesMm.filter(isFiniteNumber)
      : undefined,
  });
};

export const createDefaultPistonOscillationFreeInstrumentState = (
  parameterDraft = createDefaultPistonOscillationFreeParameterDraft(),
): PistonOscillationFreeInstrumentState => ({
  schemaVersion: PISTON_OSCILLATION_FREE_INSTRUMENT_STATE_SCHEMA_VERSION,
  focusMode: 'overview',
  hoseState: 'disconnected',
  nominalHeightMm: 0,
  equilibriumHeightMm: 0,
  pistonOffsetMm: 0,
  lockingScrewProgress: 0,
  heightAdjustmentStage: 'readingHeight',
  pistonPhase: 'idle',
  thermodynamicState: createPistonOscillationAtmosphericLockedState(
    0,
    getPistonOscillationFreePhysicsConfig(parameterDraft),
    'vented',
  ),
});

export const createDefaultPistonOscillationFreeSession = ():
PistonOscillationFreeSession => {
  const parameterDraft = createDefaultPistonOscillationFreeParameterDraft();
  return ({
  schemaVersion: PISTON_OSCILLATION_FREE_SESSION_SCHEMA_VERSION,
  status: 'idle',
  startedAtMs: null,
  updatedAtMs: null,
  experimentPlan: null,
  measurementIndex: 0,
  powerOn: false,
  advancedParametersRiskAcknowledged: false,
  parameterDraft,
  frozenParameterSnapshot: null,
  sampleRateHz: null,
  triggerThresholdKpa: null,
  acquisitionCandidate: null,
  acquisitionCandidateTargetId: null,
  savedMeasurements: [],
  savedMeasurementTargetIds: {},
  excludedAttempts: [],
  primaryCycleEligibilityByRecordId: {},
  reacquisition: null,
  instrumentState: createDefaultPistonOscillationFreeInstrumentState(parameterDraft),
  dataProcessing: null,
  audit: [],
  });
};

const appendAudit = (
  session: PistonOscillationFreeSession,
  type: PistonOscillationFreeAuditEventType,
  nowMs: number,
  options: {
    measurementIndex?: number | null;
    targetHeightMm?: number | null;
    operation?: PistonOscillationFreeObservedOperation | null;
    payload?: Record<string, PistonOscillationFreeAuditPrimitive>;
  } = {},
): PistonOscillationFreeAuditEvent[] => {
  const sequence = (session.audit.at(-1)?.sequence ?? -1) + 1;
  const event: PistonOscillationFreeAuditEvent = {
    schemaVersion: PISTON_OSCILLATION_FREE_EVENT_SCHEMA_VERSION,
    sequence,
    eventId: `${session.startedAtMs ?? nowMs}:${sequence}:${type}`,
    occurredAtMs: nowMs,
    type,
    measurementIndex: options.measurementIndex ?? null,
    targetHeightMm: options.targetHeightMm ?? null,
    operation: options.operation ?? null,
    payload: { ...(options.payload ?? {}) },
  };
  return [...session.audit, event].slice(-MAX_PERSISTED_FREE_AUDIT_EVENTS);
};

const createFreshActiveSession = (
  nowMs: number,
  auditType: 'session-started' | 'session-reset' = 'session-started',
  retainedParameterDraft = createDefaultPistonOscillationFreeParameterDraft(),
  advancedParametersRiskAcknowledged = false,
): PistonOscillationFreeSession => {
  const parameterDraft = normalizePistonOscillationFreeParameterDraft(
    retainedParameterDraft,
  );
  const session: PistonOscillationFreeSession = {
    ...createDefaultPistonOscillationFreeSession(),
    status: 'active',
    startedAtMs: nowMs,
    updatedAtMs: nowMs,
    advancedParametersRiskAcknowledged,
    parameterDraft,
    sampleRateHz: parameterDraft.sampleRateHz,
    triggerThresholdKpa: parameterDraft.triggerThresholdKpa,
    instrumentState: createDefaultPistonOscillationFreeInstrumentState(parameterDraft),
  };
  return {
    ...session,
    audit: appendAudit(session, auditType, nowMs),
  };
};

const getFirstMissingMeasurementIndex = (
  plan: PistonOscillationFreeExperimentPlan,
  measurements: readonly PistonOscillationRawMeasurementRecord[],
) => {
  const missingIndex = plan.targetHeightsMm.findIndex((_, measurementIndex) => (
    !measurements.some((measurement) => measurement.measurementIndex === measurementIndex)
  ));
  return missingIndex < 0 ? plan.targetHeightsMm.length : missingIndex;
};

export const getPistonOscillationFreeTarget = (
  session: PistonOscillationFreeSession,
  measurementIndex = session.measurementIndex,
) => session.experimentPlan?.targets[measurementIndex] ?? null;

const appendExcludedAttempt = (
  session: PistonOscillationFreeSession,
  measurement: PistonOscillationRawMeasurementRecord,
  targetId: string,
  reason: PistonOscillationFreeExcludedAttemptReason,
  nowMs: number,
  primaryCycleEligibility: PistonOscillationPrimaryCycleEligibilityReport | null = null,
) => [
  ...session.excludedAttempts,
  {
    schemaVersion: PISTON_OSCILLATION_FREE_EXCLUDED_ATTEMPT_SCHEMA_VERSION,
    attemptId: `${measurement.recordId}:excluded:${nowMs}:${reason}`,
    targetId,
    measurementIndex: measurement.measurementIndex,
    reason,
    excludedAtMs: nowMs,
    measurement: clonePistonOscillationRawMeasurementRecord(measurement),
    primaryCycleEligibility: primaryCycleEligibility
      ? structuredClone(primaryCycleEligibility)
      : null,
  } satisfies PistonOscillationFreeExcludedAttempt,
].slice(-MAX_PERSISTED_FREE_EXCLUDED_ATTEMPTS);

export const isPistonOscillationFreePlanComplete = (
  session: PistonOscillationFreeSession,
) => session.experimentPlan !== null
  && session.measurementIndex >= session.experimentPlan.targetHeightsMm.length;

export const getPistonOscillationFreeCurrentTargetHeightMm = (
  session: PistonOscillationFreeSession,
) => session.experimentPlan?.targetHeightsMm[session.measurementIndex] ?? null;

export const getPistonOscillationFreeRunPrimaryCycleEligibility = (
  session: PistonOscillationFreeSession,
  runIndex: number,
) => {
  const run = session.dataProcessing?.runs[runIndex];
  if (!run) return null;
  return session.primaryCycleEligibilityByRecordId[run.rawMeasurementRecordId] ?? null;
};

const advanceCompletedFinalFreePeriodRun = (
  dataProcessing: PistonOscillationDataProcessingSession,
  savedMeasurements: readonly PistonOscillationRawMeasurementRecord[],
  nowMs: number,
) => {
  const activeRun = dataProcessing.runs[dataProcessing.activeRunIndex];
  const finalRunResolved = Boolean(
    activeRun?.result
    && dataProcessing.activeRunIndex === dataProcessing.runs.length - 1,
  );
  return finalRunResolved
    ? advancePistonOscillationPeriodRun(dataProcessing, nowMs, savedMeasurements)
    : dataProcessing;
};

export const transitionPistonOscillationFreeSession = (
  session: PistonOscillationFreeSession,
  event: PistonOscillationFreeEvent,
): PistonOscillationFreeSession => {
  if (event.type === 'start') {
    if (session.status === 'active') return session;
    if (session.status === 'idle' || session.startedAtMs === null) {
      return createFreshActiveSession(
        event.nowMs,
        'session-started',
        session.parameterDraft,
        session.advancedParametersRiskAcknowledged,
      );
    }
    const next = {
      ...session,
      status: 'active' as const,
      updatedAtMs: event.nowMs,
    };
    return {
      ...next,
      audit: appendAudit(next, 'session-resumed', event.nowMs),
    };
  }
  if (event.type === 'reset') {
    return createFreshActiveSession(
      event.nowMs,
      'session-reset',
      session.parameterDraft,
      session.advancedParametersRiskAcknowledged,
    );
  }
  if (event.type === 'pause') {
    if (session.status !== 'active') return session;
    const next = {
      ...session,
      status: 'paused' as const,
      powerOn: false,
      instrumentState: {
        ...session.instrumentState,
        pistonPhase: 'idle' as const,
      },
      updatedAtMs: event.nowMs,
    };
    return {
      ...next,
      audit: appendAudit(next, 'session-paused', event.nowMs),
    };
  }
  if (event.type === 'setParameterDraft') {
    if (session.frozenParameterSnapshot !== null) return session;
    let parameterDraft = normalizePistonOscillationFreeParameterDraft(
      event.parameterDraft,
      session.parameterDraft,
    );
    const ambientPressureChanged = parameterDraft.ambientPressureKpa
      !== session.parameterDraft.ambientPressureKpa;
    const requestedTriggerThresholdKpa = event.parameterDraft.triggerThresholdKpa;
    if (
      ambientPressureChanged
      && (
        requestedTriggerThresholdKpa === session.parameterDraft.triggerThresholdKpa
        || (
          requestedTriggerThresholdKpa !== null
          && !isPistonOscillationFreeTriggerThresholdKpa(
            requestedTriggerThresholdKpa,
            parameterDraft.ambientPressureKpa,
          )
        )
      )
    ) {
      parameterDraft = normalizePistonOscillationFreeParameterDraft({
        ...parameterDraft,
        triggerThresholdKpa: scalePistonOscillationFreeTriggerThresholdKpa(
          session.parameterDraft.triggerThresholdKpa,
          session.parameterDraft.ambientPressureKpa,
          parameterDraft.ambientPressureKpa,
        ),
      }, parameterDraft);
    } else if (
      !ambientPressureChanged
      && requestedTriggerThresholdKpa !== null
      && !isPistonOscillationFreeTriggerThresholdKpa(
        requestedTriggerThresholdKpa,
        parameterDraft.ambientPressureKpa,
      )
    ) {
      parameterDraft = normalizePistonOscillationFreeParameterDraft({
        ...parameterDraft,
        triggerThresholdKpa: session.parameterDraft.triggerThresholdKpa,
      }, parameterDraft);
    }
    if (JSON.stringify(parameterDraft) === JSON.stringify(session.parameterDraft)) {
      return session;
    }
    const thermodynamicInputsChanged = [
      'ambientPressureKpa',
      'ambientTemperatureK',
      'thermalRelaxationTimeS',
      'heatFlowLagTimeS',
    ].some((key) => (
      parameterDraft[key as keyof PistonOscillationFreeParameterDraft]
        !== session.parameterDraft[key as keyof PistonOscillationFreeParameterDraft]
    ));
    const next = {
      ...session,
      parameterDraft,
      sampleRateHz: parameterDraft.sampleRateHz,
      triggerThresholdKpa: parameterDraft.triggerThresholdKpa,
      instrumentState: thermodynamicInputsChanged
        ? createDefaultPistonOscillationFreeInstrumentState(parameterDraft)
        : session.instrumentState,
      updatedAtMs: event.nowMs,
    };
    return {
      ...next,
      audit: appendAudit(next, 'parameter-changed', event.nowMs),
    };
  }

  if (event.type === 'restoreDefaultParameters') {
    if (session.frozenParameterSnapshot !== null) return session;
    const parameterDraft = createDefaultPistonOscillationFreeParameterDraft();
    const next = {
      ...session,
      parameterDraft,
      sampleRateHz: parameterDraft.sampleRateHz,
      triggerThresholdKpa: parameterDraft.triggerThresholdKpa,
      instrumentState: createDefaultPistonOscillationFreeInstrumentState(parameterDraft),
      updatedAtMs: event.nowMs,
    };
    return {
      ...next,
      audit: appendAudit(next, 'parameters-restored', event.nowMs),
    };
  }

  if (event.type === 'acknowledgeAdvancedParametersRisk') {
    if (session.advancedParametersRiskAcknowledged) return session;
    return {
      ...session,
      advancedParametersRiskAcknowledged: true,
      updatedAtMs: event.nowMs,
    };
  }

  if (event.type === 'setAcquisitionSetting') {
    if (session.frozenParameterSnapshot !== null) return session;
    const valueValid = event.field === 'sampleRateHz'
      ? Number.isSafeInteger(event.value) && event.value > 0 && event.value <= 1000
      : isPistonOscillationFreeTriggerThresholdKpa(
          event.value,
          session.parameterDraft.ambientPressureKpa,
        );
    if (!valueValid || session[event.field] === event.value) return session;
    const parameterDraft = {
      ...session.parameterDraft,
      [event.field]: event.value,
    };
    const next = {
      ...session,
      [event.field]: event.value,
      parameterDraft,
      updatedAtMs: event.nowMs,
    };
    return {
      ...next,
      audit: appendAudit(next, 'acquisition-setting-changed', event.nowMs, {
        measurementIndex: session.measurementIndex,
        targetHeightMm: getPistonOscillationFreeCurrentTargetHeightMm(session),
        payload: { field: event.field, value: event.value },
      }),
    };
  }

  if (session.status !== 'active') return session;

  if (event.type === 'setPlan') {
    if (
      session.savedMeasurements.length > 0
      || session.acquisitionCandidate !== null
      || session.experimentPlan !== null
      || session.audit.some((auditEvent) => auditEvent.type === 'plan-updated')
      || !isValidPistonOscillationFreeExperimentPlan(event.targetHeightsMm)
    ) return session;
    const experimentPlan = createPistonOscillationFreeExperimentPlan(event.targetHeightsMm, {
      planId: `piston-free-plan:${session.startedAtMs ?? event.nowMs}:${event.nowMs}`,
      customHeightCandidatesMm: event.customHeightCandidatesMm,
    });
    const next = {
      ...session,
      experimentPlan,
      measurementIndex: 0,
      acquisitionCandidate: null,
      acquisitionCandidateTargetId: null,
      savedMeasurements: [],
      savedMeasurementTargetIds: {},
      excludedAttempts: [],
      primaryCycleEligibilityByRecordId: {},
      reacquisition: null,
      dataProcessing: null,
      updatedAtMs: event.nowMs,
    };
    return {
      ...next,
      audit: appendAudit(next, 'plan-updated', event.nowMs, {
        payload: {
          targetCount: experimentPlan.targetHeightsMm.length,
          targetHeightsMm: experimentPlan.targetHeightsMm.join(','),
        },
      }),
    };
  }

  if (event.type === 'setPower') {
    if (session.powerOn === event.powerOn) return session;
    const next = {
      ...session,
      powerOn: event.powerOn,
      updatedAtMs: event.nowMs,
    };
    return {
      ...next,
      audit: appendAudit(next, 'power-changed', event.nowMs, {
        operation: 'togglePower',
        payload: { powerOn: event.powerOn },
      }),
    };
  }

  if (event.type === 'setInstrumentState') {
    const normalizedInstrumentState = normalizeInstrumentState(event.instrumentState);
    if (
      normalizedInstrumentState.focusMode === session.instrumentState.focusMode
      && normalizedInstrumentState.hoseState === session.instrumentState.hoseState
      && normalizedInstrumentState.nominalHeightMm
        === session.instrumentState.nominalHeightMm
      && normalizedInstrumentState.equilibriumHeightMm
        === session.instrumentState.equilibriumHeightMm
      && normalizedInstrumentState.pistonOffsetMm === session.instrumentState.pistonOffsetMm
      && normalizedInstrumentState.lockingScrewProgress
        === session.instrumentState.lockingScrewProgress
      && normalizedInstrumentState.heightAdjustmentStage
        === session.instrumentState.heightAdjustmentStage
      && normalizedInstrumentState.pistonPhase === session.instrumentState.pistonPhase
      && JSON.stringify(normalizedInstrumentState.thermodynamicState)
        === JSON.stringify(session.instrumentState.thermodynamicState)
    ) return session;
    return {
      ...session,
      instrumentState: normalizedInstrumentState,
      updatedAtMs: event.nowMs,
    };
  }

  if (event.type === 'observeOperation') {
    const measurementIndex = isNonNegativeInteger(event.measurementIndex)
      ? event.measurementIndex
      : session.measurementIndex;
    const targetHeightMm = isFiniteNumber(event.targetHeightMm)
      ? event.targetHeightMm
      : session.experimentPlan?.targetHeightsMm[measurementIndex] ?? null;
    return {
      ...session,
      updatedAtMs: event.nowMs,
      audit: appendAudit(session, 'operation-observed', event.nowMs, {
        measurementIndex,
        targetHeightMm,
        operation: event.operation,
        payload: event.payload,
      }),
    };
  }

  if (event.type === 'freezeAcquisition') {
    const measurementIndex = session.measurementIndex;
    const target = session.experimentPlan?.targets[measurementIndex];
    if (!target) return session;
    const normalized = normalizePistonOscillationRawMeasurementRecord(
      event.measurement,
      measurementIndex,
    );
    if (
      !normalized
      || normalized.measurementIndex !== measurementIndex
      || normalized.targetHeightMm !== target.heightMm
    ) return session;
    return {
      ...session,
      acquisitionCandidate: clonePistonOscillationRawMeasurementRecord(normalized),
      acquisitionCandidateTargetId: target.targetId,
      updatedAtMs: event.nowMs,
    };
  }

  if (event.type === 'clearAcquisition') {
    if (session.acquisitionCandidate === null) return session;
    const target = session.experimentPlan?.targets[session.measurementIndex];
    const targetId = session.acquisitionCandidateTargetId ?? target?.targetId ?? null;
    const excludedAttempts = targetId === null
      ? session.excludedAttempts
      : appendExcludedAttempt(
          session,
          session.acquisitionCandidate,
          targetId,
          'redo',
          event.nowMs,
        );
    const next = {
      ...session,
      acquisitionCandidate: null,
      acquisitionCandidateTargetId: null,
      excludedAttempts,
      updatedAtMs: event.nowMs,
    };
    return {
      ...next,
      audit: appendAudit(next, 'acquisition-excluded', event.nowMs, {
        measurementIndex: session.acquisitionCandidate.measurementIndex,
        targetHeightMm: session.acquisitionCandidate.targetHeightMm,
        operation: 'redoAcquisition',
        payload: {
          recordId: session.acquisitionCandidate.recordId,
          reason: 'redo',
        },
      }),
    };
  }

  if (event.type === 'saveMeasurement') {
    const measurementIndex = event.measurement.measurementIndex;
    const target = session.experimentPlan?.targets[measurementIndex];
    if (!target || event.measurement.targetHeightMm !== target.heightMm) {
      return session;
    }
    const normalized = normalizePistonOscillationRawMeasurementRecord(
      event.measurement,
      measurementIndex,
    );
    if (!normalized || normalized.targetHeightMm !== target.heightMm) return session;
    const frozenParameters = session.frozenParameterSnapshot?.parameters
      ?? session.parameterDraft;
    if (!doesPistonOscillationMeasurementMatchFreeParameters(
      normalized,
      frozenParameters,
    )) return session;
    const savedMeasurements = [
      ...session.savedMeasurements.filter((measurement) => (
        measurement.measurementIndex !== measurementIndex
      )),
      clonePistonOscillationRawMeasurementRecord(normalized),
    ].sort((first, second) => first.measurementIndex - second.measurementIndex);
    const experimentPlan = session.experimentPlan;
    if (!experimentPlan) return session;
    const measurementIndexAfterSave = getFirstMissingMeasurementIndex(
      experimentPlan,
      savedMeasurements,
    );
    const planComplete = measurementIndexAfterSave >= experimentPlan.targetHeightsMm.length;
    const replacedMeasurement = session.savedMeasurements.find((measurement) => (
      measurement.measurementIndex === measurementIndex
    )) ?? null;
    const reacquisition = session.reacquisition?.measurementIndex === measurementIndex
      && session.reacquisition.excludedRecordId === replacedMeasurement?.recordId
      ? session.reacquisition
      : null;
    const replacedTargetId = replacedMeasurement
      ? session.savedMeasurementTargetIds[replacedMeasurement.recordId] ?? target.targetId
      : null;
    const excludedAttempts = replacedMeasurement && replacedTargetId && !reacquisition
      ? appendExcludedAttempt(
          session,
          replacedMeasurement,
          replacedTargetId,
          'deleted',
          event.nowMs,
        )
      : session.excludedAttempts;
    const savedMeasurementTargetIds = Object.fromEntries(
      Object.entries(session.savedMeasurementTargetIds).filter(([recordId]) => (
        recordId !== replacedMeasurement?.recordId
      )),
    );
    savedMeasurementTargetIds[normalized.recordId] = target.targetId;
    const primaryCycleEligibility = analyzePistonOscillationPrimaryCycleEligibility(normalized);
    const primaryCycleEligibilityByRecordId = Object.fromEntries(
      Object.entries(session.primaryCycleEligibilityByRecordId).filter(([recordId]) => (
        recordId !== replacedMeasurement?.recordId
      )),
    );
    primaryCycleEligibilityByRecordId[normalized.recordId] = primaryCycleEligibility;
    const dataProcessing = planComplete
      ? reacquisition && session.dataProcessing
        ? replacePistonOscillationProcessingMeasurement(
            session.dataProcessing,
            savedMeasurements,
            reacquisition.returnRunIndex,
            normalized,
            event.nowMs,
          )
        : createPistonOscillationDataProcessingSession(
            savedMeasurements,
            event.nowMs,
            { answerValidationMode: 'batch' },
          )
      : null;
    const next = {
      ...session,
      frozenParameterSnapshot: session.frozenParameterSnapshot
        ?? createPistonOscillationFreeParameterSnapshot(
          session.parameterDraft,
          event.nowMs,
        ),
      savedMeasurements,
      savedMeasurementTargetIds,
      excludedAttempts,
      primaryCycleEligibilityByRecordId,
      reacquisition: reacquisition ? null : session.reacquisition,
      measurementIndex: measurementIndexAfterSave,
      acquisitionCandidate: null,
      acquisitionCandidateTargetId: null,
      dataProcessing,
      updatedAtMs: event.nowMs,
    };
    return {
      ...next,
      audit: appendAudit(next, 'measurement-saved', event.nowMs, {
        measurementIndex,
        targetHeightMm: target.heightMm,
        operation: 'saveMeasurement',
        payload: {
          recordId: normalized.recordId,
          targetId: target.targetId,
          confirmedHeightMm: normalized.confirmedHeightMm,
          sampleRateHz: normalized.acquisitionSettings.sampleRateHz,
          triggerThresholdKpa: normalized.acquisitionSettings.triggerThresholdKpa,
          recordedDurationS: normalized.acquisitionSettings.recordedDurationS,
          recordingPath: normalized.acquisitionSettings.recordingPath,
          releaseOffsetS: normalized.acquisitionSettings.releaseOffsetS,
          primaryCycleEligibilityStatus: primaryCycleEligibility.status,
          primaryCycleEligibilityReason: primaryCycleEligibility.reason,
          reacquisition: reacquisition !== null,
        },
      }),
    };
  }

  if (event.type === 'requestUnusableMeasurementRedo') {
    const dataProcessing = session.dataProcessing;
    const run = dataProcessing?.runs[event.runIndex];
    const measurement = run
      ? session.savedMeasurements.find((candidate) => (
          candidate.recordId === run.rawMeasurementRecordId
        )) ?? null
      : null;
    const target = run ? session.experimentPlan?.targets[run.measurementIndex] ?? null : null;
    const eligibility = run
      ? session.primaryCycleEligibilityByRecordId[run.rawMeasurementRecordId] ?? null
      : null;
    if (
      session.reacquisition !== null
      || dataProcessing?.status !== 'period-processing'
      || dataProcessing.activeRunIndex !== event.runIndex
      || !run
      || !measurement
      || !target
      || eligibility?.status !== 'unusable'
    ) return session;
    const next = {
      ...session,
      measurementIndex: run.measurementIndex,
      powerOn: true,
      acquisitionCandidate: null,
      acquisitionCandidateTargetId: null,
      excludedAttempts: appendExcludedAttempt(
        session,
        measurement,
        target.targetId,
        'insufficient-primary-period',
        event.nowMs,
        eligibility,
      ),
      reacquisition: {
        schemaVersion: PISTON_OSCILLATION_FREE_REACQUISITION_SCHEMA_VERSION,
        targetId: target.targetId,
        measurementIndex: run.measurementIndex,
        excludedRecordId: measurement.recordId,
        returnRunIndex: event.runIndex,
        requestedAtMs: event.nowMs,
      } satisfies PistonOscillationFreeReacquisitionState,
      instrumentState: createDefaultPistonOscillationFreeInstrumentState(
        session.frozenParameterSnapshot?.parameters ?? session.parameterDraft,
      ),
      updatedAtMs: event.nowMs,
    };
    return {
      ...next,
      audit: appendAudit(next, 'acquisition-excluded', event.nowMs, {
        measurementIndex: run.measurementIndex,
        targetHeightMm: target.heightMm,
        operation: 'redoAcquisition',
        payload: {
          recordId: measurement.recordId,
          targetId: target.targetId,
          reason: 'insufficient-primary-period',
          eligibilityAlgorithmVersion: eligibility.algorithmVersion,
          eligibilityReason: eligibility.reason,
          primaryPeriodCount: eligibility.primaryPeriodCount,
        },
      }),
    };
  }

  if (event.type === 'clearPeriodSelection') {
    if (!session.dataProcessing) return session;
    return {
      ...session,
      updatedAtMs: event.nowMs,
      dataProcessing: clearPistonOscillationPeriodSelection(
        session.dataProcessing,
        event.runIndex,
        event.nowMs,
      ),
    };
  }

  if (event.type === 'selectPeriodRange') {
    if (!session.dataProcessing) return session;
    return {
      ...session,
      updatedAtMs: event.nowMs,
      dataProcessing: selectPistonOscillationFreePeriodRange(
        session.dataProcessing,
        session.savedMeasurements,
        event.runIndex,
        event.rangeStartTimeS,
        event.rangeEndTimeS,
        event.nowMs,
      ),
    };
  }

  if (event.type === 'editPeriodAnswer') {
    if (!session.dataProcessing) return session;
    return {
      ...session,
      updatedAtMs: event.nowMs,
      dataProcessing: updatePistonOscillationPeriodAnswerDraft(
        session.dataProcessing,
        event.runIndex,
        event.field,
        event.value,
        event.nowMs,
      ),
    };
  }

  if (event.type === 'revealPeriodEntry') {
    if (!session.dataProcessing) return session;
    return {
      ...session,
      updatedAtMs: event.nowMs,
      dataProcessing: revealPistonOscillationFreePeriodEntry(
        session.dataProcessing,
        event.runIndex,
        event.nowMs,
      ),
    };
  }

  if (event.type === 'continuePeriodBatch') {
    if (!session.dataProcessing) return session;
    return {
      ...session,
      updatedAtMs: event.nowMs,
      dataProcessing: continuePistonOscillationFreePeriodBatch(
        session.dataProcessing,
        event.runIndex,
        event.nowMs,
      ),
    };
  }

  if (event.type === 'submitPeriodBatch') {
    if (!session.dataProcessing) return session;
    const dataProcessing = submitPistonOscillationFreePeriodBatch(
      session.dataProcessing,
      event.runIndex,
      event.nowMs,
    );
    return {
      ...session,
      updatedAtMs: event.nowMs,
      dataProcessing: advanceCompletedFinalFreePeriodRun(
        dataProcessing,
        session.savedMeasurements,
        event.nowMs,
      ),
    };
  }

  if (event.type === 'revealPeriodAnswer') {
    if (!session.dataProcessing) return session;
    const dataProcessing = revealPistonOscillationFreePeriodAnswer(
      session.dataProcessing,
      event.runIndex,
      event.field,
      event.nowMs,
    );
    return {
      ...session,
      updatedAtMs: event.nowMs,
      dataProcessing: advanceCompletedFinalFreePeriodRun(
        dataProcessing,
        session.savedMeasurements,
        event.nowMs,
      ),
    };
  }

  if (event.type === 'advancePeriodRun') {
    if (!session.dataProcessing) return session;
    return {
      ...session,
      updatedAtMs: event.nowMs,
      dataProcessing: advancePistonOscillationPeriodRun(
        session.dataProcessing,
        event.nowMs,
        session.savedMeasurements,
      ),
    };
  }

  if (event.type === 'reopenPreviousPeriodRun') {
    if (!session.dataProcessing) return session;
    return {
      ...session,
      updatedAtMs: event.nowMs,
      dataProcessing: reopenPreviousPistonOscillationPeriodRun(
        session.dataProcessing,
        event.nowMs,
      ),
    };
  }

  if (event.type === 'toggleFitRun') {
    if (!session.dataProcessing) return session;
    return {
      ...session,
      updatedAtMs: event.nowMs,
      dataProcessing: togglePistonOscillationFitRun(
        session.dataProcessing,
        event.runIndex,
        event.nowMs,
      ),
    };
  }

  if (event.type === 'submitLinearFit') {
    if (!session.dataProcessing) return session;
    return {
      ...session,
      updatedAtMs: event.nowMs,
      dataProcessing: submitPistonOscillationLinearFit(
        session.dataProcessing,
        event.nowMs,
        { requireAllRuns: true },
      ),
    };
  }

  if (event.type === 'editCalculationAnswer') {
    if (!session.dataProcessing) return session;
    return {
      ...session,
      updatedAtMs: event.nowMs,
      dataProcessing: updatePistonOscillationFreeCalculationDraft(
        session.dataProcessing,
        event.field,
        event.value,
        event.nowMs,
      ),
    };
  }

  if (event.type === 'revealNextCalculationField') {
    if (!session.dataProcessing) return session;
    return {
      ...session,
      updatedAtMs: event.nowMs,
      dataProcessing: revealNextPistonOscillationFreeCalculationField(
        session.dataProcessing,
        event.field,
        event.nowMs,
      ),
    };
  }

  if (event.type === 'continueCalculationBatch') {
    if (!session.dataProcessing) return session;
    return {
      ...session,
      updatedAtMs: event.nowMs,
      dataProcessing: continuePistonOscillationFreeCalculationBatch(
        session.dataProcessing,
        event.nowMs,
      ),
    };
  }

  if (event.type === 'submitCalculationBatch') {
    if (!session.dataProcessing) return session;
    return {
      ...session,
      updatedAtMs: event.nowMs,
      dataProcessing: submitPistonOscillationFreeCalculationBatch(
        session.dataProcessing,
        event.nowMs,
      ),
    };
  }

  if (event.type === 'revealCalculationAnswer') {
    if (!session.dataProcessing) return session;
    return {
      ...session,
      updatedAtMs: event.nowMs,
      dataProcessing: revealPistonOscillationFreeCalculationAnswer(
        session.dataProcessing,
        event.field,
        event.nowMs,
      ),
    };
  }

  if (event.type === 'completeCalculation') {
    if (!session.dataProcessing) return session;
    return {
      ...session,
      updatedAtMs: event.nowMs,
      dataProcessing: completePistonOscillationCalculation(
        session.dataProcessing,
        event.nowMs,
      ),
    };
  }

  if (event.type !== 'deleteMeasurement') return session;
  const measurementIndex = event.measurementIndex;
  const experimentPlan = session.experimentPlan;
  if (
    !experimentPlan
    || !isNonNegativeInteger(measurementIndex)
    || measurementIndex >= experimentPlan.targetHeightsMm.length
    || session.reacquisition?.measurementIndex === measurementIndex
    || !session.savedMeasurements.some((measurement) => (
      measurement.measurementIndex === measurementIndex
    ))
  ) return session;
  const deletedMeasurement = session.savedMeasurements.find((measurement) => (
    measurement.measurementIndex === measurementIndex
  ))!;
  const target = experimentPlan.targets[measurementIndex];
  if (!target) return session;
  const savedMeasurements = session.savedMeasurements.filter((measurement) => (
    measurement.measurementIndex !== measurementIndex
  ));
  const savedMeasurementTargetIds = Object.fromEntries(
    Object.entries(session.savedMeasurementTargetIds).filter(([recordId]) => (
      recordId !== deletedMeasurement.recordId
    )),
  );
  const primaryCycleEligibilityByRecordId = Object.fromEntries(
    Object.entries(session.primaryCycleEligibilityByRecordId).filter(([recordId]) => (
      recordId !== deletedMeasurement.recordId
    )),
  );
  const next = {
    ...session,
    savedMeasurements,
    savedMeasurementTargetIds,
    primaryCycleEligibilityByRecordId,
    excludedAttempts: appendExcludedAttempt(
      session,
      deletedMeasurement,
      session.savedMeasurementTargetIds[deletedMeasurement.recordId] ?? target.targetId,
      'deleted',
      event.nowMs,
    ),
    measurementIndex: getFirstMissingMeasurementIndex(experimentPlan, savedMeasurements),
    acquisitionCandidate: null,
    acquisitionCandidateTargetId: null,
    dataProcessing: null,
    updatedAtMs: event.nowMs,
  };
  return {
    ...next,
    audit: appendAudit(next, 'measurement-deleted', event.nowMs, {
      measurementIndex,
      targetHeightMm: target.heightMm,
      payload: {
        recordId: deletedMeasurement.recordId,
        targetId: target.targetId,
      },
    }),
  };
};

const FREE_INSTRUMENT_FOCUS_MODES: readonly PistonOscillationFreeInstrumentState['focusMode'][] = [
  'overview',
  'pistonFocus',
  'hoseFocus',
  'powerFocus',
];
const FREE_INSTRUMENT_HEIGHT_STAGES: readonly PistonOscillationFreeInstrumentState[
  'heightAdjustmentStage'
][] = ['readingHeight', 'lockingHeight'];
const FREE_INSTRUMENT_PISTON_PHASES: readonly PistonOscillationFreeInstrumentState[
  'pistonPhase'
][] = [
  'idle',
  'ready',
  'pressing',
  'adjustingHeight',
  'holding',
  'falling',
  'rebounding',
];

const normalizeInstrumentState = (
  value: unknown,
  recoverTransientState = false,
  parameterDraft = createDefaultPistonOscillationFreeParameterDraft(),
): PistonOscillationFreeInstrumentState => {
  const physicsConfig = getPistonOscillationFreePhysicsConfig(parameterDraft);
  const fallback = createDefaultPistonOscillationFreeInstrumentState(parameterDraft);
  if (!isPlainRecord(value)) return fallback;
  const equilibriumHeightMm = isFiniteNumber(value.equilibriumHeightMm)
    ? Math.min(80, Math.max(0, value.equilibriumHeightMm))
    : fallback.equilibriumHeightMm;
  const pistonOffsetMm = isFiniteNumber(value.pistonOffsetMm)
    ? Math.min(80, Math.max(-80, value.pistonOffsetMm))
    : fallback.pistonOffsetMm;
  const lockingScrewProgress = isFiniteNumber(value.lockingScrewProgress)
    ? Math.min(1, Math.max(0, value.lockingScrewProgress))
    : fallback.lockingScrewProgress;
  const hoseState = value.hoseState === 'connected' ? 'connected' : 'disconnected';
  const persistedThermodynamicState = normalizePistonOscillationThermodynamicState(
    value.thermodynamicState,
  );
  const inferredThermodynamicState = (() => {
    const pistonHeightMm = Math.min(80, Math.max(
      0,
      equilibriumHeightMm + pistonOffsetMm,
    ));
    if (hoseState === 'disconnected') {
      return createPistonOscillationAtmosphericLockedState(
        pistonHeightMm,
        physicsConfig,
        'vented',
      );
    }
    if (lockingScrewProgress >= 0.6) {
      return createPistonOscillationAtmosphericLockedState(
        pistonHeightMm,
        physicsConfig,
        'sealed-locked-atmospheric',
      );
    }
    return createLegacyPistonOscillationLooseConnectedThermodynamicState(
      equilibriumHeightMm,
      pistonOffsetMm,
    );
  })();
  const thermodynamicState = persistedThermodynamicState
    ?? inferredThermodynamicState;
  const nominalHeightMm = isFiniteNumber(value.nominalHeightMm)
    ? Math.min(80, Math.max(0, value.nominalHeightMm))
    : Math.min(80, Math.max(
      0,
      thermodynamicState.nominalLockedHeightM * 1_000,
    ));
  const stablePhysicalState = recoverTransientState
    ? resolvePistonOscillationStablePhysicalState({
        hoseConnected: hoseState === 'connected',
        lockingScrewLocked: lockingScrewProgress >= 0.6,
        nominalHeightMm,
        visibleHeightMm: Math.min(80, Math.max(
          0,
          thermodynamicState.pistonHeightM * 1_000,
        )),
        referenceThermodynamicState: thermodynamicState,
      }, physicsConfig)
    : null;
  return {
    schemaVersion: PISTON_OSCILLATION_FREE_INSTRUMENT_STATE_SCHEMA_VERSION,
    focusMode: FREE_INSTRUMENT_FOCUS_MODES.includes(
      value.focusMode as PistonOscillationFreeInstrumentState['focusMode'],
    )
      ? value.focusMode as PistonOscillationFreeInstrumentState['focusMode']
      : fallback.focusMode,
    hoseState,
    nominalHeightMm: stablePhysicalState?.nominalHeightMm ?? nominalHeightMm,
    equilibriumHeightMm:
      stablePhysicalState?.equilibriumHeightMm ?? equilibriumHeightMm,
    pistonOffsetMm: stablePhysicalState?.pistonOffsetMm ?? pistonOffsetMm,
    lockingScrewProgress,
    heightAdjustmentStage: FREE_INSTRUMENT_HEIGHT_STAGES.includes(
      value.heightAdjustmentStage as PistonOscillationFreeInstrumentState[
        'heightAdjustmentStage'
      ],
    )
      ? value.heightAdjustmentStage as PistonOscillationFreeInstrumentState[
          'heightAdjustmentStage'
        ]
      : fallback.heightAdjustmentStage,
    pistonPhase: recoverTransientState
      ? 'idle'
      : FREE_INSTRUMENT_PISTON_PHASES.includes(
      value.pistonPhase as PistonOscillationFreeInstrumentState['pistonPhase'],
    )
      ? value.pistonPhase as PistonOscillationFreeInstrumentState['pistonPhase']
      : fallback.pistonPhase,
    thermodynamicState: stablePhysicalState?.thermodynamicState ?? thermodynamicState,
  };
};

const PRIMARY_CYCLE_ELIGIBILITY_STATUSES = ['usable', 'unusable', 'indeterminate'] as const;
const PRIMARY_CYCLE_ELIGIBILITY_REASONS = [
  'primary-half-cycle-found',
  'release-not-observed',
  'insufficient-post-release-samples',
  'insufficient-primary-excursion',
  'insufficient-primary-extrema',
  'ambiguous-multiscale-extrema',
] as const;

const normalizePrimaryCycleEligibility = (
  value: unknown,
  measurement: PistonOscillationRawMeasurementRecord,
): PistonOscillationPrimaryCycleEligibilityReport => {
  const fallback = analyzePistonOscillationPrimaryCycleEligibility(measurement);
  if (
    !isPlainRecord(value)
    || value.schemaVersion !== 1
    || value.algorithmVersion !== fallback.algorithmVersion
    || value.rawMeasurementRecordId !== measurement.recordId
    || !PRIMARY_CYCLE_ELIGIBILITY_STATUSES.includes(
      value.status as PistonOscillationPrimaryCycleEligibilityReport['status'],
    )
    || !PRIMARY_CYCLE_ELIGIBILITY_REASONS.includes(
      value.reason as PistonOscillationPrimaryCycleEligibilityReport['reason'],
    )
    || !isNonNegativeInteger(value.analysisStartSampleIndex)
    || !isNonNegativeInteger(value.analysisSampleCount)
    || !isFiniteNumber(value.expectedHalfPeriodSamples)
    || !isFiniteNumber(value.smoothingWindowSamples)
    || !isFiniteNumber(value.pressureRangeKpa)
    || !isFiniteNumber(value.estimatedNoiseFloorKpa)
    || !isFiniteNumber(value.minimumPrimaryExcursionKpa)
    || !isFiniteNumber(value.primaryPeriodCount)
    || !Array.isArray(value.primaryExtrema)
  ) return fallback;
  const primaryExtrema = value.primaryExtrema.flatMap((extremum, ordinal) => (
    isPlainRecord(extremum)
    && isNonNegativeInteger(extremum.sampleIndex)
    && (extremum.type === 'peak' || extremum.type === 'trough')
    && isFiniteNumber(extremum.timeS)
    && isFiniteNumber(extremum.absolutePressureKpa)
      ? [{
          ordinal,
          sampleIndex: extremum.sampleIndex,
          type: extremum.type as 'peak' | 'trough',
          timeS: extremum.timeS,
          absolutePressureKpa: extremum.absolutePressureKpa,
        }]
      : []
  ));
  if (primaryExtrema.length !== value.primaryExtrema.length) return fallback;
  return {
    schemaVersion: 1,
    algorithmVersion: fallback.algorithmVersion,
    rawMeasurementRecordId: measurement.recordId,
    status: value.status as PistonOscillationPrimaryCycleEligibilityReport['status'],
    reason: value.reason as PistonOscillationPrimaryCycleEligibilityReport['reason'],
    analysisStartSampleIndex: value.analysisStartSampleIndex,
    analysisSampleCount: value.analysisSampleCount,
    expectedHalfPeriodSamples: value.expectedHalfPeriodSamples,
    smoothingWindowSamples: value.smoothingWindowSamples,
    pressureRangeKpa: value.pressureRangeKpa,
    estimatedNoiseFloorKpa: value.estimatedNoiseFloorKpa,
    minimumPrimaryExcursionKpa: value.minimumPrimaryExcursionKpa,
    primaryPeriodCount: value.primaryPeriodCount,
    primaryExtrema,
  };
};

const normalizeExcludedAttempt = (
  value: unknown,
  experimentPlan: PistonOscillationFreeExperimentPlan,
): PistonOscillationFreeExcludedAttempt | null => {
  if (
    !isPlainRecord(value)
    || !isNonNegativeInteger(value.measurementIndex)
    || (
      value.reason !== 'redo'
      && value.reason !== 'deleted'
      && value.reason !== 'insufficient-primary-period'
    )
    || !isFiniteNumber(value.excludedAtMs)
  ) return null;
  const target = experimentPlan.targets[value.measurementIndex];
  if (!target) return null;
  const measurement = normalizePistonOscillationRawMeasurementRecord(
    value.measurement,
    value.measurementIndex,
  );
  if (!measurement || measurement.targetHeightMm !== target.heightMm) return null;
  return {
    schemaVersion: PISTON_OSCILLATION_FREE_EXCLUDED_ATTEMPT_SCHEMA_VERSION,
    attemptId: typeof value.attemptId === 'string' && value.attemptId.length > 0
      ? value.attemptId
      : `${measurement.recordId}:excluded:${value.excludedAtMs}:${value.reason}`,
    targetId: value.targetId === target.targetId ? value.targetId : target.targetId,
    measurementIndex: value.measurementIndex,
    reason: value.reason,
    excludedAtMs: value.excludedAtMs,
    measurement,
    primaryCycleEligibility: value.reason === 'insufficient-primary-period'
      ? normalizePrimaryCycleEligibility(value.primaryCycleEligibility, measurement)
      : null,
  };
};

const normalizeAuditEvent = (
  value: unknown,
): PistonOscillationFreeAuditEvent | null => {
  if (
    !isPlainRecord(value)
    || !isNonNegativeInteger(value.sequence)
    || typeof value.eventId !== 'string'
    || value.eventId.length === 0
    || !isFiniteNumber(value.occurredAtMs)
    || !FREE_EVENT_TYPES.includes(value.type as PistonOscillationFreeAuditEventType)
  ) return null;
  const operation = value.operation === null
    ? null
    : FREE_OPERATIONS.includes(value.operation as PistonOscillationFreeObservedOperation)
      ? value.operation as PistonOscillationFreeObservedOperation
      : null;
  const measurementIndex = value.measurementIndex === null
    ? null
    : isNonNegativeInteger(value.measurementIndex)
      ? value.measurementIndex
      : null;
  const targetHeightMm = value.targetHeightMm === null
    ? null
    : isFiniteNumber(value.targetHeightMm)
      ? value.targetHeightMm
      : null;
  return {
    schemaVersion: PISTON_OSCILLATION_FREE_EVENT_SCHEMA_VERSION,
    sequence: value.sequence,
    eventId: value.eventId,
    occurredAtMs: value.occurredAtMs,
    type: value.type as PistonOscillationFreeAuditEventType,
    measurementIndex,
    targetHeightMm,
    operation,
    payload: normalizeAuditPayload(value.payload),
  };
};

export const normalizePistonOscillationFreeSession = (
  value: unknown,
): PistonOscillationFreeSession => {
  const fallback = createDefaultPistonOscillationFreeSession();
  if (!isPlainRecord(value)) return fallback;
  const experimentPlan = normalizeExperimentPlan(value.experimentPlan);
  const savedMeasurements = experimentPlan && Array.isArray(value.savedMeasurements)
    ? value.savedMeasurements
      .map((measurement) => {
        if (!isPlainRecord(measurement) || !isNonNegativeInteger(measurement.measurementIndex)) {
          return null;
        }
        const targetHeightMm = experimentPlan.targetHeightsMm[measurement.measurementIndex];
        if (targetHeightMm === undefined) return null;
        const normalized = normalizePistonOscillationRawMeasurementRecord(
          measurement,
          measurement.measurementIndex,
        );
        return normalized?.targetHeightMm === targetHeightMm ? normalized : null;
      })
      .filter((measurement): measurement is PistonOscillationRawMeasurementRecord => (
        measurement !== null
      ))
      .filter((measurement, index, measurements) => (
        measurements.findIndex((candidate) => (
          candidate.measurementIndex === measurement.measurementIndex
        )) === index
      ))
      .sort((first, second) => first.measurementIndex - second.measurementIndex)
    : [];
  const savedMeasurementTargetIds = savedMeasurements.reduce<Record<string, string>>(
    (targetIds, measurement) => {
      const target = experimentPlan?.targets[measurement.measurementIndex];
      if (!target) return targetIds;
      targetIds[measurement.recordId] = target.targetId;
      return targetIds;
    },
    {},
  );
  const startedAtMs = isFiniteNumber(value.startedAtMs) ? value.startedAtMs : null;
  const persistedStatus = value.status === 'active' || value.status === 'paused'
    ? value.status
    : 'idle';
  const status = startedAtMs === null ? 'idle' : persistedStatus;
  const audit = Array.isArray(value.audit)
    ? value.audit
      .map(normalizeAuditEvent)
      .filter((event): event is PistonOscillationFreeAuditEvent => event !== null)
      .sort((first, second) => first.sequence - second.sequence)
      .filter((event, index, events) => (
        events.findIndex((candidate) => candidate.sequence === event.sequence) === index
      ))
      .slice(-MAX_PERSISTED_FREE_AUDIT_EVENTS)
    : [];
  const persistedEligibilityByRecordId = isPlainRecord(
    value.primaryCycleEligibilityByRecordId,
  ) ? value.primaryCycleEligibilityByRecordId : {};
  const primaryCycleEligibilityByRecordId = savedMeasurements.reduce<Record<
    string,
    PistonOscillationPrimaryCycleEligibilityReport
  >>((reports, measurement) => {
    reports[measurement.recordId] = normalizePrimaryCycleEligibility(
      persistedEligibilityByRecordId[measurement.recordId],
      measurement,
    );
    return reports;
  }, {});
  const excludedAttempts = experimentPlan && Array.isArray(value.excludedAttempts)
    ? value.excludedAttempts
      .map((attempt) => normalizeExcludedAttempt(attempt, experimentPlan))
      .filter((attempt): attempt is PistonOscillationFreeExcludedAttempt => attempt !== null)
      .filter((attempt, index, attempts) => (
        attempts.findIndex((candidate) => candidate.attemptId === attempt.attemptId) === index
      ))
      .slice(-MAX_PERSISTED_FREE_EXCLUDED_ATTEMPTS)
    : [];
  const persistedReacquisition = isPlainRecord(value.reacquisition)
    ? value.reacquisition
    : null;
  const reacquisitionMeasurementIndex = persistedReacquisition
    && isNonNegativeInteger(persistedReacquisition.measurementIndex)
    ? persistedReacquisition.measurementIndex
    : null;
  const reacquisitionMeasurement = reacquisitionMeasurementIndex === null
    ? null
    : savedMeasurements.find((measurement) => (
        measurement.measurementIndex === reacquisitionMeasurementIndex
      )) ?? null;
  const reacquisitionTarget = reacquisitionMeasurementIndex === null
    ? null
    : experimentPlan?.targets[reacquisitionMeasurementIndex] ?? null;
  const reacquisition: PistonOscillationFreeReacquisitionState | null =
    persistedReacquisition
    && reacquisitionMeasurement
    && reacquisitionTarget
    && persistedReacquisition.schemaVersion
      === PISTON_OSCILLATION_FREE_REACQUISITION_SCHEMA_VERSION
    && persistedReacquisition.targetId === reacquisitionTarget.targetId
    && persistedReacquisition.excludedRecordId === reacquisitionMeasurement.recordId
    && isNonNegativeInteger(persistedReacquisition.returnRunIndex)
    && persistedReacquisition.returnRunIndex < savedMeasurements.length
    && isFiniteNumber(persistedReacquisition.requestedAtMs)
    && excludedAttempts.some((attempt) => (
      attempt.reason === 'insufficient-primary-period'
      && attempt.measurement.recordId === reacquisitionMeasurement.recordId
    ))
      ? {
          schemaVersion: PISTON_OSCILLATION_FREE_REACQUISITION_SCHEMA_VERSION,
          targetId: reacquisitionTarget.targetId,
          measurementIndex: reacquisitionMeasurementIndex,
          excludedRecordId: reacquisitionMeasurement.recordId,
          returnRunIndex: persistedReacquisition.returnRunIndex,
          requestedAtMs: persistedReacquisition.requestedAtMs,
        }
      : null;
  const measurementIndex = reacquisition?.measurementIndex ?? (experimentPlan
    ? getFirstMissingMeasurementIndex(experimentPlan, savedMeasurements)
    : 0);
  const candidateTargetHeightMm = experimentPlan?.targetHeightsMm[measurementIndex];
  const acquisitionCandidate = candidateTargetHeightMm !== undefined
    ? normalizePistonOscillationRawMeasurementRecord(value.acquisitionCandidate, measurementIndex)
    : null;
  const normalizedAcquisitionCandidate = acquisitionCandidate?.targetHeightMm
    === candidateTargetHeightMm
    ? acquisitionCandidate
    : null;
  const candidateTarget = experimentPlan?.targets[measurementIndex] ?? null;
  const acquisitionCandidateTargetId = normalizedAcquisitionCandidate && candidateTarget
    ? candidateTarget.targetId
    : null;
  const dataProcessing = experimentPlan
    && savedMeasurements.length >= experimentPlan.targetHeightsMm.length
    ? normalizePistonOscillationDataProcessingSession(
        value.dataProcessing,
        savedMeasurements,
        isFiniteNumber(value.updatedAtMs) ? value.updatedAtMs : Date.now(),
        { answerValidationMode: 'batch' },
      )
    : null;
  const persistedSampleRateHz = Number.isSafeInteger(value.sampleRateHz)
    && (value.sampleRateHz as number) > 0
    && (value.sampleRateHz as number) <= 1000
    ? value.sampleRateHz as number
    : null;
  const persistedTriggerThresholdKpa = isPistonOscillationStoredTriggerThresholdKpa(
    value.triggerThresholdKpa,
  )
    ? value.triggerThresholdKpa
    : null;
  const measurementInferredDraft = savedMeasurements[0]
    ? createPistonOscillationFreeParameterDraftFromMeasurement(savedMeasurements[0])
    : createDefaultPistonOscillationFreeParameterDraft();
  const persistedParameterDraft = normalizePistonOscillationFreeParameterDraft(
    value.parameterDraft,
    measurementInferredDraft,
  );
  let synchronizedParameterDraft = normalizePistonOscillationFreeParameterDraft({
    ...persistedParameterDraft,
    sampleRateHz: persistedSampleRateHz ?? persistedParameterDraft.sampleRateHz,
    triggerThresholdKpa:
      persistedTriggerThresholdKpa ?? persistedParameterDraft.triggerThresholdKpa,
  }, persistedParameterDraft);
  if (
    savedMeasurements.length === 0
    && synchronizedParameterDraft.triggerThresholdKpa !== null
    && !isPistonOscillationFreeTriggerThresholdKpa(
      synchronizedParameterDraft.triggerThresholdKpa,
      synchronizedParameterDraft.ambientPressureKpa,
    )
  ) {
    synchronizedParameterDraft = normalizePistonOscillationFreeParameterDraft({
      ...synchronizedParameterDraft,
      triggerThresholdKpa: scalePistonOscillationFreeTriggerThresholdKpa(
        synchronizedParameterDraft.triggerThresholdKpa,
        PISTON_OSCILLATION_FREE_TRIGGER_REFERENCE_AMBIENT_PRESSURE_KPA,
        synchronizedParameterDraft.ambientPressureKpa,
      ),
    }, synchronizedParameterDraft);
  }
  const persistedFrozenParameterSnapshot =
    normalizePistonOscillationFreeParameterSnapshot(value.frozenParameterSnapshot);
  const frozenParameterSnapshot = savedMeasurements.length === 0
    ? null
    : persistedFrozenParameterSnapshot
      ?? createPistonOscillationFreeParameterSnapshot(
        measurementInferredDraft,
        savedMeasurements[0]?.capturedAtMs ?? startedAtMs ?? Date.now(),
      );
  const parameterDraft = frozenParameterSnapshot?.parameters
    ?? synchronizedParameterDraft;
  return {
    ...fallback,
    status,
    startedAtMs,
    updatedAtMs: isFiniteNumber(value.updatedAtMs) ? value.updatedAtMs : startedAtMs,
    experimentPlan,
    measurementIndex,
    powerOn: status === 'active' && (reacquisition !== null || value.powerOn === true),
    advancedParametersRiskAcknowledged:
      value.advancedParametersRiskAcknowledged === true,
    parameterDraft,
    frozenParameterSnapshot,
    sampleRateHz: parameterDraft.sampleRateHz,
    triggerThresholdKpa: parameterDraft.triggerThresholdKpa,
    acquisitionCandidate: normalizedAcquisitionCandidate,
    acquisitionCandidateTargetId,
    savedMeasurements,
    savedMeasurementTargetIds,
    excludedAttempts,
    primaryCycleEligibilityByRecordId,
    reacquisition,
    instrumentState: normalizeInstrumentState(
      value.instrumentState,
      true,
      parameterDraft,
    ),
    dataProcessing,
    audit,
  };
};
