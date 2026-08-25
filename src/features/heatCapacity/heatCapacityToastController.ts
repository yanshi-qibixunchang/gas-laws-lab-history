import { PROMPT_TOAST_DURATION_MS } from '../../components/prompts/promptFeedbackPolicy.ts';
import {
  createPromptViewportFeedbackMessage,
  resolvePromptViewportFeedbackAdvance,
  resolvePromptViewportFeedbackClear,
  resolvePromptViewportFeedbackShow,
  type PromptViewportFeedbackMessage,
  type PromptViewportFeedbackQueueState,
} from '../../components/prompts/promptViewportFeedbackController.ts';

export type HeatCapacityToastLevel = 'info' | 'success' | 'warning' | 'danger';

export type HeatCapacityToastSource =
  | 'guide'
  | 'guide-blocked'
  | 'pressure-warning'
  | 'pressure-close-valve'
  | 'pressure-alarm';

export type HeatCapacityToastMessage = Omit<
  PromptViewportFeedbackMessage<HeatCapacityToastSource>,
  'kind'
> & {
  kind: HeatCapacityToastLevel;
  level: HeatCapacityToastLevel;
};

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

export const HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS: number = PROMPT_TOAST_DURATION_MS.short;

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
  const message = createPromptViewportFeedbackMessage(text, level, {
    id: options.id,
    now: options.now,
    priority: options.priority ?? HEAT_CAPACITY_TOAST_PRIORITY[level],
    source: options.source ?? 'guide',
    durationMs: HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS,
  });
  return {
    ...message,
    level,
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
  if (isHeatCapacityPressureToast(pending) && !isHeatCapacityPressureToast(nextMessage)) {
    return unchangedToastQueue(state);
  }
  return resolvePromptViewportFeedbackShow(
    { current, pending } satisfies PromptViewportFeedbackQueueState<HeatCapacityToastMessage>,
    nextMessage,
    options,
  );
};

export const resolveHeatCapacityToastAdvance = (
  state: HeatCapacityToastQueueState,
  now: number,
): HeatCapacityToastAdvanceUpdate => {
  return resolvePromptViewportFeedbackAdvance(state, now);
};

export const resolveHeatCapacityToastClear = (
  state: HeatCapacityToastQueueState,
  predicate: (message: HeatCapacityToastMessage | null) => boolean,
  now: number,
): HeatCapacityToastQueueUpdate => {
  return resolvePromptViewportFeedbackClear(state, predicate, now);
};
