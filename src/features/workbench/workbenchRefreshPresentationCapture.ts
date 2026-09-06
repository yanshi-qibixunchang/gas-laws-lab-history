import type { useWorkbenchAuxiliaryWindows } from './useWorkbenchAuxiliaryWindows.ts';
import type { useWorkbenchLayoutState } from './useWorkbenchLayoutState.ts';
import type { useWorkbenchUpdaterController } from './useWorkbenchUpdaterController.ts';
import type { useWorkbenchSettingsPreferences } from './useWorkbenchSettingsPreferences.ts';
import type { useWorkbenchFileTreeState } from './useWorkbenchFileTreeState.ts';
import type { useWorkbenchParameterInteractionState } from './useWorkbenchParameterInteractionState.ts';
import type { useWorkbenchConsoleState } from './useWorkbenchConsoleState.ts';
import type { WorkbenchPanelKey } from './workbenchFileState.ts';

export type WorkbenchRefreshWindows = Pick<ReturnType<typeof useWorkbenchAuxiliaryWindows>['view'], 'settingsGeneralOpen' | 'aboutWindowOpen' | 'buildNoticeWindowOpen' | 'buildNoticeNavOpen' | 'activeBuildNoticeMaterialId' | 'buildNoticeFilePreview' | 'buildNoticeOpenError' | 'aboutResultNotice'> &
  Pick<ReturnType<typeof useWorkbenchLayoutState>, 'openTopMenu' | 'topMenuLeft'> &
  Pick<ReturnType<typeof useWorkbenchUpdaterController>, 'updateDialogOpen'> &
  Pick<ReturnType<typeof useWorkbenchSettingsPreferences>, 'settingsLanguageMenuOpen'> &
  Pick<ReturnType<typeof useWorkbenchFileTreeState>, 'openFileMenuId' | 'renamingFileId'> &
  Pick<ReturnType<typeof useWorkbenchParameterInteractionState>, 'samplingPresetMenuOpen' | 'idealAdvancedSettingsOpen' | 'idealAdvancedSettingsBodyVisible'>;
export type WorkbenchRefreshDrafts = Pick<ReturnType<typeof useWorkbenchFileTreeState>, 'renameDraft'> &
  Pick<ReturnType<typeof useWorkbenchParameterInteractionState>, 'parameterInputDrafts' | 'parameterErrors' | 'scanInputDraft' | 'scanInputError' | 'scanInputToast'>;
export type WorkbenchRefreshLayout = Pick<ReturnType<typeof useWorkbenchFileTreeState>, 'selectedFileId' | 'filesSectionCollapsed' | 'panelsSectionCollapsed' | 'resultsChildrenCollapsed'> &
  Pick<ReturnType<typeof useWorkbenchConsoleState>, 'logs' | 'consoleTab' | 'consoleCollapsed' | 'consoleHeightPx'> &
  Pick<ReturnType<typeof useWorkbenchLayoutState>, 'leftCollapsed' | 'parametersCollapsed' | 'leftSidebarWidth' | 'parameterSidebarWidth'> & { selectedPanel: WorkbenchPanelKey };
export interface WorkbenchRefreshPresentationCapturePorts {
  windows: WorkbenchRefreshWindows;
  drafts: WorkbenchRefreshDrafts;
  layout: WorkbenchRefreshLayout;
  consoleBodyRef: { current: Pick<HTMLDivElement, 'scrollTop'> | null };
  currentParametersBodyRef: { current: Pick<HTMLDivElement, 'scrollTop'> | null };
  renameInputRef: { current: Pick<HTMLInputElement, 'selectionStart' | 'selectionEnd'> | null };
}
/** Capture DOM positions when saving, while retaining the current render's state values. */
export const createWorkbenchRefreshPresentationCapture = ({ windows, drafts, layout, consoleBodyRef, currentParametersBodyRef, renameInputRef }: WorkbenchRefreshPresentationCapturePorts) => () => ({
  windows,
  drafts,
  layout: {
    ...layout,
    consoleScrollTop: consoleBodyRef.current?.scrollTop ?? 0,
    currentParametersScrollTop: currentParametersBodyRef.current?.scrollTop ?? 0,
    renameSelectionStart: renameInputRef.current?.selectionStart ?? null,
    renameSelectionEnd: renameInputRef.current?.selectionEnd ?? null,
  },
});
export type WorkbenchRefreshPresentation = ReturnType<ReturnType<typeof createWorkbenchRefreshPresentationCapture>>;
