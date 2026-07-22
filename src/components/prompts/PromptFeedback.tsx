import {
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldAlert,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import {
  PROMPT_FEEDBACK_PRIORITY,
  PROMPT_TOAST_MAX_VISIBLE,
  type PromptFeedbackKind,
} from './promptFeedbackPolicy.ts';
import './PromptFeedback.css';

export interface PromptToastMessage {
  id: string;
  kind: PromptFeedbackKind;
  label: string;
  title?: ReactNode;
  body: ReactNode;
  closeLabel?: string;
  priority?: number;
  persistent?: boolean;
  onDismiss?: () => void;
  dataAttributes?: Record<string, string | undefined>;
}

interface PromptToastRegionProps {
  ariaLabel: string;
  messages: PromptToastMessage[];
  maxVisible?: number;
}

const feedbackIcons: Record<PromptFeedbackKind, LucideIcon> = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  danger: ShieldAlert,
};

export const PromptToastRegion = ({
  ariaLabel,
  messages,
  maxVisible = PROMPT_TOAST_MAX_VISIBLE,
}: PromptToastRegionProps) => {
  const visibleMessages = messages
    .map((message, index) => ({ message, index }))
    .sort((left, right) => (
      (right.message.priority ?? PROMPT_FEEDBACK_PRIORITY[right.message.kind]) -
        (left.message.priority ?? PROMPT_FEEDBACK_PRIORITY[left.message.kind]) ||
      left.index - right.index
    ))
    .slice(0, maxVisible)
    .map(({ message }) => message);

  if (visibleMessages.length === 0) return null;

  return (
    <section
      className="prompt-toast-region"
      aria-label={ariaLabel}
      data-prompt-toast-region="true"
    >
      {visibleMessages.map((message) => {
        const Icon = feedbackIcons[message.kind];
        const assertive = message.kind === 'danger';
        return (
          <article
            key={message.id}
            {...message.dataAttributes}
            className="prompt-toast"
            data-prompt-toast={message.id}
            data-prompt-feedback-kind={message.kind}
            data-prompt-feedback-persistent={message.persistent ? 'true' : 'false'}
            role={assertive ? 'alert' : 'status'}
            aria-live={assertive ? 'assertive' : 'polite'}
            aria-atomic="true"
          >
            <span className="prompt-toast-icon" aria-hidden="true">
              <Icon size={16} strokeWidth={2} />
            </span>
            <span className="prompt-toast-copy">
              <small>{message.label}</small>
              {message.title ? <strong>{message.title}</strong> : null}
              <span>{message.body}</span>
            </span>
            {message.onDismiss && message.closeLabel ? (
              <button
                type="button"
                className="prompt-toast-close"
                aria-label={message.closeLabel}
                onClick={message.onDismiss}
              >
                <X size={12} strokeWidth={2.1} aria-hidden="true" />
              </button>
            ) : null}
          </article>
        );
      })}
    </section>
  );
};

interface PromptPersistentBannerProps {
  kind?: Exclude<PromptFeedbackKind, 'success'>;
  message: ReactNode;
  actionLabel?: string;
  actionDisabled?: boolean;
  onAction?: () => void;
  tooltip?: string;
  theme?: 'system' | 'light' | 'dark';
  dataAttributes?: Record<string, string | undefined>;
}

export const PromptPersistentBanner = ({
  kind = 'warning',
  message,
  actionLabel,
  actionDisabled = false,
  onAction,
  tooltip,
  theme = 'dark',
  dataAttributes,
}: PromptPersistentBannerProps) => {
  const Icon = feedbackIcons[kind];
  const assertive = kind === 'danger';
  return (
    <aside
      {...dataAttributes}
      className="prompt-persistent-banner"
      data-prompt-feedback-kind={kind}
      data-prompt-theme={theme}
      data-prompt-tooltip={tooltip}
      role={assertive ? 'alert' : 'status'}
      aria-live={assertive ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <Icon size={16} strokeWidth={2} aria-hidden="true" />
      <span>{message}</span>
      {actionLabel && onAction ? (
        <button type="button" disabled={actionDisabled} onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </aside>
  );
};
