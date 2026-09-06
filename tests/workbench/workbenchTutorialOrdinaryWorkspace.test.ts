import assert from 'node:assert/strict';
import { createWorkbenchTutorialOrdinaryWorkspaceActions, type WorkbenchTutorialOrdinaryWorkspacePorts } from '../../src/features/workbench/workbenchTutorialOrdinaryWorkspace.ts';
import { createDefaultHeatCapacityFile } from '../../src/features/workbench/workbenchHeatCapacityFileFactory.ts';
import { createDefaultStandardFile } from '../../src/features/workbench/workbenchFileState.ts';
import type { TutorialOrdinaryWorkspace } from '../../src/features/workbench/workbenchExperimentTutorialWorkspace.ts';
const deferred = () => { let resolve!: () => void, reject!: (cause: Error) => void; const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const harness = () => {
  const source = { files: [createDefaultStandardFile(1), createDefaultHeatCapacityFile(1)], closedFiles: [createDefaultHeatCapacityFile(2)], activeFileId: '', selectedPanel: 'realtime' as const };
  source.activeFileId = source.files[0].id;
  const snapshot = structuredClone(source), pending = deferred();
  const ports: WorkbenchTutorialOrdinaryWorkspacePorts = { tutorialOrdinaryWorkspaceRef: { current: null }, tutorialOrdinaryWorkspaceRefreshRef: { current: null } };
  let initializations = 0, reads = 0;
  const actions = createWorkbenchTutorialOrdinaryWorkspaceActions(ports, {
    initializeWorkbenchIndexedDbPersistence: () => { initializations += 1; return pending.promise.then(() => ({ namespace: 'test', migratedLegacyStorage: false, error: null })); },
    loadWorkbenchSession: () => { reads += 1; return { version: 1, files: source.files, activeFileId: source.activeFileId, selectedPanel: source.selectedPanel }; },
    loadClosedWorkbenchFiles: () => source.closedFiles,
  });
  return { source, snapshot, pending, ports, actions, counts: () => ({ initializations, reads }) };
};
{
  const h = harness(), first = h.actions.refreshTutorialOrdinaryWorkspaceFromPersistence(), second = h.actions.refreshTutorialOrdinaryWorkspaceFromPersistence();
  assert.equal(first, second, 'overlapping ownership events share one persistence read');
  assert.deepEqual(h.counts(), { initializations: 1, reads: 0 });
  h.pending.resolve(); const result = await first;
  assert.equal(h.ports.tutorialOrdinaryWorkspaceRef.current, result);
  assert.equal(h.ports.tutorialOrdinaryWorkspaceRefreshRef.current, null);
  assert.equal(result.activeFileId, h.source.activeFileId); assert.equal(result.selectedPanel, 'realtime');
  assert.notEqual(result.files[0], h.source.files[0]); assert.notEqual(result.closedFiles[0], h.source.closedFiles[0]);
  assert.deepEqual(h.source, h.snapshot, 'normalizing the tutorial-safe cache cannot modify persisted files');
  result.files[0].name = 'cache-only rename'; assert.equal(h.source.files[0].name, h.snapshot.files[0].name);
  const next = h.actions.refreshTutorialOrdinaryWorkspaceFromPersistence(); assert.notEqual(next, first); await next;
  assert.deepEqual(h.counts(), { initializations: 2, reads: 2 });
}
{
  const h = harness(), first = h.actions.refreshTutorialOrdinaryWorkspaceFromPersistence();
  h.pending.reject(new Error('database unavailable')); await assert.rejects(first, /database unavailable/);
  assert.equal(h.ports.tutorialOrdinaryWorkspaceRefreshRef.current, null); assert.equal(h.ports.tutorialOrdinaryWorkspaceRef.current, null);
  assert.deepEqual(h.counts(), { initializations: 1, reads: 0 });
}
{
  const h = harness(), first = h.actions.refreshTutorialOrdinaryWorkspaceFromPersistence();
  const newerOwner = Promise.resolve({ files: [], closedFiles: [], activeFileId: '', selectedPanel: 'preview' } as TutorialOrdinaryWorkspace);
  h.ports.tutorialOrdinaryWorkspaceRefreshRef.current = newerOwner; h.pending.resolve(); await first;
  assert.equal(h.ports.tutorialOrdinaryWorkspaceRefreshRef.current, newerOwner, 'old completion cannot clear a replacement single-flight owner');
}
console.log('workbenchTutorialOrdinaryWorkspace tests passed');
