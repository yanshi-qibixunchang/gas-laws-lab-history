import {
  DEFAULT_HEAT_CAPACITY_QUALITY_MODE,
  HEAT_CAPACITY_QUALITY_MODE_ORDER,
  type HeatCapacityQualityMode,
} from '../heatCapacity/heatCapacityQualityProfiles.ts';
import { DEFAULT_AUDIO_SETTINGS, normalizeAudioSettings } from '../../audio/core/audioSettings.ts';

export const WORKBENCH_THEME_PREFERENCE_ORDER = ['system', 'light', 'dark'] as const;
export const WORKBENCH_LANGUAGE_PREFERENCE_ORDER = ['zh-CN', 'zh-TW', 'en'] as const;

export type WorkbenchThemePreference = typeof WORKBENCH_THEME_PREFERENCE_ORDER[number];
export type WorkbenchResolvedTheme = 'light' | 'dark';
export type WorkbenchLanguagePreference = typeof WORKBENCH_LANGUAGE_PREFERENCE_ORDER[number];
export type WorkbenchPerformanceMode = HeatCapacityQualityMode;
export type WorkbenchAudioVolumeIconLevel = 0 | 1 | 2 | 3;

export interface WorkbenchGeneralSettings {
  theme: WorkbenchThemePreference;
  language: WorkbenchLanguagePreference;
  performanceMode: WorkbenchPerformanceMode;
  audioEnabled: boolean;
  audioVolume: number;
}

export const WORKBENCH_GENERAL_SETTINGS_STORAGE_KEY = 'hsl_workbench_general_settings_v2';

export const defaultWorkbenchGeneralSettings: WorkbenchGeneralSettings = {
  theme: 'system',
  language: 'zh-CN',
  performanceMode: DEFAULT_HEAT_CAPACITY_QUALITY_MODE,
  audioEnabled: DEFAULT_AUDIO_SETTINGS.enabled,
  audioVolume: DEFAULT_AUDIO_SETTINGS.volume,
};

export const isWorkbenchThemePreference = (value: unknown): value is WorkbenchThemePreference => (
  typeof value === 'string' && WORKBENCH_THEME_PREFERENCE_ORDER.includes(value as WorkbenchThemePreference)
);

export const isWorkbenchLanguagePreference = (value: unknown): value is WorkbenchLanguagePreference => (
  typeof value === 'string' && WORKBENCH_LANGUAGE_PREFERENCE_ORDER.includes(value as WorkbenchLanguagePreference)
);

export const isWorkbenchPerformanceMode = (value: unknown): value is WorkbenchPerformanceMode => (
  typeof value === 'string' && HEAT_CAPACITY_QUALITY_MODE_ORDER.includes(value as HeatCapacityQualityMode)
);

export const getWorkbenchAudioVolumeIconLevel = (
  audioEnabled: boolean,
  audioVolume: number,
): WorkbenchAudioVolumeIconLevel => {
  if (!audioEnabled || !Number.isFinite(audioVolume) || audioVolume <= 0) return 0;
  if (audioVolume <= 0.3) return 1;
  if (audioVolume <= 0.6) return 2;
  return 3;
};

export const normalizeWorkbenchGeneralSettings = (
  value: Partial<Record<keyof WorkbenchGeneralSettings, unknown>> | null | undefined,
): WorkbenchGeneralSettings => {
  const audio = normalizeAudioSettings({
    enabled: value?.audioEnabled,
    volume: value?.audioVolume,
  });
  return {
    theme: isWorkbenchThemePreference(value?.theme)
      ? value.theme
      : defaultWorkbenchGeneralSettings.theme,
    language: isWorkbenchLanguagePreference(value?.language)
      ? value.language
      : defaultWorkbenchGeneralSettings.language,
    performanceMode: isWorkbenchPerformanceMode(value?.performanceMode)
      ? value.performanceMode
      : defaultWorkbenchGeneralSettings.performanceMode,
    audioEnabled: audio.enabled,
    audioVolume: audio.volume,
  };
};

export const getSystemWorkbenchTheme = (): WorkbenchResolvedTheme => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const loadWorkbenchGeneralSettings = (): WorkbenchGeneralSettings => {
  if (typeof window === 'undefined') return defaultWorkbenchGeneralSettings;
  try {
    const raw = window.localStorage.getItem(WORKBENCH_GENERAL_SETTINGS_STORAGE_KEY);
    if (!raw) return defaultWorkbenchGeneralSettings;
    return normalizeWorkbenchGeneralSettings(JSON.parse(raw));
  } catch {
    return defaultWorkbenchGeneralSettings;
  }
};

export const persistWorkbenchGeneralSettings = (settings: WorkbenchGeneralSettings) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(WORKBENCH_GENERAL_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Settings persistence must not interrupt the active experiment.
  }
};
