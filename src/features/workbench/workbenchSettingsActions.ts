import type { AudioSettings } from '../../audio/core/audioTypes.ts';
import type { AppExperienceProfile } from '../learning/experimentLearningModel.ts';
import type { WorkbenchGeneralSettings, WorkbenchLanguagePreference, WorkbenchPerformanceMode, WorkbenchThemePreference } from './workbenchGeneralSettings.ts';
import { clampAudioVolume } from '../../audio/core/audioSettings.ts';

export interface WorkbenchSettingsActionPorts {
  settingsThemePreference: WorkbenchThemePreference;
  settingsLanguagePreference: WorkbenchLanguagePreference;
  settingsPerformanceMode: WorkbenchPerformanceMode;
  audioSettings: AudioSettings;
  updateAudioSettings: (settings: AudioSettings) => void;
  setSettingsThemePreference: (value: WorkbenchThemePreference) => void;
  setSettingsLanguagePreference: (value: WorkbenchLanguagePreference) => void;
  setSettingsPerformanceMode: (value: WorkbenchPerformanceMode) => void;
  setSettingsLanguageMenuOpen: (value: boolean) => void;
  readExperienceProfile: () => AppExperienceProfile;
  commitExperienceProfile: (profile: AppExperienceProfile) => boolean;
  persist: (settings: WorkbenchGeneralSettings) => void;
  deferLanguageFocus: () => void;
}

export const createWorkbenchSettingsActions = ({ settingsThemePreference, settingsLanguagePreference, settingsPerformanceMode, audioSettings, updateAudioSettings, setSettingsThemePreference, setSettingsLanguagePreference, setSettingsPerformanceMode, setSettingsLanguageMenuOpen, readExperienceProfile, commitExperienceProfile, persist, deferLanguageFocus }: WorkbenchSettingsActionPorts) => {
  const updateSettingsThemePreference = (theme: WorkbenchThemePreference) => {
    setSettingsThemePreference(theme);
    persist({
      theme,
      language: settingsLanguagePreference,
      performanceMode: settingsPerformanceMode,
      audioEnabled: audioSettings.enabled,
      audioVolume: audioSettings.volume,
    });
  };

  const updateSettingsLanguagePreference = (language: WorkbenchLanguagePreference) => {
    const currentProfile = readExperienceProfile();
    if (
      currentProfile.firstRunCompleted &&
      currentProfile.committedLanguage !== language &&
      !commitExperienceProfile({ ...currentProfile, committedLanguage: language })
    ) return;
    setSettingsLanguagePreference(language);
    setSettingsLanguageMenuOpen(false);
    persist({
      theme: settingsThemePreference,
      language,
      performanceMode: settingsPerformanceMode,
      audioEnabled: audioSettings.enabled,
      audioVolume: audioSettings.volume,
    });
    deferLanguageFocus();
  };

  const updateSettingsPerformanceMode = (performanceMode: WorkbenchPerformanceMode) => {
    setSettingsPerformanceMode(performanceMode);
    persist({
      theme: settingsThemePreference,
      language: settingsLanguagePreference,
      performanceMode,
      audioEnabled: audioSettings.enabled,
      audioVolume: audioSettings.volume,
    });
  };

  const updateSettingsAudioEnabled = (audioEnabled: boolean) => {
    updateAudioSettings({ enabled: audioEnabled, volume: audioSettings.volume });
    persist({
      theme: settingsThemePreference,
      language: settingsLanguagePreference,
      performanceMode: settingsPerformanceMode,
      audioEnabled,
      audioVolume: audioSettings.volume,
    });
  };

  const updateSettingsAudioVolume = (volume: number) => {
    const audioVolume = clampAudioVolume(volume);
    updateAudioSettings({ enabled: audioSettings.enabled, volume: audioVolume });
    persist({
      theme: settingsThemePreference,
      language: settingsLanguagePreference,
      performanceMode: settingsPerformanceMode,
      audioEnabled: audioSettings.enabled,
      audioVolume,
    });
  };

  return { updateSettingsThemePreference, updateSettingsLanguagePreference, updateSettingsPerformanceMode, updateSettingsAudioEnabled, updateSettingsAudioVolume };
};
