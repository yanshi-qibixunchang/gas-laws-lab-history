import assert from 'node:assert/strict';

import {
  applyFreePumpStroke,
  createDefaultFreePhysicsState,
  deriveFreePhysicalState,
  FREE_PUMP_STROKE_DURATION_S,
  stepFreePhysics,
  type HeatCapacityFreeControls,
  type HeatCapacityFreePhysicsConfig,
  type HeatCapacityFreePhysicsState,
} from '../../src/domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';
import {
  applyFreeZeroCalibration,
  captureAutomaticU0IfReady,
  type HeatCapacityFreeCalibrationState,
} from '../../src/domain/heatCapacity/heatCapacityFreeCalibrationModel.ts';
import {
  createDefaultFreeSensorState,
  getFreeSensorDisplay,
  stepFreeSensor,
  type HeatCapacityFreeSensorConfig,
  type HeatCapacityFreeSensorState,
} from '../../src/domain/heatCapacity/heatCapacityFreeSensorModel.ts';
import {
  DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG,
  DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG,
} from '../../src/features/workbench/workbenchState.ts';
import {
  HEAT_CAPACITY_STANDARD_PUMP_STROKE_INTERVAL_S,
} from '../../src/domain/heatCapacity/heatCapacityDefaultConfig.ts';

const closedControls: HeatCapacityFreeControls = {
  pumpValveOpen: false,
  stopcockOpen: false,
};

const pumpControls: HeatCapacityFreeControls = {
  pumpValveOpen: true,
  stopcockOpen: false,
};

const expectWithin = (
  actual: number,
  expected: number,
  tolerance: number,
  message: string,
) => {
  assert.equal(
    Math.abs(actual - expected) <= tolerance,
    true,
    `${message}: expected ${actual.toFixed(4)} within ${tolerance} of ${expected}`,
  );
};

const createNoNoiseSensorConfig = (): HeatCapacityFreeSensorConfig => ({
  ...DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG,
  noiseMv: 0,
});

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
  return captureAutomaticU0IfReady(calibration, {
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
};

interface PumpCalibrationRun {
  timeS: number;
  physics: HeatCapacityFreePhysicsState;
  sensor: HeatCapacityFreeSensorState;
  calibration: HeatCapacityFreeCalibrationState;
  peakDisplayPressureMv: number;
  peakDisplayTemperatureMv: number;
}

const stepRun = (
  run: PumpCalibrationRun,
  physicsConfig: HeatCapacityFreePhysicsConfig,
  sensorConfig: HeatCapacityFreeSensorConfig,
  controls: HeatCapacityFreeControls,
  dtS: number,
): PumpCalibrationRun => {
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
  const display = getFreeSensorDisplay(sensor, run.calibration, sensorConfig);
  return {
    ...run,
    timeS,
    physics,
    sensor,
    peakDisplayPressureMv: Math.max(run.peakDisplayPressureMv, display.displayPressureMv),
    peakDisplayTemperatureMv: Math.max(
      run.peakDisplayTemperatureMv,
      display.displayTemperatureMv,
    ),
  };
};

const waitRun = (
  run: PumpCalibrationRun,
  physicsConfig: HeatCapacityFreePhysicsConfig,
  sensorConfig: HeatCapacityFreeSensorConfig,
  controls: HeatCapacityFreeControls,
  durationS: number,
  stepS = 0.1,
): PumpCalibrationRun => {
  let current = run;
  for (let elapsedS = 0; elapsedS < durationS - 1e-9; elapsedS += stepS) {
    current = stepRun(
      current,
      physicsConfig,
      sensorConfig,
      controls,
      Math.min(stepS, durationS - elapsedS),
    );
  }
  return current;
};

const createRun = (
  physicsConfig = DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG,
  sensorConfig = createNoNoiseSensorConfig(),
): PumpCalibrationRun => ({
  timeS: 0.1,
  physics: createDefaultFreePhysicsState(physicsConfig),
  sensor: createDefaultFreeSensorState('free-pump-calibration', {
    pressureMv: 0,
    pressureInitialBiasMv: 0,
    temperatureMv: sensorConfig.temperatureMvAtAmbient,
    sensorTemperatureK: physicsConfig.environment.ambientTemperatureK,
  }),
  calibration: createCalibration(sensorConfig),
  peakDisplayPressureMv: 0,
  peakDisplayTemperatureMv: sensorConfig.temperatureMvAtAmbient,
});

const applyOnePumpStroke = (
  run: PumpCalibrationRun,
  physicsConfig: HeatCapacityFreePhysicsConfig,
  sensorConfig: HeatCapacityFreeSensorConfig,
  atS: number,
) => {
  let current = waitRun(run, physicsConfig, sensorConfig, pumpControls, Math.max(0, atS - run.timeS));
  const stroke = applyFreePumpStroke(current.physics, physicsConfig, pumpControls, {
    atS: current.timeS,
    strength: 1,
  });
  assert.equal(stroke.accepted, true);
  current = {
    ...current,
    physics: stroke.state,
  };
  return waitRun(current, physicsConfig, sensorConfig, pumpControls, FREE_PUMP_STROKE_DURATION_S, 0.02);
};

{
  const sensorConfig = createNoNoiseSensorConfig();
  const physicsConfig: HeatCapacityFreePhysicsConfig = {
    ...DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG,
    leakage: {
      ...DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.leakage,
      enabled: false,
    },
  };
  const run = applyOnePumpStroke(createRun(physicsConfig, sensorConfig), physicsConfig, sensorConfig, 0.2);
  const settled = waitRun(run, physicsConfig, sensorConfig, closedControls, 300);
  const settledPressureMv = deriveFreePhysicalState(settled.physics, physicsConfig).pressureDeltaKPa *
    sensorConfig.pressureMvPerKPa;

  expectWithin(
    settledPressureMv,
    7,
    0.6,
    'one isolated pump stroke should add about 7 mV after thermal settling',
  );
}

{
  const sensorConfig = createNoNoiseSensorConfig();
  const requestedPumpAmountGainRatio = Number(process.env.HSL_HEAT_PUMP_AMOUNT_GAIN_RATIO);
  const requestedPumpWorkRetention = Number(process.env.HSL_HEAT_PUMP_WORK_RETENTION);
  const physicsConfig: HeatCapacityFreePhysicsConfig = {
    ...DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG,
    pumpAmountGainRatio: Number.isFinite(requestedPumpAmountGainRatio)
      ? requestedPumpAmountGainRatio
      : DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.pumpAmountGainRatio,
    pumpWorkRetention: Number.isFinite(requestedPumpWorkRetention)
      ? requestedPumpWorkRetention
      : DEFAULT_HEAT_CAPACITY_FREE_PHYSICS_CONFIG.pumpWorkRetention,
  };
  let run = createRun(physicsConfig, sensorConfig);
  const pumpSequenceStartS = run.timeS;
  let peakAfterSeventeenthStrokeMv = 0;
  for (let index = 0; index < 18; index += 1) {
    run = applyOnePumpStroke(
      run,
      physicsConfig,
      sensorConfig,
      pumpSequenceStartS + index * HEAT_CAPACITY_STANDARD_PUMP_STROKE_INTERVAL_S,
    );
    if (index === 16) {
      const display = getFreeSensorDisplay(run.sensor, run.calibration, sensorConfig);
      peakAfterSeventeenthStrokeMv = Math.max(
        run.peakDisplayPressureMv,
        display.displayPressureMv,
      );
    }
  }
  const displayAfterPumping = getFreeSensorDisplay(run.sensor, run.calibration, sensorConfig);
  const settled = waitRun(run, physicsConfig, sensorConfig, closedControls, 300);
  const displayAfterFiveMinutes = getFreeSensorDisplay(settled.sensor, settled.calibration, sensorConfig);

  if (process.env.HSL_PRINT_HEAT_PUMP_CALIBRATION === '1') {
    console.table({
      pumpAmountGainRatio: physicsConfig.pumpAmountGainRatio,
      pumpWorkRetention: physicsConfig.pumpWorkRetention,
      peakAfterSeventeenthStrokeMv,
      peakAfterEighteenthStrokeMv: Math.max(
        run.peakDisplayPressureMv,
        displayAfterPumping.displayPressureMv,
      ),
      peakTemperatureMv: run.peakDisplayTemperatureMv,
      settledPressureMv: displayAfterFiveMinutes.displayPressureMv,
      settledTemperatureMv: displayAfterFiveMinutes.displayTemperatureMv,
      gasTemperatureAfterPumpK: run.physics.gasTemperatureK,
      sensorTemperatureAfterPumpK: run.sensor.sensorTemperatureK,
    });
  }

  assert.equal(
    peakAfterSeventeenthStrokeMv < 120,
    true,
    `the seventeenth standard stroke should remain below 120 mV, got ${peakAfterSeventeenthStrokeMv}`,
  );
  const peakAfterEighteenthStrokeMv = Math.max(
    run.peakDisplayPressureMv,
    displayAfterPumping.displayPressureMv,
  );
  assert.equal(
    peakAfterEighteenthStrokeMv >= 120 && peakAfterEighteenthStrokeMv <= 125,
    true,
    `the eighteenth standard stroke should enter 120-125 mV, got ${peakAfterEighteenthStrokeMv}`,
  );
  expectWithin(
    displayAfterFiveMinutes.displayPressureMv,
    114,
    5,
    'five-minute sealed wait after pumping should relax near the observed around-114 mV display',
  );
  assert.equal(
    run.peakDisplayTemperatureMv > 1500,
    true,
    `the standard air run should expose a visible compression-heating peak above 1500 mV, got ${run.peakDisplayTemperatureMv}`,
  );
  expectWithin(
    displayAfterFiveMinutes.displayTemperatureMv,
    sensorConfig.temperatureMvAtAmbient,
    0.08,
    'five-minute wait should return the temperature sensor to its shared ambient baseline',
  );
}

console.log('heatCapacityFreePumpCalibration tests passed');
