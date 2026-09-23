import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import {
  ExperimentCountSelector,
  parseExperimentCountDraft,
} from '../../components/experiments/ExperimentCountSelector.tsx';
import { PromptDialogShell } from '../../components/prompts/PromptDialogShell.tsx';
import type { WorkbenchLanguagePreference } from '../workbench/workbenchGeneralSettings.ts';
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
      : '请选择本组计划完成的实验次数。真实实验组和理想实验组在全部实验完成后都会进入手动计算；理想实验组不参与评分。',
    inputAria: '输入本组实验次数',
    menuAria: '选择本组实验次数',
    menuButtonAria: '展开实验次数菜单',
    placeholder: '请选择实验次数',
    emptyHint: '可选择 3 至 7 次',
    invalid: '请输入 3 至 7 的整数。',
    selected: (count: number) => `本组需完成 ${count} 次实验。`,
    option: (count: number) => `${count} 次`,
    optionHint: (count: number) => `本组完成 ${count} 次实验`,
    confirm: (purpose: 'first' | 'next') => purpose === 'next' ? '创建下一组' : '创建第一组',
    cancel: '取消',
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
      : '請選擇本組計劃完成的實驗次數。真實實驗組和理想實驗組完成後都會進入手動計算；理想實驗組不參與評分。',
    inputAria: '輸入本組實驗次數',
    menuAria: '選擇本組實驗次數',
    menuButtonAria: '展開實驗次數選單',
    placeholder: '請選擇實驗次數',
    emptyHint: '可選擇 3 至 7 次',
    invalid: '請輸入 3 至 7 的整數。',
    selected: (count: number) => `本組需完成 ${count} 次實驗。`,
    option: (count: number) => `${count} 次`,
    optionHint: (count: number) => `本組完成 ${count} 次實驗`,
    confirm: (purpose: 'first' | 'next') => purpose === 'next' ? '建立下一組' : '建立第一組',
    cancel: '取消',
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
      : 'Choose how many experiments to complete in this group. Both Real and Ideal groups continue to manual calculation; Ideal groups are not scored.',
    inputAria: 'Enter the experiment count for this group',
    menuAria: 'Select the experiment count for this group',
    menuButtonAria: 'Open the experiment count menu',
    placeholder: 'Select experiment count',
    emptyHint: 'Choose from 3 to 7 experiments',
    invalid: 'Enter an integer from 3 to 7.',
    selected: (count: number) => `${count} experiments required in this group.`,
    option: (count: number) => `${count} experiments`,
    optionHint: (count: number) => `Complete ${count} experiments in this group`,
    confirm: (purpose: 'first' | 'next') => purpose === 'next' ? 'Create next group' : 'Create first group',
    cancel: 'Cancel',
  },
} as const;

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
  const descriptionId = `${generatedId}-description`;
  const countInputRef = useRef<HTMLInputElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const [countDraft, setCountDraft] = useState('');
  const countOptions = scheme === 'real' ? [3] as const : HEAT_CAPACITY_BATCH_GROUP_COUNT_OPTIONS;
  const [countMenuOpen, setCountMenuOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setCountMenuOpen(false);
      return;
    }
    setCountDraft(scheme === 'real' ? '3' : selectedCount === null ? '' : String(selectedCount));
    if (scheme === 'real') onSelectedCountChange(3);
  }, [open]);

  const resolvedCount = parseExperimentCountDraft(
    countDraft,
    countOptions,
  ) as HeatCapacityBatchGroupCount | null;

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (!countMenuOpen) onCancel();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusableElements = resolvedCount === null
      ? [countInputRef.current, cancelRef.current]
      : [countInputRef.current, cancelRef.current, confirmRef.current];
    const availableElements = focusableElements.filter(
      (element): element is HTMLInputElement | HTMLButtonElement => (
        element !== null && !element.disabled
      ),
    );
    const first = availableElements[0];
    const last = availableElements.at(-1);
    if (!first || !last) return;
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
  };

  if (!open) return null;

  return (
    <PromptDialogShell
      title={copy.title(purpose)}
      subtitle={copy.subtitle}
      variant="task"
      role="dialog"
      ariaDescribedBy={descriptionId}
      dismiss={{ closeButton: false, escape: false, backdrop: false }}
      onRequestClose={onCancel}
      onBackdropMouseDown={handleOverlayMouseDown}
      onDialogKeyDown={handleDialogKeyDown}
      initialFocusRef={countInputRef}
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
            <span id={descriptionId}>{scheme === 'real' ? (language === 'en' ? 'Repeat three experiments under the same conditions.' : '在相同条件下完成三次重复实验。') : copy.description(purpose)}</span>
          </div>
          <div className="studio-settings-control-surface">
            <ExperimentCountSelector
              ref={countInputRef}
              options={countOptions}
              draft={countDraft}
              onDraftChange={setCountDraft}
              onValidValueChange={(count) => {
                onSelectedCountChange(count as HeatCapacityBatchGroupCount);
              }}
              onMenuOpenChange={setCountMenuOpen}
              dataOwner="heat-capacity"
              copy={{
                inputAria: copy.inputAria,
                menuAria: copy.menuAria,
                menuButtonAria: copy.menuButtonAria,
                placeholder: copy.placeholder,
                emptyHint: scheme === 'real' ? copy.selected(3) : copy.emptyHint,
                unit: language === 'en' ? 'experiments' : '次',
                invalid: scheme === 'real' ? copy.selected(3) : copy.invalid,
                selected: copy.selected,
                option: copy.option,
                optionHint: copy.optionHint,
              }}
            />
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
          {copy.cancel}
        </button>
        <button
          ref={confirmRef}
          type="button"
          className="studio-heat-batch-setup-confirm"
          data-heat-capacity-batch-setup-confirm="true"
          disabled={resolvedCount === null}
          onClick={() => {
            if (resolvedCount !== null) onConfirm();
          }}
        >
          {copy.confirm(purpose)}
        </button>
      </footer>
    </PromptDialogShell>
  );
};

export default HeatCapacityBatchSetupDialog;
