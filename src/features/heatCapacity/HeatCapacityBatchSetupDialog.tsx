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
import { PromptDialogShell } from '../../components/prompts/PromptDialogShell.tsx';
import './HeatCapacityBatchSetupDialog.css';

export const HEAT_CAPACITY_BATCH_GROUP_COUNT_OPTIONS = [3, 4, 5, 6, 7] as const;

export type HeatCapacityBatchGroupCount = (typeof HEAT_CAPACITY_BATCH_GROUP_COUNT_OPTIONS)[number];

export interface HeatCapacityBatchSetupDialogProps {
  open: boolean;
  language: WorkbenchLanguagePreference;
  purpose?: 'first' | 'next';
  scheme: 'real' | 'ideal';
  selectedCount: HeatCapacityBatchGroupCount | null;
  onSelectedCountChange: (count: HeatCapacityBatchGroupCount) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

const COPY = {
  'zh-CN': {
    title: (purpose: 'first' | 'next') => purpose === 'next' ? '开始下一组实验' : '开始第一组实验',
    subtitle: '自由模式',
    schemeTitle: (purpose: 'first' | 'next') => purpose === 'next' ? '下一组方案' : '本组方案',
    real: '真实模拟',
    ideal: '理想参数',
    sectionTitle: '本组实验次数',
    description: (purpose: 'first' | 'next') => purpose === 'next'
      ? '当前实验组将保留为只读记录。确认后会创建新的实验组，数据、计算、过程回顾和图像将切换到暂无数据的新组。'
      : '请选择本组计划完成的实验次数。真实实验组在全部实验完成后进入计算，理想实验组会自动给出结果。',
    placeholder: '请选择实验次数',
    placeholderHint: '可选择 3 至 7 次',
    optionLabel: (count: HeatCapacityBatchGroupCount) => `${count} 次`,
    optionHint: (count: HeatCapacityBatchGroupCount) => `本组完成 ${count} 次实验`,
    selectedHint: (count: HeatCapacityBatchGroupCount) => `本组需完成 ${count} 次实验`,
    confirm: (purpose: 'first' | 'next') => purpose === 'next' ? '创建下一组' : '创建第一组',
    dialogAria: '设置自由模式实验次数',
    selectAria: '选择本组实验次数',
  },
  'zh-TW': {
    title: (purpose: 'first' | 'next') => purpose === 'next' ? '開始下一組實驗' : '開始第一組實驗',
    subtitle: '自由模式',
    schemeTitle: (purpose: 'first' | 'next') => purpose === 'next' ? '下一組方案' : '本組方案',
    real: '真實模擬',
    ideal: '理想參數',
    sectionTitle: '本組實驗次數',
    description: (purpose: 'first' | 'next') => purpose === 'next'
      ? '目前實驗組將保留為唯讀記錄。確認後會建立新的實驗組，資料、計算、過程回顧和圖像將切換到暫無資料的新組。'
      : '請選擇本組計劃完成的實驗次數。真實實驗組完成後進入計算，理想實驗組會自動給出結果。',
    placeholder: '請選擇實驗次數',
    placeholderHint: '可選擇 3 至 7 次',
    optionLabel: (count: HeatCapacityBatchGroupCount) => `${count} 次`,
    optionHint: (count: HeatCapacityBatchGroupCount) => `本組完成 ${count} 次實驗`,
    selectedHint: (count: HeatCapacityBatchGroupCount) => `本組需完成 ${count} 次實驗`,
    confirm: (purpose: 'first' | 'next') => purpose === 'next' ? '建立下一組' : '建立第一組',
    dialogAria: '設定自由模式實驗次數',
    selectAria: '選擇本組實驗次數',
  },
  en: {
    title: (purpose: 'first' | 'next') => purpose === 'next' ? 'Start next experiment group' : 'Start first experiment group',
    subtitle: 'Free mode',
    schemeTitle: (purpose: 'first' | 'next') => purpose === 'next' ? 'Next group scheme' : 'Group scheme',
    real: 'Real simulation',
    ideal: 'Ideal parameters',
    sectionTitle: 'Experiments in this group',
    description: (purpose: 'first' | 'next') => purpose === 'next'
      ? 'The completed group remains read-only. Confirming creates a new group and switches data, calculations, process review, and figures to its empty state.'
      : 'Choose how many experiments to complete in this group. Real groups continue to calculation; ideal groups produce results automatically.',
    placeholder: 'Select experiment count',
    placeholderHint: 'Choose from 3 to 7 experiments',
    optionLabel: (count: HeatCapacityBatchGroupCount) => `${count} experiments`,
    optionHint: (count: HeatCapacityBatchGroupCount) => `Complete ${count} experiments in this group`,
    selectedHint: (count: HeatCapacityBatchGroupCount) => `${count} experiments required in this group`,
    confirm: (purpose: 'first' | 'next') => purpose === 'next' ? 'Create next group' : 'Create first group',
    dialogAria: 'Set the free-mode experiment count',
    selectAria: 'Select the number of experiments in this group',
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
  purpose = 'first',
  scheme,
  selectedCount,
  onSelectedCountChange,
  onCancel,
  onConfirm,
}: HeatCapacityBatchSetupDialogProps) => {
  const copy = COPY[language] ?? COPY['zh-CN'];
  const generatedId = useId();
  const titleId = `${generatedId}-title`;
  const descriptionId = `${generatedId}-description`;
  const listboxId = `${generatedId}-listbox`;
  const selectRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(() => getOptionIndex(selectedCount));

  useEffect(() => {
    if (!open) {
      setMenuOpen(false);
      return;
    }

    setHighlightedIndex(getOptionIndex(selectedCount));
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
      if (menuOpen) {
        closeMenu(true);
      } else {
        onCancel();
      }
      return;
    }

    if (event.key !== 'Tab') return;
    if (menuOpen) setMenuOpen(false);

    const focusableElements = selectedCount === null
      ? [triggerRef.current, cancelRef.current]
      : [triggerRef.current, cancelRef.current, confirmRef.current];
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
    <PromptDialogShell
      title={copy.title(purpose)}
      titleId={titleId}
      subtitle={copy.subtitle}
      variant="task"
      role="dialog"
      ariaDescribedBy={descriptionId}
      dismiss={{ closeButton: false, escape: false, backdrop: false }}
      onRequestClose={onCancel}
      onBackdropMouseDown={handleOverlayMouseDown}
      onDialogKeyDown={handleDialogKeyDown}
      initialFocusRef={triggerRef}
      overlayClassName="studio-settings-overlay studio-heat-batch-setup-overlay"
      dialogClassName="studio-settings-window studio-heat-batch-setup-window"
      headerClassName="studio-settings-header studio-heat-batch-setup-header"
      overlayData={{ 'data-heat-capacity-batch-setup': 'true' }}
    >
        <div className="studio-settings-body studio-heat-batch-setup-body">
          <div className="studio-heat-batch-setup-summary" data-heat-capacity-batch-setup-scheme="true">
            <span>{copy.schemeTitle(purpose)}</span>
            <strong>{scheme === 'ideal' ? copy.ideal : copy.real}</strong>
          </div>
          <section className="studio-settings-section studio-settings-control-row studio-heat-batch-setup-section">
            <div className="studio-settings-section-title">
              <strong>{copy.sectionTitle}</strong>
              <span id={descriptionId}>{copy.description(purpose)}</span>
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
            ref={cancelRef}
            type="button"
            className="studio-heat-batch-setup-cancel"
            data-heat-capacity-batch-setup-cancel="true"
            onClick={onCancel}
          >
            {language === 'en' ? 'Cancel' : language === 'zh-TW' ? '取消' : '取消'}
          </button>
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
            {copy.confirm(purpose)}
          </button>
        </footer>
    </PromptDialogShell>
  );
};

export default HeatCapacityBatchSetupDialog;
