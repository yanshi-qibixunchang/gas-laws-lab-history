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
