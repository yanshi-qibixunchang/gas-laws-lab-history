import {
  PROMPT_TOAST_DURATION_MS,
  type PromptFeedbackKind,
} from './promptFeedbackPolicy.ts';

export interface PromptViewportFeedbackMessage<Source extends string = string> {
  id: string;
  text: string;
  kind: PromptFeedbackKind;
  priority: number;
  source: Source;
  createdAt: number;
  durationMs: number;
}

export interface PromptViewportFeedbackQueueState<
  Message extends PromptViewportFeedbackMessage = PromptViewportFeedbackMessage,
> {
  current: Message | null;
  pending: Message | null;
}

export interface PromptViewportFeedbackQueueUpdate<
  Message extends PromptViewportFeedbackMessage = PromptViewportFeedbackMessage,
> extends PromptViewportFeedbackQueueState<Message> {
  changed: boolean;
  shouldRestartTimer: boolean;
}

export interface PromptViewportFeedbackAdvanceUpdate<
  Message extends PromptViewportFeedbackMessage = PromptViewportFeedbackMessage,
> extends PromptViewportFeedbackQueueState<Message> {
  shouldContinueTimer: boolean;
}

export interface PromptViewportFeedbackCreateOptions<Source extends string> {
  id?: string;
  now?: number;
  priority?: number;
  source: Source;
  durationMs?: number;
}

export interface PromptViewportFeedbackShowOptions {
  interrupt?: boolean;
}

export const PROMPT_VIEWPORT_FEEDBACK_PRIORITY: Record<PromptFeedbackKind, number> = {
  info: 0,
  success: 0,
  warning: 1,
  danger: 2,
};

export const createPromptViewportFeedbackMessage = <Source extends string>(
  text: string,
  kind: PromptFeedbackKind = 'info',
  options: PromptViewportFeedbackCreateOptions<Source>,
): PromptViewportFeedbackMessage<Source> => {
  const now = options.now ?? Date.now();
  return {
    id: options.id ?? `${now}-${Math.random().toString(36).slice(2)}`,
    text,
    kind,
    priority: options.priority ?? PROMPT_VIEWPORT_FEEDBACK_PRIORITY[kind],
    source: options.source,
    createdAt: now,
    durationMs: options.durationMs ?? PROMPT_TOAST_DURATION_MS.short,
  };
};

const unchangedPromptViewportFeedbackQueue = <
  Message extends PromptViewportFeedbackMessage,
>(
  state: PromptViewportFeedbackQueueState<Message>,
): PromptViewportFeedbackQueueUpdate<Message> => ({
  ...state,
  changed: false,
  shouldRestartTimer: false,
});

export const resolvePromptViewportFeedbackShow = <
  Message extends PromptViewportFeedbackMessage,
>(
  state: PromptViewportFeedbackQueueState<Message>,
  nextMessage: Message,
  options: PromptViewportFeedbackShowOptions = {},
): PromptViewportFeedbackQueueUpdate<Message> => {
  const { current, pending } = state;

  if (options.interrupt) {
    if (current && current.priority > nextMessage.priority) {
      return unchangedPromptViewportFeedbackQueue(state);
    }
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

  if (nextMessage.priority < current.priority) {
    return unchangedPromptViewportFeedbackQueue(state);
  }
  if (!pending || nextMessage.priority >= pending.priority) {
    return {
      current,
      pending: nextMessage,
      changed: true,
      shouldRestartTimer: false,
    };
  }

  return unchangedPromptViewportFeedbackQueue(state);
};

export const resolvePromptViewportFeedbackAdvance = <
  Message extends PromptViewportFeedbackMessage,
>(
  state: PromptViewportFeedbackQueueState<Message>,
  now: number,
): PromptViewportFeedbackAdvanceUpdate<Message> => {
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

export const resolvePromptViewportFeedbackClear = <
  Message extends PromptViewportFeedbackMessage,
>(
  state: PromptViewportFeedbackQueueState<Message>,
  predicate: (message: Message | null) => boolean,
  now: number,
): PromptViewportFeedbackQueueUpdate<Message> => {
  const clearCurrent = predicate(state.current);
  const clearPending = predicate(state.pending);
  if (!clearCurrent && !clearPending) {
    return unchangedPromptViewportFeedbackQueue(state);
  }

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
