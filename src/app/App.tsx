import { useCallback, useEffect, useMemo, useState } from 'react';
import WorkbenchStudioPrototype from '../features/workbench/WorkbenchStudioPrototype';
import {
  getSystemWorkbenchTheme,
  loadWorkbenchGeneralSettingsWithStatus,
  persistWorkbenchGeneralSettings,
  type WorkbenchGeneralSettings,
} from '../features/workbench/workbenchGeneralSettings.ts';
import { AudioProvider } from '../audio/react/AudioProvider.tsx';
import {
  initializeWorkbenchIndexedDbPersistence,
  subscribeWorkbenchPersistenceInitialization,
  type WorkbenchPersistenceInitializationStage,
  type WorkbenchPersistenceBootstrapResult,
} from '../features/workbench/workbenchIndexedDbPersistence.ts';
import { getWorkbenchAppBrandName } from '../features/workbench/workbenchBrand.ts';
import { PromptPersistentBanner } from '../components/prompts/PromptFeedback.tsx';
import { PromptTooltipProvider } from '../components/prompts/PromptTooltipProvider.tsx';
import { FirstRunExperience } from '../features/onboarding/FirstRunExperience.tsx';
import {
  acceptCurrentLegalVersion,
  createCommittedFirstRunProfile,
  resolveFirstRunEntryMode,
  resolveInitialFirstRunLanguage,
  type FirstRunDraft,
  type FirstRunEntryMode,
} from '../features/onboarding/firstRunExperienceModel.ts';
import { commitFirstRunExperienceProfile } from '../features/onboarding/firstRunExperienceStore.ts';
import { createDefaultAppExperienceProfile } from '../features/learning/experimentLearningModel.ts';
import {
  APP_EXPERIENCE_PROFILE_STORAGE_KEY,
  loadAppExperienceProfile,
  type ExperienceProfileLoadResult,
} from '../features/learning/experimentLearningStore.ts';
import { AppStartupExperience } from './AppStartupExperience.tsx';
import { resolveAppStartupPreviewScenario } from './appStartupModel.ts';
import { WorkbenchAspectFrame } from './WorkbenchAspectFrame.tsx';
import { RecoverableRenderErrorBoundary } from '../components/errors/RecoverableRenderErrorBoundary.tsx';
import { WorkbenchOuterRenderErrorFallback } from '../features/workbench/WorkbenchRenderErrorFallback.tsx';
import {
  DevelopmentRenderFault,
  recoverDevelopmentRenderFault,
} from '../development/DevelopmentRenderFault.tsx';

function App() {
  const [persistenceBootstrap, setPersistenceBootstrap] = useState<WorkbenchPersistenceBootstrapResult | null>(null);
  const [persistenceInitializationStage, setPersistenceInitializationStage] =
    useState<WorkbenchPersistenceInitializationStage>('starting');
  const [persistenceRetrying, setPersistenceRetrying] = useState(false);
  const [startupDismissed, setStartupDismissed] = useState(false);
  const [startupAttempt, setStartupAttempt] = useState(0);
  const [initialExperienceProfileLoad] = useState<ExperienceProfileLoadResult>(() => loadAppExperienceProfile());
  const [experienceProfileLoad, setExperienceProfileLoad] = useState(initialExperienceProfileLoad);
  const [initialGeneralSettingsLoad] = useState(() => loadWorkbenchGeneralSettingsWithStatus());
  const [generalSettings, setGeneralSettings] = useState<WorkbenchGeneralSettings>(() => {
    const profileLanguage = initialExperienceProfileLoad.status === 'loaded'
      ? initialExperienceProfileLoad.profile.committedLanguage
      : null;
    return {
      ...initialGeneralSettingsLoad.settings,
      language: initialExperienceProfileLoad.status === 'loaded' &&
        initialExperienceProfileLoad.profile.firstRunCompleted &&
        profileLanguage
        ? profileLanguage
        : initialGeneralSettingsLoad.settings.language,
    };
  });
  const [entryMode, setEntryMode] = useState<FirstRunEntryMode>(() => (
    resolveFirstRunEntryMode(initialExperienceProfileLoad)
  ));
  const [tutorialEntryKind, setTutorialEntryKind] = useState<'start' | 'resume'>('resume');
  const initialFirstRunLanguage = useMemo(() => resolveInitialFirstRunLanguage({
    persistedLanguage: initialGeneralSettingsLoad.persisted
      ? initialGeneralSettingsLoad.settings.language
      : null,
    browserLanguages: typeof navigator === 'undefined'
      ? []
      : navigator.languages?.length
        ? navigator.languages
        : [navigator.language],
  }), [initialGeneralSettingsLoad]);
  const initialAudioSettings = useMemo(() => {
    return {
      enabled: generalSettings.audioEnabled,
      volume: generalSettings.audioVolume,
    };
  }, [generalSettings.audioEnabled, generalSettings.audioVolume]);
  const startupPreviewScenario = useMemo(() => resolveAppStartupPreviewScenario(
    typeof window === 'undefined' ? '' : window.location.search,
    import.meta.env.DEV,
  ), []);

  useEffect(() => {
    document.documentElement.lang = generalSettings.language;
    document.title = getWorkbenchAppBrandName(generalSettings.language);
  }, [generalSettings.language]);

  useEffect(() => {
    const handleExperienceProfileStorage = (event: StorageEvent) => {
      if (event.key !== APP_EXPERIENCE_PROFILE_STORAGE_KEY) return;
      const nextLoad = loadAppExperienceProfile();
      setExperienceProfileLoad(nextLoad);
      setEntryMode(resolveFirstRunEntryMode(nextLoad));
    };
    window.addEventListener('storage', handleExperienceProfileStorage);
    return () => window.removeEventListener('storage', handleExperienceProfileStorage);
  }, []);

  useEffect(() => {
    if (entryMode === 'workbench') return undefined;
    const desktopWindowBridge = window.hardSphereLabWindow;
    const unsubscribe = desktopWindowBridge?.onPrepareExit?.((request) => {
      void desktopWindowBridge.reportPersistenceResult({
        requestId: request.requestId,
        saved: true,
      });
    });
    return () => unsubscribe?.();
  }, [entryMode]);

  useEffect(() => {
    return subscribeWorkbenchPersistenceInitialization(setPersistenceInitializationStage);
  }, []);

  useEffect(() => {
    let active = true;
    void initializeWorkbenchIndexedDbPersistence().then((result) => {
      if (active) setPersistenceBootstrap(result);
    });
    return () => { active = false; };
  }, []);

  const retryPersistenceInitialization = (showStartup = false) => {
    if (persistenceRetrying) return;
    if (showStartup) {
      setPersistenceBootstrap(null);
      setStartupDismissed(false);
      setStartupAttempt((current) => current + 1);
    }
    setPersistenceRetrying(true);
    void initializeWorkbenchIndexedDbPersistence().then((result) => {
      setPersistenceBootstrap(result);
      setPersistenceRetrying(false);
    });
  };

  const completeStartup = useCallback(() => setStartupDismissed(true), []);
  const retryStartup = useCallback(() => {
    if (startupPreviewScenario === 'error' && !persistenceBootstrap?.error) {
      setStartupAttempt((current) => current + 1);
      return;
    }
    retryPersistenceInitialization(true);
  }, [persistenceBootstrap?.error, persistenceRetrying, startupPreviewScenario]);
  const continueStartupSafely = useCallback(() => {
    if (persistenceBootstrap) setStartupDismissed(true);
  }, [persistenceBootstrap]);

  const acceptFirstRunExperience = async (draft: FirstRunDraft | null) => {
    try {
      const nextProfile = entryMode === 'full'
        ? createCommittedFirstRunProfile({
            baseProfile: experienceProfileLoad.status === 'loaded'
              ? experienceProfileLoad.profile
              : createDefaultAppExperienceProfile(),
            draft: draft ?? { language: initialFirstRunLanguage, heatCapacity: null },
          })
        : experienceProfileLoad.status === 'loaded'
          ? acceptCurrentLegalVersion(experienceProfileLoad.profile)
          : null;
      if (!nextProfile) return 'The saved experience profile is unavailable.';
      const committed = commitFirstRunExperienceProfile(nextProfile);
      if (committed.ok === false) return committed.error.message;

      const committedLanguage = entryMode === 'full'
        ? committed.profile.committedLanguage ?? generalSettings.language
        : generalSettings.language;
      const nextSettings = { ...generalSettings, language: committedLanguage };
      persistWorkbenchGeneralSettings(nextSettings);
      setGeneralSettings(nextSettings);
      const nextLoad: ExperienceProfileLoadResult = {
        status: 'loaded',
        profile: committed.profile,
        persisted: true,
      };
      setTutorialEntryKind(
        entryMode === 'full' && draft?.heatCapacity === 'needs-guidance'
          ? 'start'
          : 'resume',
      );
      setExperienceProfileLoad(nextLoad);
      setEntryMode('workbench');
      return null;
    } catch (cause) {
      return cause instanceof Error ? cause.message : String(cause);
    }
  };

  const exitBeforeConsent = async () => {
    if (window.hardSphereLabTutorial?.exitApplication) {
      await window.hardSphereLabTutorial.exitApplication();
      return;
    }
    window.close();
  };

  const persistenceWarning = generalSettings.language === 'en'
    ? 'The workspace opened in safe mode. Original local records were preserved; storage recovery can be retried without clearing data.'
    : generalSettings.language === 'zh-TW'
      ? '工作區已以安全模式開啟。原始本機記錄已保留，可在不清除資料的情況下重試儲存恢復。'
      : '工作区已以安全模式打开。原始本地记录已保留，可在不清空数据的情况下重试存储恢复。';
  const retryLabel = persistenceRetrying
    ? generalSettings.language === 'en'
      ? 'Retrying…'
      : '正在重试…'
    : generalSettings.language === 'en'
      ? 'Retry storage'
      : generalSettings.language === 'zh-TW'
        ? '重試儲存'
        : '重试存储';
  const resolvedWorkbenchTheme = generalSettings.theme === 'system'
    ? getSystemWorkbenchTheme()
    : generalSettings.theme;

  return (
    <PromptTooltipProvider>
      <AudioProvider initialSettings={initialAudioSettings}>
        <WorkbenchAspectFrame>
          <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
            {persistenceBootstrap ? (
              entryMode === 'workbench' ? (
                <RecoverableRenderErrorBoundary
                  resetKeys={[entryMode]}
                  fallback={({ error, retry }) => (
                    <WorkbenchOuterRenderErrorFallback
                      language={generalSettings.language}
                      theme={resolvedWorkbenchTheme}
                      error={error}
                      onRetry={() => {
                        recoverDevelopmentRenderFault('workbench');
                        retry();
                      }}
                    />
                  )}
                >
                  <DevelopmentRenderFault target="workbench" />
                  <WorkbenchStudioPrototype
                    initialGeneralSettings={generalSettings}
                    initialTutorialEntryKind={tutorialEntryKind}
                  />
                </RecoverableRenderErrorBoundary>
              ) : (
                <FirstRunExperience
                  key={entryMode}
                  mode={entryMode}
                  initialLanguage={entryMode === 'legal-only'
                    ? generalSettings.language
                    : initialFirstRunLanguage}
                  themePreference={generalSettings.theme}
                  onAccept={acceptFirstRunExperience}
                  onExit={exitBeforeConsent}
                />
              )
            ) : null}
            {!startupDismissed ? (
              <AppStartupExperience
                language={entryMode === 'full' ? initialFirstRunLanguage : generalSettings.language}
                themePreference={generalSettings.theme}
                stage={persistenceInitializationStage}
                bootstrapReady={persistenceBootstrap !== null}
                bootstrapError={persistenceBootstrap?.error ?? null}
                previewScenario={startupPreviewScenario}
                attempt={startupAttempt}
                onRetry={retryStartup}
                onContinueSafely={continueStartupSafely}
                onComplete={completeStartup}
              />
            ) : null}
          </div>
        </WorkbenchAspectFrame>
        {startupDismissed && persistenceBootstrap?.error ? (
          <PromptPersistentBanner
            kind="warning"
            message={persistenceWarning}
            actionLabel={retryLabel}
            actionDisabled={persistenceRetrying}
            onAction={() => retryPersistenceInitialization(false)}
            tooltip={persistenceBootstrap.error.message}
            theme={generalSettings.theme}
            dataAttributes={{ 'data-workbench-persistence-safe-mode': 'true' }}
          />
        ) : null}
      </AudioProvider>
    </PromptTooltipProvider>
  );
}

export default App;
