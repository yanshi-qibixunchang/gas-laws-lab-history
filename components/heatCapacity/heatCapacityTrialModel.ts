import type { HeatCapacityProcessSamples, HeatCapacityRuntimePhase } from './heatCapacityExperimentModel.ts';

export type HeatCapacityTrialStatus =
  | 'waiting'
  | 'partial'
  | 'complete'
  | 'invalid';

export interface HeatCapacityTrial {
  id: string;
  trialIndex: number;
  U1Mv: number | null;
  U2Mv: number | null;
  UT1Mv: number | null;
  UT2Mv: number | null;
  status: HeatCapacityTrialStatus;
  recordedU1At?: number | null;
  recordedU2At?: number | null;
}

export interface HeatCapacityTrialRecordInput {
  activeTrialIndex: number;
  phase: HeatCapacityRuntimePhase;
  powerOn: boolean;
  pressureSignalMv: number | null;
  temperatureSignalMv: number | null;
  pressureSafetyStatus: 'normal' | 'warning' | 'danger';
  pressureOverLimit: boolean;
  now?: number;
}

export interface HeatCapacityTrialRecordResult {
  ok: boolean;
  message: string;
  trials: HeatCapacityTrial[];
  nextActiveTrialIndex: number;
}

export type HeatCapacityTrialRecordRemovalKind = 'u1' | 'u2';

export interface HeatCapacityTrialRecordRemovalResult {
  trials: HeatCapacityTrial[];
  nextActiveTrialIndex: number;
}

export interface HeatCapacityProcessingTrialResult {
  trialIndex: number;
  U1Mv: number | null;
  U2Mv: number | null;
  deltaP1KPa: number | null;
  deltaP2KPa: number | null;
  P1KPa: number | null;
  P2KPa: number | null;
  gamma: number | null;
  status: 'valid' | 'invalid';
  message: string;
}

export interface HeatCapacityProcessingResult {
  calculated: boolean;
  status: 'not-calculated' | 'no-valid-trials' | 'ready' | 'invalid-data';
  validTrialCount: number;
  trialResults: HeatCapacityProcessingTrialResult[];
  meanGamma: number | null;
  theoreticalGamma: number;
  relativeErrorPercent: number | null;
  message: string;
}

export interface HeatCapacityProcessingOptions {
  atmosphericPressureKPa: number;
  pressureSensitivityMvPerKPa: number;
  theoreticalGamma: number;
}

const DEFAULT_EXPECTED_TRIAL_COUNT = 3;
const MIN_EXPECTED_TRIAL_COUNT = 1;
const MAX_EXPECTED_TRIAL_COUNT = 10;
const MIN_U1_SIGNAL_MV = 5;
const MIN_RECOVERY_U2_SIGNAL_MV = 0.2;
const LOG_DENOMINATOR_EPSILON = 1e-8;

const roundNumber = (value: number, digits = 3) => (
  Number.isFinite(value) ? Number(value.toFixed(digits)) : value
);

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

export const normalizeHeatCapacityExpectedTrialCount = (value: unknown) => {
  const numericValue = isFiniteNumber(value) ? value : DEFAULT_EXPECTED_TRIAL_COUNT;
  return Math.min(
    MAX_EXPECTED_TRIAL_COUNT,
    Math.max(MIN_EXPECTED_TRIAL_COUNT, Math.round(numericValue)),
  );
};

export const createHeatCapacityTrial = (trialIndex: number): HeatCapacityTrial => ({
  id: `heat-trial-${trialIndex}`,
  trialIndex,
  U1Mv: null,
  U2Mv: null,
  UT1Mv: null,
  UT2Mv: null,
  status: 'waiting',
  recordedU1At: null,
  recordedU2At: null,
});

export const createHeatCapacityTrials = (count = DEFAULT_EXPECTED_TRIAL_COUNT) => (
  Array.from(
    { length: normalizeHeatCapacityExpectedTrialCount(count) },
    (_, index) => createHeatCapacityTrial(index + 1),
  )
);

export const createHeatCapacityTrialFromAutoDemoSamples = (
  samples: HeatCapacityProcessSamples,
  now = Date.now(),
): HeatCapacityTrial => {
  const beforeRelease = samples.stableBeforeReleaseSample;
  const afterRecovery = samples.recoverySample;
  const U1Mv = isFiniteNumber(beforeRelease?.pressureSignalMv) ? roundNumber(beforeRelease.pressureSignalMv, 2) : null;
  const U2Mv = isFiniteNumber(afterRecovery?.pressureSignalMv) ? roundNumber(afterRecovery.pressureSignalMv, 2) : null;
  const UT1Mv = isFiniteNumber(beforeRelease?.temperatureSignalMv) ? roundNumber(beforeRelease.temperatureSignalMv, 2) : null;
  const UT2Mv = isFiniteNumber(afterRecovery?.temperatureSignalMv) ? roundNumber(afterRecovery.temperatureSignalMv, 2) : null;
  const complete = U1Mv !== null && U2Mv !== null && UT1Mv !== null && UT2Mv !== null;
  const physicallyValid = complete && U1Mv > U2Mv && U1Mv > 0 && U2Mv >= MIN_RECOVERY_U2_SIGNAL_MV;

  return {
    id: 'heat-trial-1',
    trialIndex: 1,
    U1Mv,
    U2Mv,
    UT1Mv,
    UT2Mv,
    status: physicallyValid ? 'complete' : 'invalid',
    recordedU1At: beforeRelease ? now : null,
    recordedU2At: afterRecovery ? now : null,
  };
};

export const normalizeHeatCapacityTrial = (value: unknown, fallbackIndex: number): HeatCapacityTrial => {
  if (typeof value !== 'object' || value === null) return createHeatCapacityTrial(fallbackIndex);
  const record = value as Partial<HeatCapacityTrial>;
  const U1Mv = isFiniteNumber(record.U1Mv) ? record.U1Mv : null;
  const U2Mv = isFiniteNumber(record.U2Mv) ? record.U2Mv : null;
  const UT1Mv = isFiniteNumber(record.UT1Mv) ? record.UT1Mv : null;
  const UT2Mv = isFiniteNumber(record.UT2Mv) ? record.UT2Mv : null;
  const complete = U1Mv !== null && U2Mv !== null && UT1Mv !== null && UT2Mv !== null;
  const partial = U1Mv !== null || U2Mv !== null || UT1Mv !== null || UT2Mv !== null;
  const status = record.status === 'invalid'
    ? 'invalid'
    : complete
      ? 'complete'
      : partial
        ? 'partial'
        : 'waiting';

  return {
    id: typeof record.id === 'string' ? record.id : `heat-trial-${fallbackIndex}`,
    trialIndex: isFiniteNumber(record.trialIndex) ? Math.max(1, Math.round(record.trialIndex)) : fallbackIndex,
    U1Mv,
    U2Mv,
    UT1Mv,
    UT2Mv,
    status,
    recordedU1At: isFiniteNumber(record.recordedU1At) ? record.recordedU1At : null,
    recordedU2At: isFiniteNumber(record.recordedU2At) ? record.recordedU2At : null,
  };
};

export const resizeHeatCapacityTrials = (
  trials: HeatCapacityTrial[],
  expectedTrialCount: number,
) => {
  const count = normalizeHeatCapacityExpectedTrialCount(expectedTrialCount);
  return Array.from({ length: count }, (_, index) => {
    const existing = trials[index];
    return existing
      ? { ...existing, trialIndex: index + 1, id: existing.id || `heat-trial-${index + 1}` }
      : createHeatCapacityTrial(index + 1);
  });
};

export const getHeatCapacityCompletedTrialCount = (trials: HeatCapacityTrial[]) => (
  trials.filter((trial) => trial.status === 'complete').length
);

export const getHeatCapacityNextActiveTrialIndex = (trials: HeatCapacityTrial[]) => {
  const nextIndex = trials.findIndex((trial) => trial.status !== 'complete');
  return nextIndex >= 0 ? nextIndex : Math.max(0, trials.length - 1);
};

export const removeHeatCapacityTrialRecord = (
  trials: HeatCapacityTrial[],
  trialIndex: number,
  kind: HeatCapacityTrialRecordRemovalKind,
): HeatCapacityTrialRecordRemovalResult => {
  const boundedIndex = Math.min(trials.length - 1, Math.max(0, trialIndex));
  return {
    trials: trials.map((trial, index) => {
      if (index !== boundedIndex) return trial;
      if (kind === 'u1') {
        return {
          ...trial,
          U1Mv: null,
          U2Mv: null,
          UT1Mv: null,
          UT2Mv: null,
          recordedU1At: null,
          recordedU2At: null,
          status: 'waiting',
        };
      }
      const hasU1 = trial.U1Mv !== null && trial.UT1Mv !== null;
      return {
        ...trial,
        U2Mv: null,
        UT2Mv: null,
        recordedU2At: null,
        status: hasU1 ? 'partial' : 'waiting',
      };
    }),
    nextActiveTrialIndex: boundedIndex,
  };
};

const getWritableTrial = (trials: HeatCapacityTrial[], activeTrialIndex: number) => {
  if (trials.length === 0) return { trial: null, index: -1 };
  const requested = Math.min(trials.length - 1, Math.max(0, activeTrialIndex));
  const trial = trials[requested].status === 'complete'
    ? trials.find((candidate) => candidate.status !== 'complete') ?? null
    : trials[requested];
  if (!trial) return { trial: null, index: -1 };
  return { trial, index: trials.indexOf(trial) };
};

const canRecordU1InPhase = (phase: HeatCapacityRuntimePhase) => (
  phase === 'sealedStabilizing' || phase === 'pumping'
);

const canRecordU2InPhase = (phase: HeatCapacityRuntimePhase) => (
  phase === 'recovering' || phase === 'demoComplete'
);

const replaceTrial = (
  trials: HeatCapacityTrial[],
  index: number,
  trial: HeatCapacityTrial,
) => trials.map((current, currentIndex) => (currentIndex === index ? trial : current));

export const recordHeatCapacityU1 = (
  trials: HeatCapacityTrial[],
  input: HeatCapacityTrialRecordInput,
): HeatCapacityTrialRecordResult => {
  const { trial, index } = getWritableTrial(trials, input.activeTrialIndex);
  if (!trial || index < 0) return { ok: false, message: '没有可记录的实验组。', trials, nextActiveTrialIndex: 0 };
  if (!input.powerOn) return { ok: false, message: '请先打开电源。', trials, nextActiveTrialIndex: index };
  if (!canRecordU1InPhase(input.phase)) return { ok: false, message: '当前阶段不能记录 U1 / UT1。', trials, nextActiveTrialIndex: index };
  if (!isFiniteNumber(input.pressureSignalMv) || !isFiniteNumber(input.temperatureSignalMv)) {
    return { ok: false, message: '当前仪表读数无效，无法记录。', trials, nextActiveTrialIndex: index };
  }
  if (input.pressureSignalMv < MIN_U1_SIGNAL_MV) return { ok: false, message: 'U_p 过小，尚未形成有效加压状态。', trials, nextActiveTrialIndex: index };
  if (input.pressureOverLimit || input.pressureSafetyStatus === 'danger') {
    return { ok: false, message: '压力处于危险范围，禁止记录。', trials, nextActiveTrialIndex: index };
  }

  const nextTrial: HeatCapacityTrial = {
    ...trial,
    U1Mv: roundNumber(input.pressureSignalMv, 2),
    UT1Mv: roundNumber(input.temperatureSignalMv, 2),
    U2Mv: null,
    UT2Mv: null,
    recordedU1At: input.now ?? Date.now(),
    recordedU2At: null,
    status: 'partial',
  };
  const nextTrials = replaceTrial(trials, index, nextTrial);
  return {
    ok: true,
    message: 'U1 / UT1 recorded.',
    trials: nextTrials,
    nextActiveTrialIndex: index,
  };
};

export const recordHeatCapacityU2 = (
  trials: HeatCapacityTrial[],
  input: HeatCapacityTrialRecordInput,
): HeatCapacityTrialRecordResult => {
  const { trial, index } = getWritableTrial(trials, input.activeTrialIndex);
  if (!trial || index < 0) return { ok: false, message: '没有可记录的实验组。', trials, nextActiveTrialIndex: 0 };
  if (!input.powerOn) return { ok: false, message: '请先打开电源。', trials, nextActiveTrialIndex: index };
  if (!canRecordU2InPhase(input.phase)) return { ok: false, message: '当前阶段不能记录 U2 / UT2。', trials, nextActiveTrialIndex: index };
  if (trial.U1Mv === null || trial.UT1Mv === null) return { ok: false, message: '请先记录当前组的 U1 / UT1。', trials, nextActiveTrialIndex: index };
  if (!isFiniteNumber(input.pressureSignalMv) || !isFiniteNumber(input.temperatureSignalMv)) {
    return { ok: false, message: '当前仪表读数无效，无法记录。', trials, nextActiveTrialIndex: index };
  }
  if (input.pressureSignalMv >= trial.U1Mv) return { ok: false, message: 'U2 应小于 U1，请等待回温稳定后再记录。', trials, nextActiveTrialIndex: index };
  if (input.pressureSignalMv < MIN_RECOVERY_U2_SIGNAL_MV) return { ok: false, message: 'U2 过低，疑似放气瞬间读数，请等待回温。', trials, nextActiveTrialIndex: index };

  const nextTrial: HeatCapacityTrial = {
    ...trial,
    U2Mv: roundNumber(input.pressureSignalMv, 2),
    UT2Mv: roundNumber(input.temperatureSignalMv, 2),
    recordedU2At: input.now ?? Date.now(),
    status: 'complete',
  };
  const nextTrials = replaceTrial(trials, index, nextTrial);
  return {
    ok: true,
    message: 'U2 / UT2 recorded. Trial complete.',
    trials: nextTrials,
    nextActiveTrialIndex: index,
  };
};

export const createDefaultHeatCapacityProcessingResult = (
  theoreticalGamma = 1.4,
): HeatCapacityProcessingResult => ({
  calculated: false,
  status: 'not-calculated',
  validTrialCount: 0,
  trialResults: [],
  meanGamma: null,
  theoreticalGamma,
  relativeErrorPercent: null,
  message: '尚未计算。请在数据记录完成后点击 Calculate Results。',
});

const invalidTrialResult = (
  trial: HeatCapacityTrial,
  message: string,
): HeatCapacityProcessingTrialResult => ({
  trialIndex: trial.trialIndex,
  U1Mv: trial.U1Mv,
  U2Mv: trial.U2Mv,
  deltaP1KPa: null,
  deltaP2KPa: null,
  P1KPa: null,
  P2KPa: null,
  gamma: null,
  status: 'invalid',
  message,
});

export const calculateHeatCapacityTrialResult = (
  trial: HeatCapacityTrial,
  options: HeatCapacityProcessingOptions,
): HeatCapacityProcessingTrialResult => {
  if (trial.status !== 'complete') return invalidTrialResult(trial, '该组数据尚未完整。');
  if (!isFiniteNumber(trial.U1Mv) || !isFiniteNumber(trial.U2Mv)) return invalidTrialResult(trial, 'U1 或 U2 缺失。');
  if (trial.U1Mv <= trial.U2Mv || trial.U1Mv <= 0 || trial.U2Mv < 0) return invalidTrialResult(trial, 'U1 / U2 数据关系异常。');
  if (options.pressureSensitivityMvPerKPa <= 0 || options.atmosphericPressureKPa <= 0) return invalidTrialResult(trial, '已知参数异常。');

  const deltaP1KPa = roundNumber(trial.U1Mv / options.pressureSensitivityMvPerKPa, 3);
  const deltaP2KPa = roundNumber(trial.U2Mv / options.pressureSensitivityMvPerKPa, 3);
  const P0KPa = options.atmosphericPressureKPa;
  const P1KPa = roundNumber(P0KPa + deltaP1KPa, 3);
  const P2KPa = roundNumber(P0KPa + deltaP2KPa, 3);

  if (P1KPa <= P2KPa || P2KPa <= P0KPa) return invalidTrialResult(trial, '绝对压强关系异常。');

  const denominator = trial.U1Mv - trial.U2Mv;
  if (Math.abs(denominator) < LOG_DENOMINATOR_EPSILON) return invalidTrialResult(trial, 'U1 - U2 过小。');

  const gamma = roundNumber(trial.U1Mv / denominator, 6);
  if (!Number.isFinite(gamma) || gamma < 1 || gamma > 2) return invalidTrialResult(trial, 'gamma 结果异常。');

  return {
    trialIndex: trial.trialIndex,
    U1Mv: trial.U1Mv,
    U2Mv: trial.U2Mv,
    deltaP1KPa,
    deltaP2KPa,
    P1KPa,
    P2KPa,
    gamma,
    status: 'valid',
    message: 'Valid',
  };
};

export const calculateHeatCapacityMeanResult = (
  trials: HeatCapacityTrial[],
  options: HeatCapacityProcessingOptions,
): HeatCapacityProcessingResult => {
  if (options.pressureSensitivityMvPerKPa <= 0 || options.atmosphericPressureKPa <= 0) {
    return {
      calculated: true,
      status: 'invalid-data',
      validTrialCount: 0,
      trialResults: [],
      meanGamma: null,
      theoreticalGamma: options.theoreticalGamma,
      relativeErrorPercent: null,
      message: '已知参数异常，无法计算。',
    };
  }

  const trialResults = trials
    .filter((trial) => trial.status === 'complete')
    .map((trial) => calculateHeatCapacityTrialResult(trial, options));
  const validResults = trialResults.filter((trial) => trial.status === 'valid' && trial.gamma !== null);

  if (validResults.length === 0) {
    return {
      calculated: true,
      status: 'no-valid-trials',
      validTrialCount: 0,
      trialResults,
      meanGamma: null,
      theoreticalGamma: options.theoreticalGamma,
      relativeErrorPercent: null,
      message: '没有可用于计算的完整有效实验组。',
    };
  }

  const meanGamma = roundNumber(
    validResults.reduce((sum, trial) => sum + (trial.gamma ?? 0), 0) / validResults.length,
    6,
  );
  const relativeErrorPercent = roundNumber(
    Math.abs(meanGamma - options.theoreticalGamma) / options.theoreticalGamma * 100,
    4,
  );

  return {
    calculated: true,
    status: 'ready',
    validTrialCount: validResults.length,
    trialResults,
    meanGamma,
    theoreticalGamma: options.theoreticalGamma,
    relativeErrorPercent,
    message: '空气比热容比数据处理完成。',
  };
};
