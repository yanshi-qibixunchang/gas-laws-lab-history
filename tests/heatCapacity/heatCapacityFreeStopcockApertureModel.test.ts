import assert from 'node:assert/strict';
import {
  getHeatCapacityReleaseApertureEffectiveDtS,
  integrateHeatCapacityReleaseAperture,
} from '../../src/domain/heatCapacity/heatCapacityFreeStopcockApertureModel.ts';
import {
  HEAT_CAPACITY_RELEASE_TIMING,
} from '../../src/domain/heatCapacity/heatCapacityDefaultConfig.ts';

const expectClose = (
  actual: number,
  expected: number,
  tolerance: number,
  message: string,
) => {
  assert.equal(
    Math.abs(actual - expected) <= tolerance,
    true,
    `${message}: got ${actual}, expected ${expected}`,
  );
};

assert.equal(HEAT_CAPACITY_RELEASE_TIMING.releaseApertureRampS, 0.1);
expectClose(integrateHeatCapacityReleaseAperture(0.03), 0.002295, 1e-9, '0.03s integral');
expectClose(integrateHeatCapacityReleaseAperture(0.05), 0.009375, 1e-9, '0.05s integral');
expectClose(integrateHeatCapacityReleaseAperture(0.1), 0.05, 1e-12, '0.1s integral');
expectClose(
  integrateHeatCapacityReleaseAperture(HEAT_CAPACITY_RELEASE_TIMING.autoDemoReleaseDurationS),
  HEAT_CAPACITY_RELEASE_TIMING.autoDemoReleaseDurationS -
    HEAT_CAPACITY_RELEASE_TIMING.releaseApertureRampS / 2,
  1e-12,
  'auto-demo release integral',
);

expectClose(
  getHeatCapacityReleaseApertureEffectiveDtS(0, 0.03),
  0.002295,
  1e-9,
  'effective dt for first 0.03s',
);
expectClose(
  getHeatCapacityReleaseApertureEffectiveDtS(0.03, 0.02),
  integrateHeatCapacityReleaseAperture(0.05) - integrateHeatCapacityReleaseAperture(0.03),
  1e-12,
  'interval integral should be additive',
);
expectClose(
  getHeatCapacityReleaseApertureEffectiveDtS(0.2, 0.02),
  0.02,
  1e-12,
  'after ramp the aperture should be fully open',
);

console.log('heatCapacityFreeStopcockApertureModel tests passed');
