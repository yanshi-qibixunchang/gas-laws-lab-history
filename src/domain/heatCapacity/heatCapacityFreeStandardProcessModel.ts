import {
  calculateFreeHeatCapacityTrialSignals,
  normalizeHeatCapacityFreeRecordInput,
  type HeatCapacityFreeTrial,
} from './heatCapacityFreeTrialModel.ts';
import type {
  HeatCapacityFreeConfigSnapshot,
  HeatCapacityFreeTraceBranch,
  HeatCapacityFreeTraceTrial,
} from './heatCapacityFreeTraceModel.ts';
import type {
  HeatCapacityBestRecordWindow,
  HeatCapacityOperationUpperBound,
  HeatCapacityProcessRecordId,
  HeatCapacityProcessReferencePoint,
  HeatCapacityProcessStageId,
  HeatCapacityProcessStageSegment,
} from './heatCapacityFreeProcessReviewTypes.ts';

export interface HeatCapacityStandardProcessAssumptions {
  operationMode: 'standard-operation';
  disturbancesPreserved: true;
  stageAligned: true;
}

export interface HeatCapacityStandardProcessSummary {
  feasible: boolean;
  seed: number;
  gamma: number | null;
  relativeErrorPercent: number | null;
  targetPressureMv: number | null;
  targetPressureDeltaKPa: number | null;
  releaseDurationS: number | null;
  u1TimeS: number | null;
  u2TimeS: number | null;
  assumptions: HeatCapacityStandardProcessAssumptions;
  explanation: {
    operation: string;
    windows: string;
  };
}

export interface HeatCapacityFreeStandardProcess extends HeatCapacityStandardProcessSummary {
  configSnapshot: HeatCapacityFreeConfigSnapshot;
  trace: HeatCapacityProcessReferencePoint[];
  stages: HeatCapacityProcessStageSegment[];
  recordWindows: HeatCapacityBestRecordWindow[];
  standard: HeatCapacityStandardProcessSummary;
  upperBound: HeatCapacityOperationUpperBound;
}

export interface CreateHeatCapacityFreeStandardProcessInput {
  traceTrial: HeatCapacityFreeTraceTrial;
  branch: HeatCapacityFreeTraceBranch;
  trial: HeatCapacityFreeTrial;
  theoreticalGamma?: number;
}

const STEP_S = 0.2;
const ZERO_DURATION_S = 1.2;
const MIN_PUMP_DURATION_S = 1;
const MAX_PUMP_DURATION_S = 2.4;
const MIN_STABILIZE_S = 10;
const MAX_STABILIZE_S = 28;
const MIN_RECOVER_S = 10;
const MAX_RECOVER_S = 28;

const ASSUMPTIONS: HeatCapacityStandardProcessAssumptions = {
  operationMode: 'standard-operation',
  disturbancesPreserved: true,
  stageAligned: true,
};

const roundNumber = (value: number, digits = 2) => (
  Number.isFinite(value) ? Number(value.toFixed(digits)) : value
);

const clampNumber = (value: number, min: number, max: number) => (
  Math.min(Math.max(value, min), max)
);

const hashText = (text: string) => {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const seededUnit = (seed: number, channel: string) => (
  hashText(`${seed}:${channel}`) / 0xffffffff
);

const seededSigned = (seed: number, channel: string) => (
  seededUnit(seed, channel) * 2 - 1
);

const createSeed = (
  traceTrial: HeatCapacityFreeTraceTrial,
  branch: HeatCapacityFreeTraceBranch,
  trial: HeatCapacityFreeTrial,
  theoreticalGamma: number,
) => hashText([
  'free-standard-process-v1',
  traceTrial.id,
  branch.id,
  trial.id,
  traceTrial.configSnapshot.version,
  traceTrial.configSnapshot.scoring.processScoringVersion,
  theoreticalGamma,
  traceTrial.configSnapshot.physics.leakage.enabled,
  traceTrial.configSnapshot.physics.environmentDisturbance?.enabled ?? false,
  traceTrial.configSnapshot.sensor.noiseMv,
].join(':'));

const createStage = (
  id: HeatCapacityProcessStageId,
  label: string,
  startS: number,
  endS: number,
  extras: Partial<HeatCapacityProcessStageSegment> = {},
): HeatCapacityProcessStageSegment => ({
  id,
  label,
  startS: roundNumber(startS, 2),
  endS: roundNumber(Math.max(startS, endS), 2),
  ...extras,
});

const getTargetPressureMv = (config: HeatCapacityFreeConfigSnapshot) => {
  const minimum = config.record.minimumUsefulU1CorrectedMv;
  const warning = config.record.pressureWarningMv;
  const danger = config.record.pressureDangerMv;
  const lowerBound = Math.max(1, minimum * 1.08);
  const preferred = Math.min(warning * 0.92, danger * 0.82);
  const upperBound = Math.max(lowerBound, danger * 0.9);
  return roundNumber(clampNumber(preferred, lowerBound, upperBound), 3);
};

const getTheoreticalU2Mv = (
  config: HeatCapacityFreeConfigSnapshot,
  u1CorrectedMv: number,
  theoreticalGamma: number,
) => {
  const p0 = config.environment.ambientPressureKPa;
  const p1 = p0 + u1CorrectedMv / Math.max(0.000001, config.sensor.pressureMvPerKPa);
  if (p1 <= p0 || theoreticalGamma <= 1) return null;
  const p2 = p1 / ((p1 / p0) ** (1 / theoreticalGamma));
  return roundNumber(Math.max(config.record.overVentedMinimumU2CorrectedMv, (p2 - p0) * config.sensor.pressureMvPerKPa), 3);
};

const getPumpDurationS = (
  config: HeatCapacityFreeConfigSnapshot,
  targetPressureMv: number,
) => {
  const pressureKPa = targetPressureMv / Math.max(0.000001, config.sensor.pressureMvPerKPa);
  const pressureRatioDelta = pressureKPa / Math.max(0.000001, config.environment.ambientPressureKPa);
  const effectiveStrokes = pressureRatioDelta / Math.max(0.000001, config.physics.pumpAmountGainRatio);
  const raw = effectiveStrokes * Math.max(0.06, config.physics.recommendedPumpIntervalS);
  return roundNumber(clampNumber(raw, MIN_PUMP_DURATION_S, MAX_PUMP_DURATION_S), 2);
};

const getStabilizeDurationS = (config: HeatCapacityFreeConfigSnapshot) => {
  const lagPart = 4 / Math.max(0.2, config.sensor.lagRate);
  const thermalPart = config.physics.thermal.wallHeatCapacityJPerK /
    Math.max(0.001, config.physics.thermal.gasWallConductanceWPerK + config.physics.thermal.wallAmbientConductanceWPerK);
  return roundNumber(clampNumber(lagPart + thermalPart * 0.18, MIN_STABILIZE_S, MAX_STABILIZE_S), 2);
};

const getRecoverDurationS = (config: HeatCapacityFreeConfigSnapshot) => {
  const lagPart = 4 / Math.max(0.2, config.sensor.lagRate);
  const thermalPart = config.physics.thermal.wallHeatCapacityJPerK /
    Math.max(0.001, config.physics.thermal.wallAmbientConductanceWPerK);
  return roundNumber(clampNumber(lagPart + thermalPart * 0.12, MIN_RECOVER_S, MAX_RECOVER_S), 2);
};

const getReleaseDurationS = (
  config: HeatCapacityFreeConfigSnapshot,
  targetPressureMv: number,
  targetU2Mv: number,
) => {
  const dropFraction = clampNumber(
    (targetPressureMv - targetU2Mv) / Math.max(0.000001, targetPressureMv),
    0.1,
    0.95,
  );
  const rate = Math.max(0.1, config.physics.stopcockFlowRate);
  const visual = config.physics.releaseVisualResponseDelayS + config.physics.releaseVisualMainDurationS;
  return roundNumber(clampNumber(visual * dropFraction * (4 / rate), 0.12, 1.2), 2);
};

const smoothStep = (value: number) => {
  const unit = clampNumber(value, 0, 1);
  return unit * unit * (3 - 2 * unit);
};

const getNoiseMv = (
  config: HeatCapacityFreeConfigSnapshot,
  seed: number,
  sampleIndex: number,
  channel: 'pressure' | 'temperature',
) => {
  const noise = Math.max(0, config.sensor.noiseMv);
  if (noise <= 0) return 0;
  return seededSigned(seed, `${channel}:${sampleIndex}`) * noise;
};

const getEnvironmentOffset = (
  config: HeatCapacityFreeConfigSnapshot,
  seed: number,
  timeS: number,
) => {
  const disturbance = config.physics.environmentDisturbance;
  if (!disturbance?.enabled) {
    return { pressureKPa: 0, temperatureK: 0 };
  }
  const scale = Math.max(1, disturbance.timeScaleS);
  const pressurePhase = seededUnit(seed, 'environment-pressure-phase') * Math.PI * 2;
  const temperaturePhase = seededUnit(seed, 'environment-temperature-phase') * Math.PI * 2;
  return {
    pressureKPa: Math.sin(timeS / scale * Math.PI * 2 + pressurePhase) * disturbance.pressureAmplitudeKPa,
    temperatureK: Math.sin(timeS / scale * Math.PI * 2 + temperaturePhase) * disturbance.temperatureAmplitudeK,
  };
};

const createPointFactory = (
  config: HeatCapacityFreeConfigSnapshot,
  seed: number,
) => {
  let sampleIndex = 1;
  return (
    stageId: HeatCapacityProcessStageId,
    timeS: number,
    pressureMv: number,
    temperatureDeltaK: number,
  ): HeatCapacityProcessReferencePoint => {
    const environmentOffset = getEnvironmentOffset(config, seed, timeS);
    const noisyPressureMv = pressureMv +
      environmentOffset.pressureKPa * config.sensor.pressureMvPerKPa +
      getNoiseMv(config, seed, sampleIndex, 'pressure');
    const noisyTemperatureDeltaK = temperatureDeltaK +
      environmentOffset.temperatureK +
      getNoiseMv(config, seed, sampleIndex, 'temperature') /
        Math.max(0.000001, config.sensor.temperatureMvPerK);
    const point = {
      sampleId: `standard-${sampleIndex}`,
      stageId,
      timeS: roundNumber(timeS, 2),
      pressureDeltaKPa: roundNumber(noisyPressureMv / Math.max(0.000001, config.sensor.pressureMvPerKPa), 3),
      temperatureDeltaK: roundNumber(noisyTemperatureDeltaK, 3),
    };
    sampleIndex += 1;
    return point;
  };
};

const pushStagePoints = (
  trace: HeatCapacityProcessReferencePoint[],
  createPoint: ReturnType<typeof createPointFactory>,
  stageId: HeatCapacityProcessStageId,
  startS: number,
  endS: number,
  valueAtProgress: (progress: number, timeS: number) => {
    pressureMv: number;
    temperatureDeltaK: number;
  },
) => {
  let timeS = startS;
  while (timeS <= endS + 0.000001) {
    const progress = endS <= startS ? 1 : (timeS - startS) / (endS - startS);
    const value = valueAtProgress(clampNumber(progress, 0, 1), timeS);
    trace.push(createPoint(stageId, timeS, value.pressureMv, value.temperatureDeltaK));
    timeS = roundNumber(timeS + STEP_S, 2);
  }
};

const createWindow = (
  recordId: HeatCapacityProcessRecordId,
  timeS: number,
  displayPressureMv: number,
  displayTemperatureMv: number,
  config: HeatCapacityFreeConfigSnapshot,
  qualityScore: number,
  reason: string,
): HeatCapacityBestRecordWindow => ({
  recordId,
  startS: roundNumber(Math.max(0, timeS - 1), 2),
  endS: roundNumber(timeS + 1, 2),
  recommendedSampleId: `standard-${recordId}`,
  recommendedTimeS: roundNumber(timeS, 2),
  displayPressureMv: roundNumber(displayPressureMv, 2),
  displayTemperatureMv: roundNumber(displayTemperatureMv, 2),
  pressureDeltaKPa: roundNumber(displayPressureMv / Math.max(0.000001, config.sensor.pressureMvPerKPa), 3),
  temperatureDeltaK: roundNumber(
    (displayTemperatureMv - config.sensor.temperatureMvAtAmbient) /
      Math.max(0.000001, config.sensor.temperatureMvPerK),
    3,
  ),
  qualityScore,
  source: 'standard-operation',
  reason,
});

const createSyntheticTrial = (
  trial: HeatCapacityFreeTrial,
  traceTrial: HeatCapacityFreeTraceTrial,
  windows: HeatCapacityBestRecordWindow[],
): HeatCapacityFreeTrial => {
  const record = (recordId: HeatCapacityProcessRecordId) => {
    const window = windows.find((candidate) => candidate.recordId === recordId);
    if (
      !window ||
      window.recommendedTimeS === null ||
      window.displayPressureMv === null ||
      window.displayTemperatureMv === null
    ) {
      return null;
    }
    return normalizeHeatCapacityFreeRecordInput({
      atS: window.recommendedTimeS,
      displayPressureMv: window.displayPressureMv,
      displayTemperatureMv: window.displayTemperatureMv,
      calibrationVersion: trial.u0?.calibrationVersion ?? 1,
      zeroEventId: trial.u0?.zeroEventId ?? 'standard-zero',
      phaseAtRecord: recordId === 'u0' ? 'zeroed' : recordId === 'u1' ? 'sealedStabilizing' : 'recovering',
      traceTrialId: traceTrial.id,
      traceBranchId: traceTrial.activeBranchId,
      traceSampleId: window.recommendedSampleId,
      eventId: null,
    });
  };
  return {
    ...trial,
    u0: record('u0'),
    u1: record('u1'),
    u2: record('u2'),
    correctedSignals: null,
  };
};

const calculateRelativeError = (
  gamma: number | null,
  theoreticalGamma: number,
) => (
  gamma !== null && Number.isFinite(gamma) && theoreticalGamma > 0
    ? roundNumber(Math.abs(gamma - theoreticalGamma) / theoreticalGamma * 100, 2)
    : null
);

export const createHeatCapacityFreeStandardProcess = ({
  traceTrial,
  branch,
  trial,
  theoreticalGamma = 1.4,
}: CreateHeatCapacityFreeStandardProcessInput): HeatCapacityFreeStandardProcess => {
  void branch;
  const config = traceTrial.configSnapshot;
  const seed = createSeed(traceTrial, branch, trial, theoreticalGamma);
  const targetPressureMv = getTargetPressureMv(config);
  const theoreticalU2Mv = getTheoreticalU2Mv(config, targetPressureMv, theoreticalGamma);
  const u2CorrectedMv = theoreticalU2Mv === null
    ? Math.max(config.record.overVentedMinimumU2CorrectedMv, targetPressureMv * 0.28)
    : theoreticalU2Mv;
  const pumpDurationS = getPumpDurationS(config, targetPressureMv);
  const stabilizeDurationS = getStabilizeDurationS(config);
  const recoverDurationS = getRecoverDurationS(config);
  const releaseDurationS = getReleaseDurationS(config, targetPressureMv, u2CorrectedMv);
  const zeroStartS = 0;
  const zeroEndS = ZERO_DURATION_S;
  const pumpStartS = zeroEndS;
  const pumpEndS = roundNumber(pumpStartS + pumpDurationS, 2);
  const stabilizeStartS = pumpEndS;
  const stabilizeEndS = roundNumber(stabilizeStartS + stabilizeDurationS, 2);
  const releaseStartS = stabilizeEndS;
  const releaseEndS = roundNumber(releaseStartS + releaseDurationS, 2);
  const recoverStartS = releaseEndS;
  const recoverEndS = roundNumber(recoverStartS + recoverDurationS, 2);
  const leakageRate = config.physics.leakage.enabled ? Math.max(0, config.physics.leakage.ratePerS) : 0;
  const standardU1Mv = roundNumber(targetPressureMv * Math.exp(-leakageRate * stabilizeDurationS * 0.2), 3);
  const standardU2Mv = roundNumber(u2CorrectedMv * Math.exp(-leakageRate * recoverDurationS * 0.2), 3);
  const trace: HeatCapacityProcessReferencePoint[] = [];
  const createPoint = createPointFactory(config, seed);
  const pumpTempSpikeK = clampNumber(targetPressureMv / Math.max(1, config.sensor.pressureMvPerKPa) * 0.11, 0.1, 0.9);
  const releaseTempDipK = -clampNumber((standardU1Mv - standardU2Mv) /
    Math.max(1, config.sensor.pressureMvPerKPa) * 0.08, 0.05, 0.7);

  pushStagePoints(trace, createPoint, 'zero', zeroStartS, zeroEndS, () => ({
    pressureMv: 0,
    temperatureDeltaK: 0,
  }));
  pushStagePoints(trace, createPoint, 'pump', pumpStartS, pumpEndS, (progress) => {
    const smooth = smoothStep(progress);
    return {
      pressureMv: targetPressureMv * smooth,
      temperatureDeltaK: pumpTempSpikeK * Math.sin(progress * Math.PI),
    };
  });
  pushStagePoints(trace, createPoint, 'stabilize', stabilizeStartS, stabilizeEndS, (progress) => ({
    pressureMv: targetPressureMv + (standardU1Mv - targetPressureMv) * progress,
    temperatureDeltaK: pumpTempSpikeK * (1 - smoothStep(progress)),
  }));
  pushStagePoints(trace, createPoint, 'release', releaseStartS, releaseEndS, (progress) => {
    const smooth = smoothStep(progress);
    return {
      pressureMv: standardU1Mv + (standardU2Mv - standardU1Mv) * smooth,
      temperatureDeltaK: releaseTempDipK * smooth,
    };
  });
  pushStagePoints(trace, createPoint, 'recover', recoverStartS, recoverEndS, (progress) => ({
    pressureMv: standardU2Mv,
    temperatureDeltaK: releaseTempDipK * (1 - smoothStep(progress)),
  }));

  const stages = [
    createStage('zero', '调零', zeroStartS, zeroEndS),
    createStage('pump', '标准打气', pumpStartS, pumpEndS, {
      durationText: `${roundNumber(pumpDurationS, 2)} s`,
    }),
    createStage('stabilize', '回温稳定', stabilizeStartS, stabilizeEndS),
    createStage('release', '标准放气', releaseStartS, releaseEndS, {
      durationText: `${roundNumber(releaseDurationS, 2)} s`,
    }),
    createStage('recover', '关阀回温', recoverStartS, recoverEndS),
  ];
  const u0TimeS = roundNumber((zeroStartS + zeroEndS) / 2, 2);
  const u1TimeS = stabilizeEndS;
  const u2TimeS = recoverEndS;
  const recordWindows = [
    createWindow('u0', u0TimeS, 0, config.sensor.temperatureMvAtAmbient, config, 100, '标准调零稳定窗口。'),
    createWindow('u1', u1TimeS, standardU1Mv, config.sensor.temperatureMvAtAmbient, config, 100, '标准打气后的回温稳定窗口。'),
    createWindow('u2', u2TimeS, standardU2Mv, config.sensor.temperatureMvAtAmbient, config, 100, '标准放气后的回温稳定窗口。'),
  ];
  const syntheticTrial = createSyntheticTrial(trial, traceTrial, recordWindows);
  const signals = calculateFreeHeatCapacityTrialSignals(syntheticTrial, {
    atmosphericPressureKPa: config.environment.ambientPressureKPa,
    pressureSensitivityMvPerKPa: config.sensor.pressureMvPerKPa,
  });
  const gamma = signals?.gamma ?? null;
  const standardSummary: HeatCapacityStandardProcessSummary = {
    feasible: gamma !== null,
    seed,
    gamma,
    relativeErrorPercent: calculateRelativeError(gamma, theoreticalGamma),
    targetPressureMv,
    targetPressureDeltaKPa: roundNumber(targetPressureMv / Math.max(0.000001, config.sensor.pressureMvPerKPa), 3),
    releaseDurationS,
    u1TimeS,
    u2TimeS,
    assumptions: ASSUMPTIONS,
    explanation: {
      operation: '标准过程使用同一参数快打、稳定、快放和回温记录流程生成。',
      windows: 'U0/U1/U2 显示为标准操作推荐记录窗口，而不是从实际 trace 中反选出的窗口。',
    },
  };
  const actualGamma = trial.correctedSignals?.gamma ?? null;
  const upperBoundGamma = actualGamma === null
    ? gamma
    : gamma === null
      ? actualGamma
      : Math.max(actualGamma, gamma);
  const upperBound: HeatCapacityOperationUpperBound = {
    gamma: upperBoundGamma,
    relativeErrorPercent: calculateRelativeError(upperBoundGamma, theoreticalGamma),
    gapFromActualPercent: upperBoundGamma === null || actualGamma === null || upperBoundGamma === 0
      ? null
      : roundNumber(Math.abs(upperBoundGamma - actualGamma) / Math.abs(upperBoundGamma) * 100, 2),
    windows: recordWindows,
  };

  return {
    ...standardSummary,
    configSnapshot: config,
    trace,
    stages,
    recordWindows,
    standard: standardSummary,
    upperBound,
  };
};
