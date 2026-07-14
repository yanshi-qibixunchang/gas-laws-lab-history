import type { HeatCapacityMode } from '../../domain/heatCapacity/heatCapacityModeTypes.ts';

export type HeatCapacityModeTransitionPhase =
  | 'idle'
  | 'waiting-for-motion'
  | 'preparing-target'
  | 'animating';

export type HeatCapacityModeTransitionState = {
  phase: HeatCapacityModeTransitionPhase;
  visibleMode: HeatCapacityMode;
  targetMode: HeatCapacityMode | null;
  queuedMode: HeatCapacityMode | null;
  requestId: number;
};

export type HeatCapacityModeTransitionEvent =
  | {
      type: 'request';
      targetMode: HeatCapacityMode;
      sceneMotionActive: boolean;
    }
  | { type: 'source-motion-settled' }
  | { type: 'target-applied'; targetMode: HeatCapacityMode }
  | { type: 'animation-finished'; sceneMotionActive: boolean }
  | { type: 'synchronize'; visibleMode: HeatCapacityMode };

export const createHeatCapacityModeTransitionState = (
  visibleMode: HeatCapacityMode,
): HeatCapacityModeTransitionState => ({
  phase: 'idle',
  visibleMode,
  targetMode: null,
  queuedMode: null,
  requestId: 0,
});

export const isHeatCapacityModeTransitionLocked = (
  state: HeatCapacityModeTransitionState,
) => state.phase !== 'idle';

export const reduceHeatCapacityModeTransition = (
  state: HeatCapacityModeTransitionState,
  event: HeatCapacityModeTransitionEvent,
): HeatCapacityModeTransitionState => {
  if (event.type === 'synchronize') {
    return {
      ...createHeatCapacityModeTransitionState(event.visibleMode),
      requestId: state.requestId,
    };
  }

  if (event.type === 'request') {
    if (state.phase === 'animating') {
      return {
        ...state,
        queuedMode: event.targetMode === state.visibleMode ? null : event.targetMode,
      };
    }

    if (event.targetMode === state.visibleMode) {
      return state.phase === 'idle'
        ? state
        : {
            ...state,
            phase: 'idle',
            targetMode: null,
            queuedMode: null,
          };
    }

    return {
      ...state,
      phase: event.sceneMotionActive ? 'waiting-for-motion' : 'preparing-target',
      targetMode: event.targetMode,
      queuedMode: null,
      requestId: state.requestId + 1,
    };
  }

  if (event.type === 'source-motion-settled') {
    if (state.phase !== 'waiting-for-motion' || !state.targetMode) return state;
    return {
      ...state,
      phase: 'preparing-target',
    };
  }

  if (event.type === 'target-applied') {
    if (state.phase !== 'preparing-target' || state.targetMode !== event.targetMode) return state;
    return {
      ...state,
      phase: 'animating',
      visibleMode: event.targetMode,
      targetMode: null,
    };
  }

  if (event.type === 'animation-finished') {
    if (state.phase !== 'animating') return state;
    const nextTargetMode = state.queuedMode;
    if (!nextTargetMode || nextTargetMode === state.visibleMode) {
      return {
        ...state,
        phase: 'idle',
        targetMode: null,
        queuedMode: null,
      };
    }
    return {
      ...state,
      phase: event.sceneMotionActive ? 'waiting-for-motion' : 'preparing-target',
      targetMode: nextTargetMode,
      queuedMode: null,
      requestId: state.requestId + 1,
    };
  }

  return state;
};
