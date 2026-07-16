import assert from 'node:assert/strict';
import { createHeatCapacityFreeAttempt } from '../../src/domain/heatCapacity/heatCapacityFreeAttemptModel.ts';
import {
  assertWorkbenchHeatCapacityRefreshCheckpointMatchesMetadata,
  createPersistenceRecords,
  materializeWorkbenchHeatCapacityModeSessionsForPersistence,
  resolveWorkbenchHeatCapacityModeRestoreAtMs,
} from '../../src/features/workbench/workbenchIndexedDbPersistence.ts';
import {
  normalizeHeatCapacityModeSessionStore,
  restoreHeatCapacityModeSession,
  suspendHeatCapacityModeSession,
} from '../../src/features/workbench/workbenchHeatCapacityModeSession.ts';
import { createWorkbenchHeatCapacityRefreshSession } from '../../src/features/workbench/workbenchHeatCapacityRefreshSession.ts';
import { rebaseHeatCapacityFileAfterSuspendedWallClock } from '../../src/features/workbench/workbenchHeatCapacityTimeRebase.ts';
import { createHeatCapacityModeUiCheckpoint } from '../../src/features/heatCapacity/heatCapacityModeUiCheckpoint.ts';
import {
  adjustHeatCapacityPressureZeroFine,
  createDefaultHeatCapacityFile,
  type WorkbenchHeatCapacityState,
} from '../../src/features/workbench/workbenchState.ts';

(globalThis as typeof globalThis & { __APP_VERSION__: string }).__APP_VERSION__ = '5.1.1';

const CAPTURED_AT_MS = 10_000;
const LOADED_AT_MS = 40_000;
const SCENE_READY_AT_MS = 80_000;

const createFreeUiCheckpoint = (
  fileId: string,
  checkpointId: string,
  capturedAtMs: number,
) => createHeatCapacityModeUiCheckpoint({
  fileId,
  checkpointId,
  capturedAtMs,
  mode: 'free',
  scene: {
    focusMode: 'none',
    cameraPose: null,
    cameraTransition: null,
    ultraVisualState: null,
    hardSphereVisualCheckpoint: null,
    focusSession: null,
  },
  pumpAnimation: null,
  payload: { kind: 'free' },
});

const createClockBearingFreeFile = (): WorkbenchHeatCapacityState => {
  const base = createDefaultHeatCapacityFile(1);
  const activeAttempt = createHeatCapacityFreeAttempt({
    startReason: 'u0-recorded',
    preheatOutcome: 'completed',
    atS: 5,
    wallClockMs: 1_000,
    powerOn: false,
  });
  return {
    ...base,
    id: 'heat-anchor',
    runState: 'running',
    lastUpdateMs: 9_000,
    displayResponseLastUpdateMs: 9_100,
    pressureDisplayNextJitterAtMs: 9_950,
    temperatureDisplayNextJitterAtMs: 9_960,
    heatCapacityFreeRealDomain: {
      ...base.heatCapacityFreeRealDomain,
      activeAttempt,
    },
    heatCapacityFreeActiveAttempt: activeAttempt,
  };
};

const activeRuntimeFile = createClockBearingFreeFile();
const inactiveRuntimeFile = {
  ...createDefaultHeatCapacityFile(2),
  id: 'heat-inactive',
};
const inactiveCanonicalFile = suspendHeatCapacityModeSession(
  inactiveRuntimeFile,
  null,
  CAPTURED_AT_MS - 1_000,
);
const refreshSession = createWorkbenchHeatCapacityRefreshSession(
  activeRuntimeFile.id,
  activeRuntimeFile.heatCapacityMode,
  CAPTURED_AT_MS,
);
const refreshUiCheckpoint = createFreeUiCheckpoint(
  activeRuntimeFile.id,
  'refresh-ui-checkpoint',
  CAPTURED_AT_MS,
);

assert.throws(
  () => createPersistenceRecords('clock-anchor-missing-ui-checkpoint', {
    files: [activeRuntimeFile],
    closedFiles: [],
    activeFileId: activeRuntimeFile.id,
    selectedPanel: 'preview',
    refreshSession,
    activeModeCheckpoint: null,
    preserveActiveHeatCapacityModeSession: false,
  }),
  /no matching canonical mode checkpoint/,
  'the current writer must not emit refresh metadata that its own reader will reject',
);

const driftedRefreshUiCheckpoint = createFreeUiCheckpoint(
  activeRuntimeFile.id,
  'drifted-refresh-ui-checkpoint',
  CAPTURED_AT_MS - 1,
);
assert.throws(
  () => assertWorkbenchHeatCapacityRefreshCheckpointMatchesMetadata(
    driftedRefreshUiCheckpoint,
    {
      activeHeatCapacityFileId: activeRuntimeFile.id,
      mode: activeRuntimeFile.heatCapacityMode,
      capturedAtMs: CAPTURED_AT_MS,
    },
  ),
  /mismatched capture anchors/,
  'current refresh metadata and its canonical UI checkpoint must share one capture anchor',
);
assert.throws(
  () => createPersistenceRecords('clock-anchor-drifted-ui-checkpoint', {
    files: [activeRuntimeFile],
    closedFiles: [],
    activeFileId: activeRuntimeFile.id,
    selectedPanel: 'preview',
    refreshSession,
    activeModeCheckpoint: driftedRefreshUiCheckpoint,
    preserveActiveHeatCapacityModeSession: false,
  }),
  /mismatched capture anchors/,
  'the writer must reject current refresh metadata paired with a UI checkpoint from another anchor',
);

const normalRecords = createPersistenceRecords('clock-anchor-normal', {
  files: [activeRuntimeFile, inactiveCanonicalFile],
  closedFiles: [],
  activeFileId: activeRuntimeFile.id,
  selectedPanel: 'preview',
  refreshSession,
  activeModeCheckpoint: refreshUiCheckpoint,
  preserveActiveHeatCapacityModeSession: false,
});
const normalActiveRecord = normalRecords.modeRecords.find((record) => (
  record.fileId === activeRuntimeFile.id && record.mode === activeRuntimeFile.heatCapacityMode
));
const normalInactiveRecord = normalRecords.modeRecords.find((record) => (
  record.fileId === inactiveCanonicalFile.id && record.mode === inactiveCanonicalFile.heatCapacityMode
));

assert.ok(normalActiveRecord);
assert.equal(
  normalActiveRecord.entry.capturedAtMs,
  CAPTURED_AT_MS,
  'normal persistence must capture the active mode at the exact refresh metadata anchor',
);
assert.strictEqual(
  normalActiveRecord.entry.uiCheckpoint,
  refreshUiCheckpoint,
  'refresh metadata and its active canonical mode record must carry the same UI checkpoint',
);
assert.equal(
  activeRuntimeFile.heatCapacityModeSessions.free.status,
  'empty',
  'record materialization must not mutate the live active file',
);
assert.ok(normalInactiveRecord);
assert.strictEqual(
  normalInactiveRecord.entry,
  inactiveCanonicalFile.heatCapacityModeSessions.free,
  'normal persistence must retain an inactive file\'s already-canonical mode entry',
);

const noRefreshRuntimeFile = {
  ...adjustHeatCapacityPressureZeroFine(createDefaultHeatCapacityFile(3), 1, 950),
  id: 'heat-no-refresh-anchor',
};
const oldUiCheckpoint = createFreeUiCheckpoint(
  noRefreshRuntimeFile.id,
  'old-ui-checkpoint',
  CAPTURED_AT_MS,
);
const oldCanonicalFile = suspendHeatCapacityModeSession(
  noRefreshRuntimeFile,
  oldUiCheckpoint,
  CAPTURED_AT_MS,
);
const activatedAtLoad = restoreHeatCapacityModeSession(
  oldCanonicalFile,
  oldCanonicalFile.heatCapacityMode,
  LOADED_AT_MS,
);
assert.ok(activatedAtLoad);
const noRefreshRecords = createPersistenceRecords('clock-anchor-old-ui-checkpoint', {
  files: [activatedAtLoad],
  closedFiles: [],
  activeFileId: activatedAtLoad.id,
  selectedPanel: 'preview',
  refreshSession: null,
  activeModeCheckpoint: oldUiCheckpoint,
  preserveActiveHeatCapacityModeSession: false,
});
const noRefreshActiveRecord = noRefreshRecords.modeRecords.find((record) => (
  record.fileId === activatedAtLoad.id && record.mode === activatedAtLoad.heatCapacityMode
));
assert.ok(noRefreshActiveRecord);
assert.equal(
  noRefreshActiveRecord.entry.capturedAtMs,
  noRefreshRecords.meta.savedAtMs,
  'an old UI checkpoint may supply UI payload but must never supply the new runtime capture anchor',
);
assert.notEqual(noRefreshActiveRecord.entry.capturedAtMs, oldUiCheckpoint.capturedAtMs);
assert.equal(
  normalizeHeatCapacityModeSessionStore({
    ...activatedAtLoad.heatCapacityModeSessions,
    free: noRefreshActiveRecord.entry,
  }, activatedAtLoad.id).free.status,
  'suspended',
  'a no-refresh override flush must remain canonical after strict normalization',
);

const pendingCanonicalFile = suspendHeatCapacityModeSession(
  activeRuntimeFile,
  refreshUiCheckpoint,
  CAPTURED_AT_MS,
);
const preservedModeSessions = materializeWorkbenchHeatCapacityModeSessionsForPersistence({
  file: pendingCanonicalFile,
  captureCurrentMode: false,
  uiCheckpoint: null,
});
assert.strictEqual(
  preservedModeSessions,
  pendingCanonicalFile.heatCapacityModeSessions,
  'a pending scene restore must retain the original canonical mode store by identity',
);

const pendingRecords = createPersistenceRecords('clock-anchor-pending', {
  files: [pendingCanonicalFile],
  closedFiles: [],
  activeFileId: pendingCanonicalFile.id,
  selectedPanel: 'preview',
  refreshSession,
  activeModeCheckpoint: null,
  preserveActiveHeatCapacityModeSession: true,
});
const pendingActiveRecord = pendingRecords.modeRecords.find((record) => (
  record.fileId === pendingCanonicalFile.id && record.mode === pendingCanonicalFile.heatCapacityMode
));
assert.ok(pendingActiveRecord);
assert.strictEqual(
  pendingActiveRecord.entry,
  pendingCanonicalFile.heatCapacityModeSessions.free,
  'pagehide or desktop exit during hydration must not recapture the current mode at a later wall clock',
);
assert.equal(pendingActiveRecord.entry.capturedAtMs, CAPTURED_AT_MS);
assert.strictEqual(pendingActiveRecord.entry.uiCheckpoint, refreshUiCheckpoint);

assert.throws(
  () => createPersistenceRecords('clock-anchor-corrupt', {
    files: [pendingCanonicalFile],
    closedFiles: [],
    activeFileId: pendingCanonicalFile.id,
    selectedPanel: 'preview',
    refreshSession: createWorkbenchHeatCapacityRefreshSession(
      pendingCanonicalFile.id,
      pendingCanonicalFile.heatCapacityMode,
      CAPTURED_AT_MS + 1,
    ),
    activeModeCheckpoint: null,
    preserveActiveHeatCapacityModeSession: true,
  }),
  /mismatched refresh and mode-session anchors/,
  'current-format persistence must reject a pending refresh whose canonical mode anchor has drifted',
);

const deferredRestoreAtMs = resolveWorkbenchHeatCapacityModeRestoreAtMs({
  refreshTarget: {
    activeHeatCapacityFileId: pendingCanonicalFile.id,
    mode: pendingCanonicalFile.heatCapacityMode,
    capturedAtMs: CAPTURED_AT_MS,
  },
  workspaceActiveFileId: pendingCanonicalFile.id,
  fileId: pendingCanonicalFile.id,
  fileMode: pendingCanonicalFile.heatCapacityMode,
  modeSessionCapturedAtMs: pendingCanonicalFile.heatCapacityModeSessions.free.capturedAtMs,
  nowMs: LOADED_AT_MS,
});
assert.equal(
  deferredRestoreAtMs,
  CAPTURED_AT_MS,
  'IndexedDB load must defer the active refresh target\'s wall-clock rebase until the scene is ready',
);
assert.equal(
  resolveWorkbenchHeatCapacityModeRestoreAtMs({
    refreshTarget: null,
    workspaceActiveFileId: pendingCanonicalFile.id,
    fileId: pendingCanonicalFile.id,
    fileMode: pendingCanonicalFile.heatCapacityMode,
    modeSessionCapturedAtMs: CAPTURED_AT_MS,
    nowMs: LOADED_AT_MS,
  }),
  LOADED_AT_MS,
  'a normal load without refresh metadata must restore at the current wall clock',
);
assert.throws(
  () => resolveWorkbenchHeatCapacityModeRestoreAtMs({
    refreshTarget: {
      activeHeatCapacityFileId: pendingCanonicalFile.id,
      mode: pendingCanonicalFile.heatCapacityMode,
      capturedAtMs: CAPTURED_AT_MS,
    },
    workspaceActiveFileId: pendingCanonicalFile.id,
    fileId: pendingCanonicalFile.id,
    fileMode: pendingCanonicalFile.heatCapacityMode,
    modeSessionCapturedAtMs: CAPTURED_AT_MS + 1,
    nowMs: LOADED_AT_MS,
  }),
  /mismatched capture anchors/,
  'IndexedDB load must reject current refresh metadata that disagrees with the current mode record',
);

const restoredAtOriginalAnchor = restoreHeatCapacityModeSession(
  pendingCanonicalFile,
  pendingCanonicalFile.heatCapacityMode,
  deferredRestoreAtMs,
);
assert.ok(restoredAtOriginalAnchor);
assert.equal(restoredAtOriginalAnchor.heatCapacityFreeActiveAttempt?.startedAtWallClockMs, 1_000);
assert.equal(restoredAtOriginalAnchor.lastUpdateMs, CAPTURED_AT_MS);

const readyFile = rebaseHeatCapacityFileAfterSuspendedWallClock(
  restoredAtOriginalAnchor,
  CAPTURED_AT_MS,
  SCENE_READY_AT_MS,
);
assert.equal(readyFile.heatCapacityFreeActiveAttempt?.startedAtWallClockMs, 71_000);
assert.equal(readyFile.heatCapacityFreeActiveAttempt?.powerOffStartedAtWallClockMs, 71_000);
assert.equal(
  readyFile.heatCapacityFreeRealDomain.activeAttempt,
  readyFile.heatCapacityFreeActiveAttempt,
  'the direct active-attempt projection must retain domain identity after the one scene-ready rebase',
);
assert.equal(readyFile.lastUpdateMs, SCENE_READY_AT_MS);
assert.ok(
  readyFile.lastUpdateMs === null || readyFile.lastUpdateMs <= SCENE_READY_AT_MS,
  'single-anchor restoration must not place the physical clock in the future',
);

console.log('workbenchIndexedDbHeatCapacityClockAnchors tests passed');
