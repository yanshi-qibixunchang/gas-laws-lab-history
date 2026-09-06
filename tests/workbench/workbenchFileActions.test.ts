import assert from 'node:assert/strict';
import { createWorkbenchFileActions, type WorkbenchFileActionPorts } from '../../src/features/workbench/workbenchFileActions.ts';
import { createDefaultStandardFile } from '../../src/features/workbench/workbenchFileState.ts';
import { createDefaultHeatCapacityFile } from '../../src/features/workbench/workbenchHeatCapacityFileFactory.ts';
import { createDefaultWorkbenchLayoutDefaults } from '../../src/features/workbench/workbenchLayoutCompatibility.ts';
import { workbenchPromptCopies } from '../../src/features/workbench/workbenchPromptCopies.ts';
import type { WorkbenchFileState } from '../../src/features/workbench/workbenchFileUnion.ts';
import { createWorkbenchActiveModeCheckpointOverride, type WorkbenchActiveModeCheckpointOverride } from '../../src/features/workbench/workbenchIndexedDbPersistence.ts';

const harness = (files: WorkbenchFileState[], closed: WorkbenchFileState[] = []) => {
  const events: string[] = []; const histories: string[] = [];
  let pending: string | null = null; let allowed = true; let pendingRestore = false;
  let confirmation: Parameters<WorkbenchFileActionPorts['requestPromptConfirmation']>[0] | null = null;
  const filesRef = { current: files }; const closedFilesRef = { current: closed };
  const activeFileIdRef = { current: files[0]?.id ?? '' };
  const checkpoint = createWorkbenchActiveModeCheckpointOverride(files[1]?.id ?? 'target', 'guide', null);
  const flushed: (WorkbenchActiveModeCheckpointOverride | undefined)[] = [];
  const noop = () => {};
  const ports: WorkbenchFileActionPorts = {
    getActiveFile: () => filesRef.current.find(f => f.id === activeFileIdRef.current)!,
    getPendingDeleteFileId: () => pending, filesRef, closedFilesRef, activeFileIdRef,
    selectedPanelRef: { current: 'preview' }, issuedWorkbenchFileIdsRef: { current: new Set([...files, ...closed].map(f => f.id)) },
    renamingFileIdRef: { current: null }, standardRuntimeRef: { current: {} }, idealRuntimeRef: { current: {} },
    workbenchLayoutDefaults: createDefaultWorkbenchLayoutDefaults(), workbenchPromptCopy: workbenchPromptCopies['zh-CN'],
    captureUndoSnapshot: label => { histories.push(label); events.push('history'); }, guardWorkbenchTutorialAction: () => allowed,
    createStandardRuntime: () => null, createIdealRuntime: () => null, snapshotParticles: () => [],
    cancelRuntimeFrame: id => { events.push('cancel:' + id); }, prepareReopenedWorkbenchFile: file => ({ ...file, runState: 'idle' }),
    suspendActiveHeatCapacityModeForNavigation: () => {
      events.push('suspend'); filesRef.current = filesRef.current.map(f => f.id === activeFileIdRef.current ? { ...f, runState: 'paused', name: 'suspended name', updatedAt: 12345 } : f);
      return pendingRestore;
    },
    releaseHeatCapacityRuntimeForFileExit: id => { events.push('release:' + id); },
    activateHeatCapacityFileModeSession: id => { assert.equal(activeFileIdRef.current, id); events.push('activate:' + id); return checkpoint; },
    commitWorkbenchFileCollections: (next, cached, active) => { events.push('commit'); filesRef.current = next; closedFilesRef.current = cached; activeFileIdRef.current = active; },
    heatCapacityRefreshPersistRef: { current: () => { events.push('refresh:' + activeFileIdRef.current); } },
    flushWorkspacePersistenceRef: { current: async override => { events.push('flush:' + activeFileIdRef.current); flushed.push(override); return true; } },
    requestPromptConfirmation: request => { confirmation = request; },
    setFiles: next => { filesRef.current = typeof next === 'function' ? next(filesRef.current) : next; },
    setSelectedFileId: noop, setSelectedPanel: noop, setLeftCollapsed: noop, setParametersCollapsed: noop,
    setParameterErrors: noop, setIdealAdvancedSettingsOpen: noop, setIdealAdvancedSettingsBodyVisible: noop,
    setOpenTopMenu: noop, setOpenFileMenuId: noop,
    setPendingDeleteFileId: next => { pending = typeof next === 'function' ? next(pending) : next; },
    setPendingRemovePointId: noop, setPendingClearRelationKey: noop, setRenamingFileId: noop, setSamplingPresetMenuOpen: noop, pushLog: noop,
  };
  return { actions: createWorkbenchFileActions(ports), ports, events, histories, flushed, checkpoint, filesRef, closedFilesRef, activeFileIdRef,
    setAllowed: (value: boolean) => { allowed = value; }, setPendingRestore: () => { pendingRestore = true; },
    confirm: () => { assert.ok(confirmation); confirmation.onConfirm(); } };
};
const source = createDefaultHeatCapacityFile(1); const target = { ...createDefaultHeatCapacityFile(2), heatCapacityMode: 'guide' as const };
const selected = harness([source, target]);
selected.actions.selectFile(target);
assert.deepEqual(selected.events, ['suspend', 'refresh:' + source.id, 'flush:' + source.id, 'commit', 'activate:' + target.id, 'flush:' + target.id]);
assert.strictEqual(selected.flushed[1], selected.checkpoint, 'explicit target checkpoint is forwarded intact');
assert.equal(selected.histories.length, 0, 'selection is transient');
selected.events.length = 0; selected.actions.selectFile(target); assert.deepEqual(selected.events, []);
const pending = harness([source, target]); pending.setPendingRestore(); pending.actions.selectFile(target);
assert.deepEqual(pending.events, ['suspend', 'commit', 'activate:' + target.id, 'flush:' + target.id]);
const closing = harness([source, target]); closing.actions.closeWorkbenchFile(source.id);
assert.deepEqual(closing.events.slice(0, 5), ['history', 'suspend', 'cancel:' + source.id, 'commit', 'activate:' + target.id]);
assert.equal(closing.closedFilesRef.current[0]?.name, 'suspended name', 'cache uses file reread after suspension');
assert.equal(closing.closedFilesRef.current[0]?.runState, 'paused');
assert.strictEqual(closing.flushed[0], closing.checkpoint);
const inactive = harness([source, target]); inactive.actions.closeWorkbenchFile(target.id);
assert.ok(inactive.events.includes('release:' + target.id)); assert.ok(!inactive.events.some(e => e.startsWith('activate:')));
assert.equal(inactive.activeFileIdRef.current, source.id);
const reopened = harness([source], [target]); reopened.actions.openClosedWorkbenchFile(target.id);
assert.equal(reopened.activeFileIdRef.current, target.id); assert.equal(reopened.closedFilesRef.current.length, 0);
assert.ok(reopened.events.indexOf('suspend') < reopened.events.indexOf('commit'));
const historyCount = reopened.histories.length; reopened.actions.openClosedWorkbenchFile(target.id); assert.equal(reopened.histories.length, historyCount);
const removing = harness([source, target], [target]); removing.actions.requestDeleteWorkbenchFile(target);
assert.equal(removing.histories.length, 0); removing.actions.requestDeleteWorkbenchFile(target);
assert.equal(removing.closedFilesRef.current.length, 0); assert.strictEqual(removing.filesRef.current[0], source);
const deferred = harness([{ ...source, runState: 'running' }, target]); deferred.actions.requestCloseWorkbenchFile(deferred.filesRef.current[0]!);
assert.equal(deferred.histories.length, 0); deferred.confirm(); assert.equal(deferred.activeFileIdRef.current, target.id);
const create = harness([createDefaultStandardFile(1)]); create.actions.createFile('heatCapacityPistonOscillation');
assert.equal(create.filesRef.current.length, 2); assert.equal(create.filesRef.current[1]?.kind, 'heatCapacityPistonOscillation');
assert.equal(create.activeFileIdRef.current, create.filesRef.current[1]?.id); assert.equal(create.ports.selectedPanelRef.current, 'preview');
create.setAllowed(false); create.actions.createFile('standard'); assert.equal(create.filesRef.current.length, 2);
console.log('Workbench file action ordering tests passed.');
