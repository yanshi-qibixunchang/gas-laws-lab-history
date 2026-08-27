import {
  PISTON_OSCILLATION_GUIDED_MINIMUM_PERIOD_COUNT,
  advancePistonOscillationPeriodRun,
  clearPistonOscillationPeriodSelection,
  clonePistonOscillationRawMeasurementRecord,
  completePistonOscillationCalculation,
  continuePistonOscillationCalculationAnswer,
  continuePistonOscillationPeriodAnswer,
  createPistonOscillationDataProcessingSession,
  normalizePistonOscillationDataProcessingSession,
  normalizePistonOscillationRawMeasurementRecord,
  revealPistonOscillationCalculationAnswer,
  revealPistonOscillationPeriodAnswer,
  selectPistonOscillationPeriodRange,
  submitPistonOscillationPeriod,
  submitPistonOscillationPeriodEndpoints,
  submitPistonOscillationCalculationField,
  submitPistonOscillationLinearFit,
  togglePistonOscillationFitRun,
  updatePistonOscillationCalculationDraft,
  updatePistonOscillationPeriodAnswerDraft,
  type PistonOscillationCalculationFieldId,
  type PistonOscillationDataProcessingSession,
  type PistonOscillationPeriodAnswerField,
  type PistonOscillationRawMeasurementRecord,
  type PistonOscillationRawSample,
} from './pistonOscillationDataProcessingModel.ts';

export const PISTON_OSCILLATION_GUIDE_SESSION_SCHEMA_VERSION = 9 as const;

export const PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM = [80, 70, 60] as const;
export const PISTON_OSCILLATION_GUIDE_TOTAL_MEASUREMENTS = 3 as const;
export const PISTON_OSCILLATION_GUIDE_SAMPLE_RATE_HZ = 1000 as const;
export const PISTON_OSCILLATION_GUIDE_TRIGGER_THRESHOLD_KPA = 120 as const;
export const PISTON_OSCILLATION_GUIDE_MAXIMUM_PRESSURE_KPA = 130 as const;
export const PISTON_OSCILLATION_GUIDE_MINIMUM_RECORDING_DURATION_S = 0.5 as const;
export const PISTON_OSCILLATION_GUIDE_HEIGHT_CONFIRMATION_TOLERANCE_MM = 0.25 as const;

export type PistonOscillationGuideMeasurementIndex = 0 | 1 | 2;

export type PistonOscillationGuideStep =
  | 'powerOn'
  | 'parameterSetup'
  | 'firstHeightAdjustment'
  | 'screwLock'
  | 'hoseReconnect'
  | 'screwLoosen'
  | 'baselineStabilizing'
  | 'acquisitionReady'
  | 'waitingTrigger'
  | 'recording'
  | 'pauseAvailable'
  | 'curveFrozen'
  | 'awaitingSaveOrRedo'
  | 'crossRunStabilizing'
  | 'crossRunDisconnect'
  | 'nextHeightAdjustment'
  | 'periodProcessing'
  | 'powerOff'
  | 'calculationReady'
  | 'completionReview'
  | 'completed';

export type PistonOscillationGuideParameterField =
  | 'sampleRateHz'
  | 'triggerThresholdKpa';

export type PistonOscillationGuideParameterStatus =
  | 'empty'
  | 'editing'
  | 'invalid'
  | 'valid';

export type PistonOscillationGuideFeedbackCode =
  | 'sampleRateInvalid'
  | 'triggerThresholdInvalid'
  | null;

export type PistonOscillationGuideHeightResetReason =
  | 'supportLost'
  | 'wrongHeightConfirmation';

export interface PistonOscillationGuideHeightReset {
  reason: PistonOscillationGuideHeightResetReason;
  phase: 'resetting' | 'explaining';
  targetHeightMm: (typeof PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM)[number];
  startedHeightMm: number;
}

export type PistonOscillationGuideCurvePoint = PistonOscillationRawSample;
export type PistonOscillationGuideSavedMeasurement =
  PistonOscillationRawMeasurementRecord;

export interface PistonOscillationGuideSession {
  schemaVersion: typeof PISTON_OSCILLATION_GUIDE_SESSION_SCHEMA_VERSION;
  status: 'idle' | 'active' | 'completed';
  completionExited: boolean;
  startedAtMs: number | null;
  updatedAtMs: number | null;
  measurementIndex: PistonOscillationGuideMeasurementIndex;
  step: PistonOscillationGuideStep;
  powerOn: boolean;
  parameterDrafts: Record<PistonOscillationGuideParameterField, string>;
  parameterStatus: Record<
    PistonOscillationGuideParameterField,
    PistonOscillationGuideParameterStatus
  >;
  parametersLocked: boolean;
  feedbackCode: PistonOscillationGuideFeedbackCode;
  heightReset: PistonOscillationGuideHeightReset | null;
  acquisitionCandidate: PistonOscillationGuideSavedMeasurement | null;
  savedMeasurements: PistonOscillationGuideSavedMeasurement[];
  dataProcessing: PistonOscillationDataProcessingSession | null;
}

interface PistonOscillationGuideTimedEvent {
  nowMs: number;
}

export type PistonOscillationGuideEvent =
  | ({ type: 'start' } & PistonOscillationGuideTimedEvent)
  | ({ type: 'reopenCompletedSession' } & PistonOscillationGuideTimedEvent)
  | ({ type: 'exitSession' } & PistonOscillationGuideTimedEvent)
  | ({ type: 'resetSession' } & PistonOscillationGuideTimedEvent)
  | ({ type: 'setPower'; powerOn: boolean } & PistonOscillationGuideTimedEvent)
  | ({
      type: 'editParameter';
      field: PistonOscillationGuideParameterField;
      value: string;
    } & PistonOscillationGuideTimedEvent)
  | ({
      type: 'commitParameter';
      field: PistonOscillationGuideParameterField;
    } & PistonOscillationGuideTimedEvent)
  | ({
      type: 'confirmHeight';
      heightMm: number;
      leftHandSupporting: boolean;
      rightHandReleased: boolean;
    } & PistonOscillationGuideTimedEvent)
  | ({ type: 'lockScrew' } & PistonOscillationGuideTimedEvent)
  | ({ type: 'disconnectHose' } & PistonOscillationGuideTimedEvent)
  | ({ type: 'reconnectHose' } & PistonOscillationGuideTimedEvent)
  | ({ type: 'loosenScrew' } & PistonOscillationGuideTimedEvent)
  | ({ type: 'baselineStabilized' } & PistonOscillationGuideTimedEvent)
  | ({ type: 'startAcquisition' } & PistonOscillationGuideTimedEvent)
  | ({ type: 'releasePiston'; bothHandsReleased: boolean } & PistonOscillationGuideTimedEvent)
  | ({
      type: 'updateRecording';
      recordedDurationS: number;
      samples: PistonOscillationGuideCurvePoint[];
      candidate?: PistonOscillationGuideSavedMeasurement;
    } & PistonOscillationGuideTimedEvent)
  | ({ type: 'pauseRecording' } & PistonOscillationGuideTimedEvent)
  | ({ type: 'discardAcquisitionAttempt' } & PistonOscillationGuideTimedEvent)
  | ({ type: 'curveFreezeComplete' } & PistonOscillationGuideTimedEvent)
  | ({ type: 'saveMeasurement' } & PistonOscillationGuideTimedEvent)
  | ({
      type: 'beginHeightReset';
      reason: PistonOscillationGuideHeightResetReason;
      heightMm: number;
    } & PistonOscillationGuideTimedEvent)
  | ({ type: 'heightResetComplete' } & PistonOscillationGuideTimedEvent)
  | ({ type: 'dismissHeightReset' } & PistonOscillationGuideTimedEvent)
  | ({ type: 'clearPeriodSelection'; runIndex: number } & PistonOscillationGuideTimedEvent)
  | ({
      type: 'selectPeriodRange';
      runIndex: number;
      rangeStartTimeS: number;
      rangeEndTimeS: number;
    } & PistonOscillationGuideTimedEvent)
  | ({
      type: 'editPeriodAnswer';
      runIndex: number;
      field: PistonOscillationPeriodAnswerField;
      value: string;
    } & PistonOscillationGuideTimedEvent)
  | ({ type: 'submitPeriodEndpoints'; runIndex: number } & PistonOscillationGuideTimedEvent)
  | ({
      type: 'continuePeriodAnswer';
      runIndex: number;
      field: PistonOscillationPeriodAnswerField;
    } & PistonOscillationGuideTimedEvent)
  | ({
      type: 'revealPeriodAnswer';
      runIndex: number;
      field: PistonOscillationPeriodAnswerField;
    } & PistonOscillationGuideTimedEvent)
  | ({ type: 'submitPeriod'; runIndex: number } & PistonOscillationGuideTimedEvent)
  | ({ type: 'advancePeriodRun' } & PistonOscillationGuideTimedEvent)
  | ({ type: 'toggleFitRun'; runIndex: number } & PistonOscillationGuideTimedEvent)
  | ({ type: 'submitLinearFit' } & PistonOscillationGuideTimedEvent)
  | ({
      type: 'editCalculationAnswer';
      field: PistonOscillationCalculationFieldId;
      value: string;
    } & PistonOscillationGuideTimedEvent)
  | ({
      type: 'submitCalculationField';
      field: PistonOscillationCalculationFieldId;
    } & PistonOscillationGuideTimedEvent)
  | ({
      type: 'continueCalculationAnswer';
      field: PistonOscillationCalculationFieldId;
    } & PistonOscillationGuideTimedEvent)
  | ({
      type: 'revealCalculationAnswer';
      field: PistonOscillationCalculationFieldId;
    } & PistonOscillationGuideTimedEvent)
  | ({ type: 'completeCalculation' } & PistonOscillationGuideTimedEvent)
  | ({ type: 'acknowledgeCompletion' } & PistonOscillationGuideTimedEvent);

export type PistonOscillationGuideAction =
  | 'togglePower'
  | 'editParameters'
  | 'platformGrab'
  | 'platformMove'
  | 'platformRelease'
  | 'leftHandPress'
  | 'leftHandRelease'
  | 'confirmHeight'
  | 'tightenScrew'
  | 'loosenScrew'
  | 'disconnectHose'
  | 'reconnectHose'
  | 'startAcquisition'
  | 'pauseAcquisition'
  | 'saveMeasurement';

export interface PistonOscillationGuideActionContext {
  heightMm?: number;
  leftHandSupporting?: boolean;
  rightHandSupporting?: boolean;
}

export type PistonOscillationGuideGuardReason =
  | 'allowed'
  | 'sessionNotActive'
  | 'sessionNotPaused'
  | 'wrongStep'
  | 'powerRequired'
  | 'parametersLocked'
  | 'wrongTargetHeight'
  | 'leftHandRequired'
  | 'rightHandMustBeReleased'
  | 'bothHandsRequired'
  | 'heightResetInProgress'
  | 'heightResetMissing'
  | 'invalidPlatformHeight'
  | 'invalidRecordingSnapshot'
  | 'recordingTooShort'
  | 'candidateMissing'
  | 'candidateMismatch'
  | 'dataProcessingMissing'
  | 'invalidProcessingInput';

export interface PistonOscillationGuideGuardResult {
  allowed: boolean;
  reason: PistonOscillationGuideGuardReason;
}

const ALLOWED_GUARD: PistonOscillationGuideGuardResult = {
  allowed: true,
  reason: 'allowed',
};

const rejectGuard = (
  reason: Exclude<PistonOscillationGuideGuardReason, 'allowed'>,
): PistonOscillationGuideGuardResult => ({ allowed: false, reason });

const createEmptyParameterDrafts = (): PistonOscillationGuideSession['parameterDrafts'] => ({
  sampleRateHz: '',
  triggerThresholdKpa: '',
});

const createEmptyParameterStatus = (): PistonOscillationGuideSession['parameterStatus'] => ({
  sampleRateHz: 'empty',
  triggerThresholdKpa: 'empty',
});

export const createDefaultPistonOscillationGuideSession = ():
PistonOscillationGuideSession => ({
  schemaVersion: PISTON_OSCILLATION_GUIDE_SESSION_SCHEMA_VERSION,
  status: 'idle',
  completionExited: false,
  startedAtMs: null,
  updatedAtMs: null,
  measurementIndex: 0,
  step: 'powerOn',
  powerOn: false,
  parameterDrafts: createEmptyParameterDrafts(),
  parameterStatus: createEmptyParameterStatus(),
  parametersLocked: false,
  feedbackCode: null,
  heightReset: null,
  acquisitionCandidate: null,
  savedMeasurements: [],
  dataProcessing: null,
});

const createFreshActiveSession = (nowMs: number): PistonOscillationGuideSession => ({
  ...createDefaultPistonOscillationGuideSession(),
  status: 'active',
  startedAtMs: nowMs,
  updatedAtMs: nowMs,
});

const getExpectedParameterValue = (field: PistonOscillationGuideParameterField) => (
  field === 'sampleRateHz'
    ? PISTON_OSCILLATION_GUIDE_SAMPLE_RATE_HZ
    : PISTON_OSCILLATION_GUIDE_TRIGGER_THRESHOLD_KPA
);

const isParameterValueCorrect = (
  field: PistonOscillationGuideParameterField,
  value: string,
) => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  const numericValue = Number(trimmed);
  return Number.isFinite(numericValue) && numericValue === getExpectedParameterValue(field);
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const isFiniteNonNegativeNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value) && value >= 0
);

const isCurvePoint = (value: unknown): value is PistonOscillationGuideCurvePoint => {
  if (!isPlainRecord(value)) return false;
  return Number.isInteger(value.sampleIndex)
    && (value.sampleIndex as number) >= 0
    && isFiniteNonNegativeNumber(value.timeS)
    && typeof value.absolutePressureKpa === 'number'
    && Number.isFinite(value.absolutePressureKpa);
};

const isRecordingSnapshotValid = (
  recordedDurationS: number,
  samples: readonly PistonOscillationGuideCurvePoint[],
) => (
  isFiniteNonNegativeNumber(recordedDurationS)
  && samples.every(isCurvePoint)
  && samples.every((point, index) => (
    point.timeS <= recordedDurationS
    && point.sampleIndex === index
    && (index === 0 || point.timeS > samples[index - 1].timeS)
  ))
);

const isConfirmedHeightForTarget = (confirmedHeightMm: number, targetHeightMm: number) => (
  Number.isFinite(confirmedHeightMm)
  && Math.abs(confirmedHeightMm - targetHeightMm)
    <= PISTON_OSCILLATION_GUIDE_HEIGHT_CONFIRMATION_TOLERANCE_MM
);

const measurementMatchesCurrentRun = (
  session: PistonOscillationGuideSession,
  measurement: PistonOscillationGuideSavedMeasurement,
) => (
  measurement.measurementIndex === session.measurementIndex
  && measurement.targetHeightMm
    === PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM[session.measurementIndex]
  && isConfirmedHeightForTarget(
    measurement.confirmedHeightMm,
    PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM[session.measurementIndex],
  )
  && measurement.acquisitionSettings.sampleRateHz
    === PISTON_OSCILLATION_GUIDE_SAMPLE_RATE_HZ
  && measurement.acquisitionSettings.triggerThresholdKpa
    === PISTON_OSCILLATION_GUIDE_TRIGGER_THRESHOLD_KPA
);

export const getPistonOscillationGuideHeightAdjustmentStep = (
  measurementIndex: PistonOscillationGuideMeasurementIndex,
): Extract<PistonOscillationGuideStep, 'firstHeightAdjustment' | 'nextHeightAdjustment'> => (
  measurementIndex === 0 ? 'firstHeightAdjustment' : 'nextHeightAdjustment'
);

const isHeightAdjustmentStep = (
  step: PistonOscillationGuideStep,
): step is Extract<PistonOscillationGuideStep, 'firstHeightAdjustment' | 'nextHeightAdjustment'> => (
  step === 'firstHeightAdjustment' || step === 'nextHeightAdjustment'
);

const eventMatchesStep = (
  session: PistonOscillationGuideSession,
  event: PistonOscillationGuideEvent,
) => {
  switch (event.type) {
    case 'setPower':
      return (
        session.step === 'powerOn'
        && !session.powerOn
        && event.powerOn
      ) || (
        session.step === 'powerOff'
        && session.powerOn
        && !event.powerOn
      );
    case 'editParameter':
    case 'commitParameter':
      return session.step === 'parameterSetup';
    case 'confirmHeight':
      return isHeightAdjustmentStep(session.step);
    case 'lockScrew':
      return session.step === 'screwLock';
    case 'disconnectHose':
      return session.step === 'crossRunDisconnect';
    case 'reconnectHose':
      return session.step === 'hoseReconnect';
    case 'loosenScrew':
      return session.step === 'screwLoosen';
    case 'baselineStabilized':
      return session.step === 'baselineStabilizing'
        || session.step === 'crossRunStabilizing';
    case 'startAcquisition':
      return session.step === 'acquisitionReady';
    case 'releasePiston':
      return session.step === 'waitingTrigger';
    case 'updateRecording':
      return session.step === 'recording' || session.step === 'pauseAvailable';
    case 'pauseRecording':
      return session.step === 'recording' || session.step === 'pauseAvailable';
    case 'discardAcquisitionAttempt':
      return session.step === 'recording' || session.step === 'pauseAvailable';
    case 'curveFreezeComplete':
      return session.step === 'curveFrozen';
    case 'saveMeasurement':
      return session.step === 'awaitingSaveOrRedo';
    case 'beginHeightReset':
      return isHeightAdjustmentStep(session.step)
        || session.step === 'screwLock'
        || session.step === 'crossRunDisconnect';
    case 'heightResetComplete':
      return session.heightReset?.phase === 'resetting';
    case 'dismissHeightReset':
      return session.heightReset?.phase === 'explaining';
    case 'clearPeriodSelection':
    case 'selectPeriodRange':
    case 'editPeriodAnswer':
    case 'submitPeriodEndpoints':
    case 'continuePeriodAnswer':
    case 'revealPeriodAnswer':
    case 'submitPeriod':
    case 'advancePeriodRun':
      return session.step === 'periodProcessing';
    case 'toggleFitRun':
    case 'submitLinearFit':
    case 'editCalculationAnswer':
    case 'submitCalculationField':
    case 'continueCalculationAnswer':
    case 'revealCalculationAnswer':
    case 'completeCalculation':
      return session.step === 'calculationReady';
    case 'acknowledgeCompletion':
      return session.step === 'completionReview';
    default:
      return true;
  }
};

export const getPistonOscillationGuideActionGuard = (
  session: PistonOscillationGuideSession,
  action: PistonOscillationGuideAction,
  context: PistonOscillationGuideActionContext = {},
): PistonOscillationGuideGuardResult => {
  if (action === 'platformRelease' || action === 'leftHandRelease') {
    return ALLOWED_GUARD;
  }

  if (session.status !== 'active') return rejectGuard('sessionNotActive');

  if (session.heightReset !== null) return rejectGuard('heightResetInProgress');

  if (action === 'togglePower') {
    return (
      (session.step === 'powerOn' && !session.powerOn)
      || (session.step === 'powerOff' && session.powerOn)
    )
      ? ALLOWED_GUARD
      : rejectGuard('wrongStep');
  }

  if (!session.powerOn) return rejectGuard('powerRequired');

  if (action === 'confirmHeight') {
    if (!isHeightAdjustmentStep(session.step)) return rejectGuard('wrongStep');
    const targetHeightMm = PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM[session.measurementIndex];
    if (
      typeof context.heightMm !== 'number'
      || !Number.isFinite(context.heightMm)
      || !isConfirmedHeightForTarget(context.heightMm, targetHeightMm)
    ) return rejectGuard('wrongTargetHeight');
    if (!context.leftHandSupporting) return rejectGuard('leftHandRequired');
    if (context.rightHandSupporting) return rejectGuard('rightHandMustBeReleased');
    return ALLOWED_GUARD;
  }

  if (action === 'tightenScrew') {
    if (session.step !== 'screwLock') return rejectGuard('wrongStep');
    if (!context.leftHandSupporting) return rejectGuard('leftHandRequired');
    if (context.rightHandSupporting) return rejectGuard('rightHandMustBeReleased');
    return ALLOWED_GUARD;
  }

  if (action === 'disconnectHose') {
    if (session.step !== 'crossRunDisconnect') return rejectGuard('wrongStep');
    return context.leftHandSupporting
      ? ALLOWED_GUARD
      : rejectGuard('leftHandRequired');
  }

  switch (action) {
    case 'editParameters':
      return session.step === 'parameterSetup' && !session.parametersLocked
        ? ALLOWED_GUARD
        : rejectGuard('wrongStep');
    case 'platformGrab':
      return isHeightAdjustmentStep(session.step)
        || session.step === 'waitingTrigger'
        ? ALLOWED_GUARD
        : rejectGuard('wrongStep');
    case 'platformMove':
      if (isHeightAdjustmentStep(session.step)) return ALLOWED_GUARD;
      if (session.step !== 'waitingTrigger') return rejectGuard('wrongStep');
      return context.leftHandSupporting && context.rightHandSupporting
        ? ALLOWED_GUARD
        : rejectGuard('bothHandsRequired');
    case 'leftHandPress':
      return isHeightAdjustmentStep(session.step)
        || session.step === 'screwLock'
        || session.step === 'crossRunDisconnect'
        || session.step === 'waitingTrigger'
        ? ALLOWED_GUARD
        : rejectGuard('wrongStep');
    case 'loosenScrew':
      return session.step === 'screwLoosen'
        ? ALLOWED_GUARD
        : rejectGuard('wrongStep');
    case 'reconnectHose':
      return session.step === 'hoseReconnect'
        ? ALLOWED_GUARD
        : rejectGuard('wrongStep');
    case 'startAcquisition':
      return session.step === 'acquisitionReady'
        ? ALLOWED_GUARD
        : rejectGuard('wrongStep');
    case 'pauseAcquisition':
      return session.step === 'pauseAvailable'
        ? ALLOWED_GUARD
        : rejectGuard('wrongStep');
    case 'saveMeasurement':
      return session.step === 'awaitingSaveOrRedo'
        ? ALLOWED_GUARD
        : rejectGuard('wrongStep');
    default:
      return rejectGuard('wrongStep');
  }
};

export const getPistonOscillationGuideEventGuard = (
  session: PistonOscillationGuideSession,
  event: PistonOscillationGuideEvent,
): PistonOscillationGuideGuardResult => {
  switch (event.type) {
    case 'start':
    case 'reopenCompletedSession':
    case 'resetSession':
    case 'exitSession':
      return ALLOWED_GUARD;
    case 'setPower':
      if (session.status !== 'active') return rejectGuard('sessionNotActive');
      return eventMatchesStep(session, event)
        ? ALLOWED_GUARD
        : rejectGuard('wrongStep');
    case 'heightResetComplete':
      return session.status === 'active'
        && session.heightReset?.phase === 'resetting'
        ? ALLOWED_GUARD
        : session.heightReset === null
          ? rejectGuard('heightResetMissing')
          : rejectGuard('wrongStep');
    case 'dismissHeightReset':
      return session.status === 'active'
        && session.heightReset?.phase === 'explaining'
        ? ALLOWED_GUARD
        : session.heightReset === null
          ? rejectGuard('heightResetMissing')
          : rejectGuard('wrongStep');
    default:
      break;
  }

  if (session.status !== 'active') return rejectGuard('sessionNotActive');
  if (!eventMatchesStep(session, event)) return rejectGuard('wrongStep');

  if (
    !session.powerOn
    && event.type !== 'toggleFitRun'
    && event.type !== 'submitLinearFit'
    && event.type !== 'editCalculationAnswer'
    && event.type !== 'submitCalculationField'
    && event.type !== 'continueCalculationAnswer'
    && event.type !== 'revealCalculationAnswer'
    && event.type !== 'completeCalculation'
    && event.type !== 'acknowledgeCompletion'
  ) return rejectGuard('powerRequired');

  if (
    (event.type === 'editParameter' || event.type === 'commitParameter')
    && session.parametersLocked
  ) return rejectGuard('parametersLocked');

  if (
    event.type === 'confirmHeight'
    && !isConfirmedHeightForTarget(
      event.heightMm,
      PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM[session.measurementIndex],
    )
  ) return rejectGuard('wrongTargetHeight');

  if (event.type === 'confirmHeight' && !event.leftHandSupporting) {
    return rejectGuard('leftHandRequired');
  }

  if (event.type === 'confirmHeight' && !event.rightHandReleased) {
    return rejectGuard('rightHandMustBeReleased');
  }

  if (
    event.type === 'beginHeightReset'
    && (!Number.isFinite(event.heightMm) || event.heightMm < 0)
  ) return rejectGuard('invalidPlatformHeight');

  if (session.heightReset !== null) return rejectGuard('heightResetInProgress');

  if (
    event.type === 'clearPeriodSelection'
    || event.type === 'selectPeriodRange'
    || event.type === 'editPeriodAnswer'
    || event.type === 'submitPeriodEndpoints'
    || event.type === 'continuePeriodAnswer'
    || event.type === 'revealPeriodAnswer'
    || event.type === 'submitPeriod'
    || event.type === 'advancePeriodRun'
    || event.type === 'toggleFitRun'
    || event.type === 'submitLinearFit'
    || event.type === 'editCalculationAnswer'
    || event.type === 'submitCalculationField'
    || event.type === 'continueCalculationAnswer'
    || event.type === 'revealCalculationAnswer'
    || event.type === 'completeCalculation'
    || event.type === 'acknowledgeCompletion'
  ) {
    if (session.dataProcessing === null) return rejectGuard('dataProcessingMissing');
    if (
      'runIndex' in event
      && (
        !Number.isInteger(event.runIndex)
        || event.runIndex < 0
        || event.runIndex >= session.dataProcessing.runs.length
      )
    ) return rejectGuard('invalidProcessingInput');
    if (
      event.type === 'selectPeriodRange'
      && (
        !Number.isFinite(event.rangeStartTimeS)
        || !Number.isFinite(event.rangeEndTimeS)
      )
    ) return rejectGuard('invalidProcessingInput');
    if (
      (
        event.type === 'editCalculationAnswer'
        || event.type === 'submitCalculationField'
        || event.type === 'continueCalculationAnswer'
        || event.type === 'revealCalculationAnswer'
      )
      && event.field !== 'area'
      && event.field !== 'gamma'
      && event.field !== 'relativeError'
    ) return rejectGuard('invalidProcessingInput');
  }

  if (event.type === 'releasePiston' && !event.bothHandsReleased) {
    return rejectGuard('bothHandsRequired');
  }

  if (event.type === 'updateRecording') {
    const candidate = event.candidate ?? session.acquisitionCandidate;
    if (candidate === null) return rejectGuard('candidateMissing');
    if (!measurementMatchesCurrentRun(session, candidate)) {
      return rejectGuard('candidateMismatch');
    }
    if (!isRecordingSnapshotValid(event.recordedDurationS, event.samples)) {
      return rejectGuard('invalidRecordingSnapshot');
    }
    if (
      candidate.acquisitionSettings.recordedDurationS !== event.recordedDurationS
      || candidate.samples.length !== event.samples.length
    ) return rejectGuard('invalidRecordingSnapshot');
    if (
      session.acquisitionCandidate !== null
      && event.recordedDurationS
        < session.acquisitionCandidate.acquisitionSettings.recordedDurationS
    ) return rejectGuard('invalidRecordingSnapshot');
  }

  if (event.type === 'pauseRecording') {
    if (session.acquisitionCandidate === null) return rejectGuard('candidateMissing');
    if (!measurementMatchesCurrentRun(session, session.acquisitionCandidate)) {
      return rejectGuard('candidateMismatch');
    }
    if (
      session.acquisitionCandidate.acquisitionSettings.recordedDurationS
        < PISTON_OSCILLATION_GUIDE_MINIMUM_RECORDING_DURATION_S
      || session.acquisitionCandidate.samples.length < 2
    ) return rejectGuard('recordingTooShort');
  }

  if (event.type === 'saveMeasurement') {
    if (session.acquisitionCandidate === null) return rejectGuard('candidateMissing');
    if (!measurementMatchesCurrentRun(session, session.acquisitionCandidate)) {
      return rejectGuard('candidateMismatch');
    }
    if (
      session.acquisitionCandidate.acquisitionSettings.recordedDurationS
        < PISTON_OSCILLATION_GUIDE_MINIMUM_RECORDING_DURATION_S
      || session.acquisitionCandidate.samples.length < 2
    ) return rejectGuard('recordingTooShort');
  }

  return ALLOWED_GUARD;
};

const cloneCurvePoint = (
  point: PistonOscillationGuideCurvePoint,
): PistonOscillationGuideCurvePoint => ({ ...point });

const cloneMeasurement = (
  measurement: PistonOscillationGuideSavedMeasurement,
): PistonOscillationGuideSavedMeasurement => (
  clonePistonOscillationRawMeasurementRecord(measurement)
);

export const transitionPistonOscillationGuideSession = (
  session: PistonOscillationGuideSession,
  event: PistonOscillationGuideEvent,
): PistonOscillationGuideSession => {
  const guard = getPistonOscillationGuideEventGuard(session, event);
  if (!guard.allowed) return session;

  if (event.type === 'start' || event.type === 'resetSession') {
    return createFreshActiveSession(event.nowMs);
  }
  if (event.type === 'reopenCompletedSession') {
    if (
      session.status !== 'completed'
      || session.dataProcessing?.status !== 'completed'
    ) return session;
    return {
      ...session,
      completionExited: false,
      updatedAtMs: event.nowMs,
    };
  }
  if (event.type === 'exitSession') {
    if (
      session.status === 'completed'
      && session.dataProcessing?.status === 'completed'
    ) {
      return {
        ...session,
        completionExited: true,
        updatedAtMs: event.nowMs,
      };
    }
    return createDefaultPistonOscillationGuideSession();
  }
  if (event.type === 'setPower') {
    if (event.powerOn) {
      return {
        ...session,
        powerOn: true,
        step: session.step === 'powerOn' ? 'parameterSetup' : session.step,
        updatedAtMs: event.nowMs,
      };
    }
    return {
      ...session,
      powerOn: false,
      step: session.step === 'powerOff' ? 'calculationReady' : session.step,
      updatedAtMs: event.nowMs,
    };
  }
  if (event.type === 'editParameter') {
    return {
      ...session,
      updatedAtMs: event.nowMs,
      parameterDrafts: {
        ...session.parameterDrafts,
        [event.field]: event.value,
      },
      parameterStatus: {
        ...session.parameterStatus,
        [event.field]: event.value.trim().length === 0 ? 'empty' : 'editing',
      },
      feedbackCode: session.feedbackCode === `${event.field === 'sampleRateHz' ? 'sampleRate' : 'triggerThreshold'}Invalid`
        ? null
        : session.feedbackCode,
    };
  }

  if (event.type === 'commitParameter') {
    const valid = isParameterValueCorrect(event.field, session.parameterDrafts[event.field]);
    const parameterStatus = {
      ...session.parameterStatus,
      [event.field]: valid ? 'valid' as const : 'invalid' as const,
    };
    const parametersLocked = parameterStatus.sampleRateHz === 'valid'
      && parameterStatus.triggerThresholdKpa === 'valid';
    return {
      ...session,
      updatedAtMs: event.nowMs,
      parameterStatus,
      parametersLocked,
      feedbackCode: valid
        ? null
        : event.field === 'sampleRateHz'
          ? 'sampleRateInvalid'
          : 'triggerThresholdInvalid',
      step: parametersLocked ? 'firstHeightAdjustment' : session.step,
    };
  }

  const advance = (step: PistonOscillationGuideStep): PistonOscillationGuideSession => ({
    ...session,
    step,
    updatedAtMs: event.nowMs,
    feedbackCode: null,
    heightReset: null,
  });

  switch (event.type) {
    case 'confirmHeight':
      return advance('screwLock');
    case 'lockScrew':
      return advance('hoseReconnect');
    case 'disconnectHose':
      return advance('nextHeightAdjustment');
    case 'reconnectHose':
      return advance('screwLoosen');
    case 'loosenScrew':
      return advance('baselineStabilizing');
    case 'baselineStabilized':
      return advance(
        session.step === 'crossRunStabilizing'
          ? 'crossRunDisconnect'
          : 'acquisitionReady',
      );
    case 'startAcquisition':
      return advance('waitingTrigger');
    case 'releasePiston':
      return {
        ...advance('recording'),
        acquisitionCandidate: null,
      };
    case 'updateRecording': {
      const acquisitionCandidate = cloneMeasurement(
        event.candidate ?? session.acquisitionCandidate!,
      );
      return {
        ...session,
        step: event.recordedDurationS >= PISTON_OSCILLATION_GUIDE_MINIMUM_RECORDING_DURATION_S
          ? 'pauseAvailable'
          : 'recording',
        updatedAtMs: event.nowMs,
        acquisitionCandidate: {
          ...acquisitionCandidate,
          acquisitionSettings: {
            ...acquisitionCandidate.acquisitionSettings,
            recordedDurationS: event.recordedDurationS,
          },
          samples: event.samples.map(cloneCurvePoint),
        },
      };
    }
    case 'pauseRecording':
      return advance('curveFrozen');
    case 'discardAcquisitionAttempt':
      return {
        ...advance('waitingTrigger'),
        acquisitionCandidate: null,
      };
    case 'curveFreezeComplete':
      return advance('awaitingSaveOrRedo');
    case 'saveMeasurement': {
      const savedMeasurement = {
        ...cloneMeasurement(session.acquisitionCandidate!),
        capturedAtMs: event.nowMs,
      };
      const savedMeasurements = [
        ...session.savedMeasurements.filter(
          (measurement) => measurement.measurementIndex !== savedMeasurement.measurementIndex,
        ),
        savedMeasurement,
      ];
      const isFinalMeasurement = session.measurementIndex
        === PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM.length - 1;
      return {
        ...session,
        status: 'active',
        step: isFinalMeasurement ? 'periodProcessing' : 'crossRunDisconnect',
        measurementIndex: isFinalMeasurement
          ? session.measurementIndex
          : (session.measurementIndex + 1) as PistonOscillationGuideMeasurementIndex,
        updatedAtMs: event.nowMs,
        acquisitionCandidate: null,
        savedMeasurements,
        dataProcessing: isFinalMeasurement
          ? createPistonOscillationDataProcessingSession(savedMeasurements, event.nowMs)
          : session.dataProcessing,
      };
    }
    case 'clearPeriodSelection':
      return {
        ...session,
        updatedAtMs: event.nowMs,
        dataProcessing: clearPistonOscillationPeriodSelection(
          session.dataProcessing!,
          event.runIndex,
          event.nowMs,
        ),
      };
    case 'selectPeriodRange':
      return {
        ...session,
        updatedAtMs: event.nowMs,
        dataProcessing: selectPistonOscillationPeriodRange(
          session.dataProcessing!,
          session.savedMeasurements,
          event.runIndex,
          event.rangeStartTimeS,
          event.rangeEndTimeS,
          PISTON_OSCILLATION_GUIDED_MINIMUM_PERIOD_COUNT,
          event.nowMs,
        ),
      };
    case 'editPeriodAnswer':
      return {
        ...session,
        updatedAtMs: event.nowMs,
        dataProcessing: updatePistonOscillationPeriodAnswerDraft(
          session.dataProcessing!,
          event.runIndex,
          event.field,
          event.value,
          event.nowMs,
        ),
      };
    case 'submitPeriodEndpoints':
      return {
        ...session,
        updatedAtMs: event.nowMs,
        dataProcessing: submitPistonOscillationPeriodEndpoints(
          session.dataProcessing!,
          event.runIndex,
          event.nowMs,
        ),
      };
    case 'continuePeriodAnswer':
      return {
        ...session,
        updatedAtMs: event.nowMs,
        dataProcessing: continuePistonOscillationPeriodAnswer(
          session.dataProcessing!,
          event.runIndex,
          event.field,
          event.nowMs,
        ),
      };
    case 'revealPeriodAnswer':
      return {
        ...session,
        updatedAtMs: event.nowMs,
        dataProcessing: revealPistonOscillationPeriodAnswer(
          session.dataProcessing!,
          event.runIndex,
          event.field,
          event.nowMs,
        ),
      };
    case 'submitPeriod':
      return {
        ...session,
        updatedAtMs: event.nowMs,
        dataProcessing: submitPistonOscillationPeriod(
          session.dataProcessing!,
          event.runIndex,
          event.nowMs,
        ),
      };
    case 'advancePeriodRun': {
      const dataProcessing = advancePistonOscillationPeriodRun(
        session.dataProcessing!,
        event.nowMs,
        session.savedMeasurements,
      );
      return {
        ...session,
        step: dataProcessing.status === 'calculation-ready'
          ? 'powerOff'
          : 'periodProcessing',
        updatedAtMs: event.nowMs,
        dataProcessing,
      };
    }
    case 'toggleFitRun':
      return {
        ...session,
        updatedAtMs: event.nowMs,
        dataProcessing: togglePistonOscillationFitRun(
          session.dataProcessing!,
          event.runIndex,
          event.nowMs,
        ),
      };
    case 'submitLinearFit':
      return {
        ...session,
        updatedAtMs: event.nowMs,
        dataProcessing: submitPistonOscillationLinearFit(
          session.dataProcessing!,
          event.nowMs,
          { requireAllRuns: true },
        ),
      };
    case 'editCalculationAnswer':
      return {
        ...session,
        updatedAtMs: event.nowMs,
        dataProcessing: updatePistonOscillationCalculationDraft(
          session.dataProcessing!,
          event.field,
          event.value,
          event.nowMs,
        ),
      };
    case 'submitCalculationField':
      return {
        ...session,
        updatedAtMs: event.nowMs,
        dataProcessing: submitPistonOscillationCalculationField(
          session.dataProcessing!,
          event.field,
          event.nowMs,
        ),
      };
    case 'continueCalculationAnswer':
      return {
        ...session,
        updatedAtMs: event.nowMs,
        dataProcessing: continuePistonOscillationCalculationAnswer(
          session.dataProcessing!,
          event.field,
          event.nowMs,
        ),
      };
    case 'revealCalculationAnswer':
      return {
        ...session,
        updatedAtMs: event.nowMs,
        dataProcessing: revealPistonOscillationCalculationAnswer(
          session.dataProcessing!,
          event.field,
          event.nowMs,
        ),
      };
    case 'completeCalculation': {
      const dataProcessing = completePistonOscillationCalculation(
        session.dataProcessing!,
        event.nowMs,
      );
      const completed = dataProcessing.status === 'completed';
      return {
        ...session,
        status: session.status,
        step: completed ? 'completionReview' : session.step,
        updatedAtMs: event.nowMs,
        dataProcessing,
      };
    }
    case 'acknowledgeCompletion':
      if (session.dataProcessing?.status !== 'completed') return session;
      return {
        ...session,
        status: 'completed',
        completionExited: false,
        step: 'completed',
        updatedAtMs: event.nowMs,
      };
    case 'beginHeightReset': {
      const targetHeightMm = PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM[session.measurementIndex];
      return {
        ...session,
        step: getPistonOscillationGuideHeightAdjustmentStep(session.measurementIndex),
        updatedAtMs: event.nowMs,
        feedbackCode: null,
        heightReset: {
          reason: event.reason,
          phase: 'resetting',
          targetHeightMm,
          startedHeightMm: event.heightMm,
        },
      };
    }
    case 'heightResetComplete':
      return {
        ...session,
        updatedAtMs: event.nowMs,
        heightReset: {
          ...session.heightReset!,
          phase: 'explaining',
        },
      };
    case 'dismissHeightReset':
      return {
        ...session,
        updatedAtMs: event.nowMs,
        heightReset: null,
      };
    default:
      return session;
  }
};

const isMeasurementIndex = (value: unknown): value is PistonOscillationGuideMeasurementIndex => (
  value === 0 || value === 1 || value === 2
);

const isParameterStatus = (value: unknown): value is PistonOscillationGuideParameterStatus => (
  value === 'empty' || value === 'editing' || value === 'invalid' || value === 'valid'
);

const GUIDE_STEPS: readonly PistonOscillationGuideStep[] = [
  'powerOn',
  'parameterSetup',
  'firstHeightAdjustment',
  'screwLock',
  'hoseReconnect',
  'screwLoosen',
  'baselineStabilizing',
  'acquisitionReady',
  'waitingTrigger',
  'recording',
  'pauseAvailable',
  'curveFrozen',
  'awaitingSaveOrRedo',
  'crossRunStabilizing',
  'crossRunDisconnect',
  'nextHeightAdjustment',
  'periodProcessing',
  'powerOff',
  'calculationReady',
  'completionReview',
  'completed',
];

const normalizeMeasurement = (
  value: unknown,
): PistonOscillationGuideSavedMeasurement | null => {
  if (!isPlainRecord(value) || !isMeasurementIndex(value.measurementIndex)) return null;
  const targetHeightMm = PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM[value.measurementIndex];
  const normalized = normalizePistonOscillationRawMeasurementRecord(
    value,
    value.measurementIndex,
  );
  if (
    !normalized
    || normalized.targetHeightMm !== targetHeightMm
    || !isConfirmedHeightForTarget(normalized.confirmedHeightMm, targetHeightMm)
  ) return null;
  return normalized;
};

const normalizeHeightReset = (
  value: unknown,
  measurementIndex: PistonOscillationGuideMeasurementIndex,
): PistonOscillationGuideHeightReset | null => {
  if (!isPlainRecord(value)) return null;
  const reason = value.reason === 'supportLost'
    || value.reason === 'wrongHeightConfirmation'
    ? value.reason
    : null;
  if (reason === null) return null;
  const phase = value.phase === 'resetting' || value.phase === 'explaining'
    ? value.phase
    : null;
  if (phase === null) return null;
  const targetHeightMm = PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM[measurementIndex];
  if (
    value.targetHeightMm !== targetHeightMm
    || !isFiniteNonNegativeNumber(value.startedHeightMm)
  ) return null;
  return {
    reason,
    phase,
    targetHeightMm,
    startedHeightMm: value.startedHeightMm,
  };
};

export const normalizePistonOscillationGuideSession = (
  value: unknown,
): PistonOscillationGuideSession => {
  const fallback = createDefaultPistonOscillationGuideSession();
  if (!isPlainRecord(value)) return fallback;
  const drafts = isPlainRecord(value.parameterDrafts) ? value.parameterDrafts : null;
  const parameterStatus = isPlainRecord(value.parameterStatus) ? value.parameterStatus : null;
  const persistedStatus = value.status === 'active' || value.status === 'paused'
    ? 'active'
    : value.status === 'completed'
      ? 'completed'
      : 'idle';
  const normalizedMeasurementIndex = isMeasurementIndex(value.measurementIndex)
    ? value.measurementIndex
    : 0;
  const normalizedStep = GUIDE_STEPS.includes(value.step as PistonOscillationGuideStep)
    ? value.step as PistonOscillationGuideStep
    : persistedStatus === 'active'
        && normalizedMeasurementIndex > 0
      ? 'crossRunDisconnect'
      : fallback.step;
  const sampleRateStatus = isParameterStatus(parameterStatus?.sampleRateHz)
    ? parameterStatus.sampleRateHz
    : fallback.parameterStatus.sampleRateHz;
  const triggerThresholdStatus = isParameterStatus(parameterStatus?.triggerThresholdKpa)
    ? parameterStatus.triggerThresholdKpa
    : fallback.parameterStatus.triggerThresholdKpa;
  const parametersLocked = value.parametersLocked === true
    && sampleRateStatus === 'valid'
    && triggerThresholdStatus === 'valid';
  const acquisitionCandidate = normalizeMeasurement(value.acquisitionCandidate);
  const heightReset = normalizeHeightReset(
    value.heightReset,
    normalizedMeasurementIndex,
  );
  const savedMeasurements = Array.isArray(value.savedMeasurements)
    ? value.savedMeasurements
      .map(normalizeMeasurement)
      .filter((measurement): measurement is PistonOscillationGuideSavedMeasurement => (
        measurement !== null
      ))
      .filter((measurement, index, measurements) => (
        measurements.findIndex(
          (candidate) => candidate.measurementIndex === measurement.measurementIndex,
        ) === index
      ))
    : [];
  const allGuideMeasurementsSaved = PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM.every(
    (_, measurementIndex) => savedMeasurements.some((measurement) => (
      measurement.measurementIndex === measurementIndex
    )),
  );
  const dataProcessing = allGuideMeasurementsSaved
    ? normalizePistonOscillationDataProcessingSession(
        value.dataProcessing,
        savedMeasurements,
        typeof value.updatedAtMs === 'number' && Number.isFinite(value.updatedAtMs)
          ? value.updatedAtMs
          : Date.now(),
      )
    : null;
  const guideCompletionAcknowledged = persistedStatus === 'completed'
    && dataProcessing?.status === 'completed';
  const normalizedStatus = guideCompletionAcknowledged
    ? 'completed' as const
    : allGuideMeasurementsSaved
      ? 'active' as const
      : persistedStatus === 'completed'
        ? 'active' as const
        : persistedStatus;
  const normalizedPowerOn = value.powerOn === true;
  const processingStep = dataProcessing?.status === 'completed'
    ? guideCompletionAcknowledged
      ? 'completed' as const
      : 'completionReview' as const
    : dataProcessing?.status === 'calculation-ready'
      ? normalizedStep === 'powerOff' || value.schemaVersion !== PISTON_OSCILLATION_GUIDE_SESSION_SCHEMA_VERSION
        ? 'powerOff' as const
        : 'calculationReady' as const
      : dataProcessing
        ? 'periodProcessing' as const
        : null;
  return {
    ...fallback,
    status: normalizedStatus,
    completionExited: normalizedStatus === 'completed'
      && dataProcessing?.status === 'completed'
      && value.completionExited === true,
    startedAtMs: typeof value.startedAtMs === 'number' && Number.isFinite(value.startedAtMs)
      ? value.startedAtMs
      : null,
    updatedAtMs: typeof value.updatedAtMs === 'number' && Number.isFinite(value.updatedAtMs)
      ? value.updatedAtMs
      : null,
    measurementIndex: normalizedMeasurementIndex,
    step: processingStep ?? (
      parametersLocked && normalizedStep === 'parameterSetup'
        ? 'firstHeightAdjustment'
        : normalizedStep
    ),
    powerOn: normalizedPowerOn,
    parameterDrafts: {
      sampleRateHz: typeof drafts?.sampleRateHz === 'string' ? drafts.sampleRateHz : '',
      triggerThresholdKpa: typeof drafts?.triggerThresholdKpa === 'string'
        ? drafts.triggerThresholdKpa
        : '',
    },
    parameterStatus: {
      sampleRateHz: sampleRateStatus,
      triggerThresholdKpa: triggerThresholdStatus,
    },
    parametersLocked,
    feedbackCode: value.feedbackCode === 'sampleRateInvalid'
      || value.feedbackCode === 'triggerThresholdInvalid'
      ? value.feedbackCode
      : null,
    heightReset,
    acquisitionCandidate,
    savedMeasurements,
    dataProcessing,
  };
};
