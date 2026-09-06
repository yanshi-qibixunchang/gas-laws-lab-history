import { materializePersistenceV3Snapshot } from '../../src/features/workbench/workbenchIndexedDbPersistence.ts';
import { InMemoryWorkbenchPersistenceV3GenerationStore } from '../../src/features/workbench/persistenceV3/generationStore.ts';
import { commitWorkbenchPersistenceV3ProductionSnapshot, restoreWorkbenchPersistenceV3ProductionWorkspace } from '../../src/features/workbench/persistenceV3/productionFacade.ts';
import { createWorkbenchSessionFromRuntimeFiles } from '../../src/features/workbench/workbenchSession.ts';
import { applyHeatCapacityFreeParameterDraftWorkbenchState } from '../../src/features/workbench/workbenchHeatCapacityFreeParameterState.ts';
import { selectHeatCapacityFreeAppliedParameterDraft } from '../../src/features/workbench/workbenchHeatCapacityFreeAuthorityTransaction.ts';
import { resolveHeatCapacityModeFromExplore, resolveHeatCapacityModeTarget } from '../../src/features/workbench/workbenchHeatCapacityModeActivation.ts';
import { prepareHeatCapacityModeSessionForExit } from '../../src/features/workbench/workbenchHeatCapacityModeSession.ts';
import { normalizeHeatCapacitySessionRuntimeState } from '../../src/features/workbench/workbenchHeatCapacitySessionRestore.ts';
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

// The real database bootstrap normalizes runtime files after V3 reprojection.
// Explore has a clean instrument shell while its suspended Free session owns
// the edited experiment. Treating explicit null as legacy Free overwrites it.
const bootstrapStartedAt = 7_000;
const editedFree = applyHeatCapacityFreeParameterDraftWorkbenchState(configuredFree, {
  ...selectHeatCapacityFreeAppliedParameterDraft(configuredFree),
  ambientTemperatureK: 299.15,
}, bootstrapStartedAt);
let bootstrapExplore = prepareHeatCapacityFileForExploreOnOpen(editedFree, defaults, bootstrapStartedAt + 1);
const preservedFreeSession = structuredClone(bootstrapExplore.heatCapacityModeSessions.free);
for (const openedAt of [bootstrapStartedAt + 2, bootstrapStartedAt + 3]) {
  const projected = projectWorkbenchPersistenceV3File(bootstrapExplore, 1);
  if (!projected.ok) throw new Error(projected.diagnostics[0].message);
  const decoded = reprojectWorkbenchPersistenceV3File(projected.value, 1);
  if (!decoded.ok) throw new Error(decoded.diagnostics[0].message);
  const bootstrapped = createWorkbenchSessionFromRuntimeFiles({
    files: [decoded.value],
    activeFileId: editedFree.id,
    selectedPanel: 'preview',
  }).files[0];
  if (bootstrapped.kind !== 'heatCapacity') throw new Error('Expected heat-capacity bootstrap');
  assert.equal(bootstrapped.heatCapacityMode, null, 'bootstrap must preserve explicit Explore');
  assert.equal(bootstrapped.ambientTemperatureK, defaults.ambientTemperatureK);
  assert.deepEqual(bootstrapped.heatCapacityModeSessions.free, preservedFreeSession);
  bootstrapExplore = prepareHeatCapacityFileForExploreOnOpen(bootstrapped, defaults, openedAt);
  assert.deepEqual(
    bootstrapExplore.heatCapacityModeSessions.free,
    preservedFreeSession,
    'reopening Explore must not recapture its default common readings as a Free session',
  );
}
const resumedEditedFree = resolveHeatCapacityModeFromExplore(
  bootstrapExplore, 'free', null, bootstrapStartedAt + 4,
).file;
assert.equal(resumedEditedFree.ambientTemperatureK, 299.15);
assert.equal(resumedEditedFree.heatCapacityFreeInstrumentConfig.environment.ambientTemperatureK, 299.15);
assert.equal(resumedEditedFree.heatCapacityFreeRunWorkspace.batch.targetGroupCount, 3);
const switchedToGuide = resolveHeatCapacityModeTarget(
  prepareHeatCapacityModeSessionForExit(resumedEditedFree, null, bootstrapStartedAt + 5),
  'guide',
  bootstrapStartedAt + 5,
).file;
const persistedGuide = projectWorkbenchPersistenceV3File(switchedToGuide, 1);
assert.equal(persistedGuide.ok, true, 'switching to Guide must keep the edited Free session canonical');
assert.equal(switchedToGuide.heatCapacityModeSessions.free.snapshot?.common.ambientTemperatureK, 299.15);

for (const legacyMode of [undefined, 'unknown-mode']) {
  const legacyInput = { ...defaults, heatCapacityMode: legacyMode } as unknown as typeof defaults;
  assert.equal(
    normalizeHeatCapacitySessionRuntimeState(legacyInput).heatCapacityMode,
    defaults.heatCapacityMode,
    'missing and unknown legacy modes keep their established fallback',
  );
}


// Capture the active teaching session exactly as the production save adapter
// does; projecting a file with an empty Guide entry cannot detect a bad capture.
const changedEnvironmentFree = applyHeatCapacityFreeParameterDraftWorkbenchState(configuredFree, {
  ...selectHeatCapacityFreeAppliedParameterDraft(configuredFree),
  ambientPressureKPa: 102.3,
  ambientTemperatureK: 299.15,
}, 12_000);
const sourceWithFreeSession = prepareHeatCapacityModeSessionForExit(changedEnvironmentFree, null, 12_100);
for (const targetMode of ['demo', 'guide'] as const) {
  const target = resolveHeatCapacityModeTarget(sourceWithFreeSession, targetMode, 12_200).file;
  const savedSnapshot = materializePersistenceV3Snapshot({
    files: [target],
    closedFiles: [],
    activeFileId: target.id,
    selectedPanel: 'preview',
    refreshSession: null,
    activeModeCheckpoint: null,
    preserveActiveHeatCapacityModeSession: false,
  }, 12_300);
  const store = new InMemoryWorkbenchPersistenceV3GenerationStore();
  const namespace = 'explore-to-teaching-' + targetMode;
  const saved = await commitWorkbenchPersistenceV3ProductionSnapshot({
    store,
    namespace,
    generationId: 'teaching-mode-entry',
    capturedAtMs: 12_300,
    snapshot: savedSnapshot,
  });
  assert.equal(saved.retained.opaqueFiles.length, 0, targetMode + ' entry must save without quarantine');
  const restored = await restoreWorkbenchPersistenceV3ProductionWorkspace(store, namespace);
  assert.ok(restored);
  const restoredTeaching = restored.files[0];
  if (restoredTeaching?.kind !== 'heatCapacity') throw new Error('Teaching file must survive restore');
  assert.equal(restoredTeaching.heatCapacityMode, targetMode);
  assert.deepEqual(
    restoredTeaching.heatCapacityModeSessions.free,
    sourceWithFreeSession.heatCapacityModeSessions.free,
    'teaching initialization must preserve the entire suspended Free experiment',
  );
  const resumedFree = restoreHeatCapacityModeSession(restoredTeaching, 'free', 12_400);
  assert.ok(resumedFree);
  assert.equal(resumedFree.ambientPressureKPa, 102.3);
  assert.equal(resumedFree.ambientTemperatureK, 299.15);
  assert.equal(resumedFree.heatCapacityFreeRunWorkspace.batch.targetGroupCount, 3);
  if (targetMode === 'guide') {
    const guideEnvironment = target.heatCapacityGuidePhysicsConfig.environment;
    assert.equal(target.ambientPressureKPa, guideEnvironment.ambientPressureKPa);
    assert.equal(target.ambientTemperatureK, guideEnvironment.ambientTemperatureK);
    assert.equal(target.vesselPressureReadoutKPa, Math.round(guideEnvironment.ambientPressureKPa * 100) / 100);
    assert.equal(target.vesselTemperatureReadoutK, Math.round(guideEnvironment.ambientTemperatureK * 1_000) / 1_000);
  }
}

console.log('heatCapacityExploreMode tests passed');
