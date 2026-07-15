import type { HeatCapacityMode } from '../../domain/heatCapacity/heatCapacityModeTypes.ts';
import {
  HEAT_CAPACITY_SCENE_MOTION_REASONS,
  type HeatCapacitySceneMotionReason,
} from './heatCapacitySceneMotionSources.ts';

export const HEAT_CAPACITY_MODE_TRANSITION_SCHEMA_VERSION = 1 as const;

export type HeatCapacityModeTransitionPhase =
  | 'idle'
  | 'waiting-for-motion'
  | 'preparing-target'
  | 'animating';

export type HeatCapacityModeTransitionBlocker = HeatCapacitySceneMotionReason;

export type HeatCapacityModeTransitionState = {
  schemaVersion: typeof HEAT_CAPACITY_MODE_TRANSITION_SCHEMA_VERSION;
  phase: HeatCapacityModeTransitionPhase;
  visibleMode: HeatCapacityMode;
  sourceMode: HeatCapacityMode | null;
  targetMode: HeatCapacityMode | null;
  queuedMode: HeatCapacityMode | null;
  requestId: number;
  sourceBlockers: HeatCapacityModeTransitionBlocker[];
  visualStartedAtMs: number | null;
  visualDurationMs: number;
};

export type HeatCapacityModeTransitionCheckpoint = Omit<
  HeatCapacityModeTransitionState,
  'visualStartedAtMs' | 'visualDurationMs'
> & {
  visualRemainingMs: number;
};

export type HeatCapacityModeTransitionEvent =
  | {
      type: 'request';
      targetMode: HeatCapacityMode;
      sceneMotionReasons: readonly HeatCapacityModeTransitionBlocker[];
    }
  | {
      type: 'source-motion-changed';
      sceneMotionReasons: readonly HeatCapacityModeTransitionBlocker[];
    }
  | {
      type: 'target-applied';
      targetMode: HeatCapacityMode;
      startedAtMs: number;
      durationMs: number;
    }
  | {
      type: 'animation-finished';
      sceneMotionReasons: readonly HeatCapacityModeTransitionBlocker[];
    }
  | { type: 'synchronize'; visibleMode: HeatCapacityMode };

const MODES: readonly HeatCapacityMode[] = ['demo', 'guide', 'free'];
const PHASES: readonly HeatCapacityModeTransitionPhase[] = [
  'idle',
  'waiting-for-motion',
  'preparing-target',
  'animating',
];
const BLOCKERS: readonly HeatCapacityModeTransitionBlocker[] = HEAT_CAPACITY_SCENE_MOTION_REASONS;

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const isMode = (value: unknown): value is HeatCapacityMode => (
  MODES.includes(value as HeatCapacityMode)
);

const isPhase = (value: unknown): value is HeatCapacityModeTransitionPhase => (
  PHASES.includes(value as HeatCapacityModeTransitionPhase)
);

const normalizeBlockers = (value: unknown): HeatCapacityModeTransitionBlocker[] => {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter(
    (entry): entry is HeatCapacityModeTransitionBlocker => BLOCKERS.includes(entry as HeatCapacityModeTransitionBlocker),
  )));
};

const normalizeMotionReasons = (
  reasons: readonly HeatCapacityModeTransitionBlocker[],
) => Array.from(new Set(reasons));

export const createHeatCapacityModeTransitionState = (
  visibleMode: HeatCapacityMode,
  requestId = 0,
): HeatCapacityModeTransitionState => ({
  schemaVersion: HEAT_CAPACITY_MODE_TRANSITION_SCHEMA_VERSION,
  phase: 'idle',
  visibleMode,
  sourceMode: null,
  targetMode: null,
  queuedMode: null,
  requestId,
  sourceBlockers: [],
  visualStartedAtMs: null,
  visualDurationMs: 0,
});

export const isHeatCapacityModeTransitionLocked = (
  state: HeatCapacityModeTransitionState,
) => state.phase !== 'idle';

export const getHeatCapacityModeTransitionVisualRemainingMs = (
  state: HeatCapacityModeTransitionState,
  now = Date.now(),
) => state.phase === 'animating' && state.visualStartedAtMs !== null
  ? Math.max(0, state.visualDurationMs - Math.max(0, now - state.visualStartedAtMs))
  : 0;

export const createHeatCapacityModeTransitionCheckpoint = (
  state: HeatCapacityModeTransitionState,
  now = Date.now(),
): HeatCapacityModeTransitionCheckpoint => ({
  schemaVersion: HEAT_CAPACITY_MODE_TRANSITION_SCHEMA_VERSION,
  phase: state.phase,
  visibleMode: state.visibleMode,
  sourceMode: state.sourceMode,
  targetMode: state.targetMode,
  queuedMode: state.queuedMode,
  requestId: state.requestId,
  sourceBlockers: [...state.sourceBlockers],
  visualRemainingMs: getHeatCapacityModeTransitionVisualRemainingMs(state, now),
});

export const normalizeHeatCapacityModeTransitionCheckpoint = (
  value: unknown,
  fallbackVisibleMode: HeatCapacityMode,
  now = Date.now(),
): HeatCapacityModeTransitionState => {
  if (!isRecord(value) || value.schemaVersion !== HEAT_CAPACITY_MODE_TRANSITION_SCHEMA_VERSION) {
    return createHeatCapacityModeTransitionState(fallbackVisibleMode);
  }
  if (!isPhase(value.phase) || !isMode(value.visibleMode)) {
    return createHeatCapacityModeTransitionState(fallbackVisibleMode);
  }
  const requestId = typeof value.requestId === 'number' && Number.isSafeInteger(value.requestId) && value.requestId >= 0
    ? value.requestId
    : 0;
  if (value.visibleMode !== fallbackVisibleMode) {
    return createHeatCapacityModeTransitionState(fallbackVisibleMode, requestId);
  }
  if (value.phase === 'idle') {
    return createHeatCapacityModeTransitionState(value.visibleMode, requestId);
  }
  if (
    !isMode(value.sourceMode) ||
    !isMode(value.targetMode) ||
    value.sourceMode === value.targetMode
  ) {
    return createHeatCapacityModeTransitionState(fallbackVisibleMode, requestId);
  }
  const visibleModeMatchesTransaction = value.phase === 'animating'
    ? value.visibleMode === value.targetMode
    : value.visibleMode === value.sourceMode;
  if (!visibleModeMatchesTransaction) {
    return createHeatCapacityModeTransitionState(fallbackVisibleMode, requestId);
  }
  const queuedMode: HeatCapacityMode | null = value.phase === 'animating' && isMode(value.queuedMode)
    ? (value.queuedMode === value.visibleMode ? null : value.queuedMode)
    : null;
  const visualRemainingMs = typeof value.visualRemainingMs === 'number' && Number.isFinite(value.visualRemainingMs)
    ? Math.max(0, value.visualRemainingMs)
    : 0;
  return {
    schemaVersion: HEAT_CAPACITY_MODE_TRANSITION_SCHEMA_VERSION,
    phase: value.phase,
    visibleMode: value.visibleMode,
    sourceMode: value.sourceMode,
    targetMode: value.targetMode,
    queuedMode,
    requestId,
    sourceBlockers: value.phase === 'waiting-for-motion'
      ? normalizeBlockers(value.sourceBlockers)
      : [],
    visualStartedAtMs: value.phase === 'animating' ? now : null,
    visualDurationMs: value.phase === 'animating' ? visualRemainingMs : 0,
  };
};

export const reduceHeatCapacityModeTransition = (
  state: HeatCapacityModeTransitionState,
  event: HeatCapacityModeTransitionEvent,
): HeatCapacityModeTransitionState => {
  if (event.type === 'synchronize') {
    return createHeatCapacityModeTransitionState(event.visibleMode, state.requestId);
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
        : createHeatCapacityModeTransitionState(state.visibleMode, state.requestId);
    }

    const sourceBlockers = normalizeMotionReasons(event.sceneMotionReasons);
    return {
      ...state,
      phase: sourceBlockers.length > 0 ? 'waiting-for-motion' : 'preparing-target',
      sourceMode: state.visibleMode,
      targetMode: event.targetMode,
      queuedMode: null,
      requestId: state.requestId + 1,
      sourceBlockers,
      visualStartedAtMs: null,
      visualDurationMs: 0,
    };
  }

  if (event.type === 'source-motion-changed') {
    if (state.phase !== 'waiting-for-motion' || !state.targetMode) return state;
    const activeReasons = new Set(event.sceneMotionReasons);
    const remainingBlockers = state.sourceBlockers.filter((blocker) => activeReasons.has(blocker));
    return remainingBlockers.length > 0
      ? { ...state, sourceBlockers: remainingBlockers }
      : { ...state, phase: 'preparing-target', sourceBlockers: [] };
  }

  if (event.type === 'target-applied') {
    if (state.phase !== 'preparing-target' || state.targetMode !== event.targetMode) return state;
    return {
      ...state,
      phase: 'animating',
      visibleMode: event.targetMode,
      sourceBlockers: [],
      visualStartedAtMs: event.startedAtMs,
      visualDurationMs: Math.max(0, event.durationMs),
    };
  }

  if (event.type === 'animation-finished') {
    if (state.phase !== 'animating') return state;
    const nextTargetMode = state.queuedMode;
    if (!nextTargetMode || nextTargetMode === state.visibleMode) {
      return createHeatCapacityModeTransitionState(state.visibleMode, state.requestId);
    }
    const sourceBlockers = normalizeMotionReasons(event.sceneMotionReasons);
    return {
      ...state,
      phase: sourceBlockers.length > 0 ? 'waiting-for-motion' : 'preparing-target',
      sourceMode: state.visibleMode,
      targetMode: nextTargetMode,
      queuedMode: null,
      requestId: state.requestId + 1,
      sourceBlockers,
      visualStartedAtMs: null,
      visualDurationMs: 0,
    };
  }

  return state;
};
