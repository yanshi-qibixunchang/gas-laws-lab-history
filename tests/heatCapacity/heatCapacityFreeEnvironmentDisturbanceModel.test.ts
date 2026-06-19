import assert from 'node:assert/strict';
import {
  DEFAULT_HEAT_CAPACITY_FREE_ENVIRONMENT_DISTURBANCE_CONFIG,
  normalizeFreeEnvironmentDisturbanceConfig,
  sampleFreeEnvironmentDisturbance,
  type HeatCapacityFreeEnvironmentDisturbanceConfig,
} from '../../src/domain/heatCapacity/heatCapacityFreeEnvironmentDisturbanceModel.ts';

const baseInput = {
  ambientPressureKPa: 101.3,
  ambientTemperatureK: 298.15,
  timeS: 120,
  seed: 'environment-a',
};

const disabled: HeatCapacityFreeEnvironmentDisturbanceConfig = {
  enabled: false,
  pressureAmplitudeKPa: 0.002,
  temperatureAmplitudeK: 0.015,
  timeScaleS: 180,
};

const enabled: HeatCapacityFreeEnvironmentDisturbanceConfig = {
  ...disabled,
  enabled: true,
};

assert.deepEqual(normalizeFreeEnvironmentDisturbanceConfig(undefined), disabled);
assert.deepEqual(normalizeFreeEnvironmentDisturbanceConfig({
  enabled: true,
  pressureAmplitudeKPa: 0.004,
  temperatureAmplitudeK: 0.02,
  timeScaleS: 240,
}), {
  enabled: true,
  pressureAmplitudeKPa: 0.004,
  temperatureAmplitudeK: 0.02,
  timeScaleS: 240,
});
assert.deepEqual(normalizeFreeEnvironmentDisturbanceConfig({
  enabled: true,
  pressureAmplitudeKPa: Number.POSITIVE_INFINITY,
}), DEFAULT_HEAT_CAPACITY_FREE_ENVIRONMENT_DISTURBANCE_CONFIG);

const disabledSample = sampleFreeEnvironmentDisturbance(disabled, baseInput);
assert.deepEqual(disabledSample, {
  ambientPressureKPa: baseInput.ambientPressureKPa,
  ambientTemperatureK: baseInput.ambientTemperatureK,
  pressureOffsetKPa: 0,
  temperatureOffsetK: 0,
});

const sampleA = sampleFreeEnvironmentDisturbance(enabled, baseInput);
const sampleB = sampleFreeEnvironmentDisturbance(enabled, baseInput);
assert.deepEqual(sampleA, sampleB, 'environment disturbance must be deterministic for the same seed and time');
assert.equal(
  Math.abs(sampleA.pressureOffsetKPa) <= enabled.pressureAmplitudeKPa,
  true,
  'pressure disturbance should stay within configured amplitude',
);
assert.equal(
  Math.abs(sampleA.temperatureOffsetK) <= enabled.temperatureAmplitudeK,
  true,
  'temperature disturbance should stay within configured amplitude',
);
assert.equal(
  Math.abs(sampleA.pressureOffsetKPa) > 0 || Math.abs(sampleA.temperatureOffsetK) > 0,
  true,
  'enabled disturbance should normally produce a non-zero offset',
);

const otherSeed = sampleFreeEnvironmentDisturbance(enabled, {
  ...baseInput,
  seed: 'environment-b',
});
assert.notDeepEqual(sampleA, otherSeed, 'different seeds should produce different disturbance phases');

const shortStep = sampleFreeEnvironmentDisturbance(enabled, {
  ...baseInput,
  timeS: baseInput.timeS + 1,
});
assert.equal(
  Math.abs(shortStep.pressureOffsetKPa - sampleA.pressureOffsetKPa) < enabled.pressureAmplitudeKPa * 0.1,
  true,
  'environment disturbance should drift smoothly over one second',
);
assert.equal(
  Math.abs(shortStep.temperatureOffsetK - sampleA.temperatureOffsetK) < enabled.temperatureAmplitudeK * 0.1,
  true,
  'temperature disturbance should drift smoothly over one second',
);

const finite = sampleFreeEnvironmentDisturbance({
  enabled: true,
  pressureAmplitudeKPa: Number.NaN,
  temperatureAmplitudeK: Number.NaN,
  timeScaleS: Number.NaN,
}, {
  ambientPressureKPa: Number.NaN,
  ambientTemperatureK: Number.NaN,
  timeS: Number.NaN,
  seed: 'bad',
});
assert.equal(Number.isFinite(finite.ambientPressureKPa), true);
assert.equal(Number.isFinite(finite.ambientTemperatureK), true);

console.log('heatCapacityFreeEnvironmentDisturbanceModel tests passed');
