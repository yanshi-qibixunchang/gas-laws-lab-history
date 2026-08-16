export const PISTON_MODEL_VERTICAL_AXIS = 'world_Y' as const;
export const PISTON_SCALE_CALIBRATION_HEIGHT_MM = 85;
export const PISTON_EQUILIBRIUM_HEIGHT_MIN_MM = 20;
export const PISTON_EQUILIBRIUM_HEIGHT_MAX_MM = 80;
export const PISTON_EQUILIBRIUM_HEIGHT_DEFAULT_MM = 80;
export const PISTON_EQUILIBRIUM_HEIGHT_REVIEW_STEP_MM = 0.5;
export const PISTON_EXPERIMENT_HEIGHTS_MM = [80, 70, 60, 50, 40, 30, 20] as const;

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

export const getPistonAssemblyTargetWorldY = (
  assemblyWorldYAtScaleCalibration: number,
  input: PistonVerticalMotionInput,
) => assemblyWorldYAtScaleCalibration
  + (
    clampPistonEquilibriumHeightMm(input.equilibriumHeightMm)
    - PISTON_SCALE_CALIBRATION_HEIGHT_MM
    + input.oscillationOffsetMm
  ) / 1000;
