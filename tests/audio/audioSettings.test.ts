import assert from 'node:assert/strict';
import {
  DEFAULT_AUDIO_SETTINGS,
  clampAudioVolume,
  normalizeAudioSettings,
} from '../../src/audio/core/audioSettings.ts';
import {
  defaultWorkbenchGeneralSettings,
  getWorkbenchAudioVolumeIconLevel,
  normalizeWorkbenchGeneralSettings,
} from '../../src/features/workbench/workbenchGeneralSettings.ts';

assert.deepEqual(normalizeAudioSettings(null), DEFAULT_AUDIO_SETTINGS);
assert.deepEqual(normalizeAudioSettings({ enabled: false, volume: 0.37 }), {
  enabled: false,
  volume: 0.37,
});
assert.deepEqual(normalizeAudioSettings({ enabled: 'yes', volume: Number.NaN }), DEFAULT_AUDIO_SETTINGS);
assert.equal(clampAudioVolume(-1), 0);
assert.equal(clampAudioVolume(2), 1);
assert.equal(clampAudioVolume(0.615), 0.615);

assert.equal(getWorkbenchAudioVolumeIconLevel(false, 0.9), 0, 'explicit mute should always show the crossed speaker');
assert.equal(getWorkbenchAudioVolumeIconLevel(true, 0), 0, 'zero volume should show the crossed speaker without muting');
assert.equal(getWorkbenchAudioVolumeIconLevel(true, 0.01), 1);
assert.equal(getWorkbenchAudioVolumeIconLevel(true, 0.3), 1);
assert.equal(getWorkbenchAudioVolumeIconLevel(true, 0.31), 2);
assert.equal(getWorkbenchAudioVolumeIconLevel(true, 0.6), 2);
assert.equal(getWorkbenchAudioVolumeIconLevel(true, 0.61), 3);
assert.equal(getWorkbenchAudioVolumeIconLevel(true, 1), 3);

assert.deepEqual(
  normalizeWorkbenchGeneralSettings({
    theme: 'dark',
    language: 'en',
    performanceMode: 'balanced',
  }),
  {
    theme: 'dark',
    language: 'en',
    performanceMode: 'balanced',
    audioEnabled: true,
    audioVolume: 0.6,
  },
  'records created before audio preferences existed should receive the current audio defaults',
);

assert.deepEqual(
  normalizeWorkbenchGeneralSettings({
    ...defaultWorkbenchGeneralSettings,
    audioEnabled: false,
    audioVolume: 0.42,
  }),
  {
    ...defaultWorkbenchGeneralSettings,
    audioEnabled: false,
    audioVolume: 0.42,
  },
  'valid persisted audio settings should survive normalization',
);

console.log('audioSettings tests passed');
