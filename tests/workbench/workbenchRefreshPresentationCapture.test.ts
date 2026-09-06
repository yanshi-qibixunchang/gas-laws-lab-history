import assert from 'node:assert/strict';
import { createWorkbenchRefreshPresentationCapture, type WorkbenchRefreshPresentationCapturePorts } from '../../src/features/workbench/workbenchRefreshPresentationCapture.ts';
const ports: WorkbenchRefreshPresentationCapturePorts = {
  windows: Object.freeze({ openTopMenu: 'help', topMenuLeft: 10, settingsGeneralOpen: false, aboutWindowOpen: true, buildNoticeWindowOpen: false, buildNoticeNavOpen: false, activeBuildNoticeMaterialId: null, buildNoticeFilePreview: null, buildNoticeOpenError: null, aboutResultNotice: null, updateDialogOpen: false, settingsLanguageMenuOpen: false, openFileMenuId: null, renamingFileId: 'file-a', samplingPresetMenuOpen: false, idealAdvancedSettingsOpen: true, idealAdvancedSettingsBodyVisible: true }),
  drafts: Object.freeze({ renameDraft: 'new name', parameterInputDrafts: { N: '600' }, parameterErrors: [], scanInputDraft: '1.20', scanInputError: null, scanInputToast: null }),
  layout: Object.freeze({ selectedFileId: 'file-a', selectedPanel: 'preview', logs: [], consoleTab: 'summary', consoleCollapsed: false, consoleHeightPx: 156, leftCollapsed: false, parametersCollapsed: true, leftSidebarWidth: 260, parameterSidebarWidth: 280, filesSectionCollapsed: false, panelsSectionCollapsed: true, resultsChildrenCollapsed: false }),
  consoleBodyRef: { current: { scrollTop: 12 } }, currentParametersBodyRef: { current: { scrollTop: 80 } }, renameInputRef: { current: { selectionStart: 0, selectionEnd: 3 } },
};
const capture = createWorkbenchRefreshPresentationCapture(ports);
const first = capture();
assert.equal(first.windows, ports.windows); assert.equal(first.drafts, ports.drafts);
assert.deepEqual(first.layout, { ...ports.layout, consoleScrollTop: 12, currentParametersScrollTop: 80, renameSelectionStart: 0, renameSelectionEnd: 3 });
ports.consoleBodyRef.current = { scrollTop: 42 };
ports.currentParametersBodyRef.current = { scrollTop: 0 };
ports.renameInputRef.current = { selectionStart: 4, selectionEnd: 8 };
const later = capture();
assert.equal(later.layout.consoleScrollTop, 42, 'DOM positions are captured when saving, not during render');
assert.equal(later.layout.currentParametersScrollTop, 0); assert.equal(later.layout.renameSelectionStart, 4);
assert.equal(later.layout.selectedFileId, 'file-a'); assert.equal(first.layout.consoleScrollTop, 12, 'a later capture does not mutate an earlier snapshot');
ports.consoleBodyRef.current = null; ports.currentParametersBodyRef.current = null; ports.renameInputRef.current = null;
assert.deepEqual(capture().layout, { ...ports.layout, consoleScrollTop: 0, currentParametersScrollTop: 0, renameSelectionStart: null, renameSelectionEnd: null });
console.log('workbenchRefreshPresentationCapture tests passed');
