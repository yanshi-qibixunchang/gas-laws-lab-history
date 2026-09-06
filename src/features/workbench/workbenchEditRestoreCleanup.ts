import type { WorkbenchMutableRef as Ref, WorkbenchStateSetter as Setter } from './workbenchActionPorts.ts';
export interface WorkbenchEditRestoreCleanupPorts { setParameterInputDrafts: Setter<Record<string, string>>; setParameterErrors: Setter<string[]>; setIdealAdvancedSettingsOpen: Setter<boolean>; setIdealAdvancedSettingsBodyVisible: Setter<boolean>; setOpenFileMenuId: Setter<string | null>; setPendingDeleteFileId: Setter<string | null>; setPendingRemovePointId: Setter<string | null>; setPendingClearRelationKey: Setter<string | null>; cancelPistonOscillationFreeSetup: () => void; renamingFileIdRef: Ref<string | null>; setRenamingFileId: Setter<string | null>; setRenameDraft: Setter<string>; setOpenTopMenu: (value: null) => void; }
export const createWorkbenchEditRestoreCleanup = (ports: WorkbenchEditRestoreCleanupPorts) => {
 const { setParameterInputDrafts, setParameterErrors, setIdealAdvancedSettingsOpen, setIdealAdvancedSettingsBodyVisible, setOpenFileMenuId, setPendingDeleteFileId, setPendingRemovePointId, setPendingClearRelationKey, cancelPistonOscillationFreeSetup, renamingFileIdRef, setRenamingFileId, setRenameDraft, setOpenTopMenu } = ports;
 const clearEditRestoreTransientUi = () => {
    setParameterInputDrafts({});
    setParameterErrors([]);
    setIdealAdvancedSettingsOpen(false);
    setIdealAdvancedSettingsBodyVisible(false);
    setOpenFileMenuId(null);
    setPendingDeleteFileId(null);
    setPendingRemovePointId(null);
    setPendingClearRelationKey(null);
    cancelPistonOscillationFreeSetup();
    renamingFileIdRef.current = null;
    setRenamingFileId(null);
    setRenameDraft('');
    setOpenTopMenu(null);
  };
 return { clearEditRestoreTransientUi };
};
