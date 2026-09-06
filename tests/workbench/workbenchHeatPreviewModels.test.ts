import assert from 'node:assert/strict';
import { createDefaultHeatCapacityFile } from '../../src/features/workbench/workbenchHeatCapacityFileFactory.ts';
import { getHeatCapacityRealtimeCopy } from '../../src/features/workbench/workbenchHeatCapacityRealtimeCopy.ts';
import { deriveWorkbenchHeatPreviewRecords } from '../../src/features/workbench/workbenchHeatPreviewRecords.ts';
import { deriveWorkbenchHeatPreviewWait } from '../../src/features/workbench/workbenchHeatPreviewWait.ts';
import { deriveWorkbenchHeatPreviewPhysics } from '../../src/features/workbench/workbenchHeatPreviewPhysics.ts';
import { deriveWorkbenchHeatSceneReadings } from '../../src/features/workbench/workbenchHeatSceneReadings.ts';
import { deriveWorkbenchHeatSceneRestoreView } from '../../src/features/workbench/workbenchHeatSceneRestoreView.ts';
import { HEAT_CAPACITY_QUALITY_PROFILES } from '../../src/features/heatCapacity/heatCapacityQualityProfiles.ts';
import { getHeatCapacityAutoDemoTimeline } from '../../src/domain/heatCapacity/heatCapacityAutoDemo.ts';

const file = createDefaultHeatCapacityFile(72);
const copy = getHeatCapacityRealtimeCopy('zh-CN');
const snapshot = JSON.stringify(file);
const records = deriveWorkbenchHeatPreviewRecords({ activeFile: file, guideHeatCapacityActiveFileId: null, autoDemoInteractionLocked: false, heatCapacityRealtimeCopy: copy });
assert.equal(records.activeGuideRecordKind, null);
assert.equal(records.getGuideRecordLabel('u2'), copy.recordU2);
assert.equal(records.heatCapacityTeachingCompleted, false);
const physicsPorts: Parameters<typeof deriveWorkbenchHeatPreviewPhysics>[0] = {
  activeFile: file, desktopExitQuiesced: false, heatCapacityRefreshRestoring: false,
  heatCapacityRuntimeFailureFileId: null, heatCapacityLessonDialogActive: false,
  autoDemoPaused: false, settingsLanguagePreference: 'zh-CN', heatCapacityModeSceneRestoreSession: null,
  heatCapacityQualityProfile: HEAT_CAPACITY_QUALITY_PROFILES.balanced,
  normalizeHeatCapacityCameraTransitionState: () => null,
  normalizeHeatCapacityUltraVisualState: () => null,
  normalizeHeatCapacityHardSphereVisualCheckpoint: () => null,
};
const physics = deriveWorkbenchHeatPreviewPhysics(physicsPorts);
assert.equal(physics.heatCapacityHardSphereGasTemperatureK, file.heatCapacityFreeInstrumentState.physics.gasTemperatureK);
assert.equal(physics.releaseFlowActive, false);
assert.equal(physics.heatCapacityHardSpherePaused, false);
for (const flag of ['desktopExitQuiesced', 'heatCapacityRefreshRestoring', 'heatCapacityLessonDialogActive', 'autoDemoPaused'] as const) {
  assert.equal(deriveWorkbenchHeatPreviewPhysics({ ...physicsPorts, [flag]: true }).heatCapacityHardSpherePaused, true, flag);
}
assert.equal(deriveWorkbenchHeatPreviewPhysics({ ...physicsPorts, heatCapacityRuntimeFailureFileId: file.id }).heatCapacityHardSpherePaused, true);
assert.equal(deriveWorkbenchHeatPreviewPhysics({ ...physicsPorts, heatCapacityRuntimeFailureFileId: 'other' }).heatCapacityHardSpherePaused, false);

const waitPorts: Parameters<typeof deriveWorkbenchHeatPreviewWait>[0] = {
  activeFile: file, autoDemoRunning: false, autoDemoPaused: false, heatCapacityRefreshRestoring: false,
  initialHeatCapacityRefreshSession: null, desktopExitQuiesced: false,
  desktopExitAutoDemoClockRef: { current: null }, autoDemoTimelineClockMs: 10000,
  heatCapacityAutoDemoStartedAtMsRef: { current: 0 }, heatCapacityAutoDemoPausedElapsedMsRef: { current: 0 },
  heatCapacityAutoDemoTimelineRef: { current: getHeatCapacityAutoDemoTimeline() }, heatCapacityRealtimeCopy: copy,
};
const wait = deriveWorkbenchHeatPreviewWait(waitPorts);
assert.equal(wait.heatCapacityActiveSpeedMultiplier, file.heatCapacityFreeEquilibriumSpeedMultiplier);
const readingsPorts: Parameters<typeof deriveWorkbenchHeatSceneReadings>[0] = {
  activeFile: file, heatCapacityAutoDemoZeroKnobMotion: wait.heatCapacityAutoDemoZeroKnobMotion,
  ...physics, heatCapacityPumpPulseId: 2, heatCapacityRecordPulseId: 3,
  heatCapacityDisplayPhase: records.heatCapacityDisplayPhase, activeHeatCapacityPreheatLocked: false,
  activeHeatCapacityDisplay: records.activeHeatCapacityDisplay,
};
const readings = deriveWorkbenchHeatSceneReadings(readingsPorts);
assert.equal(readings.temperatureSignalMv, null, 'Power-off instruments hide both signals');
assert.equal(readings.pressureSignalMv, null);
const poweredFile = { ...file, powerOn: true };
const poweredReadings = deriveWorkbenchHeatSceneReadings({ ...readingsPorts, activeFile: poweredFile });
assert.equal(poweredReadings.temperatureSignalMv, records.activeHeatCapacityDisplay.temperatureMv);
assert.equal(poweredReadings.pressureSignalMv, records.activeHeatCapacityDisplay.pressureMv);
assert.equal(deriveWorkbenchHeatSceneReadings({ ...readingsPorts, activeFile: poweredFile, activeHeatCapacityPreheatLocked: true }).pressureSignalMv, null);
assert.equal(readings.recordPulseId, 3);

const restorePorts: Parameters<typeof deriveWorkbenchHeatSceneRestoreView>[0] = {
  activeFile: file, modeSceneRestoreSession: null, modeSceneCameraPose: null,
  heatCapacityInitialSceneRestoreEnabled: false, initialHeatCapacityRefreshSession: null,
  initialHeatCapacityCameraPose: null, modeSceneFocusMode: null, initialHeatCapacityFocusMode: null,
  modeSceneCameraTransition: null, initialHeatCapacityCameraTransition: null,
  modeSceneUltraVisualState: null, initialHeatCapacityUltraVisualState: null,
  modeSceneHardSphereCheckpoint: null, initialHeatCapacityHardSphereVisualCheckpoint: null,
  heatCapacitySceneRestoreAcknowledged: true, heatCapacityModeSceneRestoreRequest: null,
  heatCapacityModeTransitionLocked: false, HEAT_CAPACITY_MODE_TRANSITION_VISUAL_MS: 380,
  desktopExitQuiesced: false,
  heatCapacityModeTransitionState: { phase: 'idle' } as Parameters<typeof deriveWorkbenchHeatSceneRestoreView>[0]['heatCapacityModeTransitionState'],
  HEAT_CAPACITY_REFRESH_SCENE_REVISION: 'heat-capacity-instrument-scene-v1',
  resolvedWorkbenchTheme: 'light', settingsPerformanceMode: 'balanced',
};
const restore = deriveWorkbenchHeatSceneRestoreView(restorePorts);
assert.equal(restore.initialCameraPose, null);
assert.equal(restore.restoredSceneFrameDataUrl, null);
assert.equal(restore.restoreAudioMuted, false);
assert.equal(deriveWorkbenchHeatSceneRestoreView({ ...restorePorts, desktopExitQuiesced: true }).restoreAudioMuted, true);
const snapshotSession = {
  activeHeatCapacityFileId: file.id,
  sceneSnapshot: {
    sceneRevision: 'heat-capacity-instrument-scene-v1', themeId: 'light',
    performanceProfileId: 'balanced', imageDataUrl: 'data:image/png;base64,eA==',
  },
} as Parameters<typeof deriveWorkbenchHeatSceneRestoreView>[0]['initialHeatCapacityRefreshSession'];
const restoreSnapshot = deriveWorkbenchHeatSceneRestoreView({ ...restorePorts, heatCapacityInitialSceneRestoreEnabled: true, initialHeatCapacityRefreshSession: snapshotSession });
assert.equal(restoreSnapshot.restoredSceneFrameDataUrl, snapshotSession.sceneSnapshot!.imageDataUrl);
assert.equal(deriveWorkbenchHeatSceneRestoreView({ ...restorePorts, heatCapacityInitialSceneRestoreEnabled: true, initialHeatCapacityRefreshSession: snapshotSession, resolvedWorkbenchTheme: 'dark' }).restoredSceneFrameDataUrl, null);
assert.equal(JSON.stringify(file), snapshot, 'Read-only view derivations do not mutate authority or checkpoints');
console.log('Workbench Heat preview model tests passed.');
