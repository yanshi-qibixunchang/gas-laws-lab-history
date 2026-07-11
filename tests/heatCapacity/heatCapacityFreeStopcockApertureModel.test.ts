import assert from 'node:assert/strict';
import {
  FREE_STOPCOCK_APERTURE_RAMP_S,
  getFreeStopcockApertureEffectiveDtS,
  integrateFreeStopcockAperture,
} from '../../src/domain/heatCapacity/heatCapacityFreeStopcockApertureModel.ts';

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

assert.equal(FREE_STOPCOCK_APERTURE_RAMP_S, 0.1);
expectClose(integrateFreeStopcockAperture(0.03), 0.002295, 1e-9, '0.03s integral');
expectClose(integrateFreeStopcockAperture(0.05), 0.009375, 1e-9, '0.05s integral');
expectClose(integrateFreeStopcockAperture(0.1), 0.05, 1e-12, '0.1s integral');
expectClose(integrateFreeStopcockAperture(0.35), 0.3, 1e-12, '0.35s integral');

expectClose(
  getFreeStopcockApertureEffectiveDtS(0, 0.03),
  0.002295,
  1e-9,
  'effective dt for first 0.03s',
);
expectClose(
  getFreeStopcockApertureEffectiveDtS(0.03, 0.02),
  integrateFreeStopcockAperture(0.05) - integrateFreeStopcockAperture(0.03),
  1e-12,
  'interval integral should be additive',
);
expectClose(
  getFreeStopcockApertureEffectiveDtS(0.2, 0.02),
  0.02,
  1e-12,
  'after ramp the aperture should be fully open',
);

console.log('heatCapacityFreeStopcockApertureModel tests passed');
