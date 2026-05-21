import {
  applyFreePumpStroke,
  createDefaultFreePhysicsState,
  deriveFreePhysicalState,
  stepFreePhysics,
  type HeatCapacityFreeControls,
  type HeatCapacityFreePhysicsConfig,
} from './heatCapacityFreePhysicsEngine.ts';
import type {
  HeatCapacityFreeCalibrationState,
} from './heatCapacityFreeCalibrationModel.ts';
import {
  createDefaultFreeSensorState,
  getFreeSensorDisplay,
  stepFreeSensor,
  type HeatCapacityFreeSensorConfig,
} from './heatCapacityFreeSensorModel.ts';
import type {
  HeatCapacityFreeConfigSnapshot,
} from './heatCapacityFreeTraceModel.ts';
import type {
  HeatCapacityProcessReferencePoint,
  HeatCapacityProcessStageId,
  HeatCapacityProcessStageSegment,
} from './heatCapacityFreeProcessReviewTypes.ts';

export interface HeatCapacityOperableBestReference {
  noiseMv: 0;
  trace: HeatCapacityProcessReferencePoint[];
  stages: HeatCapacityProcessStageSegment[];
  gamma: number | null;
  pumpStrokeCount: number;
  releaseDurationS: number;
}

const STEP_S = 0.2;
const ZERO_DURATION_S = 4;
const MAX_STABILIZE_S = 72;
const MAX_RECOVER_S = 72;
const PUMP_STROKE_CANDIDATES = [6, 7, 8, 9, 10, 11, 12];
const PUMP_INTERVAL_CANDIDATES = [0.7, 0.9, 1.1];
const RELEASE_DURATION_CANDIDATES = [0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 1.0, 1.2];

const roundNumber = (value: number, digits = 2) => (
  Number.isFinite(value) ? Number(value.toFixed(digits)) : value
);

const createPhysicsConfig = (
  config: HeatCapacityFreeConfigSnapshot,
): HeatCapacityFreePhysicsConfig => ({
  environment: {
    ambientPressureKPa: config.environment.ambientPressureKPa,
    ambientTemperatureK: config.environment.ambientTemperatureK,
  },
  ...config.physics,
});

const createSensorConfig = (
  config: HeatCapacityFreeConfigSnapshot,
): HeatCapacityFreeSensorConfig => ({
  ...config.sensor,
  noiseMv: 0,
});

const createCalibration = (): HeatCapacityFreeCalibrationState => ({
  calibrationVersion: 0,
  zeroOffsetMv: 0,
  zeroEvents: [],
  automaticU0: null,
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

const toReferencePoint = (
  id: string,
  stageId: HeatCapacityProcessStageId,
  timeS: number,
  displayPressureMv: number,
  displayTemperatureMv: number,
  config: HeatCapacityFreeConfigSnapshot,
): HeatCapacityProcessReferencePoint => ({
  sampleId: id,
  stageId,
  timeS: roundNumber(timeS, 2),
  pressureDeltaKPa: roundNumber(displayPressureMv / config.sensor.pressureMvPerKPa, 3),
  temperatureDeltaK: roundNumber(
    (displayTemperatureMv - config.sensor.temperatureMvAtAmbient) /
      config.sensor.temperatureMvPerK,
    3,
  ),
});

const calculateGamma = (
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

const findLastPointByStage = (
  trace: HeatCapacityProcessReferencePoint[],
  stageId: HeatCapacityProcessStageId,
) => {
  for (let index = trace.length - 1; index >= 0; index -= 1) {
    if (trace[index].stageId === stageId) {
      return trace[index];
    }
  }
  return null;
};

const simulateCandidate = (
  config: HeatCapacityFreeConfigSnapshot,
  pumpStrokeCount: number,
  pumpIntervalS: number,
  releaseDurationS: number,
): HeatCapacityOperableBestReference => {
  const physicsConfig = createPhysicsConfig(config);
  const sensorConfig = createSensorConfig(config);
  const calibration = createCalibration();
  let physicsState = createDefaultFreePhysicsState(physicsConfig);
  let sensorState = createDefaultFreeSensorState('operable-best', {
    pressureMv: 0,
    pressureInitialBiasMv: 0,
    temperatureMv: config.sensor.temperatureMvAtAmbient,
  });
  let controls: HeatCapacityFreeControls = {
    powerOn: true,
    pumpValveOpen: false,
    stopcockOpen: true,
  };
  let timeS = 0;
  let sampleIndex = 1;
  const trace: HeatCapacityProcessReferencePoint[] = [];
  const stages: HeatCapacityProcessStageSegment[] = [];

  const sample = (stageId: HeatCapacityProcessStageId) => {
    const physical = deriveFreePhysicalState(physicsState, physicsConfig);
    sensorState = stepFreeSensor(sensorState, {
      gasPressureKPa: physical.gasPressureKPa,
      pressureDeltaKPa: physical.pressureDeltaKPa,
      gasTemperatureK: physicsState.gasTemperatureK,
    }, calibration, sensorConfig, timeS);
    const display = getFreeSensorDisplay(sensorState, calibration, sensorConfig);
    const point = toReferencePoint(
      `operable-best-${sampleIndex}`,
      stageId,
      timeS,
      display.displayPressureMv,
      display.displayTemperatureMv,
      config,
    );
    sampleIndex += 1;
    trace.push(point);
    return point;
  };

  const step = (stageId: HeatCapacityProcessStageId) => {
    timeS = roundNumber(timeS + STEP_S, 2);
    physicsState = stepFreePhysics(physicsState, physicsConfig, controls, STEP_S, timeS);
    return sample(stageId);
  };

  const zeroStartS = timeS;
  sample('zero');
  while (timeS + STEP_S <= ZERO_DURATION_S) {
    step('zero');
  }
  stages.push(createStage('zero', '调零', zeroStartS, timeS));

  const pumpStartS = timeS;
  controls = { powerOn: true, pumpValveOpen: true, stopcockOpen: false };
  let acceptedPumpCount = 0;
  for (let index = 0; index < pumpStrokeCount; index += 1) {
    const result = applyFreePumpStroke(physicsState, physicsConfig, controls, {
      atS: timeS,
      strength: 1,
    });
    physicsState = result.state;
    if (result.accepted) {
      acceptedPumpCount += 1;
    }
    const pumpEndS = timeS + pumpIntervalS;
    while (timeS + STEP_S <= pumpEndS + 0.000001) {
      step('pump');
    }
  }
  stages.push(createStage('pump', '打气', pumpStartS, timeS, {
    countText: acceptedPumpCount > 0 ? `x${acceptedPumpCount}` : undefined,
  }));

  const stabilizeStartS = timeS;
  controls = { powerOn: true, pumpValveOpen: false, stopcockOpen: false };
  let u1Point = trace[trace.length - 1] ?? null;
  let stabilizeElapsedS = 0;
  do {
    u1Point = step('stabilize');
    stabilizeElapsedS = timeS - stabilizeStartS;
  } while (
    stabilizeElapsedS < MAX_STABILIZE_S &&
    (
      stabilizeElapsedS < 6 ||
      Math.abs(u1Point.temperatureDeltaK * config.sensor.temperatureMvPerK) >
        config.record.temperatureAmbientToleranceMv
    )
  );
  stages.push(createStage('stabilize', '回温稳定', stabilizeStartS, timeS));

  const releaseStartS = timeS;
  controls = { powerOn: true, pumpValveOpen: false, stopcockOpen: true };
  while (timeS < releaseStartS + releaseDurationS - 0.000001) {
    step('release');
  }
  stages.push(createStage('release', '开阀放气', releaseStartS, timeS, {
    durationText: `${roundNumber(timeS - releaseStartS, 1)} s`,
  }));

  const recoverStartS = timeS;
  controls = { powerOn: true, pumpValveOpen: false, stopcockOpen: false };
  let u2Point = trace[trace.length - 1] ?? null;
  let recoverElapsedS = 0;
  do {
    u2Point = step('recover');
    recoverElapsedS = timeS - recoverStartS;
  } while (
    recoverElapsedS < MAX_RECOVER_S &&
    (
      recoverElapsedS < 8 ||
      Math.abs(u2Point.temperatureDeltaK * config.sensor.temperatureMvPerK) >
        config.record.temperatureAmbientToleranceMv
    )
  );
  stages.push(createStage('recover', '关阀回温', recoverStartS, timeS));

  return {
    noiseMv: 0,
    trace,
    stages,
    gamma: calculateGamma(config, u1Point, u2Point),
    pumpStrokeCount: acceptedPumpCount,
    releaseDurationS: roundNumber(releaseDurationS, 2),
  };
};

const candidatePenalty = (
  config: HeatCapacityFreeConfigSnapshot,
  candidate: HeatCapacityOperableBestReference,
  theoreticalGamma: number,
) => {
  const u1 = findLastPointByStage(candidate.trace, 'stabilize');
  const u2 = findLastPointByStage(candidate.trace, 'recover');
  if (candidate.gamma === null || !u1 || !u2) return Number.POSITIVE_INFINITY;
  const u1Mv = u1.pressureDeltaKPa * config.sensor.pressureMvPerKPa;
  const u2Mv = u2.pressureDeltaKPa * config.sensor.pressureMvPerKPa;
  if (
    u1Mv < config.record.minimumUsefulU1CorrectedMv ||
    u1Mv > config.record.pressureDangerMv ||
    u2Mv <= config.record.overVentedMinimumU2CorrectedMv
  ) {
    return Number.POSITIVE_INFINITY;
  }
  const gammaError = Math.abs(candidate.gamma - theoreticalGamma);
  const safetyMarginPenalty = u1Mv > config.record.pressureDangerMv * 0.92 ? 0.08 : 0;
  return gammaError + safetyMarginPenalty;
};

export const createHeatCapacityOperableBestReference = (
  config: HeatCapacityFreeConfigSnapshot,
  theoreticalGamma = 1.4,
): HeatCapacityOperableBestReference => {
  let best: HeatCapacityOperableBestReference | null = null;
  let bestPenalty = Number.POSITIVE_INFINITY;
  for (const pumpStrokeCount of PUMP_STROKE_CANDIDATES) {
    for (const pumpIntervalS of PUMP_INTERVAL_CANDIDATES) {
      for (const releaseDurationS of RELEASE_DURATION_CANDIDATES) {
        const candidate = simulateCandidate(config, pumpStrokeCount, pumpIntervalS, releaseDurationS);
        const penalty = candidatePenalty(config, candidate, theoreticalGamma);
        if (penalty < bestPenalty) {
          best = candidate;
          bestPenalty = penalty;
        }
      }
    }
  }
  return best ?? simulateCandidate(config, 9, 0.9, 0.7);
};
