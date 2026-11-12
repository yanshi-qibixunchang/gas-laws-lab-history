import { useEffect, useMemo, useState } from 'react';
import { getWorkbenchAppBrandName } from '../workbench/workbenchBrand.ts';
import {
  getSystemWorkbenchTheme,
  type WorkbenchLanguagePreference,
  type WorkbenchResolvedTheme,
  type WorkbenchThemePreference,
} from '../workbench/workbenchGeneralSettings.ts';
import { FirstRunLanguagePage } from './FirstRunLanguagePage.tsx';
import { LearningNeedsPage } from './LearningNeedsPage.tsx';
import { MandatoryConsentDialog } from './MandatoryConsentDialog.tsx';
import { WelcomeProductIntroFlow } from './WelcomeProductIntroFlow.tsx';
import type {
  FirstRunDraft,
  FirstRunEntryMode,
  ExperimentFamiliarityAnswer,
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
  onWindowAppearanceChange?: (language: WorkbenchLanguagePreference, theme: WorkbenchResolvedTheme) => void;
}

type FirstRunPage = 'language' | 'welcome' | 'product' | 'needs';

export const FirstRunExperience = ({
  mode,
  initialLanguage,
  themePreference,
  onAccept,
  onExit,
  onWindowAppearanceChange,
}: FirstRunExperienceProps) => {
  const [language, setLanguage] = useState(initialLanguage);
  const [answers, setAnswers] = useState<Record<'heatCapacity' | 'pistonOscillation', ExperimentFamiliarityAnswer | null>>({
    heatCapacity: null,
    pistonOscillation: null,
  });
  const [page, setPage] = useState<FirstRunPage>(mode === 'full' ? 'language' : 'needs');
  const [consentOpen, setConsentOpen] = useState(mode === 'legal-only');
  const [welcomePlayed, setWelcomePlayed] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [systemTheme, setSystemTheme] = useState(getSystemWorkbenchTheme);
  const reducedMotion = useReducedMotionPreference();
  const copy = firstRunCopies[language];
  const resolvedTheme = themePreference === 'system' ? systemTheme : themePreference;

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
    onWindowAppearanceChange?.(language, resolvedTheme);
  }, [language, onWindowAppearanceChange, resolvedTheme]);

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

  const acceptConsent = () => onAccept(mode === 'full' ? { language, ...answers } : null);
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
      answers={answers}
      onAnswerChange={(experiment, answer) => {
        setAnswers((current) => ({ ...current, [experiment]: answer }));
      }}
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
