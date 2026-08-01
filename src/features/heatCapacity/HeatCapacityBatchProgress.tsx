import { MoreHorizontal, Plus, RotateCcw, Trash2 } from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import type { WorkbenchLanguagePreference } from '../workbench/workbenchGeneralSettings.ts';
import './HeatCapacityBatchProgress.css';

export interface HeatCapacityBatchProgressProps {
  currentExperiment: number;
  targetExperimentCount: number | null;
  groupStatus: 'draft' | 'collecting' | 'awaiting-calculation' | 'completed';
  onRestartExperiment: () => void;
  onRestartGroup: () => void;
  onAbandonDraft: () => void;
  onStartNextGroup: () => void;
  language: WorkbenchLanguagePreference;
  actionsDisabled?: boolean;
}

const COPY = {
  'zh-CN': {
    progress: (current: number, target: number) => `第 ${current} / ${target} 次实验`,
    menuAria: '本组实验操作',
    restartExperiment: (current: number) => `重新开始第 ${current} 次实验`,
    restartGroup: '重新开始本组实验',
    abandon: '放弃本组草稿',
    next: '开始下一组实验',
  },
  'zh-TW': {
    progress: (current: number, target: number) => `第 ${current} / ${target} 次實驗`,
    menuAria: '本組實驗操作',
    restartExperiment: (current: number) => `重新開始第 ${current} 次實驗`,
    restartGroup: '重新開始本組實驗',
    abandon: '放棄本組草稿',
    next: '開始下一組實驗',
  },
  en: {
    progress: (current: number, target: number) => `Experiment ${current} / ${target}`,
    menuAria: 'Experiment group actions',
    restartExperiment: (current: number) => `Restart experiment ${current}`,
    restartGroup: 'Restart experiment group',
    abandon: 'Abandon group draft',
    next: 'Start next group',
  },
} as const;

const isConfiguredTarget = (targetExperimentCount: number | null): targetExperimentCount is number => (
  targetExperimentCount !== null
  && Number.isInteger(targetExperimentCount)
  && targetExperimentCount >= 3
  && targetExperimentCount <= 7
);

export const HeatCapacityBatchProgress = ({
  currentExperiment,
  targetExperimentCount,
  groupStatus,
  onRestartExperiment,
  onRestartGroup,
  onAbandonDraft,
  onStartNextGroup,
  language,
  actionsDisabled = false,
}: HeatCapacityBatchProgressProps) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = `${useId()}-menu`;
  const copy = COPY[language] ?? COPY['zh-CN'];

  const closeMenu = (restoreFocus = false) => {
    setMenuOpen(false);
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
    if (!actionsDisabled) return;
    closeMenu();
  }, [actionsDisabled]);

  if (!isConfiguredTarget(targetExperimentCount)) return null;

  const safeCurrentExperiment = Math.min(
    targetExperimentCount,
    Math.max(1, Number.isFinite(currentExperiment) ? Math.floor(currentExperiment) : 1),
  );
  return (
    <div
      className="studio-heat-batch-progress"
      data-heat-capacity-batch-progress="true"
      ref={rootRef}
    >
      <span className="studio-heat-batch-progress-label">
        {copy.progress(safeCurrentExperiment, targetExperimentCount)}
      </span>
      {groupStatus === 'completed' ? (
        <button
          type="button"
          className="studio-heat-batch-progress-next"
          data-heat-capacity-next-experiment-group="true"
          disabled={actionsDisabled}
          onClick={onStartNextGroup}
        >
          <Plus size={13} strokeWidth={2.4} aria-hidden="true" />
          <span>{copy.next}</span>
        </button>
      ) : (
      <button
        type="button"
        className="studio-heat-batch-progress-trigger"
        aria-label={copy.menuAria}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls={menuOpen ? menuId : undefined}
        disabled={actionsDisabled || groupStatus === 'awaiting-calculation'}
        ref={triggerRef}
        onClick={() => {
          if (menuOpen) {
            closeMenu();
          } else {
            setMenuOpen(true);
          }
        }}
      >
        <MoreHorizontal size={14} strokeWidth={2.4} aria-hidden="true" />
      </button>
      )}
      {menuOpen && (groupStatus === 'draft' || groupStatus === 'collecting') ? (
        <div
          id={menuId}
          className="studio-heat-batch-progress-menu"
          role="menu"
          aria-label={copy.menuAria}
        >
          {groupStatus === 'draft' ? (
            <button
              type="button"
              role="menuitem"
              data-heat-capacity-group-action="abandon"
              onClick={() => {
                closeMenu();
                onAbandonDraft();
              }}
            >
              <Trash2 size={13} strokeWidth={2.4} aria-hidden="true" />
              <span>{copy.abandon}</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                role="menuitem"
                data-heat-capacity-group-action="restart-experiment"
                onClick={() => {
                  closeMenu();
                  onRestartExperiment();
                }}
              >
                <RotateCcw size={13} strokeWidth={2.4} aria-hidden="true" />
                <span>{copy.restartExperiment(safeCurrentExperiment)}</span>
              </button>
              <div
                className="studio-heat-batch-progress-menu-separator"
                role="separator"
              />
              <button
                type="button"
                role="menuitem"
                className="studio-heat-batch-progress-danger"
                data-heat-capacity-group-action="restart-group"
                onClick={() => {
                  closeMenu();
                  onRestartGroup();
                }}
              >
                <RotateCcw size={13} strokeWidth={2.4} aria-hidden="true" />
                <span>{copy.restartGroup}</span>
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
};
