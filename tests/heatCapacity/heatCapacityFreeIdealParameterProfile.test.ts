import assert from 'node:assert/strict';
import {
  createHeatCapacityFreeIdealEffectiveConfigs,
  createHeatCapacityFreeIdealStagePhysicsConfig,
  HEAT_CAPACITY_FREE_IDEAL_THERMAL_SETTLED_TOLERANCE_K,
} from '../../src/domain/heatCapacity/heatCapacityFreeIdealParameterProfile.ts';
import {
  createDefaultFreePhysicsState,
  stepFreePhysics,
} from '../../src/domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';
import {
  createDefaultFreeSensorState,
  stepFreeSensor,
} from '../../src/domain/heatCapacity/heatCapacityFreeSensorModel.ts';

const fastConfig = createHeatCapacityFreeIdealEffectiveConfigs('fastAdiabatic');
assert.equal(fastConfig.environment.ambientPressureKPa, 101.3);
assert.equal(fastConfig.environment.ambientTemperatureK, 298.15);
assert.equal(fastConfig.physics.environment.ambientPressureKPa, 101.3);
assert.equal(fastConfig.physics.environment.ambientTemperatureK, 298.15);
assert.equal(fastConfig.physics.gamma, 1.4);
assert.equal(fastConfig.physics.leakage.enabled, false);
assert.equal(fastConfig.physics.leakage.ratePerS, 0);
assert.equal(fastConfig.physics.environmentDisturbance?.enabled, false);
assert.equal(fastConfig.physics.pumpValveExchange?.enabled, false);
assert.equal(fastConfig.sensor.noiseMv, 0);
assert.equal(fastConfig.sensor.quantizationMv, 0);
assert.equal(fastConfig.sensor.minSampleIntervalS, fastConfig.sensor.maxSampleIntervalS);
assert.equal(fastConfig.sensor.lagRate, 1_000_000);
assert.equal(fastConfig.sensor.pressureNonlinearity?.enabled, false);
assert.equal(fastConfig.pressureWarningMv, 120);
assert.equal(fastConfig.instrumentNoiseEnabled, false);
assert.equal(fastConfig.thermalMode, 'adiabatic');
assert.equal(fastConfig.physics.thermal.gasWallConductanceWPerK, 0);
assert.equal(fastConfig.physics.thermal.wallAmbientConductanceWPerK, 0);
const idealSensorState = stepFreeSensor(
  createDefaultFreeSensorState('ideal-sensor', {
    pressureMv: 0,
    pressureInitialBiasMv: 0,
    temperatureMv: fastConfig.sensor.temperatureMvAtAmbient,
    sensorTemperatureK: fastConfig.environment.ambientTemperatureK,
  }),
  {
    gasPressureKPa: fastConfig.environment.ambientPressureKPa + 3,
    pressureDeltaKPa: 3,
    gasTemperatureK: fastConfig.environment.ambientTemperatureK + 10,
    ambientTemperatureK: fastConfig.environment.ambientTemperatureK,
  },
  {
    calibrationVersion: 0,
    zeroOffsetMv: 0,
    zeroEvents: [],
    automaticU0: null,
  },
  fastConfig.sensor,
  1 / 60,
);
assert.equal(idealSensorState.displayPressureMv, 60);
assert.equal(
  idealSensorState.displayTemperatureMv,
  fastConfig.sensor.temperatureMvAtAmbient + 10 * fastConfig.sensor.temperatureMvPerK,
);

const heliumFastConfig = createHeatCapacityFreeIdealEffectiveConfigs(
  'fastAdiabatic',
  'helium',
);
assert.equal(heliumFastConfig.physics.gamma, 5 / 3);
assert.equal(heliumFastConfig.physics.leakage.enabled, false);
assert.equal(heliumFastConfig.physics.environmentDisturbance?.enabled, false);
assert.equal(heliumFastConfig.physics.pumpValveExchange?.enabled, false);
assert.equal(heliumFastConfig.sensor.noiseMv, 0);
assert.equal(heliumFastConfig.sensor.quantizationMv, 0);
assert.equal(heliumFastConfig.sensor.minSampleIntervalS, heliumFastConfig.sensor.maxSampleIntervalS);
assert.equal(heliumFastConfig.instrumentNoiseEnabled, false);

const equilibriumConfig = createHeatCapacityFreeIdealEffectiveConfigs('thermalEquilibrium');
assert.equal(equilibriumConfig.environment.ambientPressureKPa, 101.3);
assert.equal(equilibriumConfig.environment.ambientTemperatureK, 298.15);
assert.equal(equilibriumConfig.physics.gamma, 1.4);
assert.equal(equilibriumConfig.physics.leakage.enabled, false);
assert.equal(equilibriumConfig.physics.environmentDisturbance?.enabled, false);
assert.equal(equilibriumConfig.sensor.noiseMv, 0);
assert.equal(equilibriumConfig.sensor.quantizationMv, 0);
assert.equal(equilibriumConfig.sensor.pressureNonlinearity?.enabled, false);
assert.equal(equilibriumConfig.instrumentNoiseEnabled, false);
assert.equal(equilibriumConfig.thermalMode, 'full-exchange');
assert.equal(equilibriumConfig.physics.thermal.gasWallConductanceWPerK > 0, true);
assert.equal(equilibriumConfig.physics.thermal.wallAmbientConductanceWPerK > 0, true);

const hotOffsetK = 12;
const ambientState = createDefaultFreePhysicsState(
  equilibriumConfig.physics,
  'ideal-thermal-profile-test',
);
const heatedGasTemperatureK = equilibriumConfig.environment.ambientTemperatureK + hotOffsetK;
const heatedState = {
  ...ambientState,
  internalEnergyJ: ambientState.internalEnergyJ! *
    heatedGasTemperatureK /
    equilibriumConfig.environment.ambientTemperatureK,
  gasTemperatureK: heatedGasTemperatureK,
  wallTemperatureK: equilibriumConfig.environment.ambientTemperatureK,
};
const settledState = stepFreePhysics(
  heatedState,
  createHeatCapacityFreeIdealStagePhysicsConfig(equilibriumConfig.physics, 'thermalEquilibrium'),
  {
    pumpValveOpen: false,
    stopcockOpen: false,
  },
  300,
  300,
);
assert.equal(
  Math.abs(settledState.gasTemperatureK - equilibriumConfig.environment.ambientTemperatureK) <=
    HEAT_CAPACITY_FREE_IDEAL_THERMAL_SETTLED_TOLERANCE_K,
  true,
  'ideal full-exchange stage should settle gas temperature within tolerance in 5 minutes',
);
assert.equal(
  Math.abs(settledState.wallTemperatureK - equilibriumConfig.environment.ambientTemperatureK) <=
    HEAT_CAPACITY_FREE_IDEAL_THERMAL_SETTLED_TOLERANCE_K,
  true,
  'ideal full-exchange stage should settle wall temperature within tolerance in 5 minutes',
);

const adiabaticAfterFiveMinutes = stepFreePhysics(
  heatedState,
  createHeatCapacityFreeIdealStagePhysicsConfig(equilibriumConfig.physics, 'fastAdiabatic'),
  {
    pumpValveOpen: false,
    stopcockOpen: false,
  },
  300,
  300,
);
assert.equal(
  Math.abs(adiabaticAfterFiveMinutes.gasTemperatureK - heatedState.gasTemperatureK) < 0.000001,
  true,
  'ideal fast adiabatic stage should not exchange heat even across long simulated time',
);

console.log('heatCapacityFreeIdealParameterProfile tests passed');
