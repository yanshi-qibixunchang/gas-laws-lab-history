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

export type HeatCapacityModeTransitionReason =
  | 'mode-control'
  | 'demo-terminated'
  | 'guide-exited'
  | 'teaching-completed'
  | 'demo-error-fallback';

export type HeatCapacityModeTransitionIntent = {
  requestId: number;
  sourceMode: HeatCapacityMode;
  targetMode: HeatCapacityMode;
  reason: HeatCapacityModeTransitionReason;
  discardSource: boolean;
};

export type HeatCapacityModeTransitionState = {
  schemaVersion: typeof HEAT_CAPACITY_MODE_TRANSITION_SCHEMA_VERSION;
  phase: HeatCapacityModeTransitionPhase;
  visibleMode: HeatCapacityMode;
  sourceMode: HeatCapacityMode | null;
  targetMode: HeatCapacityMode | null;
  queuedMode: HeatCapacityMode | null;
  requestId: number;
  lastIssuedRequestId: number;
  activeIntent: HeatCapacityModeTransitionIntent | null;
  queuedIntent: HeatCapacityModeTransitionIntent | null;
  sourceBlockers: HeatCapacityModeTransitionBlocker[];
  visualStartedAtMs: number | null;
  visualDurationMs: number;
};

export type HeatCapacityModeTransitionCheckpoint = Omit<
  HeatCapacityModeTransitionState,
  | 'visualStartedAtMs'
  | 'visualDurationMs'
  | 'lastIssuedRequestId'
  | 'activeIntent'
  | 'queuedIntent'
> & {
  lastIssuedRequestId?: number;
  activeIntent?: HeatCapacityModeTransitionIntent | null;
  queuedIntent?: HeatCapacityModeTransitionIntent | null;
  visualRemainingMs: number;
};

export type HeatCapacityModeTransitionEvent =
  | {
      type: 'request';
      intent: HeatCapacityModeTransitionIntent;
      sceneMotionReasons: readonly HeatCapacityModeTransitionBlocker[];
    }
  | {
      type: 'source-motion-changed';
      sceneMotionReasons: readonly HeatCapacityModeTransitionBlocker[];
    }
  | {
      type: 'target-applied';
      requestId: number;
      targetMode: HeatCapacityMode;
      startedAtMs: number;
      durationMs: number;
    }
  | {
      type: 'animation-clock-rebased';
      requestId: number;
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
const REASONS: readonly HeatCapacityModeTransitionReason[] = [
  'mode-control',
  'demo-terminated',
  'guide-exited',
  'teaching-completed',
  'demo-error-fallback',
];

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const isMode = (value: unknown): value is HeatCapacityMode => (
  MODES.includes(value as HeatCapacityMode)
);

const isPhase = (value: unknown): value is HeatCapacityModeTransitionPhase => (
  PHASES.includes(value as HeatCapacityModeTransitionPhase)
);

const isReason = (value: unknown): value is HeatCapacityModeTransitionReason => (
  REASONS.includes(value as HeatCapacityModeTransitionReason)
);

const normalizeRequestId = (value: unknown, fallback = 0) => (
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : fallback
);

const normalizeIntent = (
  value: unknown,
  fallback: Omit<HeatCapacityModeTransitionIntent, 'requestId'> & { requestId: number },
): HeatCapacityModeTransitionIntent => {
  if (!isRecord(value)) return fallback;
  const sourceMode = isMode(value.sourceMode) ? value.sourceMode : fallback.sourceMode;
  const targetMode = isMode(value.targetMode) ? value.targetMode : fallback.targetMode;
  return {
    requestId: normalizeRequestId(value.requestId, fallback.requestId),
    sourceMode,
    targetMode,
    reason: isReason(value.reason) ? value.reason : fallback.reason,
    discardSource: value.discardSource === true,
  };
};

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
  lastIssuedRequestId: requestId,
  activeIntent: null,
  queuedIntent: null,
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
  ...(state.phase === 'idle'
    ? {}
    : {
        lastIssuedRequestId: state.lastIssuedRequestId,
        activeIntent: state.activeIntent,
        queuedIntent: state.queuedIntent,
      }),
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
  const requestId = normalizeRequestId(value.requestId);
  const lastIssuedRequestId = Math.max(
    requestId,
    normalizeRequestId(value.lastIssuedRequestId, requestId),
  );
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
  const activeIntent = normalizeIntent(value.activeIntent, {
    requestId,
    sourceMode: value.sourceMode,
    targetMode: value.targetMode,
    reason: 'mode-control',
    discardSource: false,
  });
  if (
    activeIntent.requestId !== requestId ||
    activeIntent.sourceMode !== value.sourceMode ||
    activeIntent.targetMode !== value.targetMode
  ) {
    return createHeatCapacityModeTransitionState(fallbackVisibleMode, lastIssuedRequestId);
  }
  const queuedIntent = queuedMode === null
    ? null
    : normalizeIntent(value.queuedIntent, {
        requestId: lastIssuedRequestId + 1,
        sourceMode: value.visibleMode,
        targetMode: queuedMode,
        reason: 'mode-control',
        discardSource: false,
      });
  if (
    queuedIntent &&
    (
      queuedIntent.requestId <= activeIntent.requestId ||
      queuedIntent.sourceMode !== value.visibleMode ||
      queuedIntent.targetMode !== queuedMode
    )
  ) {
    return createHeatCapacityModeTransitionState(fallbackVisibleMode, lastIssuedRequestId);
  }
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
    lastIssuedRequestId: Math.max(lastIssuedRequestId, queuedIntent?.requestId ?? 0),
    activeIntent,
    queuedIntent,
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
    return createHeatCapacityModeTransitionState(event.visibleMode, state.lastIssuedRequestId);
  }

  if (event.type === 'request') {
    const { intent } = event;
    if (
      intent.sourceMode !== state.visibleMode ||
      intent.requestId <= state.lastIssuedRequestId
    ) return state;
    if (state.phase === 'animating') {
      return {
        ...state,
        queuedMode: intent.targetMode === state.visibleMode ? null : intent.targetMode,
        queuedIntent: intent.targetMode === state.visibleMode ? null : intent,
        lastIssuedRequestId: intent.requestId,
      };
    }

    if (intent.targetMode === state.visibleMode) {
      return state.phase === 'idle'
        ? { ...state, lastIssuedRequestId: intent.requestId }
        : createHeatCapacityModeTransitionState(state.visibleMode, intent.requestId);
    }

    const sourceBlockers = normalizeMotionReasons(event.sceneMotionReasons);
    return {
      ...state,
      phase: sourceBlockers.length > 0 ? 'waiting-for-motion' : 'preparing-target',
      sourceMode: state.visibleMode,
      targetMode: intent.targetMode,
      queuedMode: null,
      requestId: intent.requestId,
      lastIssuedRequestId: intent.requestId,
      activeIntent: intent,
      queuedIntent: null,
      sourceBlockers,
      visualStartedAtMs: null,
      visualDurationMs: 0,
    };
  }

  if (event.type === 'source-motion-changed') {
    if (
      (state.phase !== 'waiting-for-motion' && state.phase !== 'preparing-target') ||
      !state.targetMode
    ) return state;
    const remainingBlockers = normalizeMotionReasons(event.sceneMotionReasons);
    return remainingBlockers.length > 0
      ? { ...state, phase: 'waiting-for-motion', sourceBlockers: remainingBlockers }
      : { ...state, phase: 'preparing-target', sourceBlockers: [] };
  }

  if (event.type === 'target-applied') {
    if (
      state.phase !== 'preparing-target' ||
      state.requestId !== event.requestId ||
      state.targetMode !== event.targetMode
    ) return state;
    return {
      ...state,
      phase: 'animating',
      visibleMode: event.targetMode,
      sourceBlockers: [],
      visualStartedAtMs: event.startedAtMs,
      visualDurationMs: Math.max(0, event.durationMs),
    };
  }

  if (event.type === 'animation-clock-rebased') {
    if (
      state.phase !== 'animating' ||
      state.requestId !== event.requestId
    ) return state;
    return {
      ...state,
      visualStartedAtMs: event.startedAtMs,
      visualDurationMs: Math.max(0, event.durationMs),
    };
  }

  if (event.type === 'animation-finished') {
    if (state.phase !== 'animating') return state;
    const nextTargetMode = state.queuedMode;
    const nextIntent = state.queuedIntent;
    if (!nextTargetMode || !nextIntent || nextTargetMode === state.visibleMode) {
      return createHeatCapacityModeTransitionState(state.visibleMode, state.lastIssuedRequestId);
    }
    const sourceBlockers = normalizeMotionReasons(event.sceneMotionReasons);
    return {
      ...state,
      phase: sourceBlockers.length > 0 ? 'waiting-for-motion' : 'preparing-target',
      sourceMode: state.visibleMode,
      targetMode: nextTargetMode,
      queuedMode: null,
      requestId: nextIntent.requestId,
      lastIssuedRequestId: state.lastIssuedRequestId,
      activeIntent: nextIntent,
      queuedIntent: null,
      sourceBlockers,
      visualStartedAtMs: null,
      visualDurationMs: 0,
    };
  }

  return state;
};
