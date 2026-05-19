import assert from 'node:assert/strict';
import {
  calculateHeatCapacityGamma,
  createDefaultHeatCapacityResult,
  debugHeatCapacityDeterministicCalculation,
  resetHeatCapacityResult,
} from '../../src/domain/heatCapacity/heatCapacityResultModel.ts';
import {
  createDeterministicHeatCapacitySamples,
  recordHeatCapacitySample,
  resetHeatCapacitySamples,
} from '../../src/domain/heatCapacity/heatCapacitySampling.ts';

const nearlyEqual = (actual: number | null, expected: number, epsilon = 1e-9) => {
  assert.equal(typeof actual, 'number');
  assert.equal(Math.abs(actual! - expected) <= epsilon, true);
};

const deterministicSamples = createDeterministicHeatCapacitySamples();
const deterministicResult = calculateHeatCapacityGamma(deterministicSamples, {
  atmosphericPressureKPa: 101.3,
  pressureSensitivityMvPerKPa: 20,
  theoreticalGamma: 1.4,
});

assert.equal(deterministicResult.status, 'ready');
assert.equal(deterministicResult.ready, true);
assert.equal(deterministicResult.experimentObject, 'air');
assert.equal(deterministicResult.theoreticalGamma, 1.4);
assert.equal(deterministicResult.U0Mv, 0);
assert.equal(deterministicResult.U1Mv, 120);
assert.equal(deterministicResult.U2Mv, 34.3);
assert.equal(deterministicResult.deltaP1KPa, 6);
nearlyEqual(deterministicResult.deltaP2KPa, 1.715);
assert.equal(deterministicResult.P0KPa, 101.3);
assert.equal(deterministicResult.P1KPa, 107.3);
nearlyEqual(deterministicResult.P2KPa, 103.015);
assert.equal(deterministicResult.gamma !== null && deterministicResult.gamma >= 1.37 && deterministicResult.gamma <= 1.41, true);
assert.equal(deterministicResult.relativeErrorPercent !== null && deterministicResult.relativeErrorPercent >= 0, true);
assert.equal(deterministicResult.message, '空气比热容比计算完成。');

const debugResult = debugHeatCapacityDeterministicCalculation();
assert.equal(debugResult.status, 'ready');

const sampleMap = deterministicSamples.reduce(
  (samples, sample) => recordHeatCapacitySample(samples, sample),
  resetHeatCapacitySamples(),
);
assert.equal(calculateHeatCapacityGamma(sampleMap).status, 'ready');

const withoutU1 = deterministicSamples.filter((sample) => sample.key !== 'beforeRelease');
const withoutU2 = deterministicSamples.filter((sample) => sample.key !== 'afterRecovery');
assert.equal(calculateHeatCapacityGamma(withoutU1).status, 'missing-samples');
assert.equal(calculateHeatCapacityGamma(withoutU1).ready, false);
assert.equal(calculateHeatCapacityGamma(withoutU1).gamma, null);
assert.equal(calculateHeatCapacityGamma(withoutU2).status, 'missing-samples');
assert.equal(calculateHeatCapacityGamma(withoutU2).ready, false);
assert.equal(calculateHeatCapacityGamma(withoutU2).gamma, null);

const reversedSignals = deterministicSamples.map((sample) => {
  if (sample.key === 'beforeRelease') return { ...sample, pressureSignalMv: 34.3 };
  if (sample.key === 'afterRecovery') return { ...sample, pressureSignalMv: 120 };
  return sample;
});
assert.equal(calculateHeatCapacityGamma(reversedSignals).status, 'invalid-data');
assert.equal(calculateHeatCapacityGamma(reversedSignals).ready, false);
assert.equal(calculateHeatCapacityGamma(reversedSignals).gamma, null);

assert.equal(calculateHeatCapacityGamma(deterministicSamples, { pressureSensitivityMvPerKPa: 0 }).status, 'invalid-data');
assert.equal(calculateHeatCapacityGamma(deterministicSamples, { pressureSensitivityMvPerKPa: 0 }).ready, false);
assert.equal(calculateHeatCapacityGamma(deterministicSamples, { pressureSensitivityMvPerKPa: 0 }).gamma, null);
assert.equal(calculateHeatCapacityGamma(deterministicSamples, { atmosphericPressureKPa: 0 }).status, 'invalid-data');
assert.equal(calculateHeatCapacityGamma(deterministicSamples, { atmosphericPressureKPa: 0 }).ready, false);
assert.equal(calculateHeatCapacityGamma(deterministicSamples, { atmosphericPressureKPa: 0 }).gamma, null);

const defaultResult = createDefaultHeatCapacityResult();
assert.equal(defaultResult.status, 'not-ready');
assert.equal(defaultResult.ready, false);
assert.equal(defaultResult.U0Mv, null);
assert.equal(defaultResult.U1Mv, null);
assert.equal(defaultResult.U2Mv, null);
assert.equal(defaultResult.deltaP1KPa, null);
assert.equal(defaultResult.deltaP2KPa, null);
assert.equal(defaultResult.P1KPa, null);
assert.equal(defaultResult.P2KPa, null);
assert.equal(defaultResult.gamma, null);
assert.equal(defaultResult.relativeErrorPercent, null);
assert.deepEqual(resetHeatCapacityResult(), defaultResult);

console.log('heatCapacityResultModel tests passed');


