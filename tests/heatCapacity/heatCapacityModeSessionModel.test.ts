import assert from 'node:assert/strict';
import {
  clearHeatCapacityModeSession,
  normalizeHeatCapacityModeSessionStore,
  restoreHeatCapacityModeSession,
  suspendHeatCapacityModeSession,
} from '../../src/features/heatCapacity/heatCapacityModeSessionModel.ts';
import {
  createDefaultHeatCapacityFile,
  startHeatCapacityGuideWorkbenchState,
} from '../../src/features/workbench/workbenchState.ts';

const freeSource = {
  ...createDefaultHeatCapacityFile(1),
  runState: 'running' as const,
  simulationTimeS: 137.5,
  lastUpdateMs: 900,
  displayResponseLastUpdateMs: 900,
  pumpStrokeCount: 9,
};
const withSuspendedFree = suspendHeatCapacityModeSession(freeSource, null, 1_000);
assert.equal(withSuspendedFree.heatCapacityModeSessions.free.status, 'suspended');
assert.equal(withSuspendedFree.heatCapacityModeSessions.free.resumeRunState, 'running');
assert.equal(
  withSuspendedFree.heatCapacityModeSessions.free.snapshot?.mode === 'free'
    ? withSuspendedFree.heatCapacityModeSessions.free.snapshot.free.heatCapacityFreePhysicsState
    : null,
  freeSource.heatCapacityFreePhysicsState,
  'in-memory mode checkpoints should structurally share immutable physics state instead of deep-cloning it on the UI thread',
);

const guideSource = {
  ...startHeatCapacityGuideWorkbenchState(withSuspendedFree, 1_100),
  runState: 'running' as const,
  simulationTimeS: 72.25,
  lastUpdateMs: 1_100,
  displayResponseLastUpdateMs: 1_100,
  heatCapacityGuidePhysicsState: {
    ...startHeatCapacityGuideWorkbenchState(withSuspendedFree, 1_100).heatCapacityGuidePhysicsState,
    simulationTimeS: 72.25,
  },
  heatCapacityGuideWorkflow: {
    ...startHeatCapacityGuideWorkbenchState(withSuspendedFree, 1_100).heatCapacityGuideWorkflow,
    step: 'u1Waiting' as const,
    waitStartedAtS: 28.5,
    waitStage: 'u1' as const,
  },
};
const withSuspendedGuide = suspendHeatCapacityModeSession(guideSource, null, 1_200);

const restoredFree = restoreHeatCapacityModeSession(withSuspendedGuide, 'free', 5_000);
assert.notEqual(restoredFree, null);
assert.equal(restoredFree?.heatCapacityMode, 'free');
assert.equal(restoredFree?.simulationTimeS, 137.5);
assert.equal(restoredFree?.pumpStrokeCount, 9);
assert.equal(restoredFree?.runState, 'running');
assert.equal(restoredFree?.lastUpdateMs, 5_000);
assert.equal(
  restoredFree?.heatCapacityFreePhysicsState,
  freeSource.heatCapacityFreePhysicsState,
  'restoring a mode should reuse its immutable physics snapshot and avoid a second main-thread deep clone',
);
assert.equal(
  restoredFree?.simulationTimeS,
  freeSource.simulationTimeS,
  'an inactive Free session must not consume simulation time while another mode is selected',
);

const restoredGuide = restoreHeatCapacityModeSession(withSuspendedGuide, 'guide', 8_000);
assert.notEqual(restoredGuide, null);
assert.equal(restoredGuide?.heatCapacityMode, 'guide');
assert.equal(restoredGuide?.simulationTimeS, 72.25);
assert.equal(restoredGuide?.heatCapacityGuidePhysicsState.simulationTimeS, 72.25);
assert.equal(restoredGuide?.heatCapacityGuideWorkflow.step, 'u1Waiting');
assert.equal(restoredGuide?.heatCapacityGuideWorkflow.waitStartedAtS, 28.5);
assert.equal(restoredGuide?.lastUpdateMs, 8_000);
assert.equal(
  (restoredGuide?.heatCapacityGuidePhysicsState.simulationTimeS ?? 0) -
    (restoredGuide?.heatCapacityGuideWorkflow.waitStartedAtS ?? 0),
  43.75,
  'the five-minute wait must resume from its exact elapsed simulation time',
);

const demoSource = {
  ...restoredGuide!,
  heatCapacityMode: 'demo' as const,
  runState: 'running' as const,
  heatCapacityTeachingStatus: 'running' as const,
  simulationTimeS: 19.5,
  lastUpdateMs: 7_500,
  displayResponseLastUpdateMs: 7_500,
};
const withSuspendedDemo = suspendHeatCapacityModeSession(demoSource, null, 8_100);
const restoredDemo = restoreHeatCapacityModeSession(withSuspendedDemo, 'demo', 12_000);
assert.equal(restoredDemo?.runState, 'paused');
assert.equal(restoredDemo?.simulationTimeS, 19.5);
assert.equal(restoredDemo?.lastUpdateMs, 7_500);
assert.equal(
  restoredDemo?.simulationTimeS,
  demoSource.simulationTimeS,
  'returning to Demo must expose a paused checkpoint rather than advancing in the background',
);

const clearedGuide = clearHeatCapacityModeSession(withSuspendedDemo, 'guide');
assert.equal(clearedGuide.heatCapacityModeSessions.guide.status, 'empty');
assert.equal(clearedGuide.heatCapacityModeSessions.guide.snapshot, null);
assert.equal(clearedGuide.heatCapacityModeSessions.free.status, 'suspended');

assert.deepEqual(
  normalizeHeatCapacityModeSessionStore({ schemaVersion: 0, free: { status: 'suspended' } }),
  createDefaultHeatCapacityFile(2).heatCapacityModeSessions,
  'unknown mode-session schemas must fall back atomically instead of partially restoring stale state',
);

console.log('heatCapacityModeSessionModel tests passed');
