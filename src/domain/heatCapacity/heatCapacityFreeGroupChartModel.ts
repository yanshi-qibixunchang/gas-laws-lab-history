import { projectHeatCapacityTeachingResult } from './heatCapacityTeachingResultProjection.ts';
import { isHeatCapacitySequentialAnswerRule } from './heatCapacityCalculationValidation.ts';
import { evaluateHeatCapacityUncertaintyEligibility } from './heatCapacityUncertaintyEligibility.ts';
import {
  calculateFreeHeatCapacityMeanResult,
} from './heatCapacityFreeTrialModel.ts';
import type {
  HeatCapacityFreeExperimentGroupCollection,
  HeatCapacityFreeExperimentGroupRecord,
  HeatCapacityFreeExperimentGroupScheme,
} from './heatCapacityFreeExperimentGroupModel.ts';
import type { HeatCapacityFreeGasType } from './heatCapacityGasTheory.ts';

export interface HeatCapacityFreeGroupLollipopPoint {
  trialId: string;
  experimentNumber: number;
  gamma: number;
  completedAtMs: number | null;
}

export interface HeatCapacityFreeGroupLollipopChartModel {
  publicTeachingValues?: boolean;
  groupId: string;
  scheme: HeatCapacityFreeExperimentGroupScheme;
  gasType: HeatCapacityFreeGasType;
  schemeGroupNumber: number | null;
  targetExperimentCount: number;
  completedExperimentCount: number;
  status: 'hidden' | 'in-progress' | 'completed' | 'legacy-incomplete';
  points: HeatCapacityFreeGroupLollipopPoint[];
  theoreticalGamma: number;
  meanGamma: number | null;
  sampleStandardDeviation: number | null;
  typeAStandardUncertainty: number | null;
  relativeErrorPercent: number | null;
}

export interface HeatCapacityFreeAllGroupsOverviewPoint {
  publicTeachingValues?: boolean;
  groupId: string;
  scheme: HeatCapacityFreeExperimentGroupScheme;
  gasType: HeatCapacityFreeGasType;
  schemeGroupNumber: number;
  globalOrder: number;
  meanGamma: number;
  typeAStandardUncertainty: number | null;
  completedExperimentCount: number;
  targetExperimentCount: number;
  completed: boolean;
  legacyIncomplete: boolean;
}

export interface HeatCapacityFreeAllGroupsOverviewModel {
  theoreticalGamma: number | null;
  points: HeatCapacityFreeAllGroupsOverviewPoint[];
}

const getTheoreticalGamma = (
  group: HeatCapacityFreeExperimentGroupRecord,
) => group.parameterSnapshot?.physics.gamma ??
  (group.calculation?.kind === 'ideal-automatic'
    ? group.calculation.result.theoreticalGamma
    : group.calculation?.kind === 'real-interactive' ||
        group.calculation?.kind === 'ideal-interactive'
      ? group.calculation.session.theoreticalGamma
      : null);

export const createHeatCapacityFreeGroupLollipopChartModel = (
  group: HeatCapacityFreeExperimentGroupRecord,
): HeatCapacityFreeGroupLollipopChartModel => {
  const theoreticalGamma = getTheoreticalGamma(group) ?? 0;
  const processing = projectHeatCapacityTeachingResult(calculateFreeHeatCapacityMeanResult(
    group.runSeries.trials,
    { theoreticalGamma },
  ), group.calculation?.kind === 'real-interactive' || group.calculation?.kind === 'ideal-interactive'
    ? group.calculation.session : group.runSeries.batch.calculationSession);
  const points = processing.trialResults.flatMap((trial) => (
    trial.status === 'valid' && trial.gamma !== null
      ? [{
          trialId: trial.trialId,
          experimentNumber: trial.trialIndex,
          gamma: trial.gamma,
          completedAtMs: trial.completedAtMs,
        }]
      : []
  ));
  const publicTeachingValues = 'calculationRule' in processing && isHeatCapacitySequentialAnswerRule(processing.calculationRule);
  const visible = points.length >= 3 && (!publicTeachingValues || processing.meanGamma !== null);
  const includeUncertainty = evaluateHeatCapacityUncertaintyEligibility(group.scheme, group.gasType, group.parameterSnapshot).eligible;
  return {
    ...(publicTeachingValues ? { publicTeachingValues: true } : {}),
    groupId: group.id,
    scheme: group.scheme,
    gasType: group.gasType,
    schemeGroupNumber: group.schemeGroupNumber,
    targetExperimentCount: group.targetExperimentCount,
    completedExperimentCount: points.length,
    status: !visible
      ? 'hidden'
      : group.status === 'completed'
        ? 'completed'
        : group.status === 'legacy-incomplete-readonly'
          ? 'legacy-incomplete'
          : 'in-progress',
    points,
    theoreticalGamma,
    meanGamma: processing.meanGamma,
    sampleStandardDeviation: processing.sampleStandardDeviation,
    typeAStandardUncertainty: includeUncertainty ? processing.typeAStandardUncertainty : null,
    relativeErrorPercent: processing.relativeErrorPercent,
  };
};

export const createHeatCapacityFreeAllGroupsOverviewModel = (
  collection: HeatCapacityFreeExperimentGroupCollection,
): HeatCapacityFreeAllGroupsOverviewModel => {
  const chartModels = collection.groups
    .map(createHeatCapacityFreeGroupLollipopChartModel)
    .filter((model) => (
      model.status !== 'hidden' &&
      model.schemeGroupNumber !== null &&
      model.meanGamma !== null
    ));
  const theoryValues = chartModels
    .map((model) => model.theoreticalGamma)
    .filter((value) => Number.isFinite(value) && value > 0);
  const firstTheory = theoryValues[0] ?? null;
  const theoreticalGamma = firstTheory !== null && theoryValues.every((value) => (
    Math.abs(value - firstTheory) <= 1e-9
  ))
    ? firstTheory
    : null;
  return {
    theoreticalGamma,
    points: chartModels
      .map((model) => {
        const group = collection.groups.find((candidate) => candidate.id === model.groupId)!;
        return {
          ...(model.publicTeachingValues ? { publicTeachingValues: true } : {}),
          groupId: model.groupId,
          scheme: model.scheme,
          gasType: model.gasType,
          schemeGroupNumber: model.schemeGroupNumber!,
          globalOrder: group.globalOrder ?? Number.MAX_SAFE_INTEGER,
          meanGamma: model.meanGamma!,
          typeAStandardUncertainty: model.typeAStandardUncertainty,
          completedExperimentCount: model.completedExperimentCount,
          targetExperimentCount: model.targetExperimentCount,
          completed: model.status === 'completed',
          legacyIncomplete: model.status === 'legacy-incomplete',
        };
      })
      .sort((left, right) => (
        left.scheme === right.scheme
          ? left.schemeGroupNumber - right.schemeGroupNumber
          : left.scheme === 'real' ? -1 : 1
      )),
  };
};
