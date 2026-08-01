export type PromptFeedbackKind = 'success' | 'info' | 'warning' | 'danger';

export const PROMPT_TOAST_MAX_VISIBLE = 4;

export const PROMPT_TOAST_DURATION_MS = {
  short: 2000,
  standard: 2600,
  extended: 6200,
} as const;

export const PROMPT_TOOLTIP_DELAY_MS = {
  pointer: 420,
  focus: 120,
  hide: 80,
} as const;

export const PROMPT_FEEDBACK_PRIORITY: Record<PromptFeedbackKind, number> = {
  success: 0,
  info: 1,
  warning: 2,
  danger: 3,
};
