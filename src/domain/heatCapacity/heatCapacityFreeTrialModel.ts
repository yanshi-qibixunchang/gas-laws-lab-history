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
import type {
  HeatCapacityFreeStandardReferenceSnapshot,
} from './heatCapacityFreeStandardReferenceModel.ts';
import {
  truncateHeatCapacitySignalMv,
} from './heatCapacitySignalDisplayModel.ts';
import {
  getHeatCapacityFreeGasTypeGamma,
} from './heatCapacityGasTheory.ts';
import {
  applyHeatCapacityFreePreheatBias,
  type HeatCapacityFreePreheatOutcome,
} from './heatCapacityFreeResultBiasModel.ts';
import {
  calculateHeatCapacityBatchStatistics,
  calculateHeatCapacityMean,
  calculateHeatCapacityRelativeErrorPercent,
} from './heatCapacityCalculationModel.ts';

export type HeatCapacityFreeRecordRejectReason =
  | 'zero-not-ready'
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
  u0Source: 'recorded' | 'assumed-zero';
  formulaGamma: number;
  preheatBiasGamma: number;
  gamma: number;
}

export type HeatCapacityFreeTrialParameterScheme = 'real' | 'ideal';

export const HEAT_CAPACITY_FREE_TRIAL_BATCH_MEMBERSHIP_VERSION = 1 as const;

export interface HeatCapacityFreeTrialBatchMembership {
  version: typeof HEAT_CAPACITY_FREE_TRIAL_BATCH_MEMBERSHIP_VERSION;
  batchId: string;
  sequence: number;
}

export interface HeatCapacityFreeBatchTrialIdentity {
  id: string;
  batchMembership: HeatCapacityFreeTrialBatchMembership;
}

export interface HeatCapacityFreeTrial {
  id: string;
  source: 'free';
  parameterScheme: HeatCapacityFreeTrialParameterScheme;
  /**
   * Legacy and isolated domain fixtures may omit this field. A canonical v2
   * batch trial must always carry a non-null membership.
   */
  batchMembership?: HeatCapacityFreeTrialBatchMembership | null;
  traceTrialId: string | null;
  branchCount: number;
  automaticU0: HeatCapacityFreeCalibrationState['automaticU0'];
  preheatOutcome: HeatCapacityFreePreheatOutcome | null;
  u0: HeatCapacityFreeRecord | null;
  u1: HeatCapacityFreeRecord | null;
  u2: HeatCapacityFreeRecord | null;
  blockedReason: HeatCapacityFreeRecordRejectReason | null;
  correctedSignals: HeatCapacityFreeCorrectedSignals | null;
  configSnapshot: HeatCapacityFreeConfigSnapshot | null;
  standardReferenceSnapshot: HeatCapacityFreeStandardReferenceSnapshot | null;
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
  u0Source: 'recorded' | 'assumed-zero' | null;
  formulaGamma: number | null;
  preheatBiasGamma: number | null;
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
  sampleStandardDeviation: number | null;
  typeAStandardUncertainty: number | null;
  theoreticalGamma: number;
  relativeErrorPercent: number | null;
  message: string;
}

export interface HeatCapacityFreeProcessingOptions {
  theoreticalGamma?: number;
}

export interface HeatCapacityFreeTrialCalculationOptions extends HeatCapacityFreeGammaCalculationOptions {
  theoreticalGamma?: number;
  preheatOutcome?: HeatCapacityFreePreheatOutcome;
  preheatBiasSeed?: string;
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
const DEFAULT_FREE_PROCESSING_THEORETICAL_GAMMA = getHeatCapacityFreeGasTypeGamma('air');

export const createHeatCapacityFreeTrial = (
  id: string,
  automaticU0: HeatCapacityFreeCalibrationState['automaticU0'] = null,
  parameterScheme: HeatCapacityFreeTrialParameterScheme = 'real',
  batchMembership: HeatCapacityFreeTrialBatchMembership | null = null,
): HeatCapacityFreeTrial => ({
  id,
  source: 'free',
  parameterScheme,
  batchMembership: batchMembership === null ? null : { ...batchMembership },
  traceTrialId: null,
  branchCount: 0,
  automaticU0,
  preheatOutcome: null,
  u0: null,
  u1: null,
  u2: null,
  blockedReason: null,
  correctedSignals: null,
  configSnapshot: null,
  standardReferenceSnapshot: null,
  completedAtMs: null,
});

export const createHeatCapacityFreeBatchTrial = (
  identity: HeatCapacityFreeBatchTrialIdentity,
  automaticU0: HeatCapacityFreeCalibrationState['automaticU0'] = null,
  parameterScheme: HeatCapacityFreeTrialParameterScheme = 'real',
): HeatCapacityFreeTrial => createHeatCapacityFreeTrial(
  identity.id,
  automaticU0,
  parameterScheme,
  identity.batchMembership,
);

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
  options: HeatCapacityFreeTrialCalculationOptions = {},
): HeatCapacityFreeCorrectedSignals | null => {
  if (!trial.u1 || !trial.u2) {
    return null;
  }
  const U0DisplayMv = trial.u0?.displayPressureMv ?? 0;
  const corrected = getFreeCorrectedSignals({
    U0DisplayMv,
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
  const formulaGamma = roundNumber(corrected.gamma);
  const biased = applyHeatCapacityFreePreheatBias({
    formulaGamma,
    theoreticalGamma: options.theoreticalGamma ?? DEFAULT_FREE_PROCESSING_THEORETICAL_GAMMA,
    preheatOutcome: options.preheatOutcome ?? trial.preheatOutcome ?? 'completed',
    seed: options.preheatBiasSeed ?? trial.id,
  });
  return {
    calculationVersion: HEAT_CAPACITY_FREE_CALCULATION_VERSION,
    atmosphericPressureKPa,
    pressureSensitivityMvPerKPa,
    U0DisplayMv,
    U1DisplayMv: trial.u1.displayPressureMv,
    U2DisplayMv: trial.u2.displayPressureMv,
    U1CorrectedMv: roundNumber(corrected.U1CorrectedMv),
    U2CorrectedMv: roundNumber(corrected.U2CorrectedMv),
    u0Source: trial.u0 ? 'recorded' : 'assumed-zero',
    formulaGamma,
    preheatBiasGamma: biased.preheatBiasGamma,
    gamma: biased.gamma,
  };
};

export const isHeatCapacityFreeTrialComplete = (
  trial: Pick<HeatCapacityFreeTrial, 'u1' | 'u2' | 'correctedSignals'>,
) => trial.u1 !== null && trial.u2 !== null && trial.correctedSignals !== null;

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
  u0Source: null,
  formulaGamma: null,
  preheatBiasGamma: null,
  gamma: null,
  status: 'invalid',
  message,
});

export const calculateFreeHeatCapacityTrialResult = (
  trial: HeatCapacityFreeTrial,
  trialIndex: number,
): HeatCapacityFreeProcessingTrialResult => {
  if (!trial.u1 || !trial.u2) {
    return invalidFreeTrialResult(trial, trialIndex, 'Free trial is incomplete or invalid.');
  }
  if (!trial.configSnapshot) {
    return invalidFreeTrialResult(trial, trialIndex, 'Free trial is missing its parameter snapshot.');
  }
  const correctedSignals = trial.correctedSignals ??
    calculateFreeHeatCapacityTrialSignals(
      trial,
      {
        ...getFreeGammaOptionsFromConfigSnapshot(trial.configSnapshot),
        theoreticalGamma: trial.configSnapshot.physics.gamma,
      },
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
    message: correctedSignals.u0Source === 'assumed-zero'
      ? 'Valid; U0 was not recorded and was calculated as 0 mV.'
      : 'Valid',
  };
};

export const calculateFreeHeatCapacityMeanResult = (
  trials: HeatCapacityFreeTrial[],
  options: HeatCapacityFreeProcessingOptions = {},
): HeatCapacityFreeProcessingResult => {
  const theoreticalGamma = options.theoreticalGamma ?? DEFAULT_FREE_PROCESSING_THEORETICAL_GAMMA;
  const trialResults = trials.map((trial, index) => (
    calculateFreeHeatCapacityTrialResult(trial, index + 1)
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
      sampleStandardDeviation: null,
      typeAStandardUncertainty: null,
      theoreticalGamma,
      relativeErrorPercent: null,
      message: 'No complete valid Free Mode trials.',
    };
  }

  const statistics = calculateHeatCapacityBatchStatistics(
    validResults.map((trial) => trial.gamma as number),
    theoreticalGamma,
  );
  if (statistics === null) {
    const meanGamma = calculateHeatCapacityMean(
      validResults.map((trial) => trial.gamma as number),
    );
    return {
      calculated: true,
      status: meanGamma === null ? 'invalid-data' : 'ready',
      validTrialCount: validResults.length,
      trialResults,
      meanGamma,
      sampleStandardDeviation: null,
      typeAStandardUncertainty: null,
      theoreticalGamma,
      relativeErrorPercent: meanGamma === null
        ? null
        : (() => {
            const relativeErrorPercent = calculateHeatCapacityRelativeErrorPercent(
              meanGamma,
              theoreticalGamma,
            );
            return relativeErrorPercent === null
              ? null
              : roundNumber(relativeErrorPercent, 4);
          })(),
      message: meanGamma === null
        ? 'Free Mode statistics are invalid.'
        : 'Free Mode data processing complete; dispersion requires at least two valid trials.',
    };
  }
  return {
    calculated: true,
    status: 'ready',
    validTrialCount: validResults.length,
    trialResults,
    meanGamma: roundNumber(statistics.meanGamma),
    sampleStandardDeviation: roundNumber(statistics.sampleStandardDeviation),
    typeAStandardUncertainty: roundNumber(statistics.typeAStandardUncertainty),
    theoreticalGamma,
    relativeErrorPercent: roundNumber(statistics.relativeErrorPercent, 4),
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
        const withoutU0: HeatCapacityFreeTrial = {
          ...trial,
          u0: null,
          blockedReason: null,
          correctedSignals: null,
          standardReferenceSnapshot: null,
        };
        const correctedSignals = withoutU0.u1 && withoutU0.u2 && withoutU0.configSnapshot
          ? calculateFreeHeatCapacityTrialSignals(withoutU0, {
              ...getFreeGammaOptionsFromConfigSnapshot(withoutU0.configSnapshot),
              theoreticalGamma: withoutU0.configSnapshot.physics.gamma,
            })
          : null;
        return {
          ...withoutU0,
          correctedSignals,
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
          standardReferenceSnapshot: null,
          completedAtMs: null,
        };
      }
      return {
        ...trial,
        u2: null,
        blockedReason: null,
        correctedSignals: null,
        configSnapshot: null,
        standardReferenceSnapshot: null,
        completedAtMs: null,
      };
    }),
    nextActiveTrialIndex: boundedIndex,
  };
};
