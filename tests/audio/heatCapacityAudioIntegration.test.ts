import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const controller = readFileSync(join(root, 'src', 'audio', 'experiments', 'heatCapacity', 'heatCapacityAudioController.ts'), 'utf8');
const catalog = readFileSync(join(root, 'src', 'audio', 'experiments', 'heatCapacity', 'heatCapacityAudioCatalog.ts'), 'utf8');
const releaseSound = readFileSync(join(root, 'src', 'audio', 'experiments', 'heatCapacity', 'heatCapacityReleaseSound.ts'), 'utf8');
const scene = readFileSync(join(root, 'src', 'features', 'heatCapacity', 'HeatCapacityInstrumentScene.tsx'), 'utf8');
const workbench = readFileSync(join(root, 'src', 'features', 'workbench', 'WorkbenchStudioPrototype.tsx'), 'utf8');
const settingsWindow = readFileSync(join(root, 'src', 'features', 'workbench', 'WorkbenchGeneralSettingsWindow.tsx'), 'utf8');
const rollbackMotion = readFileSync(join(root, 'src', 'features', 'heatCapacity', 'heatCapacityGuideRollbackMotion.ts'), 'utf8');
const ultraModel = readFileSync(join(root, 'src', 'features', 'heatCapacity', 'HeatCapacityUltraInstrumentModel.tsx'), 'utf8');

assert.match(controller, /state\.pumpPulseId > previous\.pumpPulseId/,
  'pump sound should follow every pump animation pulse, including physically ineffective strokes');
assert.doesNotMatch(controller, /pumpStrokeCount/);
assert.match(controller, /HEAT_CAPACITY_PUMP_BULB_MIN_INTERVAL_MS/);
assert.match(controller, /replaceGroup: true[\s\S]*?crossfadeMs: 15/);
assert.match(controller, /knobAccumulatorRef\.current\.consume\(knobDelta, profile\.degreesPerTick\)/);
assert.match(controller, /engine\.playBurst\('heatCapacity\.zeroKnob\.tick'/,
  'coarse knob motion should schedule every crossed detent in a burst');
assert.match(controller, /getHeatCapacityZeroKnobAudioProfile\(knobSmoothedSpeedRef\.current\)/,
  'coarse knob density should follow the continuous angular-speed compression profile');
assert.match(controller, /itemDurationMs[\s\S]*?itemFadeInMs[\s\S]*?itemFadeOutMs/,
  'each scheduled knob detent should have its own shortened envelope');
assert.doesNotMatch(controller, /HEAT_CAPACITY_ZERO_KNOB_MIN_INTERVAL_MS|maxStartDelayMs: 50/,
  'knob sounds should not use the removed rate limit or drop-late policy');
assert.match(controller, /state\.experimentMode === 'demo'[\s\S]*?HEAT_CAPACITY_AUTO_DEMO_ZEROING_ACTION_DURATION_MS/,
  'demo zeroing should spread its complete detent burst across the zeroing animation');
assert.match(controller, /state\.recordPulseId > previous\.recordPulseId[\s\S]*?HEAT_CAPACITY_RECORD_WRITING_MIN_INTERVAL_MS/);
assert.match(controller, /heatCapacity\.record\.write[\s\S]*?playbackRate: 1\.1[\s\S]*?replaceGroup: true[\s\S]*?fadeInMs: 30/,
  'recording feedback should use one truly crossfaded writing voice');
assert.match(catalog, /heatCapacity\.record\.write[\s\S]*?gain: 0\.29/,
  'writing feedback should use half of its previous linear gain');
assert.match(controller, /cue\.action === 'pumpValveOpen'[\s\S]*?fileIndex[\s\S]*?itemDurationMs: 150[\s\S]*?itemFadeOutMs: 34/,
  'a blocked 30-degree pump-valve movement should use a paired short clip with its own fade envelope');
assert.match(controller, /rollbackPumpValveVariantRef\.current\.get\(cue\.cycleKey\)/,
  'the outbound and return portions of one blocked valve cycle should keep the same timbre variant');
assert.match(controller, /cue\.action === 'pumpBulbStroke'[\s\S]*?HEAT_CAPACITY_PUMP_BULB_MIN_INTERVAL_MS[\s\S]*?heatCapacity\.pumpBulb\.stroke/,
  'a blocked bulb press should play one complete pump sound through the shared eight-per-second policy');
assert.match(controller, /outwardFlowActive: state\.outwardReleaseFlowActive[\s\S]*?paused: state\.paused[\s\S]*?pressureDeltaKPa/);
assert.match(releaseSound, /HEAT_CAPACITY_RELEASE_AUDIO_ATTACK_MS = 65/);
assert.match(releaseSound, /HEAT_CAPACITY_RELEASE_AUDIO_STOP_FADE_MS = 15/);
assert.match(releaseSound, /HEAT_CAPACITY_RELEASE_AUDIO_BASE_GAIN = 0\.28/);
assert.match(releaseSound, /HEAT_CAPACITY_RELEASE_AUDIO_WHITE_MIX = 0\.5/);
assert.match(releaseSound, /HEAT_CAPACITY_RELEASE_AUDIO_HIGHPASS_HZ = 450/);
assert.doesNotMatch(releaseSound, /setTimeout\([^)]*(300|400|420)/,
  'release audio must not use a fixed duration timer');

assert.match(scene, /useHeatCapacityAudioController\(\{/);
assert.match(workbench, /releaseAudioFlowActive =\s*isHeatCapacityReleaseFlowOpen\(activeFile\.heatCapacityReleaseState\)[\s\S]*?activeFile\.pressureDeltaKPa > HEAT_CAPACITY_RELEASE_NEAR_AMBIENT_KPA/,
  'release audio should follow real outward flow even when the formal release workflow marker is absent');
assert.match(workbench, /releaseAudioFlowActive=\{releaseAudioFlowActive\}/);
assert.match(
  workbench,
  /let nextHeatCapacityFile = [\s\S]*?registerHeatCapacityPumpStroke[\s\S]*?setHeatCapacityPumpPulseId\(\(pulseId\) => pulseId \+ 1\)/,
  'the animation/audio pulse must still advance when a stroke is physically ineffective',
);
assert.match(
  workbench,
  /recordHeatCapacityGuideSample[\s\S]*?setHeatCapacityRecordPulseId\(\(pulseId\) => pulseId \+ 1\)/,
  'guided U0/U1/U2 record buttons should trigger the writing sound pulse',
);
assert.match(
  workbench,
  /recordFreeHeatCapacitySample[\s\S]*?setHeatCapacityRecordPulseId\(\(pulseId\) => pulseId \+ 1\)/,
  'free record and rerecord buttons should trigger the writing sound pulse',
);
assert.doesNotMatch(
  workbench,
  /action === 'captureSample'[\s\S]{0,300}setHeatCapacityRecordPulseId/,
  'automatic demo sampling should not play the writing sound',
);
assert.match(
  workbench,
  /action === 'pumpStroke'[\s\S]*?pressHeatCapacityPumpBulb\(fileId, 'autoDemo'\)/,
  'demo pumping must use the same pulse-driven audio path as guide and free modes',
);
assert.match(
  workbench,
  /action === 'openStopcockForRelease' \|\| action === 'openStopcockForZero'[\s\S]*?setHeatCapacityStopcockOpenByFileId\(fileId, true\)/,
  'demo stopcock actions must use the shared release state that drives release audio',
);
assert.match(settingsWindow, /type="range"[\s\S]*?min="0"[\s\S]*?max="1"[\s\S]*?step="0\.01"/);
assert.match(settingsWindow, /disabled=\{!audioEnabled\}/);
assert.match(catalog, /heatCapacity\.stopcock\.turnOpen[\s\S]*?gain: 1\.12/);
assert.match(catalog, /heatCapacity\.stopcock\.turnClose[\s\S]*?gain: 1\.16/);
assert.match(rollbackMotion, /HEAT_CAPACITY_BLOCKED_VALVE_TRAVEL_DEG = 30/);
assert.match(rollbackMotion, /HEAT_CAPACITY_BLOCKED_PUMP_BULB_COMPRESSION = 0\.45/);
assert.match(rollbackMotion, /this\.targetIndex = finalTargetIndex[\s\S]*?this\.stageElapsedMs = 0/,
  'rapid retriggering should retarget the active motion instead of queueing or resetting it');
assert.doesNotMatch(scene, /Math\.sin\(progress \* Math\.PI\) \* (24|0\.38|0\.7)/,
  'the old non-interruptible fixed sine rollback animations should be removed');
assert.match(ultraModel, /guideRollbackAnimation[\s\S]*?stopcockRollbackMotionRef[\s\S]*?pumpValveRollbackMotionRef/,
  'the production GLB model must share the same rollback system as the procedural model');
assert.match(scene, /active: guideRollbackAnimation === 'pumpBulbBounce'[\s\S]*?pumpBulbRollbackWeight/,
  'the procedural bulb should use a dedicated partial rollback weight instead of a real pump pulse');
assert.match(ultraModel, /pumpBulbRollbackMotionRef[\s\S]*?Math\.max\([\s\S]*?pumpVisualWeightRef\.current,[\s\S]*?pumpBulbRollback\.value/,
  'the GLB bulb morph should layer partial rollback feedback without mutating the real pump visual state');
assert.doesNotMatch(workbench, /rollbackAnimation === 'pumpBulbBounce'\) setHeatCapacityPumpPulseId/,
  'blocked bulb feedback must not reuse the real pump pulse counter');
assert.ok(
  settingsWindow.indexOf('studio-settings-audio-row') < settingsWindow.indexOf('studio-settings-shortcuts-section'),
  'audio settings should appear below performance and above shortcuts',
);

console.log('heatCapacityAudioIntegration tests passed');
