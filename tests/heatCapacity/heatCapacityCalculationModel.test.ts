import assert from 'node:assert/strict';
import {
  calculateHeatCapacityAbsolutePressure,
  calculateHeatCapacityBatchStatistics,
  calculateHeatCapacityCorrectedVoltage,
  calculateHeatCapacityFormulaGamma,
  calculateHeatCapacityGroupReference,
  calculateHeatCapacityMean,
  calculateHeatCapacityRelativeErrorPercent,
  calculateHeatCapacitySampleStandardDeviation,
  calculateHeatCapacityTypeAStandardUncertainty,
} from '../../src/domain/heatCapacity/heatCapacityCalculationModel.ts';

const closeTo = (
  actual: number,
  expected: number,
  tolerance = 1e-12,
) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
};

assert.equal(calculateHeatCapacityCorrectedVoltage(112.3, 0.2), 112.1);
assert.equal(calculateHeatCapacityCorrectedVoltage(Number.NaN, 0), null);

assert.equal(calculateHeatCapacityAbsolutePressure(101.3, 112.1, 20), 106.905);
assert.equal(calculateHeatCapacityAbsolutePressure(101.3, 112.1, 0), null);
assert.equal(calculateHeatCapacityAbsolutePressure(-1, 112.1, 20), null);

const formulaGamma = calculateHeatCapacityFormulaGamma(101.3, 106.905, 102.9);
assert.notEqual(formulaGamma, null);
closeTo(
  formulaGamma!,
  Math.log(106.905 / 101.3) / Math.log(106.905 / 102.9),
);
assert.equal(calculateHeatCapacityFormulaGamma(101.3, 102.9, 106.905), null);
assert.equal(calculateHeatCapacityFormulaGamma(101.3, 106.905, 101.3), null);

const groupInput = {
  u0Mv: 0.2,
  u1Mv: 112.3,
  u2Mv: 32.2,
  atmosphericPressureKPa: 101.3,
  pressureSensitivityMvPerKPa: 20,
};
const groupInputBefore = structuredClone(groupInput);
const group = calculateHeatCapacityGroupReference(groupInput);
assert.notEqual(group, null);
assert.deepEqual(groupInput, groupInputBefore, 'calculation must not mutate source records');
assert.deepEqual({
  u1PrimeMv: group?.u1PrimeMv,
  u2PrimeMv: group?.u2PrimeMv,
  p0KPa: group?.p0KPa,
  p1KPa: group?.p1KPa,
  p2KPa: group?.p2KPa,
}, {
  u1PrimeMv: 112.1,
  u2PrimeMv: 32,
  p0KPa: 101.3,
  p1KPa: 106.905,
  p2KPa: 102.9,
});
closeTo(group!.formulaGamma, 1.410424886137353, 1e-14);

assert.equal(calculateHeatCapacityGroupReference({
  ...groupInput,
  u2Mv: 0.2,
}), null, 'U2 prime must stay positive');
assert.equal(calculateHeatCapacityGroupReference({
  ...groupInput,
  u1Mv: 30,
  u2Mv: 40,
}), null, 'U1 prime must exceed U2 prime');
assert.equal(calculateHeatCapacityGroupReference({
  ...groupInput,
  pressureSensitivityMvPerKPa: 0,
}), null);

const gammaValues = [1.398, 1.405, 1.401] as const;
assert.equal(calculateHeatCapacityMean([]), null);
assert.equal(calculateHeatCapacityMean([1, Number.NaN]), null);
closeTo(calculateHeatCapacityMean(gammaValues)!, 1.4013333333333333);
assert.equal(calculateHeatCapacitySampleStandardDeviation([1.4]), null);
closeTo(
  calculateHeatCapacitySampleStandardDeviation(gammaValues)!,
  0.003511884584284302,
);
closeTo(
  calculateHeatCapacityTypeAStandardUncertainty(
    0.003511884584284302,
    gammaValues.length,
  )!,
  0.0020275875100994388,
);
assert.equal(calculateHeatCapacityTypeAStandardUncertainty(0.1, 1), null);
assert.equal(calculateHeatCapacityTypeAStandardUncertainty(-0.1, 3), null);

closeTo(
  calculateHeatCapacityRelativeErrorPercent(1.4013333333333333, 1.4)!,
  0.09523809523810062,
);
closeTo(
  calculateHeatCapacityRelativeErrorPercent(1.3986666666666667, 1.4)!,
  0.09523809523808477,
);
assert.equal(calculateHeatCapacityRelativeErrorPercent(1.4, 0), null);

const statistics = calculateHeatCapacityBatchStatistics(gammaValues, 1.4);
assert.notEqual(statistics, null);
assert.equal(statistics?.count, 3);
closeTo(statistics!.meanGamma, 1.4013333333333333);
closeTo(statistics!.sampleStandardDeviation, 0.003511884584284302);
closeTo(statistics!.typeAStandardUncertainty, 0.0020275875100994388);
closeTo(statistics!.relativeErrorPercent, 0.09523809523810062);
assert.equal(calculateHeatCapacityBatchStatistics([1.4], 1.4), null);
assert.equal(
  calculateHeatCapacityBatchStatistics([1.4, Number.POSITIVE_INFINITY], 1.4),
  null,
);

const zeroSpreadStatistics = calculateHeatCapacityBatchStatistics(
  [1.4, 1.4, 1.4],
  1.4,
);
assert.notEqual(zeroSpreadStatistics, null);
assert.equal(zeroSpreadStatistics?.meanGamma, 1.4);
assert.equal(zeroSpreadStatistics?.sampleStandardDeviation, 0);
assert.equal(zeroSpreadStatistics?.typeAStandardUncertainty, 0);
assert.equal(zeroSpreadStatistics?.relativeErrorPercent, 0);

console.log('heatCapacityCalculationModel tests passed');
