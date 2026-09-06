import type { SimulationParams } from '../../shared/types.ts';
import type { ExperimentParamKey, IdealGasAnalysis } from '../../domain/idealGas/idealGasExperiment.ts';
import type { WorkbenchIdealState } from './workbenchFileState.ts';
import { WORKBENCH_TRACKED_PARAMETER_KEYS } from './workbenchParameterRegistry.ts';

export const getChangedIdealParamKeys = (
  previousParams: SimulationParams,
  nextParams: SimulationParams,
): ExperimentParamKey[] => (
  WORKBENCH_TRACKED_PARAMETER_KEYS.filter((key) => {
    const previousValue = previousParams[key as keyof SimulationParams];
    const nextValue = nextParams[key as keyof SimulationParams];
    return previousValue !== nextValue;
  })
);

export const getIdealVerificationState = (
  analysis: IdealGasAnalysis,
): WorkbenchIdealState['verificationState'] => {
  if (analysis.isVerified) return 'verified';
  if (analysis.verdictState === 'insufficient') return 'collecting';
  return analysis.sortedPoints.length === 0 ? 'not-started' : 'failed';
};
