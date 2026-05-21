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

export interface HeatCapacityStandardReferenceRecord {
  timeS: number;
  pressureDeltaKPa: number;
  temperatureDeltaK: number;
}

export interface HeatCapacityStandardReference {
  noiseMv: 0;
  trace: HeatCapacityProcessReferencePoint[];
  stages: HeatCapacityProcessStageSegment[];
  records: {
    u0: HeatCapacityStandardReferenceRecord | null;
    u1: HeatCapacityStandardReferenceRecord | null;
    u2: HeatCapacityStandardReferenceRecord | null;
  };
}

const STEP_S = 0.2;
const PUMP_INTERVAL_S = 0.8;
const RELEASE_DURATION_S = 0.7;
const MAX_PUMP_STROKES = 24;
const MAX_STABILIZE_S = 90;
const MAX_RECOVER_S = 90;
const ZERO_DURATION_S = 4;

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

const createReferenceSensorConfig = (
  config: HeatCapacityFreeConfigSnapshot,
): HeatCapacityFreeSensorConfig => ({
  ...config.sensor,
  noiseMv: 0,
});

const createReferenceCalibration = (): HeatCapacityFreeCalibrationState => ({
  calibrationVersion: 0,
  zeroOffsetMv: 0,
  zeroEvents: [],
  automaticU0: null,
});

const getReferenceTargetPressureMv = (config: HeatCapacityFreeConfigSnapshot) => {
  const lower = config.record.minimumUsefulU1CorrectedMv;
  const upper = Math.max(
    lower + 10,
    Math.min(config.record.pressureDangerMv * 0.82, config.record.pressureDangerMv - 25),
  );
  return (lower + upper) / 2;
};

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

const toRecord = (
  point: HeatCapacityProcessReferencePoint | null,
): HeatCapacityStandardReferenceRecord | null => (
  point
    ? {
      timeS: point.timeS,
      pressureDeltaKPa: point.pressureDeltaKPa,
      temperatureDeltaK: point.temperatureDeltaK,
    }
    : null
);

const createStage = (
  id: HeatCapacityProcessStageId,
  label: string,
  startS: number,
  endS: number,
): HeatCapacityProcessStageSegment => ({
  id,
  label,
  startS: roundNumber(startS, 2),
  endS: roundNumber(Math.max(endS, startS), 2),
});

export const createHeatCapacityStandardReference = (
  config: HeatCapacityFreeConfigSnapshot,
): HeatCapacityStandardReference => {
  const physicsConfig = createPhysicsConfig(config);
  const sensorConfig = createReferenceSensorConfig(config);
  const calibration = createReferenceCalibration();
  let physicsState = createDefaultFreePhysicsState(physicsConfig);
  let sensorState = createDefaultFreeSensorState('standard-reference', {
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
      `reference-sample-${sampleIndex}`,
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
  let u0Point = sample('zero');
  while (timeS + STEP_S <= ZERO_DURATION_S) {
    u0Point = step('zero');
  }
  stages.push(createStage('zero', 'zero', zeroStartS, timeS));

  const targetPressureMv = getReferenceTargetPressureMv(config);
  const pumpStartS = timeS;
  controls = { powerOn: true, pumpValveOpen: true, stopcockOpen: false };
  let pumpCount = 0;
  let latestPoint = trace[trace.length - 1] ?? null;
  while (
    pumpCount < MAX_PUMP_STROKES &&
    ((latestPoint?.pressureDeltaKPa ?? 0) * config.sensor.pressureMvPerKPa) < targetPressureMv
  ) {
    const result = applyFreePumpStroke(physicsState, physicsConfig, controls, {
      atS: timeS,
      strength: 1,
    });
    physicsState = result.state;
    if (result.accepted) {
      pumpCount += 1;
    } else {
      break;
    }
    const pumpEndS = timeS + PUMP_INTERVAL_S;
    while (timeS + STEP_S <= pumpEndS + 0.000001) {
      latestPoint = step('pump');
    }
  }
  stages.push({
    ...createStage('pump', 'pump', pumpStartS, timeS),
    countText: pumpCount > 0 ? `x${pumpCount}` : undefined,
  });

  const stabilizeStartS = timeS;
  controls = { powerOn: true, pumpValveOpen: false, stopcockOpen: false };
  let u1Point = latestPoint;
  let stabilizeElapsedS = 0;
  do {
    u1Point = step('stabilize');
    stabilizeElapsedS = timeS - stabilizeStartS;
  } while (
    stabilizeElapsedS < MAX_STABILIZE_S &&
    (
      stabilizeElapsedS < 6 ||
      Math.abs(
        (u1Point.temperatureDeltaK * config.sensor.temperatureMvPerK),
      ) > config.record.temperatureAmbientToleranceMv
    )
  );
  stages.push(createStage('stabilize', 'stabilize', stabilizeStartS, timeS));

  const releaseStartS = timeS;
  controls = { powerOn: true, pumpValveOpen: false, stopcockOpen: true };
  while (timeS < releaseStartS + RELEASE_DURATION_S - 0.000001) {
    step('release');
  }
  stages.push({
    ...createStage('release', 'release', releaseStartS, timeS),
    durationText: `${roundNumber(timeS - releaseStartS, 1)} s`,
  });

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
      Math.abs(
        (u2Point.temperatureDeltaK * config.sensor.temperatureMvPerK),
      ) > config.record.temperatureAmbientToleranceMv
    )
  );
  stages.push(createStage('recover', 'recover', recoverStartS, timeS));

  return {
    noiseMv: 0,
    trace,
    stages,
    records: {
      u0: toRecord(u0Point),
      u1: toRecord(u1Point),
      u2: toRecord(u2Point),
    },
  };
};

export const alignStandardReferenceToStages = (
  reference: Pick<HeatCapacityStandardReference, 'trace' | 'stages'>,
  userStages: HeatCapacityProcessStageSegment[],
): HeatCapacityProcessReferencePoint[] => reference.trace.flatMap((point) => {
  const referenceStage = reference.stages.find((stage) => stage.id === point.stageId);
  const userStage = userStages.find((stage) => stage.id === point.stageId);
  if (!referenceStage || !userStage || referenceStage.endS <= referenceStage.startS) {
    return [];
  }
  const ratio = (point.timeS - referenceStage.startS) /
    (referenceStage.endS - referenceStage.startS);
  return [{
    ...point,
    timeS: roundNumber(userStage.startS + ratio * (userStage.endS - userStage.startS), 2),
  }];
});
