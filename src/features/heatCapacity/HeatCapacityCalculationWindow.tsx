import {
  useId,
  type CSSProperties,
} from 'react';
import { PromptDialogShell } from '../../components/prompts/PromptDialogShell.tsx';
import {
  getHeatCapacityCalculationWorkflowField,
  getHeatCapacityCalculationWorkflowVisibleSteps,
  type HeatCapacityCalculationStepKind,
  type HeatCapacityCalculationWorkflowField,
  type HeatCapacityCalculationWorkflowSession,
  type HeatCapacityCalculationWorkflowStep,
} from '../../domain/heatCapacity/heatCapacityCalculationWorkflowModel.ts';
import {
  formatHeatCapacityCalculationReference,
  HEAT_CAPACITY_CALCULATION_ANSWER_SPECS,
} from '../../domain/heatCapacity/heatCapacityCalculationValidation.ts';
import type { WorkbenchLanguagePreference } from '../workbench/workbenchGeneralSettings.ts';
import './HeatCapacityCalculationWindow.css';

export interface HeatCapacityCalculationWindowProps {
  open: boolean;
  language: WorkbenchLanguagePreference;
  session: HeatCapacityCalculationWorkflowSession | null;
  onDraftChange: (fieldId: string, draftRaw: string) => void;
  onSubmitStep: (stepId: string) => void;
  onContinueAnswer: (fieldId: string) => void;
  onRevealAnswer: (fieldId: string) => void;
  onSelectGroup: (groupIndex: number) => void;
  onSelectAggregate: () => void;
  onCompleteAndExit: () => void;
  onClose: () => void;
}

interface HeatCapacityKnownDatum {
  key: string;
  label: string;
  value: string;
}

const COPY = {
  'zh-CN': {
    title: '实验数据计算',
    subtitle: {
      guide: '引导模式 · 单次计算',
      free: '自由模式 · 本组计算',
      demo: '演示模式 · 系统计算',
    },
    close: '关闭计算窗口',
    tolerance:
      '判定说明：答案同时检查数值与规定精度；数值落在允许容差内即可判定正确，因此你的答案可能与参考答案略有差异。',
    knownGroup: (index: number) => `第 ${index + 1} 次实验数据与过程量`,
    knownAggregate: '本组统计量',
    knownGuide: '计算已知量',
    groupTab: (index: number) => `第 ${index + 1} 次实验`,
    aggregateTab: '汇总计算',
    futureGroup: '完成前一次实验计算后解锁',
    futureAggregate: '完成本组全部单次实验计算后解锁',
    reference: '参考答案：',
    correct: '正确',
    revealed: '已显示答案',
    systemValue: '系统值',
    empty: '尚未填写',
    invalid: '请输入有效数值',
    numericWrong: '数值不在容差内',
    precisionWrong: '数值正确，有效数字不符合要求',
    answerWrong: '数值或有效数字不正确',
    continueAnswer: '继续作答',
    revealAnswer: '查看并继续',
    confirm: '确认',
    closeButton: '关闭',
    completeAndExit: '完成并退出',
    precisionDecimal: (digits: number) => `保留小数点后 ${digits} 位`,
    precisionSignificant: (digits: number) => `保留 ${digits} 位有效数字`,
    stepTitle: {
      correctedVoltages: '计算电压差',
      absolutePressures: '计算绝对压强',
      groupGamma: '计算本次实验空气比热容比',
      guideRelativeError: '计算相对误差',
      meanGamma: '计算比热容比平均值',
      sampleStandardDeviation: '计算样本标准差',
      typeAStandardUncertainty: '计算 A 类标准不确定度',
      batchRelativeError: '计算本组相对误差',
    },
  },
  'zh-TW': {
    title: '實驗資料計算',
    subtitle: {
      guide: '引導模式 · 單次計算',
      free: '自由模式 · 本組計算',
      demo: '演示模式 · 系統計算',
    },
    close: '關閉計算視窗',
    tolerance:
      '判定說明：答案同時檢查數值與規定精度；數值落在允許容差內即可判定正確，因此你的答案可能與參考答案略有差異。',
    knownGroup: (index: number) => `第 ${index + 1} 次實驗資料與過程量`,
    knownAggregate: '本組統計量',
    knownGuide: '計算已知量',
    groupTab: (index: number) => `第 ${index + 1} 次實驗`,
    aggregateTab: '彙總計算',
    futureGroup: '完成前一次實驗計算後解鎖',
    futureAggregate: '完成本組全部單次實驗計算後解鎖',
    reference: '參考答案：',
    correct: '正確',
    revealed: '已顯示答案',
    systemValue: '系統值',
    empty: '尚未填寫',
    invalid: '請輸入有效數值',
    numericWrong: '數值不在容差內',
    precisionWrong: '數值正確，有效數字不符合要求',
    answerWrong: '數值或有效數字不正確',
    continueAnswer: '繼續作答',
    revealAnswer: '查看並繼續',
    confirm: '確認',
    closeButton: '關閉',
    completeAndExit: '完成並退出',
    precisionDecimal: (digits: number) => `保留小數點後 ${digits} 位`,
    precisionSignificant: (digits: number) => `保留 ${digits} 位有效數字`,
    stepTitle: {
      correctedVoltages: '計算電壓差',
      absolutePressures: '計算絕對壓強',
      groupGamma: '計算本次實驗空氣比熱容比',
      guideRelativeError: '計算相對誤差',
      meanGamma: '計算比熱容比平均值',
      sampleStandardDeviation: '計算樣本標準差',
      typeAStandardUncertainty: '計算 A 類標準不確定度',
      batchRelativeError: '計算本組相對誤差',
    },
  },
  en: {
    title: 'Experiment calculations',
    subtitle: {
      guide: 'Guided mode · Single experiment',
      free: 'Free mode · Group calculation',
      demo: 'Demo mode · System calculation',
    },
    close: 'Close calculation window',
    tolerance:
      'Answer check: both the numerical value and required precision are checked. Values within the stated tolerance are accepted, so your entry may differ slightly from the reference.',
    knownGroup: (index: number) => `Experiment ${index + 1} data and derived values`,
    knownAggregate: 'Group statistics',
    knownGuide: 'Known values',
    groupTab: (index: number) => `Experiment ${index + 1}`,
    aggregateTab: 'Summary',
    futureGroup: 'Complete the preceding experiment calculation to unlock',
    futureAggregate: 'Complete all experiment calculations in this group to unlock',
    reference: 'Reference: ',
    correct: 'Correct',
    revealed: 'Answer shown',
    systemValue: 'System value',
    empty: 'No answer entered',
    invalid: 'Enter a valid number',
    numericWrong: 'Value is outside the tolerance',
    precisionWrong: 'Value accepted; precision is incorrect',
    answerWrong: 'Value or precision is incorrect',
    continueAnswer: 'Try again',
    revealAnswer: 'Show & continue',
    confirm: 'Check',
    closeButton: 'Close',
    completeAndExit: 'Finish & exit',
    precisionDecimal: (digits: number) => `${digits} decimal place${digits === 1 ? '' : 's'}`,
    precisionSignificant: (digits: number) => `${digits} significant figures`,
    stepTitle: {
      correctedVoltages: 'Calculate corrected voltages',
      absolutePressures: 'Calculate absolute pressures',
      groupGamma: 'Calculate this experiment heat-capacity ratio',
      guideRelativeError: 'Calculate relative error',
      meanGamma: 'Calculate the mean heat-capacity ratio',
      sampleStandardDeviation: 'Calculate sample standard deviation',
      typeAStandardUncertainty: 'Calculate Type A standard uncertainty',
      batchRelativeError: 'Calculate group relative error',
    },
  },
} as const;

const formatFixed = (value: number, digits: number) => (
  Number.isFinite(value) ? value.toFixed(digits) : '—'
);

const formatSensitivity = (value: number) => (
  Number.isFinite(value) ? value.toPrecision(4) : '—'
);

const getPressureSensitivity = (
  reference: HeatCapacityCalculationWorkflowSession['groups'][number]['reference'],
) => {
  const p1Delta = reference.p1KPa - reference.p0KPa;
  if (Math.abs(p1Delta) > Number.EPSILON) return reference.u1PrimeMv / p1Delta;
  const p2Delta = reference.p2KPa - reference.p0KPa;
  if (Math.abs(p2Delta) > Number.EPSILON) return reference.u2PrimeMv / p2Delta;
  return Number.NaN;
};

const formatReference = (field: HeatCapacityCalculationWorkflowField) => (
  formatHeatCapacityCalculationReference(
    field.expectedValue,
    HEAT_CAPACITY_CALCULATION_ANSWER_SPECS[field.answerKind],
  )
);

const getResolvedValue = (
  field: HeatCapacityCalculationWorkflowField | null,
) => (
  field && field.answer.status !== 'unresolved'
    ? formatReference(field)
    : ''
);

const findFieldByEnding = (
  fields: readonly HeatCapacityCalculationWorkflowField[],
  ending: string,
) => fields.find((field) => field.id.endsWith(ending)) ?? null;

const buildGuideKnownData = (
  session: HeatCapacityCalculationWorkflowSession,
): HeatCapacityKnownDatum[] => {
  const group = session.groups[0];
  if (!group) return [];
  return [
    {
      key: 'u0',
      label: 'U₀（mV）',
      value: formatFixed(group.reference.u0Mv, 1),
    },
    {
      key: 'u1',
      label: 'U₁（mV）',
      value: formatFixed(group.reference.u1Mv, 1),
    },
    {
      key: 'u2',
      label: 'U₂（mV）',
      value: formatFixed(group.reference.u2Mv, 1),
    },
    {
      key: 'p0',
      label: 'P₀（kPa）',
      value: formatFixed(group.reference.p0KPa, 3),
    },
    {
      key: 's',
      label: 'S（mV/kPa）',
      value: formatSensitivity(getPressureSensitivity(group.reference)),
    },
  ];
};

const buildGroupKnownData = (
  session: HeatCapacityCalculationWorkflowSession,
  groupIndex: number,
): HeatCapacityKnownDatum[] => {
  const group = session.groups[groupIndex];
  if (!group) return [];
  const { reference } = group;
  return [
    { key: 'u0', label: 'U₀（mV）', value: formatFixed(reference.u0Mv, 1) },
    { key: 'u1', label: 'U₁（mV）', value: formatFixed(reference.u1Mv, 1) },
    { key: 'u2', label: 'U₂（mV）', value: formatFixed(reference.u2Mv, 1) },
    { key: 'p0', label: 'P₀（kPa）', value: formatFixed(reference.p0KPa, 3) },
    {
      key: 's',
      label: 'S（mV/kPa）',
      value: formatSensitivity(getPressureSensitivity(reference)),
    },
    {
      key: 'u1Prime',
      label: 'U₁′（mV）',
      value: getResolvedValue(findFieldByEnding(group.fields, ':u1Prime')),
    },
    {
      key: 'u2Prime',
      label: 'U₂′（mV）',
      value: getResolvedValue(findFieldByEnding(group.fields, ':u2Prime')),
    },
    {
      key: 'p1',
      label: 'P₁（kPa）',
      value: getResolvedValue(findFieldByEnding(group.fields, ':p1')),
    },
    {
      key: 'p2',
      label: 'P₂（kPa）',
      value: getResolvedValue(findFieldByEnding(group.fields, ':p2')),
    },
    {
      key: 'gamma',
      label: 'γ',
      value: getResolvedValue(findFieldByEnding(group.fields, ':gamma')),
    },
  ];
};

const buildAggregateKnownData = (
  session: HeatCapacityCalculationWorkflowSession,
): HeatCapacityKnownDatum[] => {
  const gammaData = session.groups.map((group, index) => ({
    key: `gamma-${group.trialId}`,
    label: `γ${index + 1}`,
    value: getResolvedValue(findFieldByEnding(group.fields, ':gamma')),
  }));
  const aggregate = session.aggregate;
  if (!aggregate) return gammaData;
  return [
    ...gammaData,
    {
      key: 'meanGamma',
      label: 'γ̄',
      value: getResolvedValue(findFieldByEnding(aggregate.fields, ':meanGamma')),
    },
    {
      key: 'sampleStandardDeviation',
      label: 's(γ)',
      value: getResolvedValue(findFieldByEnding(aggregate.fields, ':sampleStandardDeviation')),
    },
    {
      key: 'typeAStandardUncertainty',
      label: 'uA(γ̄)',
      value: getResolvedValue(findFieldByEnding(aggregate.fields, ':typeAStandardUncertainty')),
    },
    {
      key: 'relativeError',
      label: 'Eᵣ（%）',
      value: getResolvedValue(findFieldByEnding(aggregate.fields, ':relativeError')),
    },
  ];
};

const buildPotentialKnownValues = (
  session: HeatCapacityCalculationWorkflowSession,
) => {
  const values = session.groups.flatMap((group) => [
    formatFixed(group.reference.u0Mv, 1),
    formatFixed(group.reference.u1Mv, 1),
    formatFixed(group.reference.u2Mv, 1),
    formatFixed(group.reference.p0KPa, 3),
    formatSensitivity(getPressureSensitivity(group.reference)),
    ...group.fields.map(formatReference),
  ]);
  if (session.aggregate) {
    values.push(...session.aggregate.fields.map(formatReference));
  }
  return values;
};

const splitKnownDataRows = (
  data: readonly HeatCapacityKnownDatum[],
) => {
  const rows: HeatCapacityKnownDatum[][] = [];
  for (let index = 0; index < data.length; index += 4) {
    rows.push(data.slice(index, index + 4));
  }
  return rows;
};

const getStepFormula = (
  kind: HeatCapacityCalculationStepKind,
  field: HeatCapacityCalculationWorkflowField,
  groupCount: number,
) => {
  if (kind === 'correctedVoltages') {
    return field.id.endsWith(':u1Prime')
      ? 'U₁′ = U₁ − U₀ ='
      : 'U₂′ = U₂ − U₀ =';
  }
  if (kind === 'absolutePressures') {
    return field.id.endsWith(':p1')
      ? 'P₁ = P₀ + U₁′ / S ='
      : 'P₂ = P₀ + U₂′ / S =';
  }
  if (kind === 'groupGamma') return 'γ = ln(P₁ / P₀) / ln(P₁ / P₂) =';
  if (kind === 'guideRelativeError') return 'Eᵣ = |γ − γ₀| / γ₀ × 100% =';
  if (kind === 'meanGamma') return `γ̄ = (γ₁ + ⋯ + γ${groupCount}) / ${groupCount} =`;
  if (kind === 'sampleStandardDeviation') return 's(γ) = √[Σ(γᵢ − γ̄)² / (n − 1)] =';
  if (kind === 'typeAStandardUncertainty') return 'uA(γ̄) = s(γ) / √n =';
  return 'Eᵣ = |γ̄ − γ₀| / γ₀ × 100% =';
};

const getFeedbackMessageKey = (
  field: HeatCapacityCalculationWorkflowField,
) => {
  const feedback = field.feedback;
  if (!feedback) return null;
  if (feedback.outcome === 'empty') return 'empty';
  if (feedback.outcome === 'invalid') return 'invalid';
  if (feedback.numericCorrect && !feedback.precisionCorrect) return 'precisionWrong';
  if (!feedback.numericCorrect && feedback.precisionCorrect) return 'numericWrong';
  return 'answerWrong';
};

const HeatCapacityCalculationField = ({
  field,
  formula,
  language,
  interactive,
  systemReadOnly,
  onDraftChange,
  onContinueAnswer,
  onRevealAnswer,
}: {
  field: HeatCapacityCalculationWorkflowField;
  formula: string;
  language: WorkbenchLanguagePreference;
  interactive: boolean;
  systemReadOnly: boolean;
  onDraftChange: (fieldId: string, draftRaw: string) => void;
  onContinueAnswer: (fieldId: string) => void;
  onRevealAnswer: (fieldId: string) => void;
}) => {
  const copy = COPY[language] ?? COPY['zh-CN'];
  const spec = HEAT_CAPACITY_CALCULATION_ANSWER_SPECS[field.answerKind];
  const precision = spec.precision.type === 'decimal-places'
    ? copy.precisionDecimal(spec.precision.digits)
    : copy.precisionSignificant(spec.precision.digits);
  const hasError = field.feedback !== null || field.answer.status === 'revealed';
  const isCorrect = field.answer.status === 'correct';
  const resolved = field.answer.status !== 'unresolved';
  const feedbackMessageKey = getFeedbackMessageKey(field);
  const displayValue = systemReadOnly ? formatReference(field) : field.draftRaw;
  const referenceTone = field.answer.referenceTone;
  const statusText = isCorrect
    ? systemReadOnly
      ? copy.systemValue
      : copy.correct
    : field.answer.status === 'revealed'
      ? copy.revealed
      : feedbackMessageKey
        ? copy[feedbackMessageKey]
        : '';

  return (
    <div
      className={`studio-heat-calculation-field ${
        isCorrect ? 'studio-heat-calculation-field-success' : ''
      } ${hasError ? 'studio-heat-calculation-field-danger' : ''}`}
      data-heat-capacity-calculation-field={field.id}
      data-answer-status={field.answer.status}
    >
      <div className="studio-heat-calculation-formula-line">
        <label htmlFor={`heat-calculation-${field.id}`}>
          <span className="studio-heat-calculation-formula">{formula}</span>
          <input
            id={`heat-calculation-${field.id}`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            value={displayValue}
            disabled={!interactive || resolved || field.feedback !== null}
            aria-invalid={field.feedback !== null}
            aria-describedby={`heat-calculation-${field.id}-precision heat-calculation-${field.id}-feedback`}
            onChange={(event) => onDraftChange(field.id, event.currentTarget.value)}
          />
        </label>
        <span
          id={`heat-calculation-${field.id}-precision`}
          className="studio-heat-calculation-precision"
        >
          {precision}
        </span>
      </div>

      <div
        id={`heat-calculation-${field.id}-feedback`}
        className="studio-heat-calculation-field-feedback"
        aria-live="polite"
      >
        <span className="studio-heat-calculation-status">{statusText || '\u00A0'}</span>
        <span
          className={`studio-heat-calculation-reference ${
            referenceTone === 'success'
              ? 'studio-heat-calculation-reference-success'
              : referenceTone === 'danger'
                ? 'studio-heat-calculation-reference-danger'
                : ''
          } ${resolved ? '' : 'studio-heat-calculation-reference-placeholder'}`}
        >
          {resolved ? `${copy.reference}${formatReference(field)}` : `${copy.reference}\u00A0`}
        </span>
        {field.feedback !== null ? (
          <span className="studio-heat-calculation-error-actions">
            <button type="button" onClick={() => onContinueAnswer(field.id)}>
              {copy.continueAnswer}
            </button>
            <button
              type="button"
              className="studio-heat-calculation-reveal"
              onClick={() => onRevealAnswer(field.id)}
            >
              {copy.revealAnswer}
            </button>
          </span>
        ) : (
          <span className="studio-heat-calculation-error-actions-placeholder" aria-hidden="true" />
        )}
      </div>
    </div>
  );
};

const HeatCapacityCalculationStep = ({
  session,
  step,
  language,
  onDraftChange,
  onSubmitStep,
  onContinueAnswer,
  onRevealAnswer,
}: {
  session: HeatCapacityCalculationWorkflowSession;
  step: HeatCapacityCalculationWorkflowStep;
  language: WorkbenchLanguagePreference;
  onDraftChange: (fieldId: string, draftRaw: string) => void;
  onSubmitStep: (stepId: string) => void;
  onContinueAnswer: (fieldId: string) => void;
  onRevealAnswer: (fieldId: string) => void;
}) => {
  const copy = COPY[language] ?? COPY['zh-CN'];
  const fields = step.fieldIds
    .map((fieldId) => getHeatCapacityCalculationWorkflowField(session, fieldId))
    .filter((field): field is HeatCapacityCalculationWorkflowField => field !== null);
  const active = (
    session.status === 'in-progress' &&
    session.presentation === 'interactive' &&
    session.activeStepId === step.id
  );
  const hasPendingFeedback = fields.some((field) => field.feedback !== null);
  const hasUnresolvedField = fields.some((field) => field.answer.status === 'unresolved');
  const canSubmit = active && hasUnresolvedField && !hasPendingFeedback;
  const systemReadOnly = session.presentation !== 'interactive';

  return (
    <article
      className={`studio-heat-calculation-step ${
        active ? 'studio-heat-calculation-step-active' : ''
      }`}
      data-heat-capacity-calculation-step={step.kind}
    >
      <header className="studio-heat-calculation-step-header">
        <strong>{copy.stepTitle[step.kind]}</strong>
      </header>
      <div className="studio-heat-calculation-step-main">
        <div
          className={`studio-heat-calculation-step-fields ${
            fields.length === 2 ? 'studio-heat-calculation-step-fields-two' : ''
          }`}
          data-two-input-row={fields.length === 2 ? 'true' : undefined}
        >
          {fields.map((field) => (
            <HeatCapacityCalculationField
              key={field.id}
              field={field}
              formula={getStepFormula(step.kind, field, session.groups.length)}
              language={language}
              interactive={active}
              systemReadOnly={systemReadOnly}
              onDraftChange={onDraftChange}
              onContinueAnswer={onContinueAnswer}
              onRevealAnswer={onRevealAnswer}
            />
          ))}
        </div>
        <button
          type="button"
          className={`studio-heat-calculation-step-confirm ${
            active ? '' : 'studio-heat-calculation-step-confirm-hidden'
          }`}
          disabled={!canSubmit}
          tabIndex={active ? 0 : -1}
          onClick={() => onSubmitStep(step.id)}
        >
          {copy.confirm}
        </button>
      </div>
    </article>
  );
};

export const HeatCapacityCalculationWindow = ({
  open,
  language,
  session,
  onDraftChange,
  onSubmitStep,
  onContinueAnswer,
  onRevealAnswer,
  onSelectGroup,
  onSelectAggregate,
  onCompleteAndExit,
  onClose,
}: HeatCapacityCalculationWindowProps) => {
  const generatedId = useId();
  if (!open || session === null) return null;

  const copy = COPY[language] ?? COPY['zh-CN'];
  const titleId = `${generatedId}-title`;
  const noteId = `${generatedId}-note`;
  const isReadyForCompletion = (
    session.status === 'ready-to-exit' &&
    session.presentation === 'interactive'
  );
  const canDismiss = (
    session.status !== 'in-progress' ||
    session.presentation !== 'interactive'
  );
  const handleDismiss = () => {
    if (!canDismiss) return;
    if (isReadyForCompletion) onCompleteAndExit();
    else onClose();
  };

  const selectedGroupIndex = session.selectedGroupIndex ?? session.activeGroupIndex;
  const knownData = session.mode === 'guide'
    ? buildGuideKnownData(session)
    : session.aggregateSelected
      ? buildAggregateKnownData(session)
      : buildGroupKnownData(session, selectedGroupIndex);
  const knownRows = splitKnownDataRows(knownData);
  const knownTitle = session.mode === 'guide'
    ? copy.knownGuide
    : session.aggregateSelected
      ? copy.knownAggregate
      : copy.knownGroup(selectedGroupIndex);
  const potentialValues = buildPotentialKnownValues(session);
  const longestValueLength = Math.max(7, ...potentialValues.map((value) => value.length));
  const knownGridStyle = {
    '--studio-heat-calculation-value-width': `${longestValueLength + 1}ch`,
  } as CSSProperties;
  const visibleSteps = getHeatCapacityCalculationWorkflowVisibleSteps(session);

  return (
    <PromptDialogShell
      title={copy.title}
      titleId={titleId}
      subtitle={copy.subtitle[session.mode]}
      variant="task"
      role="dialog"
      ariaDescribedBy={noteId}
      closeLabel={copy.close}
      dismiss={{ closeButton: canDismiss, escape: canDismiss, backdrop: canDismiss }}
      onRequestClose={handleDismiss}
      initialFocusSelector={
        '.studio-heat-calculation-step-active input:not(:disabled), ' +
        '.studio-heat-calculation-step-active button:not(:disabled), ' +
        '.studio-heat-calculation-exit, .studio-settings-close'
      }
      focusKey={`${session.activeStepId}:${session.status}:${session.presentation}`}
      overlayClassName="studio-settings-overlay studio-heat-calculation-overlay"
      dialogClassName="studio-settings-window studio-heat-calculation-window"
      headerClassName="studio-settings-header studio-heat-calculation-header"
      closeButtonClassName="studio-settings-close"
      overlayData={{
        'data-heat-capacity-calculation-window': 'true',
        'data-calculation-status': session.status,
      }}
    >
        <div
          id={noteId}
          className="studio-heat-calculation-tolerance-note"
          role="note"
        >
          {copy.tolerance}
        </div>

        {session.mode === 'free' ? (
          <nav className="studio-heat-calculation-tabs" aria-label={copy.subtitle.free}>
            {session.groups.map((group, index) => {
              const disabled = (
                session.status === 'in-progress' &&
                index > session.activeGroupIndex
              );
              const selected = !session.aggregateSelected && selectedGroupIndex === index;
              return (
                <button
                  key={group.trialId}
                  type="button"
                  className={selected ? 'studio-heat-calculation-tab-active' : ''}
                  aria-current={selected ? 'page' : undefined}
                  disabled={disabled}
                  data-prompt-tooltip={disabled ? copy.futureGroup : undefined}
                  onClick={() => onSelectGroup(index)}
                >
                  {copy.groupTab(index)}
                </button>
              );
            })}
            <button
              type="button"
              className={session.aggregateSelected ? 'studio-heat-calculation-tab-active' : ''}
              aria-current={session.aggregateSelected ? 'page' : undefined}
              disabled={session.status === 'in-progress' && !session.aggregateSelected}
              data-prompt-tooltip={
                session.status === 'in-progress' && !session.aggregateSelected
                  ? copy.futureAggregate
                  : undefined
              }
              onClick={onSelectAggregate}
            >
              {copy.aggregateTab}
            </button>
          </nav>
        ) : null}

        <section
          className="studio-heat-calculation-known-panel"
          aria-labelledby={`${generatedId}-known-title`}
        >
          <header>
            <strong id={`${generatedId}-known-title`}>{knownTitle}</strong>
          </header>
          <div
            className="studio-heat-calculation-known-grid"
            style={knownGridStyle}
            data-known-grid-columns="4"
          >
            {knownRows.map((row, rowIndex) => {
              const placeholderCount = 4 - row.length;
              return (
                <div
                  className="studio-heat-calculation-known-row"
                  key={`known-row-${rowIndex}`}
                >
                  {Array.from({ length: placeholderCount }, (_, index) => (
                    <span
                      className="studio-heat-calculation-known-placeholder"
                      key={`known-placeholder-${rowIndex}-${index}`}
                      aria-hidden="true"
                    />
                  ))}
                  {row.map((datum) => (
                    <span className="studio-heat-calculation-known-item" key={datum.key}>
                      <span className="studio-heat-calculation-known-label">{datum.label}</span>
                      <span
                        className={`studio-heat-calculation-known-value ${
                          datum.value === '' ? 'studio-heat-calculation-known-value-pending' : ''
                        }`}
                      >
                        {datum.value || '\u00A0'}
                      </span>
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        </section>

        <div className="studio-heat-calculation-steps" data-scroll-on-overflow="true">
          {visibleSteps.map((step) => (
            <HeatCapacityCalculationStep
              key={step.id}
              session={session}
              step={step}
              language={language}
              onDraftChange={onDraftChange}
              onSubmitStep={onSubmitStep}
              onContinueAnswer={onContinueAnswer}
              onRevealAnswer={onRevealAnswer}
            />
          ))}
        </div>

        {canDismiss ? (
          <footer className="studio-heat-calculation-footer">
            <button
              type="button"
              className="studio-heat-calculation-exit"
              onClick={handleDismiss}
            >
              {isReadyForCompletion ? copy.completeAndExit : copy.closeButton}
            </button>
          </footer>
        ) : null}
    </PromptDialogShell>
  );
};

export default HeatCapacityCalculationWindow;
