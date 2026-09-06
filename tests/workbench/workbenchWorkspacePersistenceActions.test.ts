import assert from 'node:assert/strict';
import { createDefaultStandardFile } from '../../src/features/workbench/workbenchFileState.ts';
import { createDefaultHeatCapacityFile } from '../../src/features/workbench/workbenchHeatCapacityFileFactory.ts';
import { createWorkbenchHeatCapacityRefreshSession } from '../../src/features/workbench/workbenchHeatCapacityRefreshSession.ts';
import { createHeatCapacityModeUiCheckpoint } from '../../src/features/heatCapacity/heatCapacityModeUiCheckpoint.ts';
import { createWorkbenchActiveModeCheckpointOverride, type WorkbenchWorkspacePersistenceSnapshot } from '../../src/features/workbench/workbenchIndexedDbPersistence.ts';
import { createWorkbenchWorkspaceSnapshotCapture, createWorkbenchWorkspacePersistenceRequests, type WorkbenchWorkspaceSnapshotPorts } from '../../src/features/workbench/workbenchWorkspacePersistenceActions.ts';
import type { WorkbenchPersistenceScheduler } from '../../src/features/workbench/workbenchPersistenceScheduler.ts';

const heat = createDefaultHeatCapacityFile();
const standard = createDefaultStandardFile();
const refresh = createWorkbenchHeatCapacityRefreshSession(heat.id, 'free', 1000);
const checkpoint = createHeatCapacityModeUiCheckpoint({
  fileId: heat.id, checkpointId: 'save-1', capturedAtMs: 1000, mode: 'free',
  scene: { focusMode: 'none', cameraPose: null, cameraTransition: null, ultraVisualState: null, hardSphereVisualCheckpoint: null, focusSession: null },
  pumpAnimation: null, payload: { kind: 'free' },
});
const createHarness = () => {
  const calls: string[] = [];
  const live = { files: [heat, standard], closedFiles: [], activeFileId: heat.id, selectedPanel: 'preview' } satisfies Pick<WorkbenchWorkspacePersistenceSnapshot, 'files' | 'closedFiles' | 'activeFileId' | 'selectedPanel'>;
  const ports: WorkbenchWorkspaceSnapshotPorts = {
    readTutorialWorkspace: () => null,
    readFiles: () => live.files,
    readClosedFiles: () => live.closedFiles,
    readActiveFileId: () => live.activeFileId,
    readSelectedPanel: () => live.selectedPanel,
    readCapturedAtMs: () => { calls.push('clock'); return 1000; },
    readRefreshRestorePending: () => false,
    initialRefreshSession: null,
    buildRefreshSession: (time) => { calls.push('refresh:' + time); return refresh; },
    buildModeCheckpoint: (file, time) => { calls.push('checkpoint:' + file.id + ':' + time); return checkpoint; },
  };
  return { calls, live, ports, capture: createWorkbenchWorkspaceSnapshotCapture(ports) };
};
{
  const h = createHarness();
  assert.deepEqual(h.calls, [], 'constructing capture must not read a clock, materialize data, or save');
  const snapshot = h.capture();
  assert.equal(snapshot.files, h.live.files);
  assert.equal(snapshot.activeModeCheckpoint, checkpoint);
  assert.equal(snapshot.refreshSession, refresh);
  assert.deepEqual(h.calls, ['clock', 'refresh:1000', 'checkpoint:' + heat.id + ':1000'], 'both projections share one capture anchor');
}
{
  const h = createHarness();
  const ordinary = { ...h.live, files: [standard], activeFileId: standard.id };
  h.ports.readTutorialWorkspace = () => ordinary;
  const snapshot = h.capture();
  assert.equal(snapshot.files, ordinary.files);
  assert.equal(snapshot.activeFileId, standard.id);
  assert.equal(snapshot.refreshSession, null);
  assert.equal(snapshot.activeModeCheckpoint, null);
  assert.equal(snapshot.preserveActiveHeatCapacityModeSession, false);
  assert.deepEqual(h.calls, [], 'tutorial saves preserve the ordinary workspace without capturing tutorial runtime');
}
for (const explore of [false, true]) {
  const h = createHarness();
  if (explore) h.live.files = [{ ...heat, heatCapacityMode: null }, standard];
  else h.live.activeFileId = standard.id;
  const snapshot = h.capture();
  assert.equal(snapshot.refreshSession, null);
  assert.equal(snapshot.activeModeCheckpoint, null);
  assert.deepEqual(h.calls, ['clock']);
}
{
  const h = createHarness();
  h.ports.initialRefreshSession = refresh;
  h.ports.readRefreshRestorePending = () => true;
  const snapshot = h.capture(createWorkbenchActiveModeCheckpointOverride(heat.id, 'free', checkpoint));
  assert.equal(snapshot.refreshSession, refresh);
  assert.equal(snapshot.activeModeCheckpoint, null);
  assert.equal(snapshot.preserveActiveHeatCapacityModeSession, true);
  assert.deepEqual(h.calls, ['clock'], 'pending scene restore owns the original refresh anchor even when an override is supplied');
  h.live.activeFileId = standard.id;
  assert.equal(h.capture().preserveActiveHeatCapacityModeSession, false, 'another file must not inherit pending refresh ownership');
}
for (const supplied of [null, checkpoint]) {
  const h = createHarness();
  const snapshot = h.capture(createWorkbenchActiveModeCheckpointOverride(heat.id, 'free', supplied));
  assert.equal(snapshot.activeModeCheckpoint, supplied);
  assert.equal(snapshot.refreshSession, null);
  assert.deepEqual(h.calls, ['clock'], 'explicit null is a provided target checkpoint and must not recapture the outgoing render');
}
{
  const h = createHarness();
  h.capture(createWorkbenchActiveModeCheckpointOverride('another-file', 'free', null));
  assert.equal(h.calls.length, 3, 'an override for another file is absent for this target');
}
{
  const h = createHarness();
  const updated = { ...heat, name: 'updated while capturing' };
  h.ports.buildModeCheckpoint = () => { h.live.files = [updated, standard]; return checkpoint; };
  assert.equal(h.capture().files[0], updated, 'snapshot returns current authoritative collections after capture adapters run');
}
{
  const h = createHarness();
  let pending: (() => WorkbenchWorkspacePersistenceSnapshot) | null = null;
  const events: string[] = [];
  const scheduler: WorkbenchPersistenceScheduler<WorkbenchWorkspacePersistenceSnapshot> = {
    schedule: (produce, reason) => { pending = produce; events.push('schedule:' + reason); return true; },
    flush: async () => { events.push('flush'); return true; },
    dispose: () => {}, getStatus: () => ({ state: 'idle', savedAtMs: null }),
  };
  const requests = createWorkbenchWorkspacePersistenceRequests({ capture: h.capture, readScheduler: () => { events.push('scheduler'); return scheduler; } });
  assert.equal(requests.schedule('runtime-checkpoint'), true);
  assert.deepEqual(h.calls, [], 'debounced scheduling must retain a lazy capture callback');
  assert.equal(pending, h.capture);
  assert.equal(await requests.flush(createWorkbenchActiveModeCheckpointOverride(heat.id, 'free', null)), true);
  assert.deepEqual(events, ['scheduler', 'schedule:runtime-checkpoint', 'scheduler', 'schedule:lifecycle', 'flush']);
  const saved = pending!();
  h.live.activeFileId = standard.id;
  assert.equal(pending!(), saved, 'lifecycle flush must use the snapshot materialized before the asynchronous save');
  assert.equal(saved.activeFileId, heat.id);
  assert.equal(saved.activeModeCheckpoint, null);
  assert.deepEqual(h.calls, ['clock']);
}
{
  const h = createHarness();
  const requests = createWorkbenchWorkspacePersistenceRequests({
    capture: h.capture,
    readScheduler: () => { assert.equal(h.calls.length, 3, 'flush captures before even checking scheduler availability'); return null; },
  });
  assert.equal(await requests.flush(), false);
}
console.log('Workbench workspace snapshot ownership and persistence timing checks passed.');
