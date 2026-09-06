import { createWorkbenchParameterActions, type WorkbenchParameterActionPorts } from './workbenchParameterActions.ts';
import { createWorkbenchIdealExperimentActions, type WorkbenchIdealExperimentActionPorts } from './workbenchIdealExperimentActions.ts';
/** Relation and sampling edits use the same parameter commit/runtime reconstruction owner. */
export const useWorkbenchExperimentParameterActions = (ports: { parameters: WorkbenchParameterActionPorts; ideal: Omit<WorkbenchIdealExperimentActionPorts, 'applyActiveFileParams'> }) => {
  const parameterActions = createWorkbenchParameterActions(ports.parameters);
  const idealActions = createWorkbenchIdealExperimentActions({ ...ports.ideal, applyActiveFileParams: (params) => parameterActions.applyActiveFileParams(params) });
  return { ...parameterActions, ...idealActions };
};
