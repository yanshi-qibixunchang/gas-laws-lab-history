
import { transitionPistonOscillationFreeWorkbenchState } from './workbenchPistonOscillationState.ts';
import type { PistonOscillationFreeParameterDraft } from '../../domain/pistonOscillation/pistonOscillationFreeParameterConfig.ts';
import { getPistonOscillationParameterLockMessage } from '../pistonOscillation/PistonOscillationParameterPanel.tsx';

export interface createWorkbenchPistonParameterActionsPorts {
  activeFile: import("./workbenchFileUnion.ts").WorkbenchFileState;
  updateActiveFile: (updater: (file: import("./workbenchFileUnion.ts").WorkbenchFileState) => import("./workbenchFileUnion.ts").WorkbenchFileState) => void;
  showParameterSidebarBlockReason: (getMessage: (language: "zh-CN" | "zh-TW" | "en") => string | null) => void;
}

export const createWorkbenchPistonParameterActions = (ports: createWorkbenchPistonParameterActionsPorts) => {
  const { activeFile, updateActiveFile, showParameterSidebarBlockReason } = ports;
  const togglePistonOscillationOperationVisualization = () => {
    if (activeFile.kind !== 'heatCapacityPistonOscillation') return;
    setPistonOscillationOperationVisualization(
      !activeFile.pistonOscillationOperationVisualizationEnabled,
    );
  };

  const setPistonOscillationOperationVisualization = (enabled: boolean) => {
    updateActiveFile((file) => file.kind === 'heatCapacityPistonOscillation'
      ? {
          ...file,
          pistonOscillationOperationVisualizationEnabled: enabled,
          updatedAt: Date.now(),
        }
      : file);
  };

  const updatePistonOscillationFreeParameterDraft = (
    parameterDraft: PistonOscillationFreeParameterDraft,
  ) => {
    updateActiveFile((file) => file.kind === 'heatCapacityPistonOscillation'
      ? transitionPistonOscillationFreeWorkbenchState(file, {
          type: 'setParameterDraft',
          parameterDraft,
          nowMs: Date.now(),
        })
      : file);
  };

  const setPistonOscillationFreeExperimentScheme = (
    scheme: 'real' | 'ideal',
  ) => {
    updateActiveFile((file) => file.kind === 'heatCapacityPistonOscillation'
      ? transitionPistonOscillationFreeWorkbenchState(file, {
          type: 'setExperimentScheme',
          scheme,
          nowMs: Date.now(),
        })
      : file);
  };

  const setPistonOscillationFreeGasType = (
    gasType: 'air' | 'helium',
  ) => {
    updateActiveFile((file) => file.kind === 'heatCapacityPistonOscillation'
      ? transitionPistonOscillationFreeWorkbenchState(file, {
          type: 'setGasType',
          gasType,
          nowMs: Date.now(),
        })
      : file);
  };

  const restorePistonOscillationFreeParameters = () => {
    updateActiveFile((file) => file.kind === 'heatCapacityPistonOscillation'
      ? {
          ...transitionPistonOscillationFreeWorkbenchState(file, {
            type: 'restoreDefaultParameters',
            nowMs: Date.now(),
          }),
          pistonOscillationOperationVisualizationEnabled: false,
          updatedAt: Date.now(),
        }
      : file);
  };

  const acknowledgePistonOscillationAdvancedParametersRisk = () => {
    updateActiveFile((file) => file.kind === 'heatCapacityPistonOscillation'
      ? transitionPistonOscillationFreeWorkbenchState(file, {
          type: 'acknowledgeAdvancedParametersRisk',
          nowMs: Date.now(),
        })
      : file);
  };

  const showPistonOscillationParameterLockHint = () => {
    if (activeFile.kind !== 'heatCapacityPistonOscillation') return;
    showParameterSidebarBlockReason((language) => (
      getPistonOscillationParameterLockMessage(
        activeFile.pistonOscillationFreeSession,
        language,
      )
    ));
  };
  return { togglePistonOscillationOperationVisualization, setPistonOscillationOperationVisualization, updatePistonOscillationFreeParameterDraft, setPistonOscillationFreeExperimentScheme, setPistonOscillationFreeGasType, restorePistonOscillationFreeParameters, acknowledgePistonOscillationAdvancedParametersRisk, showPistonOscillationParameterLockHint };
};
