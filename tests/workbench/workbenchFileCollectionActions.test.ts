import assert from 'node:assert/strict';
import { createDefaultStandardFile } from '../../src/features/workbench/workbenchFileState.ts';
import { createWorkbenchFileCollectionActions, type WorkbenchFileCollectionActionPorts } from '../../src/features/workbench/workbenchFileCollectionActions.ts';
import type { WorkbenchFileState } from '../../src/features/workbench/workbenchFileUnion.ts';
const first = createDefaultStandardFile(1);
const second = createDefaultStandardFile(2);
const createHarness = () => {
  const calls: string[] = [];
  let pending: ((files: WorkbenchFileState[]) => WorkbenchFileState[]) | null = null;
  const refs = { filesRef: { current: [first] }, closedFilesRef: { current: [] as WorkbenchFileState[] },
    activeFileIdRef: { current: first.id }, issuedWorkbenchFileIdsRef: { current: new Set([first.id]) },
    desktopExitQuiescedRef: { current: false },
  };
  const ports: WorkbenchFileCollectionActionPorts = {
    ...refs,
    scheduleHeatCapacitySemanticSceneCheckpointRef: { current: () => { calls.push('scene'); } },
    scheduleWorkspacePersistenceRef: { current: (reason) => { calls.push('save:' + reason); return true; } },
    setFiles: (value) => { calls.push('files'); if (typeof value === 'function') pending = value;
      else { assert.equal(refs.filesRef.current, value, 'atomic file ref changes before its React projection');
        assert.equal(refs.closedFilesRef.current[0], first); assert.equal(refs.activeFileIdRef.current, second.id); } },
    setClosedFiles: (value) => { calls.push('closed'); assert.equal(refs.closedFilesRef.current, value); },
    setActiveFileId: (value) => { calls.push('active'); assert.equal(refs.activeFileIdRef.current, value); },
  };
  const actions = createWorkbenchFileCollectionActions(ports);
  return { refs, ports, calls, actions, apply: () => { const result = pending!(refs.filesRef.current); pending = null; return result; } };
};
{
  const h = createHarness(); const next = { ...first, name: 'updated' };
  h.actions.setWorkbenchFiles(() => { h.calls.push('updater'); return [next]; });
  assert.deepEqual(h.calls, ['scene', 'save:semantic', 'files']);
  assert.equal(h.refs.filesRef.current[0], first, 'semantic capture is scheduled before React evaluates its updater');
  const result = h.apply();
  assert.equal(h.refs.filesRef.current, result);
  assert.equal(result[0], next);
  assert.deepEqual(h.calls, ['scene', 'save:semantic', 'files', 'updater']);
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
console.log('Workbench file collection timing and ownership tests passed.');
