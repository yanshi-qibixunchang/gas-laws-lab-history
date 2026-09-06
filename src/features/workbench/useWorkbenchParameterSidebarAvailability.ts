import { useEffect } from 'react';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import { canOpenHeatCapacityParameterSidebar } from './workbenchHeatCapacityFreeParameterState.ts';
import type { WorkbenchStateSetter as Setter } from './workbenchActionPorts.ts';
export interface WorkbenchParameterSidebarAvailabilityPorts { activeFile: WorkbenchFileState; activePistonOscillationParameterSidebarAvailable: boolean; setParametersCollapsed: Setter<boolean>; setIdealAdvancedSettingsOpen: Setter<boolean>; setIdealAdvancedSettingsBodyVisible: Setter<boolean>; closeHeatCapacityParameterWindows: () => void; }
export const synchronizeWorkbenchParameterSidebarAvailability = (ports: WorkbenchParameterSidebarAvailabilityPorts) => {
 const { activeFile, activePistonOscillationParameterSidebarAvailable, setParametersCollapsed, setIdealAdvancedSettingsOpen, setIdealAdvancedSettingsBodyVisible, closeHeatCapacityParameterWindows } = ports;

    if (activeFile.kind === 'heatCapacityPistonOscillation') {
      if (!activePistonOscillationParameterSidebarAvailable) {
        setParametersCollapsed(true);
      }
      setIdealAdvancedSettingsOpen(false);
      setIdealAdvancedSettingsBodyVisible(false);
      return;
    }
    if (!canOpenHeatCapacityParameterSidebar(activeFile)) {
      setParametersCollapsed(true);
      closeHeatCapacityParameterWindows();
    }

};
export const useWorkbenchParameterSidebarAvailability = (ports: WorkbenchParameterSidebarAvailabilityPorts) => {
 const { activeFile, activePistonOscillationParameterSidebarAvailable } = ports;
 useEffect(() => synchronizeWorkbenchParameterSidebarAvailability(ports), [
    activeFile.kind,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null,
    activePistonOscillationParameterSidebarAvailable,
  ]);
};
