import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useWorkbenchLayoutState } from '../../src/features/workbench/useWorkbenchLayoutState.ts';
import { useWorkbenchFileTreeState } from '../../src/features/workbench/useWorkbenchFileTreeState.ts';
import { useWorkbenchParameterInteractionState } from '../../src/features/workbench/useWorkbenchParameterInteractionState.ts';
import { useWorkbenchEditHistoryState } from '../../src/features/workbench/useWorkbenchEditHistoryState.ts';
import { useWorkbenchConsoleState } from '../../src/features/workbench/useWorkbenchConsoleState.ts';
import { useWorkbenchConsoleProjection } from '../../src/features/workbench/useWorkbenchConsoleProjection.ts';
import { resolveInitialWorkbenchConsoleLogs, createWorkbenchConsoleActions } from '../../src/features/workbench/workbenchConsoleState.ts';
import { selectWorkbenchLayoutPresentation } from '../../src/features/workbench/workbenchLayoutPresentation.ts';
import { createDefaultStandardFile, createDefaultIdealFile } from '../../src/features/workbench/workbenchFileState.ts';
import { createConsoleLog, type ConsoleLog } from '../../src/features/workbench/workbenchConsolePresentation.ts';
import { workbenchCopies } from '../../src/features/workbench/workbenchStudioCopy.ts';

const renderHook = <T,>(useValue: () => T): T => {
  let value: T | undefined;
  const Probe = () => { value = useValue(); return null; };
  renderToStaticMarkup(createElement(Probe));
  assert.notEqual(value, undefined);
  return value as T;
};
const file = createDefaultStandardFile(1);
const layoutPorts = {
  initialHeatCapacityRefreshLayout: {}, initialHeatCapacityRefreshWindows: {},
  initialWorkbenchSidebarRefreshState: { schemaVersion: 1 as const, leftCollapsed: true, parametersCollapsed: false },
};
const defaults = renderHook(() => useWorkbenchLayoutState(layoutPorts));
assert.equal(defaults.leftCollapsed, true);
assert.equal(defaults.parametersCollapsed, false);
assert.equal(defaults.leftSidebarWidth, 286);
assert.equal(defaults.parameterSidebarWidth, 300);
assert.equal(defaults.openTopMenu, null);
assert.equal(defaults.topMenuLeft, 10);
for (const [key, value] of Object.entries(defaults)) if (key.endsWith('Ref')) assert.equal((value as { current: unknown }).current, null, key);
const restored = renderHook(() => useWorkbenchLayoutState({ ...layoutPorts,
  initialHeatCapacityRefreshLayout: { leftCollapsed: false, parametersCollapsed: true, leftSidebarWidth: -1, parameterSidebarWidth: 1e9 },
  initialHeatCapacityRefreshWindows: { openTopMenu: 'edit', topMenuLeft: 123 },
}));
assert.equal(restored.leftCollapsed, false, 'the full refresh checkpoint takes precedence over sidebar cache');
assert.equal(restored.parametersCollapsed, true);
assert.equal(restored.leftSidebarWidth, 220);
assert.equal(restored.parameterSidebarWidth, 420);
assert.equal(restored.openTopMenu, 'edit');
assert.equal(restored.topMenuLeft, 123);
const treePorts = { initialSession: { files: [file], activeFileId: file.id }, initialHeatCapacityRefreshLayout: {}, initialHeatCapacityRefreshWindows: {}, initialHeatCapacityRefreshDrafts: {} };
const tree = renderHook(() => useWorkbenchFileTreeState({ ...treePorts,
  initialHeatCapacityRefreshLayout: { selectedFileId: 'missing', filesSectionCollapsed: true, resultsChildrenCollapsed: true },
  initialHeatCapacityRefreshWindows: { openFileMenuId: file.id, renamingFileId: file.id }, initialHeatCapacityRefreshDrafts: { renameDraft: 'draft' },
}));
assert.equal(tree.selectedFileId, file.id);
assert.equal(tree.filesSectionCollapsed, true);
assert.equal(tree.resultsChildrenCollapsed, true);
assert.equal(tree.renamingFileIdRef.current, file.id);
assert.equal(tree.renameDraft, 'draft');
assert.equal(tree.pendingDeleteFileId, null);
assert.equal(tree.renameSelectionModeRef.current, 'normal');
const inputs = renderHook(useWorkbenchParameterInteractionState);
assert.deepEqual(inputs.parameterInputDrafts, {});
assert.deepEqual(inputs.parameterErrors, []);
assert.equal(inputs.idealAdvancedSettingsOpen, false);
assert.equal(inputs.idealAdvancedSettingsBodyVisible, false);
assert.equal(inputs.scanInputDraft, '');
assert.equal(inputs.scanInputError, null);
assert.equal(inputs.scanInputToast, null);
assert.equal(inputs.pendingClearRelationKey, null);
assert.equal(inputs.idealAdvancedSettingsPreviousScrollTopRef.current, 0);
const history = renderHook(useWorkbenchEditHistoryState);
assert.strictEqual(history.undoStackRef.current, history.undoStack);
assert.strictEqual(history.redoStackRef.current, history.redoStack);
assert.deepEqual(history.undoStack, []);

const original: ConsoleLog = { id: 17, time: '12:00', kind: 'warning', message: 'saved', messages: { en: 'saved', 'zh-CN': '保存', 'zh-TW': '儲存' } };
const tutorial = [createConsoleLog(1, 'info', 'tutorial', 'en')]; let tutorialCalls = 0;
const noRestore = resolveInitialWorkbenchConsoleLogs(undefined, 'en', () => { tutorialCalls += 1; return tutorial; });
assert.equal(tutorialCalls, 0, 'missing stored logs use original default-log precedence before tutorial override');
assert.equal(noRestore[0]!.message, workbenchCopies.en.logs.initialized);
assert.strictEqual(resolveInitialWorkbenchConsoleLogs([], 'en', () => tutorial), tutorial);
const normalized = resolveInitialWorkbenchConsoleLogs([null, {}, { ...original, kind: 'invalid' }, original], 'en');
assert.deepEqual(normalized, [original]);
assert.notStrictEqual(normalized[0], original);
assert.equal(resolveInitialWorkbenchConsoleLogs([], 'zh-CN')[0]!.message, workbenchCopies['zh-CN'].logs.initialized);
let logs = [original]; const tutorialActiveRef = { current: false };
const { pushLog } = createWorkbenchConsoleActions({ tutorialActiveRef, settingsLanguagePreference: 'zh-CN', setLogs: update => { logs = typeof update === 'function' ? update(logs) : update; } });
pushLog(language => workbenchCopies[language].logs.initialized, 'success');
assert.equal(logs[1]!.id, 2); assert.equal(logs[1]!.message, workbenchCopies['zh-CN'].logs.initialized);
const beforeTutorial = logs; tutorialActiveRef.current = true; pushLog('suppressed'); assert.strictEqual(logs, beforeTutorial);
tutorialActiveRef.current = false; pushLog('resumed'); assert.equal(logs[2]!.id, 3);
const consoleState = renderHook(() => useWorkbenchConsoleState({ initialHeatCapacityRefreshLayout: { logs: [{ ...original }], consoleTab: 'warnings', consoleCollapsed: true, consoleHeightPx: 201 }, initialLanguage: 'en', getTutorialLogs: () => null }));
assert.deepEqual(consoleState.logs, [original]); assert.equal(consoleState.consoleTab, 'warnings'); assert.equal(consoleState.consoleCollapsed, true); assert.equal(consoleState.consoleHeightPx, 201);
const projection = renderHook(() => useWorkbenchConsoleProjection({ logs, consoleTab: 'warnings', activeFile: file, idealAnalysis: null, isWorkbenchEmpty: false, workbenchCopy: workbenchCopies.en }));
assert.deepEqual(projection.displayedLogs, [original]); assert.strictEqual(projection.consoleSummary.latest, logs[2]);
assert.deepEqual(projection.consoleSummary.counts, { info: 1, success: 1, warning: 1, error: 0 }); assert.equal(projection.consoleSummary.runtime, workbenchCopies.en.status.standardRuntime);
const ordinary = renderHook(() => useWorkbenchConsoleProjection({ logs, consoleTab: 'logs', activeFile: createDefaultIdealFile(2), idealAnalysis: null, isWorkbenchEmpty: true, workbenchCopy: workbenchCopies.en }));
assert.strictEqual(ordinary.displayedLogs, logs); assert.equal(ordinary.consoleSummary.runtime, workbenchCopies.en.status.noRuntime);
const css = selectWorkbenchLayoutPresentation({ activeFile: { liveWorkspaceSplitRatio: 9 }, leftSidebarWidth: 286, parameterSidebarWidth: 300, consoleCollapsed: true, consoleHeightPx: 201 });
assert.equal(css.liveWorkspaceSplitRatio, 0.66); assert.equal(css.liveWorkspaceStyle['--studio-live-preview-ratio'], '66.000%');
assert.equal(css.shellStyle['--studio-console-height'], '32px'); assert.equal(css.shellStyle['--studio-console-resize-ghost-y'], 'calc(100% - 32px - 24px)');
assert.equal(css.workbenchStyle['--studio-params-resize-ghost-x'], 'calc(100% - 300px)');
console.log('Workbench presentation state and console behavior tests passed.');
