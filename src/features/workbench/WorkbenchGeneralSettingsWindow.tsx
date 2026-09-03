import { BookOpen, ChevronDown, ListChecks, LogOut, RotateCcw, TestTube2 } from 'lucide-react';
import type { CSSProperties, RefObject } from 'react';
import { PromptDialogShell } from '../../components/prompts/PromptDialogShell.tsx';
import { HEAT_CAPACITY_QUALITY_MODE_ORDER } from '../heatCapacity/heatCapacityQualityProfiles.ts';
import {
  WORKBENCH_LANGUAGE_PREFERENCE_ORDER,
  WORKBENCH_THEME_PREFERENCE_ORDER,
  getWorkbenchAudioVolumeIconLevel,
  type WorkbenchAudioVolumeIconLevel,
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
    audio: string;
    audioHint: string;
    audioMuteAria: string;
    audioUnmuteAria: string;
    audioVolumeAria: string;
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
  audioEnabled: boolean;
  audioVolume: number;
  languageMenuOpen: boolean;
  languageTriggerRef: RefObject<HTMLButtonElement | null>;
  learningCopy: {
    title: string;
    hint: string;
    replayIntroLabel: string;
    replayIntroHint: string;
    reselectNeedsLabel: string;
    reselectNeedsHint: string;
    simulateFirstRunLabel: string;
    simulateFirstRunHint: string;
    resetDisabledHint: string;
    exitTutorialLabel: string;
    exitTutorialHint: string;
  };
  tutorialActive: boolean;
  resetLearningActions: Array<{
    id: string;
    label: string;
    hint: string;
    onReset: () => void;
  }>;
  showSimulateFirstRun: boolean;
  onClose: () => void;
  onThemeChange: (theme: WorkbenchThemePreference) => void;
  onLanguageChange: (language: WorkbenchLanguagePreference) => void;
  onPerformanceModeChange: (mode: WorkbenchPerformanceMode) => void;
  onAudioEnabledChange: (enabled: boolean) => void;
  onAudioVolumeChange: (volume: number) => void;
  onLanguageMenuOpenChange: (open: boolean) => void;
  onReplayProductIntro: () => void;
  onReselectLearningNeeds: () => void;
  onExitTutorial: () => void;
  onSimulateFirstRun: () => void;
}

const WorkbenchAudioVolumeIcon = ({ level }: { level: WorkbenchAudioVolumeIconLevel }) => (
  <svg viewBox="0 0 28 24" aria-hidden="true" focusable="false">
    <path d="M3.5 9h4l5-4v14l-5-4h-4z" />
    {level === 0 ? (
      <>
        <path d="m17 9 6 6" />
        <path d="m23 9-6 6" />
      </>
    ) : (
      <>
        {level >= 1 ? <path d="M16 9.2a4 4 0 0 1 0 5.6" /> : null}
        {level >= 2 ? <path d="M19 6.8a7.5 7.5 0 0 1 0 10.4" /> : null}
        {level >= 3 ? <path d="M22 4.4a11 11 0 0 1 0 15.2" /> : null}
      </>
    )}
  </svg>
);

export const WorkbenchGeneralSettingsWindow = ({
  open,
  copy,
  themePreference,
  languagePreference,
  performanceMode,
  audioEnabled,
  audioVolume,
  languageMenuOpen,
  languageTriggerRef,
  learningCopy,
  tutorialActive,
  resetLearningActions,
  showSimulateFirstRun,
  onClose,
  onThemeChange,
  onLanguageChange,
  onPerformanceModeChange,
  onAudioEnabledChange,
  onAudioVolumeChange,
  onLanguageMenuOpenChange,
  onReplayProductIntro,
  onReselectLearningNeeds,
  onExitTutorial,
  onSimulateFirstRun,
}: WorkbenchGeneralSettingsWindowProps) => {
  if (!open) return null;

  const themeOptions = WORKBENCH_THEME_PREFERENCE_ORDER.map((key) => ({ key, ...copy.settings.themeOptions[key] }));
  const languageOptions = WORKBENCH_LANGUAGE_PREFERENCE_ORDER.map((key) => ({ key, ...copy.settings.languageOptions[key] }));
  const activeLanguage = languageOptions.find((option) => option.key === languagePreference) ?? languageOptions[0];
  const audioIconLevel = getWorkbenchAudioVolumeIconLevel(audioEnabled, audioVolume);
  const audioRangeStyle = {
    '--studio-audio-volume-percent': `${Math.round(audioVolume * 100)}%`,
  } as CSSProperties;

  return (
    <PromptDialogShell
      title={copy.settings.title}
      titleId="studio-settings-title"
      subtitle={copy.settings.subtitle}
      variant="task"
      closeLabel={copy.settings.closeAria}
      dismiss={{ closeButton: true, escape: true, backdrop: true }}
      onRequestClose={onClose}
      returnFocusSelector="[data-workbench-top-command='settings']"
      overlayClassName="studio-settings-overlay"
      dialogClassName="studio-settings-window"
      headerClassName="studio-settings-header"
      closeButtonClassName="studio-settings-close"
    >
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

          <section className="studio-settings-section studio-settings-control-row studio-settings-audio-row">
            <div className="studio-settings-section-title">
              <strong>{copy.settings.audio}</strong>
              <span>{copy.settings.audioHint}</span>
            </div>
            <div className="studio-settings-control-surface">
              <div className={`studio-settings-audio-controls ${audioEnabled ? '' : 'studio-settings-audio-controls-muted'}`}>
                <button
                  type="button"
                  className={`studio-settings-audio-button ${audioEnabled ? '' : 'studio-settings-audio-button-muted'}`}
                  aria-label={audioEnabled ? copy.settings.audioMuteAria : copy.settings.audioUnmuteAria}
                  aria-pressed={!audioEnabled}
                  onClick={() => onAudioEnabledChange(!audioEnabled)}
                >
                  <WorkbenchAudioVolumeIcon level={audioIconLevel} />
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={audioVolume}
                  disabled={!audioEnabled}
                  aria-label={copy.settings.audioVolumeAria}
                  style={audioRangeStyle}
                  onChange={(event) => onAudioVolumeChange(Number(event.currentTarget.value))}
                />
                <output aria-live="polite">{Math.round(audioVolume * 100)}%</output>
              </div>
            </div>
          </section>

          <section className="studio-settings-section studio-settings-control-row studio-settings-learning-row">
            <div className="studio-settings-section-title">
              <strong>{learningCopy.title}</strong>
              <span>{learningCopy.hint}</span>
            </div>
            <div className="studio-settings-control-surface studio-settings-learning-actions">
              {tutorialActive ? (
                <button
                  type="button"
                  className="studio-settings-learning-action studio-settings-learning-action-exit"
                  onClick={onExitTutorial}
                >
                  <LogOut size={15} />
                  <span>
                    <strong>{learningCopy.exitTutorialLabel}</strong>
                    <small>{learningCopy.exitTutorialHint}</small>
                  </span>
                </button>
              ) : null}
              <button
                type="button"
                className="studio-settings-learning-action"
                disabled={tutorialActive}
                onClick={onReplayProductIntro}
              >
                <BookOpen size={15} />
                <span>
                  <strong>{learningCopy.replayIntroLabel}</strong>
                    <small>{tutorialActive ? learningCopy.resetDisabledHint : learningCopy.replayIntroHint}</small>
                </span>
              </button>
              <button
                type="button"
                className="studio-settings-learning-action"
                disabled={tutorialActive}
                onClick={onReselectLearningNeeds}
              >
                <ListChecks size={15} />
                <span>
                  <strong>{learningCopy.reselectNeedsLabel}</strong>
                    <small>{tutorialActive ? learningCopy.resetDisabledHint : learningCopy.reselectNeedsHint}</small>
                </span>
              </button>
              {resetLearningActions.map((action) => (
                <button
                  type="button"
                  key={action.id}
                  className="studio-settings-learning-action"
                  disabled={tutorialActive}
                  onClick={action.onReset}
                >
                  <RotateCcw size={15} />
                  <span>
                    <strong>{action.label}</strong>
                    <small>{tutorialActive ? learningCopy.resetDisabledHint : action.hint}</small>
                  </span>
                </button>
              ))}
              {showSimulateFirstRun ? (
                <button
                  type="button"
                  className="studio-settings-learning-action"
                  disabled={tutorialActive}
                  onClick={onSimulateFirstRun}
                >
                  <TestTube2 size={15} />
                  <span>
                    <strong>{learningCopy.simulateFirstRunLabel}</strong>
                    <small>{tutorialActive ? learningCopy.resetDisabledHint : learningCopy.simulateFirstRunHint}</small>
                  </span>
                </button>
              ) : null}
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
    </PromptDialogShell>
  );
};
