import assert from 'node:assert/strict';
import {
  PISTON_EQUILIBRIUM_HEIGHT_DEFAULT_MM,
  PISTON_EQUILIBRIUM_HEIGHT_MAX_MM,
  PISTON_EQUILIBRIUM_HEIGHT_MIN_MM,
  PISTON_EXPERIMENT_HEIGHTS_MM,
  PISTON_MODEL_VERTICAL_AXIS,
  clampPistonEquilibriumHeightMm,
  getPistonAssemblyTargetWorldY,
} from '../../src/features/pistonOscillation/pistonOscillationModelMotion.ts';

assert.equal(PISTON_MODEL_VERTICAL_AXIS, 'world_Y');
assert.equal(PISTON_EQUILIBRIUM_HEIGHT_DEFAULT_MM, 80);
assert.equal(PISTON_EQUILIBRIUM_HEIGHT_MIN_MM, 20);
assert.equal(PISTON_EQUILIBRIUM_HEIGHT_MAX_MM, 80);
assert.deepEqual(PISTON_EXPERIMENT_HEIGHTS_MM, [80, 70, 60, 50, 40, 30, 20]);

assert.equal(clampPistonEquilibriumHeightMm(15), 20);
assert.equal(clampPistonEquilibriumHeightMm(42.5), 42.5);
assert.equal(clampPistonEquilibriumHeightMm(86), 80);

const scaleCalibrationWorldY = 0.5;
assert.equal(
  getPistonAssemblyTargetWorldY(scaleCalibrationWorldY, {
    equilibriumHeightMm: 80,
    oscillationOffsetMm: 0,
  }),
  0.495,
);
assert.equal(
  getPistonAssemblyTargetWorldY(scaleCalibrationWorldY, {
    equilibriumHeightMm: 20,
    oscillationOffsetMm: 0,
  }),
  0.435,
);
assert.equal(
  getPistonAssemblyTargetWorldY(scaleCalibrationWorldY, {
    equilibriumHeightMm: 80,
    oscillationOffsetMm: -4,
  }),
  0.491,
);

console.log('pistonOscillationModelMotion tests passed');
