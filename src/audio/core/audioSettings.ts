import type { AudioSettings } from './audioTypes.ts';

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  enabled: true,
  volume: 0.6,
};

export const AUDIO_MASTER_GAIN_RAMP_MS = 25;

export const clampAudioVolume = (value: unknown) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_AUDIO_SETTINGS.volume;
  return Math.min(1, Math.max(0, value));
};

export const normalizeAudioSettings = (
  value: Partial<Record<keyof AudioSettings, unknown>> | null | undefined,
): AudioSettings => ({
  enabled: typeof value?.enabled === 'boolean' ? value.enabled : DEFAULT_AUDIO_SETTINGS.enabled,
  volume: clampAudioVolume(value?.volume),
});
