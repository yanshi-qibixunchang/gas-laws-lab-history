import {
  createHeatCapacityFreeAllGroupsOverviewModel,
  createHeatCapacityFreeGroupLollipopChartModel,
} from '../../domain/heatCapacity/heatCapacityFreeGroupChartModel.ts';
import {
  selectHeatCapacityFreeProcessReview,
} from '../../domain/heatCapacity/heatCapacityFreeProcessReviewModel.ts';
import {
  calculateFreeHeatCapacityMeanResult,
} from '../../domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import type {
  HeatCapacityFreeExperimentGroupRecord,
} from '../../domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';
import type { WorkbenchHeatCapacityState } from './workbenchHeatCapacityStateTypes.ts';
import {
  selectHeatCapacityFreeAppliedParameterDraft,
} from './workbenchHeatCapacityFreeAuthorityTransaction.ts';
import type {
  WorkbenchExportLanguage,
  WorkbenchExportMode,
  WorkbenchJsonExportPayload,
} from './workbenchResults.ts';

export interface HeatCapacityExportSelection {
  includedGroupIds?: readonly string[];
}

const sanitizeFilenamePart = (value: string) => (
  value
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}._-]/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'experiment'
);

const formatTimestamp = (value: number) => {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
};

const getTheory = (group: HeatCapacityFreeExperimentGroupRecord) => (
  group.parameterSnapshot?.physics.gamma ??
  (group.calculation?.kind === 'ideal-automatic'
    ? group.calculation.result.theoreticalGamma
    : group.calculation?.kind === 'real-interactive' ||
        group.calculation?.kind === 'ideal-interactive'
      ? group.calculation.session.theoreticalGamma
      : 1.4)
);

export const isHeatCapacityGroupReportable = (
  group: HeatCapacityFreeExperimentGroupRecord,
) => group.status === 'completed' ||
  group.runSeries.trials.some((trial) => (
    trial.completedAtMs !== null ||
    trial.u0 !== null ||
    trial.u1 !== null ||
    trial.u2 !== null
  )) ||
  group.runSeries.traceStore.traceTrials.some((traceTrial) => (
    traceTrial.branches.some((branch) => branch.samples.length > 0)
  ));

const createExperimentExportRecord = (
  group: HeatCapacityFreeExperimentGroupRecord,
  trialIndex: number,
) => {
  const trial = group.runSeries.trials[trialIndex]!;
  const theory = getTheory(group);
  const result = calculateFreeHeatCapacityMeanResult(
    [trial],
    { theoreticalGamma: theory },
  ).trialResults[0] ?? null;
  const review = selectHeatCapacityFreeProcessReview({
    trials: group.runSeries.trials,
    traceStore: group.runSeries.traceStore,
    theoreticalGamma: theory,
    selectedTrialId: trial.id,
    calculationSession: group.calculation?.kind === 'real-interactive' ||
        group.calculation?.kind === 'ideal-interactive'
      ? group.calculation.session
      : null,
    scoringVersion: group.scoringVersion,
  });
  return {
    id: trial.id,
    experimentNumber: trialIndex + 1,
    completed: trial.completedAtMs !== null,
    completedAtMs: trial.completedAtMs,
    records: {
      u0: trial.u0,
      u1: trial.u1,
      u2: trial.u2,
    },
    derivedResult: result,
    process: {
      status: review.status,
      summary: review.summary,
      chart: review.chart,
      diagnostics: group.scheme === 'real' ? review.diagnostics : [],
      operationScore: group.scheme === 'real' ? review.score : null,
    },
  };
};

const createCalculationAuditExportRecords = (
  group: HeatCapacityFreeExperimentGroupRecord,
) => {
  if (
    group.calculation?.kind !== 'real-interactive' &&
    group.calculation?.kind !== 'ideal-interactive'
  ) {
    return [];
  }
  const session = group.calculation.session;
  const experimentNumbers = new Map(
    group.runSeries.trials.map((trial, index) => [trial.id, index + 1]),
  );
  const createFieldRecord = (
    field: (typeof session.groups)[number]['fields'][number],
    scope: 'experiment' | 'aggregate',
    experimentNumber: number | null,
  ) => ({
    scope,
    experimentNumber,
    symbol: field.symbol,
    answerKind: field.answerKind,
    expectedValue: field.expectedValue,
    finalAnswer: field.answer.lastSubmittedRaw,
    status: field.answer.status,
    attempts: field.answer.attempts.length,
    hasIncorrectValidAttempt: field.answer.hasIncorrectValidAttempt,
    awardedRatio: field.answer.awardedRatio,
  });
  const experimentRecords = session.groups.flatMap((sessionGroup) => (
    sessionGroup.fields.map((field) => createFieldRecord(
      field,
      'experiment',
      experimentNumbers.get(sessionGroup.trialId) ?? null,
    ))
  ));
  const aggregateRecords = session.aggregate?.fields.map((field) => (
    createFieldRecord(field, 'aggregate', null)
  )) ?? [];
  return [...experimentRecords, ...aggregateRecords];
};

const createGroupExportRecord = (
  group: HeatCapacityFreeExperimentGroupRecord,
) => {
  const theory = getTheory(group);
  const result = calculateFreeHeatCapacityMeanResult(
    group.runSeries.trials,
    { theoreticalGamma: theory },
  );
  return {
    id: group.id,
    reportable: isHeatCapacityGroupReportable(group),
    scheme: group.scheme,
    schemeGroupNumber: group.schemeGroupNumber,
    globalOrder: group.globalOrder,
    status: group.status,
    completed: group.status === 'completed',
    legacyIncomplete: group.status === 'legacy-incomplete-readonly',
    targetExperimentCount: group.targetExperimentCount,
    completedExperimentCount: group.runSeries.trials.filter((trial) => trial.completedAtMs !== null).length,
    gasType: group.gasType,
    parameterSnapshot: group.parameterSnapshot,
    createdAtMs: group.createdAtMs,
    startedAtMs: group.startedAtMs,
    acquisitionCompletedAtMs: group.acquisitionCompletedAtMs,
    completedAtMs: group.completedAtMs,
    result,
    lollipopChart: createHeatCapacityFreeGroupLollipopChartModel(group),
    calculation: group.calculation,
    calculationAudit: createCalculationAuditExportRecords(group),
    score: group.scheme === 'real' ? group.finalScore : null,
    experiments: group.runSeries.trials.map((_, index) => (
      createExperimentExportRecord(group, index)
    )),
    legacyCompatibility: group.legacyCompatibility,
  };
};

const sortReportGroups = (
  groups: readonly HeatCapacityFreeExperimentGroupRecord[],
) => [...groups].sort((left, right) => {
  if (left.scheme !== right.scheme) return left.scheme === 'real' ? -1 : 1;
  return (left.schemeGroupNumber ?? Number.MAX_SAFE_INTEGER) -
    (right.schemeGroupNumber ?? Number.MAX_SAFE_INTEGER);
});

export const getDefaultHeatCapacityReportGroupIds = (
  file: WorkbenchHeatCapacityState,
) => file.heatCapacityFreeExperimentGroups.groups
  .filter((group) => group.status === 'completed' && isHeatCapacityGroupReportable(group))
  .map((group) => group.id);

export const isHeatCapacityExportModeReady = (
  file: WorkbenchHeatCapacityState,
  mode: WorkbenchExportMode,
) => {
  const groups = file.heatCapacityFreeExperimentGroups.groups;
  if (mode === 'completeBundle') return true;
  if (mode === 'report') return groups.some(isHeatCapacityGroupReportable);
  if (mode === 'figuresZip' || mode === 'verificationFigure') {
    return groups.some((group) => (
      group.runSeries.traceStore.traceTrials.some((traceTrial) => (
        traceTrial.branches.some((branch) => branch.samples.length > 0)
      )) ||
      createHeatCapacityFreeGroupLollipopChartModel(group).status !== 'hidden'
    ));
  }
  return false;
};

export const createHeatCapacityExportPayload = (
  file: WorkbenchHeatCapacityState,
  mode: WorkbenchExportMode,
  language: WorkbenchExportLanguage,
  selection: HeatCapacityExportSelection = {},
): WorkbenchJsonExportPayload => {
  const allGroups = file.heatCapacityFreeExperimentGroups.groups;
  const selectedIds = selection.includedGroupIds === undefined
    ? new Set(mode === 'report' ? getDefaultHeatCapacityReportGroupIds(file) : allGroups.map((group) => group.id))
    : new Set(selection.includedGroupIds);
  const groups = sortReportGroups(allGroups.filter((group) => (
    selectedIds.has(group.id) &&
    (mode !== 'report' || isHeatCapacityGroupReportable(group))
  )));
  const timestamp = file.updatedAt || file.createdAt || Date.now();
  const suffix = mode === 'completeBundle'
    ? 'experiment-package'
    : mode === 'figuresZip' || mode === 'verificationFigure'
      ? 'figures'
      : 'report';
  return {
    kind: 'json',
    mode,
    filename: `GasLawsLab_${sanitizeFilenamePart(file.name)}_adiabatic-${suffix}_${formatTimestamp(timestamp)}.json`,
    data: {
      exportKind: 'heat-capacity-adiabatic-expansion',
      schemaVersion: 1,
      language,
      fileId: file.id,
      fileName: file.name,
      experimentName: language === 'en'
        ? 'Gas heat-capacity ratio by adiabatic expansion'
        : language === 'zh-TW'
          ? '絕熱膨脹法測氣體比熱容比'
          : '绝热膨胀法测气体比热容比',
      exportedAtMs: Date.now(),
      sourceCreatedAtMs: file.createdAt,
      sourceUpdatedAtMs: file.updatedAt,
      groupSummary: {
        total: allGroups.length,
        included: groups.length,
        completed: groups.filter((group) => group.status === 'completed').length,
        incomplete: groups.filter((group) => group.status !== 'completed').length,
        real: groups.filter((group) => group.scheme === 'real').length,
        ideal: groups.filter((group) => group.scheme === 'ideal').length,
      },
      allGroupsOverview: createHeatCapacityFreeAllGroupsOverviewModel({
        ...file.heatCapacityFreeExperimentGroups,
        groups,
      }),
      groups: groups.map(createGroupExportRecord),
      packageData: mode === 'completeBundle'
        ? {
            currentParameterScheme: file.heatCapacityFreeParameterScheme,
            pendingNextScheme: file.heatCapacityFreeExperimentGroups.pendingNextScheme,
            currentParameterDraft: selectHeatCapacityFreeAppliedParameterDraft(file),
            realParameterDomain: file.heatCapacityFreeRealDomain,
            idealParameterDomain: file.heatCapacityFreeIdealDomain,
            experimentGroupCollection: file.heatCapacityFreeExperimentGroups,
            fileAcknowledgements: file.heatCapacityFreeFileAcknowledgements,
          }
        : null,
    },
  };
};
