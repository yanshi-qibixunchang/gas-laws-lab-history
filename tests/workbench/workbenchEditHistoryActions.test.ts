import assert from 'node:assert/strict';
import { createWorkbenchEditHistoryActions } from '../../src/features/workbench/workbenchEditHistoryActions.ts';
import { createFilePresentationSnapshot, type WorkbenchEditSnapshot } from '../../src/features/workbench/workbenchEditSnapshot.ts';
import { createDefaultStandardFile, createDefaultIdealFile, type WorkbenchPanelKey } from '../../src/features/workbench/workbenchFileState.ts';
import { createDefaultHeatCapacityFile } from '../../src/features/workbench/workbenchHeatCapacityFileFactory.ts';
import { createDefaultHeatCapacityPistonOscillationFile } from '../../src/features/workbench/workbenchPistonOscillationState.ts';
import type { WorkbenchFileState } from '../../src/features/workbench/workbenchFileUnion.ts';

const createHarness = (initial: WorkbenchFileState[]) => {
  const filesRef = { current: initial };
  const closedFilesRef = { current: [] as WorkbenchFileState[] };
  const activeFileIdRef = { current: initial[0]!.id };
  const selectedPanelRef = { current: 'preview' as WorkbenchPanelKey };
  const undoStackRef = { current: [] as WorkbenchEditSnapshot[] };
  const redoStackRef = { current: [] as WorkbenchEditSnapshot[] };
  const tutorialActiveRef = { current: false };
  const calls: string[] = [];
  let pendingRestore = false;
  const actions = createWorkbenchEditHistoryActions({
    filesRef, closedFilesRef, activeFileIdRef, selectedPanelRef, undoStackRef, redoStackRef,
    tutorialActiveRef,
    activeFileOwnsPendingHeatCapacityRefresh: () => pendingRestore,
    resolveDeferredHeatCapacityGuideUiCheckpoint: () => { calls.push('deferred'); return null; },
    captureHeatCapacityModeSceneMetadata: () => { calls.push('scene'); },
    buildHeatCapacityModeUiCheckpoint: () => { throw new Error('unexpected mode capture'); },
    suspendActiveHeatCapacityModeForNavigation: () => { calls.push('suspend'); },
    activateHeatCapacityFileModeSession: () => { calls.push('activate'); return undefined; },
    commitWorkbenchFileCollections: (files, closed, id) => {
      calls.push('commit');
      filesRef.current = files; closedFilesRef.current = closed; activeFileIdRef.current = id;
    },
    setWorkbenchFiles: update => { filesRef.current = update(filesRef.current); },
    reconcileRuntimeAfterFileRestore: () => { calls.push('runtime:file'); },
    reconcileRuntimesAfterRestore: () => { calls.push('runtime:workspace'); },
    clearEditRestoreTransientUi: () => { calls.push('clear-ui'); },
    setSelectedPanel: panel => { selectedPanelRef.current = panel; },
    setParametersCollapsed: () => { calls.push('sidebar'); },
    setUndoStack: () => {}, setRedoStack: () => {}, setOpenTopMenu: () => {},
    guardWorkbenchTutorialAction: () => !tutorialActiveRef.current,
    pushLog: () => {}, getLocalizedWorkbenchEditLabel: label => label,
    scheduleWorkspacePersistenceRef: { current: () => { calls.push('schedule'); } },
    flushWorkspacePersistenceRef: { current: async () => { calls.push('flush'); return true; } },
  });
  return { actions, filesRef, closedFilesRef, activeFileIdRef, selectedPanelRef, undoStackRef,
    redoStackRef, tutorialActiveRef, calls, setPendingRestore: (value: boolean) => { pendingRestore = value; } };
};

for (const file of [createDefaultStandardFile(1), createDefaultIdealFile(1),
  createDefaultHeatCapacityFile(1), createDefaultHeatCapacityPistonOscillationFile(1)]) {
  const snapshot = createFilePresentationSnapshot(file);
  assert.equal(snapshot.kind, file.kind);
  assert.notEqual(snapshot.state.visiblePanels, file.visiblePanels);
  assert.equal('params' in snapshot.state, false);
  assert.equal('runState' in snapshot.state, false);
  assert.equal('heatCapacityModeSessions' in snapshot.state, false);
  file.visiblePanels.push('results');
  assert.equal(snapshot.state.visiblePanels.includes('results'), false);
}

const h = createHarness([createDefaultStandardFile(1), createDefaultIdealFile(1)]);
h.actions.captureUndoSnapshot('parameters');
const first = h.filesRef.current[0]!;
h.filesRef.current = [{ ...first, name: 'changed' }, h.filesRef.current[1]!];
h.actions.undoLastEdit();
assert.equal(h.filesRef.current[0]!.name, first.name);
assert.deepEqual(h.calls, ['commit', 'runtime:file', 'sidebar', 'clear-ui', 'flush']);
h.actions.redoLastEdit();
assert.equal(h.filesRef.current[0]!.name, 'changed');

const running = { ...createDefaultStandardFile(2), runState: 'running' as const };
const runningSnapshot = { kind: 'file' as const, label: 'restore running', fileId: first.id,
  file: { ...running, id: first.id }, selectedPanel: 'results' as const };
h.calls.length = 0;
h.actions.restoreFileSnapshot(runningSnapshot);
assert.equal(h.filesRef.current[0]!.runState, 'paused');
assert.notEqual(h.filesRef.current[0]!.params, running.params);
assert.deepEqual(h.calls, ['commit', 'runtime:file', 'sidebar', 'clear-ui', 'flush']);

const other = h.filesRef.current[1]!;
h.activeFileIdRef.current = other.id;
h.selectedPanelRef.current = 'verification';
h.calls.length = 0;
h.actions.restoreFileSnapshot(runningSnapshot);
assert.equal(h.activeFileIdRef.current, other.id);
assert.equal(h.selectedPanelRef.current, 'verification');
assert.equal(h.filesRef.current[1], other);
assert.deepEqual(h.calls, ['commit', 'runtime:file', 'clear-ui', 'flush']);

const heat = createDefaultHeatCapacityFile(1);
const heatHarness = createHarness([heat]);
heatHarness.setPendingRestore(true);
const originalModeStore = heat.heatCapacityModeSessions;
const pendingFiles = heatHarness.actions.createEditSnapshotFiles();
assert.equal(pendingFiles, heatHarness.filesRef.current);
assert.equal(pendingFiles[0]!.kind === 'heatCapacity' && pendingFiles[0].heatCapacityModeSessions, originalModeStore);
assert.deepEqual(heatHarness.calls, [], 'pending hydration must not recapture mode or scene state');
heatHarness.actions.captureUndoSnapshot('before close', 'workspace');
heatHarness.calls.length = 0;
heatHarness.actions.restoreWorkspaceSnapshot({ kind: 'workspace', label: 'workspace', files: [heat, running],
  closedFiles: [other], activeFileId: 'missing', selectedPanel: 'realtime' });
assert.equal(heatHarness.activeFileIdRef.current, heat.id);
assert.equal(heatHarness.filesRef.current[1]!.runState, 'paused');
assert.deepEqual(heatHarness.calls, ['suspend', 'commit', 'runtime:workspace', 'activate', 'sidebar', 'clear-ui', 'flush']);
assert.notEqual(heatHarness.closedFilesRef.current[0], other);

h.actions.captureUndoSnapshot('target disappears');
h.filesRef.current = [];
h.actions.undoLastEdit();
assert.equal(h.undoStackRef.current.length, 0);
assert.equal(h.redoStackRef.current.length, 0);
h.tutorialActiveRef.current = true;
h.actions.captureUndoSnapshot('tutorial');
assert.equal(h.undoStackRef.current.length, 0);
console.log('workbenchEditHistoryActions tests passed');
