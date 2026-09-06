import type { WorkbenchHeatEffect } from './workbenchHeatEffect.ts';
import React from 'react';


export interface useWorkbenchHeatParameterProjectionPorts {
  heatCapacityRefreshRestorePendingRef: React.MutableRefObject<boolean>;
  heatCapacityModeTransitionStateRef: React.MutableRefObject<import('../heatCapacity/heatCapacityModeTransitionModel.ts').HeatCapacityModeTransitionState>;
  setHeatCapacityBasicInputDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setHeatCapacityBasicInputErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setHeatCapacityAdvancedOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setHeatCapacityAdvancedDraft: React.Dispatch<React.SetStateAction<import('../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts').HeatCapacityFreeParameterDraft | null>>;
  setHeatCapacityAdvancedInputDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setHeatCapacityAdvancedInputErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setHeatCapacityRestoreDefaultConfirmOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setHeatCapacityIdealIntroOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setParameterInputDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setHoveredHeatCapacityParamHelpId: React.Dispatch<React.SetStateAction<string | null>>;
  setPinnedHeatCapacityParamHelpId: React.Dispatch<React.SetStateAction<string | null>>;
  setHeatCapacityParamHelpPopoverStyle: React.Dispatch<React.SetStateAction<React.CSSProperties | undefined>>;
  activeFile: import('./workbenchFileUnion.ts').WorkbenchFileState;
}

export function useWorkbenchHeatParameterProjection({
  heatCapacityRefreshRestorePendingRef,
  heatCapacityModeTransitionStateRef,
  setHeatCapacityBasicInputDrafts,
  setHeatCapacityBasicInputErrors,
  setHeatCapacityAdvancedOpen,
  setHeatCapacityAdvancedDraft,
  setHeatCapacityAdvancedInputDrafts,
  setHeatCapacityAdvancedInputErrors,
  setHeatCapacityRestoreDefaultConfirmOpen,
  setHeatCapacityIdealIntroOpen,
  setParameterInputDrafts,
  setHoveredHeatCapacityParamHelpId,
  setPinnedHeatCapacityParamHelpId,
  setHeatCapacityParamHelpPopoverStyle,
  activeFile,
}: useWorkbenchHeatParameterProjectionPorts) {
const parameterProjectionEffect = { run: () => {
    if (heatCapacityRefreshRestorePendingRef.current) return;
    if (heatCapacityModeTransitionStateRef.current.phase !== 'idle') return;
    setHeatCapacityBasicInputDrafts({});
    setHeatCapacityBasicInputErrors({});
    setHeatCapacityAdvancedOpen(false);
    setHeatCapacityAdvancedDraft(null);
    setHeatCapacityAdvancedInputDrafts({});
    setHeatCapacityAdvancedInputErrors({});
    setHeatCapacityRestoreDefaultConfirmOpen(false);
    setHeatCapacityIdealIntroOpen(false);
    setParameterInputDrafts({});
    setHoveredHeatCapacityParamHelpId(null);
    setPinnedHeatCapacityParamHelpId(null);
    setHeatCapacityParamHelpPopoverStyle(undefined);
  }, dependencies: [activeFile.id] } satisfies WorkbenchHeatEffect;

  return {
    effects: { parameterProjection: parameterProjectionEffect },  };
}
