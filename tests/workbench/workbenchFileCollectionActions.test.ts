import assert from 'node:assert/strict';
import { createDefaultStandardFile } from '../../src/features/workbench/workbenchFileState.ts';
import { createWorkbenchFileCollectionActions, type WorkbenchFileCollectionActionPorts } from '../../src/features/workbench/workbenchFileCollectionActions.ts';
import type { WorkbenchFileState } from '../../src/features/workbench/workbenchFileUnion.ts';
import type { SetStateAction } from 'react';
import { createDefaultIdealFile } from '../../src/features/workbench/workbenchFileState.ts';
import { createDefaultHeatCapacityFile } from '../../src/features/workbench/workbenchHeatCapacityFileFactory.ts';
import { createDefaultHeatCapacityPistonOscillationFile } from '../../src/features/workbench/workbenchPistonOscillationState.ts';
import { assertUniqueWorkbenchFileCollections } from '../../src/features/workbench/workbenchFileIdentity.ts';
const first = createDefaultStandardFile(1);
const second = createDefaultStandardFile(2);
const createHarness = () => {
  const calls: string[] = [];
  const pending: SetStateAction<WorkbenchFileState[]>[] = [];
  const refs = { filesRef: { current: [first] as WorkbenchFileState[] }, closedFilesRef: { current: [] as WorkbenchFileState[] },
    activeFileIdRef: { current: first.id }, issuedWorkbenchFileIdsRef: { current: new Set([first.id]) },
    desktopExitQuiescedRef: { current: false },
  };
  const ports: WorkbenchFileCollectionActionPorts = {
    ...refs,
    scheduleHeatCapacitySemanticSceneCheckpointRef: { current: () => { calls.push('scene'); } },
    scheduleWorkspacePersistenceRef: { current: (reason) => { calls.push('save:' + reason); return true; } },
    setFiles: (value) => { calls.push('files'); pending.push(value); },
    setClosedFiles: (value) => { calls.push('closed'); assert.equal(refs.closedFilesRef.current, value); },
    setActiveFileId: (value) => { calls.push('active'); assert.equal(refs.activeFileIdRef.current, value); },
  };
  const actions = createWorkbenchFileCollectionActions(ports);
  // React can replay an earlier low-priority update after committing a close.
  // Replaying its queue must project state without mutating live ownership.
  const replay = (base: WorkbenchFileState[]) => pending.reduce<WorkbenchFileState[]>(
    (current, update) => typeof update === 'function' ? update(current) : update, base,
  );
  return { refs, ports, calls, actions, replay, apply: () => replay([first]) };
};
{
  const h = createHarness(); const next = { ...first, name: 'updated' };
  h.actions.setWorkbenchFiles(() => { h.calls.push('updater'); return [next]; });
  assert.deepEqual(h.calls, ['updater', 'files', 'scene', 'save:semantic']);
  assert.equal(h.refs.filesRef.current[0], next, 'saving and navigation immediately see the latest edit');
  const result = h.apply();
  assert.equal(h.refs.filesRef.current, result);
  assert.equal(result[0], next);
  assert.deepEqual(h.calls, ['updater', 'files', 'scene', 'save:semantic'], 'rendering does not run the edit again');
}
{
  const h = createHarness(); const next = { ...first, name: 'frame' };
  h.actions.updateRuntimeFileById(first.id, () => next);
  assert.deepEqual(h.calls, ['files'], 'runtime frames must not directly enter the semantic save lane');
  assert.equal(h.apply()[0], next);
  assert.equal(h.refs.filesRef.current[0], next);
}
{
  const h = createHarness();
  h.actions.commitWorkbenchFileCollections([second], [first], second.id);
  assert.deepEqual(h.calls, ['files', 'closed', 'active', 'scene', 'save:semantic']);
  assert.equal(h.refs.filesRef.current[0], second);
  assert.deepEqual([...h.refs.issuedWorkbenchFileIdsRef.current], [first.id, second.id]);
}
{
  const h = createHarness();
  assert.throws(() => h.actions.commitWorkbenchFileCollections([first], [first], first.id));
  assert.deepEqual(h.calls, [], 'collection validation precedes all writes and scheduling');
  assert.deepEqual([...h.refs.issuedWorkbenchFileIdsRef.current], [first.id]);
}
{
  const h = createHarness(); h.refs.desktopExitQuiescedRef.current = true;
  h.actions.setWorkbenchFiles(() => { throw Error('late semantic update'); });
  h.actions.updateRuntimeFileById(first.id, () => { throw Error('late runtime frame'); });
  assert.deepEqual(h.calls, [], 'exit quiescence rejects queued semantic and frame entry points');
}
{
  const h = createHarness(); h.refs.filesRef.current = [first, second]; h.refs.activeFileIdRef.current = second.id;
  h.actions.updateActiveFile(file => ({ ...file, name: 'live active' }));
  const result = h.apply();
  assert.equal(result[0], first);
  assert.equal(result[1].name, 'live active', 'active updates use the live active identity at invocation');
}
for (const file of [first, createDefaultIdealFile(1), createDefaultHeatCapacityFile(1), createDefaultHeatCapacityPistonOscillationFile(1)]) {
  for (const lane of ['semantic', 'runtime'] as const) {
    const h = createHarness();
    const base = [file, second];
    h.refs.filesRef.current = base;
    h.refs.activeFileIdRef.current = file.id;
    const update = lane === 'semantic' ? h.actions.updateFileById : h.actions.updateRuntimeFileById;
    update(file.id, current => ({ ...current, name: 'latest edit', updatedAt: 100 }));
    update(second.id, current => ({ ...current, updatedAt: 200 }));
    const edited = h.refs.filesRef.current;
    assert.equal(edited[0].name, 'latest edit', 'batched updates accumulate against live data');
    h.actions.commitWorkbenchFileCollections([edited[1]], [edited[0]], second.id);
    h.replay(base);
    assert.deepEqual(h.refs.filesRef.current.map(f => f.id), [second.id], `${file.kind} ${lane}: replay cannot reopen the closed file`);
    assert.equal(h.refs.closedFilesRef.current[0], edited[0], 'closing retains the latest experiment data');
    assertUniqueWorkbenchFileCollections(h.refs.filesRef.current, h.refs.closedFilesRef.current, second.id);
    update(file.id, () => { throw Error('closed file received a late update'); });
    h.actions.commitWorkbenchFileCollections([edited[1], edited[0]], [], file.id);
    h.replay(base);
    assert.equal(h.refs.closedFilesRef.current.length, 0, 'reopening clears closed ownership');
    h.actions.commitWorkbenchFileCollections([edited[1]], [], second.id);
    h.replay(base);
    assert.deepEqual(h.refs.filesRef.current.map(f => f.id), [second.id], 'replay cannot resurrect a deleted file');
    h.actions.commitWorkbenchFileCollections(edited, [], file.id);
    h.replay(base);
    assert.deepEqual(h.refs.filesRef.current, edited, 'undo restores the intended complete data');
  }
}
console.log('Workbench file collection timing and ownership tests passed.');
