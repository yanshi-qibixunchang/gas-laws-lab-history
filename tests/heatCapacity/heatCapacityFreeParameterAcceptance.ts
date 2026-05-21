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

export type HeatCapacityFreeParameterAcceptanceSafetyStatus = 'normal' | 'warning' | 'danger';

export interface HeatCapacityFreeParameterAcceptanceRow {
  pumpStrokes: number;
  openDurationS: number;
  u1DisplayMv: number | null;
  u2DisplayMv: number | null;
  u1CorrectedMv: number | null;
  u2CorrectedMv: number | null;
  gamma: number | null;
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
const DEFAULT_OPEN_DURATIONS_S = [0, 0.3, 0.7];
const DEFAULT_WAIT_AFTER_PUMP_S = 16;
const DEFAULT_WAIT_AFTER_RELEASE_S = 16;
const SIMULATION_STEP_S = 0.1;
const STOPCOCK_CLICK_STEP_S = 0.05;

const roundNumber = (value: number | null, digits = 2) => (
  value === null || !Number.isFinite(value) ? null : Number(value.toFixed(digits))
);

const clonePhysicsConfig = (): HeatCapacityFreePhysicsConfig => ({
  ...DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG,
  environment: { ...DEFAULT_HEAT_CAPACITY_FREE_ENVIRONMENT_CONFIG },
});

const cloneSensorConfig = (): HeatCapacityFreeSensorConfig => ({
  ...DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG,
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
  physics: createDefaultFreePhysicsState(physicsConfig),
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

const createManualU0Trial = (
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
    throw new Error(`Free parameter acceptance failed to create manual U0: ${record.reason}`);
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
) => {
  let current = run;
  for (let index = 0; index < strokes; index += 1) {
    const controls: HeatCapacityFreeControls = {
      powerOn: true,
      pumpValveOpen: true,
      stopcockOpen: false,
    };
    current = stepScriptedRun(current, physicsConfig, sensorConfig, controls, SIMULATION_STEP_S);
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

const releaseAndRecover = (
  run: ScriptedFreeRun,
  physicsConfig: HeatCapacityFreePhysicsConfig,
  sensorConfig: HeatCapacityFreeSensorConfig,
  openDurationS: number,
  waitAfterReleaseS: number,
) => {
  const openControls: HeatCapacityFreeControls = {
    powerOn: true,
    pumpValveOpen: false,
    stopcockOpen: true,
  };
  const closedControls: HeatCapacityFreeControls = {
    powerOn: true,
    pumpValveOpen: false,
    stopcockOpen: false,
  };
  let current = stepScriptedRun(run, physicsConfig, sensorConfig, openControls, STOPCOCK_CLICK_STEP_S);
  for (let elapsedS = 0; elapsedS < openDurationS; elapsedS += SIMULATION_STEP_S) {
    current = stepScriptedRun(
      current,
      physicsConfig,
      sensorConfig,
      openControls,
      Math.min(SIMULATION_STEP_S, openDurationS - elapsedS),
    );
  }
  current = stepScriptedRun(current, physicsConfig, sensorConfig, closedControls, STOPCOCK_CLICK_STEP_S);
  return waitScriptedRun(
    current,
    physicsConfig,
    sensorConfig,
    closedControls,
    waitAfterReleaseS,
  );
};

const simulateRow = (
  pumpStrokes: number,
  openDurationS: number,
  waitAfterPumpS: number,
  waitAfterReleaseS: number,
): HeatCapacityFreeParameterAcceptanceRow => {
  const physicsConfig = clonePhysicsConfig();
  const sensorConfig = cloneSensorConfig();
  let run = createScriptedRun(
    `free-acceptance-${pumpStrokes}-${openDurationS}`,
    physicsConfig,
    sensorConfig,
  );
  let trial = createManualU0Trial(`free-acceptance-${pumpStrokes}-${openDurationS}`, run.calibration);
  const pumped = pumpScriptedRun(run, physicsConfig, sensorConfig, pumpStrokes);
  run = waitScriptedRun(
    pumped.run,
    physicsConfig,
    sensorConfig,
    {
      powerOn: true,
      pumpValveOpen: false,
      stopcockOpen: false,
    },
    waitAfterPumpS,
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
      openDurationS,
      waitAfterReleaseS,
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
          theoreticalGamma: physicsConfig.gamma,
        })
      : null;
    if (u2Record?.accepted) {
      trial = u2Record.trial;
      gamma = trial.correctedSignals?.gamma ?? null;
    }
  }

  return {
    pumpStrokes,
    openDurationS,
    u1DisplayMv: roundNumber(u1Display.displayPressureMv),
    u2DisplayMv: roundNumber(u2DisplayMv),
    u1CorrectedMv: roundNumber(u1CorrectedMv),
    u2CorrectedMv: roundNumber(u2CorrectedMv),
    gamma: roundNumber(gamma, 4),
    safetyStatus: getSafetyStatus(u1CorrectedMv),
    u1Recordable: Boolean(u1Record?.accepted),
    u2Recordable,
    u1Reason: u1Evaluation.reason,
    u2Reason,
  };
};

export const runHeatCapacityFreeParameterAcceptance = (
  options: HeatCapacityFreeParameterAcceptanceOptions = {},
): HeatCapacityFreeParameterAcceptanceReport => {
  const pumpStrokes = options.pumpStrokes ?? DEFAULT_PUMP_STROKES;
  const openDurationsS = options.openDurationsS ?? DEFAULT_OPEN_DURATIONS_S;
  const waitAfterPumpS = options.waitAfterPumpS ?? DEFAULT_WAIT_AFTER_PUMP_S;
  const waitAfterReleaseS = options.waitAfterReleaseS ?? DEFAULT_WAIT_AFTER_RELEASE_S;
  return {
    rows: openDurationsS.flatMap((openDurationS) => pumpStrokes.map((strokes) => (
      simulateRow(strokes, openDurationS, waitAfterPumpS, waitAfterReleaseS)
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
      pad('open(s)', 7),
      pad('U1/mV', 9),
      pad('U2/mV', 9),
      pad('gamma', 7),
      pad('safety', 8),
      pad('U1 rec', 7),
      pad('U2 rec', 7),
      'reason',
    ].join('  '),
  ];
  for (const row of report.rows) {
    lines.push([
      pad(row.pumpStrokes, 7),
      pad(row.openDurationS.toFixed(2), 7),
      pad(formatNullable(row.u1CorrectedMv, 2), 9),
      pad(formatNullable(row.u2CorrectedMv, 2), 9),
      pad(formatNullable(row.gamma, 4), 7),
      pad(row.safetyStatus, 8),
      pad(row.u1Recordable ? 'yes' : 'no', 7),
      pad(row.u2Recordable ? 'yes' : 'no', 7),
      `${row.u1Reason}/${row.u2Reason}`,
    ].join('  '));
  }
  return lines.join('\n');
};

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tests/heatCapacity/heatCapacityFreeParameterAcceptance.ts')) {
  console.log(formatHeatCapacityFreeParameterAcceptanceReport(
    runHeatCapacityFreeParameterAcceptance(),
  ));
}


