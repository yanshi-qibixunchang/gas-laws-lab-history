import { X, type LucideIcon } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type Ref,
} from 'react';
import './PromptDialogShell.css';

export type PromptDialogTone = 'standard' | 'warning' | 'danger';
export type PromptDialogVariant = 'notice' | 'task' | 'confirmation';

export interface PromptDialogDismissPolicy {
  closeButton: boolean;
  escape: boolean;
  backdrop: boolean;
}

interface PromptDialogShellProps {
  title: ReactNode;
  titleId?: string;
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  tone?: PromptDialogTone;
  variant?: PromptDialogVariant;
  layer?: 'window' | 'decision';
  role?: 'dialog' | 'alertdialog';
  ariaLabel?: string;
  ariaDescribedBy?: string;
  closeLabel?: string;
  dismiss?: Partial<PromptDialogDismissPolicy>;
  onRequestClose?: () => void;
  onBackdropMouseDown?: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onDialogKeyDown?: (event: ReactKeyboardEvent<HTMLElement>) => void;
  initialFocusRef?: { current: HTMLElement | null };
  initialFocusSelector?: string;
  focusKey?: string | number | boolean | null;
  focusOnOpen?: boolean;
  restoreFocus?: boolean;
  returnFocusSelector?: string;
  trapFocus?: boolean;
  dialogRef?: Ref<HTMLElement>;
  overlayClassName?: string;
  dialogClassName?: string;
  headerClassName?: string;
  iconClassName?: string;
  headingClassName?: string;
  closeButtonClassName?: string;
  windowOverflow?: 'hidden' | 'auto';
  overlayData?: Record<string, string | undefined>;
  dialogData?: Record<string, string | undefined>;
  children: ReactNode;
}

interface ActivePromptShell {
  id: string;
  priority: number;
  dialog: () => HTMLElement | null;
  focusPreferred: () => void;
}

const activePromptShells: ActivePromptShell[] = [];

const getTopPromptShell = () => activePromptShells.reduce<ActivePromptShell | null>((top, entry) => {
  if (!top || entry.priority >= top.priority) return entry;
  return top;
}, null);

const focusableSelector = [
  'button:not(:disabled):not([tabindex="-1"])',
  'input:not(:disabled):not([tabindex="-1"])',
  'select:not(:disabled):not([tabindex="-1"])',
  'textarea:not(:disabled):not([tabindex="-1"])',
  '[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const joinClassNames = (...classNames: Array<string | undefined>) => classNames.filter(Boolean).join(' ');

const setForwardedRef = (ref: Ref<HTMLElement> | undefined, value: HTMLElement | null) => {
  if (typeof ref === 'function') {
    ref(value);
  } else if (ref) {
    (ref as { current: HTMLElement | null }).current = value;
  }
};

export const PromptDialogShell = ({
  title,
  titleId,
  eyebrow,
  subtitle,
  icon: Icon,
  tone = 'standard',
  variant = 'task',
  layer = 'window',
  role = 'dialog',
  ariaLabel,
  ariaDescribedBy,
  closeLabel,
  dismiss,
  onRequestClose,
  onBackdropMouseDown,
  onDialogKeyDown,
  initialFocusRef,
  initialFocusSelector,
  focusKey = null,
  focusOnOpen = true,
  restoreFocus = true,
  returnFocusSelector,
  trapFocus = true,
  dialogRef,
  overlayClassName,
  dialogClassName,
  headerClassName,
  iconClassName,
  headingClassName,
  closeButtonClassName,
  windowOverflow = 'hidden',
  overlayData,
  dialogData,
  children,
}: PromptDialogShellProps) => {
  const generatedId = useId();
  const shellId = `${generatedId}-shell`;
  const resolvedTitleId = titleId ?? `${generatedId}-title`;
  const internalDialogRef = useRef<HTMLElement | null>(null);
  const initialFocusRefRef = useRef(initialFocusRef);
  const initialFocusSelectorRef = useRef(initialFocusSelector);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  initialFocusRefRef.current = initialFocusRef;
  initialFocusSelectorRef.current = initialFocusSelector;

  const setDialogRef = useCallback((node: HTMLElement | null) => {
    internalDialogRef.current = node;
    setForwardedRef(dialogRef, node);
  }, [dialogRef]);

  const getFocusableElements = useCallback(() => {
    const dialog = internalDialogRef.current;
    if (!dialog) return [];
    return Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => (
      element.getAttribute('aria-hidden') !== 'true' && element.getClientRects().length > 0
    ));
  }, []);

  const focusPreferred = useCallback(() => {
    const dialog = internalDialogRef.current;
    if (!dialog) return;
    const requested = initialFocusRefRef.current?.current
      ?? (initialFocusSelectorRef.current
        ? dialog.querySelector<HTMLElement>(initialFocusSelectorRef.current)
        : null)
      ?? dialog.querySelector<HTMLElement>('[data-prompt-initial-focus="true"]')
      ?? getFocusableElements()[0]
      ?? dialog;
    requested.focus();
  }, [getFocusableElements]);

  useEffect(() => {
    returnFocusRef.current = (returnFocusSelector
      ? document.querySelector<HTMLElement>(returnFocusSelector)
      : null)
      ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const activeShell: ActivePromptShell = {
      id: shellId,
      priority: layer === 'decision' ? 2 : 1,
      dialog: () => internalDialogRef.current,
      focusPreferred,
    };
    activePromptShells.push(activeShell);

    const keepFocusInside = (event: FocusEvent) => {
      if (!trapFocus || getTopPromptShell()?.id !== shellId) return;
      if (event.target instanceof Node && internalDialogRef.current?.contains(event.target)) return;
      focusPreferred();
    };
    document.addEventListener('focusin', keepFocusInside);

    return () => {
      document.removeEventListener('focusin', keepFocusInside);
      const shellIndex = activePromptShells.findIndex((entry) => entry.id === shellId);
      if (shellIndex >= 0) activePromptShells.splice(shellIndex, 1);
      if (!restoreFocus) return;
      const returnTarget = returnFocusRef.current;
      window.requestAnimationFrame(() => {
        const nextTopShell = getTopPromptShell();
        const nextTopDialog = nextTopShell?.dialog() ?? null;
        if (
          returnTarget?.isConnected &&
          (!nextTopDialog || nextTopDialog.contains(returnTarget))
        ) {
          returnTarget.focus();
        } else {
          nextTopShell?.focusPreferred();
        }
      });
    };
  }, [focusPreferred, layer, restoreFocus, returnFocusSelector, shellId, trapFocus]);

  useEffect(() => {
    if (!focusOnOpen) return undefined;
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        if (getTopPromptShell()?.id === shellId) focusPreferred();
      });
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [focusKey, focusOnOpen, focusPreferred, shellId]);

  const dismissPolicy: PromptDialogDismissPolicy = {
    closeButton: Boolean(onRequestClose && closeLabel),
    escape: Boolean(onRequestClose),
    backdrop: Boolean(onRequestClose),
    ...dismiss,
  };

  const handleOverlayMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    onBackdropMouseDown?.(event);
    if (event.defaultPrevented || event.target !== event.currentTarget) return;
    // A fast second click on the trigger can land on a newly mounted mask.
    if (event.detail > 1) return;
    if (!dismissPolicy.backdrop || !onRequestClose) return;
    event.preventDefault();
    onRequestClose();
  };

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    onDialogKeyDown?.(event);
    if (event.defaultPrevented) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (dismissPolicy.escape) onRequestClose?.();
      return;
    }
    if (event.key !== 'Tab' || !trapFocus) return;

    const focusable = getFocusableElements();
    if (focusable.length === 0) {
      event.preventDefault();
      internalDialogRef.current?.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      {...overlayData}
      className={joinClassNames('prompt-dialog-overlay', overlayClassName)}
      data-prompt-shell-overlay="true"
      data-prompt-layer={layer}
      role="presentation"
      onMouseDown={handleOverlayMouseDown}
    >
      <section
        {...dialogData}
        ref={setDialogRef}
        className={joinClassNames('prompt-dialog-window', dialogClassName)}
        data-prompt-shell-window="true"
        data-prompt-tone={tone}
        data-prompt-variant={variant}
        data-prompt-overflow={windowOverflow}
        role={role}
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : resolvedTitleId}
        aria-describedby={ariaDescribedBy}
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header
          className={joinClassNames('prompt-dialog-header', headerClassName)}
          data-prompt-shell-header="true"
          data-prompt-header-icon={Icon ? 'true' : 'false'}
        >
          {Icon ? (
            <span className={joinClassNames('prompt-dialog-icon', iconClassName)} aria-hidden="true">
              <Icon size={17} strokeWidth={1.9} />
            </span>
          ) : null}
          <div className={joinClassNames('prompt-dialog-heading', headingClassName)}>
            {eyebrow ? <small>{eyebrow}</small> : null}
            <strong id={resolvedTitleId}>{title}</strong>
            {subtitle ? <span className="prompt-dialog-subtitle">{subtitle}</span> : null}
          </div>
          {dismissPolicy.closeButton && onRequestClose ? (
            <button
              type="button"
              className={joinClassNames('prompt-dialog-close', closeButtonClassName)}
              aria-label={closeLabel}
              data-prompt-action="close"
              onClick={onRequestClose}
            >
              <X size={13} strokeWidth={2} aria-hidden="true" />
            </button>
          ) : null}
        </header>
        {children}
      </section>
    </div>
  );
};
