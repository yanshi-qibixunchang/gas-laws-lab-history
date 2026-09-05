import { Mesh } from 'three';

const ignoreOperationMirrorRaycast: Mesh['raycast'] = () => undefined;

// React Three Fiber writes an explicit undefined prop onto the mesh when a
// disabled target is re-enabled. Restore the method, not an omitted default.
export const getPistonOscillationOperationMirrorRaycast = (
  interactionEnabled: boolean,
): Mesh['raycast'] => (
  interactionEnabled ? Mesh.prototype.raycast : ignoreOperationMirrorRaycast
);

export type PistonOscillationOperationMirrorView =
  | 'scaleReadingView'
  | 'screwOperationView';

export type PistonOscillationHeightAdjustmentStage =
  | 'readingHeight'
  | 'lockingHeight';

export interface PistonOscillationAutomaticOperationMirrorState {
  hoseConnected: boolean;
  lockingScrewLocked: boolean;
  screwDragging: boolean;
  heightAdjustmentStage: PistonOscillationHeightAdjustmentStage;
}

export const getPistonOscillationAutomaticOperationMirrorView = ({
  hoseConnected,
  lockingScrewLocked,
  screwDragging,
  heightAdjustmentStage,
}: PistonOscillationAutomaticOperationMirrorState): PistonOscillationOperationMirrorView => {
  if (
    screwDragging
    || hoseConnected
    || lockingScrewLocked
    || heightAdjustmentStage === 'lockingHeight'
  ) {
    return 'screwOperationView';
  }
  return 'scaleReadingView';
};

export const togglePistonOscillationOperationMirrorView = (
  current: PistonOscillationOperationMirrorView,
): PistonOscillationOperationMirrorView => (
  current === 'scaleReadingView' ? 'screwOperationView' : 'scaleReadingView'
);
