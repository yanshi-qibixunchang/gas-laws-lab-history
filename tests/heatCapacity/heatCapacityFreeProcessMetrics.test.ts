import assert from 'node:assert/strict';
import {
  calculateHeatCapacityRelativeErrorPercent,
} from '../../src/domain/heatCapacity/heatCapacityFreeProcessMetrics.ts';
import {
  calculateHeatCapacityGammaAbsoluteError,
  classifyHeatCapacityGammaAbsoluteError,
  getHeatCapacityFreeGasTypeGamma,
} from '../../src/domain/heatCapacity/heatCapacityGasTheory.ts';

assert.equal(calculateHeatCapacityRelativeErrorPercent(1.37, 1.4), 2.14);
assert.equal(calculateHeatCapacityRelativeErrorPercent(null, 1.4), null);
assert.equal(calculateHeatCapacityRelativeErrorPercent(1.4, 0), null);

const airGamma = getHeatCapacityFreeGasTypeGamma('air');
const heliumGamma = getHeatCapacityFreeGasTypeGamma('helium');
for (const theoreticalGamma of [airGamma, heliumGamma]) {
  assert.equal(classifyHeatCapacityGammaAbsoluteError(
    calculateHeatCapacityGammaAbsoluteError(theoreticalGamma + 0.005, theoreticalGamma),
  ), 'absoluteIdeal');
  assert.equal(classifyHeatCapacityGammaAbsoluteError(
    calculateHeatCapacityGammaAbsoluteError(theoreticalGamma - 0.01, theoreticalGamma),
  ), 'idealExperiment');
  assert.equal(classifyHeatCapacityGammaAbsoluteError(
    calculateHeatCapacityGammaAbsoluteError(theoreticalGamma + 0.03, theoreticalGamma),
  ), 'bestRealistic');
  assert.equal(classifyHeatCapacityGammaAbsoluteError(
    calculateHeatCapacityGammaAbsoluteError(theoreticalGamma - 0.06, theoreticalGamma),
  ), 'suitable');
  assert.equal(classifyHeatCapacityGammaAbsoluteError(
    calculateHeatCapacityGammaAbsoluteError(theoreticalGamma + 0.1, theoreticalGamma),
  ), 'severe');
}

console.log('heatCapacityFreeProcessMetrics tests passed');
