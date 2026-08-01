import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getWorkbenchAppBrandName } from '../workbench/workbenchBrand.ts';
import {
  getSystemWorkbenchTheme,
  type WorkbenchLanguagePreference,
  type WorkbenchThemePreference,
} from '../workbench/workbenchGeneralSettings.ts';
import { FirstRunLanguagePage } from './FirstRunLanguagePage.tsx';
import { LearningNeedsPage } from './LearningNeedsPage.tsx';
import { MandatoryConsentDialog } from './MandatoryConsentDialog.tsx';
import { WelcomeProductIntroFlow } from './WelcomeProductIntroFlow.tsx';
import type {
  FirstRunDraft,
  FirstRunEntryMode,
  HeatCapacityFamiliarityAnswer,
} from './firstRunExperienceModel.ts';
import { firstRunCopies } from './firstRunCopy.ts';
import { useReducedMotionPreference } from './useReducedMotionPreference.ts';
import './FirstRunExperience.css';

interface FirstRunExperienceProps {
  mode: Exclude<FirstRunEntryMode, 'workbench'>;
  initialLanguage: WorkbenchLanguagePreference;
  themePreference: WorkbenchThemePreference;
  onAccept: (draft: FirstRunDraft | null) => Promise<string | null>;
  onExit: () => Promise<void> | void;
}

type FirstRunPage = 'language' | 'welcome' | 'product' | 'needs';

export const FirstRunExperience = ({
  mode,
  initialLanguage,
  themePreference,
  onAccept,
  onExit,
}: FirstRunExperienceProps) => {
  const [language, setLanguage] = useState(initialLanguage);
  const [answer, setAnswer] = useState<HeatCapacityFamiliarityAnswer | null>(null);
  const [page, setPage] = useState<FirstRunPage>(mode === 'full' ? 'language' : 'needs');
  const [consentOpen, setConsentOpen] = useState(mode === 'legal-only');
  const [welcomePlayed, setWelcomePlayed] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [desktopWindowMaximized, setDesktopWindowMaximized] = useState(false);
  const [systemTheme, setSystemTheme] = useState(getSystemWorkbenchTheme);
  const reducedMotion = useReducedMotionPreference();
  const copy = firstRunCopies[language];
  const resolvedTheme = themePreference === 'system' ? systemTheme : themePreference;
  const desktopWindowBridge = typeof window === 'undefined' ? undefined : window.hardSphereLabWindow;

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = getWorkbenchAppBrandName(language);
  }, [language]);

  useEffect(() => {
    if (themePreference !== 'system' || typeof window.matchMedia !== 'function') return undefined;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    update();
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', update);
      return () => mediaQuery.removeEventListener('change', update);
    }
    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, [themePreference]);

  useEffect(() => {
    let mounted = true;
    void desktopWindowBridge?.getState?.().then((state) => {
      if (mounted) setDesktopWindowMaximized(Boolean(state.maximized));
    }).catch(() => undefined);
    const unsubscribe = desktopWindowBridge?.onState?.((state) => {
      setDesktopWindowMaximized(Boolean(state.maximized));
    });
    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [desktopWindowBridge]);

  const shellClassName = useMemo(() => [
    'studio-workbench',
    `studio-theme-${resolvedTheme}`,
    'first-run-experience',
    reducedMotion ? 'first-run-reduced-motion' : '',
  ].filter(Boolean).join(' '), [reducedMotion, resolvedTheme]);

  const nextFromLanguage = () => {
    if (welcomePlayed) {
      setPage('product');
      return;
    }
    setPage('welcome');
  };

  const acceptConsent = () => onAccept(mode === 'full' ? { language, heatCapacity: answer } : null);
  const exit = async () => {
    await onExit();
    if (!window.hardSphereLabTutorial) setRejected(true);
  };

  const mainContent = rejected ? (
    <main className="first-run-rejected" role="alert">
      <span className="studio-brand-mark" aria-hidden="true"><img src="favicon.png" alt="" /></span>
      <h1>{copy.rejected.title}</h1>
      <p>{copy.rejected.body}</p>
    </main>
  ) : mode === 'legal-only' ? (
    <main className="first-run-legal-background" aria-hidden="true">
      <span className="studio-brand-mark"><img src="favicon.png" alt="" /></span>
      <strong>{getWorkbenchAppBrandName(language)}</strong>
    </main>
  ) : page === 'language' ? (
    <FirstRunLanguagePage
      copy={copy}
      language={language}
      onLanguageChange={setLanguage}
      onNext={nextFromLanguage}
    />
  ) : page === 'welcome' || page === 'product' ? (
    <WelcomeProductIntroFlow
      phase={page}
      language={language}
      theme={resolvedTheme}
      copy={copy}
      reducedMotion={reducedMotion}
      onPhaseChange={(nextPhase) => {
        if (nextPhase === 'product') setWelcomePlayed(true);
        setPage(nextPhase);
      }}
      onPrevious={() => setPage('language')}
      onNext={() => setPage('needs')}
    />
  ) : (
    <LearningNeedsPage
      copy={copy}
      answer={answer}
      onAnswerChange={setAnswer}
      onPrevious={() => setPage('product')}
      onNext={() => setConsentOpen(true)}
    />
  );

  return (
    <div
      className={shellClassName}
      data-first-run-mode={mode}
      data-first-run-language={language}
    >
      <div className="first-run-shell">
        <header className="studio-menu first-run-titlebar">
          <div className="studio-titlebar-drag-fill" aria-hidden="true" />
          {desktopWindowBridge ? (
            <div className="studio-window-controls" aria-label={copy.windowControls.controls}>
              <button
                type="button"
                className="studio-window-control-button"
                aria-label={copy.windowControls.minimize}
                onClick={() => { void desktopWindowBridge.minimize(); }}
              >
                <span className="studio-window-control-glyph studio-window-control-glyph-minimize" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="studio-window-control-button"
                aria-label={desktopWindowMaximized ? copy.windowControls.restore : copy.windowControls.maximize}
                onClick={() => { void desktopWindowBridge.toggleMaximize(); }}
              >
                <span
                  className={`studio-window-control-glyph ${desktopWindowMaximized ? 'studio-window-control-glyph-restore' : 'studio-window-control-glyph-maximize'}`}
                  aria-hidden="true"
                />
              </button>
              <button
                type="button"
                className="studio-window-control-button studio-window-control-close"
                aria-label={copy.windowControls.close}
                onClick={() => { void exit(); }}
              >
                <X size={15} strokeWidth={2.2} />
              </button>
            </div>
          ) : null}
        </header>
        <div className="first-run-content">{mainContent}</div>
      </div>
      {consentOpen && !rejected ? (
        <MandatoryConsentDialog
          language={language}
          copy={copy}
          onAccept={acceptConsent}
          onDisagree={exit}
        />
      ) : null}
    </div>
  );
};
