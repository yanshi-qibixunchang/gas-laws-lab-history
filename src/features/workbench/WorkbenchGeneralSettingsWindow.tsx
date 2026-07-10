import { ChevronDown, X } from 'lucide-react';
import type { RefObject } from 'react';
import { HEAT_CAPACITY_QUALITY_MODE_ORDER } from '../heatCapacity/heatCapacityQualityProfiles.ts';
import {
  WORKBENCH_LANGUAGE_PREFERENCE_ORDER,
  WORKBENCH_THEME_PREFERENCE_ORDER,
  type WorkbenchLanguagePreference,
  type WorkbenchPerformanceMode,
  type WorkbenchThemePreference,
} from './workbenchGeneralSettings.ts';

interface WorkbenchGeneralSettingsWindowCopy {
  settings: {
    title: string;
    subtitle: string;
    closeAria: string;
    theme: string;
    themeHint: string;
    themeOptions: Record<WorkbenchThemePreference, { label: string; hint: string }>;
    language: string;
    languageHint: string;
    languageOptions: Record<WorkbenchLanguagePreference, { label: string; hint: string }>;
    performanceMode: string;
    performanceModeHint: string;
    performanceModeSummary: Record<WorkbenchPerformanceMode, string>;
  };
  shortcuts: {
    title: string;
    hint: string;
    undo: string;
    redo: string;
    closeSettings: string;
  };
}

interface WorkbenchGeneralSettingsWindowProps {
  open: boolean;
  copy: WorkbenchGeneralSettingsWindowCopy;
  themePreference: WorkbenchThemePreference;
  languagePreference: WorkbenchLanguagePreference;
  performanceMode: WorkbenchPerformanceMode;
  languageMenuOpen: boolean;
  languageTriggerRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onThemeChange: (theme: WorkbenchThemePreference) => void;
  onLanguageChange: (language: WorkbenchLanguagePreference) => void;
  onPerformanceModeChange: (mode: WorkbenchPerformanceMode) => void;
  onLanguageMenuOpenChange: (open: boolean) => void;
}

export const WorkbenchGeneralSettingsWindow = ({
  open,
  copy,
  themePreference,
  languagePreference,
  performanceMode,
  languageMenuOpen,
  languageTriggerRef,
  onClose,
  onThemeChange,
  onLanguageChange,
  onPerformanceModeChange,
  onLanguageMenuOpenChange,
}: WorkbenchGeneralSettingsWindowProps) => {
  if (!open) return null;

  const themeOptions = WORKBENCH_THEME_PREFERENCE_ORDER.map((key) => ({ key, ...copy.settings.themeOptions[key] }));
  const languageOptions = WORKBENCH_LANGUAGE_PREFERENCE_ORDER.map((key) => ({ key, ...copy.settings.languageOptions[key] }));
  const activeLanguage = languageOptions.find((option) => option.key === languagePreference) ?? languageOptions[0];

  return (
    <div className="studio-settings-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="studio-settings-window"
        role="dialog"
        aria-modal="true"
        aria-labelledby="studio-settings-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="studio-settings-header">
          <div>
            <strong id="studio-settings-title">{copy.settings.title}</strong>
            <span>{copy.settings.subtitle}</span>
          </div>
          <button type="button" className="studio-settings-close" aria-label={copy.settings.closeAria} onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <div className="studio-settings-body">
          <section className="studio-settings-section">
            <div className="studio-settings-section-title">
              <strong>{copy.settings.theme}</strong>
              <span>{copy.settings.themeHint}</span>
            </div>
            <div className="studio-settings-theme-grid" role="radiogroup" aria-label={copy.settings.theme}>
              {themeOptions.map((option) => (
                <button
                  type="button"
                  key={option.key}
                  role="radio"
                  aria-checked={themePreference === option.key}
                  className={`studio-settings-theme-card studio-settings-theme-${option.key} ${themePreference === option.key ? 'studio-settings-theme-card-active' : ''}`}
                  onClick={() => onThemeChange(option.key)}
                >
                  <span className="studio-settings-theme-card-copy">
                    <strong>{option.label}</strong>
                    <small>{option.hint}</small>
                  </span>
                  <span className="studio-settings-preview" aria-hidden="true">
                    <i className="studio-settings-preview-menu" />
                    <i className="studio-settings-preview-left" />
                    <i className="studio-settings-preview-main" />
                    <i className="studio-settings-preview-right" />
                    <i className="studio-settings-preview-chart" />
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="studio-settings-section studio-settings-control-row">
            <div className="studio-settings-section-title">
              <strong>{copy.settings.language}</strong>
              <span>{copy.settings.languageHint}</span>
            </div>
            <div className="studio-settings-control-surface">
              <div className={`studio-settings-language-select ${languageMenuOpen ? 'studio-settings-language-select-open' : ''}`}>
                <button
                  type="button"
                  className="studio-settings-language-trigger"
                  ref={languageTriggerRef}
                  aria-haspopup="listbox"
                  aria-expanded={languageMenuOpen}
                  onClick={() => onLanguageMenuOpenChange(!languageMenuOpen)}
                >
                  <span>
                    <strong>{activeLanguage.label}</strong>
                    <small>{activeLanguage.hint}</small>
                  </span>
                  <ChevronDown
                    size={15}
                    className={`studio-settings-language-chevron ${languageMenuOpen ? 'studio-settings-language-chevron-open' : ''}`}
                  />
                </button>
                {languageMenuOpen ? (
                  <div className="studio-settings-language-menu" role="listbox" aria-label={copy.settings.language}>
                    {languageOptions.map((option) => (
                      <button
                        type="button"
                        key={option.key}
                        role="option"
                        aria-selected={languagePreference === option.key}
                        className={languagePreference === option.key ? 'studio-settings-language-active' : ''}
                        onClick={() => onLanguageChange(option.key)}
                      >
                        <strong>{option.label}</strong>
                        <span>{option.hint}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section className="studio-settings-section studio-settings-control-row studio-settings-performance-row">
            <div className="studio-settings-section-title">
              <strong>{copy.settings.performanceMode}</strong>
              <span>{copy.settings.performanceModeHint}</span>
            </div>
            <div className="studio-settings-control-surface">
              <div
                className={`studio-settings-performance-segmented studio-settings-performance-segmented-${performanceMode}`}
                role="radiogroup"
                aria-label={copy.settings.performanceMode}
              >
                <span className="studio-settings-performance-thumb" aria-hidden="true" />
                {HEAT_CAPACITY_QUALITY_MODE_ORDER.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={performanceMode === mode}
                    className={`studio-settings-performance-option ${
                      performanceMode === mode ? 'studio-settings-performance-option-active' : ''
                    }`}
                    onClick={() => onPerformanceModeChange(mode)}
                  >
                    <strong>{copy.settings.performanceModeSummary[mode]}</strong>
                    <small>{copy.settings.performanceModeSummary[mode]}</small>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="studio-settings-section studio-settings-shortcuts-section">
            <div className="studio-settings-section-title">
              <strong>{copy.shortcuts.title}</strong>
              <span>{copy.shortcuts.hint}</span>
            </div>
            <div className="studio-settings-control-surface">
              <div className="studio-settings-shortcuts-card">
                <div className="studio-settings-shortcuts-list" aria-label={copy.shortcuts.title}>
                  <span><kbd>Ctrl+Z</kbd>{copy.shortcuts.undo}</span>
                  <span><kbd>Ctrl+Y</kbd><kbd>Ctrl+Shift+Z</kbd>{copy.shortcuts.redo}</span>
                  <span><kbd>Esc</kbd>{copy.shortcuts.closeSettings}</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
};
