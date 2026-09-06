import assert from 'node:assert/strict';
import { createDefaultHeatCapacityFile } from '../../src/features/workbench/workbenchHeatCapacityFileFactory.ts';
import {
  resolveHeatCapacityFileModeActivation,
  resolveHeatCapacityModeFromExplore,
  resolveHeatCapacityModeTarget,
  shouldConfirmHeatCapacityTeachingProgressReset,
} from '../../src/features/workbench/workbenchHeatCapacityModeActivation.ts';
import {
  enterHeatCapacityExploreModeWorkbenchState,
  prepareHeatCapacityModeSessionForExit,
  suspendHeatCapacityModeSession,
} from '../../src/features/workbench/workbenchHeatCapacityModeSession.ts';
import {
  enterHeatCapacityFreeModeWorkbenchState,
  prepareHeatCapacityAutoDemoStart,
  startHeatCapacityGuideWorkbenchState,
} from '../../src/features/workbench/workbenchHeatCapacityTeachingLifecycleState.ts';
import { completeHeatCapacityTeachingModeWorkbenchState } from '../../src/features/workbench/workbenchHeatCapacityTeachingResultState.ts';
import { configureHeatCapacityFreeBatchWorkbenchState } from '../../src/features/workbench/workbenchHeatCapacityFreeExperimentGroupState.ts';
import { createWorkbenchHeatCapacityRefreshSession } from '../../src/features/workbench/workbenchHeatCapacityRefreshSession.ts';
import { createHeatCapacityModeUiCheckpoint } from '../../src/features/heatCapacity/heatCapacityModeUiCheckpoint.ts';
import type { WorkbenchHeatCapacityState } from '../../src/features/workbench/workbenchHeatCapacityStateTypes.ts';

const base = createDefaultHeatCapacityFile(1);
const exploreAfterExit = (file: WorkbenchHeatCapacityState) => enterHeatCapacityExploreModeWorkbenchState(
  prepareHeatCapacityModeSessionForExit(file, null, 2_000), base, 2_000,
);

// Demo and unfinished Guide never survive a normal exit, even with an old checkpoint present.
for (const mode of ['demo', 'guide'] as const) {
  const file = mode === 'demo' ? prepareHeatCapacityAutoDemoStart(base, 1_000) : startHeatCapacityGuideWorkbenchState(base, 1_000);
  const suspended = suspendHeatCapacityModeSession(file, null, 1_100);
  const explore = exploreAfterExit(suspended);
  assert.equal(explore.heatCapacityModeSessions[mode].status, 'empty');
  const target = resolveHeatCapacityModeFromExplore(explore, mode, null, 3_000);
  assert.equal(target.activation, `fresh-${mode}`);
  assert.equal(target.file.heatCapacityMode, mode);
  assert.equal(target.checkpoint, null);
  assert.equal(shouldConfirmHeatCapacityTeachingProgressReset(file, 'free'), true);
  assert.equal(shouldConfirmHeatCapacityTeachingProgressReset(file, mode), false);
}

// Completed Guide and Free keep their authoritative stored result/group data across Explore.
const completedGuide = completeHeatCapacityTeachingModeWorkbenchState(startHeatCapacityGuideWorkbenchState(base, 1_000), 1_500);
const retainedGuide = resolveHeatCapacityModeFromExplore(exploreAfterExit(completedGuide), 'guide', null, 3_000);
assert.equal(retainedGuide.activation, 'resume');
assert.equal(retainedGuide.file.heatCapacityTeachingStatus, 'completed');
assert.deepEqual(retainedGuide.file.heatCapacityGuideTrial, completedGuide.heatCapacityGuideTrial);
assert.equal(shouldConfirmHeatCapacityTeachingProgressReset(completedGuide, 'free'), false);

const free = configureHeatCapacityFreeBatchWorkbenchState(enterHeatCapacityFreeModeWorkbenchState(base, 1_000), 5, 1_100);
const originalFree = structuredClone(free);
const exploreFree = exploreAfterExit(free);
const retainedFree = resolveHeatCapacityModeFromExplore(exploreFree, 'free', null, 3_000);
assert.equal(retainedFree.activation, 'resume');
assert.deepEqual(retainedFree.file.heatCapacityFreeExperimentGroups, free.heatCapacityFreeExperimentGroups);
assert.deepEqual(retainedFree.file.heatCapacityFreeRunWorkspace.batch, free.heatCapacityFreeRunWorkspace.batch);
assert.deepEqual(free, originalFree, 'activation must not mutate the source authority');
const newPlan = resolveHeatCapacityModeFromExplore(base, 'free', 7, 3_000);
assert.equal(newPlan.activation, 'fresh-free');
assert.equal(newPlan.file.heatCapacityFreeRunWorkspace.batch.targetGroupCount, 7);

// A running Demo can resume only through an exact, valid UI checkpoint.
const demo = prepareHeatCapacityAutoDemoStart(base, 1_000);
const refresh = createWorkbenchHeatCapacityRefreshSession(demo.id, 'demo', 1_100);
const checkpoint = createHeatCapacityModeUiCheckpoint({
  fileId: demo.id, checkpointId: 'mode-activation-demo', capturedAtMs: 1_100,
  mode: 'demo', pumpAnimation: null,
  scene: { focusMode: 'none', cameraPose: null, cameraTransition: null, ultraVisualState: null, hardSphereVisualCheckpoint: null, focusSession: null },
  payload: { kind: 'demo', demo: { ...refresh.demo, phase: 'running', elapsedMs: 250 } },
});
const suspendedDemo = suspendHeatCapacityModeSession(demo, checkpoint, 1_100);
assert.equal(checkpoint.mode, 'demo');
const resumedDemo = resolveHeatCapacityModeTarget(suspendedDemo, 'demo', 3_000);
assert.equal(resumedDemo.activation, 'resume');
assert.equal(resumedDemo.file.runState, 'running');
assert.equal(resumedDemo.file.lastUpdateMs, 3_000);
assert.equal(resumedDemo.file.displayResponseLastUpdateMs, 3_000);
assert.deepEqual(resumedDemo.checkpoint, checkpoint);
for (const invalid of [null, { ...checkpoint, payload: { kind: 'demo' as const, demo: { ...checkpoint.payload.demo, phase: 'idle' as const } } }]) {
  const file = suspendHeatCapacityModeSession(demo, invalid, 1_100);
  assert.equal(resolveHeatCapacityModeTarget(file, 'demo', 3_000).activation, 'fresh-demo');
  assert.equal(resolveHeatCapacityFileModeActivation(file, 3_000).file.heatCapacityMode, 'free');
}
assert.equal(resolveHeatCapacityModeFromExplore(suspendedDemo, 'demo', null, 3_000).activation, 'fresh-demo', 'Explore entry deliberately restarts Demo');

const openedExplore = resolveHeatCapacityFileModeActivation(exploreFree, 3_000);
assert.equal(openedExplore.file.heatCapacityMode, null);
assert.equal(openedExplore.checkpoint, null);
assert.deepEqual(openedExplore.file.heatCapacityModeSessions.free, exploreFree.heatCapacityModeSessions.free);
const runningFree = { ...free, runState: 'running' as const, lastUpdateMs: 1_000, displayResponseLastUpdateMs: 1_000 };
const reopened = resolveHeatCapacityFileModeActivation(runningFree, 3_000);
assert.equal(reopened.file.lastUpdateMs, 3_000);
assert.equal(reopened.file.displayResponseLastUpdateMs, 3_000);
assert.deepEqual(reopened.file.heatCapacityFreeExperimentGroups, free.heatCapacityFreeExperimentGroups);

console.log('workbenchHeatCapacityModeActivation tests passed');
