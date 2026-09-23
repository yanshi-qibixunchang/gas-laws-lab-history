import type { HeatCapacityCalculationWorkflowSession } from './heatCapacityCalculationWorkflowModel.ts';
import type { HeatCapacityFreeProcessingResult } from './heatCapacityFreeTrialModel.ts';
import { isHeatCapacitySequentialAnswerRule } from './heatCapacityCalculationValidation.ts';

/** Student-facing results use only checked values from the current worksheet. */
export const projectHeatCapacityTeachingResult = (
  raw: HeatCapacityFreeProcessingResult,
  session: HeatCapacityCalculationWorkflowSession | null | undefined,
) => {
  if (!session || !isHeatCapacitySequentialAnswerRule(session.answerRule)) return raw;
  const aggregate = session.aggregate;
  const checked = (suffix: string) => {
    const field = aggregate?.fields.find(item => item.id === `aggregate:${suffix}`);
    return field && field.answer.status !== 'unresolved' ? field.expectedValue : null;
  };
  const trialResults = raw.trialResults.map(trial => {
    const group = session.groups.find(item => item.trialId === trial.trialId);
    if (!group) return trial;
    const value = (suffix: string) => {
      const field = group.fields.find(item => item.id.endsWith(`:${suffix}`));
      return field && field.answer.status !== 'unresolved' ? field.expectedValue : null;
    };
    return { ...trial, calculationRule: session.answerRule, U0DisplayMv: group.reference.u0Mv, p0KPa: group.reference.p0KPa, p1KPa: value('p1'), p2KPa: value('p2'),
      U1CorrectedMv: value('u1Prime'), U2CorrectedMv: value('u2Prime'),
      gamma: value('gamma'), formulaGamma: value('gamma'), preheatBiasGamma: null };
  });
  return { ...raw, trialResults, meanGamma: checked('meanGamma'),
    sampleStandardDeviation: checked('sampleStandardDeviation'),
    typeAStandardUncertainty: checked('typeAStandardUncertainty'), relativeErrorPercent: checked('relativeError'),
    sumSquaredDeviations: checked('meanGamma') !== null && aggregate?.fields.some(field => field.answerKind === 'sampleStandardDeviation')
      ? aggregate.reference.sumSquaredDeviations : null,
    reportMeanGamma: checked('reportMeanGamma'), reportTypeA: checked('reportTypeA'),
    voltageInstrumentStandardUncertaintyMv: aggregate?.reference.voltageInstrumentStandardUncertaintyMv,
    propagationCoefficient: aggregate?.reference.propagationCoefficient,
    typeBStandardUncertainty: checked('typeBStandardUncertainty'),
    combinedStandardUncertainty: checked('combinedStandardUncertainty'),
    reportCombined: checked('reportCombined'),
    reportDecimalPlaces: aggregate?.reference.reportDecimalPlaces,
    uncertaintyScope: aggregate?.fields.some(field => field.answerKind === 'combinedStandardUncertainty')
      ? 'repeat-measurement-and-voltage-instrument' : aggregate?.fields.some(field => field.answerKind === 'typeAStandardUncertainty') ? 'repeat-measurement-type-a-only' : null,
    calculationRule: session.answerRule,
    calculationComplete: session.status === 'completed',
  };
};
