import { ChevronDown } from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import type { WorkbenchLanguagePreference } from '../workbench/workbenchGeneralSettings.ts';
import './HeatCapacityBatchSetupDialog.css';

export const HEAT_CAPACITY_BATCH_GROUP_COUNT_OPTIONS = [3, 4, 5, 6, 7] as const;

export type HeatCapacityBatchGroupCount = (typeof HEAT_CAPACITY_BATCH_GROUP_COUNT_OPTIONS)[number];

export interface HeatCapacityBatchSetupDialogProps {
  open: boolean;
  language: WorkbenchLanguagePreference;
  selectedCount: HeatCapacityBatchGroupCount | null;
  onSelectedCountChange: (count: HeatCapacityBatchGroupCount) => void;
  onConfirm: () => void;
}

const COPY = {
  'zh-CN': {
    title: '设置实验组数',
    subtitle: '自由模式批次',
    sectionTitle: '计划测量组数',
    description: '请选择本轮计划完成的有效数据组数。全部组次完成后，将统一进入计算流程。',
    placeholder: '请选择实验组数',
    placeholderHint: '可选择 3 至 7 组',
    optionLabel: (count: HeatCapacityBatchGroupCount) => `${count}组`,
    optionHint: (count: HeatCapacityBatchGroupCount) => `完成 ${count} 组有效实验`,
    selectedHint: (count: HeatCapacityBatchGroupCount) => `本轮需完成 ${count} 组有效实验`,
    confirm: '开始本轮实验',
    dialogAria: '设置自由模式实验组数',
    selectAria: '选择本轮实验组数',
  },
  'zh-TW': {
    title: '設定實驗組數',
    subtitle: '自由模式批次',
    sectionTitle: '計劃量測組數',
    description: '請選擇本輪計劃完成的有效資料組數。全部組次完成後，將統一進入計算流程。',
    placeholder: '請選擇實驗組數',
    placeholderHint: '可選擇 3 至 7 組',
    optionLabel: (count: HeatCapacityBatchGroupCount) => `${count}組`,
    optionHint: (count: HeatCapacityBatchGroupCount) => `完成 ${count} 組有效實驗`,
    selectedHint: (count: HeatCapacityBatchGroupCount) => `本輪需完成 ${count} 組有效實驗`,
    confirm: '開始本輪實驗',
    dialogAria: '設定自由模式實驗組數',
    selectAria: '選擇本輪實驗組數',
  },
  en: {
    title: 'Set experiment groups',
    subtitle: 'Free-mode batch',
    sectionTitle: 'Planned measurement groups',
    description: 'Choose how many valid data groups to complete in this batch. Calculation begins after all groups are finished.',
    placeholder: 'Select experiment groups',
    placeholderHint: 'Choose from 3 to 7 groups',
    optionLabel: (count: HeatCapacityBatchGroupCount) => `${count} groups`,
    optionHint: (count: HeatCapacityBatchGroupCount) => `Complete ${count} valid experiment groups`,
    selectedHint: (count: HeatCapacityBatchGroupCount) => `${count} valid groups required for this batch`,
    confirm: 'Start experiment batch',
    dialogAria: 'Set the number of free-mode experiment groups',
    selectAria: 'Select the number of experiment groups',
  },
} as const;

const getOptionIndex = (count: HeatCapacityBatchGroupCount | null) => (
  count === null
    ? 0
    : Math.max(0, HEAT_CAPACITY_BATCH_GROUP_COUNT_OPTIONS.indexOf(count))
);

export const HeatCapacityBatchSetupDialog = ({
  open,
  language,
  selectedCount,
  onSelectedCountChange,
  onConfirm,
}: HeatCapacityBatchSetupDialogProps) => {
  const copy = COPY[language] ?? COPY['zh-CN'];
  const generatedId = useId();
  const titleId = `${generatedId}-title`;
  const descriptionId = `${generatedId}-description`;
  const listboxId = `${generatedId}-listbox`;
  const selectRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(() => getOptionIndex(selectedCount));

  useEffect(() => {
    if (!open) {
      setMenuOpen(false);
      return;
    }

    setHighlightedIndex(getOptionIndex(selectedCount));
    const frame = window.requestAnimationFrame(() => triggerRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !selectRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [menuOpen]);

  useEffect(() => {
    if (menuOpen) setHighlightedIndex(getOptionIndex(selectedCount));
  }, [menuOpen, selectedCount]);

  const closeMenu = (restoreFocus = false) => {
    setMenuOpen(false);
    if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const selectOption = (count: HeatCapacityBatchGroupCount) => {
    onSelectedCountChange(count);
    setHighlightedIndex(getOptionIndex(count));
    closeMenu(true);
  };

  const moveHighlight = (direction: 1 | -1) => {
    setHighlightedIndex((current) => (
      (current + direction + HEAT_CAPACITY_BATCH_GROUP_COUNT_OPTIONS.length)
      % HEAT_CAPACITY_BATCH_GROUP_COUNT_OPTIONS.length
    ));
  };

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!menuOpen) {
          setHighlightedIndex(getOptionIndex(selectedCount));
          setMenuOpen(true);
        } else {
          moveHighlight(1);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!menuOpen) {
          setHighlightedIndex(selectedCount === null
            ? HEAT_CAPACITY_BATCH_GROUP_COUNT_OPTIONS.length - 1
            : getOptionIndex(selectedCount));
          setMenuOpen(true);
        } else {
          moveHighlight(-1);
        }
        break;
      case 'Home':
        if (menuOpen) {
          event.preventDefault();
          setHighlightedIndex(0);
        }
        break;
      case 'End':
        if (menuOpen) {
          event.preventDefault();
          setHighlightedIndex(HEAT_CAPACITY_BATCH_GROUP_COUNT_OPTIONS.length - 1);
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (menuOpen) {
          selectOption(HEAT_CAPACITY_BATCH_GROUP_COUNT_OPTIONS[highlightedIndex]);
        } else {
          setHighlightedIndex(getOptionIndex(selectedCount));
          setMenuOpen(true);
        }
        break;
      case 'Escape':
        event.preventDefault();
        closeMenu(true);
        break;
      default:
        break;
    }
  };

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (menuOpen) closeMenu(true);
      return;
    }

    if (event.key !== 'Tab') return;
    if (menuOpen) setMenuOpen(false);

    const focusableElements = selectedCount === null
      ? [triggerRef.current]
      : [triggerRef.current, confirmRef.current];
    const availableElements = focusableElements.filter(
      (element): element is HTMLButtonElement => element !== null && !element.disabled,
    );
    if (availableElements.length === 0) return;

    const first = availableElements[0];
    const last = availableElements[availableElements.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleOverlayMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (menuOpen && event.target === event.currentTarget) setMenuOpen(false);
  };

  if (!open) return null;

  const activeLabel = selectedCount === null
    ? copy.placeholder
    : copy.optionLabel(selectedCount);
  const activeHint = selectedCount === null
    ? copy.placeholderHint
    : copy.selectedHint(selectedCount);
  const highlightedCount = HEAT_CAPACITY_BATCH_GROUP_COUNT_OPTIONS[highlightedIndex];

  return (
    <div
      className="studio-settings-overlay studio-heat-batch-setup-overlay"
      data-heat-capacity-batch-setup="true"
      role="presentation"
      onMouseDown={handleOverlayMouseDown}
    >
      <section
        className="studio-settings-window studio-heat-batch-setup-window"
        role="dialog"
        aria-modal="true"
        aria-label={copy.dialogAria}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={handleDialogKeyDown}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="studio-settings-header studio-heat-batch-setup-header">
          <div>
            <strong id={titleId}>{copy.title}</strong>
            <span>{copy.subtitle}</span>
          </div>
        </header>

        <div className="studio-settings-body studio-heat-batch-setup-body">
          <section className="studio-settings-section studio-settings-control-row studio-heat-batch-setup-section">
            <div className="studio-settings-section-title">
              <strong>{copy.sectionTitle}</strong>
              <span id={descriptionId}>{copy.description}</span>
            </div>
            <div className="studio-settings-control-surface">
              <div
                ref={selectRef}
                className={`studio-settings-language-select studio-heat-batch-setup-select ${
                  menuOpen ? 'studio-settings-language-select-open' : ''
                }`}
              >
                <button
                  ref={triggerRef}
                  type="button"
                  className="studio-settings-language-trigger studio-heat-batch-setup-trigger"
                  aria-label={copy.selectAria}
                  aria-haspopup="listbox"
                  aria-expanded={menuOpen}
                  aria-controls={menuOpen ? listboxId : undefined}
                  aria-activedescendant={menuOpen ? `${listboxId}-option-${highlightedCount}` : undefined}
                  onClick={() => {
                    setHighlightedIndex(getOptionIndex(selectedCount));
                    setMenuOpen((current) => !current);
                  }}
                  onKeyDown={handleTriggerKeyDown}
                >
                  <span>
                    <strong>{activeLabel}</strong>
                    <small>{activeHint}</small>
                  </span>
                  <ChevronDown
                    size={15}
                    aria-hidden="true"
                    className={`studio-settings-language-chevron ${
                      menuOpen ? 'studio-settings-language-chevron-open' : ''
                    }`}
                  />
                </button>

                {menuOpen ? (
                  <div
                    id={listboxId}
                    className="studio-settings-language-menu studio-heat-batch-setup-menu"
                    role="listbox"
                    aria-label={copy.selectAria}
                  >
                    {HEAT_CAPACITY_BATCH_GROUP_COUNT_OPTIONS.map((count, index) => {
                      const selected = selectedCount === count;
                      const highlighted = highlightedIndex === index;
                      return (
                        <button
                          id={`${listboxId}-option-${count}`}
                          key={count}
                          type="button"
                          role="option"
                          tabIndex={-1}
                          aria-selected={selected}
                          className={`${selected ? 'studio-settings-language-active' : ''} ${
                            highlighted ? 'studio-heat-batch-setup-option-highlighted' : ''
                          }`}
                          onMouseDown={(event) => event.preventDefault()}
                          onMouseEnter={() => setHighlightedIndex(index)}
                          onClick={() => selectOption(count)}
                        >
                          <strong>{copy.optionLabel(count)}</strong>
                          <span>{copy.optionHint(count)}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </div>

        <footer className="studio-heat-batch-setup-actions">
          <button
            ref={confirmRef}
            type="button"
            className="studio-heat-batch-setup-confirm"
            data-heat-capacity-batch-setup-confirm="true"
            disabled={selectedCount === null}
            onClick={() => {
              if (selectedCount !== null) onConfirm();
            }}
          >
            {copy.confirm}
          </button>
        </footer>
      </section>
    </div>
  );
};

export default HeatCapacityBatchSetupDialog;
