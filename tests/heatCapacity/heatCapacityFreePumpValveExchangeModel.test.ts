import assert from 'node:assert/strict';
import {
  normalizeFreePumpValveExchangeConfig,
  stepFreePumpValveExchange,
  stepFreePumpValveThermodynamicExchange,
  type HeatCapacityFreePumpValveExchangeConfig,
} from '../../src/domain/heatCapacity/heatCapacityFreePumpValveExchangeModel.ts';
import {
  createHeatCapacityThermodynamicStateAtAmbient,
  createHeatCapacityThermodynamicStateFromTemperature,
  deriveHeatCapacityThermodynamicState,
} from '../../src/domain/heatCapacity/heatCapacityThermodynamicKernel.ts';

const baseInput = {
  ambientPressureKPa: 101.3,
  ambientTemperatureK: 298.15,
  vesselVolumeL: 2,
  gamma: 1.4,
  dtS: 1,
  valveOpenElapsedBeforeS: 1,
};

const disabled: HeatCapacityFreePumpValveExchangeConfig = {
  enabled: false,
  gasExchangeRatePerS: 0.00015,
  thermalConductanceWPerK: 0.01,
  openingDelayS: 0.42,
};

const enabled: HeatCapacityFreePumpValveExchangeConfig = {
  ...disabled,
  enabled: true,
};

const expectClose = (actual: number, expected: number, tolerance: number, message: string) => {
  assert.equal(
    Math.abs(actual - expected) <= tolerance,
    true,
    `${message}: expected ${actual} to be within ${tolerance} of ${expected}`,
  );
};

assert.deepEqual(normalizeFreePumpValveExchangeConfig(undefined), disabled);
assert.deepEqual(normalizeFreePumpValveExchangeConfig({ enabled: true, gasExchangeRatePerS: 0.001 }), {
  ...disabled,
  enabled: true,
  gasExchangeRatePerS: 0.001,
});
assert.deepEqual(normalizeFreePumpValveExchangeConfig({
  enabled: true,
  gasExchangeRatePerS: Number.POSITIVE_INFINITY,
}), disabled);

const initialState = {
  gasAmountRatio: 1.08,
  gasTemperatureK: 304,
};

assert.deepEqual(
  stepFreePumpValveExchange(initialState, disabled, baseInput).state,
  initialState,
  'disabled pump-valve exchange must not alter gas state',
);

const beforeDelay = stepFreePumpValveExchange(initialState, enabled, {
  ...baseInput,
  valveOpenElapsedBeforeS: 0.1,
  dtS: 0.2,
});
assert.deepEqual(
  beforeDelay.state,
  initialState,
  'pump-valve exchange must not start before the opening animation delay has elapsed',
);
assert.equal(beforeDelay.activeDtS, 0);

const crossingDelay = stepFreePumpValveExchange(initialState, enabled, {
  ...baseInput,
  valveOpenElapsedBeforeS: 0.3,
  dtS: 0.2,
});
expectClose(crossingDelay.activeDtS, 0.08, 1e-12, 'only the post-delay part of a step should exchange');

const outward = stepFreePumpValveExchange(initialState, {
  ...enabled,
  gasExchangeRatePerS: 0.001,
  thermalConductanceWPerK: 0,
}, baseInput);
assert.equal(outward.state.gasAmountRatio < initialState.gasAmountRatio, true);
assert.equal(outward.gasExchangeAmountRatio < 0, true);
assert.equal(
  outward.state.gasAmountRatio > 1,
  true,
  'weak pump-valve leakage should move toward pressure equilibrium without clamping in one step',
);

const inward = stepFreePumpValveExchange({
  gasAmountRatio: 0.96,
  gasTemperatureK: 298.15,
}, {
  ...enabled,
  gasExchangeRatePerS: 0.001,
  thermalConductanceWPerK: 0,
}, baseInput);
assert.equal(inward.state.gasAmountRatio > 0.96, true);
assert.equal(inward.gasExchangeAmountRatio > 0, true);

const hotGas = stepFreePumpValveExchange({
  gasAmountRatio: 1,
  gasTemperatureK: 308.15,
}, {
  ...enabled,
  gasExchangeRatePerS: 0,
  thermalConductanceWPerK: 0.05,
}, baseInput);
assert.equal(
  hotGas.state.gasTemperatureK < 308.15,
  true,
  'pump-valve thermal exchange should cool gas that is hotter than the pump chamber',
);
assert.equal(hotGas.heatGasToChamberJ > 0, true);

const coldGas = stepFreePumpValveExchange({
  gasAmountRatio: 1,
  gasTemperatureK: 296,
}, {
  ...enabled,
  gasExchangeRatePerS: 0,
  thermalConductanceWPerK: 0.05,
}, baseInput);
assert.equal(
  coldGas.state.gasTemperatureK > 296,
  true,
  'pump-valve thermal exchange should warm gas that is colder than the pump chamber',
);
assert.equal(coldGas.heatGasToChamberJ < 0, true);

const ambient = stepFreePumpValveExchange({
  gasAmountRatio: 1,
  gasTemperatureK: 298.15,
}, enabled, baseInput);
assert.equal(
  Math.abs(ambient.gasExchangeAmountRatio) < 1e-12,
  true,
  'equal pressure before the first pump stroke should not exchange gas',
);

const deterministicA = stepFreePumpValveExchange(initialState, enabled, baseInput);
const deterministicB = stepFreePumpValveExchange(initialState, enabled, baseInput);
assert.deepEqual(deterministicA, deterministicB, 'pump-valve exchange must be deterministic');

const finite = stepFreePumpValveExchange({
  gasAmountRatio: Number.NaN,
  gasTemperatureK: Number.NaN,
}, {
  enabled: true,
  gasExchangeRatePerS: Number.NaN,
  thermalConductanceWPerK: Number.NaN,
  openingDelayS: Number.NaN,
}, {
  ...baseInput,
  dtS: Number.NaN,
});
assert.equal(Number.isFinite(finite.state.gasAmountRatio), true);
assert.equal(Number.isFinite(finite.state.gasTemperatureK), true);

const thermodynamicInitialization = createHeatCapacityThermodynamicStateAtAmbient({
  ambientPressureKPa: baseInput.ambientPressureKPa,
  ambientTemperatureK: baseInput.ambientTemperatureK,
  vesselVolumeL: baseInput.vesselVolumeL,
  gammaTrue: baseInput.gamma,
});
const thermodynamicOutflowStart = createHeatCapacityThermodynamicStateFromTemperature({
  amountMol: thermodynamicInitialization.system.referenceAmountMol * 1.08,
  gasTemperatureK: 304,
  wallTemperatureK: baseInput.ambientTemperatureK,
  gammaTrue: baseInput.gamma,
});
const thermodynamicOutflowEnd = stepFreePumpValveThermodynamicExchange(
  thermodynamicOutflowStart,
  thermodynamicInitialization.system,
  {
    ...enabled,
    gasExchangeRatePerS: 0.001,
    thermalConductanceWPerK: 0,
    openingDelayS: 0,
  },
  baseInput,
);
const thermodynamicOutflowStartDerived = deriveHeatCapacityThermodynamicState(
  thermodynamicOutflowStart,
  thermodynamicInitialization.system,
);
const thermodynamicOutflowEndDerived = deriveHeatCapacityThermodynamicState(
  thermodynamicOutflowEnd.state,
  thermodynamicInitialization.system,
);
assert.equal(thermodynamicOutflowEnd.gasExchangeAmountMol < 0, true);
expectClose(
  thermodynamicOutflowEndDerived.gasTemperatureK,
  thermodynamicOutflowStartDerived.gasTemperatureK,
  1e-10,
  'thermodynamic pump-valve outflow should remove current molar internal energy',
);

const clampedThermalExchange = stepFreePumpValveThermodynamicExchange(
  createHeatCapacityThermodynamicStateFromTemperature({
    amountMol: thermodynamicInitialization.system.referenceAmountMol,
    gasTemperatureK: 400,
    wallTemperatureK: baseInput.ambientTemperatureK,
    gammaTrue: baseInput.gamma,
  }),
  thermodynamicInitialization.system,
  {
    ...enabled,
    gasExchangeRatePerS: 0,
    thermalConductanceWPerK: 1,
    openingDelayS: 0,
  },
  {
    ...baseInput,
    dtS: 1_000_000,
  },
);
expectClose(
  deriveHeatCapacityThermodynamicState(
    clampedThermalExchange.state,
    thermodynamicInitialization.system,
  ).gasTemperatureK,
  baseInput.ambientTemperatureK,
  1e-10,
  'pump-valve thermal exchange should clamp at chamber equilibrium instead of overshooting',
);

console.log('heatCapacityFreePumpValveExchangeModel tests passed');
