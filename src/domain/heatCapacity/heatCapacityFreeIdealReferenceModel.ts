import {
  createDefaultFreePhysicsState,
  deriveFreePhysicalState,
  FREE_RELEASE_MAIN_DURATION_S,
  stepFreePhysics,
  type HeatCapacityFreeControls,
  type HeatCapacityFreePhysicsConfig,
  type HeatCapacityFreePhysicsState,
} from './heatCapacityFreePhysicsEngine.ts';
import type {
  HeatCapacityFreeConfigSnapshot,
} from './heatCapacityFreeTraceModel.ts';
import type {
  HeatCapacityProcessReferencePoint,
  HeatCapacityProcessStageId,
  HeatCapacityProcessStageSegment,
} from './heatCapacityFreeProcessReviewTypes.ts';

export interface HeatCapacityIdealReferenceAssumptions {
  fillMode: 'continuous-fast';
  noiseIgnored: true;
  sensorLagIgnored: true;
  leakageIgnored: true;
}

export interface HeatCapacityIdealReferenceExplanation {
  fill: string;
  u1: string;
  release: string;
  u2: string;
}

export interface HeatCapacityIdealReference {
  feasible: boolean;
  trace: HeatCapacityProcessReferencePoint[];
  stages: HeatCapacityProcessStageSegment[];
  gamma: number | null;
  relativeErrorPercent: number | null;
  fillDurationS: number;
  targetPressureMv: number | null;
  targetPressureDeltaKPa: number | null;
  releaseDurationS: number | null;
  u1TimeS: number | null;
  u2TimeS: number | null;
  assumptions: HeatCapacityIdealReferenceAssumptions;
  explanation: HeatCapacityIdealReferenceExplanation;
}

const STEP_S = 0.02;
const ZERO_DURATION_S = 1;
const FILL_SECONDS_PER_EFFECTIVE_STROKE = 0.12;
const MIN_FILL_DURATION_S = 0.4;
const MAX_FILL_DURATION_S = 1.2;
const MAX_STABILIZE_S = 72;
const MAX_RECOVER_S = 72;

const ASSUMPTIONS: HeatCapacityIdealReferenceAssumptions = {
  fillMode: 'continuous-fast',
  noiseIgnored: true,
  sensorLagIgnored: true,
  leakageIgnored: true,
};

const EXPLANATION: HeatCapacityIdealReferenceExplanation = {
  fill: '理想参考把充气视为连续快速充入，不模拟手动打气次数。',
  u1: 'U1 取充气后首次回温稳定点。',
  release: '开阀时长由当前参数解析计算，使理论 γ 最接近目标且保持安全阈值。',
  u2: 'U2 取放气后再次回温稳定点。',
};

const roundNumber = (value: number, digits = 2) => (
  Number.isFinite(value) ? Number(value.toFixed(digits)) : value
);

const clampNumber = (value: number, min: number, max: number) => (
  Math.min(Math.max(value, min), max)
);

const smoothStepUnit = (value: number) => {
  const unit = clampNumber(value, 0, 1);
  return unit * unit * (3 - 2 * unit);
};

const createIdealPhysicsConfig = (
  config: HeatCapacityFreeConfigSnapshot,
): HeatCapacityFreePhysicsConfig => ({
  environment: {
    ambientPressureKPa: config.environment.ambientPressureKPa,
    ambientTemperatureK: config.environment.ambientTemperatureK,
  },
  vesselVolumeL: config.physics.vesselVolumeL,
  gamma: config.physics.gamma,
  pumpAmountGainRatio: config.physics.pumpAmountGainRatio,
  pumpPressureLimitKPa: config.physics.pumpPressureLimitKPa,
  pumpInflowTemperatureRiseK: config.physics.pumpInflowTemperatureRiseK,
  stopcockFlowRate: config.physics.stopcockFlowRate,
  thermal: {
    ...config.physics.thermal,
  },
  leakage: {
    ...config.physics.leakage,
    enabled: false,
    ratePerS: 0,
  },
});

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
  endS: roundNumber(Math.max(endS, startS), 2),
  ...extras,
});

const toIdealPoint = (
  id: string,
  stageId: HeatCapacityProcessStageId,
  timeS: number,
  physicsState: HeatCapacityFreePhysicsState,
  physicsConfig: HeatCapacityFreePhysicsConfig,
): HeatCapacityProcessReferencePoint => {
  const physical = deriveFreePhysicalState(physicsState, physicsConfig);
  return {
    sampleId: id,
    stageId,
    timeS: roundNumber(timeS, 2),
    pressureDeltaKPa: roundNumber(physical.pressureDeltaKPa, 3),
    temperatureDeltaK: roundNumber(
      physicsState.gasTemperatureK - physicsConfig.environment.ambientTemperatureK,
      3,
    ),
  };
};

const getTargetPressureMv = (config: HeatCapacityFreeConfigSnapshot) => {
  const lowerBound = Math.max(0.1, config.record.minimumUsefulU1CorrectedMv * 1.08);
  const upperBound = Math.max(lowerBound, config.record.pressureDangerMv * 0.9);
  const rawTarget = Math.min(
    config.record.pressureWarningMv,
    config.record.pressureDangerMv * 0.85,
  );
  return roundNumber(clampNumber(rawTarget, lowerBound, upperBound), 3);
};

const getTargetPressureDeltaKPa = (config: HeatCapacityFreeConfigSnapshot) => (
  getTargetPressureMv(config) / Math.max(0.000001, config.sensor.pressureMvPerKPa)
);

const getIdealFillEffectiveStrokeCount = (
  config: HeatCapacityFreeConfigSnapshot,
  targetPressureDeltaKPa: number,
) => {
  const pressureRatioDelta = targetPressureDeltaKPa /
    Math.max(0.000001, config.environment.ambientPressureKPa);
  const amountGain = Math.max(0.000001, config.physics.pumpAmountGainRatio);
  const inflowTemperatureK = Math.max(
    1,
    config.environment.ambientTemperatureK + config.physics.pumpInflowTemperatureRiseK,
  );
  const pressureGainPerStroke = amountGain *
    (inflowTemperatureK / Math.max(0.000001, config.environment.ambientTemperatureK));
  return Math.max(0, pressureRatioDelta / Math.max(0.000001, pressureGainPerStroke));
};

const getFillDurationS = (
  config: HeatCapacityFreeConfigSnapshot,
  targetPressureDeltaKPa: number,
) => {
  const effectiveStrokeCount = getIdealFillEffectiveStrokeCount(config, targetPressureDeltaKPa);
  return roundNumber(clampNumber(
    effectiveStrokeCount * FILL_SECONDS_PER_EFFECTIVE_STROKE,
    MIN_FILL_DURATION_S,
    MAX_FILL_DURATION_S,
  ), 2);
};

const applyIdealFillAtProgress = (
  initialState: HeatCapacityFreePhysicsState,
  config: HeatCapacityFreeConfigSnapshot,
  targetPressureDeltaKPa: number,
  progress: number,
): HeatCapacityFreePhysicsState => {
  const fillProgress = smoothStepUnit(progress);
  const effectiveStrokeCount = getIdealFillEffectiveStrokeCount(config, targetPressureDeltaKPa);
  const amountDelta = config.physics.pumpAmountGainRatio * effectiveStrokeCount;
  const appliedAmountDelta = amountDelta * fillProgress;
  const inflowTemperatureK = Math.max(
    1,
    config.environment.ambientTemperatureK + config.physics.pumpInflowTemperatureRiseK,
  );
  const nextAmountRatio = initialState.gasAmountRatio + appliedAmountDelta;
  const gasTemperatureK = nextAmountRatio <= 0
    ? initialState.gasTemperatureK
    : (
        initialState.gasAmountRatio * initialState.gasTemperatureK +
        appliedAmountDelta * inflowTemperatureK
      ) / nextAmountRatio;
  const filledState: HeatCapacityFreePhysicsState = {
    ...initialState,
    gasAmountRatio: nextAmountRatio,
    gasTemperatureK,
    wallTemperatureK: initialState.wallTemperatureK,
    pumpProcesses: [],
    pumpStrokeCount: 0,
  };
  const physical = deriveFreePhysicalState(filledState, createIdealPhysicsConfig(config));
  return {
    ...filledState,
    maxPressureKPa: Math.max(initialState.maxPressureKPa, physical.gasPressureKPa),
  };
};

const getIdealTemperatureToleranceMv = (
  config: HeatCapacityFreeConfigSnapshot,
) => config.record.temperatureAmbientToleranceMv;

const isIdealTemperatureSettled = (
  point: HeatCapacityProcessReferencePoint,
  config: HeatCapacityFreeConfigSnapshot,
) => Math.abs(point.temperatureDeltaK * config.sensor.temperatureMvPerK) <=
  getIdealTemperatureToleranceMv(config);

const calculateIdealReleasePlan = (
  physicsState: HeatCapacityFreePhysicsState,
  physicsConfig: HeatCapacityFreePhysicsConfig,
  config: HeatCapacityFreeConfigSnapshot,
  theoreticalGamma: number,
) => {
  const physical = deriveFreePhysicalState(physicsState, physicsConfig);
  const ambientPressureKPa = physicsConfig.environment.ambientPressureKPa;
  const ambientTemperatureK = physicsConfig.environment.ambientTemperatureK;
  if (
    physical.gasPressureKPa <= ambientPressureKPa ||
    theoreticalGamma <= 1 ||
    !Number.isFinite(theoreticalGamma)
  ) {
    return {
      progress: 0,
      durationS: 0,
      targetAmountRatio: physicsState.gasAmountRatio,
      targetTemperatureK: physicsState.gasTemperatureK,
    };
  }

  const targetTemperatureK = physicsState.gasTemperatureK *
    (ambientPressureKPa / physical.gasPressureKPa) **
      ((physicsConfig.gamma - 1) / physicsConfig.gamma);
  const fullReleaseAmountRatio = ambientTemperatureK / targetTemperatureK;
  const desiredPressureKPa = physical.gasPressureKPa /
    ((physical.gasPressureKPa / ambientPressureKPa) ** (1 / theoreticalGamma));
  const targetRecordTemperatureK = ambientTemperatureK -
    getIdealTemperatureToleranceMv(config) / Math.max(0.000001, config.sensor.temperatureMvPerK);
  const desiredAmountRatio = desiredPressureKPa /
    (ambientPressureKPa * (targetRecordTemperatureK / ambientTemperatureK));
  const denominator = fullReleaseAmountRatio - physicsState.gasAmountRatio;
  const progress = Math.abs(denominator) < 0.000001
    ? 0
    : clampNumber((desiredAmountRatio - physicsState.gasAmountRatio) / denominator, 0, 1);
  return {
    progress,
    durationS: roundNumber(progress * FREE_RELEASE_MAIN_DURATION_S, 2),
    targetAmountRatio: fullReleaseAmountRatio,
    targetTemperatureK,
  };
};

const applyIdealReleaseAtProgress = (
  initialState: HeatCapacityFreePhysicsState,
  releasePlan: ReturnType<typeof calculateIdealReleasePlan>,
  progress: number,
): HeatCapacityFreePhysicsState => {
  const planProgress = releasePlan.progress <= 0
    ? 0
    : releasePlan.progress * smoothStepUnit(progress / releasePlan.progress);
  return {
    ...initialState,
    gasAmountRatio: initialState.gasAmountRatio +
      (releasePlan.targetAmountRatio - initialState.gasAmountRatio) * planProgress,
    gasTemperatureK: initialState.gasTemperatureK +
      (releasePlan.targetTemperatureK - initialState.gasTemperatureK) * planProgress,
    releaseStarted: true,
  };
};

const calculateIdealGamma = (
  config: HeatCapacityFreeConfigSnapshot,
  u1: HeatCapacityProcessReferencePoint | null,
  u2: HeatCapacityProcessReferencePoint | null,
) => {
  if (!u1 || !u2 || u1.pressureDeltaKPa <= u2.pressureDeltaKPa || u2.pressureDeltaKPa <= 0) {
    return null;
  }
  const p0 = config.environment.ambientPressureKPa;
  const p1 = p0 + u1.pressureDeltaKPa;
  const p2 = p0 + u2.pressureDeltaKPa;
  const denominator = Math.log(p1 / p2);
  return denominator > 0 ? roundNumber(Math.log(p1 / p0) / denominator, 6) : null;
};

const calculateRelativeError = (
  gamma: number | null,
  theoreticalGamma: number,
) => (
  gamma !== null && Number.isFinite(gamma) && theoreticalGamma > 0
    ? roundNumber(Math.abs(gamma - theoreticalGamma) / theoreticalGamma * 100, 2)
    : null
);

const createIdealReferenceResult = (
  trace: HeatCapacityProcessReferencePoint[],
  stages: HeatCapacityProcessStageSegment[],
  values: {
    gamma: number | null;
    theoreticalGamma: number;
    fillDurationS: number;
    targetPressureMv: number | null;
    targetPressureDeltaKPa: number | null;
    releaseDurationS: number | null;
    u1TimeS: number | null;
    u2TimeS: number | null;
  },
): HeatCapacityIdealReference => ({
  feasible: values.gamma !== null,
  trace,
  stages,
  gamma: values.gamma,
  relativeErrorPercent: calculateRelativeError(values.gamma, values.theoreticalGamma),
  fillDurationS: values.fillDurationS,
  targetPressureMv: values.targetPressureMv,
  targetPressureDeltaKPa: values.targetPressureDeltaKPa,
  releaseDurationS: values.releaseDurationS,
  u1TimeS: values.u1TimeS,
  u2TimeS: values.u2TimeS,
  assumptions: ASSUMPTIONS,
  explanation: EXPLANATION,
});

const simulateIdealCandidate = (
  config: HeatCapacityFreeConfigSnapshot,
  theoreticalGamma: number,
): HeatCapacityIdealReference => {
  const physicsConfig = createIdealPhysicsConfig(config);
  const initialState = createDefaultFreePhysicsState(physicsConfig);
  const targetPressureMv = getTargetPressureMv(config);
  const targetPressureDeltaKPa = getTargetPressureDeltaKPa(config);
  const fillDurationS = getFillDurationS(config, targetPressureDeltaKPa);
  const trace: HeatCapacityProcessReferencePoint[] = [];
  const stages: HeatCapacityProcessStageSegment[] = [];
  let timeS = 0;
  let sampleIndex = 1;
  let physicsState = initialState;
  let u1Point: HeatCapacityProcessReferencePoint | null = null;
  let u2Point: HeatCapacityProcessReferencePoint | null = null;
  let controls: HeatCapacityFreeControls = {
    powerOn: true,
    pumpValveOpen: false,
    stopcockOpen: true,
  };

  const pushPoint = (stageId: HeatCapacityProcessStageId) => {
    const point = toIdealPoint(`ideal-reference-${sampleIndex}`, stageId, timeS, physicsState, physicsConfig);
    sampleIndex += 1;
    trace.push(point);
    return point;
  };

  const step = (stageId: HeatCapacityProcessStageId) => {
    timeS = roundNumber(timeS + STEP_S, 2);
    physicsState = stepFreePhysics(physicsState, physicsConfig, controls, STEP_S, timeS);
    return pushPoint(stageId);
  };

  const zeroStartS = timeS;
  pushPoint('zero');
  while (timeS + STEP_S <= ZERO_DURATION_S + 0.000001) {
    step('zero');
  }
  stages.push(createStage('zero', '基线', zeroStartS, timeS));

  const fillStartS = timeS;
  controls = { powerOn: true, pumpValveOpen: false, stopcockOpen: false };
  while (timeS < fillStartS + fillDurationS - 0.000001) {
    timeS = roundNumber(timeS + STEP_S, 2);
    const progress = clampNumber((timeS - fillStartS) / fillDurationS, 0, 1);
    physicsState = applyIdealFillAtProgress(initialState, config, targetPressureDeltaKPa, progress);
    pushPoint('fill');
  }
  stages.push(createStage('fill', '快速充气', fillStartS, timeS, {
    durationText: `${roundNumber(fillDurationS, 2)} s`,
  }));

  const stabilizeStartS = timeS;
  let stabilizeElapsedS = 0;
  do {
    u1Point = step('stabilize');
    stabilizeElapsedS = timeS - stabilizeStartS;
  } while (
    stabilizeElapsedS < MAX_STABILIZE_S &&
    !isIdealTemperatureSettled(u1Point, config)
  );
  stages.push(createStage('stabilize', '首次回温稳定', stabilizeStartS, timeS));

  const releaseStartS = timeS;
  const releaseStartState = physicsState;
  const releasePlan = calculateIdealReleasePlan(releaseStartState, physicsConfig, config, theoreticalGamma);
  const releaseDurationS = releasePlan.durationS;
  const releaseEndS = roundNumber(releaseStartS + releaseDurationS, 2);
  while (timeS < releaseEndS - 0.000001) {
    timeS = Math.min(releaseEndS, roundNumber(timeS + STEP_S, 2));
    const elapsedS = Math.max(0, timeS - releaseStartS);
    const atReleaseEnd = Math.abs(timeS - releaseEndS) <= 0.000001;
    const progress = atReleaseEnd
      ? releasePlan.progress
      : clampNumber(
        elapsedS / FREE_RELEASE_MAIN_DURATION_S,
        0,
        releasePlan.progress,
      );
    physicsState = applyIdealReleaseAtProgress(releaseStartState, releasePlan, progress);
    pushPoint('release');
  }
  stages.push(createStage('release', '快速放气', releaseStartS, timeS, {
    durationText: `${roundNumber(releaseDurationS, 2)} s`,
  }));

  const recoverStartS = timeS;
  controls = { powerOn: true, pumpValveOpen: false, stopcockOpen: false };
  let recoverElapsedS = 0;
  do {
    u2Point = step('recover');
    recoverElapsedS = timeS - recoverStartS;
  } while (
    recoverElapsedS < MAX_RECOVER_S &&
    !isIdealTemperatureSettled(u2Point, config)
  );
  stages.push(createStage('recover', '再次回温稳定', recoverStartS, timeS));

  const gamma = calculateIdealGamma(config, u1Point, u2Point);
  return createIdealReferenceResult(trace, stages, {
    gamma,
    theoreticalGamma,
    fillDurationS,
    targetPressureMv,
    targetPressureDeltaKPa: roundNumber(targetPressureDeltaKPa, 3),
    releaseDurationS,
    u1TimeS: u1Point?.timeS ?? null,
    u2TimeS: u2Point?.timeS ?? null,
  });
};

export const createHeatCapacityIdealReference = (
  config: HeatCapacityFreeConfigSnapshot,
  theoreticalGamma = 1.4,
): HeatCapacityIdealReference => simulateIdealCandidate(config, theoreticalGamma);
