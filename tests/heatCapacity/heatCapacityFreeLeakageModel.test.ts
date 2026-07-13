import assert from 'node:assert/strict';
import {
  normalizeFreeLeakageConfig,
  stepFreeLeakageAmountRatio,
  stepFreeLeakageThermodynamicState,
  type HeatCapacityFreeLeakageConfig,
} from '../../src/domain/heatCapacity/heatCapacityFreeLeakageModel.ts';
import {
  createHeatCapacityThermodynamicStateAtAmbient,
  createHeatCapacityThermodynamicStateFromTemperature,
  deriveHeatCapacityThermodynamicState,
} from '../../src/domain/heatCapacity/heatCapacityThermodynamicKernel.ts';

const baseInput = {
  ambientPressureKPa: 101.3,
  ambientTemperatureK: 298.15,
  gasAmountRatio: 1,
  gasTemperatureK: 298.15,
  dtS: 10,
};

const disabled: HeatCapacityFreeLeakageConfig = {
  enabled: false,
  ratePerS: 0.00005,
};

const enabled: HeatCapacityFreeLeakageConfig = {
  enabled: true,
  ratePerS: 0.0005,
};

assert.deepEqual(normalizeFreeLeakageConfig(undefined), disabled);
assert.deepEqual(normalizeFreeLeakageConfig({ enabled: true, ratePerS: 0.001 }), {
  enabled: true,
  ratePerS: 0.001,
});
assert.deepEqual(normalizeFreeLeakageConfig({ enabled: true, ratePerS: -1 }), {
  enabled: true,
  ratePerS: 0,
});
assert.deepEqual(normalizeFreeLeakageConfig({ enabled: true, ratePerS: Number.POSITIVE_INFINITY }), disabled);

assert.equal(
  stepFreeLeakageAmountRatio(1.08, disabled, {
    ...baseInput,
    gasAmountRatio: 1.08,
  }),
  1.08,
  'disabled leakage must not change gas amount',
);

const leakedAmount = stepFreeLeakageAmountRatio(1.08, enabled, {
  ...baseInput,
  gasAmountRatio: 1.08,
});
assert.equal(leakedAmount < 1.08, true, 'enabled leakage should slowly reduce above-ambient gas amount');
assert.equal(leakedAmount > 1.079, true, 'default leakage should be weak over a 10 s wait');

const highPressureLeak = stepFreeLeakageAmountRatio(1.5, {
  enabled: true,
  ratePerS: 0.001,
}, {
  ...baseInput,
  gasAmountRatio: 1.5,
  dtS: 10,
});
assert.equal(
  highPressureLeak < 1.49,
  true,
  'high pressure leakage should follow a gas-leak pressure-squared drive instead of the old weak linear pressure delta',
);

const weakLeakAfterFiveMinutes = stepFreeLeakageAmountRatio(1.08, {
  enabled: true,
  ratePerS: 0.00005,
}, {
  ...baseInput,
  gasAmountRatio: 1.08,
  dtS: 300,
});
assert.equal(
  weakLeakAfterFiveMinutes > 1.075,
  true,
  'realistic weak leakage should remain a small effect over the normal 5 minute wait',
);

assert.equal(
  stepFreeLeakageAmountRatio(1, enabled, baseInput),
  1,
  'ambient pressure should not leak or drift',
);
const recoveredLowPressureAmount = stepFreeLeakageAmountRatio(0.96, enabled, {
  ...baseInput,
  gasAmountRatio: 0.96,
});
assert.equal(recoveredLowPressureAmount > 0.96, true, 'below-ambient pressure should draw gas back in');
assert.equal(recoveredLowPressureAmount < 1, true, 'default leakage should weakly approach ambient equilibrium');
assert.equal(
  stepFreeLeakageAmountRatio(0.98, enabled, {
    ...baseInput,
    gasAmountRatio: 0.98,
    gasTemperatureK: 310,
  }) <= 0.98,
  true,
  'hot gas that is still above ambient pressure should leak outward toward pressure equilibrium',
);

assert.equal(
  stepFreeLeakageAmountRatio(1.01, { enabled: true, ratePerS: 10 }, {
    ...baseInput,
    gasAmountRatio: 1.01,
    dtS: 100,
  }),
  1,
  'closed-bottle micro-leak should not drive the amount below the ambient baseline',
);

assert.equal(
  Number.isFinite(stepFreeLeakageAmountRatio(Number.NaN, enabled, {
    ...baseInput,
    gasAmountRatio: Number.NaN,
    dtS: Number.NaN,
  })),
  true,
  'leakage output must remain finite for invalid numeric input',
);

const thermodynamicInitialization = createHeatCapacityThermodynamicStateAtAmbient({
  ambientPressureKPa: baseInput.ambientPressureKPa,
  ambientTemperatureK: baseInput.ambientTemperatureK,
  vesselVolumeL: 2,
  gammaTrue: 1.4,
});
const thermodynamicLeakStart = createHeatCapacityThermodynamicStateFromTemperature({
  amountMol: thermodynamicInitialization.system.referenceAmountMol * 1.08,
  gasTemperatureK: baseInput.ambientTemperatureK + 8,
  wallTemperatureK: baseInput.ambientTemperatureK,
  gammaTrue: thermodynamicInitialization.system.gammaTrue,
});
const thermodynamicLeakEnd = stepFreeLeakageThermodynamicState(
  thermodynamicLeakStart,
  thermodynamicInitialization.system,
  enabled,
  {
    ambientPressureKPa: baseInput.ambientPressureKPa,
    ambientTemperatureK: baseInput.ambientTemperatureK,
    dtS: baseInput.dtS,
  },
);
const thermodynamicLeakStartDerived = deriveHeatCapacityThermodynamicState(
  thermodynamicLeakStart,
  thermodynamicInitialization.system,
);
const thermodynamicLeakEndDerived = deriveHeatCapacityThermodynamicState(
  thermodynamicLeakEnd,
  thermodynamicInitialization.system,
);
assert.equal(thermodynamicLeakEnd.amountMol < thermodynamicLeakStart.amountMol, true);
assert.equal(
  Math.abs(
    thermodynamicLeakEndDerived.gasTemperatureK -
    thermodynamicLeakStartDerived.gasTemperatureK
  ) < 1e-10,
  true,
  'outward leakage must remove the current molar internal energy without a temperature jump',
);
const leakageAmountDeltaMol = thermodynamicLeakEnd.amountMol - thermodynamicLeakStart.amountMol;
const leakageInternalEnergyDeltaJ = thermodynamicLeakEnd.internalEnergyJ -
  thermodynamicLeakStart.internalEnergyJ;
assert.equal(
  Math.abs(
    leakageInternalEnergyDeltaJ / leakageAmountDeltaMol -
    thermodynamicLeakStartDerived.cvMolarJPerMolK *
      thermodynamicLeakStartDerived.gasTemperatureK
  ) < 1e-9,
  true,
  'leakage mass and internal-energy fluxes must use the same outgoing gas state',
);

console.log('heatCapacityFreeLeakageModel tests passed');
