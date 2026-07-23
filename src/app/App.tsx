import { useEffect, useMemo, useState, type ReactNode } from 'react';
import WorkbenchStudioPrototype from '../features/workbench/WorkbenchStudioPrototype';
import {
  loadWorkbenchGeneralSettingsWithStatus,
  persistWorkbenchGeneralSettings,
  type WorkbenchGeneralSettings,
} from '../features/workbench/workbenchGeneralSettings.ts';
import { AudioProvider } from '../audio/react/AudioProvider.tsx';
import {
  initializeWorkbenchIndexedDbPersistence,
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

const WORKBENCH_FRAME_WIDTH = 1440;
const WORKBENCH_FRAME_HEIGHT = 810;
const WORKBENCH_FRAME_MIN_DESKTOP_WIDTH = 900;
const WORKBENCH_FRAME_MIN_DESKTOP_HEIGHT = 560;

interface WorkbenchFrameViewport {
  width: number;
  height: number;
  touchLike: boolean;
}

const mediaMatches = (query: string) =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia(query).matches;

const isTouchLikeViewport = () => {
  const coarsePointer = mediaMatches('(pointer: coarse)');
  const noHover = mediaMatches('(hover: none)');
  const finePointer = mediaMatches('(pointer: fine)');
  const supportsHover = mediaMatches('(hover: hover)');
  const hasTouchPoints = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;

  if (coarsePointer || noHover) return true;
  if (finePointer && supportsHover) return false;
  return hasTouchPoints;
};

const getWorkbenchFrameViewport = (): WorkbenchFrameViewport => {
  if (typeof window === 'undefined') {
    return {
      width: WORKBENCH_FRAME_WIDTH,
      height: WORKBENCH_FRAME_HEIGHT,
      touchLike: false,
    };
  }

  const visualViewport = window.visualViewport;
  return {
    width: visualViewport?.width ?? window.innerWidth,
    height: visualViewport?.height ?? window.innerHeight,
    touchLike: isTouchLikeViewport(),
  };
};

const WorkbenchAspectFrame = ({ children }: { children: ReactNode }) => {
  const [viewport, setViewport] = useState<WorkbenchFrameViewport>(() => getWorkbenchFrameViewport());

  useEffect(() => {
    const updateViewport = () => setViewport(getWorkbenchFrameViewport());
    updateViewport();
    window.addEventListener('resize', updateViewport);
    const visualViewport = window.visualViewport;
    if (visualViewport) {
      visualViewport.addEventListener('resize', updateViewport);
    }

    return () => {
      window.removeEventListener('resize', updateViewport);
      if (visualViewport) {
        visualViewport.removeEventListener('resize', updateViewport);
      }
    };
  }, []);

  const useFixedFrame = !viewport.touchLike &&
    viewport.width >= WORKBENCH_FRAME_MIN_DESKTOP_WIDTH &&
    viewport.height >= WORKBENCH_FRAME_MIN_DESKTOP_HEIGHT;
  const scale = useFixedFrame
    ? Math.min(
        viewport.width / WORKBENCH_FRAME_WIDTH,
        viewport.height / WORKBENCH_FRAME_HEIGHT,
      )
    : 1;
  const scaledFrameWidth = WORKBENCH_FRAME_WIDTH * scale;
  const scaledFrameHeight = WORKBENCH_FRAME_HEIGHT * scale;

  return (
    <div
      data-workbench-aspect-frame={useFixedFrame ? 'fixed' : 'responsive'}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden',
        background: useFixedFrame ? '#11161b' : '#1a1f25',
      }}
    >
      <div
        style={{
          width: useFixedFrame ? scaledFrameWidth : '100vw',
          height: useFixedFrame ? scaledFrameHeight : '100vh',
          overflow: 'hidden',
          background: '#1a1f25',
          outline: useFixedFrame ? '1px solid rgba(127, 139, 152, 0.38)' : 'none',
          boxShadow: useFixedFrame
            ? '0 0 0 1px rgba(20, 26, 32, 0.95), 0 24px 70px rgba(0, 0, 0, 0.46)'
            : 'none',
        }}
      >
        <div
          style={{
            width: useFixedFrame ? WORKBENCH_FRAME_WIDTH : '100%',
            height: useFixedFrame ? WORKBENCH_FRAME_HEIGHT : '100%',
            transform: useFixedFrame ? `scale(${scale})` : 'none',
            transformOrigin: 'top left',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

function App() {
  const [persistenceBootstrap, setPersistenceBootstrap] = useState<WorkbenchPersistenceBootstrapResult | null>(null);
  const [persistenceRetrying, setPersistenceRetrying] = useState(false);
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
    let active = true;
    void initializeWorkbenchIndexedDbPersistence().then((result) => {
      if (active) setPersistenceBootstrap(result);
    });
    return () => { active = false; };
  }, []);

  const retryPersistenceInitialization = () => {
    if (persistenceRetrying) return;
    setPersistenceRetrying(true);
    void initializeWorkbenchIndexedDbPersistence().then((result) => {
      setPersistenceBootstrap(result);
      setPersistenceRetrying(false);
    });
  };

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

  if (!persistenceBootstrap) {
    return (
      <div role="status" aria-live="polite" style={{ padding: 24, color: '#d7e0e8', background: '#11161b' }}>
        正在恢复工作区…
      </div>
    );
  }

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

  return (
    <PromptTooltipProvider>
      <AudioProvider initialSettings={initialAudioSettings}>
        <WorkbenchAspectFrame>
          {entryMode === 'workbench' ? (
            <WorkbenchStudioPrototype
              initialGeneralSettings={generalSettings}
              initialTutorialEntryKind={tutorialEntryKind}
            />
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
          )}
        </WorkbenchAspectFrame>
        {persistenceBootstrap.error ? (
          <PromptPersistentBanner
            kind="warning"
            message={persistenceWarning}
            actionLabel={retryLabel}
            actionDisabled={persistenceRetrying}
            onAction={retryPersistenceInitialization}
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
