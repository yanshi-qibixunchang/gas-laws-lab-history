import { MoreHorizontal, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import './FreeExperimentProgress.css';

export interface FreeExperimentProgressAction {
  id: string;
  label: string;
  icon?: 'plus' | 'restart' | 'trash';
  tone?: 'default' | 'danger' | 'primary';
  separatorBefore?: boolean;
  disabled?: boolean;
  onSelect: () => void;
  dataAttribute?: { name: string; value: string | number };
}

export interface FreeExperimentProgressDetail {
  id: string;
  label: string;
  statusLabel: string;
  status: 'saved' | 'current' | 'pending';
  deleteLabel?: string;
  confirmDeleteLabel?: string;
  cancelDeleteLabel?: string;
  onDelete?: () => void;
  deleteDataAttribute?: { name: string; value: string | number };
}

export interface FreeExperimentProgressProps {
  label?: string;
  openMenuLabel?: string;
  menuLabel?: string;
  menuTitle?: string;
  details?: readonly FreeExperimentProgressDetail[];
  actions?: readonly FreeExperimentProgressAction[];
  primaryAction?: FreeExperimentProgressAction;
  disabled?: boolean;
  dataOwner: string;
}

interface FloatingPosition {
  top: number;
  left: number;
  maxHeight: number;
  theme: 'light' | 'dark';
}

const MENU_GAP_PX = 6;
const VIEWPORT_GAP_PX = 8;
const DEFAULT_MENU_WIDTH_PX = 260;

const renderActionIcon = (icon: FreeExperimentProgressAction['icon']) => {
  if (icon === 'plus') return <Plus size={13} strokeWidth={2.4} aria-hidden="true" />;
  if (icon === 'trash') return <Trash2 size={13} strokeWidth={2.4} aria-hidden="true" />;
  if (icon === 'restart') return <RotateCcw size={13} strokeWidth={2.4} aria-hidden="true" />;
  return null;
};

export const FreeExperimentProgress = ({
  label,
  openMenuLabel,
  menuLabel,
  menuTitle,
  details = [],
  actions = [],
  primaryAction,
  disabled = false,
  dataOwner,
}: FreeExperimentProgressProps) => {
  const generatedId = useId();
  const menuId = `${generatedId}-menu`;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [position, setPosition] = useState<FloatingPosition | null>(null);
  const hasMenu = Boolean(openMenuLabel && menuLabel && (details.length > 0 || actions.length > 0));

  const closeMenu = (restoreFocus = false) => {
    setMenuOpen(false);
    setPendingDeleteId(null);
    setPosition(null);
    if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const triggerRect = trigger.getBoundingClientRect();
    const menuRect = menuRef.current?.getBoundingClientRect();
    const menuWidth = menuRect?.width ?? DEFAULT_MENU_WIDTH_PX;
    const desiredHeight = menuRect?.height ?? Math.min(390, window.innerHeight - 2 * VIEWPORT_GAP_PX);
    const spaceBelow = window.innerHeight - triggerRect.bottom - VIEWPORT_GAP_PX;
    const spaceAbove = triggerRect.top - VIEWPORT_GAP_PX;
    const placeAbove = spaceBelow < Math.min(desiredHeight, 220) && spaceAbove > spaceBelow;
    const maxHeight = Math.max(120, placeAbove ? spaceAbove - MENU_GAP_PX : spaceBelow - MENU_GAP_PX);
    const rawTop = placeAbove
      ? triggerRect.top - Math.min(desiredHeight, maxHeight) - MENU_GAP_PX
      : triggerRect.bottom + MENU_GAP_PX;
    const rawLeft = triggerRect.right - menuWidth;
    const left = Math.min(
      window.innerWidth - menuWidth - VIEWPORT_GAP_PX,
      Math.max(VIEWPORT_GAP_PX, rawLeft),
    );
    setPosition({
      top: Math.max(VIEWPORT_GAP_PX, rawTop),
      left,
      maxHeight,
      theme: trigger.closest('.studio-theme-light') ? 'light' : 'dark',
    });
  };

  useLayoutEffect(() => {
    if (!menuOpen) return;
    updatePosition();
  }, [menuOpen, details.length, actions.length, pendingDeleteId]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Node ? event.target : null;
      if (
        target
        && (rootRef.current?.contains(target) || menuRef.current?.contains(target))
      ) return;
      closeMenu();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      closeMenu(true);
    };
    const handleViewportChange = () => updatePosition();
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (disabled) closeMenu();
  }, [disabled]);

  const runAction = (action: FreeExperimentProgressAction) => {
    closeMenu();
    action.onSelect();
  };

  const applyDataAttribute = (
    attribute: FreeExperimentProgressAction['dataAttribute']
      | FreeExperimentProgressDetail['deleteDataAttribute'],
  ) => attribute ? { [attribute.name]: attribute.value } : {};

  const floatingMenu = menuOpen && hasMenu && typeof document !== 'undefined'
    ? createPortal(
        <div
          id={menuId}
          ref={menuRef}
          className="free-experiment-progress-menu"
          data-theme={position?.theme ?? 'dark'}
          data-free-experiment-progress-menu={dataOwner}
          role="menu"
          aria-label={menuLabel}
          style={position ? ({
            top: `${position.top}px`,
            left: `${position.left}px`,
            maxHeight: `${position.maxHeight}px`,
          } as CSSProperties) : ({ visibility: 'hidden' } as CSSProperties)}
        >
          {menuTitle ? <strong className="free-experiment-progress-menu-title">{menuTitle}</strong> : null}
          {details.length > 0 ? (
            <div className="free-experiment-progress-details">
              {details.map((detail) => {
                const pendingConfirmation = pendingDeleteId === detail.id;
                return (
                  <div
                    key={detail.id}
                    className="free-experiment-progress-detail"
                    data-run-status={detail.status}
                  >
                    <span>
                      <strong>{detail.label}</strong>
                      <small>{detail.statusLabel}</small>
                    </span>
                    {detail.onDelete ? (
                      pendingConfirmation ? (
                        <span className="free-experiment-progress-delete-confirmation">
                          <button
                            type="button"
                            onClick={() => setPendingDeleteId(null)}
                            aria-label={detail.cancelDeleteLabel}
                          >
                            <X size={12} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="is-danger"
                            {...applyDataAttribute(detail.deleteDataAttribute)}
                            onClick={() => {
                              detail.onDelete?.();
                              setPendingDeleteId(null);
                            }}
                          >
                            {detail.confirmDeleteLabel}
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="free-experiment-progress-delete"
                          aria-label={detail.deleteLabel}
                          title={detail.deleteLabel}
                          onClick={() => setPendingDeleteId(detail.id)}
                        >
                          <Trash2 size={13} aria-hidden="true" />
                        </button>
                      )
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
          {actions.map((action) => (
            <div key={action.id} className={action.separatorBefore ? 'has-separator' : undefined}>
              <button
                type="button"
                role="menuitem"
                className={`free-experiment-progress-menu-action is-${action.tone ?? 'default'}`}
                disabled={action.disabled}
                {...applyDataAttribute(action.dataAttribute)}
                onClick={() => runAction(action)}
              >
                {renderActionIcon(action.icon)}
                <span>{action.label}</span>
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )
    : null;

  return (
    <div
      ref={rootRef}
      className={`free-experiment-progress ${label ? '' : 'is-action-only'}`.trim()}
      data-free-experiment-progress={dataOwner}
    >
      {label ? (
        <span className="free-experiment-progress-label" role="status" aria-live="polite">
          {label}
        </span>
      ) : null}
      {primaryAction ? (
        <button
          type="button"
          className="free-experiment-progress-primary"
          disabled={disabled || primaryAction.disabled}
          {...applyDataAttribute(primaryAction.dataAttribute)}
          onClick={primaryAction.onSelect}
        >
          {renderActionIcon(primaryAction.icon)}
          <span>{primaryAction.label}</span>
        </button>
      ) : hasMenu ? (
        <button
          ref={triggerRef}
          type="button"
          className="free-experiment-progress-trigger"
          aria-label={openMenuLabel}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-controls={menuOpen ? menuId : undefined}
          disabled={disabled}
          onClick={() => {
            if (menuOpen) closeMenu();
            else {
              setPendingDeleteId(null);
              setMenuOpen(true);
            }
          }}
        >
          <MoreHorizontal size={14} strokeWidth={2.4} aria-hidden="true" />
        </button>
      ) : null}
      {floatingMenu}
    </div>
  );
};

export default FreeExperimentProgress;
