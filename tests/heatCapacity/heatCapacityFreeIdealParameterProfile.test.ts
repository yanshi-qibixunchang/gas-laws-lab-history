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
assert.equal(fastConfig.sensor.pressureNonlinearity?.enabled, false);
assert.equal(fastConfig.pressureWarningMv, 120);
assert.equal(fastConfig.instrumentNoiseEnabled, false);
assert.equal(fastConfig.thermalMode, 'adiabatic');
assert.equal(fastConfig.physics.thermal.gasWallConductanceWPerK, 0);
assert.equal(fastConfig.physics.thermal.wallAmbientConductanceWPerK, 0);

const equilibriumConfig = createHeatCapacityFreeIdealEffectiveConfigs('thermalEquilibrium');
assert.equal(equilibriumConfig.environment.ambientPressureKPa, 101.3);
assert.equal(equilibriumConfig.environment.ambientTemperatureK, 298.15);
assert.equal(equilibriumConfig.physics.gamma, 1.4);
assert.equal(equilibriumConfig.physics.leakage.enabled, false);
assert.equal(equilibriumConfig.physics.environmentDisturbance?.enabled, false);
assert.equal(equilibriumConfig.sensor.noiseMv, 0);
assert.equal(equilibriumConfig.sensor.pressureNonlinearity?.enabled, false);
assert.equal(equilibriumConfig.instrumentNoiseEnabled, false);
assert.equal(equilibriumConfig.thermalMode, 'full-exchange');
assert.equal(equilibriumConfig.physics.thermal.gasWallConductanceWPerK > 0, true);
assert.equal(equilibriumConfig.physics.thermal.wallAmbientConductanceWPerK > 0, true);

const hotOffsetK = 12;
const heatedState = {
  ...createDefaultFreePhysicsState(equilibriumConfig.physics, 'ideal-thermal-profile-test'),
  gasTemperatureK: equilibriumConfig.environment.ambientTemperatureK + hotOffsetK,
  wallTemperatureK: equilibriumConfig.environment.ambientTemperatureK,
};
const settledState = stepFreePhysics(
  heatedState,
  createHeatCapacityFreeIdealStagePhysicsConfig(equilibriumConfig.physics, 'thermalEquilibrium'),
  {
    powerOn: true,
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
    powerOn: true,
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
