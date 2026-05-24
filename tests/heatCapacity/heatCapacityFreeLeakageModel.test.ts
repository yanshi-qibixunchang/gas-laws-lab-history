import assert from 'node:assert/strict';
import {
  normalizeFreeLeakageConfig,
  stepFreeLeakageAmountRatio,
  type HeatCapacityFreeLeakageConfig,
} from '../../src/domain/heatCapacity/heatCapacityFreeLeakageModel.ts';

const baseInput = {
  ambientPressureKPa: 101.3,
  ambientTemperatureK: 298.15,
  gasAmountRatio: 1,
  gasTemperatureK: 298.15,
  dtS: 10,
};

const expectClose = (actual: number, expected: number, tolerance: number, message: string) => {
  assert.equal(
    Math.abs(actual - expected) <= tolerance,
    true,
    `${message}: expected ${actual} to be within ${tolerance} of ${expected}`,
  );
};

const disabled: HeatCapacityFreeLeakageConfig = {
  enabled: false,
  ratePerS: 0.0005,
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

console.log('heatCapacityFreeLeakageModel tests passed');
