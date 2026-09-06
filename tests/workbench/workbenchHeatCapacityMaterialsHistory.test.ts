import assert from 'node:assert/strict';
import { createDefaultHeatCapacityFile } from '../../src/features/workbench/workbenchHeatCapacityFileFactory.ts';
import { createDefaultStandardFile, type WorkbenchPanelKey } from '../../src/features/workbench/workbenchFileState.ts';
import type { WorkbenchFileState } from '../../src/features/workbench/workbenchFileUnion.ts';
import type { WorkbenchHeatCapacityState } from '../../src/features/workbench/workbenchHeatCapacityStateTypes.ts';
import type { WorkbenchEditSnapshot } from '../../src/features/workbench/workbenchEditSnapshot.ts';
import { createWorkbenchEditHistoryActions } from '../../src/features/workbench/workbenchEditHistoryActions.ts';
import { createWorkbenchWindowActions } from '../../src/features/workbench/workbenchWindowActions.ts';
import { createDefaultWorkbenchLayoutDefaults } from '../../src/features/workbench/workbenchLayoutCompatibility.ts';
import { getHeatCapacityRealtimeCopy } from '../../src/features/workbench/workbenchHeatCapacityRealtimeCopy.ts';

// Run the same production factories used by the UI, with synchronous render ports.
// A missing history capture in a window callback must fail the continuous action sequence.
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
  const selectedPanelRef = { current: 'preview' as WorkbenchPanelKey };
  const undoStackRef = { current: [] as WorkbenchEditSnapshot[] };
  const redoStackRef = { current: [] as WorkbenchEditSnapshot[] };
  let persistenceRequests = 0;
  const getFile = () => filesRef.current.find(file => file.id === initialFile.id) as WorkbenchHeatCapacityState;
  const forbidDomainRestore = (): never => assert.fail('materials history must never snapshot or restore experiment state');
  const setWorkbenchFiles = (update: (files: WorkbenchFileState[]) => WorkbenchFileState[]) => {
    filesRef.current = update(filesRef.current);
  };
  const setSelectedPanel = (panel: WorkbenchPanelKey) => { selectedPanelRef.current = panel; };
  const history = createWorkbenchEditHistoryActions({
    filesRef, activeFileIdRef, selectedPanelRef, undoStackRef, redoStackRef,
    closedFilesRef: { current: [] }, tutorialActiveRef: { current: false },
    setWorkbenchFiles, setSelectedPanel,
    setUndoStack: () => {}, setRedoStack: () => {}, setOpenTopMenu: () => {}, pushLog: () => {},
    guardWorkbenchTutorialAction: () => true, getLocalizedWorkbenchEditLabel: label => label,
    activeFileOwnsPendingHeatCapacityRefresh: forbidDomainRestore,
    resolveDeferredHeatCapacityGuideUiCheckpoint: forbidDomainRestore,
    captureHeatCapacityModeSceneMetadata: forbidDomainRestore,
    buildHeatCapacityModeUiCheckpoint: forbidDomainRestore,
    suspendActiveHeatCapacityModeForNavigation: forbidDomainRestore,
    activateHeatCapacityFileModeSession: forbidDomainRestore,
    commitWorkbenchFileCollections: forbidDomainRestore,
    reconcileRuntimeAfterFileRestore: forbidDomainRestore,
    reconcileRuntimesAfterRestore: forbidDomainRestore,
    clearEditRestoreTransientUi: forbidDomainRestore, setParametersCollapsed: forbidDomainRestore,
    flushWorkspacePersistenceRef: { current: forbidDomainRestore },
    scheduleWorkspacePersistenceRef: { current: () => { persistenceRequests += 1; } },
  });
  const windows = createWorkbenchWindowActions({
    getActiveFile: () => filesRef.current.find(file => file.id === activeFileIdRef.current)!,
    getSelectedPanel: () => selectedPanelRef.current,
    setWorkbenchFiles, setSelectedPanel,
    updateActiveFile: update => {
      filesRef.current = filesRef.current.map(file => file.id === activeFileIdRef.current ? update(file) : file);
    },
    workbenchLayoutDefaults: createDefaultWorkbenchLayoutDefaults(),
    heatCapacityRealtimeCopy: getHeatCapacityRealtimeCopy('zh-CN'),
    availablePanels: [
      { key: 'heatCapacityGuide', title: 'guide', hint: '', icon: null },
      { key: 'heatCapacityRecords', title: 'records', hint: '', icon: null },
      { key: 'heatCapacityReview', title: 'review', hint: '', icon: null },
    ],
    idealResultWindowPanels: [], resultsSections: [],
    createIdealPanels: () => [], createResultsSections: () => [],
    getLocalizedWorkbenchPanelTitle: title => title,
    setResultsChildrenCollapsed: () => {}, setOpenTopMenu: () => {},
    captureUndoSnapshot: history.captureUndoSnapshot,
    guardWorkbenchTutorialAction: () => true, pushLog: () => {},
  });
  const actions = { ...history, ...windows };
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
