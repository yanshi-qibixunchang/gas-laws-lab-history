import {
  getFreeCorrectedSignals,
  type HeatCapacityFreeCalibrationState,
  type HeatCapacityFreeGammaCalculationOptions,
} from './heatCapacityFreeCalibrationModel.ts';
import type {
  HeatCapacityRuntimePhase,
} from './heatCapacityProcessTypes.ts';
import {
  HEAT_CAPACITY_FREE_CALCULATION_VERSION,
  type HeatCapacityFreeConfigSnapshot,
} from './heatCapacityFreeTraceModel.ts';
import {
  truncateHeatCapacitySignalMv,
} from './heatCapacitySignalDisplayModel.ts';

export type HeatCapacityFreeRecordRejectReason =
  | 'zero-not-ready'
  | 'missing-u0'
  | 'calibration-changed'
  | 'unstable-pressure'
  | 'unstable-temperature'
  | 'insufficient-u1'
  | 'release-not-started'
  | 'over-vented'
  | 'pressure-danger'
  | 'invalid-sequence';

export interface HeatCapacityFreeRecordInput {
  atS: number;
  displayPressureMv: number;
  displayTemperatureMv: number;
  calibrationVersion: number;
  zeroEventId: string;
  source?: 'user';
  phaseAtRecord?: HeatCapacityRuntimePhase | null;
  traceTrialId?: string | null;
  traceBranchId?: string | null;
  traceSampleId?: string | null;
  eventId?: string | null;
}

export interface HeatCapacityFreeRecordTraceReference {
  source: 'user';
  phaseAtRecord: HeatCapacityRuntimePhase | null;
  traceTrialId: string | null;
  traceBranchId: string | null;
  traceSampleId: string | null;
  eventId: string | null;
}

export type HeatCapacityFreeRecord = HeatCapacityFreeRecordInput & HeatCapacityFreeRecordTraceReference;

export interface HeatCapacityFreeCorrectedSignals {
  calculationVersion: typeof HEAT_CAPACITY_FREE_CALCULATION_VERSION;
  atmosphericPressureKPa: number;
  pressureSensitivityMvPerKPa: number;
  U0DisplayMv: number;
  U1DisplayMv: number;
  U2DisplayMv: number;
  U1CorrectedMv: number;
  U2CorrectedMv: number;
  gamma: number;
}

export interface HeatCapacityFreeTrial {
  id: string;
  source: 'free';
  traceTrialId: string | null;
  branchCount: number;
  automaticU0: HeatCapacityFreeCalibrationState['automaticU0'];
  u0: HeatCapacityFreeRecord | null;
  u1: HeatCapacityFreeRecord | null;
  u2: HeatCapacityFreeRecord | null;
  blockedReason: HeatCapacityFreeRecordRejectReason | null;
  correctedSignals: HeatCapacityFreeCorrectedSignals | null;
  configSnapshot: HeatCapacityFreeConfigSnapshot | null;
  completedAtMs: number | null;
}

export interface HeatCapacityFreeProcessingTrialResult {
  trialIndex: number;
  trialId: string;
  completedAtMs: number | null;
  U0DisplayMv: number | null;
  atmosphericPressureKPa: number | null;
  pressureSensitivityMvPerKPa: number | null;
  U1DisplayMv: number | null;
  U2DisplayMv: number | null;
  U1CorrectedMv: number | null;
  U2CorrectedMv: number | null;
  gamma: number | null;
  status: 'valid' | 'invalid';
  message: string;
}

export interface HeatCapacityFreeProcessingResult {
  calculated: boolean;
  status: 'not-calculated' | 'no-valid-trials' | 'ready' | 'invalid-data';
  validTrialCount: number;
  trialResults: HeatCapacityFreeProcessingTrialResult[];
  meanGamma: number | null;
  theoreticalGamma: number;
  relativeErrorPercent: number | null;
  message: string;
}

export interface HeatCapacityFreeProcessingOptions extends HeatCapacityFreeGammaCalculationOptions {
  theoreticalGamma?: number;
}

export type HeatCapacityFreeTrialRecordRemovalKind = 'u0' | 'u1' | 'u2' | 'trial';

export interface HeatCapacityFreeTrialRecordRemovalResult {
  trials: HeatCapacityFreeTrial[];
  nextActiveTrialIndex: number;
}

const roundNumber = (value: number, digits = 6) => (
  Number.isFinite(value) ? Number(value.toFixed(digits)) : value
);

const DEFAULT_FREE_ATMOSPHERIC_PRESSURE_KPA = 101.3;
const DEFAULT_FREE_PRESSURE_SENSITIVITY_MV_PER_KPA = 20;

export const createHeatCapacityFreeTrial = (
  id: string,
  automaticU0: HeatCapacityFreeCalibrationState['automaticU0'] = null,
): HeatCapacityFreeTrial => ({
  id,
  source: 'free',
  traceTrialId: null,
  branchCount: 0,
  automaticU0,
  u0: null,
  u1: null,
  u2: null,
  blockedReason: null,
  correctedSignals: null,
  configSnapshot: null,
  completedAtMs: null,
});

export const normalizeHeatCapacityFreeRecordInput = (
  input: HeatCapacityFreeRecordInput,
): HeatCapacityFreeRecord => ({
  ...input,
  displayPressureMv: truncateHeatCapacitySignalMv(input.displayPressureMv),
  displayTemperatureMv: truncateHeatCapacitySignalMv(input.displayTemperatureMv),
  source: 'user',
  phaseAtRecord: input.phaseAtRecord ?? null,
  traceTrialId: input.traceTrialId ?? null,
  traceBranchId: input.traceBranchId ?? null,
  traceSampleId: input.traceSampleId ?? null,
  eventId: input.eventId ?? null,
});

export const calculateFreeHeatCapacityTrialSignals = (
  trial: HeatCapacityFreeTrial,
  options: HeatCapacityFreeGammaCalculationOptions = {},
): HeatCapacityFreeCorrectedSignals | null => {
  if (!trial.u0 || !trial.u1 || !trial.u2) {
    return null;
  }
  const corrected = getFreeCorrectedSignals({
    U0DisplayMv: trial.u0.displayPressureMv,
    U1DisplayMv: trial.u1.displayPressureMv,
    U2DisplayMv: trial.u2.displayPressureMv,
  }, options);
  if (
    corrected.U1CorrectedMv <= corrected.U2CorrectedMv ||
    corrected.U1CorrectedMv <= 0 ||
    corrected.U2CorrectedMv <= 0 ||
    !Number.isFinite(corrected.gamma)
  ) {
    return null;
  }
  const atmosphericPressureKPa = options.atmosphericPressureKPa ??
    DEFAULT_FREE_ATMOSPHERIC_PRESSURE_KPA;
  const pressureSensitivityMvPerKPa = options.pressureSensitivityMvPerKPa ??
    DEFAULT_FREE_PRESSURE_SENSITIVITY_MV_PER_KPA;
  return {
    calculationVersion: HEAT_CAPACITY_FREE_CALCULATION_VERSION,
    atmosphericPressureKPa,
    pressureSensitivityMvPerKPa,
    U0DisplayMv: trial.u0.displayPressureMv,
    U1DisplayMv: trial.u1.displayPressureMv,
    U2DisplayMv: trial.u2.displayPressureMv,
    U1CorrectedMv: roundNumber(corrected.U1CorrectedMv),
    U2CorrectedMv: roundNumber(corrected.U2CorrectedMv),
    gamma: roundNumber(corrected.gamma),
  };
};

const getFreeGammaOptionsFromConfigSnapshot = (
  configSnapshot: HeatCapacityFreeConfigSnapshot,
): HeatCapacityFreeGammaCalculationOptions => ({
  atmosphericPressureKPa: configSnapshot.environment.ambientPressureKPa,
  pressureSensitivityMvPerKPa: configSnapshot.sensor.pressureMvPerKPa,
});

const invalidFreeTrialResult = (
  trial: HeatCapacityFreeTrial,
  trialIndex: number,
  message: string,
): HeatCapacityFreeProcessingTrialResult => ({
  trialIndex,
  trialId: trial.id,
  completedAtMs: trial.completedAtMs,
  U0DisplayMv: trial.u0?.displayPressureMv ?? null,
  atmosphericPressureKPa: null,
  pressureSensitivityMvPerKPa: null,
  U1DisplayMv: trial.u1?.displayPressureMv ?? null,
  U2DisplayMv: trial.u2?.displayPressureMv ?? null,
  U1CorrectedMv: null,
  U2CorrectedMv: null,
  gamma: null,
  status: 'invalid',
  message,
});

export const calculateFreeHeatCapacityTrialResult = (
  trial: HeatCapacityFreeTrial,
  trialIndex: number,
  options: HeatCapacityFreeGammaCalculationOptions = {},
): HeatCapacityFreeProcessingTrialResult => {
  const correctedSignals = trial.correctedSignals ??
    calculateFreeHeatCapacityTrialSignals(
      trial,
      trial.configSnapshot
        ? getFreeGammaOptionsFromConfigSnapshot(trial.configSnapshot)
        : options,
    );
  if (!correctedSignals) {
    return invalidFreeTrialResult(trial, trialIndex, 'Free trial is incomplete or invalid.');
  }
  return {
    trialIndex,
    trialId: trial.id,
    completedAtMs: trial.completedAtMs,
    ...correctedSignals,
    status: 'valid',
    message: 'Valid',
  };
};

export const calculateFreeHeatCapacityMeanResult = (
  trials: HeatCapacityFreeTrial[],
  options: HeatCapacityFreeProcessingOptions = {},
): HeatCapacityFreeProcessingResult => {
  const theoreticalGamma = options.theoreticalGamma ?? 1.4;
  const trialResults = trials.map((trial, index) => (
    calculateFreeHeatCapacityTrialResult(trial, index + 1, options)
  ));
  const validResults = trialResults.filter((trial) => (
    trial.status === 'valid' && trial.gamma !== null
  ));

  if (validResults.length === 0) {
    return {
      calculated: true,
      status: 'no-valid-trials',
      validTrialCount: 0,
      trialResults,
      meanGamma: null,
      theoreticalGamma,
      relativeErrorPercent: null,
      message: 'No complete valid Free Mode trials.',
    };
  }

  const meanGamma = roundNumber(
    validResults.reduce((sum, trial) => sum + (trial.gamma ?? 0), 0) / validResults.length,
  );
  return {
    calculated: true,
    status: 'ready',
    validTrialCount: validResults.length,
    trialResults,
    meanGamma,
    theoreticalGamma,
    relativeErrorPercent: roundNumber(Math.abs(meanGamma - theoreticalGamma) / theoreticalGamma * 100, 4),
    message: 'Free Mode data processing complete.',
  };
};

export const removeHeatCapacityFreeTrialRecord = (
  trials: HeatCapacityFreeTrial[],
  trialIndex: number,
  kind: HeatCapacityFreeTrialRecordRemovalKind,
): HeatCapacityFreeTrialRecordRemovalResult => {
  if (trials.length === 0) return { trials, nextActiveTrialIndex: 0 };
  const boundedIndex = Math.min(trials.length - 1, Math.max(0, trialIndex));
  if (kind === 'trial') {
    const nextTrials = [
      ...trials.slice(0, boundedIndex),
      ...trials.slice(boundedIndex + 1),
    ];
    return {
      trials: nextTrials,
      nextActiveTrialIndex: Math.min(boundedIndex, Math.max(0, nextTrials.length - 1)),
    };
  }

  return {
    trials: trials.map((trial, index) => {
      if (index !== boundedIndex) return trial;
      if (kind === 'u0') {
        return {
          ...trial,
          u0: null,
          u1: null,
          u2: null,
          blockedReason: null,
          correctedSignals: null,
          configSnapshot: null,
          completedAtMs: null,
        };
      }
      if (kind === 'u1') {
        return {
          ...trial,
          u1: null,
          u2: null,
          blockedReason: null,
          correctedSignals: null,
          configSnapshot: null,
          completedAtMs: null,
        };
      }
      return {
        ...trial,
        u2: null,
        blockedReason: null,
        correctedSignals: null,
        configSnapshot: null,
        completedAtMs: null,
      };
    }),
    nextActiveTrialIndex: boundedIndex,
  };
};
