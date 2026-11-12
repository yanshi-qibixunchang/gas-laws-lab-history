import { PISTON_FREE_SYSTEM_HEIGHTS_MM, PISTON_MAX_TRAVEL_HEIGHT_MM } from '../../domain/pistonOscillation/pistonOscillationHeightLimits.ts';

export const PISTON_MODEL_VERTICAL_AXIS = 'world_Y' as const;
export const PISTON_SCALE_CALIBRATION_HEIGHT_MM = 85;
export const PISTON_EQUILIBRIUM_HEIGHT_MIN_MM = 0;
export const PISTON_EQUILIBRIUM_HEIGHT_MAX_MM = PISTON_MAX_TRAVEL_HEIGHT_MM;
export const PISTON_EQUILIBRIUM_HEIGHT_DEFAULT_MM = 0;
export const PISTON_EXPERIMENT_HEIGHT_MIN_MM = 30;
export const PISTON_EQUILIBRIUM_HEIGHT_REVIEW_STEP_MM = 0.5;
export const PISTON_EXPERIMENT_HEIGHTS_MM = PISTON_FREE_SYSTEM_HEIGHTS_MM;
export const PISTON_LOCKING_SCREW_LOCK_THRESHOLD = 0.6;
export const PISTON_UNSUPPORTED_DROP_ACCELERATION_MM_PER_S2 = 420;

export type PistonLockingScrewClampState = 'loose' | 'locked';

export interface PistonVerticalMotionInput {
  equilibriumHeightMm: number;
  /** Positive is upward; pressing and the downward half of an oscillation are negative. */
  oscillationOffsetMm: number;
}

export const clampPistonEquilibriumHeightMm = (heightMm: number) =>
  Math.min(
    PISTON_EQUILIBRIUM_HEIGHT_MAX_MM,
    Math.max(PISTON_EQUILIBRIUM_HEIGHT_MIN_MM, heightMm),
  );

export const getPistonLockingScrewClampState = (
  screwProgress: number,
): PistonLockingScrewClampState => (
  screwProgress >= PISTON_LOCKING_SCREW_LOCK_THRESHOLD ? 'locked' : 'loose'
);

export const getPistonUnsupportedDropAccelerationScale = (screwProgress: number) => {
  const clampedProgress = Math.min(
    PISTON_LOCKING_SCREW_LOCK_THRESHOLD,
    Math.max(0, screwProgress),
  );
  return 1 - clampedProgress / PISTON_LOCKING_SCREW_LOCK_THRESHOLD;
};

export const getPistonAssemblyTargetWorldY = (
  assemblyWorldYAtScaleCalibration: number,
  input: PistonVerticalMotionInput,
) => assemblyWorldYAtScaleCalibration
  + (
    clampPistonEquilibriumHeightMm(input.equilibriumHeightMm + input.oscillationOffsetMm)
    - PISTON_SCALE_CALIBRATION_HEIGHT_MM
  ) / 1000;
