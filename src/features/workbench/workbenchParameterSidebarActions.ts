import type { WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import type { WorkbenchStateSetter as Setter, WorkbenchLogWriter } from './workbenchActionPorts.ts';
import { canOpenHeatCapacityParameterSidebar, getHeatCapacityParameterSidebarBlockReason, shouldPromptHeatCapacityFreePowerOffBeforeNextGroup } from './workbenchHeatCapacityFreeParameterState.ts';
import { getHeatCapacityRealtimeCopy } from './workbenchHeatCapacityRealtimeCopy.ts';
import { getHeatCapacityFreeParameterLockMessage } from './workbenchParameterPresentation.ts';
export const createWorkbenchParameterSidebarActions = (ports: { activeFile: WorkbenchFileState; activePistonOscillationParameterSidebarAvailable: boolean; settingsLanguagePreference: WorkbenchLanguagePreference; setScanInputToast: Setter<string | null>; pushLog: WorkbenchLogWriter; setParametersCollapsed: Setter<boolean>; getPistonOscillationParameterSidebarFreeOnlyMessage: (language: WorkbenchLanguagePreference) => string; }) => {
 const { activeFile, activePistonOscillationParameterSidebarAvailable, settingsLanguagePreference, setScanInputToast, pushLog, setParametersCollapsed, getPistonOscillationParameterSidebarFreeOnlyMessage } = ports;
 const showParameterSidebarBlockReason = (
    getMessage: (language: WorkbenchLanguagePreference) => string | null,
  ) => {
    const message = getMessage(settingsLanguagePreference);
    if (!message) return;
    setScanInputToast(message);
    pushLog((language) => `${activeFile.name}: ${getMessage(language) ?? message}`, 'warning');
  };
  const openParameterSidebarFromRail = () => {
    if (
      activeFile.kind === 'heatCapacityPistonOscillation'
      && !activePistonOscillationParameterSidebarAvailable
    ) {
      showParameterSidebarBlockReason(
        getPistonOscillationParameterSidebarFreeOnlyMessage,
      );
      return;
    }
    if (shouldPromptHeatCapacityFreePowerOffBeforeNextGroup(activeFile)) {
      showParameterSidebarBlockReason(
        (language) => getHeatCapacityRealtimeCopy(language).freePowerOffBeforeNextGroup,
      );
      return;
    }
    if (!canOpenHeatCapacityParameterSidebar(activeFile)) {
      const blockReason = getHeatCapacityParameterSidebarBlockReason(activeFile);
      showParameterSidebarBlockReason(
        (language) => getHeatCapacityFreeParameterLockMessage(blockReason, language),
      );
      return;
    }
    setParametersCollapsed(false);
  };
 return { showParameterSidebarBlockReason, openParameterSidebarFromRail };
};
