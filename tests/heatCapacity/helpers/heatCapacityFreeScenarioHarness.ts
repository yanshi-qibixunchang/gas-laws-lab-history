import assert from 'node:assert/strict';

import {
  applyFreeZeroCalibration,
  captureAutomaticU0IfReady,
  type HeatCapacityFreeCalibrationState,
} from '../../../src/domain/heatCapacity/heatCapacityFreeCalibrationModel.ts';
import {
  applyFreePumpStroke,
  createDefaultFreePhysicsState,
  deriveFreePhysicalState,
  stepFreePhysics,
  type HeatCapacityFreeControls,
  type HeatCapacityFreePhysicsConfig,
  type HeatCapacityFreePhysicsState,
} from '../../../src/domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';
import {
  evaluateFreeU1Record,
  evaluateFreeU2Record,
  recordFreeU0,
  recordFreeU1,
  recordFreeU2,
  type HeatCapacityFreeRecordConfig,
  type HeatCapacityFreeRecordEvaluation,
} from '../../../src/domain/heatCapacity/heatCapacityFreeRecordModel.ts';
import {
  createDefaultFreeSensorState,
  getFreeSensorDisplay,
  stepFreeSensor,
  type HeatCapacityFreeSensorConfig,
  type HeatCapacityFreeSensorState,
} from '../../../src/domain/heatCapacity/heatCapacityFreeSensorModel.ts';
import {
  createHeatCapacityFreeTrial,
  type HeatCapacityFreeCorrectedSignals,
  type HeatCapacityFreeTrial,
} from '../../../src/domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import {
  createDefaultHeatCapacityFile,
} from '../../../src/features/workbench/workbenchState.ts';
import {
  getEffectiveHeatCapacityFreeSensorConfig,
} from '../../../src/domain/heatCapacity/heatCapacityFreeParameterConfig.ts';
import {
  HEAT_CAPACITY_RELEASE_TIMING,
  HEAT_CAPACITY_STANDARD_OPERATION,
} from '../../../src/domain/heatCapacity/heatCapacityDefaultConfig.ts';

interface ScenarioConfigs {
  physics: HeatCapacityFreePhysicsConfig;
  sensor: HeatCapacityFreeSensorConfig;
  record: HeatCapacityFreeRecordConfig;
}

interface ScenarioRun {
  timeS: number;
  physics: HeatCapacityFreePhysicsState;
  sensor: HeatCapacityFreeSensorState;
  calibration: HeatCapacityFreeCalibrationState;
  configs: ScenarioConfigs;
}

export interface HeatCapacityFreeScenarioBaselineEntry {
  id: string;
  label: string;
  u1Evaluation: HeatCapacityFreeRecordEvaluation;
  u2Evaluation: HeatCapacityFreeRecordEvaluation;
  correctedSignals: HeatCapacityFreeCorrectedSignals | null;
  recordTimes: {
    u1AtS: number | null;
    u2AtS: number | null;
  };
  display: {
    U1DisplayMv: number | null;
    U2DisplayMv: number | null;
  };
}

const BASELINE_SEED = 'free-scenario-baseline';
const TIME_STEP_S = 0.1;
const DEFAULT_STABLE_WAIT_S = 300;

const createDefaultScenarioConfigs = (): ScenarioConfigs => {
  const file = createDefaultHeatCapacityFile(1);
  const sensor = getEffectiveHeatCapacityFreeSensorConfig(
    file.heatCapacityFreeSensorConfig,
    file.heatCapacityFreeInstrumentNoiseEnabled,
  );
  return {
    physics: file.heatCapacityFreePhysicsConfig,
    sensor,
    record: file.heatCapacityFreeRecordConfig,
  };
};

const createCalibration = (
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
  assert.notEqual(calibration.automaticU0, null);
  return calibration;
};

const createRun = (configs = createDefaultScenarioConfigs()): ScenarioRun => ({
  timeS: 0.1,
  physics: createDefaultFreePhysicsState(configs.physics, BASELINE_SEED),
  sensor: createDefaultFreeSensorState(BASELINE_SEED, {
    pressureMv: 0,
    pressureInitialBiasMv: 0,
    temperatureMv: configs.sensor.temperatureMvAtAmbient,
    sensorTemperatureK: configs.physics.environment.ambientTemperatureK,
  }),
  calibration: createCalibration(configs.sensor),
  configs,
});

const getDisplay = (run: ScenarioRun) => getFreeSensorDisplay(
  run.sensor,
  run.calibration,
  run.configs.sensor,
);

const stepRun = (
  run: ScenarioRun,
  controls: HeatCapacityFreeControls,
  dtS: number,
): ScenarioRun => {
  const timeS = Number((run.timeS + dtS).toFixed(6));
  const physics = stepFreePhysics(
    run.physics,
    run.configs.physics,
    controls,
    dtS,
    timeS,
  );
  const derived = deriveFreePhysicalState(physics, run.configs.physics);
  const sensor = stepFreeSensor(
    run.sensor,
    {
      gasPressureKPa: derived.gasPressureKPa,
      pressureDeltaKPa: derived.pressureDeltaKPa,
      gasTemperatureK: physics.gasTemperatureK,
      ambientTemperatureK: run.configs.physics.environment.ambientTemperatureK,
    },
    run.calibration,
    run.configs.sensor,
    timeS,
  );
  return {
    ...run,
    timeS,
    physics,
    sensor,
  };
};

const wait = (
  run: ScenarioRun,
  controls: HeatCapacityFreeControls,
  durationS: number,
) => {
  let current = run;
  for (let elapsedS = 0; elapsedS < durationS - 1e-9; elapsedS += TIME_STEP_S) {
    current = stepRun(current, controls, TIME_STEP_S);
  }
  return current;
};

const pump = (
  run: ScenarioRun,
  strokes: number,
) => {
  let current = run;
  for (let strokeIndex = 0; strokeIndex < strokes; strokeIndex += 1) {
    current = stepRun(current, {
      pumpValveOpen: true,
      stopcockOpen: false,
    }, TIME_STEP_S);
    const stroke = applyFreePumpStroke(
      current.physics,
      current.configs.physics,
      {
        pumpValveOpen: true,
        stopcockOpen: false,
      },
      {
        atS: current.timeS,
        strength: 1,
      },
    );
    assert.equal(stroke.accepted, true);
    current = {
      ...current,
      physics: stroke.state,
    };
  }
  return wait(current, {
    pumpValveOpen: false,
    stopcockOpen: false,
  }, DEFAULT_STABLE_WAIT_S);
};

const createTrialWithU0 = (
  run: ScenarioRun,
  id: string,
): HeatCapacityFreeTrial => {
  const automaticU0 = run.calibration.automaticU0;
  assert.notEqual(automaticU0, null);
  const record = recordFreeU0(createHeatCapacityFreeTrial(id, automaticU0), {
    atS: automaticU0!.atS,
    displayPressureMv: automaticU0!.displayPressureMv,
    displayTemperatureMv: automaticU0!.displayTemperatureMv,
    calibrationVersion: automaticU0!.calibrationVersion,
    zeroEventId: automaticU0!.zeroEventId,
  });
  assert.equal(record.accepted, true);
  return record.trial;
};

const recordU1IfReady = (
  run: ScenarioRun,
  id: string,
) => {
  const trial = createTrialWithU0(run, id);
  const display = getDisplay(run);
  const evaluation = evaluateFreeU1Record(
    trial,
    run.calibration,
    display,
    run.physics,
    run.configs.record,
  );
  if (!evaluation.ready) {
    return {
      trial,
      evaluation,
    };
  }
  const record = recordFreeU1(trial, {
    atS: run.timeS,
    displayPressureMv: display.displayPressureMv,
    displayTemperatureMv: display.displayTemperatureMv,
    calibrationVersion: 1,
    zeroEventId: 'zero-1',
  });
  assert.equal(record.accepted, true);
  return {
    trial: record.trial,
    evaluation,
  };
};

const releaseAndMaybeRecover = (
  run: ScenarioRun,
  openDurationS: number,
  recoveryWaitS: number,
) => {
  let current = run;
  for (let elapsedS = 0; elapsedS < openDurationS - 1e-9;) {
    const stepS = Math.min(TIME_STEP_S, openDurationS - elapsedS);
    current = stepRun(current, {
      pumpValveOpen: false,
      stopcockOpen: true,
      stopcockFlowPurpose: 'release',
    }, stepS);
    elapsedS += stepS;
  }
  current = stepRun(current, {
    pumpValveOpen: false,
    stopcockOpen: false,
  }, 0.05);
  return wait(current, {
    pumpValveOpen: false,
    stopcockOpen: false,
  }, recoveryWaitS);
};

const completeScenario = (
  input: {
    id: string;
    label: string;
    pumpStrokes: number;
    openDurationS: number;
    recoveryWaitS: number;
  },
): HeatCapacityFreeScenarioBaselineEntry => {
  const run = pump(createRun(), input.pumpStrokes);
  const u1 = recordU1IfReady(run, input.id);
  if (!u1.evaluation.ready) {
    return {
      id: input.id,
      label: input.label,
      u1Evaluation: u1.evaluation,
      u2Evaluation: { ready: false, reason: 'invalid-sequence' },
      correctedSignals: null,
      recordTimes: {
        u1AtS: null,
        u2AtS: null,
      },
      display: {
        U1DisplayMv: getDisplay(run).displayPressureMv,
        U2DisplayMv: null,
      },
    };
  }
  const recovered = releaseAndMaybeRecover(run, input.openDurationS, input.recoveryWaitS);
  const display = getDisplay(recovered);
  const u2Evaluation = evaluateFreeU2Record(
    u1.trial,
    recovered.calibration,
    display,
    recovered.physics,
    recovered.configs.record,
  );
  if (!u2Evaluation.ready) {
    return {
      id: input.id,
      label: input.label,
      u1Evaluation: u1.evaluation,
      u2Evaluation,
      correctedSignals: null,
      recordTimes: {
        u1AtS: run.timeS,
        u2AtS: null,
      },
      display: {
        U1DisplayMv: u1.trial.u1?.displayPressureMv ?? null,
        U2DisplayMv: display.displayPressureMv,
      },
    };
  }
  const record = recordFreeU2(u1.trial, {
    atS: recovered.timeS,
    displayPressureMv: display.displayPressureMv,
    displayTemperatureMv: display.displayTemperatureMv,
    calibrationVersion: 1,
    zeroEventId: 'zero-1',
  }, {
    atmosphericPressureKPa: recovered.configs.physics.environment.ambientPressureKPa,
    pressureSensitivityMvPerKPa: recovered.configs.sensor.pressureMvPerKPa,
  });
  assert.equal(record.accepted, true);
  return {
    id: input.id,
    label: input.label,
    u1Evaluation: u1.evaluation,
    u2Evaluation,
    correctedSignals: record.trial.correctedSignals,
    recordTimes: {
      u1AtS: run.timeS,
      u2AtS: recovered.timeS,
    },
    display: {
      U1DisplayMv: record.trial.u1?.displayPressureMv ?? null,
      U2DisplayMv: record.trial.u2?.displayPressureMv ?? null,
    },
  };
};

export const runHeatCapacityFreeScenarioBaseline = (): HeatCapacityFreeScenarioBaselineEntry[] => [
  completeScenario({
    id: 'good-operation',
    label: 'Good operation',
    pumpStrokes: 18,
    openDurationS: HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
    recoveryWaitS: DEFAULT_STABLE_WAIT_S,
  }),
  completeScenario({
    id: 'insufficient-pump',
    label: 'Insufficient pump',
    pumpStrokes: 4,
    openDurationS: HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
    recoveryWaitS: DEFAULT_STABLE_WAIT_S,
  }),
  completeScenario({
    id: 'slow-close',
    label: 'Slow close',
    pumpStrokes: 18,
    openDurationS: HEAT_CAPACITY_RELEASE_TIMING.releaseOptimalMaxS + 0.7,
    recoveryWaitS: DEFAULT_STABLE_WAIT_S,
  }),
  completeScenario({
    id: 'long-open',
    label: 'Long open',
    pumpStrokes: 18,
    openDurationS: HEAT_CAPACITY_RELEASE_TIMING.releaseOptimalMaxS + 6,
    recoveryWaitS: DEFAULT_STABLE_WAIT_S,
  }),
  completeScenario({
    id: 'early-u2-record',
    label: 'Early U2 record',
    pumpStrokes: 18,
    openDurationS: HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
    recoveryWaitS: 0,
  }),
];

export const formatHeatCapacityFreeScenarioBaseline = (
  baseline: HeatCapacityFreeScenarioBaselineEntry[],
) => baseline.map((scenario) => ({
  id: scenario.id,
  u1Ready: scenario.u1Evaluation.ready,
  u1Reason: scenario.u1Evaluation.reason,
  u2Ready: scenario.u2Evaluation.ready,
  u2Reason: scenario.u2Evaluation.reason,
  U1Mv: scenario.correctedSignals?.U1CorrectedMv ?? null,
  U2Mv: scenario.correctedSignals?.U2CorrectedMv ?? null,
  gamma: scenario.correctedSignals?.gamma ?? null,
  u1AtS: scenario.recordTimes.u1AtS,
  u2AtS: scenario.recordTimes.u2AtS,
}));
