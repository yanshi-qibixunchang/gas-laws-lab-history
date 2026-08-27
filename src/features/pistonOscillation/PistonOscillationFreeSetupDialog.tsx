import { ChevronDown } from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { PromptDialogShell } from '../../components/prompts/PromptDialogShell.tsx';
import {
  PISTON_OSCILLATION_FREE_BASELINE_TARGET_HEIGHTS_MM,
  PISTON_OSCILLATION_FREE_TARGET_HEIGHTS_MM,
  isValidPistonOscillationFreeExperimentPlan,
} from '../../domain/pistonOscillation/pistonOscillationFreeWorkflowModel.ts';
import type { WorkbenchLanguagePreference } from '../workbench/workbenchGeneralSettings.ts';
import './PistonOscillationFreeSetupDialog.css';

export const PISTON_OSCILLATION_FREE_COUNT_OPTIONS = [3, 4, 5, 6] as const;

export type PistonOscillationFreeMeasurementCount =
  (typeof PISTON_OSCILLATION_FREE_COUNT_OPTIONS)[number];

export interface PistonOscillationFreeSetupDialogProps {
  open: boolean;
  language: WorkbenchLanguagePreference;
  initialTargetHeightsMm?: readonly number[];
  onCancel: () => void;
  onConfirm: (targetHeightsMm: readonly number[]) => void;
}

const COPY = {
  'zh-CN': {
    title: '设置自由模式实验计划',
    subtitle: '活塞振动法 · 自由模式',
    description: '先确定本组实验次数，再从六个正式高度中选择相同数量的测量点。确认后，系统只记录操作和实验结果，不提示步骤对错。',
    countTitle: '第一步：选择实验次数',
    countHint: '可直接输入，也可展开菜单选择 3 至 6 次。',
    countInputAria: '输入自由模式实验次数',
    countMenuAria: '选择自由模式实验次数',
    countMenuButtonAria: '展开实验次数菜单',
    countOption: (count: number) => `${count} 次`,
    countOptionHint: (count: number) => `选择 ${count} 个不同高度`,
    invalidCount: '请输入 3 至 6 的整数。',
    selectedCount: (count: number) => `本组计划完成 ${count} 次实验。`,
    heightTitle: '第二步：选择测量高度',
    heightHint: '点击高度按钮进行框选；选中数量必须与实验次数一致。',
    heightGroupAria: '选择自由模式测量高度',
    selectionCount: (selected: number, target: number | null) => target === null
      ? `已选择 ${selected} 个`
      : `已选择 ${selected} / ${target} 个`,
    selectCountFirst: '请先输入或选择实验次数。',
    needMoreHeights: (count: number) => `还需选择 ${count} 个高度。`,
    removeHeights: (count: number) => `请取消 ${count} 个高度。`,
    selectionReady: '实验次数与测量高度已经匹配。',
    heightAria: (height: number, selected: boolean) => `${height} mm，${selected ? '已选中' : '未选中'}`,
    cancel: '取消',
    confirm: '进入自由模式',
  },
  'zh-TW': {
    title: '設定自由模式實驗計畫',
    subtitle: '活塞振動法 · 自由模式',
    description: '先確定本組實驗次數，再從六個正式高度中選擇相同數量的測量點。確認後，系統只記錄操作和實驗結果，不提示步驟對錯。',
    countTitle: '第一步：選擇實驗次數',
    countHint: '可直接輸入，也可展開選單選擇 3 至 6 次。',
    countInputAria: '輸入自由模式實驗次數',
    countMenuAria: '選擇自由模式實驗次數',
    countMenuButtonAria: '展開實驗次數選單',
    countOption: (count: number) => `${count} 次`,
    countOptionHint: (count: number) => `選擇 ${count} 個不同高度`,
    invalidCount: '請輸入 3 至 6 的整數。',
    selectedCount: (count: number) => `本組計畫完成 ${count} 次實驗。`,
    heightTitle: '第二步：選擇測量高度',
    heightHint: '點擊高度按鈕進行框選；選中數量必須與實驗次數一致。',
    heightGroupAria: '選擇自由模式測量高度',
    selectionCount: (selected: number, target: number | null) => target === null
      ? `已選擇 ${selected} 個`
      : `已選擇 ${selected} / ${target} 個`,
    selectCountFirst: '請先輸入或選擇實驗次數。',
    needMoreHeights: (count: number) => `還需選擇 ${count} 個高度。`,
    removeHeights: (count: number) => `請取消 ${count} 個高度。`,
    selectionReady: '實驗次數與測量高度已經匹配。',
    heightAria: (height: number, selected: boolean) => `${height} mm，${selected ? '已選中' : '未選中'}`,
    cancel: '取消',
    confirm: '進入自由模式',
  },
  en: {
    title: 'Set the Free-mode experiment plan',
    subtitle: 'Piston oscillation · Free mode',
    description: 'Choose the number of experiments, then select the same number of formal measurement heights. After confirmation, the system records operations and outcomes without judging each step.',
    countTitle: 'Step 1: Choose the experiment count',
    countHint: 'Enter a value directly or choose 3 to 6 from the menu.',
    countInputAria: 'Enter the Free-mode experiment count',
    countMenuAria: 'Choose the Free-mode experiment count',
    countMenuButtonAria: 'Open the experiment-count menu',
    countOption: (count: number) => `${count} experiments`,
    countOptionHint: (count: number) => `Select ${count} different heights`,
    invalidCount: 'Enter a whole number from 3 to 6.',
    selectedCount: (count: number) => `${count} experiments planned for this group.`,
    heightTitle: 'Step 2: Choose measurement heights',
    heightHint: 'Select height buttons; the selected total must match the experiment count.',
    heightGroupAria: 'Choose Free-mode measurement heights',
    selectionCount: (selected: number, target: number | null) => target === null
      ? `${selected} selected`
      : `${selected} / ${target} selected`,
    selectCountFirst: 'Enter or choose the experiment count first.',
    needMoreHeights: (count: number) => `Select ${count} more ${count === 1 ? 'height' : 'heights'}.`,
    removeHeights: (count: number) => `Deselect ${count} ${count === 1 ? 'height' : 'heights'}.`,
    selectionReady: 'The experiment count and selected heights match.',
    heightAria: (height: number, selected: boolean) => `${height} mm, ${selected ? 'selected' : 'not selected'}`,
    cancel: 'Cancel',
    confirm: 'Enter Free mode',
  },
} as const;

const normalizeInitialTargetHeights = (value: readonly number[] | undefined) => (
  value && isValidPistonOscillationFreeExperimentPlan(value)
    ? [...value]
    : [...PISTON_OSCILLATION_FREE_BASELINE_TARGET_HEIGHTS_MM]
);

const parseMeasurementCount = (draft: string): PistonOscillationFreeMeasurementCount | null => {
  if (!/^[3-6]$/.test(draft.trim())) return null;
  return Number(draft) as PistonOscillationFreeMeasurementCount;
};

const getOptionIndex = (count: PistonOscillationFreeMeasurementCount | null) => (
  count === null ? 0 : PISTON_OSCILLATION_FREE_COUNT_OPTIONS.indexOf(count)
);

export const PistonOscillationFreeSetupDialog = ({
  open,
  language,
  initialTargetHeightsMm,
  onCancel,
  onConfirm,
}: PistonOscillationFreeSetupDialogProps) => {
  const copy = COPY[language] ?? COPY['zh-CN'];
  const generatedId = useId();
  const descriptionId = `${generatedId}-description`;
  const countHintId = `${generatedId}-count-hint`;
  const countListboxId = `${generatedId}-count-listbox`;
  const heightHintId = `${generatedId}-height-hint`;
  const countControlRef = useRef<HTMLDivElement | null>(null);
  const countInputRef = useRef<HTMLInputElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const [countDraft, setCountDraft] = useState('3');
  const [selectedHeightsMm, setSelectedHeightsMm] = useState<number[]>(
    () => normalizeInitialTargetHeights(initialTargetHeightsMm),
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setMenuOpen(false);
      return;
    }
    const nextHeights = normalizeInitialTargetHeights(initialTargetHeightsMm);
    const nextCount = nextHeights.length as PistonOscillationFreeMeasurementCount;
    setCountDraft(String(nextCount));
    setSelectedHeightsMm(nextHeights);
    setHighlightedIndex(getOptionIndex(nextCount));
    setMenuOpen(false);
  }, [initialTargetHeightsMm, open]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !countControlRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [menuOpen]);

  const selectedCount = parseMeasurementCount(countDraft);
  const selectionDelta = selectedCount === null
    ? null
    : selectedCount - selectedHeightsMm.length;
  const selectionComplete = selectedCount !== null
    && selectionDelta === 0
    && isValidPistonOscillationFreeExperimentPlan(selectedHeightsMm);

  const selectCount = (count: PistonOscillationFreeMeasurementCount) => {
    setCountDraft(String(count));
    setHighlightedIndex(getOptionIndex(count));
    setMenuOpen(false);
    window.requestAnimationFrame(() => countInputRef.current?.focus());
  };

  const moveHighlight = (direction: 1 | -1) => {
    setHighlightedIndex((current) => (
      (current + direction + PISTON_OSCILLATION_FREE_COUNT_OPTIONS.length)
      % PISTON_OSCILLATION_FREE_COUNT_OPTIONS.length
    ));
  };

  const handleCountInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setCountDraft(event.target.value.replace(/[^0-9]/g, ''));
  };

  const handleCountInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!menuOpen) {
        const currentCount = parseMeasurementCount(countDraft);
        setHighlightedIndex(event.key === 'ArrowUp' && currentCount === null
          ? PISTON_OSCILLATION_FREE_COUNT_OPTIONS.length - 1
          : getOptionIndex(currentCount));
        setMenuOpen(true);
      } else {
        moveHighlight(event.key === 'ArrowDown' ? 1 : -1);
      }
      return;
    }
    if (event.key === 'Enter' && menuOpen) {
      event.preventDefault();
      selectCount(PISTON_OSCILLATION_FREE_COUNT_OPTIONS[highlightedIndex]);
      return;
    }
    if (event.key === 'Escape' && menuOpen) {
      event.preventDefault();
      event.stopPropagation();
      setMenuOpen(false);
    }
  };

  const toggleHeight = (heightMm: number) => {
    if (selectedCount === null) return;
    setSelectedHeightsMm((current) => {
      if (current.includes(heightMm)) {
        return current.filter((candidate) => candidate !== heightMm);
      }
      if (current.length >= selectedCount) return current;
      return PISTON_OSCILLATION_FREE_TARGET_HEIGHTS_MM.filter((candidate) => (
        candidate === heightMm || current.includes(candidate)
      ));
    });
  };

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    if (menuOpen) {
      setMenuOpen(false);
      window.requestAnimationFrame(() => menuButtonRef.current?.focus());
    } else {
      onCancel();
    }
  };

  const handleOverlayMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (menuOpen && event.target === event.currentTarget) setMenuOpen(false);
  };

  if (!open) return null;

  const selectionHint = selectedCount === null
    ? copy.selectCountFirst
    : selectionDelta === 0
      ? copy.selectionReady
      : selectionDelta! > 0
        ? copy.needMoreHeights(selectionDelta!)
        : copy.removeHeights(Math.abs(selectionDelta!));

  return (
    <PromptDialogShell
      title={copy.title}
      subtitle={copy.subtitle}
      variant="task"
      role="dialog"
      ariaDescribedBy={descriptionId}
      dismiss={{ closeButton: false, escape: false, backdrop: false }}
      onRequestClose={onCancel}
      onBackdropMouseDown={handleOverlayMouseDown}
      onDialogKeyDown={handleDialogKeyDown}
      initialFocusRef={countInputRef}
      overlayClassName="studio-settings-overlay studio-piston-free-setup-overlay"
      dialogClassName="studio-settings-window studio-piston-free-setup-window"
      headerClassName="studio-settings-header studio-piston-free-setup-header"
      overlayData={{ 'data-piston-oscillation-free-setup': 'true' }}
    >
      <div className="studio-settings-body studio-piston-free-setup-body">
        <p id={descriptionId} className="studio-piston-free-setup-description">
          {copy.description}
        </p>

        <section className="studio-piston-free-setup-section" aria-labelledby={`${generatedId}-count-title`}>
          <header>
            <div>
              <strong id={`${generatedId}-count-title`}>{copy.countTitle}</strong>
              <span id={countHintId}>{copy.countHint}</span>
            </div>
          </header>
          <div className="studio-piston-free-count-field">
            <div
              ref={countControlRef}
              className={`studio-piston-free-count-combobox ${menuOpen ? 'studio-piston-free-count-combobox-open' : ''}`}
            >
              <input
                ref={countInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={countDraft}
                role="combobox"
                aria-label={copy.countInputAria}
                aria-describedby={countHintId}
                aria-invalid={selectedCount === null}
                aria-haspopup="listbox"
                aria-expanded={menuOpen}
                aria-controls={menuOpen ? countListboxId : undefined}
                aria-activedescendant={menuOpen
                  ? `${countListboxId}-option-${PISTON_OSCILLATION_FREE_COUNT_OPTIONS[highlightedIndex]}`
                  : undefined}
                onChange={handleCountInputChange}
                onKeyDown={handleCountInputKeyDown}
                onFocus={(event) => event.currentTarget.select()}
              />
              <span aria-hidden="true">{language === 'en' ? 'experiments' : '次'}</span>
              <button
                ref={menuButtonRef}
                type="button"
                aria-label={copy.countMenuButtonAria}
                aria-haspopup="listbox"
                aria-expanded={menuOpen}
                aria-controls={menuOpen ? countListboxId : undefined}
                onClick={() => {
                  setHighlightedIndex(getOptionIndex(selectedCount));
                  setMenuOpen((current) => !current);
                }}
              >
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className={menuOpen ? 'studio-piston-free-count-chevron-open' : ''}
                />
              </button>

              {menuOpen ? (
                <div
                  id={countListboxId}
                  className="studio-settings-language-menu studio-piston-free-count-menu"
                  role="listbox"
                  aria-label={copy.countMenuAria}
                >
                  {PISTON_OSCILLATION_FREE_COUNT_OPTIONS.map((count, index) => {
                    const selected = selectedCount === count;
                    const highlighted = highlightedIndex === index;
                    return (
                      <button
                        id={`${countListboxId}-option-${count}`}
                        key={count}
                        type="button"
                        role="option"
                        tabIndex={-1}
                        aria-selected={selected}
                        className={`${selected ? 'studio-settings-language-active' : ''} ${
                          highlighted ? 'studio-piston-free-count-option-highlighted' : ''
                        }`}
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        onClick={() => selectCount(count)}
                      >
                        <strong>{copy.countOption(count)}</strong>
                        <span>{copy.countOptionHint(count)}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <small
              className={selectedCount === null ? 'studio-piston-free-setup-error' : ''}
              role={selectedCount === null ? 'alert' : undefined}
            >
              {selectedCount === null ? copy.invalidCount : copy.selectedCount(selectedCount)}
            </small>
          </div>
        </section>

        <section className="studio-piston-free-setup-section" aria-labelledby={`${generatedId}-height-title`}>
          <header>
            <div>
              <strong id={`${generatedId}-height-title`}>{copy.heightTitle}</strong>
              <span id={heightHintId}>{copy.heightHint}</span>
            </div>
            <em>{copy.selectionCount(selectedHeightsMm.length, selectedCount)}</em>
          </header>
          <div
            className="studio-piston-free-height-grid"
            role="group"
            aria-label={copy.heightGroupAria}
            aria-describedby={heightHintId}
          >
            {PISTON_OSCILLATION_FREE_TARGET_HEIGHTS_MM.map((heightMm) => {
              const selected = selectedHeightsMm.includes(heightMm);
              const selectionLimitReached = selectedCount !== null
                && selectedHeightsMm.length >= selectedCount;
              const disabled = selectedCount === null || (!selected && selectionLimitReached);
              return (
                <button
                  key={heightMm}
                  type="button"
                  aria-pressed={selected}
                  aria-label={copy.heightAria(heightMm, selected)}
                  disabled={disabled}
                  data-piston-free-height-mm={heightMm}
                  data-selected={selected ? 'true' : 'false'}
                  onClick={() => toggleHeight(heightMm)}
                >
                  <strong>{heightMm}</strong>
                  <span>mm</span>
                </button>
              );
            })}
          </div>
          <p
            className={`studio-piston-free-selection-hint ${
              selectionComplete ? 'studio-piston-free-selection-hint-ready' : ''
            }`}
            aria-live="polite"
          >
            {selectionHint}
          </p>
        </section>
      </div>

      <footer className="studio-piston-free-setup-actions">
        <button
          type="button"
          className="studio-piston-free-setup-cancel"
          data-piston-free-setup-cancel="true"
          onClick={onCancel}
        >
          {copy.cancel}
        </button>
        <button
          type="button"
          className="studio-piston-free-setup-confirm"
          data-piston-free-setup-confirm="true"
          disabled={!selectionComplete}
          onClick={() => {
            if (selectionComplete) onConfirm(selectedHeightsMm);
          }}
        >
          {copy.confirm}
        </button>
      </footer>
    </PromptDialogShell>
  );
};

export default PistonOscillationFreeSetupDialog;
