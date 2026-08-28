import { Plus } from 'lucide-react';
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
import {
  PISTON_OSCILLATION_FREE_TARGET_HEIGHTS_MM,
  isValidPistonOscillationFreeCustomHeightMm,
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
  initialCustomHeightCandidatesMm?: readonly number[];
  onCancel: () => void;
  onConfirm: (
    targetHeightsMm: readonly number[],
    customHeightCandidatesMm: readonly number[],
  ) => void;
}

const COPY = {
  'zh-CN': {
    title: '设置自由模式实验计划',
    subtitle: '活塞振动法 · 自由模式',
    description: '先确定本组实验次数，再从系统高度或自定义候选中选择相同数量的测量点。确认后，系统只记录操作和实验结果，不提示步骤对错。',
    countTitle: '第一步：选择实验次数',
    countHint: '可直接输入，也可展开菜单选择 3 至 6 次。',
    countInputAria: '输入自由模式实验次数',
    countMenuAria: '选择自由模式实验次数',
    countMenuButtonAria: '展开实验次数菜单',
    countPlaceholder: '请选择实验次数',
    countEmptyHint: '可选择 3 至 6 次',
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
    customTitle: '自定义高度',
    customHint: '可添加任意数量的 0 至 80 mm 整数候选；计划仍只能选择 3 至 6 个高度。',
    customInputAria: '输入自定义高度',
    customPlaceholder: '例如 65',
    addCustom: '添加',
    customEmpty: '还没有添加自定义高度。',
    customInvalid: '请输入 0 至 80 的整数。',
    customDuplicate: (height: number) => `${height} mm 已经在候选列表中。`,
    customAdded: (height: number) => `已添加 ${height} mm。`,
    nonRecommended: '非推荐',
    nonRecommendedHint: '低于 30 mm，不属于标准推荐区间，但仍可选择。',
    cancel: '取消',
    confirm: '进入自由模式',
  },
  'zh-TW': {
    title: '設定自由模式實驗計畫',
    subtitle: '活塞振動法 · 自由模式',
    description: '先確定本組實驗次數，再從系統高度或自訂候選中選擇相同數量的測量點。確認後，系統只記錄操作和實驗結果，不提示步驟對錯。',
    countTitle: '第一步：選擇實驗次數',
    countHint: '可直接輸入，也可展開選單選擇 3 至 6 次。',
    countInputAria: '輸入自由模式實驗次數',
    countMenuAria: '選擇自由模式實驗次數',
    countMenuButtonAria: '展開實驗次數選單',
    countPlaceholder: '請選擇實驗次數',
    countEmptyHint: '可選擇 3 至 6 次',
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
    customTitle: '自訂高度',
    customHint: '可加入任意數量的 0 至 80 mm 整數候選；計畫仍只能選擇 3 至 6 個高度。',
    customInputAria: '輸入自訂高度',
    customPlaceholder: '例如 65',
    addCustom: '加入',
    customEmpty: '尚未加入自訂高度。',
    customInvalid: '請輸入 0 至 80 的整數。',
    customDuplicate: (height: number) => `${height} mm 已經在候選清單中。`,
    customAdded: (height: number) => `已加入 ${height} mm。`,
    nonRecommended: '非推薦',
    nonRecommendedHint: '低於 30 mm，不屬於標準推薦區間，但仍可選擇。',
    cancel: '取消',
    confirm: '進入自由模式',
  },
  en: {
    title: 'Set the Free-mode experiment plan',
    subtitle: 'Piston oscillation · Free mode',
    description: 'Choose the number of experiments, then select the same number of system or custom height candidates. After confirmation, the system records operations and outcomes without judging each step.',
    countTitle: 'Step 1: Choose the experiment count',
    countHint: 'Enter a value directly or choose 3 to 6 from the menu.',
    countInputAria: 'Enter the Free-mode experiment count',
    countMenuAria: 'Choose the Free-mode experiment count',
    countMenuButtonAria: 'Open the experiment-count menu',
    countPlaceholder: 'Select experiment count',
    countEmptyHint: 'Choose from 3 to 6 experiments',
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
    customTitle: 'Custom heights',
    customHint: 'Add any number of whole-number candidates from 0 to 80 mm; the plan still uses only 3 to 6 heights.',
    customInputAria: 'Enter a custom height',
    customPlaceholder: 'For example, 65',
    addCustom: 'Add',
    customEmpty: 'No custom heights added yet.',
    customInvalid: 'Enter a whole number from 0 to 80.',
    customDuplicate: (height: number) => `${height} mm is already available.`,
    customAdded: (height: number) => `${height} mm added.`,
    nonRecommended: 'Not recommended',
    nonRecommendedHint: 'Below 30 mm and outside the standard recommended range, but still selectable.',
    cancel: 'Cancel',
    confirm: 'Enter Free mode',
  },
} as const;

const normalizeInitialTargetHeights = (value: readonly number[] | undefined) => (
  value && isValidPistonOscillationFreeExperimentPlan(value)
    ? [...value].sort((first, second) => second - first)
    : []
);

const normalizeInitialCustomHeights = (value: readonly number[] | undefined) => (
  [...new Set((value ?? []).filter((heightMm) => (
    isValidPistonOscillationFreeCustomHeightMm(heightMm)
    && !PISTON_OSCILLATION_FREE_TARGET_HEIGHTS_MM.includes(
      heightMm as (typeof PISTON_OSCILLATION_FREE_TARGET_HEIGHTS_MM)[number],
    )
  )))].sort((first, second) => second - first)
);

const parseMeasurementCount = (draft: string): PistonOscillationFreeMeasurementCount | null => {
  return parseExperimentCountDraft(
    draft,
    PISTON_OSCILLATION_FREE_COUNT_OPTIONS,
  ) as PistonOscillationFreeMeasurementCount | null;
};

export const PistonOscillationFreeSetupDialog = ({
  open,
  language,
  initialTargetHeightsMm,
  initialCustomHeightCandidatesMm,
  onCancel,
  onConfirm,
}: PistonOscillationFreeSetupDialogProps) => {
  const copy = COPY[language] ?? COPY['zh-CN'];
  const generatedId = useId();
  const descriptionId = `${generatedId}-description`;
  const countHintId = `${generatedId}-count-hint`;
  const heightHintId = `${generatedId}-height-hint`;
  const customHintId = `${generatedId}-custom-hint`;
  const countInputRef = useRef<HTMLInputElement | null>(null);
  const customInputRef = useRef<HTMLInputElement | null>(null);
  const [countDraft, setCountDraft] = useState('');
  const [selectedHeightsMm, setSelectedHeightsMm] = useState<number[]>(
    () => normalizeInitialTargetHeights(initialTargetHeightsMm),
  );
  const [customHeightCandidatesMm, setCustomHeightCandidatesMm] = useState<number[]>(
    () => normalizeInitialCustomHeights(initialCustomHeightCandidatesMm),
  );
  const [customHeightDraft, setCustomHeightDraft] = useState('');
  const [customHeightMessage, setCustomHeightMessage] = useState<{
    kind: 'error' | 'success' | 'note';
    text: string;
  } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setMenuOpen(false);
      return;
    }
    const nextHeights = normalizeInitialTargetHeights(initialTargetHeightsMm);
    const nextCustomHeights = normalizeInitialCustomHeights([
      ...(initialCustomHeightCandidatesMm ?? []),
      ...nextHeights,
    ]);
    const nextCount = nextHeights.length >= 3
      ? nextHeights.length as PistonOscillationFreeMeasurementCount
      : null;
    setCountDraft(nextCount === null ? '' : String(nextCount));
    setSelectedHeightsMm(nextHeights);
    setCustomHeightCandidatesMm(nextCustomHeights);
    setCustomHeightDraft('');
    setCustomHeightMessage(null);
    setMenuOpen(false);
  }, [initialCustomHeightCandidatesMm, initialTargetHeightsMm, open]);

  const selectedCount = parseMeasurementCount(countDraft);
  const selectionDelta = selectedCount === null
    ? null
    : selectedCount - selectedHeightsMm.length;
  const selectionComplete = selectedCount !== null
    && selectionDelta === 0
    && isValidPistonOscillationFreeExperimentPlan(selectedHeightsMm);

  const toggleHeight = (heightMm: number) => {
    if (selectedCount === null) return;
    setSelectedHeightsMm((current) => {
      if (current.includes(heightMm)) {
        return current.filter((candidate) => candidate !== heightMm);
      }
      if (current.length >= selectedCount) return current;
      return [...current, heightMm].sort((first, second) => second - first);
    });
  };

  const addCustomHeight = () => {
    const trimmedDraft = customHeightDraft.trim();
    if (!/^[0-9]+$/.test(trimmedDraft)) {
      setCustomHeightMessage({ kind: 'error', text: copy.customInvalid });
      return;
    }
    const heightMm = Number(trimmedDraft);
    if (!isValidPistonOscillationFreeCustomHeightMm(heightMm)) {
      setCustomHeightMessage({ kind: 'error', text: copy.customInvalid });
      return;
    }
    if (
      PISTON_OSCILLATION_FREE_TARGET_HEIGHTS_MM.includes(
        heightMm as (typeof PISTON_OSCILLATION_FREE_TARGET_HEIGHTS_MM)[number],
      )
      || customHeightCandidatesMm.includes(heightMm)
    ) {
      setCustomHeightMessage({ kind: 'note', text: copy.customDuplicate(heightMm) });
      setCustomHeightDraft('');
      return;
    }
    setCustomHeightCandidatesMm((current) => (
      [...current, heightMm].sort((first, second) => second - first)
    ));
    setCustomHeightDraft('');
    setCustomHeightMessage({ kind: 'success', text: copy.customAdded(heightMm) });
    window.requestAnimationFrame(() => customInputRef.current?.focus());
  };

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    if (menuOpen) {
      return;
    } else {
      onCancel();
    }
  };

  const handleOverlayMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
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
          <ExperimentCountSelector
            ref={countInputRef}
            options={PISTON_OSCILLATION_FREE_COUNT_OPTIONS}
            draft={countDraft}
            onDraftChange={setCountDraft}
            onValidValueEnter={() => {
              window.requestAnimationFrame(() => customInputRef.current?.focus());
            }}
            onMenuOpenChange={setMenuOpen}
            dataOwner="piston-oscillation"
            describedBy={countHintId}
            copy={{
              inputAria: copy.countInputAria,
              menuAria: copy.countMenuAria,
              menuButtonAria: copy.countMenuButtonAria,
              placeholder: copy.countPlaceholder,
              emptyHint: copy.countEmptyHint,
              unit: language === 'en' ? 'experiments' : '次',
              invalid: copy.invalidCount,
              selected: copy.selectedCount,
              option: copy.countOption,
              optionHint: copy.countOptionHint,
            }}
          />
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
              const selectionBlocked = selectedCount === null || (!selected && selectionLimitReached);
              return (
                <button
                  key={heightMm}
                  type="button"
                  aria-pressed={selected}
                  aria-disabled={selectionBlocked}
                  aria-label={copy.heightAria(heightMm, selected)}
                  data-piston-free-height-mm={heightMm}
                  data-selected={selected ? 'true' : 'false'}
                  data-selection-blocked={selectionBlocked ? 'true' : 'false'}
                  data-height-source="system"
                  onClick={() => {
                    if (!selectionBlocked) toggleHeight(heightMm);
                  }}
                >
                  <strong>{heightMm}</strong>
                  <span>mm</span>
                </button>
              );
            })}
          </div>

          <div className="studio-piston-free-custom-height" aria-labelledby={`${generatedId}-custom-title`}>
            <div className="studio-piston-free-custom-heading">
              <div>
                <strong id={`${generatedId}-custom-title`}>{copy.customTitle}</strong>
                <span id={customHintId}>{copy.customHint}</span>
              </div>
              <div className="studio-piston-free-custom-entry">
                <div>
                  <input
                    ref={customInputRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={customHeightDraft}
                    placeholder={copy.customPlaceholder}
                    aria-label={copy.customInputAria}
                    aria-describedby={customHintId}
                    aria-invalid={customHeightMessage?.kind === 'error'}
                    onChange={(event) => {
                      setCustomHeightDraft(event.target.value);
                      setCustomHeightMessage(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addCustomHeight();
                      }
                    }}
                  />
                  <span aria-hidden="true">mm</span>
                </div>
                <button type="button" onClick={addCustomHeight}>
                  <Plus size={14} aria-hidden="true" />
                  {copy.addCustom}
                </button>
              </div>
            </div>

            {customHeightCandidatesMm.length > 0 ? (
              <div
                className="studio-piston-free-height-grid studio-piston-free-custom-height-grid"
                role="group"
                aria-label={copy.customTitle}
              >
                {customHeightCandidatesMm.map((heightMm) => {
                  const selected = selectedHeightsMm.includes(heightMm);
                  const selectionLimitReached = selectedCount !== null
                    && selectedHeightsMm.length >= selectedCount;
                  const selectionBlocked = selectedCount === null
                    || (!selected && selectionLimitReached);
                  const nonRecommended = heightMm < 30;
                  return (
                    <button
                      key={heightMm}
                      type="button"
                      aria-pressed={selected}
                      aria-disabled={selectionBlocked}
                      aria-label={`${copy.heightAria(heightMm, selected)}${
                        nonRecommended ? `，${copy.nonRecommendedHint}` : ''
                      }`}
                      data-piston-free-height-mm={heightMm}
                      data-selected={selected ? 'true' : 'false'}
                      data-selection-blocked={selectionBlocked ? 'true' : 'false'}
                      data-height-source="custom"
                      data-non-recommended={nonRecommended ? 'true' : 'false'}
                      onClick={() => {
                        if (!selectionBlocked) toggleHeight(heightMm);
                      }}
                    >
                      <strong>{heightMm}</strong>
                      <span>mm</span>
                      {nonRecommended ? <em>{copy.nonRecommended}</em> : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="studio-piston-free-custom-empty">{copy.customEmpty}</p>
            )}

            <p
              className={`studio-piston-free-custom-message is-${customHeightMessage?.kind ?? 'empty'}`}
              role={customHeightMessage?.kind === 'error' ? 'alert' : 'status'}
              aria-live="polite"
            >
              {customHeightMessage?.text ?? '\u00a0'}
            </p>
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
            if (selectionComplete) {
              onConfirm(
                [...selectedHeightsMm].sort((first, second) => second - first),
                customHeightCandidatesMm,
              );
            }
          }}
        >
          {copy.confirm}
        </button>
      </footer>
    </PromptDialogShell>
  );
};

export default PistonOscillationFreeSetupDialog;
