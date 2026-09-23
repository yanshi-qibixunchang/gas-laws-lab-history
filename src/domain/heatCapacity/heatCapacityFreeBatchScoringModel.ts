import type {
  HeatCapacityCalculationStepKind,
  HeatCapacityCalculationWorkflowField,
  HeatCapacityCalculationWorkflowGroup,
  HeatCapacityCalculationWorkflowSession,
} from './heatCapacityCalculationWorkflowModel.ts';
import {
  quantizeHeatCapacityScore,
  roundHeatCapacityHalfToEven,
} from './heatCapacityFreeProcessScoringModel.ts';
import type {
  HeatCapacityCalculationScore,
  HeatCapacityFreeBatchScore,
  HeatCapacityProcessDiagnosisStatus,
  HeatCapacityProcessScore,
  HeatCapacityProcessScoreSubItem,
} from './heatCapacityFreeProcessReviewTypes.ts';

export const HEAT_CAPACITY_CALCULATION_SCORE_MAX = {
  correctedVoltages: 4,
  absolutePressures: 4,
  groupGamma: 7,
  meanGamma: 3,
  sampleStandardDeviation: 3,
  typeAStandardUncertainty: 2,
  batchRelativeError: 2,
} as const;

const CALCULATION_TOTAL_MAX = 25 as const;
const OPERATION_TOTAL_MAX = 75 as const;
const quantizeCalculationScore = (score: number) => (
  roundHeatCapacityHalfToEven(score, 1)
);

const statusFromScore = (
  score: number,
  maxScore: number,
  complete: boolean,
): HeatCapacityProcessDiagnosisStatus => {
  if (!complete) return 'insufficient-data';
  if (score >= maxScore) return 'reasonable';
  if (score <= maxScore * 0.45) return 'needs-improvement';
  return 'review';
};

const findStepFields = (
  group: Pick<HeatCapacityCalculationWorkflowGroup, 'steps' | 'fields'>,
  kind: HeatCapacityCalculationStepKind,
) => {
  const fieldIds = group.steps.find((step) => step.kind === kind)?.fieldIds ?? [];
  const fieldsById = new Map(group.fields.map((field) => [field.id, field]));
  return fieldIds
    .map((fieldId) => fieldsById.get(fieldId))
    .filter((field): field is HeatCapacityCalculationWorkflowField => field !== undefined);
};

const calculateFieldRatio = (
  fields: readonly HeatCapacityCalculationWorkflowField[],
) => fields.length === 0
  ? 0
  : fields.reduce((sum, field) => sum + (field.answer.awardedRatio ?? 0), 0) /
    fields.length;

const allFieldsResolved = (
  fields: readonly HeatCapacityCalculationWorkflowField[],
) => fields.length > 0 && fields.every((field) => field.answer.awardedRatio !== null);

const createGroupCategoryDetail = (input: {
  id: string;
  label: string;
  kind: HeatCapacityCalculationStepKind;
  maxScore: number;
  groups: readonly HeatCapacityCalculationWorkflowGroup[];
}): HeatCapacityProcessScoreSubItem => {
  const groupFields = input.groups.map((group) => findStepFields(group, input.kind));
  const completedGroups = groupFields.filter(allFieldsResolved).length;
  const complete = groupFields.length > 0 && completedGroups === groupFields.length;
  const averageRatio = groupFields.length === 0
    ? 0
    : groupFields.reduce((sum, fields) => sum + calculateFieldRatio(fields), 0) /
      groupFields.length;
  const score = quantizeCalculationScore(input.maxScore * averageRatio);
  const evidence = groupFields.length === 0
    ? '当前没有可评分的单次实验。'
    : `${completedGroups}/${groupFields.length} 次实验已完成。`;
  return {
    id: input.id,
    label: input.label,
    score,
    maxScore: input.maxScore,
    status: statusFromScore(score, input.maxScore, complete),
    evidence,
    reason: complete
      ? score === input.maxScore
        ? '各次实验的该计算项均首次正确。'
        : '该项已完成，得分按各次实验的作答过程折算。'
      : '仍有单次实验尚未完成该计算项。',
    recommendation: complete
      ? score === input.maxScore
        ? '保持当前计算过程。'
        : '复核扣分实验的数值与有效数字。'
      : '完成本组所有单次实验的对应计算。',
  };
};

const createAggregateDetail = (input: {
  id: string;
  label: string;
  kind: HeatCapacityCalculationStepKind;
  maxScore: number;
  session: HeatCapacityCalculationWorkflowSession;
}): HeatCapacityProcessScoreSubItem => {
  const fields = input.session.aggregate
    ? findStepFields(input.session.aggregate, input.kind)
    : [];
  if (input.kind === 'typeAStandardUncertainty' && input.session.aggregate) {
    fields.push(...findStepFields(input.session.aggregate, 'finalReport'));
  }
  const complete = allFieldsResolved(fields);
  const score = quantizeCalculationScore(
    input.maxScore * calculateFieldRatio(fields),
  );
  return {
    id: input.id,
    label: input.label,
    score,
    maxScore: input.maxScore,
    status: statusFromScore(score, input.maxScore, complete),
    evidence: complete ? '本组统计量已完成。' : '本组统计量尚未完成。',
    reason: complete
      ? score === input.maxScore
        ? '该统计量首次作答正确。'
        : '该统计量得分按作答过程折算。'
      : '尚未提交可评分答案。',
    recommendation: complete
      ? score === input.maxScore
        ? '保持当前计算过程。'
        : '复核公式、数值与有效数字。'
      : '完成该项本组统计量计算。',
  };
};

const createEmptyCalculationDetails = (): HeatCapacityProcessScoreSubItem[] => ([
  ['calculation-corrected-voltages', '各次实验修正电压', HEAT_CAPACITY_CALCULATION_SCORE_MAX.correctedVoltages],
  ['calculation-absolute-pressures', '各次实验绝对压强', HEAT_CAPACITY_CALCULATION_SCORE_MAX.absolutePressures],
  ['calculation-group-gamma', '各次实验比热容比', HEAT_CAPACITY_CALCULATION_SCORE_MAX.groupGamma],
  ['calculation-mean-gamma', '平均比热容比', HEAT_CAPACITY_CALCULATION_SCORE_MAX.meanGamma],
  ['calculation-sample-standard-deviation', '样本标准偏差', HEAT_CAPACITY_CALCULATION_SCORE_MAX.sampleStandardDeviation],
  ['calculation-type-a-uncertainty', 'A 类标准不确定度', HEAT_CAPACITY_CALCULATION_SCORE_MAX.typeAStandardUncertainty],
  ['calculation-relative-error', '相对误差', HEAT_CAPACITY_CALCULATION_SCORE_MAX.batchRelativeError],
].map(([id, label, maxScore]) => ({
  id: id as string,
  label: label as string,
  score: 0,
  maxScore: maxScore as number,
  status: 'insufficient-data' as const,
  evidence: '本组计算尚未开始。',
  reason: '尚无可评分答案。',
  recommendation: '完成实验后进入计算界面作答。',
})));

export const calculateHeatCapacityFreeCalculationScore = (
  session: HeatCapacityCalculationWorkflowSession | null,
): HeatCapacityCalculationScore => {
  if (
    session === null ||
    session.mode !== 'free' ||
    session.presentation !== 'interactive'
  ) {
    return {
      total: null,
      maxScore: CALCULATION_TOTAL_MAX,
      status: 'insufficient-data',
      details: createEmptyCalculationDetails(),
    };
  }

  const details = [
    createGroupCategoryDetail({
      id: 'calculation-corrected-voltages',
      label: '各次实验修正电压',
      kind: 'correctedVoltages',
      maxScore: HEAT_CAPACITY_CALCULATION_SCORE_MAX.correctedVoltages,
      groups: session.groups,
    }),
    createGroupCategoryDetail({
      id: 'calculation-absolute-pressures',
      label: '各次实验绝对压强',
      kind: 'absolutePressures',
      maxScore: HEAT_CAPACITY_CALCULATION_SCORE_MAX.absolutePressures,
      groups: session.groups,
    }),
    createGroupCategoryDetail({
      id: 'calculation-group-gamma',
      label: '各次实验比热容比',
      kind: 'groupGamma',
      maxScore: HEAT_CAPACITY_CALCULATION_SCORE_MAX.groupGamma,
      groups: session.groups,
    }),
    createAggregateDetail({
      id: 'calculation-mean-gamma',
      label: '平均比热容比',
      kind: 'meanGamma',
      maxScore: HEAT_CAPACITY_CALCULATION_SCORE_MAX.meanGamma,
      session,
    }),
    createAggregateDetail({
      id: 'calculation-sample-standard-deviation',
      label: '样本标准偏差',
      kind: 'sampleStandardDeviation',
      maxScore: HEAT_CAPACITY_CALCULATION_SCORE_MAX.sampleStandardDeviation,
      session,
    }),
    createAggregateDetail({
      id: 'calculation-type-a-uncertainty',
      label: 'A 类标准不确定度',
      kind: 'typeAStandardUncertainty',
      maxScore: HEAT_CAPACITY_CALCULATION_SCORE_MAX.typeAStandardUncertainty,
      session,
    }),
    createAggregateDetail({
      id: 'calculation-relative-error',
      label: '相对误差',
      kind: 'batchRelativeError',
      maxScore: HEAT_CAPACITY_CALCULATION_SCORE_MAX.batchRelativeError,
      session,
    }),
  ];
  const complete = details.every((detail) => detail.status !== 'insufficient-data');
  const earned = quantizeCalculationScore(
    details.reduce((sum, detail) => sum + detail.score, 0),
  );
  return {
    total: complete ? earned : null,
    maxScore: CALCULATION_TOTAL_MAX,
    status: statusFromScore(earned, CALCULATION_TOTAL_MAX, complete),
    details,
  };
};

export const calculateHeatCapacityFreeBatchScore = (input: {
  session: HeatCapacityCalculationWorkflowSession | null;
  operationScoresByTrialId: ReadonlyMap<string, HeatCapacityProcessScore>;
}): HeatCapacityFreeBatchScore => {
  const calculation = calculateHeatCapacityFreeCalculationScore(input.session);
  const operationScores = input.session?.groups.map((group) => (
    input.operationScoresByTrialId.get(group.trialId)?.total ?? null
  )) ?? [];
  const operationComplete = operationScores.length > 0 &&
    operationScores.every((score): score is number => score !== null);
  const operationAverage = operationComplete
    ? quantizeHeatCapacityScore(
        operationScores.reduce((sum, score) => sum + score, 0) /
        operationScores.length,
      )
    : null;
  const total = operationAverage !== null && calculation.total !== null
    ? quantizeCalculationScore(operationAverage + calculation.total)
    : null;
  return {
    total,
    maxScore: 100,
    operationAverage,
    operationMaxScore: OPERATION_TOTAL_MAX,
    calculation,
  };
};
