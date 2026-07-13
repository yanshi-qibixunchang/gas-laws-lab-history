import assert from 'node:assert/strict';
import {
  DEFAULT_HEAT_CAPACITY_SENSOR_CONFIG,
  HEAT_CAPACITY_PRESSURE_SENSITIVITY_MV_PER_KPA,
  HEAT_CAPACITY_TEMPERATURE_BASELINE_MV,
  HEAT_CAPACITY_TEMPERATURE_SENSITIVITY_MV_PER_K,
  mapGasTemperatureToSignalMv,
  mapPressureDeltaToSignalMv,
} from '../../src/domain/heatCapacity/heatCapacitySensorMapping.ts';
import {
  DEFAULT_HEAT_CAPACITY_TEMPERATURE_SENSOR_CONFIG,
  createHeatCapacityTemperatureSensorState,
  stepHeatCapacityTemperatureSensor,
} from '../../src/domain/heatCapacity/heatCapacityTemperatureSensorModel.ts';

const AMBIENT_TEMPERATURE_K = 298.15;
const WARM_GAS_TEMPERATURE_K = 308.15;
const EPSILON_K = 1e-10;

const initial = createHeatCapacityTemperatureSensorState(AMBIENT_TEMPERATURE_K);
assert.equal(initial.temperatureK, AMBIENT_TEMPERATURE_K);
assert.equal(
  DEFAULT_HEAT_CAPACITY_TEMPERATURE_SENSOR_CONFIG.tauSensorS,
  0.8,
  'the shared temperature sensor should use the calibrated 0.8 s default time constant',
);

assert.equal(DEFAULT_HEAT_CAPACITY_SENSOR_CONFIG.temperatureBaseMv, 1498.7);
assert.equal(DEFAULT_HEAT_CAPACITY_SENSOR_CONFIG.temperatureSensitivityMvPerK, 5);
assert.equal(HEAT_CAPACITY_TEMPERATURE_BASELINE_MV, 1498.7);
assert.equal(HEAT_CAPACITY_TEMPERATURE_SENSITIVITY_MV_PER_K, 5);
assert.equal(
  mapGasTemperatureToSignalMv(AMBIENT_TEMPERATURE_K, AMBIENT_TEMPERATURE_K),
  1498.7,
);
assert.equal(
  mapGasTemperatureToSignalMv(AMBIENT_TEMPERATURE_K + 1, AMBIENT_TEMPERATURE_K),
  1503.7,
  'a 1 K sensor-temperature rise should produce a 5 mV signal rise',
);
assert.equal(HEAT_CAPACITY_PRESSURE_SENSITIVITY_MV_PER_KPA, 20);
assert.equal(mapPressureDeltaToSignalMv(1), 20, 'pressure mapping should remain 20 mV/kPa');

const oneLargeStep = stepHeatCapacityTemperatureSensor(initial, {
  gasTemperatureK: WARM_GAS_TEMPERATURE_K,
  dtS: 0.8,
});
let eightSmallSteps = initial;
for (let index = 0; index < 8; index += 1) {
  eightSmallSteps = stepHeatCapacityTemperatureSensor(eightSmallSteps, {
    gasTemperatureK: WARM_GAS_TEMPERATURE_K,
    dtS: 0.1,
  });
}
assert.equal(
  Math.abs(oneLargeStep.temperatureK - eightSmallSteps.temperatureK) < EPSILON_K,
  true,
  'exact exponential stepping should be invariant to a constant-target time-step split',
);

const longWait = stepHeatCapacityTemperatureSensor(initial, {
  gasTemperatureK: WARM_GAS_TEMPERATURE_K,
  dtS: 24,
});
assert.equal(
  Math.abs(longWait.temperatureK - WARM_GAS_TEMPERATURE_K) < EPSILON_K,
  true,
  'the sensor temperature should converge to the local gas temperature after a long wait',
);

const acceleratedWait = stepHeatCapacityTemperatureSensor(initial, {
  gasTemperatureK: WARM_GAS_TEMPERATURE_K,
  dtS: 0.125,
  speedMultiplier: 8,
});
const equivalentSimulationTime = stepHeatCapacityTemperatureSensor(initial, {
  gasTemperatureK: WARM_GAS_TEMPERATURE_K,
  dtS: 1,
});
assert.equal(
  Math.abs(acceleratedWait.temperatureK - equivalentSimulationTime.temperatureK) < EPSILON_K,
  true,
  '8x waiting should advance the sensor by the same simulated time as an unscaled 1 s step',
);

console.log('heatCapacityTemperatureSensorModel tests passed');
