import type { SimulationParams } from '../../shared/types.ts';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import type { WorkbenchCopy } from './workbenchStudioCopy.ts';
import { isVariableKeyForRelation, type ExperimentParamKey } from '../../domain/idealGas/idealGasExperiment.ts';
import { getChangedIdealParamKeys } from './workbenchIdealParameterState.ts';
import { areWorkbenchParamsEqual } from './workbenchParameterState.ts';
export const selectWorkbenchParameterInteractionPresentation = (activeFile: WorkbenchFileState, workbenchCopy: WorkbenchCopy) => {
 const parametersDirty = !areWorkbenchParamsEqual(activeFile.params, activeFile.appliedParams);
  const parameterControlsLocked = activeFile.runState === 'running' || activeFile.runState === 'paused';
  const currentParameterControlsLocked = activeFile.kind === 'heatCapacityPistonOscillation'
    ? false
    : activeFile.kind === 'heatCapacity' && activeFile.heatCapacityMode === 'free'
      ? false
      : parameterControlsLocked;
  const controlledVariableLockHint = workbenchCopy.parameters.controlledLockHint;
  const currentIdealRelationHasPoints = activeFile.kind === 'ideal' && activeFile.pointsByRelation[activeFile.relation].length > 0;
  const isIdealControlledVariableLocked = (
    key: keyof SimulationParams | 'relation',
  ) => (
    activeFile.kind === 'ideal'
    && currentIdealRelationHasPoints
    && key !== 'relation'
    && !isVariableKeyForRelation(activeFile.relation, key as ExperimentParamKey)
  );
  const getLockedIdealControlledVariableKeys = (nextParams: SimulationParams): ExperimentParamKey[] => (
    activeFile.kind === 'ideal' && currentIdealRelationHasPoints
      ? getChangedIdealParamKeys(activeFile.params, nextParams).filter((key) => !isVariableKeyForRelation(activeFile.relation, key))
      : []
  );
 return { parametersDirty, parameterControlsLocked, currentParameterControlsLocked, controlledVariableLockHint, currentIdealRelationHasPoints, isIdealControlledVariableLocked, getLockedIdealControlledVariableKeys };
};
