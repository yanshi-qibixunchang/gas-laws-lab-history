import assert from 'node:assert/strict';
import {
  PISTON_EQUILIBRIUM_HEIGHT_DEFAULT_MM,
  PISTON_EQUILIBRIUM_HEIGHT_MAX_MM,
  PISTON_EQUILIBRIUM_HEIGHT_MIN_MM,
  PISTON_EXPERIMENT_HEIGHT_MIN_MM,
  PISTON_EXPERIMENT_HEIGHTS_MM,
  PISTON_LOCKING_SCREW_LOCK_THRESHOLD,
  PISTON_MODEL_VERTICAL_AXIS,
  PISTON_UNSUPPORTED_DROP_ACCELERATION_MM_PER_S2,
  clampPistonEquilibriumHeightMm,
  getPistonAssemblyTargetWorldY,
  getPistonLockingScrewClampState,
  getPistonUnsupportedDropAccelerationScale,
} from '../../src/features/pistonOscillation/pistonOscillationModelMotion.ts';

assert.equal(PISTON_MODEL_VERTICAL_AXIS, 'world_Y');
assert.equal(PISTON_EQUILIBRIUM_HEIGHT_DEFAULT_MM, 0);
assert.equal(PISTON_EQUILIBRIUM_HEIGHT_MIN_MM, 0);
assert.equal(PISTON_EQUILIBRIUM_HEIGHT_MAX_MM, 80);
assert.equal(PISTON_EXPERIMENT_HEIGHT_MIN_MM, 30);
assert.deepEqual(PISTON_EXPERIMENT_HEIGHTS_MM, [80, 70, 60, 50, 40, 30]);
assert.equal(PISTON_LOCKING_SCREW_LOCK_THRESHOLD, 0.6);
assert.equal(PISTON_UNSUPPORTED_DROP_ACCELERATION_MM_PER_S2, 420);

assert.equal(clampPistonEquilibriumHeightMm(-5), 0);
assert.equal(clampPistonEquilibriumHeightMm(15), 15);
assert.equal(clampPistonEquilibriumHeightMm(42.5), 42.5);
assert.equal(clampPistonEquilibriumHeightMm(86), 80);

assert.equal(getPistonLockingScrewClampState(0), 'loose');
assert.equal(getPistonLockingScrewClampState(0.5999), 'loose');
assert.equal(getPistonLockingScrewClampState(0.6), 'locked');
assert.equal(getPistonLockingScrewClampState(1), 'locked');
assert.equal(getPistonUnsupportedDropAccelerationScale(-0.1), 1);
assert.equal(getPistonUnsupportedDropAccelerationScale(0), 1);
assert.equal(getPistonUnsupportedDropAccelerationScale(0.3), 0.5);
assert.equal(getPistonUnsupportedDropAccelerationScale(0.6), 0);
assert.equal(getPistonUnsupportedDropAccelerationScale(1), 0);

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
    equilibriumHeightMm: 0,
    oscillationOffsetMm: 0,
  }),
  0.415,
);
assert.equal(
  getPistonAssemblyTargetWorldY(scaleCalibrationWorldY, {
    equilibriumHeightMm: 80,
    oscillationOffsetMm: -4,
  }),
  0.491,
);

console.log('pistonOscillationModelMotion tests passed');
