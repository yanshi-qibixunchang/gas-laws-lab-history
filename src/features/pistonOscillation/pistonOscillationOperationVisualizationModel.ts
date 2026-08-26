export type PistonOscillationOperationKey = 'shift' | 'space' | 'mouseLeft';

export type PistonOscillationMouseAction =
  | 'click'
  | 'moveUp'
  | 'moveDown'
  | 'rotateClockwise'
  | 'rotateCounterclockwise';

export interface PistonOscillationOperationCue {
  keys: readonly PistonOscillationOperationKey[];
  mouseAction?: PistonOscillationMouseAction;
}

export const createPistonOscillationOperationCueSignature = (
  cue: PistonOscillationOperationCue | null | undefined,
) => cue
  ? `${cue.keys.join('+')}:${cue.mouseAction ?? 'none'}`
  : '';
