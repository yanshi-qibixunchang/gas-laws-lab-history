import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  PRODUCT_INTRO_AUTOPLAY_MS,
  moveProductIntroCard,
} from './productIntroCarouselModel.ts';
import type { FirstRunCopy, FirstRunProductCardCopy } from './firstRunCopy.ts';
import type { WorkbenchLanguagePreference } from '../workbench/workbenchGeneralSettings.ts';
import { ProductIntroModesDemo } from './ProductIntroModesDemo.tsx';
import { ProductIntroModesVideo } from './ProductIntroModesVideo.tsx';
import { ProductIntroWorkspaceDemo } from './ProductIntroWorkspaceDemo.tsx';

interface ProductIntroCarouselProps {
  language: WorkbenchLanguagePreference;
  theme: 'dark' | 'light';
  copy: FirstRunCopy;
  reducedMotion: boolean;
  onPrevious: () => void;
  onNext: () => void;
  active?: boolean;
  showPrevious?: boolean;
  nextLabel?: string;
}

const PRODUCT_INTRO_CONTENT_TRANSITION_MS = 450;

export const ProductIntroCarousel = ({
  language,
  theme,
  copy,
  reducedMotion,
  onPrevious,
  onNext,
  active = true,
  showPrevious = true,
  nextLabel,
}: ProductIntroCarouselProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [outgoingIndex, setOutgoingIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState<-1 | 1>(1);
  const [userPaused, setUserPaused] = useState(false);
  const [announceChanges, setAnnounceChanges] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(() => document.visibilityState === 'visible');
  const transitionTimerRef = useRef<number | null>(null);
  const cards = copy.product.cards;

  useEffect(() => {
    const updateVisibility = () => setDocumentVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  useEffect(() => () => {
    if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
  }, []);

  const transitionTo = useCallback((nextIndex: number, nextDirection: -1 | 1, announce: boolean) => {
    if (nextIndex === activeIndex || cards.length <= 1 || outgoingIndex !== null) return;
    if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
    if (reducedMotion) {
      setDirection(nextDirection);
      setActiveIndex(nextIndex);
      setAnnounceChanges(announce);
      return;
    }
    setOutgoingIndex(activeIndex);
    setDirection(nextDirection);
    setActiveIndex(nextIndex);
    setAnnounceChanges(announce);
    transitionTimerRef.current = window.setTimeout(() => {
      setOutgoingIndex(null);
      transitionTimerRef.current = null;
    }, PRODUCT_INTRO_CONTENT_TRANSITION_MS);
  }, [activeIndex, cards.length, outgoingIndex, reducedMotion]);

  const move = useCallback((nextDirection: -1 | 1, announce = true) => {
    transitionTo(
      moveProductIntroCard(activeIndex, nextDirection, cards.length),
      nextDirection,
      announce,
    );
  }, [activeIndex, cards.length, transitionTo]);

  const scriptedCardPaused = !active || userPaused || !documentVisible;

  const completeWorkspaceDemo = useCallback(() => {
    if (activeIndex !== 0 || scriptedCardPaused || reducedMotion) return;
    move(1, false);
  }, [activeIndex, move, reducedMotion, scriptedCardPaused]);

  const completeModesDemo = useCallback(() => {
    if (activeIndex !== 1 || scriptedCardPaused || reducedMotion) return;
    move(1, false);
  }, [activeIndex, move, reducedMotion, scriptedCardPaused]);

  useEffect(() => {
    if (
      !active ||
      reducedMotion ||
      userPaused ||
      !documentVisible ||
      activeIndex <= 1 ||
      cards.length <= 1
    ) return undefined;
    const timeoutId = window.setTimeout(() => move(1, false), PRODUCT_INTRO_AUTOPLAY_MS);
    return () => window.clearTimeout(timeoutId);
  }, [active, activeIndex, cards.length, documentVisible, move, reducedMotion, userPaused]);

  const handleCarouselKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!active || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    event.preventDefault();
    move(event.key === 'ArrowLeft' ? -1 : 1);
  };

  const renderCardContent = (
    card: FirstRunProductCardCopy,
    cardIndex: number,
    phase: 'incoming' | 'outgoing' | 'inactive',
  ) => {
    const workspaceShowcase = cardIndex === 0;
    const modesShowcase = cardIndex === 1;
    const textShowcase = !workspaceShowcase && !modesShowcase;
    const modesVideoPilot = modesShowcase && language === 'zh-CN' && theme === 'light';
    const bodyKind = workspaceShowcase ? 'workspace' : modesShowcase ? 'modes' : 'text';
    const cardPlaybackActive = active && (
      phase === 'outgoing' || (phase === 'incoming' && outgoingIndex === null)
    );
    return (
    <div
      key={`product-card-${cardIndex}`}
      className={`first-run-product-card-content first-run-product-card-content-${phase} first-run-product-card-content-${direction === 1 ? 'next' : 'previous'}`}
      data-product-intro-card-kind={bodyKind}
      aria-hidden={phase !== 'incoming'}
    >
      <header className="first-run-product-card-header">
        <div className="first-run-product-card-heading-copy">
          <span className="first-run-product-card-eyebrow">{card.eyebrow}</span>
          <h2>{card.title}</h2>
        </div>
        <div className="first-run-product-card-index" aria-hidden="true">
          <strong>{String(cardIndex + 1).padStart(2, '0')}</strong>
          <span>/ {String(cards.length).padStart(2, '0')}</span>
        </div>
      </header>
      <div className={`first-run-product-card-body first-run-product-card-body-${bodyKind}`}>
        {workspaceShowcase ? (
          <ProductIntroWorkspaceDemo
            active={cardPlaybackActive}
            paused={scriptedCardPaused}
            reducedMotion={reducedMotion}
            language={language}
            onComplete={completeWorkspaceDemo}
          />
        ) : null}
        {modesShowcase ? (
          modesVideoPilot ? (
            <ProductIntroModesVideo
              active={cardPlaybackActive}
              paused={scriptedCardPaused}
              reducedMotion={reducedMotion}
              language={language}
              onComplete={completeModesDemo}
            />
          ) : (
            <ProductIntroModesDemo
              active={cardPlaybackActive}
              paused={scriptedCardPaused}
              reducedMotion={reducedMotion}
              language={language}
              theme={theme}
              onComplete={completeModesDemo}
            />
          )
        ) : null}
        {textShowcase ? (
          <div className="first-run-product-card-details">
            <p>{card.body}</p>
            <small>{card.meta}</small>
          </div>
        ) : null}
      </div>
    </div>
    );
  };

  const activeCard = cards[activeIndex];
  const outgoingCard = outgoingIndex === null ? null : cards[outgoingIndex];
  const keepModesVideoWarm = language === 'zh-CN' && theme === 'light';
  const showWarmModesVideo = keepModesVideoWarm && activeIndex !== 1 && outgoingIndex !== 1;
  const userPauseLabel = userPaused ? copy.product.resumeAutoplay : copy.product.pauseAutoplay;

  return (
    <section
      className="first-run-page first-run-product-page"
      data-first-run-page="product"
      data-product-intro-active-card={activeIndex}
      data-product-intro-transitioning={outgoingIndex !== null ? 'true' : 'false'}
      data-product-intro-transition-progress={outgoingIndex !== null ? '0.000' : '1.000'}
      aria-label={copy.product.title}
      aria-hidden={!active}
    >
      <div
        className="first-run-carousel-region"
        onKeyDown={handleCarouselKeyDown}
      >
        <div className="first-run-carousel">
          <button
            type="button"
            className="first-run-carousel-arrow first-run-carousel-arrow-left"
            aria-label={copy.product.previousCard}
            tabIndex={active ? 0 : -1}
            onClick={() => move(-1)}
          >
            <ChevronLeft size={18} strokeWidth={1.8} />
          </button>
          <article className="first-run-product-card" aria-live={announceChanges ? 'polite' : 'off'}>
            {outgoingCard ? renderCardContent(outgoingCard, outgoingIndex!, 'outgoing') : null}
            {renderCardContent(activeCard, activeIndex, 'incoming')}
            {showWarmModesVideo ? renderCardContent(cards[1], 1, 'inactive') : null}
          </article>
          <button
            type="button"
            className="first-run-carousel-arrow first-run-carousel-arrow-right"
            aria-label={copy.product.nextCard}
            tabIndex={active ? 0 : -1}
            onClick={() => move(1)}
          >
            <ChevronRight size={18} strokeWidth={1.8} />
          </button>
        </div>
        <div className="first-run-carousel-status" aria-label={copy.product.cardStatus(activeIndex + 1, cards.length)}>
          <span className="first-run-carousel-count" aria-hidden="true">
            {String(activeIndex + 1).padStart(2, '0')}
            <i />
            {String(cards.length).padStart(2, '0')}
          </span>
          {!reducedMotion ? (
            <button
              type="button"
              className="first-run-carousel-autoplay"
              aria-label={userPauseLabel}
              aria-pressed={userPaused}
              data-prompt-tooltip={userPauseLabel}
              tabIndex={active ? 0 : -1}
              onClick={() => setUserPaused((current) => !current)}
            >
              {userPaused ? <Play size={13} fill="currentColor" /> : <Pause size={13} fill="currentColor" />}
            </button>
          ) : null}
        </div>
      </div>
      <footer className={`first-run-page-actions ${showPrevious ? '' : 'first-run-page-actions-end'}`}>
        {showPrevious ? (
          <button
            type="button"
            className="first-run-action first-run-action-secondary"
            tabIndex={active ? 0 : -1}
            onClick={onPrevious}
          >
            {copy.common.previous}
          </button>
        ) : null}
        <button
          type="button"
          className="first-run-action first-run-action-primary"
          tabIndex={active ? 0 : -1}
          onClick={onNext}
        >
          {nextLabel ?? copy.common.next}
        </button>
      </footer>
    </section>
  );
};
