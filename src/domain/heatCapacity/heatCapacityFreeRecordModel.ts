import {
  type HeatCapacityFreeCalibrationState,
} from './heatCapacityFreeCalibrationModel.ts';
import {
  type HeatCapacityFreePhysicsState,
} from './heatCapacityFreePhysicsEngine.ts';
import {
  calculateFreeHeatCapacityTrialSignals,
  getHeatCapacityFreePublicZero,
  type HeatCapacityFreeRecordInput,
  type HeatCapacityFreeRecordRejectReason,
  type HeatCapacityFreeTrialCalculationOptions,
  type HeatCapacityFreeTrial,
  normalizeHeatCapacityFreeRecordInput,
} from './heatCapacityFreeTrialModel.ts';
import {
  type getFreeSensorDisplay,
} from './heatCapacityFreeSensorModel.ts';

export type {
  HeatCapacityFreeRecordInput,
  HeatCapacityFreeRecordRejectReason,
  HeatCapacityFreeTrial,
};

export type HeatCapacityFreeRecordEvaluation =
  | { ready: true; reason: 'ready' }
  | { ready: false; reason: HeatCapacityFreeRecordRejectReason };

export interface HeatCapacityFreeRecordConfig {
  pressureStableSlopeMvPerS: number;
  temperatureStableSlopeMvPerS: number;
  temperatureAmbientToleranceMv: number;
  u0ZeroToleranceMv: number;
  minimumUsefulU1CorrectedMv: number;
  overVentedMinimumU2CorrectedMv: number;
  pressureDangerMv: number;
}

export interface HeatCapacityFreeRecordResult {
  accepted: boolean;
  reason: 'accepted' | HeatCapacityFreeRecordRejectReason;
  trial: HeatCapacityFreeTrial;
}

type HeatCapacityFreeSensorDisplay = ReturnType<typeof getFreeSensorDisplay>;

const createEvaluation = (
  reason: 'ready' | HeatCapacityFreeRecordRejectReason,
): HeatCapacityFreeRecordEvaluation => (
  reason === 'ready'
    ? { ready: true, reason }
    : { ready: false, reason }
);

const isStopcockCurrentlyOpen = (physics: HeatCapacityFreePhysicsState) => (
  physics.lastStopcockOpenedAtS !== null &&
  (
    physics.lastStopcockClosedAtS === null ||
    physics.lastStopcockOpenedAtS >= physics.lastStopcockClosedAtS
  )
);

const getLatestZeroEventId = (calibration: HeatCapacityFreeCalibrationState) => (
  calibration.zeroEvents[calibration.zeroEvents.length - 1]?.id ?? null
);

const recordHasCurrentCalibration = (
  record: HeatCapacityFreeTrial['u0'] | HeatCapacityFreeTrial['u1'],
  calibration: HeatCapacityFreeCalibrationState,
) => {
  if (!record) return true;
  if (record.calibrationVersion !== calibration.calibrationVersion) return false;
  const latestZeroEventId = getLatestZeroEventId(calibration);
  return latestZeroEventId === null
    ? record.zeroEventId === '' || record.zeroEventId === `free-unzeroed-${calibration.calibrationVersion}`
    : record.zeroEventId === latestZeroEventId;
};

export const evaluateFreeU0Record = (
  trial: HeatCapacityFreeTrial,
  calibration: HeatCapacityFreeCalibrationState,
  display: HeatCapacityFreeSensorDisplay,
  physics: HeatCapacityFreePhysicsState,
  config: HeatCapacityFreeRecordConfig,
): HeatCapacityFreeRecordEvaluation => {
  const latestZeroEventId = getLatestZeroEventId(calibration);
  if (trial.u0) {
    return createEvaluation('invalid-sequence');
  }
  if (
    latestZeroEventId === null ||
    !isStopcockCurrentlyOpen(physics) ||
    Math.abs(display.displayPressureMv) > config.u0ZeroToleranceMv
  ) {
    return createEvaluation('zero-not-ready');
  }
  if (Math.abs(display.pressureSlopeMvPerS) > config.pressureStableSlopeMvPerS) {
    return createEvaluation('unstable-pressure');
  }
  if (Math.abs(display.temperatureSlopeMvPerS) > config.temperatureStableSlopeMvPerS) {
    return createEvaluation('unstable-temperature');
  }
  return createEvaluation('ready');
};

export const evaluateFreeU1Record = (
  trial: HeatCapacityFreeTrial,
  calibration: HeatCapacityFreeCalibrationState,
  display: HeatCapacityFreeSensorDisplay,
  physics: HeatCapacityFreePhysicsState,
  config: HeatCapacityFreeRecordConfig,
): HeatCapacityFreeRecordEvaluation => {
  void display;
  void config;
  if (trial.u1) {
    return createEvaluation('invalid-sequence');
  }
  if (!recordHasCurrentCalibration(trial.u0, calibration)) {
    return createEvaluation('calibration-changed');
  }
  if (physics.pumpStrokeCount <= 0) {
    return createEvaluation('invalid-sequence');
  }
  return createEvaluation('ready');
};

export const evaluateFreeU2Record = (
  trial: HeatCapacityFreeTrial,
  calibration: HeatCapacityFreeCalibrationState,
  display: HeatCapacityFreeSensorDisplay,
  physics: HeatCapacityFreePhysicsState,
  config: HeatCapacityFreeRecordConfig,
): HeatCapacityFreeRecordEvaluation => {
  if (!trial.u1 || trial.u2) {
    return createEvaluation('invalid-sequence');
  }
  if (!recordHasCurrentCalibration(trial.u1, calibration)) {
    return createEvaluation('calibration-changed');
  }
  if (!physics.releaseStarted || !physics.releaseReference) {
    return createEvaluation('release-not-started');
  }
  const zero = getHeatCapacityFreePublicZero(trial);
  if (!zero) return createEvaluation('zero-not-ready');
  const correctedU2Mv = display.displayPressureMv - zero.displayPressureMv;
  if (correctedU2Mv < config.overVentedMinimumU2CorrectedMv) {
    return createEvaluation('over-vented');
  }
  return createEvaluation('ready');
};

const rejectRecord = (
  trial: HeatCapacityFreeTrial,
  reason: HeatCapacityFreeRecordRejectReason,
): HeatCapacityFreeRecordResult => ({
  accepted: false,
  reason,
  trial: {
    ...trial,
    blockedReason: reason,
  },
});

const inputMatchesCalibrationRecord = (
  trial: HeatCapacityFreeTrial,
  input: HeatCapacityFreeRecordInput,
) => (
  trial.u0 === null || (
    input.calibrationVersion === trial.u0.calibrationVersion &&
    input.zeroEventId === trial.u0.zeroEventId
  )
);

export const recordFreeU0 = (
  trial: HeatCapacityFreeTrial,
  input: HeatCapacityFreeRecordInput,
): HeatCapacityFreeRecordResult => {
  if (!input.zeroEventId) {
    return rejectRecord(trial, 'zero-not-ready');
  }
  return {
    accepted: true,
    reason: 'accepted',
    trial: {
      ...trial,
      u0: normalizeHeatCapacityFreeRecordInput(input),
      u1: null,
      u2: null,
      blockedReason: null,
      correctedSignals: null,
      configSnapshot: null,
      standardReferenceSnapshot: null,
      completedAtMs: null,
    },
  };
};

export const recordFreeU1 = (
  trial: HeatCapacityFreeTrial,
  input: HeatCapacityFreeRecordInput,
): HeatCapacityFreeRecordResult => {
  if (!inputMatchesCalibrationRecord(trial, input)) {
    return rejectRecord(trial, 'calibration-changed');
  }
  return {
    accepted: true,
    reason: 'accepted',
    trial: {
      ...trial,
      u1: normalizeHeatCapacityFreeRecordInput(input),
      u2: null,
      blockedReason: null,
      correctedSignals: null,
      configSnapshot: null,
      standardReferenceSnapshot: null,
      completedAtMs: null,
    },
  };
};

export const recordFreeU2 = (
  trial: HeatCapacityFreeTrial,
  input: HeatCapacityFreeRecordInput,
  options: HeatCapacityFreeTrialCalculationOptions = {},
): HeatCapacityFreeRecordResult => {
  if (!trial.u1) {
    return rejectRecord(trial, 'invalid-sequence');
  }
  if (
    !inputMatchesCalibrationRecord(trial, input) ||
    input.calibrationVersion !== trial.u1.calibrationVersion ||
    input.zeroEventId !== trial.u1.zeroEventId
  ) {
    return rejectRecord(trial, 'calibration-changed');
  }
  const nextTrial: HeatCapacityFreeTrial = {
    ...trial,
    u2: normalizeHeatCapacityFreeRecordInput(input),
    blockedReason: null,
    correctedSignals: null,
    configSnapshot: null,
    standardReferenceSnapshot: null,
    completedAtMs: null,
  };
  const correctedSignals = calculateFreeHeatCapacityTrialSignals(nextTrial, options);
  return {
    accepted: true,
    reason: 'accepted',
    trial: {
      ...nextTrial,
      correctedSignals,
    },
  };
};
