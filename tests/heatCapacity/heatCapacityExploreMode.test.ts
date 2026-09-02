import assert from 'node:assert/strict';
import {
  configureHeatCapacityFreeBatchWorkbenchState,
  createDefaultHeatCapacityFile,
  getHeatCapacityCalculationSession,
  powerHeatCapacityWorkbenchFile,
  registerHeatCapacityPumpStroke,
  setHeatCapacityFreePumpValveOpen,
  setHeatCapacityScriptedStopcockOpen,
} from '../../src/features/workbench/workbenchState.ts';
import {
  enterHeatCapacityExploreModeWorkbenchState,
  prepareHeatCapacityFileForExploreOnOpen,
  restoreHeatCapacityModeSession,
} from '../../src/features/workbench/workbenchHeatCapacityModeSession.ts';
import {
  createHeatCapacityPersistencePayload,
  validateHeatCapacityPersistencePayload,
} from '../../src/features/workbench/workbenchHeatCapacityPersistence.ts';
import {
  projectWorkbenchPersistenceV3File,
  reprojectWorkbenchPersistenceV3File,
} from '../../src/features/workbench/persistenceV3/projection.ts';

const defaults = createDefaultHeatCapacityFile(99);
const configuredFree = configureHeatCapacityFreeBatchWorkbenchState(
  createDefaultHeatCapacityFile(1),
  3,
  1_000,
);
const poweredFree = powerHeatCapacityWorkbenchFile(configuredFree, true, 1_100);
const freeBeforeOpen = setHeatCapacityFreePumpValveOpen(poweredFree, true, 1_200);

const opened = prepareHeatCapacityFileForExploreOnOpen(freeBeforeOpen, defaults, 2_000);
assert.equal(opened.heatCapacityMode, null);
assert.equal(opened.powerOn, false);
assert.equal(opened.pumpValveOpen, false);
assert.equal(opened.heatCapacityModeSessions.free.status, 'suspended');
assert.equal(opened.heatCapacityModeSessions.free.snapshot?.mode, 'free');
const legacyExplorePayload = createHeatCapacityPersistencePayload(opened, 2_100);
assert.equal(legacyExplorePayload.mode, null);
assert.deepEqual(validateHeatCapacityPersistencePayload(legacyExplorePayload).errors, []);

const resumedFree = restoreHeatCapacityModeSession(opened, 'free', 3_000);
assert.ok(resumedFree);
assert.equal(resumedFree.heatCapacityMode, 'free');
assert.equal(resumedFree.heatCapacityFreeRunWorkspace.batch.targetGroupCount, 3);
assert.equal(resumedFree.pumpValveOpen, true);

const explore = enterHeatCapacityExploreModeWorkbenchState(
  createDefaultHeatCapacityFile(2),
  defaults,
  4_000,
);
assert.equal(explore.heatCapacityMode, null);
assert.equal(getHeatCapacityCalculationSession(explore), null);

const poweredExplore = powerHeatCapacityWorkbenchFile(explore, true, 4_100);
assert.equal(poweredExplore.powerOn, true, 'Explore keeps the physical instrument interactive');
const openedStopcock = setHeatCapacityScriptedStopcockOpen(poweredExplore, true, 4_200);
assert.equal(openedStopcock.glassPistonState, 'open');
assert.equal(openedStopcock.heatCapacityFreeRunWorkspace.trials.length, 0, 'Explore does not create formal Free records');
const pumpedExplore = registerHeatCapacityPumpStroke({
  ...poweredExplore,
  pumpValveOpen: true,
  pumpValveState: 'open',
}, 4_300);
assert.equal(pumpedExplore.pumpStrokeCount, 1, 'Explore keeps the physical pump interactive');
assert.deepEqual(pumpedExplore.heatCapacityProcessSamples, {});
assert.equal(pumpedExplore.heatCapacityFreeRunWorkspace.trials.length, 0);

const projectedExplore = projectWorkbenchPersistenceV3File(opened, 1);
if (!projectedExplore.ok) throw new Error(projectedExplore.diagnostics[0].message);
assert.equal(projectedExplore.value.fields.relation.heatCapacityMode, null);
const reprojectedExplore = reprojectWorkbenchPersistenceV3File(projectedExplore.value, 1);
if (!reprojectedExplore.ok) throw new Error(reprojectedExplore.diagnostics[0].message);
assert.equal(reprojectedExplore.value.kind, 'heatCapacity');
if (reprojectedExplore.value.kind !== 'heatCapacity') throw new Error('Expected heat-capacity file');
assert.equal(reprojectedExplore.value.heatCapacityMode, null);
const reopenedExplore = prepareHeatCapacityFileForExploreOnOpen(
  reprojectedExplore.value,
  defaults,
  5_000,
);
assert.equal(reopenedExplore.heatCapacityMode, null);
assert.equal(
  restoreHeatCapacityModeSession(reopenedExplore, 'free', 6_000)?.heatCapacityFreeRunWorkspace.batch.targetGroupCount,
  3,
  'the persisted Free session remains resumable after Explore normalization',
);

console.log('heatCapacityExploreMode tests passed');
