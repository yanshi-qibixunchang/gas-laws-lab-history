import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, '..', '..');
const readSource = (relativePath: string) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

const workbenchSource = readSource('src/features/workbench/WorkbenchStudioPrototype.tsx');
const sceneSource = readSource('src/features/heatCapacity/HeatCapacityInstrumentScene.tsx');
const styleSource = readSource('src/features/workbench/WorkbenchStudioPrototype.css');
const audioSource = readSource('src/audio/experiments/heatCapacity/heatCapacityAudioController.ts');

assert.match(
  workbenchSource,
  /<HeatCapacityInstrumentScene[\s\S]*key=\{activeFile\.id\}/,
  'the 3D scene should persist across mode changes within one experiment file',
);
assert.match(
  workbenchSource,
  /const rejectHeatCapacityUserInteraction = [\s\S]*phase === 'idle'[\s\S]*showHeatCapacityAutoDemoLockedToast/,
  'transition-time instrument clicks should be ignored silently while ordinary locks retain their warning feedback',
);
assert.match(
  workbenchSource,
  /interactionLocked=\{[\s\S]*?autoDemoInteractionLocked[\s\S]*?activeHeatCapacityModalLocked[\s\S]*?heatCapacityTeachingCompleted[\s\S]*?heatCapacityModeTransitionLocked[\s\S]*?activeHeatCapacityCurrentGroup\.status !== 'draft'[\s\S]*?activeHeatCapacityCurrentGroup\.status !== 'collecting'[\s\S]*?\}\s*cameraInteractionLocked=/,
  'the mode coordinator must lock scene interactions during switching and while the current Free experiment group is terminal',
);
assert.match(
  workbenchSource,
  /restoreAudioMuted=\{[\s\S]*'preparing-target'[\s\S]*'animating'/,
  'control restoration should be muted for the complete target projection and transition interval',
);
assert.match(
  workbenchSource,
  /checkpointRegistration\.provider\(\)/,
  'mode switching should checkpoint exact semantic scene state without serializing a canvas bitmap on the UI thread',
);
assert.match(
  workbenchSource,
  /heatCapacitySceneModeTransitionControllerRef\.current\?\.prepare\(requestId, null\)/,
  'mode switching should use the live DOM transition instead of a persisted pixel snapshot',
);
const modeProjectionStart = workbenchSource.indexOf('const applyHeatCapacityModeUiProjection = (');
const modeProjectionEnd = workbenchSource.indexOf('const commitHeatCapacityFileProjection = (', modeProjectionStart);
assert.ok(
  modeProjectionStart >= 0 && modeProjectionEnd > modeProjectionStart,
  'the mode UI projection boundary should remain explicit',
);
const modeProjectionSource = workbenchSource.slice(modeProjectionStart, modeProjectionEnd);
assert.match(
  modeProjectionSource,
  /clearHeatCapacityModeTransientUiRuntime\(\);[\s\S]*setHeatCapacityModeSceneCheckpoint\(checkpoint, modeTransitionRequestId\);/,
  'mode projection should clear mode-only transient UI before restoring the target scene checkpoint',
);
assert.doesNotMatch(
  modeProjectionSource,
  /resetHeatCapacitySceneUiState|setHeatCapacityFocusResetKey|setHeatCapacityHardSphereVisualResetKey/,
  'mode projection must not overwrite a restored camera, focus mode, or particle checkpoint with a group reset',
);
const groupResetStart = workbenchSource.indexOf('const resetHeatCapacityGroupUiRuntime = (');
const groupResetEnd = workbenchSource.indexOf('const registerGuideHeatCapacityMiss = (', groupResetStart);
assert.ok(
  groupResetStart >= 0 && groupResetEnd > groupResetStart,
  'new-group scene reset should remain separate from mode projection cleanup',
);
assert.match(
  workbenchSource.slice(groupResetStart, groupResetEnd),
  /clearHeatCapacityModeTransientUiRuntime\(\);[\s\S]*resetHeatCapacitySceneUiState\(\);/,
  'an explicit run/group reset should still clear transient mode UI and reset the scene together',
);
assert.match(
  sceneSource,
  /cloneNode\(true\)[\s\S]*studio-heat-mode-transition-outgoing-overlay[\s\S]*dataset\.heatCapacityModeTransitionPhase = 'active'/,
  'the outgoing overlay should be frozen independently before the incoming layout starts',
);
const resumeTransitionStart = sceneSource.indexOf('resume: (requestId) => {');
const resumeTransitionEnd = sceneSource.indexOf('finish: (requestId) => {', resumeTransitionStart);
assert.ok(resumeTransitionStart >= 0 && resumeTransitionEnd > resumeTransitionStart, 'the scene transition controller should expose a refresh-resume path');
const resumeTransitionSource = sceneSource.slice(resumeTransitionStart, resumeTransitionEnd);
assert.match(
  resumeTransitionSource,
  /clearModeTransitionLayers\(\);[\s\S]*activeModeTransitionRequestIdRef\.current = requestId;[\s\S]*dataset\.heatCapacityModeTransitionPhase = 'active'/,
  'refresh resume should idempotently restore the active visual phase for the same transition request',
);
assert.doesNotMatch(
  resumeTransitionSource,
  /cloneNode|append\(|onPowerToggle|onStopcockOpenChange|onPumpValveToggle|onPumpBulbPress|playGuideRollbackCue/,
  'refresh resume must not clone the restored target as an outgoing layer or replay scene business and audio actions',
);
assert.match(
  sceneSource,
  /restoreHardSphereVisualCheckpoint=\{activeModeRestoreRequest\?\.hardSphereVisualCheckpoint \?\? null\}/,
  'particle checkpoints should restore inside the persistent scene instead of remounting it',
);
assert.match(
  sceneSource,
  /modeRestoreRequest=\{activeModeRestoreRequest\}/,
  'camera checkpoints should restore inside the persistent scene instead of remounting it',
);
assert.match(
  workbenchSource,
  /pressureZeroTimelineMotionActive=\{[\s\S]*timelineDriven &&[\s\S]*progress < 1/,
  'scripted zero ownership must not be mistaken for active motion after the knob reaches its final angle',
);
assert.match(
  styleSource,
  /data-heat-capacity-mode-transition-phase='active'[\s\S]*studio-preview-overlay-slot-top-right[\s\S]*studioOverlayEnterRight[\s\S]*170ms both/,
  'incoming target layouts should start their established entrance motion after the outgoing layout has begun fading',
);
assert.match(
  styleSource,
  /studio-heat-mode-transition-outgoing-scene, \.studio-heat-mode-transition-outgoing-overlay[\s\S]*studioOverlayFadeOut var\(--studio-heat-mode-transition-duration, 380ms\)/,
  'the old scene and overlays should fade in place as one outgoing layer',
);
assert.match(
  styleSource,
  /\.studio-heat-record-controls\s*\{[\s\S]*animation:\s*studioOverlayEnterRight/,
  'record controls should have a deliberate entrance animation rather than relying on incidental layout movement',
);
assert.match(
  audioSource,
  /previousRef\.current = nextPrevious;[\s\S]*if \(state\.restoreMuted\)[\s\S]*releaseSoundRef\.current\?\.stop\(\)/,
  'muted mode restoration should synchronize the audio baseline without replaying mechanical differences',
);
assert.match(
  workbenchSource,
  /if \(heatCapacityRefreshRestorePendingRef\.current\) return;\s*if \(heatCapacityModeTransitionStateRef\.current\.phase !== 'idle'\) return;[\s\S]*exitHeatCapacityFormalModeToExplore\('demo'\)/,
  'anomalous demo recovery must return to the clean Explore base after any in-flight transition settles',
);
assert.match(
  workbenchSource,
  /currentFile\.heatCapacityMode === 'demo' && targetMode !== 'demo' && autoDemoRunning[\s\S]*quiesceHeatCapacityAutoDemoForModeTransition\(currentFile\.id\)/,
  'leaving a running demo should stop future scripted actions without cutting off the discrete action already in motion',
);
assert.match(
  workbenchSource,
  /const resumeQuiescedHeatCapacityAutoDemo[\s\S]*scheduleHeatCapacityAutoDemoTimeline[\s\S]*nextState\.phase === 'idle' && targetMode === currentFile\.heatCapacityMode[\s\S]*resumeQuiescedHeatCapacityAutoDemo/,
  'canceling a queued switch back to the visible demo should resume the quiesced timeline',
);
assert.match(
  workbenchSource,
  /const handleHeatCapacityModeSegmentClick[\s\S]*if \(heatCapacityModeTransitionStateRef\.current\.phase !== 'idle'\) \{\s*switchHeatCapacityMode\(mode\);[\s\S]*onClick=\{\(\) => handleHeatCapacityModeSegmentClick\('demo'\)\}[\s\S]*onClick=\{\(\) => handleHeatCapacityModeSegmentClick\('guide'\)\}[\s\S]*onClick=\{\(\) => handleHeatCapacityModeSegmentClick\('free'\)\}/,
  'all three mode segments should forward locked-period clicks so the final request can win or cancel',
);

console.log('heatCapacityModeTransitionUi tests passed');
