import {
  applyFreeZeroCalibration,
  captureAutomaticU0IfReady,
  type HeatCapacityFreeCalibrationState,
} from '../../src/domain/heatCapacity/heatCapacityFreeCalibrationModel.ts';
import {
  applyFreePumpStroke,
  createDefaultFreePhysicsState,
  deriveFreePhysicalState,
  stepFreePhysics,
  type HeatCapacityFreeControls,
  type HeatCapacityFreePhysicsConfig,
  type HeatCapacityFreePhysicsState,
} from '../../src/domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';
import {
  createDefaultFreeSensorState,
  getFreeSensorDisplay,
  stepFreeSensor,
  type HeatCapacityFreeSensorConfig,
  type HeatCapacityFreeSensorState,
} from '../../src/domain/heatCapacity/heatCapacityFreeSensorModel.ts';
import {
  createHeatCapacityFreeTrial,
  type HeatCapacityFreeTrial,
} from '../../src/domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import {
  getHeatCapacityFreeGasTypeModelDefaults,
  type HeatCapacityFreeGasType,
} from '../../src/domain/heatCapacity/heatCapacityFreeParameterConfig.ts';
import {
  evaluateFreeU1Record,
  evaluateFreeU2Record,
  recordFreeU0,
  recordFreeU1,
  recordFreeU2,
  type HeatCapacityFreeRecordConfig,
  type HeatCapacityFreeRecordInput,
} from '../../src/domain/heatCapacity/heatCapacityFreeRecordModel.ts';
import {
  DEFAULT_HEAT_CAPACITY_FREE_ENVIRONMENT_CONFIG,
  DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG,
  DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG,
  HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV,
  HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV,
} from '../../src/features/workbench/workbenchState.ts';
import {
  HEAT_CAPACITY_RELEASE_TIMING,
  HEAT_CAPACITY_STANDARD_OPERATION,
} from '../../src/domain/heatCapacity/heatCapacityDefaultConfig.ts';

export type HeatCapacityFreeParameterAcceptanceSafetyStatus = 'normal' | 'warning' | 'danger';
export type HeatCapacityFreeParameterAcceptancePumpMode = 'runtime-strokes' | 'instant-equivalent';
export type HeatCapacityFreeParameterAcceptanceReleaseMode =
  | 'runtime-open-flow'
  | 'instant-adiabatic-to-ambient'
  | 'instant-current-model-equivalent';

export interface HeatCapacityFreeParameterAcceptanceScenarioInput {
  id: string;
  label?: string;
  gasType?: HeatCapacityFreeGasType;
  pumpMode?: HeatCapacityFreeParameterAcceptancePumpMode;
  releaseMode?: HeatCapacityFreeParameterAcceptanceReleaseMode;
  pumpStrokes: number;
  pumpTotalDurationS: number;
  waitAfterPumpS: number;
  openDurationS: number;
  waitAfterReleaseS: number;
  leakageRatePerS?: number;
  leakageEnabled?: boolean;
  pumpValveExchangeEnabled?: boolean;
  environmentDisturbanceEnabled?: boolean;
  instrumentNoiseEnabled?: boolean;
}

export interface HeatCapacityFreeParameterAcceptanceRow {
  id: string;
  label: string;
  pumpMode: HeatCapacityFreeParameterAcceptancePumpMode;
  releaseMode: HeatCapacityFreeParameterAcceptanceReleaseMode;
  pumpStrokes: number;
  pumpTotalDurationS: number;
  openDurationS: number;
  waitAfterPumpS: number;
  waitAfterReleaseS: number;
  leakageEnabled: boolean;
  leakageRatePerS: number;
  u1DisplayMv: number | null;
  u2DisplayMv: number | null;
  u1CorrectedMv: number | null;
  u2CorrectedMv: number | null;
  gamma: number | null;
  pressureKPa: number;
  gasTemperatureK: number;
  gasAmountRatio: number;
  safetyStatus: HeatCapacityFreeParameterAcceptanceSafetyStatus;
  u1Recordable: boolean;
  u2Recordable: boolean;
  u1Reason: string;
  u2Reason: string;
}

export interface HeatCapacityFreeParameterAcceptanceReport {
  rows: HeatCapacityFreeParameterAcceptanceRow[];
}

export interface HeatCapacityFreeParameterAcceptanceOptions {
  scenarios?: HeatCapacityFreeParameterAcceptanceScenarioInput[];
  pumpStrokes?: number[];
  openDurationsS?: number[];
  waitAfterPumpS?: number;
  waitAfterReleaseS?: number;
}

interface ScriptedFreeRun {
  timeS: number;
  physics: HeatCapacityFreePhysicsState;
  sensor: HeatCapacityFreeSensorState;
  calibration: HeatCapacityFreeCalibrationState;
}

export const HEAT_CAPACITY_FREE_PARAMETER_ACCEPTANCE_RECORD_CONFIG = {
  pressureStableSlopeMvPerS: 0.25,
  temperatureStableSlopeMvPerS: 0.12,
  temperatureAmbientToleranceMv: 0.35,
  u0ZeroToleranceMv: 0.12,
  minimumUsefulU1CorrectedMv: 90,
  overVentedMinimumU2CorrectedMv: 0.2,
  pressureDangerMv: HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV,
} satisfies HeatCapacityFreeRecordConfig;

const DEFAULT_PUMP_STROKES = [2, 3, 4, 5];
const DEFAULT_OPEN_DURATIONS_S = [
  HEAT_CAPACITY_RELEASE_TIMING.releaseOptimalMinS / 2,
  HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
  HEAT_CAPACITY_RELEASE_TIMING.releaseOptimalMaxS + 0.5,
];
const DEFAULT_WAIT_AFTER_PUMP_S = 24;
const DEFAULT_WAIT_AFTER_RELEASE_S = 40;
const SIMULATION_STEP_S = 0.1;

const roundNumber = (value: number | null, digits = 2) => (
  value === null || !Number.isFinite(value) ? null : Number(value.toFixed(digits))
);

const clonePhysicsConfig = (
  input: Pick<
    HeatCapacityFreeParameterAcceptanceScenarioInput,
    | 'leakageEnabled'
    | 'leakageRatePerS'
    | 'pumpValveExchangeEnabled'
    | 'environmentDisturbanceEnabled'
    | 'gasType'
  > = {},
): HeatCapacityFreePhysicsConfig => {
  const gasTypeDefaults = input.gasType
    ? getHeatCapacityFreeGasTypeModelDefaults(input.gasType)
    : null;
  return {
    ...DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG,
    environment: { ...DEFAULT_HEAT_CAPACITY_FREE_ENVIRONMENT_CONFIG },
    gamma: gasTypeDefaults?.gamma ?? DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.gamma,
    thermal: {
      ...DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.thermal,
      gasWallConductanceWPerK: gasTypeDefaults?.gasWallConductanceWPerK ??
        DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.thermal.gasWallConductanceWPerK,
    },
    pumpValveExchange: {
      ...DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.pumpValveExchange,
      enabled: input.pumpValveExchangeEnabled ??
        (DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.pumpValveExchange?.enabled === true),
    },
    environmentDisturbance: {
      ...DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.environmentDisturbance,
      enabled: input.environmentDisturbanceEnabled ??
        (DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.environmentDisturbance?.enabled === true),
    },
    leakage: {
      ...DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.leakage,
      enabled: input.leakageEnabled ?? DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.leakage.enabled,
      ratePerS: input.leakageRatePerS ??
        gasTypeDefaults?.leakageRatePerS ??
        DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.leakage.ratePerS,
    },
  };
};

const cloneSensorConfig = (
  instrumentNoiseEnabled = true,
): HeatCapacityFreeSensorConfig => ({
  ...DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG,
  noiseMv: instrumentNoiseEnabled
    ? DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.noiseMv
    : 0,
  pressureNonlinearity: {
    ...DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.pressureNonlinearity,
    enabled: instrumentNoiseEnabled &&
      DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.pressureNonlinearity?.enabled === true,
  },
});

const createInitialCalibration = (
  sensorConfig: HeatCapacityFreeSensorConfig,
): HeatCapacityFreeCalibrationState => {
  let calibration: HeatCapacityFreeCalibrationState = {
    calibrationVersion: 0,
    zeroOffsetMv: 0,
    zeroEvents: [],
    automaticU0: null,
  };
  calibration = applyFreeZeroCalibration(calibration, {
    atS: 0,
    displayPressureMv: 0,
    displayTemperatureMv: sensorConfig.temperatureMvAtAmbient,
    zeroOffsetMv: 0,
    source: 'user',
  });
  calibration = captureAutomaticU0IfReady(calibration, {
    atS: 0.1,
    powerOn: true,
    stopcockOpen: true,
    zeroed: true,
    zeroEventId: 'zero-1',
    pressureStable: true,
    temperatureStable: true,
    displayPressureMv: 0,
    displayTemperatureMv: sensorConfig.temperatureMvAtAmbient,
  });
  return calibration;
};

const createScriptedRun = (
  seed: number | string,
  physicsConfig: HeatCapacityFreePhysicsConfig,
  sensorConfig: HeatCapacityFreeSensorConfig,
): ScriptedFreeRun => ({
  timeS: 0.1,
  physics: createDefaultFreePhysicsState(physicsConfig, seed),
  sensor: createDefaultFreeSensorState(seed, {
    pressureMv: 0,
    pressureInitialBiasMv: 0,
    temperatureMv: sensorConfig.temperatureMvAtAmbient,
  }),
  calibration: createInitialCalibration(sensorConfig),
});

const stepScriptedRun = (
  run: ScriptedFreeRun,
  physicsConfig: HeatCapacityFreePhysicsConfig,
  sensorConfig: HeatCapacityFreeSensorConfig,
  controls: HeatCapacityFreeControls,
  dtS: number,
): ScriptedFreeRun => {
  const timeS = Number((run.timeS + dtS).toFixed(6));
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

const waitScriptedRun = (
  run: ScriptedFreeRun,
  physicsConfig: HeatCapacityFreePhysicsConfig,
  sensorConfig: HeatCapacityFreeSensorConfig,
  controls: HeatCapacityFreeControls,
  seconds: number,
) => {
  let current = run;
  for (let elapsedS = 0; elapsedS < seconds; elapsedS += SIMULATION_STEP_S) {
    current = stepScriptedRun(
      current,
      physicsConfig,
      sensorConfig,
      controls,
      Math.min(SIMULATION_STEP_S, seconds - elapsedS),
    );
  }
  return current;
};

const getSafetyStatus = (
  pressureMv: number | null,
): HeatCapacityFreeParameterAcceptanceSafetyStatus => {
  if (pressureMv === null) {
    return 'normal';
  }
  if (pressureMv >= HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV) {
    return 'danger';
  }
  if (pressureMv >= HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV) {
    return 'warning';
  }
  return 'normal';
};

const createOfficialU0Trial = (
  id: string,
  calibration: HeatCapacityFreeCalibrationState,
): HeatCapacityFreeTrial => {
  const automaticU0 = calibration.automaticU0;
  if (!automaticU0) {
    throw new Error('Free parameter acceptance requires an automatic U0 candidate.');
  }
  const record = recordFreeU0(createHeatCapacityFreeTrial(id, automaticU0), {
    atS: automaticU0.atS,
    displayPressureMv: automaticU0.displayPressureMv,
    displayTemperatureMv: automaticU0.displayTemperatureMv,
    calibrationVersion: automaticU0.calibrationVersion,
    zeroEventId: automaticU0.zeroEventId,
  });
  if (!record.accepted) {
    throw new Error(`Free parameter acceptance failed to create official U0: ${record.reason}`);
  }
  return record.trial;
};

const createRecordInput = (
  run: ScriptedFreeRun,
): HeatCapacityFreeRecordInput => ({
  atS: run.timeS,
  displayPressureMv: run.sensor.displayPressureMv,
  displayTemperatureMv: run.sensor.displayTemperatureMv,
  calibrationVersion: run.calibration.calibrationVersion,
  zeroEventId: run.calibration.zeroEvents[run.calibration.zeroEvents.length - 1]?.id ?? '',
});

const pumpScriptedRun = (
  run: ScriptedFreeRun,
  physicsConfig: HeatCapacityFreePhysicsConfig,
  sensorConfig: HeatCapacityFreeSensorConfig,
  strokes: number,
  pumpTotalDurationS = 0,
) => {
  let current = run;
  const intervalS = strokes > 1
    ? Math.max(0, pumpTotalDurationS) / (strokes - 1)
    : 0;
  for (let index = 0; index < strokes; index += 1) {
    const controls: HeatCapacityFreeControls = {
      powerOn: true,
      pumpValveOpen: true,
      stopcockOpen: false,
    };
    if (index === 0 || intervalS <= 0) {
      current = stepScriptedRun(current, physicsConfig, sensorConfig, controls, SIMULATION_STEP_S);
    } else {
      current = waitScriptedRun(current, physicsConfig, sensorConfig, controls, intervalS);
    }
    const pump = applyFreePumpStroke(current.physics, physicsConfig, controls, {
      atS: current.timeS,
      strength: 1,
    });
    if (!pump.accepted) {
      return {
        run: current,
        accepted: false,
        reason: pump.reason,
      };
    }
    current = {
      ...current,
      physics: pump.state,
    };
  }
  return {
    run: current,
    accepted: true,
    reason: 'accepted',
  };
};

const pumpScriptedRunInstantEquivalent = (
  run: ScriptedFreeRun,
  physicsConfig: HeatCapacityFreePhysicsConfig,
  strokes: number,
) => {
  const safeStrokes = Math.max(0, Math.floor(strokes));
  const amountDeltaRatio = physicsConfig.pumpAmountGainRatio * safeStrokes;
  const inflowTemperatureK = Math.max(
    1,
    physicsConfig.environment.ambientTemperatureK,
  );
  const nextAmountRatio = run.physics.gasAmountRatio + amountDeltaRatio;
  const nextPhysics: HeatCapacityFreePhysicsState = {
    ...run.physics,
    simulationTimeS: run.timeS,
    gasAmountRatio: nextAmountRatio,
    gasTemperatureK: nextAmountRatio <= 0
      ? run.physics.gasTemperatureK
      : (
          run.physics.gasAmountRatio * run.physics.gasTemperatureK +
          amountDeltaRatio * inflowTemperatureK
        ) / nextAmountRatio,
    pumpProcesses: [],
    pumpStrokeCount: run.physics.pumpStrokeCount + safeStrokes,
    lastPumpStrokeAtS: safeStrokes > 0 ? run.timeS : run.physics.lastPumpStrokeAtS,
  };
  const pressureKPa = deriveFreePhysicalState(nextPhysics, physicsConfig).gasPressureKPa;
  return {
    run: {
      ...run,
      physics: {
        ...nextPhysics,
        maxPressureKPa: Math.max(run.physics.maxPressureKPa, pressureKPa),
      },
    },
    accepted: safeStrokes > 0,
    reason: safeStrokes > 0 ? 'accepted' : 'invalid-sequence',
  };
};

const releaseAndRecover = (
  run: ScriptedFreeRun,
  physicsConfig: HeatCapacityFreePhysicsConfig,
  sensorConfig: HeatCapacityFreeSensorConfig,
  actualOpenDurationS: number,
  waitAfterReleaseS: number,
  releaseMode: HeatCapacityFreeParameterAcceptanceReleaseMode,
) => {
  const openControls: HeatCapacityFreeControls = {
    powerOn: true,
    pumpValveOpen: false,
    stopcockOpen: true,
    stopcockFlowPurpose: 'release',
  };
  const closedControls: HeatCapacityFreeControls = {
    powerOn: true,
    pumpValveOpen: false,
    stopcockOpen: false,
  };

  const runRuntimeReleaseOnly = () => {
    let current = run;
    const openDurationS = Math.max(0, actualOpenDurationS);
    for (let elapsedS = 0; elapsedS < openDurationS - 1e-9; elapsedS += SIMULATION_STEP_S) {
      current = stepScriptedRun(
        current,
        physicsConfig,
        sensorConfig,
        openControls,
        Math.min(SIMULATION_STEP_S, openDurationS - elapsedS),
      );
    }
    return current;
  };

  const createInstantReleaseRun = (
    amountAfterRatio: number,
    temperatureAfterK: number,
  ): ScriptedFreeRun => {
    const before = deriveFreePhysicalState(run.physics, physicsConfig);
    const safeAmountAfterRatio = Math.max(0.000001, amountAfterRatio);
    const safeTemperatureAfterK = Math.max(1, temperatureAfterK);
    const nextPhysics: HeatCapacityFreePhysicsState = {
      ...run.physics,
      simulationTimeS: run.timeS,
      gasAmountRatio: safeAmountAfterRatio,
      gasTemperatureK: safeTemperatureAfterK,
      pumpProcesses: [],
      releaseStarted: true,
      lastStopcockOpenedAtS: run.timeS,
      lastStopcockClosedAtS: run.timeS,
      currentStopcockOpenDurationS: 0,
      releaseReference: {
        pressureBeforeKPa: before.gasPressureKPa,
        temperatureBeforeK: run.physics.gasTemperatureK,
        amountBeforeRatio: run.physics.gasAmountRatio,
        openedAtS: run.timeS,
        reachedAmbientAtS: run.timeS,
      },
    };
    const after = deriveFreePhysicalState(nextPhysics, physicsConfig);
    return {
      ...run,
      physics: {
        ...nextPhysics,
        maxPressureKPa: Math.max(run.physics.maxPressureKPa, after.gasPressureKPa),
      },
    };
  };

  let current: ScriptedFreeRun;
  if (releaseMode === 'runtime-open-flow') {
    current = runRuntimeReleaseOnly();
  } else if (releaseMode === 'instant-adiabatic-to-ambient') {
    const before = deriveFreePhysicalState(run.physics, physicsConfig);
    const pressureRatio = Math.min(
      1,
      Math.max(0.000001, physicsConfig.environment.ambientPressureKPa / Math.max(0.000001, before.gasPressureKPa)),
    );
    const gamma = Math.max(1.001, physicsConfig.gamma);
    current = createInstantReleaseRun(
      run.physics.gasAmountRatio * Math.pow(pressureRatio, 1 / gamma),
      run.physics.gasTemperatureK * Math.pow(pressureRatio, (gamma - 1) / gamma),
    );
  } else {
    const reference = runRuntimeReleaseOnly();
    const gamma = Math.max(1.001, physicsConfig.gamma);
    const amountRatio = Math.min(
      1,
      Math.max(0.000001, reference.physics.gasAmountRatio / Math.max(0.000001, run.physics.gasAmountRatio)),
    );
    current = createInstantReleaseRun(
      reference.physics.gasAmountRatio,
      run.physics.gasTemperatureK * Math.pow(amountRatio, gamma - 1),
    );
  }

  return waitScriptedRun(
    current,
    physicsConfig,
    sensorConfig,
    closedControls,
    waitAfterReleaseS,
  );
};

const simulateScenario = (
  input: HeatCapacityFreeParameterAcceptanceScenarioInput,
): HeatCapacityFreeParameterAcceptanceRow => {
  const physicsConfig = clonePhysicsConfig(input);
  const sensorConfig = cloneSensorConfig(input.instrumentNoiseEnabled ?? true);
  const pumpMode = input.pumpMode ?? 'runtime-strokes';
  const releaseMode = input.releaseMode ?? 'runtime-open-flow';
  let run = createScriptedRun(
    `free-acceptance-${input.id}`,
    physicsConfig,
    sensorConfig,
  );
  let trial = createOfficialU0Trial(`free-acceptance-${input.id}`, run.calibration);
  const pumped = pumpMode === 'instant-equivalent'
    ? pumpScriptedRunInstantEquivalent(run, physicsConfig, input.pumpStrokes)
    : pumpScriptedRun(
        run,
        physicsConfig,
        sensorConfig,
        input.pumpStrokes,
        input.pumpTotalDurationS,
      );
  run = waitScriptedRun(
    pumped.run,
    physicsConfig,
    sensorConfig,
    {
      powerOn: true,
      pumpValveOpen: false,
      stopcockOpen: false,
    },
    input.waitAfterPumpS,
  );

  const u1Display = getFreeSensorDisplay(run.sensor, run.calibration, sensorConfig);
  const u1Evaluation = pumped.accepted
    ? evaluateFreeU1Record(
      trial,
      run.calibration,
      u1Display,
      run.physics,
      HEAT_CAPACITY_FREE_PARAMETER_ACCEPTANCE_RECORD_CONFIG,
    )
    : { ready: false, reason: pumped.reason };
  const u1Record = u1Evaluation.ready
    ? recordFreeU1(trial, createRecordInput(run))
    : null;
  if (u1Record?.accepted) {
    trial = u1Record.trial;
  }

  const u1CorrectedMv = trial.u0
    ? u1Display.displayPressureMv - trial.u0.displayPressureMv
    : null;
  let u2DisplayMv: number | null = null;
  let u2CorrectedMv: number | null = null;
  let gamma: number | null = null;
  let u2Recordable = false;
  let u2Reason = u1Evaluation.ready ? 'not-run' : 'missing-u1';

  if (u1Record?.accepted) {
    run = releaseAndRecover(
      run,
      physicsConfig,
      sensorConfig,
      input.openDurationS,
      input.waitAfterReleaseS,
      releaseMode,
    );
    const u2Display = getFreeSensorDisplay(run.sensor, run.calibration, sensorConfig);
    u2DisplayMv = u2Display.displayPressureMv;
    u2CorrectedMv = trial.u0
      ? u2Display.displayPressureMv - trial.u0.displayPressureMv
      : null;
    const u2Evaluation = evaluateFreeU2Record(
      trial,
      run.calibration,
      u2Display,
      run.physics,
      HEAT_CAPACITY_FREE_PARAMETER_ACCEPTANCE_RECORD_CONFIG,
    );
    u2Recordable = u2Evaluation.ready;
    u2Reason = u2Evaluation.reason;
    const u2Record = u2Evaluation.ready
      ? recordFreeU2(trial, createRecordInput(run), {
          atmosphericPressureKPa: physicsConfig.environment.ambientPressureKPa,
          pressureSensitivityMvPerKPa: sensorConfig.pressureMvPerKPa,
        })
      : null;
    if (u2Record?.accepted) {
      trial = u2Record.trial;
      gamma = trial.correctedSignals?.gamma ?? null;
    }
  }

  const derived = deriveFreePhysicalState(run.physics, physicsConfig);

  return {
    id: input.id,
    label: input.label ?? input.id,
    pumpMode,
    releaseMode,
    pumpStrokes: input.pumpStrokes,
    pumpTotalDurationS: input.pumpTotalDurationS,
    openDurationS: input.openDurationS,
    waitAfterPumpS: input.waitAfterPumpS,
    waitAfterReleaseS: input.waitAfterReleaseS,
    leakageEnabled: physicsConfig.leakage.enabled,
    leakageRatePerS: physicsConfig.leakage.ratePerS,
    u1DisplayMv: roundNumber(u1Display.displayPressureMv),
    u2DisplayMv: roundNumber(u2DisplayMv),
    u1CorrectedMv: roundNumber(u1CorrectedMv),
    u2CorrectedMv: roundNumber(u2CorrectedMv),
    gamma: roundNumber(gamma, 4),
    pressureKPa: roundNumber(derived.gasPressureKPa, 4) ?? 0,
    gasTemperatureK: roundNumber(run.physics.gasTemperatureK, 4) ?? 0,
    gasAmountRatio: roundNumber(run.physics.gasAmountRatio, 6) ?? 0,
    safetyStatus: getSafetyStatus(u1CorrectedMv),
    u1Recordable: Boolean(u1Record?.accepted),
    u2Recordable,
    u1Reason: u1Evaluation.reason,
    u2Reason,
  };
};

const simulateLowSignalDiagnosticRow = (
  pumpStrokes: number,
  openDurationS: number,
  waitAfterPumpS: number,
  waitAfterReleaseS: number,
): HeatCapacityFreeParameterAcceptanceRow => simulateScenario({
  id: `low-signal-${pumpStrokes}-${openDurationS}`,
  label: `${pumpStrokes} strokes / ${openDurationS}s`,
  pumpStrokes,
  pumpTotalDurationS: 0,
  waitAfterPumpS,
  openDurationS,
  waitAfterReleaseS,
});

export const runHeatCapacityFreeParameterAcceptance = (
  options: HeatCapacityFreeParameterAcceptanceOptions = {},
): HeatCapacityFreeParameterAcceptanceReport => {
  if (options.scenarios) {
    return {
      rows: options.scenarios.map((scenario) => simulateScenario(scenario)),
    };
  }
  const pumpStrokes = options.pumpStrokes ?? DEFAULT_PUMP_STROKES;
  const openDurationsS = options.openDurationsS ?? DEFAULT_OPEN_DURATIONS_S;
  const waitAfterPumpS = options.waitAfterPumpS ?? DEFAULT_WAIT_AFTER_PUMP_S;
  const waitAfterReleaseS = options.waitAfterReleaseS ?? DEFAULT_WAIT_AFTER_RELEASE_S;
  return {
    rows: openDurationsS.flatMap((openDurationS) => pumpStrokes.map((strokes) => (
      simulateLowSignalDiagnosticRow(strokes, openDurationS, waitAfterPumpS, waitAfterReleaseS)
    ))),
  };
};

const pad = (value: string | number, width: number) => String(value).padStart(width, ' ');
const formatNullable = (value: number | null, digits: number) => (
  value === null ? '-' : value.toFixed(digits)
);

export const formatHeatCapacityFreeParameterAcceptanceReport = (
  report: HeatCapacityFreeParameterAcceptanceReport,
) => {
  const lines = [
    'Free Mode parameter acceptance',
    [
      pad('strokes', 7),
      pad('mode', 18),
      pad('release', 32),
      pad('pump(s)', 7),
      pad('open(s)', 7),
      pad('U1wait', 7),
      pad('U2wait', 7),
      pad('U1/mV', 9),
      pad('U2/mV', 9),
      pad('gamma', 7),
      pad('P/kPa', 8),
      pad('T/K', 8),
      pad('nRatio', 8),
      pad('safety', 8),
      pad('U1 rec', 7),
      pad('U2 rec', 7),
      'reason',
    ].join('  '),
  ];
  for (const row of report.rows) {
    lines.push([
      pad(row.pumpStrokes, 7),
      pad(row.pumpMode, 18),
      pad(row.releaseMode, 32),
      pad(row.pumpTotalDurationS.toFixed(1), 7),
      pad(row.openDurationS.toFixed(2), 7),
      pad(row.waitAfterPumpS.toFixed(0), 7),
      pad(row.waitAfterReleaseS.toFixed(0), 7),
      pad(formatNullable(row.u1CorrectedMv, 2), 9),
      pad(formatNullable(row.u2CorrectedMv, 2), 9),
      pad(formatNullable(row.gamma, 4), 7),
      pad(row.pressureKPa.toFixed(2), 8),
      pad(row.gasTemperatureK.toFixed(2), 8),
      pad(row.gasAmountRatio.toFixed(5), 8),
      pad(row.safetyStatus, 8),
      pad(row.u1Recordable ? 'yes' : 'no', 7),
      pad(row.u2Recordable ? 'yes' : 'no', 7),
      `${row.id} ${row.u1Reason}/${row.u2Reason}`,
    ].join('  '));
  }
  return lines.join('\n');
};

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tests/heatCapacity/heatCapacityFreeParameterAcceptance.ts')) {
  console.log(formatHeatCapacityFreeParameterAcceptanceReport(
    runHeatCapacityFreeParameterAcceptance(),
  ));
}
