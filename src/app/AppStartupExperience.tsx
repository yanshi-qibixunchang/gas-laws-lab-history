import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getSystemWorkbenchTheme,
  type WorkbenchLanguagePreference,
  type WorkbenchThemePreference,
} from '../features/workbench/workbenchGeneralSettings.ts';
import type { WorkbenchPersistenceInitializationStage } from '../features/workbench/workbenchIndexedDbPersistence.ts';
import { useReducedMotionPreference } from '../features/onboarding/useReducedMotionPreference.ts';
import {
  APP_STARTUP_STAGE_PROGRESS,
  appStartupCopies,
  getAppStartupMinimumVisibleMs,
  type AppStartupPreviewScenario,
} from './appStartupModel.ts';
import './AppStartupExperience.css';

interface AppStartupExperienceProps {
  language: WorkbenchLanguagePreference;
  themePreference: WorkbenchThemePreference;
  stage: WorkbenchPersistenceInitializationStage;
  bootstrapReady: boolean;
  bootstrapError: Error | null;
  previewScenario: AppStartupPreviewScenario;
  attempt: number;
  onRetry: () => void;
  onContinueSafely: () => void;
  onComplete: () => void;
}

type StartupVisualState = 'loading' | 'ready' | 'failed' | 'leaving';

const APP_STARTUP_PROGRESS_TICK_MS = 40;
const APP_STARTUP_FAILURE_PREVIEW_MS = 3_800;
const APP_STARTUP_TAKING_LONGER_MS = 3_200;
const APP_STARTUP_READY_HOLD_MS = 260;
const APP_STARTUP_EXIT_MS = 420;

export const AppStartupExperience = ({
  language,
  themePreference,
  stage,
  bootstrapReady,
  bootstrapError,
  previewScenario,
  attempt,
  onRetry,
  onContinueSafely,
  onComplete,
}: AppStartupExperienceProps) => {
  const [systemTheme, setSystemTheme] = useState(getSystemWorkbenchTheme);
  const [displayedProgress, setDisplayedProgress] = useState(3);
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const [takingLonger, setTakingLonger] = useState(false);
  const [previewFailure, setPreviewFailure] = useState(false);
  const [workbenchPaintReady, setWorkbenchPaintReady] = useState(false);
  const [visualState, setVisualState] = useState<StartupVisualState>('loading');
  const completionStartedRef = useRef(false);
  const reducedMotion = useReducedMotionPreference();
  const resolvedTheme = themePreference === 'system' ? systemTheme : themePreference;
  const copy = appStartupCopies[language];
  const effectiveError = bootstrapError ?? (previewFailure
    ? new Error('Development startup failure preview')
    : null);

  useEffect(() => {
    if (themePreference !== 'system' || typeof window.matchMedia !== 'function') return undefined;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    update();
    mediaQuery.addEventListener?.('change', update);
    return () => mediaQuery.removeEventListener?.('change', update);
  }, [themePreference]);

  useEffect(() => {
    completionStartedRef.current = false;
    setDisplayedProgress(3);
    setMinimumElapsed(false);
    setTakingLonger(false);
    setPreviewFailure(false);
    setWorkbenchPaintReady(false);
    setVisualState('loading');

    const minimumTimerId = window.setTimeout(
      () => setMinimumElapsed(true),
      getAppStartupMinimumVisibleMs(previewScenario),
    );
    const longerTimerId = window.setTimeout(
      () => setTakingLonger(true),
      APP_STARTUP_TAKING_LONGER_MS,
    );
    const failureTimerId = previewScenario === 'error'
      ? window.setTimeout(() => setPreviewFailure(true), APP_STARTUP_FAILURE_PREVIEW_MS)
      : null;

    return () => {
      window.clearTimeout(minimumTimerId);
      window.clearTimeout(longerTimerId);
      if (failureTimerId !== null) window.clearTimeout(failureTimerId);
    };
  }, [attempt, previewScenario]);

  useEffect(() => {
    if (!bootstrapReady) {
      setWorkbenchPaintReady(false);
      return undefined;
    }
    let secondFrameId: number | null = null;
    const firstFrameId = window.requestAnimationFrame(() => {
      secondFrameId = window.requestAnimationFrame(() => setWorkbenchPaintReady(true));
    });
    return () => {
      window.cancelAnimationFrame(firstFrameId);
      if (secondFrameId !== null) window.cancelAnimationFrame(secondFrameId);
    };
  }, [bootstrapReady, attempt]);

  const targetProgress = useMemo(() => {
    if (effectiveError) return Math.max(displayedProgress, APP_STARTUP_STAGE_PROGRESS.failed);
    if (bootstrapReady) {
      if (!minimumElapsed) return previewScenario === 'slow' ? 99 : 96;
      return 100;
    }
    if (takingLonger) return 99;
    return APP_STARTUP_STAGE_PROGRESS[stage];
  }, [
    bootstrapReady,
    displayedProgress,
    effectiveError,
    minimumElapsed,
    previewScenario,
    stage,
    takingLonger,
  ]);

  useEffect(() => {
    if (visualState !== 'loading') return undefined;
    const timerId = window.setInterval(() => {
      setDisplayedProgress((current) => {
        if (current >= targetProgress) return current;
        const distance = targetProgress - current;
        const step = Math.min(3.4, Math.max(0.18, distance * 0.085));
        return Math.min(targetProgress, current + step);
      });
    }, reducedMotion ? 1 : APP_STARTUP_PROGRESS_TICK_MS);
    return () => window.clearInterval(timerId);
  }, [reducedMotion, targetProgress, visualState]);

  useEffect(() => {
    if (!effectiveError || visualState !== 'loading') return;
    setVisualState('failed');
  }, [effectiveError, visualState]);

  useEffect(() => {
    if (
      completionStartedRef.current ||
      visualState !== 'loading' ||
      effectiveError ||
      !bootstrapReady ||
      !workbenchPaintReady ||
      !minimumElapsed ||
      displayedProgress < 99.75
    ) return undefined;

    completionStartedRef.current = true;
    setDisplayedProgress(100);
    setVisualState('ready');
    const leaveTimerId = window.setTimeout(
      () => setVisualState('leaving'),
      reducedMotion ? 1 : APP_STARTUP_READY_HOLD_MS,
    );
    const completeTimerId = window.setTimeout(
      onComplete,
      reducedMotion ? 2 : APP_STARTUP_READY_HOLD_MS + APP_STARTUP_EXIT_MS,
    );
    return () => {
      window.clearTimeout(leaveTimerId);
      window.clearTimeout(completeTimerId);
    };
  }, [
    bootstrapReady,
    displayedProgress,
    effectiveError,
    minimumElapsed,
    onComplete,
    reducedMotion,
    visualState,
    workbenchPaintReady,
  ]);

  const roundedProgress = Math.min(100, Math.round(displayedProgress));
  const showStalledIndicator = visualState === 'loading' &&
    takingLonger &&
    roundedProgress >= 99 &&
    (!bootstrapReady || previewScenario === 'slow');
  const stageMessage = visualState === 'ready' || visualState === 'leaving'
    ? copy.ready
    : takingLonger && !bootstrapReady
      ? copy.takingLonger
      : copy.stages[stage];

  return (
    <section
      className={`studio-workbench studio-theme-${resolvedTheme} app-startup-experience app-startup-${visualState}`}
      data-app-startup-language={language}
      data-app-startup-stage={stage}
      data-app-startup-preview={previewScenario ?? 'off'}
      aria-busy={visualState === 'loading'}
    >
      <div className="app-startup-drag-region" aria-hidden="true" />
      <div className="app-startup-content">
        <span className="app-startup-mark"><img src="favicon.png" alt="" /></span>
        <span className="app-startup-divider" aria-hidden="true" />
        <div className="app-startup-copy">
          <span className="app-startup-eyebrow">{copy.eyebrow}</span>
          <h1>{copy.title}</h1>
          <hr aria-hidden="true" />
          <p>{copy.body}</p>

          {visualState === 'failed' ? (
            <div className="app-startup-failure" role="alert">
              <strong>{copy.failedTitle}</strong>
              <span>{copy.failedBody}</span>
              <div className="app-startup-actions">
                <button type="button" className="app-startup-action app-startup-action-primary" onClick={onRetry}>
                  {copy.retry}
                </button>
                <button
                  type="button"
                  className="app-startup-action"
                  disabled={!bootstrapReady}
                  onClick={onContinueSafely}
                >
                  {copy.continueSafely}
                </button>
              </div>
            </div>
          ) : (
            <div className="app-startup-progress-block" role="status" aria-live="polite">
              <div className="app-startup-progress-copy">
                <span>{stageMessage}</span>
                <strong>
                  {showStalledIndicator ? (
                    <i className="app-startup-stalled-indicator" aria-hidden="true" />
                  ) : null}
                  {roundedProgress}<small>%</small>
                </strong>
              </div>
              <div
                className="app-startup-progress-track"
                role="progressbar"
                aria-label={copy.progressLabel}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={roundedProgress}
              >
                <span style={{ width: `${displayedProgress}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
