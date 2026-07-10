import {
  DEFAULT_HEAT_CAPACITY_QUALITY_MODE,
  HEAT_CAPACITY_QUALITY_MODE_ORDER,
  type HeatCapacityQualityMode,
} from '../heatCapacity/heatCapacityQualityProfiles.ts';

export type WorkbenchThemePreference = 'system' | 'light' | 'dark';
export type WorkbenchResolvedTheme = 'light' | 'dark';
export type WorkbenchLanguagePreference = 'zh-CN' | 'zh-TW' | 'en';
export type WorkbenchPerformanceMode = HeatCapacityQualityMode;

export interface WorkbenchGeneralSettings {
  theme: WorkbenchThemePreference;
  language: WorkbenchLanguagePreference;
  performanceMode: WorkbenchPerformanceMode;
}

export const WORKBENCH_GENERAL_SETTINGS_STORAGE_KEY = 'hsl_workbench_general_settings_v2';

export const defaultWorkbenchGeneralSettings: WorkbenchGeneralSettings = {
  theme: 'system',
  language: 'zh-CN',
  performanceMode: DEFAULT_HEAT_CAPACITY_QUALITY_MODE,
};

export const isWorkbenchThemePreference = (value: unknown): value is WorkbenchThemePreference => (
  value === 'system' || value === 'light' || value === 'dark'
);

export const isWorkbenchLanguagePreference = (value: unknown): value is WorkbenchLanguagePreference => (
  value === 'zh-CN' || value === 'zh-TW' || value === 'en'
);

export const isWorkbenchPerformanceMode = (value: unknown): value is WorkbenchPerformanceMode => (
  typeof value === 'string' && HEAT_CAPACITY_QUALITY_MODE_ORDER.includes(value as HeatCapacityQualityMode)
);

export const normalizeWorkbenchGeneralSettings = (
  value: Partial<Record<keyof WorkbenchGeneralSettings, unknown>> | null | undefined,
): WorkbenchGeneralSettings => ({
  theme: isWorkbenchThemePreference(value?.theme)
    ? value.theme
    : defaultWorkbenchGeneralSettings.theme,
  language: isWorkbenchLanguagePreference(value?.language)
    ? value.language
    : defaultWorkbenchGeneralSettings.language,
  performanceMode: isWorkbenchPerformanceMode(value?.performanceMode)
    ? value.performanceMode
    : defaultWorkbenchGeneralSettings.performanceMode,
});

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
