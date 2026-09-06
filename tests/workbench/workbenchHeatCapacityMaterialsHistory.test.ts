import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { createDefaultHeatCapacityFile } from '../../src/features/workbench/workbenchHeatCapacityFileFactory.ts';
import { createDefaultStandardFile } from '../../src/features/workbench/workbenchFileState.ts';
import type { WorkbenchFileState } from '../../src/features/workbench/workbenchFileUnion.ts';
import type { WorkbenchHeatCapacityState } from '../../src/features/workbench/workbenchHeatCapacityStateTypes.ts';
import * as materials from '../../src/features/workbench/workbenchHeatCapacityMaterialsWindowCoordinator.ts';
import { trimWorkbenchEditHistory } from '../../src/features/workbench/workbenchEditHistory.ts';

// Execute the actual UI callbacks and history implementation, with synchronous render ports.
// Pure layout-plan tests alone cannot detect a missing history capture in a UI callback.
const source = ts.createSourceFile('WorkbenchStudioPrototype.tsx', readFileSync(
  new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8',
), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const callbackNames = [
  'createFilePresentationSnapshot', 'createEditSnapshot', 'restorePresentationSnapshot',
  'restoreSnapshot', 'pushUndoSnapshot', 'captureUndoSnapshot', 'undoLastEdit', 'redoLastEdit',
  'activateHeatCapacityTab', 'openHeatCapacityTab', 'openAllHeatCapacityMaterialsTabs',
  'closeHeatCapacityTab', 'closeHeatCapacityMaterialsWindow', 'toggleWindowHeatCapacityTab',
];
const declarations = new Map<string, string>();
const visit = (node: ts.Node) => {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)
    && callbackNames.includes(node.name.text)) {
    assert.equal(declarations.has(node.name.text), false, `ambiguous callback ${node.name.text}`);
    declarations.set(node.name.text, `const ${node.getText(source)};`);
  }
  ts.forEachChild(node, visit);
};
visit(source);
assert.equal(declarations.size, callbackNames.length);
const callbackCode = ts.transpileModule(
  [...declarations.values(), `({ ${callbackNames.join(', ')} })`].join('\n'),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } },
).outputText;

const createHarness = (mode: 'guide' | 'free') => {
  const initialFile: WorkbenchHeatCapacityState = {
    ...createDefaultHeatCapacityFile(1), heatCapacityMode: mode,
    heatCapacityTeachingStatus: mode === 'guide' ? 'completed' : 'idle',
    visiblePanels: ['preview', 'realtime'], openHeatCapacityTabs: [], activeHeatCapacityTabId: null,
    heatCapacityTabContainerHeight: 0.37,
  };
  const otherFile = createDefaultStandardFile(1);
  const filesRef = { current: [initialFile, otherFile] as WorkbenchFileState[] };
  const activeFileIdRef = { current: initialFile.id };
  const selectedPanelRef = { current: 'preview' };
  const undoStackRef = { current: [] as { kind: string; label: string }[] };
  const redoStackRef = { current: [] as { kind: string; label: string }[] };
  let persistenceRequests = 0;
  const getFile = () => filesRef.current.find(file => file.id === initialFile.id) as WorkbenchHeatCapacityState;
  const forbidDomainRestore = () => assert.fail('materials history must never snapshot or restore experiment state');
  const actions = runInNewContext(callbackCode, {
    ...materials, closeHeatCapacityMaterialsWindowState: materials.closeHeatCapacityMaterialsWindow,
    trimWorkbenchEditHistory, structuredClone,
    filesRef, activeFileIdRef, selectedPanelRef, undoStackRef, redoStackRef,
    tutorialActiveRef: { current: false },
    get activeFile() { return filesRef.current.find(file => file.id === activeFileIdRef.current); },
    setWorkbenchFiles: (update: (files: WorkbenchFileState[]) => WorkbenchFileState[]) => {
      filesRef.current = update(filesRef.current);
    },
    updateActiveFile: (update: (file: WorkbenchFileState) => WorkbenchFileState) => {
      filesRef.current = filesRef.current.map(file => file.id === activeFileIdRef.current ? update(file) : file);
    },
    setSelectedPanel: (panel: string) => { selectedPanelRef.current = panel; },
    setUndoStack: () => {}, setRedoStack: () => {}, pushLog: () => {},
    guardWorkbenchTutorialAction: () => true,
    getHeatCapacityTabDefinition: (tabId: string) => ({ title: tabId }),
    createEditSnapshotFiles: forbidDomainRestore,
    restoreFileSnapshot: forbidDomainRestore, restoreWorkspaceSnapshot: forbidDomainRestore,
    scheduleWorkspacePersistenceRef: { current: () => { persistenceRequests += 1; } },
  }) as Record<string, (...args: unknown[]) => void>;
  return { actions, getFile, filesRef, activeFileIdRef, selectedPanelRef, undoStackRef, redoStackRef,
    otherFile, getPersistenceRequests: () => persistenceRequests };
};

for (const mode of ['guide', 'free'] as const) {
  const h = createHarness(mode);
  const a = h.actions;
  a.closeHeatCapacityMaterialsWindow();
  assert.equal(h.undoStackRef.current.length, 0, 'closing an already closed window is a no-op');
  a.openHeatCapacityTab('records');
  assert.deepEqual(h.getFile().openHeatCapacityTabs, ['records']);
  const beforeClose = h.getFile();
  a.closeHeatCapacityMaterialsWindow();
  assert.equal(h.undoStackRef.current.length, 2, 'opening and whole-window closing need separate undo entries');
  assert.equal(h.undoStackRef.current.at(-1)?.kind, 'presentation');
  assert.equal(h.undoStackRef.current.at(-1)?.label, 'closed heat-capacity materials window');
  assert.deepEqual(h.getFile().openHeatCapacityTabs, []);
  assert.equal(h.selectedPanelRef.current, 'preview');

  // Simulate a newer domain commit between close and undo; layout history must not rewind it.
  const advancedFile = { ...h.getFile(), simulationTimeS: 12.5, pressureSignalMvDisplayed: 88.2 };
  h.filesRef.current = [advancedFile, h.otherFile];
  a.undoLastEdit();
  assert.deepEqual(h.getFile().openHeatCapacityTabs, ['records']);
  assert.equal(h.getFile().activeHeatCapacityTabId, 'records');
  assert.equal(h.getFile().heatCapacityTabContainerHeight, 0.37);
  assert.equal(h.getFile().simulationTimeS, 12.5);
  assert.equal(h.getFile().pressureSignalMvDisplayed, 88.2);
  for (const key of ['heatCapacityModeSessions', 'heatCapacityFreeExperimentGroups',
    'heatCapacityFreeRunWorkspace', 'heatCapacityGuidePhysicsState', 'heatCapacityGuideWorkflow',
    'heatCapacityGuideTrial', 'heatCapacityGuideCalculationSession'] as const) {
    assert.equal(h.getFile()[key], beforeClose[key], `${key} must retain its authority and reference`);
  }
  assert.equal(h.getFile().heatCapacityTeachingStatus, beforeClose.heatCapacityTeachingStatus);
  a.undoLastEdit();
  assert.deepEqual(h.getFile().openHeatCapacityTabs, []);
  a.redoLastEdit();
  assert.deepEqual(h.getFile().openHeatCapacityTabs, ['records']);
  a.redoLastEdit();
  assert.deepEqual(h.getFile().openHeatCapacityTabs, []);
  assert.equal(h.getPersistenceRequests(), 4, 'each presentation restore schedules the existing save path');

  a.undoLastEdit();
  a.openHeatCapacityTab('guide');
  assert.equal(h.redoStackRef.current.length, 0, 'a new opening after undo replaces the redo branch');
  const historyCount = h.undoStackRef.current.length;
  a.activateHeatCapacityTab('records');
  a.openHeatCapacityTab('records');
  assert.equal(h.undoStackRef.current.length, historyCount, 'activation and reopening an open tab are transient');
  assert.deepEqual(h.getFile().openHeatCapacityTabs, ['records', 'guide']);
  a.closeHeatCapacityMaterialsWindow();
  a.undoLastEdit();
  assert.deepEqual(h.getFile().openHeatCapacityTabs, ['records', 'guide']);
  assert.equal(h.getFile().activeHeatCapacityTabId, 'records', 'undo restores tab order and prior active tab');
  a.closeHeatCapacityTab('guide');
  assert.equal(h.getFile().activeHeatCapacityTabId, 'records');
  a.undoLastEdit();
  a.redoLastEdit();
  a.toggleWindowHeatCapacityTab('records');
  assert.deepEqual(h.getFile().openHeatCapacityTabs, [], 'closing the final tab closes the window');
  a.undoLastEdit();
  assert.deepEqual(h.getFile().openHeatCapacityTabs, ['records']);

  a.closeHeatCapacityMaterialsWindow();
  h.activeFileIdRef.current = h.otherFile.id;
  h.selectedPanelRef.current = 'results';
  a.undoLastEdit();
  assert.deepEqual(h.getFile().openHeatCapacityTabs, ['records']);
  assert.equal(h.selectedPanelRef.current, 'results', 'undo in another file must not change its selected panel');
  assert.equal(h.filesRef.current[1], h.otherFile, 'other file state must remain untouched');
  const countBeforeIgnoredClose = h.undoStackRef.current.length;
  a.closeHeatCapacityMaterialsWindow();
  assert.equal(h.undoStackRef.current.length, countBeforeIgnoredClose, 'non-heat-capacity files are ignored');
}

console.log('workbenchHeatCapacityMaterialsHistory tests passed');
