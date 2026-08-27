import {
  clonePistonOscillationRawMeasurementRecord,
  normalizePistonOscillationRawMeasurementRecord,
  type PistonOscillationDataProcessingSession,
  type PistonOscillationRawMeasurementRecord,
} from './pistonOscillationDataProcessingModel.ts';

export const PISTON_OSCILLATION_FREE_SESSION_SCHEMA_VERSION = 1 as const;
export const PISTON_OSCILLATION_FREE_PLAN_SCHEMA_VERSION = 1 as const;
export const PISTON_OSCILLATION_FREE_EVENT_SCHEMA_VERSION = 1 as const;
export const PISTON_OSCILLATION_FREE_MINIMUM_MEASUREMENT_COUNT = 3 as const;
export const PISTON_OSCILLATION_FREE_MAXIMUM_MEASUREMENT_COUNT = 6 as const;
export const PISTON_OSCILLATION_FREE_TARGET_HEIGHTS_MM = [80, 70, 60, 50, 40, 30] as const;
export const PISTON_OSCILLATION_FREE_BASELINE_TARGET_HEIGHTS_MM = [80, 70, 60] as const;
export const PISTON_OSCILLATION_FREE_DEFAULT_SAMPLE_RATE_HZ = 1000 as const;
export const PISTON_OSCILLATION_FREE_DEFAULT_TRIGGER_THRESHOLD_KPA = 120 as const;

export type PistonOscillationFreeSessionStatus = 'idle' | 'active' | 'paused';

export interface PistonOscillationFreeExperimentPlan {
  schemaVersion: typeof PISTON_OSCILLATION_FREE_PLAN_SCHEMA_VERSION;
  targetHeightsMm: number[];
}

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
  | 'releasePiston';

export type PistonOscillationFreeAuditEventType =
  | 'session-started'
  | 'session-resumed'
  | 'session-paused'
  | 'session-reset'
  | 'plan-updated'
  | 'power-changed'
  | 'acquisition-setting-changed'
  | 'operation-observed'
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
  experimentPlan: PistonOscillationFreeExperimentPlan;
  measurementIndex: number;
  powerOn: boolean;
  sampleRateHz: number;
  triggerThresholdKpa: number;
  savedMeasurements: PistonOscillationRawMeasurementRecord[];
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
      type: 'deleteMeasurement';
      measurementIndex: number;
    } & PistonOscillationFreeTimedEvent);

const FREE_EVENT_TYPES: readonly PistonOscillationFreeAuditEventType[] = [
  'session-started',
  'session-resumed',
  'session-paused',
  'session-reset',
  'plan-updated',
  'power-changed',
  'acquisition-setting-changed',
  'operation-observed',
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
];

const MAX_PERSISTED_FREE_AUDIT_EVENTS = 4096;

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
  const allowedIndices = targetHeightsMm.map((heightMm) => (
    PISTON_OSCILLATION_FREE_TARGET_HEIGHTS_MM.indexOf(
      heightMm as (typeof PISTON_OSCILLATION_FREE_TARGET_HEIGHTS_MM)[number],
    )
  ));
  return allowedIndices.every((index) => index >= 0)
    && new Set(targetHeightsMm).size === targetHeightsMm.length
    && allowedIndices.every((index, position) => position === 0 || index > allowedIndices[position - 1]!);
};

export const createPistonOscillationFreeExperimentPlan = (
  targetHeightsMm: readonly number[] = PISTON_OSCILLATION_FREE_BASELINE_TARGET_HEIGHTS_MM,
): PistonOscillationFreeExperimentPlan => {
  if (!isValidPistonOscillationFreeExperimentPlan(targetHeightsMm)) {
    throw new RangeError('Free-mode target heights must contain 3–6 unique formal heights in descending order.');
  }
  return {
    schemaVersion: PISTON_OSCILLATION_FREE_PLAN_SCHEMA_VERSION,
    targetHeightsMm: [...targetHeightsMm],
  };
};

const normalizeExperimentPlan = (value: unknown): PistonOscillationFreeExperimentPlan => {
  if (
    !isPlainRecord(value)
    || !Array.isArray(value.targetHeightsMm)
    || !isValidPistonOscillationFreeExperimentPlan(value.targetHeightsMm as number[])
  ) return createPistonOscillationFreeExperimentPlan();
  return createPistonOscillationFreeExperimentPlan(value.targetHeightsMm as number[]);
};

export const createDefaultPistonOscillationFreeSession = ():
PistonOscillationFreeSession => ({
  schemaVersion: PISTON_OSCILLATION_FREE_SESSION_SCHEMA_VERSION,
  status: 'idle',
  startedAtMs: null,
  updatedAtMs: null,
  experimentPlan: createPistonOscillationFreeExperimentPlan(),
  measurementIndex: 0,
  powerOn: false,
  sampleRateHz: PISTON_OSCILLATION_FREE_DEFAULT_SAMPLE_RATE_HZ,
  triggerThresholdKpa: PISTON_OSCILLATION_FREE_DEFAULT_TRIGGER_THRESHOLD_KPA,
  savedMeasurements: [],
  dataProcessing: null,
  audit: [],
});

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
): PistonOscillationFreeSession => {
  const session: PistonOscillationFreeSession = {
    ...createDefaultPistonOscillationFreeSession(),
    status: 'active',
    startedAtMs: nowMs,
    updatedAtMs: nowMs,
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

export const isPistonOscillationFreePlanComplete = (
  session: PistonOscillationFreeSession,
) => session.measurementIndex >= session.experimentPlan.targetHeightsMm.length;

export const getPistonOscillationFreeCurrentTargetHeightMm = (
  session: PistonOscillationFreeSession,
) => session.experimentPlan.targetHeightsMm[session.measurementIndex] ?? null;

export const transitionPistonOscillationFreeSession = (
  session: PistonOscillationFreeSession,
  event: PistonOscillationFreeEvent,
): PistonOscillationFreeSession => {
  if (event.type === 'start') {
    if (session.status === 'active') return session;
    if (session.status === 'idle' || session.startedAtMs === null) {
      return createFreshActiveSession(event.nowMs);
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
  if (event.type === 'reset') return createFreshActiveSession(event.nowMs, 'session-reset');
  if (event.type === 'pause') {
    if (session.status !== 'active') return session;
    const next = {
      ...session,
      status: 'paused' as const,
      powerOn: false,
      updatedAtMs: event.nowMs,
    };
    return {
      ...next,
      audit: appendAudit(next, 'session-paused', event.nowMs),
    };
  }
  if (session.status !== 'active') return session;

  if (event.type === 'setPlan') {
    if (
      session.savedMeasurements.length > 0
      || !isValidPistonOscillationFreeExperimentPlan(event.targetHeightsMm)
    ) return session;
    const experimentPlan = createPistonOscillationFreeExperimentPlan(event.targetHeightsMm);
    const next = {
      ...session,
      experimentPlan,
      measurementIndex: 0,
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

  if (event.type === 'setAcquisitionSetting') {
    const valueValid = event.field === 'sampleRateHz'
      ? Number.isSafeInteger(event.value) && event.value > 0 && event.value <= 1000
      : Number.isFinite(event.value) && event.value > 0;
    if (!valueValid || session[event.field] === event.value) return session;
    const next = {
      ...session,
      [event.field]: event.value,
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

  if (event.type === 'observeOperation') {
    const measurementIndex = isNonNegativeInteger(event.measurementIndex)
      ? event.measurementIndex
      : session.measurementIndex;
    const targetHeightMm = isFiniteNumber(event.targetHeightMm)
      ? event.targetHeightMm
      : session.experimentPlan.targetHeightsMm[measurementIndex] ?? null;
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

  if (event.type === 'saveMeasurement') {
    const measurementIndex = event.measurement.measurementIndex;
    const targetHeightMm = session.experimentPlan.targetHeightsMm[measurementIndex];
    if (targetHeightMm === undefined || event.measurement.targetHeightMm !== targetHeightMm) {
      return session;
    }
    const normalized = normalizePistonOscillationRawMeasurementRecord(
      event.measurement,
      measurementIndex,
    );
    if (!normalized || normalized.targetHeightMm !== targetHeightMm) return session;
    const savedMeasurements = [
      ...session.savedMeasurements.filter((measurement) => (
        measurement.measurementIndex !== measurementIndex
      )),
      clonePistonOscillationRawMeasurementRecord(normalized),
    ].sort((first, second) => first.measurementIndex - second.measurementIndex);
    const next = {
      ...session,
      savedMeasurements,
      measurementIndex: getFirstMissingMeasurementIndex(session.experimentPlan, savedMeasurements),
      dataProcessing: null,
      updatedAtMs: event.nowMs,
    };
    return {
      ...next,
      audit: appendAudit(next, 'measurement-saved', event.nowMs, {
        measurementIndex,
        targetHeightMm,
        operation: 'saveMeasurement',
        payload: {
          recordId: normalized.recordId,
          confirmedHeightMm: normalized.confirmedHeightMm,
          sampleRateHz: normalized.acquisitionSettings.sampleRateHz,
          triggerThresholdKpa: normalized.acquisitionSettings.triggerThresholdKpa,
          recordedDurationS: normalized.acquisitionSettings.recordedDurationS,
        },
      }),
    };
  }

  if (event.type !== 'deleteMeasurement') return session;
  const measurementIndex = event.measurementIndex;
  if (
    !isNonNegativeInteger(measurementIndex)
    || measurementIndex >= session.experimentPlan.targetHeightsMm.length
    || !session.savedMeasurements.some((measurement) => (
      measurement.measurementIndex === measurementIndex
    ))
  ) return session;
  const savedMeasurements = session.savedMeasurements.filter((measurement) => (
    measurement.measurementIndex !== measurementIndex
  ));
  const next = {
    ...session,
    savedMeasurements,
    measurementIndex: getFirstMissingMeasurementIndex(session.experimentPlan, savedMeasurements),
    dataProcessing: null,
    updatedAtMs: event.nowMs,
  };
  return {
    ...next,
    audit: appendAudit(next, 'measurement-deleted', event.nowMs, {
      measurementIndex,
      targetHeightMm: session.experimentPlan.targetHeightsMm[measurementIndex] ?? null,
      payload: {},
    }),
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
  const savedMeasurements = Array.isArray(value.savedMeasurements)
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
  return {
    ...fallback,
    status,
    startedAtMs,
    updatedAtMs: isFiniteNumber(value.updatedAtMs) ? value.updatedAtMs : startedAtMs,
    experimentPlan,
    measurementIndex: getFirstMissingMeasurementIndex(experimentPlan, savedMeasurements),
    powerOn: status === 'active' && value.powerOn === true,
    sampleRateHz: Number.isSafeInteger(value.sampleRateHz)
      && (value.sampleRateHz as number) > 0
      && (value.sampleRateHz as number) <= 1000
      ? value.sampleRateHz as number
      : fallback.sampleRateHz,
    triggerThresholdKpa: isFiniteNumber(value.triggerThresholdKpa)
      && value.triggerThresholdKpa > 0
      ? value.triggerThresholdKpa
      : fallback.triggerThresholdKpa,
    savedMeasurements,
    dataProcessing: null,
    audit,
  };
};
