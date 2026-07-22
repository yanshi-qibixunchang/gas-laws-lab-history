import {
  AlertTriangle,
  HelpCircle,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import {
  useCallback,
  useId,
  useRef,
  useState,
} from 'react';
import {
  PromptDialogShell,
  type PromptDialogTone,
} from './PromptDialogShell.tsx';
import './PromptConfirmDialog.css';

export type PromptConfirmationTone = PromptDialogTone;

export interface PromptConfirmationRequest {
  id: string;
  tone: PromptConfirmationTone;
  eyebrow: string;
  title: string;
  body: string;
  consequence: string;
  cancelLabel: string;
  confirmLabel: string;
  closeLabel: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface ActivePromptConfirmation extends PromptConfirmationRequest {
  returnFocusTo: HTMLElement | null;
}

const confirmationIcons: Record<PromptConfirmationTone, LucideIcon> = {
  standard: HelpCircle,
  warning: AlertTriangle,
  danger: Trash2,
};

export const usePromptConfirmation = () => {
  const [activeRequest, setActiveRequest] = useState<ActivePromptConfirmation | null>(null);
  const activeRequestRef = useRef<ActivePromptConfirmation | null>(null);
  const settlingRef = useRef(false);

  const requestConfirmation = useCallback((request: PromptConfirmationRequest) => {
    if (activeRequestRef.current || settlingRef.current) return false;
    const nextRequest: ActivePromptConfirmation = {
      ...request,
      returnFocusTo: document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null,
    };
    activeRequestRef.current = nextRequest;
    setActiveRequest(nextRequest);
    return true;
  }, []);

  const settleConfirmation = useCallback((result: 'cancel' | 'confirm') => {
    const request = activeRequestRef.current;
    if (!request || settlingRef.current) return;
    settlingRef.current = true;
    activeRequestRef.current = null;
    setActiveRequest(null);

    try {
      if (result === 'confirm') {
        request.onConfirm();
      } else {
        request.onCancel?.();
      }
    } finally {
      window.requestAnimationFrame(() => {
        if (request.returnFocusTo?.isConnected) request.returnFocusTo.focus();
        settlingRef.current = false;
      });
    }
  }, []);

  const cancelConfirmation = useCallback(() => {
    settleConfirmation('cancel');
  }, [settleConfirmation]);

  const confirmConfirmation = useCallback(() => {
    settleConfirmation('confirm');
  }, [settleConfirmation]);

  return {
    activeRequest,
    requestConfirmation,
    cancelConfirmation,
    confirmConfirmation,
  };
};

interface PromptConfirmDialogProps {
  request: PromptConfirmationRequest | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export const PromptConfirmDialog = ({
  request,
  onCancel,
  onConfirm,
}: PromptConfirmDialogProps) => {
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const titleId = `${useId()}-title`;
  const bodyId = `${useId()}-body`;
  const consequenceId = `${useId()}-consequence`;

  if (!request) return null;

  const Icon = confirmationIcons[request.tone];

  return (
    <PromptDialogShell
      title={request.title}
      titleId={titleId}
      eyebrow={request.eyebrow}
      icon={Icon}
      tone={request.tone}
      variant="confirmation"
      layer="decision"
      role="alertdialog"
      ariaDescribedBy={`${bodyId} ${consequenceId}`}
      closeLabel={request.closeLabel}
      dismiss={{ closeButton: true, escape: true, backdrop: true }}
      onRequestClose={onCancel}
      initialFocusRef={cancelButtonRef}
      overlayClassName="prompt-confirm-overlay"
      dialogClassName="prompt-confirm-dialog"
      headerClassName="prompt-confirm-header"
      iconClassName="prompt-confirm-icon"
      headingClassName="prompt-confirm-heading"
      closeButtonClassName="prompt-confirm-close"
      overlayData={{ 'data-prompt-confirm-overlay': 'true' }}
      dialogData={{ 'data-prompt-confirmation': request.id }}
    >
      <div className="prompt-confirm-body">
        <p id={bodyId}>{request.body}</p>
        <div className="prompt-confirm-consequence" id={consequenceId}>
          <span aria-hidden="true" />
          <p>{request.consequence}</p>
        </div>
      </div>
      <footer className="prompt-confirm-actions">
        <button
          ref={cancelButtonRef}
          type="button"
          className="prompt-confirm-button prompt-confirm-button-cancel"
          data-prompt-action="cancel"
          data-prompt-initial-focus="true"
          onClick={onCancel}
        >
          {request.cancelLabel}
        </button>
        <button
          type="button"
          className="prompt-confirm-button prompt-confirm-button-primary"
          data-prompt-action="confirm"
          onClick={onConfirm}
        >
          {request.confirmLabel}
        </button>
      </footer>
    </PromptDialogShell>
  );
};
