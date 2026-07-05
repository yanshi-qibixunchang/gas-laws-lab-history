export type HeatCapacityToastLevel = 'info' | 'success' | 'warning' | 'danger';

export type HeatCapacityToastSource =
  | 'guide'
  | 'guide-blocked'
  | 'pressure-warning'
  | 'pressure-close-valve'
  | 'pressure-alarm';

export interface HeatCapacityToastMessage {
  id: string;
  text: string;
  level: HeatCapacityToastLevel;
  priority: number;
  source: HeatCapacityToastSource;
  createdAt: number;
}

export interface HeatCapacityToastQueueState {
  current: HeatCapacityToastMessage | null;
  pending: HeatCapacityToastMessage | null;
}

export interface HeatCapacityToastShowState extends HeatCapacityToastQueueState {
  pressureAlertActive: boolean;
}

export interface HeatCapacityToastQueueUpdate extends HeatCapacityToastQueueState {
  changed: boolean;
  shouldRestartTimer: boolean;
}

export interface HeatCapacityToastAdvanceUpdate extends HeatCapacityToastQueueState {
  shouldContinueTimer: boolean;
}

export interface HeatCapacityToastShowOptions {
  interrupt?: boolean;
}

export interface HeatCapacityToastCreateOptions {
  id?: string;
  now?: number;
  priority?: number;
  source?: HeatCapacityToastSource;
}

export const HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS = 2000;

export const HEAT_CAPACITY_TOAST_PRIORITY: Record<HeatCapacityToastLevel, number> = {
  info: 0,
  success: 0,
  warning: 1,
  danger: 2,
};

export const HEAT_CAPACITY_PRESSURE_WARNING_TOAST_PRIORITY = 3;
export const HEAT_CAPACITY_CRITICAL_TOAST_PRIORITY = 4;

export const createHeatCapacityToastMessage = (
  text: string,
  level: HeatCapacityToastLevel = 'info',
  options: HeatCapacityToastCreateOptions = {},
): HeatCapacityToastMessage => {
  const now = options.now ?? Date.now();
  return {
    id: options.id ?? `${now}-${Math.random().toString(36).slice(2)}`,
    text,
    level,
    priority: options.priority ?? HEAT_CAPACITY_TOAST_PRIORITY[level],
    source: options.source ?? 'guide',
    createdAt: now,
  };
};

export const isHeatCapacityPressureToast = (message: HeatCapacityToastMessage | null) => (
  message?.source === 'pressure-warning' ||
  message?.source === 'pressure-close-valve' ||
  message?.source === 'pressure-alarm'
);

export const isHeatCapacityGuideToast = (message: HeatCapacityToastMessage | null) => (
  message?.source === 'guide' ||
  message?.source === 'guide-blocked'
);

const unchangedToastQueue = (
  state: HeatCapacityToastQueueState,
): HeatCapacityToastQueueUpdate => ({
  ...state,
  changed: false,
  shouldRestartTimer: false,
});

export const resolveHeatCapacityToastShow = (
  state: HeatCapacityToastShowState,
  nextMessage: HeatCapacityToastMessage,
  options: HeatCapacityToastShowOptions = {},
): HeatCapacityToastQueueUpdate => {
  const { current, pending, pressureAlertActive } = state;
  if (!isHeatCapacityPressureToast(nextMessage) && pressureAlertActive) return unchangedToastQueue(state);
  if (isHeatCapacityPressureToast(current) && !isHeatCapacityPressureToast(nextMessage)) return unchangedToastQueue(state);

  if (options.interrupt) {
    if (current && current.priority > nextMessage.priority) return unchangedToastQueue(state);
    return {
      current: nextMessage,
      pending: null,
      changed: true,
      shouldRestartTimer: true,
    };
  }

  if (!current) {
    return {
      current: nextMessage,
      pending,
      changed: true,
      shouldRestartTimer: true,
    };
  }

  if (nextMessage.priority < current.priority) return unchangedToastQueue(state);
  if (isHeatCapacityPressureToast(pending) && !isHeatCapacityPressureToast(nextMessage)) {
    return unchangedToastQueue(state);
  }
  if (!pending || nextMessage.priority >= pending.priority) {
    return {
      current,
      pending: nextMessage,
      changed: true,
      shouldRestartTimer: false,
    };
  }

  return unchangedToastQueue(state);
};

export const resolveHeatCapacityToastAdvance = (
  state: HeatCapacityToastQueueState,
  now: number,
): HeatCapacityToastAdvanceUpdate => {
  if (!state.pending) {
    return {
      current: null,
      pending: null,
      shouldContinueTimer: false,
    };
  }

  return {
    current: {
      ...state.pending,
      createdAt: now,
    },
    pending: null,
    shouldContinueTimer: true,
  };
};

export const resolveHeatCapacityToastClear = (
  state: HeatCapacityToastQueueState,
  predicate: (message: HeatCapacityToastMessage | null) => boolean,
  now: number,
): HeatCapacityToastQueueUpdate => {
  const clearCurrent = predicate(state.current);
  const clearPending = predicate(state.pending);
  if (!clearCurrent && !clearPending) return unchangedToastQueue(state);

  if (!clearCurrent) {
    return {
      current: state.current,
      pending: null,
      changed: true,
      shouldRestartTimer: false,
    };
  }

  const nextCurrent = clearPending || !state.pending
    ? null
    : {
        ...state.pending,
        createdAt: now,
      };

  return {
    current: nextCurrent,
    pending: null,
    changed: true,
    shouldRestartTimer: Boolean(nextCurrent),
  };
};
