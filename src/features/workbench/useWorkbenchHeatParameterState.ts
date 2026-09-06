import type React from 'react';
import { useState, useRef } from 'react';
import { getHeatCapacityRefreshStringMap, getHeatCapacityRefreshBoolean, getHeatCapacityRefreshObject, getHeatCapacityRefreshString } from './workbenchHeatCapacityUiCheckpoint.ts';
import { type HeatCapacityFreeParameterDraft } from '../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts';

export interface useWorkbenchHeatParameterStatePorts {
  initialHeatCapacityRefreshDrafts: import('../heatCapacity/heatCapacityModeUiCheckpoint.ts').HeatCapacityModeJsonObject;
  initialHeatCapacityRefreshWindows: import('../heatCapacity/heatCapacityModeUiCheckpoint.ts').HeatCapacityModeJsonObject;
}

export function useWorkbenchHeatParameterState({
  initialHeatCapacityRefreshDrafts,
  initialHeatCapacityRefreshWindows,
}: useWorkbenchHeatParameterStatePorts) {
const [heatCapacityBasicInputDrafts, setHeatCapacityBasicInputDrafts] = useState<Record<string, string>>(() => (
    getHeatCapacityRefreshStringMap(initialHeatCapacityRefreshDrafts, 'heatCapacityBasicInputDrafts')
  ));

const [heatCapacityBasicInputErrors, setHeatCapacityBasicInputErrors] = useState<Record<string, string>>(() => (
    getHeatCapacityRefreshStringMap(initialHeatCapacityRefreshDrafts, 'heatCapacityBasicInputErrors')
  ));

const [heatCapacityAdvancedOpen, setHeatCapacityAdvancedOpen] = useState(() => (
    getHeatCapacityRefreshBoolean(initialHeatCapacityRefreshWindows, 'heatCapacityAdvancedOpen')
  ));

const [heatCapacityAdvancedDraft, setHeatCapacityAdvancedDraft] = useState<HeatCapacityFreeParameterDraft | null>(() => {
    const restored = getHeatCapacityRefreshObject(initialHeatCapacityRefreshDrafts, 'heatCapacityAdvancedDraft');
    return restored as unknown as HeatCapacityFreeParameterDraft | null;
  });

const [heatCapacityAdvancedInputDrafts, setHeatCapacityAdvancedInputDrafts] = useState<Record<string, string>>(() => (
    getHeatCapacityRefreshStringMap(initialHeatCapacityRefreshDrafts, 'heatCapacityAdvancedInputDrafts')
  ));

const [heatCapacityAdvancedInputErrors, setHeatCapacityAdvancedInputErrors] = useState<Record<string, string>>(() => (
    getHeatCapacityRefreshStringMap(initialHeatCapacityRefreshDrafts, 'heatCapacityAdvancedInputErrors')
  ));

const [heatCapacityRestoreDefaultConfirmOpen, setHeatCapacityRestoreDefaultConfirmOpen] = useState(false);

const [heatCapacityIdealIntroOpen, setHeatCapacityIdealIntroOpen] = useState(false);

const [hoveredHeatCapacityParamHelpId, setHoveredHeatCapacityParamHelpId] = useState<string | null>(null);

const [pinnedHeatCapacityParamHelpId, setPinnedHeatCapacityParamHelpId] = useState<string | null>(() => (
    getHeatCapacityRefreshString(initialHeatCapacityRefreshWindows, 'pinnedHeatCapacityParamHelpId')
  ));

const [heatCapacityParamHelpPopoverStyle, setHeatCapacityParamHelpPopoverStyle] = useState<
    React.CSSProperties | undefined
  >(undefined);

const heatCapacityParamHelpSuppressClickRef = useRef(false);

  const closeHeatCapacityParameterWindows = () => {
    setHeatCapacityAdvancedOpen(false);
    setHeatCapacityRestoreDefaultConfirmOpen(false);
    setHeatCapacityIdealIntroOpen(false);
    setPinnedHeatCapacityParamHelpId(null);
    setHoveredHeatCapacityParamHelpId(null);
    setHeatCapacityParamHelpPopoverStyle(undefined);
  };

  return { closeHeatCapacityParameterWindows, heatCapacityBasicInputDrafts, setHeatCapacityBasicInputDrafts, heatCapacityBasicInputErrors, setHeatCapacityBasicInputErrors, heatCapacityAdvancedOpen, setHeatCapacityAdvancedOpen, heatCapacityAdvancedDraft, setHeatCapacityAdvancedDraft, heatCapacityAdvancedInputDrafts, setHeatCapacityAdvancedInputDrafts, heatCapacityAdvancedInputErrors, setHeatCapacityAdvancedInputErrors, heatCapacityRestoreDefaultConfirmOpen, setHeatCapacityRestoreDefaultConfirmOpen, heatCapacityIdealIntroOpen, setHeatCapacityIdealIntroOpen, hoveredHeatCapacityParamHelpId, setHoveredHeatCapacityParamHelpId, pinnedHeatCapacityParamHelpId, setPinnedHeatCapacityParamHelpId, heatCapacityParamHelpPopoverStyle, setHeatCapacityParamHelpPopoverStyle, heatCapacityParamHelpSuppressClickRef };
}
