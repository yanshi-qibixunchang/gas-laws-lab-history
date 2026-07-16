import { useCallback, useEffect, useRef, useState } from 'react';
import type { HeatCapacityMode } from '../../domain/heatCapacity/heatCapacityModeTypes.ts';
import {
  isHeatCapacityModeTransitionLocked,
  reduceHeatCapacityModeTransition,
  type HeatCapacityModeTransitionBlocker,
  type HeatCapacityModeTransitionEvent,
  type HeatCapacityModeTransitionIntent,
  type HeatCapacityModeTransitionReason,
  type HeatCapacityModeTransitionState,
} from '../heatCapacity/heatCapacityModeTransitionModel.ts';

export const HEAT_CAPACITY_MODE_TRANSITION_WATCHDOG_MS = 2_000;

export type HeatCapacityModeTransitionRequest = {
  sourceMode: HeatCapacityMode;
  targetMode: HeatCapacityMode;
  reason: HeatCapacityModeTransitionReason;
  discardSource: boolean;
};

export type HeatCapacityModeTransitionWatchdogEvent = {
  phase: Exclude<HeatCapacityModeTransitionState['phase'], 'idle'>;
  requestId: number;
  intent: HeatCapacityModeTransitionIntent;
};

type UseHeatCapacityModeSessionCoordinatorOptions = {
  initialState: HeatCapacityModeTransitionState;
  onWatchdog: (event: HeatCapacityModeTransitionWatchdogEvent) => void;
  watchdogPaused?: boolean;
};

export const shouldRunHeatCapacityModeTransitionWatchdog = (
  state: HeatCapacityModeTransitionState,
  watchdogPaused: boolean,
) => !watchdogPaused && state.phase !== 'idle' && state.activeIntent !== null;

export const useHeatCapacityModeSessionCoordinator = ({
  initialState,
  onWatchdog,
  watchdogPaused = false,
}: UseHeatCapacityModeSessionCoordinatorOptions) => {
  const [state, setState] = useState(initialState);
  const stateRef = useRef(state);
  const watchdogHandlerRef = useRef(onWatchdog);
  watchdogHandlerRef.current = onWatchdog;

  const dispatch = useCallback((event: HeatCapacityModeTransitionEvent) => {
    const nextState = reduceHeatCapacityModeTransition(stateRef.current, event);
    stateRef.current = nextState;
    setState(nextState);
    return nextState;
  }, []);

  const requestTransition = useCallback((
    request: HeatCapacityModeTransitionRequest,
    sceneMotionReasons: readonly HeatCapacityModeTransitionBlocker[],
  ) => {
    const current = stateRef.current;
    const intent: HeatCapacityModeTransitionIntent = {
      ...request,
      requestId: current.lastIssuedRequestId + 1,
    };
    return dispatch({ type: 'request', intent, sceneMotionReasons });
  }, [dispatch]);

  useEffect(() => {
    if (!shouldRunHeatCapacityModeTransitionWatchdog(state, watchdogPaused)) return undefined;
    if (state.phase === 'idle' || !state.activeIntent) return undefined;
    const phase = state.phase;
    const requestId = state.requestId;
    const intent = state.activeIntent;
    const timeoutId = window.setTimeout(() => {
      const current = stateRef.current;
      if (current.phase !== phase || current.requestId !== requestId) return;
      watchdogHandlerRef.current({ phase, requestId, intent });
    }, HEAT_CAPACITY_MODE_TRANSITION_WATCHDOG_MS);
    return () => window.clearTimeout(timeoutId);
  }, [state.phase, state.requestId, state.activeIntent, watchdogPaused]);

  return {
    state,
    stateRef,
    dispatch,
    requestTransition,
    locked: isHeatCapacityModeTransitionLocked(state),
  };
};
