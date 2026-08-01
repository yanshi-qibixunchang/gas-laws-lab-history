import { AlertTriangle, Info, ShieldAlert, type LucideIcon } from 'lucide-react';
import { useId, useRef } from 'react';
import {
  PromptDialogShell,
  type PromptDialogDismissPolicy,
  type PromptDialogTone,
} from './PromptDialogShell.tsx';
import './PromptNoticeDialog.css';

interface PromptNoticeBaseRequest {
  id: string;
  tone?: PromptDialogTone;
  eyebrow: string;
  title: string;
  body: string;
  details?: string;
  actionLabel?: string;
}

export interface PromptNoticeRequest extends PromptNoticeBaseRequest {
  closeLabel: string;
  dismiss?: Partial<PromptDialogDismissPolicy>;
}

export interface PromptForcedNoticeRequest extends PromptNoticeBaseRequest {
  actionLabel: string;
}

interface PromptNoticeDialogProps {
  request: PromptNoticeRequest | null;
  onDismiss: () => void;
  onAction?: () => void;
}

interface PromptForcedNoticeDialogProps {
  request: PromptForcedNoticeRequest | null;
  onAction: () => void;
}

const noticeIcons: Record<PromptDialogTone, LucideIcon> = {
  standard: Info,
  warning: AlertTriangle,
  danger: ShieldAlert,
};

interface PromptNoticeSurfaceProps {
  request: PromptNoticeBaseRequest;
  mode: 'normal' | 'forced';
  closeLabel?: string;
  dismiss?: Partial<PromptDialogDismissPolicy>;
  onDismiss?: () => void;
  onAction?: () => void;
}

const PromptNoticeSurface = ({
  request,
  mode,
  closeLabel,
  dismiss,
  onDismiss,
  onAction,
}: PromptNoticeSurfaceProps) => {
  const generatedId = useId();
  const bodyId = `${generatedId}-body`;
  const detailsId = `${generatedId}-details`;
  const actionButtonRef = useRef<HTMLButtonElement | null>(null);
  const tone = request.tone ?? 'standard';
  const Icon = noticeIcons[tone];
  const forced = mode === 'forced';

  return (
    <PromptDialogShell
      title={request.title}
      eyebrow={request.eyebrow}
      icon={Icon}
      tone={tone}
      variant="notice"
      layer="decision"
      role={forced ? 'alertdialog' : 'dialog'}
      closeLabel={forced ? undefined : closeLabel}
      dismiss={forced ? { closeButton: false, escape: false, backdrop: false } : dismiss}
      onRequestClose={forced ? undefined : onDismiss}
      initialFocusRef={actionButtonRef}
      ariaDescribedBy={request.details ? `${bodyId} ${detailsId}` : bodyId}
      dialogClassName="prompt-notice-dialog"
      dialogData={{
        'data-prompt-notice': request.id,
        'data-prompt-notice-mode': mode,
      }}
    >
      <div className="prompt-notice-body">
        <p id={bodyId}>{request.body}</p>
        {request.details ? <p id={detailsId} className="prompt-notice-details">{request.details}</p> : null}
      </div>
      {request.actionLabel ? (
        <footer className="prompt-notice-actions">
          <button
            ref={actionButtonRef}
            type="button"
            className="prompt-notice-action"
            data-prompt-action="acknowledge"
            data-prompt-initial-focus="true"
            onClick={onAction}
          >
            {request.actionLabel}
          </button>
        </footer>
      ) : null}
    </PromptDialogShell>
  );
};

export const PromptNoticeDialog = ({ request, onDismiss, onAction }: PromptNoticeDialogProps) => {
  if (!request) return null;
  return (
    <PromptNoticeSurface
      request={request}
      mode="normal"
      closeLabel={request.closeLabel}
      dismiss={request.dismiss}
      onDismiss={onDismiss}
      onAction={onAction}
    />
  );
};

export const PromptForcedNoticeDialog = ({ request, onAction }: PromptForcedNoticeDialogProps) => {
  if (!request) return null;
  return <PromptNoticeSurface request={request} mode="forced" onAction={onAction} />;
};
