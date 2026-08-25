export type PistonOscillationFocusViewId =
  | 'pistonFocus'
  | 'hoseFocus'
  | 'screwOperationView';

export type PistonOscillationFocusVector = [number, number, number];

export interface PistonOscillationFocusCameraDefinition {
  viewport: {
    width: number;
    height: number;
  };
  position: PistonOscillationFocusVector;
  target: PistonOscillationFocusVector;
  fov: number;
  zoom: number;
  near: number;
  far: number;
}

export interface PistonOscillationOrthographicCameraDefinition {
  viewport: {
    width: number;
    height: number;
  };
  position: PistonOscillationFocusVector;
  target: PistonOscillationFocusVector;
  zoom: number;
  near: number;
  far: number;
}

export const PISTON_OSCILLATION_CONFIRMED_OVERVIEW_CAMERA:
  PistonOscillationFocusCameraDefinition = {
  viewport: { width: 796, height: 500 },
  position: [0.4494, 0.3765, 0.7484],
  target: [0.0669, 0.1044, -0.0182],
  fov: 38,
  zoom: 1,
  near: 0.001,
  far: 20,
};

export const PISTON_OSCILLATION_CONFIRMED_FOCUS_CAMERAS: Record<
  PistonOscillationFocusViewId,
  PistonOscillationFocusCameraDefinition
> = {
  pistonFocus: {
    viewport: { width: 796, height: 500 },
    position: [0.3316, 0.4623, 0.3395],
    target: [0.1474, 0.3517, 0.0657],
    fov: 38,
    zoom: 1,
    near: 0.001,
    far: 20,
  },
  hoseFocus: {
    viewport: { width: 796, height: 500 },
    position: [0.4445, 0.437, 0.6353],
    target: [0.2192, 0.126, 0.099],
    fov: 38,
    zoom: 1,
    near: 0.001,
    far: 20,
  },
  screwOperationView: {
    viewport: { width: 186, height: 249 },
    position: [0.3238, 0.308, 0.0752],
    target: [0.1594, 0.3044, 0.0746],
    fov: 32,
    zoom: 1,
    near: 0.001,
    far: 20,
  },
};

export const PISTON_OSCILLATION_HEIGHT_ADJUSTMENT_REFERENCE_MM = 80;

export const PISTON_OSCILLATION_HEIGHT_ADJUSTMENT_SUGGESTED_CAMERA:
  PistonOscillationFocusCameraDefinition = {
  viewport: { width: 796, height: 500 },
  position: [0.3184, 0.4042, 0.4014],
  target: [0.1435, 0.3356, 0.0646],
  fov: 38,
  zoom: 1,
  near: 0.001,
  far: 20,
};

export const PISTON_OSCILLATION_SCALE_READING_WINDOW_MM = 61.8174;

export const PISTON_OSCILLATION_SCALE_READING_SUGGESTED_CAMERA:
  PistonOscillationOrthographicCameraDefinition = {
  viewport: { width: 186, height: 249 },
  position: [0.1506, 0.2693, 0.237],
  target: [0.1303, 0.2693, 0.092],
  zoom: 4_027.9926,
  near: 0.001,
  far: 20,
};

export const getPistonHeightAdjustmentCameraDefinition = (
  heightMm: number,
): PistonOscillationFocusCameraDefinition => {
  const heightDeltaM = (
    Math.min(80, Math.max(0, heightMm))
    - PISTON_OSCILLATION_HEIGHT_ADJUSTMENT_REFERENCE_MM
  ) / 1000;
  const suggested = PISTON_OSCILLATION_HEIGHT_ADJUSTMENT_SUGGESTED_CAMERA;
  return {
    ...suggested,
    viewport: { ...suggested.viewport },
    position: [
      suggested.position[0],
      suggested.position[1] + heightDeltaM,
      suggested.position[2],
    ],
    target: [
      suggested.target[0],
      suggested.target[1] + heightDeltaM,
      suggested.target[2],
    ],
  };
};

export const getPistonScaleReadingCenterHeightMm = (heightMm: number) => {
  const minimumCenterHeightMm = 6;
  return Math.min(80, Math.max(minimumCenterHeightMm, heightMm));
};
