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
const audioEngine = readFileSync(join(root, 'src', 'audio', 'core', 'audioEngine.ts'), 'utf8');
const audioProvider = readFileSync(join(root, 'src', 'audio', 'react', 'AudioProvider.tsx'), 'utf8');

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
assert.match(controller, /state\.pressureZeroTimelineDriven \|\| state\.pressureZeroAdjustMode === 'coarseDrag'[\s\S]*?knobAccumulatorRef\.current\.consume\(knobDelta, profile\.degreesPerTick\)/,
  'demo zeroing and manual dragging should derive detent sounds from the same rendered angular deltas');
assert.doesNotMatch(controller, /HEAT_CAPACITY_AUTO_DEMO_ZEROING_ACTION_DURATION_MS|state\.experimentMode === 'demo'/,
  'the removed one-shot demo burst must not run independently of the visible knob trajectory');
assert.match(controller, /state\.recordPulseId > previous\.recordPulseId[\s\S]*?HEAT_CAPACITY_RECORD_WRITING_MIN_INTERVAL_MS/);
assert.match(controller, /heatCapacity\.record\.write[\s\S]*?playbackRate: 1\.1[\s\S]*?replaceGroup: true[\s\S]*?fadeInMs: 30/,
  'recording feedback should use one truly crossfaded writing voice');
assert.match(catalog, /heatCapacity\.record\.write[\s\S]*?gain: 0\.29/,
  'writing feedback should use half of its previous linear gain');
assert.match(controller, /cue\.action === 'pumpValveOpen'[\s\S]*?fileIndex[\s\S]*?shortened: true[\s\S]*?maxStartDelayMs: 90/,
  'a blocked 30-degree pump-valve movement should use a paired short clip with its own fade envelope');
assert.match(controller, /durationMs: shortened \? 150 : undefined[\s\S]*?fadeOutMs: shortened \? 34 : undefined/,
  'short blocked valve feedback should use the one-shot duration API instead of a one-item burst');
assert.doesNotMatch(controller, /engine\.playBurst\([\s\S]{0,180}heatCapacity\.pumpValve/,
  'pump-valve feedback should not retain the one-item burst workaround');
assert.match(controller, /rollbackPumpValveVariantRef\.current\.get\(cue\.cycleKey\)/,
  'the outbound and return portions of one blocked valve cycle should keep the same timbre variant');
assert.match(controller, /const playPumpBulbStroke = useCallback[\s\S]*?HEAT_CAPACITY_PUMP_BULB_MIN_INTERVAL_MS[\s\S]*?heatCapacity\.pumpBulb\.stroke/,
  'a blocked bulb press should play one complete pump sound through the shared eight-per-second policy');
assert.match(controller, /releasePathOpen: state\.releasePathOpen[\s\S]*?paused: state\.paused[\s\S]*?pressureDeltaKPa/);
assert.doesNotMatch(controller, /sceneFileId|getHeatCapacityPumpBulbVariation|getHeatCapacityPumpValveVariation/,
  'the controller should not retain redundant file state or duplicate mechanical-variation policies');
assert.doesNotMatch(controller, /voiceGroup:/,
  'sample voice ownership should live in the catalog instead of being repeated at call sites');
assert.match(releaseSound, /HEAT_CAPACITY_RELEASE_AUDIO_ATTACK_MS = 65/);
assert.match(releaseSound, /HEAT_CAPACITY_RELEASE_AUDIO_STOP_FADE_MS = 15/);
assert.match(releaseSound, /HEAT_CAPACITY_RELEASE_AUDIO_BASE_GAIN = 0\.28/);
assert.match(releaseSound, /HEAT_CAPACITY_RELEASE_AUDIO_WHITE_MIX = 0\.5/);
assert.match(releaseSound, /HEAT_CAPACITY_RELEASE_AUDIO_HIGHPASS_HZ = 450/);
assert.doesNotMatch(releaseSound, /setTimeout\([^)]*(300|400|420)/,
  'release audio must not use a fixed duration timer');
assert.match(
  audioEngine,
  /private readonly groupPlaybackGenerations[\s\S]*beginGroupPlayback[\s\S]*async playOneShot[\s\S]*groupPlaybackGeneration = this\.beginGroupPlayback\(group\)[\s\S]*isPlaybackCurrent[\s\S]*await this\.decodeAudio\(file\)[\s\S]*isPlaybackCurrent/,
  'one-shot playback should reject globally stale work and out-of-order work from the same voice group',
);
assert.match(
  audioEngine,
  /async playBurst[\s\S]*groupPlaybackGeneration = this\.beginGroupPlayback\(group\)[\s\S]*await this\.decodeAudio\(file\)[\s\S]*isPlaybackCurrent\(playbackGeneration, group, groupPlaybackGeneration\)/,
  'burst playback should reject globally stale and same-group stale work after asynchronous decode',
);
assert.match(
  audioEngine,
  /stopAll\(fadeOutMs = 0\) \{[\s\S]*this\.playbackGeneration \+= 1;[\s\S]*this\.stopVoice/,
  'stopping runtime audio should invalidate pending playback before stopping registered voices',
);
assert.match(
  audioEngine,
  /this\.registerVoice\(voice\);[\s\S]*try \{[\s\S]*for \(let index = 0; index < count; index \+= 1\)[\s\S]*catch \(error\) \{[\s\S]*this\.stopVoice\(voice, 0\);[\s\S]*Could not start \$\{assetId\} burst/,
  'burst voices must be registered before any source starts and synchronously cleaned if scheduling fails partway through',
);
assert.match(
  audioEngine,
  /throw new Error\(`\[AudioEngine\] Could not decode \$\{assetId\}\.`, \{ cause: error \}\);/,
  'decode failures should remain explicit engine errors for the controller degradation boundary to classify',
);
assert.match(
  controller,
  /if \(audioDisabledAfterFailureRef\.current\) return;[\s\S]*audioDisabledAfterFailureRef\.current = true;[\s\S]*console\.warn\([\s\S]*Audio was disabled after a playback failure; the experiment remains available/,
  'the controller should quarantine audio and emit only one diagnostic without failing the experiment runtime',
);
assert.match(
  controller,
  /promise\.catch\(\(error: unknown\) => reportAudioFailureRef\.current\(error\)\)/,
  'asynchronous decode or playback failures should enter the degradable audio boundary',
);
assert.doesNotMatch(
  scene,
  /audioRuntimeErrorHandlerRef|onRuntimeError:\s*\(error\).*handleUltraSceneError/,
  'audio failures must not be promoted into the WebGL runtime error card',
);
assert.match(
  releaseSound,
  /setSmoothAudioParam\(\s*lowpass\.frequency/,
  'release filter automation should use the compatible AudioParam fallback',
);
assert.match(
  releaseSound,
  /setSmoothAudioParam\(\s*voice\.output\.gain/,
  'release gain automation should use the compatible AudioParam fallback',
);
assert.match(
  controller,
  /if \(state\.restoreMuted\) \{[\s\S]*releaseSoundRef\.current\?\.stop\(\);[\s\S]*engine\.stopAll\(0\);/,
  'mode restore muting should cancel both active and pending mechanical audio',
);
assert.match(
  audioProvider,
  /const handlePageHide = \(event: PageTransitionEvent\) => \{[\s\S]*if \(event\.persisted\) \{[\s\S]*engine\.stopAll\(0\);[\s\S]*return;[\s\S]*void engine\.destroy\(\);/,
  'a BFCache pagehide must stop current voices without permanently destroying the provider engine',
);
assert.match(
  controller,
  /useEffect\(\(\) => \(\) => \{[\s\S]*releaseSoundRef\.current\?\.dispose\(\);[\s\S]*engine\.stopAll\(0\);[\s\S]*\}, \[engine\]\);/,
  'unmounting the heat-capacity controller must cancel active and pending mechanical audio',
);

assert.match(scene, /useHeatCapacityAudioController\(\{/);
assert.match(scene, /pressureZeroTimelineDriven: props\.pressureZeroTimelineDriven/,
  'the scene should feed the scripted visual trajectory directly into the shared audio controller');
assert.match(workbench, /deriveHeatCapacityAutoDemoZeroKnobMotion\([\s\S]*heatCapacityAutoDemoElapsedMs[\s\S]*activeFile\.pressureZeroKnobAngle/,
  'Workbench should derive demo knob angle and audio timing from one resumable timeline clock');
assert.match(ultraModel, /props\.pressureZeroTimelineDriven[\s\S]*pressureZeroVisualTargetAngle[\s\S]*dampUltraControlAngle/,
  'the GLB knob should not add a second lag while the shared demo trajectory is driving it');
assert.match(workbench, /releaseAudioPathOpen = isHeatCapacityReleaseFlowOpen\(activeFile\.heatCapacityReleaseState\)/,
  'Workbench should report only the fully-open path and leave pressure qualification to the audio policy');
assert.doesNotMatch(workbench, /releaseAudioPathOpen\s*=[\s\S]{0,180}HEAT_CAPACITY_RELEASE_NEAR_AMBIENT_KPA/,
  'the release pressure threshold should have one owner instead of being duplicated in Workbench');
assert.match(workbench, /releaseAudioPathOpen=\{releaseAudioPathOpen\}/);
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
assert.match(settingsWindow, /audioEnabled \? copy\.settings\.audioMuteAria : copy\.settings\.audioUnmuteAria/);
assert.doesNotMatch(settingsWindow, /audioToggleAria|studio-settings-audio-switch|studio-window-switch-thumb/);
assert.match(catalog, /heatCapacity\.stopcock\.turnOpen[\s\S]*?gain: 1\.12/);
assert.match(catalog, /heatCapacity\.stopcock\.turnClose[\s\S]*?gain: 1\.16/);
assert.match(catalog, /heatCapacity\.power\.on[\s\S]*?voiceGroup: 'heatCapacity\.power'/);
assert.match(catalog, /heatCapacity\.stopcock\.turnOpen[\s\S]*?voiceGroup: 'heatCapacity\.stopcock'/);
assert.match(catalog, /heatCapacity\.pumpBulb\.stroke[\s\S]*?avoidImmediateRepeat: true/);
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
