import { useCallback, useEffect, useRef, useState } from 'react';
import type { WorkbenchLanguagePreference } from '../workbench/workbenchGeneralSettings.ts';
import type { FirstRunCopy } from './firstRunCopy.ts';
import { ProductIntroCarousel } from './ProductIntroCarousel.tsx';

export type WelcomeProductIntroPhase = 'welcome' | 'product';

interface WelcomeProductIntroFlowProps {
  phase: WelcomeProductIntroPhase;
  language: WorkbenchLanguagePreference;
  theme: 'dark' | 'light';
  copy: FirstRunCopy;
  reducedMotion: boolean;
  onPhaseChange: (phase: WelcomeProductIntroPhase) => void;
  onPrevious: () => void;
  onNext: () => void;
  showPrevious?: boolean;
  nextLabel?: string;
}

export const WELCOME_PRODUCT_REVEAL_MS = 1_420;
export const WELCOME_PRODUCT_TOTAL_MS = 1_900;
export const WELCOME_PRODUCT_SKIP_MS = 320;
export const WELCOME_PRODUCT_REDUCED_MS = 180;

export const WelcomeProductIntroFlow = ({
  phase,
  language,
  theme,
  copy,
  reducedMotion,
  onPhaseChange,
  onPrevious,
  onNext,
  showPrevious = true,
  nextLabel,
}: WelcomeProductIntroFlowProps) => {
  const [welcomeLeaving, setWelcomeLeaving] = useState(false);
  const skipTimerRef = useRef<number | null>(null);

  const completeWelcome = useCallback(() => {
    setWelcomeLeaving(false);
    onPhaseChange('product');
  }, [onPhaseChange]);

  const skipWelcome = useCallback(() => {
    if (phase !== 'welcome') return;
    setWelcomeLeaving(true);
    if (skipTimerRef.current !== null) window.clearTimeout(skipTimerRef.current);
    skipTimerRef.current = window.setTimeout(
      completeWelcome,
      reducedMotion ? 1 : WELCOME_PRODUCT_SKIP_MS,
    );
  }, [completeWelcome, phase, reducedMotion]);

  useEffect(() => {
    if (phase !== 'welcome') return undefined;
    setWelcomeLeaving(false);
    const leaveTimerId = window.setTimeout(
      () => setWelcomeLeaving(true),
      reducedMotion ? 1 : WELCOME_PRODUCT_REVEAL_MS,
    );
    const completeTimerId = window.setTimeout(
      completeWelcome,
      reducedMotion ? WELCOME_PRODUCT_REDUCED_MS : WELCOME_PRODUCT_TOTAL_MS,
    );
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      skipWelcome();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(leaveTimerId);
      window.clearTimeout(completeTimerId);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [completeWelcome, phase, reducedMotion, skipWelcome]);

  useEffect(() => () => {
    if (skipTimerRef.current !== null) window.clearTimeout(skipTimerRef.current);
  }, []);

  const productVisible = phase === 'product' || welcomeLeaving;
  const productActive = phase === 'product';

  return (
    <div
      className={`first-run-intro-stage ${welcomeLeaving ? 'first-run-intro-stage-transitioning' : ''}`}
      data-intro-phase={phase}
    >
      <div
        className={`first-run-product-layer ${productVisible ? 'first-run-product-layer-visible' : ''} ${productActive ? 'first-run-product-layer-active' : ''}`}
        aria-hidden={!productActive}
      >
        <ProductIntroCarousel
          language={language}
          theme={theme}
          copy={copy}
          reducedMotion={reducedMotion}
          active={productActive}
          showPrevious={showPrevious}
          nextLabel={nextLabel}
          onPrevious={onPrevious}
          onNext={onNext}
        />
      </div>
      {phase === 'welcome' ? (
        <section
          className={`first-run-welcome ${welcomeLeaving ? 'first-run-welcome-leaving' : ''}`}
          aria-live="polite"
          onClick={skipWelcome}
        >
          <div className="first-run-welcome-content">
            <span className="first-run-welcome-mark"><img src="favicon.png" alt="" /></span>
            <span>{copy.welcome.eyebrow}</span>
            <h1>{copy.welcome.title}</h1>
            <p>{copy.welcome.body}</p>
          </div>
        </section>
      ) : null}
    </div>
  );
};
