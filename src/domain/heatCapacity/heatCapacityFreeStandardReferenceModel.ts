import {
  HEAT_CAPACITY_STANDARD_OPERATION,
} from './heatCapacityDefaultConfig.ts';
import {
  type HeatCapacityFreeCalibrationState,
} from './heatCapacityFreeCalibrationModel.ts';
import {
  applyFreePumpStroke,
  createDefaultFreePhysicsState,
  deriveFreePhysicalState,
  stepFreePhysics,
  type HeatCapacityFreeControls,
  type HeatCapacityFreePhysicsConfig,
  type HeatCapacityFreePhysicsState,
} from './heatCapacityFreePhysicsEngine.ts';
import {
  createDefaultFreeSensorState,
  getFreeSensorDisplay,
  stepFreeSensor,
  type HeatCapacityFreeSensorConfig,
  type HeatCapacityFreeSensorState,
} from './heatCapacityFreeSensorModel.ts';
import {
  calculateFreeHeatCapacityTrialSignals,
  normalizeHeatCapacityFreeRecordInput,
  type HeatCapacityFreeTrial,
} from './heatCapacityFreeTrialModel.ts';
import {
  getHeatCapacityFreeGasTypeGamma,
} from './heatCapacityGasTheory.ts';
import {
  calculateHeatCapacityRelativeErrorPercent,
} from './heatCapacityFreeProcessMetrics.ts';
import type {
  HeatCapacityFreeConfigSnapshot,
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

export const HEAT_CAPACITY_STANDARD_REFERENCE_GENERATOR_VERSION = 'free-standard-reference-v2' as const;

export interface HeatCapacityStandardReferenceAssumptions {
  operationMode: 'standard-operation';
  disturbancesPreserved: true;
  stageAligned: true;
}

export interface HeatCapacityStandardReferenceSummary {
  feasible: boolean;
  seed: number;
  gamma: number | null;
  relativeErrorPercent: number | null;
  targetPressureMv: number | null;
  targetPressureDeltaKPa: number | null;
  releaseDurationS: number | null;
  u1TimeS: number | null;
  u2TimeS: number | null;
  assumptions: HeatCapacityStandardReferenceAssumptions;
  explanation: {
    operation: string;
    windows: string;
  };
}

export interface HeatCapacityFreeStandardReference extends HeatCapacityStandardReferenceSummary {
  generatorVersion: typeof HEAT_CAPACITY_STANDARD_REFERENCE_GENERATOR_VERSION;
  operationPreset: typeof HEAT_CAPACITY_STANDARD_OPERATION;
  configSnapshot: HeatCapacityFreeConfigSnapshot;
  trace: HeatCapacityProcessReferencePoint[];
  stages: HeatCapacityProcessStageSegment[];
  recordWindows: HeatCapacityBestRecordWindow[];
  summary: HeatCapacityStandardReferenceSummary;
  operationUpperBound: HeatCapacityOperationUpperBound;
}

export type HeatCapacityFreeStandardReferenceSnapshot = HeatCapacityFreeStandardReference;

export interface CreateHeatCapacityFreeStandardReferenceInput {
  traceTrial: HeatCapacityFreeTraceTrial;
  trial: HeatCapacityFreeTrial;
  theoreticalGamma?: number;
}

interface StandardRunState {
  timeS: number;
  physics: HeatCapacityFreePhysicsState;
  sensor: HeatCapacityFreeSensorState;
  calibration: HeatCapacityFreeCalibrationState;
}

const ZERO_DURATION_S = 1.2;
const SAMPLE_STEP_S = 0.2;
const SIMULATION_STEP_S = 0.05;
const DEFAULT_STANDARD_REFERENCE_THEORETICAL_GAMMA = getHeatCapacityFreeGasTypeGamma('air');

const ASSUMPTIONS: HeatCapacityStandardReferenceAssumptions = {
  operationMode: 'standard-operation',
  disturbancesPreserved: true,
  stageAligned: true,
};

const CLOSED_CONTROLS: HeatCapacityFreeControls = {
  pumpValveOpen: false,
  stopcockOpen: false,
};

const PUMP_CONTROLS: HeatCapacityFreeControls = {
  pumpValveOpen: true,
  stopcockOpen: false,
};

const RELEASE_CONTROLS: HeatCapacityFreeControls = {
  pumpValveOpen: false,
  stopcockOpen: true,
  stopcockFlowPurpose: 'release',
};

const roundNumber = (value: number | null, digits = 2) => {
  if (value === null || !Number.isFinite(value)) return null;
  return Number(value.toFixed(digits));
};

const roundFinite = (value: number, digits = 2) => (
  Number.isFinite(value) ? Number(value.toFixed(digits)) : value
);

const hashText = (text: string) => {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const createSeed = (
  traceTrial: HeatCapacityFreeTraceTrial,
  trial: HeatCapacityFreeTrial,
  theoreticalGamma: number,
) => hashText([
  HEAT_CAPACITY_STANDARD_REFERENCE_GENERATOR_VERSION,
  traceTrial.id,
  trial.id,
  traceTrial.configSnapshot.version,
  traceTrial.configSnapshot.scoring.processScoringVersion,
  theoreticalGamma,
  JSON.stringify(HEAT_CAPACITY_STANDARD_OPERATION),
].join(':'));

const createPhysicsConfig = (
  snapshot: HeatCapacityFreeConfigSnapshot,
): HeatCapacityFreePhysicsConfig => ({
  environment: { ...snapshot.environment },
  vesselVolumeL: snapshot.physics.vesselVolumeL,
  gamma: snapshot.physics.gamma,
  pumpAmountGainRatio: snapshot.physics.pumpAmountGainRatio,
  pumpPressureLimitKPa: snapshot.physics.pumpPressureLimitKPa,
  stopcockFlowRate: snapshot.physics.stopcockFlowRate,
  thermal: { ...snapshot.physics.thermal },
  pumpValveExchange: snapshot.physics.pumpValveExchange
    ? { ...snapshot.physics.pumpValveExchange }
    : undefined,
  environmentDisturbance: snapshot.physics.environmentDisturbance
    ? { ...snapshot.physics.environmentDisturbance }
    : undefined,
  leakage: { ...snapshot.physics.leakage },
});

const createSensorConfig = (
  snapshot: HeatCapacityFreeConfigSnapshot,
): HeatCapacityFreeSensorConfig => ({
  pressureMvPerKPa: snapshot.sensor.pressureMvPerKPa,
  temperatureMvAtAmbient: snapshot.sensor.temperatureMvAtAmbient,
  temperatureMvPerK: snapshot.sensor.temperatureMvPerK,
  lagRate: snapshot.sensor.lagRate,
  noiseMv: snapshot.sensor.noiseMv,
  quantizationMv: snapshot.sensor.quantizationMv,
  minSampleIntervalS: snapshot.sensor.minSampleIntervalS,
  maxSampleIntervalS: snapshot.sensor.maxSampleIntervalS,
  historyWindowS: snapshot.sensor.historyWindowS,
  pressureNonlinearity: snapshot.sensor.pressureNonlinearity
    ? { ...snapshot.sensor.pressureNonlinearity }
    : undefined,
});

const createCalibrationState = (
  sensorConfig: HeatCapacityFreeSensorConfig,
): HeatCapacityFreeCalibrationState => ({
  calibrationVersion: 1,
  zeroOffsetMv: 0,
  zeroEvents: [{
    id: 'standard-zero',
    atS: 0,
    displayPressureMv: 0,
    displayTemperatureMv: sensorConfig.temperatureMvAtAmbient,
    zeroOffsetMv: 0,
    source: 'auto',
  }],
  automaticU0: {
    displayPressureMv: 0,
    displayTemperatureMv: sensorConfig.temperatureMvAtAmbient,
    calibrationVersion: 1,
    zeroEventId: 'standard-zero',
    atS: 0,
  },
});

const createInitialRun = (
  snapshot: HeatCapacityFreeConfigSnapshot,
  physicsConfig: HeatCapacityFreePhysicsConfig,
  sensorConfig: HeatCapacityFreeSensorConfig,
  seed: number,
): StandardRunState => ({
  timeS: 0,
  physics: createDefaultFreePhysicsState(physicsConfig, `standard-physics-${seed}`),
  sensor: createDefaultFreeSensorState(`standard-sensor-${seed}`, {
    pressureMv: 0,
    pressureInitialBiasMv: 0,
    temperatureMv: snapshot.sensor.temperatureMvAtAmbient,
  }),
  calibration: createCalibrationState(sensorConfig),
});

const stepRun = (
  run: StandardRunState,
  physicsConfig: HeatCapacityFreePhysicsConfig,
  sensorConfig: HeatCapacityFreeSensorConfig,
  controls: HeatCapacityFreeControls,
  dtS: number,
) => {
  const timeS = roundFinite(run.timeS + dtS, 6);
  const physics = stepFreePhysics(run.physics, physicsConfig, controls, dtS, timeS);
  const derived = deriveFreePhysicalState(physics, physicsConfig);
  const sensor = stepFreeSensor(
    run.sensor,
    {
      gasPressureKPa: derived.gasPressureKPa,
      pressureDeltaKPa: derived.pressureDeltaKPa,
      gasTemperatureK: physics.gasTemperatureK,
      ambientTemperatureK: physicsConfig.environment.ambientTemperatureK,
    },
    run.calibration,
    sensorConfig,
    timeS,
  );
  return {
    ...run,
    timeS,
    physics,
    sensor,
  };
};

const createPoint = (
  run: StandardRunState,
  snapshot: HeatCapacityFreeConfigSnapshot,
  stageId: HeatCapacityProcessStageId,
  sampleIndex: number,
): HeatCapacityProcessReferencePoint => {
  const display = getFreeSensorDisplay(run.sensor, run.calibration, {
    quantizationMv: snapshot.sensor.quantizationMv,
  });
  return {
    sampleId: `standard-${sampleIndex}`,
    stageId,
    timeS: roundFinite(run.timeS, 2),
    pressureDeltaKPa: roundFinite(
      display.displayPressureMv / Math.max(0.000001, snapshot.sensor.pressureMvPerKPa),
      3,
    ),
    temperatureDeltaK: roundFinite(
      (display.displayTemperatureMv - snapshot.sensor.temperatureMvAtAmbient) /
        Math.max(0.000001, snapshot.sensor.temperatureMvPerK),
      3,
    ),
  };
};

const shouldSampleAt = (
  timeS: number,
  nextSampleAtS: number,
  endS: number,
) => timeS >= nextSampleAtS - 1e-9 || timeS >= endS - 1e-9;

const advanceRun = (
  input: {
    run: StandardRunState;
    physicsConfig: HeatCapacityFreePhysicsConfig;
    sensorConfig: HeatCapacityFreeSensorConfig;
    snapshot: HeatCapacityFreeConfigSnapshot;
    trace: HeatCapacityProcessReferencePoint[];
    stageId: HeatCapacityProcessStageId;
    controls: HeatCapacityFreeControls;
    endS: number;
    nextSampleAtS: number;
    sampleIndex: number;
  },
) => {
  let {
    run,
    nextSampleAtS,
    sampleIndex,
  } = input;
  while (run.timeS < input.endS - 1e-9) {
    const dtS = Math.min(SIMULATION_STEP_S, input.endS - run.timeS);
    run = stepRun(run, input.physicsConfig, input.sensorConfig, input.controls, dtS);
    if (shouldSampleAt(run.timeS, nextSampleAtS, input.endS)) {
      input.trace.push(createPoint(run, input.snapshot, input.stageId, sampleIndex));
      sampleIndex += 1;
      nextSampleAtS = roundFinite(nextSampleAtS + SAMPLE_STEP_S, 6);
    }
  }
  return {
    run,
    nextSampleAtS,
    sampleIndex,
  };
};

const createStage = (
  id: HeatCapacityProcessStageId,
  label: string,
  startS: number,
  endS: number,
  extras: Partial<HeatCapacityProcessStageSegment> = {},
): HeatCapacityProcessStageSegment => ({
  id,
  label,
  startS: roundFinite(startS, 3),
  endS: roundFinite(Math.max(startS, endS), 3),
  ...extras,
});

const createWindow = (
  recordId: HeatCapacityProcessRecordId,
  run: StandardRunState,
  snapshot: HeatCapacityFreeConfigSnapshot,
  qualityScore: number,
  reason: string,
): HeatCapacityBestRecordWindow => {
  const display = getFreeSensorDisplay(run.sensor, run.calibration, {
    quantizationMv: snapshot.sensor.quantizationMv,
  });
  const pressureDeltaKPa = display.displayPressureMv /
    Math.max(0.000001, snapshot.sensor.pressureMvPerKPa);
  const temperatureDeltaK = (display.displayTemperatureMv - snapshot.sensor.temperatureMvAtAmbient) /
    Math.max(0.000001, snapshot.sensor.temperatureMvPerK);
  return {
    recordId,
    startS: roundFinite(Math.max(0, run.timeS - 1), 2),
    endS: roundFinite(run.timeS + 1, 2),
    recommendedSampleId: `standard-${recordId}`,
    recommendedTimeS: roundFinite(run.timeS, 2),
    displayPressureMv: roundNumber(display.displayPressureMv, 2),
    displayTemperatureMv: roundNumber(display.displayTemperatureMv, 2),
    pressureDeltaKPa: roundNumber(pressureDeltaKPa, 3),
    temperatureDeltaK: roundNumber(temperatureDeltaK, 3),
    qualityScore,
    source: 'standard-operation',
    reason,
  };
};

const createStandardRecordTrial = (
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

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

const cloneConfigSnapshot = (
  snapshot: HeatCapacityFreeConfigSnapshot,
): HeatCapacityFreeConfigSnapshot => ({
  version: snapshot.version,
  environment: { ...snapshot.environment },
  physics: {
    ...snapshot.physics,
    thermal: { ...snapshot.physics.thermal },
    pumpValveExchange: snapshot.physics.pumpValveExchange
      ? { ...snapshot.physics.pumpValveExchange }
      : undefined,
    environmentDisturbance: snapshot.physics.environmentDisturbance
      ? { ...snapshot.physics.environmentDisturbance }
      : undefined,
    leakage: { ...snapshot.physics.leakage },
  },
  sensor: { ...snapshot.sensor },
  record: { ...snapshot.record },
  scoring: { ...snapshot.scoring },
});

export const cloneHeatCapacityFreeStandardReferenceSnapshot = (
  snapshot: HeatCapacityFreeStandardReferenceSnapshot,
): HeatCapacityFreeStandardReferenceSnapshot => ({
  ...snapshot,
  operationPreset: { ...snapshot.operationPreset },
  configSnapshot: cloneConfigSnapshot(snapshot.configSnapshot),
  trace: snapshot.trace.map((point) => ({ ...point })),
  stages: snapshot.stages.map((stage) => ({ ...stage })),
  recordWindows: snapshot.recordWindows.map((window) => ({ ...window })),
  summary: {
    ...snapshot.summary,
    assumptions: { ...snapshot.summary.assumptions },
    explanation: { ...snapshot.summary.explanation },
  },
  operationUpperBound: {
    ...snapshot.operationUpperBound,
    windows: snapshot.operationUpperBound.windows.map((window) => ({ ...window })),
  },
});

export const normalizeHeatCapacityFreeStandardReferenceSnapshot = (
  value: unknown,
): HeatCapacityFreeStandardReferenceSnapshot | null => {
  if (!isRecord(value)) return null;
  if (value.generatorVersion !== HEAT_CAPACITY_STANDARD_REFERENCE_GENERATOR_VERSION) return null;
  if (!isRecord(value.configSnapshot)) return null;
  if (!Array.isArray(value.trace) || !Array.isArray(value.stages) || !Array.isArray(value.recordWindows)) {
    return null;
  }
  if (!isRecord(value.summary) || !isRecord(value.operationUpperBound)) return null;
  return cloneHeatCapacityFreeStandardReferenceSnapshot(value as unknown as HeatCapacityFreeStandardReferenceSnapshot);
};

export const createHeatCapacityFreeStandardReference = ({
  traceTrial,
  trial,
  theoreticalGamma = DEFAULT_STANDARD_REFERENCE_THEORETICAL_GAMMA,
}: CreateHeatCapacityFreeStandardReferenceInput): HeatCapacityFreeStandardReference => {
  const snapshot = traceTrial.configSnapshot;
  const physicsConfig = createPhysicsConfig(snapshot);
  const sensorConfig = createSensorConfig(snapshot);
  const seed = createSeed(traceTrial, trial, theoreticalGamma);
  const trace: HeatCapacityProcessReferencePoint[] = [];
  let run = createInitialRun(snapshot, physicsConfig, sensorConfig, seed);
  let nextSampleAtS = 0;
  let sampleIndex = 1;

  const recordSample = (stageId: HeatCapacityProcessStageId) => {
    trace.push(createPoint(run, snapshot, stageId, sampleIndex));
    sampleIndex += 1;
    nextSampleAtS = Math.max(nextSampleAtS, roundFinite(run.timeS + SAMPLE_STEP_S, 6));
  };

  const zeroStartS = 0;
  const zeroEndS = ZERO_DURATION_S;
  recordSample('zero');
  ({ run, nextSampleAtS, sampleIndex } = advanceRun({
    run,
    physicsConfig,
    sensorConfig,
    snapshot,
    trace,
    stageId: 'zero',
    controls: CLOSED_CONTROLS,
    endS: zeroEndS,
    nextSampleAtS,
    sampleIndex,
  }));
  const u0Run = run;

  const pumpStartS = zeroEndS;
  const pumpEndS = roundFinite(pumpStartS + HEAT_CAPACITY_STANDARD_OPERATION.pumpTotalDurationS, 2);
  const strokeIntervalS = HEAT_CAPACITY_STANDARD_OPERATION.pumpStrokes > 1
    ? HEAT_CAPACITY_STANDARD_OPERATION.pumpTotalDurationS /
      (HEAT_CAPACITY_STANDARD_OPERATION.pumpStrokes - 1)
    : 0;
  for (let index = 0; index < HEAT_CAPACITY_STANDARD_OPERATION.pumpStrokes; index += 1) {
    const strokeAtS = roundFinite(pumpStartS + strokeIntervalS * index, 6);
    ({ run, nextSampleAtS, sampleIndex } = advanceRun({
      run,
      physicsConfig,
      sensorConfig,
      snapshot,
      trace,
      stageId: 'pump',
      controls: PUMP_CONTROLS,
      endS: strokeAtS,
      nextSampleAtS,
      sampleIndex,
    }));
    const pump = applyFreePumpStroke(run.physics, physicsConfig, PUMP_CONTROLS, {
      atS: run.timeS,
      strength: 1,
    });
    if (pump.accepted) {
      run = { ...run, physics: pump.state };
    }
    recordSample('pump');
  }
  ({ run, nextSampleAtS, sampleIndex } = advanceRun({
    run,
    physicsConfig,
    sensorConfig,
    snapshot,
    trace,
    stageId: 'pump',
    controls: PUMP_CONTROLS,
    endS: pumpEndS,
    nextSampleAtS,
    sampleIndex,
  }));

  const stabilizeStartS = pumpEndS;
  const stabilizeEndS = roundFinite(stabilizeStartS + HEAT_CAPACITY_STANDARD_OPERATION.waitAfterPumpS, 2);
  ({ run, nextSampleAtS, sampleIndex } = advanceRun({
    run,
    physicsConfig,
    sensorConfig,
    snapshot,
    trace,
    stageId: 'stabilize',
    controls: CLOSED_CONTROLS,
    endS: stabilizeEndS,
    nextSampleAtS,
    sampleIndex,
  }));
  const u1Run = run;

  const releaseStartS = stabilizeEndS;
  const releaseEndS = roundFinite(releaseStartS + HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS, 3);
  ({ run, nextSampleAtS, sampleIndex } = advanceRun({
    run,
    physicsConfig,
    sensorConfig,
    snapshot,
    trace,
    stageId: 'release',
    controls: RELEASE_CONTROLS,
    endS: releaseEndS,
    nextSampleAtS,
    sampleIndex,
  }));

  const recoverStartS = releaseEndS;
  const recoverEndS = roundFinite(recoverStartS + HEAT_CAPACITY_STANDARD_OPERATION.waitAfterReleaseS, 3);
  ({ run, nextSampleAtS, sampleIndex } = advanceRun({
    run,
    physicsConfig,
    sensorConfig,
    snapshot,
    trace,
    stageId: 'recover',
    controls: CLOSED_CONTROLS,
    endS: recoverEndS,
    nextSampleAtS,
    sampleIndex,
  }));
  const u2Run = run;

  const recordWindows = [
    createWindow('u0', u0Run, snapshot, 100, '标准调零稳定窗口。'),
    createWindow('u1', u1Run, snapshot, 100, '标准打气后等待 300 s 的记录窗口。'),
    createWindow('u2', u2Run, snapshot, 100, '标准放气后等待 300 s 的记录窗口。'),
  ];
  const standardRecordTrial = createStandardRecordTrial(trial, traceTrial, recordWindows);
  const signals = calculateFreeHeatCapacityTrialSignals(standardRecordTrial, {
    atmosphericPressureKPa: snapshot.environment.ambientPressureKPa,
    pressureSensitivityMvPerKPa: snapshot.sensor.pressureMvPerKPa,
  });
  const gamma = signals?.gamma ?? null;
  const targetPressureMv = recordWindows.find((window) => window.recordId === 'u1')?.displayPressureMv ?? null;
  const summary: HeatCapacityStandardReferenceSummary = {
    feasible: gamma !== null,
    seed,
    gamma,
    relativeErrorPercent: calculateHeatCapacityRelativeErrorPercent(gamma, theoreticalGamma),
    targetPressureMv,
    targetPressureDeltaKPa: targetPressureMv === null
      ? null
      : roundNumber(targetPressureMv / Math.max(0.000001, snapshot.sensor.pressureMvPerKPa), 3),
    releaseDurationS: HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
    u1TimeS: roundFinite(u1Run.timeS, 2),
    u2TimeS: roundFinite(u2Run.timeS, 2),
    assumptions: ASSUMPTIONS,
    explanation: {
      operation: `标准过程使用当前实验参数快照，按固定 ${HEAT_CAPACITY_STANDARD_OPERATION.pumpStrokes} 次打气、${HEAT_CAPACITY_STANDARD_OPERATION.pumpTotalDurationS} s、${HEAT_CAPACITY_STANDARD_OPERATION.waitAfterPumpS} s、${HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS.toFixed(3)} s、${HEAT_CAPACITY_STANDARD_OPERATION.waitAfterReleaseS} s 流程由真实模型生成。`,
      windows: 'U0/U1/U2 显示为固定标准流程对应的记录窗口，不从实际 trace 中反选。',
    },
  };
  const actualGamma = trial.correctedSignals?.gamma ?? null;
  const upperBoundGamma = actualGamma === null
    ? gamma
    : gamma === null
      ? actualGamma
      : Math.max(actualGamma, gamma);
  const operationUpperBound: HeatCapacityOperationUpperBound = {
    gamma: upperBoundGamma,
    relativeErrorPercent: calculateHeatCapacityRelativeErrorPercent(upperBoundGamma, theoreticalGamma),
    gapFromActualPercent: upperBoundGamma === null || actualGamma === null || upperBoundGamma === 0
      ? null
      : roundNumber(Math.abs(upperBoundGamma - actualGamma) / Math.abs(upperBoundGamma) * 100, 2),
    windows: recordWindows,
  };

  const stages = [
    createStage('zero', '调零', zeroStartS, zeroEndS),
    createStage('pump', '标准打气', pumpStartS, pumpEndS, {
      countText: `x${HEAT_CAPACITY_STANDARD_OPERATION.pumpStrokes}`,
      durationText: `${HEAT_CAPACITY_STANDARD_OPERATION.pumpTotalDurationS.toFixed(1)} s`,
    }),
    createStage('stabilize', '回温稳定', stabilizeStartS, stabilizeEndS, {
      durationText: `${HEAT_CAPACITY_STANDARD_OPERATION.waitAfterPumpS} s`,
    }),
    createStage('release', '标准放气', releaseStartS, releaseEndS, {
      durationText: `${HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS.toFixed(3)} s`,
    }),
    createStage('recover', '关阀回温', recoverStartS, recoverEndS, {
      durationText: `${HEAT_CAPACITY_STANDARD_OPERATION.waitAfterReleaseS} s`,
    }),
  ];

  return {
    ...summary,
    generatorVersion: HEAT_CAPACITY_STANDARD_REFERENCE_GENERATOR_VERSION,
    operationPreset: { ...HEAT_CAPACITY_STANDARD_OPERATION },
    configSnapshot: snapshot,
    trace,
    stages,
    recordWindows,
    summary,
    operationUpperBound,
  };
};
