import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  applyFreePressureSensorNonlinearity,
  normalizeFreePressureSensorNonlinearityConfig,
  type HeatCapacityFreePressureSensorNonlinearityConfig,
} from '../../src/domain/heatCapacity/heatCapacityFreePressureSensorNonlinearityModel.ts';

const config: HeatCapacityFreePressureSensorNonlinearityConfig = {
  enabled: true,
  kneeMv: 70,
  minGain: 0.72,
  exponent: 1.8,
  extraNoiseMv: 0.08,
};

const disabled = applyFreePressureSensorNonlinearity(20, {
  ...config,
  enabled: false,
}, { seed: 'disabled', sampleIndex: 1 });
assert.equal(disabled.pressureMv, 20);
assert.equal(disabled.reliability, 1);
assert.equal(disabled.nonlinearErrorMv, 0);
assert.equal(disabled.stochasticErrorMv, 0);

const low = applyFreePressureSensorNonlinearity(20, config);
const high = applyFreePressureSensorNonlinearity(120, config);
assert.equal(low.reliability < high.reliability, true, 'low pressure should have lower reliability');
assert.equal(low.reliability < 0.85, true, '20 mV should be treated as a low-confidence signal');
assert.equal(high.reliability > 0.95, true, '120 mV should remain a high-confidence signal');
assert.equal(
  Math.abs(low.nonlinearErrorMv / 20) > Math.abs(high.nonlinearErrorMv / 120),
  true,
  'low pressure should have larger relative nonlinearity than high pressure',
);
assert.equal(
  Math.abs(high.pressureMv - 120) < 2,
  true,
  'high pressure should stay close to the raw sensor target',
);

const negativeRaw = applyFreePressureSensorNonlinearity(-20, config);
assert.equal(negativeRaw.pressureMv < 0, true, 'negative low pressure should preserve sign');
assert.equal(negativeRaw.reliability, low.reliability);

assert.deepEqual(
  applyFreePressureSensorNonlinearity(20, config, { seed: 'repeatable', sampleIndex: 4 }),
  applyFreePressureSensorNonlinearity(20, config, { seed: 'repeatable', sampleIndex: 4 }),
  'same seed and sample index should reproduce the same low-pressure response',
);

const seededLow = Array.from({ length: 50 }, (_, index) => (
  applyFreePressureSensorNonlinearity(20, config, { seed: `low-${index}`, sampleIndex: index })
));
assert.equal(
  seededLow.some((result) => result.stochasticErrorMv > 0),
  true,
  'low-pressure stochastic error should sometimes be positive',
);
assert.equal(
  seededLow.some((result) => result.stochasticErrorMv < 0),
  true,
  'low-pressure stochastic error should sometimes be negative',
);
assert.equal(
  Math.max(...seededLow.map((result) => Math.abs(result.stochasticErrorMv))) > 0.03,
  true,
  'low-pressure stochastic error should be visible at low signal',
);

const seededHigh = Array.from({ length: 50 }, (_, index) => (
  applyFreePressureSensorNonlinearity(120, config, { seed: `high-${index}`, sampleIndex: index })
));
assert.equal(
  Math.max(...seededHigh.map((result) => Math.abs(result.stochasticErrorMv))) <
    Math.max(...seededLow.map((result) => Math.abs(result.stochasticErrorMv))),
  true,
  'high-pressure stochastic error should be weaker than low-pressure stochastic error',
);

assert.deepEqual(
  normalizeFreePressureSensorNonlinearityConfig({
    enabled: true,
    kneeMv: Number.NaN,
    minGain: -1,
    exponent: Infinity,
    extraNoiseMv: -5,
  }),
  {
    enabled: true,
    kneeMv: 70,
    minGain: 0.72,
    exponent: 1.8,
    extraNoiseMv: 0,
  },
  'normalization should clamp invalid low-pressure sensor parameters',
);

const source = readFileSync(
  join(process.cwd(), 'src', 'domain', 'heatCapacity', 'heatCapacityFreePressureSensorNonlinearityModel.ts'),
  'utf8',
);
assert.doesNotMatch(source, /Math\.random\s*\(/, 'low-pressure sensor model must be deterministic from explicit seeds');

console.log('heatCapacityFreePressureSensorNonlinearityModel tests passed');
