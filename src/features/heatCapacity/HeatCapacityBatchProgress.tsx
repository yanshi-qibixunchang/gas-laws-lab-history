import { MoreHorizontal, RotateCcw } from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import type { WorkbenchLanguagePreference } from '../workbench/workbenchGeneralSettings.ts';
import './HeatCapacityBatchProgress.css';

export interface HeatCapacityBatchProgressProps {
  currentGroup: number;
  targetGroupCount: number | null;
  onRestartBatch: () => void;
  language: WorkbenchLanguagePreference;
  restartDisabled?: boolean;
}

const COPY = {
  'zh-CN': {
    progress: (current: number, target: number) => `第 ${current} / ${target} 组`,
    menuAria: '本轮实验操作',
    restart: '重新开始本轮',
    confirmRestart: '确认重新开始',
  },
  'zh-TW': {
    progress: (current: number, target: number) => `第 ${current} / ${target} 組`,
    menuAria: '本輪實驗操作',
    restart: '重新開始本輪',
    confirmRestart: '確認重新開始',
  },
  en: {
    progress: (current: number, target: number) => `Group ${current} / ${target}`,
    menuAria: 'Experiment batch actions',
    restart: 'Restart batch',
    confirmRestart: 'Confirm restart',
  },
} as const;

const isConfiguredTarget = (targetGroupCount: number | null): targetGroupCount is number => (
  targetGroupCount !== null
  && Number.isInteger(targetGroupCount)
  && targetGroupCount >= 3
  && targetGroupCount <= 7
);

export const HeatCapacityBatchProgress = ({
  currentGroup,
  targetGroupCount,
  onRestartBatch,
  language,
  restartDisabled = false,
}: HeatCapacityBatchProgressProps) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [restartPending, setRestartPending] = useState(false);
  const menuId = `${useId()}-menu`;
  const copy = COPY[language] ?? COPY['zh-CN'];

  const closeMenu = (restoreFocus = false) => {
    setMenuOpen(false);
    setRestartPending(false);
    if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  useEffect(() => {
    if (!menuOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Node ? event.target : null;
      if (target && rootRef.current?.contains(target)) return;
      closeMenu();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      closeMenu(true);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!restartDisabled) return;
    closeMenu();
  }, [restartDisabled]);

  if (!isConfiguredTarget(targetGroupCount)) return null;

  const safeCurrentGroup = Math.min(
    targetGroupCount,
    Math.max(1, Number.isFinite(currentGroup) ? Math.floor(currentGroup) : 1),
  );

  const handleRestart = () => {
    if (!restartPending) {
      setRestartPending(true);
      return;
    }

    closeMenu();
    onRestartBatch();
  };

  return (
    <div
      className="studio-heat-batch-progress"
      data-heat-capacity-batch-progress="true"
      ref={rootRef}
    >
      <span className="studio-heat-batch-progress-label">
        {copy.progress(safeCurrentGroup, targetGroupCount)}
      </span>
      <button
        type="button"
        className="studio-heat-batch-progress-trigger"
        aria-label={copy.menuAria}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls={menuOpen ? menuId : undefined}
        disabled={restartDisabled}
        ref={triggerRef}
        onClick={() => {
          if (menuOpen) {
            closeMenu();
          } else {
            setRestartPending(false);
            setMenuOpen(true);
          }
        }}
      >
        <MoreHorizontal size={14} strokeWidth={2.4} aria-hidden="true" />
      </button>
      {menuOpen ? (
        <div
          id={menuId}
          className="studio-heat-batch-progress-menu"
          role="menu"
          aria-label={copy.menuAria}
        >
          <button
            type="button"
            role="menuitem"
            className={restartPending ? 'studio-heat-batch-progress-restart-pending' : undefined}
            data-heat-capacity-batch-restart={restartPending ? 'confirm' : 'request'}
            onClick={handleRestart}
          >
            <RotateCcw size={13} strokeWidth={2.4} aria-hidden="true" />
            <span>{restartPending ? copy.confirmRestart : copy.restart}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
};
