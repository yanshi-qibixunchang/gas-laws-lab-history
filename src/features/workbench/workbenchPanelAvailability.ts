import { type WorkbenchPanelKey } from './workbenchFileState.ts';
import { type WorkbenchFileState } from './workbenchFileUnion.ts';
import { isHeatCapacityPanelKey, getPistonOscillationMaterialsPanelOrder } from './workbenchHeatCapacityTabRegistry.ts';

export const LOCKED_PANEL_KEYS: WorkbenchPanelKey[] = ['preview', 'realtime'];

export const isPistonOscillationUnavailableMaterialsPanelKey = (
  file: WorkbenchFileState,
  panel: WorkbenchPanelKey,
) => {
  if (
    file.kind !== 'heatCapacityPistonOscillation'
    || !isHeatCapacityPanelKey(panel)
  ) return false;
  return !getPistonOscillationMaterialsPanelOrder(file).includes(panel);
};

export const shouldCollapseWorkbenchParameterSidebar = (
  file: WorkbenchFileState | undefined,
) => (
  file?.kind === 'heatCapacity' ||
  file?.kind === 'heatCapacityPistonOscillation'
);
