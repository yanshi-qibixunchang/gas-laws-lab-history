import {
  useId,
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  CalculationKnownGrid,
  splitCalculationKnownDataRows,
  type CalculationKnownDatum,
} from '../../components/calculation/CalculationKnownGrid.tsx';
import { PromptDialogShell } from '../../components/prompts/PromptDialogShell.tsx';
import {
  getHeatCapacityCalculationWorkflowField,
  getHeatCapacityCalculationNextPage,
  getHeatCapacityCalculationWorkflowVisibleSteps,
  type HeatCapacityCalculationStepKind,
  type HeatCapacityCalculationWorkflowField,
  type HeatCapacityCalculationWorkflowSession,
  type HeatCapacityCalculationWorkflowStep,
} from '../../domain/heatCapacity/heatCapacityCalculationWorkflowModel.ts';
import {
  formatHeatCapacityCalculationReference,
  getHeatCapacityCalculationFieldSpec,
  isHeatCapacitySequentialAnswerRule,
  HEAT_CAPACITY_STRICT_ANSWER_RULE,
  type HeatCapacityCalculationAnswerRule,
} from '../../domain/heatCapacity/heatCapacityCalculationValidation.ts';
import type { WorkbenchLanguagePreference } from '../workbench/workbenchGeneralSettings.ts';
import './HeatCapacityCalculationWindow.css';
import { HeatCapacityCalculationMath, HeatCapacityQDefinition, HeatCapacityFinalResult, HeatCapacityPropagationDefinition } from './HeatCapacityCalculationMath.tsx';
import { formatSignificantFiguresHalfEven } from '../../domain/calculation/decimalHalfEven.ts';
import { getUncertaintyTeachingNotice } from '../../domain/calculation/uncertaintyTeachingEligibility.ts';

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

type HeatCapacityKnownDatum = CalculationKnownDatum;

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
    strictRule: '判定说明：每步按提示采用“四舍六入五成双”舍入，后续步骤使用已显示的数值。答案须同时满足数值和位数要求；支持等价的科学计数法。',
    strictNumericWrong: '数值与按规定精度舍入后的结果不一致',
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
    revealAnswer: '查看答案',
    nextGroup: '进入下一次计算',
    nextAggregate: '进入汇总计算',
    confirm: '确认',
    closeButton: '关闭',
    completeAndExit: '完成并退出',
    precisionDecimal: (digits: number) => `保留小数点后 ${digits} 位`,
    precisionSignificant: (digits: number) => `保留 ${digits} 位有效数字`,
    stepTitle: {
      correctedVoltages: '计算电压差',
      absolutePressures: '计算绝对压强',
      groupGamma: '计算本次实验气体比热容比',
      guideRelativeError: '计算相对误差',
      meanGamma: '计算比热容比平均值',
      sampleStandardDeviation: '计算样本标准差',
      typeAStandardUncertainty: '计算 A 类标准不确定度',
      typeBStandardUncertainty: '计算平均值的 B 类标准不确定度',
      combinedStandardUncertainty: '计算合成标准不确定度',
      batchRelativeError: '计算本组相对误差',
      finalReport: '最终结果修约',
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
    strictRule: '判定說明：每步按提示採用「四捨六入五成雙」捨入，後續步驟使用已顯示的數值。答案須同時符合數值和位數要求；支援等價的科學記號。',
    strictNumericWrong: '數值與按規定精度捨入後的結果不一致',
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
    revealAnswer: '查看答案',
    nextGroup: '進入下一次計算',
    nextAggregate: '進入彙總計算',
    confirm: '確認',
    closeButton: '關閉',
    completeAndExit: '完成並退出',
    precisionDecimal: (digits: number) => `保留小數點後 ${digits} 位`,
    precisionSignificant: (digits: number) => `保留 ${digits} 位有效數字`,
    stepTitle: {
      correctedVoltages: '計算電壓差',
      absolutePressures: '計算絕對壓強',
      groupGamma: '計算本次實驗氣體比熱容比',
      guideRelativeError: '計算相對誤差',
      meanGamma: '計算比熱容比平均值',
      sampleStandardDeviation: '計算樣本標準差',
      typeAStandardUncertainty: '計算 A 類標準不確定度',
      typeBStandardUncertainty: '計算平均值的 B 類標準不確定度',
      combinedStandardUncertainty: '計算合成標準不確定度',
      batchRelativeError: '計算本組相對誤差',
      finalReport: '最終結果修約',
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
    strictRule: 'Round each step to the required precision using round-half-to-even; use the displayed values in later steps. Both value and written precision must match. Equivalent scientific notation is accepted.',
    strictNumericWrong: 'Value does not match the result rounded to the required precision',
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
    revealAnswer: 'Show answer',
    nextGroup: 'Next experiment',
    nextAggregate: 'Continue to summary',
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
      typeBStandardUncertainty: 'Calculate the mean Type B standard uncertainty',
      combinedStandardUncertainty: 'Calculate combined standard uncertainty',
      batchRelativeError: 'Calculate group relative error',
      finalReport: 'Round the final result',
    },
  },
} as const;

const formatFixed = (value: number, digits: number) => (
  Number.isFinite(value) ? value.toFixed(digits) : '—'
);

const formatSensitivity = (value: number) => (
  Number.isFinite(value) ? value.toPrecision(4) : '—'
);
const formatPublicPressure = (value: number) => Number(value.toFixed(2)) === value ? value.toFixed(2) : String(value);

const getPressureSensitivity = (
  reference: HeatCapacityCalculationWorkflowSession['groups'][number]['reference'],
) => {
  if (reference.pressureSensitivityMvPerKPa !== undefined) return reference.pressureSensitivityMvPerKPa;
  const p1Delta = reference.p1KPa - reference.p0KPa;
  if (Math.abs(p1Delta) > Number.EPSILON) return reference.u1PrimeMv / p1Delta;
  const p2Delta = reference.p2KPa - reference.p0KPa;
  if (Math.abs(p2Delta) > Number.EPSILON) return reference.u2PrimeMv / p2Delta;
  return Number.NaN;
};

const formatReference = (
  field: HeatCapacityCalculationWorkflowField,
  answerRule: HeatCapacityCalculationAnswerRule | undefined,
) => (
  formatHeatCapacityCalculationReference(
    field.expectedValue,
    getHeatCapacityCalculationFieldSpec(field, answerRule),
  )
);

const getResolvedValue = (
  field: HeatCapacityCalculationWorkflowField | null,
  answerRule: HeatCapacityCalculationAnswerRule | undefined,
) => (
  field && field.answer.status !== 'unresolved'
    ? formatReference(field, answerRule)
    : ''
);

const findFieldByEnding = (
  fields: readonly HeatCapacityCalculationWorkflowField[],
  ending: string,
) => fields.find((field) => field.id.endsWith(ending)) ?? null;

const getTheoryKnownDatum = (session: HeatCapacityCalculationWorkflowSession): HeatCapacityKnownDatum => ({
  key: 'theoreticalGamma', label: isHeatCapacitySequentialAnswerRule(session.answerRule) ? <span>γ<sub>ref</sub></span> : 'γ₀',
  value: session.theoreticalGamma === 5 / 3 ? '5/3' : String(session.theoreticalGamma),
});

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
    getTheoryKnownDatum(session),
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
    { key: 'p0', label: 'P₀（kPa）', value: isHeatCapacitySequentialAnswerRule(session.answerRule) ? formatPublicPressure(reference.p0KPa) : formatFixed(reference.p0KPa, 3) },
    {
      key: 's',
      label: 'S（mV/kPa）',
      value: formatSensitivity(getPressureSensitivity(reference)),
    },
    {
      key: 'u1Prime',
      label: 'U₁′（mV）',
      value: getResolvedValue(findFieldByEnding(group.fields, ':u1Prime'), session.answerRule),
    },
    {
      key: 'u2Prime',
      label: 'U₂′（mV）',
      value: getResolvedValue(findFieldByEnding(group.fields, ':u2Prime'), session.answerRule),
    },
    {
      key: 'p1',
      label: 'P₁（kPa）',
      value: getResolvedValue(findFieldByEnding(group.fields, ':p1'), session.answerRule),
    },
    {
      key: 'p2',
      label: 'P₂（kPa）',
      value: getResolvedValue(findFieldByEnding(group.fields, ':p2'), session.answerRule),
    },
    {
      key: 'gamma',
      label: 'γ',
      value: getResolvedValue(findFieldByEnding(group.fields, ':gamma'), session.answerRule),
    },
    ...(isHeatCapacitySequentialAnswerRule(session.answerRule) ? [{ key: 'n', label: 'n', value: String(session.groups.length) }] : []),
    getTheoryKnownDatum(session),
  ];
};

const formatQ = (session: HeatCapacityCalculationWorkflowSession) => {
  const q = session.aggregate?.reference.sumSquaredDeviations ?? 0;
  return q === 0 ? '0' : formatSignificantFiguresHalfEven(q, 4);
};

const buildAggregateKnownData = (
  session: HeatCapacityCalculationWorkflowSession,
): HeatCapacityKnownDatum[] => {
  const gammaData = session.groups.map((group, index) => ({
    key: `gamma-${group.trialId}`,
    label: <span>γ<sub>{index + 1}</sub></span>,
    value: getResolvedValue(findFieldByEnding(group.fields, ':gamma'), session.answerRule),
  }));
  const aggregate = session.aggregate;
  if (!aggregate) return gammaData;
  return [
    ...gammaData,
    { key: 'n', label: 'n', value: String(session.groups.length) },
    ...(aggregate.reference.voltageInstrumentStandardUncertaintyMv !== undefined ? [
      { key: 'voltageInstrumentStandardUncertaintyMv', label: <span>u<sub>仪器</sub>(U)（mV）</span>, value: String(aggregate.reference.voltageInstrumentStandardUncertaintyMv) },
      { key: 'propagationCoefficient', label: <span>C（mV<sup>−1</sup>）</span>, value: formatSignificantFiguresHalfEven(aggregate.reference.propagationCoefficient!, 4) },
    ] : []),
    ...(session.aggregate.fields.some(field => field.answerKind === 'sampleStandardDeviation') && isHeatCapacitySequentialAnswerRule(session.answerRule) ? [{ key: 'Q', label: 'Q', value: getResolvedValue(findFieldByEnding(aggregate.fields, ':meanGamma'), session.answerRule) ? formatQ(session) : '' }] : []),
    {
      key: 'meanGamma',
      label: 'γ̄',
      value: getResolvedValue(findFieldByEnding(aggregate.fields, ':meanGamma'), session.answerRule),
    },
    {
      key: 'sampleStandardDeviation',
      label: 's(γ)',
      value: getResolvedValue(findFieldByEnding(aggregate.fields, ':sampleStandardDeviation'), session.answerRule),
    },
    {
      key: 'typeAStandardUncertainty',
      label: <span>u<sub>A</sub>(γ̄)</span>,
      value: getResolvedValue(findFieldByEnding(aggregate.fields, ':typeAStandardUncertainty'), session.answerRule),
    },
    {
      key: 'relativeError',
      label: 'Eᵣ（%）',
      value: getResolvedValue(findFieldByEnding(aggregate.fields, ':relativeError'), session.answerRule),
    },
    ...(aggregate.reference.voltageInstrumentStandardUncertaintyMv !== undefined ? [
      { key: 'typeBStandardUncertainty', label: <span>u<sub>B</sub>(γ̄)</span>, value: getResolvedValue(findFieldByEnding(aggregate.fields, ':typeBStandardUncertainty'), session.answerRule) },
      { key: 'combinedStandardUncertainty', label: <span>u<sub>c</sub>(γ̄)</span>, value: getResolvedValue(findFieldByEnding(aggregate.fields, ':combinedStandardUncertainty'), session.answerRule) },
    ] : []),
    getTheoryKnownDatum(session),
  ].filter(datum => !['sampleStandardDeviation', 'typeAStandardUncertainty'].includes(datum.key) || aggregate.fields.some(field => field.answerKind === datum.key));
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
    ...group.fields.map((field) => formatReference(field, session.answerRule)),
  ]);
  if (session.aggregate) {
    values.push(...session.aggregate.fields.map((field) => formatReference(field, session.answerRule)));
  }
  values.push(getTheoryKnownDatum(session).value);
  return values;
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
  if (kind === 'sampleStandardDeviation') return 's = √[Q / (n − 1)] =';
  if (kind === 'finalReport') return field.answerKind === 'reportMeanGamma' ? 'γ̄ =' : 'uc(γ̄) =';
  if (kind === 'typeAStandardUncertainty') return 'uA(γ̄) = s(γ) / √n =';
  if (kind === 'typeBStandardUncertainty') return 'uB(γ̄) = C × u仪器(U) =';
  if (kind === 'combinedStandardUncertainty') return 'uc(γ̄) = √[uA²(γ̄) + uB²(γ̄)] =';
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
  answerRule,
  formula,
  language,
  interactive,
  systemReadOnly,
  onDraftChange,
  onContinueAnswer,
  onRevealAnswer,
}: {
  field: HeatCapacityCalculationWorkflowField;
  answerRule: HeatCapacityCalculationAnswerRule | undefined;
  formula: ReactNode;
  language: WorkbenchLanguagePreference;
  interactive: boolean;
  systemReadOnly: boolean;
  onDraftChange: (fieldId: string, draftRaw: string) => void;
  onContinueAnswer: (fieldId: string) => void;
  onRevealAnswer: (fieldId: string) => void;
}) => {
  const copy = COPY[language] ?? COPY['zh-CN'];
  const spec = getHeatCapacityCalculationFieldSpec(field, answerRule);
  const precision = spec.precision.type === 'decimal-places'
    ? copy.precisionDecimal(spec.precision.digits)
    : copy.precisionSignificant(spec.precision.digits);
  const hasError = field.feedback !== null || field.answer.status === 'revealed';
  const isCorrect = field.answer.status === 'correct';
  const resolved = field.answer.status !== 'unresolved';
  const feedbackMessageKey = getFeedbackMessageKey(field);
  const displayValue = systemReadOnly ? formatReference(field, answerRule) : field.draftRaw;
  const referenceTone = field.answer.referenceTone;
  const statusText = isCorrect
    ? systemReadOnly
      ? copy.systemValue
      : copy.correct
    : field.answer.status === 'revealed'
      ? copy.revealed
      : feedbackMessageKey
        ? feedbackMessageKey === 'numericWrong' && (answerRule === HEAT_CAPACITY_STRICT_ANSWER_RULE || isHeatCapacitySequentialAnswerRule(answerRule))
          ? copy.strictNumericWrong
          : copy[feedbackMessageKey]
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
          <span>{field.answerKind === 'correctedVoltage' ? 'mV' : field.answerKind === 'absolutePressure' ? 'kPa' : field.answerKind === 'relativeErrorPercent' ? '%' : ''}</span>
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
          {resolved ? `${copy.reference}${formatReference(field, answerRule)}` : `${copy.reference}\u00A0`}
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
        {isHeatCapacitySequentialAnswerRule(session.answerRule) && session.presentation === 'interactive' && fields.every(field => field.answer.status !== 'unresolved') && <button type="button" className="studio-heat-calculation-restart" onClick={() => onContinueAnswer(fields[0]!.id)}>{language === 'en' ? 'Recalculate from here' : '从此步重新计算'}</button>}
      </header>
      {step.kind === 'sampleStandardDeviation' && isHeatCapacitySequentialAnswerRule(session.answerRule) && <div className="studio-heat-calculation-explanation">
        <p>{language === 'en' ? 'The three results may differ. The standard deviation describes their spread; the Type A standard uncertainty of the mean assesses the effect of repeat measurements on the mean.' : '三次实验结果可能存在一定分散。标准差描述各次结果的离散程度，平均值的 A 类标准不确定度用于评定重复测量对平均值的影响。'}</p>
        <HeatCapacityQDefinition value={formatQ(session)} />
      </div>}
      {step.kind === 'typeAStandardUncertainty' && isHeatCapacitySequentialAnswerRule(session.answerRule) && <details className="studio-heat-calculation-explanation">
        <summary>{language === 'en' ? 'Why divide by √n?' : '为什么除以 √n？'}</summary>
        <p>{language === 'en' ? 'For independent repetitions under the same conditions, the standard deviation of the mean equals the standard deviation of a single result divided by √n. Here n = 3. This is a statistical relation, not a conversion of an instrument error limit.' : '同一条件下独立重复实验，平均值的标准差等于单次结果的标准差除以 √n。本组 n = 3；这是重复实验平均值的统计关系，不是仪器误差限的换算。'}</p>
      </details>}
      {step.kind === 'finalReport' && <p className="studio-heat-calculation-explanation">{language === 'en' ? 'Round the combined standard uncertainty to two significant figures and align the mean to its decimal place.' : '合成标准不确定度保留两位有效数字，平均值的小数末位与其对齐。'}</p>}
      {step.kind === 'typeBStandardUncertainty' && <div className="studio-heat-calculation-explanation">
        <p>{language === 'en' ? 'The given voltage instrument standard uncertainty is 0.1 mV. Multiply it by the public coefficient C to obtain the Type B standard uncertainty of the mean.' : '给定电压仪器标准不确定度为 0.1 mV，乘以表中的传播系数 C，得到平均 γ 的 B 类标准不确定度。'}</p>
        <details><summary>{language === 'en' ? 'Where does C come from?' : 'C 从哪里来？'}</summary>
          <p>{language === 'en' ? 'The system calculates how U₀, U₁ and U₂ affect the mean using this group’s public data. Their sensitivity coefficients are c₀, c₁ and c₂. C combines these contributions; no derivative calculation is required.' : '系统根据本组公开数据计算 U₀、U₁、U₂ 对平均 γ 的影响，分别得到系数 c₀、c₁、c₂，再合成为 C。无需手算偏导数。'}</p>
          <HeatCapacityPropagationDefinition />
        </details>
      </div>}
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
              answerRule={session.answerRule}
              formula={isHeatCapacitySequentialAnswerRule(session.answerRule)
                ? <HeatCapacityCalculationMath kind={step.kind} fieldId={field.id} count={session.groups.length} usePublicQ label={getStepFormula(step.kind, field, session.groups.length).replaceAll('γ₀', 'γref')} />
                : getStepFormula(step.kind, field, session.groups.length)}
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
      {step.kind === 'finalReport' && <div className="studio-heat-calculation-explanation">
        {fields.every(field => field.answer.status !== 'unresolved') && <HeatCapacityFinalResult average={formatReference(fields[0]!, session.answerRule)} uncertainty={formatReference(fields[1]!, session.answerRule)} />}
        <p>{language === 'en' ? 'This result reports the combined standard uncertainty from repeat measurements and the specified voltage instrument effect.' : '本结果报告重复测量 A 类与给定电压仪器 B 类合成的标准不确定度。'}</p>
      </div>}
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
  const stepsRef = useRef<HTMLDivElement>(null);
  const nextPage = open && session ? getHeatCapacityCalculationNextPage(session) : null;
  useEffect(() => {
    if (nextPage !== null || session?.status === 'ready-to-exit') {
      stepsRef.current?.lastElementChild?.scrollIntoView({ block: 'nearest' });
    }
  }, [nextPage, session?.selectedGroupIndex, session?.status]);
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
  const knownRows = splitCalculationKnownDataRows(knownData);
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
      focusKey={`${session.activeStepId}:${session.status}:${session.presentation}:${session.selectedGroupIndex}:${session.aggregateSelected}`}
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
          {(session.answerRule === HEAT_CAPACITY_STRICT_ANSWER_RULE || isHeatCapacitySequentialAnswerRule(session.answerRule)) ? copy.strictRule : copy.tolerance}
          {session.recalculationNotice && session.status !== 'completed' && <p role="status">{language === 'en' ? 'The calculation rules have changed. Previous answer checks have been cleared; recalculate the related steps using the saved readings.' : '计算规则已更新，旧答案的核验状态已清除，请使用保存的原始读数重新完成相关计算。'}</p>}
          {session.uncertaintyUpgradeNotice && session.status !== 'completed' && <p role="status">{language === 'en' ? 'The instrument uncertainty definition has been updated. Valid preceding answers are retained; recalculate Type B, combined uncertainty and the final report.' : '仪器不确定度定义已更新，前序有效答案已保留；请重新计算 B 类、合成不确定度及最终报告。'}</p>}
          {isHeatCapacitySequentialAnswerRule(session.answerRule) && session.groups.length !== 3 && <p>{language === 'en' ? 'This saved group does not contain three trials. Its original records are retained; start a three-trial group for this Type A course.' : '此旧组不是三次实验，原始记录保留；本次 A 类教学请使用三次实验的新组。'}</p>}
          {getUncertaintyTeachingNotice(session.uncertaintyEligibility, language) && (
            <p>{getUncertaintyTeachingNotice(session.uncertaintyEligibility, language)}</p>
          )}
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
              disabled={session.status === 'in-progress' && !session.groups.every(group => group.fields.every(field => field.answer.status !== 'unresolved'))}
              data-prompt-tooltip={
                session.status === 'in-progress' && !session.groups.every(group => group.fields.every(field => field.answer.status !== 'unresolved'))
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
          <CalculationKnownGrid
            rows={knownRows}
            columns={4}
            shortRowAlignment="end"
            style={knownGridStyle}
            classNames={{
              grid: 'studio-heat-calculation-known-grid',
              row: 'studio-heat-calculation-known-row',
              placeholder: 'studio-heat-calculation-known-placeholder',
              item: 'studio-heat-calculation-known-item',
              label: 'studio-heat-calculation-known-label',
              value: 'studio-heat-calculation-known-value',
              pendingValue: 'studio-heat-calculation-known-value-pending',
            }}
          />
        </section>

        <div ref={stepsRef} className="studio-heat-calculation-steps" data-scroll-on-overflow="true">
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

        {canDismiss || nextPage !== null ? (
          <footer className="studio-heat-calculation-footer">
            <button
              type="button"
              className="studio-heat-calculation-exit"
              onClick={() => {
                if (nextPage === 'aggregate') onSelectAggregate();
                else if (nextPage !== null) onSelectGroup(nextPage);
                else handleDismiss();
              }}
            >
              {nextPage === 'aggregate' ? copy.nextAggregate : nextPage !== null ? copy.nextGroup : isReadyForCompletion ? copy.completeAndExit : copy.closeButton}
            </button>
          </footer>
        ) : null}
    </PromptDialogShell>
  );
};

export default HeatCapacityCalculationWindow;
