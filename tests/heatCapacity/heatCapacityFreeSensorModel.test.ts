import assert from 'node:assert/strict';
import {
  createDefaultFreeSensorState,
  createSeededFreePressureInitialBiasMv,
  getFreeSensorDisplay,
  stepFreeSensor,
  type HeatCapacityFreePhysicalDisplayInput,
  type HeatCapacityFreeSensorConfig,
} from '../../src/domain/heatCapacity/heatCapacityFreeSensorModel.ts';
import {
  type HeatCapacityFreeCalibrationState,
} from '../../src/domain/heatCapacity/heatCapacityFreeCalibrationModel.ts';

const baseConfig: HeatCapacityFreeSensorConfig = {
  pressureMvPerKPa: 20,
  temperatureMvAtAmbient: 1499,
  temperatureMvPerK: 2,
  lagRate: 3,
  noiseMv: 0.04,
  quantizationMv: 0.01,
  minSampleIntervalS: 0.25,
  maxSampleIntervalS: 0.75,
  historyWindowS: 2,
};

const quietConfig: HeatCapacityFreeSensorConfig = {
  ...baseConfig,
  noiseMv: 0,
  quantizationMv: 0.001,
  minSampleIntervalS: 0.1,
  maxSampleIntervalS: 0.1,
};

const lowPressureNonlinearConfig: HeatCapacityFreeSensorConfig = {
  ...quietConfig,
  lagRate: 1000,
  pressureNonlinearity: {
    enabled: true,
    kneeMv: 70,
    minGain: 0.72,
    exponent: 1.8,
    extraNoiseMv: 0.08,
  },
};

const calibration: HeatCapacityFreeCalibrationState = {
  calibrationVersion: 1,
  zeroOffsetMv: 0.25,
  zeroEvents: [],
  automaticU0: null,
};

const ambientPhysical: HeatCapacityFreePhysicalDisplayInput = {
  gasPressureKPa: 101.3,
  pressureDeltaKPa: 0,
  gasTemperatureK: 298.15,
  ambientTemperatureK: 298.15,
};

const seededInitialBiasMv = createSeededFreePressureInitialBiasMv('initial-bias', 1.5);
assert.equal(seededInitialBiasMv, createSeededFreePressureInitialBiasMv('initial-bias', 1.5));
assert.equal(
  seededInitialBiasMv >= -1.5 && seededInitialBiasMv <= 1.5,
  true,
  'seeded initial pressure-zero bias should stay inside the physical adjustment range',
);
assert.equal(
  Math.abs(seededInitialBiasMv) >= 0.25,
  true,
  'seeded initial pressure-zero bias should remain large enough to require visible zero adjustment',
);

const jumpedPhysical: HeatCapacityFreePhysicalDisplayInput = {
  gasPressureKPa: 111.3,
  pressureDeltaKPa: 10,
  gasTemperatureK: 301.15,
  ambientTemperatureK: 298.15,
};

const runSequence = (seed: number | string) => {
  let state = createDefaultFreeSensorState(seed, {
    pressureMv: 0,
    temperatureMv: 1499,
    sensorTemperatureK: 298.15,
  });
  state = stepFreeSensor(state, ambientPhysical, calibration, baseConfig, 0);
  state = stepFreeSensor(state, jumpedPhysical, calibration, baseConfig, state.nextSampleAtS);
  state = stepFreeSensor(state, jumpedPhysical, calibration, baseConfig, state.nextSampleAtS);
  return state;
};

assert.deepEqual(
  runSequence('sensor-seed'),
  runSequence('sensor-seed'),
  'same seed and physical sequence should reproduce identical Free sensor display',
);
assert.notDeepEqual(
  getFreeSensorDisplay(runSequence('sensor-seed')),
  getFreeSensorDisplay(runSequence('different-seed')),
  'different seeds should produce different deterministic sensor noise',
);

const lagStart = createDefaultFreeSensorState('lag', {
  pressureMv: 0,
  temperatureMv: 1499,
  sensorTemperatureK: 298.15,
});
const lagged = stepFreeSensor(lagStart, jumpedPhysical, calibration, quietConfig, 0.1);
assert.equal(lagged.displayPressureMv > 0, true);
assert.equal(
  lagged.displayPressureMv < jumpedPhysical.pressureDeltaKPa * quietConfig.pressureMvPerKPa,
  true,
  'display pressure should lag a physical pressure jump',
);
assert.equal(lagged.displayTemperatureMv > 1499, true);
assert.equal(lagged.displayTemperatureMv < 1499 + 3 * quietConfig.temperatureMvPerK, true);

const lowNonlinear = stepFreeSensor(
  createDefaultFreeSensorState('low-nonlinear', {
    pressureMv: 0,
    pressureInitialBiasMv: 0,
    temperatureMv: 1499,
    sensorTemperatureK: 298.15,
  }),
  {
    ...ambientPhysical,
    gasPressureKPa: 102.3,
    pressureDeltaKPa: 1,
  },
  { ...calibration, zeroOffsetMv: 0 },
  lowPressureNonlinearConfig,
  0.1,
);
const highNonlinear = stepFreeSensor(
  createDefaultFreeSensorState('high-nonlinear', {
    pressureMv: 0,
    pressureInitialBiasMv: 0,
    temperatureMv: 1499,
    sensorTemperatureK: 298.15,
  }),
  {
    ...ambientPhysical,
    gasPressureKPa: 107.3,
    pressureDeltaKPa: 6,
  },
  { ...calibration, zeroOffsetMv: 0 },
  lowPressureNonlinearConfig,
  0.1,
);
assert.equal(lowNonlinear.displayPressureMv < 20, true, 'low-pressure display should be compressed before lag and quantization');
assert.equal(Math.abs(highNonlinear.displayPressureMv - 120) < 2, true, 'high-pressure display should remain close to linear');
assert.equal(lowNonlinear.pressureReliability < highNonlinear.pressureReliability, true);
assert.equal(lowNonlinear.pressureReliability < 0.85, true);
assert.notEqual(lowNonlinear.pressureStochasticErrorMv, 0);

const warmRoomTemperatureMvAtAmbient = 1499 + (303.15 - 298.15) * quietConfig.temperatureMvPerK;
const warmRoom = stepFreeSensor(
  createDefaultFreeSensorState('ambient-303', {
    pressureMv: 0,
    pressureInitialBiasMv: 0,
    temperatureMv: warmRoomTemperatureMvAtAmbient,
    sensorTemperatureK: 303.15,
  }),
  {
    gasPressureKPa: 101.3,
    pressureDeltaKPa: 0,
    gasTemperatureK: 303.15,
    ambientTemperatureK: 303.15,
  },
  { ...calibration, zeroOffsetMv: 0 },
  {
    ...quietConfig,
    temperatureMvAtAmbient: warmRoomTemperatureMvAtAmbient,
    lagRate: 1000,
  },
  0.1,
);
assert.equal(warmRoom.displayTemperatureMv, warmRoomTemperatureMvAtAmbient);

const biasedStart = createDefaultFreeSensorState('biased-zero', {
  pressureMv: 0.73,
  temperatureMv: 1499,
  sensorTemperatureK: 298.15,
});
const biasedAmbient = stepFreeSensor(
  biasedStart,
  ambientPhysical,
  { ...calibration, zeroOffsetMv: 0 },
  quietConfig,
  0.1,
);
assert.equal(
  Math.abs(biasedAmbient.displayPressureMv - 0.73) < 0.001,
  true,
  'initial Free pressure bias should remain visible before zero adjustment',
);
const zeroedBiasedAmbient = stepFreeSensor(
  biasedAmbient,
  ambientPhysical,
  { ...calibration, zeroOffsetMv: -0.73 },
  { ...quietConfig, lagRate: 100 },
  0.2,
);
assert.equal(
  Math.abs(zeroedBiasedAmbient.displayPressureMv - 0.73) < 0.001,
  true,
  'Free pressure zero offset should not mutate the raw sensor measurement',
);

const instantZeroDisplay = getFreeSensorDisplay(
  biasedAmbient,
  { ...calibration, zeroOffsetMv: -0.73 },
  quietConfig,
);
assert.equal(
  Math.abs(instantZeroDisplay.displayPressureMv) < 0.001,
  true,
  'Free zero offset should apply immediately at the display/calibration layer without sensor lag',
);
const rawSensorAfterZeroOffsetChange = stepFreeSensor(
  biasedAmbient,
  ambientPhysical,
  { ...calibration, zeroOffsetMv: -0.73 },
  { ...quietConfig, lagRate: 0.1 },
  0.2,
);
assert.equal(
  Math.abs(rawSensorAfterZeroOffsetChange.displayPressureMv - biasedAmbient.displayPressureMv) < 0.001,
  true,
  'Free sensor state should remain the unzeroed measurement when only the zero knob changes',
);

const sampled = stepFreeSensor(
  createDefaultFreeSensorState('intervals', {
    pressureMv: 0,
    temperatureMv: 1499,
    sensorTemperatureK: 298.15,
  }),
  ambientPhysical,
  calibration,
  baseConfig,
  0,
);
assert.equal(sampled.nextSampleAtS >= baseConfig.minSampleIntervalS, true);
assert.equal(sampled.nextSampleAtS <= baseConfig.maxSampleIntervalS, true);
const beforeNextSample = stepFreeSensor(
  sampled,
  jumpedPhysical,
  calibration,
  baseConfig,
  sampled.nextSampleAtS - 0.001,
);
assert.deepEqual(beforeNextSample, sampled, 'sensor should wait until its seeded next sample time');
const afterNextSample = stepFreeSensor(
  sampled,
  jumpedPhysical,
  calibration,
  baseConfig,
  sampled.nextSampleAtS,
);
assert.notEqual(afterNextSample.displayPressureMv, sampled.displayPressureMv);

const recordDisplay = getFreeSensorDisplay(lagged);
assert.equal(recordDisplay.displayPressureMv, lagged.displayPressureMv);
assert.notEqual(
  recordDisplay.displayPressureMv,
  jumpedPhysical.pressureDeltaKPa * quietConfig.pressureMvPerKPa,
  'records should read final display values rather than physical truth',
);

let stable = createDefaultFreeSensorState('stable', {
  pressureMv: 0,
  temperatureMv: 1499,
  sensorTemperatureK: 298.15,
});
for (let index = 0; index < 8; index += 1) {
  stable = stepFreeSensor(stable, ambientPhysical, { ...calibration, zeroOffsetMv: 0 }, quietConfig, index * 0.1);
}
assert.equal(Math.abs(stable.pressureSlopeMvPerS) < 0.001, true);
assert.equal(Math.abs(stable.temperatureSlopeMvPerS) < 0.001, true);
assert.equal(
  stable.pressureHistory.every((sample) => stable.nextSampleAtS - sample.atS <= quietConfig.historyWindowS + 0.1),
  true,
  'sensor should keep a bounded pressure display history window',
);

let unstable = stable;
for (let index = 0; index < 5; index += 1) {
  unstable = stepFreeSensor(unstable, jumpedPhysical, { ...calibration, zeroOffsetMv: 0 }, quietConfig, 1 + index * 0.1);
}
assert.equal(Math.abs(unstable.pressureSlopeMvPerS) > 1, true);
assert.equal(Math.abs(unstable.temperatureSlopeMvPerS) > 0.1, true);

console.log('heatCapacityFreeSensorModel tests passed');
