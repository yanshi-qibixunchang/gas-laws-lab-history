import * as THREE from 'three';
import type { WorkbenchPistonOscillationCameraPreset } from '../workbench/workbenchState.ts';

export interface PistonOscillationModelBounds {
  center: [number, number, number];
  span: number;
}

export interface PistonOscillationCameraPose {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

interface PistonOscillationCameraViewScheme {
  direction: [number, number, number];
  targetOffset: [number, number, number];
  fov: number;
}

export const PISTON_OSCILLATION_CAMERA_VIEW_SCHEMES = {
  overview: {
    direction: [0.316, 0.257, 0.98],
    targetOffset: [0.004, -0.112, 0.031],
    fov: 38,
  },
  front: {
    direction: [0, 0.55, 1.38],
    targetOffset: [0, 0.02, 0],
    fov: 38,
  },
  side: {
    direction: [1.38, 0.55, 0],
    targetOffset: [0, 0.02, 0],
    fov: 38,
  },
  top: {
    direction: [0, 1.58, 0.1],
    targetOffset: [0, 0, 0],
    fov: 40,
  },
} as const satisfies Record<
  WorkbenchPistonOscillationCameraPreset,
  PistonOscillationCameraViewScheme
>;

export const createPistonOscillationCameraPose = (
  preset: WorkbenchPistonOscillationCameraPreset,
  bounds: PistonOscillationModelBounds,
  aspect = 16 / 9,
): PistonOscillationCameraPose => {
  const scheme = PISTON_OSCILLATION_CAMERA_VIEW_SCHEMES[preset];
  const span = Number.isFinite(bounds.span) && bounds.span > 0 ? bounds.span : 1;
  const safeAspect = Number.isFinite(aspect) ? Math.max(0.55, aspect) : 16 / 9;
  const baseHalfFovRad = THREE.MathUtils.degToRad(scheme.fov / 2);
  const responsiveFov = safeAspect < 1
    ? Math.min(
        62,
        THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(baseHalfFovRad) / safeAspect)),
      )
    : scheme.fov;
  const target = bounds.center.map(
    (coordinate, index) => coordinate + scheme.targetOffset[index],
  ) as [number, number, number];

  return {
    position: scheme.direction.map(
      (coordinate, index) => bounds.center[index] + coordinate * span,
    ) as [number, number, number],
    target,
    fov: responsiveFov,
  };
};
