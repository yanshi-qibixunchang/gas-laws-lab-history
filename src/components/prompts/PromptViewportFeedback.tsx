import type { CSSProperties, ReactNode } from 'react';
import type { PromptFeedbackKind } from './promptFeedbackPolicy.ts';
import './PromptViewportFeedback.css';

const PROMPT_VIEWPORT_FEEDBACK_EXIT_DURATION_MS = 180;

export interface PromptViewportFeedbackProps {
  id: string;
  kind: PromptFeedbackKind;
  label: string;
  children: ReactNode;
  durationMs?: number;
  className?: string;
  dataAttributes?: Record<string, string | undefined>;
}

export const PromptViewportFeedback = ({
  id,
  kind,
  label,
  children,
  durationMs = 2000,
  className,
  dataAttributes,
}: PromptViewportFeedbackProps) => {
  const assertive = kind === 'danger';
  const style = {
    '--prompt-viewport-feedback-exit-delay': `${Math.max(
      0,
      durationMs - PROMPT_VIEWPORT_FEEDBACK_EXIT_DURATION_MS,
    )}ms`,
  } as CSSProperties;

  return (
    <div
      {...dataAttributes}
      key={id}
      className={`prompt-viewport-feedback prompt-viewport-feedback-${kind}${className ? ` ${className}` : ''}`}
      data-prompt-viewport-feedback="true"
      data-prompt-feedback-kind={kind}
      role={assertive ? 'alert' : 'status'}
      aria-live={assertive ? 'assertive' : 'polite'}
      aria-atomic="true"
      style={style}
    >
      <span className="prompt-viewport-feedback-kicker">{label}</span>
      <strong>{children}</strong>
    </div>
  );
};
