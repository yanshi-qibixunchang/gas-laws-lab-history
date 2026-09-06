import { useEffect, useRef, useState } from 'react';
import { getSystemWorkbenchTheme, persistWorkbenchGeneralSettings, type WorkbenchGeneralSettings, type WorkbenchLanguagePreference, type WorkbenchPerformanceMode, type WorkbenchResolvedTheme, type WorkbenchThemePreference } from './workbenchGeneralSettings.ts';
import { getWorkbenchAppBrandName } from './workbenchBrand.ts';
import { type WorkbenchHeatCapacityRefreshSession } from './workbenchHeatCapacityRefreshSession.ts';
import { getHeatCapacityRefreshBoolean } from './workbenchHeatCapacityUiCheckpoint.ts';
import { type AppExperienceProfile } from '../learning/experimentLearningModel.ts';
import type { AudioSettings } from '../../audio/core/audioTypes.ts';
import { createWorkbenchSettingsActions } from './workbenchSettingsActions.ts';

export interface WorkbenchSettingsPreferencesOptions {
  initialGeneralSettings: WorkbenchGeneralSettings;
  initialHeatCapacityRefreshWindows: WorkbenchHeatCapacityRefreshSession['ui']['windows'];
  audioSettings: AudioSettings;
  updateAudioSettings: (settings: AudioSettings) => void;
  readExperienceProfile: () => AppExperienceProfile;
  commitExperienceProfile: (profile: AppExperienceProfile) => boolean;
}

export const useWorkbenchSettingsPreferences = ({
  initialGeneralSettings, initialHeatCapacityRefreshWindows, audioSettings, updateAudioSettings,
  readExperienceProfile, commitExperienceProfile,
}: WorkbenchSettingsPreferencesOptions) => {
  const [settingsThemePreference, setSettingsThemePreference] = useState<WorkbenchThemePreference>(() => initialGeneralSettings.theme);
  const [systemWorkbenchTheme, setSystemWorkbenchTheme] = useState<WorkbenchResolvedTheme>(() => getSystemWorkbenchTheme());
  const [settingsLanguagePreference, setSettingsLanguagePreference] = useState<WorkbenchLanguagePreference>(() => initialGeneralSettings.language);
  const [settingsPerformanceMode, setSettingsPerformanceMode] = useState<WorkbenchPerformanceMode>(() => initialGeneralSettings.performanceMode);
  const [settingsLanguageMenuOpen, setSettingsLanguageMenuOpen] = useState(() => (
    getHeatCapacityRefreshBoolean(initialHeatCapacityRefreshWindows, 'settingsLanguageMenuOpen')
  ));
  const settingsLanguageTriggerRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    document.documentElement.lang = settingsLanguagePreference;
    document.title = getWorkbenchAppBrandName(settingsLanguagePreference);
  }, [settingsLanguagePreference]);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateSystemTheme = () => {
      setSystemWorkbenchTheme(mediaQuery.matches ? 'dark' : 'light');
    };

    updateSystemTheme();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateSystemTheme);
      return () => mediaQuery.removeEventListener('change', updateSystemTheme);
    }

    mediaQuery.addListener(updateSystemTheme);
    return () => mediaQuery.removeListener(updateSystemTheme);
  }, []);
  const actions = createWorkbenchSettingsActions({
    settingsThemePreference,
    settingsLanguagePreference,
    settingsPerformanceMode,
    audioSettings,
    updateAudioSettings,
    setSettingsThemePreference,
    setSettingsLanguagePreference,
    setSettingsPerformanceMode,
    setSettingsLanguageMenuOpen,
    readExperienceProfile,
    commitExperienceProfile,
    persist: persistWorkbenchGeneralSettings,
    deferLanguageFocus: () => { window.setTimeout(() => settingsLanguageTriggerRef.current?.focus(), 0); },
  });
  return { settingsThemePreference, systemWorkbenchTheme, settingsLanguagePreference, settingsPerformanceMode, settingsLanguageMenuOpen, setSettingsLanguageMenuOpen, settingsLanguageTriggerRef, ...actions };
};
